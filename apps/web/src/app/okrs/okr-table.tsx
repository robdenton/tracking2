"use client";

import { useState, type ReactNode } from "react";

export function CollapsibleTable({
  children,
  q1Labels,
  q2Labels,
}: {
  children: ReactNode;
  q1Labels: string[];
  q2Labels: string[];
}) {
  const [showQ1, setShowQ1] = useState(false);

  return (
    <div className="overflow-x-auto">
      <style>{showQ1 ? "" : `.q1-col { display: none; }`}</style>
      <table className="w-full text-sm">
        <thead className="border-b-2 border-border ">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-text-secondary">Activity</th>
            <th className="px-4 py-3 text-right font-medium text-text-secondary">Q2 Target</th>
            <th className="px-1 py-3">
              <button
                onClick={() => setShowQ1(!showQ1)}
                className="text-[10px] px-2 py-0.5 rounded border border-border-light text-text-muted hover:text-text-secondary hover:bg-surface-sunken transition-colors whitespace-nowrap"
              >
                {showQ1 ? "◂ Q1" : "Q1 ▸"}
              </button>
            </th>
            {q1Labels.map((h) => (
              <th key={h} className="q1-col px-4 py-3 text-right font-medium text-text-muted text-xs bg-surface-sunken/50900/30">
                {h}
              </th>
            ))}
            {q2Labels.map((h) => (
              <th key={h} className="px-4 py-3 text-right font-medium text-text-secondary">
                {h}
              </th>
            ))}
            <th className="px-4 py-3 text-right font-medium text-text-secondary">Q2 Total</th>
            <th className="px-4 py-3 text-right font-medium text-text-secondary">% of Q2</th>
          </tr>
        </thead>
        <tbody>
          {children}
        </tbody>
      </table>
    </div>
  );
}
