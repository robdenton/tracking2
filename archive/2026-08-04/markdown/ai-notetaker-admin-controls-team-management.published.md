# AI notetaker admin controls: User permissions, audit logs & team management

> Archived 2026-08-04T09:37:03.827Z from Sanity oy7f1h9b/production
> _id `fb37e0bc-246c-4845-9540-a093b4957a56` · _rev `8np06N0Lj92m6KMwkWoSJk` · updated 2026-06-28T12:00:52Z
> slug `ai-notetaker-admin-controls-team-management` · published

**Summary:** AI notetaker admin controls include SSO, audit logs, data retention policies, and user permissions for secure enterprise deployment.

---

> **TL;DR:** Keep your team's meeting data accessible when team members leave. Shared folders separate personal notes from team repositories so insights persist across transitions. Automated retention handles data lifecycle, and audit logs track access for SOC 2 and GDPR compliance. No audio is stored at rest, which means a smaller compliance surface for your team: Granola captures device audio, transcribes in real time, and deletes it immediately. Enterprise includes SSO (available for workspaces with 50+ users), org-wide auto-deletion, and workspace-level access controls. Start with Business for team folders or request an Enterprise demo for SSO and retention policies.

Most teams default to whatever meeting tool came bundled with their calendar stack. The default sharing settings on those tools, combined with no access governance layer, are where participant data becomes vulnerable. When a team member leaves, their notes leave with them. When someone needs access to the meeting data repository, there is no safe way to grant it without exposing everything else.

