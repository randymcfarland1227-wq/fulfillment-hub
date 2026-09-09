# Fulfillment & Meaning

A personal hub for the fulfillment / meaning discovery work — the three workbooks,
the recurring threads, the evidence passages, the full interview, and the questions
still open.

Static HTML/CSS/JS, no build step, same family as `routine-hub/` and `goals-hub/`.

## Structure

```
index.html        shell: header, nav, ambient scene, evidence drawer, search palette
css/styles.css    the whole visual system (dusk + dawn themes)
js/data.js        GENERATED — all content as one `DATA` object
js/app.js         router, views, drafts, drawer, search, ambient scene
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
