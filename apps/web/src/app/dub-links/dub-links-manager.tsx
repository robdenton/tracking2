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

interface Mapping {
  shortLink: string;
  partnerName: string;
}

interface Suggestion {
  shortLink: string;
  partnerName: string;
  confidence: "high" | "medium" | "low";
  reasoning: string;
}

interface Props {
  newsletterPartners: string[];
  initialMappings: Mapping[];
}

export function DubLinksManager({ newsletterPartners, initialMappings }: Props) {
  const [links, setLinks] = useState<DubLink[]>([]);
  const [mappings, setMappings] = useState<Mapping[]>(initialMappings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [suggesting, setSuggesting] = useState(false);

  useEffect(() => {
    fetch("/api/dub/links")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setError(data.error);
        } else {
          setLinks(data);
        }
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
        // Remove from suggestions once accepted
        setSuggestions((prev) =>
          prev.filter(
            (s) => !(s.shortLink === shortLink && s.partnerName === partnerName)
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
    if (links.length === 0) return;
    setSuggesting(true);
    setError(null);
    try {
      const mappedLinkSet = new Set(mappings.map((m) => m.shortLink));
      const mappedPartnerSet = new Set(mappings.map((m) => m.partnerName));
      const unmappedLinks = links.filter((l) => !mappedLinkSet.has(l.shortLink));
      const unmappedPartners = newsletterPartners.filter(
        (p) => !mappedPartnerSet.has(p)
      );

      if (unmappedPartners.length === 0) {
        setSuggestions([]);
        return;
      }

      const res = await fetch("/api/dub/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          links: unmappedLinks,
          partners: unmappedPartners,
        }),
      });

      if (!res.ok) throw new Error("Suggest API failed");

      const data = await res.json();
      if (Array.isArray(data)) {
        setSuggestions(data);
      } else if (data.error) {
        setError(data.error);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Auto-suggest failed");
    } finally {
      setSuggesting(false);
    }
  }, [links, mappings, newsletterPartners]);

  const mappedPartners = new Set(mappings.map((m) => m.partnerName));
  const mappedLinks = new Set(mappings.map((m) => m.shortLink));

  // Partners not yet mapped
  const unmappedPartners = newsletterPartners.filter(
    (p) => !mappedPartners.has(p)
  );

  // Filter links
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
        Loading Dub links from API...
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
                      <td className="px-4 py-2 font-medium">{m.partnerName}</td>
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

      {/* LLM Suggestions */}
      {suggestions.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">
            Suggested Matches ({suggestions.length})
          </h2>
          <p className="text-sm text-gray-500 mb-3">
            AI-suggested matches based on link metadata. Review and accept or
            dismiss each suggestion.
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
                    <span className="text-gray-400">→</span>
                    <span className="font-mono text-xs text-blue-600 dark:text-blue-400">
                      {s.shortLink.replace("https://", "")}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded ${
                        s.confidence === "high"
                          ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                          : s.confidence === "medium"
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
              {unmappedPartners.length !== 1 ? "s" : ""}. Select a Dub link for
              each partner.
            </p>
          </div>
          {unmappedPartners.length > 0 && (
            <button
              onClick={runAutoSuggest}
              disabled={suggesting || links.length === 0}
              className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {suggesting ? "Analyzing..." : "Auto-suggest matches"}
            </button>
          )}
        </div>

        {/* Filter */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Filter Dub links by URL, title, comments, or tag..."
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
              Available Dub Links (
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
          <option value="">Select a Dub link...</option>
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
