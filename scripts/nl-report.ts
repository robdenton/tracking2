import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const partners = await prisma.$queryRaw<Array<{
    partner_name: string;
    sends: bigint;
    spend: number;
    actual_clicks: bigint;
    enau: number;
    list_size: number;
    incr_nau: number;
    confidence_modes: string;
  }>>`
    SELECT
      a.partner_name,
      COUNT(*) AS sends,
      COALESCE(SUM(a.cost_usd), 0) AS spend,
      COALESCE(SUM(a.actual_clicks), 0) AS actual_clicks,
      COALESCE(SUM(CAST(a.metadata::json->>'eNAU' AS FLOAT)), 0) AS enau,
      COALESCE(MAX(CAST(a.metadata::json->>'send' AS FLOAT)), 0) AS list_size,
      COALESCE(SUM(au.attributed_incremental_activations), 0) AS incr_nau,
      STRING_AGG(DISTINCT au.confidence, ',' ORDER BY au.confidence) AS confidence_modes
    FROM activities a
    LEFT JOIN activity_uplifts au ON au.activity_id = a.id
    WHERE a.channel = 'newsletter'
      AND a.status = 'live'
      AND a.date >= '2026-01-01'
      AND a.date <= '2026-02-23'
      AND a.cost_usd > 0
    GROUP BY a.partner_name
    ORDER BY incr_nau DESC
  `;

  const totals = await prisma.$queryRaw<Array<{
    total_spend: number;
    total_sends: bigint;
    total_partners: bigint;
    total_actual_clicks: bigint;
    total_enau: number;
    total_incr_nau: number;
  }>>`
    SELECT
      COALESCE(SUM(a.cost_usd), 0) AS total_spend,
      COUNT(*) AS total_sends,
      COUNT(DISTINCT a.partner_name) AS total_partners,
      COALESCE(SUM(a.actual_clicks), 0) AS total_actual_clicks,
      COALESCE(SUM(CAST(a.metadata::json->>'eNAU' AS FLOAT)), 0) AS total_enau,
      COALESCE(SUM(au.attributed_incremental_activations), 0) AS total_incr_nau
    FROM activities a
    LEFT JOIN activity_uplifts au ON au.activity_id = a.id
    WHERE a.channel = 'newsletter'
      AND a.status = 'live'
      AND a.date >= '2026-01-01'
      AND a.date <= '2026-02-23'
      AND a.cost_usd > 0
  `;

  const sends = await prisma.$queryRaw<Array<{
    partner_name: string;
    date: string;
    cost_usd: number;
    actual_clicks: number;
    incr_nau: number;
    confidence: string;
  }>>`
    SELECT
      a.partner_name,
      a.date,
      COALESCE(a.cost_usd, 0) AS cost_usd,
      COALESCE(a.actual_clicks, 0) AS actual_clicks,
      COALESCE(au.attributed_incremental_activations, 0) AS incr_nau,
      COALESCE(au.confidence, 'LOW') AS confidence
    FROM activities a
    LEFT JOIN activity_uplifts au ON au.activity_id = a.id
    WHERE a.channel = 'newsletter'
      AND a.status = 'live'
      AND a.date >= '2026-01-01'
      AND a.date <= '2026-02-23'
      AND a.cost_usd > 0
    ORDER BY a.partner_name, a.date
  `;

  const t = totals[0];
  const blendedCPC = Number(t.total_actual_clicks) > 0
    ? Number(t.total_spend) / Number(t.total_actual_clicks)
    : 0;

  console.log("=== TOTALS ===");
  console.log(`Spend: $${Number(t.total_spend).toLocaleString("en-US", { maximumFractionDigits: 0 })}`);
  console.log(`Sends: ${Number(t.total_sends)}`);
  console.log(`Partners: ${Number(t.total_partners)}`);
  console.log(`Actual clicks: ${Number(t.total_actual_clicks).toLocaleString()}`);
  console.log(`Blended CPC: $${blendedCPC.toFixed(2)}`);
  console.log(`eNAU: ${Math.round(Number(t.total_enau))}`);
  console.log(`Incremental NAU (attributed): ${Math.round(Number(t.total_incr_nau))}`);
  // Note: DB sum and app newsletter analytics page now agree — no separate period cap applied.

  console.log("\n=== PARTNER TABLE ===");
  console.log("Partner | Sends | Spend | ActClicks | CPC | eNAU | IncrNAU | IncrCPA | Confidence");
  for (const p of partners) {
    const clicks = Number(p.actual_clicks);
    const cpc = clicks > 0 ? "$" + (p.spend / clicks).toFixed(2) : "∞";
    const cpa = p.incr_nau > 0.5 ? "$" + (p.spend / p.incr_nau).toFixed(0) : "∞";
    console.log(
      `${p.partner_name} | ${Number(p.sends)} | $${Math.round(p.spend).toLocaleString()} | ${clicks.toLocaleString()} | ${cpc} | ${Math.round(p.enau)} | ${p.incr_nau.toFixed(1)} | ${cpa} | ${p.confidence_modes}`
    );
  }

  console.log("\n=== INDIVIDUAL SENDS ===");
  for (const s of sends) {
    const cpc = s.actual_clicks > 0 ? "$" + (s.cost_usd / s.actual_clicks).toFixed(2) : "∞";
    console.log(`${s.partner_name} | ${s.date} | $${Math.round(s.cost_usd).toLocaleString()} | ${s.actual_clicks.toLocaleString()} clicks | ${cpc} CPC | ${s.incr_nau.toFixed(1)} iNAU | ${s.confidence}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
