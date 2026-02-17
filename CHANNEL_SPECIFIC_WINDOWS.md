# Channel-Specific Post Windows

## Overview

The incrementality calculation now uses **channel-specific post windows** to better match the attribution characteristics of different marketing channels.

## Implementation

### Newsletter: 2-Day Window

**Rationale:** Newsletter engagement is highly concentrated in the first 24-48 hours after send. Most clicks and signups occur on the day of send and the day after.

**Post Window:**
- **Day 0**: Day the newsletter is sent
- **Day 1**: One day after send
- **Total: 2 days**

**Example:**
```
Newsletter sent: 2026-01-15
Post window: 2026-01-15 to 2026-01-16
Signups counted: Jan 15 + Jan 16
```

### Other Channels: 7-Day Window (Default)

All other channels (YouTube, LinkedIn, podcasts, etc.) continue to use the default 7-day post window defined in `.env`:

```bash
POST_WINDOW_DAYS=7  # Default for non-newsletter channels
```

## Technical Details

### Code Changes

**File Modified:** `/packages/core/src/uplift.ts`

Added `getPostWindowDays()` function that returns channel-specific windows:

```typescript
function getPostWindowDays(channel: string, defaultDays: number): number {
  if (channel === "newsletter") {
    return 2;
  }
  return defaultDays;
}
```

This function is called in `computeActivityReport()` to determine the post window for each activity based on its channel.

### Verification

Tested with actual data:
- ✅ **Newsletter (Twine, 2026-12-01)**: Post window = 2026-12-01 to 2026-12-02 (2 days)
- ✅ **YouTube (Tina Huang, 2026-05-31)**: Post window = 2026-05-31 to 2026-06-06 (7 days)

## Impact on Reports

### Activity Detail Pages

When viewing a newsletter activity detail page:
- "Post window" section shows 2 days instead of 7
- "Observed Total" sums signups from only 2 days
- "Incremental" calculation uses 2-day expected total: `baseline_avg * 2`

### Summary Table

The main summary table will show:
- Newsletter incrementality based on 2-day attribution
- Other channels based on 7-day attribution
- More accurate representation of each channel's true impact

## Why This Matters

### Before (7-day window for all):
```
Newsletter sent: Jan 15
Signups counted: Jan 15-21 (7 days)
Problem: Most signups after day 2 are likely NOT from the newsletter
Result: Over-attribution to newsletters
```

### After (2-day window for newsletters):
```
Newsletter sent: Jan 15
Signups counted: Jan 15-16 (2 days)
Result: Only counts signups in the high-engagement window
Result: More accurate newsletter attribution
```

## Adding More Channel-Specific Windows

To add custom windows for other channels, modify the `getPostWindowDays()` function:

```typescript
function getPostWindowDays(channel: string, defaultDays: number): number {
  if (channel === "newsletter") {
    return 2;
  }
  if (channel === "podcast") {
    return 14;  // Podcasts have longer tail
  }
  if (channel === "linkedin") {
    return 3;   // LinkedIn posts have short shelf life
  }
  return defaultDays;
}
```

## Configuration

### Global Default

Set in `.env`:
```bash
POST_WINDOW_DAYS=7  # Used for all channels except those with overrides
```

### Channel Overrides

Defined in code in `/packages/core/src/uplift.ts`. Currently only newsletter has an override.

## Future Enhancements

Potential improvements:
- [ ] Move channel windows to config file (`.env` or database)
- [ ] Add UI to configure per-channel windows
- [ ] Dynamic window sizing based on historical engagement patterns
- [ ] A/B test different window sizes to optimize accuracy
- [ ] Weekly vs weekend send windows (weekday newsletters may behave differently)
