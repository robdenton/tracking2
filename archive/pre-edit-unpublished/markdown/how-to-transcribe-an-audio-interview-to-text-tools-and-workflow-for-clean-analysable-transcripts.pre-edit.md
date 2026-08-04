# How to transcribe an audio interview to text (tools and workflow for clean, analyzable transcripts)

> **Pre-edit original.** This is the PUBLISHED document as it stood before
> the consent & disclosure review made any change and before the article was
> unpublished.
>
> Source: `audit/data/posts.json`, captured 2026-08-03T09:18:10.180Z
> Written to the archive 2026-08-04T09:40:43.411Z
> _id `093a4857-2467-4c15-a1d9-f5d5fcb841d2` · document _updatedAt 2026-06-27T13:19:24Z
> slug `how-to-transcribe-an-audio-interview-to-text-tools-and-workflow-for-clean-analysable-transcripts`

**Summary:** Transcribe audio interviews to text using live capture or file-based tools. Get clean, analysable transcripts for research and journalism.

---

> **TL;DR:** Transcribing interviews cleanly comes down to two workflow choices: Capture live during the conversation or upload a recording afterward. Live capture, using a tool like Granola that captures device audio without joining calls as a visible participant, delivers a transcript immediately with no file uploads and no stored audio. File-based tools like Otter and Descript work well for recordings you already have. For sensitive or high-stakes interviews, live capture with audio deletion wins on privacy, speed, and participant comfort.

