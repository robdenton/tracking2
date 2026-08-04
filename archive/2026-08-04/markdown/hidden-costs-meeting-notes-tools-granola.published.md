# Hidden costs of meeting notes tools: What Granola doesn't charge for

> Archived 2026-08-04T09:37:03.827Z from Sanity oy7f1h9b/production
> _id `post-hidden-costs-meeting-notes-tools-granola` · _rev `WML3b1jxzn1AOFDHagnjK1` · updated 2026-06-27T13:10:21Z
> slug `hidden-costs-meeting-notes-tools-granola` · published

**Summary:** Most AI meeting tools charge by the minute, cap your storage, and lock security features behind enterprise tiers.

---

> **TL;DR:** Most AI meeting tools charge by the minute, cap your storage, and lock security features behind enterprise tiers. If you run 4-8 customer interviews weekly, those "per minute" models quietly penalize you for doing your job. Granola's Business plan charges a flat \$14 per user per month with no minute caps, no storage limits, and no AI credit system. The cost difference isn't about subscription price. It's about what you lose when the meter runs out mid-interview.

Most SaaS pricing pages look clean until you read the footnotes. A tool that costs \$10 or \$18 per month can become significantly more expensive once you account for storage tiers, AI credit top-ups, and forced upgrades triggered when transcription caps interrupt active interviews.

For anyone running regular customer interviews, this is a predictable cost of using tools built around cloud-heavy infrastructure that passes usage costs directly back to you. Understanding why the pricing works the way it does helps you choose the right tool, not just the cheapest one on the comparison table.

## The "per minute" trap: How usage limits kill research momentum

Many tools hide their minute caps behind "unlimited" headlines, then bury conversation limits and monthly caps in the plan details.

**How the caps actually work**

Otter.ai's Pro plan structures limits at two levels:

- **Per-conversation limit:** 90 minutes on Pro, 4 hours on Business (\$30/month)
- **Monthly cap:** 1,200 minutes on Pro
- **Overage handling:** Once you hit the cap, transcription stops until your next billing cycle.
- **Real-world impact:** Five 90-minute interviews in a week (450 minutes) puts you on track to hit the 1,200-minute monthly cap by mid-month.

Fireflies.ai takes a different approach to limits:

- **Storage cap:** 8,000 minutes per seat on Pro (\$10/month annual, \$18/month monthly)
- **AI credits:** 20 credits per month on Pro, 30 on Business (\$19/month annual)
- **Add-on pricing:** \$5 per 50 credits when you run out
- **What uses credits:** Custom sections, AI Apps, and live AskFred queries

That secondary credit system makes cost forecasting difficult. A PM running five interviews per week who relies on AI summaries can exhaust their monthly allotment well before the billing cycle ends, and the prompt to buy more credits rarely arrives at a convenient moment.

**The seat tax**

Some tools require seat minimums for advanced search or security features, even if you're a solo researcher on a product team. Paying for five seats to access a feature you use alone is a real cost that rarely appears in the advertised price.

**The retention problem**

Perhaps the most damaging hidden cost is retention limits. If older transcripts become inaccessible on lower tiers or disappear when you don't renew, you lose institutional memory. The specific language a customer used six months ago. The exact quote that justified a roadmap decision. The interview where someone flagged a compliance concern you acted on. That knowledge doesn't have a line item, but losing it has real consequences.

## Granola's pricing philosophy: You buy the tool, not the minutes

Granola offers flat pricing with no minute caps because it doesn't rely on cloud-heavy infrastructure that passes usage costs back to you. Rather than sending your meeting audio to a cloud service that streams everything as a visible meeting participant, Granola captures audio directly from your device and transcribes it in real time using your computer's local audio. When the meeting ends, AI models process your notes and transcript into structured summaries. No bot joins the call. No visible participant. No per-minute meter running in the background.

This architecture lowers the infrastructure cost per meeting, which means we don't pass usage costs back to you through caps and overages. You pay a flat monthly fee and run as many meetings as you need.

### The hidden cost comparison

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
<th>Feature</th>
<th>Granola (Business)</th>
<th>Otter.ai (Pro)</th>
<th>Fireflies.ai (Pro, annual)</th>
</tr>
</thead>
<tbody>
<tr>
<td>Monthly price (per user)</td>
<td>$14</td>
<td>$16.99</td>
<td>$10 (annual) / $18 (monthly)</td>
</tr>
<tr>
<td>Conversation length limit</td>
<td>None</td>
<td>90 minutes</td>
<td>None</td>
</tr>
<tr>
<td>Monthly minute cap</td>
<td>None</td>
<td>1,200 minutes</td>
<td>None (storage cap)</td>
</tr>
<tr>
<td>Storage / history limit</td>
<td>Unlimited</td>
<td>Not published</td>
<td>8,000 minutes per seat</td>
</tr>
<tr>
<td>AI credit system</td>
<td>No</td>
<td>No</td>
<td>20 credits/month</td>
</tr>
<tr>
<td>Overage pricing available</td>
<td>N/A</td>
<td>No</td>
<td>$5 per 50 credits</td>
</tr>
<tr>
<td>Bot joins call</td>
<td>No</td>
<td>Yes</td>
<td>Yes</td>
</tr>
</tbody>
</table>

