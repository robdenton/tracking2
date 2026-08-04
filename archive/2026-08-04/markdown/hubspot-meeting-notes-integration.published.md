# HubSpot meeting notes integration: Syncing calls to your CRM automatically

> Archived 2026-08-04T09:37:03.827Z from Sanity oy7f1h9b/production
> _id `a2d3e10b-6b6e-4d15-ae1a-0490dcccdf3f` · _rev `8np06N0Lj92m6KMwkWw7Rf` · updated 2026-06-28T12:38:21Z
> slug `hubspot-meeting-notes-integration` · published

**Summary:** HubSpot meeting notes integration syncs AI enhanced call summaries to your CRM automatically without bots or manual data entry.

---

> **TL;DR:** Manual HubSpot updates drain time that teams don't have. Granola is an AI notepad that captures your device audio, enhances your rough notes with transcript context, and automatically syncs structured meeting summaries, action items, and deal context directly to the right HubSpot contact, company, and deal records. The HubSpot integration is available on Granola's Business plan at $14/user/month, and setup takes under 5 minutes to configure.

Back-to-back meetings and manual CRM updates pull in opposite directions: the more time you spend typing call notes into HubSpot, the less time you have for the work those calls were meant to drive. You jot what matters during the call, Granola enhances your notes with transcript context when it ends, and the HubSpot integration pushes that intelligence directly to the right records without manual copying, visible bots, or lost context.

## The hidden cost of manual CRM updates

### The toll of manual CRM updates

Anyone running customer calls faces the same tension: the more you focus on typing into HubSpot, the less you're actually listening. Stay fully present in the conversation, and your CRM ends up with incomplete notes, vague summaries, or nothing at all. That gap compounds fast, turning missed details into inaccurate forecasts and lost deals.

The cost isn't just time. It's the quality of what ends up in your CRM. Notes captured from memory after a call often miss the specific language a prospect used, the commitment they made, and the objection they raised. That context is what separates accurate forecasting from guesswork.

### Unreliable CRM data & insights

When CRM records depend on manual entry, their accuracy reflects how much time reps had after each call, not what actually happened in the meeting. Teams end up making pipeline decisions on incomplete data, and when someone leaves, the institutional knowledge they carried about each account leaves with them.

HubSpot's native [Meeting Notetaker](https://knowledge.hubspot.com/meetings-tool/record-and-take-notes-in-meetings-with-meeting-notetaker) addresses part of this problem but introduces friction of its own. According to HubSpot's own documentation, as soon as the Zoom host joins a meeting with the native notetaker active, they receive a pop-up requesting recording permission, and once approved, an audio message plays stating that the call is being captured. For investor pitches, executive recruiting calls, or M&A discussions, that announcement changes the dynamic immediately.

The comparison below shows how the two approaches differ:

<!-- rawHtml block 6393c47b50c0 -->
<table style="width:100%; table-layout:fixed; border-collapse:collapse;">
  <thead>
    <tr>
      <th style="width:28%; padding:12px; text-align:left; white-space:normal;">Factor</th>
      <th style="width:36%; padding:12px; text-align:left; white-space:normal;">Manual CRM Entry</th>
      <th style="width:36%; padding:12px; text-align:left; white-space:normal;">Granola + HubSpot</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding:12px;">Bot or announcement</td>
      <td style="padding:12px;">None</td>
      <td style="padding:12px;">None</td>
    </tr>
    <tr>
      <td style="padding:12px;">Context accuracy</td>
      <td style="padding:12px;">Memory-dependent</td>
      <td style="padding:12px;">Transcript-backed</td>
    </tr>
    <tr>
      <td style="padding:12px;">Action item capture</td>
      <td style="padding:12px;">Manual</td>
      <td style="padding:12px;">Extracted automatically</td>
    </tr>
    <tr>
      <td style="padding:12px;">Sync to deal records</td>
      <td style="padding:12px;">Manual</td>
      <td style="padding:12px;">Automatic</td>
    </tr>
  </tbody>
</table>

## How Granola syncs meeting notes to HubSpot

**What you'll achieve:** A fully automated HubSpot sync that populates deal records without manual typing, while preserving your control over what reaches the CRM and when.

### Automatic sync without disrupting calls

