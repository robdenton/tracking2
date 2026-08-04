/**
 * Import Granola users (with GCLIDs and/or UTMs) from a CSV into
 * the granola_users table.
 *
 *   DATABASE_URL=... node scripts/import-granola-users.js /path/to/users.csv
 *
 * Expected CSV columns (case-insensitive, in any order; only user_id and
 * signed_up_at are required):
 *   user_id            (required, unique)
 *   email              (optional)
 *   signed_up_at       (required, ISO 8601 or YYYY-MM-DD)
 *   gclid              (optional)
 *   utm_source         (optional)
 *   utm_campaign       (optional)
 *   utm_medium         (optional)
 *   utm_content        (optional)
 *   utm_term           (optional)
 *   referrer           (optional)
 *   first_activated_at (optional)
 *   became_paying_at   (optional)
 *
 * Existing rows are overwritten (upsert by user_id).
 */

const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");

const CSV_PATH = process.argv[2];
if (!CSV_PATH) {
  console.error("Usage: node scripts/import-granola-users.js <users.csv>");
  process.exit(1);
}

function parseCsvLine(line) {
  const cells = [];
  let cur = "";
  let inQuote = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQuote) {
      if (c === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') {
        inQuote = false;
      } else {
        cur += c;
      }
    } else {
      if (c === ",") {
        cells.push(cur);
        cur = "";
      } else if (c === '"') {
        inQuote = true;
      } else {
        cur += c;
      }
    }
  }
  cells.push(cur);
  return cells;
}

function parseDate(s) {
  if (!s) return null;
  const trimmed = s.trim();
  if (!trimmed) return null;
  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

function nullable(s) {
  if (s === undefined || s === null) return null;
  const t = String(s).trim();
  return t === "" ? null : t;
}

(async () => {
  const p = new PrismaClient();
  const raw = fs.readFileSync(path.resolve(CSV_PATH), "utf-8");
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    console.error("CSV must have a header row and at least one data row");
    process.exit(1);
  }
  // Header aliases so exports from different tools (Omni, Snowflake, etc.) work.
  // Lowercased canonical name → list of acceptable column headings (lowercased).
  const HEADER_ALIASES = {
    user_id: ["user_id", "id", "user id", "userid"],
    email: ["email", "email_address"],
    signed_up_at: [
      "signed_up_at",
      "created at date",
      "created_at",
      "created_at_date",
      "signup_date",
      "signed_up",
      "sign_up_date",
    ],
    gclid: ["gclid"],
    utm_source: ["utm_source"],
    utm_campaign: ["utm_campaign"],
    utm_medium: ["utm_medium"],
    utm_content: ["utm_content"],
    utm_term: ["utm_term"],
    referrer: ["referrer", "referer"],
    first_activated_at: ["first_activated_at", "activated_at"],
    became_paying_at: ["became_paying_at", "paying_at", "first_paid_at"],
  };

  const rawHeaders = parseCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  console.log("Headers:", rawHeaders.join(", "));

  // Build canonical → index map
  const headerIdx = {};
  for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
    for (const a of aliases) {
      const i = rawHeaders.indexOf(a);
      if (i !== -1) {
        headerIdx[canonical] = i;
        break;
      }
    }
  }
  console.log("Mapped:", headerIdx);

  function get(row, name) {
    const i = headerIdx[name];
    return i === undefined ? "" : row[i];
  }

  let inserted = 0,
    updated = 0,
    skipped = 0,
    err = 0;
  const now = new Date();

  const BATCH = 500;
  for (let start = 1; start < lines.length; start += BATCH) {
    const batch = lines.slice(start, start + BATCH);
    for (const line of batch) {
      const cells = parseCsvLine(line);
      const userId = nullable(get(cells, "user_id"));
      const signedUpAt = parseDate(get(cells, "signed_up_at"));
      if (!userId || !signedUpAt) {
        skipped++;
        continue;
      }
      const data = {
        email: nullable(get(cells, "email")),
        signedUpAt,
        gclid: nullable(get(cells, "gclid")),
        utmSource: nullable(get(cells, "utm_source")),
        utmCampaign: nullable(get(cells, "utm_campaign")),
        utmMedium: nullable(get(cells, "utm_medium")),
        utmContent: nullable(get(cells, "utm_content")),
        utmTerm: nullable(get(cells, "utm_term")),
        referrer: nullable(get(cells, "referrer")),
        firstActivatedAt: parseDate(get(cells, "first_activated_at")),
        becamePayingAt: parseDate(get(cells, "became_paying_at")),
        lastSeenAt: now,
      };
      try {
        const existing = await p.granolaUser.findUnique({
          where: { userId },
          select: { userId: true },
        });
        if (existing) {
          await p.granolaUser.update({ where: { userId }, data });
          updated++;
        } else {
          await p.granolaUser.create({
            data: { userId, ...data },
          });
          inserted++;
        }
      } catch (e) {
        console.log(`  ! err on ${userId}: ${e.message.slice(0, 100)}`);
        err++;
      }
    }
    if (start % 2500 === 1)
      console.log(
        `  ${start + batch.length - 1}/${lines.length - 1} rows | ${inserted} new, ${updated} updated, ${skipped} skipped, ${err} errors`,
      );
  }

  console.log();
  console.log(
    `Done: ${inserted} new, ${updated} updated, ${skipped} skipped, ${err} errors`,
  );

  // Summary
  const totals = await p.$queryRawUnsafe(
    `SELECT
      COUNT(*)::int AS total_users,
      COUNT(*) FILTER (WHERE gclid IS NOT NULL)::int AS with_gclid,
      COUNT(*) FILTER (WHERE utm_source IS NOT NULL)::int AS with_utm_source,
      COUNT(*) FILTER (WHERE gclid IS NOT NULL AND utm_source IS NULL)::int AS gclid_no_utm,
      MIN(signed_up_at) AS earliest_signup,
      MAX(signed_up_at) AS latest_signup
     FROM granola_users`,
  );
  console.log("granola_users summary:");
  console.log(JSON.stringify(totals[0], null, 2));

  await p.$disconnect();
})().catch((e) => {
  console.error("CRASH:", e.message);
  process.exit(1);
});
