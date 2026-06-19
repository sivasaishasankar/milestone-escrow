"use client";

import { motion } from "framer-motion";
import type { Milestone } from "@/lib/types";
import { formatXlm } from "@/lib/format";

function statusColor(status: Milestone["status"]) {
  if (status === "Released") return "#3f6b4a";
  if (status === "Disputed") return "#a8432f";
  return "#b8a888";
}

function statusLabel(status: Milestone["status"]) {
  if (status === "Released") return "Reached";
  if (status === "Disputed") return "Disputed";
  return "Ahead";
}

/**
 * The hero element: a trail map connecting one "waypoint" pin per milestone.
 * Renders as a horizontal trail on wide viewports and switches to a vertical
 * trail below 480px (real layout change, not just a shrink).
 */
export function MilestoneStepper({ milestones }: { milestones: Milestone[] }) {
  const total = milestones.reduce((sum, m) => sum + m.amount, 0n);
  const released = milestones
    .filter((m) => m.status === "Released")
    .reduce((sum, m) => sum + m.amount, 0n);

  return (
    <div className="paper-panel rounded-2xl p-6 sm:p-8">
      <div className="mb-8 flex flex-col gap-1">
        <span className="text-xs uppercase tracking-[0.2em] text-ink-500">
          Funds released
        </span>
        <div className="flex items-baseline gap-2">
          <span className="font-display text-3xl font-bold text-pine-700">
            {formatXlm(released)}
          </span>
          <span className="text-ink-500">/ {formatXlm(total)} XLM total</span>
        </div>
      </div>

      {/* Horizontal trail (>=480px) */}
      <div className="hidden min-[480px]:block">
        <div className="relative flex items-start">
          <div
            className="absolute left-0 right-0 top-5 h-0.5"
            style={{
              backgroundImage:
                "repeating-linear-gradient(90deg, #b8a888 0, #b8a888 8px, transparent 8px, transparent 16px)",
            }}
          />
          {milestones.map((m, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-3">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.08, type: "spring", stiffness: 200, damping: 16 }}
                className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 border-parchment-50 text-sm font-bold text-parchment-50 shadow-md"
                style={{ backgroundColor: statusColor(m.status) }}
                title={`Milestone ${i + 1}: ${statusLabel(m.status)}`}
              >
                {m.status === "Released" ? "✓" : m.status === "Disputed" ? "!" : i + 1}
              </motion.div>
              <div className="flex flex-col items-center text-center">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-700">
                  Waypoint {i + 1}
                </span>
                <span className="text-xs text-ink-500">{formatXlm(m.amount)} XLM</span>
                <span
                  className="mt-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-parchment-50"
                  style={{ backgroundColor: statusColor(m.status) }}
                >
                  {statusLabel(m.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Vertical trail (<480px) */}
      <div className="block min-[480px]:hidden">
        <div className="relative flex flex-col gap-6 pl-5">
          <div
            className="absolute bottom-2 left-[19px] top-2 w-0.5"
            style={{
              backgroundImage:
                "repeating-linear-gradient(180deg, #b8a888 0, #b8a888 8px, transparent 8px, transparent 16px)",
            }}
          />
          {milestones.map((m, i) => (
            <div key={i} className="relative flex items-center gap-4">
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: i * 0.08 }}
                className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-parchment-50 text-sm font-bold text-parchment-50 shadow-md"
                style={{ backgroundColor: statusColor(m.status) }}
              >
                {m.status === "Released" ? "✓" : m.status === "Disputed" ? "!" : i + 1}
              </motion.div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-700">
                  Waypoint {i + 1} — {formatXlm(m.amount)} XLM
                </span>
                <span
                  className="mt-0.5 w-fit rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-parchment-50"
                  style={{ backgroundColor: statusColor(m.status) }}
                >
                  {statusLabel(m.status)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
