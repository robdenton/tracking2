// Risk bucketing — which articles need the closest reading, and which are safe
// to hand to someone outside the company.
//
// Bucket 1  highest sensitivity — review in-house, first
// Bucket 2  middle
// Bucket 3  lowest risk — safe to delegate to the external agency
//
// Two independent signals, combined conservatively:
//
//   contentTier   what the article is ABOUT, from slug and title
//   findingsTier  how much the review actually found, from red counts
//
// bucket = the MORE SEVERE of the two. An article is only bucket 3 if both
// signals agree it is low risk. This is deliberate: the cost of wrongly putting
// a sensitive article in the agency's pile is high, and the cost of the reviewer
// looking at one extra benign article is nearly zero — the same asymmetry that
// governs the review itself.
//
// contentTier alone decides the bucket for articles that have not been reviewed
// yet (no findings exist). Those are marked `provisional`, because a low content
// tier is a prediction, not a measurement.
//
// Everything here is deterministic: same slug + same counts -> same bucket,
// every run. No model call, nothing to drift.

// ---------------------------------------------------------------------------
// Content signals. Ordered most-severe first; the first category that matches
// sets the tier, so put the sharpest patterns at the top.
// ---------------------------------------------------------------------------

const CONTENT_SIGNALS = [
  // ---- Tier 1: the subject matter IS the liability -----------------------
  {
    tier: 1,
    label: 'consent & participant privacy',
    why: 'The article is directly about consent, disclosure or what participants can perceive — the exact surface this review exists to police.',
    re: /consent|participant-privacy|participant-comfort|privacy-tradeoff|without-killing-participant/,
  },
  {
    tier: 1,
    label: 'data storage & residency',
    why: 'Makes claims about where notes and transcripts live. Granola is cloud-stored and syncs to its servers, so a wrong claim here is a factual-accuracy exposure, not just a framing one.',
    re: /data-residency|local-first|-vs-cloud|deployment-models|on-device/,
  },
  {
    tier: 1,
    label: 'security & compliance posture',
    why: 'Certification and compliance claims are checkable facts that a procurement team may rely on.',
    re: /soc2|soc-2|gdpr|security-checklist|security-compliance|privacy-compliance|hipaa|iso-?27001/,
  },
  {
    tier: 1,
    label: 'recording legality & avoidance',
    why: 'Frames capture around not recording, turning recording off, or whether recording is safe. High risk of reading as guidance on capturing people without their knowledge.',
    re: /without-recording|not-recording|is-it-safe-to-record|turn-off-ai|without-.*installing-a-bot|record-.*without-paying|for-free.*record|record.*for-free/,
  },
  {
    tier: 1,
    label: 'covert-intelligence framing',
    why: 'Positions meeting capture as a way to extract intelligence about competitors or people, which reads as surveillance regardless of intent.',
    re: /competitor-intelligence|competitive-intelligence|competitor-moves|political-dynamics|track-stakeholders|multithreading/,
  },
  {
    tier: 1,
    label: 'bot-free positioning',
    why: 'Built around the absence of a visible bot — the single most-flagged frame in the corpus.',
    re: /bot-free|no-meeting-bots|without-a-bot|no-bot/,
  },
  {
    tier: 1,
    label: 'myth-busting / factual claims',
    why: 'Asserts what is and is not true about AI notetakers; errors here are stated as corrections of fact.',
    re: /myths-facts|myths-and-facts|-myths/,
  },
  {
    tier: 1,
    label: 'competitive comparison',
    why: 'Makes claims about named competitors and about Granola\'s differentiators side by side. Commercially prominent and the densest source of red findings measured so far.',
    re: /^best-|^top-\d|-vs-|\bvs\b|alternatives|compared-by|comparison|-vs$/,
  },
  {
    tier: 1,
    label: 'platform capture how-to',
    why: 'Step-by-step capture on a named platform. Touches both platform terms of service and the consent question directly.',
    // Platform names must be explicit. A bare "meet" matches "meeting" and a
    // bare "teams" matches "sales-teams"/"product-teams", which pulled 44
    // articles — most of the corpus — into bucket 1 on the first pass.
    re: /\b(zoom|google-meet|microsoft-teams|ms-teams|webex|copilot|hangouts|gotomeeting|slack-huddle)\b[a-z-]*\b(record|recording|transcri\w*|capture|notes|summar\w*)\b|\b(record|recording|transcri\w*|capture)\b[a-z-]*\b(zoom|google-meet|microsoft-teams|ms-teams|webex|copilot|hangouts)\b/,
  },

  // ---- Tier 2: adjacent to the liability, or externally-facing calls -----
  {
    tier: 2,
    label: 'category explainer',
    why: 'Defines what these tools are, usually via a glossary entry built around bot-free capture.',
    re: /^what-is|^what-are|^can-ai|^is-there-an-ai|^can-you|how-it-works|glossary|^do-you-need|^is-granola-worth/,
  },
  {
    tier: 2,
    label: 'external / client-facing calls',
    why: 'Capture of people outside the company — clients, candidates, research participants — where consent expectations are highest.',
    re: /recruiter|candidate|accountant|consultant|client|customer|research|interview|discovery-call|sales-call|prospect|kickoff|qbr|ebr|stakeholder/,
  },
  {
    tier: 2,
    label: 'enterprise & procurement',
    why: 'Read by buyers evaluating claims formally; includes pricing, ROI and admin/SSO capability claims.',
    re: /enterprise|sso|admin-controls|pricing|roi|tco|cost-|costs-|readiness|procurement|when-to-upgrade|free-vs-paid|free-trial/,
  },
  {
    tier: 2,
    label: 'integrations & CRM capture',
    why: 'Describes meeting content flowing into other systems, which is a data-movement claim.',
    re: /integration|crm|salesforce|hubspot|attio|affinity|gainsight|notion|slack|zapier|mcp|sync-|migrate-/,
  },
  {
    tier: 2,
    label: 'adoption & rollout',
    why: 'Advises deploying capture across a team, so it carries policy and disclosure implications at scale.',
    re: /adoption|rollout|implementation|team-management|change-management|onboarding/,
  },

  // ---- Tier 3: internal meeting craft. Granola appears in passing. -------
  {
    tier: 3,
    label: 'internal meeting practice',
    why: 'Advice about running or documenting your own internal meetings. Product claims are incidental.',
    // Anchored to hyphen boundaries. Unanchored, "share" matched "shared",
    // "prep" matched "prepare" and "present" matched "represents", which pulled
    // articles like account-handoff-knowledge-loss into the delegate pile.
    re: /(?:^|-)(?:templates?|agendas?|minutes|recaps?|follow-ups?|one-on-ones?|1-1|skip-level|all-hands|stand-?ups?|sprint-planning|action-items?|facilitation|remote-meetings?|back-to-back|organi[sz]e|present|share|write|writing|prep|second-brain|institutional-knowledge|recipes|huddles?)(?:-|$)/,
  },
];

