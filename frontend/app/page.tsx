"use client";

import { useState } from "react";
import { WalletButton } from "@/components/WalletButton";
import { CreateEscrowForm } from "@/components/CreateEscrowForm";
import { EscrowViewer } from "@/components/EscrowViewer";

export default function Home() {
  const [view, setView] = useState<"create" | "view">("view");
  const [focusedId, setFocusedId] = useState<number | null>(null);

  return (
    <main className="min-h-screen bg-parchment-50 px-4 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold text-ink-900 sm:text-4xl">
              Waypoint
            </h1>
            <p className="mt-1 text-sm text-ink-500">
              Milestone escrow for staged projects on Stellar. Funds unlock one waypoint at a
              time.
            </p>
          </div>
          <WalletButton />
        </header>

        <nav className="flex flex-wrap gap-2 border-b border-ink-500/20 pb-2">
          <button
            onClick={() => setView("view")}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold sm:px-4 sm:text-sm ${
              view === "view"
                ? "bg-ink-900 text-parchment-50"
                : "text-ink-700 hover:bg-parchment-100"
            }`}
          >
            View escrow
          </button>
          <button
            onClick={() => setView("create")}
            className={`whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold sm:px-4 sm:text-sm ${
              view === "create"
                ? "bg-ink-900 text-parchment-50"
                : "text-ink-700 hover:bg-parchment-100"
            }`}
          >
            Chart new project
          </button>
        </nav>

        {view === "create" ? (
          <CreateEscrowForm
            onCreated={(id) => {
              setFocusedId(id);
              setView("view");
            }}
          />
        ) : (
          <EscrowViewer initialId={focusedId} onIdChange={setFocusedId} />
        )}
      </div>
    </main>
  );
}
