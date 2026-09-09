# Fulfillment & Meaning

A personal operating system for one life. Not a survey, not a workbook — a living,
searchable, evidence-backed map that turns reflection into understanding and
understanding into criteria for real decisions.

**REFLECT → UNDERSTAND → ALIGN → DESIGN**

Reflection discovers. Understanding organises. **Alignment compares it against the life as
it actually is.** Design helps choose what comes next.

## Files

```
index.html          shell: sidebar, ambient window, evidence drawer, command palette
css/styles.css      the ENTIRE visual system — one file, on purpose
js/data.js          GENERATED source material (376 entries, 61 passages, 66 answers)
js/taxonomy.js      the knowledge layer — Life Map, patterns, definitions, criteria
js/app.js           the engine — index, storage, search, derivations
js/views.js         reflect / understand / design pages, the router, behaviour
js/align.js         the ALIGN layer — compass, drift, corrections, guardrails; boots the app
img/                the five plates (see img/README.md)
tools/build_data.py regenerates js/data.js from the source Word documents
server.py           local preview on http://localhost:8944
```

**Add new styling to `css/styles.css`, not a new layer.** Three stacked stylesheets is
what made an earlier version incoherent.

## Architecture

Content is layered **Realm → Area → Chapter → Entry** rather than "question 1 of 376".
Five realms and twenty-three areas live in `REALMS` (js/taxonomy.js); every one of the
40 chapters is placed in exactly one area, and the engine warns in the console if a
chapter is ever missed or double-placed.

| Section | |
|---|---|
| **Home** | Command centre: continue, Life Map depth, strongest patterns, an open question |
| **Reflect** | Continue (session sizes) · Life Map · Reflection Library · Open Questions |
| **Understand** | Patterns · Tensions · Non-Negotiables · Definitions · Quotes From Me · Testimony · The Conversation · Ask My Life |
| **Align** | Life Compass · Life Right Now · Course Corrections · Guardrails · Current Priorities · Check My Direction (+ Navigation Check, Course Review, Am I Building the Right Life?) |
| **Design** | Ideal Life Blueprint · Decision Lab · Experiments |
| **History** | Timeline · Then vs Now |

Every old deep link still resolves: `#/paths/life/05/L05.11` → `#/entry/L05.11`.

## The alignment layer

The reflection system says *who you are*. The alignment layer asks *whether your current
life reflects it* — and it can only do that because you already described your present
circumstances in your own passages.

- **Nothing is asserted.** Drift candidates come from `CURRENT_REALITY` in `js/taxonomy.js`,
  where each present-tense condition you described is paired with the needs it works against
  and quoted verbatim. Every one can be marked Accurate / Partly Accurate / **Intentional** /
  Not Relevant / Revisit Later.
- **Intentional tradeoffs are not drift.** Recorded tradeoffs render as strategy, everywhere.
- **One bottleneck beats five problems.** The condition touching the most life areas is shown
  as the bottleneck rather than listing its symptoms separately.
- **Stay the Course is a real answer.** When nothing is pulling, the site says so and
  recommends nothing.
- **Protect** is permanent. Conditions already working are named, and a decision that would
  cost one of them says so.
- **The North Star is never silently rewritten.** It is derived, shown as a draft, confirmed
  by you; if the underlying material shifts you get *Possible change detected*, not a rewrite.
- **Depth on demand.** Every derived statement is Glance → *Why does this matter?* →
  *Why do we think this?*

## Honesty rules the code actually enforces

- **Nothing is a verdict.** Pattern confidence (Strong / Emerging / Possible) describes
  *spread* — how many separate areas and books a need recurs in — never truth.
- **Detection is labelled as detection.** Patterns are keyword counts over the user's own
  text. Every pattern page says so, and links to all of it.
- **Evidence Mode** appears under every derived statement, separating *what you said*,
  *what was detected*, *what was inferred*, and *what is still uncertain*.
- **No scores of a person.** No fulfilment percentage, no personality label. Progress is
  Deeply Explored / Developing / Early Exploration / Not Yet Explored.
- **Frequency ≠ importance.** Non-negotiables surface as unrated candidates; only the user
  sets importance.
- **Nothing is overwritten.** `draft` is what is being typed; `versions` are committed
  snapshots. Autosave only ever touches the draft, so a keystroke cannot rewrite history.

## Writing

Autosaves continuously to `localStorage` on that device only. Answers can be marked
Answered, saved as a New Version, flagged **Core Reflection** or **This Changed**, or set
aside as **I Don't Know Yet** / **Come Back Later** — skipping is never punished. Dictation
appears where the browser supports speech recognition.

Export JSON (everything) or Markdown (the writing) from **Your Data**; restore from a
backup there too.

## Regenerating the source material

```bash
python3 tools/build_data.py
```

It prints a sanity line that must match the totals stated in the summary document itself:
376 entries — 117 answered, 173 partial (*In Progress*), 86 unanswered (*Not Started*).

## Preview

```bash
python3 server.py
```
