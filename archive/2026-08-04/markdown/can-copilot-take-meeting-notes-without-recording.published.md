# Can Copilot take meeting notes without recording? Yes, but here's where they go

> Archived 2026-08-04T09:37:03.827Z from Sanity oy7f1h9b/production
> _id `fa11444c-5a10-4ad7-bd07-d3afbdc12622` · _rev `8np06N0Lj92m6KMwkS2fmm` · updated 2026-06-27T12:34:26Z
> slug `can-copilot-take-meeting-notes-without-recording` · published

**Summary:** Copilot can take meeting notes without recording, but notes vanish when the call ends and data still processes through Microsoft 365.

---

> **TL;DR** Yes, Microsoft Copilot can take meeting notes without recording a Teams call. But three trade-offs matter: You need a Copilot add-on license, notes disappear the moment the meeting window closes, and your speech-to-text data still processes through Microsoft 365 infrastructure even without a saved recording. For professionals running confidential, back-to-back meetings where the record must outlast the call, these gaps are significant. Granola captures device audio without any visible participant in your call, deletes the audio after transcription, and stores your notes in its own SOC 2 Type 2 certified cloud rather than your Microsoft 365 tenant.

Turning off your meeting recording does not mean turning off the cloud trail. Professionals who need confidential meeting capture increasingly search for Copilot's "no recording" mode. What they find is something more limited than the feature name suggests, and the gap between expectation and reality shows up exactly when it matters most.

## The short answer: Yes, Copilot can, but with three real catches

