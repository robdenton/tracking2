"use client";

import { useRouter, useSearchParams } from "next/navigation";

type View = "organic" | "paid" | "all";

export function ViewToggle({ current }: { current: View }) {
  const router = useRouter();
  const params = useSearchParams();

  function setView(v: View) {
    const sp = new URLSearchParams(params.toString());
    sp.set("view", v);
    router.push(`?${sp.toString()}`);
  }

  const options: { value: View; label: string }[] = [
    { value: "organic", label: "Organic" },
    { value: "paid", label: "Paid Sponsors" },
    { value: "all", label: "All" },
  ];

  return (
    <div className="inline-flex rounded-md border border-border bg-surface p-0.5">
      {options.map((opt) => {
        const active = opt.value === current;
        return (
          <button
            key={opt.value}
            onClick={() => setView(opt.value)}
            className={
              "px-3 py-1.5 text-xs font-medium rounded-md transition-colors " +
              (active
                ? "bg-accent-light text-accent-strong"
                : "text-text-secondary hover:text-text-primary")
            }
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
