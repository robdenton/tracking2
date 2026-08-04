# How to connect Granola and Microsoft Teams for bot-free notes

> Archived 2026-08-04T09:37:03.827Z from Sanity oy7f1h9b/production
> _id `post-granola-microsoft-teams-bot-free-notes` · _rev `LobHPX0rlFo71dStOAYBXD` · updated 2026-06-19T05:17:46Z
> slug `granola-microsoft-teams-bot-free-notes` · published

**Summary:** Granola lets you stay fully present in Microsoft Teams calls while capturing detailed, searchable notes, so you stop choosing between listening and documenting.

---

> **TL;DR:** Granola lets you stay fully present in Microsoft Teams calls while capturing detailed, searchable notes, so you stop choosing between listening and documenting. You jot rough points during the meeting, and Granola enhances them into structured summaries using the full transcript. Setup on Mac or Windows takes five minutes: install Granola, align your audio devices with Teams settings, and start your next call. Because Granola runs on your desktop rather than joining as a participant, no bot appears in the roster and no recording announcement plays. After the meeting, share summaries to Teams channels via Zapier automation or copy-paste. This guide covers every step, including the audio configuration most users miss.

Back-to-back Microsoft Teams calls create a documentation gap: you're either present in the conversation or writing notes, rarely both. Most meeting tools solve this by pulling your attention in two directions: you're managing a bot, checking a transcript, or catching up on what you missed while you were typing. Granola takes a different approach: it lives on your desktop, captures audio from your device, and generates detailed notes so you can stay focused on the conversation itself.

## How Granola helps you stay present and capture better Teams notes

Granola keeps you fully present in your Teams meetings, no context-switching, no catching up on what you missed while you were typing. Because you're actually in the conversation, your notes reflect it: sharper detail, better context, and the moments that matter captured as they happen. You stay in control of what gets documented and what gets shared, shaping the output with your own judgement rather than deferring to a generic automated summary. It runs entirely on your device, no bot, no stored audio. Full details are on the [Granola security page](https://www.granola.ai/security).

The human-in-the-loop design matters here too. You jot rough notes on what's important during the call, and Granola enhances them using the full transcript as context. The result is notes that reflect your judgment rather than a generic automated summary. You decide what gets shared and what stays private.

Over time, those individual meeting notes compound into something more valuable than any single summary: a searchable record of every decision, commitment, and context your team has built across months of calls. Instead of digging through calendar history or chasing down colleagues for context, you can use Granola's [chat-with-your-meetings feature](https://help.granola.ai/article/chatting-with-your-meetings) to query across your entire meeting history, surfacing what was agreed, what was deferred, and who said what. That kind of cross-meeting recall turns Granola from a [note-taking tool](https://www.granola.ai/ai-note-taker) into institutional memory that actually works for you.

