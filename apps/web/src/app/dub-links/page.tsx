import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { DubLinksManager } from "./dub-links-manager";

export const dynamic = "force-dynamic";

async function getNewsletterPartners() {
  const partners = await prisma.activity.findMany({
    where: { channel: "newsletter" },
    select: { partnerName: true },
    distinct: ["partnerName"],
    orderBy: { partnerName: "asc" },
  });
  return partners.map((p) => p.partnerName);
}

async function getExistingMappings() {
  return prisma.dubNewsletterMapping.findMany({
    orderBy: { partnerName: "asc" },
  });
}

export default async function DubLinksPage() {
  const [partners, mappings] = await Promise.all([
    getNewsletterPartners(),
    getExistingMappings(),
  ]);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Dub Link Matching</h1>
        <p className="text-sm text-text-secondary mt-1">
          Match Dub short links to newsletter partners. Once matched, Dub click
          data appears alongside publisher-reported clicks on the newsletter
          page.
        </p>
      </div>
      <Suspense
        fallback={
          <div className="text-text-secondary text-sm">Loading Dub links...</div>
        }
      >
        <DubLinksManager
          newsletterPartners={partners}
          initialMappings={mappings.map((m) => ({
            shortLink: m.shortLink,
            partnerName: m.partnerName,
          }))}
        />
      </Suspense>
    </div>
  );
}
