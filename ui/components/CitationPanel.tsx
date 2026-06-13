"use client";

import { AuditResult } from "@/lib/types";

export default function CitationPanel({ result, onClose }: { result: AuditResult; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg max-w-xl w-full p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start">
          <h2 className="text-lg font-semibold">{result.control_id} — {result.title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl leading-none">×</button>
        </div>

        <div className="text-sm text-gray-300 space-y-1">
          <div><span className="text-gray-500">Resource:</span> <span className="font-mono">{result.resource}</span></div>
        </div>

        {result.standard_citation && (
          <div className="bg-gray-800 rounded p-3 space-y-1">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Standard citation</div>
            <div className="text-sm font-mono text-blue-300">{result.standard_citation}</div>
          </div>
        )}

        {result.evidence_citation ? (
          <div className="bg-gray-800 rounded p-3 space-y-1">
            <div className="text-xs text-gray-500 uppercase tracking-wide">Evidence citation</div>
            <div className="text-sm font-mono text-green-300">{result.evidence_citation}</div>
          </div>
        ) : (
          <div className="bg-yellow-950 border border-yellow-800 rounded p-3 space-y-1">
            <div className="text-xs text-yellow-500 uppercase tracking-wide">Abstained — no evidence citation</div>
            <div className="text-sm text-yellow-300">{result.unknown_reason}</div>
          </div>
        )}

        <div className="bg-gray-800 rounded p-3 space-y-1">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Reasoning</div>
          <div className="text-sm text-gray-200">{result.reasoning}</div>
        </div>

        {result.remediation && (
          <div className="bg-red-950 border border-red-800 rounded p-3 space-y-1">
            <div className="text-xs text-red-400 uppercase tracking-wide">Remediation</div>
            <div className="text-sm text-red-200">{result.remediation}</div>
          </div>
        )}
      </div>
    </div>
  );
}
