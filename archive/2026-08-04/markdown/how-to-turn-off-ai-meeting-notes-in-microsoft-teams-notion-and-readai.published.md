# How to turn off AI meeting notes in Microsoft Teams, Notion, and Read AI

> Archived 2026-08-04T09:37:03.827Z from Sanity oy7f1h9b/production
> _id `e1584279-9930-4c20-bfc9-77058a30dc1e` · _rev `l8mWR7YSu0YRaRPf5U5EOG` · updated 2026-07-17T13:24:44Z
> slug `how-to-turn-off-ai-meeting-notes-in-microsoft-teams-notion-and-readai` · published

**Summary:** Turn off AI meeting notes by revoking calendar access, adjusting auto-join settings, and using admin controls in Teams and Read AI.

---

> **TL;DR:** You can block uninvited AI meeting bots by revoking calendar access, adjusting auto-join settings, and using admin controls across your tool stack. For Microsoft Teams, turn off Copilot at the organizer level via meeting options or at the admin level through the Teams Admin Center. For Read AI, Otter, and Fireflies, revoke calendar permissions in your Google or Microsoft account settings. For Notion, disconnect your calendar integration directly in Notion Calendar settings. For org-wide control, restrict third-party API access in Google Workspace or Microsoft 365. If you still want structured meeting notes without a visible bot, bot-free capture tools like Granola transcribe via device audio so no participant ever appears in the meeting.

Most people don't go looking for how to disable AI meeting notes until a bot joins a call they didn't expect to be captured. A visible bot in the participant list changes the dynamic of sensitive conversations: candidates hedge their answers, board members raise governance questions, and counterparties pull back on disclosure. Either way, you're here because a tool that was supposed to help started getting in the way.

This guide gives you the exact steps to remove and block AI meeting bots across Microsoft Teams, Notion, Read AI, Otter, and Fireflies, at both the user level and the organization-wide admin level. We cover the full picture, then explain what to use instead if you still need reliable meeting documentation.

## Why you might want to disable AI meeting notes

### Uninvited bots joining your calls

Most AI note-taking tools work the same way: you connect your calendar, and the tool reads your upcoming meetings. When a meeting starts, it sends a virtual participant to join. Read AI, for example, monitors your calendar for meeting links. Auto-join is often off for new accounts, but once enabled it defaults to all meetings with a conferencing link. Fireflies is set to join all meetings by default when it detects a web conferencing link, and Otter Notetaker joins calendar meetings automatically after you connect your account.

The problem is that most users configure these tools once and forget about them. The bot keeps joining every call, including ones where its presence creates real problems.

### Privacy concerns in sensitive meetings

When a bot joins a call, it typically stores a recording or transcript with a third-party provider. For board meetings, M&A discussions, executive recruiting conversations, and investor pitches, this creates a genuine data control problem. You cannot guarantee how that provider stores, processes, or uses the content. Enterprise clients may want to check with their legal or compliance teams before authorizing third-party capture tools. Regulated industries may face similar constraints. Granola's [guide on AI notetaker participant privacy](https://granola.ai/blog/ai-notetaker-participant-privacy-consent) covers the consent considerations in detail.

### Client and partner discomfort

Beyond the legal risk, there is the practical problem of friction. When a bot joins a call, it typically triggers a "recording started" announcement or appears as a named participant in the list. In confidential conversations, counterparties pull back, candidates hedge their answers, and investors become less candid.

The tool that was supposed to help you focus instead changes how people behave on the call. Solving that problem is why this guide exists.

## How to turn off Copilot meeting notes in Microsoft Teams

Microsoft built Copilot directly into Teams to generate AI-powered notes and transcriptions. You can control it at the individual meeting level or across your entire organization.

### Disable Copilot as a user

