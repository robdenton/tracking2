# How to record a meeting and have AI summarize it: Zoom, Teams, Google Meet, and in-person

> Archived 2026-08-04T09:37:03.827Z from Sanity oy7f1h9b/production
> _id `b7aa0e2d-7083-4f53-924c-c424f5494b38` · _rev `iVINBqqr1L2dmaacGVCaxl` · updated 2026-06-19T06:29:36Z
> slug `how-to-record-a-meeting-and-have-ai-summarize-it-zoom-teams-google-meet-and-in-person` · published

**Summary:** Record a meeting and have AI summarize it across Zoom, Teams, Google Meet, and in-person with botless desktop capture and instant notes.

---

> **TL;DR:** Most guides cover one platform. This one covers all four. Capturing meetings and getting AI summaries on Zoom, Teams, or Google Meet means navigating admin permission walls, visible bots, and fragmented archives. A cleaner method uses an AI notepad that captures device audio directly across every platform and in-person, with no visible participant and no audio stored after transcription. Granola is that AI notepad. Setup takes under five minutes, your rough notes guide the AI enhancement, and the output is structured documentation with decisions, action items, and key context from every meeting.

Back-to-back meetings create a real documentation gap. Native capture features on Zoom, Teams, and Google Meet come with friction: Host permission requirements, admin policy blocks, plan paywalls, and notes scattered across different cloud storage systems. Throughout this guide, "recording" refers to what native platforms and bot-based tools do: Granola works differently, transcribing device audio in real time and deleting the source audio once transcription completes. Bot-based AI tools add a visible participant to your call, which changes the dynamic in confidential conversations. There is a cleaner approach, and this guide walks you through all four scenarios.

## How to capture and summarize Zoom meetings

Zoom's native capture works well if you control the meeting. If you don't, or if you want a unified archive outside of Zoom's cloud, the workflow adds friction quickly.

### Step 1: Enable recording in Zoom

Zoom cloud recording requires a Pro, Business, or Enterprise plan. Navigate to Settings, then the Recording tab, and toggle Cloud recording on. This works only if you're the host. Without host status or explicit co-host permissions, participants cannot access native recording features. Zoom also plays a notification to all participants when capture starts. On most plans this announcement cannot be turned off, though Enterprise, Education, and Business accounts of 100 or more licenses can disable it for internal participants at the admin level. Guests always see the notification regardless of plan.

Local recording saves directly to your device and is available on free plans, but it produces separate MP4 and M4A files with no AI processing built in. Zoom's Pro plan includes a limited cloud storage allotment per license. Admins can configure an automatic deletion policy for cloud recordings (for example, 30, 90, or 180 days), but auto-deletion is off by default unless your organization has enabled it. Verify the current limit on Zoom's pricing page before committing to a cloud recording workflow at scale.

### Step 2: Start your meeting capture

Once cloud recording is enabled, click the Record button in the Zoom toolbar and select Record to the Cloud. Zoom creates a folder containing a video file, an audio file, and an optional text transcript when the meeting ends.

### Step 3: Connect your AI tool

This is where most workflows break down. Granola, an AI notepad, offers a different approach that works regardless of your Zoom host status, bypassing these friction points entirely. Instead of joining as a participant, Granola captures your device's system audio and microphone directly, the way your computer hears the call. No bot appears in your Zoom participant list. No announcement plays to other participants. The app works on Mac and Windows, connects to your calendar in under five minutes, and prompts you one minute before a scheduled meeting starts.

### Step 4: Review your AI summary

