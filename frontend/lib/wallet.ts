import { NETWORK_PASSPHRASE, STELLAR_NETWORK } from "./env";
import type { AppError } from "./types";

// The wallet kit touches localStorage as soon as its module graph loads, which
// crashes Next's static prerender pass (no `window` there). Every export below
// loads it lazily via dynamic import so it's only ever evaluated in the browser.
let kitModule: typeof import("@creit.tech/stellar-wallets-kit") | null = null;
let freighterModule: typeof import("@creit.tech/stellar-wallets-kit/modules/freighter") | null =
  null;
let initialized = false;

async function loadKit() {
  if (!kitModule) kitModule = await import("@creit.tech/stellar-wallets-kit");
  if (!freighterModule)
    freighterModule = await import("@creit.tech/stellar-wallets-kit/modules/freighter");
  return { kit: kitModule.StellarWalletsKit, Networks: kitModule.Networks, FreighterModule: freighterModule.FreighterModule };
}

async function ensureInit() {
  const { kit, Networks, FreighterModule } = await loadKit();
  if (!initialized) {
    kit.init({
      modules: [new FreighterModule()],
      network: STELLAR_NETWORK === "mainnet" ? Networks.PUBLIC : Networks.TESTNET,
    });
    initialized = true;
  }
  return { kit, FreighterModule };
}

/** Error state 1: wallet not found / not installed. */
export async function isFreighterAvailable(): Promise<boolean> {
  const { FreighterModule } = await ensureInit();
  return new FreighterModule().isAvailable();
}

export async function connectWallet(): Promise<
  { address: string } | { error: AppError }
> {
  const { kit } = await ensureInit();
  const available = await isFreighterAvailable();
  if (!available) {
    return {
      error: {
        kind: "wallet-not-found",
        message:
          "Freighter wallet extension was not found. Install it from freighter.app and reload the page.",
      },
    };
  }
  kit.setWallet("freighter");
  try {
    const { address } = await kit.authModal();
    return { address };
  } catch {
    // Error state 2: signature/connection rejected by user.
    return {
      error: {
        kind: "signature-rejected",
        message: "Wallet connection was rejected in Freighter.",
      },
    };
  }
}

export async function disconnectWallet(): Promise<void> {
  const { kit } = await ensureInit();
  await kit.disconnect();
}

export async function signTransactionXdr(
  xdr: string,
  address: string,
): Promise<{ signedTxXdr: string } | { error: AppError }> {
  const { kit } = await ensureInit();
  try {
    const result = await kit.signTransaction(xdr, {
      address,
      networkPassphrase: NETWORK_PASSPHRASE,
    });
    return { signedTxXdr: result.signedTxXdr };
  } catch {
    return {
      error: {
        kind: "signature-rejected",
        message: "Transaction signature was rejected in Freighter.",
      },
    };
  }
}
