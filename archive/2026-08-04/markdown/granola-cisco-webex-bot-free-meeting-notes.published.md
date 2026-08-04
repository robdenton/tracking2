# How to use Granola with Cisco WebEx for bot-free meeting notes

> Archived 2026-08-04T09:37:03.827Z from Sanity oy7f1h9b/production
> _id `post-granola-cisco-webex-bot-free-meeting-notes` · _rev `CrgpZwqGJuRubyzTx3UMA7` · updated 2026-07-27T13:17:06Z
> slug `granola-cisco-webex-bot-free-meeting-notes` · published

**Summary:** Granola lets you stay present in WebEx calls and walk away with enhanced notes every time. It captures audio directly from your device with no bot joining your call. Setup takes under five minutes on Mac or Windows.

---

> **TL;DR:** Granola lets you stay present in WebEx calls and walk away with enhanced notes every time. You jot rough notes during the call, Granola transcribes what you hear and say, then enhances your notes when the meeting ends, all by capturing audio directly from your device, so no bot ever joins your call. Setup takes under five minutes on Mac or Windows and requires granting microphone and Screen & System Audio Recording permissions in your OS settings. No visible participant, no recording announcement, no IT-blocked bot.

Most transcription tools rely on virtual bots that join your meeting as a separate participant. In enterprise environments running Cisco WebEx, IT policies frequently block those bots or security-conscious participants flag them before you have said hello. Granola runs entirely on your desktop and captures the audio you hear directly from your device. This guide walks through OS permissions, device configuration, and post-meeting querying so you never lose what was said in a meeting again.

## Why WebEx notes break down in enterprise environments

Many enterprise, healthcare, and financial services organizations choose WebEx precisely because it enforces strict security controls. When a bot attempts to join via meeting URL, IT policies block the connection, hosts remove the unknown participant, or interviewees become more guarded the moment they spot an unfamiliar name in the participant list.

When someone sees a recording bot appear in the participant list, their answers become shorter and more careful.

