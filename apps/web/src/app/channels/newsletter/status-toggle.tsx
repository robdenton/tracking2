"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function StatusToggle({ liveOnly }: { liveOnly: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setMode(live: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    if (live) {
      params.set("liveOnly", "1");
    } else {
      params.delete("liveOnly");
    }
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex rounded-full border border-border text-[12px] overflow-hidden">
      <button
        onClick={() => setMode(false)}
        className={`px-3.5 py-1.5 font-medium transition-colors ${
          !liveOnly
            ? "bg-accent-light text-accent-strong"
            : "text-text-muted hover:bg-surface-sunken hover:text-text-secondary"
        }`}
      >
        All Statuses
      </button>
      <button
        onClick={() => setMode(true)}
        className={`px-3.5 py-1.5 font-medium transition-colors ${
          liveOnly
            ? "bg-accent-light text-accent-strong"
            : "text-text-muted hover:bg-surface-sunken hover:text-text-secondary"
        }`}
      >
        Live Only
      </button>
    </div>
  );
}
