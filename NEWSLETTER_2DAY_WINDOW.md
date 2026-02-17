# Newsletter 2-Day Attribution Window - Summary

## What Changed

Newsletter activities now use a **2-day post window** for incrementality calculation instead of the default 7-day window.

## Why This Change

**Problem:** Newsletters have highly concentrated engagement patterns. Most clicks and signups occur within 24-48 hours of send. Using a 7-day window was over-attributing signups to newsletters.

**Solution:** Reduce the attribution window to match actual engagement behavior:
- **Day 0**: Day newsletter is sent
- **Day 1**: One day after send
- **Total**: 2 days

## What This Means

### For Incrementality Calculations

**Before:**
```
Newsletter: "Workspace" sent on 2026-01-15
Post window: Jan 15-21 (7 days)
Expected: baseline_avg × 7
Observed: Sum of signups Jan 15-21
```

**After:**
```
Newsletter: "Workspace" sent on 2026-01-15
Post window: Jan 15-16 (2 days)
Expected: baseline_avg × 2
Observed: Sum of signups Jan 15-16
```

### For Activity Reports

When you view a newsletter activity detail page:
1. **Post Window section** shows 2 days (not 7)
2. **Incremental signups** only counts days 0-1
3. **Confidence calculation** uses 2-day window
4. **Daily breakdown** highlights 2 days as "post window"

### For Channel Comparisons

- ✅ **Newsletters**: More accurate attribution (2-day window)
- ✅ **YouTube/LinkedIn/Podcasts**: Still use 7-day window
- ✅ **Fair comparison**: Each channel measured on its true engagement pattern

## Example Impact

### Sample Newsletter Activity

```
Activity: Twine Newsletter
Date: 2026-12-01
Baseline Avg: 50 signups/day

OLD (7-day window):
- Expected: 50 × 7 = 350 signups
- Observed: 120 signups (days 0-6)
- Incremental: max(0, 120 - 350) = 0
- Result: No lift detected (underestimate)

NEW (2-day window):
- Expected: 50 × 2 = 100 signups
- Observed: 95 signups (days 0-1)
- Incremental: max(0, 95 - 100) = 0
- Result: Baseline performance
```

**Better scenario:**
```
Observed: 140 signups (days 0-1)
Incremental: 140 - 100 = +40 signups
Result: Clear lift detected! ✅
```

## Technical Implementation

### File Modified
- `/packages/core/src/uplift.ts`

### Function Added
```typescript
function getPostWindowDays(channel: string, defaultDays: number): number {
  if (channel === "newsletter") {
    return 2;
  }
  return defaultDays;
}
```

### Integration Point
Called in `computeActivityReport()` before calculating post window dates:
```typescript
const postWindowDays = getPostWindowDays(activity.channel, defaultPostWindowDays);
```

## Testing

Verified with actual data:
- ✅ Newsletter (Twine, 2026-12-01): 2-day window
- ✅ YouTube (Tina Huang, 2026-05-31): 7-day window (unchanged)

## No Action Required

This change is **automatic** - no configuration changes needed. All newsletter activities will now use the 2-day window when calculating incrementality.

## How to See It

1. Start the app: `npm run dev`
2. Navigate to any newsletter activity detail page
3. Look at "Post Window" section - should show only 2 days
4. Compare to YouTube/other channels - should show 7 days

Or check the summary table - newsletter incrementals should be more accurate now.

## Future Considerations

This is a **hard-coded override** for newsletters. Future improvements could include:
- Making this configurable per-channel in `.env`
- Adding UI to adjust windows per channel
- Dynamic window sizing based on historical patterns
- Different windows for weekday vs weekend sends

## Questions?

See `CHANNEL_SPECIFIC_WINDOWS.md` for more technical details.
