# SOC 2 Type II certification for AI notetakers: What enterprise buyers should know

> Archived 2026-08-04T09:37:03.827Z from Sanity oy7f1h9b/production
> _id `7c30dd16-94a7-4eaa-b27a-7670bdc8c425` · _rev `g1iCf3sb7YO68kag9BthWn` · updated 2026-06-18T07:23:55Z
> slug `soc2-type2-ai-notetaker-enterprise` · published

**Summary:** SOC 2 Type II certification proves AI notetaker security controls work over time. Learn to verify vendor compliance for the enterprise.

---

> **TL;DR:** Enterprise security teams approve AI notetakers faster and with greater confidence when vendors hold SOC 2 Type II certification, because it provides audited evidence that security controls worked continuously over time, not just on a single day. When vetting an AI notetaker, verify the report's observation period, confirm an AI training opt-out exists, and review the data retention policy before deployment. Granola is SOC 2 Type II certified, GDPR compliant, and built on an architecture that processes audio locally and stores only transcript data.

A SOC 2 Type I report evaluates whether security controls are suitably designed at a single point in time, not whether they're secure in practice. Type II is the report that matters: it proves those controls actually worked over months of continuous, observed operation.

Most enterprise teams hit the same procurement wall when they try to adopt an AI notetaker. Legal and Security block the tool before it reaches a single meeting. The concern is justified: call transcripts contain competitive strategy, confidential negotiations, and sensitive stakeholder conversations that become a liability if exposed. SOC 2 Type II certification is how an AI notetaker vendor proves, with audited evidence, that they protect that data over time. This guide explains what Type II requires, how to read a vendor's report, and why the architectural choice of deleting audio immediately changes the compliance picture entirely.

## SOC 2 Type II for trustworthy AI notetakers

SOC 2 is an auditing framework used to evaluate whether service organizations protect customer data through documented, tested controls. For AI notetakers handling sensitive meeting content, passing this audit is increasingly the minimum threshold for enterprise procurement.

### SOC 2 Type I vs. Type II

