"use client";

import { useRouter, useSearchParams } from "next/navigation";

export function AffiliateToggle({ excluded }: { excluded: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function toggle() {
    const params = new URLSearchParams(searchParams.toString());
    if (excluded) {
      params.delete("excludeAffiliates");
    } else {
      params.set("excludeAffiliates", "1");
    }
    router.push(`?${params.toString()}`);
  }

  return (
    <button
      onClick={toggle}
      className={`px-3 py-1 rounded text-xs transition-colors ${
        excluded
          ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
      }`}
    >
      {excluded ? "Affiliates excluded" : "Include affiliates"}
    </button>
  );
}
