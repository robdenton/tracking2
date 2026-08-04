# Granola free vs. paid: What features are included in each plan?

> Archived 2026-08-04T09:37:03.827Z from Sanity oy7f1h9b/production
> _id `post-granola-free-vs-paid-features-each-plan` · _rev `WML3b1jxzn1AOFDHah6Mxw` · updated 2026-06-27T13:57:48Z
> slug `granola-free-vs-paid-features-each-plan` · published

**Summary:** Granola calls its free plan Basic. The Basic plan enhances your rough meeting notes with AI, supports shared folders and custom templates, and works in multiple languages.

---

> **TL;DR:** Granola calls its free plan "Basic." The Basic plan enhances your rough meeting notes with AI, supports shared folders and custom templates, and works in multiple languages. Transcription happens without a visible bot, keeping meetings natural. The key limit is history: you can access notes from the last 30 days only. The Business plan removes that ceiling and adds unlimited searchable history, advanced AI models, and integrations with Slack, Notion, HubSpot, Attio, Affinity, and Zapier, turning daily notes into a queryable research archive. Enterprise adds SSO, admin governance, and org-wide compliance controls.

Most Granola users hit the same wall with the Basic plan eventually: they need something from a meeting that happened more than 30 days ago, and it's no longer accessible. The feature worked perfectly when they captured the notes. The bot-free experience kept conversations natural. But the rolling history window ran out, and now the insight they need is stored but unreachable.

