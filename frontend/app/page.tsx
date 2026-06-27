import Link from "next/link";

const STEPS = [
  {
    n: "01",
    title: "Chart the route",
    body:
      "A creator sets a recipient, a designated arbiter, and a list of milestone amounts. Nothing moves yet — this just fixes the plan.",
  },
  {
    n: "02",
    title: "Lock the budget",
    body:
      "The creator funds the escrow in a single transaction: the full milestone total moves into the contract at once, in native XLM.",
  },
  {
    n: "03",
    title: "Reach each waypoint",
    body:
      "As work is delivered, the creator approves a milestone and its payment releases immediately — one stage at a time, never all at once.",
  },
  {
    n: "04",
    title: "Resolve disagreements fairly",
    body:
      "If a milestone is disputed, it doesn't get stuck or auto-pay. The designated arbiter reviews it and decides — release, or keep it locked.",
  },
];

const FEATURES = [
  {
    title: "Real inter-contract calls",
    body:
      "Approvals flow arbiter → escrow → the native XLM token contract through genuine env.invoke_contract calls, not addresses that merely sit next to each other.",
  },
  {
    title: "A fourth state, on purpose",
    body:
      "Beyond Locked and Released, a milestone can be Disputed — funds stay put until a designated arbiter actually rules on it.",
  },
  {
    title: "Access control that's enforced, not decorative",
    body:
      "Only the registered arbiter contract can trigger a payout. A direct call from anywhere else is rejected by the chain itself.",
  },
  {
    title: "No floating point, anywhere",
    body:
      "Every amount is i128 stroops with checked arithmetic. Overflow panics instead of silently wrapping.",
  },
];

export default function LandingPage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-20 pt-16 sm:px-8 sm:pt-24">
        <div className="pointer-events-none absolute inset-0 bg-topo-lines opacity-60" />
        <div className="relative mx-auto flex max-w-3xl flex-col items-start gap-6">
          <span className="rounded-full border border-pine-700/40 bg-pine-700/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-pine-700">
            Live on Stellar Testnet
          </span>
          <h1 className="font-display text-4xl font-bold leading-tight text-ink-900 sm:text-6xl">
            Pay for work as it&apos;s actually done.
          </h1>
          <p className="max-w-xl text-lg text-ink-700">
            Waypoint locks a project&apos;s budget in escrow and releases it milestone by
            milestone, not all at once. If a stage is disputed, a designated arbiter decides —
            funds never get stuck and never auto-release.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/app"
              className="rounded-full bg-pine-700 px-6 py-3 text-sm font-semibold text-parchment-50 shadow-sm hover:bg-pine-600"
            >
              Launch the app
            </Link>
            <Link
              href="/architecture"
              className="rounded-full border border-ink-500/40 px-6 py-3 text-sm font-semibold text-ink-700 hover:bg-parchment-100"
            >
              See how it works
            </Link>
          </div>
        </div>
      </section>

      {/* Stat strip */}
      <section className="border-y border-ink-500/15 bg-parchment-100/60">
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-6 px-4 py-8 text-center sm:grid-cols-4 sm:px-8">
          {[
            ["3", "contracts"],
            ["4", "milestone states"],
            ["6", "contract tests"],
            ["1", "settlement asset (native XLM)"],
          ].map(([n, label]) => (
            <div key={label} className="flex flex-col gap-1">
              <span className="font-display text-3xl font-bold text-pine-700">{n}</span>
              <span className="text-xs uppercase tracking-wide text-ink-500">{label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-16 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display text-2xl font-bold text-ink-900 sm:text-3xl">
            How a project moves along the trail
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {STEPS.map((s) => (
              <div key={s.n} className="paper-panel rounded-2xl p-6">
                <span className="font-display text-3xl font-bold text-trail-locked">{s.n}</span>
                <h3 className="mt-2 font-display text-lg font-bold text-ink-900">{s.title}</h3>
                <p className="mt-2 text-sm text-ink-700">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-parchment-100/60 px-4 py-16 sm:px-8">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display text-2xl font-bold text-ink-900 sm:text-3xl">
            Built for real custody, not a demo
          </h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-4">
                <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-pine-700" />
                <div>
                  <h3 className="font-semibold text-ink-900">{f.title}</h3>
                  <p className="mt-1 text-sm text-ink-700">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 sm:px-8">
        <div className="paper-panel mx-auto flex max-w-3xl flex-col items-start gap-4 rounded-2xl p-8">
          <h2 className="font-display text-2xl font-bold text-ink-900">Ready to chart a project?</h2>
          <p className="text-sm text-ink-700">
            Connect Freighter, set your milestones, and lock the budget. The trail stepper tracks
            every waypoint live.
          </p>
          <Link
            href="/app"
            className="rounded-full bg-pine-700 px-6 py-3 text-sm font-semibold text-parchment-50 shadow-sm hover:bg-pine-600"
          >
            Launch the app
          </Link>
        </div>
      </section>
    </main>
  );
}
