# Granola MCP: Query meetings from Claude, ChatGPT, and Cursor

> Archived 2026-08-04T09:37:03.827Z from Sanity oy7f1h9b/production
> _id `dcda5213-1d15-4087-80bb-337fe9b11805` · _rev `j6HIuEjz2DKUyBWq8XBw8X` · updated 2026-06-27T13:03:53Z
> slug `granola-mcp-claude-chatgpt-cursor` · published

**Summary:** Granola MCP connects meeting notes to Claude, ChatGPT, and Cursor for instant search across your pitch and board meeting history.

---

> **TL;DR:** Granola's Model Context Protocol integration connects your meeting notes directly to Claude, ChatGPT, Cursor, and other MCP-compatible tools. Setup takes under five minutes, and your meeting notes become queryable intelligence inside the AI tools you use for deep work. Basic plan users get 30 days of meeting history through MCP. Business and Enterprise plans add full history and transcript access. MCP queries cover only notes you own, not shared folder notes.

The bottleneck in knowledge work is not taking notes. It is the time spent moving context from your notepad into the tools where you actually do your thinking. Writing a memo, preparing a proposal, or synthesizing research means hunting through scattered notes from dozens of conversations, then pasting fragments into Claude or ChatGPT to make sense of them.

Granola's [Model Context Protocol](https://www.granola.ai/blog/granola-mcp) integration changes that workflow. Your [meeting notes](https://www.granola.ai/ai-meeting-assistant) connect directly to the AI tools you already use, so you can pull the exact detail you need from past conversations right inside Claude without switching tabs or copying transcripts manually.

## Granola MCP: Integrate meetings with AI

