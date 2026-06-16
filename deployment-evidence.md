# Waypoint — Testnet Deployment Evidence

Generated 2026-07-11. Network: Stellar Testnet ("Test SDF Network ; September 2015").

## Identities

| Role | Alias | Address |
|---|---|---|
| Deployer / creator | waypoint-deployer | GDMWBEQEGVRA5TWLWZSP42M3XS76ZMMYRCEKR3TBT7WIPWUOZZL7B57I |
| Recipient | waypoint-recipient | GBXTFMY4F5XWMILV3KAQLEG3BQ5OBJNZMNZNX4HR2PGEAE6Y3XV4EXZK |
| Designated arbiter (dispute signer) | waypoint-arbiter-signer | GCZIAGXR7VQSAZKWA3LSYNHIL5XW5UXICGQ43YDYYSQHI4AGE45NWBQ3 |

## Contract Addresses

| Contract | Address | Stellar Expert |
|---|---|---|
| escrow | CDE64MRDFC5HN3TXL63VOCZOSC3UXYG2MI2X3JXQXLR3OJYBY6MY6GPE | https://stellar.expert/explorer/testnet/contract/CDE64MRDFC5HN3TXL63VOCZOSC3UXYG2MI2X3JXQXLR3OJYBY6MY6GPE |
| arbiter | CALIVYUP5R7NWDHSYZO6BP3HG7DUSKAL553CWOHKDPHRVYKZDAWIJ7KK | https://stellar.expert/explorer/testnet/contract/CALIVYUP5R7NWDHSYZO6BP3HG7DUSKAL553CWOHKDPHRVYKZDAWIJ7KK |
| native XLM SAC (token) | CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC | https://stellar.expert/explorer/testnet/contract/CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC |

## Flow 1 — create → fund → approve → release (escrow_id = 0)

Milestones: [10,000,000, 20,000,000] stroops (1 XLM + 2 XLM).

| Step | Tx Hash |
|---|---|
| create_escrow | fb4a4bb001e7eaf19759d8a74ec49356bd6a67027d42f124198739ee6afce4f2 |
| fund_escrow | 33b93d4603750b0062848ed7880cb2cd8849b5bf59210ffaf16268f20e7fe726 |
| register_arbiter | 61b0ef8c6d698512b0005f944b7a9b41ed8f77328e7bef95430977df023993a8 |
| **approve_milestone** (arbiter → escrow → SAC transfer chain) | **bc4d8f77636c05b36041c5cb497eaf0061606958ea7f8e07d94f901a0300fa07** |

`approve_milestone` tx emitted, in order: a `transfer` event from the native SAC (10,000,000 stroops, escrow → recipient), an `escrow`/`released` event from the escrow contract, and an `arbiter`/`approved` event from the arbiter contract — proving the real `arbiter.approve_milestone → escrow.release_milestone → SAC.transfer` call chain executed on-chain.

## Flow 2 — create → fund → dispute → resolve → release (escrow_id = 1)

Milestones: [15,000,000] stroops.

| Step | Tx Hash |
|---|---|
| create_escrow | e730baf8a56b1eaa386a727b985ca4793cd88800b5f83e2da360a2d67915b636 |
| fund_escrow | 257c37aee7031bfa33d1aa0a59047eb1f08c78cdc52032d9d7887f7a49772302 |
| register_arbiter | 73a1a01a7c7624906b94dca4bdea2fe9fa0bf5c71ce79efd580faec26b24efac |
| mark_disputed | 53f2126e70de783548f50da1baf22b06af86971ff14e175ad1a6945a1517d67e |
| **resolve_dispute(approve=true)** (arbiter → escrow → SAC transfer chain) | **301d2aa43505ff0d09458c748e2d3c3773f8b0fdbe55119d00d48219aa5d12df** |

Same call chain proof: the `resolve_dispute` tx emitted a `transfer` event (15,000,000 stroops, escrow → recipient), an `escrow`/`released` event, and an `arbiter`/`resolved` event with `approve = true`.
