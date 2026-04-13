# Data Gaps — Metrics Spine

## Critical Gaps

### 1. `accounts_created` and `new_activated_users` — not attributable to platform/campaign

**Current state**: These KPIs exist at two levels:
- **Per-activity (incremental)**: Available for 232 activities via `activity_uplifts` table. These are *incremental* counts (above baseline), not absolute. Useful for per-campaign ROI but not for total daily attribution.
- **Daily total (absolute)**: Available from `daily_metrics` table as raw daily counts, not attributed to any platform or campaign.

**What's missing**: There is no join key between product signups/activations and ad platform campaign IDs. The measurement app uses a time-window correlation model (baseline + post-window), not deterministic user-level attribution.

**How to fill**:
- Implement UTM/click-ID capture at signup to enable deterministic campaign → signup attribution
- Or integrate with a product analytics tool (Mixpanel, Amplitude, PostHog) that tracks `signup` and `activation` events with campaign source metadata
- The `dub_customers` table has some click-to-lead attribution via Dub short links, but coverage is partial (newsletter links only)

### 2. Newsletter impressions (send count) — not mapped

**Current state**: Newsletter `send` count exists in the `metadata` JSON field on activities but is not extracted to the spine's `impressions` column.

**Why**: The `send` count is inconsistently populated and represents emails sent, not opens/impressions. Open tracking is not available from most newsletter partners.

**How to fill**: Parse `metadata.send` from activities where `channel = 'newsletter'` and map to `impressions` or add a dedicated `sends` column. Would need open-rate data from partners (e.g., Beehiiv, ConvertKit) to get true impressions.

### 3. Google Ads / YouTube Ads — no API integration

**Current state**: YouTube is tracked via organic video views (YouTube Data API) and manual spend entries in Google Sheets activities. There is no Google Ads API integration.

**What's needed**:
- Google Ads Developer Token
- Google Cloud OAuth2 credentials
- Google Ads API integration (similar to existing LinkedIn Ads pattern)
- Would provide: campaign-level daily spend, impressions, clicks, video views, conversions, CPV, view rate

**Impact**: YouTube spend ($343K) is currently entered as a single lump sum per activity, not broken down by day or campaign. This creates the "spend > 0 with 0 impressions" anomaly for many rows.

### 4. Meta Ads — not connected

**Current state**: No Meta/Facebook Ads integration exists. If Meta is a paid channel, there is no data in the spine.

**How to fill**: Add Meta Marketing API integration (OAuth + campaign reporting cron).

### 5. Podscribe clicks — not available

**Current state**: Podscribe reports impressions, reach, visitors, and visits but not "clicks" in the traditional sense. `visitors` and `visits` are stored in `notes` but not mapped to the `clicks` column.

**How to fill**: Map `podscribe_campaign_daily.visitors` or `visits` to `clicks` if the business considers site visitors as click-equivalent. This is a definitional decision.

---

## Moderate Gaps

### 6. Geo / Device breakdowns — not available from any source

No platform integration currently provides geo or device-level breakdowns. LinkedIn Ads API *could* provide this via the MEMBER_COUNTRY and MEMBER_DEVICE pivots, but the sync job doesn't fetch these dimensions.

### 7. `sessions` / `visits` — not connected

Web analytics (Google Analytics, Plausible, etc.) is not integrated. Cannot populate the `sessions` column.

### 8. `conversion_value` — not tracked

No revenue or monetary value is associated with signups/activations in the current data model.

### 9. LinkedIn Ads creative-level data — excluded from spine

The `linkedin_ad_creative_daily` table has 1,998 rows of creative-level data. This was intentionally excluded from the spine to keep the grain at campaign × day and avoid row explosion. Can be added by setting `source_grain = "creative"` if needed.

### 10. Dub link daily clicks — excluded from spine

106,187 rows of daily click data for individual short links exist in `dub_link_daily`. This is *very* granular (per-link per-day) and would dominate the spine. Currently used internally for newsletter click attribution but not exported.

---

## Minor Gaps

### 11. `frequency` — not computed
Could be derived as `impressions / reach` for Podscribe rows where both exist.

### 12. `video_view_rate` — not computed
Would need total video impressions (not just views) to compute. YouTube Data API provides views but not ad impressions.

### 13. `completed_views` / `completed_listens` — not available
No source provides completion/thruplay metrics.

### 14. Employee LinkedIn posts — excluded
Organic employee LinkedIn posts (impressions, engagement) exist in `employee_linkedin_posts` but are not paid media and were excluded from the spine. Could be added as `platform=linkedin, channel=organic_social`.

### 15. Company LinkedIn posts — excluded
Same as above for company page posts in `company_linkedin_posts`.
