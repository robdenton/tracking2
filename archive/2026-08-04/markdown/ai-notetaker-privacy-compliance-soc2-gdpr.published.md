# AI notetaker privacy compliance for product research: SOC 2 and GDPR

> Archived 2026-08-04T09:37:03.827Z from Sanity oy7f1h9b/production
> _id `post-ai-notetaker-privacy-compliance-soc2-gdpr` · _rev `WML3b1jxzn1AOFDHasMH8u` · updated 2026-06-28T12:33:19Z
> slug `ai-notetaker-privacy-compliance-soc2-gdpr` · published

**Summary:** Research interviews carry higher privacy stakes than sales calls: they contain PII, unreleased roadmap details, and sensitive participant disclosures.

---

> **TL;DR:** Research interviews carry higher privacy stakes than sales calls: they contain PII, unreleased roadmap details, and sensitive participant disclosures. Before deploying any AI notetaker to your research stack, verify SOC 2 Type 2 certification (not just Type 1), GDPR data deletion capability, and a clear stance on AI training. Granola is SOC 2 Type 2 certified as of July 2025, does not allow third-party AI providers to train on your data, and captures device audio locally without joining your call as a visible participant.

[AI notetaking](https://www.granola.ai/ai-note-taker) tools routinely clear product and engineering reviews, then stall when they reach security. The bottleneck is almost always the same question: "Where does the audio go?" For research teams, that question carries real weight. Your interviews contain participant PII, early roadmap thinking, and competitive intelligence that should never leave your organization's control.

This guide covers the specific compliance standards your security team will ask about and gives you a copy-paste email template to send directly to your CISO.

## Why product research data requires higher security standards than sales calls

Sales calls are transactional: the goal is capturing deal signals, objections, and next steps. Research calls are different in character. A single 45-minute discovery interview might contain a participant's candid account of an internal process failure, a health-adjacent disclosure, or an assessment of a competitor they are also evaluating. That data is sensitive in ways that standard sales recording tools were never designed to handle.

Sales tools optimize for breadth of capture. Research ethics require the opposite instinct, and that difference produces a genuinely different risk profile for the tools you choose.

## The compliance checklist: SOC 2, GDPR, and data residency

Granola holds SOC 2 Type 2 certification and is GDPR compliant. For data residency specifics, the [Granola security page](https://www.granola.ai/security) covers sub-processors, encryption, and the full data lifecycle.

### SOC 2 Type 2 vs. Type 1

Many vendors advertise "SOC 2 compliant" without specifying the type. The difference matters. A Type 1 audit assesses the design of security controls at a single point in time, while a Type 2 audit tests whether those controls operate effectively over six to twelve months. Type 2 is the meaningful standard: it demonstrates that security practices are consistent, not just that a policy document was written.

Granola achieved [SOC 2 Type 2 certification](https://www.granola.ai/updates/granola-is-soc2-type-2-compliant) in July 2025, completing the audit in three months. Independent auditors confirmed that security practices meet the Type 2 criteria for customer data privacy and confidentiality. That speed was possible because the architecture deletes audio immediately after transcription, reducing the scope of data under audit.

### GDPR and the right to be forgotten

GDPR's right to erasure matters when your research involves EU-based participants. When discussing tool selection with your security team, the relevant question is whether the architecture supports individual note deletion and avoids persistent audio storage that would create a secondary deletion burden.

Granola does not store audio from meetings. It transcribes in real time on macOS and Windows, or after the meeting using temporarily cached audio on iOS, then discards the audio file. What persists is the transcript and your notes, which [you can delete](https://docs.granola.ai/help-center/consent-security-privacy/transcript-auto-deletion) individually or in full at your request. This architecture simplifies GDPR compliance because the most sensitive data type, the audio recording itself, is never retained.

### AI training: the question most PMs forget to ask

The most overlooked compliance question is whether the vendor trains their AI models on your meeting content. Your interviews contain roadmap strategy, competitive intelligence, and participant PII that should not feed a public model.

Granola does not allow OpenAI, Anthropic, or other third-party providers to train models on your data. For Enterprise accounts, [org-wide training opt-out](https://www.granola.ai/blog/granola-pricing-teams-per-user-enterprise) is enforced by default, contractually preventing third-party AI providers from using your transcripts. Individual users on all plans can also opt out in Settings. Granola's [Security, Privacy and Data FAQs](https://docs.granola.ai/help-center/consent-security-privacy/security-privacy-data-faqs) cover retention, deletion, encryption in transit and at rest, and sub-processor details.

## The "bot" problem: how visible recorders complicate consent

When people know they are being watched or recorded, they adjust their behavior. The [Nielsen Norman Group](https://www.nngroup.com/articles/hawthorne-effect-observer-bias-user-research/) describes this as observer bias, noting that participants may "try harder to perform tasks, be less likely to give up when facing difficulties, or not behave as they normally would." For qualitative research, a participant who notices a recording participant enter mid-session may become guarded, give shorter answers, and avoid the candid criticism that makes discovery interviews valuable.

> "It doesn't join your calls like other AI note takers (that was big for me) and the AI is ACCURATE." - [Verified user on G2](https://g2.com/products/granola/reviews/granola-review-10313433)

## How Granola handles compliance without joining your call

Granola is an AI notepad, not a meeting bot. The architectural difference matters for both compliance and participant experience.

When you open Granola before a call, it captures audio directly from your device and transcribes in real time: your microphone and what you hear through speakers or headphones. There is no "Granola has joined the meeting" notification. There is no entry in the participant list. The interview feels like a direct conversation between you and your participant.

This architecture matters for compliance in three ways:

1. **Consent control:** You decide when Granola starts transcribing, so you get explicit participant consent before triggering the tool. The consent moment is clean and deliberate.
1. **No audio retention:** Granola transcribes in real time and discards the audio file. Your [AI-enhanced notes](https://docs.granola.ai/help-center/taking-notes/ai-enhanced-notes) are built from the transcript, not a stored recording.
1. **GDPR deletion:** Because there is no audio file to locate and delete, responding to a right-to-be-forgotten request means deleting the transcript and notes, which you can delete directly.

The [Granola security documentation](https://www.granola.ai/security) covers encryption in transit and at rest, sub-processors, and the full data lifecycle. For chat and query functionality across past notes, the [Granola Chat documentation](https://docs.granola.ai/help-center/getting-more-from-your-notes/granola-chat-dictation-vs-transcription) explains how dictation and transcription modes differ.

> "With Granola I don't have to worry anymore about taking meeting notes, I can just write down things I really care about and let Granola take care of the rest." - [Jess M. on G2](https://g2.com/products/granola/reviews/granola-review-9856422)

## Comparison: evaluating AI notetakers for research privacy

When evaluating tools for your security team, focus on these architectural differences. "Typical bot recorder" refers to tools that join video calls as visible participants.

<!-- rawHtml block html0 -->
<table>
<colgroup>
<col style="width: 34%" />
<col style="width: 33%" />
<col style="width: 33%" />
</colgroup>
<thead>
<tr>
<th>Feature</th>
<th>Granola</th>
<th>Typical bot recorder</th>
</tr>
</thead>
<tbody>
<tr>
<td>Visible to participants</td>
<td>No</td>
<td>Yes (appears in participant list)</td>
</tr>
<tr>
<td>Audio capture method</td>
<td>Device audio (local, no call entry)</td>
<td>Streams from within meeting platform</td>
</tr>
<tr>
<td>Consent control</td>
<td>PM controls when transcription starts</td>
<td>Joins via calendar integration</td>
</tr>
<tr>
<td>AI training on your data</td>
<td>Third-party training: never allowed. Own model training: opt-out available (Enterprise: enforced org-wide)</td>
<td>Varies by vendor and tier</td>
</tr>
<tr>
<td>SOC 2 Type 2</td>
<td>Yes (certified July 2025)</td>
<td>Varies</td>
</tr>
<tr>
<td>GDPR data deletion</td>
<td>Yes (notes and transcript deletable on request)</td>
<td>Varies</td>
</tr>
<tr>
<td>Audio retention</td>
<td>No (audio discarded post-transcription)</td>
<td>Varies (verify vendor retention policy)</td>
</tr>
</tbody>
</table>

For research specifically, the rows that matter most are participant visibility, consent control, AI training, and audio retention. A tool that joins uninvited, retains audio indefinitely, and opts into model training by default is harder to get through your security team's review.

> "I use it for nearly every call to stay focused on the conversation instead of scribbling notes. The follow-up action items are especially useful." - [Verified user on G2](https://g2.com/products/granola/reviews/granola-review-11289286)

## Template: how to pitch a compliant AI notepad to your security team

Send this email after you have tested Granola yourself and confirmed it fits your workflow, typically before requesting budget approval or rolling out to your team. Copy and adapt the following:

**Subject:** Security review: Granola AI notepad for customer research (SOC 2 Type 2, GDPR compliant)

Hi [Name],

I'd like to request a security review for Granola, an AI notepad I'm evaluating for our customer research workflow. Below are the key data points I anticipate you'll need.

**What it does:** Granola [transcribes meeting](https://www.granola.ai/ai-meeting-assistant) audio directly from my device (no bot joins the call). It captures what I hear through my computer's audio output, then generates enhanced notes from the transcript. It does not appear as a participant in Zoom, Teams, or Meet.

**Compliance status:**

- SOC 2 Type 2 certified (July 2025). Full documentation available at granola.ai/security.
- GDPR compliant with data deletion capability on request.
- No audio retention: audio is discarded after transcription. Only the transcript and notes persist.

**AI training:** Granola does not allow OpenAI, Anthropic, or other third-party providers to train models on customer data. Enterprise accounts have model training off by default, enforced organization-wide.

**Consent:** I control when transcription starts. I can obtain explicit participant consent before triggering the tool, which is our standard practice for all research sessions.

**Access to documentation:** Security FAQ: docs.granola.ai/help-center/consent-security-privacy/security-privacy-data-faqs

I can connect you directly with Granola's security team if you need a Data Processing Agreement or sub-processor list.

[Your name]

> "Their team has made themselves available via Slack or email and are incredibly responsive, proactive and engaging with their user base." - [Andy C. on G2](https://g2.com/products/granola/reviews/granola-review-10309657)

The compliance conversation with Legal becomes simpler when you can answer three questions upfront: where does the audio go (it is discarded), who trains on the data (third-party AI training is never allowed), and what happens if a participant requests deletion (transcript and notes are deleted on request).

## Get compliant research notes with Granola

Send the email template above after you have tested the tool yourself. [Download the Mac, iOS or Windows app](https://www.granola.ai/), connect your calendar, and run your next customer interview. No bot joins, no announcement interrupts rapport, and your notes are enhanced the moment the call ends. If Granola fits your workflow, you will have the compliance answers your security team needs already prepared.
