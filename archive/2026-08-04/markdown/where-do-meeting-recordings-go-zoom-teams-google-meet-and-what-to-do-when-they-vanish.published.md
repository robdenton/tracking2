# Where do meeting recordings go? Zoom, Teams, Google Meet (and what to do when they vanish)

> Archived 2026-08-04T09:37:03.827Z from Sanity oy7f1h9b/production
> _id `1fea82e6-30ef-4da6-9707-e0bb8b900d10` · _rev `8np06N0Lj92m6KMwkSGP5i` · updated 2026-06-27T13:40:38Z
> slug `where-do-meeting-recordings-go-zoom-teams-google-meet-and-what-to-do-when-they-vanish` · published

**Summary:** Where do meeting recordings go? Zoom saves to Documents/Zoom or Web Portal. Teams uses OneDrive or SharePoint. Meet goes to Drive.

---

> **TL;DR:** Meeting recordings vanish because platforms auto-delete files within 30 to 120 days and scatter them across different locations. Zoom local recordings go to `Documents/Zoom`, cloud recordings sit in the Zoom Web Portal trash for 30 days. Teams saves to OneDrive (non-channel meetings) or SharePoint (channel meetings), with a default 120-day expiration. Google Meet requires a paid Workspace account and saves to `My Drive > Meet Recordings`. Use the recovery checklists below to find missing files. To prevent loss entirely, local device audio capture with Granola produces notes instantly, independent of cloud storage or platform retention rules.