The distinction between the two report types matters more than most buyers realize. [According to Secureframe](https://secureframe.com/hub/soc-2/type-1-vs-type-2), "SOC 2 Type 1 evaluates whether controls are designed properly at a point of time, whereas SOC 2 Type 2 evaluates whether controls are designed and functioning as intended over a specified period of time." That period commonly ranges from 3 to 12 months.

Type I confirms that policies look correct in their design. Type II proves those policies held up under continuous auditor observation across the full observation window. For enterprise buyers, this is the critical difference: Type I is a snapshot, Type II is evidence.

<!-- rawHtml block ed33037d5be2 -->
<table style="width:100%; table-layout:fixed; border-collapse:collapse;">
  <thead>
    <tr>
      <th style="width:22%; padding:12px; text-align:left; white-space:normal;">Certification<br>type</th>
      <th style="width:28%; padding:12px; text-align:left; white-space:normal;">What it<br>measures</th>
      <th style="width:20%; padding:12px; text-align:left; white-space:normal;">Observation<br>period</th>
      <th style="width:30%; padding:12px; text-align:left; white-space:normal;">Enterprise<br>value</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding:12px;">SOC 2 Type I</td>
      <td style="padding:12px;">Design of controls at a single point in time</td>
      <td style="padding:12px;">None</td>
      <td style="padding:12px;">Low: confirms control design only</td>
    </tr>
    <tr>
      <td style="padding:12px;">SOC 2 Type II</td>
      <td style="padding:12px;">Operating effectiveness of controls over time</td>
      <td style="padding:12px;">3 to 12 months</td>
      <td style="padding:12px;">High: audited evidence of continuous protection</td>
    </tr>
  </tbody>
</table>

### 5 SOC 2 trust services criteria

SOC 2 audits typically evaluate five [Trust Services Criteria](https://secureframe.com/hub/soc-2/trust-services-criteria), each mapping to a real AI notetaker risk:

1. **Security:** Vendors must protect systems against unauthorized access. For a notetaker, this means your customer research transcripts cannot be accessed by unauthorized employees or external attackers.
1. **Availability:** Systems must perform as contracted. Your notetaker must be operational when interviews run, with defined uptime commitments.
1. **Processing integrity:** Transcription output must be complete and accurate, producing what the vendor claims without data loss or corruption.
1. **Confidentiality:** Vendors must protect sensitive information from unauthorized disclosure. Enterprise data cannot flow to third parties outside the agreed scope.
1. **Privacy:** Vendors must collect, use, retain, and delete personal information according to stated policy. Participant data from discovery calls must be handled with consent and removed on schedule.

Enterprise deployments commonly require at minimum the Security criterion. High-sensitivity environments may also require Confidentiality and Privacy criteria to be in scope, depending on the data being handled and industry requirements.

## Why SOC 2 Type II matters for AI notetakers

### Protecting interview data privacy

Customer research calls contain competitive intelligence, unmet product needs, and candid competitor feedback that becomes a liability if exposed. Enterprise security teams understand this, which is why they require audited evidence that a vendor's controls actually protect that content, not just a policy document that says they will.

### Corporate standards for AI notetakers

Many enterprise IT and Security teams now require a current SOC 2 Type II report before allowing any SaaS tool on company devices. Tools without it enter a slow-moving vendor risk queue or get blocked entirely.

For product managers running customer research, a blocked tool is not just inconvenient. It delays discovery work, forces undocumented workarounds, and creates inconsistent notes across the team. Choosing tools that already carry Type II certification removes that friction before it starts.

### Securing participant consent

Enterprise teams running sensitive research calls often want to know whether a notetaker appears as a visible participant, because trust with participants affects the quality of data collected. Granola leaves the disclosure to the meeting host, removing the visible bot from the participant list entirely. This matters most for confidential research calls where participant trust is the prerequisite for useful data.

> "Granola works in the background without joining as a bot, which means I can actually be present in conversations. No awkward 'there's a bot in this call' energy." - [Apprielle D. on G2](https://g2.com/products/granola/reviews/granola-review-12552067)

## Key controls in a SOC 2 Type II audit

### Secure audio and transcript storage

The most consequential architectural decision an AI notetaker vendor makes is whether to store audio after transcription. Tools that retain audio indefinitely expand their attack surface continuously: every hour of stored recording adds data breach liability.

Granola's approach is different. The AI notepad captures audio from your device's system sound and microphone, transcribes in real time, then deletes the audio. No recordings are stored anywhere. What persists is the [AI-enhanced text](https://help.granola.ai/article/ai-enhanced-notes), not the source audio. This data minimization approach reduces the total volume of sensitive data requiring protection.

Granola holds a current SOC 2 Type II certification; a full report detailing the observation period, in-scope Trust Services Criteria, and issuance date is available to enterprise buyers upon request under NDA. Storing only transcript data, rather than source audio, reduces the total volume of sensitive data in scope for auditor review.

### SOC 2 data lifecycle policies

For enterprise AI notetakers, auditors review logs showing when transcripts were created, when they were accessed, and when they were deleted relative to stated retention periods. Granola's Enterprise plan offers organization-wide auto-deletion period controls, allowing administrators to set maximum retention windows across all users rather than relying on individuals to manage their own data hygiene.

### Preventing third-party AI training

Every AI notetaker vendor routes transcripts through AI models to generate summaries and enhancements. The question for enterprise procurement is whether that processing includes your data in model training sets.

Granola prohibits third-party AI providers from training on your data through contractual agreements that apply across all plans. On the Enterprise plan, model training opt-out is also available as an organization-wide setting that administrators control, providing an additional layer of governance. Security teams get auditable evidence of the opt-out rather than a terms-of-service clause to trust.

### What data security does SOC 2 cover?

SOC 2 assesses encryption at rest and in transit for stored data. It also evaluates role-based access controls, which limit which employees can view transcript data and under what conditions. For AI notetakers, auditors specifically examine sub-processor relationships, that is, every third-party company (such as an AI inference provider that generates summaries) that handles customer data on the vendor's behalf. Each of those third parties must be documented, and their own security controls must meet the same standards the primary vendor is being audited against.

Granola's data minimization architecture reduces the surface area auditors need to evaluate, which is the kind of structural advantage enterprise security teams look for when assessing vendor maturity.

## Certified vs. non-certified AI notetakers: Key differences

### Verifying AI notetaker security design

SOC 2 Type II certification demonstrates that a vendor's security controls have been tested and verified over time. For AI notetakers, auditors evaluate how transcript data is protected throughout its lifecycle: capture, storage, access, and deletion. The capture method is one architectural dimension among several. Bot-based tools join calls as visible participants. Device-level capture tools like Granola work differently, capturing audio locally and deleting it immediately after transcription.

### Verifying data storage locations

Enterprise security teams in regulated industries typically require data residency confirmation, including where transcript data is stored and under what jurisdiction, as part of their standard vendor review.

Note that SOC 2 and GDPR are distinct frameworks. [According to Wikipedia's analysis](https://en.wikipedia.org/wiki/System_and_Organization_Controls) of the SOC 2 framework, the Trust Services Criteria can be mapped to GDPR articles, but SOC 2 certification alone does not guarantee GDPR compliance. Enterprise security reviews for [AI notetakers](https://www.granola.ai/ai-note-taker) typically require confirmation of the cloud infrastructure provider, the data center regions where transcripts are stored, and whether the vendor has a signed Data Processing Agreement (DPA) available.

### Vetting AI notetaker vendors

Enterprise security teams evaluate AI notetakers on several key dimensions. The table below outlines the controls most commonly reviewed during procurement.

<!-- rawHtml block 9b1ea87cc346 -->
Security control	Why it matters	What to ask the vendor
SOC 2 Type II report	Demonstrates ongoing control effectiveness over time	What is the observation period? When was the report issued?
Data deletion policy	Affects data exposure and protection requirements	When is audio deleted after transcription? Can we set org-wide retention limits?
AI training opt-out	Helps prevent corporate data entering training sets	Is opt-out available for Enterprise? Is it contractually enforced with sub-processors?
Sub-processor list	Documents third-party data access	Which vendors handle transcript data? Do all have adequate security certifications?
SSO and admin controls	Enables centralized access management	Do you support SSO? Can admins manage permissions organization-wide?

### SOC 2 certification duration

A Type II observation period commonly ranges from three to twelve months in industry practice, with many enterprise buyers expecting a 12-month report for full confidence. Vendors pursuing Type II certification for the first time may have a shorter initial observation period. Type I does not involve an observation period since it evaluates control design at a single point in time. Most enterprise security teams will not approve deployment until the final Type II report is issued; some will accept Type I as interim documentation with a confirmed follow-up date for the completed Type II report, but this is at the discretion of the reviewing team and should not be assumed.

## How to verify vendor SOC 2 Type II compliance

### Obtaining vendor SOC 2 reports

SOC 2 reports are confidential documents shared under NDA. [Hicomply's verification guide](https://www.hicomply.com/blog/how-to-verify-soc-2-certification) describes the standard process: send a formal request to your vendor contact stating you require the latest Type II report for your security review, and expect to sign a mutual NDA before receiving it. Vendors who refuse to share a report under NDA or claim unavailability may represent a procurement risk.

### Verify SOC 2 report dates

When reviewing a SOC 2 report, confirm the observation period start and end dates alongside the report issuance date. According to [Secureframe's report validity guide](https://secureframe.com/hub/soc-2/report-validity), a SOC 2 report is commonly considered current if issued within the last 12 months. If there is a gap between the observation period end date and today, ask for a bridge letter: a signed document from the vendor confirming no material changes to in-scope systems since the report period closed.

### Identifying SOC 2 compliance gaps

The exceptions section of a SOC 2 report is where auditors document controls that failed during the observation period. A qualified opinion indicates the auditor found that one or more controls did not function as designed. A qualified opinion does not automatically disqualify a vendor, but it requires you to understand what failed, what the remediation was, and whether the failure involved systems that handle your data.

### Vendor questions on SOC 2 scope

Four questions cut through the most common scope gaps:

1. Which Trust Services Criteria are in scope for your audit (Security only, or also Confidentiality and Privacy)?
1. Does the audit cover the specific product we will deploy, or only a subset of your platform?
1. Are all sub-processors who handle meeting transcripts included in your audit scope?
1. Do you have a current DPA we can execute before deployment?

## Estimate SOC 2 costs and timeline for enterprise

### Vendor SOC 2 approval timeline

For any team that needs a tool approved before a project begins, choosing certified vendors over tools still working through the observation period can streamline procurement.

### Passing security review for AI tools

The fastest path through an enterprise security review combines three elements: a current SOC 2 Type II report, a data minimization architecture that limits what sensitive data is stored, and pre-prepared documentation including the DPA, sub-processor list, and privacy policy.

Granola's architecture addresses the highest-concern questions before your security team asks them: audio deleted after transcription, contractual AI training prohibition, and org-wide admin controls for Enterprise deployments.

### Required documents for SOC 2 approval

Enterprise security reviews for AI notetakers commonly request the following documents before approving deployment:

- **SOC 2 Type II report**: A confidential audit report shared under NDA that provides audited evidence of control effectiveness over a defined observation period.
- **Data Processing Agreement (DPA)**: A signed contract between your organization and the vendor that defines data handling, retention, and deletion obligations. Required for GDPR-compliant vendor relationships and commonly expected by enterprise legal teams.
- **Sub-processor list**: A document identifying all third-party vendors that handle your transcript data on the primary vendor's behalf, including AI inference providers. Security teams review this list to assess the full chain of data access.
- **Privacy policy:** Documentation confirming how the vendor handles data subject rights under GDPR and applicable state privacy laws, including rights to access, deletion, and portability.
- **Model training opt-out confirmation:** Written confirmation, either in the DPA or as a separate addendum, that your organization's data will not be used to train AI models. Enterprise legal teams require this as a contractual safeguard against corporate data entering training sets.

### Pricing for SOC 2 AI notetakers

The cost of a SOC 2 Type II audit typically ranges from $20,000 to $150,000, depending on scope and company size, with median costs around $30,000, and is reflected in enterprise pricing across the category. Vendors offering compliance-grade security at consumer pricing typically have not yet completed Type II certification, which carries its own risk for enterprise buyers.

Granola's Enterprise plan starts at $35 per user per month and includes:

- SSO and admin controls for meeting link sharing
- Model training opt-out organization-wide
- Org-wide auto-deletion period controls
- Priority support with a dedicated contact
- Usage analytics for security teams

Try Granola, [download](https://granola.ai/) the Mac, iOS, or Windows app, connect your calendar, and run your next meeting to see it in action. For organization-wide controls and compliance documentation, [contact Granola](https://www.granola.ai/contact) to review the Enterprise plan and request the SOC 2 report under NDA.

## FAQs

### Does SOC 2 Type II cover GDPR compliance?

SOC 2 and GDPR are distinct frameworks with different scopes. Enterprise security reviews typically verify both separately: a SOC 2 Type II report addresses control effectiveness, while GDPR-related requirements are commonly addressed through a signed DPA and confirmation of data subject rights processes. Granola addresses both frameworks: it holds a current SOC 2 Type II report and supports GDPR compliance through a signed Data Processing Agreement (DPA), data subject rights fulfillment including access, deletion, and portability, and an architecture that stores only transcript data. [Contact us here](https://www.granola.ai/contact) to request the DPA and confirm data residency details for your review.

### When does a SOC 2 report expire?

SOC 2 reports cover a defined observation period, commonly 12 months, and enterprise security teams often treat a report as current only if issued within the past 12 months. Vendors should provide a bridge letter for any gap between the observation period's end date and your vendor review date.

### How should I secure sensitive research data when using an AI notetaker?

Select tools that delete audio immediately after transcription, hold a current SOC 2 Type II report, and offer an explicit AI training opt-out in writing. For regulated industries or EU data subjects, confirm the vendor has executed a DPA and can confirm data residency. Note that AI training opt-out typically prevents future data from being used for training but does not necessarily remove data already collected.

### What if a vendor says their SOC 2 is 'in progress'?

"In progress" may mean the vendor has completed a Type I audit and is currently in the observation period required for Type II. Request the Type I report as interim documentation and set a follow-up date to receive the final Type II report.

**Does Granola support SSO for enterprise deployments?**

Yes. Granola's Enterprise plan includes Single Sign-On (SSO), org-wide admin controls, and consolidated billing.

## Key terms glossary

**Trust Services Criteria:** The five principles defined by the AICPA (Security, Availability, Processing Integrity, Confidentiality, Privacy) that SOC 2 audits evaluate. Each criterion addresses specific control categories an auditor will test during the observation period.

**Data Processing Agreement (DPA):** A contractual document between a data controller (your organization) and a data processor (your vendor) that defines how personal data is handled, retained, and deleted. A signed DPA is commonly required for GDPR-compliant vendor relationships and for enterprise deployment approval.

**Sub-processor:** A third-party vendor that a primary vendor engages to handle data on their customer's behalf. For AI notetakers, sub-processors commonly include the AI inference providers that generate summaries. Enterprise buyers should confirm all sub-processors are listed and contractually bound by the primary vendor's data handling standards. SOC 2 reports may use either the carve-out method (excluding sub-processors with disclosure) or the inclusive method (testing their controls), and you may need to review sub-processors' own SOC 2 reports.

**Bridge letter:** A signed document from a vendor confirming that no material changes have occurred to in-scope systems or controls since their SOC 2 observation period ended. Enterprise security teams request bridge letters when reviewing reports with observation periods that ended more than a few months prior to the review date.
