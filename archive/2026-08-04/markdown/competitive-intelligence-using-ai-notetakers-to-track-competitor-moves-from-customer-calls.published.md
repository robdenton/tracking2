# Track competitor moves from customer calls with an AI notepad

> Archived 2026-08-04T09:37:03.827Z from Sanity oy7f1h9b/production
> _id `post-competitive-intelligence-using-ai-notetakers-to-track-competitor-moves-from-customer-calls` · _rev `5HeA6z1RBD1IljWPfn3D2Z` · updated 2026-07-30T07:17:38Z
> slug `competitive-intelligence-using-ai-notetakers-to-track-competitor-moves-from-customer-calls` · published

**Summary:** Customer interviews are one of the richest sources of competitive intelligence available to product teams, yet most teams capture competitor mentions inconsistently or not at all.

---

> **TL;DR:** Customer interviews are one of the richest sources of competitive intelligence available to product teams, yet most teams capture competitor mentions inconsistently or not at all. This guide shows you how to structure interviews to surface competitor feedback naturally, build a consistent tagging taxonomy in your AI notepad, create a searchable CI repository, and share competitive signals with leadership in a format that drives decisions.

Most competitive intelligence programs focus on public sources: press releases, pricing pages, job postings, review sites. Those are useful signals, but they tell you what competitors want the market to think. Your customers tell you what competitors are doing, where they're falling short, and which features are generating genuine excitement.

The problem is that most teams capture these signals ad hoc. A competitive mention surfaces in a call, gets relayed secondhand in a team channel, and lands without the quote, the customer, or the surrounding context that made it meaningful. The context evaporates. Nobody can trace it back to a specific quote, a specific customer, or a pattern across calls. Insights that should inform roadmap decisions end up as anecdotes.

