import { prisma } from "@/lib/prisma";

// The two most informative slices of the decision data:
//
//  - findings we FLAGGED that the reviewer rejected → where we over-fire
//  - findings we CLEARED that the reviewer acted on → where we under-fire,
//    which is the expensive direction and the only direct evidence of a miss
//
// Everything else is aggregate; these are the cases worth reading.

export interface SampleRow {
  slug: string;
  disposition: string;
  category: string | null;
  layer: string;
  term: string | null;
  fieldLabel: string;
  decision: string | null;
  originalText: string;
  readerTakeaway: string | null;
  note: string | null;
}

export interface Samples {
  rejectedByCategory: Record<string, SampleRow[]>;
  clearedButActioned: SampleRow[];
}

type Raw = {
  slug: string;
  disposition: string;
  category: string | null;
  layer: string;
  term: string | null;
  field_label: string;
  decision: string | null;
  original_text: string;
  reader_takeaway: string | null;
  note: string | null;
};

const shape = (r: Raw): SampleRow => ({
  slug: r.slug,
  disposition: r.disposition,
  category: r.category,
  layer: r.layer,
  term: r.term,
  fieldLabel: r.field_label,
  decision: r.decision,
  originalText: r.original_text.slice(0, 200),
  readerTakeaway: r.reader_takeaway?.slice(0, 220) ?? null,
  note: r.note,
});

export async function getSamples(limitPerGroup = 8): Promise<Samples> {
  const rejected = await prisma.$queryRaw<Raw[]>`
    SELECT slug, disposition, category, layer, term, field_label, decision,
           original_text, reader_takeaway, note
    FROM seo_review_findings
    WHERE decision IN ('dismiss','discard')
      AND disposition IN ('red','amber')
    ORDER BY COALESCE(category,'disclosure'), slug`;

  const clearedButActioned = await prisma.$queryRaw<Raw[]>`
    SELECT slug, disposition, category, layer, term, field_label, decision,
           original_text, reader_takeaway, note
    FROM seo_review_findings
    WHERE decision IN ('accept','accept-delete')
      AND disposition NOT IN ('red','amber')
    ORDER BY slug`;

  const byCat: Record<string, SampleRow[]> = {};
  for (const r of rejected) {
    const k = r.category ?? "disclosure";
    (byCat[k] ??= []).push(shape(r));
  }
  for (const k of Object.keys(byCat)) byCat[k] = byCat[k].slice(0, limitPerGroup);

  return {
    rejectedByCategory: byCat,
    clearedButActioned: clearedButActioned.map(shape).slice(0, limitPerGroup * 2),
  };
}