Granola sidesteps this through its device audio capture architecture. It captures what comes through your speakers and your microphone simultaneously, with no third-party participant joining the call. The transcript labels these as "Me" and "Them" so you can follow the conversation when you review it later. Because Granola [does not store audio](https://www.granola.ai/security), only the text transcript and your notes persist after the meeting ends.

## Prerequisites for setup

Before starting, confirm you have the following:

- **A Granola account** signed in via Google Workspace, personal Gmail, or a Microsoft account (Granola currently supports Google and Microsoft single sign-on only).
- **The Granola desktop app** installed on Mac (macOS 13 minimum, macOS 14.2 or above recommended) or Windows. Download and follow the [quickstart guide](https://www.granola.ai/docs/docs/101/gettingstarted/quickstart) to get going.
- **Admin privileges on your machine.** On macOS, you need admin access to grant Screen & System Audio Recording permissions, as detailed in [JumpCloud's macOS permission guide](https://jumpcloud.com/support/grant-screen-recording-and-accessibility-permissions-for-remote-assist-agent-on-macos-devices).
- **Cisco WebEx** installed as a desktop app or accessible in your browser. Both work with Granola since it captures system audio regardless of whether WebEx runs in an app or a tab.
- **Calendar access** granted to Granola so it can detect your upcoming WebEx meetings automatically.

## Step 1: Configure Granola for WebEx audio capture

Granola does not integrate with WebEx via an API. Instead, it listens to whatever audio your computer produces and receives, so setup focuses on matching audio devices rather than connecting accounts.

The critical rule: the speaker output and microphone input you use in WebEx must match the default audio devices your operating system has selected. If those diverge, Granola captures the wrong source and you will see flat audio lines with no transcription activity.

**On Mac:**

1. Open System Settings > Sound.
1. Under Output, note which device is selected (for example, MacBook Pro Speakers or your headphones).
1. Under Input, confirm your microphone is selected.
1. Open WebEx, navigate to Audio & Video settings, and verify that the Speaker and Microphone fields match the devices you confirmed in System Settings.

The [Granola transcription troubleshooting guide](https://docs.granola.ai/help-center/troubleshooting/transcription-issues) confirms this: "Granola uses your default sound devices in macOS or Windows to transcribe audio from your meeting, so these settings need to match the devices you're using in your virtual meeting software."

**On Windows:**

1. Open Settings > System > Sound and check the default Output and Input devices.
1. To set a communications-specific default, right-click the device in the Playback tab and select Set as default communications device.
1. Match these to the devices selected in WebEx Audio settings.

## Step 2: Grant audio capture permissions on Mac and Windows

Missing permissions are the most frequent reason Granola shows flat lines during a WebEx call.

**On macOS Sonoma and Sequoia:**

Navigate to System Settings > Privacy & Security > Screen & System Audio Recording and toggle Granola on. Also grant access under Microphone in the same Privacy & Security panel.

The permission label "Screen & System Audio Recording" can feel counterintuitive since Granola does not capture video. Apple's API design explains this requirement. As [Apple's own documentation explains](https://support.apple.com/guide/mac-help/control-access-screen-system-audio-recording-mchld6aa7d23/mac), the Screen & System Audio Recording permission controls both visual and audio system capture. Granola requests it solely to access system audio and does not record or save any video at any point.

The first time Granola runs during a meeting, macOS will prompt you to confirm these permissions. Click Allow to complete setup. You will not need to revisit these settings again.

**On Windows:**

Windows 11 automatically grants the necessary permissions during installation. You do not need to adjust any manual toggles.

## Step 3: Run your first WebEx meeting with Granola

Once permissions are in place, the workflow is straightforward. Follow the [Granola first-time setup guide](https://docs.granola.ai/help-center/getting-started/setting-up-granola-for-the-first-time) if you have not completed initial onboarding.

1. **Open Granola** before or as your WebEx meeting starts. Granola detects the meeting from your calendar and opens a note automatically.
1. **Join your WebEx call** as you normally would, through the desktop app or browser.
1. **Confirm audio capture** by watching for the green animated bars at the bottom of the Granola note window. [Granola's live transcription](https://www.granola.ai/docs/docs/101/duringyourmeeting/live-transcription) documentation describes these as "green dancing bars at the bottom of the screen to show Granola is capturing audio." If the bars are flat, stop here and recheck device matching from Step 1.
1. **Jot rough notes** in the Granola notepad as the conversation develops. Write only what matters: key decisions, interesting quotes, questions to follow up on. Granola fills in the surrounding context from the transcript.
1. **End the meeting and let Granola enhance your notes**. Your rough notes guide the AI: write "pricing concerns" and Granola finds every pricing discussion in the transcript. Your original notes stay in black, AI additions appear in gray, and you control what stays. The result is structured notes shaped by your judgment, not a generic summary.

Users who run this workflow consistently report staying more present in conversations.

> "This tool allows me to be fully present in every candidate conversation without worrying about taking detailed notes in real time... The amount of time this tool has saved me on a daily basis is truly incredible." - [Syl C. on G2](https://g2.com/products/granola/reviews/granola-review-11230755)

## Using Granola effectively on WebEx

### Handling consent

Because Granola does not announce itself in the participant list, you need to ask permission verbally at the start of the session. A clear, low-friction way to do this: "I use an [AI notepad](https://www.granola.ai/ai-note-taker) on my desktop to help me focus on our conversation instead of typing notes. Is that okay with you?"

The [Granola in-meeting notice documentation](https://docs.granola.ai/help-center/consent-security-privacy/automatic-in-chat-entrance-messaging) covers how to handle consent messaging. Consent is still your responsibility. Granola removes the bot friction, not the obligation to ask.

### Using templates for structured meetings

Granola lets you [create custom note templates](https://docs.granola.ai/help-center/customising-granola/customising-transcription) so your notes land in a structure that matches your workflow. Set one up with your core discussion sections before the call. When Granola enhances your notes, it maps its output to your structure rather than generating a generic summary.

> "Most tools force you into a set number of meeting types/outline structures, but, while Granola offers a core set for you to adopt, they have made it super easy and flexible to create your own for whatever purpose you have." - [Andy C. on G2](https://g2.com/products/granola/reviews/granola-review-10309657)

### Querying across past meetings

After several WebEx sessions, the real value of Granola's [chat with your meetings feature](https://docs.granola.ai/help-center/getting-more-from-your-notes/chatting-with-your-meetings) becomes apparent. Ask questions like "What concerns came up about login flows?" and receive citations pulled from every relevant session. This is the difference between a transcript tool and an organizational memory: past meetings become searchable infrastructure rather than buried documents. You can also use [Granola's integrations](https://docs.granola.ai/help-center/sharing/integrations/integrations-with-granola) to pipe enhanced notes into tools like Notion, where synthesis work already lives.

## Troubleshooting common WebEx audio issues

**Audio not detected (flat lines or missing voice):**

Check that the output and input devices in WebEx Audio settings match the devices in System Settings (Mac: System Settings > Sound, Windows: Settings > System > Sound). If you switched to Bluetooth headphones after opening WebEx, update both settings and rejoin the meeting. The [Granola transcription troubleshooting page](https://www.granola.ai/docs/docs/transcription-troubleshooting) walks through device matching in detail. For missing voice specifically, the [Granola optimization guide](https://www.granola.ai/blog/get-the-best-from-granola) recommends setting your Mac's microphone input volume to maximum to improve transcription accuracy.

**"WebEx is blocking Granola":**

WebEx is not blocking Granola. What looks like a WebEx block is almost always a missing macOS permission. Return to System Settings > Privacy & Security and verify that both Microphone and Screen & System Audio Recording show Granola as enabled. Because Granola captures system audio rather than integrating at the application level, there is no WebEx API layer for IT policies to block.

## Ready to stay present in your next WebEx meeting?

Download Granola for [Mac or Windows](https://www.granola.ai/download), connect your calendar, and run your next WebEx session. You will have bot-free transcription working in under five minutes. No training required, no IT friction, and built-in ways to let WebEx participants know
Granola is active.

## Frequently asked questions about Granola and WebEx

**Does Granola record WebEx video?**

No. Granola captures audio and generates a text transcript. No video is stored at any point during or after the meeting.

**Do other WebEx participants see Granola in the meeting?**

No. Granola runs on your desktop and does not join the call as a participant. Nothing appears in the WebEx participant list.

**Does Granola store the audio after transcription?**

No. Audio is transcribed in real time on Mac and Windows, then discarded. Only the transcript and your notes are saved. See the [transcript auto-deletion documentation](https://docs.granola.ai/help-center/consent-security-privacy/transcript-auto-deletion) for details.

**Is Granola compliant for use in healthcare or financial services WebEx calls?**

Granola is SOC 2 Type 2 certified and GDPR compliant, and does not allow third-party AI providers to train on your data. However, Granola is not HIPAA compliant today. If your organization operates in a regulated industry, check with your compliance team before using Granola with regulated data.

## Key terms glossary

**System audio capture:** The method Granola uses to listen to audio your computer plays through speakers or headphones, rather than joining a meeting via URL. This is why no bot ever joins the call as a participant. You can still let people know Granola is running with the video watermark or an automatic chat message.

**Screen & System Audio Recording (macOS):** The macOS privacy permission category that controls both screen capture and system-level audio output. Granola requires this permission to access audio, not to capture any video.

**Default communications device (Windows):** The audio device Windows routes voice communication apps through. Granola uses this device for audio capture on Windows, separate from the default playback device.

**Transcript enhancement:** The Granola process of taking rough notes you typed during a meeting and expanding them with context from the full transcript, producing structured notes without requiring you to review the entire transcript manually.

**Bot-free capture:** A capture architecture that adds no participant to the meeting. Granola's capture happens entirely on your device, leaving the meeting
participant list unchanged. Granola still offers built-in ways, like a video watermark or an automatic chat message, to let people know it's in use.