An [AI notepad](https://www.granola.ai/ai-note-taker) changes the economics of this work. When you can transcribe interviews, search across dozens of calls, and query patterns with citations, competitive intelligence stops being a separate research project and becomes a byproduct of the discovery work you're already doing.

This guide is about competitive intelligence you gather from live customer calls and interviews, not a static competitive intelligence database or a downloadable template. The signal that moves a roadmap is the verbatim thing a customer said on a call, captured and searchable, not a spreadsheet of public facts. The goal is to track competitor mentions in calls consistently enough that patterns become visible.

## Why customer calls are your best source of competitive intelligence

### What customers reveal that public research can't

Competitor positioning documents and review sites reflect curated narratives. Customers in an open interview reveal something different: the real switching moments, the features they use at competing products, the pricing conversations that almost moved them elsewhere, and the support experiences that eroded trust.

[Primary sources including customer feedback](https://www.productplan.com/glossary/competitive-intelligence/) can surface insights into customer preferences, competitor strategies, and market trends that secondary research simply doesn't reach. A customer saying "we almost went with Competitor X because their API documentation is so much better" contains three signals at once: a competitor strength, a gap in your offering, and a priority you may have underweighted.

The research context that matters most is often unsolicited. When a customer says "your onboarding reminds me of how [Competitor] used to be before they overhauled it," they've handed you a comparative insight you wouldn't have found by analyzing any public dataset.

### The cost of not capturing it systematically

[Confirmation bias](https://en.wikipedia.org/wiki/Confirmation_bias) is one of the most documented risks in qualitative research: note-takers tend to record feedback that confirms existing assumptions and overlook signals that challenge them. When you're actively listening and manually transcribing, the competitor mention that doesn't fit your mental model often gets dropped.

The second cost is fragmentation. When insights scatter across personal Notion pages, Slack messages, and email follow-ups, the pattern across 15 calls becomes invisible. You can't ask "how many customers mentioned Competitor X's pricing as a risk?" if the data lives in 15 separate documents only you can access.

The third cost is institutional memory loss. When a PM leaves or transitions, the competitive context they built through hundreds of interviews leaves with them. Without a centralized data repository, competitive insights remain scattered across individual team members rather than becoming shared organizational knowledge. What feels like a research problem is an organizational infrastructure problem.

> "With Granola I don't have to worry anymore about taking meeting notes, I can just write down things I really care about and let Granola take care of the rest. Love that I can easily share my notes with my colleagues as well, and that we can all chat with the meeting transcript so everyone can see the full context of the meeting, even if they weren't there." - [Jess M. on G2](https://g2.com/products/granola/reviews/granola-review-9856422)

## How to structure interviews to surface competitor feedback naturally

### Questions that elicit competitor mentions without leading the witness

The most reliable way to surface competitive intelligence in customer interviews is through workflow questions, not direct competitor questions. When you ask "what tools are you using to solve this problem today?" you get an honest answer. When you ask "how do you compare us to Competitor X?" you get a social performance.

Open-ended questions should be neutral and allow detailed responses without leading the interviewee. A few structures that work well:

1. **Workflow mapping:** "Walk me through how you handle [problem] today, from start to finish." This surfaces all the tools in their stack without you naming any of them.
1. **Evaluation reconstruction:** "When you were initially evaluating solutions for this, what did you look at?" Customers will name every alternative they considered.
1. **Satisfaction probing:** "Is there anything you wish our product did that you've seen handled better elsewhere?" The "elsewhere" opens the door.
1. **Feature origin questions:** "Where did the idea to use [specific workflow] come from? Had you seen it done another way?" Often traces back to a competitor.
1. **Direct comparison (after rapport is established):** "How does this compare to similar products you've used?" This works best after you've established trust through the earlier open-ended questions.

When a competitor is mentioned unsolicited, follow up immediately. "You mentioned [Competitor] - can you tell me more about your experience with them?" This is your highest-value CI moment, and it only arrives if you're present enough to catch it.

### Ethical framing for competitive inquiry

Competitive inquiry during customer research is legitimate product work, not corporate espionage. Frame it internally and to participants as improvement-oriented: you're mapping the landscape to make sure you're building the right things, not gathering ammunition.

[Focus on outcomes, not attacks](https://www.productplan.com/learn/competitive-intelligence-ethics/). "What problems does [Competitor] solve well that you value?" yields richer and more honest data than "what's wrong with [Competitor]?" Customers are comfortable sharing what works elsewhere when the tone is curious rather than adversarial.

One practical note: if a participant mentions a competitor in the context of a sensitive business decision (a procurement process, a pending vendor switch), acknowledge it and move on rather than probing. Pushing for details they're uncomfortable sharing damages the research relationship and the quality of everything that follows.

## Setting up your AI notepad for competitive intelligence capture

### Bot-free capture and why it matters for qualitative research

The single most important setup decision for customer research is whether a visible bot joins your call. This isn't a minor UX consideration. Participants in qualitative interviews adjust their responses when they know a corporate tool is recording for analysis. The more sensitive the topic, the more this matters.

Granola captures device audio and transcribes in real time without joining your call as a visible participant. The conversation dynamic stays closer to a natural dialogue, which is exactly what qualitative research requires.

However, not having a bot doesn't mean avoiding transparency. Granola always encourages users to let everyone know when transcription is happening and to follow their organisation's policies and any applicable consent requirements. To make this easy, Granola can automatically post a consent message in the meeting chat when transcription begins and display a watermark on your video while transcription is active.

This matters specifically for competitive intelligence because the most revealing competitor mentions often come in moments of candor.

> "What I like best about Granola is how effortlessly it handles meeting notes without disrupting the flow of the conversation. It listens directly from my device audio no bots joining calls and produces clean, structured summaries with decisions, action items, and key points." - [Brahmatheja Reddy M. on G2](https://www.g2.com/products/granola/reviews/granola-review-11932118)

### Using templates and manual notes to guide the AI

Granola's output quality improves when you write notes during the meeting. This is the core architecture: you jot what matters, Granola fills in the context from the transcript. For competitive intelligence work, this means your rough notes during the interview should capture every competitor mention explicitly, even just "CI: Competitor X pricing."

When the meeting ends and you click to enhance your notes, those manual markers guide the AI to expand on exactly the CI signals you flagged. A bare note like "CI: Competitor X onboarding" becomes a structured entry with the customer's verbatim context around it, because the AI [uses your notes](https://help.granola.ai/article/ai-enhanced-notes) to write better summaries rather than producing a generic transcript summary.

Set up a customer research template that includes a dedicated "Competitor mentions" section. Granola's 29+ templates include customer research structures, and you can customize them to include CI-specific fields. To identify every competitor mentioned in a single call, ask Granola Chat "which competitors came up in this transcript, and in what context?" and it returns each name with the surrounding quote, so you can identify competitors from a call transcript without re-reading it.

## A step-by-step workflow for tagging and organizing competitor mentions

### Building a consistent tagging taxonomy

The most common failure in CI programs isn't lack of data. It's inconsistent tagging that makes the data unsearchable. [Consistent coding equals accuracy](https://atlasti.com/research-hub/thematic-analysis): establishing tagging guidelines and watching for definitional drift is what separates a useful repository from a graveyard of unread notes.

Build your taxonomy before the first interview. Here's a structure that works for most product teams:

- **#competitor:[name]:** any mention of a specific competitor (e.g., #competitor:productX)
- **#CI-pricing:** competitor pricing came up as a decision factor
- **#CI-feature-gap:** customer noted a feature competitor has that you don't
- **#CI-feature-strength:** competitor does something well that the customer values
- **#CI-complaint:** customer expressed frustration with a competitor
- **#CI-switch-reason:** why the customer moved from or to a competitor
- **#CI-adoption-barrier:** friction that almost prevented switching to you

Keep the taxonomy to 6-8 categories. More categories create tagging overhead that kills adoption. The goal is a consistent vocabulary your entire team uses, not a comprehensive ontology.

Thematic analysis involves tagging individual observations with appropriate codes to facilitate the discovery of significant themes. The tags are only useful if they're applied consistently. Document the taxonomy in one shared page and reference it every time you onboard someone to the process.

### Creating a searchable CI repository

After each interview, your enhanced notes feed into two places: the Granola folder for that research stream, and a structured database in Notion or a similar workspace tool.

The Granola folder gives you [Granola Chat](https://docs.granola.ai/help-center/getting-more-from-your-notes/granola-chat-dictation-vs-transcription) access across all meetings in that folder, which means you can ask "what did customers say about Competitor X's pricing?" and get source-linked citations from every interview in the folder. This is the fastest way to surface patterns when you're preparing a stakeholder presentation or a roadmap argument.

The external database gives you structured data for analysis. A simple Notion database with these fields covers most use cases:

- **Competitor:** The named competitor, one row per mention.
- **Category:** The CI tag (pricing, feature gap, feature strength, complaint, switch reason).
- **Verbatim quote:** The customer's exact words, pulled from the transcript.
- **Customer and segment:** Who said it and which segment they belong to.
- **Date and call link:** When it came up, with a link back to the Granola note.
- **Implication:** The "so what", the product decision, risk, or opportunity the mention points to.

Granola integrates natively with Notion on Business plans, exporting meetings as pages you can route into your CI database. For more advanced automation, like creating database rows based on CI tags, the [Zapier integration](https://docs.granola.ai/help-center/sharing/integrations/zapier) adds custom workflows based on specific tags or keywords in your notes.

> "I love that you can blend shorthand with AI notes. It's also super intuitive and super easy to use. The interface is clean and simple. I use this nearly every day for work." - [Mason K. on G2](https://g2.com/products/granola/reviews/granola-review-10322423)

## Synthesizing raw CI notes into actionable strategic insights

### Thematic analysis: finding patterns across calls

A single customer mentioning Competitor X's onboarding is an observation. Five customers mentioning it in eight calls is a strategic risk. A theme emerges when related findings appear to be meaningful and there are multiple occurrences. The job of synthesis is turning observations into patterns, and patterns into decisions.

After every 8-10 interviews, run a folder-level query in Granola: "What are the most common competitor mentions across these calls, and what context surrounds them?" The citations in the response let you verify which customers said what, so you're not synthesizing from memory.

Apply a three-layer test to each theme before escalating it:

1. **Frequency:** How many customers mentioned it? One is a signal. Five is a pattern. Eight with consistent context is a strategic issue.
1. **Specificity:** Is the mention vague ("they're better at X") or specific ("they released a native integration with [tool] last quarter that we don't have")?
1. **Recency:** Is this a durable competitor strength or something that may already be changing?

[Thematic analysis](https://dovetail.com/research/thematic-analysis/) converts open-ended responses and qualitative data into significant themes that can be communicated to stakeholders. The "so what" test closes the loop: every pattern should connect to a product decision, a risk, or an opportunity. Themes without action implications are often just interesting, not directly useful.

### Frameworks for turning quotes into decisions

Apply a competitor-specific SWOT to the themes you've identified. Fill each quadrant with customer verbatim quotes, not your interpretation. For example, "Competitor Y has superior ease of setup" would be a Competitor Strength quadrant entry. [The SWOT analysis](https://www.productplan.com/glossary/swot-analysis/) is a strategic planning tool used in product management to identify strengths, weaknesses, opportunities, and threats - and customer language is the most credible input you can bring to it.

**Feature gap matrix.** When CI data points cluster around specific features, build a simple matrix: List each contested feature down the rows, and across the columns record whether you have it, whether the named competitor has it, how many customers cited it, and the strongest verbatim quote. That turns a scattered pile of quotes into a one-screen view engineering and leadership can weigh directly against roadmap trade-offs.

This matrix format converts qualitative CI into a format that engineering and leadership can evaluate directly against roadmap trade-offs.

When a CI theme emerges from calls, check it against your product analytics. If customers are saying "Competitor X's onboarding is much faster," pull your own onboarding funnel data. If you see significant drop-off at the integration step, you've validated the qualitative signal with a measurable outcome. That combination is much harder for stakeholders to dismiss than qualitative data alone.

## Sharing competitive signals with leadership and cross-functional teams

### Tiered distribution by urgency

Not every CI signal needs a Slack message. Not every theme needs a slide deck. Tiering your distribution by urgency keeps the signal-to-noise ratio high enough that people pay attention.

**Immediate (within 2 hours):** Post to a dedicated #competitive-intel channel when a customer reveals something significant and time-sensitive: a competitor pricing change, a feature announcement the customer heard about, or a deal they're losing because of a specific capability gap. Structure each post with three elements: what happened, why it matters, and the recommended action. Keep it to five sentences or fewer.

**Weekly digest:** Collect themes across the week's interviews and send a short summary. Keep digests short, focused, and formatted for skimming. Three themes maximum, each with: the pattern, the evidence (number of mentions and one strong quote), the implication, and a suggested next step. Attach links to the relevant Granola folder queries so readers can drill in.

**Monthly strategy brief:** Executives are juggling dozens of demands, so CI briefs should get straight to the heart of the matter. One to two slides maximum: competitor landscape changes, emerging threats with customer evidence, and specific roadmap implications. The Granola folder query feature lets you pull a monthly summary across all CI-tagged interviews with citations, which cuts prep time significantly.

The Granola + Slack integration on Business plans allows auto-posting of summarized notes to specific channels, which removes the manual step of copying CI summaries into team channels after each interview.

### Monthly strategy briefs that get read

The format matters as much as the content. Insights need to move through the path: what happened, what it means, what we should do about it. Briefs that stop at "what happened" get filed. Briefs that answer "what we should do" get acted on.

A template that works:

- **Top 3 competitive themes this month** (one sentence each)
- **Evidence** (number of customer mentions, one verbatim quote per theme, link to Granola folder query)
- **Implication** (what this means for us in plain language)
- **Recommended action** (specific and owned: "Accelerate roadmap item Y," "Run churn analysis on segment Z")

If you run this consistently for two quarters, you'll have a documented record of which CI signals preceded which product decisions. That record is what converts research from "nice to have" into a demonstrably strategic function.

## Scaling the system as interview volume grows

### Team folders and cross-meeting queries

The CI workflow described above starts with one person and a handful of interviews. Scaling it to a team requires shared infrastructure. Granola's [shared folders](https://docs.granola.ai/help-center/taking-notes/ai-enhanced-notes) on Business plans let multiple people contribute interviews to a single collection, and the folder-level chat queries all of them simultaneously.

When a new team member joins, they can query "what have customers said about competitor pricing over the past six months?" and get citations from interviews they weren't in. This is the institutional memory problem solved at its root: research doesn't leave when people do, because it's organized in a structure anyone can query.

Assign one person as the CI repository owner, not to do all the research, but to maintain the tagging taxonomy, run the monthly synthesis, and ensure the database stays current. Ownership over that process is what keeps the system alive beyond the initial enthusiasm of launch.

### Connecting CI to your roadmap tools

The highest-value endpoint for CI data is your roadmap tool, not your research repository. When competitive evidence connects directly to a roadmap initiative, leadership sees research's impact on product direction rather than treating it as a separate function.

Granola's Zapier integration creates a bridge to tools like Jira, Productboard, and Aha! without native integrations. A practical setup: when a note contains a tag like #CI-feature-gap, Zapier creates a Jira story in a "Competitive Response" epic automatically, including the verbatim customer quote and a link back to the Granola note. The development team sees the context. You don't need to manually translate research into tickets.

For roadmapping, add a competitive signal field to each initiative. Tag items as `Competitive_Risk` (a gap a competitor is actively exploiting) or `Competitive_Opportunity` (a gap the competitor has that you can address). Weight your prioritization to reflect competitive signal strength. Features with multiple customer-cited competitive risk signals typically move up in priority. Features with no competitive signal context can be evaluated on demand volume and effort alone.

## Common pitfalls and how to avoid them

**Inconsistent tagging.** When team members apply different tag names to the same concept, the repository fragments and cross-interview queries return incomplete results. The fix is documentation and a brief onboarding session: one shared page with the taxonomy, examples of correct usage, and a quarterly review to update categories as competitors evolve.

**Collecting without synthesizing.** A repository full of tagged quotes is not competitive intelligence. Intelligence without action is just noise. The rule: every CI theme needs a "so what" attached before it leaves your notes. If you can't state the implication and a recommended action, the data isn't ready to share.

**Trusting the summary without checking the source.** AI-enhanced notes are accurate when the audio is clean and the conversation is focused. In noisier conditions, spot-check competitive mentions against the raw transcript. Granola stores the full transcript alongside the enhanced notes, so verifying a specific claim takes seconds. Transcription accuracy remains the foundation - poor accuracy makes everything else irrelevant.

**Speaker attribution gaps.** Because Granola captures device audio rather than joining as a call participant, it labels dialogue as Speaker 1, Speaker 2, and so on rather than identifying names. For CI purposes, this means the verbatim quote "their pricing is half ours but the onboarding took six weeks" may be attributed to a speaker number rather than a customer name. The fix is simple: jot the customer's name and role at the start of the call in your manual notes, and use that as your reference when reviewing CI quotes post-call.

**CI that never reaches the roadmap.** The most common failure mode is a well-maintained repository that exists in parallel to product decisions rather than informing them. Build the connection explicitly: every quarterly roadmap review should include a slide showing the CI signals behind the top three prioritized items. That habit is what makes research a strategic input rather than a retrospective explanation.

> "Sometimes the speaker attribution isn't perfect on larger group calls, but it's minor and improving." - [Verified user on G2](https://g2.com/products/granola/reviews/granola-review-11289286)

## Getting started

The entry point is your next customer interview. Download Granola onto your device, connect your calendar, and customize your customer research template to include a "Competitor mentions" section. During the call, jot competitor names and context as they come up. After the call, enhance your notes and run a quick query: "What did the customer say about [Competitor X]?"

After 8-10 interviews with consistent tagging, you'll have enough data to run your first cross-interview query and produce your first CI theme summary. That's the proof point that converts the process from an experiment into a team practice.

The workflow sticks because it removes friction: no bot announcements, no new UI, just a notepad that transcribes. The notepad captures what happens, and the queries surface what it means. The rest is the product judgment you already have.

Try Granola for free. [Download](https://www.granola.ai/) the Mac, iOS or Windows app, connect your calendar, and run your next customer interview to see the workflow in action.

## FAQs

**How do I track competitor mentions in customer calls?**

Capture every call with an AI notepad and jot a quick tag like "CI: Competitor X pricing" whenever a competitor comes up. After the call, enhance your notes so the AI expands each tag with the customer's verbatim context, then query the folder ("what did customers say about Competitor X?") to surface patterns across calls with citations. The consistency of the tagging, not the volume of notes, is what makes the mentions findable later.

**Can an AI notetaker identify competitors from a call transcript?**

Yes. Because the full transcript is searchable, you can ask across a single call or a whole folder which competitors were mentioned and in what context, and get the named competitor with the surrounding quote. Granola labels speakers generically (Speaker 1, Speaker 2), so jot the customer's name at the start of the call if you need to attribute a specific quote to a specific person.

**Does Granola work for in-person interviews or only video calls?** Yes. Granola captures device audio, which means it transcribes in-person conversations through your microphone as well as video calls over any platform.

**Can I share enhanced notes with someone who wasn't in the interview?** Yes. On Business plans, you can share notes via link or through shared folders, and teammates can query the transcript directly without having attended.

**What happens to the audio after transcription?** Granola deletes the audio after transcription is complete. No audio is stored anywhere. The transcript and your enhanced notes remain, but the audio file is gone. Granola is SOC 2 Type 2 and GDPR compliant.

**Does Granola integrate with Jira for competitive feature tracking?** Not natively. Use the Zapier integration to route tagged notes into Jira stories, Productboard features, or any roadmap tool in the Zapier library.

**How do folder-level queries work for CI research?** Create a shared folder for a research stream (e.g., "Q1 Customer Discovery"). Add all interviews to it. Use Granola Chat to query across the entire folder: "What competitors were mentioned and in what context?" The response includes citations from specific conversations. Folder-level queries are available on Business plans.

**Is Granola suitable for HIPAA-regulated research?** Granola is SOC 2 Type 2 and GDPR compliant. HIPAA compliance is not currently available. Teams conducting research in HIPAA-regulated contexts should verify compliance requirements before use.

**Does the free plan work for a CI research workflow?** 

The free plan includes AI-enhanced notes and is a good way to try the workflow on a few interviews. Business plan ($14/user/month) adds full history, integrations with Slack, Notion, HubSpot, Attio, and Zapier, plus cross-team shared folders, which are important for a scaled CI program.

## Key terms glossary

**Competitive intelligence (CI):** The systematic process of gathering, analyzing, and acting on information about competitors, customers, and market conditions to support product and business decisions.

**Tagging taxonomy:** A predefined set of labels applied consistently to research data to enable structured search and pattern analysis across multiple sources.

**Thematic analysis:** A qualitative research method for identifying recurring patterns or themes across a dataset, used here to surface consistent competitor signals across multiple customer interviews.

**Folder-level query:** A feature in Granola that lets you ask a question across all meetings in a shared folder simultaneously, returning answers with citations from specific conversations.

**Speaker diarization:** The process of separating and labeling different speakers in a transcript. Granola uses generic labels (Speaker 1, Speaker 2) rather than identified names.

**Feature gap matrix:** A framework for comparing your product's capabilities against competitors on dimensions customers have rated as important, used to prioritize competitive response on the roadmap.

**CI repository:** A centralized, searchable database of competitive signals organized by competitor, category, date, and customer segment, used to track patterns and inform strategy over time.

**Human-in-the-loop enhancement:** Granola's core approach where you write rough notes during a meeting and the AI uses those notes to guide how it enhances the transcript, producing summaries that reflect your priorities rather than a generic output.
