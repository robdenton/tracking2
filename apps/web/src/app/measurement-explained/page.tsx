/**
 * Measurement Explained
 *
 * Plain-English reference for the end-to-end measurement methodology.
 *
 * HOW TO UPDATE THIS PAGE
 * ───────────────────────
 * Whenever the methodology changes (window sizes, new channels, attribution
 * logic, decontamination parameters, confidence thresholds, etc.) you should:
 *   1. Update the relevant section(s) below.
 *   2. Bump LAST_UPDATED to today's date.
 *   3. Commit and deploy.
 */

export const dynamic = "force-dynamic";

// ─── Bump this whenever the content changes ───────────────────────────────────
const LAST_UPDATED = "18 February 2026";
// ─────────────────────────────────────────────────────────────────────────────

const tocItems = [
  { href: "#overview", label: "Overview" },
  { href: "#newsletter", label: "Newsletter" },
  { href: "#youtube", label: "YouTube" },
  { href: "#linkedin", label: "LinkedIn" },
  { href: "#socials", label: "Socials" },
  { href: "#methodology-notes", label: "Methodology Notes" },
];

function SectionHeading({
  id,
  emoji,
  title,
}: {
  id: string;
  emoji: string;
  title: string;
}) {
  return (
    <h2
      id={id}
      className="text-xl font-bold mt-12 mb-4 pb-2 border-b border-gray-200 dark:border-gray-800 scroll-mt-6"
    >
      {emoji} {title}
    </h2>
  );
}

function SubHeading({ title }: { title: string }) {
  return (
    <h3 className="font-semibold text-base mt-6 mb-2 text-gray-900 dark:text-gray-100">
      {title}
    </h3>
  );
}

function Para({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed mb-3">
      {children}
    </p>
  );
}

function Callout({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="my-4 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 bg-gray-50 dark:bg-gray-900/40">
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">
        {label}
      </div>
      <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
        {children}
      </div>
    </div>
  );
}

