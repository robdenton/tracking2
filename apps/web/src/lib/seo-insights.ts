import { prisma } from "@/lib/prisma";

// Calibration insights — mine the reviewer's own decisions to find where the
// review is miscalibrated.
//
// A finding consistently dismissed is noise. A lexicon term always cleared
// should probably not be flagging. A disposition always deleted rather than
// rewritten tells us which remedy to lead with.
//
// These are OBSERVATIONS, not automatic changes. A low acceptance rate can mean
// the check is wrong — or that the reviewer disagrees with a standard they still
// want enforced. Changing the rules stays a human call, deliberately.

export interface RateRow {
  key: string;
  total: number;
  accepted: number;
  deleted: number;
  rewritten: number;
  rejected: number;
  acceptRate: number;
}

export interface Insights {
  decidedTotal: number;
  articlesWithDecisions: number;
  byDisposition: RateRow[];
  byLayer: RateRow[];
  byCategory: RateRow[];
  byField: RateRow[];
  byTerm: RateRow[];
  deletePreference: { deleted: number; rewritten: number };
}

// Grouped acceptance rates. The column is interpolated, so callers must only
// ever pass a literal from the fixed list below — never user input.
const RATE_SQL = (col: string) => `
  SELECT ${col} AS key,
         count(*)                                                       AS total,
         count(*) FILTER (WHERE decision IN ('accept','accept-delete'))  AS accepted,
         count(*) FILTER (WHERE decision = 'accept-delete')              AS deleted,
         count(*) FILTER (WHERE decision = 'accept')                     AS rewritten,
         count(*) FILTER (WHERE decision IN ('dismiss','discard'))       AS rejected
  FROM seo_review_findings
  WHERE decision IS NOT NULL
  GROUP BY ${col}
  ORDER BY count(*) DESC`;

type RawRate = {
  key: string | null;
  total: bigint;
  accepted: bigint;
  deleted: bigint;
  rewritten: bigint;
  rejected: bigint;
};

const shapeRates = (rows: RawRate[], minTotal = 1): RateRow[] =>
  rows
    .filter((r) => Number(r.total) >= minTotal)
    .map((r) => ({
      key: r.key ?? "(none)",
      total: Number(r.total),
      accepted: Number(r.accepted),
      deleted: Number(r.deleted),
      rewritten: Number(r.rewritten),
      rejected: Number(r.rejected),
      acceptRate: Number(r.total) ? Number(r.accepted) / Number(r.total) : 0,
    }));

export async function getInsights(): Promise<Insights> {
  const [disp, layer, cat, field, term] = await Promise.all([
    prisma.$queryRawUnsafe<RawRate[]>(RATE_SQL("disposition")),
    prisma.$queryRawUnsafe<RawRate[]>(RATE_SQL("layer")),
    prisma.$queryRawUnsafe<RawRate[]>(RATE_SQL("COALESCE(category,'disclosure')")),
    prisma.$queryRawUnsafe<RawRate[]>(RATE_SQL("field_label")),
    prisma.$queryRawUnsafe<RawRate[]>(RATE_SQL("COALESCE(term,'(semantic)')")),
  ]);

  const totals = await prisma.$queryRaw<
    { decided: bigint; deleted: bigint; rewritten: bigint; articles: bigint }[]
  >`SELECT count(*) FILTER (WHERE decision IS NOT NULL)                        AS decided,
           count(*) FILTER (WHERE decision = 'accept-delete')                   AS deleted,
           count(*) FILTER (WHERE decision = 'accept')                          AS rewritten,
           count(DISTINCT slug) FILTER (WHERE decision IS NOT NULL)             AS articles
    FROM seo_review_findings`;

  return {
    decidedTotal: Number(totals[0]?.decided ?? 0),
    articlesWithDecisions: Number(totals[0]?.articles ?? 0),
    byDisposition: shapeRates(disp),
    byLayer: shapeRates(layer),
    byCategory: shapeRates(cat),
    byField: shapeRates(field, 3),
    byTerm: shapeRates(term, 3),
    deletePreference: {
      deleted: Number(totals[0]?.deleted ?? 0),
      rewritten: Number(totals[0]?.rewritten ?? 0),
    },
  };
}