## What "unlimited" actually looks like for a product manager

Removing the meter matters most when you're running discovery work at volume. Here's what that looks like in practice on Granola's Business plan.

**Unlimited history as a research repository**

Every meeting you run stays accessible indefinitely. You can [chat with your meetings](https://docs.granola.ai/help-center/getting-more-from-your-notes/chatting-with-your-meetings) across your entire archive, not just the last 30 days. When a stakeholder asks "didn't we hear this concern six months ago?", you query your folder of customer interviews and surface the relevant quotes with source citations, rather than digging through old Notion pages or hoping someone remembers.

**MCP integration included**

Granola supports [Model Context Protocol (MCP)](https://www.granola.ai/blog/granola-mcp), an open-source standard that connects AI applications to external data sources. Think of it as a common interface that lets compatible tools plug into each other. With Granola's MCP support, you connect your [meeting notes](https://www.granola.ai/ai-meeting-assistant) to Claude, ChatGPT, Cursor, and other compatible tools directly. This isn't an enterprise add-on. It's available on every plan, including Basic. Basic users have limited history access. Business and Enterprise unlock full history and transcript access.

**Custom templates at no extra cost**

Templates for customer discovery, sprint planning, one-on-ones, and investor updates are included and fully customizable. You don't pay more to structure your notes the way your workflow requires.

## The cost of security: Why SOC 2 shouldn't be an add-on

Security gating is one of the more frustrating patterns in SaaS pricing. Tools that require "Talk to Sales" just to access compliance documentation create friction for any team handling sensitive participant feedback, internal stakeholder conversations, or research data subject to privacy regulations.

**What Granola's security posture means for your plan**

Granola achieved [SOC 2 Type 2 certification](https://www.granola.ai/updates/granola-is-soc2-type-2-compliant) in July 2025. This is a company-level certification that covers the entire platform, meaning every plan benefits from the same independently verified security controls. SOC 2 Type 2 means a third-party auditor has confirmed that security practices operate effectively over a sustained period, typically 12 months, not just that they're well-designed on paper.

Some tools gate compliance documentation and SSO behind tiers requiring custom contracts. If your security team needs evidence of a vendor's controls before approving a tool, that requirement alone can push you into a significantly higher pricing tier purely for paperwork.

**AI training opt-out**

Granola does not allow third parties such as OpenAI and Anthropic to use your personal data to train their AI models. You can also opt out of model training in your account settings on any plan. For anyone capturing sensitive participant feedback in discovery research, this matters: your customer conversations don't feed someone else's training dataset by default.

**Bot-free capture and research quality**

When a named bot joins a video call as a visible participant, some participants pull back on sensitive topics, including honest assessments of vendor relationships or feedback on internal processes. Granola accesses device audio without adding a visible participant to the call.

That design choice protects the quality of your research data, not just your privacy settings.

You should still let participants know you're using Granola. The built-in in-meeting notice handles this automatically.

## When to upgrade: Choosing the right plan

**Basic plan:** Good for getting started and testing Granola's note quality before committing budget. History access is limited to recent notes, and advanced AI thinking models are not included. Use it to run a few interviews and evaluate the output quality firsthand.

**Business plan (\$14/user/month):** Built for anyone running regular interviews or back-to-back meetings. Includes unlimited meetings, full history access, advanced AI models from OpenAI and Anthropic, and connections to Notion, Slack, HubSpot, Affinity, and Zapier. MCP is available on all plans, but Business and Enterprise unlock full history and transcript access via MCP. No arbitrary caps or seat minimums for solo users or small teams.

**Enterprise plan (\$35+ per user/month):** Adds SSO through Okta, Entra ID, or Google Workspace, organization-wide AI training opt-out enforced by default, usage analytics, API access, and priority support. The right tier for product orgs where research infrastructure is shared and compliance requirements are centrally managed.

The decision point for most research-focused PMs is straightforward: if you're running more than a handful of interviews per month and rely on your archive for stakeholder presentations or roadmap justification, the Business plan removes every constraint that would otherwise interrupt that workflow.

Try Granola for free. [Download](https://granola.ai/) the Mac, iOS or Windows app, connect your calendar, and run your next meeting to see how bot-free capture works in practice. No minute caps, no storage limits, no billing surprises.
