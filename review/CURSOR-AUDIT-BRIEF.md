# Brand-safety audit brief — Granola marketing site

You are auditing the copy in this repository against Granola's messaging rules.
This is a brand-safety and liability review, not a copy-quality review. A miss
is expensive; a false positive is cheap. When a passage is borderline, flag it.

The same audit has already been completed on the 207 SEO blog articles (a
separate Sanity corpus), so these rules are settled and owner-approved — do not
relitigate them. Your job is to find violations in THIS repo's pages, report
them, and propose fixes. **Do not change any copy until the owner approves the
findings.**

## The one-sentence test

**Saying Granola uses no bot is fine. Coupling that fact with secrecy is never
fine.** If a sentence tells the reader — or lets them infer — that other
participants won't know, won't notice, needn't be told, or will speak
differently, it fails. The bare fact ("no bot joins your call") passes.

## Failure modes to hunt

**1. Secrecy coupling (the core one).** The no-bot fact joined to
imperceptibility: "no one else in the room will know it's there", "nothing
appears for participants", "no notification appears", "nothing changes about
the room". Also any framing where what participants can see is the basis for
choosing Granola (comparison rows like "Participant visibility" with
imperceptibility as the win).

**2. Candour claims — banned entirely.** Any suggestion that people speak
differently, hedge, hold back, or are more honest when no bot is visible:
"people speak differently when a recorder is in the room", "candidates hedge",
"counterparties pull back", "your Q&A stays candid", "performing for a
recording". High-stakes settings (client calls, interviews, board meetings,
terminations, fundraising) may be referenced — but the reason Granola helps
there is **recall and staying present, never being unnoticed**. Replace the
point entirely; never soften the wording.

**3. Anti-disclosure framing.** Granola's stance: **users should inform
participants that Granola is transcribing**, and the product ships an in-chat
notification and video watermark for exactly that. Copy that presents the
absence of a notification as a benefit, or treats disclosure as friction,
awkwardness or a nuisance, fails. Mentioning the notice/watermark positively is
encouraged.

**4. False storage claims.** Ground truth: **notes and transcripts are stored
in Granola's cloud and sync to Granola's servers.** Any claim that notes never
leave the device, are local-only, aren't in the cloud, or "aren't sitting on a
third-party server" is factually false — flag red. Also flag unscoped absence
claims a reader would apply to their notes: "no storage", "nothing is stored
anywhere". What IS true and fine: audio is captured from the device and
**deleted once notes are generated**; no recording is kept; notes are private
by default; capture-method descriptions ("captures device audio locally").

**5. Competitor denigration.** Comparisons are purely factual: what each tool
verifiably does (joins the call as a participant / captures device audio),
platforms, pricing, output. No judgements about presence, intrusiveness,
participant comfort, "generic summaries", tools that "understand nothing", or
competitor intent. Naming competitors as doing bot-based capture *well* is
good practice. Also flag workaround framing like "nothing for IT to block".

**6. Product-description accuracy.** Granola runs on **Mac, Windows, iPhone
and Android** — never describe it as Mac-only or "Mac or Windows" only. The
approved framing: *"Granola runs on your laptop or phone and uses your
device's audio to generate notes."*

## Explicitly fine — do not flag

- "Without the bot", "no bot joins your call", "it doesn't attend your
  meetings" — the bare fact, anywhere, including headlines and tables
- A factual "Bot presence" comparison row; Granola's cell may read
  "No bot — uses your device audio"
- "Audio is deleted after transcription", "no recording is stored"
- "Notes are private by default" (a data-handling claim about the notes)
- Security/compliance facts: SOC 2, GDPR, encryption, SSO
- "Runs in the background" when clearly about the user's own workflow —
  flag only when it implies imperceptibility to other participants

## Rules for proposed fixes

- If a passage exists mainly to make a banned point, **propose deleting it**,
  not rephrasing it. Check the deletion leaves grammatical, non-duplicated
  copy — the commonest defect is a fix that repeats a neighbouring sentence.
- Never introduce the no-bot fact into copy that didn't already make it.
- **Customer testimonials are never reworded.** If a real person's quote makes
  a banned point, propose a trim (removing whole contiguous parts, every
  remaining word verbatim and in order) or removal of the quote. Editorial
  callouts formatted as quotes (TL;DRs) may be rewritten freely.
- Write toward what Granola does: note quality, staying present, recall across
  every conversation, context flowing into tools (Claude, ChatGPT, CRM).

## Method

Audit every user-visible string: page components, MDX/markdown content, FAQ
data (including collapsed accordion answers), meta titles and descriptions,
OpenGraph tags, JSON-LD structured data, comparison-table data files, image
alt text, and testimonial/quote data.

Useful greps to seed the hunt (then read surrounding context — the judgement
is semantic, not lexical): `secretly|stealth|hidden|undetectable|invisible|
covert|discreet`, `no one (else )?(knows|sees|can tell)|won't know|nobody
knows`, `notification|announce|watermark`, `in the background|silently`,
`third[- ]party server|never leaves|stored locally|no cloud|nothing is
stored`, `speak (differently|freely)|candid|hedge|hold back|guarded|
performing`, `participant (visibility|comfort)|bot presence`, `IT to block`,
`Mac[- ]only|Mac or Windows`.

## Report format

One markdown file, findings grouped by page/file, ordered worst-first:

```
## <page route> (<file path>)
- **RED|AMBER** <failure mode>: "<exact quote>"
  - Why: <one sentence, stated as fact about what the copy tells the reader —
    if you need "could be read as", it probably passes>
  - Fix: <proposed replacement, or DELETE with what remains>
```

End with a short list of anything you deliberately did NOT flag that a
stricter reading might have, with the rule that clears it. Do not edit any
files in this pass.
