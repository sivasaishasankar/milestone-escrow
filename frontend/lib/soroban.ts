import {
  Contract,
  rpc,
  TransactionBuilder,
  BASE_FEE,
  nativeToScVal,
  scValToNative,
  Address,
  Account,
  Keypair,
} from "@stellar/stellar-sdk";
import {
  ARBITER_CONTRACT_ADDRESS,
  ESCROW_CONTRACT_ADDRESS,
  NETWORK_PASSPHRASE,
  STELLAR_RPC_URL,
} from "./env";
import { signTransactionXdr } from "./wallet";
import type { AppError, Escrow, Milestone, MilestoneStatus } from "./types";

const server = new rpc.Server(STELLAR_RPC_URL);

/**
 * A deterministic, all-zero-seed keypair used only as the `source` for
 * read-only simulateTransaction calls (get_escrow, get_escrow_count). It
 * never needs to exist on-chain or be funded: simulateTransaction doesn't
 * validate the source account's sequence number against ledger state, and no
 * transaction built with it is ever signed or submitted.
 */
const READ_ONLY_SIMULATION_ACCOUNT = Keypair.fromRawEd25519Seed(
  Buffer.alloc(32, 0),
).publicKey();

function parseMilestoneStatus(raw: unknown): MilestoneStatus {
  // A unit contracttype enum variant decodes via scValToNative as a bare
  // string tag ("Locked"), a one-element array (["Locked"]), or in some SDK
  // versions an object ({ tag: "Locked" }).
  let tag: unknown = raw;
  if (Array.isArray(tag)) tag = tag[0];
  else if (typeof tag === "object" && tag !== null) tag = (tag as { tag?: string }).tag;
  if (tag === "Released" || tag === "Disputed" || tag === "Locked") return tag;
  throw new Error(`unrecognized milestone status: ${JSON.stringify(raw)}`);
}

interface RawEscrow {
  creator: string;
  recipient: string;
  arbiter_contract: string;
  milestones: Array<{ amount: bigint | number | string; status: unknown }>;
  token: string;
}

function parseEscrow(raw: RawEscrow): Escrow {
  const milestones: Milestone[] = raw.milestones.map((m) => ({
    amount: BigInt(m.amount),
    status: parseMilestoneStatus(m.status),
  }));
  return {
    creator: raw.creator,
    recipient: raw.recipient,
    arbiterContract: raw.arbiter_contract,
    milestones,
    token: raw.token,
  };
}

/** Read-only simulate call against `escrow.get_escrow`. No wallet needed. */
export async function getEscrow(escrowId: number): Promise<Escrow | null> {
  const contract = new Contract(ESCROW_CONTRACT_ADDRESS);
  const sourceAccount = new Account(READ_ONLY_SIMULATION_ACCOUNT, "0");

  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call("get_escrow", nativeToScVal(escrowId, { type: "u32" })))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    if (sim.error.includes("EscrowNotFound") || sim.error.includes("#1")) {
      return null;
    }
    throw new Error(sim.error);
  }
  const result = sim.result?.retval;
  if (!result) return null;
  return parseEscrow(scValToNative(result) as RawEscrow);
}

export async function getEscrowCount(): Promise<number> {
  const contract = new Contract(ESCROW_CONTRACT_ADDRESS);
  const sourceAccount = new Account(READ_ONLY_SIMULATION_ACCOUNT, "0");
  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call("get_escrow_count"))
    .setTimeout(30)
    .build();
  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) throw new Error(sim.error);
  return sim.result?.retval ? Number(scValToNative(sim.result.retval)) : 0;
}

/**
 * Build, simulate, sign (via the connected wallet), and submit a contract
 * call. Shared by every write path (create/fund/approve/dispute/resolve).
 */
async function invokeAsWallet(
  contractAddress: string,
  method: string,
  args: ReturnType<typeof nativeToScVal>[],
  walletAddress: string,
): Promise<{ ok: true; result: unknown } | { error: AppError }> {
  const contract = new Contract(contractAddress);
  const sourceAccount = await server.getAccount(walletAddress);

  const tx = new TransactionBuilder(sourceAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...args))
    .setTimeout(60)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    if (/insufficient|balance|underfund/i.test(sim.error)) {
      return {
        error: {
          kind: "insufficient-balance",
          message: "Insufficient XLM balance to cover this transaction.",
        },
      };
    }
    if (/NotAuthorized|NotCreator|NotDesignatedArbiter|auth/i.test(sim.error)) {
      return {
        error: {
          kind: "not-authorized",
          message:
            "The connected wallet is not authorized to perform this action for this escrow.",
        },
      };
    }
    return {
      error: { kind: "not-authorized", message: sim.error },
    };
  }

  const prepared = rpc.assembleTransaction(tx, sim).build();
  const signResult = await signTransactionXdr(prepared.toXDR(), walletAddress);
  if ("error" in signResult) return signResult;

  const signedTx = TransactionBuilder.fromXDR(signResult.signedTxXdr, NETWORK_PASSPHRASE);
  const sendResult = await server.sendTransaction(signedTx);
  if (sendResult.status === "ERROR") {
    return {
      error: {
        kind: "not-authorized",
        message: `Transaction rejected: ${JSON.stringify(sendResult.errorResult)}`,
      },
    };
  }

  const finalStatus = await pollTransaction(sendResult.hash);
  if (finalStatus.status !== "SUCCESS") {
    return {
      error: {
        kind: "not-authorized",
        message: `Transaction failed on-chain (status: ${finalStatus.status}).`,
      },
    };
  }
  return { ok: true, result: finalStatus };
}

