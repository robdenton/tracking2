# From Dovetail to Granola: Migration guide for research-heavy product teams

> Archived 2026-08-04T09:37:03.827Z from Sanity oy7f1h9b/production
> _id `d2229f0a-91fe-4659-a1b3-1f100b2c27e9` · _rev `54Nm1FGTvxGebyndD1V5xI` · updated 2026-04-30T09:58:39Z
> slug `migrate-dovetail-granola-research-repository` · published

**Summary:** Migrate from Dovetail to Granola without losing research data. Export steps, cost comparison, and pilot setup for product teams.

---

> **TL;DR:** Most product teams don't outgrow Dovetail because of a feature gap. They outgrow it because the administrative overhead of manual tagging consumes hours that should go toward discovery work. Granola is an AI notepad for back-to-back meetings where you jot rough notes and AI enhances them using transcript context. At $14/user/month on the Business plan, it sets up quickly and lets you query across every past customer interview without building a tagging taxonomy first. This guide walks you through the exact migration path: what exports cleanly, what doesn't, and how to run a pilot without disrupting active discovery cycles.

Product teams often reach a point where the tool designed to organize research creates more work than the research itself. This guide covers the full migration path from Dovetail to Granola: which exports are clean, how to set up your research repository, and how to run a pilot without disrupting active sprints.

## Assessing Granola's fit for your product team

The two tools start from different philosophies. Dovetail is a dedicated research repository built around manual tagging, insight trees, and visual channels for UXR teams. Granola is a notepad first, one that transcribes audio from your device, enhances your rough notes after the meeting, and lets you query all past conversations instantly.

### When Dovetail features are critical

Dovetail works best when your team includes multiple dedicated UX researchers who need to share and cross-reference tagging taxonomies across dozens of concurrent projects. Its CSV and JSONL export formats support complex data pipelines, and its highlight reel feature, which stitches clips from multiple video sessions into a single .mp4, has no equivalent in Granola. Dovetail's Magic Search also supports folder-level filtering, though that capability is restricted to the Enterprise plan. If video analysis, visual channel summaries, or institutional taxonomies with strict governance are non-negotiable for your team, Dovetail remains the right fit.

### When Granola is a better fit

If you run 4-8 customer interviews weekly alongside sprint ceremonies and stakeholder meetings, Granola removes the synthesis bottleneck. You jot what matters during the call, click "Enhance notes" when it ends, and the AI fills in context from the transcript. No tagging required, no post-call formatting sprint.

Folder-level queries replace the manual "find what we learned about X" search. Ask "What objections came up most often about pricing?" across your entire Customer Discovery folder, and Granola returns an AI-generated answer with citations from specific conversations. This transforms hours of manual synthesis into instant recall with source references.

For qualitative research specifically, Granola transcribes device audio directly without joining your Zoom or Meet as a visible participant. There's no recording bot announcement, which matters when participants share sensitive feedback. When a participant notices a third party on the call, the dynamic shifts. Granola avoids that entirely.

