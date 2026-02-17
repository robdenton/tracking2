# eNAU Chart Feature

## Overview

Added a new chart to the Newsletter Analytics page that compares **eNAU (Estimated Number of Activated Users)** against actual signups and activations.

## What's Been Added

### New Chart: "eNAU vs Actual"

**Location**: http://localhost:3000/channels/newsletter

**Features**:
- **Purple dashed line**: eNAU (your estimate of activated users)
- **Green solid line**: Actual signups (accounts created)
- **Orange solid line**: Actual activations (users who activated)
- **Toggle**: Switch between weekly and monthly views
- **Single Y-axis**: All three metrics use the same scale for easy comparison

### Updated Summary Stats

The dashboard now shows 5 metrics:
1. Total Activities
2. Est. Clicks
3. **eNAU** (newly added - with "Estimated" label)
4. Signups (with "Actual" label)
5. Activations (with "Actual" label)

### New Data Table

Added second table showing:
- Period (week or month)
- eNAU (Estimated - shown in purple)
- Signups (Actual)
- Activations (Actual)
- **eNAU vs Activations %** - Shows accuracy of your estimates

## Data Source

### Google Sheets Mapping

The `eNAU` column from your Google Sheets Newsletter tab is now:
1. Stored in `metadata.eNAU` field
2. Aggregated by time period (weekly/monthly)
3. Displayed in charts and tables

### Files Modified

```
/scripts/sync-sheets.ts                              # Added eNAU to metadata mapping
/apps/web/src/app/channels/newsletter/page.tsx      # Added eNAU chart & table
/apps/web/src/app/channels/newsletter/enau-chart.tsx # New chart component
```

## Chart Design Details

### Visual Encoding

**eNAU (Purple):**
- Dashed line to indicate it's an estimate
- Hollow circles for data points
- Stands out as "the bet"

**Signups (Green):**
- Solid line
- Filled circles
- Represents actual account creation

**Activations (Orange):**
- Solid line
- Filled circles
- Represents actual user activation

### Why This Chart Matters

Shows how accurate your activation estimates are:
- **eNAU above actuals**: You're being optimistic
- **eNAU below actuals**: You're being conservative
- **eNAU matches actuals**: Your estimates are well-calibrated

## Example Insights

With the eNAU vs Activations % column, you can see:
- **150%**: Activations exceeded your estimate by 50%
- **80%**: Activations were 20% below your estimate
- **100%**: Perfect estimate

## Usage

### View the Charts

1. Start dev server: `npm run dev`
2. Navigate to: http://localhost:3000/channels/newsletter
3. Two charts will appear:
   - **Chart 1**: Est. Clicks vs Signups/Activations
   - **Chart 2**: eNAU vs Actual Signups/Activations *(NEW)*
4. Toggle between Weekly/Monthly

### Update eNAU Data

1. Edit the `eNAU` column in your Google Sheets Newsletter tab
2. Run: `npm run sync` (or wait for 7am auto-sync)
3. Refresh the newsletter analytics page

## Technical Notes

### Aggregation Logic

```typescript
// Weekly grouping: Sum all eNAU values in the same ISO week
// Monthly grouping: Sum all eNAU values in the same month

// Example for 2026-01 (January):
{
  period: "2026-01",
  eNAU: 50,        // Sum of all eNAU from activities in Jan
  signups: 120,    // Sum of all signups in Jan
  activations: 45  // Sum of all activations in Jan
}
```

### Comparison Metric

The "eNAU vs Activations" column calculates:
```
(Actual Activations / eNAU) × 100
```

This shows how your estimate compared to reality:
- `> 100%` = Better than expected
- `< 100%` = Worse than expected
- `= 100%` = Exactly as expected

## Future Enhancements

Potential improvements:
- [ ] Add prediction accuracy score (MAPE, RMSE)
- [ ] Show confidence intervals around eNAU
- [ ] Highlight periods where estimate was off by >50%
- [ ] Add trend line showing if estimates are improving over time
- [ ] Calculate average estimation bias (consistently over/under)
