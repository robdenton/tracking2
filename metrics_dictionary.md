# Metrics Dictionary — Unified Marketing Spine

## KPI Definitions

### `accounts_created` (Sub-goal)
- **Definition**: Number of new Granola accounts created, attributed as the *incremental* count above the baseline daily average during the activity's post-window.
- **Source of truth**: `daily_metrics` table (product analytics pipeline), cross-referenced with `activity_uplifts` for per-activity attribution.
- **Activation window**: N/A (account creation is the event itself, not a downstream conversion).
- **Attribution window**: Varies by channel:
  - Newsletter: 2-day post-window
  - Podcast: 5-day post-window
  - YouTube, LinkedIn, Socials: 7-day post-window (config default)
- **Baseline method**: Median of daily signups over 14 days preceding the activity date, split by weekday/weekend.
- **What counts**: A new user record in the product database. The `rawIncrementalSignups` field on `activity_uplifts` stores the unadjusted count; `attributedIncrementalSignups` applies click-share proportional attribution when multiple activities overlap.

### `new_activated_users` (North Star)
- **Definition**: Number of new accounts that reached the "activated" state within the post-window, measured incrementally above baseline.
- **Source of truth**: `daily_metrics.activations` column (product analytics pipeline), cross-referenced with `activity_uplifts.rawIncrementalActivations`.
- **What counts as "activated"**: A user who has completed the product's activation criteria (specific event/threshold defined in the product analytics pipeline — the measurement app consumes this as a pre-computed daily count).
- **Activation window**: Activation must occur within the same post-window used for the channel (2/5/7 days).
- **Attribution window**: Same as `accounts_created` above.
- **Limitation**: The measurement app does not define the activation event itself — it consumes `activations` from `daily_metrics`. The exact activation definition lives in the product analytics system.

### `spend`
- **Definition**: USD cost for the activity or campaign-day.
- **Sources**:
  - LinkedIn Ads: `linkedin_ad_daily.spend` (API-reported, micro-currency converted)
  - Podscribe: `podscribe_campaign_daily.spend` (Podscribe dashboard)
  - Activities: `activities.costUsd` (manually entered via Google Sheets)
- **Currency**: All values normalized to USD. No multi-currency conversion needed (all sources report in USD).

### `impressions`
- **Definition**: Platform-specific impression or view count.
  - LinkedIn Ads: Ad impressions (served count)
  - Podscribe: Verified podcast listens (pixel-based)
  - YouTube activities: Total video view count from YouTube Data API
  - Growi UGC: Aggregate views across TikTok + Instagram
  - Newsletter activities: Not available (no impression tracking; `send` count in metadata but not mapped to impressions)

### `clicks`
- **Definition**: Click-through actions.
  - LinkedIn Ads: `linkedin_ad_daily.clicks` (all clicks, not just link clicks)
  - Activities: `deterministicClicks` (Dub link tracked) or `actualClicks` (reported by partner)
  - Podscribe/Growi: Not available

### `link_clicks`
- **Definition**: Clicks specifically on destination links (subset of clicks).
  - LinkedIn Ads: `landingPageClicks`
  - Activities: `deterministicClicks` (Dub tracked)

### Derived Metrics
- **`ctr`**: `clicks / impressions` (computed only when impressions > 0)
- **`cpc`**: `spend / clicks` (computed only when clicks > 0)

---

## Column Reference

