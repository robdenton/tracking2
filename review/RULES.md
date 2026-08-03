#### The governing test

For every sentence, ask:

1. **Could a reader come away believing they can use Granola in a meeting without the other participants knowing it's taking notes?**
2. **Does this sentence position non-disclosure — others not knowing, not noticing, not being told — as a benefit, a feature, or a reason to choose Granola?**

Yes or maybe to either → flag it.

This is a test of **what the copy communicates**, not which words it contains. Judge meaning and reader takeaway, sentence by sentence, in the context of the surrounding paragraph. A sentence containing none of the terms below can fail badly — "there's no awkward moment where you have to explain what the app is doing" has no flagged word and fails. A sentence containing one of the terms can pass.

#### Layer A — deterministic lexicon scan

A script, not judgment. Case-insensitive, matching the listed terms **and their morphological variants**: secret / secretly / secrecy, stealth / stealthy / stealthily, covert / covertly, discreet / discreetly, invisible / invisibly, undetected / undetectable, silent / silently, hidden / hide / hiding.

**RED terms** — presence triggers mandatory review:
`secretly`, `stealth`, `hidden`, `undetectable`, `invisible`, `covert`, `spy`, `discreetly records`, `no one knows`, `nobody knows`, `silently records`, `secretly listens`, `no one can tell`, `invisible to everyone`

**AMBER terms** — legitimate product language that becomes a problem in the wrong frame:
`private`, `encrypted`, `local`, `invisible`, `automatic`, `effortless`, `no bot`, `in the background`, `works silently`, `never recorded`

`secure` and `compliant` were removed from this list after measurement: across 49 articles they produced 378 findings, 377 of them cleared-in-context. They are procurement vocabulary, not consent vocabulary — a bare match carries no signal. Layer B still reads every sentence containing them, so a genuine misstatement about security or compliance posture is still caught; it is caught semantically rather than by string match.

Every hit is output with its surrounding sentence. This layer is the safety net: zero misses on literal terms.

#### Layer B — semantic implicature pass

Read every sentence of every article against the governing test, **independently of what Layer A caught**. Layer B must not be a filter applied to Layer A's hits — doing that inherits the lexicon's blind spots, which is the exact failure this review exists to prevent.

Hunt specifically for:

- Framing where the absence of a meeting bot is presented as a way to avoid others noticing, rather than as a UX and reliability benefit
- "Just works in the background / no setup / nothing to announce" framing that shades into non-disclosure
- Advice about awkwardness, friction or hassle at the start of a call where the implied resolution is not mentioning it
- Comparisons that praise imperceptibility rather than criticise intrusiveness
- Testimonials or quoted users saying any of the above
- Any suggestion that consent, notification or disclosure is optional, unnecessary or a nuisance

#### Context rules — how to disposition AMBER

These come from the brand owner and override your own judgment:

| Language | Acceptable when | Flag when |
|---|---|---|
| "Private by design" | Scoped explicitly to **the notes generated** and how they're stored | Used to describe the app itself, its operation, or the meeting |
| "Invisible" | Never — treat as RED in all uses | Always |
| "Works silently" / "in the background" | Clearly about not interrupting **the user's own workflow** | Anything suggesting imperceptibility to **other participants** |
| "Your conversations are never recorded" | Flag regardless — also verify factual accuracy | Always review; it implies there's nothing to disclose |
| "No bot joins your call" | Framed as reliability/UX, alongside disclosure-positive language | Framed as a way others won't see or know |
| "Private", "encrypted", "local" (and, semantically, "secure" / "compliant") | Making a genuine data-handling claim | Making a claim about other people's awareness |

**Approved framing — the sanctioned way to make the no-bot point:**

> "No meeting bot joins your calls. Granola runs on your Mac to help generate notes after and during your meetings."

Use it as the benchmark. Copy that says the same thing in the same spirit passes; copy that leans on the same fact to imply concealment fails.

#### Dispositions

Every finding gets exactly one:

