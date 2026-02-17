# YouTube View Tracking - Status Report

**Date:** February 16, 2026
**Status:** ✅ Fully Operational

---

## 🎯 Current State

### Videos Being Tracked

| Partner | Video ID | Latest Views | Status |
|---------|----------|--------------|--------|
| Feis World | 6Dq2xjbMtzY | 2,287 | ✅ Live |
| Tim Harris | ABUP1HaJ2Uo | 1,748 | ✅ Live |
| Kevin Stratvert | MOnMYcFXEWw | 5,208 | ✅ Live |

**Total tracked:** 3 videos
**First tracking date:** 2026-02-16

### Pending Videos

- **23 booked YouTube activities** without Content URLs yet
- These will be tracked automatically once they:
  1. Go live (status changes to "live")
  2. Have Content URL filled in Google Sheet
  3. Next sync runs (daily at 7am) or manual `npm run sync`

---

## ⚙️ System Configuration

### API Status
- ✅ YouTube API Key: Configured
- ✅ API Quota: 3/10,000 units used today (well within free tier)
- ✅ API Access: Working perfectly

### Automation Status
- ✅ **Google Sheets Sync**: Daily at 7am
- ✅ **YouTube View Tracker**: Daily at 8am
- ✅ Both LaunchAgents installed and active

### Database Status
- ✅ Schema updated with `content_url`, `channel_url` fields
- ✅ `content_views` table created and populated
- ✅ 3 rows in `content_views` table (one per tracked video)

---

## 📊 What Happens Next

### Tomorrow (Feb 17, 2026 at 8am)
The tracker will run automatically and:
1. Fetch latest view counts for the same 3 videos
2. Calculate daily view growth (new views - old views)
3. Store in database

### Example After 7 Days of Tracking

**Kevin Stratvert - View Growth:**
```
Date       | Views  | Daily Change
-----------|--------|-------------
2026-02-16 | 5,208  | —
2026-02-17 | 5,450  | +242
2026-02-18 | 5,680  | +230
2026-02-19 | 5,895  | +215
2026-02-20 | 6,100  | +205
2026-02-21 | 6,290  | +190
2026-02-22 | 6,465  | +175
```

---

## 🔍 Viewing the Data

### Via Web UI

1. Start dev server: `npm run dev`
2. Go to http://localhost:3000
3. Click on any of these activities:
   - Feis World
   - Tim Harris
   - Kevin Stratvert
4. Scroll to **"Content Performance"** section

You'll see:
- Latest view count with date
- Estimated views (from your bet)
- Percentage comparison
- Full view history table

### Via Database Query

```bash
sqlite3 prisma/dev.db "
  SELECT
    a.partner_name,
    cv.date,
    cv.view_count,
    a.metadata
  FROM content_views cv
  JOIN activities a ON cv.activity_id = a.id
  ORDER BY cv.date DESC, a.partner_name;
"
```

---

## 📈 Expected API Usage

### Daily Quota
- Free tier: **10,000 units/day**
- Current usage: **3 units/day** (one per tracked video)
- Headroom: **9,997 units/day** remaining

### As More Videos Go Live
If all 26 YouTube activities eventually get Content URLs:
- Usage: **26 units/day**
- Still well within free tier (0.26% of quota)

### Cost
**$0/month** (completely free under current and projected usage)

---

## 🔧 Manual Operations

### Re-run Tracker Immediately
```bash
npm run track-views
```

### Check Logs
```bash
tail -f ~/Claude\ measurement\ project/logs/youtube-tracker.log
```

### View Next Scheduled Run
```bash
launchctl list | grep youtube-tracker
```

### Manually Trigger Next Sync
To pull new Content URLs from Google Sheets:
```bash
npm run sync
```

---

## ✅ Verification Checklist

- [x] API key configured in `.env`
- [x] Schema migration completed
- [x] View tracker script working
- [x] Data successfully stored in database
- [x] Daily automation installed (8am)
- [x] 3 videos currently being tracked
- [x] UI displaying content URLs
- [x] UI ready to display view tracking data

---

## 🚀 Next Steps

### For You
1. ✅ **Wait for tomorrow** - First daily change will be visible on Feb 17
2. **Add Content URLs** - Fill in the Content URL column for booked YouTube activities as they go live
3. **Monitor growth** - Check the UI after a week to see view trends

### For Future Videos
When a new YouTube sponsorship goes live:
1. Update status to "live" in Google Sheet
2. Add the video URL to "Content URL" column
3. Wait for next sync (7am) or run `npm run sync` manually
4. Tracking starts automatically the next day at 8am

---

## 📞 Support

### Logs Location
- Sheets sync: `~/Claude measurement project/logs/sheets-sync.log`
- View tracker: `~/Claude measurement project/logs/youtube-tracker.log`

### Common Commands
```bash
# Manual sync from Google Sheets
npm run sync

# Manual view tracking
npm run track-views

# Check database contents
sqlite3 prisma/dev.db "SELECT * FROM content_views;"

# Restart dev server
npm run dev
```

### Troubleshooting
If tracking stops working:
1. Check API quota: https://console.cloud.google.com/apis/api/youtube.googleapis.com/quotas
2. Check logs: `tail -50 logs/youtube-tracker.log`
3. Verify LaunchAgent: `launchctl list | grep youtube`
4. Re-run manually: `npm run track-views`

---

**Status:** System is fully operational and tracking 3 videos. Ready for scale as more content goes live! 🎉
