# How to record a Google Meet (without paying for Workspace or installing a bot)

> Archived 2026-08-04T09:37:03.827Z from Sanity oy7f1h9b/production
> _id `1b8b2c33-f3a8-4ce5-8a92-fcbecd2b38dc` · _rev `E71DeYiTsDt69W18EoNfBK` · updated 2026-06-12T09:38:03Z
> slug `how-to-record-a-google-meet-without-paying-for-workspace-or-installing-a-bot` · published

**Summary:** How to record a Google Meet without paying for Workspace using free screen recording, browser extensions, or AI notetakers like Granola.

---

> **TL;DR:** Free workarounds exist and work without a paid Workspace plan. Mac users can record with the Screenshot toolbar (Command + Shift + 5). Windows users can use Xbox Game Bar (Windows key + G). Both capture video but not searchable text. Browser extensions like Tactiq add transcription via live captions without a bot, though they are built primarily for Chrome. If you primarily need an accurate transcript rather than a video file, a device-audio AI notepad like Granola transcribes your meeting without joining as a visible participant, works with any meeting platform, and takes under 5 minutes to set up. The reason these workarounds exist: native Google Meet recording is locked behind paid Workspace plans, Business Standard and above. Free personal accounts and Business Starter cannot access it.

Google Workspace puts the native record button behind a paid plan. That single paywall blocks every free-account user and every Business Starter subscriber from the most obvious path to capturing a call. The result: Founders, recruiters, and product leads jury-rig workarounds, get frustrated with visible bots, or skip documentation altogether and pay for it later when they can't remember what was decided.

This guide covers every real path: The native method if you have the right Workspace tier, free local workarounds, browser extensions, and the AI notepad approach that skips the bot entirely. Pick the one that fits your actual situation.

## Why Google Meet recording is harder than it should be

The friction isn't accidental. Google gates the recording feature behind commercial plans, and even qualifying users run into permission constraints that complicate what sounds like a simple task.

### Workspace tier requirement blocks free accounts

Google Meet's native recording feature is available on Business Standard, Business Plus, Essentials, Enterprise Starter, Enterprise Essentials, Enterprise Standard, Enterprise Plus, Teaching and Learning Upgrade, Education Plus, Workspace Individual, and Google One plans with 2 TB or more storage.

Free personal Google accounts and Business Starter do not have access. That matters for most early-stage teams, where the founder is often on a personal Google account or the company is on a starter plan to keep costs down.

### Host controls affect who can record

With Host Management turned on in Google Meet, only the meeting host or a promoted co-host can start recording. With Host Management turned off, any participant from the host's organization can record. For external guests on a different organization's Google account, recording access still depends on the host's settings. If you're a guest in someone else's call and they haven't configured this, you'll typically need to ask the organizer to start it or get host privileges transferred.

### What most people need: A transcript

Most people searching for how to record a Google Meet don't need the video. They need to know what was said, who committed to what, and what the key decisions were. A video file sitting in Google Drive solves none of that unless someone manually reviews it. The more useful outcome is text: A clean, searchable transcript you can query later, share with your team, or use as the basis for a follow-up email. That reframe opens up better options than screen recording.

## How native Google Meet recording works (if you have Workspace)

If your plan qualifies, here's exactly how the feature works.

### Which Workspace plans include recording

<!-- rawHtml block 31e5e54c1966 -->
<table style="width:100%; table-layout:fixed; border-collapse:collapse;">
  <thead>
    <tr>
      <th style="width:70%; padding:12px; text-align:left; white-space:normal;">Plan</th>
      <th style="width:30%; padding:12px; text-align:left; white-space:normal;">Recording<br>included</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding:12px;">Free personal account</td>
      <td style="padding:12px;">No</td>
    </tr>
    <tr>
      <td style="padding:12px;">Business Starter</td>
      <td style="padding:12px;">No</td>
    </tr>
    <tr>
      <td style="padding:12px;">Business Standard</td>
      <td style="padding:12px;">Yes</td>
    </tr>
    <tr>
      <td style="padding:12px;">Business Plus</td>
      <td style="padding:12px;">Yes</td>
    </tr>
    <tr>
      <td style="padding:12px;">Essentials</td>
      <td style="padding:12px;">Yes</td>
    </tr>
    <tr>
      <td style="padding:12px;">Enterprise (all tiers)</td>
      <td style="padding:12px;">Yes</td>
    </tr>
    <tr>
      <td style="padding:12px;">Google One 2 TB+</td>
      <td style="padding:12px;">Yes</td>
    </tr>
    <tr>
      <td style="padding:12px;">Education Plus</td>
      <td style="padding:12px;">Yes</td>
    </tr>
    <tr>
      <td style="padding:12px;">Workspace Individual</td>
      <td style="padding:12px;">Yes</td>
    </tr>
  </tbody>
