"use client";

import { useSearchParams } from "next/navigation";

export function ExportButton() {
  const params = useSearchParams();

  const href = `/api/podscan/export?${params.toString()}`;

  return (
    <a
      href={href}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-border bg-surface text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors"
      title="Download current view as CSV"
    >
      <svg
        className="w-3.5 h-3.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
        />
      </svg>
      Export CSV
    </a>
  );
}
