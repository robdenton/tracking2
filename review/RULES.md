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
`private`, `secure`, `compliant`, `encrypted`, `local`, `invisible`, `automatic`, `effortless`, `no bot`, `in the background`, `works silently`, `never recorded`

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
| "Private", "secure", "encrypted", "local", "compliant" | Making a genuine data-handling claim | Making a claim about other people's awareness |

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
