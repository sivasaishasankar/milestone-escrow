const FAQS = [
  {
    q: "What happens if I never approve a milestone?",
    a: "It stays Locked and the funds stay in the escrow contract. Nothing releases automatically — approval (or a resolved dispute) is always required.",
  },
  {
    q: "Can the recipient release funds themselves?",
    a: "No. Only the creator can approve a Locked milestone, and only the designated arbiter can resolve a Disputed one. The recipient can raise a dispute, but can't trigger a payout.",
  },
  {
    q: "What happens if a dispute is rejected?",
    a: "The milestone stays Disputed and the funds stay locked in escrow. There's intentionally no automatic refund path — a human (or a follow-up governance process) has to decide what happens next.",
  },
  {
    q: "Who picks the designated arbiter?",
    a: "The project creator, at the time they register the escrow with the arbiter contract. It can be any Stellar address — a trusted third party, a multisig, or a DAO.",
  },
  {
    q: "Can a milestone be released twice?",
    a: "No — the contract flips a milestone to Released before it ever moves tokens, so a second release attempt hits an AlreadyReleased error on-chain, not just in the UI.",
  },
  {
    q: "What token does Waypoint use?",
    a: "Native XLM, via its Stellar Asset Contract wrapper. No custom token was written — SAC handles balances and transfers exactly like any other Soroban token.",
  },
  {
    q: "What if I try an action I'm not allowed to do?",
    a: "The UI disables the button and explains why before you even sign anything. If you somehow get past that, the simulated transaction fails and the same explanation is shown — the contract's own checks are the real source of truth, not the interface.",
  },
];

export default function FaqPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:px-8">
      <h1 className="font-display text-3xl font-bold text-ink-900 sm:text-4xl">
        Frequently asked questions
      </h1>
      <p className="mt-3 text-ink-700">How milestones, disputes, and roles actually behave.</p>

      <div className="mt-10 flex flex-col divide-y divide-ink-500/15">
        {FAQS.map((f) => (
          <details key={f.q} className="group py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold text-ink-900">
              {f.q}
              <span className="shrink-0 text-ink-500 transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-2 text-sm text-ink-700">{f.a}</p>
          </details>
        ))}
      </div>
    </main>
  );
}