To turn off Copilot for a specific meeting you organized, follow these steps using [Microsoft's Teams documentation](https://learn.microsoft.com/en-us/microsoftteams/copilot-teams-transcription):

1. Open Teams and select the meeting from your calendar.
1. Click **Edit** or **Meeting Options**.
1. Scroll down to the **Copilot and other AI** section.
1. Select **"Only during the meeting"** from the dropdown, or turn Copilot off entirely.
1. Save your changes before the meeting starts.

This setting applies only to meetings you organize. If you're an attendee, ask the organizer to adjust the setting.

### Turn off Copilot as an admin

Microsoft 365 administrators can disable Copilot for all Teams meetings in the organization:

1. Open the **Teams Admin Center**.
1. Expand **Meetings** in the left navigation pane.
1. Select **Meeting Policies**.
1. Choose an existing policy or create a new one.
1. Navigate to the **Recording and transcription** section.
1. Find the **Copilot** setting and select **"Off"** from the dropdown.
1. Apply the policy to the relevant users or groups.

### Stop Copilot from auto-recording

Copilot can also trigger automatic transcription when a meeting starts. To prevent this, revisit the Recording and transcription section in Meeting Policies and verify that automatic recording is disabled. Turning off the Copilot setting alone does not always stop a meeting organizer from manually enabling it, so combining user education with admin policy enforcement helps maintain consistent control.

## How to disable AI meeting notes in Notion

Notion Calendar integrates with video conferencing platforms and, when connected, can surface AI-generated notes tied to your meetings.

### Disconnect calendar integration

To stop Notion from syncing meeting data, disconnect your calendar at the source:

1. Open Notion Calendar settings.
1. Under **Calendar accounts** in the sidebar, select the account you want to remove.
1. Select **Disconnect**.

Repeat this for each calendar account connected, including both Google and Microsoft calendars.

### Remove video conferencing connections

If you connected a video conferencing tool specifically for Notion AI connectors:

1. Go to **Settings**, then **Notion AI**.
1. Find the Notion Calendar connector and select the **settings icon** next to it.
1. Select **Disconnect**.

To stop Notion from using your Zoom account:

1. Go to **Settings**, then **Conferencing**.
1. Find **Zoom** and select **Disconnect**.

### Delete existing AI-generated notes

Disconnecting Notion from your calendar stops future note generation. For past AI-generated content, you can delete transcripts directly in the AI Meeting Notes block by clicking the slider icon and selecting "Delete transcript." Enterprise Plan workspace owners can also set an automatic deletion schedule for transcriptions by going to Settings → Notion AI.

## How to stop Read AI from joining your meetings

Read AI is a widely used tool in this category. Auto-join is often off when you first sign up, but once enabled it defaults to every meeting with a conferencing link, which is where most users lose track of it.

### Remove the bot from future meetings

The least disruptive fix is to turn off auto-join inside Read AI before revoking any external permissions:

1. In Read AI, go to **Account Settings > Meeting Assistant**.
1. Toggle **Auto-join meetings** off to stop the bot from joining anything automatically.
1. If you want to keep auto-join on but limit its scope, open **Join Preferences** and restrict it to meetings you host or meetings within your organization only.

If you want a clean break and no further Read AI access to your calendar at all, revoke calendar permissions at the account level as described below. You can also remove the bot from an active meeting by finding it in the participant list and removing it the same way you would remove any other participant in Zoom, Teams, or Meet.

### Disconnect Read AI from your calendar

#### For Google accounts:

1. Go to your [Google account security settings](https://myaccount.google.com/security).
1. Under **Third-party apps with account access**, locate Read AI.
1. Click **Remove Access** and confirm.

#### For Microsoft 365 accounts:

1. Go to your [Microsoft applications page](https://myapplications.microsoft.com) and sign in.
1. Find Read AI in your connected apps.
1. Click the three dots in the app tile corner, then **Manage your application**.
1. Click **Revoke Permissions** and confirm.

### Block Read AI at the organization level

If you manage a team and want to prevent Read AI from being authorized by anyone in your organization:

#### For Google Workspace:

1. In the Google Admin console, navigate to **Menu > Security > Access and data control > API controls**.
1. Click **Manage App Access**.
1. Find Read AI and set access to **Blocked**.

#### For Zoom:

1. Access the Zoom Admin Console.
1. Navigate to **App Marketplace > Manage > Apps on Account**.
1. Find Read AI and disable or restrict the integration.

## How to remove Otter.ai and Fireflies from meetings

Both tools use calendar-based auto-join mechanics similar to Read AI. The fastest fix for either is to adjust the auto-join settings in your account, then revoke calendar permissions if you want a clean break.

### Stop Otter.ai from auto-joining

1. Log in to your Otter.ai account and navigate to the **Meetings** tab.
1. Click **AI Notetaker settings**
1. Change the auto-join setting from **"Meetings with a video link"** (or whichever option is currently selected) to **"Meetings I manually select"**.

This keeps your account active but prevents Otter from joining anything you haven't explicitly triggered. To revoke calendar access entirely, follow the same Google or Microsoft account steps described in the Read AI section above.

### Remove Fireflies from calendar invites

1. From the Fireflies homepage, click the **Upcoming** button on the right side to open the collapsible side panel.
1. Click **Calendar meeting settings** under Fireflies Notetaker.
1. Change the default from **"All meetings"** to your preferred option, such as meetings you explicitly invite Fireflies to.

### Delete past meeting recordings

Both Otter.ai and Fireflies have account deletion processes in their respective settings. Removing access from your Google or Microsoft account settings (as described in the Read AI section above) cuts the live data feed even before you complete full account deletion, which is a useful first step while you work through the full removal process.

## Setting organization-wide policies to block AI note-takers

Individual settings changes only protect your own account. If you also manage a team, admin-level controls let you prevent anyone in your organization from inadvertently granting calendar access to unapproved tools. The steps below cover each platform.

### Admin controls in Google Workspace

If you have Google Workspace admin access, you can restrict third-party API access to Calendar and Meet for your entire organization:

1. In the Google Admin console, navigate to **Menu > Security > Access and data control > API controls**.
1. Click **Manage App Access**.
1. Use the search or filter to locate **Calendar** and **Meet**.
1. Select each service and
1. set access to **Restricted** to block unapproved third-party apps from connecting.

This prevents any user from authorizing a new bot connection until an administrator explicitly approves the application.

### Admin controls in Microsoft 365

If you have Microsoft 365 admin access, manage enterprise application permissions through the Microsoft Entra admin center:

1. Navigate to **Identity > Applications > Enterprise Applications > Consent and permissions**.
1. Select **User consent settings**.
1. Choose **"Do not allow user consent"** to require admin approval before any user can authorize a new third-party app.
1. Review existing authorized applications and revoke access for any unapproved AI tools.

Combined with the Copilot policy settings in the Teams Admin Center described earlier, this gives you layered control across the Microsoft stack.

### Zoom admin settings for third-party apps

If you administer your organization's Zoom account:

1. Log in to the Zoom Admin Console.
1. Navigate to **App Marketplace > Manage > Apps on Account**.
1. Review all authorized third-party applications.
1. Disable or restrict any AI note-taking bots not on your approved list.
1. Under **Admin App Management → Permissions**, toggle on **'Require publicly listed apps on the Zoom App Marketplace to be approved by admin'**.

**Quick checklist: blocking AI meeting bots organization-wide**

If you manage a team, use this checklist to ensure complete coverage across your organization:

- Revoke Read AI, Otter, and Fireflies calendar access in Google and Microsoft account settings for all affected users
- Set Google Workspace Calendar API access to "Restricted" in Admin console
- Enable admin approval requirement for third-party app consent in Microsoft Entra
- Disable unapproved bots in Zoom App Marketplace admin settings
- Update Teams Meeting Policies to set Copilot to "Off" for sensitive meeting types
- Communicate the policy to your team so they know which tools are approved
- Review third-party app access quarterly to catch any new authorizations

## If you still want meeting notes without the bot

Turning off these tools solves the problem of uninvited bots, but it creates a new one: you're back to typing notes manually during meetings. That's a real cost when your days involve back-to-back investor calls, customer interviews, and team stand-ups where you need to be present and listening, not scribbling.

The good news is that bot-based capture is not the only architecture for AI meeting notes.

### How botless note-taking works

Some tools, rather than sending a virtual participant to join your call, capture audio directly from your device. This means the app listens to what you hear through your computer's audio output and microphone, transcribes it in real time, and generates notes from that transcript. No additional participant appears in the meeting. No recording announcement plays. The other people on the call have no indication that note-taking is happening on your end, any more than they would if you were writing in a physical notebook.

### Granola: AI notes with no visible bot

Granola is an AI notepad built on this architecture. It captures device audio locally, transcribes in real time, then deletes the audio. We store no recordings anywhere. It works with any video conferencing tool: Zoom, Teams, Meet, Slack huddles, even FaceTime, because it does not need to join as a participant. You can see how [AI-enhanced notes work](https://docs.granola.ai/help-center/taking-notes/ai-enhanced-notes) in the Granola help center.

The workflow follows a simple principle: you jot rough notes during the meeting, Granola enhances them. When the meeting ends, you click "Enhance notes" and Granola uses the transcript to fill in context and structure your notes. Your notes stay in black text. AI additions appear in gray. You control what stays.

> "I recently started using the Granola AI notetaker app in my meetings, and I'm absolutely obsessed. It's so much better than the AI notetakers that just join a meeting, because it doesn't disrupt the flow at all. I can keep taking my own notes, and I never have to worry about missing anything important." - [Verified user on G2](https://g2.com/products/granola/reviews/granola-review-12594807)

### Best for confidential and sensitive meetings

Granola's privacy architecture goes beyond not showing a bot. We transcribe audio in real time and then delete it. We store no recordings on our servers. Third-party AI providers are contractually prohibited from training on your data. We achieved [SOC 2 Type 2 certification](https://granola.ai/updates/granola-is-soc2-type-2-compliant) in July 2025, completing the process in three months rather than the typical 12 to 18 because our architecture stores less sensitive data to begin with.

For leaders who need to document M&A discussions or executive recruiting calls, this matters. Daversa Partners, an executive search firm, adopted Granola across 136 of 150 employees specifically because traditional bot-based tools were incompatible with confidential CEO searches.

Granola's [integrations page](https://docs.granola.ai/help-center/sharing/integrations/integrations-with-granola) covers how it connects with live integrations including HubSpot, Notion, Slack, Affinity, Attio, and Zapier if you want to push meeting context directly into your existing systems after capture.

Try Granola for free. [Download](https://www.granola.ai/) the Mac or Windows app, connect your calendar, and run your next meeting to see bot-free capture in action.

## FAQs

**What happens to past meeting recordings when I delete an app?**

Deleting an app typically stops future capture, but existing recordings may remain stored on the provider's servers. Check each platform's data retention policies and account deletion procedures for specific timelines.

**How do I know if a bot is already in my meeting?**

Check the participant list for names like "Notetaker" or "Assistant," the meeting toolbar for recording indicators, and the calendar invite for unexpected attendees. Remove unexpected participants the same way you would remove any other attendee.

**Does turning off Copilot in Teams stop it for all my meetings?**

No. Adjusting Copilot settings at the organizer level in meeting options applies only to that specific meeting. To prevent Copilot from running by default across all meetings, a Microsoft 365 administrator needs to update the [Teams Meeting Policy](https://learn.microsoft.com/en-us/microsoftteams/copilot-teams-transcription) in the Teams Admin Center and set the Copilot setting to "Off."

**Is Granola available on Windows and mobile?**

Yes. Granola runs on macOS, Windows, iOS, and Android.

## Key terms glossary

**AI meeting bot:** A virtual participant that joins your video call to capture audio and generate meeting transcripts, typically authorized via calendar integration.

**Bot-free capture:** An approach where the note-taking tool accesses device audio locally rather than joining the call as a visible participant, leaving no trace in the meeting's participant list.

**Device audio capture:** The method by which tools like Granola transcribe meetings by listening to what plays through your computer's speakers and microphone, without sending any participant to the video call.

**Calendar integration:** The connection between a third-party tool and your Google or Microsoft calendar that allows it to read upcoming meetings and auto-join based on pre-configured settings.

**Third-party API access:** The permission granted to external applications to read or write data to platform services like Google Calendar or Microsoft Teams on your behalf.

**SOC 2 Type 2:** A security audit standard that verifies how a company handles customer data over an extended period, covering security, availability, and confidentiality controls.
