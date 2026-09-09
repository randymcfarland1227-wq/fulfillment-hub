# Fulfillment & Meaning

## Reflection workspace update

The interface now opens on a task-focused Today page, with a resume link, workbook
progress, and expandable north-star statements. Original prompt links remain valid
and open a dedicated editor with the existing answer and source passages.

- Drafts auto-save on input using the existing `fh.draft.<id>` keys. Older drafts are
  retained. A draft stays in the open queue until explicitly marked answered.
- Open questions can be filtered by workbook, status, and text, with 18 results at
  a time. Save-for-later questions and all personal writing appear in My writing.
- JSON backups contain writing, completion choices, and saved-for-later IDs.
  Restore validates all records before importing and preserves newer local writing.
  Markdown export remains available. Writing stays in the browser and is not synced.
- `js/workspace.js` supplies the workspace views and persistence behavior.
  The source content in `js/data.js` is unchanged.

Validation: desktop and 390px mobile editor, reload persistence, explicit completion
and reopening, queue draft filtering, saved-for-later, source drawer, and JSON download.
The browser file-picker automation did not confirm a restore; restore validation and
merge logic were reviewed. No preview test answers are part of the published files.

The older interface notes below describe the initial version; the behavior above
supersedes its draft-completion and ambient-background descriptions.

A personal hub for the fulfillment / meaning discovery work — the three workbooks,
the recurring threads, the evidence passages, the full interview, and the questions
still open.

Static HTML/CSS/JS, no build step, same family as `routine-hub/` and `goals-hub/`.

## Structure

```
index.html        shell: header, nav, ambient scene, evidence drawer, search palette
css/styles.css    the ENTIRE visual system — one file, on purpose
js/workspace.js   workspace views: focus writing, drafts, pinning, backups
js/data.js        GENERATED — all content as one `DATA` object
js/app.js         base views, drawer, search palette, the ambient window
tools/build_data.py   regenerates js/data.js from the source documents
server.py         local preview on http://localhost:8944
```

## Views

| Route | What it is |
|---|---|
| `#/horizon` | progress rings, a rotating anchor phrase, one open question to answer tonight, the six north-star statements |
| `#/paths` | the three workbooks → sections → every prompt with its answer, status and evidence |
| `#/threads` | constellation of the 12 recurring themes, the 10 core contradictions, the anchor phrases |
| `#/evidence` | all 61 first-person passages (also opens as a side drawer from any `E##` chip) |
| `#/conversation` | the full 66-question interview transcript, by session part |
| `#/open` | the 259 prompts that are **in progress** (173 — a real answer that is missing one specific detail) or **not started** (86), filterable, each with a place to write |

Deep links work: `#/paths/life/05/L05.11` opens that prompt directly.
`/` or `⌘K` opens search across every prompt, passage and interview answer.

## Writing answers

Every prompt carries one of three live states — **Answered**, **In progress** (there is a
real answer already, it is only missing a named detail: a choice, ranking, frequency,
boundary or experiment) and **Not started** (each of these says exactly what it is
waiting for). In-progress prompts are never treated as blanks: their existing answer is
shown under *Answered so far*, and the box below it extends rather than replaces it.

Anything typed into a prompt's box is saved in that browser under `fh.draft.<id>`
and the prompt is re-marked **Drafted by me**. Drafted prompts drop out of the open
queue, and **Export as Markdown** on `#/open` downloads them all so they can be
folded back into the source document.

Drafts are per-browser and are not synced anywhere.

## Regenerating the content

`js/data.js` is parsed from two Word documents:

- `~/Documents/Codex/2026-09-08/referenced-chatgpt-conversation-this-is-an/outputs/Fulfillment_and_Identity.docx`
- `~/Downloads/Fulfillment_Discovery_Full_QA_Transcript.docx`

```bash
python3 tools/build_data.py
```

It prints a sanity line (books / modules / prompts / evidence / status counts) —
those should match the totals stated inside the summary document itself
(376 prompts: 117 answered in substance, 173 partial → shown as *in progress*, 86 unanswered → shown as *not started*). Paths are constants at the
top of the script. `js/data.js` can also just be hand-edited; the site only reads `DATA`.

## Preview

```bash
python3 server.py
```

Then open http://localhost:8944.

## Publishing

Same as the other hubs — push this folder to a GitHub repo and turn on GitHub Pages
(Settings → Pages → deploy from branch, root). Everything is static, so nothing else
is needed. Note that this hub contains a lot of personal material; a **private**
repo, or keeping it local, is the safer default.


## The visual system

One stylesheet, `css/styles.css`. It was three (`styles` + `workspace` + `atelier`)
overriding each other, which is exactly what made the site read as incoherent —
so they were collapsed into a single set of tokens and components. **Add new styles
there rather than starting another layer.**

The idea is a cathedral at dusk, where the city meets the forest.

- **Type** — Cormorant Garamond carries display and all long-form reading (existing
  answers, source passages, interview replies, the writing box). Inter carries the
  interface: nav, chips, labels, buttons, metadata.
- **Colour** — a deep ground, lead came (`--came`), gold leaf (`--leaf`, `--gold`),
  and jewel accents. Emerald / amber / sapphire stand for Life / Relationships /
  Location, and the same jewels drive the status pills.
- **Glass** — the fixed backdrop is one enormous window: a skyline dissolving into
  conifers, came laid over the sky, a cathedral arch across the top, and a scrim so
  type never has to fight it. The anchor card carries a two-ring rose window; each
  workbook panel is headed by diamond quarry glazing with jewel roundels.
- **Geometry** — everything is round. `--r-xl` 30px through `--r-sm` 10px, and every
  control is a full pill.
- **Both themes** — `dusk` (default) and `dawn` are complete palettes. Every colour is
  defined as a token in both; never hard-code a hex value in a component.

## Status vocabulary

Four states, and the wording matters: **Answered**, **In progress** (a real answer is
already there and only needs refining — never treat these as blanks), **Not started**
(each says exactly what it is waiting for), and **Draft saved**.
