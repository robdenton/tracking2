# YouTube Content View Tracking - Setup Guide

## Overview

The YouTube content view tracking system has been successfully implemented. It allows you to:

1. **Separate Content URL from Channel URL** in your YouTube tab
2. **Track video view counts daily** and build time-series data
3. **Compare actual views vs. estimated views** from your bet
4. **See daily view growth** for each sponsored video

---

## Schema Changes

### New Database Fields

Added to the `activities` table:
- `content_url`: URL to the actual sponsored content (e.g., the YouTube video)
- `channel_url`: URL to the partner's YouTube channel

### New Table: `content_views`

Tracks view counts over time:
- `activity_id`: Foreign key to activities
- `date`: Date of measurement (YYYY-MM-DD)
- `view_count`: Number of views on that date

---

## Google Sheets Setup

### YouTube Tab Columns

The YouTube tab now expects these columns:

| Column Name | Description | Required |
|-------------|-------------|----------|
| Status | live, booked, canceled | Yes |
| Channel Name | Partner name | Yes |
| **Channel URL** | Partner's YouTube channel URL | No |
| **Content URL** | The actual video URL (NEW) | No |
| Availability | Go-live date (YYYY-MM-DD or various formats) | Yes |
| USD$ Rate | Cost in USD | No |
| Collab Type | Type of collaboration | No |
| Channel Subscribers | Subscriber count | No |
| Est. views | Estimated views (used for comparison) | No |
| Clicks | Deterministic clicks | No |
| CPA // rate | Cost per acquisition | No |

**Example Content URL formats:**
- `https://www.youtube.com/watch?v=VIDEO_ID`
- `https://youtu.be/VIDEO_ID`
- `https://www.youtube.com/watch?v=VIDEO_ID&feature=youtu.be`

---

## API Setup

### Step 1: Get a YouTube Data API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create a new project (or select an existing one)
3. Click **"Enable APIs and Services"**
4. Search for **"YouTube Data API v3"** and enable it
5. Go to **Credentials** → **Create Credentials** → **API Key**
6. Copy the API key

**Important:** The API key has a free quota of 10,000 units per day. Each video statistics request costs 1 unit, so you can track ~10,000 videos per day for free.

### Step 2: Add API Key to .env

Open `.env` and paste your API key:

