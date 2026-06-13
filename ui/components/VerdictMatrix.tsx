"use client";

import { useState } from "react";
import { AuditResult } from "@/lib/types";
import { MOCK_RESULTS } from "@/lib/mock-results";
import VerdictBadge from "./VerdictBadge";
import CitationPanel from "./CitationPanel";
import ProgressLog from "./ProgressLog";

type RunState = "idle" | "running" | "done" | "error";

export default function VerdictMatrix() {
  const [results, setResults]     = useState<AuditResult[]>(MOCK_RESULTS);
  const [selected, setSelected]   = useState<AuditResult | null>(null);
  const [runState, setRunState]   = useState<RunState>("idle");
  const [errorMsg, setErrorMsg]   = useState<string>("");
  const [isLive, setIsLive]       = useState(false);
  const [logEntries, setLogEntries] = useState<string[]>([]);

  const satisfied = results.filter((r) => r.verdict === "SATISFIED").length;
  const violated  = results.filter((r) => r.verdict === "VIOLATED").length;
  const unknown   = results.filter((r) => r.verdict === "UNKNOWN").length;

  async function runAudit() {
    setRunState("running");
    setLogEntries([]);
    setErrorMsg("");

    try {
      const res = await fetch("/api/audit", { method: "POST" });
      if (!res.body) throw new Error("No response body from server");

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer    = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data: ")) continue;

          const payload = JSON.parse(line.slice(6));

          if (payload.type === "status") {
            setLogEntries((prev) => [...prev, payload.message]);
          } else if (payload.type === "done") {
            setResults(payload.results);
            setIsLive(true);
            setRunState("done");
          } else if (payload.type === "error") {
            throw new Error(payload.message);
          }
        }
      }
    } catch (err) {
      setErrorMsg(String(err));
      setRunState("error");
    }
  }

  function exportReport() {
    const report = {
      generated_at: new Date().toISOString(),
      source: isLive ? "Foundry IQ — live" : "mock",
      summary: { satisfied, violated, unknown, total: results.length },
      results,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `ground-truth-audit-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Controls bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!isLive && (
            <span className="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">preview — mock data</span>
          )}
          {isLive && (
            <span className="text-xs bg-blue-900 text-blue-300 border border-blue-700 px-2 py-1 rounded">live — Foundry IQ</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {runState === "done" && (
            <button
              onClick={exportReport}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm font-medium rounded-lg transition-colors"
            >
              Export Report
            </button>
          )}
          <button
            onClick={runAudit}
            disabled={runState === "running"}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {runState === "running" ? "Running audit…" : "Run Audit"}
          </button>
        </div>
      </div>

      {runState === "error" && (
        <div className="bg-red-950 border border-red-800 rounded p-3 text-sm text-red-300">
          {errorMsg}
        </div>
      )}

      {/* Live progress log */}
      {(runState === "running" || (runState === "done" && logEntries.length > 0)) && (
        <ProgressLog entries={logEntries} isComplete={runState === "done"} />
      )}

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-green-950 border border-green-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-300">{satisfied}</div>
          <div className="text-sm text-green-500 mt-1">Satisfied</div>
        </div>
        <div className="bg-red-950 border border-red-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-300">{violated}</div>
          <div className="text-sm text-red-500 mt-1">Violated</div>
        </div>
        <div className="bg-yellow-950 border border-yellow-800 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-300">{unknown}</div>
          <div className="text-sm text-yellow-500 mt-1">Unknown</div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-900 text-gray-400 text-xs uppercase tracking-wide">
            <tr>
              <th className="px-4 py-3 text-left">Control</th>
              <th className="px-4 py-3 text-left">Title</th>
              <th className="px-4 py-3 text-left">Resource</th>
              <th className="px-4 py-3 text-left">Verdict</th>
              <th className="px-4 py-3 text-left">Citations</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {results.map((r, i) => (
              <tr
                key={i}
                className="bg-gray-900 hover:bg-gray-800 cursor-pointer transition-colors"
                onClick={() => setSelected(r)}
              >
                <td className="px-4 py-3 font-mono text-gray-300 whitespace-nowrap">{r.control_id}</td>
                <td className="px-4 py-3 text-gray-200">{r.title}</td>
                <td className="px-4 py-3 font-mono text-gray-400 text-xs">{r.resource}</td>
                <td className="px-4 py-3"><VerdictBadge verdict={r.verdict} /></td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {r.verdict === "UNKNOWN" ? (
                    <span className="text-yellow-600">abstained</span>
                  ) : (
                    <span className="text-blue-500 hover:text-blue-300">view receipts →</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-600 text-center">
        Click any row to view grounded citations · UNKNOWN = agent abstained (no evidence found)
      </p>

      {selected && <CitationPanel result={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
