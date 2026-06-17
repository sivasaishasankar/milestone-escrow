"use client";

import { useWallet } from "@/lib/WalletContext";
import { shortAddress } from "@/lib/format";
import { ErrorBanner } from "./ErrorBanner";

export function WalletButton() {
  const { address, balance, connecting, error, connect, disconnect, clearError } = useWallet();

  return (
    <div className="flex flex-col items-end gap-2">
      {address ? (
        <div className="flex items-center gap-3 rounded-full border border-ink-500/30 bg-parchment-100 px-4 py-2">
          <div className="flex flex-col items-end leading-tight">
            <span className="text-xs font-semibold text-ink-900">{shortAddress(address)}</span>
            <span className="text-[11px] text-ink-500">
              {balance !== null ? `${balance} XLM` : "…"}
            </span>
          </div>
          <button
            onClick={disconnect}
            className="rounded-full bg-ink-900 px-3 py-1 text-xs font-semibold text-parchment-50 hover:bg-ink-700"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={connect}
          disabled={connecting}
          className="rounded-full bg-pine-700 px-5 py-2 text-sm font-semibold text-parchment-50 shadow-sm hover:bg-pine-600 disabled:opacity-60"
        >
          {connecting ? "Connecting…" : "Connect Freighter"}
        </button>
      )}
      {error && <ErrorBanner error={error} onDismiss={clearError} />}
    </div>
  );
}
