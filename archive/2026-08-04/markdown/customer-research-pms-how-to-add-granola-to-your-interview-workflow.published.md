# Customer research PMs: how to add Granola to your interview workflow

> Archived 2026-08-04T09:37:03.827Z from Sanity oy7f1h9b/production
> _id `post-customer-research-pms-how-to-add-granola-to-your-interview-workflow` · _rev `g1iCf3sb7YO68kag9CGtBX` · updated 2026-06-18T08:21:10Z
> slug `customer-research-pms-how-to-add-granola-to-your-interview-workflow` · published

**Summary:** Adding Granola to your customer interview workflow lets you stay present with participants while your device captures audio and transcribes in the background.

---

> **TL;DR:** Adding Granola to your customer interview workflow lets you stay present with participants while your device captures audio and transcribes in the background. No visible participant joins your call. After each session, you enhance rough notes with AI-generated context, then query across weeks of interviews to surface patterns for stakeholders. Setup takes under 5 minutes and works with Zoom, Google Meet, Teams, and any other platform you already use. The Business plan ($14/user/month) includes Slack, HubSpot, Notion, and Zapier connections that push research insights directly into your team's existing tools.

Customer interviews surface a well-documented tension. The best insights come from follow-up questions you can only ask if you're listening, but you can't listen properly while simultaneously capturing verbatim quotes in a Google Doc. So you end up with either shallow notes from a fully present conversation, or rich notes from an interview where you kept your eyes on the screen instead of the participant.

Granola resolves this by capturing device audio and transcribing in real time in the background, while you take the strategic notes only you can write. When the interview ends, you click "Enhance Notes" and Granola uses your rough bullets to structure a complete document from the transcript. Your judgment shapes what matters. The AI fills in the details.

This guide walks through the full workflow: setup, running interviews, processing, consent, stakeholder sharing, and the integrations that connect your research output to the tools your team already uses.

## Why note-taking and listening work against each other

Capturing an interview and capturing it well are not the same thing. A full transcript of every word spoken isn't automatically what makes a customer interview valuable to your roadmap. What matters is structured, retrievable documentation of the signals that change how you think about the product.