> "It's so much better than the AI notetakers that just join a meeting, because it doesn't disrupt the flow at all. I can keep taking my own notes, and I never have to worry about missing anything important." - [Verified user on G2](https://g2.com/products/granola/reviews/granola-review-12594807)

### Template: Justify your AI switch

Use this table when presenting the switch to your Head of Product or operations team.

<!-- rawHtml block 80d63412f803 -->
<table style="width:100%; border-collapse:separate; border-spacing:0;">
  <colgroup>
    <col style="width:30%" />
    <col style="width:35%" />
    <col style="width:35%" />
  </colgroup>
  <thead>
    <tr>
      <th style="padding:12px; text-align:left;">Feature or cost</th>
      <th style="padding:12px; text-align:left;">Dovetail Professional</th>
      <th style="padding:12px; text-align:left;">Granola Business</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding:12px;">Price per user per month</td>
      <td style="padding:12px;">$15</td>
      <td style="padding:12px;">$14</td>
    </tr>
    <tr>
      <td style="padding:12px;">Bot-free capture</td>
      <td style="padding:12px;">No</td>
      <td style="padding:12px;">Yes</td>
    </tr>
    <tr>
      <td style="padding:12px;">Folder-level AI queries</td>
      <td style="padding:12px;">Enterprise plan only</td>
      <td style="padding:12px;">Yes (Business plan and above)</td>
    </tr>
    <tr>
      <td style="padding:12px;">Manual tagging taxonomy</td>
      <td style="padding:12px;">Yes (complex)</td>
      <td style="padding:12px;">No (AI queries replace tagging)</td>
    </tr>
    <tr>
      <td style="padding:12px;">Highlight reel from video clips</td>
      <td style="padding:12px;">Yes</td>
      <td style="padding:12px;">No</td>
    </tr>
    <tr>
      <td style="padding:12px;">CRM integrations</td>
      <td style="padding:12px;">See Dovetail documentation</td>
      <td style="padding:12px;">HubSpot, Attio, Affinity (Business plan)</td>
    </tr>
    <tr>
      <td style="padding:12px;">SOC 2 Type 2</td>
      <td style="padding:12px;">Yes</td>
      <td style="padding:12px;">Yes</td>
    </tr>
    <tr>
      <td style="padding:12px;">GDPR compliant</td>
      <td style="padding:12px;">Yes</td>
      <td style="padding:12px;">Yes</td>
    </tr>
  </tbody>
</table>

The annual savings for a 5-person team are modest at $60, but the workflow savings compound. Folder-level queries replace hours of manual synthesis per week, and time recovered across interview cycles is the real return.

## Exporting your research data from Dovetail

Before you set up Granola, export everything from Dovetail. Download a complete export of every project you want to keep before you cancel your Dovetail account.

### What Dovetail exports and what it doesn't

Dovetail's export formats include CSV for raw data, highlights, tags, and insights per project, plus full project archives as `.zip` files containing JSONL data. Individual notes are exported as PDFs, and transcripts from audio or video files are exported as VTT files.

Be clear about what stays behind before you start:

- **Channels data does not export.** Data points uploaded to channels, themes generated in channels, and summaries generated on themes are all excluded from Dovetail's export function.
- **Highlight reels** export as `.mp4` files, but Granola has no equivalent video clip feature, so these remain as archive files in Dovetail.
- **Proprietary visualizations** and custom chart formats have no direct equivalent in Granola's note structure.
- **Complex tag hierarchies** may not have a direct equivalent structure in Granola, which uses AI folder-level queries rather than manual tagging systems.

### Steps to export Dovetail data

Always consult Dovetail's official help documentation before starting, as export options may change. The general process:

1. **Export by project:** Download the CSV of raw data, highlights, tags, and insights from each project.
1. **Export full project archives:** Use the `.zip` export option to capture JSONL files for any project you want in a structured format.
1. **Export transcripts and notes:** Download VTT files per session and PDFs for any documents where layout and embedded files matter.
1. **Save to a shared drive:** Organize exports by project name and date, and ensure at least two team members have access to the archive.

### Prepare Dovetail data for Granola import

Convert your exported CSV files and JSONL transcripts into plain text or Markdown format, then group related interviews by research theme, since these will become Granola folders. Consider using Markdown to maintain basic formatting, such as headings and lists, when transferring content. Keep your Dovetail exports as a permanent backup archive throughout this process.

## Setting up your research repository in Granola

Once your exports are organized, [download](https://www.granola.ai/) the Granola desktop app for Mac or Windows, connect your Google or Microsoft calendar, and your meetings start syncing automatically. The full setup takes under 5 minutes.

### Granola folders: Prevent lost insights

Shared folders on the [Granola Business plan](https://docs.granola.ai/help-center/update-to-granola-pricing-plans) are the structural equivalent of Dovetail projects, without the tagging overhead. Create folders that mirror your research themes: "Customer Discovery Q2 2026," "Pricing Research," "Onboarding Interviews." Everyone with folder access sees every meeting in that collection and can query across all of them.

> "Granola is the one tool I continuously have up during my day whether in a meeting or going back to 'ask questions' about what happened during the meeting." - [Andy C. on G2](https://g2.com/products/granola/reviews/granola-review-10309657)

### Import and query historical transcripts

Create a folder called "Archive: Dovetail Research" and paste converted transcripts as individual notes. Each pasted note preserves the text of past interviews, so folder queries can surface them alongside new captures. Use [Granola's note transfer documentation](https://docs.granola.ai/help-center/transfer-notes-between-workspaces) if you're moving notes between workspaces or accounts during team onboarding.

For historical research spanning many sessions, organize your archive into thematic subfolders so queries stay within a relevant scope. After migrating your archive, test directly by asking, "What did customers say about the reporting dashboard?" Granola Chat returns answers with source references that point to specific notes, so you can show stakeholders exactly which conversations support your findings.

## Running a pilot without disrupting active research

The safest pilot approach is additive: run Granola on new interviews while keeping Dovetail active for any ongoing projects until they close. This avoids mid-cycle data splits and gives you a clean comparison. The cleanest time to cut over fully is at a natural seam in your research cycle, not mid-sprint.

### 2-week pilot: Test before full rollout

Run Granola for two weeks on low-stakes internal calls and friendly customer interviews before switching your primary discovery cycle. Two weeks gives you enough notes across different call types to test folder queries, AI enhancement quality, and team adoption before the stakes are high.

Start with internal stakeholder interviews or re-engagement calls with established customers. During these calls, use Granola's notepad actively. Jot rough notes as the conversation moves. After the call, click "Enhance notes" and review what the AI added versus what you captured.

> "Easy to set up and runs quietly in the background. Accurate discussion summaries with the backup transcript available." - [Joe M. on G2](https://g2.com/products/granola/reviews/granola-review-11055567)

Track three things across your pilot:

- **Synthesis time per interview:** How long from raw notes to a shareable summary?
- **Quote accuracy:** Do AI-enhanced notes reflect what was actually said? Spot-check against your rough notes.
- **Participant comfort:** Did participants ask about recording? Did the absence of a visible bot change the dynamic?

Share access to the pilot folder with one designer and one engineer. Ask them to use Granola Chat to answer a research question they'd normally bring to you. If they find the answer independently, the repository function is working. If they can't, the folder structure or note quality needs adjustment before full rollout.

## Accelerate team workflows for faster insights

### Granola onboarding checklist

Use this checklist when rolling out Granola to your product team:

- Download Granola desktop app for Mac or Windows
- Connect Google or Microsoft calendar account
- Create shared folders matching your research themes (Business plan required for sharing)
- Invite team members to relevant shared folders
- Select a customer interview template from Granola's 29+ template library
- Run a first test interview and review AI enhancement output
- Test a folder-level query with one live research question
- Configure the [Zapier integration](https://docs.granola.ai/help-center/sharing/integrations/zapier) if your team tracks research tasks in Jira or Asana

### Adapting your research process

The shift from Dovetail to Granola is a shift from "transcribe and tag" to "jot rough notes and enhance." During interviews, type anything that feels important: a customer phrase, a moment of hesitation, a theme to expand on. Write "pricing concern," and Granola finds every pricing discussion in the transcript and adds relevant context. Leave the pad blank to get a general summary. The more specific your rough notes, the more targeted the enhanced output.

[Granola's Recipes](https://docs.granola.ai/help-center/getting-more-from-your-notes/recipes) extend this further. Use saved prompts to extract feature requests from customer calls, write follow-up emails with personalized context, or structure interview output as a PRD-ready findings document. These replace the manual reformatting work that used to follow every Dovetail export.

> "I love that you can blend shorthand with AI notes. It's also super intuitive and super easy to use." - [Mason K. on G2](https://g2.com/products/granola/reviews/granola-review-10322423)

### Build buy-in for your new tool

When presenting the switch to stakeholders, lead with what changes for them: faster access to cited findings, a shared folder they can query directly, and no more waiting for synthesis decks. Show a live folder query pulling citations from three past interviews. That demonstration lands faster than any slide comparing feature lists. For Notion-based stakeholders, Granola's [Notion integration](https://docs.granola.ai/help-center/sharing/notion) exports meetings as Notion database rows rather than standalone documents, so you can filter, sort, and maintain the same reporting format during the transition.

## Understanding both tools' strengths and limits

### Granola's limits for product teams

Being direct about constraints is part of earning credibility. There's no audio playback, so you can reference exactly what was said via the transcript, but you can't replay tone or pace. There's no Android app yet. API access is available on Business and Enterprise plans, with additional admin-level API capabilities exclusive to Enterprise. MCP support is available across all plans and enables connections to compatible AI tools like Claude, ChatGPT, and Cursor. Data access varies by plan: Basic users can access the last 30 days of meeting data, while paid plans include full history and transcript access

### Dovetail's value for product research

Dovetail built something genuinely useful for large research operations with complex tagging needs. If your team grows to include multiple dedicated UXR professionals who need shared global taxonomies, video highlight reels for stakeholder presentations, or deep channel-level thematic analysis, Dovetail's feature set serves those needs well. The decision isn't permanent in either direction. Both tools export their data.

## Troubleshooting your Granola migration

### Estimate your migration time

Migration effort scales with data volume and your team's familiarity with both platforms. The main work involves exporting from Dovetail, converting transcripts, and setting up your Granola folder structure. Plan for export preparation, file conversion, and folder organization as separate phases. Give yourself buffer time so you're not rushing through setup during an active research cycle.

### Using Dovetail and Granola together

If you're mid-way through an annual Dovetail contract, run the tools in parallel by project type. Use Dovetail for projects where complex taxonomy or video analysis is genuinely needed, and Granola for all new customer interviews. This hybrid approach lets you validate Granola's workflow fit without forcing a hard cutover before the contract ends. Use the [Granola notes transfer guide](https://docs.granola.ai/help-center/transfer-notes-between-accounts) if you're also consolidating accounts or workspaces.

### What happens to old Dovetail research links shared in Jira or Slack?

Before canceling Dovetail, audit your Jira backlog and Slack channels for shared Dovetail links. Update critical ones to point to the equivalent Granola note or Notion export. For older archived links with low traffic, a brief comment noting "archived, see Granola folder" is sufficient. This prevents broken references and ensures teams can still access the research context behind past decisions.

### Participant consent and data ethics

Granola is [SOC 2 Type 2 certified](https://www.granola.ai/updates/granola-is-soc2-type-2-compliant) and GDPR compliant. Device audio is deleted after transcription, which means no audio files are stored anywhere. Third-party AI providers are contractually prohibited from training on your data. On the Enterprise plan, model training opt-out is on by default for the entire organization. For research participants in two-party consent jurisdictions, check your organization's legal guidance on disclosure requirements for your specific jurisdiction and participant locations.

**Try Granola for free.** [Download the Mac, iOS, or Windows app](https://www.granola.ai/), connect your calendar, and run your next customer interview to see AI enhancement and bot-free capture in action. No training required, no tags to configure, and your first folder query will surface patterns your historical research has been telling you all along.

## FAQs

**Does Granola have a bulk import feature for Dovetail transcripts?**

No, Granola doesn't include a dedicated bulk import tool, so historical transcripts from Dovetail need to be converted to plain text or Markdown and pasted manually into Granola notes. MCP connectivity is available on all plans and can assist with higher-volume migrations. Basic plan users can access the last 30 days of meeting data; paid plans include full history and transcript access.

**What Dovetail data can I actually export before switching?**

Dovetail supports CSV exports for raw data, highlights, tags, and insights per project, plus full project archives as JSONL `.zip` files. Transcripts are exported as VTT files and individual notes as PDFs. Channels data does not export, including channel data points, themes, and summaries generated on themes.

**Is Granola suitable for storing sensitive qualitative research?**

Yes. Granola is SOC 2 Type 2 certified and GDPR compliant. Device audio is deleted after transcription, with no recordings stored. Enterprise plans include model training opt-out by default and organization-wide auto-deletion controls.

**How does Granola's folder query differ from Dovetail's tagging search?**

Granola uses AI to query all notes in a folder using natural language questions, returning answers with source citations. Dovetail's search relies on manually applied tags and structured insights, with folder-level filtering restricted to the Enterprise plan.

**Can I run Dovetail and Granola simultaneously during a transition?**

Yes, and it's the recommended approach if you're mid-sprint or in an annual Dovetail contract. Use Dovetail to close active projects and Granola for all new interviews. Both tools export their data, so you can consolidate the archive once your Dovetail contract ends.

**What is the cost difference for a 5-person team switching from Dovetail to Granola?**

Dovetail Professional costs $15 per user per month, and Granola Business costs $14 per user per month, saving a 5-person team $60 per year. Granola's Business plan also includes CRM integrations with HubSpot, Attio, and Affinity, as well as connectivity to Slack, Notion, and Zapier.

**Does Granola work on Windows, and does it require calendar access?**

Yes. Granola runs on macOS, Windows, and iOS. It requires a connected Google or Microsoft calendar to sync meetings automatically, and setup takes under 5 minutes after download.

## Key terms glossary

**AI notepad:** A desktop tool where you write rough notes during a meeting, and AI enhances them afterward using a real-time transcript, rather than automating note-taking entirely.

**Bot-free capture:** Transcription that works through device audio rather than joining a video call as a visible participant, so no recording announcement appears in the meeting.

**Recipes:** Saved prompts in Granola that process meeting content for specific workflows, such as extracting feature requests from customer calls or generating follow-up emails.

**Research repository:** A centralized, searchable archive of past customer interviews and discovery notes that teams can query to find patterns across multiple sessions.

**Rough notes:** The shorthand or bullets you type during a meeting that guide what the AI expands on afterward, determining the focus and structure of the enhanced output.

**Synthesis:** The process of turning raw interview transcripts and notes into actionable product insights, which folder-level queries in Granola partially automate.
