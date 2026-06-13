"use client";

import { Verdict } from "@/lib/types";

const config: Record<Verdict, { label: string; classes: string }> = {
  SATISFIED: { label: "✅ SATISFIED", classes: "bg-green-900 text-green-300 border border-green-700" },
  VIOLATED:  { label: "❌ VIOLATED",  classes: "bg-red-900 text-red-300 border border-red-700" },
  UNKNOWN:   { label: "⚠️ UNKNOWN",   classes: "bg-yellow-900 text-yellow-300 border border-yellow-700" },
  PENDING:   { label: "⏳ PENDING",   classes: "bg-gray-800 text-gray-400 border border-gray-600" },
};

export default function VerdictBadge({ verdict }: { verdict: Verdict }) {
  const { label, classes } = config[verdict];
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-mono font-semibold ${classes}`}>
      {label}
    </span>
  );
}