Microsoft Copilot can assist during a Teams meeting without saving a recording. It listens via a non-persisted transcript, generates real-time notes and action items, and then deletes the temporary transcript when the call ends. According to [Microsoft's Copilot documentation](https://learn.microsoft.com/en-us/microsoftteams/copilot-teams-transcription), this is the "Only during the meeting" mode. The capability is real, but three limitations define who it actually works for.

### You need a Copilot add-on license

Microsoft 365 Copilot is an add-on license priced on top of a qualifying Microsoft 365 Business plan ($6 to $22 per user monthly depending on tier). Combined cost runs from roughly $24 per user monthly (M365 Business Basic + Copilot Business add-on) to $52+ per user monthly (M365 Business Premium + Copilot Enterprise add-on), depending on which base license and Copilot SKU your organization holds.

### Notes disappear when the call ends

When Copilot operates in "Only during the meeting" mode, [Copilot is not available](https://support.microsoft.com/en-us/office/use-copilot-without-recording-a-teams-meeting-a59cb88c-0f6b-4a20-a47a-3a1c9a818bd9) in the Recap tab after the meeting ends unless you turned on transcription or recording during the call. The moment you leave the call without transcription enabled, the temporary transcript is deleted, and no notes survive. If you close the window before copying anything, that content is gone.

## How Copilot's "no recording" mode actually works

Copilot's meeting assistance relies on temporary speech-to-text data that Teams generates internally so Copilot can reference what participants have said and respond to queries. At no point is this transcript saved to OneDrive for Business. According to [Microsoft's transcription documentation](https://learn.microsoft.com/en-us/microsoftteams/copilot-teams-transcription), this temporary speech-to-text data is deleted when the meeting finishes. The distinction between a saved transcript and one that isn't saved is central to understanding what the feature does and does not protect.

### During-meeting assistance only

During an active call, Copilot generates real-time notes, lists action items, recommends follow-up tasks, and answers questions like "What did we agree on in the last five minutes?" You interact with it through a sidebar panel in the Teams interface. According to [Microsoft's support page](https://support.microsoft.com/en-us/office/use-copilot-without-recording-a-teams-meeting-a59cb88c-0f6b-4a20-a47a-3a1c9a818bd9), other participants cannot see your Copilot conversation or the outputs it generates. The assistance is private to the individual user who activated it, making it useful for quick in-the-moment queries during internal syncs.

### Real-time summarization vs. persistent transcripts

A meeting does not need to be recorded for Copilot to assist during it. That is the feature's core premise. But a recording or saved transcript is required for Copilot to appear in the meeting Recap tab after the call. Without one of those, post-meeting intelligence simply does not exist. The real-time mode and the persistent mode are two separate capabilities, and the distinction is not prominently surfaced in the Teams interface before a meeting starts.

### What happens in the Teams interface

No bot joins the meeting as a visible participant. Copilot operates through the Teams interface itself, not as an external attendee. Other participants do not see an additional entry in the participant list. From every other participant's perspective, the meeting looks unchanged.

## What you need to use it

Copilot in Teams is not a feature you can enable on a standard Microsoft 365 subscription. It requires a specific combination of licenses and an IT administrator to configure the policy before any individual user can access it.

### Teams Premium or Copilot license required

Teams Premium at $10 per user monthly adds some meeting intelligence features but does not include the full Copilot [meeting assistant](https://www.granola.ai/ai-meeting-assistant). Before purchasing either add-on, audit your existing subscriptions, since organizations on legacy plans may face an upgrade cost that exceeds the add-on itself.

### Admin enablement and configuration

Individual users cannot turn this on themselves. An IT administrator must open the Teams Admin Center, navigate to Meetings, select Meeting Policies, and configure the Copilot setting in the Recording & transcription section. According to [Microsoft's admin documentation](https://learn.microsoft.com/en-us/microsoftteams/copilot-teams-transcription), options include "On," "On with saved transcript required," "On with transcript saved by default," and "Off." For lean teams without a dedicated IT function, this admin dependency is a meaningful barrier.

## What happens to your notes after the call

The moment you leave a Teams meeting where Copilot was running in "Only during the meeting" mode without transcription enabled, the temporary transcript is deleted and your notes become inaccessible. This is the intended behavior, and it catches most first-time users off guard.

The Copilot sidebar displays notes throughout the meeting, and while Microsoft surfaces the "Only during the meeting" mode as a configurable policy setting, users running Copilot in this mode must understand that these notes are temporary. On [Microsoft's support forums](https://learn.microsoft.com/en-us/answers/questions/4415653/after-a-microsoft-teams-call-has-ended-how-can-i-f), users describe discovering this after the fact: "Most of the times we close the call, then proceed to make the notes to find that they are no longer available. As there is no warning whatsoever and the behavior is totally not intuitive most of the times the copilot minutes are lost, making the feature useless."

If you want to retain any part of what Copilot generated in this mode, you must manually copy it into a separate document before the meeting ends. There is no auto-save, no grace period, and no recovery option once the window closes.

## What happens to your data during a Copilot call

Copilot's non-recording mode positions itself as a way to get AI assistance without the friction of a meeting recording. Microsoft's documentation for the non-recording mode focuses on what is not saved. The behavior of speech-to-text processing during the call is a separate question.

### Transcript data still touches Microsoft 365

Microsoft processes this temporary transcript in the cloud, not locally. Microsoft infrastructure converts your audio to speech-to-text during the call. According to [Microsoft's documentation](https://learn.microsoft.com/en-us/purview/retention-policies-copilot), Microsoft deletes this data when the meeting ends, but the processing itself happens in the cloud throughout the call. Additionally, your organization's Microsoft Purview retention policies may retain Copilot prompts and responses for compliance purposes even when recording and transcription are off. The absence of a saved recording does not mean the absence of a data trail for every organization.

These behaviors can be configured independently through the Teams Admin Center. Administrators can set Copilot to "Only during the meeting" mode, which avoids saving transcripts or recordings, without disabling Copilot entirely.

### Where your meeting content actually goes

During the meeting, your speech-to-text data flows through Microsoft's cloud infrastructure to support real-time Copilot assistance. Microsoft governs this data handling through your organization's Microsoft 365 tenant configuration, the Purview retention policies your IT administrator has set, and Microsoft's standard data processing agreements. Microsoft does not uniformly disclose the specific retention duration for this temporary transcript data, which varies by tenant configuration. Anyone relying on this mode for confidential meetings should verify their Microsoft 365 configuration directly, particularly if their organization operates in a regulated industry.

## When Copilot isn't the right answer

Three specific scenarios describe when Copilot's non-recording mode does not serve the user's actual need. If any of these apply, the feature will disappoint you regardless of how well it works in the moment.

### Your IT didn't license Copilot

Microsoft 365 Copilot is an enterprise add-on that requires IT review, budget approval, and tenant configuration. If your organization has not licensed Copilot, you cannot access the non-recording mode at all. For lean teams without a dedicated IT function, this procurement dependency means the feature may be months away from being usable even if you want it today.

### You need notes that survive after the meeting ends

You need documentation that outlives the meeting to build institutional memory. A summary that exists only inside an active Teams window cannot be searched, shared, or referenced in a meeting update next quarter. For anyone who needs to query across months of board meetings, investor updates, or M&A discussions to answer "what did we agree on pricing strategy six months ago?", a note-taking approach that deletes everything at call-end actively works against organizational knowledge building.

### You can't have a Microsoft cloud trail

For conversations where any cloud processing of audio creates regulatory or contractual risk, regardless of whether a recording is saved, Copilot's architecture creates a structural conflict. The speech-to-text processing, the Purview retention exposure, and the dependency on Microsoft's data handling policies remain present when using Copilot's "Only during the meeting" mode.

### Quick checklist: When to look beyond Copilot's non-recording mode

**Licensing and access barriers:**

- Your Microsoft 365 tenant does not include the Copilot add-on license
- Your IT team has not configured the Copilot meeting policy in the Teams Admin Center

**Note persistence and workflow needs:**

- You need notes searchable after the meeting ends
- You need to push notes to HubSpot, Notion, or Slack without manual copying
- You meet with external parties on platforms other than Teams (Zoom, Google Meet, Slack)

## The alternative: Granola for persistent, searchable notes

Granola is an AI notepad for people in back-to-back meetings: you are either present in the conversation or capturing it, and Granola lets you do both. You jot rough notes during the call, and when the meeting ends, Granola uses AI to automatically structure notes, extract action items, and organize decisions based on the call transcript. Or let Granola handle all of the note-taking automatically. Either way, the notes persist, are searchable, and require no enterprise license to access.

> "Granola nails exactly what I need: clean, reliable meeting transcripts and smart follow-up summaries without any fluff. I use it for nearly every call to stay focused on the conversation instead of scribbling notes. The follow-up action items are especially useful. Huge time saver." - [Verified user on G2](https://g2.com/products/granola/reviews/granola-review-11289286)

### No bot joins your meeting

Granola captures device audio directly, which means it works across any platform your call runs on: Zoom, Google Meet, Teams, Slack, WebEx, and others. No "recording has started" announcement triggers, and no additional participant appears in the list. Notes push automatically to HubSpot, Notion, Slack, Affinity, Attio, and Zapier on the Business plan, without manual copying.

> "It listens directly from my device audio no bots joining calls and produces clean, structured summaries with decisions, action items, and key points. That alone makes it far more seamless than tools like [Otter.ai](http://Otter.ai) or Fireflies, which often feel intrusive because they require a bot to join the meeting." - [Brahmatheja Reddy M. on G2](https://www.g2.com/products/granola/reviews/granola-review-11932118)

### Audio deleted, notes stored in Granola's own cloud

According to [Granola's security and privacy documentation](https://docs.granola.ai/help-center/consent-security-privacy/security-privacy-data-faqs), Granola does not store audio from meetings. It transcribes in real time, then discards the audio file. The notes and transcript are stored in Granola's SOC 2 Type 2 certified cloud infrastructure, and the source audio that created them is deleted.

Your notes are available as soon as the meeting ends and you click 'Enhance notes'. From there, they are searchable across all your meetings and accessible from the Granola app without IT involvement. You can [delete parts of a transcript](https://granola.ai/updates/delete-parts-of-transcript) if specific sections contain information you do not want retained, or [share notes](https://docs.granola.ai/help-center/sharing/sharing-notes) selectively with collaborators.

Granola achieved SOC 2 Type 2 certification in three months, compared to the typical 12 to 18 months, because the architecture deletes audio immediately. Full details are on [Granola's security page](https://www.granola.ai/security).

### No enterprise license dependency

Setup takes under 5 minutes: download the desktop app for Mac or Windows, or the [iPhone app for iOS](https://docs.granola.ai/help-center/ios/taking-notes), connect your Google or Microsoft calendar, and capture your first meeting. The Free plan covers unlimited meetings and AI-enhanced notes with limited meeting history, no IT admin required, and no CRM or productivity integrations. The Business plan extends that to unlimited meeting history and [adds integrations](https://docs.granola.ai/help-center/sharing/integrations/integrations-with-granola) with HubSpot, Notion, Slack, Affinity, Attio, and Zapier.

## Copilot vs. external tool: when each fits

The choice between Copilot's non-recording mode and an external tool like Granola is not about which product is better in the abstract. It is about which one fits your meeting context, your data requirements, and your licensing reality.

### When Copilot's mode is enough

Copilot's "Only during the meeting" mode generates real-time notes and action items during a Teams call, with notes deleted when the meeting ends. If your organization has already deployed Microsoft 365 Copilot licenses and IT has configured the policy, and you do not need notes to persist after the call, the mode is available for that narrow use case.

### When you need an external solution

External capture tools become necessary when the meeting involves external parties not in your Teams tenant, when you need a persistent written record for institutional memory, when the conversation is sensitive enough that a Microsoft cloud data trail is a concern, or when Copilot simply is not licensed in your organization. For anyone building a searchable record of confidential discussions, board meetings, investor updates, or M&A conversations, a tool that deletes notes when the call ends cannot meet that need.

Try Granola for free: [Download the app](https://granola.ai/download) for Mac, Windows, or iOS, connect your calendar, and capture your next confidential meeting with notes stored in Granola's own SOC 2 Type 2 cloud, no visible bot, and no Microsoft cloud trail.

## FAQs

**Does Copilot show up as a visible participant when taking notes without recording?**

No. When Copilot operates in "Only during the meeting" mode, it runs through the Teams interface itself rather than joining as an external attendee. Other attendees cannot see your Copilot conversation.

**Can I access Copilot meeting notes after the call ends?**

Not in "Only during the meeting" mode without transcription. According to Microsoft's support documentation, Copilot is not available in the Recap tab after the meeting ends unless you turned on transcription or recording during the call. Notes generated in this mode are deleted when the session closes.

**Does Copilot's non-recording mode completely avoid cloud data processing?**

No. Even in "Only during the meeting" mode, Microsoft infrastructure processes your speech-to-text data in real time during the call. According to Microsoft's documentation, your organization's Purview retention policies may also retain Copilot prompts and responses separately, independent of whether a recording was saved.

**Can I export Copilot's meeting notes from the non-recording mode?**

No. In "Only during the meeting" mode without transcription, Copilot generates notes only inside the active Teams window. There is no automatic export, download, or copy function. You must manually copy any content you want to keep before the meeting ends.

**Does Granola work with meeting platforms other than Microsoft Teams?**

Yes. Because Granola captures device audio directly through your microphone and system audio rather than joining as a call participant, it works with any platform that plays audio on your computer: Zoom, Google Meet, Teams, Slack, WebEx, FaceTime, and others. Setup takes under five minutes and requires no admin configuration.

**Is Granola compliant with enterprise security standards?**

Granola is SOC 2 Type 2 compliant and GDPR compliant. Audio is discarded after real-time transcription, and third-party AI providers are contractually prohibited from training on your data. Full details are on Granola's security page.

## Key terms

**Temporary speech-to-text data:** Microsoft's term for the transcript Teams generates internally during a meeting to support Copilot real-time assistance. It is deleted when the meeting ends and is never saved to OneDrive or accessible after the call in "Only during the meeting" mode without transcription.

**Device audio capture:** The method Granola uses to transcribe meetings. Captures audio directly from your device's microphone (your voice) and system audio (other participants) and transcribes in real time, then deletes the audio. Does not join the call as a visible participant.

**SOC 2 Type 2:** An independent security audit certification covering how a software company manages customer data over time. Granola achieved this certification significantly faster than typical, which verifies its security controls meet the standard across a defined audit period.
