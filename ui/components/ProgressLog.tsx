"use client";

export default function ProgressLog({
  entries,
  isComplete,
}: {
  entries: string[];
  isComplete: boolean;
}) {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 font-mono text-sm space-y-2">
      {entries.map((msg, i) => {
        const isLast   = i === entries.length - 1;
        const resolved = !isLast || isComplete;
        return (
          <div key={i} className="flex items-center gap-2.5">
            {resolved ? (
              <span className="text-green-400 text-xs shrink-0">✓</span>
            ) : (
              <span className="text-blue-400 animate-pulse text-xs shrink-0">›</span>
            )}
            <span className={resolved ? "text-gray-400" : "text-gray-100"}>
              {msg}
            </span>
          </div>
        );
      })}
    </div>
  );
}
