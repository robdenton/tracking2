# Granola integrations: Connect HubSpot, Slack, Notion, Zapier

> Archived 2026-08-04T09:37:03.827Z from Sanity oy7f1h9b/production
> _id `post-granola-integrations-hubspot-slack-notion-zapier` · _rev `S0Pyt4ih4B5rosoEAph3jA` · updated 2026-07-30T07:16:09Z
> slug `granola-integrations-hubspot-slack-notion-zapier` · published

**Summary:** Connect Granola to HubSpot, Notion, Slack, Affinity, Attio, and 8,000+ apps via Zapier. See how each integration works and how to set it up in minutes.

---

> **TL;DR:** Meetings generate decisions, objections, and insights that only matter if they make it into the systems your team actually uses. Granola connects your meeting notes directly to HubSpot, Notion, Slack, Affinity, Attio, and 8,000+ tools via Zapier, without bots joining your calls.

Most teams follow the same pattern after calls: customer conversations get logged in the CRM, important decisions update the roadmap in Notion, and important insights get shared in Slack. Each meeting generates notes that could inform your next deal, product decision, or hiring conversation, but *only* if someone manually copies that context into the right system. The same pattern appears across sales calls, customer interviews, board meetings, and hiring conversations.

Granola is built to close that gap. It captures conversations without disrupting them, structures notes automatically, and then pushes the right context into the tools your team already relies on such as CRMs, docs, and team channels, without manual copy-paste or cleanup.

This guide walks through how Granola's integrations work, which tools are supported, and how different roles use them to turn meeting conversations into durable company knowledge.

Granola integrations at a glance: Granola offers native integrations with HubSpot, Notion, Slack, Affinity, and Attio, and connects to Salesforce and 8,000+ other apps through Zapier. Native connections set up in Settings through OAuth in a couple of minutes. Anything without a native connection runs through the Granola Zapier integration. All integrations require the Business plan or above.

## Why integrations matter for meeting workflows

Meetings generate insights that determine whether deals close, candidates accept, or product decisions stick.

Without integrations, meeting context dies in private notebooks or personal memory. The salesperson running the next call doesn't know which objection came up last time, and the PM rebuilding a roadmap can't trace feature requests back to real customer quotes. Three weeks later, when the detail matters, it's gone.

