# Channel Analytics - Newsletter

## Overview

New aggregated channel analytics page for newsletters, showing time series visualizations of estimated clicks vs. actual signups and activations.

## What's Been Added

### New Route
- **URL**: http://localhost:3000/channels/newsletter
- **Link**: Added to header navigation ("Newsletter Analytics")

### Features

#### 1. Summary Stats
Four key metrics at the top:
- Total Activities (live newsletter sends)
- Total Estimated Clicks
- Total Signups (accounts created)
- Total Activations (activated users)

#### 2. Time Series Chart
- **Dual Y-axis chart** showing:
  - Left axis: Estimated Clicks (blue line)
  - Right axis: Signups (green line) and Activations (orange line)
- **Canvas-based rendering** (no external chart library dependencies)
- **Interactive toggle** between weekly and monthly grouping

#### 3. Data Table
- Period-by-period breakdown
- Shows: Est. Clicks, Signups, Activations
- Calculates Click-to-Signup conversion rate

### Implementation Details

#### Files Created
```
/apps/web/src/app/channels/newsletter/
├── page.tsx        # Server component with data fetching
└── chart.tsx       # Client component with canvas chart
```

#### Files Modified
```
/apps/web/src/lib/data.ts           # Added getChannelAnalytics()
/apps/web/src/app/layout.tsx        # Added nav link
```

### Data Aggregation Logic

**Weekly Grouping:**
- Uses ISO week numbers (2026-W01, 2026-W02, etc.)
- Groups all activities and metrics within the same week

**Monthly Grouping:**
- Groups by year-month (2026-01, 2026-02, etc.)
- Sums all activities and metrics within the same month

### Chart Specifications

**Chart Type:** Dual-axis line chart with data points

**Left Y-Axis (Blue):** Estimated Clicks
- Scaled independently based on max clicks value
- Shows the "bet" - what you estimated would happen

**Right Y-Axis (Green/Orange):** Signups & Activations
- Scaled independently based on max signups/activations
- Shows actual performance metrics

**X-Axis:** Time periods (weeks or months)

**Legend:** Shows all three metrics with color coding

## Usage

### Access the Page
1. Start dev server: `npm run dev`
2. Visit: http://localhost:3000
3. Click "Newsletter Analytics" in header
4. Toggle between Weekly/Monthly view

### Understanding the Chart

**What it shows:**
- How many clicks you estimated newsletters would drive (blue)
- How many signups actually occurred (green)
- How many users activated (orange)

**What to look for:**
- Are signups tracking proportionally to estimated clicks?
- What's the typical conversion rate (clicks → signups)?
- Are there periods with unusually high/low performance?

### Adding More Channels

To create analytics for other channels (YouTube, LinkedIn, etc.):

1. Copy `/apps/web/src/app/channels/newsletter/` folder
2. Rename to new channel name
3. Update the `getChannelAnalytics("newsletter")` call with new channel
4. Adjust chart based on channel-specific metrics (e.g., views instead of clicks)
5. Add nav link in layout.tsx

## Example Data

With your current newsletter data:
- **87 activities** spanning Dec 2025 - Dec 2026
- **Monthly view** shows 13 months of data points
- **Weekly view** shows ~52 weeks of data points

## Future Enhancements

Potential improvements:
- [ ] Export chart as PNG/PDF
- [ ] Add filters (date range, specific partners)
- [ ] Show cost per signup/activation
- [ ] Add trend lines / moving averages
- [ ] Comparison to baseline/target
- [ ] Download data as CSV
- [ ] Add other channels (YouTube, LinkedIn, Podcasts)
- [ ] Cross-channel comparison view