| Column | Type | Description |
|--------|------|-------------|
| `date` | YYYY-MM-DD | Calendar date of the metric |
| `platform` | string | Source platform: `linkedin`, `youtube`, `podscribe`, `newsletter`, `other` |
| `channel` | string | Marketing channel: `paid_social`, `video`, `audio`, `newsletter`, `influencer`, `product`, `other` |
| `account_name` | string | Partner/publisher name (from activities) or "Growi UGC" |
| `campaign_id` | string | LinkedIn campaign URN, Podscribe campaign ID, or activity UUID |
| `campaign_name` | string | Campaign or activity display name |
| `adset_id` | string | Not populated (no adset-level data in current sources) |
| `adset_name` | string | Podcast show name (Podscribe only) |
| `ad_id` | string | Not populated |
| `ad_name` | string | Not populated |
| `creative_id` | string | Not populated (creative-level data exists but not included to avoid row explosion) |
| `creative_name` | string | Not populated |
| `landing_page` | string | `contentUrl` from activities when available |
| `geo` | string | Not available from current sources |
| `device` | string | Not available from current sources |
| `currency` | string | "USD" for all paid rows; blank for product/organic rows |
| `spend` | numeric | Spend in USD |
| `impressions` | numeric | Impressions/views/listens |
| `reach` | numeric | Podscribe reach (unique listeners) when available |
| `frequency` | numeric | Not available |
| `clicks` | numeric | Click count |
| `link_clicks` | numeric | Landing page / deterministic link clicks |
| `ctr` | numeric | Computed: clicks/impressions |
| `cpc` | numeric | Computed: spend/clicks |
| `video_views` | numeric | YouTube video views (activities + Growi) |
| `video_view_rate` | numeric | Not available |
| `completed_views` | numeric | Not available |
| `listen_starts` | numeric | Podscribe impressions (= verified listens) |
| `completed_listens` | numeric | Not available |
| `sessions` | numeric | Not available |
| `accounts_created` | numeric | Incremental signups above baseline (per-activity) or daily total (product) |
| `new_activated_users` | numeric | Incremental activations above baseline (per-activity) or daily total (product) |
| `conversion_value` | numeric | Not available |
| `source_file` | string | Origin table/system |
| `source_grain` | string | `campaign`, `daily_total`, or `unknown` |
| `attribution_notes` | string | Attribution method and caveats |
| `data_confidence` | string | `high`, `medium`, or `low` |
| `notes` | string | Additional context (engagement metrics, metadata) |

---

## Source Mapping

| Platform | Source Table(s) | Grain | Spend | Impressions | Clicks | KPIs |
|----------|----------------|-------|-------|-------------|--------|------|
| linkedin | `linkedin_ad_daily` + `linkedin_ad_campaigns` | campaign × day | Yes | Yes | Yes | No (LinkedIn conversions in notes) |
| podscribe | `podscribe_campaign_daily` + `podscribe_campaigns` | campaign × day | Yes | Yes | No | No |
| newsletter | `activities` + `activity_uplifts` | activity (single day) | Yes | No | Yes | Yes (incremental) |
| youtube | `activities` + `activity_uplifts` + `content_views` | activity (single day) | Yes | Yes (views) | Partial | Yes (incremental) |
| other (Growi) | `growi_daily_snapshots` | daily total | No | Yes | No | No |
| other (product) | `daily_metrics` | daily total | No | No | No | Yes (absolute daily) |

---

## How to Refresh

### Prerequisites
- Node.js 18+
- Access to production Neon Postgres (`DATABASE_URL` in `.env.prod`)

### Steps

1. **Set the production DATABASE_URL**:
   ```bash
   export DATABASE_URL="postgresql://neondb_owner:***@ep-proud-hall-abilfqx1-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require"
   ```

2. **Run the extraction script**:
   ```bash
   cd /path/to/project
   node scripts/extract-spine.js
   ```

3. **Output**: `metrics_spine.csv` in the project root (1,500+ rows, UTF-8).

4. **Verify**: The script prints QA summary stats to stdout (row counts, missingness, anomalies, duplicates).

### Automation
To automate nightly exports:
- Add a cron job or scheduled task that runs `node scripts/extract-spine.js`
- Upload the resulting CSV to a private S3 bucket or Google Drive folder
- Generate a presigned URL (10–30 min TTL) for consumer access

### Backfill
The script always exports the full date range available in the database. No incremental/append mode — each run produces a complete spine.
