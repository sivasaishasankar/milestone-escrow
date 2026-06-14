//! Waypoint arbiter contract.
//!
//! Owns the *decision* logic for releasing escrowed funds: normal approval by
//! the project creator, and dispute resolution by a designated arbiter
//! address. Every path that ends in a payout calls back into `escrow`'s
//! `release_milestone`, which itself is the only place tokens move. This
//! contract never touches the token directly.
#![no_std]

use soroban_sdk::{
    contract, contracterror, contractimpl, panic_with_error, symbol_short, vec, Address, Env,
    IntoVal, Symbol, Val, Vec,
};

fn sym_get_escrow(env: &Env) -> Symbol {
    Symbol::new(env, "get_escrow")
}

fn sym_release_milestone(env: &Env) -> Symbol {
    Symbol::new(env, "release_milestone")
}
use waypoint_shared::{Escrow, MilestoneStatus};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum ArbiterError {
    /// approver is not the escrow's creator.
    NotCreator = 1,
    /// designated_arbiter does not match the escrow's registered arbiter.
    NotDesignatedArbiter = 2,
    /// The milestone is not in a state this action can operate on.
    InvalidMilestoneState = 3,
    /// milestone_index is out of range.
    MilestoneOutOfRange = 4,
}

/// Per-escrow settings this contract needs beyond what `escrow` stores: the
/// human/multisig address empowered to resolve disputes, and the escrow
/// contract's own address so it can be invoked cross-contract.
#[soroban_sdk::contracttype]
#[derive(Clone)]
enum DataKey {
    /// EscrowContractAddr -> Address, set once by the constructor.
    EscrowContractAddr,
    /// DesignatedArbiter(escrow_id) -> Address registered for that escrow.
    DesignatedArbiter(u32),
}

const EVT_ARB: Symbol = symbol_short!("arbiter");

#[contract]
pub struct ArbiterContract;

#[contractimpl]
impl ArbiterContract {
    /// Deploy-time constructor: pin the escrow contract this arbiter serves.
    pub fn __constructor(env: Env, escrow_contract: Address) {
        env.storage()
            .instance()
            .set(&DataKey::EscrowContractAddr, &escrow_contract);
    }

    /// Register the address empowered to resolve disputes for a given
    /// escrow. Called once, typically right after `create_escrow`, by the
    /// escrow's creator.
    pub fn register_arbiter(env: Env, escrow_id: u32, creator: Address, designated_arbiter: Address) {
        creator.require_auth();
        env.storage()
            .persistent()
            .set(&DataKey::DesignatedArbiter(escrow_id), &designated_arbiter);
    }

    /// Normal-path approval: the escrow's creator signs off on a milestone,
    /// which immediately triggers payout via `escrow.release_milestone`.
    pub fn approve_milestone(env: Env, escrow_id: u32, milestone_index: u32, approver: Address) -> bool {
        approver.require_auth();

        let escrow_addr = escrow_contract_addr(&env);
        let escrow = get_escrow(&env, &escrow_addr, escrow_id);

        if approver != escrow.creator {
            panic_with_error!(&env, ArbiterError::NotCreator);
        }

        let milestone = escrow
            .milestones
            .get(milestone_index)
            .unwrap_or_else(|| panic_with_error!(&env, ArbiterError::MilestoneOutOfRange));
        if milestone.status != MilestoneStatus::Locked {
            panic_with_error!(&env, ArbiterError::InvalidMilestoneState);
        }

        release(&env, &escrow_addr, escrow_id, milestone_index);

        env.events().publish(
            (EVT_ARB, symbol_short!("approved")),
            (escrow_id, milestone_index),
        );
        true
    }

    /// Dispute-path resolution: the designated arbiter for this escrow either
    /// approves the disputed milestone (triggering payout) or rejects it,
    /// leaving the milestone Disputed and the funds locked in escrow with no
    /// fake refund path.
    pub fn resolve_dispute(
        env: Env,
        escrow_id: u32,
        milestone_index: u32,
        approve: bool,
        designated_arbiter: Address,
    ) -> bool {
        designated_arbiter.require_auth();

        let stored: Address = env
            .storage()
            .persistent()
            .get(&DataKey::DesignatedArbiter(escrow_id))
            .unwrap_or_else(|| panic_with_error!(&env, ArbiterError::NotDesignatedArbiter));
        if designated_arbiter != stored {
            panic_with_error!(&env, ArbiterError::NotDesignatedArbiter);
        }

        let escrow_addr = escrow_contract_addr(&env);
        let escrow = get_escrow(&env, &escrow_addr, escrow_id);
        let milestone = escrow
            .milestones
            .get(milestone_index)
            .unwrap_or_else(|| panic_with_error!(&env, ArbiterError::MilestoneOutOfRange));
        if milestone.status != MilestoneStatus::Disputed {
            panic_with_error!(&env, ArbiterError::InvalidMilestoneState);
        }

        if approve {
            release(&env, &escrow_addr, escrow_id, milestone_index);
        }
        // approve == false: milestone stays Disputed, funds stay locked.
        // No refund path exists yet; this is documented as a known limitation.

        env.events().publish(
            (EVT_ARB, symbol_short!("resolved")),
            (escrow_id, milestone_index, approve),
        );
        approve
    }

    /// The designated arbiter registered for an escrow, if any.
    pub fn get_designated_arbiter(env: Env, escrow_id: u32) -> Address {
        env.storage()
            .persistent()
            .get(&DataKey::DesignatedArbiter(escrow_id))
            .unwrap_or_else(|| panic_with_error!(&env, ArbiterError::NotDesignatedArbiter))
    }
}

fn escrow_contract_addr(env: &Env) -> Address {
    env.storage()
        .instance()
        .get(&DataKey::EscrowContractAddr)
        .unwrap()
}

fn get_escrow(env: &Env, escrow_addr: &Address, escrow_id: u32) -> Escrow {
    let args: Vec<Val> = vec![env, escrow_id.into_val(env)];
    env.invoke_contract(escrow_addr, &sym_get_escrow(env), args)
}

/// The one call site that reaches into `escrow.release_milestone`, which in
/// turn moves funds via the token SAC. This is the middle link of the
/// arbiter -> escrow -> token chain.
fn release(env: &Env, escrow_addr: &Address, escrow_id: u32, milestone_index: u32) {
    let args: Vec<Val> = vec![env, escrow_id.into_val(env), milestone_index.into_val(env)];
    env.invoke_contract::<bool>(escrow_addr, &sym_release_milestone(env), args);
}

mod test;
