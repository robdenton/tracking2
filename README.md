# Marketing Activity Impact (Phase 0)

Deterministic uplift measurement for marketing activities. Local-first tool that computes per-activity impact reports from CSV data.

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Push Prisma schema to SQLite and seed from CSVs
npm run setup

# 3. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
/packages/core     # Pure math + types + tests (no framework deps)
/apps/web          # Next.js UI (local dev server)
/prisma            # Prisma schema (SQLite locally, swap to Postgres later)
/scripts           # Seed script to load CSVs into DB
/data              # Input CSV files
```

## Input Files

Place your CSVs in `/data`:

### `data/activities.csv`

| Column | Required | Description |
|--------|----------|-------------|
| id | No | Auto-generated UUID if empty |
| activity_type | Yes | e.g. campaign, webinar, social_post |
| channel | Yes | e.g. linkedin, podcast, youtube, newsletter, tiktok, x |
| partner_name | Yes | Partner or source name |
| date | Yes | YYYY-MM-DD |
| deterministic_clicks | No | Known click count |
| deterministic_tracked_signups | No | Known signup floor |
| notes | No | Free text |

### `data/daily_metrics.csv`

One row per channel per day. The channel must match the `channel` column in activities.

| Column | Required | Description |
|--------|----------|-------------|
| date | Yes | YYYY-MM-DD |
| channel | Yes | Must match activity channels exactly |
| signups | Yes | Accounts created that day for this channel |
| activations | Yes | Activated users that day for this channel |

## Configuration

Edit `.env` to change model parameters:

```
# Baseline and post-window parameters
BASELINE_WINDOW_DAYS=14   # B: days before activity for baseline
POST_WINDOW_DAYS=7        # W: days after activity to measure (default for most channels)

# Model-based baseline decontamination
BASELINE_DECONTAMINATION_ENABLED=true  # Enable/disable decontamination (default: true)
DECONTAMINATION_MAX_ITERATIONS=2       # Max iterations for convergence (default: 2)
DECONTAMINATION_CONVERGENCE_THRESHOLD=1 # Convergence threshold in signups (default: 1)
```

**Channel-Specific Post Windows:**
- **Newsletters**: 2 days (day of send + 1 day after) - engagement is highly concentrated
- **Other channels**: Use POST_WINDOW_DAYS value (default: 7 days)

After changing, re-run `npm run dev` (no re-seed needed; config is read at runtime).

## Math (Phase 0)

For each activity at date `t`:

- **baseline** = average(signups for `t-B` ... `t-1`) *for the activity's channel only*
- **expected_total** = baseline * W
- **observed_total** = sum(signups for `t` ... `t+W-1`) *for the activity's channel only*
- **incremental** = max(0, observed_total - expected_total)
- **floor** = deterministic_tracked_signups or 0

### Baseline Decontamination (New!)

For channels with frequent activities, the system uses **model-based decontamination** to remove contamination from baseline calculations.

**Problem:** When activities run frequently (e.g., daily newsletters), baseline windows often include spikes from other concurrent activities. This inflates the expected total and reduces measured incremental lift (false negatives).

**Solution:** Iterative decontamination algorithm that:
1. **Initial Pass**: Calculate rough incremental estimates for all activities
2. **Decontamination Pass**: For each activity, subtract concurrent activities' estimated impacts from its baseline dates
3. **Iteration**: Repeat until estimates converge (typically 1-2 iterations)

**Example:**
- Activity B on Jan 19 drives +100 incremental signups over 7 days (~14/day)
- Activity A on Jan 25 has baseline window Jan 11-24 (includes Jan 19)
- Decontamination subtracts ~14 signups from Activity A's Jan 19 baseline
- Result: More accurate baseline, higher measured incremental for Activity A

**Configuration:**
- `BASELINE_DECONTAMINATION_ENABLED`: Enable/disable (default: true)
- `DECONTAMINATION_MAX_ITERATIONS`: Max iterations (default: 2)
- `DECONTAMINATION_CONVERGENCE_THRESHOLD`: Convergence threshold in signups (default: 1)

**Note:** Decontamination respects channel-specific post windows (e.g., newsletters only contribute 2 days of contamination).

### Confidence Heuristic

- Compute `sigma` = stddev of baseline window signups
- **HIGH**: incremental > 2 * sigma * sqrt(W)
- **MED**: incremental > 1 * sigma * sqrt(W)
- **LOW**: otherwise (or if sigma=0 / no baseline data)

## Google Sheets Setup (Recommended)

Instead of manually exporting CSVs, you can connect a Google Sheet and have it sync automatically every day at 7am.

### Step 1: Create Your Google Sheet

1. Go to [sheets.google.com](https://sheets.google.com) and create a new spreadsheet
2. **Rename the first tab** (at the bottom of the screen) to exactly: `activities`
3. In the `activities` tab, type these exact headers across row 1:

   | A | B | C | D | E | F | G | H |
   |---|---|---|---|---|---|---|---|
   | id | activity_type | channel | partner_name | date | deterministic_clicks | deterministic_tracked_signups | notes |

4. **Add a second tab** by clicking the **+** at the bottom. Name it exactly: `daily_metrics`
5. In the `daily_metrics` tab, type these exact headers across row 1:

   | A | B | C | D |
   |---|---|---|---|
   | date | channel | signups | activations |

6. Enter your data starting from row 2 in each tab. **One row per channel per day.** Dates must be in YYYY-MM-DD format (e.g. 2024-01-20). Example:

   | date | channel | signups | activations |
   |------|---------|---------|-------------|
   | 2024-01-20 | linkedin | 35 | 14 |
   | 2024-01-20 | podcast | 3 | 1 |
   | 2024-01-20 | youtube | 5 | 2 |

> **Tips:**
> - The `id` column in activities can be left blank — IDs are auto-generated
> - The `channel` in daily_metrics must match the `channel` in activities exactly (e.g. both say `linkedin`, not `LinkedIn` vs `linkedin`)
> - Leave cells blank for optional columns — don't put 0 if you don't have the data
> - Each sync replaces all data in the tool with whatever is in the sheet. The sheet is your single source of truth.

### Step 2: Share Your Sheet

1. Click the green **Share** button (top right of the spreadsheet)
2. Under **General access**, change "Restricted" to **"Anyone with the link"**
3. Make sure the role says **"Viewer"**
4. Click **Done**

### Step 3: Connect the Sheet

1. Copy the **Sheet ID** from your browser's address bar. It's the long string between `/d/` and `/edit`. For example:
   ```
   https://docs.google.com/spreadsheets/d/1aBcDeFgHiJkLmNoPqRsTuVwXyZ/edit
                                          ^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                          This is your Sheet ID
   ```

2. Open the `.env` file in the project folder and paste the ID:
   ```
   GOOGLE_SHEET_ID=1aBcDeFgHiJkLmNoPqRsTuVwXyZ
   ```

3. Test the connection — in Terminal, run:
   ```bash
   cd ~/Claude\ measurement\ project
   npm run sync
   ```
   You should see a success message with the number of rows synced.

### Step 4: Set Up Daily Auto-Sync (7am)

Run this once in Terminal to install the daily schedule:

```bash
cd ~/Claude\ measurement\ project
npm run install-schedule
```

That's it! Your data will refresh automatically every morning at 7am. If your Mac is asleep at 7am, it syncs when you open it.

To **remove** the daily schedule later:
```bash
npm run uninstall-schedule
```

To **manually sync** any time:
```bash
npm run sync
```

---

## YouTube Content View Tracking

Track video view counts over time for YouTube sponsored content to compare actual performance against estimates.

### Setup

1. **Get a YouTube Data API key:**
   - Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Create a new project or select existing
   - Enable **YouTube Data API v3**
   - Create credentials → API key
   - Copy the API key

2. **Add your API key to `.env`:**
   ```
   YOUTUBE_API_KEY=your-api-key-here
   ```

3. **Ensure your YouTube activities have Content URLs:**
   - In your Google Sheet's YouTube tab, fill in the **Content URL** column with the actual video URL
   - Example: `https://www.youtube.com/watch?v=dQw4w9WgXcQ`

