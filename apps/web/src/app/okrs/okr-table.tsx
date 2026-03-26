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
        <thead className="border-b-2 border-gray-300 dark:border-gray-600">
          <tr>
            <th className="px-4 py-3 text-left font-medium text-gray-500">Activity</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">Q2 Target</th>
            <th className="px-1 py-3">
              <button
                onClick={() => setShowQ1(!showQ1)}
                className="text-[10px] px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors whitespace-nowrap"
              >
                {showQ1 ? "◂ Q1" : "Q1 ▸"}
              </button>
            </th>
            {q1Labels.map((h) => (
              <th key={h} className="q1-col px-4 py-3 text-right font-medium text-gray-400 text-xs bg-gray-50/50 dark:bg-gray-900/30">
                {h}
              </th>
            ))}
            {q2Labels.map((h) => (
              <th key={h} className="px-4 py-3 text-right font-medium text-gray-500">
                {h}
              </th>
            ))}
            <th className="px-4 py-3 text-right font-medium text-gray-500">Q2 Total</th>
            <th className="px-4 py-3 text-right font-medium text-gray-500">% of Q2</th>
          </tr>
        </thead>
        <tbody>
          {children}
        </tbody>
      </table>
    </div>
  );
}
