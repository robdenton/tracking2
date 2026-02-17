# Vercel Deployment Guide

This guide walks you through deploying your Marketing Activity Impact dashboard to Vercel with Neon Postgres.

## Prerequisites

- Vercel account
- GitHub repository (recommended) or Vercel CLI
- Your environment variables ready (see `.env.example`)

## Step 1: Create Neon Postgres Database

1. In your Vercel project dashboard, go to the **Storage** tab
2. Click **Create Database**
3. Select **Neon (Serverless Postgres)**
4. Choose your preferred region (select closest to your users)
5. Click **Create**

Vercel will automatically:
- Provision a Neon Postgres database
- Add `DATABASE_URL` to your environment variables
- Connect it to your project

## Step 2: Configure Environment Variables

In your Vercel project settings, add these environment variables:

### Required Variables

```bash
# Database (automatically added by Vercel when you create Neon database)
DATABASE_URL=<automatically_set_by_vercel>

# Uplift Model
BASELINE_WINDOW_DAYS=14
POST_WINDOW_DAYS=7

# Baseline Decontamination
BASELINE_DECONTAMINATION_ENABLED=true
DECONTAMINATION_MAX_ITERATIONS=2
DECONTAMINATION_CONVERGENCE_THRESHOLD=1

# Data Paths
ACTIVITIES_CSV_PATH=data/activities.csv
DAILY_METRICS_CSV_PATH=data/daily_metrics.csv

# Google Sheets
GOOGLE_SHEET_ID=<your_sheet_id>
DAILY_METRICS_TAB_NAME=daily_metrics
ACTIVITY_TABS=Newsletter:newsletter,YouTube:youtube,Socials:x,LinkedIn:linkedin

# YouTube API
YOUTUBE_API_KEY=<your_youtube_api_key>
```

### Optional Variables

```bash
# Custom YouTube search query (default: "granola ai")
YOUTUBE_SEARCH_QUERY=granola ai
```

## Step 3: Run Database Migrations

After your first deployment, you need to initialize the database schema:

### Option A: Using Vercel CLI (Recommended)

```bash
# Install Vercel CLI if you haven't already
npm i -g vercel

# Pull environment variables from Vercel
vercel env pull

# Run Prisma migration
npx prisma db push --schema=prisma/schema.prisma
```

### Option B: Using Prisma Studio

1. Get your production `DATABASE_URL` from Vercel environment variables
2. Temporarily add it to your local `.env` file
3. Run: `npx prisma db push --schema=prisma/schema.prisma`
4. Remove the production URL from your local `.env`

## Step 4: Seed Initial Data (Optional)

If you want to seed your production database:

```bash
# Make sure you have production DATABASE_URL in .env
npm run seed
```

## Step 5: Deploy

### If using GitHub:
1. Push your code to GitHub
2. Vercel will automatically build and deploy
3. Check the deployment logs for any issues

### If using Vercel CLI:
```bash
vercel --prod
```

## Step 6: Verify Deployment

1. Visit your Vercel deployment URL
2. Check that the dashboard loads correctly
3. Verify data is being read from the database
4. Test the YouTube import review page at `/youtube-import/review`

## Troubleshooting

### Build Fails with Prisma Error

**Error:** `Error: @prisma/client did not initialize yet`

**Solution:** This should be fixed by the `postinstall` script in `apps/web/package.json`. If it persists:
1. Check that `vercel.json` has the correct build command
2. Verify `apps/web/package.json` has the postinstall hook
3. Check Vercel build logs for the exact error

### Database Connection Error

**Error:** `Can't reach database server`

**Solution:**
1. Verify `DATABASE_URL` is set in Vercel environment variables
2. Check that Neon database is running (visit Neon dashboard)
3. Ensure you ran `prisma db push` to create tables
4. Verify the connection string format is correct

### Missing Environment Variables

**Error:** Features not working or undefined variables

**Solution:**
1. Go to Vercel Project Settings > Environment Variables
2. Add all required variables from the list above
3. Redeploy your project

## Local Development with PostgreSQL

If you want to match production locally:

### Option 1: Use Local PostgreSQL

```bash
# Install PostgreSQL (macOS)
brew install postgresql@15
brew services start postgresql@15

# Create local database
createdb marketing_activity_impact

# Update .env
DATABASE_URL="postgresql://localhost/marketing_activity_impact"

# Push schema
npx prisma db push --schema=prisma/schema.prisma

# Seed data
npm run seed
```

### Option 2: Keep Using SQLite Locally

You can keep using SQLite for local development:

1. Restore `.env.local.sqlite` to `.env` for local work
2. The Prisma schema supports PostgreSQL (production) and SQLite (local)
3. Just remember to test PostgreSQL-specific features before deploying

## Scheduled Tasks on Vercel

⚠️ **Important:** Your current LaunchAgent scheduled tasks (YouTube search, view tracking, etc.) run on your local machine. They **will not** run on Vercel.

To run scheduled tasks on Vercel, you need to either:

### Option A: Vercel Cron Jobs (Recommended for Vercel deployment)

1. Create `/vercel.json` cron configuration (requires Vercel Pro plan)
2. Convert scripts to API routes in `apps/web/app/api/`
3. Schedule via Vercel's cron system

### Option B: External Scheduler

1. Use a service like GitHub Actions, Render Cron, or Railway
2. Keep LaunchAgent running on your local machine
3. Configure external service to hit API endpoints

### Option C: Keep Local Scheduler

If you want to keep using your local machine for scheduled tasks:
1. Keep LaunchAgent jobs running locally
2. Update `DATABASE_URL` in your local `.env` to point to production Neon database
3. Tasks will update the production database directly

## Need Help?

- Vercel Documentation: https://vercel.com/docs
- Neon Documentation: https://neon.tech/docs
- Prisma Documentation: https://www.prisma.io/docs