async function pollTransaction(hash: string, attempts = 15): Promise<rpc.Api.GetTransactionResponse> {
  for (let i = 0; i < attempts; i++) {
    const res = await server.getTransaction(hash);
    if (res.status !== "NOT_FOUND") return res;
    await new Promise((r) => setTimeout(r, 1500));
  }
  throw new Error("Timed out waiting for transaction confirmation.");
}

export async function createEscrow(
  walletAddress: string,
  recipient: string,
  arbiterSigner: string,
  milestoneAmounts: bigint[],
): Promise<{ ok: true; escrowId: number } | { error: AppError }> {
  const args = [
    nativeToScVal(Address.fromString(walletAddress)),
    nativeToScVal(Address.fromString(recipient)),
    nativeToScVal(Address.fromString(ARBITER_CONTRACT_ADDRESS)),
    nativeToScVal(milestoneAmounts),
  ];
  const res = await invokeAsWallet(ESCROW_CONTRACT_ADDRESS, "create_escrow", args, walletAddress);
  if ("error" in res) return res;

  // Register the arbiter-signer for dispute resolution on this escrow in the
  // same UI flow, as a second transaction (the contract keeps these as two
  // separate calls by design).
  const count = await getEscrowCount();
  const escrowId = count - 1;
  const regArgs = [
    nativeToScVal(escrowId, { type: "u32" }),
    nativeToScVal(Address.fromString(walletAddress)),
    nativeToScVal(Address.fromString(arbiterSigner)),
  ];
  const regRes = await invokeAsWallet(
    ARBITER_CONTRACT_ADDRESS,
    "register_arbiter",
    regArgs,
    walletAddress,
  );
  if ("error" in regRes) return regRes;

  return { ok: true, escrowId };
}

export async function fundEscrow(
  walletAddress: string,
  escrowId: number,
): Promise<{ ok: true } | { error: AppError }> {
  const args = [
    nativeToScVal(escrowId, { type: "u32" }),
    nativeToScVal(Address.fromString(walletAddress)),
  ];
  const res = await invokeAsWallet(ESCROW_CONTRACT_ADDRESS, "fund_escrow", args, walletAddress);
  if ("error" in res) return res;
  return { ok: true };
}

export async function approveMilestone(
  walletAddress: string,
  escrowId: number,
  milestoneIndex: number,
): Promise<{ ok: true } | { error: AppError }> {
  const args = [
    nativeToScVal(escrowId, { type: "u32" }),
    nativeToScVal(milestoneIndex, { type: "u32" }),
    nativeToScVal(Address.fromString(walletAddress)),
  ];
  const res = await invokeAsWallet(
    ARBITER_CONTRACT_ADDRESS,
    "approve_milestone",
    args,
    walletAddress,
  );
  if ("error" in res) return res;
  return { ok: true };
}

export async function markDisputed(
  walletAddress: string,
  escrowId: number,
  milestoneIndex: number,
): Promise<{ ok: true } | { error: AppError }> {
  const args = [
    nativeToScVal(escrowId, { type: "u32" }),
    nativeToScVal(milestoneIndex, { type: "u32" }),
    nativeToScVal(Address.fromString(walletAddress)),
  ];
  const res = await invokeAsWallet(ESCROW_CONTRACT_ADDRESS, "mark_disputed", args, walletAddress);
  if ("error" in res) return res;
  return { ok: true };
}

export async function resolveDispute(
  walletAddress: string,
  escrowId: number,
  milestoneIndex: number,
  approve: boolean,
): Promise<{ ok: true } | { error: AppError }> {
  const args = [
    nativeToScVal(escrowId, { type: "u32" }),
    nativeToScVal(milestoneIndex, { type: "u32" }),
    nativeToScVal(approve),
    nativeToScVal(Address.fromString(walletAddress)),
  ];
  const res = await invokeAsWallet(
    ARBITER_CONTRACT_ADDRESS,
    "resolve_dispute",
    args,
    walletAddress,
  );
  if ("error" in res) return res;
  return { ok: true };
}
