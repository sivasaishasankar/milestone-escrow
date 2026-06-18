"use client";

import { useState } from "react";
import { StrKey } from "@stellar/stellar-sdk";
import { useWallet } from "@/lib/WalletContext";
import { createEscrow, fundEscrow } from "@/lib/soroban";
import { xlmToStroops } from "@/lib/format";
import type { AppError } from "@/lib/types";
import { ErrorBanner } from "./ErrorBanner";

export function CreateEscrowForm({ onCreated }: { onCreated: (escrowId: number) => void }) {
  const { address, balance } = useWallet();
  const [recipient, setRecipient] = useState("");
  const [arbiterSigner, setArbiterSigner] = useState("");
  const [amounts, setAmounts] = useState<string[]>(["", ""]);
  const [busy, setBusy] = useState<"create" | "fund" | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [step, setStep] = useState<"form" | "created">("form");
  const [escrowId, setEscrowId] = useState<number | null>(null);

  function updateAmount(i: number, value: string) {
    setAmounts((prev) => prev.map((a, idx) => (idx === i ? value : a)));
  }

  function validAddresses(): boolean {
    return StrKey.isValidEd25519PublicKey(recipient) && StrKey.isValidEd25519PublicKey(arbiterSigner);
  }

  async function handleCreate() {
    setError(null);
    if (!address) {
      setError({ kind: "wallet-not-found", message: "Connect a wallet first." });
      return;
    }
    if (!validAddresses()) {
      setError({
        kind: "not-authorized",
        message: "Recipient and arbiter must be valid Stellar public keys (G...).",
      });
      return;
    }
    const parsedAmounts = amounts.filter((a) => a.trim() !== "").map(xlmToStroops);
    if (parsedAmounts.length === 0 || parsedAmounts.some((a) => a <= 0n)) {
      setError({
        kind: "not-authorized",
        message: "Every milestone amount must be a positive XLM value.",
      });
      return;
    }
    const total = parsedAmounts.reduce((a, b) => a + b, 0n);
    const balanceStroops = balance ? xlmToStroops(balance) : 0n;
    if (balanceStroops < total) {
      setError({
        kind: "insufficient-balance",
        message: `This project needs ${
          Number(total) / 1e7
        } XLM but the connected wallet only has ${balance ?? "0"} XLM.`,
      });
      return;
    }

    setBusy("create");
    const result = await createEscrow(address, recipient, arbiterSigner, parsedAmounts);
    setBusy(null);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setEscrowId(result.escrowId);
    setStep("created");
  }

  async function handleFund() {
    if (!address || escrowId === null) return;
    setBusy("fund");
    setError(null);
    const result = await fundEscrow(address, escrowId);
    setBusy(null);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onCreated(escrowId);
  }

  if (step === "created" && escrowId !== null) {
    return (
      <div className="paper-panel flex flex-col gap-4 rounded-2xl p-6">
        <p className="text-sm text-ink-700">
          Escrow <span className="font-semibold">#{escrowId}</span> created. Lock the milestone
          budget now to activate it.
        </p>
        {error && <ErrorBanner error={error} onDismiss={() => setError(null)} />}
        <button
          onClick={handleFund}
          disabled={busy === "fund"}
          className="self-start rounded-full bg-pine-700 px-5 py-2 text-sm font-semibold text-parchment-50 hover:bg-pine-600 disabled:opacity-60"
        >
          {busy === "fund" ? "Funding…" : "Fund escrow"}
        </button>
      </div>
    );
  }

  return (
    <div className="paper-panel flex flex-col gap-4 rounded-2xl p-6">
      <h2 className="font-display text-lg font-bold text-ink-900">Chart a new project</h2>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold text-ink-700">Recipient address</span>
        <input
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="G..."
          className="rounded-lg border border-ink-500/30 bg-parchment-50 px-3 py-2 font-mono text-xs"
        />
      </label>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-semibold text-ink-700">Designated arbiter address</span>
        <input
          value={arbiterSigner}
          onChange={(e) => setArbiterSigner(e.target.value)}
          placeholder="G..."
          className="rounded-lg border border-ink-500/30 bg-parchment-50 px-3 py-2 font-mono text-xs"
        />
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold text-ink-700">Milestone amounts (XLM)</span>
        {amounts.map((a, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="w-16 text-xs text-ink-500">Waypoint {i + 1}</span>
            <input
              value={a}
              onChange={(e) => updateAmount(i, e.target.value)}
              placeholder="0.0"
              inputMode="decimal"
              className="flex-1 rounded-lg border border-ink-500/30 bg-parchment-50 px-3 py-2 text-sm"
            />
            {amounts.length > 1 && (
              <button
                onClick={() => setAmounts((prev) => prev.filter((_, idx) => idx !== i))}
                className="text-xs text-rust-600"
                aria-label="Remove waypoint"
              >
                ✕
              </button>
            )}
          </div>
        ))}
        <button
          onClick={() => setAmounts((prev) => [...prev, ""])}
          className="self-start text-xs font-semibold text-pine-700 underline"
        >
          + Add waypoint
        </button>
      </div>

      {error && <ErrorBanner error={error} onDismiss={() => setError(null)} />}

      <button
        onClick={handleCreate}
        disabled={busy === "create" || !address}
        className="self-start rounded-full bg-pine-700 px-5 py-2 text-sm font-semibold text-parchment-50 hover:bg-pine-600 disabled:opacity-60"
      >
        {busy === "create" ? "Creating…" : !address ? "Connect wallet first" : "Create escrow"}
      </button>
    </div>
  );
}