```bash
YOUTUBE_API_KEY=AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

---

## Testing the Tracker

### Manual Test

Run the tracker manually to see if it works:

```bash
npm run track-views
```

Expected output:
```
[2026-02-16 14:30:00] Starting YouTube view tracker...
[2026-02-16 14:30:00] Found 26 YouTube activities with content URLs
[2026-02-16 14:30:00] Fetching views for Feis World (6Dq2xjbMtzY)...
[2026-02-16 14:30:01]   ✓ Feis World: 12,345 views
[2026-02-16 14:30:01] Fetching views for Tim Harris (ABUP1HaJ2Uo)...
[2026-02-16 14:30:02]   ✓ Tim Harris: 8,912 views
...
[2026-02-16 14:30:30] Tracking complete:
[2026-02-16 14:30:30]   Tracked: 26
[2026-02-16 14:30:30]   Skipped: 0
[2026-02-16 14:30:30]   Errors: 0
```

### View the Data

1. Start the dev server: `npm run dev`
2. Visit http://localhost:3000
3. Click on any YouTube activity
4. Scroll to the **"Content Performance"** section

You should see:
- **Latest Views**: Most recent view count
- **Estimated Views**: Your original estimate
- **vs. Estimate**: Percentage comparison
- **View Count History**: Daily breakdown with changes

---

## Setting Up Daily Auto-Tracking

### Install the Daily Schedule (8am)

```bash
npm run install-youtube-tracker
```

This creates a LaunchAgent that runs daily at 8am (1 hour after the Google Sheets sync at 7am).

**Why 8am?** This ensures:
1. Google Sheets sync runs first (7am) to pull new activities
2. View tracker runs second (8am) to track all activities including new ones

### Check if it's Running

```bash
launchctl list | grep youtube-tracker
```

You should see: `com.mai.youtube-tracker`

### View Logs

```bash
tail -f ~/Claude\ measurement\ project/logs/youtube-tracker.log
```

### Uninstall (if needed)

```bash
npm run uninstall-youtube-tracker
```

---

## How It Works

### Data Flow

1. **Google Sheets → Database** (7am daily)
   - Syncs YouTube activities with `content_url` and `channel_url`

2. **YouTube API → Database** (8am daily)
   - For each activity with a `content_url`:
     - Extracts video ID from URL
     - Calls YouTube Data API v3 to get view count
     - Upserts into `content_views` table with today's date

3. **Database → UI** (real-time)
   - Activity detail pages fetch view history
   - Displays time series and comparison metrics

### View Count Tracking

The script:
- ✅ Handles multiple YouTube URL formats
- ✅ Rate-limits requests (100ms between videos)
- ✅ Uses upsert (updates if today's data already exists)
- ✅ Only tracks "live" activities (skips "booked" or "canceled")
- ✅ Logs all operations for debugging

---

## Current Status

### ✅ Completed

- [x] Database schema updated with `content_url`, `channel_url`, and `content_views` table
- [x] Google Sheets sync updated to map "Content URL" and "Channel URL" columns
- [x] YouTube view tracker script created (`scripts/track-youtube-views.ts`)
- [x] UI updated to display URLs and view tracking data
- [x] LaunchAgent plist created for daily scheduling
- [x] npm commands added: `track-views`, `install-youtube-tracker`, `uninstall-youtube-tracker`
- [x] Documentation updated (README.md)

### 📋 Next Steps

1. **Get YouTube API key** and add to `.env`
2. **Update Google Sheet** with Content URL column (already done based on sync results)
3. **Test tracker**: `npm run track-views`
4. **Install daily schedule**: `npm run install-youtube-tracker`
5. **Monitor for 7 days** to build time-series data

---

## Troubleshooting

### Error: "YOUTUBE_API_KEY not found in .env"

**Solution:** Add your API key to the `.env` file:
```bash
YOUTUBE_API_KEY=your-key-here
```

### Error: "YouTube API error for VIDEO_ID: HTTP 403"

**Cause:** API quota exceeded or API not enabled

**Solutions:**
1. Check quota usage in [Google Cloud Console](https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas)
2. Ensure YouTube Data API v3 is enabled
3. Wait 24 hours for quota reset

### Error: "Video VIDEO_ID not found"

**Causes:**
- Video was deleted or made private
- Invalid video URL in Google Sheet

**Solution:** Check the Content URL in your Google Sheet

### No view data showing in UI

**Checklist:**
1. Is `YOUTUBE_API_KEY` set in `.env`?
2. Did you run `npm run track-views` at least once?
3. Does the activity have a `content_url`?
4. Is the activity status "live"?
5. Check logs: `tail logs/youtube-tracker.log`

---

## API Costs

**YouTube Data API v3 Quota:**
- Free tier: 10,000 units/day
- Cost per video statistics request: 1 unit
- **Your current usage:** ~26 requests/day = 26 units/day

**Verdict:** Well within free tier! You can track up to 10,000 videos per day at no cost.

---

## Files Modified/Created

### Modified Files
- `prisma/schema.prisma` - Added content_url, channel_url fields and content_views table
- `packages/core/src/types.ts` - Updated Activity interface
- `scripts/sync-sheets.ts` - Updated mappers for all channels
- `scripts/seed.ts` - Added new fields to CSV import
- `apps/web/src/lib/data.ts` - Added getContentViews() function
- `apps/web/src/app/activity/[id]/page.tsx` - Display URLs and view tracking
- `.env` - Added YOUTUBE_API_KEY placeholder
- `package.json` - Added view tracking commands
- `README.md` - Added YouTube tracking documentation

### Created Files
- `scripts/track-youtube-views.ts` - View tracking script
- `com.mai.youtube-tracker.plist` - LaunchAgent for daily scheduling
- `YOUTUBE_TRACKING_SETUP.md` - This file

---

## Support

If you encounter issues, check:
1. Logs: `logs/youtube-tracker.log`
2. Database: `sqlite3 prisma/dev.db "SELECT * FROM content_views LIMIT 5;"`
3. Sync status: `npm run sync` output
4. API status: [Google Cloud Console](https://console.cloud.google.com/)
