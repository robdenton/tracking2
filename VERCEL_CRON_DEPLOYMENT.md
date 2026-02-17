# Vercel Cron Jobs Deployment Guide

This guide documents the migration from local LaunchAgents to Vercel Cron Jobs for automated data collection.

## Overview

The application now uses **Vercel Cron Jobs** to run scheduled data collection tasks in a fully serverless environment. All 5 scheduled tasks have been converted to API routes with cron authentication.

## Architecture

### Before (Local LaunchAgents)
- Scheduled tasks ran on local machine via macOS LaunchAgents
- Data written to local SQLite database (`dev.db`)
- Vercel deployment read from separate PostgreSQL database
- **Problem:** Databases were disconnected, data collection stopped when machine was off

### After (Vercel Cron Jobs)
- Scheduled tasks run as serverless functions on Vercel infrastructure
- All tasks write directly to production PostgreSQL database (Neon)
- No dependency on local machine
- Data collection continues 24/7 automatically

## Scheduled Tasks

| Task | Schedule (UTC) | API Route | Database Tables |
|------|---------------|-----------|-----------------|
| Google Sheets Sync | 7:00 AM daily | `/api/cron/sync-sheets` | activities, daily_metrics |
| YouTube View Tracking | 8:00 AM daily | `/api/cron/track-youtube` | content_views |
| Imported Video Tracking | 8:15 AM daily | `/api/cron/track-imported` | imported_video_views |
| LinkedIn Engagement | 8:30 AM daily | `/api/cron/track-linkedin` | linkedin_engagements |
| YouTube Search | 8:00 AM daily | `/api/cron/youtube-search` | youtube_search_results |

**Note:** All schedules are in UTC timezone.

## Deployment Steps

### 1. Prerequisites

- **Vercel Pro Plan Required** ($20/month for cron jobs)
- All code changes have been committed to Git
- Puppeteer dependencies installed (`@sparticuz/chromium`, `puppeteer-core`)

### 2. Add CRON_SECRET to Vercel

**Generated Secret:**
```
7xFrLttdMFE5uUXbC8q2io1hVAMwSrGObK5ppGvohcs=
```

**Steps:**
1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project: `tracking2`
3. Navigate to **Settings** → **Environment Variables**
4. Click **Add New**
5. Set:
   - **Key:** `CRON_SECRET`
   - **Value:** `7xFrLttdMFE5uUXbC8q2io1hVAMwSrGObK5ppGvohcs=`
   - **Environments:** Production, Preview, Development (all selected)
6. Click **Save**

### 3. Verify Existing Environment Variables

Ensure these are already configured in Vercel:
- `DATABASE_URL` - Neon PostgreSQL connection string
- `GOOGLE_SHEET_ID` - Your Google Sheet ID
- `ACTIVITY_TABS` - Activity tab configuration
- `DAILY_METRICS_TAB_NAME` - Metrics tab name
- `YOUTUBE_API_KEY` - YouTube Data API v3 key
- `AUTH_SECRET` / `NEXTAUTH_SECRET` - Authentication secrets
- `GOOGLE_CLIENT_ID` - OAuth client ID
- `GOOGLE_CLIENT_SECRET` - OAuth client secret

### 4. Deploy to Vercel

```bash
# Commit all changes
git add .
git commit -m "Add Vercel Cron Jobs for data collection

- Created 5 serverless cron endpoints
- Migrated from LaunchAgents to Vercel Cron
- Added authentication with CRON_SECRET
- Installed Puppeteer dependencies for serverless
- Configured cron schedules in vercel.json"

# Push to trigger Vercel deployment
git push
```

### 5. Monitor Deployment

1. Watch build logs in Vercel Dashboard
2. Check for compilation errors
3. Verify all environment variables are set

Expected build output:
```
✓ Creating an optimized production build
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages
✓ Finalizing page optimization
```

### 6. Test Cron Endpoints Manually

After deployment completes, test each endpoint:

```bash
# Set CRON_SECRET for testing
export CRON_SECRET="7xFrLttdMFE5uUXbC8q2io1hVAMwSrGObK5ppGvohcs="

# Test Google Sheets sync
curl -X GET https://tracking2-dg0i31dlt-robdentons-projects.vercel.app/api/cron/sync-sheets \
  -H "Authorization: Bearer $CRON_SECRET"

# Test YouTube tracking
curl -X GET https://tracking2-dg0i31dlt-robdentons-projects.vercel.app/api/cron/track-youtube \
  -H "Authorization: Bearer $CRON_SECRET"

# Test imported video tracking
curl -X GET https://tracking2-dg0i31dlt-robdentons-projects.vercel.app/api/cron/track-imported \
  -H "Authorization: Bearer $CRON_SECRET"

# Test LinkedIn tracking
curl -X GET https://tracking2-dg0i31dlt-robdentons-projects.vercel.app/api/cron/track-linkedin \
  -H "Authorization: Bearer $CRON_SECRET"

# Test YouTube search
curl -X GET https://tracking2-dg0i31dlt-robdentons-projects.vercel.app/api/cron/youtube-search \
  -H "Authorization: Bearer $CRON_SECRET"
```

**Expected Response (Success):**
```json
{
  "success": true,
  "message": "Task completed",
  "... task-specific metrics ..."
}
```

**Expected Response (Unauthorized - wrong secret):**
```
Unauthorized
```

### 7. Monitor First Scheduled Execution

1. Wait for first scheduled cron run (7:00 AM UTC for sheets sync)
2. Go to **Vercel Dashboard** → **Functions** → **Logs**
3. Look for execution traces:
   ```
   [Cron] Sheets sync started at 2026-02-18 07:00:01
   [Cron] Sheets sync completed: 45 activities, 120 metrics
   ```

### 8. Verify Data Freshness

1. Visit production dashboard: https://tracking2-dg0i31dlt-robdentons-projects.vercel.app
2. Check that data is updating automatically
3. Verify last update timestamps

### 9. Unload LaunchAgents (After Confirmation)

Once Vercel cron jobs are working successfully, unload local LaunchAgents:

```bash
# Unload all 5 LaunchAgents
launchctl unload ~/Library/LaunchAgents/com.mai.sheets-sync.plist
launchctl unload ~/Library/LaunchAgents/com.mai.youtube-tracker.plist
launchctl unload ~/Library/LaunchAgents/com.mai.youtube-imported-tracker.plist
launchctl unload ~/Library/LaunchAgents/com.mai.linkedin-tracker.plist
launchctl unload ~/Library/LaunchAgents/com.mai.youtube-search.plist

# Verify they're unloaded
launchctl list | grep com.mai
# Should return no results
```

**Keep plist files as backup documentation.**

## File Structure

```
apps/web/src/
├── lib/
│   ├── cron-auth.ts                       # Authentication helper
│   └── tasks/
│       ├── sync-sheets.ts                 # Google Sheets sync logic
│       ├── track-youtube.ts               # YouTube view tracking
│       ├── track-imported.ts              # Imported video tracking
│       ├── track-linkedin.ts              # LinkedIn engagement (Puppeteer)
│       └── youtube-search.ts              # YouTube search
└── app/
    └── api/
        └── cron/
            ├── sync-sheets/route.ts       # API route wrapper
            ├── track-youtube/route.ts     # API route wrapper
            ├── track-imported/route.ts    # API route wrapper
            ├── track-linkedin/route.ts    # API route wrapper (serverless Chrome)
            └── youtube-search/route.ts    # API route wrapper
```

## Monitoring and Debugging

### Vercel Function Logs

**Location:** Vercel Dashboard → Functions → Select function → Logs

**What to Look For:**
- Execution start/end timestamps
- Success/error messages
- Data counts (activities, metrics, views, etc.)
- Error stack traces

**Example Log Output:**
```
[2026-02-18 07:00:01] Sheets sync started at 2026-02-18 07:00:01
[2026-02-18 07:00:05] Fetching "Newsletter" tab...
[2026-02-18 07:00:06] Fetching "YouTube" tab...
[2026-02-18 07:00:12] Parsed 45 activities total, 120 daily metrics.
[2026-02-18 07:00:15] Sync complete. Loaded 45 activities and 120 daily metrics.
[2026-02-18 07:00:15] Sheets sync completed: 45 activities, 120 metrics
```

### Common Issues and Solutions

#### Issue: "Unauthorized" Response
**Cause:** CRON_SECRET not set or incorrect

**Solutions:**
1. Verify `CRON_SECRET` is set in Vercel environment variables
2. Check authorization header format: `Bearer YOUR_SECRET`
3. Redeploy after adding environment variable

