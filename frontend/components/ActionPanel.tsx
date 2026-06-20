"use client";

import { useState } from "react";
import { useWallet } from "@/lib/WalletContext";
import { approveMilestone, markDisputed, resolveDispute } from "@/lib/soroban";
import type { AppError, Escrow } from "@/lib/types";
import { ErrorBanner } from "./ErrorBanner";

export function ActionPanel({
  escrowId,
  escrow,
  onChanged,
}: {
  escrowId: number;
  escrow: Escrow;
  onChanged: () => void;
}) {
  const { address } = useWallet();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<AppError | null>(null);
  const [milestoneIndex, setMilestoneIndex] = useState(0);

  const isCreator = address === escrow.creator;
  const isRecipient = address === escrow.recipient;
  // The designated arbiter's identity isn't part of the Escrow struct itself
  // (it's stored per-escrow inside the arbiter contract), so on the client
  // we can only role-gate creator/recipient actions before submission; the
  // arbiter role check happens on-chain in resolve_dispute and any mismatch
  // surfaces as a not-authorized error from simulation.
  const milestone = escrow.milestones[milestoneIndex];

  async function guardedRun(kind: string, action: () => Promise<{ ok: true } | { error: AppError }>) {
    setError(null);
    if (!address) {
      setError({ kind: "wallet-not-found", message: "Connect a wallet first." });
      return;
    }
    setBusy(kind);
    const result = await action();
    setBusy(null);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onChanged();
  }

  return (
    <div className="paper-panel flex flex-col gap-4 rounded-2xl p-6">
      <h3 className="font-display text-base font-bold text-ink-900">Waypoint actions</h3>

      <label className="flex items-center gap-2 text-sm">
        <span className="text-ink-500">Milestone</span>
        <select
          value={milestoneIndex}
          onChange={(e) => setMilestoneIndex(Number(e.target.value))}
          className="rounded-lg border border-ink-500/30 bg-parchment-50 px-2 py-1"
        >
          {escrow.milestones.map((m, i) => (
            <option key={i} value={i}>
              #{i + 1} — {m.status}
            </option>
          ))}
        </select>
      </label>

      {error && <ErrorBanner error={error} onDismiss={() => setError(null)} />}

      <div className="flex flex-wrap gap-2">
        <button
          disabled={busy !== null || milestone.status !== "Locked" || !isCreator}
          onClick={() =>
            guardedRun("approve", () => approveMilestone(address!, escrowId, milestoneIndex))
          }
          title={!isCreator ? "Only the project creator can approve a milestone" : undefined}
          className="rounded-full bg-pine-700 px-4 py-2 text-xs font-semibold text-parchment-50 hover:bg-pine-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy === "approve" ? "Approving…" : "Approve milestone (creator)"}
        </button>

        <button
          disabled={busy !== null || milestone.status !== "Locked" || (!isCreator && !isRecipient)}
          onClick={() =>
            guardedRun("dispute", () => markDisputed(address!, escrowId, milestoneIndex))
          }
          title={
            !isCreator && !isRecipient
              ? "Only the creator or recipient can raise a dispute"
              : undefined
          }
          className="rounded-full border border-rust-600 px-4 py-2 text-xs font-semibold text-rust-700 hover:bg-rust-600/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy === "dispute" ? "Flagging…" : "Mark disputed (creator/recipient)"}
        </button>

        <button
          disabled={busy !== null || milestone.status !== "Disputed"}
          onClick={() =>
            guardedRun("resolve-approve", () =>
              resolveDispute(address!, escrowId, milestoneIndex, true),
            )
          }
          className="rounded-full bg-ink-900 px-4 py-2 text-xs font-semibold text-parchment-50 hover:bg-ink-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy === "resolve-approve" ? "Resolving…" : "Resolve: release (arbiter)"}
        </button>

        <button
          disabled={busy !== null || milestone.status !== "Disputed"}
          onClick={() =>
            guardedRun("resolve-reject", () =>
              resolveDispute(address!, escrowId, milestoneIndex, false),
            )
          }
          className="rounded-full border border-ink-500 px-4 py-2 text-xs font-semibold text-ink-700 hover:bg-ink-500/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy === "resolve-reject" ? "Resolving…" : "Resolve: keep locked (arbiter)"}
        </button>
      </div>

      <p className="text-xs text-ink-500">
        Only the connected wallet&apos;s authorized role can complete each action — the
        contract itself enforces this on-chain even if a button above is clicked in error.
      </p>
    </div>
  );
}