Finding a missing [meeting recording](https://www.granola.ai/ai-meeting-assistant) means navigating local folders, cloud portals, and admin permissions across three separate platforms, each with its own retention logic. A conversation you counted on referencing can vanish because a 30-day trash window closed, a host forgot to hit save, or a departing employee's cloud storage was deactivated. This guide shows you exactly where each platform stores files, how to recover them when they disappear, and how to build a system that stops leaving your most critical conversations dependent on fragile cloud infrastructure.

## The short answer: It depends on the platform, and they all have failure modes

Before diving into platform-specific paths, here is a side-by-side view of the three most common failure points. This table answers most "where did my recording go?" questions in under 30 seconds.

<!-- rawHtml block f0ba99fd804a -->
<table style="width:100%; table-layout:fixed; border-collapse:collapse;">
  <thead>
    <tr>
      <th style="width:22%; padding:12px; text-align:left; white-space:normal;">Platform</th>
      <th style="width:30%; padding:12px; text-align:left; white-space:normal;">Local storage path</th>
      <th style="width:28%; padding:12px; text-align:left; white-space:normal;">Cloud storage path</th>
      <th style="width:20%; padding:12px; text-align:left; white-space:normal;">Default retention</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding:12px;">Zoom</td>
      <td style="padding:12px;">Mac: /Users/[name]/Documents/Zoom Windows: C:\Users\[name]\Documents\Zoom</td>
      <td style="padding:12px;">Zoom Web Portal &gt; Recordings &gt; Cloud Recordings</td>
      <td style="padding:12px;">30 days in trash after deletion</td>
    </tr>
    <tr>
      <td style="padding:12px;">Microsoft Teams</td>
      <td style="padding:12px;">None (cloud-only)</td>
      <td style="padding:12px;">OneDrive of meeting organizer (non-channel) / SharePoint (channel meetings)</td>
      <td style="padding:12px;">120 days by default, then auto-expires</td>
    </tr>
    <tr>
      <td style="padding:12px;">Google Meet</td>
      <td style="padding:12px;">None (cloud-only)</td>
      <td style="padding:12px;">My Drive &gt; Meet Recordings</td>
      <td style="padding:12px;">Google Drive trash holds files 30 days</td>
    </tr>
  </tbody>
</table>

The pattern across all three platforms is consistent: Cloud storage with automatic deletion rules that most users never configure and rarely check. What differs is who controls those settings and exactly where the file lives.

## Where do Zoom recordings go?

Zoom gives you two separate storage systems. Confusing them is the single most common reason a recording feels "missing" when it actually exists in the other location.

### Local recordings: Documents/Zoom folder

When you choose local recording in Zoom, the file saves directly to your device. On Mac, the default path is `/Users/[YourUsername]/Documents/Zoom`. On Windows, look in `C:\\Users\\[YourUsername]\\Documents\\Zoom`. Each meeting gets its own sub-folder named with the date and meeting title.

Zoom creates MP4 files for video and M4A for audio-only recordings, along with a text file containing the chat log. If you can't find the folder, open Zoom, go to Settings > Recording, and check the "Local Recording" path field. You can also search your entire drive for `.mp4` files modified on the date of the meeting.

### Cloud recordings: Zoom Web Portal

Zoom stores cloud recordings on its servers, not your device. To access them, sign in at [zoom.us](https://support.zoom.com/hc/en/articles/203741855), click Recordings in the left sidebar, then select the Cloud Recordings tab. Access permissions for cloud recordings depend on how your organization has configured Zoom, the host controls sharing at the meeting level, and your administrator sets the broader defaults. If you attended a meeting but didn't host it, you may not find the recording here depending on how the host configured sharing. You need to contact the host or your Zoom account administrator directly.

### The 30-day trash period

Zoom cloud recordings that get deleted don't disappear immediately. According to [Zoom's recording documentation](https://support.zoom.com/hc/en/article?id=zm_kb&sysparm_article=KB0066493), Zoom moves deleted recordings to a trash folder and holds them for 30 days before permanent deletion. To check the trash, navigate to Recordings in the Zoom Web Portal and look for the Trash tab. Click Recover on any file you want to restore. Once those 30 days pass, Zoom removes the file permanently and no recovery path exists.

### Host-only access restrictions

By default, only the meeting host and account-level administrators can access, share, or download cloud recordings. If a colleague hosted the meeting, check with them or your Zoom admin directly. Your administrator can change sharing permissions or transfer recording ownership from the account settings panel.

### Free plan cloud recording limitation

Zoom's free Basic plan does not support cloud recording. [Zoom's Pro plan](https://zoom.us/pricing) starts at $13.33 per month, billed annually, and adds cloud recording as a feature. If you're on the free tier and expected a cloud recording, the platform never created one. Local recording is the only option on free accounts, and only if the host enabled it before the meeting started.

## Where are Teams meeting recordings stored?

Microsoft Teams stores recordings entirely in the cloud, but the exact location depends on the meeting type. Getting this distinction wrong is why so many Teams recordings feel impossible to find.

### OneDrive storage for regular meetings

For any Teams meeting outside of a channel (a private call, a group chat meeting, or a "Meet Now" session), Microsoft saves the recording to the meeting organizer's [OneDrive for Business](https://learn.microsoft.com/en-us/microsoftteams/tmr-meeting-recording-change), inside a "Recordings" folder. To find it, go to the organizer's OneDrive, look inside the "Recordings" folder, and sort by date.

### SharePoint storage for channel meetings

Channel meetings, meaning any meeting held directly inside a Teams channel, behave differently. [These recordings go to SharePoint](https://learn.microsoft.com/en-us/microsoftteams/teams-recording-policy), specifically to the site associated with that channel, inside a "Recordings" folder. Every member of that channel can access it through the Files tab without chasing down the organizer. If you're looking for a channel meeting recording, open the channel, click Files at the top, then look for the Recordings folder.

### Retention policies and lifecycle rules

Microsoft auto-deletes Teams recordings after 120 days by default. After that window, Microsoft permanently removes the file unless an administrator changes the setting from the Teams admin center under "Meetings > Recording & transcription." Some IT teams set shorter retention windows, which means a recording from last quarter could already be gone. Checking with your IT admin before you need a historical recording is a worthwhile habit.

### What happens when the organizer leaves

If a non-channel meeting was recorded to a departing employee's OneDrive and that account gets deactivated, the recording becomes inaccessible to the rest of the team. An IT administrator can typically access and preserve files within 30 days of account deactivation, but recovery becomes difficult once Microsoft fully removes the account. For teams relying on these recordings as institutional memory, the risk compounds with every person who leaves. Our guide on [bot-free notes in Teams](https://granola.ai/blog/granola-microsoft-teams-bot-free-notes) covers how to keep meeting context independent of any individual's cloud account.

## Google Meet recording not saved, what to do

Google Meet is the most restrictive of the three platforms when it comes to who can record. If your recording wasn't saved, there's a high probability the host didn't have recording permissions to begin with.

### Drive "Meet Recordings" folder location

When a Google Meet recording completes successfully, Google saves it to the meeting organizer's `My Drive > Meet Recordings` folder. The organizer and the person who started the recording both receive an email with a direct link. That link also appears on the Calendar event for the meeting. If you were the organizer but don't see the folder, check for the email notification before searching Drive. Check that the recording completed rather than stalled at the processing stage.

### Paid Workspace requirement for hosts

Personal Gmail accounts cannot record Google Meet sessions. Hosts need a paid Google Workspace edition that supports recording (Business Standard and higher, most Enterprise tiers, Education Plus, and Teaching and Learning Upgrade). See [Google's full list](https://knowledge.workspace.google.com/admin/meet/turn-meet-recording-on-or-off-for-your-organization). If the host joined using a free Gmail account or a lower Workspace tier, the recording option was never available and no file was created. This is the scenario where having a local backup matters most.

### The "recording still processing" trap

Even when recording succeeds, the file doesn't appear in Drive instantly. Google states that processing can take up to 24 hours depending on meeting length and server load. Longer meetings can take proportionally more time to process. If you see "recording still processing" on your Calendar event or in your notification email, wait the full 24 hours before assuming the file is lost.

## The four most common reasons your recording disappeared

Most missing recordings trace back to one of four causes. Identifying which one applies tells you whether recovery is possible.

### Host didn't save or enable recording

All three platforms require hosts to manually start recording. If the host forgot to click record, joined late, or assumed someone else would handle it, no file exists. This is the most common cause and the only one with no recovery path.

### 30-day auto-purge from trash

Zoom cloud recordings stay in trash for 30 days before permanent deletion. Google Drive trash files also delete after 30 days. If you needed a recording from three months ago, the platform likely purged it weeks ago, even if nobody intentionally deleted it.

### Free-plan recording wasn't created

Zoom's free tier doesn't support cloud recording at all. Google Meet requires a paid Workspace edition. If the meeting ran on a free account, the platform never created a cloud recording regardless of what the host intended.

### Processing failure or upload error

Network interruptions during a meeting can corrupt or lose cloud recordings during upload. On Zoom, if your laptop went to sleep during an extended local recording, the resulting MP4 file may be incomplete or corrupted. Google Meet's processing queue can occasionally fail, resulting in a notification email that says the recording wasn't saved.

## How to recover a missing recording

Work through the relevant checklist for your platform before assuming the file is permanently gone.

### Zoom recovery checklist

1. **Check local storage first.** Navigate to `/Users/[name]/Documents/Zoom` (Mac) or `C:\\Users\\[name]\\Documents\\Zoom` (Windows) and look for a folder matching the meeting date.
1. **Check the Zoom Web Portal.** Sign in at [zoom.us](http://zoom.us), go to Recordings, select Cloud Recordings, and search by date range.
1. **Check the trash tab.** In the same Recordings section of the portal, click Trash. Files deleted within the last 30 days appear here. Click Recover to restore them.
1. **Contact your Zoom admin.** If you weren't the host, ask your administrator to check the host's account or adjust sharing permissions.

### Teams recovery checklist

1. **Identify the meeting organizer.** For non-channel meetings, the recording lives in the organizer's OneDrive.
1. **Check OneDrive > Recordings.** Ask the organizer to share the file or check their own OneDrive folder.
1. **For channel meetings, check SharePoint.** Open the channel, click Files, and look in the Recordings folder.
1. **Check the recycle bin.** Both OneDrive and SharePoint have recycle bins where deleted files stay for 93 days before permanent removal.
1. **Contact your IT admin.** If the recording organizer has left the company, an administrator may still be able to access the account if it hasn't been deactivated yet.

### Google Meet recovery checklist

1. **Wait 24 hours.** If the meeting ended recently, the file may still be processing.
1. **Check the organizer's Drive.** Navigate to `My Drive > Meet Recordings` and sort by date.
1. **Check the Calendar event.** A link to the recording appears directly on the Google Calendar event once processing completes.
1. **Look in Drive trash.** Files deleted from Drive go to trash and stay there for 30 days before permanent deletion. Right-click any file you find there and select Restore.
1. **Verify the host's Workspace edition.** If none of the above applies, confirm the host had a qualifying paid Workspace plan. If they didn't, no recording was ever created.

## How to never lose meeting notes again

Finding a missing recording is stressful. Building a system where the notes exist regardless of what the platform does is the more durable investment.

### Why cloud recordings fail

The common thread across all three platforms is the same: Cloud recordings depend on a chain of decisions and infrastructure that sits outside your control. The host must enable recording. The cloud account must support it. The file must survive the retention window. The right people must have access permissions. Any one of those links can break.

This fragility hurts most during high-stakes conversations, a confidential executive recruiting call, for example, where you can't ask participants to repeat themselves.

### Your notes exist instantly, independent of the platform

Granola solves the core problem directly: Your meeting notes exist the moment the conversation ends, regardless of what happens to the platform's cloud storage. Because Granola captures device audio directly from your Mac, Windows machine, or iPhone and transcribes in real time, the notes exist before the host decides whether to enable cloud recording, before retention policies trigger, and before anyone's account gets deactivated.

The human-in-the-loop approach keeps you in control throughout. You jot what matters during the meeting, and Granola uses the transcript to fill in context around your notes afterward. Leave the notepad blank and get a generic summary. Add your own observations and Granola surfaces the relevant transcript sections to support them. The audio is deleted after transcription, so no stored recording exists to worry about.

### Notes that survive when recordings don't

The privacy architecture reinforces this further. Granola earned [SOC 2 Type 2 certification](https://granola.ai/updates/granola-is-soc2-type-2-compliant) in July 2025, and third-party AI providers are contractually prohibited from training on your data, which is exactly why firms like Daversa Partners use it for confidential executive recruiting.

> "It transcribes both on my Mac and iPhone, which is a game-changer for on-the-go catch-ups. The summaries it produces are actually good, not just a raw transcript dump, but key insights and actions." - [Aprielle D. on G2](https://www.g2.com/products/granola/reviews/granola-review-12552067)

You can also query across all your meetings to find patterns: Ask what a customer said about pricing three months ago, or pull every action item from the last six leadership meetings. [Chat with your meetings](https://docs.granola.ai/help-center/getting-more-from-your-notes/chatting-with-your-meetings) handles both quick factual questions and deeper cross-meeting analysis with source-linked citations.

For teams using Granola alongside Zoom, the [Granola and Zoom workflow guide](https://granola.ai/blog/how-to-use-granola-with-zoom) shows exactly how the two tools work together. If you want to understand how Granola handles participant privacy, the [participant privacy and consent guide](https://granola.ai/blog/ai-notetaker-participant-privacy-consent) explains the architecture in detail.

[Download Granola](https://granola.ai/) for Mac, Windows, or iOS. Setup takes under five minutes, and your next meeting produces structured notes automatically.

## FAQs

**Where do Zoom recordings go by default?**

Zoom saves local recordings to `/Users/[name]/Documents/Zoom` on Mac or `C:\\Users\\[name]\\Documents\\Zoom` on Windows. Cloud recordings appear in the Zoom Web Portal under Recordings > Cloud Recordings, accessible only to the host and account admins.

**How long do Teams meeting recordings stay before they're deleted?**

Teams recordings expire after 120 days by default, after which Microsoft permanently deletes the file. Your IT administrator can change this window from the Teams admin center under Meetings > Recording & transcription.

**Why does Google Meet say my recording is still processing?**

Processing can take up to 24 hours depending on meeting length and server load. Check your email for the recording link or look in the Google Calendar event. If it still hasn't appeared after 24 hours, verify the host had a qualifying paid Workspace edition, as personal Gmail accounts cannot record Meet sessions.

**Can I recover a deleted Teams recording after the organizer leaves?**

Possibly, if your IT administrator acts quickly. A departing employee's OneDrive becomes inaccessible once the account is deactivated, and an admin typically has a window of around 30 days after deactivation to retrieve or move files. Once Microsoft fully removes the account, the recordings are unrecoverable.

## Key terms glossary

**Local storage:** Files saved directly to your computer's hard drive, independent of any cloud service. Zoom local recordings use this model and survive even if your cloud account is canceled or the platform changes its retention policies.

**Cloud portal:** A web-based interface where platforms like Zoom and Microsoft Teams host recordings on remote servers. Access requires an internet connection, correct account permissions, and compliance with the platform's retention rules.

**Retention policy:** An automated rule that deletes files after a defined period. Zoom's cloud trash holds deleted recordings for 30 days. Teams recordings expire after 120 days by default. Google Drive trash empties after 30 days. Administrators can shorten or lengthen these windows depending on their organization's internal policies.

**System audio capture:** A method of transcribing meetings by listening to the audio playing through your device, rather than joining the call as a visible participant. Granola uses this approach, which means it works with any meeting platform, requires no cloud recording permissions, and produces notes independently of the host's account settings.