> "It listens directly from my device audio no bots joining calls and produces clean, structured summaries with decisions, action items, and key points. That alone makes it far more seamless than tools like [Otter.ai](http://otter.ai/) or Fireflies, which often feel intrusive because they require a bot to join the meeting." - [Brahmatheja Reddy M.](https://www.g2.com/products/granola/reviews/granola-review-11932118)

## Step 1: Configure Granola to capture Teams audio

### Prerequisites

Before your first Teams meeting with Granola, confirm the following:

- **Granola installed** on macOS 13 or above (best performance on 14.2+) or Windows desktop
- **Microsoft Teams desktop app installed** (Granola captures device audio from your system audio output, and the desktop app routes audio through that path reliably; the browser version may not)
- **A Microsoft or Google account** for sign-in (Granola supports Microsoft single sign-on directly, so your Microsoft 365 work account connects without extra steps)

If you're moving from a Google Workspace account to a Microsoft 365 environment, the [Microsoft account migration guide](https://docs.granola.ai/help-center/migrating-to-a-microsoft-account-in-granola) covers that transition without losing your existing meeting history.

### Audio setup

When you first open Granola on macOS, two permission prompts appear: one for your microphone and one for system audio. Click Allow on both. If you missed them, go to System Settings > Privacy & Security and confirm Granola is enabled under both Microphone and Screen & System Audio Recording. On Windows, permissions are automatically granted during installation, so there's nothing to enable manually.

For both platforms, the critical step is aligning your system default audio devices with what Teams is using. Granola uses your system defaults, so if Teams routes audio to a different device, Granola captures only one side of the conversation.

- **macOS:** Go to System Settings > Sound > Output and confirm the same device appears there and in Teams under Settings > Devices.
- **Windows:** Right-click the speaker icon in your taskbar, open Sound settings, and set your preferred speaker and microphone as the default communications device in both the Playback and Recording tabs. Then confirm Teams points to those same devices under Settings > Devices.

### Starting your first meeting

Open Granola before your Teams call. Granola detects the active meeting through your calendar connection and prompts you to begin. Jot rough notes in the notepad during the call, and when the meeting ends, Granola generates [AI-enhanced notes](https://docs.granola.ai/help-center/taking-notes/ai-enhanced-notes) by combining what you wrote with context from the full transcript.

To stay focused and keep everyone aligned, [Granola's guidance recommends](https://docs.granola.ai/help-center/consent-security-privacy/getting-consent) letting participants know at the start that you're using an AI assistant for notes.

> "Easy to set up and runs quietly in the background. Accurate discussion summaries with the backup transcript available." - [Joe M. on G2](https://g2.com/products/granola/reviews/granola-review-11055567)

## Step 2: Share meeting summaries to Teams channels

Once Granola enhances your notes, two practical methods get them into Microsoft Teams.

### Method A: Zapier automation

The [Granola-to-Teams Zapier integration](https://zapier.com/apps/granola/integrations/microsoft-teams) automates summary distribution to any Teams channel you choose. To set it up:

1. **Create a new Zap** in Zapier and select Granola as the trigger app.
1. **Select** "Meeting note sent to Zapier from Granola" as your trigger event.
1. **Add a Microsoft Teams action** and select "Send channel message."
1. **Map the fields:** choose your target channel (for example, `#leadership` or `#board-updates`) and connect the Granola summary field to the message body.
1. **Test the Zap** by completing a short meeting in Granola and confirming the summary posts to the correct channel.

The full setup walkthrough is in [Granola's Zapier documentation](https://help.granola.ai/article/zapier).

### Method B: Copy and share manually

For sensitive meetings where you want to review and edit before distributing, the manual method gives you full control. After Granola enhances your notes, copy the summary to your clipboard and paste it directly into any Teams channel, DM, or meeting chat thread. You can also generate a shared link using the [sharing notes feature](https://docs.granola.ai/help-center/sharing/sharing-notes). Team members can open the link to read the full notes and review the transcript context without needing access to Granola themselves.

> "I love the ability to easily share my notes with my colleagues as well, and that we can all chat with the meeting transcript so everyone can see the full context of the meeting, even if they weren't there." - [Jess M. on G2](https://g2.com/products/granola/reviews/granola-review-9856422)

## Workflow: Managing executive meetings in Teams

For any meeting where the conversation is sensitive and the notes need careful handling, here's how the full workflow runs:

1. **Open Granola** before the call. It detects the meeting from your calendar and is ready to transcribe.
1. **Join your Teams call normally.** The meeting starts without any interruption to the flow of conversation.
1. **Jot key points** as the conversation moves. Short phrases work well: "Q3 target revised to $2.4M" or "Follow up with legal re: IP transfer by Friday."
1. **End the meeting.** Granola enhances your rough notes into a structured summary using the transcript as context.
1. **Review and edit before sharing.** This step is where human judgement matters most. For a board update, strip out internal commentary before posting to `#board`. For an executive candidate, keep notes private until the hiring committee is ready to compare feedback. For an investor call, make sure the summary reflects the agreed narrative before it circulates. Because you control what gets shared and when, sensitive context stays contained, because you're not relying on an automated system to make those calls for you.

Notes exist only for you until you choose to share them.

> "The AI Summary templates. Being able to choose what type of meeting it is and the notes being summarized accordingly. Also, the fact that Granola does not need to join your meeting." - [Verified user on G2](https://g2.com/products/granola/reviews/granola-review-11412901)

## Troubleshooting your Teams audio connection

Most transcription problems trace back to one of three causes.

**Audio device mismatch:** Granola uses your system's default audio devices. If Teams routes audio to a different device, Granola only captures one side of the conversation. Confirm your system default output and input match what Teams has selected in Settings > Devices. The [transcription troubleshooting guide](https://docs.granola.ai/help-center/troubleshooting/transcription-issues) covers the exact steps for both Mac and Windows.

**Transcription drops mid-meeting:** If transcription stops partway through a call, your connection to the transcription service likely dropped. Right-click the Granola icon in your menu bar (Mac) or taskbar (Windows), choose Restart Granola, then reopen your note and continue. This resets the connection and resolves the issue in most cases.

**Bluetooth audio dropouts:** Some Bluetooth and USB audio devices interrupt their audio stream periodically, creating gaps in your transcript. Switch to built-in speakers and microphone as a test. If the dropouts disappear, the issue is with the Bluetooth device. On Windows, also check your audio device's advanced settings for Audio Enhancements and turn them off, since these filters can interfere with Granola's capture.

> "Granola was a very simple tool to set up and start using... it has been extremely useful in making notes on calls with prospective customers as well as team meetings, and allows me to focus on the conversation with confidence, that the important points are being noted." - [Tom S. on G2](https://g2.com/products/granola/reviews/granola-review-9856398)

Ready to run your next Teams meeting without juggling notes? [Download Granola](https://www.granola.ai/) for Mac or Windows, connect your Microsoft account, and open it before your next call. Audio configuration takes five minutes the first time, and after that Granola runs quietly in the background every time Teams opens.

## Frequently asked questions

**What do other participants see when you use Granola on a Teams call?** Nothing. Granola captures audio directly from your computer's system output rather than joining as a participant, so you stay fully present in the conversation while your notes take care of themselves.

**Can Granola post summaries directly to Microsoft Teams channels?** Yes. The most automated path is the Granola-to-Teams Zapier workflow, which posts your completed meeting summary to a chosen channel without manual intervention. You can also copy summaries from Granola and paste them directly into any Teams channel, DM, or meeting chat.

**Is Granola safe for confidential Teams meetings?** Yes. Granola is SOC 2 Type 2 compliant and GDPR compliant. Audio is not stored after transcription completes. You control what gets shared.

**What happens to the audio after my meeting ends?** Granola passes audio to its transcription provider during the meeting and does not retain it afterward. The [chat feature documentation](https://help.granola.ai/article/chatting-with-your-meetings) explains what is stored and how you can query your meeting history once notes are complete.

## Key terms

**System default communications device:** The microphone and speaker your operating system routes audio through by default. Granola uses these devices, so they must match whatever Microsoft Teams is configured to use in its own device settings.

**Zapier trigger:** An event in Granola (such as a completed meeting note) that initiates an automated action in another app, like posting a summary to a Microsoft Teams channel.

**SOC 2 Type 2:** A security certification confirming that an organization maintains documented controls over customer data privacy and confidentiality, verified by an independent auditor. Granola achieved this in July 2025.

**AI-enhanced notes:** Granola's feature that takes the rough notes you jot during a meeting and fleshes them out using the full transcript as context. The result reflects your priorities rather than a generic summary.
