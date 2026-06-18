"use client";

import { useState } from "react";
import { useEscrow } from "@/lib/useEscrow";
import { MilestoneStepper } from "./MilestoneStepper";
import { ActionPanel } from "./ActionPanel";
import { shortAddress } from "@/lib/format";

export function EscrowViewer({
  initialId,
  onIdChange,
}: {
  initialId: number | null;
  onIdChange?: (id: number) => void;
}) {
  const [inputId, setInputId] = useState(initialId !== null ? String(initialId) : "");
  const [activeId, setActiveId] = useState<number | null>(initialId);
  const { escrow, isLoading, error, refresh } = useEscrow(activeId);

  function handleLoad() {
    const parsed = Number(inputId);
    if (Number.isInteger(parsed) && parsed >= 0) {
      setActiveId(parsed);
      onIdChange?.(parsed);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-semibold text-ink-700">View escrow by id</span>
          <input
            value={inputId}
            onChange={(e) => setInputId(e.target.value)}
            placeholder="0"
            inputMode="numeric"
            className="w-32 rounded-lg border border-ink-500/30 bg-parchment-50 px-3 py-2 text-sm"
          />
        </label>
        <button
          onClick={handleLoad}
          className="rounded-full bg-ink-900 px-4 py-2 text-xs font-semibold text-parchment-50 hover:bg-ink-700"
        >
          Load
        </button>
      </div>

      {activeId !== null && isLoading && (
        <p className="text-sm text-ink-500">Reading escrow #{activeId}…</p>
      )}
      {activeId !== null && !isLoading && !escrow && (
        <p className="text-sm text-ink-500">
          {error ? `Error: ${(error as Error).message}` : `No escrow found with id #${activeId}.`}
        </p>
      )}

      {escrow && (
        <>
          <div className="flex flex-col gap-1 text-xs text-ink-500">
            <span>
              Creator: <span className="font-mono">{shortAddress(escrow.creator)}</span>
            </span>
            <span>
              Recipient: <span className="font-mono">{shortAddress(escrow.recipient)}</span>
            </span>
          </div>
          <MilestoneStepper milestones={escrow.milestones} />
          <ActionPanel escrowId={activeId!} escrow={escrow} onChanged={() => refresh()} />
        </>
      )}
    </div>
  );
}
