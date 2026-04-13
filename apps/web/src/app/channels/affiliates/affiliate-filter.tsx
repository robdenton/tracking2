"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function AffiliateFilter({ current }: { current: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setFilter(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("filter");
    } else {
      params.set("filter", value);
    }
    router.push(`?${params.toString()}`);
  }

  return (
    <div className="flex rounded-md border border-border-light text-xs overflow-hidden">
      <button
        onClick={() => setFilter("all")}
        className={`px-3 py-1.5 transition-colors ${
          current === "all"
            ? "bg-accent-light text-accent-strong"
            : "text-text-secondary hover:bg-surface-sunken"
        }`}
      >
        All Partners
      </button>
      <button
        onClick={() => setFilter("affiliate")}
        className={`px-3 py-1.5 transition-colors ${
          current === "affiliate"
            ? "bg-accent-light text-accent-strong"
            : "text-text-secondary hover:bg-surface-sunken"
        }`}
      >
        Affiliates Only
      </button>
    </div>
  );
}
