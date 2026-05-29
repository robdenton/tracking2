"use client";

import { useRouter, useSearchParams } from "next/navigation";

type Classification = "product" | "all" | "unclassified";

export function ClassificationToggle({ current }: { current: Classification }) {
  const router = useRouter();
  const params = useSearchParams();

  function set(v: Classification) {
    const sp = new URLSearchParams(params.toString());
    sp.set("classification", v);
    router.push(`?${sp.toString()}`);
  }

  const options: { value: Classification; label: string; title: string }[] = [
    {
      value: "product",
      label: "Credible only",
      title: "Tweets the AI classified as referring to Granola the product",
    },
    {
      value: "unclassified",
      label: "Awaiting review",
      title: "Tweets not yet classified by the AI",
    },
    { value: "all", label: "Show all", title: "Include food / ambiguous classifications too" },
  ];

  return (
    <div className="inline-flex rounded-md border border-border bg-surface p-0.5">
      {options.map((opt) => {
        const active = opt.value === current;
        return (
          <button
            key={opt.value}
            onClick={() => set(opt.value)}
            title={opt.title}
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