Most interviewers focus on their question guide and ignore the hours they will lose cleaning up messy audio files and generic transcripts afterward. The average person takes [3 to 5 hours](https://gotranscript.com/en/blog/how-long-does-it-take-to-transcribe-an-hour-of-audio) to transcribe one hour of audio, and that bottleneck is almost always a workflow problem rather than a typing speed problem. Picking the right path before the interview starts eliminates most of that overhead entirely.

This guide covers both paths, explains the three levels of transcript quality, and maps specific tools to specific use cases including journalism, qualitative research, podcasting, and customer research.

## Two paths to transcribing interviews

Qualitative interview transcription converts spoken conversation into text that can be coded, quoted, and analyzed. It differs from general [meeting notes](https://www.granola.ai/ai-meeting-assistant) because the goal is usually to preserve the exact language a participant used, not just the decisions made. The transcript becomes a primary source.

There are two ways to get there.

### Live capture during the interview

Live capture means your transcription tool converts speech to text in real time as the interview happens. The tool processes audio on the fly and, with the right architecture, deletes it immediately afterward. You end the interview with a transcript already waiting, with no upload step, no file management, and no waiting.

This approach is especially valuable when [participant privacy matters](https://granola.ai/blog/ai-notetaker-participant-privacy-consent) or when the interview involves sensitive topics like executive recruiting, M&A discussions, or confidential research. Capturing device audio locally, rather than routing audio through a visible call participant, preserves the natural conversation dynamic.

### File-based transcription after recording

File-based transcription means you record the interview first, usually as an MP4 or MP3, then upload that file to a transcription service afterward. This is the older, more familiar workflow and it works reliably for non-sensitive content.

The trade-offs are practical:

- File size limits apply (Otter's free plan caps uploads at 100MB)
- Minute caps restrict how much you can transcribe per month on most paid plans
- Turnaround adds a step between interview and analysis

### Which approach fits your workflow

Use live capture when the interview is happening now or very soon, privacy is a concern, or you want the transcript ready before you close your laptop. Use file-based transcription when you already have a recording, need to process archived interviews, or require editing tools that work on the audio itself.

## How to capture live interview transcripts

Granola is an AI notepad that captures device audio and transcribes in real time, without joining your call as a visible participant or announcing that transcription has started. You jot rough notes during the interview, and when it ends, Granola enhances those notes using the full transcript as context. Or you leave the notepad blank and let Granola handle everything automatically.

### In-person interviews with Granola

For in-person interviews, Granola accesses your laptop's microphone directly. Open the app, start a meeting, and Granola begins capturing audio from the room. You do not need any additional hardware or microphone setup, which makes it practical for coffee-shop conversations, office interviews, or any setting where pulling out a dedicated recorder would change the atmosphere.

[How transcription works](https://docs.granola.ai/help-center/taking-notes/transcription) on desktop is straightforward: Granola captures what your microphone picks up, transcribes it in real time, and discards the audio afterward. Only the text persists.

### Remote interviews on Zoom or Meet

For remote interviews, Granola captures both your microphone audio and the system audio from your computer, which includes everything coming through your speakers or headphones from the other participant. No additional participant appears in the Zoom or Meet roster. No "this meeting is being recorded" announcement triggers. The interview proceeds with the same participant list the interviewee expects.

> "It listens directly from my device audio, no bots joining calls, and produces clean, structured summaries with decisions, action items, and key points." - [Brahmatheja Reddy M. on G2](https://www.g2.com/products/granola/reviews/granola-review-11932118)

You can also [customize transcription](https://docs.granola.ai/help-center/customising-granola/customising-transcription), including language preferences.

### Why live capture beats post-recording

Two reasons stand out.

1. **Speed:** The transcript is ready the moment the interview ends, with no upload, no processing queue, and no waiting. You can begin thematic analysis within minutes.
1. **Privacy:** Granola is [SOC 2 Type 2 certified](https://granola.ai/updates/granola-is-soc2-type-2-compliant) as of July 2025. The [Granola security page](https://www.granola.ai/security) covers data handling, GDPR compliance, and AI training opt-outs in full.

## File-based transcription tools for recorded interviews

If you are working with recordings you already have, the three tools below cover the most common use cases.

<!-- rawHtml block a484dcb09a81 -->
<table style="width:100%; table-layout:fixed; border-collapse:collapse;">
  <thead>
    <tr>
      <th style="width:18%; padding:12px; text-align:left; white-space:normal;">Tool</th>
      <th style="width:28%; padding:12px; text-align:left; white-space:normal;">Best for</th>
      <th style="width:30%; padding:12px; text-align:left; white-space:normal;">Pricing and free tier</th>
      <th style="width:24%; padding:12px; text-align:left; white-space:normal;">File and minute limits</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding:12px;">Otter</td>
      <td style="padding:12px;">Quick upload and search</td>
      <td style="padding:12px;">Free: 300 min/month. Pro: $8.33/month (annual).</td>
      <td style="padding:12px;">Free: 30-min/conversation cap, 3 lifetime imports.</td>
    </tr>
    <tr>
      <td style="padding:12px;">Descript</td>
      <td style="padding:12px;">Podcast editing and audio cleanup</td>
      <td style="padding:12px;">Free: 1 hr transcription/month. Creator: $12/user/month (annual billing) or $15/month (monthly billing).</td>
      <td style="padding:12px;">Creator: 10 hrs/month transcription.</td>
    </tr>
    <tr>
      <td style="padding:12px;">Whisper</td>
      <td style="padding:12px;">Local, private processing for technical users</td>
      <td style="padding:12px;">Free and open source.</td>
      <td style="padding:12px;">Runs locally with no cloud dependency.</td>
    </tr>
  </tbody>
</table>

### Otter upload for quick transcription

Otter lets you upload an existing MP3 or MP4 and receive a searchable transcript quickly. The free plan limits you to 300 monthly transcription minutes, a 30-minute cap per conversation, and 3 audio file imports for the lifetime of the account. The Pro plan raises this to 1,200 minutes per month and 10 file imports monthly. The Business plan provides unlimited meeting minutes, though imported-file transcription is capped at 6,000 minutes per month.

Otter works well for researchers who record interviews on a separate device and process them in batches.

### Descript for editing and cleanup

Descript takes a different approach as a transcript-driven media editor: It generates a transcript and then lets you edit the audio by editing the text. Delete a paragraph in the transcript and the corresponding audio disappears from the file. This text-based editing paradigm makes it particularly useful for podcast producers and content creators who need to clean up interviews before publishing.

### Comparing accuracy and turnaround time

The biggest accuracy factors for AI transcription are audio quality, speaker accents, and domain-specific vocabulary. For specialized research interviews with technical jargon, plan for a cleanup pass regardless of which tool you use.

## Verbatim vs clean-verbatim vs intelligent verbatim

The level of transcription you need depends entirely on what you plan to do with the text. Choosing the wrong level adds hours of cleanup or, worse, loses information your analysis depends on.

### What verbatim transcription includes

Verbatim transcription captures every word and syllable uttered, including stutters, filler words, false starts, and non-verbal cues like laughter or long pauses. This level is required for linguistic analysis and research where speech patterns are themselves data.

### When to use clean-verbatim

Clean-verbatim removes unnecessary speech without changing meaning or structure. Filler words and false starts disappear. The substance stays intact. This is the standard for journalism, most qualitative research, and executive recruiting notes, because the resulting text is readable while still preserving the interviewee's exact phrasing on substantive points. For most professional interview contexts, clean-verbatim is the appropriate starting point.

### Intelligent verbatim for analysis

An intelligent verbatim transcript goes a step further by improving grammar and phrasing so the text reads more like written content. It keeps the meaning but may adjust sentence structure for clarity. This is appropriate when you plan to publish interview excerpts, generate reports from interview content, or feed transcripts into AI tools that will summarize or synthesize across multiple sessions.

Granola's AI enhancement works at this level: You jot what matters during the interview, and Granola enhances your notes with context from the full transcript, producing output that reads clearly without losing substance. The [AI-enhanced notes feature](https://docs.granola.ai/help-center/taking-notes/ai-enhanced-notes) keeps your original jottings in black and marks AI additions in gray, so you always know what came from you and what came from the transcript.

### Choosing the right level for your project

- **Journalism and investigative reporting:** Use clean-verbatim
- **Qualitative academic research:** Use clean-verbatim for coding, intelligent verbatim for reporting
- **Executive recruiting and customer research:** Use intelligent verbatim or Granola's AI-enhanced notes
- **Podcast scripts and published excerpts:** Use intelligent verbatim

## Post-transcription cleanup for thematic analysis

Raw transcripts almost always need at least one cleanup pass before they are ready for analysis. The steps below apply regardless of which transcription method you used.

### Removing filler words and false starts

If you received strict verbatim output and need clean-verbatim for coding, work through the text in passes rather than line by line. First, run a global search and replace for common fillers ("um," "uh," "you know," "like"). Then read through once for false starts and repeated phrases. Finally, check speaker labels for accuracy.

For [sensitive transcript sections](https://granola.ai/updates/delete-parts-of-transcript), Granola lets you selectively delete those portions while preserving the surrounding notes.

### Tagging themes and key quotes

This is where post-transcription analysis gets powerful with Granola. Granola Chat lets you query across entire folders of interview notes, asking questions like "What UX complaints came up most often across Q1 customer calls?" and receiving source-linked answers that cite the specific conversations where participants mentioned each theme.

The [Granola Chat feature](https://docs.granola.ai/help-center/getting-more-from-your-notes/granola-chat-dictation-vs-transcription) distinguishes between quick factual questions and complex analytical queries, making it practical for both "What did the participant say about pricing?" and "What patterns appear across all 30 user interviews in this folder?"

### Formatting for coding software

If you plan to import transcripts into NVivo, Atlas.ti, or similar qualitative analysis platforms, export your cleaned transcript as a plain text file (.txt) or comma-separated file (.csv). Most coding software imports both formats cleanly. Check that speaker labels follow a consistent format (e.g., "Interviewer:" and "Participant:") because coding software uses these labels to filter and sort during analysis.

**Interview transcription cleanup checklist:**

- Run global filler word replacements
- Remove or mark false starts
- Verify speaker labels throughout
- Delete any sensitive personal information not needed for analysis
- Check timestamps align with key moments in the interview
- Export in the format required by your analysis tool
- Back up the clean transcript in a secure location

## Privacy and consent for interview transcription

Getting transcription right technically is only half the work. The other half is getting consent and data handling right, especially for research and high-stakes professional interviews.

### Storing transcripts securely

Transcripts themselves can contain sensitive personal information, even after the audio is gone. Store them in password-protected locations, limit access to team members who need them, and establish a retention policy before starting. If your research involves protected groups, consider de-identifying transcripts before storage.

### When to use bot-free transcription

Visible participants change interview dynamics. When a source sees an unfamiliar name appear in the call roster, or hears "this meeting is being recorded," the conversation shifts. Sources become more guarded, candidates in executive searches become uncomfortable, and M&A counterparties raise concerns.

Granola's architecture eliminates this entirely. Because it captures device audio directly rather than joining the call as a participant, nothing triggers a notification and no third party appears in the roster. Audio is transcribed and immediately discarded. The SOC 2 Type 2 certification completed in three months rather than the typical 12 to 18 months specifically because the privacy-first architecture reduced the volume of sensitive data requiring audit.

## Choosing the right tool for your use case

### When source accuracy and identity protection matter

When exact source quotes and source identity are the priority, word-level accuracy is non-negotiable: misquoted sources cause professional problems. For interviews where a recording device would change a source's willingness to speak openly, live capture via device audio is the better choice.

Journalists and investigative reporters typically fall into this category.

### When transcripts feed into coding and analysis

When transcripts need to be imported into coding software, searched across large datasets, or queried at scale, the tooling priority shifts toward structured output and cross-session analysis. The [migration guide for research-heavy teams](https://granola.ai/blog/migrate-dovetail-granola-research-repository) covers how teams moving from traditional research repositories can use Granola's folder-level queries to surface patterns across large interview sets. For researchers running dozens of interviews per project, Granola Chat's ability to query across folders with source-linked citations replaces hours of manual tagging.

### When audio editing is part of the workflow

When the audio itself needs editing, not just the text, the right tool works directly on the recording. Descript is built for this use case: Delete a paragraph in the transcript and the corresponding audio disappears from the file. This text-based editing paradigm makes it particularly useful for podcast producers and content creators who need to clean up interviews before publishing. For podcast formats that also involve guest interviews requiring separate research notes, Granola handles the note-taking side while Descript handles production.

### When staying present is the priority

Documentation has to happen without demanding attention. Reading body language, following unexpected threads, and asking good follow-up questions all require full attention, and any time spent typing is time spent not listening. This is the common challenge for founders, product leaders, and anyone running structured customer research programs.

> "I can keep taking my own notes, and I never have to worry about missing anything important." - [Verified user review on G2](https://g2.com/products/granola/reviews/granola-review-12594807)

Granola's human-in-the-loop approach is built for this: Jot a few words when something important surfaces, and let the AI use the full transcript to fill in the context. The [customer research documentation guide](https://granola.ai/blog/document-customer-research-interviews-product-insights) covers how to structure these notes for maximum analytical value.

Try Granola for free. [Download](https://www.granola.ai/) the Mac, Windows, or iOS app, connect your calendar, and run your next interview to see live capture in action.

## FAQs

**How accurate are AI transcription tools?**

Modern AI transcription engines deliver strong accuracy on clear audio, with performance dropping when background noise, overlapping speakers, or heavy accents are present. Audio quality is the single biggest accuracy factor, so a good microphone and a quiet environment will improve results more than switching between tools.

**Can I transcribe interviews in other languages?**

Whisper supports multilingual transcription across 99 languages and identifies language automatically. Otter currently supports six languages including Spanish, French, German, Japanese, and Chinese, while Descript supports multiple languages, so check each tool's official documentation for your specific language before committing to a workflow.

**Do I need to tell people I'm transcribing?**

Best professional practice is to disclose transcription at the start of any interview, regardless of where you are. It removes ambiguity and keeps the conversation comfortable. From a practical standpoint, Granola's architecture gives you something concrete to explain: Audio is transcribed and immediately discarded, so no recording file persists after the conversation ends. That is a straightforward thing to tell a participant, and it tends to resolve any hesitation quickly.

**What's the best format for thematic analysis?**

Plain text (.txt) with consistent speaker labels works across NVivo, Atlas.ti, and most other qualitative coding platforms. Export your cleaned, clean-verbatim transcript in this format, verify speaker labels are uniform throughout, and de-identify any participant details before importing into shared analysis tools.

## Glossary

**Verbatim transcription:** A word-for-word record of spoken audio that includes every stutter, filler word, false start, and non-verbal cue. Used when speech patterns themselves are the subject of analysis.

**Clean-verbatim:** A transcript that removes filler words and false starts while preserving the speaker's exact phrasing on substantive points. The standard for journalism and most qualitative research.

**Intelligent verbatim:** A transcript that adjusts grammar and sentence structure for readability while keeping the original meaning intact. Used when excerpts will be published or fed into AI analysis tools.

**Thematic analysis:** A qualitative research method that identifies, codes, and interprets recurring patterns of meaning across interview transcripts.

**Qualitative coding:** The process of tagging segments of a transcript with labels (codes) to categorize themes, behaviors, or concepts for analysis, often done in software like NVivo or Atlas.ti.

**SOC 2 Type 2:** A security and compliance certification that verifies an organization's data handling controls were operating effectively over a sustained period, not just at a single audit point.
