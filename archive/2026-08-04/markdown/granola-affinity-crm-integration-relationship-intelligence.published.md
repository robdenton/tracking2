# Granola + Affinity CRM integration: Relationship intelligence & meeting context

> Archived 2026-08-04T09:37:03.827Z from Sanity oy7f1h9b/production
> _id `post-granola-affinity-crm-integration-relationship-intelligence` · _rev `GtrWMLxlCiv5OmNgL6pOQ8` · updated 2026-03-31T20:39:55Z
> slug `granola-affinity-crm-integration-relationship-intelligence` · published

**Summary:** Product research insights usually die in personal notes while relationship data lives in Affinity, creating a credibility gap when stakeholders ask where's the evidence.

---

> **TL;DR:** Product research insights usually die in personal notes while relationship data lives in Affinity, creating a credibility gap when stakeholders ask "where's the evidence?" Connecting Granola to Affinity solves this: your customer interview notes, with exact quotes and feature requests, flow directly into relationship records where your account team and leadership can actually find them. Setup via native API connection or automate the flow entirely with a Zapier workflow. Both options are on Granola's Business plan. The result: research findings become part of the institutional record instead of disappearing when someone leaves the team.

Product research generates the exact customer language that makes roadmap discussions credible. But most of those insights stay in personal notes, disconnected from the relationship records where account managers and leadership actually look. By the time someone asks 'where's the evidence?', the trail is cold.

Affinity tracks who you've spoken with and when. Granola captures what was actually said and why it matters. Connecting the two means research findings flow into relationship records automatically, giving your stakeholders the evidence they need without you becoming a human copy-paste machine.

## Why relationship intelligence needs qualitative data

Affinity tracks meeting frequency, email volume, and touchpoint history. That metadata tells you how often your team engages with an account. What it doesn't capture is the substance: which features customers are requesting, what language they use to describe pain points, and whether the feedback from Q1 interviews is still relevant now.

For product teams running discovery research, every customer conversation generates insights that should inform roadmap decisions. When a design partner says "we'd adopt this immediately if it supported SAML," that exact quote needs to be accessible to your stakeholders, not buried in a Google Doc. Research findings that live only in personal notes lose credibility over time. Research findings in Affinity, attached to the customer record with timestamps and context, become evidence your team can query and cite.

