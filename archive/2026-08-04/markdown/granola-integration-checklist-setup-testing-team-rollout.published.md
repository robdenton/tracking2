# Granola integration checklist: Setup, testing, team rollout

> Archived 2026-08-04T09:37:03.827Z from Sanity oy7f1h9b/production
> _id `post-granola-integration-checklist-setup-testing-team-rollout` · _rev `5HeA6z1RBD1IljWPfn2uoy` · updated 2026-07-30T07:16:27Z
> slug `granola-integration-checklist-setup-testing-team-rollout` · published

**Summary:** A step-by-step Granola integration checklist for teams: validate security, connect Notion, HubSpot, and Slack, test the setup, and roll out to your whole team.

---

> **TL;DR:** Most tools that work great for one person fail at the team level because nobody configures the integrations, nobody structures shared access, and insights stay locked in private notebooks. Deploying Granola requires validating security and compliance (SOC 2 Type 2, GDPR, consent), connecting core integrations like Notion, HubSpot, and Slack (these are available on [Business plans](https://www.granola.ai/pricing) and above), configuring MCP for external AI tools, and structuring shared folders so meeting insights reach the people who need them. This checklist walks through each phase so you can go from first install to full team rollout without gaps.

You've chosen Granola because it solves the transcribing problem for individuals. But getting it to work for a team requires wiring the integrations that let meeting insights flow from private conversations into shared systems. Without that wiring, you end up with a dozen individual accounts and zero institutional memory.

This checklist covers five phases: compliance validation, core app and MCP setup, tool stack connections, testing, and team rollout. Work through them in order, and you'll have a deployment your security team approves and your colleagues actually use.

**Use this Granola integration checklist to roll out to a team without gaps:**

- Validate security and compliance (SOC 2 Type 2, GDPR, consent) with your security team
- Install the app, connect calendars, and wire up MCP for your other AI tools
- Connect your core tool stack (Notion, HubSpot, Slack) and extend with Zapier
- Test the full data flow end to end before inviting anyone
- Roll out with shared folders, a short training session, and an adoption check

## Phase 1: Pre-integration security and compliance validation

Before inviting anyone to Granola, get your security team the answers they need. This phase covers plan selection, compliance documentation, and the consent workflow that makes bot-free capture work in regulated environments.

### Verify plan requirements and pricing tiers

Integrations are available on Business and Enterprise plans only. The [Free plan](https://www.granola.ai/blog/granola-pricing-plans-features-roi) gives you core note enhancement, transcription, and shared folders for collaboration, but connecting to Notion, Slack, HubSpot, Affinity, Attio, or Zapier requires upgrading.

<!-- rawHtml block html0 -->
<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 15%" />
<col style="width: 25%" />
<col style="width: 35%" />
</colgroup>
<thead>
<tr>
<th>Feature</th>
<th>Free</th>
<th>Business</th>
<th>Enterprise</th>
</tr>
</thead>
<tbody>
<tr>
<td>Price</td>
<td>$0</td>
<td>$14/user/month</td>
<td>$35+/user/month</td>
</tr>
<tr>
<td>Note enhancement and transcription</td>
<td>{"✓"}</td>
<td>{"✓"}</td>
<td>{"✓"}</td>
</tr>
<tr>
<td>Integrations (Notion, Slack, HubSpot)</td>
<td>{"✗"}</td>
<td>{"✓"}</td>
<td>{"✓"}</td>
</tr>
<tr>
<td>MCP for external AI tools</td>
<td>{"✗"}</td>
<td>{"✓"}</td>
<td>{"✓"}</td>
</tr>
<tr>
<td>Shared team folders</td>
<td>{"✓"}</td>
<td>{"✓"}</td>
<td>{"✓"}</td>
</tr>
<tr>
<td>Admin controls</td>
<td>{"✗"}</td>
<td>{"✓"}</td>
<td>{"✓"}</td>
</tr>
<tr>
<td>SSO</td>
<td>{"✗"}</td>
<td>{"✗"}</td>
<td>{"✓"}</td>
</tr>
<tr>
<td>Org-wide model training opt-out</td>
<td>{"✗"}</td>
<td>{"✗"}</td>
<td>{"✓"}</td>
</tr>
<tr>
<td>[Public API access](https://docs.granola.ai/help-center/sharing/integrations/enterprise-api)</td>
<td>{"✗"}</td>
<td>{"✗"}</td>
<td>{"✓"}</td>
</tr>
</tbody>
</table>

Business includes admin controls for centralized billing and user management. Enterprise adds controls for meeting link sharing, SSO, auto-deletion policies, and organization-wide model training opt-out.

If your team needs SSO, usage analytics, or organization-wide model training opt-out, you'll want Enterprise. For most mid-sized teams starting out, Business covers the core integration needs as listed on the [official pricing page](https://www.granola.ai/pricing).

### Review SOC 2, GDPR, and data residency options

Your security team needs answers before approving deployment. Here's the compliance checklist:

- **SOC 2 Type 2:** We completed [certification in July 2025](https://www.granola.ai/updates/granola-is-soc2-type-2-compliant), achieving audit-readiness in just over three months (see [Vanta case study)](https://www.vanta.com/customers/granola). That timeline reflects the architecture: there's less to audit when you don't store audio files.
- **Data residency:** We store notes in a US-hosted AWS Virtual Private Cloud, encrypt them at rest and in transit, and run [daily backups](https://www.granola.ai/security).
- **Audio policy:** We transcribe in real time on macOS and Windows, then discard the audio. We don't store recordings anywhere. On iOS, we temporarily cache audio during transcription and [delete it immediately after](https://help.granola.ai/article/privacy-policy).
- **Third-party AI training:** We prohibit third-party AI providers from training on your data through our contracts with them. All users can opt out of our own anonymized training in Settings. We set [Enterprise plans to opt out the entire organization](https://www.granola.ai/docs/docs/FAQs/granola-plans-faq) by default.
- **GDPR:** We maintain GDPR compliance with documented [security standards](https://docs.granola.ai/help-center/consent-security-privacy/our-security-standards).

### Establish your consent workflow

Granola transcribes via device audio, so no bot joins the call. Check whether your industry, jurisdiction, or organization requires you to notify participants before capturing a meeting. Use our features, such as the automatic chat message or the video watermark [transparency feature](https://www.granola.ai/transparency), to make it easier for you.

Before a meeting starts, tell participants you're capturing notes using an[ AI notepad](https://www.granola.ai/ai-note-taker). A single line in the calendar invite works well: "Notes will be captured using an AI transcription tool for internal documentation purposes." For recurring meetings, add a standing agenda item that covers it once, then reference it briefly each session.

For environments where consent needs to be documented, keep a short record: the invite language used, the date of verbal confirmation, or a shared policy acknowledgment. Bot-free capture removes friction for attendees, but it doesn't remove the obligation to inform them. A clear, consistent workflow helps keep sensitive conversations running smoothly.

## Phase 2: Core application and MCP setup

With security validated, you're ready to install the app, connect calendars, and wire up MCP so meeting context flows into your other AI tools.

### Install the app and configure calendar permissions

Granola runs as a desktop app on macOS and Windows. The [setup guide](https://docs.granola.ai/help-center/getting-started/setting-up-granola-for-the-first-time) takes under five minutes:

1. **Download, install, and sign in:** Grab the app from [Granola](https://www.granola.ai/) for Mac or Windows, then sign in using your Google Workspace or Microsoft 365 account (personal Gmail and Outlook.com accounts are supported for the core app).
1. **Connect your calendar and grant microphone access:** Granola reads your calendar to detect upcoming meetings and prompt transcription automatically, and you'll need to grant device audio permissions so the app can transcribe what you hear through your computer.

Before your first meeting, let participants know you'll be transcribing by using one of our features.

Granola works with any meeting platform. We do all the transcription through the system audio in your laptop, so we don't need to be a bot in your Zoom, Teams, or Meet call. You can use Granola with anything, FaceTime, WhatsApp, Zoom, Google Meet, Slack huddles, you name it. People even use it to take notes on YouTube videos or podcasts! Refer to [Granola 101](https://docs.granola.ai/help-center/getting-started/granola-101) for a walkthrough of your first meeting.

> "Easy to set up and runs quietly in the background. Accurate discussion summaries with the backup transcript available." - [Joe M. on G2](https://g2.com/products/granola/reviews/granola-review-11055567)

### Set up Granola MCP for external AI tools

MCP (Model Context Protocol) is a standard that lets AI tools connect to external data sources. Think of it like USB-C for AI apps: a common way for things to plug together. With [Granola MCP](https://www.granola.ai/blog/granola-mcp), you can access your meeting notes directly within Claude, ChatGPT, Cursor, and other MCP-compatible tools.

Instead of switching to Granola to look up what a customer said last week, you can ask Claude "What objections came up in our enterprise demos this month?" and get answers pulled from your meeting notes with citations. For anyone running regular interviews, this turns your entire conversation history into a queryable knowledge base inside the tools you already use. Follow the [Granola MCP set-up guide](https://docs.granola.ai/help-center/sharing/integrations/mcp) to get started.

## Phase 3: Connecting your tool stack

This phase turns Granola from a personal notepad into shared infrastructure. Connecting Notion, HubSpot, and Slack ensures meeting insights reach your team's existing workflows without manual copy-paste.

For step-by-step setup of each individual integration, see the full [Granola integrations guide](https://www.granola.ai/blog/granola-integrations-hubspot-slack-notion-zapier). This checklist focuses on rolling those connections out across a team.

### Step-by-step: Notion, HubSpot, and Slack integrations

Navigate to Settings via your avatar in the bottom left, find the integration under [Integrations](https://docs.granola.ai/help-center/sharing/integrations/integrations-with-granola), and authenticate through your browser. Here's the flow for each:

**Notion setup:**

1. Open Settings, then click Notion under Integrations
1. Click "Connect Notion" and you'll be [redirected to your browser](https://help.granola.ai/article/notion) to authorize
1. Select the "Use a template provided by the developer" option when prompted
1. Make sure you're using the same email address for both Granola and Notion accounts

**HubSpot setup:**

1. Navigate to Settings via your avatar, find HubSpot under Integrations
1. Click to connect, which [launches a webpage](https://www.granola.ai/docs/docs/integrations/Hubspot-Integration) for OAuth
1. Once connected, you can push any meeting note to the relevant contact or deal record

**Slack setup:**

Note: Connect Slack using the same work account you use in Granola.

1. Go to Settings, click to connect your [Slack workspace](https://help.granola.ai/article/slack)
1. Authorize through the browser prompt
1. Share individual notes by clicking the Slack option in the top right of any note
1. For automatic posting: click the three dots next to a folder name, select "Integrations," choose a Slack channel, and every new note in that folder [posts automatically](https://docs.granola.ai/help-center/sharing/integrations/slack)

> "I love the ability to ask about specifics during meetings, and the app's integration with platforms like Zoom, Teams, and Slack enhances my productivity." - [Catherine S. on G2](https://g2.com/products/granola/reviews/granola-review-11755500)

### Extend with Zapier and the Enterprise API

For tools not covered by native integrations, [Zapier connections](https://docs.granola.ai/help-center/sharing/integrations/zapier) are available on Business plans so you can push meeting notes to project management tools, databases, or custom workflows. Enterprise customers also get [public API access](https://docs.granola.ai/help-center/sharing/integrations/enterprise-api) for building custom integrations directly, along with [admin controls](https://docs.granola.ai/help-center/wip-enterprise-settings) for managing meeting link sharing and user permissions across the organization.

## Phase 4: Testing and verification

Before inviting the wider team, run through this verification checklist to confirm everything works end to end.

### Validate data flow and artifact creation

Run a test meeting and verify:

- **Transcription:** Granola detects the meeting and generates a transcript
- **Note enhancement:** Rough notes get enhanced with relevant context from the transcript
- **Notion sync:** Enhanced note appears in your designated Notion database with correct properties
- **HubSpot sync:** Note attaches to the correct contact or deal record
- **Slack notification:** Note posts to your designated channel (both manual share and folder automation)
- **Folder query:** "Chat with folder" returns cited answers from the test note

> "Granola nails exactly what I need: clean, reliable meeting transcripts and smart follow-up summaries without any fluff." - [Verified user on G2](https://g2.com/products/granola/reviews/granola-review-11289286)

## Phase 5: Team rollout and adoption

A configured tool with no users is still shelfware. This phase covers folder structures, training, and impact measurement that drive actual adoption.

### Structure shared folders for team access

Shared folders are where Granola becomes institutional memory rather than personal notes. When we [launched team workspaces](https://www.businesswire.com/news/home/20250514342646/en/Granola-Launches-AI-Workspace-for-Teams-and-Raises-$43M-Series-B), the core idea was creating dedicated spaces that anyone on your team can access, even without a Granola account.

Here's a recommended starting structure:

- **Customer feedback:** All user interviews and customer calls, queryable for product patterns
- **Sales discovery:** Pipeline conversations organized by stage or segment
- **Hiring loops:** Interview debriefs organized by role
- **Weekly syncs:** Team meetings and 1:1s for decision tracking
- **Project-specific folders:** Temporary spaces for launches, sprints, or investigations

Connect each folder to a Slack channel so notes post automatically via the [integrations settings](https://help.granola.ai/article/integrations-with-granola), and teammates who weren't in the meeting can still query the folder for context.

### Train the team on the AI notepad workflow

Plan for a meeting covering three things:

1. **The core workflow:** You jot rough notes during the meeting. Granola transcribes in the background. When the meeting ends, Granola enhances your notes with relevant context from the transcript. You review, edit, and share.
1. **Note templates:** Show team members how to open the template picker inside Granola and switch between discovery, 1:1, and custom templates to get the right output format for each meeting type. The note templates guide covers how to access built-in options and create your own.
1. **Folder queries:** Demonstrate asking a question across a shared folder ("What concerns did enterprise customers raise about onboarding this quarter?") and getting cited answers from multiple meetings.

For teammates who don't have Granola accounts, shared folder links let them view notes, explore summaries, and ask questions via the AI chatbox without accessing the full transcript.

> "I like that Granola provides detailed, thorough notes with actionable next steps in a clean format... Plus, the initial setup was very easy." - [Verified user on G2](https://g2.com/products/granola/reviews/granola-review-12270248)

### Measure adoption and impact

After a few weeks, measure whether Granola is actually saving your team time. Track these indicators:

- **Post-call admin time: **The minutes spent writing up and distributing notes after each meeting, which should fall as enhancement and folder-sharing replace manual write-ups.
- **Notes reaching shared systems: **The share of meetings whose notes actually land in your CRM, Notion, or Slack channels rather than staying in private notebooks.
- **Folder queries run: **How often teammates ask questions of a shared folder, a signal that the notes are becoming institutional memory for the team.

If post-call admin time doesn't drop within two weeks, check that team members are jotting notes during meetings (the human-in-the-loop step matters for note quality) and that shared folders connect to the right Slack channels.

[Download Granola](https://www.granola.ai/) for Mac, Windows, or iOS and connect your calendar. Wire in your integrations and watch meeting insights flow into Slack, your CRM, and shared folders from day one.

## FAQs

**How do I roll out Granola across a team?**

Roll out Granola in five steps: validate security and compliance with your security team, install the app and connect calendars, connect your core integrations (Notion, HubSpot, Slack), test the full data flow on one meeting, then invite the team with shared folders and a short training session. Working in that order means your security team approves the deployment and colleagues actually adopt it, rather than ending up with scattered individual accounts.

**What does a Granola integration checklist include?**

A Granola integration checklist covers five phases: security and compliance validation (SOC 2 Type 2, GDPR, consent), core app and MCP setup, connecting your tool stack (Notion, HubSpot, Slack, Zapier), end-to-end testing, and team rollout with shared folders and training. The point of working through it in order is to go from first install to full team adoption without leaving gaps that strand insights in private notebooks.

**Does Granola store audio from meetings?**

No. We transcribe in real time on macOS and Windows, then discard the audio. On iOS, we temporarily cache audio during transcription and delete it immediately after.

**Which meeting platforms does Granola support?**

Granola works with any meeting platform on desktop, including Zoom, Google Meet, Microsoft Teams, Webex, Slack Huddles, and browser-based WhatsApp calls.

**Do integrations work on the Free plan?**

No. Notion, Slack, HubSpot, Attio, Affinity, Zapier, and MCP connections require a Business plan ($14/user/month) or above.

**Can non-Granola users access shared meeting notes?**

Yes. Shared folders and note links are accessible to anyone, even without a Granola account, with the ability to explore summaries and ask questions via the AI chatbox.

**Does Granola train AI models on my data?**

We prohibit third-party providers like OpenAI and Anthropic from training on your data through our contracts. We use anonymized data for our own improvements, and you can opt out in Settings. We set Enterprise plans to opt out the entire organization by default.

## Key terms glossary

**MCP (Model Context Protocol):** An open standard that lets AI tools like Claude, ChatGPT, and Cursor connect to external data sources, including your Granola meeting notes.

**Bot-free capture:** Granola's architecture for transcribing meetings by capturing device audio directly, without joining the call as a visible participant. This contrasts with tools that join as bots and appear in the participant list.

**Shared team folders:** Centralized spaces within Granola where multiple team members can access, search, and query meeting notes, even without individual Granola accounts.

**SOC 2 Type 2:** An auditing standard that verifies a company's security controls are not just designed but operating effectively over time. Granola achieved this certification in July 2025.

**Note enhancement:** The process where Granola takes your rough notes from a meeting and enriches them with relevant quotes, context, and details from the transcript.