[Model Context Protocol](https://www.anthropic.com/news/model-context-protocol) is an open standard that creates secure, two-way connections between data sources and AI-powered tools. Think of it as a standardized bridge: your meeting notes sit on one side, and the AI assistant you write and build with sits on the other.

MCP uses two distinct roles:

- **MCP Server:** The service that holds your data and exposes it to AI tools by connecting to external systems and translating their responses into a format the AI can understand. Granola's server holds your meeting notes and transcripts.
- **MCP Client:** The AI application that requests and uses that data. Claude, ChatGPT, and Cursor all act as MCP Clients when you connect them to Granola. Once you [authenticate through Granola's MCP settings](https://docs.granola.ai/help-center/sharing/integrations/mcp), any compatible AI tool can search your meeting history, extract action items, find specific topics from past conversations, browse meeting folders, and answer questions based on everything you have captured.

Granola transcribes device audio without joining your call as a visible participant, so sensitive conversations become queryable in Claude or Cursor without triggering a recording announcement.

### Granola supports AI platforms

Granola MCP works with any tool that implements the Model Context Protocol standard. The platforms most commonly used with Granola are:

- **Claude Desktop and **[**Claude.ai**](http://Claude.ai)**:** Connect via Anthropic's web connector interface, with OAuth authentication through the browser
- **ChatGPT:** Added MCP support, enabling third-party connectors, including Granola, through its connector settings. Requires a paid ChatGPT subscription
- **Cursor:** The AI code editor that lets developers bring meeting context directly into their coding environment, so decisions from product reviews travel with them into the editor
- **Other MCP-compatible tools:** Windsurf, VS Code, and any application implementing the MCP standard can connect using the same authentication flow. Subscription requirements vary by tool.

## Install Granola MCP

Granola's MCP setup takes under five minutes. You need a Granola account, a desktop installation of one of the supported AI tools, and a paid account for Claude or ChatGPT if you plan to use those platforms, since they require paid subscriptions to enable MCP connectors. Subscription requirements for other MCP-compatible tools vary.

If your organization is on Granola's Enterprise plan, MCP is disabled by default at the workspace level. Your admin needs to enable it in Settings > Security before individual users can connect.

### Quick start: Granola MCP setup

1. **Sign in and connect your calendar:** Follow the [Granola calendar setup steps](https://docs.granola.ai/help-center/signing-in-and-connecting-your-calendar) to get your account ready.
1. **Open your AI client's connector settings:** For Claude, go to [claude.ai/customize/connectors](http://claude.ai/customize/connectors) on the web. For ChatGPT, open Settings, navigate to Integrations or Connectors, and locate the MCP connectors section. For Cursor, open the MCP configuration panel.
1. **Add the Granola MCP server:** Where prompted, enter the Granola MCP server endpoint. Authentication uses browser-based OAuth, so no API keys or tokens need to be copied manually.
1. **Complete the OAuth flow:** A browser window opens where you authorize Granola to share your notes with the AI client. Each user authenticates individually through this flow.
1. **Test the connection:** Ask your AI client a simple question about your recent meetings to confirm the integration is working. Enterprise users should coordinate with their admin, who enables MCP through the workspace Settings > Security dashboard, before individual connections are possible.

### Connect Claude and Cursor to Granola MCP

### Claude setup

Granola connects to Claude through the web connector interface rather than the Claude Desktop extensions menu. Go to [claude.ai/customize/connectors](http://claude.ai/customize/connectors), locate the Granola integration, and complete the OAuth authorization. Once authorized, Claude can access your meeting notes in any conversation where you direct it to, pulling specific quotes, summarizing action items, or drafting structured documents from your captured notes.

### Cursor setup

Add the Granola MCP server via Cursor's MCP configuration panel, then authenticate via the OAuth flow. Once connected, your meeting context travels with you into your editor. Developers use Cursor to scaffold features discussed in product reviews by referencing meeting notes directly in their coding environment, without having to hunt for them separately.

> "I love that I can use Granola for absolutely everything: every single conversation I have, every course I listen to that doesn't have a transcript, every conversation I'm having with myself while I work... Being able to turn those notes into content assets, reflections, and new ideas is priceless." - [Christel C. on G2](https://g2.com/products/granola/reviews/granola-review-12589742)

## Instant recall: Query past meeting insights

Granola MCP's real value is cross-meeting intelligence: asking questions that require synthesizing patterns across dozens of conversations over months, not just recalling what happened in a single pitch. Granola Chat is [agentic by design](https://docs.granola.ai/help-center/getting-more-from-your-notes/chatting-with-your-meetings), distinguishing between quick factual questions and complex analytical queries. MCP extends that same intelligence into the AI tools you already have open.

### Access Granola pitch history in Claude

When you need to write an IC memo, start with a structured query in Claude:

Using my Granola meeting notes, find all claims about market size,
TAM, or revenue figures that [Founder Name] mentioned during our
pitch conversations. Format results with the specific claim and the
date it was discussed.

Claude searches your meeting history, pulls the relevant quotes with context, and surfaces them with citations pointing back to specific meetings. You get the raw material for your memo without manually reviewing every transcript.

> "Granola nails exactly what I need: clean, reliable meeting transcripts and smart follow-up summaries without any fluff. I use it for nearly every call to stay focused on the conversation instead of scribbling notes. The follow-up action items are especially useful. Huge time saver." - [Verified user on G2](https://g2.com/products/granola/reviews/granola-review-11289286)

### Extract deal insights from folder history

One important scope boundary applies here: your [MCP queries](https://docs.granola.ai/help-center/sharing/integrations/mcp) only surface notes where you are the owner. Notes that exist in a team space folder are not accessible through MCP unless you own them individually. This applies even when a colleague has shared a folder of portfolio company check-ins with you. For example, if a teammate creates notes from their own pitch meetings and adds those notes to a shared folder without explicitly transferring ownership or creating individual shares to you, those notes will not appear in your MCP queries.

This is a deliberate design choice. A manager cannot use MCP to query the private meeting notes of their team members, and your Granola permissions carry through to the MCP layer exactly as you would expect when handling sensitive deal data.

## Query patterns across your meeting history

Anyone running regular meetings builds an archive of intelligence locked in notes: customer calls, user research, project reviews, strategic check-ins. MCP makes that archive queryable at the moment it matters most: writing a document, preparing for a key meeting, or reviewing a decision made weeks ago.

### Granola MCP for structured document drafts

The workflow below uses an IC memo as a concrete example. The same approach applies to any structured document you draft from meeting notes: client proposals, research reports, project retrospectives, or product reviews.

The workflow for converting pitch notes into a structured IC memo using Claude:

1. **During the pitch:** Jot your rough notes in Granola. Note pricing concerns, market claims, and signals worth flagging. Granola's [AI-enhanced notes](https://docs.granola.ai/help-center/taking-notes/ai-enhanced-notes) show exactly where your observations end and transcript context begins, with your notes in black and AI additions in gray.
1. **After the meeting:** Click "Enhance notes." Granola fills in context from the transcript, guided by what you wrote.
1. **Open Claude and prompt:** "Using my Granola notes from my [Company Name] meeting on [date], draft a structured IC memo covering market opportunity, competitive positioning, team assessment, key risks, and open questions."
1. **Review and refine:** Claude generates a structured draft with citations back to your specific meeting notes. The final memo reflects your judgment, built on complete context.

> "I recently started using the Granola AI notetaker app in my meetings, and I'm absolutely obsessed. It's so much better than the AI notetakers that just join a meeting, because it doesn't disrupt the flow at all. I can keep taking my own notes, and I never have to worry about missing anything important." - [Verified user on G2](https://g2.com/products/granola/reviews/granola-review-12594807)

### Query recent meetings to prep for your next one

Regular recurring meetings, weekly standups, partner reviews, and leadership check-ins require synthesizing what happened across the prior week. A well-structured MCP query makes the prep faster:

Using my Granola notes from meetings this week, identify the three
most compelling opportunities, significant topics, or decisions discussed. For each, extract: the core thesis, the founder's market size claim, context, the key differentiation, and conclusion or recommendation, the main open question I still have, remaining, and any action items assigned.

This gives you a draft outline built from your own notes, not from a generic AI summary.

### Build an audit trail from stakeholder meetings

Stakeholders, auditors, and governance processes increasingly expect structured documentation of how decisions

were made. Granola's MCP integration lets you compile that history with a prompt like: "Using my Granola notes from meetings with [Company or Project] over the past six months, summarize the key strategic decisions made, commitments given, and open questions remaining." This audit trail comes from your actual meeting notes rather than being reconstructed from memory.

## Audit-proof data for due diligence

Connecting meeting data to third-party AI tools is a legitimate concern, particularly for conversations involving confidential client information, strategic decisions, or sensitive negotiations. Granola's security architecture addresses this directly, and the [Granola security page](https://www.granola.ai/security) documents the specifics for LP due diligence purposes.

### Granola MCP's SOC 2 audit

Granola achieved SOC 2 Type 2 certification in July 2025. Granola completed that audit in three months rather than the typical 12 to 18 months, a result of the core architectural decision to delete audio immediately after transcription. Less sensitive data to protect meant fewer controls to audit, as covered in detail in [Granola's compliance overview](https://www.granola.ai/blog/ai-notetaker-privacy-compliance-soc2-gdpr).

Three security commitments apply to MCP queries specifically:

- **Audio is discarded after transcription.** Only the text transcript and your notes persist. No audio files are accessible through MCP.
- **AI providers cannot train on your data.** Third-party providers are contractually prohibited from using your meeting content for model training, so your notes remain private unless you create explicit sharing links.
- **Encryption at rest and in transit.** Your data is encrypted at rest and in transit. For anyone conducting security due diligence, this documentation is available directly and does not require custom vendor questionnaires.

### Granola MCP team access management

MCP authentication ties to your individual account. Your queries can access your own notes and notes in private folders you are a member of, but notes that exist only in a team space folder without a direct share to you are not accessible through MCP. No one on your team can use MCP to query your private notes without explicit sharing.

On Enterprise plans, MCP is disabled by default at the workspace level. The admin enables it through Settings > Security, giving organizations control over when the feature activates and for whom.

Plan access differences matter for the depth of what you can query:

<!-- rawHtml block 7c1c24b01810 -->
<table style="width:100%; table-layout:fixed; border-collapse:collapse;">
  <thead>
    <tr>
      <th style="width:40%; padding:12px; text-align:left; white-space:normal;">Plan</th>
      <th style="width:30%; padding:12px; text-align:left; white-space:normal;">MCP history<br>access</th>
      <th style="width:30%; padding:12px; text-align:left; white-space:normal;">Transcript<br>access</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding:12px;">Basic (free)</td>
      <td style="padding:12px;">Last 30 days</td>
      <td style="padding:12px;">Not available</td>
    </tr>
    <tr>
      <td style="padding:12px;">Business ($14/user/month)</td>
      <td style="padding:12px;">Full history</td>
      <td style="padding:12px;">Full access</td>
    </tr>
    <tr>
      <td style="padding:12px;">Enterprise ($35+/user/month)</td>
      <td style="padding:12px;">Full history (workspace admin enables MCP)</td>
      <td style="padding:12px;">Full access</td>
    </tr>
  </tbody>
</table>

For [model selection in Granola Chat](https://docs.granola.ai/help-center/getting-more-from-your-notes/understanding-model-selection-in-granola-chat) alongside MCP, the help center covers how the system routes queries depending on complexity.

> "Easy to set up and runs quietly in the background. Accurate discussion summaries with the backup transcript available." - [Verified user review of Granola](https://g2.com/products/granola/reviews/granola-review-11055567)

## Solving common Granola implementation hurdles

The questions below cover the most frequent points of confusion when setting up Granola MCP for the first time, particularly around plan limits, data access, and how MCP queries are scoped.

Try Granola for free. [Download](https://g2.com/products/granola/reviews/granola-review-9856398) the Mac, iOS, or Windows app, [connect your calendar](https://docs.granola.ai/help-center/signing-in-and-connecting-your-calendar), run your next meeting, then enable MCP in settings and ask Claude a question about your recent conversations.

## FAQs

**Which tools support Granola MCP?**

Claude, ChatGPT, Cursor, and any other application that implements the [Model Context Protocol standard](https://www.anthropic.com/news/model-context-protocol) can connect to Granola. You need a paid account on Claude or ChatGPT to use their MCP connector features, and Enterprise Granola users must have an admin enable MCP in workspace settings before individual connections are possible.

**Does MCP work with recorded meetings?**

Granola does not store recordings. The app [captures device audio and transcribes](https://docs.granola.ai/help-center/taking-notes/transcription) in real time, then deletes the audio immediately, so MCP accesses only the text transcript and your notes.

**How can I query meetings on mobile?**

Granola Chat is available in the [iOS app](https://help.granola.ai/article/chatting-with-your-meetings) and lets you ask questions across your notes from your phone. MCP queries themselves run through desktop AI clients like Claude and Cursor.

The right setup depends on which AI tools you already use for deep work. If you write memos in Claude, connect Granola there. If you build in Cursor, your meeting context travels into your editor with you. The [Granola MCP documentation](https://docs.granola.ai/help-center/sharing/integrations/mcp) covers the full authentication flow for each platform.

## Key terms glossary

**MCP Server:** The service that holds your data and exposes it to AI tools through the Model Context Protocol standard. Granola's MCP Server makes your meeting notes and transcripts available to compatible AI clients like Claude and ChatGPT.

**MCP Client:** The AI application that requests data from an MCP Server and uses it to answer queries. Claude, ChatGPT, and Cursor all function as MCP Clients when connected to Granola.

**SOC 2 Type 2:** An independent security audit standard that verifies a company's data security practices over a sustained period. Granola achieved SOC 2 Type 2 certification in July 2025, completing the audit in three months.

**IC memo:** An Investment Committee memorandum. The formal document a VC partner writes to present an investment opportunity to the firm's partners ahead of a funding decision.

**Model Context Protocol:** An open standard that enables AI tools to connect to external data sources through a standardized, secure protocol, allowing tools like Claude and Cursor to query data they do not natively store.

**MCP rate limits:** They vary depending on your Granola subscription plan and the MCP tool you use. Rate limits currently average around 100 requests per minute across all tools and are subject to change. For typical use cases like daily IC memo generation, this rate accommodates most workflows without interruption.