function Pill({
  label,
  value,
  color = "gray",
}: {
  label: string;
  value: string;
  color?: "gray" | "green" | "yellow" | "blue";
}) {
  const colors = {
    gray: "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300",
    green: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300",
    yellow: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300",
    blue: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium mr-2 ${colors[color]}`}
    >
      <span className="text-gray-400 dark:text-gray-500">{label}</span> {value}
    </span>
  );
}

function DataSourceBadge({ source }: { source: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded font-mono">
      {source}
    </span>
  );
}

export default function MeasurementExplainedPage() {
  return (
    <div className="max-w-3xl mx-auto">
      {/* ── Page header ───────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h1 className="text-2xl font-bold">Measurement Explained</h1>
          <span className="text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
            Last updated: {LAST_UPDATED}
          </span>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          A plain-English guide to how we calculate incrementality for each
          marketing channel. No statistics degree required.
        </p>
      </div>

      {/* ── Table of contents ─────────────────────────────────────────── */}
      <nav className="flex flex-wrap gap-x-4 gap-y-1 mb-10 pb-4 border-b border-gray-200 dark:border-gray-800">
        {tocItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {item.label}
          </a>
        ))}
      </nav>

      {/* ══════════════════════════════════════════════════════════════════
          OVERVIEW
      ══════════════════════════════════════════════════════════════════ */}
      <SectionHeading id="overview" emoji="📐" title="Overview" />

      <SubHeading title="What we're measuring" />
      <Para>
        We measure <strong>incremental</strong> signups and activations — the
        extra signups or paying customers we can attribute to a specific
        marketing activity, above what would have happened anyway. The goal is
        to answer: &ldquo;Did this newsletter / video / post actually move the
        needle, or were those signups coming regardless?&rdquo;
      </Para>

      <SubHeading title="The two data inputs" />
      <Para>
        Everything flows from two tables synced daily from Google Sheets:
      </Para>
      <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 mb-3 space-y-1 ml-1">
        <li>
          <strong>Activities</strong> — one row per marketing event (newsletter
          send, YouTube video, LinkedIn post, etc.), with its channel, date,
          partner name, click counts, and cost.
        </li>
        <li>
          <strong>Daily metrics</strong> — one row per channel per day, with
          total signups and activations for that channel on that day. This is
          the raw signal we measure against.
        </li>
      </ul>

      <SubHeading title="The baseline" />
      <Para>
        For each activity, we look at the <strong>14 days before it</strong> to
        establish a &ldquo;normal day&rdquo; for that channel. We take the
        average daily signups across those 14 days. This is our expected rate —
        what we would have seen without the activity.
      </Para>
      <Callout label="Example">
        A newsletter goes out on 15 January. The baseline is 1–14 January. If
        we averaged 42 signups/day over those 14 days, our expected rate is 42
        signups/day.
      </Callout>

      <SubHeading title="The post window" />
      <Para>
        After the activity, we count signups over a defined window and compare
        to what we expected. The window length varies by channel (see each
        channel section below) because different channels have different
        engagement tails.
      </Para>

      <SubHeading title="The incremental" />
      <Para>
        Incremental signups = observed signups in the post window minus expected
        signups (baseline average × window length). We floor at zero — we don&rsquo;t
        model negative lift.
      </Para>
      <Callout label="Formula">
        incremental = max(0, observed &minus; (baseline avg &times; post window days)
      </Callout>

      <SubHeading title="Confidence" />
      <Para>
        Each activity gets a confidence rating — a quick signal-to-noise check
        that tells you how clearly the lift stands out from normal baseline
        variability. It is <em>not</em> a statistical p-value.
      </Para>
      <div className="flex flex-col gap-2 my-3">
        <div className="flex items-start gap-3">
          <Pill label="" value="HIGH" color="green" />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            The lift is more than <strong>twice</strong> the typical day-to-day
            variability in the baseline. A clear signal above the noise.
          </span>
        </div>
        <div className="flex items-start gap-3">
          <Pill label="" value="MED" color="yellow" />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            The lift is more than <strong>one times</strong> the variability.
            Plausible signal, but less definitive.
          </span>
        </div>
        <div className="flex items-start gap-3">
          <Pill label="" value="LOW" color="gray" />
          <span className="text-sm text-gray-700 dark:text-gray-300">
            The lift is within normal baseline noise. Hard to distinguish from
            chance variation.
          </span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════
          NEWSLETTER
      ══════════════════════════════════════════════════════════════════ */}
      <SectionHeading id="newsletter" emoji="✉️" title="Newsletter" />

      <div className="flex flex-wrap gap-2 mb-4">
        <Pill label="Post window" value="2 days" color="blue" />
        <DataSourceBadge source="Google Sheets → Newsletter tab" />
      </div>

      <SubHeading title="Why 2 days?" />
      <Para>
        Newsletter engagement is strongly front-loaded. The overwhelming
        majority of opens, clicks, and resulting signups happen on the day of
        the send and the day after. Using a 7-day window (our default for other
        channels) would pick up signups that were almost certainly organic —
        people who would have signed up anyway — and incorrectly attribute them
        to the newsletter. The 2-day window reflects where the real engagement
        actually happens.
      </Para>

      <SubHeading title="Proportional attribution" />
      <Para>
        When two or more newsletters have overlapping post windows (e.g. two
        sends within 2 days of each other), the model splits credit
        proportionally based on click counts. If Newsletter A had 1,000 clicks
        and Newsletter B had 500, A gets ⅔ of the shared incremental and B gets
        ⅓. The model uses <strong>actual measured clicks</strong> first, then
        falls back to <strong>estimated clicks</strong> if actual aren&rsquo;t available.
      </Para>

      <SubHeading title="Baseline decontamination" />
      <Para>
        Because newsletters go out frequently — sometimes daily — each
        newsletter&rsquo;s 14-day baseline window almost always contains spikes
        caused by <em>other</em> newsletters. If we used the raw baseline
        average, we&rsquo;d set the bar artificially high and undercount lift.
      </Para>
      <Para>
        To fix this, we iteratively subtract the estimated impact of other
        concurrent newsletters from the contaminated baseline dates, then
        recalculate. We repeat until the numbers stabilise — typically in 1–2
        passes. See the <a href="#methodology-notes" className="text-blue-600 dark:text-blue-400 hover:underline">Methodology Notes</a> section for a worked example.
      </Para>

      {/* ══════════════════════════════════════════════════════════════════
          YOUTUBE
      ══════════════════════════════════════════════════════════════════ */}
      <SectionHeading id="youtube" emoji="▶️" title="YouTube" />

      <SubHeading title="Activity videos (paid / partnership)" />
      <div className="flex flex-wrap gap-2 mb-3">
        <Pill label="Post window" value="7 days" color="blue" />
        <DataSourceBadge source="Google Sheets → YouTube tab" />
        <DataSourceBadge source="YouTube Data API v3" />
      </div>
      <Para>
        These are YouTube videos directly tied to a paid sponsorship or
        partnership activity logged in the Sheets. The incrementality
        calculation uses the standard 7-day post window — a longer window than
        newsletter because YouTube content has a longer engagement tail (people
        discover videos days or weeks after publish).
      </Para>
      <Para>
        View counts for these videos are fetched daily via the YouTube Data API
        v3 and stored as a time series, so you can see how views have grown
        over time alongside the incrementality data.
      </Para>

      <SubHeading title="Imported / organic videos" />
      <div className="flex flex-wrap gap-2 mb-3">
        <DataSourceBadge source="YouTube Search API (automated)" />
      </div>
      <Para>
        Each day, an automated job searches YouTube for organic mentions of
        Granola (e.g. reviews, tutorials, comparisons). Videos found this way
        are surfaced for review and, once accepted, tracked for view count
        trends.
      </Para>
      <Para>
        These videos are <strong>not included in incrementality
        calculations</strong> — they don&rsquo;t have a partner, a budget, or an
        activity date to anchor a baseline against. They&rsquo;re purely tracked
        for reach/awareness context.
      </Para>

      {/* ══════════════════════════════════════════════════════════════════
          LINKEDIN
      ══════════════════════════════════════════════════════════════════ */}
      <SectionHeading id="linkedin" emoji="💼" title="LinkedIn" />

      <div className="flex flex-wrap gap-2 mb-4">
        <Pill label="Post window" value="7 days" color="blue" />
        <DataSourceBadge source="Google Sheets → LinkedIn tab" />
        <DataSourceBadge source="Puppeteer scraping" />
      </div>

      <SubHeading title="Incrementality" />
      <Para>
        LinkedIn activities use the same baseline/post-window formula as all
        other channels. The 7-day post window reflects the fact that LinkedIn
        posts can resurface in feeds for several days via comments and shares.
      </Para>

      <SubHeading title="Engagement metrics" />
      <Para>
        In addition to the core incrementality number, we also track
        engagement metrics for each LinkedIn post: <strong>likes</strong>,{" "}
        <strong>comments</strong>, <strong>reposts</strong>, and{" "}
        <strong>post impressions</strong>. These are fetched daily by a
        headless browser (Puppeteer) that visits each post URL and extracts the
        numbers from the page. This scraping runs on Vercel&rsquo;s servers.
      </Para>
      <Para>
        Engagement metrics are supplementary context — they help you understand
        reach and resonance, but the primary incrementality number (signups
        above baseline) is calculated the same way as every other channel.
      </Para>

      {/* ══════════════════════════════════════════════════════════════════
          SOCIALS
      ══════════════════════════════════════════════════════════════════ */}
      <SectionHeading id="socials" emoji="𝕏" title="Socials (X / Twitter)" />

      <div className="flex flex-wrap gap-2 mb-4">
        <Pill label="Post window" value="7 days" color="blue" />
        <DataSourceBadge source="Google Sheets → Socials tab" />
      </div>

      <Para>
        Social activities (primarily X / Twitter posts) are tracked via the
        Socials tab in Google Sheets. Activity data is entered manually.
      </Para>
      <Para>
        The incrementality calculation uses the same baseline/post formula as
        other channels. No additional scraping or social API integration is
        currently active for this channel.
      </Para>

      {/* ══════════════════════════════════════════════════════════════════
          METHODOLOGY NOTES
      ══════════════════════════════════════════════════════════════════ */}
      <SectionHeading id="methodology-notes" emoji="📝" title="Methodology Notes" />

      <SubHeading title="How baseline decontamination works" />
      <Para>
        Imagine you want to measure whether Newsletter A (sent 15 Jan) drove
        signups. Your baseline window is 1–14 Jan. But Newsletter B ran on
        10 Jan and caused a spike of +30 signups on 10–11 Jan. If you include
        that spike in your 14-day average, you&rsquo;ll set the bar too high —
        and undercount Newsletter A&rsquo;s true lift.
      </Para>
      <Para>
        Decontamination fixes this in three steps:
      </Para>
      <ol className="list-decimal list-inside text-sm text-gray-700 dark:text-gray-300 mb-3 space-y-1 ml-1">
        <li>Calculate rough incremental estimates for every activity using the raw (contaminated) baselines.</li>
        <li>For each activity, identify which dates in its baseline window were contaminated by concurrent activities, and subtract their estimated daily impact from those dates.</li>
        <li>Recalculate all incrementals with the cleaned baselines. Repeat until the numbers stop changing meaningfully (usually 1–2 rounds).</li>
      </ol>
      <Para>
        Only same-channel activities contaminate each other. LinkedIn posts
        don&rsquo;t affect the newsletter baseline, and vice versa.
      </Para>

      <SubHeading title="Confidence is a heuristic, not a p-value" />
      <Para>
        The confidence rating tells you how large the observed lift is relative
        to the normal day-to-day noise in that channel&rsquo;s signups. HIGH
        means the signal is clearly above the noise. It does <em>not</em> mean
        we&rsquo;ve run a randomised controlled experiment — there&rsquo;s no
        holdout group. It&rsquo;s a quick sanity check to help prioritise which
        results to trust vs. which to treat with more caution.
      </Para>

      <SubHeading title="Deterministic floors" />
      <Para>
        For some activities we have direct-attribution data — for example, a
        unique tracking link that records exactly how many people clicked
        through and signed up. We call this the <strong>deterministic tracked
        signups</strong> floor. If the model&rsquo;s incremental estimate comes
        in below this floor, the floor wins. We never attribute fewer signups
        than we&rsquo;ve directly observed.
      </Para>

      <SubHeading title="Current parameter settings" />
      <div className="flex flex-wrap gap-2 mb-4">
        <Pill label="Baseline window" value="14 days" />
        <Pill label="Newsletter post window" value="2 days" />
        <Pill label="All other channels post window" value="7 days" />
        <Pill label="Decontamination" value="enabled" color="green" />
        <Pill label="Max decontamination passes" value="2" />
        <Pill label="Proportional attribution" value="newsletter only" />
      </div>

      <SubHeading title="What triggers a methodology update" />
      <Para>
        This page (and the <code className="text-xs bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">LAST_UPDATED</code> date at the top) should be updated whenever any of the following change:
      </Para>
      <ul className="list-disc list-inside text-sm text-gray-700 dark:text-gray-300 mb-3 space-y-1 ml-1">
        <li>Baseline window length</li>
        <li>Post window lengths (including adding channel-specific overrides)</li>
        <li>Baseline decontamination on/off, max iterations, or convergence threshold</li>
        <li>Proportional attribution channels or click-source priority</li>
        <li>New channels being added to the model</li>
        <li>How confidence tiers (HIGH / MED / LOW) are computed</li>
        <li>New data sources feeding into the calculation</li>
      </ul>

      {/* ── Footer spacer ─────────────────────────────────────────────── */}
      <div className="mt-16 pb-8 text-xs text-gray-400 dark:text-gray-600 border-t border-gray-100 dark:border-gray-800 pt-4">
        Last updated {LAST_UPDATED}. To update this page, edit{" "}
        <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
          apps/web/src/app/measurement-explained/page.tsx
        </code>{" "}
        and bump the{" "}
        <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
          LAST_UPDATED
        </code>{" "}
        constant.
      </div>
    </div>
  );
}
