import { ESCROW_CONTRACT_ADDRESS, ARBITER_CONTRACT_ADDRESS, STELLAR_NETWORK } from "@/lib/env";

const NATIVE_SAC = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC";

const CONTRACTS = [
  {
    name: "escrow",
    role: "Custody + milestone state",
    address: ESCROW_CONTRACT_ADDRESS,
    detail:
      "Holds funds, stores each milestone's amount and status, and is the only place tokens actually move.",
  },
  {
    name: "arbiter",
    role: "Approval + dispute decisions",
    address: ARBITER_CONTRACT_ADDRESS,
    detail:
      "Owns the decision logic: normal approval by the creator, or dispute resolution by a designated arbiter address.",
  },
  {
    name: "native XLM SAC",
    role: "Settlement token",
    address: NATIVE_SAC,
    detail: "The Stellar Asset Contract wrapper for native XLM — no redundant custom token.",
  },
];

const ERRORS = [
  { code: 1, name: "EscrowNotFound", contract: "escrow" },
  { code: 2, name: "NoMilestones", contract: "escrow" },
  { code: 3, name: "NonPositiveAmount", contract: "escrow" },
  { code: 5, name: "AlreadyFunded", contract: "escrow" },
  { code: 6, name: "NotFunded", contract: "escrow" },
  { code: 8, name: "AlreadyReleased", contract: "escrow" },
  { code: 10, name: "NotAuthorized", contract: "escrow" },
  { code: 1, name: "NotCreator", contract: "arbiter" },
  { code: 2, name: "NotDesignatedArbiter", contract: "arbiter" },
  { code: 3, name: "InvalidMilestoneState", contract: "arbiter" },
];

export default function ArchitecturePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 sm:px-8">
      <h1 className="font-display text-3xl font-bold text-ink-900 sm:text-4xl">Architecture</h1>
      <p className="mt-3 text-ink-700">
        Three participants, one settlement asset, and exactly one path funds can take out of
        escrow.
      </p>

      <div className="paper-panel mt-10 overflow-x-auto rounded-2xl p-6">
        <pre className="whitespace-pre text-xs leading-relaxed text-ink-700 sm:text-sm">{`
                 +--------------------+
   creator --->  |  escrow contract   |  <- holds funds, milestone state
                 |  (custody + state) |
                 +---------+----------+
                            | release_milestone (arbiter-contract-gated)
                            v
                 +--------------------+          +------------------------+
   creator /     |  arbiter contract  | -------> | native XLM SAC token   |
   designated -->| (approve/resolve)  |  invoke  |  (transfer)            |
   arbiter       +--------------------+          +------------------------+
`}</pre>
      </div>

      <h2 className="mt-12 font-display text-xl font-bold text-ink-900">Contracts ({STELLAR_NETWORK})</h2>
      <div className="mt-4 flex flex-col gap-4">
        {CONTRACTS.map((c) => (
          <div key={c.name} className="paper-panel rounded-2xl p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="font-display text-lg font-bold text-ink-900">{c.name}</h3>
              <span className="text-xs uppercase tracking-wide text-ink-500">{c.role}</span>
            </div>
            <p className="mt-1 text-sm text-ink-700">{c.detail}</p>
            <a
              href={`https://stellar.expert/explorer/${STELLAR_NETWORK}/contract/${c.address}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block break-all font-mono text-xs text-pine-700 underline"
            >
              {c.address}
            </a>
          </div>
        ))}
      </div>

      <h2 className="mt-12 font-display text-xl font-bold text-ink-900">Inter-contract call chain</h2>
      <p className="mt-2 text-sm text-ink-700">
        Every payout — normal approval or a resolved dispute — goes through the same real,
        on-chain sequence:
      </p>
      <ol className="mt-4 flex flex-col gap-3">
        {[
          "arbiter.approve_milestone() or arbiter.resolve_dispute(approve: true)",
          "env.invoke_contract -> escrow.release_milestone()",
          "escrow requires the caller to BE the registered arbiter contract (require_auth on a contract address)",
          "env.invoke_contract -> native XLM SAC transfer(escrow -> recipient, amount)",
        ].map((step, i) => (
          <li key={step} className="flex gap-3 text-sm text-ink-700">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-pine-700 text-xs font-bold text-parchment-50">
              {i + 1}
            </span>
            <span className="pt-0.5 font-mono text-xs sm:text-sm">{step}</span>
          </li>
        ))}
      </ol>

      <h2 className="mt-12 font-display text-xl font-bold text-ink-900">Milestone states</h2>
      <div className="mt-4 flex flex-wrap gap-3">
        {[
          ["Locked", "#b8a888", "Default state after funding — nothing paid yet."],
          ["Released", "#3f6b4a", "Paid out to the recipient. Terminal — can't move again."],
          ["Disputed", "#a8432f", "Flagged by creator or recipient. Locked until the arbiter rules."],
        ].map(([label, color, desc]) => (
          <div key={label} className="flex flex-1 basis-56 flex-col gap-1 rounded-xl border border-ink-500/20 p-4">
            <span
              className="w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-parchment-50"
              style={{ backgroundColor: color }}
            >
              {label}
            </span>
            <p className="text-xs text-ink-700">{desc}</p>
          </div>
        ))}
      </div>

      <h2 className="mt-12 font-display text-xl font-bold text-ink-900">Contract error codes</h2>
      <div className="mt-4 overflow-x-auto rounded-xl border border-ink-500/20">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-parchment-100 text-ink-500">
            <tr>
              <th className="px-4 py-2 font-semibold">Contract</th>
              <th className="px-4 py-2 font-semibold">Code</th>
              <th className="px-4 py-2 font-semibold">Name</th>
            </tr>
          </thead>
          <tbody>
            {ERRORS.map((e) => (
              <tr key={`${e.contract}-${e.code}`} className="border-t border-ink-500/10">
                <td className="px-4 py-2 font-mono">{e.contract}</td>
                <td className="px-4 py-2 font-mono">{e.code}</td>
                <td className="px-4 py-2">{e.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
