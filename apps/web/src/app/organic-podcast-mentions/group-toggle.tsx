"use client";

import { useRouter, useSearchParams } from "next/navigation";

type GroupBy = "episodes" | "podcasts";

export function GroupToggle({ current }: { current: GroupBy }) {
  const router = useRouter();
  const params = useSearchParams();

  function set(v: GroupBy) {
    const sp = new URLSearchParams(params.toString());
    sp.set("group", v);
    router.push(`?${sp.toString()}`);
  }

  return (
    <div className="inline-flex rounded-md border border-border bg-surface p-0.5">
      <button
        onClick={() => set("episodes")}
        className={
          "px-3 py-1.5 text-xs font-medium rounded-md transition-colors " +
          (current === "episodes"
            ? "bg-accent-light text-accent-strong"
            : "text-text-secondary hover:text-text-primary")
        }
      >
        Episodes
      </button>
      <button
        onClick={() => set("podcasts")}
        className={
          "px-3 py-1.5 text-xs font-medium rounded-md transition-colors " +
          (current === "podcasts"
            ? "bg-accent-light text-accent-strong"
            : "text-text-secondary hover:text-text-primary")
        }
      >
        By podcast
      </button>
    </div>
  );
}
