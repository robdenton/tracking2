"use client";

import { useEffect, useState, useCallback } from "react";

interface DubLink {
  shortLink: string;
  url: string;
  key: string;
  domain: string;
  title: string | null;
  description: string | null;
  comments: string | null;
  tags: string[];
  clicks: number;
  leads: number;
}

interface DubPartner {
  id: string;
  name: string;
  companyName: string | null;
  email: string | null;
  country: string | null;
  description: string | null;
  website: string | null;
  totalClicks: number;
  totalLeads: number;
  links: {
    shortLink: string;
    url: string;
    key: string;
    clicks: number;
    leads: number;
  }[];
}

interface Mapping {
  shortLink: string;
  partnerName: string;
}

interface Suggestion {
  shortLink: string;
  partnerName: string;
  confidence: "high" | "medium" | "low";
  reasoning: string;
  dubPartnerId?: string;
  dubPartnerName?: string;
}

interface Props {
  newsletterPartners: string[];
  initialMappings: Mapping[];
}

export function DubLinksManager({ newsletterPartners, initialMappings }: Props) {
  const [links, setLinks] = useState<DubLink[]>([]);
  const [dubPartners, setDubPartners] = useState<DubPartner[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>(initialMappings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [autoMatched, setAutoMatched] = useState<string[]>([]);
  const [autoMatchStatus, setAutoMatchStatus] = useState<string | null>(null);

  // Fetch partner links only (not regular workspace links)
  useEffect(() => {
    fetch("/api/dub/partners")
      .then((r) => r.json())
      .then((data) => {
        if (!Array.isArray(data)) {
          setError(data.error || "Failed to load Dub partners");
          return;
        }
        setDubPartners(data);

        // Convert partner links into the DubLink format for display and dropdowns
        const partnerLinks: DubLink[] = data.flatMap((p: DubPartner) =>
          p.links.map((l) => ({
            shortLink: l.shortLink,
            url: l.url,
            key: l.key,
            domain: l.shortLink.split("/")[2] ?? "",
            title: null,
            description: null,
            comments: `Partner: ${p.name}${p.companyName ? ` (${p.companyName})` : ""}`,
            tags: ["partner"],
            clicks: l.clicks,
            leads: l.leads,
          }))
        );
        setLinks(partnerLinks);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const saveMapping = useCallback(
    async (shortLink: string, partnerName: string) => {
      setSaving(shortLink);
      try {
        const res = await fetch("/api/dub/mappings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shortLink, partnerName }),
        });
        if (!res.ok) throw new Error("Failed to save");

        setMappings((prev) => {
          const without = prev.filter((m) => m.shortLink !== shortLink);
          return [...without, { shortLink, partnerName }];
        });
        setSuggestions((prev) =>
          prev.filter(
            (s) =>
              !(s.shortLink === shortLink && s.partnerName === partnerName)
          )
        );
      } catch (e) {
        setError(e instanceof Error ? e.message : "Save failed");
      } finally {
        setSaving(null);
      }
    },
    []
  );

  const removeMapping = useCallback(async (shortLink: string) => {
    setSaving(shortLink);
    try {
      const res = await fetch("/api/dub/mappings", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ shortLink }),
      });
      if (!res.ok) throw new Error("Failed to delete");

      setMappings((prev) => prev.filter((m) => m.shortLink !== shortLink));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setSaving(null);
    }
  }, []);

  const runAutoSuggest = useCallback(async () => {
    if (links.length === 0 && dubPartners.length === 0) return;
    setSuggesting(true);
    setError(null);
    setAutoMatchStatus(null);
    try {
      const mappedLinkSet = new Set(mappings.map((m) => m.shortLink));
      const mappedPartnerSet = new Set(mappings.map((m) => m.partnerName));
      const unmappedLinks = links.filter(
        (l) => !mappedLinkSet.has(l.shortLink)
      );
      const unmappedPartners = newsletterPartners.filter(
        (p) => !mappedPartnerSet.has(p)
      );

      if (unmappedPartners.length === 0) {
        setSuggestions([]);
        setAutoMatchStatus("All partners are already mapped.");
        return;
      }

      const res = await fetch("/api/dub/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          links: unmappedLinks,
          partners: unmappedPartners,
          dubPartners: dubPartners,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Suggest API failed (${res.status})`);
      }

      const data = await res.json();
      if (!Array.isArray(data)) {
        if (data.error) setError(data.error);
        return;
      }

      // Auto-save high-confidence matches
      const highConfidence = data.filter(
        (s: Suggestion) => s.confidence === "high"
      );
      const rest = data.filter(
        (s: Suggestion) => s.confidence !== "high"
      );

      const autoSaved: string[] = [];

      for (const match of highConfidence) {
        try {
          const saveRes = await fetch("/api/dub/mappings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              shortLink: match.shortLink,
              partnerName: match.partnerName,
            }),
          });
          if (saveRes.ok) {
            setMappings((prev) => {
              const without = prev.filter(
                (m) => m.shortLink !== match.shortLink
              );
              return [
                ...without,
                {
                  shortLink: match.shortLink,
                  partnerName: match.partnerName,
                },
              ];
            });
            autoSaved.push(match.partnerName);
          }
        } catch {
          // If auto-save fails, fall through to manual suggestions
          rest.push(match);
        }
      }

      setAutoMatched(autoSaved);
      setSuggestions(rest);

      if (autoSaved.length > 0 && rest.length > 0) {
        setAutoMatchStatus(
          `Auto-matched ${autoSaved.length} partner${autoSaved.length !== 1 ? "s" : ""} (high confidence). ${rest.length} remaining for manual review.`
        );
      } else if (autoSaved.length > 0) {
        setAutoMatchStatus(
          `Auto-matched ${autoSaved.length} partner${autoSaved.length !== 1 ? "s" : ""} (high confidence). No remaining matches to review.`
        );
      } else if (rest.length > 0) {
        setAutoMatchStatus(
          `No high-confidence matches found. ${rest.length} suggestion${rest.length !== 1 ? "s" : ""} for manual review.`
        );
      } else {
        setAutoMatchStatus(
          "No matches could be inferred from the available data."
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Auto-suggest failed");
    } finally {
      setSuggesting(false);
    }
  }, [links, dubPartners, mappings, newsletterPartners]);

  const mappedPartners = new Set(mappings.map((m) => m.partnerName));
  const mappedLinks = new Set(mappings.map((m) => m.shortLink));

  const unmappedPartners = newsletterPartners.filter(
    (p) => !mappedPartners.has(p)
  );

  const filteredLinks = links.filter((l) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    return (
      l.shortLink.toLowerCase().includes(q) ||
      l.url.toLowerCase().includes(q) ||
      (l.title && l.title.toLowerCase().includes(q)) ||
      (l.comments && l.comments.toLowerCase().includes(q)) ||
      l.tags.some((t) => t.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return (
      <div className="text-gray-500 text-sm py-8">
        Loading Dub partner links...
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-4 rounded-lg text-sm">
        {error}
        <button
          onClick={() => setError(null)}
          className="ml-2 underline text-xs"
        >
          Dismiss
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Data source summary */}
      <div className="text-xs text-gray-500 flex gap-4">
        <span>{dubPartners.length} Dub partners loaded</span>
        <span>{links.length} partner links</span>
        <span>
          {mappings.length} mapped, {unmappedPartners.length} unmapped
        </span>
      </div>

      {/* Auto-match status */}
      {autoMatchStatus && (
        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 p-4 rounded-lg text-sm flex items-start justify-between">
          <div>
            <div className="font-medium mb-1">Auto-match results</div>
            <div>{autoMatchStatus}</div>
            {autoMatched.length > 0 && (
              <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                Auto-matched: {autoMatched.join(", ")}
              </div>
            )}
          </div>
          <button
            onClick={() => {
              setAutoMatchStatus(null);
              setAutoMatched([]);
            }}
            className="text-xs underline shrink-0 ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Existing Mappings */}
      {mappings.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">
            Active Mappings ({mappings.length})
          </h2>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-400">
                    Newsletter Partner
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-gray-600 dark:text-gray-400">
                    Dub Link
                  </th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600 dark:text-gray-400">
                    Total Clicks
                  </th>
                  <th className="text-right px-4 py-2 font-medium text-gray-600 dark:text-gray-400">
                    Leads
                  </th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {mappings.map((m) => {
                  const link = links.find((l) => l.shortLink === m.shortLink);
                  return (
                    <tr key={m.shortLink}>
                      <td className="px-4 py-2 font-medium">
                        {m.partnerName}
                        {autoMatched.includes(m.partnerName) && (
                          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                            auto
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2 text-gray-600 dark:text-gray-400 font-mono text-xs">
                        <a
                          href={m.shortLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline"
                        >
                          {m.shortLink.replace("https://", "")}
                        </a>
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {link?.clicks?.toLocaleString() ?? "-"}
                      </td>
                      <td className="px-4 py-2 text-right font-mono">
                        {link?.leads?.toLocaleString() ?? "-"}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => removeMapping(m.shortLink)}
                          disabled={saving === m.shortLink}
                          className="text-red-500 hover:text-red-700 text-xs disabled:opacity-50"
                        >
                          {saving === m.shortLink ? "..." : "Remove"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Medium/Low Confidence Suggestions for Manual Review */}
      {suggestions.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">
            Review Suggestions ({suggestions.length})
          </h2>
          <p className="text-sm text-gray-500 mb-3">
            These matches need manual review — the AI wasn&apos;t confident
            enough to auto-match them.
          </p>
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-800">
            {suggestions.map((s) => (
              <div
                key={`${s.shortLink}-${s.partnerName}`}
                className="px-4 py-3 flex items-center justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">
                      {s.partnerName}
                    </span>
                    <span className="text-gray-400">&rarr;</span>
                    <span className="font-mono text-xs text-blue-600 dark:text-blue-400">
                      {s.shortLink.replace("https://", "")}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        s.confidence === "medium"
                          ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                      }`}
                    >
                      {s.confidence}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {s.reasoning}
                  </div>
                  {s.dubPartnerName && (
                    <div className="text-xs text-purple-600 dark:text-purple-400 mt-0.5">
                      Dub partner: {s.dubPartnerName}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => saveMapping(s.shortLink, s.partnerName)}
                    disabled={saving !== null}
                    className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                  >
                    Accept
                  </button>
                  <button
                    onClick={() =>
                      setSuggestions((prev) =>
                        prev.filter(
                          (x) =>
                            !(
                              x.shortLink === s.shortLink &&
                              x.partnerName === s.partnerName
                            )
                        )
                      )
                    }
                    className="px-3 py-1 text-xs text-gray-500 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Matching UI */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold">Match Links to Partners</h2>
            <p className="text-sm text-gray-500 mt-1">
              {unmappedPartners.length} unmapped newsletter partner
              {unmappedPartners.length !== 1 ? "s" : ""}. Auto-match saves
              high-confidence matches automatically.
            </p>
          </div>
          {unmappedPartners.length > 0 && (
            <button
              onClick={runAutoSuggest}
              disabled={
                suggesting || (links.length === 0 && dubPartners.length === 0)
              }
              className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {suggesting ? "Analyzing..." : "Auto-match partners"}
            </button>
          )}
        </div>

        {/* Filter */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Filter partner links by URL, partner name, or tag..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Newsletter Partners */}
          <div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Unmapped Newsletter Partners
            </h3>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-800 max-h-[600px] overflow-y-auto">
              {unmappedPartners.length === 0 ? (
                <div className="p-4 text-sm text-gray-400">
                  All partners have been mapped.
                </div>
              ) : (
                unmappedPartners.map((partner) => (
                  <PartnerRow
                    key={partner}
                    partner={partner}
                    links={filteredLinks.filter(
                      (l) => !mappedLinks.has(l.shortLink)
                    )}
                    saving={saving}
                    onSave={saveMapping}
                  />
                ))
              )}
            </div>
          </div>

          {/* Right: Dub Links */}
          <div>
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">
              Partner Links (
              {
                filteredLinks.filter((l) => !mappedLinks.has(l.shortLink))
                  .length
              }{" "}
              unmapped)
            </h3>
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg divide-y divide-gray-100 dark:divide-gray-800 max-h-[600px] overflow-y-auto">
              {filteredLinks
                .filter((l) => !mappedLinks.has(l.shortLink))
                .sort((a, b) => b.clicks - a.clicks)
                .map((link) => (
                  <div
                    key={link.shortLink}
                    className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-mono text-xs text-blue-600 dark:text-blue-400 truncate">
                          {link.shortLink.replace("https://", "")}
                        </div>
                        <div className="text-xs text-gray-500 truncate mt-0.5">
                          {link.url || "(no destination)"}
                        </div>
                        {link.title && (
                          <div className="text-xs text-gray-400 truncate mt-0.5">
                            {link.title}
                          </div>
                        )}
                        {link.comments && (
                          <div className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
                            Note: {link.comments}
                          </div>
                        )}
                        {link.tags.length > 0 && (
                          <div className="flex gap-1 mt-1">
                            {link.tags.map((t) => (
                              <span
                                key={t}
                                className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-400"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="text-xs font-mono">
                          {link.clicks.toLocaleString()}
                        </div>
                        <div className="text-[10px] text-gray-400">clicks</div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/** A single newsletter partner row with a dropdown to select a Dub link */
function PartnerRow({
  partner,
  links,
  saving,
  onSave,
}: {
  partner: string;
  links: DubLink[];
  saving: string | null;
  onSave: (shortLink: string, partnerName: string) => void;
}) {
  const [selected, setSelected] = useState("");

  return (
    <div className="px-4 py-3">
      <div className="font-medium text-sm mb-2">{partner}</div>
      <div className="flex gap-2">
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="flex-1 text-xs px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900"
        >
          <option value="">Select a partner link...</option>
          {links
            .sort((a, b) => b.clicks - a.clicks)
            .map((l) => (
              <option key={l.shortLink} value={l.shortLink}>
                {l.shortLink.replace("https://", "")} (
                {l.clicks.toLocaleString()} clicks)
                {l.comments ? ` - ${l.comments}` : ""}
              </option>
            ))}
        </select>
        <button
          onClick={() => {
            if (selected) onSave(selected, partner);
          }}
          disabled={!selected || saving !== null}
          className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? "..." : "Link"}
        </button>
      </div>
    </div>
  );
}
