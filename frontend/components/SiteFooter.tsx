import { ESCROW_CONTRACT_ADDRESS, ARBITER_CONTRACT_ADDRESS, STELLAR_NETWORK } from "@/lib/env";
import { shortAddress } from "@/lib/format";

export function SiteFooter() {
  const explorerBase = `https://stellar.expert/explorer/${STELLAR_NETWORK}/contract`;

  return (
    <footer className="border-t border-ink-500/15 bg-parchment-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-8 text-xs text-ink-500 sm:px-8">
        <div className="flex flex-wrap items-center gap-x-8 gap-y-2">
          <div>
            <span className="font-semibold text-ink-700">escrow </span>
            <a
              className="font-mono underline hover:text-pine-700"
              href={`${explorerBase}/${ESCROW_CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {shortAddress(ESCROW_CONTRACT_ADDRESS)}
            </a>
          </div>
          <div>
            <span className="font-semibold text-ink-700">arbiter </span>
            <a
              className="font-mono underline hover:text-pine-700"
              href={`${explorerBase}/${ARBITER_CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {shortAddress(ARBITER_CONTRACT_ADDRESS)}
            </a>
          </div>
          <div>
            <span className="font-semibold text-ink-700">network </span>
            {STELLAR_NETWORK}
          </div>
        </div>
        <p>
          Waypoint is a milestone escrow dApp built on Soroban. Funds unlock stage by stage;
          disputes resolve through a designated arbiter, never by force.
        </p>
      </div>
    </footer>
  );
}