const DEFAULT_CONTENT_TIER = 2; // unclassified sits in the middle, not the agency pile

export function contentRisk(slug = '', title = '') {
  const hay = `${slug} ${title}`.toLowerCase().replace(/\s+/g, '-');
  for (const sig of CONTENT_SIGNALS) {
    if (sig.re.test(hay)) {
      return { tier: sig.tier, label: sig.label, why: sig.why };
    }
  }
  return {
    tier: DEFAULT_CONTENT_TIER,
    label: 'unclassified',
    why: 'No content signal matched. Defaults to the middle bucket rather than the agency pile, so an unrecognised topic is never delegated by accident.',
  };
}

// ---------------------------------------------------------------------------
// Findings signal. Thresholds are set against the measured distribution of the
// first 59 reviewed articles, not guessed.
// ---------------------------------------------------------------------------

export function findingsRisk(red = 0, amber = 0) {
  if (red >= 12) {
    return { tier: 1, why: `${red} red findings — top of the measured range.` };
  }
  if (red >= 5) {
    return { tier: 2, why: `${red} red findings.` };
  }
  if (red >= 3 || amber >= 12) {
    return { tier: 2, why: `${red} red and ${amber} amber findings.` };
  }
  return { tier: 3, why: `${red} red and ${amber} amber findings — low volume.` };
}

// ---------------------------------------------------------------------------

export const BUCKET_LABELS = {
  1: 'Bucket 1 · highest sensitivity',
  2: 'Bucket 2 · medium',
  3: 'Bucket 3 · lowest risk',
};

// What the person opening the article should actually DO. The bucket is the
// sensitivity signal; this is the instruction that follows from it, so an
// outside reviewer never has to infer their own remit from a risk score.
//
// Everyone can see every article. The difference is who gets to decide:
// bucket 3 the agency decides, bucket 2 the agency recommends and Granola
// decides, bucket 1 Granola does both.
export const BUCKET_ACTIONS = {
  1: {
    who: 'Granola in-house',
    short: 'Do not review',
    detail:
      'Subject matter is consent, privacy, data storage, security posture, recording legality or direct competitor comparison. Claims here carry legal and brand exposure that needs someone who can speak for the company. Read it if useful for context, but leave the decisions to Granola.',
  },
  2: {
    who: 'Agency',
    short: 'Review & recommend',
    detail:
      'Review every finding and leave a note saying what you would do and why, but do not Accept or Delete. Granola makes the final call. Use the note field — it regenerates a rewrite from your direction.',
  },
  3: {
    who: 'Agency',
    short: 'Review & decide',
    detail:
      'Yours to complete. Accept, delete or dismiss each finding as you see fit. Flag anything that reads as a claim about what meeting participants can or cannot see, or about where notes are stored — those two are worth a second opinion even here.',
  },
};

/**
 * Assign a review bucket.
 *
 * @param {{slug?:string,title?:string,red?:number,amber?:number,reviewed?:boolean}} a
 * @returns {{bucket:1|2|3, provisional:boolean, contentTier:number,
 *            findingsTier:number|null, label:string, reasons:string[]}}
 */
export function assignBucket({ slug = '', title = '', red = 0, amber = 0, reviewed = false }) {
  const content = contentRisk(slug, title);
  const findings = reviewed ? findingsRisk(red, amber) : null;

  // Lower number = more severe, so the more severe signal is the minimum.
  const bucket = findings ? Math.min(content.tier, findings.tier) : content.tier;

  const reasons = [`Content: ${content.label} — ${content.why}`];
  if (findings) {
    reasons.push(`Findings: ${findings.why}`);
    if (findings.tier < content.tier) {
      reasons.push('Escalated by what the review actually found, above what the topic alone suggested.');
    } else if (content.tier < findings.tier) {
      reasons.push('Held at the higher sensitivity by subject matter, despite a low finding count — the topic carries risk the count does not capture.');
    }
  } else {
    reasons.push('Not yet reviewed, so this is based on subject matter alone and may change once findings exist.');
  }

  return {
    bucket,
    provisional: !findings,
    contentTier: content.tier,
    findingsTier: findings ? findings.tier : null,
    contentLabel: content.label,
    label: BUCKET_LABELS[bucket],
    action: BUCKET_ACTIONS[bucket],
    reasons,
  };
}
