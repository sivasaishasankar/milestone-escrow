//! Types shared between the Waypoint `escrow` and `arbiter` contracts.
//!
//! Both contracts encode/decode these values across the contract boundary
//! (e.g. `arbiter` reads an `Escrow` back from `escrow.get_escrow`), so the
//! definitions live in one crate to guarantee the XDR representations match.
#![no_std]

use soroban_sdk::{contracttype, Address, Vec};

#[contracttype]
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum MilestoneStatus {
    Locked,
    Released,
    Disputed,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Milestone {
    pub amount: i128,
    pub status: MilestoneStatus,
}

#[contracttype]
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct Escrow {
    pub creator: Address,
    pub recipient: Address,
    pub arbiter_contract: Address,
    pub milestones: Vec<Milestone>,
    pub token: Address,
}
