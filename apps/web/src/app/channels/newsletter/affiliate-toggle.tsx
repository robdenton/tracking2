"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function AffiliateToggle({ excluded }: { excluded: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setMode(exclude: boolean) {
    const params = new URLSearchParams(searchParams.toString());
    if (exclude) {
      params.set("excludeAffiliates", "1");
    } else {
      params.delete("excludeAffiliates");
    }
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex rounded-full border border-border text-[12px] overflow-hidden">
      <button
        onClick={() => setMode(false)}
        className={`px-3.5 py-1.5 font-medium transition-colors ${
          !excluded
            ? "bg-accent-light text-accent-strong"
            : "text-text-muted hover:bg-surface-sunken hover:text-text-secondary"
        }`}
      >
        All Activities
      </button>
      <button
        onClick={() => setMode(true)}
        className={`px-3.5 py-1.5 font-medium transition-colors ${
          excluded
            ? "bg-accent-light text-accent-strong"
            : "text-text-muted hover:bg-surface-sunken hover:text-text-secondary"
        }`}
      >
        Excl. Affiliates
      </button>
    </div>
  );
}