4. **Test the tracker:**
   ```bash
   npm run track-views
   ```
   This will fetch current view counts for all YouTube activities with content URLs.

5. **Set up daily tracking (8am):**
   ```bash
   npm run install-youtube-tracker
   ```

### What it tracks

For each YouTube activity with a `contentUrl`:
- Fetches the current view count daily at 8am
- Stores it in the `content_views` table
- Builds a time series showing view growth over time
- Compares actual views vs. estimated views from your bet

### View the data

Visit any YouTube activity detail page to see:
- **Latest Views**: Most recent view count
- **Estimated Views**: Your original estimate from the bet
- **vs. Estimate**: Percentage comparison (exceeded or below)
- **View Count History**: Table showing daily view counts and daily changes

---

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server |
| `npm run build` | Production build |
| `npm run test` | Run core package unit tests |
| `npm run setup` | Push DB schema + seed from CSVs |
| `npm run seed` | Re-seed DB from CSVs (preserves schema) |
| `npm run sync` | Pull latest data from Google Sheets |
| `npm run track-views` | Fetch YouTube view counts for all activities |
| `npm run install-schedule` | Set up daily 7am auto-sync |
| `npm run uninstall-schedule` | Remove the daily auto-sync |
| `npm run install-youtube-tracker` | Set up daily 8am YouTube view tracking |
| `npm run uninstall-youtube-tracker` | Remove the YouTube view tracker |
| `npm run db:push` | Push Prisma schema changes to DB |

## Re-seeding with New Data (CSV method)

1. Replace `data/activities.csv` and/or `data/daily_metrics.csv`
2. Run `npm run seed`
3. Refresh the browser

## Future (TODO)

- [ ] GA4 API ingestion (replace daily_metrics CSV)
- [ ] Amplitude API ingestion
- [x] Google Sheets direct import
- [ ] Postgres deployment (swap `provider` in `prisma/schema.prisma`)
- [ ] Docker + deploy to Vercel/Railway
- [ ] Historical trend charts
- [ ] CSV export of reports
