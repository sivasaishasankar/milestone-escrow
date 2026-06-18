import { STELLAR_NETWORK } from "./env";

const HORIZON_URL =
  STELLAR_NETWORK === "mainnet"
    ? "https://horizon.stellar.org"
    : "https://horizon-testnet.stellar.org";

/** Native XLM balance for an account, in whole XLM (string), or null if unfunded. */
export async function fetchXlmBalance(address: string): Promise<string | null> {
  const res = await fetch(`${HORIZON_URL}/accounts/${address}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Horizon error ${res.status}`);
  const data: { balances: Array<{ asset_type: string; balance: string }> } = await res.json();
  const native = data.balances.find((b) => b.asset_type === "native");
  return native ? native.balance : "0";
}
