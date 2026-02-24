# Newsletter Performance Analysis — Methodology

This document is the **living brief** for newsletter analysis reports. When feedback is given, this file is updated and committed. Every future analysis reads this file first and follows it exactly.

---

## Data Source

- **Always use production Neon Postgres** — never local SQLite (`dev.db`)
- Connection: ask user for `DATABASE_URL` if not in session context (it lives in Vercel environment variables)
- Prisma client location: `node_modules/@prisma/client/index.js` (project root)
- Query pattern: use a `.ts` script with `npx tsx`, run from project root

### Pre-computed attributed values — use `activity_uplifts` table

As of 2026-02-23, a new `activity_uplifts` table stores the fully attributed incremental NAU per activity. **Use this table for all analyses** — do not re-implement the uplift algorithm ad-hoc.

```sql
SELECT
  a.partner_name,
  COUNT(*) AS sends,
  SUM(a.cost_usd) AS spend,
  SUM(au.attributed_incremental_activations) AS incremental_nau,
  SUM(a.cost_usd) / NULLIF(SUM(au.attributed_incremental_activations), 0) AS incremental_cpa,
  SUM(a.actual_clicks) AS actual_clicks
FROM activities a
JOIN activity_uplifts au ON au.activity_id = a.id
WHERE a.channel = 'newsletter'
  AND a.status = 'live'
  AND a.date >= '2026-01-01'
GROUP BY a.partner_name
ORDER BY incremental_nau DESC;
```

**Note on incremental NAU figures:**
- `activity_uplifts.attributed_incremental_activations` — the canonical per-activity attributed figure. Use this for partner-level ranking and CPA calculations.
- The newsletter analytics page and the DB sum now agree exactly. The new model uses a single channel-level daily baseline: `pool[D] = max(0, observed[D] − baseline[D])`, split among overlapping activities by click share. Per-activity figures sum to exactly the portfolio total, which is always ≤ actual daily newsletter NAU by construction. No separate period-level cap is applied.
- **Standing rule (updated)**: The DB sum of `attributed_incremental_activations` and the newsletter analytics page total are now consistent. Either source is reliable for the portfolio headline.

### Filters
- `channel = 'newsletter'`
- `status = 'live'`
- `date >= '2026-01-01'` (or parameterised — ask user if they want a different start date)
- Exclude `GTM Fund` and similar entries with no spend or click data unless explicitly requested

---

## Metrics to Compute Per Partner

Run two passes: one for raw activity data, one for uplift calculation.

### Pass 1 — Activity data (from `activities` table)
| Metric | Source |
|--------|--------|
| Sends | COUNT of rows |
| Total spend | SUM of `cost_usd` |
| Total actual clicks | SUM of `actual_clicks` |
| CPC | `cost_usd / actual_clicks` — key upper-funnel metric; use for cross-newsletter comparison |
| eNAU | SUM of `metadata->>'eNAU'` (forward-looking estimate only) |
| eNAU CPA | `spend / eNAU` |
| List size | MAX of `metadata->>'send'` |

**Note on estimated clicks**: `deterministic_clicks` (from the "Estimated Clics" column in Google Sheets) is not included in the standard report. It can be used separately for post-campaign delivery auditing (actual vs projected click volume) but is not a decision-making input.

### Pass 2 — Uplift (from `activity_uplifts` table — pre-computed)
Do **not** recompute uplift ad-hoc. Read from `activity_uplifts` which is populated after every sync:
- `attributed_incremental_activations` — canonical per-activity attributed incremental NAU (proportional click-share split already applied)
- `attributed_incremental_signups` — same for signups
- `raw_incremental_activations` — before attribution split (for comparison / debugging only)
- `confidence` — `HIGH`, `MED`, or `LOW` confidence in the signal

Aggregate by partner: `SUM(attributed_incremental_activations)`

**Incremental CPA** = `SUM(cost_usd) / SUM(attributed_incremental_activations)`

---

## Important Caveats — Always Include

1. **eNAU vs Incremental NAU**: eNAU is a *forecast* (clicks × historical conversion rate). Incremental NAU is the *measured result* (uplift above baseline). When they diverge, the measured figure is more meaningful — but neither is perfect.

2. **No proportional attribution in ad-hoc queries**: The live app applies click-share credit splitting when multiple newsletters' post-windows overlap the same day. The ad-hoc computation does not. Partners that ran during high-activity periods (e.g. Techscoop running alongside TLDR + Revenue Brew) may show inflated incremental NAU — flag explicitly.

3. **Zero uplift ≠ definitively no effect**: Could be Jan 1 timing (low organic activity suppresses the signal), insufficient baseline data, or overlapping sends absorbing the credit. Always note this for zero results.

4. **Post-window caveats**: Most recent sends (within last 2 days) have incomplete post-window data — flag as "too early to measure".

---

## Decision Framework

