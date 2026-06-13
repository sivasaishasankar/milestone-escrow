//! Waypoint escrow contract.
//!
//! Holds funds for a staged project and releases them milestone-by-milestone.
//! Custody and state transitions live here; the *decision* to release lives in
//! the separate `arbiter` contract. `release_milestone` can only be invoked by
//! the arbiter contract registered at creation time, and every release moves
//! tokens out through the token contract (native XLM SAC on testnet), so the
//! full chain is:
//!
//!   arbiter.approve_milestone / resolve_dispute
//!     -> escrow.release_milestone
//!       -> token (SAC) transfer
#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, panic_with_error, symbol_short, token, vec, Address,
    Env, IntoVal, Symbol, Val, Vec,
};
use waypoint_shared::{Escrow, Milestone, MilestoneStatus};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum EscrowError {
    /// The requested escrow id has never been created.
    EscrowNotFound = 1,
    /// `create_escrow` needs at least one milestone.
    NoMilestones = 2,
    /// A milestone amount must be a positive number of stroops.
    NonPositiveAmount = 3,
    /// Milestone amounts overflowed i128 when summed.
    AmountOverflow = 4,
    /// The escrow has already been funded once; it cannot be funded again.
    AlreadyFunded = 5,
    /// Milestone actions require the escrow to be funded first.
    NotFunded = 6,
    /// milestone_index is out of range for this escrow.
    MilestoneOutOfRange = 7,
    /// The milestone is already Released; funds cannot move twice.
    AlreadyReleased = 8,
    /// Only a Locked milestone can be disputed.
    NotLocked = 9,
    /// The caller is not a participant allowed to perform this action.
    NotAuthorized = 10,
    /// The contract was deployed without a settlement token (constructor not run).
    TokenNotSet = 11,
}

/// Storage keys. Escrows live in persistent storage keyed by id; the id
/// counter lives in instance storage.
#[soroban_sdk::contracttype]
#[derive(Clone)]
enum DataKey {
    /// u32 counter: the next escrow id to hand out.
    NextId,
    /// Escrow(id) -> Escrow
    Escrow(u32),
    /// Funded(id) -> bool, set once by fund_escrow.
    Funded(u32),
    /// Address of the settlement token (native XLM SAC), set by the constructor.
    Token,
}

const EVT_ESCROW: Symbol = symbol_short!("escrow");

fn load_escrow(env: &Env, escrow_id: u32) -> Escrow {
    env.storage()
        .persistent()
        .get(&DataKey::Escrow(escrow_id))
        .unwrap_or_else(|| panic_with_error!(env, EscrowError::EscrowNotFound))
}

fn save_escrow(env: &Env, escrow_id: u32, escrow: &Escrow) {
    env.storage()
        .persistent()
        .set(&DataKey::Escrow(escrow_id), escrow);
}

fn milestone_total(env: &Env, milestones: &Vec<Milestone>) -> i128 {
    let mut total: i128 = 0;
    for m in milestones.iter() {
        total = total
            .checked_add(m.amount)
            .unwrap_or_else(|| panic_with_error!(env, EscrowError::AmountOverflow));
    }
    total
}

#[contract]
pub struct EscrowContract;

#[contractimpl]
impl EscrowContract {
    /// Deploy-time constructor: pin the settlement token (the native XLM SAC
    /// on testnet). Every escrow created by this instance settles in it.
    pub fn __constructor(env: Env, token: Address) {
        env.storage().instance().set(&DataKey::Token, &token);
    }

    /// Create a new escrow. Milestone amounts (stroops) are fixed forever at
    /// this point. Returns the new escrow id.
    pub fn create_escrow(
        env: Env,
        creator: Address,
        recipient: Address,
        arbiter_contract: Address,
        milestone_amounts: Vec<i128>,
    ) -> u32 {
        creator.require_auth();

        if milestone_amounts.is_empty() {
            panic_with_error!(&env, EscrowError::NoMilestones);
        }

        let mut milestones: Vec<Milestone> = vec![&env];
        for amount in milestone_amounts.iter() {
            if amount <= 0 {
                panic_with_error!(&env, EscrowError::NonPositiveAmount);
            }
            milestones.push_back(Milestone {
                amount,
                status: MilestoneStatus::Locked,
            });
        }
        // Reject totals that overflow now rather than at funding time.
        milestone_total(&env, &milestones);

        let escrow = Escrow {
            creator,
            recipient,
            arbiter_contract,
            milestones,
            token: native_token_address(&env),
        };

        let escrow_id: u32 = env
            .storage()
            .instance()
            .get(&DataKey::NextId)
            .unwrap_or(0u32);
        env.storage().instance().set(&DataKey::NextId, &(escrow_id + 1));
        save_escrow(&env, escrow_id, &escrow);

        env.events().publish(
            (EVT_ESCROW, symbol_short!("created")),
            escrow_id,
        );
        escrow_id
    }

