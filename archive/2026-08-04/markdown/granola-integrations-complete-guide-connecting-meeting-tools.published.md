# Granola integrations: complete guide to connecting your meeting tools

> Archived 2026-08-04T09:37:03.827Z from Sanity oy7f1h9b/production
> _id `post-granola-integrations-complete-guide-connecting-meeting-tools` · _rev `j6HIuEjz2DKUyBWq8nUmHJ` · updated 2026-06-28T12:30:55Z
> slug `granola-integrations-complete-guide-connecting-meeting-tools` · published

**Summary:** Granola offers native integrations with tools including Slack, Notion, HubSpot, Affinity, and Attio, each configured individually, plus 8,000+ apps via Zapier and AI tools like Claude through MCP.

---

> **TL;DR:** Granola offers native integrations with tools including Slack, Notion, HubSpot, Affinity, and Attio, each configured individually, plus 8,000+ apps via Zapier and AI tools like Claude through MCP. Native integrations and Zapier each require a Business plan ($14/user/month) or higher. Native integrations (Slack, Notion, HubSpot, Affinity, Attio) are set up separately through Settings > Integrations. MCP is the exception: it's available on all plans, including Basic, though Basic limits queries to the last 30 days and does not include transcript access. Granola works across Zoom, Google Meet, Teams, WebEx, and Slack Huddles without needing admin permissions on the meeting platform. Native integrations are point-and-click. Zapier handles tools without native support like Linear and Asana. MCP connects your meeting context directly to AI assistants for tasks like drafting PRDs from past interviews.

Teams capture good meeting notes and then lose them in transit. When insights stay locked inside one tool, the engineers, designers, and stakeholders who need them never see them.

The transfer to the right system either takes too long or doesn't happen at all. Granola's integrations address this directly: your enhanced notes push to Notion, Slack, or your CRM in a few clicks, without re-typing or copy-pasting. This guide covers every integration category, what each one does, which plan unlocks it, and how to choose the right combination for your team's workflow.

## Why integrations matter for research and synthesis

The gap between a good interview and an insight your team can act on comes from distribution, not note quality. Notes that live only inside a meeting tool are effectively invisible to the engineers, designers, and stakeholders who need them.

Granola's integration philosophy is the opposite of a walled garden: the goal is to push your enhanced notes to the tools where your team already works, rather than asking everyone to log into another app to find what was said.

Three integration tiers cover different levels of customization:

