# Fulfillment & Meaning

A personal operating system for one life. Not a survey, not a workbook — a living,
searchable, evidence-backed map that turns reflection into understanding and
understanding into criteria for real decisions.

**REFLECT → UNDERSTAND → DESIGN**

## Files

```
index.html          shell: sidebar, ambient window, evidence drawer, command palette
css/styles.css      the ENTIRE visual system — one file, on purpose
js/data.js          GENERATED source material (376 entries, 61 passages, 66 answers)
js/taxonomy.js      the knowledge layer — Life Map, patterns, definitions, criteria
js/app.js           the engine — index, storage, search, derivations
js/views.js         every page, the router, and all behaviour
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
| **Design** | Ideal Life Blueprint · Decision Lab · Experiments |
| **History** | Timeline · Then vs Now |

Every old deep link still resolves: `#/paths/life/05/L05.11` → `#/entry/L05.11`.

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
