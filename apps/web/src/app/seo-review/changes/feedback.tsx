"use client";

import { useEffect, useState } from "react";

// Per-edit feedback controls for the change log, plus the filter bar that
// makes ~1,700 machine edits reviewable: filter to machine/human/flagged,
// flag an edit as wrong, say why. Flags queue a revert batch and feed the
// calibration for the next pass — they do not touch Sanity by themselves.

export function EditFeedback({
  id,
  initialFlagged,
  initialNote,
}: {
  id: string;
  initialFlagged: boolean;
  initialNote: string | null;
}) {
  const [flagged, setFlagged] = useState(initialFlagged);
  const [note, setNote] = useState(initialNote ?? "");
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const save = async (revert: boolean, noteText: string) => {
    setState("saving");
    setError(null);
    try {
      const res = await fetch("/api/seo-review/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, revert, note: noteText || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `HTTP ${res.status}`);
      setFlagged(revert);
      setState("saved");
      // Let the filter bar know this card's flag changed.
      document
        .querySelector(`[data-change-id="${id}"]`)
        ?.setAttribute("data-flagged", String(revert));
      setTimeout(() => setState("idle"), 1500);
    } catch (e) {
      setState("error");
      setError(e instanceof Error ? e.message : "save failed");
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-border-light">
      <div className="flex flex-wrap items-center gap-2">
        {flagged ? (
          <>
            <span className="text-xs font-semibold px-2 py-1 rounded bg-red-100 text-red-800">
              Flagged — will be reverted
            </span>
            <button
              onClick={() => save(false, note)}
              disabled={state === "saving"}
              className="text-xs px-2.5 py-1 rounded border border-border-light bg-surface hover:border-accent-strong"
            >
              Unflag
            </button>
          </>
        ) : (
          <button
            onClick={() => setOpen((v) => !v)}
            disabled={state === "saving"}
            className="text-xs px-2.5 py-1 rounded border border-border-light bg-surface text-text-secondary hover:border-red-400 hover:text-red-700"
          >
            Flag as wrong…
          </button>
        )}
        {state === "saving" && <span className="text-xs text-text-muted">saving…</span>}
        {state === "saved" && <span className="text-xs text-green-700">saved</span>}
        {state === "error" && <span className="text-xs text-red-700">{error}</span>}
      </div>
      {open && !flagged && (
        <div className="mt-2 flex flex-col gap-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What's wrong with this edit? (optional — helps calibrate the next pass)"
            rows={2}
            className="w-full text-sm px-3 py-2 bg-surface border border-border-light rounded-lg outline-none focus:border-accent-strong"
          />
          <div>
            <button
              onClick={() => {
                setOpen(false);
                save(true, note);
              }}
              disabled={state === "saving"}
              className="text-xs font-semibold px-3 py-1.5 rounded bg-red-700 text-white hover:bg-red-800"
            >
              Flag for revert
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const FILTERS = [
  { key: "all", label: "All edits" },
  { key: "auto", label: "Machine edits" },
  { key: "human", label: "My edits" },
  { key: "flagged", label: "Flagged" },
  { key: "warned", label: "With warnings" },
] as const;
type FilterKey = (typeof FILTERS)[number]["key"];

const FILTER_STORE = "granola-seo-review.changes-filter";

// The cards are server-rendered; this filters them client-side by the data
// attributes each card carries. Same persistence pattern as the review index.
export function ChangesFilter() {
  const [active, setActive] = useState<FilterKey>("all");
  const [counts, setCounts] = useState<Record<string, number>>({});

  const apply = (key: FilterKey) => {
    const cards = document.querySelectorAll<HTMLElement>("[data-change-id]");
    let shown = 0;
    cards.forEach((c) => {
      const isAuto = c.getAttribute("data-auto") === "true";
      const isFlagged = c.getAttribute("data-flagged") === "true";
      const isWarned = c.getAttribute("data-warned") === "true";
      const show =
        key === "all" ||
        (key === "auto" && isAuto) ||
        (key === "human" && !isAuto) ||
        (key === "flagged" && isFlagged) ||
        (key === "warned" && isWarned);
      c.style.display = show ? "" : "none";
      if (show) shown++;
    });
    const counter = document.getElementById("changes-count");
    if (counter) counter.textContent = `Showing ${shown} of ${cards.length} edits`;
    // The discarded section is not edits — hide it whenever a specific filter
    // is active, so "Machine edits (0)" never shows a page full of rejected
    // suggestions that look like uncounted edits.
    const disc = document.getElementById("discarded-section");
    if (disc) disc.style.display = key === "all" ? "" : "none";
  };

  useEffect(() => {
    const cards = document.querySelectorAll<HTMLElement>("[data-change-id]");
    const c: Record<string, number> = { all: cards.length, auto: 0, human: 0, flagged: 0, warned: 0 };
    cards.forEach((el) => {
      if (el.getAttribute("data-auto") === "true") c.auto++;
      else c.human++;
      if (el.getAttribute("data-flagged") === "true") c.flagged++;
      if (el.getAttribute("data-warned") === "true") c.warned++;
    });
    setCounts(c);
    let stored: FilterKey = "all";
    try {
      const v = localStorage.getItem(FILTER_STORE);
      if (v && FILTERS.some((f) => f.key === v)) stored = v as FilterKey;
    } catch {
      /* storage blocked */
    }
    setActive(stored);
    apply(stored);
  }, []);

  const choose = (key: FilterKey) => {
    setActive(key);
    try {
      localStorage.setItem(FILTER_STORE, key);
    } catch {
      /* ignore */
    }
    apply(key);
  };

  return (
    <div className="mb-4">
      <div className="flex flex-wrap gap-1.5 items-center">
        <span className="text-xs uppercase tracking-wider text-text-secondary font-medium mr-1">
          Show
        </span>
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => choose(f.key)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
              active === f.key
                ? "bg-text-primary text-white border-text-primary"
                : "bg-surface text-text-secondary border-border-light hover:border-accent-strong"
            }`}
          >
            {f.label}
            <span className="ml-1.5 opacity-60 font-normal">{counts[f.key] ?? ""}</span>
          </button>
        ))}
      </div>
      <div id="changes-count" className="text-xs text-text-muted mt-2" />
    </div>
  );
}