### 🟢 Scale
Commit to recurring spend. Criteria — all of:
- ≥ 2 sends with data
- Measured incremental NAU > 0
- Incremental CPA < $200
- CPC is competitive relative to portfolio average (use as a signal of audience efficiency)

### 🟡 Continue Testing
One more send needed. Criteria — any of:
- Only 1 send with positive signal
- 2 sends with mixed results (e.g. CPC trending down, signal improving)
- Good click volume but post-window too recent to measure
- Strong eNAU CPA but measured uplift not yet confirmed

### 🔴 Do Not Repeat
Cut from future planning. Criteria — any of:
- Zero measured uplift across ≥ 2 sends
- Incremental CPA > $500 with no plausible path to improvement
- Very high CPC with no corresponding uplift signal (expensive clicks that don't convert)
- Obvious ICP mismatch (e.g. DevOps/engineering audiences for Granola)
- Suspicious attribution artefact — note explicitly and do not use for decision-making

**Always note edge cases explicitly** rather than forcing into a category.

---

## Report Structure (CEO Update Format)

### Header block
```
Period: [start] to [end]
Total Spend: $X | Sends: N | Partners: N | Blended CPC: $X
eNAU (estimated): N | Measured Incremental NAU: N
```
**Note**: The "Measured Incremental NAU" headline can be read from either the newsletter analytics page or by summing `attributed_incremental_activations` from the DB — they now agree exactly under the new channel-baseline model. No separate period-level cap is applied.

### 1. Executive Summary
3–5 sentences. The "so what": overall performance direction, the single biggest finding, and the key reallocation recommendation. Lead with the insight, not the data.

### 2. 🟢 Scale
Table: Partner | Sends | Spend | Actual Clicks | CPC | Incr. NAU | CPA
Then 2–4 sentences per partner — what specifically makes it a scale decision, any nuance.

### 3. 🟡 Continue Testing
Same table format. One paragraph per partner explaining the signal and what the next send needs to confirm.

### 4. 🔴 Do Not Repeat
Condensed table: Partner | Sends | Spend | Actual Clicks | CPC | Incr. NAU | Reason (one line)
No extended narrative — keep this section tight.

### 5. Strategic Observations
3–5 cross-cutting patterns spotted across the portfolio. Not partner-specific — portfolio-level insights that inform future partner selection and channel strategy.

### 6. Recommended Portfolio
Three-tier table:
| Tier | Partners | Rationale |
|------|----------|-----------|
| Core (recurring) | ... | Proven, book now |
| Build (2nd send) | ... | Confirm signal |
| Pause | ... | Insufficient data or negative |

---

## Tone and Style
- CEO audience — assume high financial literacy, low tolerance for waffle
- Lead with recommendations, support with data (not the other way around)
- Use absolute numbers ($, NAU) not just percentages
- Flag uncertainty explicitly — don't oversell weak signals
- Keep the report skimmable: headers, tables, short paragraphs

---

## Feedback Log

*Updated when feedback is given. Each entry records the date, the feedback, and what changed.*

| Date | Feedback | Change Made |
|------|----------|-------------|
| 2026-02-23 | Initial methodology created from first analysis run | Baseline established |
| 2026-02-24 | Report headline showed 1,327 (DB sum) but app page shows 1,028. Proportional attribution conserves totals — the discrepancy is caused by the period-level Math.min cap in aggregateToTimeSeries(), not attribution logic. | Added standing rule: headline "Measured Incremental NAU" must come from the app newsletter analytics page, never from summing the DB. Added note that per-partner DB figures (sum = 1,327) are correct for ranking; app page figure (1,028) is correct for the portfolio headline. |
| 2026-02-24 | Estimated clicks (deterministic_clicks) should be ignored in the report — only useful for post-campaign delivery auditing vs projection, not for decisions. Actual clicks and actual CPC are the primary upper-funnel metrics. CPC should be the cross-newsletter comparison metric and a key success signal. | Removed "Total estimated clicks" and "Click delivery %" from Pass 1 metrics and report tables. Added CPC as a key metric. Updated decision framework to reference CPC instead of click delivery %. Updated Scale/Test/Cut table columns to include Actual Clicks and CPC, removing Click Delivery. |
| 2026-02-24 | Per-activity incremental figures must sum to the portfolio total, which must never exceed actual daily newsletter NAU. The old per-activity-baseline model could assign overlapping activities independent baselines for the same days, letting their sum exceed actual NAU. The period-level Math.min cap in the chart layer was a symptom, not a fix. | Redesigned core measurement model: replaced per-activity 14-day pre-window baselines with a single channel-level daily baseline. For each post-window date D: pool[D] = max(0, observed[D] − channel_baseline[D]), split among all activities active on D by click share. Per-activity figures now sum exactly to the portfolio total, which is bounded by actual daily NAU. Math.min cap removed from aggregateToTimeSeries(). Standing rule updated: DB sum and app page now agree — either source is reliable for the portfolio headline. |