When the meeting ends, click "Enhance notes" in Granola. Your rough notes (written in black) stay exactly as you typed them. AI-enhanced context from the transcript appears in gray alongside, as explained in the [AI-enhanced notes documentation](https://docs.granola.ai/help-center/taking-notes/ai-enhanced-notes). If you wrote "Pricing objections" as a quick note during the call, the enhanced version pulls every pricing discussion from the transcript. It adds the specific figures mentioned, the person who raised them, and the surrounding context, without replacing your original note.

> "It listens directly from my device audio no bots joining calls and produces clean, structured summaries with decisions, action items, and key points." - [Brahmatheja Reddy M. on G2](https://www.g2.com/products/granola/reviews/granola-review-11932118)

## How to capture and summarize Microsoft Teams meetings

Teams adds a layer of complexity that trips up many users: Capture access is controlled by IT administrators, not meeting participants.

### Step 1: Check admin permissions

[Microsoft's Teams admin documentation](https://learn.microsoft.com/en-us/microsoftteams/meeting-recording) explains that to enable recording, admins must use the `-AllowCloudRecording` parameter in Teams meeting policy, or toggle Meeting recording on in the admin center under Meeting policies. Individual users cannot override this setting. If your IT team has restricted capture, participants have no native workaround.

### Step 2: Start capture in Teams

If your admin policy allows capture, click the three-dot menu in the Teams meeting toolbar and select Start recording. Teams begins capturing and saves the output to the meeting organizer's OneDrive for Business. Teams recordings and transcripts are deleted after 120 days by default, with auto-expiration controlled at the admin level.

### Step 3: Generate your AI summary

Granola captures device audio directly through the operating system rather than interacting with the Teams application, which means it works whether or not your organization's IT policy allows native Teams capture. The [Granola Chat feature](https://help.granola.ai/article/chatting-with-your-meetings) lets you query the meeting content afterward. Ask "What were the action items?" and get instant, source-linked answers drawn from your transcript.

### Admin considerations for Teams

For organizations with strict IT requirements, Granola's architecture is straightforward to justify. Audio is transcribed in real time and then deleted immediately after transcription completes, as detailed in [Granola's security and privacy FAQ](https://docs.granola.ai/help-center/consent-security-privacy/security-privacy-data-faqs). No audio files are retained anywhere. Granola achieved [SOC 2 Type 2 certification](https://granola.ai/updates/granola-is-soc2-type-2-compliant) and is GDPR compliant. For Enterprise accounts, model training is off by default across the entire organization.

## How to capture and summarize Google Meet meetings

Google Meet's native recording is gated behind specific paid plans, which catches many users by surprise.

### Step 1: Verify recording access

Native Google Meet recording requires a qualifying Workspace plan: Business Standard, Business Plus, Enterprise editions, Teaching and Learning Upgrade, Education Plus, Workspace Individual, or Google One plans with 2TB or more storage. Free personal Google accounts cannot record natively. If your team is on Google Workspace Starter or a free account, native recording is unavailable regardless of meeting type.

### Step 2: Capture your Meet session

For eligible accounts, click Video call options during a meeting, select Meeting records, and choose Record the meeting. Google saves the recording to the meeting organizer's My Drive in a Meet Recordings folder. The file becomes available after processing, which can take several minutes after the meeting ends.

### Step 3: Get your AI summary

For users on free Google accounts or those who want a unified meeting archive outside of Google Drive, Granola captures the meeting at the device level. The [Granola Google Meet integration guide](https://www.granola.ai/blog/granola-google-meet-integration-recording-transcription) covers this in detail: Granola works through your system audio, so it functions identically whether you're on a paid Workspace plan or a free personal account. All your Meet, Zoom, and Teams notes live in one searchable place, creating a unified archive rather than fragmented across three separate cloud storage systems.

> "I like that I have the Granola app, and if a meeting is starting, it recognizes that and pops up, so I never forget to click record. It will always be there. If a Google Meet is starting, for example, Granola will pop up and ask if I want it to take notes, which is super helpful. I just click on it, and I never worry about forgetting." - [Anne C. on G2](https://www.g2.com/products/granola/reviews/granola-review-12663832)

## How to capture and summarize in-person meetings

In-person meetings are the scenario most AI tools ignore entirely, and the undocumented knowledge accumulates.

### Why in-person meetings are different

Physical meetings in a coffee shop or a client's office have no video call infrastructure. Bot-based tools cannot join. Native platform recordings do not apply. Most professionals either take hurried notes or record audio on their phones, leaving a gap their documentation archive never fills.

### Step 1: Set up desktop capture

For in-person meetings at a laptop, place your MacBook or Windows device where it can pick up everyone's voices in the room, typically in the center of the table. Open Granola and start taking rough notes as you normally would. Granola uses your device's built-in microphone to capture the conversation, with no additional hardware or setup required.

For smaller meetings or coffee shop conversations, the [Granola iOS app](https://docs.granola.ai/help-center/ios/getting-started) handles in-person capture through your iPhone's microphone, giving you a compact option that is less intrusive than opening a laptop. The app transcribes through the microphone and deletes the source audio after transcription completes, so only your notes and the text transcript persist.

### Step 2: Capture your conversation

During the meeting, jot rough notes the same way you would on paper. Write "decision on Q3 priorities" or "concerns about timeline" as the conversation covers those topics. Granola processes multiple voices from the room. The key difference from a standard voice-memo app is that your written notes guide the AI output, so the final summary reflects your priorities rather than a flat transcription of everything said.

### Step 3: Generate meeting notes

When the conversation ends, click "Enhance notes." Granola produces structured documentation from both your jotted notes and the room audio, covering decisions, action items, and key discussion points organized around what you marked as important.

> "I love that I can use Granola for absolutely everything: every single conversation I have, every course I listen to that doesn't have a transcript, every conversation I'm having with myself while I work, and every conversation with another person. The notes it generates are incredibly helpful on their own, but the real magic is the follow-up discussion in the chat." - [Christel C. on G2](https://www.g2.com/products/granola/reviews/granola-review-12589742)

## Bot-based vs botless capture: What's the difference?

The architecture of how a tool captures your meeting determines almost every practical trade-off, from privacy to meeting dynamics to setup complexity.

### How bot-based tools work

Tools like Otter and Fireflies join your meeting as a virtual participant. A calendar invite triggers the bot, which dials into your video call and appears in the participant list under a name like "Notetaker" or the tool's branded identifier. The bot captures audio and uploads it to vendor cloud servers for processing. The advantages include deep platform integration, audio playback, and conversation analytics built on stored captures. The trade-off is visibility: Participants can see the bot in the list, and many meeting platforms announce capture when it starts, which changes how people communicate in sensitive conversations.

### How botless tools work

Botless tools capture audio at the device level. They do not join the call as a participant. Granola accesses your microphone and computer audio directly through the operating system, so no third-party participant appears in your meeting and no capture announcement plays to other attendees. The audio is processed in real time and deleted immediately after transcription completes, with no audio files retained anywhere, as documented on [Granola's security page](https://www.granola.ai/security). This architecture also means Granola works with any meeting platform, including Zoom, Teams, Meet, Slack huddles, FaceTime, WhatsApp, and in-person conversations, without platform-specific configuration.

The [Granola privacy and compliance overview](https://granola.ai/blog/ai-notetaker-privacy-compliance-soc2-gdpr) covers the full security posture, including GDPR compliance and how AI training opt-outs work across Business and Enterprise plans.

### Feature comparison table

<!-- rawHtml block 5058a841b938 -->
<table style="width:100%; table-layout:fixed; border-collapse:collapse;">
  <thead>
    <tr>
      <th style="width:22%; padding:12px; text-align:left; white-space:normal;">Feature</th>
      <th style="width:28%; padding:12px; text-align:left; white-space:normal;">Native platform<br>capture</th>
      <th style="width:25%; padding:12px; text-align:left; white-space:normal;">Bot-based<br>tools</th>
      <th style="width:25%; padding:12px; text-align:left; white-space:normal;">Granola</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding:12px;">Visible participant</td>
      <td style="padding:12px;">Typically yes, varies by platform</td>
      <td style="padding:12px;">Yes, joins as named virtual participant</td>
      <td style="padding:12px;">No participant appears</td>
    </tr>
    <tr>
      <td style="padding:12px;">Audio retention</td>
      <td style="padding:12px;">Typically yes, platform cloud retained</td>
      <td style="padding:12px;">Typically yes, vendor cloud servers</td>
      <td style="padding:12px;">No, deleted after transcription</td>
    </tr>
    <tr>
      <td style="padding:12px;">Platform agnostic</td>
      <td style="padding:12px;">No, each platform is separate</td>
      <td style="padding:12px;">Typically yes, works across video platforms</td>
      <td style="padding:12px;">Yes, works across all platforms and in-person</td>
    </tr>
    <tr>
      <td style="padding:12px;">Setup time</td>
      <td style="padding:12px;">Varies by platform. Host or admin permissions typically required</td>
      <td style="padding:12px;">Typically 5-10 minutes with calendar auth</td>
      <td style="padding:12px;">Under 5 minutes</td>
    </tr>
  </tbody>
</table>

### When to use each approach

- **Native platform capture** works best when you need a video file for replay, have host access, and your meeting does not involve counterparties who might react to a capture announcement.
- **Bot-based tools** suit sales teams that need conversation analytics, audio playback for verification, or coaching metrics derived from stored captures. They are well-designed for high-volume outbound call workflows where visibility is not a concern.
- **Botless capture (Granola)** suits M&A discussions, investor pitches, executive recruiting calls, and any conversation where a visible capture participant would change how people communicate. It also covers in-person meetings that bot-based tools simply cannot reach. Daversa Partners, an executive search firm, uses Granola across their team for CEO searches where discretion makes a visible capture participant impractical.

## What good AI meeting summaries look like

Most generic AI transcription tools produce a wall of text organized by timestamp. Good AI meeting summaries are structured around what mattered, not just everything that was said.

### Structured summary example

Granola's human-in-the-loop enhancement works like this: Your rough notes stay in black text exactly as you typed them. AI-enhanced context from the transcript appears in gray alongside. If you jotted "budget concerns" as a three-word note during a pitch call, the enhanced version pulls every pricing discussion from the transcript and adds the specific numbers mentioned, who raised them, and the surrounding context, without replacing your original note.

### Action items and decisions

When your notes flag a decision or commitment, Granola extracts it accurately because the AI has both your signal and the full transcript to work from. Generic tools miss the distinction between things that were discussed and things that were decided. The Granola Chat documentation explains how you can query afterward. Asking "What were the three action items?" returns specific commitments with the names of who took them on.

> "Granola nails exactly what I need: clean, reliable meeting transcripts and smart follow-up summaries without any fluff. I use it for nearly every call to stay focused on the conversation instead of scribbling notes. The follow-up action items are especially useful. Huge time saver." - [Verified user on G2](https://g2.com/products/granola/reviews/granola-review-11289286)

### Key discussion points

Once you have a library of meetings in Granola, the value compounds. Folder-level queries let you ask questions across multiple meetings simultaneously. A product leader can ask "Which UX issues come up most often in customer calls?" across every customer interview in a shared folder and get source-linked citations from specific conversations. Pedro Franceschi, Founder and CEO of Brex, noted that Granola "helped strengthen our written culture" as Brex rebuilt as an AI-native company. This reflects a key pattern: Meeting knowledge that previously lived in individuals' heads becomes searchable organizational memory.

### What to look for in output quality

The clearest marker of a good AI summary is whether it reflects your priorities or just compresses everything equally. When you jot rough notes during a meeting, the AI knows what mattered to you in the moment. Granola's [Recipes](https://docs.granola.ai/help-center/getting-more-from-your-notes/recipes) and [integrations](https://docs.granola.ai/help-center/sharing/integrations/integrations-with-granola) extend this further: Saved prompts for specific meeting types (customer research, 1-on-1s, investor pitches) structure the output in formats relevant to each use case. You can run "/Prep my day" for daily briefings that pull context from previous meetings, or use a customer research recipe to extract feature requests from every product interview automatically.

> "The AI Summary templates. Being able to choose what type of meeting it is and the notes being summarized accordingly. Also, the fact that Granola does not need to join your meeting." - [Verified user on G2](https://g2.com/products/granola/reviews/granola-review-11412901)

## Pre-meeting checklist: Capture and AI summaries

Run through this before your next meeting to ensure clean capture and useful output:

- Download Granola for Mac or Windows and connect your Google or Microsoft calendar (setup takes under five minutes)
- Choose a meeting template that matches the meeting type: Sales call, 1-on-1, customer research, investor pitch
- Open Granola one minute before the meeting starts (it prompts you automatically once your calendar is connected)
- During the meeting, jot rough notes using keywords and key points rather than full sentences
- Explicitly mark decisions, action items, and commitments in your notes as they happen
- Click "Enhance notes" when the meeting ends
- Review the enhanced output: Your black-text notes appear alongside gray AI context from the transcript
- Use Granola Chat to ask follow-up questions ("What concerns did they raise about pricing?")
- Add the meeting to the relevant shared folder if your team needs access to the notes

Try Granola for free. [Download](https://www.granola.ai/) the Mac, Windows or iOS app, connect your calendar, and run your next meeting to see bot-free capture in action.

## FAQs

**Do participants know when I'm using Granola to transcribe a meeting?**

Granola does not join as a visible participant, and no capture announcement plays to other meeting attendees.

**Which tool works best for confidential meetings like executive recruiting calls?**

Botless tools with zero audio storage and SOC 2 Type 2 compliance are the better fit. Granola's security credentials include SOC 2 Type 2 certification achieved in July 2025, GDPR compliance, and immediate audio deletion after transcription completes.

**Can I use the same tool across Zoom, Teams, Google Meet, and in-person meetings?**

Yes. Because Granola captures device audio through the operating system rather than integrating with each video platform separately, it works identically across Zoom, Teams, Meet, Slack huddles, and in-person conversations without any platform-specific configuration or admin permissions.

## Glossary

**GDPR (General Data Protection Regulation)**: A European Union law governing how organizations collect, store, and process personal data. Tools that are GDPR compliant follow rules about data minimization, user consent, and the right to have data deleted.

**Recipes**: Pre-built prompt templates in Granola that structure meeting notes for specific use cases, such as customer research calls, 1-on-1s, or investor pitches. Accessible via the Recipes library in the app.

**SOC 2 Type 2**: A security certification issued by an independent auditor confirming that a company's data handling practices meet established standards for security, availability, and confidentiality over a sustained period. More rigorous than SOC 2 Type 1, which only evaluates a single point in time.