[Integrations](https://help.granola.ai/article/integrations-with-granola) move meeting context into systems your team searches daily. When a sales rep's discovery call notes sync automatically to HubSpot, the account executive running the next meeting can reference specific concerns the prospect raised, the exact pricing objection, the timeline constraint, the stakeholder who needs convincing.

> "The time saved in adding notes to CRM and removed from admin follow ups... seamlessly embedded its way in to the current process." - [Verified user review of Granola](https://g2.com/products/granola/reviews/granola-review-9966796)

## CRM integrations: Syncing meeting notes to HubSpot and Salesforce

Sales reps spend hours weekly copying discovery call details into CRM records and by the time you update the system, you've forgotten which objections the prospect raised first.

### How the HubSpot integration works

Our [HubSpot integration](https://help.granola.ai/article/hub-spot) automatically matches notes with the right People, Company, or Deal records in your CRM. The system uses meeting context like email addresses and calendar invitations to identify which HubSpot objects correspond to each conversation.

**To connect Granola to HubSpot, follow these setup steps:**

1. Open Granola Settings via your avatar in the bottom left corner
1. Click "Connect HubSpot" under Integrations
1. Authorize Granola to access your HubSpot account in the browser window that opens
1. Return to Granola and share any note to HubSpot using the Share menu

After the meeting ends, click "Enhance notes" to structure your rough notes with transcript context. Then click Share and select HubSpot.

You'll see suggestions for which contact, company, or deal to attach the notes to, based on meeting participants. The full summary appears in the HubSpot activity feed, so any team member can reference exactly what was discussed without asking you to recap.

You'll get the best results when you use [Granola templates](https://docs.granola.ai/help-center/taking-notes/customise-notes-with-templates) structured for sales workflows. A "Discovery Call" template might include sections for Budget, Authority, Need, and Timeline. When you jot "Pricing concern about per-seat cost" during the call, we fill in exact quotes from the transcript under the Budget section. When that note syncs to HubSpot, your AE sees not just "pricing concern" but the specific language the prospect used.

> "I find that Granola provides detailed, thorough notes with actionable next steps in a clean format... more efficient, producing more productive notes than Zoom and Gong notetakers." - [Verified user on G2](https://g2.com/products/granola/reviews/granola-review-12270248)

### Connecting Salesforce via Zapier

We don't offer a native Salesforce integration yet. For Salesforce users, our [Zapier integration](https://help.granola.ai/article/zapier) provides the connection layer.

**Zapier workflow:**

1. Create a new Zap with Granola as the trigger
1. Select either "New Note Added to Folder" or "Meeting Note Sent to Zapier" as your trigger event
1. Choose a Salesforce action like "Create Record" or "Update Record"
1. Map Granola note fields to Salesforce object fields (Account, Opportunity, Contact)
1. Test the Zap and activate

The two-trigger system gives you control. Use "New Note Added to Folder" to automatically sync every sales call in your "Customer Conversations" folder. Use "Meeting Note Sent to Zapier" to manually decide which specific meetings warrant CRM updates. The second approach works well for recruiting conversations or investor pitches where you want documentation but not every call belongs in Salesforce.

### Native integrations for Affinity and Attio

[Affinity](https://help.granola.ai/article/affinity) and Attio serve relationship-focused workflows common in venture capital and executive recruiting. Both integrate natively using the same pattern as HubSpot.

For a VC conducting investor pitches, the Affinity integration automatically attaches [meeting summaries](https://www.granola.ai/ai-meeting-assistant) to the founder's profile in your deal pipeline. When you meet the same founder six months later, the previous conversation context surfaces immediately. For executive recruiters using Attio, candidate interview notes sync to People records, building a complete hiring history that survives even if the original interviewer leaves your firm.

Setup follows the HubSpot model: connect via Settings, authorize in your browser, then share notes after meetings. We suggest the relevant person or company based on calendar attendees, and you can configure automatic sharing for specific folders.

## Knowledge management: Exporting to Notion

If you've conducted customer interviews, you know how complicated things get. Each conversation includes feature requests, usability complaints, workflow descriptions, and competitive comparisons.

Capturing this in real-time means missing facial expressions and body language. Reconstructing it from memory means losing exact quotes.

Our [Notion integration](https://help.granola.ai/article/notion) exports notes as structured database entries. This matters because Notion databases support properties, filters, and relations that plain text documents don't.

**Setup steps:**

1. Open Settings and click into Notion under Integrations
1. Click "Connect Notion" and authorize Granola in the browser
1. Select "Use a template provided by the developer" during authorization
1. Choose the target Notion database where meeting notes should appear

After connecting, share any note to Notion. The note becomes a database entry with properties like meeting date, attendees, and tags. You control the structure by creating custom Granola templates that map to Notion database properties. A "Customer Research" template might include fields for User Role, Pain Points, Feature Requests, and Willingness to Pay. When you export that note to Notion, each field populates the corresponding database property.

This structure enables queries you can't do with text files. Filter your Customer Research database to show "all Feature Requests from Enterprise users in Q1 2026" or "Pain Points mentioned by at least three different customers." The cross-meeting intelligence turns individual conversations into strategic insights because you can aggregate across dozens of calls.

> "I find Granola incredibly helpful and intuitive for taking notes in meetings... I appreciate being able to customize note formats and access full transcripts for reference. The note summaries Granola creates are also a standout." - [Catherine S. on G2](https://g2.com/products/granola/reviews/granola-review-11755500)

## Team alignment: Sharing summaries via Slack

Our [Slack integration](https://help.granola.ai/article/slack) posts meeting summaries to specific channels automatically. Setup requires connecting your Slack workspace via Settings, then choosing a default channel for each shared folder. Your "Sales Calls" folder might post to #sales-wins. Your "Customer Research" folder might post to #product-feedback.

After a meeting ends and you enhance your notes, we post a summary to the designated Slack channel with a link to the full note. Team members can click through to read the detailed transcript or ask questions using [Granola's chat feature](https://help.granola.ai/article/chatting-with-your-meetings). The summary we post includes key sections from your template like Decisions Made, Action Items, and Next Steps, making it scannable for people reading on mobile during their commute.

This integration supports sharing to channels only and works with both public and private channels. If you've previously used our integration with Slack to post to private channels and are now having issues, check that your email address matches on both accounts.

> "With Granola I don't have to worry anymore about taking meeting notes... Love that I can easily share my notes with my colleagues as well, and that we can all chat with the meeting transcript so everyone can see the full context of the meeting, even if they weren't there." - [Jess M. on G2](https://g2.com/products/granola/reviews/granola-review-9856422)

## Meeting platform compatibility: Zoom, Google Meet, and Teams

Recording bots disrupt sensitive conversations. Granola captures audio directly from your device without joining meetings as a visible participant. Participants speak naturally because they don't see any indication that documentation is happening.

### How Granola captures audio without a bot

We use device audio capture instead of joining meetings as a participant. Our desktop app (Mac or Windows) captures whatever audio inputs and outputs happen on your computer by accessing your microphone and system audio directly. This architecture means we work with any video platform without platform-specific APIs or integrations.

Granola doesn't join meetings as a visible participant. We transcribe audio in real-time using specialized third-party transcription providers, then delete the audio immediately after. You get the text transcript and your enhanced notes - no recordings stored on our servers or third-party systems.

**Supported platforms:** Zoom, Google Meet, Microsoft Teams, Cisco WebEx, Slack Huddles, and any other video conferencing software that runs on your computer. Our iOS app captures phone calls and in-person meetings using your phone's microphone.

> "What I like best about Granola is how effortlessly it handles meeting notes without disrupting the flow of the conversation. It listens directly from my device audio no bots joining calls and produces clean, structured summaries... That alone makes it far more seamless than tools like Otter.ai or Fireflies." - [Brahmatheja Reddy M. on G2](https://www.g2.com/products/granola/reviews/granola-review-11932118)

[Connect your Google Calendar or Microsoft Outlook](https://help.granola.ai/article/calendar-sync) during setup, and we detect upcoming meetings with video conferencing links automatically. One minute before a scheduled call with two or more attendees, you get a notification. Click it to launch both your video platform and our transcription simultaneously.

## Automating workflows with Zapier

Five native integrations sync notes to your most-used business tools. For others, [Zapier](https://help.granola.ai/article/zapier) connects to project management platforms (Asana, Trello), spreadsheets (Google Sheets, Airtable), and specialized CRMs (Pipedrive, Copper).

Our Zapier integration offers two triggers: "New Note Added to Folder" fires automatically when any meeting in a specific Granola folder completes. "Meeting Note Sent to Zapier" fires only when you manually send a specific note via the Share menu. The first enables batch automation, your "Customer Feature Requests" folder can automatically create Google Sheet rows. The second gives you selective control, capture every hiring interview but only sync final rounds to your ATS.

**Common Zapier workflows:**

- **Customer research to Airtable:** New note in "User Interviews" folder → Create Airtable record with transcript URL, participant name, and key quotes
- **Sales pipeline to Google Sheets:** New note in "Discovery Calls" folder → Add row to forecast spreadsheet with company name, deal size, and close probability
- **Action items to Asana:** Manual send from "Board Meetings" → Create Asana tasks for each action item assigned during the meeting

Setup requires a Zapier account and our Business plan. The platform connects us to 8,000+ apps, making Zapier the integration layer for anything beyond our five native connections.

## Security and privacy for integrated data

Integrations create new data pathways. Your meeting transcripts, which start in Granola, now flow to HubSpot, Notion, Slack, and potentially dozens of other systems via Zapier. Each integration point raises questions about access control, encryption, and data retention.

We achieved [SOC 2 Type 2 certification](https://www.granola.ai/updates/granola-is-soc2-type-2-compliant) in July 2025, completing the audit in just over four months because we delete audio immediately after transcription. It happens in real-time on Mac/Windows or after the meeting using temporarily cached audio on iOS. Once transcription completes, we delete cached audio from all our systems and third-party systems.

Meeting transcripts and enhanced notes are stored encrypted at rest in AWS US data centers and encrypted in transit via TLS. Our contracts with third-party AI providers like OpenAI and Anthropic prohibit them from training models on your data unless you explicitly opt in.

You can opt out of model training in Settings on any plan. Enterprise plans have model training disabled by default.

We're GDPR compliant with [data processing agreements](https://help.granola.ai/article/data-processing-addendum) available upon request. We don't currently offer HIPAA compliance, so healthcare organizations requiring HIPAA-certified tools should evaluate alternatives.

For confidential meetings, consider integration permissions carefully. A board meeting captured in Granola might contain M&A discussions you don't want auto-posting to Slack. Use the manual share workflow rather than folder-level automation for sensitive conversations.

## Getting started: Setup checklist

We designed each integration to connect quickly through straightforward OAuth flows.

**Before connecting integrations:**

1. [Download Granola](https://www.granola.ai/) for Mac or Windows or iOS
1. [Connect your calendar](https://help.granola.ai/article/calendar-sync) (Google Calendar or Microsoft Outlook) so we detect scheduled meetings automatically
1. Upgrade to our [$14/user/month Business plan](https://www.granola.ai/pricing) since integrations require Business or Enterprise plans
1. Run your first meeting to understand the workflow before connecting external tools

**Integration priority:** Start with whichever integration solves your biggest immediate pain.

Most teams benefit from this order: CRM first (HubSpot, Affinity, or Attio) to eliminate manual data entry after sales calls. Then Notion if you're building a company knowledge base. Then Slack if your team needs meeting visibility. Then Zapier for custom workflows your other tools don't cover.

Each integration works independently. You can use HubSpot without Notion, or Slack without HubSpot. Connect only the tools your team actually uses.

> "It's simply the easiest tool I've discovered for capturing notes during meetings... Their implementation elegantly enables AI prompting without forcing the user into that mindset... Granola is the one tool I continuously have up during my day." - [Andy C. on G2](https://g2.com/products/granola/reviews/granola-review-10309657)

## Ready to connect your workflow?

Integrations require our Business plan at $14 per user per month. Start a trial today: download Granola for Mac or Windows, connect your calendar, and run your first meeting. Once you've tested the bot-free capture and note enhancement workflow, add HubSpot or Notion through Settings. Each integration connects via straightforward OAuth authorization in your browser.

Your first integration typically takes longer to authorize than to configure in Granola.

[Start your Business trial](https://www.granola.ai/pricing) or [read the integration documentation](https://help.granola.ai/article/integrations-with-granola) for detailed setup guides.

## FAQs

**How do I connect Granola to HubSpot?**

Open Granola Settings via your avatar in the bottom left, click "Connect HubSpot" under Integrations, and authorize Granola in the browser window that opens. Once connected, enhance your notes after a meeting, click Share, and select HubSpot, and Granola suggests the right contact, company, or deal to attach the note to. The integration requires the Business plan or above.

**Does Granola integrate with Affinity and Attio?**

Yes. Affinity and Attio both have native integrations that work the same way as HubSpot: connect in Settings, authorize in your browser, then share notes after meetings. They suit relationship-focused workflows in venture capital and executive recruiting, attaching meeting notes to the right person or company record automatically.

**Do I need a paid plan for integrations?**

Yes. Our Business plan ($14/user/month) is required for HubSpot, Notion, Slack, Affinity, Attio, and Zapier connections. The Free plan includes unlimited meetings and AI note enhancement but no external integrations.

**Does Granola integrate with Salesforce?**

Not natively. Use our Zapier integration to connect to Salesforce. Create a Zap with Granola as the trigger and Salesforce as the action to sync notes to Account, Opportunity, or Contact records.

**Can I automatically share all meetings in a folder to HubSpot?**

For HubSpot, you manually share each note after meetings. For Slack, you can configure a folder to auto-post all summaries to a specific channel. For CRM automation, use [Zapier's "New Note Added to Folder" trigger](https://help.granola.ai/article/zapier).

**Does the Notion integration create pages or database entries?**

Database entries. We export notes as rows in a Notion database, not standalone pages. This enables filtering, properties, and relations that make meeting content searchable and queryable.

**Is there a public API for custom integrations?**

No. We don't offer a public API. For custom workflows, use our Zapier integration which connects to 8,000+ apps.

**Can I use integrations on the iOS app?**

Yes. Connect integrations once via the desktop app settings, and they work across all devices. Capture a meeting on your iPhone, enhance notes on desktop, then share to HubSpot or Notion from either platform.

**How do I disconnect an integration?**

Open Settings, navigate to the specific integration (HubSpot, Notion, Slack, etc.), and click Disconnect. This revokes our access to that platform. Previously shared notes remain in the external system but future notes won't sync automatically.

## Key terminology

**Native integration:** A direct connection between Granola and another platform (HubSpot, Notion, Slack, Affinity, Attio) that doesn't require third-party middleware. Setup happens in Settings via OAuth authorization.

**Zapier:** An automation platform that connects Granola to 8,000+ apps through triggered workflows. Required for Salesforce, project management tools, and other platforms without native integrations.

**Device audio capture:** Our method of transcribing meetings by accessing your computer's microphone and system audio directly, without joining video calls as a visible bot participant. Enables confidential conversations where recording announcements would create friction.

**Bot-free architecture:** The technical approach of capturing meeting audio from your device rather than sending a recording bot into the video call. Distinguishes us from bot-based meeting tools that join calls as visible participants.