#### Issue: "Module not found" Error
**Cause:** Prisma client not generated during build

**Solutions:**
1. Check `postinstall` script in `apps/web/package.json`:
   ```json
   "postinstall": "prisma generate --schema=../../prisma/schema.prisma"
   ```
2. Verify Prisma dependencies are installed
3. Redeploy

#### Issue: Puppeteer Timeout in LinkedIn Tracking
**Cause:** LinkedIn's bot detection or slow page load

**Solutions:**
1. Increase Vercel function timeout (max 60s on Pro plan)
2. Add retry logic with exponential backoff
3. Consider LinkedIn API as alternative
4. Check logs for specific error messages

#### Issue: Database Connection Timeout
**Cause:** Neon database connection issues

**Solutions:**
1. Check Neon database connection string in `DATABASE_URL`
2. Verify `sslmode=require` is set
3. Check Neon database is not paused (free tier auto-pauses after 7 days inactivity)
4. Visit Neon dashboard to wake up database

#### Issue: Cron Jobs Not Executing on Schedule
**Cause:** Configuration or plan issues

**Solutions:**
1. Verify Vercel Pro plan is active
2. Check cron configuration in `vercel.json`
3. Ensure API routes return 200 status for successful execution
4. Check Vercel Dashboard → Cron Jobs for execution history

## Cost Summary

- **Vercel Pro Plan:** $20/month (required for cron jobs)
- **Neon Database:** Free tier (currently sufficient)
- **YouTube API:** Free quota (10,000 requests/day)
- **Google Sheets:** Free (CSV export, no API needed)

**Total Monthly Cost:** $20 (Vercel Pro only)

## Rollback Plan

If issues occur, temporarily revert to local LaunchAgents:

1. **Re-enable LaunchAgents:**
   ```bash
   launchctl load ~/Library/LaunchAgents/com.mai.sheets-sync.plist
   launchctl load ~/Library/LaunchAgents/com.mai.youtube-tracker.plist
   launchctl load ~/Library/LaunchAgents/com.mai.youtube-imported-tracker.plist
   launchctl load ~/Library/LaunchAgents/com.mai.linkedin-tracker.plist
   launchctl load ~/Library/LaunchAgents/com.mai.youtube-search.plist
   ```

2. **Update local `.env` to use production database:**
   ```bash
   DATABASE_URL="postgresql://neondb_owner:npg_2YajlfDLtk7x@ep-proud-hall-abilfqx1-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require"
   ```

3. **Debug Vercel cron issues:**
   - Check Vercel Function logs for errors
   - Verify environment variables
   - Test API routes manually

4. **Fix and redeploy:**
   - Update code as needed
   - Commit and push
   - Test again

## Success Criteria

Migration is complete when:

- [x] All 5 API routes created and deployed
- [x] Cron authentication working with `CRON_SECRET`
- [x] Puppeteer configured with @sparticuz/chromium
- [x] `vercel.json` updated with cron schedules
- [x] Code committed and deployed to Vercel
- [ ] `CRON_SECRET` added to Vercel environment variables
- [ ] Manual testing confirms each endpoint works
- [ ] First scheduled execution completes successfully
- [ ] Data appears fresh on production dashboard
- [ ] All 5 cron jobs show successful executions in Vercel logs
- [ ] LaunchAgents unloaded from local machine
- [ ] Local machine can be turned off without affecting data collection

## Next Steps

1. Add `CRON_SECRET` to Vercel environment variables
2. Deploy to Vercel (`git push`)
3. Test all endpoints manually
4. Monitor first scheduled execution
5. Verify data freshness on dashboard
6. Unload LaunchAgents after confirmation

## Support

- **Vercel Cron Documentation:** https://vercel.com/docs/cron-jobs
- **Vercel Function Logs:** Vercel Dashboard → Functions → Logs
- **Neon Database Dashboard:** https://console.neon.tech/

## Notes

- All cron schedules use UTC timezone
- Vercel cron jobs have a maximum execution time of 60 seconds on Pro plan
- Puppeteer with @sparticuz/chromium adds ~50MB to deployment size
- LinkedIn scraping may violate LinkedIn ToS - monitor for rate limiting
- YouTube API has a daily quota of 10,000 requests - monitor usage