- `red` — explicit or near-explicit, fix now
- `amber` — context-dependent, needs a human call
- `cleared-negated` — term present but negated ("Granola isn't a stealth recorder"), still listed
- `cleared-in-context` — term present, legitimately used, still listed with the reasoning
- `about-competitor` — describes a competitor's behaviour ("unlike tools that secretly record"), still listed; these sit closest to the line
- `not-audited` — could not be processed, with the reason

**Nothing is silently cleared.** A cleared item that never appears in the output is indistinguishable from a miss. I want to audit the clearing decisions, because that's where a real miss would hide.

---

## Addendum — editorial position and remedies

This section governs **what to propose**, not what to flag. The governing test above is unchanged.

### A third failure mode: bot-denigration

Positioning meeting bots as bad — intrusive, awkward, unreliable, high-friction — is itself a finding, flagged `amber` at minimum.

Two reasons. It disparages competitors. And more importantly, an article that argues bots are bad has already made imperceptibility the implicit benefit, even if no sentence says so. Removing the disclosure wording while keeping the anti-bot argument does not fix the problem; it relocates it.

This applies to **rewrites as well as source copy**. A rewrite that replaces "bots make participants self-conscious" with "bots are unreliable" has not resolved the finding.

### Every red and amber finding gets two remedies

Propose both, and let the reviewer choose:

1. **A deletion** — remove the passage. State the deletion scope (`sentence` or `paragraph`) and what, if anything, the reader loses.
2. **A rewrite** — replacement copy. State the rewrite scope (`sentence` or `paragraph`).

Deletion is a first-class option, not a fallback. When a passage exists mainly to make a point about bots, privacy, consent, or what participants notice, deletion is usually the better remedy: the article rarely needs the point at all, and removing it eliminates the risk instead of relocating it.

### Rules for rewrites

- **Do not introduce the no-bot fact as a remedy.** If the original passage did not make that point, the rewrite must not add it. Reaching for "No meeting bot joins your calls" to patch a disclosure problem is the most common way these rewrites go wrong.
- **Never disparage meeting bots** — not on awareness, not on friction, not on reliability, not on cost.
- **Write toward what Granola does**, not what it avoids: note quality, less time writing things up, staying present in the conversation, what the user gets afterwards. Avoid framing built on the absence of something.
- **Prefer wholesale change over minimal patching.** Rewriting a whole paragraph, or cutting it, is preferred to threading a clean sentence into a contaminated paragraph. Do not optimise for the smallest edit.
- Where the no-bot fact genuinely belongs — a setup or reliability section where it is simply true and relevant — state it plainly, once, and never adjacent to any language about what other participants see, notice, or are told.

### Err toward caution

Where a judgement is close, take the more conservative option: prefer deleting to rewriting, prefer saying less to saying more, prefer dropping a claim to defending it. Losing a paragraph of SEO copy is cheap. A reader concluding that Granola is for recording people without telling them is not.

---

## Addendum 2 — factual accuracy of data-handling claims

A separate failure mode from disclosure, tracked as its own category: **`accuracy`**.

### Ground truth, from the brand owner

**Notes and transcripts are stored in Granola's cloud infrastructure and sync to Granola's servers.** They do not live only on the user's device.

### The subject test — apply this first

This check turns entirely on **what the sentence is a claim about**. Get the subject right before deciding anything else.

| Subject of the claim | Status |
|---|---|
| **Audio / the recording** | Accurate. **Out of scope. Do not flag.** The audio really is deleted once notes are generated, and no recording really is kept. |
| **Notes, transcripts, text, "your data", "your information"** | In scope. These are cloud-stored and sync to Granola's servers. |

Therefore any copy stating or implying that **notes, transcripts or user data**:

- never leave the user's device / Mac / computer
- are stored only locally, or on-device only
- are not stored in the cloud, or that there is "no cloud dependency"
- never touch a third-party server, or that no third party ever holds the data
- are never uploaded or transmitted

…is **factually inaccurate**. Flag it `red`, category `accuracy`.

Granola's own notes and transcripts sit in the cloud and on third-party servers. Copy that tells a reader otherwise is the exposure. Copy that describes audio being captured from the laptop and deleted afterwards is simply true, and describing it is fine.

