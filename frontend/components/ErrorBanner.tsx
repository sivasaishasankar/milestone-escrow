"use client";

import type { AppError } from "@/lib/types";

export function ErrorBanner({ error, onDismiss }: { error: AppError; onDismiss?: () => void }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-rust-600/40 bg-rust-600/10 px-4 py-3 text-sm text-rust-700">
      <div>
        <span className="font-semibold uppercase tracking-wide">{labelFor(error.kind)}</span>
        <p className="mt-0.5 text-ink-700">{error.message}</p>
      </div>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="shrink-0 text-rust-700/70 hover:text-rust-700"
          aria-label="Dismiss"
        >
          ✕
        </button>
      )}
    </div>
  );
}

function labelFor(kind: AppError["kind"]): string {
  switch (kind) {
    case "wallet-not-found":
      return "Wallet not found";
    case "signature-rejected":
      return "Signature rejected";
    case "insufficient-balance":
      return "Insufficient balance";
    case "not-authorized":
      return "Not authorized";
  }
}