</table>

### How to start and stop recording as host

1. Join your Google Meet call as the host.
1. Click the Meeting tools icon at the bottom right of the meeting screen.
1. Select "Recording" from the menu.
1. Optionally, select a language to record captions alongside the video.
1. Click "Start recording," then confirm by clicking "Start" in the pop-up.
1. To stop, click Meeting tools again, select Recording, click Stop recording, and confirm.

The recording also stops automatically when everyone leaves the call.

### Where recorded files are saved

After the meeting ends, Google processes the video and saves it to the organizer's [Meet Recordings folder](https://support.google.com/meet/answer/9308681) in Google Drive. Both the organizer and the person who started the recording receive an email with a direct link to the file.

### Who gets notified when recording starts

All participants receive a notification when recording begins and ends. A red recording indicator appears in the top-left corner of the screen throughout the session. There is no way to suppress this notification. For confidential conversations, that transparency is the friction, and it's exactly why the workarounds below exist.

## The free-account workaround: Screen recording + system audio

If you're on a free account or Business Starter, local screen recording is the most straightforward workaround. It's imperfect, but it works for occasional use.

### Mac: QuickTime Player or Screenshot toolbar

Press Command + Shift + 5 to open the macOS Screenshot toolbar. Choose to record the full screen or a selected area, then click Record. To stop, press Command + Control + Esc or click the menu bar icon.

One significant catch: The built-in macOS screen recorder captures microphone audio but won't capture system sounds by default, meaning the other participants on the call won't be included unless you route system audio through a virtual device. Free tools like BlackHole can handle this (create a Multi-Output device, route to BlackHole, then select it as the input in QuickTime), but the setup adds real complexity. If you need reliable capture of both sides of a conversation, that workaround requires some technical configuration.

### Windows: Xbox Game Bar or OBS Studio

