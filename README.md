# Fulfillment & Meaning


## Structure

```
index.html        shell: header, nav, ambient scene, evidence drawer, search palette
css/styles.css    the ENTIRE visual system — one file, on purpose
js/book.js        the book: its contents, divisions and pages
img/              the five plates (see img/README.md)
js/data.js        GENERATED — all content as one `DATA` object
js/app.js         the engine: data index, drafts, drawer, search palette, the window
tools/build_data.py   regenerates js/data.js from the source documents
server.py         local preview on http://localhost:8944
```


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


## What this is

**A reference book, not a workbook.** It is a source of truth to be consulted, not an
activity to be completed. There is no dashboard and no "today" — the front door is a
table of contents. Writing is still possible on every entry, but it is folded into a
collapsed margin note rather than being the point of the page.

## Structure

| Route | |
|---|---|
| `#/contents` | Front matter: the title page, the table of contents, the standing count, and how to read it |
| `#/creed` | **Book I · The Creed** — the six north-star statements and seven anchor phrases |
| `#/paths/life` | **Book II · Life & Purpose** — 18 chapters in 7 named parts |
| `#/paths/relationships` | **Book III · Relationships & Belonging** — 11 chapters in 4 parts |
| `#/paths/location` | **Book IV · Place** — 11 chapters in 5 parts |
| `#/threads` | **Book V · Patterns & Tensions** — 12 patterns grouped in 4, plus 10 contradictions |
| `#/evidence` | **Book VI · Testimony** — 61 passages, grouped by which book they mostly support |
| `#/conversation` | **Book VII · The Conversation** — the interview, by session part |
| `#/open` | **Appendix A · What Remains Open** |
| `#/writing` | **Appendix B · My Notes** — drafts, marked entries, backups |

Every entry keeps its reference number (`L01.9`, `E13`) and every old deep link still
resolves, including `#/paths/life/05/L05.11` and `#/evidence/E13`. `#/horizon` opens
the contents.

The named parts live in `PARTS` and `THEME_GROUPS` at the top of `js/book.js` — edit
them freely, but every chapter number must appear exactly once per book.

## Capitalisation

Structural headings are Title Case, applied at render time by `titleCase()` in
`js/book.js` — **not** baked into `js/data.js`. Source text is never transformed:
questions, answers, passages and quotes appear exactly as recorded.

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
