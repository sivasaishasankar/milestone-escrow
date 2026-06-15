#![cfg(test)]

use soroban_sdk::{
    testutils::Address as _,
    token::StellarAssetClient,
    vec, Address, Env,
};

use crate::{ArbiterContract, ArbiterContractClient};
use waypoint_escrow::{EscrowContract, EscrowContractClient};

struct Harness<'a> {
    env: Env,
    escrow: EscrowContractClient<'a>,
    arbiter: ArbiterContractClient<'a>,
    token_admin: StellarAssetClient<'a>,
    token_addr: Address,
    creator: Address,
    recipient: Address,
    designated_arbiter: Address,
}

fn setup() -> Harness<'static> {
    let env = Env::default();
    env.mock_all_auths();

    let token_admin_addr = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(token_admin_addr.clone());
    let token_addr = sac.address();
    let token_admin = StellarAssetClient::new(&env, &token_addr);

    let escrow_id = env.register(EscrowContract, (token_addr.clone(),));
    let escrow = EscrowContractClient::new(&env, &escrow_id);

    let arbiter_id = env.register(ArbiterContract, (escrow_id.clone(),));
    let arbiter = ArbiterContractClient::new(&env, &arbiter_id);

    let creator = Address::generate(&env);
    let recipient = Address::generate(&env);
    let designated_arbiter = Address::generate(&env);

    token_admin.mint(&creator, &1_000_000_000i128);

    Harness {
        env,
        escrow,
        arbiter,
        token_admin,
        token_addr,
        creator,
        recipient,
        designated_arbiter,
    }
}

/// 1. create_escrow stores milestone amounts and Locked status for all.
#[test]
fn create_escrow_stores_milestones_locked() {
    let h = setup();
    let amounts = vec![&h.env, 100i128, 200i128, 300i128];

    let escrow_id = h.escrow.create_escrow(
        &h.creator,
        &h.recipient,
        &h.arbiter.address,
        &amounts,
    );

    let stored = h.escrow.get_escrow(&escrow_id);
    assert_eq!(stored.creator, h.creator);
    assert_eq!(stored.recipient, h.recipient);
    assert_eq!(stored.milestones.len(), 3);
    for (i, amount) in [100i128, 200, 300].into_iter().enumerate() {
        let m = stored.milestones.get(i as u32).unwrap();
        assert_eq!(m.amount, amount);
        assert_eq!(m.status, waypoint_shared::MilestoneStatus::Locked);
    }
}

/// 2. fund_escrow fails if the deposited amount doesn't match the sum of
///    milestone amounts. `fund_escrow` takes no separate amount argument --
///    it always transfers exactly `sum(milestone_amounts)` fixed at creation,
///    so the mismatch guard is enforced by the SAC transfer itself panicking
///    whenever the funder cannot cover that exact sum.
#[test]
#[should_panic]
fn fund_escrow_rejects_mismatched_amount() {
    let h = setup();
    let amounts = vec![&h.env, 100i128, 200i128]; // sum = 300
    let poor_creator = Address::generate(&h.env);
    let escrow_id = h.escrow.create_escrow(&poor_creator, &h.recipient, &h.arbiter.address, &amounts);

    h.token_admin.mint(&poor_creator, &50i128); // less than the required 300
    h.escrow.fund_escrow(&escrow_id, &poor_creator);
}

/// 3. release_milestone succeeds only via the registered arbiter contract,
///    and correctly transfers funds to the recipient.
#[test]
fn release_milestone_via_arbiter_pays_recipient() {
    let h = setup();
    let amounts = vec![&h.env, 400i128, 600i128];
    let escrow_id = h.escrow.create_escrow(&h.creator, &h.recipient, &h.arbiter.address, &amounts);
    h.escrow.fund_escrow(&escrow_id, &h.creator);
    h.arbiter
        .register_arbiter(&escrow_id, &h.creator, &h.designated_arbiter);

    let token = soroban_sdk::token::TokenClient::new(&h.env, &h.token_addr);
    let before = token.balance(&h.recipient);

    h.arbiter.approve_milestone(&escrow_id, &0, &h.creator);

    let after = token.balance(&h.recipient);
    assert_eq!(after - before, 400i128);

    let stored = h.escrow.get_escrow(&escrow_id);
    assert_eq!(
        stored.milestones.get(0).unwrap().status,
        waypoint_shared::MilestoneStatus::Released
    );
}

/// 4. release_milestone fails when called directly (not via arbiter),
///    proving the access control is real.
#[test]
#[should_panic]
fn release_milestone_direct_call_fails() {
    let h = setup();
    let amounts = vec![&h.env, 400i128];
    let escrow_id = h.escrow.create_escrow(&h.creator, &h.recipient, &h.arbiter.address, &amounts);
    h.escrow.fund_escrow(&escrow_id, &h.creator);

    // mock_all_auths() in setup() would rubber-stamp every require_auth call,
    // including this one, which would hide the access-control bug entirely.
    // Clearing the auth mocks here forces a real check: release_milestone
    // calls arbiter_contract.require_auth(), and a top-level client call
    // supplies no authorization entry for that address at all, so it panics.
    h.env.set_auths(&[]);
    h.escrow.release_milestone(&escrow_id, &0);
}

/// 5. mark_disputed + resolve_dispute(approve: true) transitions Disputed -> Released and pays out.
#[test]
fn dispute_then_resolve_approve_pays_out() {
    let h = setup();
    let amounts = vec![&h.env, 500i128];
    let escrow_id = h.escrow.create_escrow(&h.creator, &h.recipient, &h.arbiter.address, &amounts);
    h.escrow.fund_escrow(&escrow_id, &h.creator);
    h.arbiter
        .register_arbiter(&escrow_id, &h.creator, &h.designated_arbiter);

    h.escrow.mark_disputed(&escrow_id, &0, &h.recipient);
    let stored = h.escrow.get_escrow(&escrow_id);
    assert_eq!(
        stored.milestones.get(0).unwrap().status,
        waypoint_shared::MilestoneStatus::Disputed
    );

    let token = soroban_sdk::token::TokenClient::new(&h.env, &h.token_addr);
    let before = token.balance(&h.recipient);

    let result = h
        .arbiter
        .resolve_dispute(&escrow_id, &0, &true, &h.designated_arbiter);
    assert!(result);

    let after = token.balance(&h.recipient);
    assert_eq!(after - before, 500i128);

    let stored = h.escrow.get_escrow(&escrow_id);
    assert_eq!(
        stored.milestones.get(0).unwrap().status,
        waypoint_shared::MilestoneStatus::Released
    );
}

/// 6. Releasing an already-Released milestone fails (no double-payout).
#[test]
#[should_panic]
fn double_release_fails() {
    let h = setup();
    let amounts = vec![&h.env, 250i128];
    let escrow_id = h.escrow.create_escrow(&h.creator, &h.recipient, &h.arbiter.address, &amounts);
    h.escrow.fund_escrow(&escrow_id, &h.creator);
    h.arbiter
        .register_arbiter(&escrow_id, &h.creator, &h.designated_arbiter);

    h.arbiter.approve_milestone(&escrow_id, &0, &h.creator);
    // Second approval attempt must panic: milestone is no longer Locked.
    h.arbiter.approve_milestone(&escrow_id, &0, &h.creator);
}