Rather than deploying a bot into your Zoom, Meet, or Teams session, Granola [captures audio from your device](https://www.granola.ai/blog/granola-hubspot-integration-crm-updates), transcribing in real time through your microphone and system audio. No participant list update. No recording announcement. Nobody in the call sees anything different.

This matters most for the conversations where accurate documentation is also the most sensitive: VC pitch calls, board meetings, executive candidate interviews, and M&A discussions. As covered in the [Teams bot-free notes overview](https://www.granola.ai/blog/granola-microsoft-teams-bot-free-notes), notes exist only for you until you choose to share them, giving you complete control over what reaches your CRM and when.

### Core meeting data Granola captures

The [human-in-the-loop enhancement model](https://www.granola.ai/blog/granola-pricing-plans-features-roi) works like this: during the meeting, you jot rough notes in the Granola notepad, anything from "Pricing concerns" to "Follow up on legal review." When the call ends, you click "Enhance notes." Granola finds every related discussion in the transcript and adds supporting context. Your notes stay in black. AI additions appear in gray. You delete, edit, or approve before anything leaves Granola.

This model means generic summaries don't reach your CRM. What syncs reflects your judgment about what mattered in the call.

> "I love that I can just be 100% present in meetings and not worry about taking notes, I can just write down things I really care about and let Granola take care of the rest." - [Jess M. on G2](https://g2.com/products/granola/reviews/granola-review-9856422)

### HubSpot CRM note placement

Granola's [HubSpot integration documentation](https://docs.granola.ai/help-center/sharing/integrations/hub-spot) explains that you can configure whether Granola creates a Meeting or a Note in HubSpot when a sync occurs, with Meeting as the default. Both appear as engagement activities on the Contact timeline, not as static field entries, which means they show up in the activity feed your sales team already reviews. You can associate each sync with a Contact, Company, or Deal record, and Granola surfaces the right matches automatically based on attendee email addresses from your calendar invite.

## Configure HubSpot for automatic sync

**Prerequisites:** A Granola Business plan, a HubSpot account, and a connected Google Workspace or Microsoft 365 calendar.

### Activate HubSpot CRM sync

The HubSpot integration is available on Granola's Business plan at [$14/user/month](https://www.granola.ai/blog/granola-pricing-plans-features-roi). CRM integrations are available on Business and Enterprise plans. Once you're on Business, setup follows these steps:

1. **Open Granola** and navigate to Settings, then select Integrations.
1. **Click Connect** next to HubSpot.
1. **Log in to HubSpot** in the browser window that opens, authorize permissions, and grant access.
1. **Return to Granola.** The integration status updates to connected. For individual notes, click Share in the top right of any note, select HubSpot, and Granola suggests Contact records based on attendee emails from the calendar invite. Find the full step-by-step instructions in [Granola's HubSpot Help Center](https://help.granola.ai/article/hub-spot).

### Set up reliable HubSpot data sync

For teams running high-volume pipelines, folder-level auto-sync removes the manual step entirely. In any Granola folder (for example, a "Sales Calls" or "Customer Research" folder), click the Integration Settings button and turn on the HubSpot option. From that point forward, any note you add to the folder automatically syncs to matching Contact, Company, or Deal records in HubSpot based on the options you select. Granola's [integration documentation](https://docs.granola.ai/help-center/sharing/integrations/hub-spot) calls this auto folder triggering, and it removes the need for reps to remember to push notes manually after every call.

You can also configure workspace scoping, which applies the integration at the team workspace level rather than being tied to individual domain settings.

### Auto-link calls to CRM deals & contacts

Granola matches meeting attendees to HubSpot records by email address from the calendar invite. If the attendee's email exists as a Contact, Company, or Deal in HubSpot, Granola surfaces that record immediately when you share. If no match exists, Granola does not create a new contact automatically and won't attach the note until a matching record is present. This prevents accidental creation of duplicate or incomplete CRM entries.

For this matching to work reliably, you'll need to [connect your calendar](https://docs.granola.ai/help-center/getting-started/syncing-your-calendars) so that attendee data surfaces correctly. Granola supports Google Workspace and Microsoft 365 accounts for [calendar sync](https://help.granola.ai/article/calendar-sync). Granola doesn't support personal Gmail or [Outlook.com](http://Outlook.com) accounts for the HubSpot integration. If you use an unsupported calendar system, attendee matching may not function properly, and you'll need to manually select HubSpot records when sharing notes.

## What syncs to HubSpot automatically

### Meeting summaries sync automatically

When Granola syncs a note to HubSpot, the enhanced summary appears as an engagement activity on the Contact timeline. Rather than a raw transcript dump, the synced content reflects the structure of your enhanced notes: key discussion points organized by topic, the context your transcript provided, and the edits you approved before syncing. Your original notes appear alongside AI-added context, and you control what stays before the sync occurs. The result is a readable, structured record that a colleague can open two weeks later and immediately understand what happened in that call.

> "Granola nails exactly what I need: clean, reliable meeting transcripts and smart follow-up summaries without any fluff. I use it for nearly every call to stay focused on the conversation instead of scribbling notes. The follow-up action items are especially useful. Huge time saver." - [Verified user on G2](https://g2.com/products/granola/reviews/granola-review-11289286)

### Meeting commitments sync to HubSpot

Action items are one of the most valuable outputs Granola pushes to HubSpot. When you jot "Follow up with pricing proposal by Friday" in the notepad, Granola includes that commitment in the enhanced notes and carries it into the HubSpot engagement record. Sales teams using this workflow get a CRM record that functions as an actual deal management tool, not just an archive of what was discussed.

For teams that want action items to trigger tasks in project management tools or generate automatic follow-up sequences, [Granola's Zapier integration](https://docs.granola.ai/help-center/sharing/integrations/zapier) connects to over 8,000 apps to extend the workflow further.

### Deal status updates sync automatically

When you associate a Granola note with a Deal record, the meeting activity appears on the deal timeline alongside other engagements, such as emails and calls. This gives everyone with access to the deal complete visibility into what was discussed and committed to, without anyone needing to type a single line in HubSpot after the call.

### Contact details sync to HubSpot CRM

Conversations frequently surface new context about stakeholders: budget authority, timeline shifts, and new decision-makers joining the process. Because Granola captures the full transcript context and structures your notes around it, that kind of detail ends up in the enhanced summary rather than being forgotten between calls. When that note syncs to the Contact record, your CRM reflects the current state of the relationship rather than just the initial qualification data.

## Granola for your most critical meetings

### Automate meeting notes in HubSpot

You can configure any folder in Granola, 'Client Calls,' 'Partner Meetings,' 'Research Interviews,' or whatever maps to your workflow, with HubSpot auto-sync enabled. Every meeting added to that folder pushes automatically to the matching Contact, Company, or Deal record. You stay focused on the conversation, jot down what matters, and finish the call with an enhanced note ready to review before it reaches the CRM.

### Capture customer feedback for CRM

Staying present to ask good follow-up questions requires full attention, but the specific language someone uses in a meeting matters enormously for CRM accuracy. Granola captures that language in the transcript, pulls it into the enhanced notes based on what you flagged during the call, and syncs it to the Contact record in HubSpot. The objections they raised, the commitments they made, and the specific concerns they voiced become searchable records tied directly to the deals your team manages, ensuring pipeline decisions rest on what actually happened in the call rather than on post-call memory.

### Capture decisions and context from key meetings

Strategy sessions, account reviews, and escalation calls can produce consequential decisions with minimal documentation. When the rationale behind a key commitment or exception lives only in one person's memory, it disappears the moment they change roles or move on. Granola captures that decision context in the transcript and structures it in the enhanced notes, creating a durable record that remains tied to the correct HubSpot record through team changes. This is where the value compounds over time.

## Private notes for sensitive conversations

Beyond standard meeting workflows, you may also need to document sensitive conversations that should never be shared with a CRM. Executive sponsor calls, NDA-covered deal negotiations, and partnership discussions often carry context that the full team shouldn't see in a shared CRM activity feed.

### Preventing sensitive data in HubSpot

Granola handles this with privacy controls: when you mark a note as Private, you can't share it to HubSpot until you actively change that setting. Folder-level auto-sync only applies to notes you choose to include in configured folders, so meetings you keep outside those folders never trigger an automatic push.

For teams that want granular control over how Granola communicates its presence during calls, the [in-meeting notice documentation](https://docs.granola.ai/help-center/consent-security-privacy/in-meeting-notice-google-meet) and [automatic in-chat messaging settings](https://docs.granola.ai/help-center/consent-security-privacy/automatic-in-chat-entrance-messaging) provide options for different meeting platforms.

Granola is [SOC 2 Type 2 compliant](https://www.granola.ai/updates/granola-is-soc2-type-2-compliant) and GDPR compliant. Granola transcribes audio in real time and deletes it immediately. Granola doesn't store audio files anywhere, and contractually prohibits third-party AI providers from training on your data.

> "...background without joining as a bot or recording audio means I can actually be present in conversations. No awkward 'there's a bot in this call' energy." - [Aprielle D. on G2](https://g2.com/products/granola/reviews/granola-review-12552067)

### Final review before HubSpot sync

The human-in-the-loop model gives you one more layer of control before anything reaches HubSpot. After clicking "Enhance notes," you review the structured output, remove anything that shouldn't live in the CRM, adjust framing if needed, and then sync. The note only moves to HubSpot when you're ready. As Granola's [HubSpot integration blog post](https://www.granola.ai/blog/granola-hubspot-integration-crm-updates) explains, this review step is where human judgment matters most.

> "With Granola I don't have to worry anymore about taking meeting notes, I can just write down things I really care about and let Granola take care of the rest. Love that I can easily share my notes with my colleagues as well, and that we can all chat with the meeting transcript so everyone can see the full context of the meeting, even if they weren't there." - [Jess M. on G2](https://g2.com/products/granola/reviews/granola-review-9856422)

## Solving common HubSpot integration issues

### Using Granola with different HubSpot plans

The HubSpot integration requires Granola's [Business plan at $14/user/month](https://www.granola.ai/blog/granola-pricing-plans-features-roi) to access CRM integrations. CRM integrations are available on Business and Enterprise plans. Additionally, HubSpot's free CRM tier may not include all the features Granola integrates with for meeting sync, so you may need a paid HubSpot plan as well.

### Sync historical call notes

Auto-sync only affects notes you add to a folder after enabling the HubSpot integration on that folder. Granola doesn't sync notes that already existed in the folder before you enabled the integration. To push older notes, open each note individually, click the HubSpot button in the top right, and share it manually. Per Granola's [integration documentation](https://docs.granola.ai/help-center/sharing/integrations/hub-spot), this manual path gives you full control over which historical conversations reach your CRM.

### Sync notes to new HubSpot leads

When a meeting attendee's email doesn't exist in HubSpot, Granola does not create a new contact automatically. The note simply won't attach to any record until a matching contact is created in HubSpot. The practical workflow is to create the Contact record in HubSpot first, then sync the Granola note once the match exists. Granola's Zapier connection supports this kind of pre-sync automation for teams running structured outbound pipelines.

### HubSpot setup: Under 5 minutes

Setup speed is a key advantage. Download the desktop app, [connect your calendar](https://docs.granola.ai/help-center/signing-in-and-connecting-your-calendar), run your first meeting, enhance the notes, and connect HubSpot from the integrations menu. The full configuration, including HubSpot authorization and folder auto-sync setup, typically takes under 5 minutes. There's no training period, no multi-week onboarding, and no configuration steps that block first-value on day one.

> "Easy to set up and runs quietly in the background. Accurate discussion summaries with the backup transcript available." - [Joe M. on G2](https://g2.com/products/granola/reviews/granola-review-11055567)

Get a broader view of how the notepad works in this [co-founder walkthrough](https://youtube.com/watch?v=i38vvqAca8M). If you're still manually updating HubSpot after every call, the integration removes that entirely. At $14/user/month on Granola's Business plan, that works out to roughly $1.40 per meeting for 10 meetings per week.

[Download](https://www.granola.ai/) Granola for free, then connect your HubSpot account from Settings > Integrations and run your next call to see the sync in action. Upgrade to Business when you're ready to eliminate manual CRM entry.

## FAQs

**Does the HubSpot integration require a paid Granola plan?**

Yes. Granola offers the HubSpot integration on the Business plan at $14/user/month and Enterprise plan starting at $35/user/month. CRM integrations are available on Business and Enterprise plans.

**What happens if a meeting attendee isn't in my HubSpot account?**

Granola matches attendees to HubSpot records by email address. If no matching Contact, Company, or Deal record exists, Granola doesn't create a new one and won't attach the note until you create a matching contact in HubSpot first.

**Can I stop specific meetings from auto-syncing to HubSpot?**

Yes. When you mark notes as Private in Granola, you can't share them to HubSpot until you change that setting. Folder auto-sync only affects notes you add to folders where you've enabled the HubSpot integration, so keeping sensitive meetings in separate folders or marking them Private prevents any automatic sync.

**Does Granola store the audio from my meetings?**

No. Granola transcribes using device audio in real time and deletes the audio immediately. Granola doesn't store audio files anywhere, and this applies across all Granola plans, not just paid tiers.

## Key terms glossary

**Device audio capture:** How Granola [transcribes meetings](https://www.granola.ai/ai-meeting-assistant) by accessing your computer's microphone and system audio directly, without a bot joining the call as a visible participant. Audio is deleted immediately after transcription.

**Human-in-the-loop enhancement:** The workflow where you jot rough notes during a meeting and then click "Enhance notes" after it ends. Granola fills in supporting context from the transcript while you control what stays, what you edit, and what syncs to your CRM.

**Auto folder triggering:** A HubSpot integration setting that automatically syncs any note you add to a designated folder to matching Contact, Company, or Deal records in HubSpot, removing the need for manual sharing after each call.

**Workspace scoping:** A configuration option in Granola's HubSpot integration that applies the CRM sync at the team workspace level rather than by individual domain, providing control over which folders trigger HubSpot activity.