Good synthesis starts in the interview itself, when you're sharp enough to notice the offhand comment that contradicts your assumptions and sharp enough to ask the follow-up question. You can't do that while typing furiously. As the [Prodify Group's guide to customer discovery](https://www.prodify.group/blog/a-product-managers-guide-to-customer-discovery) notes, verbatim customer quotes carry significant weight when connecting insights back to product decisions, which is exactly why capture quality matters so much.

### The divided attention problem

Divided attention during an interview doesn't just hurt note quality. It changes participant behavior. Participants who notice an interviewer typing may simplify their answers, wait for cues that they've said enough, or skip the meandering tangential story that often contains the most valuable signal.

[NNG's informed consent guidance](https://www.nngroup.com/articles/informed-consent/) makes a related point: participant comfort directly affects the quality of data you collect. When participants feel observed or processed, they perform rather than share.

Granola doesn't join your call as a visible participant. It captures device audio directly, so participants see the same call interface they always see. For discovery research, where participant comfort directly affects what gets shared, this architectural choice matters.

### The real cost of post-interview synthesis

The [ProductHQ guide on effective user interviews](https://producthq.org/agile/product-management/effective-user-interviews/) identifies synthesis as one of the most time-intensive parts of research operations. Turning raw session notes into actionable insights, organizing them for stakeholder review, and finding patterns across multiple interviews takes hours most research PMs don't have.

The problem compounds when insights are scattered. Stakeholders ask "Is this just one customer or a pattern?" and you know you've heard it before, but you can't cite exactly when or from whom without reviewing five separate Notion pages. Granola's folder-level queries address this directly by letting you search across all past interviews simultaneously, with citations from specific conversations.

## Setting up Granola for your research workflow

Setup is straightforward. You don't need to configure a separate Zoom integration or any platform-specific connection because Granola works through your device's audio rather than by joining calls as a participant.

### Initial setup and calendar connection

The [Granola quickstart guide](https://www.granola.ai/docs/docs/101/gettingstarted/quickstart) covers the full process:

1. **Download the app** for Mac, Windows, or iPhone from granola.ai.
1. **Sign in** with your Google or Microsoft account. Granola asks for permission to read your calendar so it can detect upcoming meetings automatically.
1. **Grant audio permissions.** On macOS, approve microphone and system audio access. On Windows, these permissions are granted automatically.
1. **Verify your calendar.** Check that the meetings you want to transcribe appear in Settings under "Coming Up."

For interviews not on your calendar, including ad-hoc calls or Slack huddles, use the "New Note" button to start transcription manually. The [Granola Slack Huddles guide](https://www.granola.ai/blog/how-to-use-granola-slack-huddles) walks through this for informal sessions.

### Configuring templates for discovery interviews

Granola includes 29+ templates for different meeting types. For customer research, the customer discovery call template extracts pain points, feature requests, and follow-up actions automatically. You can customize any template to match your discussion guide structure, which means your enhanced notes arrive in the same format you'd use to populate a synthesis deck.

The [Recipes feature](https://docs.granola.ai/help-center/getting-more-from-your-notes/recipes) extends this further. Pre-built AI prompts let you turn interview content into specific outputs: feature request documents, structured briefs, or coaching notes on your own interviewing technique. One Granola user described this flexibility directly:

> "Most tools force you into a set number of meeting types/outline structures, but, while Granola offers a core set for you to adopt, they have made it super easy and flexible to create your own for whatever purpose you have." - [Andy C. on G2](https://g2.com/products/granola/reviews/granola-review-10309657)

### Granola integrations for your research stack

Granola's Business plan integrations cover the tools research teams actually use. Here's a quick reference before diving into each:

<!-- rawHtml block html0 -->
<table>
<colgroup>
<col style="width: 33%" />
<col style="width: 34%" />
<col style="width: 33%" />
</colgroup>
<thead>
<tr>
<th>Integration</th>
<th>What it does</th>
<th>Plan required</th>
</tr>
</thead>
<tbody>
<tr>
<td>Slack</td>
<td>Post enhanced notes to channels; auto-post folder summaries</td>
<td>Business ($14/month)</td>
</tr>
<tr>
<td>HubSpot</td>
<td>Attach notes to Contact records via email matching</td>
<td>Business ($14/month)</td>
</tr>
<tr>
<td>Notion</td>
<td>Create database rows from interview templates</td>
<td>Business ($14/month)</td>
</tr>
<tr>
<td>Zapier</td>
<td>Connect to 8,000+ tools with custom automations</td>
<td>Business ($14/month)</td>
</tr>
<tr>
<td>MCP (Model Context Protocol)</td>
<td>Query notes from Claude, ChatGPT, Cursor without switching apps</td>
<td>All plans</td>
</tr>
</tbody>
</table>

The integrations change log tracks recent additions, including the Outlook calendar connection that launched in early 2026. We cover each integration in detail later in this guide.

## How to run interviews with Granola

The workflow has three distinct phases, and each one changes how you spend your time.

### Before the interview starts

1. **Prepare your consent language.** Draft a brief statement you'll deliver at the start of every interview. Something as simple as: "I'm using an [AI notepad](https://www.granola.ai/ai-note-taker) to help me capture this conversation. It captures device audio and transcribes in real time. No audio files are stored. Is that okay with you?" This keeps the decision in your hands rather than being automated.
1. **Test your audio setup.** Before your first interview, run a test call with a colleague and confirm that gray transcript bubbles appear alongside your own in Granola.
1. **Fill out your profile.** Granola uses context about your role and focus areas to generate more relevant enhanced notes. A few minutes in settings here pays off across every interview.

Because capture happens at the device level, you can use Granola across Zoom, Google Meet, Teams, WebEx, Slack huddles, and phone calls. The [guide to Granola with Zoom](https://www.granola.ai/blog/how-to-use-granola-with-zoom) explains the cross-platform workflow in more detail.

### During the interview

Your job during the interview is to stay in the conversation. Granola handles the transcript. Your notes should capture what only you can observe: the hesitation before an answer, the moment a participant contradicts something they said earlier, the phrase that sounds rehearsed and therefore probably matters less than what comes before it.

Practically, this means:

- **Jot strategic bullets.** Write "pricing friction" when the topic comes up and Granola will find every related comment in the transcript and add context around your bullet.
- **Leave blank space where you're confident.** If a section of the conversation is straightforward, you don't need notes. Granola will produce a reasonable summary from the transcript alone.
- **Use CMD+J for live questions.** If you want a quick summary of what's been covered so far, or need to check something from a previous interview mid-call, the [Granola Chat feature](https://docs.granola.ai/help-center/getting-more-from-your-notes/granola-chat-dictation-vs-transcription) lets you query without leaving the notepad.

### Post-interview processing

When the interview ends, click "Enhance Notes." Granola merges your typed bullets (shown in black) with AI-generated context from the transcript (shown in gray). This color distinction matters: you can see exactly what came from you versus what the AI added, which makes it easy to edit, delete, or verify anything before sharing.

The review process is where you catch errors. Check proper nouns, product names, and any quotes you plan to use in stakeholder presentations. Proper nouns and technical terms are the most common transcription failure points, so a quick Ctrl+F pass for every key name catches most issues before notes leave your hands.

If you want to verify where a specific note came from, click the "Zoom In" button on any section. Granola shows you the exact transcript quotes that generated it. This is particularly useful when a stakeholder challenges a finding, because you can point to the specific source rather than defending the interpretation.

## Ethical considerations and consent

Consent shapes the quality of data you collect. Participants who understand how their information will be used share more openly and more accurately.

Granola's architecture simplifies data handling: audio is captured and transcribed in real time, then deleted. Only text transcripts are retained. The [Security, Privacy & Data FAQs](https://docs.granola.ai/help-center/consent-security-privacy/security-privacy-data-faqs) and [transcript auto-deletion documentation](https://docs.granola.ai/help-center/consent-security-privacy/transcript-auto-deletion) cover the specifics. Granola holds SOC 2 Type 2 certification, and AI providers are contractually prohibited from training on your data.

For teams on Enterprise plans, org-wide auto-deletion periods can be configured centrally, which simplifies compliance documentation considerably.

### Keeping participants comfortable

Disclosure doesn't have to be complicated. The [User Interviews guide on consent forms](https://www.userinterviews.com/blog/how-to-write-research-participant-consent-forms) recommends covering the key elements: purpose of capture, how data will be used, how long it will be retained, and how participants can withdraw. You can address all of this in a 30-second statement at the start of the call.

Granola includes an [in-meeting notice feature for Google Meet](https://docs.granola.ai/help-center/consent-security-privacy/in-meeting-notice-google-meet) that can automatically send a message to participants when you start transcribing. For research contexts, you may prefer to handle this verbally since an automated message can feel clinical in a discovery conversation, but the option is there for teams that want a consistent process.

If a participant shares something sensitive mid-interview and asks you not to use it, that request supersedes whatever they agreed to at the start. Build a habit of reviewing your enhanced notes with this in mind before sharing them. There's no automated recording announcement to disrupt the flow of conversation, which means the responsibility for clear, upfront consent sits with you.

This reduces the performance effect that often comes when someone notices they're being formally documented. For research on sensitive topics, or with internal stakeholders who are uncomfortable being transcribed, participant comfort during capture matters.

> "I find it very easy to use, which is very important to me. I appreciate the very simple and clean usage without many unnecessary features. Additionally, I like that recording in the background is possible without a bot." - [Johannes E. on G2](https://g2.com/products/granola/reviews/granola-review-12404902)

## Connecting Granola to Slack, HubSpot, and your stack

Granola's integrations on the Business plan ($14/user/month) connect your research output to the tools where your team actually makes decisions.

### Granola Slack integration

The [Slack integration](https://www.granola.ai/docs/docs/integrations/Slack-Integration) lets you post enhanced notes directly to any Slack channel without leaving Granola. After an interview, click Share, select Slack, and choose the destination channel. For research teams, this means insights reach engineers and designers immediately rather than sitting in a document nobody checks.

For recurring research series, you can configure a shared folder to auto-post summaries to a specific channel as each note is added. This is particularly useful for ongoing discovery sprints where stakeholders want to follow along without attending every session. The [Slack integration help documentation](https://docs.granola.ai/help-center/sharing/integrations/slack) covers the setup steps, including the Google Workspace or Microsoft 365 account requirement.

### Granola HubSpot integration

For research teams who log customer conversations in HubSpot, the [HubSpot integration](https://www.granola.ai/blog/granola-hubspot-integration-crm-updates) matches your enhanced notes to Contact records using attendee email addresses from the calendar invite. After an interview, click Share, select HubSpot, and Granola suggests the relevant contact. The note attaches to their profile in a single click.

This means your research conversations don't live only in a research tool. Account managers and sales teams can see what a customer said in a discovery session months ago, which prevents the repetitive questioning that erodes participant trust. The [HubSpot integration setup documentation](https://docs.granola.ai/help-center/sharing/integrations/hub-spot) covers the authorization flow.

For automated HubSpot updates across a folder of interviews, the Zapier connection offers more flexibility than the native integration.

### Granola Zoom and other platforms

Because Granola captures audio at the device level, [it works with Zoom](https://www.granola.ai/blog/how-to-use-granola-with-zoom) the same way it works with Google Meet, Teams, WebEx, or any other platform. There's no account connection or per-platform configuration. You open Granola, join your call, and transcription starts.

This also means Granola works for research contexts that aren't traditional video calls: phone interviews, in-person sessions with your laptop open, or participant walkthroughs over a screen share. This platform-agnostic approach means you don't need to configure separate integrations for each call platform you use.

> "I appreciate how Granola's features align with my workflow, especially the ability to interact with and query chat and note data... The ease of initial setup for Granola was also impressive." - [Catherine S. on G2](https://g2.com/products/granola/reviews/granola-review-11755500)

### Zapier and extended integrations

The [Zapier integration](https://www.granola.ai/blog/granola-integrations-hubspot-slack-notion-zapier) connects Granola to 8,000+ tools using a "New Note Added to Folder" trigger. For research workflows, this opens up several automation patterns:

- **Notion research database:** Create a new row in your research database each time an interview note is completed, with fields mapped from your template.
- **Asana or Linear tasks:** Automatically create follow-up tasks when action items appear in interview notes.
- **Google Sheets synthesis tracker:** Append interview summaries to a running sheet your team uses for pattern tracking.

The [Zapier Granola workflow guide](https://zapier.com/blog/granola-ai/) covers the setup patterns in detail. The native Notion integration creates database rows (not standalone pages), which makes filtering and relating research entries easier than a flat document structure.

## Building a searchable research repository

The value of capturing interviews well compounds over time. Six months of well-organized discovery sessions become a repository that answers stakeholder questions with citations, surfaces patterns you didn't notice at the time, and survives team transitions.

### Organizing interviews so insights survive

Use Granola's shared folders to organize by research type, customer segment, or product area. A folder called "Enterprise discovery Q1 2026" lets anyone on the team access every interview from that sprint, filtered by context. The [People & Companies views](https://www.granola.ai/blog/three-new-features-customer-relationships) organize notes around individual contacts and organizations, so you can pull up everything you've learned about a specific customer before a renewal call or a follow-up interview.

For teams on Business plans, shared folders mean research insights don't live only in your account. Engineers and designers can access the same repository, which raises the likelihood that findings influence what gets built.

### Cross-interview analysis for stakeholders

The most common stakeholder objection to qualitative research is "How many customers said that?" The honest answer is usually "I heard it in three separate interviews," but without a searchable repository you're relying on memory to make that case.

Granola's folder-level queries let you search across all interviews simultaneously. You can ask "What objections came up most often about pricing?" and get an AI-generated summary with citations from specific conversations. This transforms individual interviews from isolated data points into a pattern you can present with sources.

When a stakeholder asks whether enterprise customers are hesitant about SSO, you can answer by querying the folder rather than scheduling another round of interviews to find something you already know.

The [integration checklist and rollout guide](https://www.granola.ai/blog/granola-integration-checklist-setup-testing-team-rollout) covers the team setup process for Business and Enterprise plans, including how to structure folders and permissions so that research output is accessible without being unprotected.

## Checklist for successful interview capture

Run through this before your first session and adapt it based on what your workflow needs.

**Pre-interview**

- Granola downloaded and calendar connected (Google or Microsoft)
- Audio permissions granted (microphone and system audio on macOS)
- Meeting visible in Granola's "Coming Up" view, or manual note created for non-calendar sessions
- Discussion guide loaded into Granola as a template or typed into the notepad
- Consent language drafted and ready to deliver verbally at the start of the call
- Audio tested with a colleague before the first critical session
- HubSpot or Notion connection configured if you're syncing notes to those tools (Business plan)
- Participant information reviewed so your profile context is accurate

**During the interview**

- Consent delivered at the start of the call
- Granola active and transcribing (check for active transcript indicators)
- Strategic notes taken on key moments, not comprehensive documentation
- Follow-up questions asked based on what you're hearing, not what you're typing
- CMD+J used if you need a quick mid-session summary or cross-reference
- Participant comfort monitored throughout

**Post-interview**

- "Enhance Notes" clicked immediately after the session
- Gray AI additions reviewed and edited for accuracy
- Proper nouns, product names, and key quotes verified against the transcript using the "Zoom In" feature
- Template applied if not already active
- Note filed in the appropriate research folder
- Shared to Slack channel or HubSpot contact if required by your team's process
- Participant consent documented and on file
- Anything the participant asked not to be used removed before sharing

## Try Granola for free

[Download](https://www.granola.ai/) the Mac, Windows, or iPhone app, connect your calendar, and run your next customer interview to see the workflow in action. The [pricing plans overview](https://docs.granola.ai/help-center/update-to-granola-pricing-plans) covers what's included on the Basic plan versus Business ($14/user/month) and Enterprise ($35+/user/month). Slack, HubSpot, Notion, and Zapier connections require a Business plan.

## FAQs

**Does Granola work for in-person interviews if participants aren't on video?** Yes. Granola captures your device's microphone audio, so in-person sessions with your laptop open will transcribe participants in the room. Audio quality depends on proximity to the microphone and background noise levels.

**Does Granola require consent from participants before transcribing?** Granola doesn't enforce consent on your behalf, so this is your responsibility to handle. Most research PMs address it verbally at the start of the call. Granola's [in-meeting notice for Google Meet](https://docs.granola.ai/help-center/consent-security-privacy/in-meeting-notice-google-meet) can also send an automated message to participants as a straightforward way to set expectations.

**Can I share notes with stakeholders who don't have a Granola account?** Yes. You can generate a shareable link for any note. Guests can view the summary, hover for context, and ask questions via the AI chat without accessing the full transcript. Sharing links can be disabled at any time in Settings.

**Does Granola store audio from my interviews?** No. Granola captures device audio and transcribes in real time, then deletes the audio. Only text transcripts are retained. This is covered in detail in the [Security, Privacy & Data FAQs](https://docs.granola.ai/help-center/consent-security-privacy/security-privacy-data-faqs).

**What happens to research notes if someone leaves the team?** On Business and Enterprise plans, notes in shared folders remain accessible to the team. The research repository persists beyond any individual's account, which directly addresses the institutional knowledge problem that comes with team transitions.

**Is MCP included on the Basic plan?** Yes. MCP is available on all plans, including Basic. The Basic plan limits MCP access to the last 30 days of notes and doesn't include transcript access. Business and Enterprise plans provide full history and full transcript access via MCP.

**Can I use Granola with platforms other than Zoom?** Yes. Granola works with Zoom, Google Meet, Teams, WebEx, Slack huddles, phone calls, and any other audio source your device can hear. No platform-specific integration is required.

## Key terms glossary

**Bot-free capture:** Transcription that works by processing your device's audio rather than joining a call as a visible participant. Participants see no additional entry in the participant list and receive no automated transcription announcement.

**Enhanced notes:** The output produced when you click "Enhance Notes" after an interview. Your original notes appear in black. AI additions from the transcript appear in gray. Both are editable.

**Folder-level query:** A search run across all notes within a Granola folder simultaneously. Returns a synthesized answer with citations from specific meetings.

**Recipes:** Pre-built AI prompts in Granola that process meeting content in specific ways, for example extracting feature requests from customer calls, turning conversations into structured briefs, or generating follow-up emails.

**MCP (Model Context Protocol):** A standard that allows compatible AI tools (such as Claude, ChatGPT, and Cursor) to access your Granola meeting notes directly, so you can query past interviews without switching to the Granola app.

**People & Companies views:** Granola views that organize your notes around individual contacts and organizations, grouping every conversation with a specific person or company into a single browsable timeline.

**Transcript auto-deletion:** A configurable Enterprise setting that automatically deletes meeting transcripts after a defined retention period, helping organizations meet data compliance requirements without manual cleanup.