    /// Lock the full project budget into this contract in one transfer. The
    /// amount moved is exactly the sum of the milestone amounts fixed at
    /// creation; anything else is impossible by construction, and funding
    /// twice panics.
    pub fn fund_escrow(env: Env, escrow_id: u32, funder: Address) -> bool {
        funder.require_auth();

        let escrow = load_escrow(&env, escrow_id);
        let funded: bool = env
            .storage()
            .persistent()
            .get(&DataKey::Funded(escrow_id))
            .unwrap_or(false);
        if funded {
            panic_with_error!(&env, EscrowError::AlreadyFunded);
        }

        let total = milestone_total(&env, &escrow.milestones);
        token::TokenClient::new(&env, &escrow.token).transfer(
            &funder,
            &env.current_contract_address(),
            &total,
        );

        env.storage()
            .persistent()
            .set(&DataKey::Funded(escrow_id), &true);
        env.events()
            .publish((EVT_ESCROW, symbol_short!("funded")), escrow_id);
        true
    }

    /// Pay one milestone out to the recipient. Only the arbiter contract
    /// registered for this escrow may invoke this: `require_auth` on a
    /// contract address is only satisfied when that contract is the direct
    /// cross-contract invoker, so a direct client call (or a call from any
    /// other contract) fails authorization. A milestone that is already
    /// Released can never be paid again.
    pub fn release_milestone(env: Env, escrow_id: u32, milestone_index: u32) -> bool {
        let mut escrow = load_escrow(&env, escrow_id);

        // Authorization: the registered arbiter contract must be the invoker.
        escrow.arbiter_contract.require_auth();

        let funded: bool = env
            .storage()
            .persistent()
            .get(&DataKey::Funded(escrow_id))
            .unwrap_or(false);
        if !funded {
            panic_with_error!(&env, EscrowError::NotFunded);
        }

        let mut milestone = escrow
            .milestones
            .get(milestone_index)
            .unwrap_or_else(|| panic_with_error!(&env, EscrowError::MilestoneOutOfRange));
        if milestone.status == MilestoneStatus::Released {
            panic_with_error!(&env, EscrowError::AlreadyReleased);
        }

        // Flip state before moving funds so a reentrant call would hit the
        // AlreadyReleased guard.
        milestone.status = MilestoneStatus::Released;
        escrow.milestones.set(milestone_index, milestone.clone());
        save_escrow(&env, escrow_id, &escrow);

        let args: Vec<Val> = vec![
            &env,
            env.current_contract_address().into_val(&env),
            escrow.recipient.into_val(&env),
            milestone.amount.into_val(&env),
        ];
        env.invoke_contract::<()>(&escrow.token, &symbol_short!("transfer"), args);

        env.events().publish(
            (EVT_ESCROW, symbol_short!("released")),
            (escrow_id, milestone_index),
        );
        true
    }

    /// Flag a Locked milestone as Disputed. Only the escrow's creator or
    /// recipient may do this; `caller` must authorize the call.
    pub fn mark_disputed(env: Env, escrow_id: u32, milestone_index: u32, caller: Address) -> bool {
        caller.require_auth();

        let mut escrow = load_escrow(&env, escrow_id);
        if caller != escrow.creator && caller != escrow.recipient {
            panic_with_error!(&env, EscrowError::NotAuthorized);
        }

        let funded: bool = env
            .storage()
            .persistent()
            .get(&DataKey::Funded(escrow_id))
            .unwrap_or(false);
        if !funded {
            panic_with_error!(&env, EscrowError::NotFunded);
        }

        let mut milestone = escrow
            .milestones
            .get(milestone_index)
            .unwrap_or_else(|| panic_with_error!(&env, EscrowError::MilestoneOutOfRange));
        if milestone.status != MilestoneStatus::Locked {
            panic_with_error!(&env, EscrowError::NotLocked);
        }

        milestone.status = MilestoneStatus::Disputed;
        escrow.milestones.set(milestone_index, milestone);
        save_escrow(&env, escrow_id, &escrow);

        env.events().publish(
            (EVT_ESCROW, symbol_short!("disputed")),
            (escrow_id, milestone_index),
        );
        true
    }

    /// Read one escrow's full state.
    pub fn get_escrow(env: Env, escrow_id: u32) -> Escrow {
        load_escrow(&env, escrow_id)
    }

    /// Whether fund_escrow has completed for this escrow.
    pub fn is_funded(env: Env, escrow_id: u32) -> bool {
        // Panic with EscrowNotFound for unknown ids rather than returning false.
        load_escrow(&env, escrow_id);
        env.storage()
            .persistent()
            .get(&DataKey::Funded(escrow_id))
            .unwrap_or(false)
    }

    /// Number of escrows ever created (ids run 0..count).
    pub fn get_escrow_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&DataKey::NextId)
            .unwrap_or(0u32)
    }
}

/// The token every escrow settles in: the native XLM Stellar Asset Contract
/// on testnet, or whatever token the constructor pinned (tests use a locally
/// registered SAC).
fn native_token_address(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::Token)
        .unwrap_or_else(|| panic_with_error!(env, EscrowError::TokenNotSet))
}