Press Windows key + G to open the [Xbox Game Bar](https://learn.microsoft.com/en-us/gaming/game-bar/). Press Windows key + Alt + R to start recording. Toggle the microphone on and off with Windows key + Alt + M. By default, Xbox Game Bar records the active app window along with system audio, so both sides of the call are captured without extra routing. All recordings save automatically to the Videos folder under Captures.

### Trade-offs: File size, quality, and manual effort

Local screen recording produces MP4 or MOV files that can easily exceed several gigabytes for a one-hour call. Storage fills up fast across multiple meetings and files need manual management. More fundamentally, a video file doesn't give you searchable text: It gives you footage you'll need to either watch or transcribe separately. For one-off meetings this approach is fine. For frequent daily calls, it becomes difficult to maintain.

## Browser extensions for Google Meet recording

Chrome extensions offer a middle path: They add transcription without a visible participant joining the call. The platform limitations and privacy trade-offs are worth understanding before you commit.

### Popular options: Tactiq, Notta, and Otter Chrome extension

Tactiq captures live captions from Google Meet directly within the browser tab, producing a transcript without a bot joining the call. It does not capture device audio or save an audio file. The Otter Chrome extension works similarly, offering an option to transcribe on your device with no bot in the meeting and no extra participant joining your call.

### Trade-offs: Platform limits and data access

Most browser extensions are built for Chrome, though some work in other Chromium-based browsers like Microsoft Edge, Opera, and Brave. Meetings taken in Firefox, Safari, or on native desktop apps and mobile fall outside their coverage. Chrome also doesn't capture system audio consistently across all operating systems, so audio quality can vary. Extensions require granting access to your browser session, which raises data-handling questions worth reading in the extension's privacy policy before installing.

## AI meeting note tools that work without paid Google Workspace

For people who need transcripts regularly, AI meeting note tools are the most practical solution. The approaches vary significantly, and the right choice depends on whether a visible bot is acceptable in your meetings.

### Comparison of leading options

<!-- rawHtml block 16b67d6615e8 -->
html
<table style="width:100%; table-layout:fixed; border-collapse:collapse;">
  <thead>
    <tr>
      <th style="width:22%; padding:12px; text-align:left; white-space:normal;">Tool</th>
      <th style="width:28%; padding:12px; text-align:left; white-space:normal;">Free<br>tier</th>
      <th style="width:20%; padding:12px; text-align:left; white-space:normal;">Bot joins<br>call</th>
      <th style="width:30%; padding:12px; text-align:left; white-space:normal;">Approach</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding:12px;">Otter.ai</td>
      <td style="padding:12px;">300 min/month, 30 min/conversation</td>
      <td style="padding:12px;">Yes (standard mode)</td>
      <td style="padding:12px;">Bot or Chrome extension</td>
    </tr>
    <tr>
      <td style="padding:12px;">Read AI</td>
      <td style="padding:12px;">5 meetings/month</td>
      <td style="padding:12px;">No</td>
      <td style="padding:12px;">Google Meet add-on + analytics</td>
    </tr>
    <tr>
      <td style="padding:12px;">Jamie</td>
      <td style="padding:12px;">10 meetings/month, 30 min/meeting</td>
      <td style="padding:12px;">No</td>
      <td style="padding:12px;">Device audio capture</td>
    </tr>
    <tr>
      <td style="padding:12px;">tl;dv</td>
      <td style="padding:12px;">Unlimited recordings</td>
      <td style="padding:12px;">Yes</td>
      <td style="padding:12px;">Bot records video + AI summary</td>
    </tr>
    <tr>
      <td style="padding:12px;">Granola</td>
      <td style="padding:12px;">Unlimited meetings</td>
      <td style="padding:12px;">No</td>
      <td style="padding:12px;">Device audio, AI-enhanced notepad</td>
    </tr>
  </tbody>
</table>

### Otter.ai: Visible bot with a Chrome extension option

Otter's standard mode uses a bot that joins as a visible participant. For client-facing or confidential conversations, that visibility changes the dynamic. The free plan caps at 300 transcription minutes per month with a 30-minute limit per conversation. Otter does offer a Chrome extension mode that captures audio on your device with no bot joining the call, which is a useful middle ground for Google Meet specifically.

### Read AI: Browser extension with analytics focus

Read AI takes notes via browser integration and focuses on meeting analytics and metrics alongside transcription. The free tier covers five meetings per month. It works well for teams that want engagement data and sentiment analysis alongside a transcript.

### Jamie: Desktop app without a bot

Jamie transcribes your computer's audio directly with no meeting bot joining your call. It's available for macOS and Windows, and its mobile app handles in-person meetings as well. Paid plans start at €21 per month.

### tl;dv: Video-first with AI summaries

tl;dv records, transcribes, summarizes, and analyzes virtual meetings, with a generous free tier covering unlimited recordings. Its approach is video-first, which means a bot does join the call in its default mode. The summaries and CRM-ready outputs are a strong point for sales teams comfortable with a visible bot.

### Granola: Captures audio without joining as a participant

Granola accesses your device's microphone and computer audio directly, transcribes in real time, and then deletes the audio. No participant joins your call and no recording announcement fires. The section below covers this approach in full detail.

## The no-bot route: Capturing audio without a visible participant

For founders in investor pitches, executive recruiters on CEO searches, and anyone in an M&A discussion, a bot joining the call as a visible participant creates a different kind of problem. The dynamic shifts. The conversation changes.

### Why bots make some sensitive meetings awkward

When a bot announces itself, every participant knows the meeting is being captured and potentially shared. In confidential conversations, that awareness changes what people say. Daversa Partners, an executive search firm, adopted Granola across 136 of 150 employees specifically because traditional bots were "intrusive" for CEO searches where discretion matters. Visible recording in M&A discussions and sensitive recruiting calls can alter the dynamic in ways that cost more than any tool saves.

### How Granola captures audio locally

You install Granola as a desktop app on Mac or Windows. When a meeting starts, Granola captures audio from your device, transcribes in real time, and deletes the audio once we generate the transcript. We don't store any audio file anywhere. We're [SOC 2 Type 2 certified](https://granola.ai/updates/granola-is-soc2-type-2-compliant), GDPR compliant, and our third-party AI providers are contractually prohibited from training on your data.

The human-in-the-loop approach works like this: You jot rough notes during the call, "Pricing concerns" or "Follow up on headcount," and Granola uses the transcript context to fill in the relevant details. Your notes stay in black. AI additions appear in gray. You control what stays and what gets deleted. You can also [delete specific transcript sections](https://granola.ai/updates/delete-parts-of-transcript) if unhelpful information needs to be removed. Or, if you'd rather not type during the meeting at all, Granola generates a structured summary automatically when the meeting ends.

> "I find Granola incredibly helpful and intuitive for taking notes in meetings. The setup process is straightforward with easy app download and minimal configuration." - [Catherine S. on G2](https://www.g2.com/products/granola/reviews/granola-review-11755500)

We also provide an [in-meeting notice feature for Google Meet](https://docs.granola.ai/help-center/consent-security-privacy/in-meeting-notice-google-meet) that handles participant notification in a way that's far less disruptive than a bot joining the call.

## Which recording method to choose for your situation

<!-- rawHtml block 9811c24dc1f4 -->
html
<table style="width:100%; table-layout:fixed; border-collapse:collapse;">
  <thead>
    <tr>
      <th style="width:45%; padding:12px; text-align:left; white-space:normal;">Situation</th>
      <th style="width:55%; padding:12px; text-align:left; white-space:normal;">Best<br>approach</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding:12px;">Host with qualifying Workspace</td>
      <td style="padding:12px;">Native Google Meet recording</td>
    </tr>
    <tr>
      <td style="padding:12px;">One-off video capture on Windows</td>
      <td style="padding:12px;">Xbox Game Bar</td>
    </tr>
    <tr>
      <td style="padding:12px;">One-off video capture on Mac</td>
      <td style="padding:12px;">Screenshot toolbar + BlackHole for system audio</td>
    </tr>
    <tr>
      <td style="padding:12px;">Regular transcripts, bot acceptable</td>
      <td style="padding:12px;">Otter, tl;dv, or Fireflies</td>
    </tr>
    <tr>
      <td style="padding:12px;">Regular transcripts, no bot</td>
      <td style="padding:12px;">Granola or Jamie</td>
    </tr>
    <tr>
      <td style="padding:12px;">Confidential meeting, no visible participant</td>
      <td style="padding:12px;">Granola</td>
    </tr>
    <tr>
      <td style="padding:12px;">Chrome-only workflow, occasional use</td>
      <td style="padding:12px;">Tactiq or Otter Chrome extension</td>
    </tr>
  </tbody>
</table>

### You're the host with Workspace: Use native recording

If your plan qualifies and you're always the host, native recording is the simplest path. The file ends up in Google Drive, all participants receive the notification, and there's no additional tool to manage. The limitation is the Workspace paywall and the unavoidable recording announcement.

### You need a quick one-off: Screen record

For a single meeting where you need video proof or can't use any other tool, local screen recording on Mac or Windows works. Accept the file size and the manual effort. Don't make it a daily habit.

### You want transcripts regularly: AI notepad

If you're in five or more meetings per week and need searchable text rather than video, a dedicated AI notepad is worth the setup time. The difference between tools comes down to bot presence and capture method.

### Bots aren't welcome: Granola or local recording

For confidential meetings, either go fully local with native screen recording (no third party involved) or use Granola's device-audio transcription. Granola gives you the transcript and structured notes automatically. Local screen recording gives you a video file you'll need to process yourself.

Try Granola for free. [Download](https://www.granola.ai/) the Mac or Windows app, connect your calendar, and run your next meeting to see it in action.

## FAQs

### What's the difference between recording and transcribing?

Recording saves an audio or video file, while transcribing converts speech to text in real time without saving the audio. Granola transcribes device audio as the meeting happens then deletes it, so you get a searchable transcript but no audio playback.

### Can I record Google Meet on my phone?

Yes, using your phone's built-in screen recorder. On iOS, add Screen Recording to Control Center via Settings and tap to start. On Android, swipe down to Quick Settings and tap Screen Recorder with audio capture enabled.

### Is Granola's free plan enough for occasional Google Meet transcription?

Granola's free plan covers unlimited meetings with AI-enhanced notes, custom templates, and AI chat, making it well suited for occasional users who don't need CRM integrations.

## Key terms

**Native recording:** The built-in Google Meet record feature, available only on qualifying Workspace plans, that saves an MP4 to the host's Google Drive.

**Device audio capture:** A method where a desktop app accesses your computer's microphone and system audio directly, without joining the video call as a participant.

**Tab capture (browser extension):** A Chrome-specific API that lets extensions capture the audio or live captions from an active browser tab, used by tools like Tactiq and the Otter Chrome extension.

**AI-enhanced notes:** A note format where your rough, jotted notes during a meeting are expanded by AI using transcript context, rather than generating a generic automated summary.