This article breaks down the essential administrative controls needed to deploy an [AI notepad](https://www.granola.ai/ai-note-taker) securely across your organization, covering user roles, audit logging, data retention, and platform comparisons, all grounded in official documentation.

## Defining AI notetaker admin features

Workspace administration covers the controls you use to govern your organization's meeting data at scale. For AI notepads deployed across teams, typical responsibilities include:

1. **User provisioning and offboarding:** Create and deactivate accounts to prevent departing employees from retaining access to sensitive participant transcripts.
1. **Security policy enforcement:** Configure SSO, password requirements, two-factor authentication, and IP allowlisting.
1. **Data retention and deletion governance:** Set org-wide automated deletion schedules so that transcript data does not persist beyond its useful life. Many organizations align this with GDPR data minimization expectations.
1. **Access control and permissions management:** Define what each user role can view, edit, or share down to the folder level.
1. **Audit and compliance monitoring:** Maintain logs that demonstrate controls are working. Teams pursuing SOC 2 Type 2 or GDPR accountability typically need this record as ongoing evidence.

Getting these five areas right separates a consumer meeting tool from one that passes an enterprise security review.

### Managing AI notetaker user access

You need to configure two distinct layers: individual user permissions (what one person can do) and team-level access controls (what a shared workspace exposes to its members). Someone actively capturing and querying past conversations needs different access than someone reviewing findings without modifying data. Someone overseeing compliance needs org-wide visibility without participating in every meeting. These are distinct access needs that require distinct roles, not a single toggle between "admin" and "everyone else."

## Role-based access: What to look for

A well-designed permission model should map access to responsibility. When evaluating any enterprise AI notepad, look for at least these four levels of granularity as a benchmark:

- **View-only:** Can read notes and summaries but cannot edit content or change folder settings. Useful for stakeholders who need context without write access.
- **Editor:** Can create, edit, and share notes within assigned folders. The standard role for most team members.
- **Folder admin:** Can manage membership and permissions within a specific folder, without touching org-wide settings. Practical for team leads who manage access for a specific program or project.
- **Full admin:** Complete control over billing, user accounts, org-wide policies, integrations, and all data. Reserve this for IT administrators.

When evaluating tools, check whether the permission model maps to these levels or collapses them into a simpler on/off toggle.

### Granola's role model

Granola uses a two-role model within workspaces:

1. **Admin:** Manages workspace settings, billing, team membership, and roles, and can delete the workspace.
1. **Member:** Can use the workspace, view the billing page, and upgrade the workspace.

Granola's two-role workspace model is supplemented by folder-level sharing controls and Enterprise admin-enforced sharing policies, which provide access granularity beyond workspace roles alone.

Granola supports [shared team folders with access controls](https://docs.granola.ai/help-center/getting-more-from-your-notes/sharing-folders) on both Business and Enterprise plans, and Enterprise adds org-wide admin governance, including admin-enforced sharing policies and workspace-level access controls.

### Checklist: Five criteria for evaluating admin features

When evaluating an enterprise AI notepad, assess these five capabilities before approving for org-wide deployment:

1. **Identity provider integration:** Does it support SSO via Okta, Azure AD, or Google Workspace? Our [Enterprise plan](https://www.granola.ai/enterprise) supports SAML-based SSO through major identity providers for workspaces with 50+ users.
1. **Granular permission models:** Can you set folder-level access, or is it all-or-nothing at the workspace level?
1. **Audit log accessibility:** Can admins filter and export logs for compliance reviews and investigate abnormal behavior?
1. **Automated data retention:** Can you enforce org-wide deletion schedules without manual intervention?
1. **Secure offboarding workflows:** Can access be revoked immediately when an employee leaves? Many organizations aim to revoke access within 24 hours of account termination.

## Protecting sensitive meeting data access

Teams capture candid conversations about products, deals, candidates, and internal strategy under an implied expectation of confidentiality. A folder of sensitive [meeting transcripts](https://www.granola.ai/ai-meeting-assistant) should not be discoverable by every new hire. An executive conversation captured for synthesis should not be shareable outside the organization by default. These are policy decisions that need administrative infrastructure to enforce.

### Granola's team folder controls

On Granola's Business and Enterprise plans, you can create shared folders organized around research programs: Customer Discovery, Hiring Loops, and Competitor Research. Everyone with folder access can see all meetings in that collection and use folder-level chat to query across all interviews simultaneously. Granola's [Enterprise settings](https://docs.granola.ai/help-center/wip-enterprise-settings) layer provides org-wide governance, adding organization-wide discovery, admin controls for meeting link sharing, and org-wide auto-deletion periods.

### Granular folder access controls

Your meeting data repository works only if you genuinely restrict access. If a folder containing 40 customer interviews about a competitor's pricing is discoverable by your entire company, participants who shared candid views have been implicitly exposed without consent. Granola's admin controls for [meeting link sharing](https://www.granola.ai/blog/granola-free-vs-paid-features-each-plan) let you disable external sharing entirely or require work email authentication to view notes, adding a second layer of protection beyond folder membership.

### Secure data sharing with stakeholders

Share a folder in view-only mode, or export a structured summary from an enhanced note, rather than granting edit access to the underlying data. This protects the integrity of your synthesis and keeps participant data from being modified or re-shared without authorization.

> "Love that I can easily share my notes with my colleagues as well, and that we can all chat with the meeting transcript so everyone can see the full context of the meeting, even if they weren't there." - [Jess M. on G2](https://g2.com/products/granola/reviews/granola-review-9856422)

### Controlling outside collaborator access

External partners, external contributors, and temporary contractors require time-limited access. In Granola, create a dedicated folder for contractor work and control sharing via link-level access settings. Give them what the engagement requires without inheriting org-wide defaults, and remove access at the end of the engagement.

## Audit logs and activity tracking

### What gets logged in your audit trail

When evaluating any enterprise AI notepad for compliance use, the audit log capabilities matter as much as the product's core features. GDPR accountability frameworks typically expect [logging of who accessed what](https://www.cookieyes.com/blog/gdpr-logging-and-monitoring/), when, and what action was performed, while SOC 2 assessments look for evidence of [controls operating consistently over time](https://marutitech.medium.com/soc2-audit-logs-tech-guide-f53eca0d2043).

Before committing to a tool for sensitive meetings, verify that its audit logs cover the categories your compliance program actually needs: user authentication events, data access with timestamps, configuration and permission changes, data export and deletion activity, and account lifecycle events like user creation and deactivation. If the admin panel doesn't surface these in a queryable format, or if retrieving them requires a support ticket, that gap will surface at the worst possible moment during an audit or a GDPR data subject access request.

Teams managing GDPR obligations typically use logs as primary evidence for detecting and responding to security incidents.

### Accessing and filtering audit logs

When you investigate potential unauthorized access, you need to filter logs by user, date range, and event type. An admin who receives a GDPR data subject access request needs to identify every event involving that participant's data within a defined window. Check whether your AI notepad's admin panel surfaces logs in a queryable format or requires a support ticket to retrieve them.

### Log export for SOC 2 and GDPR

Verify that your tool's audit logs are exportable for external auditors and internal compliance teams. SOC 2 Type 2 assessments [typically cover six to twelve months](https://marutitech.medium.com/soc2-audit-logs-tech-guide-f53eca0d2043). [Retaining logs for a reasonable duration](https://last9.io/blog/gdpr-log-management/) can support breach investigation. Many organizations aim for a minimum of 90 days for active monitoring, with longer retention for investigations, though [requirements vary](https://impanix.com/gdpr/gdpr-logging-requirements/).

## Regulatory compliance for data retention

### Ensuring AI notepad retention compliance

Your enterprise AI notepad must let you configure org-wide auto-deletion periods so transcripts are removed automatically at regular intervals, without requiring individual users to remember to delete their own notes. Granola's Enterprise plan includes [transcript auto-deletion](https://docs.granola.ai/help-center/consent-security-privacy/transcript-auto-deletion). Contact the Granola team to configure a retention schedule that fits your compliance requirements.

### Configure data deletion cycles

Your deletion policy covers text and structured notes only. No audio is stored at rest, which simplifies retention management. Granola captures device audio, transcribes it in real time, and deletes the audio immediately. Some platforms retain video alongside audio on Business and Enterprise tiers, while compliance-only modes that keep summaries or transcripts without video are gated to Enterprise tiers specifically. Others retain transcripts indefinitely without configuration on lower-tier plans, which creates a growing audit surface over time, though their Business and Enterprise tiers do offer configurable custom retention policies. Neither approach is the default Granola takes.

### Ensuring ethical data handling

Granola turns off model training by default for your entire organization on [Enterprise plans](https://www.granola.ai/blog/granola-free-vs-paid-features-each-plan), meaning participant data from customer interviews is not used to train AI systems. This is a critical control for teams whose meeting participants have shared sensitive information under confidentiality expectations.

> "The AI Summary templates. Being able to choose what type of meeting it is and the notes being summarized accordingly. Also, the fact that Granola does not need to join your meeting." - [Verified user on G2](https://g2.com/products/granola/reviews/granola-review-11412901)

## Secure access: Add and remove team members

### SSO and automated provisioning

With Single Sign-On, you eliminate the risk of orphaned accounts. When an employee is deprovisioned from your identity provider, their access to Granola is revoked automatically without a separate admin action. Granola supports SSO via Okta, Google Workspace, and Azure AD on Enterprise plans for workspaces with 50+ users. For teams at organizations with strict IT governance, SSO is typically a prerequisite for enterprise software approval.

## Meeting enterprise compliance standards

### Achieving SOC 2 and GDPR compliance

Granola achieved [SOC 2 Type 2 certification](https://www.granola.ai/updates/granola-is-soc2-type-2-compliant) in approximately 3 months, compared to the industry standard of 12 to 18 months. Granola's accelerated timeline reflects a smaller audit surface: because Granola never stores audio, there are fewer data-at-rest controls to attest to, fewer encryption requirements to validate, and a simpler threat model for auditors to assess. When you evaluate tools against GDPR, [documenting access to personal data](https://www.papermark.com/blog/document-access-logs-compliance) is a key accountability requirement that links directly to breach response obligations. Granola's architecture reduces the personal data footprint, which simplifies both GDPR compliance and incident response.

Your meeting data is institutional memory. The right admin controls ensure that memory survives team transitions, passes compliance reviews, and remains accessible to those who need it without being exposed to those who do not. Try Granola for free. [Download the Mac, iOS, or Windows app](https://www.granola.ai/), connect your calendar, and run your next meeting to see it in action.

## FAQs

**Can admins restrict note sharing at the folder level?**

Granola's Enterprise plan includes admin controls for meeting link sharing that let you disable external sharing entirely or require work email authentication before a viewer can access shared notes. Folder-level membership can be restricted to named users only.

**What is the standard retention period for audit log data?**

No GDPR regulation fixes a specific period, but many organizations retain security logs for 90 days to 12 months to support incident response and compliance reviews. Requirements vary, so consult your legal or compliance team for guidance specific to your organization.

**Can I prevent users from sharing notes externally?**

Yes. On Granola's Enterprise plan, you can disable external sharing org-wide or require work email authentication before an external viewer can access a shared note.

**How do I bulk update user permissions?**

User groups in RBAC systems let you update permissions for an entire department at once by modifying the group's role rather than individual accounts. RBAC [extended with user groups](https://www.aserto.com/blog/implementing-custom-roles-in-your-saas-application) reduces manual setup significantly when onboarding or reorganizing teams. Check your plan's admin panel for group-level permission controls.

## Glossary

**Audit log:** A chronological record of user and system activity used to demonstrate that security controls are operating as intended. Audit logs are a core requirement for SOC 2 and GDPR accountability reviews.

**Data minimization:** The GDPR principle requires organizations to collect and retain only the personal data necessary for a specific, stated purpose. Applied to meeting tools, it means not storing transcripts longer than needed.

**Data retention policy:** An organization-wide rule specifying how long transcript or notes data is kept before automated deletion. Retention policies help align meeting data practices with GDPR and internal compliance requirements.

**Data subject access request (DSAR):** A formal request from an individual to know what personal data an organization holds about them. DSARs are a right established under GDPR and must typically be fulfilled within 30 days.

**Identity provider (IdP):** A service such as Okta, Azure AD, or Google Workspace that authenticates users and enables SSO across connected applications.

**IP allowlisting:** A security control that restricts platform access to users connecting from pre-approved IP addresses, reducing exposure to unauthorized logins from outside a corporate network.

**RBAC (Role-Based Access Control):** A permission model that assigns access rights based on a user's role rather than individual configuration. RBAC makes it easier to manage access at scale by updating a role once rather than editing each user account separately.

**SAML (Security Assertion Markup Language):** The authentication protocol used to enable SSO between an identity provider and a third-party application. When a user logs in via Okta or Azure AD, SAML handles the secure exchange of authentication data.

**SOC 2 Type 2:** An independent audit standard assessing whether an organization's security controls operated effectively over a defined period, typically six to twelve months. Granola achieved SOC 2 Type 2 certification in July 2025.

**SSO (Single Sign-On)**: An authentication method that allows users to access multiple applications with a single set of credentials. SSO also automatically revokes platform access when a user is deprovisioned from the identity provider, closing a common offboarding gap.

**Workspace admin**: The Granola role with full control over workspace settings, billing, team membership, roles, and data governance policies, including retention rules and MCP access.