1. **Native integrations:** Individual connections to Slack, Notion, HubSpot, Affinity, and Attio, each configured separately through Settings > Integrations. Available on Business and Enterprise plans.
1. **Zapier:** Event-based automation connecting Granola to [8,000+ apps](https://www.granola.ai/blog/your-meeting-notes-now-connected-with-8000-apps), including tools without native support. Available on paid plans.
1. **MCP and API:** Model Context Protocol for AI-to-AI context sharing (available on all plans; Business and Enterprise unlock full history and transcript access), and API data access for internal tooling, custom dashboards, and compliance archives (Enterprise only).

## Native integrations: syncing notes to your system of record

### Slack

The [Slack integration](https://help.granola.ai/article/slack) lets you share notes directly to a channel from within Granola. Once connected, you have two sharing modes: manual sharing per note, and automated folder rules.

**How to set it up:**

1. Go to Settings via your avatar in the bottom left corner.
1. Find Slack under Integrations and click to connect.
1. Authenticate with your Slack workspace via the browser OAuth flow.

After setup, you can share any note to Slack with a single click from the top right. For ongoing automation, configure a rule so that any note added to a specific folder posts automatically to a Slack channel: click the three dots next to a folder name, select Integrations, and choose your target channel.

For research teams, create a folder called "Customer Interviews Q2" and map it to your #product-feedback Slack channel. Every enhanced note from a customer session posts there automatically, giving engineers and designers visibility into discovery without needing access to Granola itself.

> "The app's seamless integration with platforms like Zoom, Teams, and Slack enhances my productivity." - [Catherine S. on G2](https://g2.com/products/granola/reviews/granola-review-11755500)

One requirement to note: the [Slack integration](https://docs.granola.ai/help-center/sharing/integrations/slack) needs a Google Workspace or Microsoft 365 account, so it isn't available for personal Gmail or Outlook.com accounts.

### Notion

The [Notion integration](https://docs.granola.ai/help-center/sharing/notion) sends note content, including your enhanced summary and full transcript, into a Notion database that Granola creates when you first connect. Setup follows the same pattern: Settings > Integrations > Connect Notion, then authorize via browser redirect.

Key behavior to understand before you set expectations with your team: Granola doesn't push notes automatically. You share each note individually from the share menu when you're ready to send it to Notion. This gives you control over which notes enter your research repository rather than flooding it with every internal standup.

Once a note lands in Notion, you can rearrange, sort, filter, and link from it like any other database entry. The note exists independently in Notion after sharing, so edits or deletions in Granola don't affect the Notion copy. This makes it practical for a "Voice of Customer" database: tag by theme, participant company, or research round, then query across entries directly in Notion.

### CRM integrations: HubSpot, Affinity, and Attio

Granola has [native integrations with three CRMs](https://docs.granola.ai/help-center/sharing/integrations/integrations-with-granola): Attio, HubSpot, and Affinity. All three follow a similar pattern: after a meeting, you click Share and select the CRM. Granola suggests the relevant person, company, or deal record to attach the note to, and it appears in the CRM without manual data entry.

**Attio** is the most direct setup. Open Settings > Integrations, click Attio, authenticate, and your whole team shares the same connection. The [Attio help doc](https://help.granola.ai/article/attio) confirms that once one person in your workspace sets it up, the rest of the team benefits automatically. After a meeting, notes appear on the correct Person, Company, or Deal record in Attio.

**Affinity** works similarly for relationship-focused teams, particularly those in VC and sales where deal tracking centers on relationship history. See the [Affinity setup guide](https://help.granola.ai/article/affinity) for steps.

**HubSpot** lets you attach meeting notes to a HubSpot contact directly from Granola's share menu. The [HubSpot integration](https://help.granola.ai/article/hub-spot) is available on Business and Enterprise plans. Confirm current capabilities on the HubSpot help page before planning your workflow.

All three CRM integrations work one way: Granola pushes notes to the CRM, but the CRM doesn't write back to Granola.

> "The time saved in adding notes to CRM and removed from admin follow ups... Great integrations." - [Rakeem L. on G2](https://g2.com/products/granola/reviews/granola-review-9966796)

## Automating workflows with Zapier

For tools without a native Granola integration, including Linear, Asana, Salesforce, Jira, and Monday.com, Zapier is the connection layer. [Granola's Zapier integration](https://zapier.com/apps/granola/integrations) opens up 8,000+ apps via two trigger types:

- **Note Added to Granola Folder:** Fires automatically when a note lands in a specific folder.
- **Note Shared to Zapier:** Fires when you manually push a note to Zapier from the note sidebar.

**A concrete example for research teams:** Use the folder trigger to watch your "Customer Interviews" folder. When a new note arrives, Zapier creates a Linear issue populated with the action items from the note. Your engineering backlog gets updated from the interview without a single copy-paste.

Other popular automation patterns include pushing fresh notes into Salesforce, Pipedrive, or Zoho the moment they're captured. The full library of pre-built Zap templates is in the Zapier automation guide for Granola, which is worth browsing before building from scratch.

## Advanced connectivity: MCP and Enterprise API

### Model Context Protocol (MCP)

MCP lets you connect your meeting notes to AI tools like Claude and ChatGPT, so they can reason over your meeting history when you ask. With the [Granola MCP integration](https://www.granola.ai/blog/granola-mcp), you can connect your meeting notes to Claude, ChatGPT, Cursor, or any MCP-compatible AI application. Once connected, that tool can access your notes when you ask it to, with each user authenticating individually via OAuth 2.0.

The research use case is direct: after a dozen customer interviews, ask Claude to synthesize themes across all of them and draft a PRD section based on the most common friction points. Because the AI reads your actual enhanced notes rather than working from memory, the output reflects what participants actually said.

A few boundaries to know before you build workflows around MCP:

- You can only query notes where you are the owner. Notes shared with you don't appear.
- On the Basic (free) plan, queries are limited to notes from the last 30 days.
- Enterprise plan: MCP is off by default. A workspace admin must enable it in Granola settings.
- Transcript access (get_meeting_transcript) is available on Business and Enterprise plans only.

Setup instructions and authentication details are in the [MCP help documentation](https://docs.granola.ai/help-center/sharing/integrations/mcp).

### Enterprise API

API data access is available to workspace administrators on the Enterprise plan ($35/user/month). It's designed for teams building custom internal dashboards, compliance archives, or integrations with proprietary internal tools that aren't available in Zapier. If your use case fits into an existing app ecosystem, Zapier is faster to set up. The API is the right choice when you need programmatic access at a level that Zapier's event-based triggers don't support.

## Supported meeting platforms and audio capture

Granola works with major meeting platforms with no per-platform setup or visible bot. It captures audio directly from your device, which means no bot announcement, no request for host permission, and no change to the meeting dynamic for your participants.

Even without a visible bot, it's good practice to let participants know you're using Granola. Supported platforms include Zoom, Google Meet, Microsoft Teams, Cisco WebEx, Slack Huddles, and any platform that produces audio on your device (including browser-based calls).

The practical implication for research: participants in sensitive interviews don't see a recording bot join the call, which affects how freely they speak. Granola transcribes what you hear via your device's system audio, and note enhancement happens after the meeting ends.

Connecting your calendar is the starting point. The [calendar setup guide](https://docs.granola.ai/help-center/signing-in-and-connecting-your-calendar) covers both Google Workspace and Microsoft 365 configurations, and the [first-time setup guide](https://docs.granola.ai/help-center/getting-started/setting-up-granola-for-the-first-time) gets you from download to your first [transcribed meeting ](https://www.granola.ai/ai-meeting-assistant)in under five minutes.

> "It works seamlessly across all conference software. It doesn't record, so there's no need to interrupt attendees." - [Cory M. on G2](https://g2.com/products/granola/reviews/granola-review-10923322)

Granola's consent notification behavior varies slightly by platform. For Google Meet users, the [in-meeting notice documentation](https://docs.granola.ai/help-center/consent-security-privacy/in-meeting-notice-google-meet) explains exactly how this works.

## Data privacy and security in connected apps

Connecting Granola to Notion, Slack, or a CRM raises a reasonable question: does authorizing an integration expose your notes beyond your control?

Granola pushes data in one direction, and only when you trigger it.

The underlying security posture, per the [Granola security page](https://www.granola.ai/security):

- **SOC 2 Type 2 certified** as of July 2025, meaning independent auditors verified data controls operate continuously over time, not just at a single point.
- **GDPR compliant** with a Data Processing Agreement available on request.
- **Data storage:** Granola stores notes on US-hosted AWS infrastructure, encrypts them at rest and in transit, and backs them up daily.
- **AI training opt-out:** Any user on any plan can opt out in Settings. Enterprise admins can enforce this across the entire organization with a single setting.

One constraint worth knowing before planning your data architecture: Granola hosts data in the US only (no EU region) and does not currently meet HIPAA compliance requirements. If your research involves healthcare participants or requires EU data residency, verify this matches your compliance requirements before connecting integrations.

The [Granola pricing and plans FAQ](https://www.granola.ai/docs/docs/FAQs/granola-plans-faq) covers plan-specific data handling details.

## Choosing the right integration strategy for your team

<!-- rawHtml block html0 -->
<table>
<colgroup>
<col style="width: 20%" />
<col style="width: 20%" />
<col style="width: 20%" />
<col style="width: 20%" />
<col style="width: 20%" />
</colgroup>
<thead>
<tr>
<th></th>
<th>**Native integrations**</th>
<th>**Zapier**</th>
<th>**MCP**</th>
<th>**Enterprise API**</th>
</tr>
</thead>
<tbody>
<tr>
<td>**Ease of setup**</td>
<td>Point-and-click</td>
<td>Requires Zapier account and Zap configuration</td>
<td>OAuth 2.0 connection per user</td>
<td>Custom build (requires developer resources)</td>
</tr>
<tr>
<td>**Apps available**</td>
<td>Slack, Notion, HubSpot, Affinity, Attio</td>
<td>8,000+</td>
<td>Claude, ChatGPT, Cursor, MCP-compatible tools</td>
<td>Any (custom build)</td>
</tr>
<tr>
<td>**Customization**</td>
<td>Pre-built data flows</td>
<td>Custom triggers and logic</td>
<td>AI queries your notes on demand</td>
<td>Full programmatic control</td>
</tr>
<tr>
<td>**Plan required**</td>
<td>Business ($14/user/month)</td>
<td>Business ($14/user/month)</td>
<td>Basic (free) with 30-day limit; Business for full history and transcripts</td>
<td>Enterprise ($35/user/month)</td>
</tr>
<tr>
<td>**Best for**</td>
<td>Fast, reliable connections to core tools</td>
<td>Connecting tools outside the native list</td>
<td>AI-assisted synthesis across meetings</td>
<td>Internal dashboards, compliance archives</td>
</tr>
</tbody>
</table>

**Quick routing guide:**

- **Building a research repository in Notion**: Use the native Notion integration. Share notes after each interview with one click.
- **Keeping your team updated in real time**: Use Slack with folder automation so notes post to #product-feedback automatically.
- **Logging discovery calls into your CRM**: Use the native HubSpot, Affinity, or Attio integration depending on your stack.
- **Creating Linear issues from interview action items**: Use Zapier with the folder trigger.
- **Asking Claude to analyze patterns across 20 interviews**: Use MCP (available on all plans; Basic limits queries to the last 30 days, while Business and Enterprise unlock full history and transcript access).
- **Building a custom internal compliance archive**: Use the Enterprise API.

The [Granola pricing page](https://www.granola.ai/pricing) confirms which integrations are available at each tier, and the [pricing plans overview](https://docs.granola.ai/help-center/update-to-granola-pricing-plans) covers what changes as you move between plans.

> "I find Granola very easy to use... I like that recording in the background is possible without a bot." - [Johannes E. on G2](https://g2.com/products/granola/reviews/granola-review-12404902)

Try Granola for free. [Download](https://www.granola.ai/) the Mac, Windows, or iOS app, connect your calendar, and run your next meeting to see the integrations in action.