**The one edge case that still flags:** an absence claim with no stated subject, or a subject broader than audio — "no storage", "nothing is stored anywhere", "we store nothing". A reader applies that to their notes. If the sentence names audio or the recording as its subject, clear it.

This is a legal and trust exposure independent of the consent question. A reader who chooses Granola believing their notes never leave their laptop has been misled, regardless of anything said about disclosure.

### Precision — what this does NOT cover

Do not flag these. They are different claims and several are true:

- **"Your notes stay in black. AI additions appear in gray."** This describes text colour in the editor. It is not a storage claim. This phrasing is common in the corpus and must never be flagged as an accuracy issue.
- **"Audio is captured from your device"** / "captures device audio directly" / "captured locally" — a description of the capture method, not of where data is stored.
- **"Audio is deleted immediately after transcription"** / "no recording is stored" / "no audio files are retained" / "transcribed then deleted" / "audio is discarded, only the text persists" — **all accurate, all out of scope. Do not flag these, and do not flag them "for verification".** The brand owner has confirmed this behaviour directly. An earlier version of this rule said to raise them `amber` pending verification; that produced 18 findings the reviewer rejected and none they accepted on those grounds. Verification is complete. Clear them.
- **"Third-party AI providers are contractually prohibited from training on user data"** — a contractual claim about use, not a claim that no third party holds data.
- Claims about SOC 2, GDPR, ISO 27001, DPAs, SSO or admin controls — compliance posture, not storage location.

The test is narrow: **does the copy tell the reader their notes or transcripts stay off Granola's (or any third party's) servers?** If yes, it is inaccurate. If it describes audio capture or audio deletion, it is accurate and out of scope. If it says something else about security, privacy or compliance, it belongs to the disclosure test or is simply fine.

### Remedies

Same two options as everything else — a deletion and a rewrite. For accuracy findings the deletion is usually correct: the claim is false, and the article rarely needs it. A rewrite must not replace one unverifiable claim with another; describe what is actually true (encryption in transit and at rest, retention policy, access controls, certifications) or say nothing.

---

## Addendum 3 — writing remedies that apply cleanly

Remedies are applied to the live document by machine. A remedy that reads well in isolation can still damage the page when spliced in. These rules exist because real damage reached real drafts.

### State the scope, and write to exactly that scope

- `rewrite_scope: "sentence"` — the text replaces **only the quoted sentence**. It must fit grammatically between the sentence before it and the sentence after it. Do not restate either.
- `rewrite_scope: "paragraph"` — the text replaces **the entire paragraph**, including any sentences you did not quote. Write the whole paragraph, standalone. Do not begin by repeating its opening.

The commonest failure is a paragraph-scale rewrite labelled `sentence`, or vice versa. The result is a paragraph containing itself twice, or an orphaned half-sentence.

### Never restate neighbouring copy

Read the sentences either side of your anchor. If your replacement repeats a phrase from them, it will read as duplication once applied. This includes calls to action ("Download Granola for free on Mac, Windows, iOS or Android…") and closing lines ("Setup takes under 5 minutes."), which recur across the corpus and are easy to duplicate accidentally.

### Deletions must leave a grammatical sentence

Before proposing `deletion_scope: "sentence"`, read what remains. Removing a mid-sentence clause leaves the surrounding punctuation behind — "…in the meeting, , and builds…". If removing the passage would leave a broken sentence, choose `paragraph` scope, or propose a rewrite instead and say so in `deletion_rationale`.

### Formatting you cannot see

Some passages carry bold or a link. Those cannot be replaced wholesale without destroying the markup, so they are refused and sent to Manual Reviews. If a quoted passage looks like it begins with a bolded label ("Bot-free capture: …") or contains link text, prefer a `sentence`-scope remedy that leaves the formatted words untouched.

### What is repaired automatically, and what is not

After edits are applied, the draft is checked and **provable** damage is repaired automatically: exactly duplicated phrases and sentences, and stranded punctuation. Nothing else is touched by machine — copy that is merely clumsy, or a claim that needs a human view, is listed under **Manual Reviews** rather than silently rewritten. Your remedies should not rely on that safety net.
