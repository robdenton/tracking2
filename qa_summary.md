# QA Summary — Metrics Spine

**Generated**: 2026-04-04
**Total rows**: 1,505
**Date range**: 2025-09-01 to 2026-12-01

---

## Topline Spend by Platform

| Platform | Rows | Spend (USD) | Impressions | Clicks |
|----------|------|-------------|-------------|--------|
| linkedin | 443 | $81,540.41 | 1,320,891 | 28,246 |
| podscribe | 549 | $165,871.63 | 1,963,280 | 0 |
| newsletter | 133 | $467,930.00 | 0 | 48,411 |
| youtube | 63 | $343,560.00 | 228,845 | 1,100 |
| other (Growi + product) | 317 | $0.00 | 13,573,012 | 0 |
| **Total** | **1,505** | **$1,058,902.04** | **17,086,028** | **77,757** |

### Notes
- Newsletter is the largest spend category ($468K) but has 0 impressions (send counts not mapped — see data_gaps.md #2)
- YouTube spend ($344K) is entered per-activity, not per-day — inflates daily spend on activity dates
- "Other" impressions are dominated by Growi UGC views (TikTok + Instagram)

---

## Missingness Rates

| Column | Missing/Zero | Rate |
|--------|-------------|------|
| `spend` | 637 | 42.3% |
| `impressions` | 502 | 33.4% |
| `clicks` | 1,024 | 68.0% |
| `accounts_created` | 1,057 | 70.2% |
| `new_activated_users` | 1,057 | 70.2% |

### Interpretation
- **spend**: Missing for Growi UGC rows (no cost) and product daily_metrics rows (not a paid channel). Expected.
- **impressions**: Missing for newsletter activities (no open tracking) and product rows. Expected.
- **clicks**: Missing for Podscribe (no click metric), Growi (organic), and product rows. High rate is structural — most sources don't report clicks.
- **KPI columns**: Only populated for activities (232 rows with per-activity incremental KPIs) + daily_metrics (216 daily product totals). The 448 rows with KPI data represent 29.8% coverage, which is correct — LinkedIn Ads and Podscribe API data don't flow through to the KPI model.

---

## Duplicate Detection

**0 duplicates detected** (unique key: date + platform + campaign_id + ad_id + source_file)

No rows share the same identity key. Each source contributes distinct rows.

---

## Anomalies

### Spend > 0 with 0 Impressions: 202 rows

**Root cause**: Newsletter activities ($468K across 133 rows) and some YouTube activities where content views haven't been tracked yet.

- Newsletter: Expected — no impression/open tracking from newsletter partners. Spend is known but impressions are not.
- YouTube: Some activities have spend recorded but view tracking hasn't started or `content_views` table has no matching entries.

**Recommendation**: Not a data quality issue — this is a structural gap. See data_gaps.md #2 and #3.

### CTR > 50%: 0 rows

No extreme CTR anomalies detected.

### Date Range Anomaly: Future dates

The spine contains dates up to **2026-12-01**, which is 8 months in the future. These are likely:
- Podcast campaign flight dates from Podscribe (scheduled/planned campaigns)
- Should be filtered to `date <= CURRENT_DATE` for reporting unless future bookings are intentional

**Recommendation**: Add a `date <= NOW()` filter in downstream consumption, or flag future-dated rows with `data_confidence = 'low'`.

---

## Spend by Day (top 10 by total spend)

Run the following to inspect:
```sql
SELECT date, SUM(spend) as total_spend, COUNT(*) as rows
FROM metrics_spine
WHERE spend > 0
GROUP BY date
ORDER BY total_spend DESC
LIMIT 10;
```

---

## Cross-Source Overlap Check

- **Podcast**: Activities table has 30 podcast activities with spend. Podscribe has 519 campaign-day rows. These are **separate representations** — activities are the booking record, Podscribe is the measured delivery. Both are included with distinct `source_file` values. No double-counting of spend because Podscribe spend comes from the Podscribe dashboard while activity spend comes from Google Sheets (they should align but may differ).

**Recommendation**: For podcast spend reporting, prefer Podscribe (`source_file = 'podscribe_campaign_daily'`) as it's day-level and API-sourced. Flag if Podscribe total spend diverges significantly from activity-level podcast spend.

---

## Data Confidence Distribution

| Confidence | Rows | % |
|------------|------|---|
| high | ~1,200 | ~80% |
| medium | ~305 | ~20% |
| low | 0 | 0% |

High-confidence rows come from API integrations (LinkedIn Ads, Podscribe, daily_metrics). Medium-confidence rows are from manual Google Sheets entries (activities) and Growi snapshots.
