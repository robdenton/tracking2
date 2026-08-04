# AI notepad SSO integration: Enterprise authentication & access control

> Archived 2026-08-04T09:37:03.827Z from Sanity oy7f1h9b/production
> _id `beeef6a6-4946-40a6-a209-443348c1a4e3` · _rev `j6HIuEjz2DKUyBWq8nAfx3` · updated 2026-06-28T12:03:17Z
> slug `ai-notetaker-sso-integration-enterprise` · published

**Summary:** AI notepad SSO integration connects enterprise tools to Okta and Azure AD for centralized access control and automated offboarding.

---

> **TL;DR:** Enterprise AI notepads handle sensitive data, from customer interviews to board decisions. Without SAML SSO, managing who accesses transcript data can become a manual process that auditors may flag. Granola Enterprise integrates with identity providers for centralized authentication and pairs that access control with a privacy-first architecture that deletes audio immediately after transcription. At [$35+ per user per month](https://www.granola.ai/pricing), it satisfies IT security reviews without adding friction to your research workflow.

One of the biggest security risks with an enterprise AI notepad is what happens to transcripts when an employee leaves your company. Product teams want AI notepads for customer research and discovery calls. IT blocks adoption because managing access to sensitive [meeting transcripts](https://www.granola.ai/ai-meeting-assistant) without a centralized identity system creates a data exposure risk that auditors will flag. Customer interviews often contain names, strategic feedback, pricing signals, and competitive context. Without SAML SSO, managing who retains access after an employee leaves becomes a manual, error-prone task.

This guide covers how to connect enterprise [AI notepads](https://www.granola.ai/ai-note-taker) to identity providers, what SSO does at a technical level, and how Granola Enterprise addresses the controls IT requires before approving any new tool.

## Why enterprise AI notepads need SSO

Meeting transcripts sit in a different risk category than most SaaS data. They can capture colleague names, customer identities, project details, and strategic context, making them a high-value target if access is not properly controlled.

SSO solves three specific problems for enterprise AI notepad deployments:

- **Centralized access control:** IT manages permissions from a single identity system rather than within each application separately.
- **Audit visibility:** Every login attempt, successful or failed, routes through the IdP and creates a log entry your compliance team can review.
- **Automated offboarding:** When HR deactivates an account in the IdP, the employee loses access to all connected applications, including their full meeting archive.

Granola transcribes device audio and deletes it immediately after processing, so the sensitive data requiring protection is the transcript itself. That makes SSO-enforced access control the critical security layer for any team using Granola for customer research or strategic discussions.

## AI notepad authentication: the SSO mechanics

### SAML vs OAuth: What IT actually needs

SAML (Security Assertion Markup Language) and OAuth 2.0 solve different problems. Understanding the distinction prevents misconfiguration during enterprise deployment.

**SAML handles authentication.** It verifies identity. When a user logs in, the IdP sends a signed XML assertion to the application confirming who the person is and which groups they belong to. SAML is widely used in regulated environments where auditability and predictable access control are required.

**OAuth handles authorization.** It grants limited access to resources, such as calendars or files, without sharing passwords. For AI notepads, OAuth is appropriate for calendar sync. SAML is commonly used to control who can authenticate to and access the transcript repository.

### How SAML tokens flow

When you access Granola through SSO, the sequence works as follows:

1. You request access, and Granola redirects you to the configured IdP.
1. The IdP authenticates you and generates a signed SAML assertion containing your identity and group memberships.
1. Granola receives the assertion, validates the signature, and creates or updates your session based on the passed attributes.
1. In a standard SAML flow, your credentials are verified by the IdP rather than passed directly to the application.

## Connecting AI notepads to identity systems

All SAML integrations follow a similar pattern, regardless of provider. Start with [Granola's enterprise SSO setup guide](https://docs.granola.ai/help-center/sso-setup-guide) for Granola-specific configuration steps; [Okta's SAML 2.0 guide](https://developer.okta.com/docs/guides/build-sso-integration/saml2/main/) and Microsoft's [Entra ID documentation](https://learn.microsoft.com/en-us/entra/identity/saas-apps/tutorial-list) provide supplementary provider-side configuration details. Typical steps include creating the enterprise application in your IdP, configuring SAML endpoints by supplying the Assertion Consumer Service (ACS) URL and Entity ID required by your identity provider, mapping user attributes such as email and display name according to your IdP's standard SAML claims configuration, completing the metadata exchange to establish the trust relationship between your IdP and Granola, and assigning a pilot group in your IdP, running test logins to verify attribute mapping, then expanding to your full organization once validation passes.

### SSO support comparison

<!-- rawHtml block 60edf42c2fbe -->
<table style="width:100%; table-layout:fixed; border-collapse:collapse;">
  <thead>
    <tr>
      <th style="width:22%; padding:12px; text-align:left; white-space:normal;">AI<br>notepad</th>
      <th style="width:18%; padding:12px; text-align:left; white-space:normal;">SAML<br>SSO</th>
      <th style="width:30%; padding:12px; text-align:left; white-space:normal;">Supported<br>IdPs</th>
      <th style="width:30%; padding:12px; text-align:left; white-space:normal;">Price<br>with SSO</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding:12px;">Granola</td>
      <td style="padding:12px;">Yes</td>
      <td style="padding:12px;">Contact the sales team to confirm compatibility</td>
      <td style="padding:12px;">$35+/user/month</td>
    </tr>
    <tr>
      <td style="padding:12px;">Fireflies</td>
      <td style="padding:12px;">Enterprise plan available</td>
      <td style="padding:12px;">Contact vendor</td>
      <td style="padding:12px;">Enterprise: $39+/user/month</td>
    </tr>
    <tr>
      <td style="padding:12px;">Otter</td>
      <td style="padding:12px;">Enterprise plan available</td>
      <td style="padding:12px;">Contact vendor</td>
      <td style="padding:12px;">Enterprise: Custom</td>
    </tr>
    <tr>
      <td style="padding:12px;">Fathom</td>
      <td style="padding:12px;">Contact vendor</td>
      <td style="padding:12px;">Contact vendor</td>
      <td style="padding:12px;">$19-$29/user/month (varies by tier)</td>
    </tr>
  </tbody>
</table>

## Controlling who accesses your AI notepad

When HR deactivates a user in the IdP, IT can ensure that access to connected applications is revoked promptly. A departed product manager who conducted years of customer interviews loses individual access, while their research can stay in the organization's shared folders for authorized colleagues to query.

SAML assertions can carry group membership attributes from the IdP. Enterprise AI notepads can map these to internal roles, allowing IT to assign admin controls and standard user access based on IdP group membership. Shared discovery folders can be accessible only to employees in the correct IdP group, without manual permission management in the application whenever the team changes.

## Role-based permissions for team research

Granola's shared folder system lets product teams create dedicated repositories for customer research, discovery calls, and stakeholder interviews. Admins control external sharing at the organization level.

**Enterprise link controls:** Granola Enterprise admins can control external link sharing at the organization level, closing the gap that allows sensitive transcripts to leak through forwarded links.

**Research folder permissions:** For customer research folders shared with engineering or design stakeholders, admins assign view or edit access based on IdP group membership.

**AI-enhanced note sharing:** Granola supports [AI-enhanced notes](https://docs.granola.ai/help-center/taking-notes/ai-enhanced-notes) that preserve your structure while filling in transcript context, so the same notes that captured the session inform roadmap decisions without reformatting.

## Audit logging and compliance reporting

SOC 2 Type 2 requires evidence that only authorized users can access sensitive data for an extended period. Granola achieved [SOC 2 Type 2 certification](https://www.granola.ai/updates/granola-is-soc2-type-2-compliant) in July 2025. The privacy-first architecture, which deletes audio immediately after transcription, reduced the scope of compliance required for certification.

Your audit trail should capture: successful and failed authentication events from the IdP, transcript access events, sharing actions (who created external links and when), and admin configuration changes. Every action should leave a trace that auditors can review.

On the Enterprise plan, the AI training opt-out applies to your entire organization by default. Third-party AI providers are contractually prohibited from training on your meeting transcript data. GDPR compliance is supported through org-wide auto-deletion schedules for transcripts.

## IT team's SSO implementation considerations

Before enabling SSO company-wide, consider this sequence:

1. **Configure SSO in staging:** Create a pilot group in your IdP, then verify login and role assignment work correctly.
1. **Test offboarding procedures:** Verify that deactivating a test account in your IdP removes access to Granola within your acceptable timeframe.
1. **Enforce SSO for your domain:** Enable mandatory SSO once testing passes, redirect users with your email domain to the IdP, and close password-based logins.
1. **Set org-wide deletion and training policies:** Configure transcript auto-deletion periods and confirm AI training opt-out is active.
1. **Plan for IdP downtime:** Document your contingency procedure for identity provider outages.
1. **Communicate to your team:** Announce the change in advance, explain that SSO replaces password login, and share the updated login URL.

Try Granola for free by downloading the [Mac, Windows, or iOS app](https://www.granola.ai/). If you are deploying Granola for customer research at scale and need to clear IT's security review, [contact the enterprise sales team](https://www.granola.ai/contact) to configure SSO and org-wide compliance controls.

## FAQs

**What is SAML SSO for an enterprise AI notepad?**

SAML SSO allows your identity provider to authenticate users and pass their verified identity to an AI notepad like Granola without sharing passwords. IT manages access centrally, and every login creates an auditable event.

**Does Granola support automated offboarding when employees leave?**

When you deactivate a user in your IdP, Granola Enterprise SSO integration revokes their access. The transcript archive remains accessible only to authorized team members.

**Which identity providers does Granola Enterprise integrate with?**

Granola Enterprise supports SAML SSO with common identity providers. Contact the [enterprise sales team](https://www.granola.ai/contact) to confirm compatibility with your IdP and discuss setup requirements. Setup requires exchanging metadata between your IdP and Granola's enterprise admin settings.

**What happens to meeting transcripts when an employee leaves?**

With SSO active, a departed employee's Granola access is revoked when their IdP account is deactivated. Their notes and shared folder contributions can stay accessible to authorized colleagues, so research knowledge stays with the organization.

**Is Granola Enterprise SOC 2 Type 2 certified?**

Yes. Granola achieved SOC 2 Type 2 certification in July 2025. The privacy-first architecture, which deletes audio immediately after transcription, reduced the compliance scope required for certification.

**What does the Enterprise AI model training opt-out cover?**

The Enterprise plan opts your entire organization out of AI model training by default. Third-party AI providers are contractually prohibited from training on your meeting transcript data.

**Can Enterprise admins restrict external sharing of meeting notes?**

Yes. Granola Enterprise admins can control external link sharing across the organization from the admin panel.

**How does Granola handle audio data differently from other enterprise tools?**

Granola [transcribes device audio in real time](https://help.granola.ai/article/ai-enhanced-notes) and then deletes the audio. No recordings are stored. This architectural choice reduces the data footprint that security audits must cover.

## Key terms glossary

**SAML (Security Assertion Markup Language):** An open standard for exchanging authentication data between an identity provider and a service provider. Enterprise SSO uses SAML because it delivers signed identity assertions that include group membership attributes.

**SSO (Single Sign-On):** A system that lets users authenticate once through a central identity provider and access multiple applications without logging in separately. Reduces credential sprawl and centralizes access control.

**IdP (Identity Provider):** The system that authenticates users and issues identity assertions. Common enterprise IdPs include Okta and Microsoft Entra ID.

**SOC 2 Type 2:** An independent audit that verifies a company maintains strict data controls over an extended period.

**GDPR:** The EU General Data Protection Regulation governing how personal data is collected, stored, and processed. Granola is GDPR compliant and supports org-wide auto-deletion policies for transcript data.
