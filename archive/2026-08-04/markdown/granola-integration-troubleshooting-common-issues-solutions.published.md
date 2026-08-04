# Granola troubleshooting: Fix sync, audio, and meeting issues

> Archived 2026-08-04T09:37:03.827Z from Sanity oy7f1h9b/production
> _id `post-granola-integration-troubleshooting-common-issues-solutions` · _rev `5HeA6z1RBD1IljWPfn383Y` · updated 2026-07-30T07:17:18Z
> slug `granola-integration-troubleshooting-common-issues-solutions` · published

**Summary:** Granola not transcribing, syncing, or detecting meetings? Work through the common fixes for audio, Slack, Notion, calendar, and Zapier issues, step by step.

---

> **TL;DR:** Common Granola integration failures often trace back to expired authentication tokens or OS-level permissions that need to be re-granted. For sync issues with Slack or Notion, open Settings and disconnect, then reconnect the integration. For "no audio" problems on Mac, check System Settings > Privacy & Security > Microphone and Screen & System Audio Recording. If an issue persists after these steps, check the [Granola Status Page](https://status.granola.ai/) and email [hey@granola.so](mailto:hey@granola.so) with a screenshot.

We designed Granola to connect into your existing stack, pushing notes to Notion, posting summaries to Slack, and syncing with CRMs like HubSpot and Attio. When those connections break, your research repository breaks with them, and the context from your last customer interview risks staying locked inside the app. Common issues often trace to permission changes, token expiry, or audio device conflicts, and these typically resolve quickly.

This guide walks through every common failure category, step by step. If Granola is not working, not transcribing, or not detecting your meetings, start with the quick-diagnosis index below, then jump to the section for your specific integration.

Quick diagnosis: match your symptom to the first fix.

- **Granola not transcribing or no audio: G**rant both Microphone and Screen & System Audio Recording permissions under System Settings > Privacy & Security, then restart Granola.
- **Notes not syncing to Slack or Notion:** The email on the connected account usually doesn't match your Granola email. Disconnect and reconnect the integration in Settings.
- **Meeting not detected:** The event's calendar isn't synced or the invite has no video link. Toggle the calendar on under Settings > Calendar.
- **Granola not working or not running:** A stale process. Restart Granola completely, then sign out and back in to refresh your tokens.
- **Zapier trigger failing silently:** An older Zap is missing the workspace selector. Update the Granola trigger and choose a workspace.

## Quick fixes for common sync issues

Before diagnosing a specific integration, run through this checklist. You'll resolve most one-off failures in under two minutes.

- **Check the status page:** Visit [status.granola.ai](https://status.granola.ai/) to rule out a service-level incident. If there's an active incident affecting the Desktop App or iOS App, the fix is waiting, not debugging.
- **Verify Granola is running on macOS:** Open Terminal and run `pgrep -l Granola`. If nothing returns, Granola isn't running. Relaunch it from your Applications folder. On Windows, click the `^` icon in the bottom-right of your taskbar and look for the `g` icon in the System Tray.
- **Restart Granola completely:** On Mac, right-click the app icon in the Dock and choose "Restart Granola completely." On Windows, right-click the `g` System Tray icon and choose the same option. This clears stale processes (background tasks that haven't closed properly) that can block audio or sync.
- **Sign out and sign back in:** Go to your workspace name (bottom-left) > Settings > Sign out, then relaunch and re-authenticate. Signing out and back in refreshes your OAuth tokens for Google or Microsoft and often resolves auth failures in connected integrations.
- **Check your internet connection:** Granola transcribes in real time on macOS and Windows. A dropped or throttled connection during a meeting can interrupt transcription before it reaches your Notion or Slack destination.

If the problem persists after these five steps, move to the section specific to your integration.

## Troubleshooting specific integrations

**Note: **Check your plan before troubleshooting. Slack, Notion, CRM (HubSpot, Affinity, Attio), and Zapier integrations are only available on Business or Enterprise plans, the steps below will not work if you're on a Basic plan. If you're on Basic, [upgrade your plan](https://granola.ai/pricing) first, then return to this guide.

### Slack and Notion sync failures

**Slack**

The most common Slack sync failure happens when your email address in Slack doesn't match the one registered in Granola. If you've recently changed your Slack email or your workspace admin updated your account, Slack will break the connection silently.

Fix it by disconnecting and reconnecting:

1. Open Granola and click your avatar (bottom-left) to open Settings.
1. Navigate to Settings > Slack.
1. Click "Disconnect."
1. Click to reconnect. Granola will open your browser to re-authorize your Slack workspace.

The [Slack integration help article](https://help.granola.ai/article/slack) also notes that the Slack integration isn't available for personal Gmail or Outlook.com accounts. If you're on a personal account, check whether using a workspace email address resolves the issue. If you previously posted to private Slack channels and those stopped working, confirm the email addresses on both accounts match before reconnecting. Full documentation is in the [Granola Slack integration guide](https://docs.granola.ai/help-center/sharing/integrations/slack).

**Notion**

Notion failures almost always trace back to a mismatched account. If you signed into Notion with a different email than your Granola account, authorization will succeed but permissions won't carry through.

1. Confirm you're signed into Notion in your browser with the same email as your Granola account.
1. Open Granola > Settings > Integrations > Notion.
1. Click "Disconnect," then "Connect" again.
1. Re-authorize when prompted and select the correct parent page.

If you're still seeing errors after reconnecting, note the specific error message and email it to [hey@granola.so](mailto:hey@granola.so). The [Notion integration documentation](https://docs.granola.ai/help-center/sharing/notion) has step-by-step screenshots for the re-authorization flow.

### Zapier automation errors

Zapier is available on paid plans for Desktop app users. The most common failure pattern affects users who are members of multiple Granola workspaces: older Zap configurations lack the workspace selector field, causing triggers to fail silently.

Here's how to repair it:

1. Open the affected Zap in the Zapier workflow editor at zapier.com.
1. Select the Granola trigger step. You'll see a notice prompting you to update to the latest version of the Granola Zapier integration.
1. Accept the update and proceed to the next screen.
1. A new required field appears: select which Granola workspace your Zap will pull from.
1. Save and test the Zap.

The [Zapier integration help article](https://help.granola.ai/article/zapier) covers this workspace-selection requirement in detail, with full technical documentation in the Granola Zapier integration docs.

One practical note: we built native integrations (Slack, Notion, HubSpot) to be more stable than Zapier workflows by using direct API connections rather than polling intermediaries. Use Zapier when a direct connection isn't available, but if you're routing critical research notes through a Zap, check whether a native integration covers the same destination first.

### CRM connections (HubSpot, Affinity, Attio)

Granola [connects with Attio, HubSpot, and Affinity](https://docs.granola.ai/help-center/sharing/integrations/integrations-with-granola), matching your notes to the right people, companies, or deals in your CRM. Each uses a different authentication model, which is the most common source of failures.

<!-- rawHtml block html0 -->
<table>
<colgroup>
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
<col style="width: 25%" />
</colgroup>
<thead>
<tr>
<th>CRM</th>
<th>Authentication</th>
<th>Possible issue</th>
<th>Fix</th>
</tr>
</thead>
<tbody>
<tr>
<td>HubSpot</td>
<td>OAuth</td>
<td>Token expiry after account changes</td>
<td>Settings > Integrations > HubSpot > Disconnect, then reconnect</td>
</tr>
<tr>
<td>Affinity</td>
<td>API key</td>
<td>Key rotated by account owner</td>
<td>Settings > Integrations > paste new API key, saves automatically</td>
</tr>
<tr>
<td>Attio</td>
<td>OAuth (Attio login)</td>
<td>Session expired or permissions changed</td>
<td>Settings > Integrations > Attio > Disconnect, then reconnect with Attio login</td>
</tr>
</tbody>
</table>

For Affinity specifically, the [Granola Affinity integration guide](https://www.granola.ai/docs/docs/integrations/Affinity-Integration) walks through where to find your API key in Affinity's account settings. The Attio integration page has additional context on which data Granola passes to Attio records.

## Resolving calendar and meeting detection problems

### Meeting not detected or transcription won't start

When Granola doesn't detect a meeting, check these three things first:

1. **Check which calendars are synced.** In Granola, click the cog next to "Coming Up" to see the calendars visible from your connected account. If your event is on a secondary or shared team calendar, toggle it on.
1. **Confirm the event has a video link.** Granola detects meetings from calendar invites broadly, and a conferencing URL (Zoom, Meet, Teams) is one of the stronger detection signals. Granola also monitors for microphone activation and browser tab URLs, so ad-hoc calls without a calendar event can be detected too, but a missing or malformed conferencing link can reduce detection reliability for scheduled meetings.
1. **Check Settings > Calendar.** Confirm the right calendars are toggled on under your account. The [calendar sync troubleshooting guide](https://docs.granola.ai/help-center/troubleshooting/calendar-sync) covers every toggle and setting in this view.

If Granola detected the meeting but didn't generate notes, see the [notes not generating help article](https://docs.granola.ai/help-center/troubleshooting/notes-not-generating) for common causes including connectivity issues.

### Calendar sync delays

Calendar sync isn't instant, so after adding or editing an event it can take a couple of minutes for the change to appear in Granola. This is normal behavior.

If an event is still missing after a few minutes, force a refresh:

1. Sign out: workspace name (bottom-left) > Settings > Sign out.
1. Sign back in and re-authenticate your Google or Microsoft account.
1. Open Settings > Calendar and confirm the right calendars are toggled on.
1. Wait a few minutes for the sync to catch up.

The sign-out and sign-in cycle re-authenticates the calendar connection and clears any stale sync state. The [getting started setup guide](https://docs.granola.ai/help-center/getting-started/setting-up-granola-for-the-first-time) has full calendar authorization steps if you need to re-grant permissions from scratch.

## Fixing audio and transcription failures

### No audio captured

Finishing a customer interview and seeing no transcript is the worst feeling. If Granola is not transcribing, the cause is almost always an audio permission or device conflict. Here's what matters most:

**Desktop (macOS and Windows):** We transcribe in real time, so if Granola was running during your meeting, you won't lose the transcript mid-session even if your connection drops briefly. Sustained network failures can still prevent notes from generating, see the network troubleshooting section below.

**iOS:** Granola temporarily caches audio after your meeting before processing, as documented in the [Granola security overview](https://www.granola.ai/security).

For "no audio" on desktop, work through these steps:

**Step 1: Check macOS microphone and system audio permissions**

On Mac, you need to enable both Microphone and Screen & System Audio Recording for Granola.

- Go to System Settings > Privacy & Security > Microphone and confirm Granola is toggled on. (This lets Granola capture your voice and other microphone input.)
- Go to System Settings > Privacy & Security > Screen & System Audio Recording and confirm Granola appears and is enabled. (This lets Granola capture system audio from conferencing apps like Zoom or Meet.)

If Granola doesn't appear in either list, the app hasn't requested permission yet. Start a test meeting to trigger the OS permission prompt.

**Step 2: Verify your default audio device**

Granola uses your macOS or Windows default sound device to capture audio, so confirm the same microphone is selected in both your System Settings and your meeting software (Zoom, Meet, Teams). On Mac, check System Settings > Sound > Input. The [transcription issues help article](https://docs.granola.ai/help-center/troubleshooting/transcription-issues) covers device-matching in detail.

**Step 3: Check for virtual audio conflicts**

USB microphone amplifiers, audio mixing software, and "pass-through" configurations can interfere with Granola's audio capture. If you use any of these, try disabling them temporarily. For stereo inputs or outputs, confirm your audio is routed to the Left channel (or both Left and Right). If disabling the external audio software resolves the issue, you've found the conflict and should keep that software off during meetings, or contact the software vendor for a compatible configuration.

**Step 4: Restart your computer**

Occasionally the processes Granola uses to transcribe system audio crash in a way that restarting Granola won't fix. For OS-level audio crashes, try restarting the `coreaudiod` daemon first: open Activity Monitor, search for "coreaudiod", select it, and click the Force Quit (×) button, macOS will restart the process automatically. If that doesn't resolve it, a full machine restart is the reliable fallback.

### Poor transcription quality

Poor output quality usually comes from one of two sources: bad audio input, or a network issue blocking the transcription API.

**Audio quality issues**

Background noise, distance from the microphone, and echo from speakers all degrade transcription accuracy. If another participant's audio is low quality, that portion of the transcript reflects it. This is an audio input problem, not an AI problem. Using a headset or moving closer to the microphone resolves most of these cases.

**Network issues affecting transcription**

If Granola can't reach its transcription API, notes won't generate even if we captured audio. Two common network-level causes:

1. **DNS resolution failure:** For some users, Granola can't resolve the domain name for the transcription API. Try switching your DNS server to `8.8.8.8` (Google Public DNS) in your network settings.
1. **TLS connection failure:** If your network applies deep packet inspection or TLS interception (common on corporate VPNs), it can block the secure connection to our transcription APIs, but this is a resolvable network configuration issue. Contact your IT team and request a network exception for Granola's transcription endpoints, they can whitelist the relevant domains to allow the connection through.

Both scenarios are covered in the [transcription troubleshooting guide](https://granola.ai/docs/docs/transcription-troubleshooting). The [notes not generating article](https://docs.granola.ai/help-center/ios/notes-not-generating) covers platform-specific steps for notes that didn't generate on iOS.

## When to contact support

Escalate to the support team when you've disconnected and reconnected an integration and the sync still fails, notes from a specific meeting are missing despite Granola running with audio permissions granted, you're seeing a specific error message not covered above, or you're on a corporate network and suspect a TLS or firewall issue requiring IT involvement.

Email [hey@granola.so](mailto:hey@granola.so) with your Granola app version (visible in Settings), your operating system and version, the name of the integration that failed, the time the issue occurred, and screenshots of any error messages. The faster you can share the specific error message, the faster support can identify the root cause.

> "Granola nails exactly what I need: clean, reliable meeting transcripts and smart follow-up summaries without any fluff. I use it for nearly every call to stay focused on the conversation instead of scribbling notes." - [Verified user review of Granola](https://g2.com/products/granola/reviews/granola-review-11289286)

If you're still troubleshooting, work through the diagnostic steps above to restore your workflow.

[Download the Granola app for Mac, Windows, or iOS](https://www.granola.ai/docs/docs/101/gettingstarted/quickstart), connect your calendar, and run your next meeting to confirm everything is working end to end.

## FAQs

**Why is Granola not transcribing?**

Granola not transcribing is almost always a permission or audio-device issue. On Mac, enable both Microphone and Screen & System Audio Recording under System Settings > Privacy & Security, then restart Granola. If permissions are already granted, check that the same microphone is selected in both System Settings and your meeting app, and disable any virtual-audio or pass-through software during calls.

**Why is Granola not working at all?**

First confirm Granola is actually running: on Mac run pgrep -l Granola in Terminal, or on Windows check the System Tray for the g icon. Then restart Granola completely and sign out and back in to refresh your authentication tokens. If it still fails, check the status page at [status.granola.ai](http://status.granola.ai) to rule out a service incident.

**Does Granola work with a personal Gmail account?**

The core app supports personal Gmail and [Outlook.com](http://Outlook.com) accounts, but the Slack, Notion, and CRM integrations are not available on personal accounts. If a sync fails on a personal Gmail, switching to your workspace email address on both the Granola and the connected account usually resolves it.

**Why isn't Granola detecting my meeting?**

Granola misses a meeting when its calendar isn't synced or the invite has no video link. Click the cog next to "Coming Up" and confirm the right calendars are toggled on, including any secondary or shared team calendars, and check that the event has a Zoom, Meet, or Teams link. Calendar changes can take a couple of minutes to appear.

**Where do I check if Granola is down?**

Check the Granola status page at [status.granola.ai](http://status.granola.ai). If there's an active incident affecting the Desktop or iOS app, the fix is to wait for it to clear rather than to keep debugging your own setup.
