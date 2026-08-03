import Link from "next/link";

// Shared breadcrumb + section navigation for the SEO review surfaces, so every
// page states where it sits and how to get to the others.

export type SeoSection = "articles" | "index" | "changes" | "article";

const SECTIONS: { key: SeoSection; href: string; label: string }[] = [
  { key: "articles", href: "/seo-audit", label: "All articles" },
  { key: "index", href: "/review/index.html", label: "Review status" },
  { key: "changes", href: "/seo-review/changes", label: "Change log" },
];

export function SeoNav({
  active,
  crumbs = [],
}: {
  active: SeoSection;
  crumbs?: { label: string; href?: string }[];
}) {
  return (
    <nav aria-label="SEO review" className="mb-6">
      <div className="flex flex-wrap gap-1 mb-3">
        {SECTIONS.map((s) => {
          const isActive = s.key === active;
          return (
            <Link
              key={s.key}
              href={s.href}
              aria-current={isActive ? "page" : undefined}
              className={`text-sm px-3 py-1.5 rounded-lg border transition-colors ${
                isActive
                  ? "bg-text-primary text-surface border-text-primary font-medium"
                  : "bg-surface text-text-secondary border-border-light hover:border-accent-strong hover:text-accent-strong"
              }`}
            >
              {s.label}
            </Link>
          );
        })}
      </div>
      {crumbs.length > 0 && (
        <ol className="flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
          <li>
            <Link href="/" className="hover:underline">
              Home
            </Link>
          </li>
          {crumbs.map((c, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <span aria-hidden="true">/</span>
              {c.href ? (
                <Link href={c.href} className="hover:underline">
                  {c.label}
                </Link>
              ) : (
                <span className="text-text-secondary">{c.label}</span>
              )}
            </li>
          ))}
        </ol>
      )}
    </nav>
  );
}
