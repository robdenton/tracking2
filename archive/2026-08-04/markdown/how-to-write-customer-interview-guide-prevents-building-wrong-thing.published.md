# How to write a customer interview guide that prevents building the wrong thing

> Archived 2026-08-04T09:37:03.827Z from Sanity oy7f1h9b/production
> _id `post-how-to-write-customer-interview-guide-prevents-building-wrong-thing` · _rev `iVINBqqr1L2dmaacGFuy6j` · updated 2026-06-18T07:04:45Z
> slug `how-to-write-customer-interview-guide-prevents-building-wrong-thing` · published

**Summary:** AI notetakers cannot fix bad research questions. Good discovery requires structuring questions around actual past behavior, not hypothetical preferences.

---

> **TL;DR** AI notetakers cannot fix bad research questions. They give you a perfectly accurate record of your own bias. Good discovery requires structuring questions around actual past behavior, not hypothetical preferences. This guide walks through the Customer Interview Pyramid framework and progressive questioning depth with a copyable template for problem discovery, plus an approach for using bot-free transcription to build a searchable research repository that keeps institutional knowledge inside the team.

An [AI notetaker](https://www.granola.ai/ai-note-taker) will not make you a better researcher. [Features fail to deliver expected value](https://uxdx.com/failure-rates/), and the root cause is often upstream: leading questions during discovery that produce confirmatory answers rather than honest ones. Ask "Would you find a dashboard useful?" and you get a "yes." Ask "Walk me through the last time you needed to find that data" and you get a story that reveals whether a dashboard would help at all.

The frameworks below offer a structure for writing better questions, a copyable template for your next discovery call, and an approach for using transcripts to improve your technique session by session.

## Why bad questions survive (and how to spot them)

Research shows [leading questions alter memory and recall](https://pmc.ncbi.nlm.nih.gov/articles/PMC1323316/), shaping what participants report rather than surfacing what they actually experienced. Hypothetical questions compound the problem: when you ask someone what they would do, they construct an imagined scenario rather than recalling a real one.

[Rob Fitzpatrick's The Mom Test](https://medium.com/@poloniothais/book-summary-the-mom-test-by-rob-fitzpatrick-8440986cd92c) identifies three types of data that consistently lead research teams astray: compliments, hypothetical fluff, and ideas. Each feels like signal, but none of it reflects how people actually behave. The principle that follows is straightforward: ask about the past rather than the future, and about behavior rather than intent.

Three strategies that protect you from false validation:

1. **Replace "would you" with "walk me through the last time":** This forces the participant to recall a real experience rather than invent a hypothetical one.
1. **Avoid confirming framing:** Questions like "Don't you find it frustrating when..." contain the answer. Replace them with "How do you handle that situation today?"
1. **Review transcripts for leading language:** Scanning past notes for phrases like "don't you think" or "wouldn't you say" surfaces interviewer bias you may not have noticed in the moment.

### The customer interview pyramid framework

The Customer Interview Pyramid is a framework [from Atlassian's product design process](https://www.atlassian.com/agile/design/product-design-process-customer-interview) that connects raw interview observations to product opportunities through three layers, built from the ground up.

The three layers:

- **Observations:** You record exactly what participants said and did without interpretation. The canonical example from [Sherif Mansour's breakdown](https://sherifmansour.medium.com/the-customer-interview-pyramid-d01f56e61883) is a social network user who types "+1" or "looks great!" on shared photos because no dedicated reaction exists.
- **Problems:** You group observations into problem statements collaboratively. In the social network example, the observation becomes: users want to express feelings about a photo but must type out the same phrases manually every time.
- **Opportunities:** At the peak, you connect problem statements to product possibilities. That same problem generates opportunities like a favorites button or a "I like this" shortcut.

Apply the same logic to your own interviews. If a participant describes copying data out of your product into a spreadsheet each Monday, the observation is the workaround itself. From there, you work through the pyramid: identify the underlying problem and connect it to product opportunities.

### Progressive questioning depth

Discovery conversations often use three depth levels to move from surface to root cause. This progression helps reveal whether a problem is real or just a passing comment.

The levels:

1. **Surface facts:** What happened in a specific situation. "Tell me about the last time you ran that report." This anchors the conversation in real experience rather than hypotheticals.
1. **Underlying process:** Why it happened that way and what constraints existed. "What made you go to that source rather than another one?" This reveals the decision structure around the problem.
1. **Goal and emotional context:** What they were trying to accomplish and what success meant to them. "If that had worked the way you hoped, what would have been different?" This surfaces the job to be done and the cost of failure.

Questions that reveal motivations and implications help you distinguish problems that actually matter from ones that exist but nobody cares enough to solve.

**Example, problem discovery:** A PM researching onboarding might ask "What were you trying to accomplish on your first day?" (level 1), then "What got in the way?" (level 2), then "If you'd been able to do that on day one, how would that have changed your next two weeks?" (level 3). The third question can reveal the cost of the friction.

**Example, feature validation:** A PM testing a new notification design might ask "When did you last notice an alert in the product?" (level 1), then "What did you do next?" (level 2), then "What were you hoping the notification would help you avoid?" (level 3). The third answer often contradicts the assumption behind the feature.

## How to structure your product discovery interview guide

A guide is a map, not a script. The goal is to keep the conversation anchored to your research objectives while leaving room for the participant to take you somewhere unexpected. [Strong guides capture participant language](https://gotranscript.com/en/blog/interview-guide-template-customer-discovery-questions-probing-prompts) around the problem, not just answers to your prepared questions.

Every well-structured guide has four sections: introduction and consent, warm-up, behavioral deep dive, and wrap-up. The intro anchors trust. The warm-up establishes context. The deep dive is where discovery happens. The wrap-up captures what you missed.

### Setting the stage and ethical consent

Consent shapes how openly participants talk. When someone understands what you're capturing and how it will be used, they share more honest feedback, including the critical negative feedback that prevents bad product decisions.

Two practical steps:

1. **State the purpose explicitly:** "This is a research call to understand how you work today, not a sales call. Nothing you say will affect your account or relationship with us." This can help remove the fear that honest criticism will backfire.
1. **Explain what you're capturing:** "I'm transcribing this conversation on my device. The transcript stays with our product team and won't be attributed to you in any shared reports." If you're in a two-party consent jurisdiction, confirm verbal consent before the session begins.

### Optimal interview duration and sample size

The research on qualitative saturation is consistent. [Qualitative saturation arrives](https://wynter.com/post/a-good-sample-size-for-qualitative-research) when conducting more interviews stops producing new themes, and that typically happens earlier than most teams expect.

Key benchmarks:

- [Five participants uncover 85% of issues](https://www.nngroup.com/articles/interview-sample-size/), making 5-8 participants enough for a focused sprint.
- For product discovery, 10-20 interviews gives you enough signal to identify patterns with confidence across different participant segments.

A 45-minute session can give enough time to move through all three depth levels without participant fatigue. Front-load your behavioral questions in the first 20 minutes, when candor tends to be highest.

## Product manager's customer discovery interview guide (template)

Copy and adapt this template for your next discovery call. The behavioral section below focuses on problem discovery. Feature validation and pricing research question sets follow the same structure.

**Customer discovery interview guide**

**Research objective:** [The one question this session answers. For example: "Why are enterprise customers stalling during pricing conversations?"]

**Participant profile:** [Role, company size, relevant workflow context]

**Date and session number:** [Date - Session X of Y]

**Section 1: Introduction and consent (5 minutes)**

- "This is a research call to understand how you work today, not a sales call."
- "I'm transcribing on my device. The transcript stays with our team and won't be attributed to you."
- "There are no right or wrong answers. Honest feedback, including negative feedback, is exactly what helps us build something useful."
- "Do I have your permission to transcribe this conversation?" [Confirm verbal consent]

**Section 2: Warm-up (5-7 minutes)**

- "Tell me about your role and what a typical week looks like for you."
- "What tools are central to how you handle [relevant activity] today?"
- "How long have you been doing this, and how has your approach changed?"

**Section 3: Problem discovery deep dive**

- "Walk me through the last time you ran into [problem area]. What were you doing right before it happened?"
- "What did you do to work around it? How long did that take?"
- "How often does this come up? What is the cost when it does?"
- "If that problem disappeared tomorrow, what would change for you?"

Follow-up prompts: "Tell me more about that." / "What happened next?" / "Why did you choose that approach over another one?"

**Section 4: Wrap-up**

- "Is there anything you expected me to ask that I didn't?"
- "Is there anything about [problem area] you think we'd be surprised to hear?"
- "Would you be open to a follow-up conversation?"
- "Is there someone else on your team we should talk to?"

Copy this template and [customize it in Granola's template feature](https://docs.granola.ai/help-center/taking-notes/customise-notes-with-templates) to auto-structure your notes around these sections during the session.

## How to improve interview quality using AI transcripts

Transcripts can be a valuable self-audit tool. AI tools scan interview text and identify patterns that are difficult to spot when you're managing the conversation live. Useful audit tasks include reviewing your talk-time ratio, scanning for leading language, and finding probing opportunities you missed.

Three distinct uses for transcript review:

1. **Identifying patterns across interviews:** Thematic analysis across interview data surfaces where pain concentrates. Search for recurring words like "workaround," "frustrating," or "every time" to spot what matters most across participants.
1. **Surfacing nuanced pain points:** Participants often bury the most important information in passing comments. A transcript lets you re-read the exact quote and decide whether it warrants a follow-up session.
1. **Auditing interviewer bias:** Count how many of your questions used "would you" or "don't you think." Those constructions push participants toward your hypothesis rather than their real experience.

### Active listening and embracing silence

You cannot type full sentences and maintain conversational presence at the same time. Three methods that improve interview quality directly:

1. **Jot keywords, not sentences:** Write one or two words that anchor a topic you want to return to. The transcript captures the detail.
1. **Use silence deliberately:** After a participant answers, pause three to five seconds before responding. Participants add meaningful information when the interviewer stops filling silence.
1. **Post-interview reflection:** Immediately after the call, write two or three observations while they're fresh. Questions you wish you'd asked. Moments where the energy shifted. These notes can help you identify patterns in your own technique.

### Synthesizing findings into actionable product decisions

Raw transcripts don't change product decisions. Synthesized findings do. Several techniques can help bridge the gap:

1. **Affinity mapping:** Group observations from your Customer Interview Pyramid into clusters. Each cluster is a candidate problem statement. Do this collaboratively with a designer or engineer so synthesis doesn't live only in your head.
1. **Quote extraction for stakeholder evidence:** AI tools can identify meaningful quotes from transcripts and surface them for insights reports. When a stakeholder asks "Is this just one customer or a pattern?", you answer with citations from multiple conversations.
1. **Cross-interview search:** Search across all your captured discovery calls for a specific question. Ask "Why are enterprise customers hesitant about SSO?" and pull exact quotes from past conversations. This turns individual interviews into [institutional knowledge for the whole team](https://www.productledalliance.com/product-discovery-interview-questions-framework/) rather than notes that disappear when someone leaves.

## How Granola helps product managers capture research without the bot

The note-taking vs. listening tradeoff has a direct solution: capture device audio without adding a visible participant to the call. Granola captures device audio and [transcribes in real time](https://www.granola.ai/security), so no recording announcement appears and no additional participant joins your call. The participant sees only you.

This matters most in qualitative research. When participants see a recording participant appear in a call, some become visibly uncomfortable, and that discomfort changes what they share. Sensitive topics like pricing frustration, competitive evaluation, and failed workflows are exactly where candor drops first.

The workflow during a discovery call:

1. Open Granola one minute before the call starts.
1. Jot rough keywords as the conversation moves: "pricing confusion," "workaround: spreadsheet."
1. After the call, click "Enhance notes." Your keywords stay in black. [AI adds context](https://help.granola.ai/article/ai-enhanced-notes) in gray, so final notes reflect your judgment about what mattered, not a generic summary of everything said.

For teams running 4-8 interviews weekly, shared folders (available on the Business plan) create a research repository every team member can query. Ask "What are the most common reasons customers don't complete onboarding?" and get source-linked citations from every session in that folder. You can also create [Recipes for post-interview tasks](https://help.granola.ai/article/writing-effective-recipes) (custom AI prompts you save and reuse), such as extracting feature requests or drafting a one-paragraph synthesis for your Notion page.

> "This tool allows me to be fully present in every candidate conversation without worrying about taking detailed notes in real time." - [Syl C. on G2](https://g2.com/products/granola/reviews/granola-review-11230755)

### Cost considerations for AI research tools

Dedicated research repositories typically price by seat and by storage, with costs that can add up quickly once transcription hours and analysis features are included. That structure can create friction for product teams where one PM does most of the discovery work.

Granola's [Business plan at $14/user/month](https://www.granola.ai/blog/granola-pricing-plans-features-roi) includes unlimited meetings, shared team folders with cross-meeting queries, and integrations with Notion, Slack, HubSpot, and Zapier. For a team running 40 discovery interviews a month, that works out to [$0.35 per meeting captured](https://www.granola.ai/blog/granola-pricing-teams-per-user-enterprise), with no per-minute caps or hidden transcription charges. The Free plan includes unlimited meetings and AI-enhanced notes for individual use. Shared team folders and cross-meeting queries require the Business plan.

The interview guide provides structure. The transcript captures exact quotes. Together, they help you gather evidence to inform what you build.

Try Granola for free. Download the Mac, iOS or Windows app, connect your calendar, and run the customer interview template on your next discovery call to see the difference between a generic summary and notes that reflect your own research judgment.

## Frequently asked questions

**How many interviews do I need to spot a pattern?** [Nielsen Norman Group research](https://www.nngroup.com/articles/interview-sample-size/) shows 5 participants uncover about 85% of usability issues, but for product discovery you typically need 10-20 interviews to reach saturation across different participant segments.

**How long should a discovery interview last?** A 45-minute session typically gives enough time to work through all three depth levels without participant fatigue. Front-loading behavioral questions in the first 20 minutes can help while participants are fresh and focused.

**Does Granola store audio from research calls?** No. Granola [captures device audio and deletes it](https://www.granola.ai/security) after transcription. The transcript is retained and encrypted, but no audio file is stored after the session ends.

**How do I handle consent when transcribing without a visible recording participant?** State clearly at the start of the call that you're transcribing on your device, explain how the data will be used, and confirm verbal consent before beginning. In two-party consent jurisdictions, get that confirmation explicitly before you start.

## Key terms glossary

**Discovery research:** The process of exploring customer problems through open-ended interviews before committing to a solution, designed to uncover actual past behavior rather than validate predetermined assumptions.

**Leading question:** A question that pushes a respondent toward one answer, such as "Don't you find it frustrating when..." instead of the neutral "How do you handle that situation today?"

**Synthesis:** The process of reviewing raw interview observations and grouping them into problem statements and patterns that inform product decisions, typically done collaboratively after a research sprint.

**Research repository:** A centralized, searchable collection of past interviews that allows the whole team to query what customers have said, preventing repeat research and preserving knowledge when team members leave.