This is the single, predictable trigger for upgrading. The [Granola pricing page](https://www.granola.ai/pricing) confirms that core features including AI-enhanced notes, custom templates, shared folders, and multi-language support all ship on the Basic plan. What the paid plans add is the infrastructure for working with meeting data over time: unlimited history, advanced AI reasoning, and the integrations that connect your notes to the rest of your stack.

## What is included in the Granola Basic plan?

### Core features: AI-enhanced notes and note capture

You jot rough notes during the meeting, and Granola enhances them into complete, structured notes using context from the transcript. This works the same way across all plans, whether you're capturing a quick internal sync or a long customer discovery session.

Your meetings stay natural and unobtrusive because Granola captures device audio directly from your system sound, with no visible participant, no recording announcement, and no bot joining your calls. It's still good practice to let participants know you're taking enhanced notes.

> "It listens directly from my device audio no bots joining calls and produces clean, structured summaries with decisions, action items, and key points. That alone makes it far more seamless than tools like Otter.ai or Fireflies, which often feel intrusive because they require a bot to join the meeting." - [Brahmatheja Reddy M.](https://www.g2.com/products/granola/reviews/granola-review-11932118)

The [Granola security page](https://www.granola.ai/security) confirms Granola doesn't store audio from meetings. It transcribes in real time on macOS and Windows, or after the meeting using temporarily cached audio on iOS, and stores only the transcript and your notes.

The Basic plan runs on macOS, Windows, and iOS, and [supports 10 languages on desktop](https://help.granola.ai/article/multi-language) including English, French, German, Spanish, Italian, Portuguese, Dutch, Japanese, Russian, and Hindi, with additional languages available on iPhone.

All plans, including Basic, also include:

- **AI chat:** Ask questions about any meeting or across a folder of meetings.
- **Shared folders:** Invite teammates to access the same set of notes.
- **Custom templates:** Build structured formats for specific meeting types like customer interviews, churn calls, or discovery sessions. (Desktop only, available on macOS and Windows; not currently supported on iOS.)
- **Model training opt-out:** Available at any time in your settings on every plan.
- **MCP (Model Context Protocol):** Connect external AI tools directly to your meeting notes so they can search and reference them in context. The 30-day history limit on Basic applies to MCP queries as well. Note that raw transcript access via `get_meeting_transcript` is restricted to paid plans. Basic users can query meeting notes through MCP but cannot retrieve full transcripts. MCP queries are also limited to notes you own: meetings shared with you via shared folders are not queryable through MCP. On Enterprise, MCP is off by default and requires an admin to enable it.
- **People & Companies** is available on all plans. On Basic, the view draws from a 30-day rolling window, so you can see recent interactions with a contact or company but not the full history. Recipes are also available on all plans: they are saved prompts for recurring post-meeting actions such as coaching feedback, PRDs, follow-up emails, and feature request extraction. Granola includes 29+ pre-built Recipes and lets you save your own. Unlike custom templates, which shape how your notes are structured during a meeting, Recipes run after the meeting ends and produce a specific output on demand.

### Integrations

Business and Enterprise plans unlock calendar integrations, CRM sync, and other third-party connections that push notes and summaries into the tools your team already uses.

On Business, MCP removes the 30-day rolling window and draws from your full meeting history instead. See the Business plan's integrations section below for full detail.

The [Granola 101 guide](https://help.granola.ai/article/granola-101) walks through how all of these features work in practice from your first meeting.

### Understanding the Basic plan's limits: history and integrations

The Basic plan gives you a rolling 30-day window of note access. Notes older than 30 days aren't deleted, they're stored, but they aren't accessible inside Granola until you upgrade. The [subscriptions and billing documentation](https://docs.granola.ai/help-center/managing-your-account/subscriptions-and-billing) confirms this is the current limit.

Beyond history, two other capabilities are gated to paid plans:

1. **Integrations.** Connections to Slack, Notion, HubSpot, Attio, Affinity, and Zapier are Business-only features.
1. **Advanced AI models.** The Basic plan uses standard AI models. Business plans access higher-tier models for more complex reasoning across meeting folders.

For daily note capture, individual synthesis, and team folder sharing, the Basic plan is genuinely complete. You'll hit this limit when you need to query across months of interviews, automate note delivery to a CRM, or ask a complex cross-meeting question like "What friction points have enterprise customers mentioned about onboarding in the last quarter?"

> "It's simply the easiest tool I've discovered for capturing notes during meetings... while Granola offers a core set for you to adopt, they have made it super easy and flexible to create your own for whatever purpose you have." - [Andy C. on G2](https://g2.com/products/granola/reviews/granola-review-10309657)

## When to upgrade: the Granola Business plan

### Unlimited history: building a searchable research repository

The Business plan removes the 30-day ceiling entirely. Every meeting you've ever captured in Granola stays accessible, searchable, and queryable. For product managers running 4-8 customer interviews a week, this is the core value shift: you go from a notepad you use today to an archive you can interrogate over time.

With every interview in one place, you can ask "Which UX issues come up most often?" or "Why are enterprise customers hesitant about SSO?" and get citations from 10 or more past conversations. The [Granola pricing ROI post](https://www.granola.ai/blog/granola-pricing-plans-features-roi) frames this as the difference between capture and recall, and it's the clearest reason research-heavy teams move to Business.

This directly addresses research debt: the accumulation of unprocessed or unfindable insights from past interviews. Product teams often sit on dozens of customer conversations, but without a searchable archive, those insights stay locked in individual notes or forgotten recordings. Rather than rebuilding synthesis from scratch every quarter, you can query directly across your folder of past discovery sessions.

The same logic applies to People & Companies. On Basic, the People & Companies view surfaces everyone you've met with and every company you've spoken to, but the window is limited to the last 30 days. On Business, that view becomes a full relationship history: every meeting ever captured with a given person or company, queryable from day one. For product teams running recurring discovery with the same accounts, that continuity matters. You can track how a customer's priorities have shifted over six months, or spot when a company that went quiet has re-engaged, without digging through individual notes to reconstruct the timeline.

### Custom templates: standardizing your discovery process

Custom templates are available on the Basic plan, but the Business plan's unlimited history makes template consistency far more valuable at scale. When every customer interview follows the same structure (problem statement, current workaround, decision criteria), patterns surface faster across the archive. You can query "What current workarounds do enterprise customers mention?" and get structured answers instead of hunting through freeform notes. Note that templates are currently only available on the macOS and Windows desktop apps, so mobile users won't have access to this feature.

[Granola's template system](https://www.granola.ai/docs/docs/101/afteryourmeeting/Usingtemplates) lets you build formats for specific interview types. A churn interview might have dedicated sections for timeline, root cause, and competitive context. You access templates from the template menu during any meeting, save custom versions, and share them with your team through shared folders. The [upgraded templates guide](https://www.granola.ai/blog/upgraded-meeting-note-templates) outlines pre-configured structures for sales calls, job interviews, and product reviews you can adapt immediately.

### Advanced AI context and smarter models

Business plans include two capabilities that improve note quality for complex research workflows.

**File uploads for context.** Granola lets you add files directly to a meeting so the AI understands the background before the conversation starts. The [Granola product updates page](https://www.granola.ai/updates) confirms Granola can process images and files to be more helpful during the meeting, though the feature was listed as in beta at the time of writing. Uploading a discussion guide or customer profile before a discovery call gives the AI more context for generating relevant enhanced notes, though available sources do not specify file format or size limits.

**Advanced AI thinking models.** When you're asking complex questions across a folder of 40 interviews, the reasoning quality of the underlying model matters. Business plans access higher-tier language models for AI chat queries, with Granola's [plans FAQ](https://www.granola.ai/docs/docs/FAQs/granola-plans-faq) confirming the use of multiple models optimized for different meeting types and use cases.

### Integrations: connecting to your workflow

Business plans include the full integration suite. The [integrations overview](https://help.granola.ai/article/integrations-with-granola) confirms connections to:

<!-- rawHtml block html0 -->
<table>
<colgroup>
<col style="width: 50%" />
<col style="width: 50%" />
</colgroup>
<thead>
<tr>
<th>Integration</th>
<th>Use case</th>
</tr>
</thead>
<tbody>
<tr>
<td>HubSpot, Attio, Affinity</td>
<td>Auto-match notes to CRM records (people, companies, deals)</td>
</tr>
<tr>
<td>Notion</td>
<td>Push structured notes to your Notion workspace</td>
</tr>
<tr>
<td>Slack</td>
<td>Deliver meeting summaries to channels or DMs</td>
</tr>
<tr>
<td>Zapier</td>
<td>Build custom automations to any connected tool</td>
</tr>
</tbody>
</table>

Business plans make [Granola MCP](https://www.granola.ai/blog/granola-mcp) (Model Context Protocol) significantly more powerful. While MCP is available on all plans, letting AI tools like Claude, ChatGPT, and Cursor access your meeting notes directly, Business removes the 30-day data limitation. Queries draw from your full meeting history rather than a rolling window. Once connected, you can ask your AI assistant questions about any past meeting without leaving the tool you're already in. The [teams and per-user pricing post](https://www.granola.ai/blog/granola-pricing-teams-per-user-enterprise) confirms Business also adds centralized billing and user management across your workspace.

## Granola for Teams and Enterprise: security and collaboration

Enterprise is designed for teams where security reviews, compliance requirements, and admin governance are non-negotiable before org-wide deployment.

The [Enterprise tier](https://www.granola.ai/pricing) adds SSO for identity provider integration, org-wide auto-deletion periods so meeting data doesn't persist indefinitely, and admin controls for meeting link sharing so you can disable external sharing or require work email authentication to view notes. Enterprise also includes org-wide notification settings, letting admins automatically send consent messaging to meeting participants so everyone in the organization is informed that Granola is in use, useful for compliance teams that need to demonstrate participant awareness at scale. API data access lets teams build internal tooling on top of meeting data, and priority support with usage analytics gives leadership visibility into adoption.

**On data privacy**: any user on any plan can opt out of model training in settings, and Granola confirms it does not allow third parties like OpenAI or Anthropic to use your data to train their models. Enterprise enforces that opt-out as the default across the entire organization with a single admin setting.

Granola achieved [SOC 2 Type 2 certification](https://trust.granola.ai/) in July 2025, meaning independent auditors verified the company maintains strict data controls over time. This certification covers Granola's infrastructure and applies to all users.

## Feature comparison: Basic vs. Business vs. Enterprise

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
<th>Feature</th>
<th>Basic</th>
<th>Business</th>
<th>Enterprise</th>
</tr>
</thead>
<tbody>
<tr>
<td>Meeting history</td>
<td>Last 30 days</td>
<td>Unlimited</td>
<td>Unlimited</td>
</tr>
<tr>
<td>AI-enhanced notes</td>
<td>Yes</td>
<td>Yes</td>
<td>Yes</td>
</tr>
<tr>
<td>Bot-free capture</td>
<td>Yes</td>
<td>Yes</td>
<td>Yes</td>
</tr>
<tr>
<td>Custom templates</td>
<td>Yes</td>
<td>Yes</td>
<td>Yes</td>
</tr>
<tr>
<td>Shared folders</td>
<td>Yes</td>
<td>Yes</td>
<td>Yes</td>
</tr>
<tr>
<td>Multi-language support</td>
<td>Yes</td>
<td>Yes</td>
<td>Yes</td>
</tr>
<tr>
<td>Model training opt-out</td>
<td>Per user</td>
<td>Per user</td>
<td>Org-wide (default)</td>
</tr>
<tr>
<td>AI chat across folders</td>
<td>Standard models</td>
<td>Advanced models</td>
<td>Advanced models</td>
</tr>
<tr>
<td>Slack, Notion, Zapier integrations</td>
<td>No</td>
<td>Yes</td>
<td>Yes</td>
</tr>
<tr>
<td>CRM integrations (HubSpot, Attio, Affinity)</td>
<td>No</td>
<td>Yes</td>
<td>Yes</td>
</tr>
<tr>
<td>MCP (Claude, ChatGPT, Cursor)</td>
<td>Yes</td>
<td>Yes</td>
<td>Yes</td>
</tr>
<tr>
<td>Centralized billing and user management</td>
<td>No</td>
<td>Yes</td>
<td>Yes</td>
</tr>
<tr>
<td>SSO, admin controls, API access</td>
<td>No</td>
<td>No</td>
<td>Yes</td>
</tr>
<tr>
<td>Org-wide auto-deletion</td>
<td>No</td>
<td>No</td>
<td>Yes</td>
</tr>
<tr>
<td>Recipes</td>
<td>Yes</td>
<td>Yes</td>
<td>Yes</td>
</tr>
<tr>
<td>People & Companies</td>
<td>Limited history</td>
<td>Full history</td>
<td>Full history</td>
</tr>
</tbody>
</table>

The pattern across these tiers is consistent: Basic handles the capture moment well, Business extends that value across time and into your existing tools, and Enterprise adds the controls that compliance, legal, and security teams require before approving org-wide deployment.

A few feature-specific caveats are worth noting before choosing a plan. MCP integration is available on Basic, but raw transcript access via `get_meeting_transcript` is restricted to paid plans. Basic users can query [meeting summaries](https://www.granola.ai/ai-meeting-assistant) through MCP but cannot pull full transcripts.

Additionally, MCP queries are scoped to notes you own. Meetings in shared folders are not queryable via MCP regardless of plan. On the templates side, custom templates are currently only available on the macOS and Windows desktop apps: iOS users cannot create or apply templates at this time. Finally, Enterprise plans include org-wide participant notification, an automatic consent messaging feature that alerts meeting participants across the organization that Granola is in use, a capability that compliance and legal teams typically require before authorizing broad deployment.

## Which plan fits your research practice?

**Stick with Basic if** you're using Granola for day-to-day note capture and your synthesis work doesn't require querying beyond 30 days of history. Basic also works well if your team doesn't need CRM integrations or centralized billing.

**Upgrade to Business if** you run regular customer interviews and need to search across your full archive, you want Granola connected to Notion, Slack, or your CRM, or you're building a team research practice where folder-level queries replace manual synthesis.

**Contact sales for Enterprise if** your security team requires SSO, your legal or compliance team needs org-wide data deletion controls, or you need admin governance over how notes are shared externally.

The [Granola pricing ROI post](https://www.granola.ai/blog/granola-pricing-plans-features-roi) walks through how teams typically frame the upgrade value against time spent on manual synthesis, which can help if you need to justify the budget internally.

## Get started with Granola

[Download the Granola app](https://www.granola.ai/) for Mac, Windows, or iOS, connect your calendar, and run your next meeting on the Basic plan. When you hit the history ceiling, upgrade to Business from your billing settings to restore access to your full archive and connect Granola to the rest of your workflow.