The [Granola and Affinity integration](https://docs.granola.ai/help-center/sharing/integrations/affinity) solves this: your interview notes, enhanced with transcript context and structured for clarity, sync directly into relationship records so the research that should prevent building the wrong thing actually reaches the people making decisions.

## Step 1: Set up your Granola workspace

Before any data reaches Affinity, you need to structure your meeting templates so Granola captures the details that matter. A generic summary is less useful than a note with clearly labeled sections that map to specific Affinity fields.

Go to any meeting note in Granola, click the "Change template" icon, and either select an existing template or [create a new one](https://docs.granola.ai/help-center/taking-notes/customise-notes-with-templates). For discovery and research calls, a well-structured template includes:

- **Context:** Company name, relationship type, meeting objective
- **Verbatim quotes:** Exact language the customer used about their problems
- **Feature requests:** Specific asks, with the customer's own framing
- **Pain points:** Blockers and friction points mentioned
- **Next steps:** Committed actions, owners, and timelines

[Granola's upgraded templates](https://www.granola.ai/blog/upgraded-meeting-note-templates) include pre-configured structures for Sales Calls, Product Reviews, and User Interviews. You can specify the level of detail, whether to include direct quotes, and which sections are mandatory for a given meeting type. When those sections are consistent across every call, the data that lands in Affinity is consistent and queryable. Granola's [AI-enhanced notes](https://help.granola.ai/article/ai-enhanced-notes) fill in the transcript context around the rough notes you jot during the meeting, so you stay present in the conversation rather than typing.

> "It's simply the easiest tool I've discovered for capturing notes during meetings. Most tools force you into a set number of meeting types/outline structures, but, while Granola offers a core set for you to adopt, they have made it super easy and flexible to create your own for whatever purpose you have." - [Verified G2 review of Granola](https://g2.com/products/granola/reviews/granola-review-10309657)

## Step 2: Connect Granola to Affinity

There are two pathways on the Business plan: a native integration for selective sharing and a Zapier automation for hands-free routing. The [full integrations overview](https://help.granola.ai/article/integrations-with-granola) covers both options.

### Native integration (recommended, 5 minutes)

1. In Affinity, go to **Settings > Integrations > API Keys** and generate a new key.
1. In Granola, open **Settings > Integrations** and paste your Affinity API key.
1. Affinity now appears as a sharing destination in the sidebar of every Granola note.
1. After finalizing a meeting, click **Share > Affinity** and the note attaches to the matching contact or organization record.

Full setup instructions are in Granola's [Affinity help article](https://help.granola.ai/article/affinity). This pathway is best when you want control over which notes reach Affinity, particularly when your calendar mixes customer research with internal meetings.

### Zapier automation (for hands-free routing)

Multi-step Zaps require Zapier's Professional plan, which [starts at $19.99/month on an annual plan](https://zapier.com/pricing). Zapier's [Free plan](https://help.zapier.com/hc/en-us/articles/32337438839565-What-s-included-in-Zapier-s-Free-plan) caps at two-step Zaps and 100 tasks per month, which isn't enough for this workflow.

Using [Granola's Zapier integration](https://help.granola.ai/article/zapier), the workflow looks like this:

1. **Trigger:** "Note Added to Granola Folder" fires automatically when any note lands in a designated folder (such as "Customer Research"). This is the fully automated option. Alternatively, "Note Shared to Zapier" fires only when you manually push a specific note from the sidebar.
1. **Action 1:** "Find Person" in Affinity searches your existing Affinity records using the email address pulled from the meeting metadata. If a match is found, the Zap continues. If no match is found, the default Zapier behavior halts the Zap for that note, meaning the note is not logged and no error is flagged in Affinity. You can configure Zapier to create a new person record on a failed match instead, but this can produce orphaned contacts if the email is wrong or missing. Before running this at scale, test the step with a known contact already in Affinity to confirm the match works as expected, then decide whether halt or create is the right fallback for your workflow.
1. **Action 2:** "Create Note" in Affinity, mapping the Granola summary and key takeaways to the note body. Custom fields, such as deal stage, meeting type, or sentiment, are populated as separate structured fields in Affinity, distinct from the note body content.

The Granola-Affinity Zapier page lists all available triggers and actions. Granola also connects to [over 8,000 apps](https://zapier.com/apps/granola/integrations) via Zapier if you want to extend the workflow further. Notes sync to Affinity based on your Zapier plan's polling interval: Free plans poll every 15 minutes, while Professional plans and above poll every 2 minutes. Check [Zapier's current plan details](https://zapier.com/pricing) to confirm the intervals before committing to this workflow if near-real-time sync matters for your process.

Before starting, confirm your Affinity plan includes API access. Check [Affinity's subscription tiers](https://www.affinity.co/product/subscription-tiers) to verify which plans include API access before setting up this workflow.

## Step 3: Map your meeting insights to Affinity fields

Basic note creation covers the summary. The more powerful setup maps specific Granola template sections to Affinity custom fields, enabling filtering and reporting across your entire research portfolio.

To map your Granola notes to specific Affinity fields, you need to set up the destination fields in Affinity before touching Zapier. First, create the custom fields in Affinity (Settings > Custom Fields > Add Field) to store specific research insights. Once those fields exist, you can map them in Zapier. For product research teams, these mappings matter most:

<!-- rawHtml block html0 -->
<table>
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<thead>
<tr>
<th>Granola template section</th>
<th>Affinity field</th>
</tr>
</thead>
<tbody>
<tr>
<td>Meeting summary</td>
<td>Note body</td>
</tr>
<tr>
<td>Verbatim customer quotes</td>
<td>Custom field: "Customer Voice"</td>
</tr>
<tr>
<td>Feature requests</td>
<td>Custom field: "Product Feedback"</td>
</tr>
<tr>
<td>Pain points mentioned</td>
<td>Custom field: "Blockers"</td>
</tr>
<tr>
<td>Validation signals</td>
<td>Custom field: "Roadmap Evidence"</td>
</tr>
<tr>
<td>Follow-up questions</td>
<td>Custom field: "Next Research Steps"</td>
</tr>
</tbody>
</table>

Affinity's [Zapier integration](https://zapier.com/blog/updates/2209/affinity-integrations) supports creating and updating notes, persons, organizations, and opportunities, so you can also trigger a new opportunity record if a call surfaces a clear expansion signal. The template discipline from Step 1 is what determines whether the data in Affinity is actually useful three months from now.

> "I particularly appreciate how Granola's features align with my workflow, especially the ability to interact with and query chat and note data. This functionality allows me to easily reference decision points and discussions from meetings, which is crucial in my daily tasks that often involve complex information and numerous decision points." - [Dean M. on G2](https://g2.com/products/granola/reviews/granola-review-12022021)

## Workflows: Using Granola and Affinity for product discovery

The setup pays off most in two recurring research scenarios.

**Validating roadmap decisions with enterprise customers:** You're running discovery interviews with five enterprise accounts to test whether a proposed feature solves their actual problem. Each call surfaces specific pain points, feature requests in the customer's own language, and objections you need to address before committing engineering time. With Granola connected to Affinity, you capture the exact customer quotes that make your roadmap recommendations credible, and the account team sees those insights logged in Affinity without needing a Slack recap. Your stakeholders can query "what did enterprise customers say about SSO?" and get citations from real interviews instead of asking you to substantiate your research three months later.

**Tracking feature requests across your customer base:** A feature request comes up in multiple interviews. Without a system, you rely on memory or manual note searches to know whether this is one customer's edge case or a pattern worth prioritizing. Because Granola's notes sync to Affinity with consistent structure, you can see that "API rate limit flexibility" was mentioned by four different enterprise accounts across six weeks, each time with slightly different context. That pattern becomes defensible evidence when you're making the case for engineering resources.

The [Zapier blog's coverage of Granola](https://zapier.com/blog/granola-ai/) specifically highlights the ability to capture feature requests from customer meetings and route them into downstream tools, confirming this is a well-tested workflow for product teams.

## Ethical research: Capturing insights without the bots

High-stakes customer interviews require discretion. When a design partner is sharing candid feedback about your product's shortcomings, a bot joining the call changes what they're willing to say.

Granola doesn't join calls as a visible participant. It captures device audio from your computer and transcribes in real time. Only the transcript is kept. Audio is never stored. Granola's [security documentation](https://www.granola.ai/security) details how audio is handled and deleted after transcription. Granola achieved [SOC 2 Type 2 certification](https://www.granola.ai/updates/granola-is-soc2-type-2-compliant) after completing the certification process in just over three months, and is GDPR compliant. Any user on any plan can opt out of AI model training in Settings, and Enterprise admins can enforce that opt-out across the entire organization with a single setting, giving research teams centralized control over how meeting content is handled.

Even without a visible bot, it's good practice to let participants know you're using Granola. The app can send an automated consent message at the start of each meeting.

> "I find Granola very easy to use... I like that recording in the background is possible without a bot." - [Johannes E. on G2](https://g2.com/products/granola/reviews/granola-review-12404902)

## Comparison: Granola vs. standard meeting recorders

<!-- rawHtml block html1 -->
<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<thead>
<tr>
<th></th>
<th>Granola</th>
<th>Otter.ai / Fireflies</th>
<th>Manual entry</th>
</tr>
</thead>
<tbody>
<tr>
<td>Bot presence</td>
<td>No visible participant</td>
<td>Bot joins meeting</td>
<td>None</td>
</tr>
<tr>
<td>CRM integration</td>
<td>Native + Zapier</td>
<td>Zapier/manual</td>
<td>Fully manual</td>
</tr>
<tr>
<td>Note quality</td>
<td>Human-guided, AI-enhanced</td>
<td>Automated transcript summary</td>
<td>Limited by typing speed</td>
</tr>
<tr>
<td>Best for research interviews</td>
<td>High (no friction)</td>
<td>Low (bot changes dynamics)</td>
<td>High (but unscalable)</td>
</tr>
<tr>
<td>Setup time</td>
<td>Under 5 minutes</td>
<td>Under 5 minutes</td>
<td>N/A</td>
</tr>
<tr>
<td>Scales across team</td>
<td>Yes, via shared folders</td>
<td>Varies</td>
<td>Limited</td>
</tr>
</tbody>
</table>

The human-in-the-loop distinction matters for CRM data quality. Generic automated summaries miss the specific vocabulary your customers use, and it's that vocabulary that makes a note in Affinity useful six months later when someone asks "what were the objections from Acme during Q1 discovery?"

Granola doesn't offer audio playback or precise speaker attribution, which is worth knowing if your research includes multi-stakeholder panels or large group calls where identifying who said what becomes critical. For one-on-one or small-group discovery interviews, this rarely surfaces as a constraint: the transcript context is detailed enough to capture what matters. Teams running panel research or large internal reviews with several speakers may want to verify exact phrasing through a separate recording workflow.

> "Granola is simpler to use and more efficient, producing more productive notes than Zoom and Gong notetakers." - [Verified user on G2](https://g2.com/products/granola/reviews/granola-review-12270248)

If research findings are leaving your interviews and dying in personal notes, this integration puts them where your team can actually use them. Try Granola for free: download the Mac, Windows, or iOS app, [connect your calendar](https://docs.granola.ai/help-center/getting-started/syncing-your-calendars), and run your next customer interview to see how the enhanced notes look before connecting them to Affinity.
