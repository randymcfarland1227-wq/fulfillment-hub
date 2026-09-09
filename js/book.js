/* =====================================================================
 *  FULFILLMENT & MEANING — the book
 *
 *  A reference, not a workbook. app.js is the engine (index, drafts,
 *  drawer, palette, the ambient window); this file is the book itself:
 *  its contents, its divisions, and how every page is set.
 * ===================================================================== */
'use strict';

/* ── divisions ─────────────────────────────────────────────────────── *
 * Each workbook's sections gathered into named parts. Edit freely —
 * every section number must appear exactly once per book.             */
const PARTS = {
  life: [
    { title:'Direction',                mods:['01','15','16'] },
    { title:'What Makes Me Come Alive', mods:['02','08','11'] },
    { title:'What Wears Me Down',       mods:['03','14','17'] },
    { title:'What I Need',              mods:['05','06','07'] },
    { title:'Means & Ends',             mods:['04','09','13'] },
    { title:'Ordinary Days',            mods:['10','12'] },
    { title:'Conclusion',               mods:['18'] },
  ],
  relationships: [
    { title:'Ground',     mods:['01','02','03'] },
    { title:'The Bonds',  mods:['04','05','06','07'] },
    { title:'Practice',   mods:['08','09','10'] },
    { title:'Conclusion', mods:['11'] },
  ],
  location: [
    { title:'Ground',             mods:['01','02'] },
    { title:'Daily Conditions',   mods:['03','04','07'] },
    { title:'Belonging & Means',  mods:['05','06'] },
    { title:'Deciding',           mods:['08','09','10'] },
    { title:'Conclusion',         mods:['11'] },
  ],
};

const THEME_GROUPS = [
  { title:'Making & Craft',  idx:[0,3,4] },
  { title:'Ground & Beauty', idx:[1,2,9] },
  { title:'People',          idx:[5,6,7,8] },
  { title:'Time & Self',     idx:[10,11] },
];

const BOOK_NAME  = { life:'Life & Purpose', relationships:'Relationships & Belonging', location:'Place' };
const BOOK_SHORT = { life:'Life', relationships:'Relationships', location:'Place' };
const BOOK_NUM   = { life:'II', relationships:'III', location:'IV' };

/* ── title case ────────────────────────────────────────────────────── */
const LOWER = new Set(['a','an','and','as','at','but','by','for','from','in','into','nor','of',
  'on','onto','or','over','per','the','to','up','via','vs','with','within','without']);

function titleCase(str) {
  if (!str) return '';
  const words = String(str).split(/(\s+)/);
  const lastWord = words.filter(w => w.trim()).length;
  let n = 0;
  return words.map(w => {
    if (!w.trim()) return w;
    n++;
    // leave anything already carrying its own capitals alone (DC, XP, roman numerals)
    if (/[A-Z]/.test(w.slice(1))) return w;
    const cap = part => part.charAt(0).toUpperCase() + part.slice(1);
    const bare = w.replace(/[^A-Za-z’'-]/g, '').toLowerCase();
    if (n !== 1 && n !== lastWord && LOWER.has(bare)) return w.toLowerCase();
    return w.split('-').map(cap).join('-');
  }).join('');
}
const tc = s => esc(titleCase(s));

/* ── plates ────────────────────────────────────────────────────────── *
 * Photographs that open a book. Drop the files into img/ and they
 * appear; until then each falls back to its own light.                */
const plate = (name, caption) =>
  `<figure class="plate plate-${name}" role="img" aria-label="${esc(caption)}">
     <figcaption>${esc(caption)}</figcaption>
   </figure>`;

const BOOK_PLATE = { life:'meadow', relationships:'oak', location:'window' };

/* ── small helpers ─────────────────────────────────────────────────── */
const linkFor  = p => `#/paths/${p.book.id}/${p.module.num}/${p.id}`;
const readLocal = (key, fallback=null) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };

let noticeTimer;
function notify(message) {
  const el = $('#notice');
  el.textContent = message; el.hidden = false;
  clearTimeout(noticeTimer); noticeTimer = setTimeout(() => el.hidden = true, 5000);
}
function putLocal(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch { notify('Could not save in this browser. Keep this page open and download a backup.'); return false; }
}

/* drafts gain a "complete" flag: a written answer can settle the prompt */
const sessionEdits = new Map();
const storedGet = Drafts.get.bind(Drafts);
Drafts.get = id => sessionEdits.get(id) || storedGet(id);
Drafts.set = function (id, text, complete = false) {
  const record = { text, complete, at:new Date().toISOString() };
  const ok = putLocal(this.key(id), record);
  if (ok) sessionEdits.delete(id); else sessionEdits.set(id, record);
  return ok;
};
/* effStatus / isOpenQ already read the `complete` flag — see app.js */

STATUS_LABEL.partial    = 'In Progress';
STATUS_LABEL.unanswered = 'Not Started';
STATUS_LABEL.drafted    = 'Draft Saved';

const pinned = id => readLocal('fh.pin.' + id, false);
const wordCount = t => t.trim() ? t.trim().split(/\s+/).length : 0;

const countLine = t =>
  `${t.answered} answered · ${t.partial} in progress · ${t.unanswered} not started${t.drafted ? ` · ${t.drafted} drafts` : ''}`;

/* running head at the top of every page */
const pageHead = (tag, title, lede) =>
  `<header class="page-heading">
     <span class="eyebrow">${esc(tag)}</span>
     <h1>${esc(title)}</h1>
     ${lede ? `<p>${esc(lede)}</p>` : ''}
   </header>`;

/* ── entries ───────────────────────────────────────────────────────── */

evRow = function (ids, label = 'Testimony') {
  if (!ids?.length) return '';
  return `<div class="ev-row"><span class="ev-label">${esc(label)}</span>${
    ids.map(id => `<button class="ev-chip" data-ev="${esc(id)}" title="${tc(EV_BY_ID[id]?.title || id)}">${
      tc(EV_BY_ID[id]?.title || id)} <span>${esc(id)}</span></button>`).join('')}</div>`;
};

/* one line of the book: reference number, the question, what stands today */
promptCard = function (p) {
  const st = effStatus(p), draft = Drafts.text(p.id);
  const body = draft || p.answer || '';
  return `<a class="entry" href="${linkFor(p)}">
    <span class="entry-ref">${esc(p.id)}</span>
    <span class="entry-body">
      <span class="entry-q">${esc(p.prompt)}</span>
      <span class="entry-a">${esc(body.slice(0,190))}${body.length > 190 ? '…' : ''}</span>
      ${pinned(p.id) ? '<span class="entry-flag">Marked</span>' : ''}
    </span>
    ${statusPill(st)}
  </a>`;
};

inventoryCard = function (it) {
  return `<div class="inventory">
    <h4>${tc(it.title)}</h4>
    <p class="small muted">${it.body.map(esc).join(' ')}</p>
    ${it.fields.length ? `<div class="field-list">${it.fields.map(f => `<span>${esc(f)}</span>`).join('')}</div>` : ''}
    ${evRow(it.evidence)}
  </div>`;
};

/* ══════════════════════════════════════════════════════════════════════
   THE PAGES
   ══════════════════════════════════════════════════════════════════════ */

/* ── Front matter: Contents ────────────────────────────────────────── */
V.contents = () => {
  const t = tally(PROMPTS);
  const entry = (href, num, title, sub, meta) => `
    <a class="toc-row" href="${href}">
      <span class="toc-num">${num}</span>
      <span class="toc-title">${title}<em>${sub}</em></span>
      <span class="toc-meta">${meta}</span>
    </a>`;

  return `<section class="view">
    ${plate('horizon', 'The path creates itself when you walk.')}
    <header class="page-heading title-page">
      <span class="eyebrow">A Reference for the Life I Am Building</span>
      <h1>Fulfillment &amp; Meaning</h1>
      <p>${esc(DOC.intro[0])}</p>
    </header>

    <section class="section">
      <div class="section-head"><h2>Contents</h2></div>
      <div class="toc">
        <div class="toc-part">The Books</div>
        ${entry('#/creed','I','The Creed','What I hold to be true',
          `${DOC.northStar.length} statements · ${DOC.anchors.length} phrases`)}
        ${DOC.books.map(b => {
          const c = tally(b.modules.flatMap(m => m.items.filter(x => x.kind === 'prompt')));
          return entry(`#/paths/${b.id}`, BOOK_NUM[b.id], tc(BOOK_NAME[b.id]), b.tag,
            `${b.modules.length} chapters · ${c.total} entries`);
        }).join('')}

        <div class="toc-part">Commentary</div>
        ${entry('#/threads','V','Patterns &amp; Tensions','What repeats, and what stays two-sided',
          `${DOC.themes.length} patterns · ${DOC.tensions.length} tensions`)}
        ${entry('#/evidence','VI','Testimony','The passages these conclusions rest on',
          `${DOC.evidence.length} passages`)}
        ${entry('#/conversation','VII','The Conversation','The interview, question by question',
          `${TX.sections.reduce((n,s) => n + s.entries.length, 0)} answers`)}

        <div class="toc-part">Appendix</div>
        ${entry('#/open','A','What Remains Open','Entries still to be finished',
          `${t.partial + t.unanswered} entries`)}
        ${entry('#/writing','B','My Notes','Anything written here, and backups',
          `${Drafts.all().length} saved`)}
      </div>
    </section>

    <section class="section">
      <div class="section-head"><h2>The Standing Count</h2></div>
      <div class="ledger">
        ${DOC.books.map(b => {
          const c = tally(b.modules.flatMap(m => m.items.filter(x => x.kind === 'prompt')));
          return `<a class="ledger-row" href="#/paths/${b.id}" style="--accent:${accentOf(b)}">
            <span class="ledger-name">${tc(BOOK_NAME[b.id])}</span>
            ${stackBar(c)}
            <span class="ledger-count">${countLine(c)}</span>
          </a>`;
        }).join('')}
        <p class="ledger-total">${t.answered} of ${t.total} entries answered in substance ·
          ${t.partial} carry a real answer that still needs one detail ·
          ${t.unanswered} not started${t.drafted ? ` · ${t.drafted} drafts of my own` : ''}.</p>
      </div>
    </section>

    <section class="section">
      <div class="section-head"><h2>How to Read This</h2></div>
      <div class="colophon">${DOC.howto.map(p => `<p>${esc(p)}</p>`).join('')}</div>
    </section>
  </section>`;
};

/* ── Book I: The Creed ─────────────────────────────────────────────── */
V.creed = () => `<section class="view">
  <div class="rose-plate" aria-hidden="true"></div>
  ${pageHead('Book I', 'The Creed', 'Working statements assembled from my own words. Not commitments, and not a diagnosis — the direction as it currently stands.')}

  <section class="section">
    <div class="section-head"><h2>North Star</h2></div>
    <div class="creed-list">
      ${DOC.northStar.map((n,i) => `<article class="creed-item">
        <span class="creed-num">${String(i+1).padStart(2,'0')}</span>
        <div>
          <h3>${tc(n.title)}</h3>
          <p class="scripture">${n.body.map(esc).join(' ')}</p>
          ${evRow(n.evidence)}
        </div>
      </article>`).join('')}
    </div>
  </section>

  <section class="section">
    <div class="section-head"><h2>Anchor Phrases</h2>
      <span class="small muted">Said aloud, kept exactly as spoken.</span></div>
    <div class="anchor-wall">
      ${DOC.anchors.map(a => `<blockquote class="anchor" data-ev="${esc(a.evidence[0] || '')}">
        <span class="q">“</span>${esc(a.text)}
        <cite>${esc(a.evidence[0] || '')}</cite>
      </blockquote>`).join('')}
    </div>
  </section>
</section>`;

/* ── Books II–IV: the workbooks, set as chapters ───────────────────── */
const bookIndex = b => {
  const parts = PARTS[b.id] || [{ title:'Chapters', mods:b.modules.map(m => m.num) }];
  return parts.map(part => `
    <section class="part">
      <h2 class="part-title">${tc(part.title)}</h2>
      <div class="chapter-list">
        ${part.mods.map(num => {
          const m = b.modules.find(x => x.num === num);
          if (!m) return '';
          const t = tally(m.items.filter(x => x.kind === 'prompt'));
          return `<a class="chapter" href="#/paths/${b.id}/${m.num}">
            <span class="chapter-num">${esc(m.num)}</span>
            <span class="chapter-body">
              <span class="chapter-title">${tc(m.title)}</span>
              <span class="chapter-meta">${t.total ? countLine(t) : 'Supporting exercise · open fields'}</span>
            </span>
            ${t.total ? stackBar(t) : ''}
          </a>`;
        }).join('')}
      </div>
    </section>`).join('');
};

V.paths = (bookId, modNum, focusId) => {
  if (focusId && PROMPT_BY_ID[focusId]) return entryView(PROMPT_BY_ID[focusId]);

  const b = BOOK_BY_ID[bookId];
  if (!b) {
    return `<section class="view">
      ${pageHead('The Books', 'Three Books', 'The life I want to inhabit, the people I can stay myself among, and the conditions a place has to meet.')}
      <div class="toc">
        ${DOC.books.map(x => {
          const c = tally(x.modules.flatMap(m => m.items.filter(i => i.kind === 'prompt')));
          return `<a class="toc-row" href="#/paths/${x.id}">
            <span class="toc-num">${BOOK_NUM[x.id]}</span>
            <span class="toc-title">${tc(BOOK_NAME[x.id])}<em>${esc(x.tag)}</em></span>
            <span class="toc-meta">${x.modules.length} chapters · ${c.total} entries</span>
          </a>`;
        }).join('')}
      </div>
    </section>`;
  }

  const m = modNum ? b.modules.find(x => x.num === modNum) : null;
  if (!m) {
    return `<section class="view">
      ${plate(BOOK_PLATE[b.id], b.tag)}
      ${pageHead('Book ' + BOOK_NUM[b.id], titleCase(BOOK_NAME[b.id]), b.tag)}
      ${bookIndex(b)}
    </section>`;
  }

  const part = (PARTS[b.id] || []).find(p => p.mods.includes(m.num));
  return `<section class="view">
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      <a href="#/contents">Contents</a><span>/</span>
      <a href="#/paths/${b.id}">${tc(BOOK_NAME[b.id])}</a>
      ${part ? `<span>/</span><span>${tc(part.title)}</span>` : ''}
    </nav>
    ${pageHead('Chapter ' + m.num, titleCase(m.title), '')}
    <div class="chapter-switch">
      <label for="moduleSelect">Chapter</label>
      <select id="moduleSelect" data-book="${b.id}">
        ${b.modules.map(x => `<option value="${x.num}"${x === m ? ' selected' : ''}>${esc(x.num)} · ${titleCase(x.title)}</option>`).join('')}
      </select>
      <a class="text-link" href="#/paths/${b.id}">All Chapters</a>
    </div>
    <div class="entry-list">
      ${m.items.map(it => it.kind === 'prompt' ? promptCard(it) : inventoryCard(it)).join('')}
    </div>
  </section>`;
};

/* ── a single entry ────────────────────────────────────────────────── */
function entryView(p) {
  const peers = p.module.items.filter(x => x.kind === 'prompt');
  const i = peers.indexOf(p);
  const d = Drafts.get(p.id);
  putLocal('fh.last', p.id);

  return `<section class="view entry-view">
    <nav class="breadcrumbs" aria-label="Breadcrumb">
      <a href="#/paths/${p.book.id}">${tc(BOOK_NAME[p.book.id])}</a><span>/</span>
      <a href="#/paths/${p.book.id}/${p.module.num}">${tc(p.module.title)}</a>
      <span>/ ${i+1} of ${peers.length}</span>
    </nav>

    <div class="entry-head">
      <span class="entry-ref-lg">${esc(p.id)}</span>
      <h1>${esc(p.prompt)}</h1>
      <div class="entry-head-meta">
        ${statusPill(effStatus(p))}
        <button class="btn btn-ghost" data-pin="${p.id}" aria-pressed="${pinned(p.id)}">${pinned(p.id) ? 'Marked' : 'Mark This Entry'}</button>
      </div>
    </div>

    <div class="entry-layout">
      <div class="entry-column">
        ${p.status !== 'unanswered'
          ? `<section class="standing">
               <span class="eyebrow">What Stands Today</span>
               <p class="scripture">${esc(p.answer)}</p>
               <span class="caption">Assembled from my conversation; the original wording is in the testimony.</span>
             </section>`
          : `<section class="standing standing-empty">
               <span class="eyebrow">What This Still Needs</span>
               <p class="scripture">${esc(p.answer || 'No substantive answer has been recorded yet.')}</p>
             </section>`}

        ${d?.text ? `<section class="standing standing-mine">
            <span class="eyebrow">In My Own Hand</span>
            <p class="scripture">${esc(d.text)}</p>
          </section>` : ''}

        <details class="margin-note"${d?.text ? '' : ''}>
          <summary>${p.status === 'unanswered' ? 'Write This Entry' : 'Add to This Entry'}</summary>
          <div class="writing-panel">
            <label for="reflection">${p.status === 'unanswered' ? 'Your Answer' : 'Your Additions &amp; Refinements'}</label>
            <p class="caption">The standing answer above is kept. Add what has changed, or what is still missing.</p>
            <textarea id="reflection" data-reflection="${p.id}" placeholder="Start where you are. Your wording belongs here.">${esc(d?.text || '')}</textarea>
            <div class="editor-meta">
              <span id="saveState" role="status">${d ? 'Saved in this browser' : 'Auto-saves as you write'}</span>
              <span id="wordCount">${wordCount(d?.text || '')} words</span>
            </div>
            <div class="editor-actions">
              <button class="btn btn-primary" data-complete="${p.id}">${effStatus(p) === 'answered' ? 'Keep Answer Updated' : 'Mark Answered'}</button>
              ${d?.complete ? `<button class="btn" data-reopen="${p.id}">Reopen as Draft</button>` : ''}
              <button class="btn btn-ghost" data-save-draft="${p.id}">Save Draft</button>
            </div>
            <p class="caption">Only mark answered when the main question is covered.</p>
          </div>
        </details>

        <nav class="entry-nav" aria-label="Entries">
          ${peers[i-1] ? `<a class="btn" href="${linkFor(peers[i-1])}">← ${esc(peers[i-1].id)}</a>` : '<span></span>'}
          ${peers[i+1] ? `<a class="btn" href="${linkFor(peers[i+1])}">${esc(peers[i+1].id)} →</a>`
                       : `<a class="btn" href="#/paths/${p.book.id}">End of Chapter →</a>`}
        </nav>
      </div>

      <aside class="margin-column">
        <h2>Cross-References</h2>
        ${evRow(p.evidence, 'Testimony') || '<p class="caption">No passage is mapped to this entry yet.</p>'}
        <details>
          <summary>What the Statuses Mean</summary>
          <p><strong>Answered</strong> — the main question is covered.<br>
             <strong>In Progress</strong> — a real answer is already here and only needs refining.<br>
             <strong>Not Started</strong> — no substantive answer yet; the entry says what it is waiting for.<br>
             <strong>Draft Saved</strong> — written here, not yet marked answered.</p>
        </details>
        <a class="text-link" href="#/writing">Back Up My Notes →</a>
      </aside>
    </div>
  </section>`;
}

/* ── Book V: Patterns & Tensions ───────────────────────────────────── */
V.threads = () => `<section class="view">
  ${plate('prism', 'One light, split into everything it repeats as.')}
  ${pageHead('Book V', 'Patterns & Tensions', 'Twelve patterns that repeat across all three books, and ten contradictions that are genuinely two-sided rather than mistakes to resolve.')}

  ${THEME_GROUPS.map(g => `<section class="part">
    <h2 class="part-title">${tc(g.title)}</h2>
    <div class="pattern-list">
      ${g.idx.map(i => {
        const t = DOC.themes[i];
        return `<article class="pattern" id="theme-${i}">
          <h3>${tc(t.title)}</h3>
          <p class="scripture">${t.body.map(esc).join(' ')}</p>
          ${evRow(t.evidence)}
        </article>`;
      }).join('')}
    </div>
  </section>`).join('')}

  <section class="section">
    <div class="section-head"><h2>Core Contradictions</h2>
      <span class="small muted">Neither side is the error.</span></div>
    <div class="pattern-list">
      ${DOC.tensions.map(t => `<article class="pattern tension">
        <h3>${tc(t.title)}</h3>
        <p class="scripture">${t.body.map(esc).join(' ')}</p>
        ${evRow(t.evidence)}
      </article>`).join('')}
    </div>
  </section>
</section>`;

/* ── Book VI: Testimony ────────────────────────────────────────────── */
function evidenceBook() {
  const groups = { L:[], R:[], C:[], '—':[] };
  DOC.evidence.forEach(e => {
    const n = { L:0, R:0, C:0 };
    e.mapped.forEach(id => { if (n[id[0]] !== undefined) n[id[0]]++; });
    const top = Object.keys(n).sort((a,b) => n[b] - n[a])[0];
    groups[n[top] ? top : '—'].push(e);
  });
  return groups;
}

V.evidence = (evId) => {
  if (evId && EV_BY_ID[evId]) setTimeout(() => openDrawer(evId), 60);
  const groups = evidenceBook();
  const labels = { L:'On the Life', R:'On the People', C:'On the Place', '—':'Not Yet Mapped' };

  return `<section class="view">
    ${pageHead('Book VI', 'Testimony', DOC.evidenceNote[0] || '')}
    <div class="filters">
      <div class="search-inline">
        <svg viewBox="0 0 24 24"><use href="#i-search"/></svg>
        <input id="evSearch" type="search" placeholder="Search the passages…" autocomplete="off">
      </div>
      <span class="chip chip-static" id="evCount">${DOC.evidence.length} passages</span>
    </div>
    <div id="evGrid">
      ${Object.keys(labels).filter(k => groups[k].length).map(k => `<section class="part">
        <h2 class="part-title">${labels[k]}<em>${groups[k].length}</em></h2>
        <div class="testimony-list">
          ${groups[k].map(e => `<button class="testimony" data-ev="${esc(e.id)}">
            <span class="testimony-ref">${esc(e.id)}</span>
            <span class="testimony-body">
              <span class="testimony-title">${tc(e.title)}</span>
              <span class="testimony-excerpt">${esc(e.body.join(' ').slice(0,150))}…</span>
            </span>
            <span class="testimony-meta">${e.mapped.length} entries</span>
          </button>`).join('')}
        </div>
      </section>`).join('')}
    </div>
    <div class="colophon section">
      <span class="eyebrow">Kept on Purpose</span>
      ${DOC.evidenceNote.slice(1).map(p => `<p>${esc(p)}</p>`).join('')}
    </div>
  </section>`;
};

/* ── Book VII: The Conversation ────────────────────────────────────── */
V.conversation = (secIdx) => {
  const idx = Math.max(0, Math.min(TX.sections.length - 1, parseInt(secIdx,10) || 0));
  const sec = TX.sections[idx];
  return `<section class="view">
    ${pageHead('Book VII', 'The Conversation', TX.note[0] || '')}
    <div class="rail">
      ${TX.sections.map((s,i) => `<button data-sec="${i}" class="${i === idx ? 'active' : ''}">${tc(s.title)}</button>`).join('')}
    </div>
    <h2 class="part-title">${tc(sec.title)}<em>${sec.entries.length}</em></h2>
    ${sec.entries.map((e,i) => `<article class="qa${i === 0 ? ' open' : ''}">
      <button class="qa-head" data-toggle="qa">
        <span class="qa-n">${esc(String(e.n).padStart(2,'0'))}</span>
        <span class="qa-q">${esc(e.question)}</span>
        <span class="prompt-caret"><svg viewBox="0 0 24 24"><use href="#i-arrow"/></svg></span>
      </button>
      <div class="qa-body"${i === 0 ? '' : ' hidden'}>${e.answer.map(p => `<p class="scripture">${esc(p)}</p>`).join('')}</div>
    </article>`).join('')}
  </section>`;
};

/* ── Appendix A: What Remains Open ─────────────────────────────────── */
let queueLimit = 18;
const queueItems = () => PROMPTS.filter(p => isOpenQ(p)
  && (openState.book === 'all' || p.book.id === openState.book)
  && (openState.status === 'all' || effStatus(p) === openState.status)
  && (p.id + ' ' + p.prompt + ' ' + p.answer + ' ' + Drafts.text(p.id) + ' ' + p.module.title)
      .toLowerCase().includes(openState.q.toLowerCase()));

openList = function () {
  const list = queueItems();
  return `<p class="result-count" role="status">${list.length} entries</p>${
    list.length
      ? list.slice(0, queueLimit).map(promptCard).join('')
      : '<div class="empty">No entries match. Choose another status or clear the search.</div>'}${
    list.length > queueLimit
      ? `<button class="btn load-more" id="moreQuestions">Show 18 More (${list.length - queueLimit} remaining)</button>`
      : ''}`;
};

V.open = () => {
  const t = tally(PROMPTS);
  return `<section class="view">
    ${pageHead('Appendix A', 'What Remains Open',
      `${t.partial} entries carry a real answer that still needs one specific detail. ${t.unanswered} have not been started, and each one says exactly what it is waiting for.`)}
    <div class="queue-toolbar">
      <label>Book<select id="queueBook">
        <option value="all">All Books</option>
        ${DOC.books.map(b => `<option value="${b.id}"${openState.book === b.id ? ' selected' : ''}>${titleCase(BOOK_NAME[b.id])}</option>`).join('')}
      </select></label>
      <label>Status<select id="queueStatus">
        ${[['all','All Open Entries'],['partial','In Progress'],['unanswered','Not Started'],['drafted','Draft Saved']]
          .map(([v,l]) => `<option value="${v}"${openState.status === v ? ' selected' : ''}>${l}</option>`).join('')}
      </select></label>
      <label class="queue-search">Search
        <input id="openSearch" type="search" placeholder="A topic, question, or phrase…" value="${esc(openState.q)}"></label>
    </div>
    <div id="openResults" class="entry-list">${openList()}</div>

    <section class="section">
      <div class="section-head"><h2>Deliberately Left Open</h2></div>
      <div class="colophon">
        ${DOC.deferred.map(d => `<p>${esc(d.text)}</p>`).join('')}
      </div>
    </section>

    <section class="section">
      <div class="section-head"><h2>Supporting Fields</h2>
        <span class="small muted">Separate from the entry count above.</span></div>
      <div class="colophon">
        <p>Ratings, costs, frequencies, dates and experiments inside the structured exercises, for which no entry was supplied.</p>
        ${DOC.supporting.map(s => `<p>${esc(s)}</p>`).join('')}
      </div>
    </section>
  </section>`;
};

/* ── Appendix B: My Notes ──────────────────────────────────────────── */
V.writing = () => {
  const ds = Drafts.all().sort((a,b) => (b.at || '').localeCompare(a.at || ''));
  const pins = PROMPTS.filter(p => pinned(p.id));
  return `<section class="view">
    ${pageHead('Appendix B', 'My Notes', 'Anything written here is stored on this device, in this browser. It is not synced to the website or to any other device.')}
    <div class="backup-strip">
      <div>
        <strong>Take a Copy With You</strong>
        <p>A backup restores this writing and the answered marks. Markdown gives a readable document.</p>
      </div>
      <div class="backup-actions">
        <button class="btn btn-primary" id="backupWriting">Download Backup</button>
        <button class="btn" id="exportBtn"${ds.length ? '' : ' disabled'}>Export Markdown</button>
        <label class="btn import-label">Restore Backup<input id="importWriting" type="file" accept=".json,application/json"></label>
      </div>
    </div>
    <h2 class="part-title">Written by Me<em>${ds.length}</em></h2>
    <div class="entry-list">${ds.length
      ? ds.map(d => promptCard(d.prompt)).join('')
      : '<p class="empty">Nothing written yet. <a class="text-link" href="#/open">Open an entry →</a></p>'}</div>
    <h2 class="part-title">Marked Entries<em>${pins.length}</em></h2>
    <div class="entry-list">${pins.length
      ? pins.map(promptCard).join('')
      : '<p class="muted">Use “Mark This Entry” on any entry to keep it here.</p>'}</div>
  </section>`;
};

V.horizon = V.contents;   // the old front door still opens onto the contents

/* ══════════════════════════════════════════════════════════════════════
   BINDING
   ══════════════════════════════════════════════════════════════════════ */

function saveEditor(complete) {
  const area = $('#reflection');
  if (!area) return false;
  const id = area.dataset.reflection;
  if (complete && !area.value.trim() && PROMPT_BY_ID[id].status !== 'answered') {
    notify('Add your answer or refinement before marking this answered.');
    area.focus(); return false;
  }
  const ok = Drafts.set(id, area.value, complete);
  $('#saveState').textContent = ok ? 'Saved in this browser' : 'Not saved to browser — download a backup';
  return ok;
}

function download(name, type, text) {
  const u = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = u; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}

document.addEventListener('click', e => {
  if (e.target.closest('.skip-link')) { e.preventDefault(); $('#main').focus(); return; }
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.complete   && saveEditor(true))  { route(); notify('Marked answered. The standing count is updated.'); }
  if (b.dataset.reopen     && saveEditor(false)) { route(); notify('Reopened as a draft.'); }
  if (b.dataset.saveDraft  && saveEditor(false)) { route(); notify('Draft saved. The entry stays open.'); }
  if (b.dataset.pin) {
    const id = b.dataset.pin;
    if (putLocal('fh.pin.' + id, !pinned(id))) {
      b.textContent = pinned(id) ? 'Marked' : 'Mark This Entry';
      b.setAttribute('aria-pressed', String(pinned(id)));
    }
  }
  if (b.id === 'moreQuestions') { queueLimit += 18; $('#openResults').innerHTML = openList(); }
  if (b.id === 'backupWriting') {
    const answers = PROMPTS.map(p => ({ id:p.id, ...Drafts.get(p.id) })).filter(d => typeof d.text === 'string');
    download(`fulfillment-backup-${new Date().toISOString().slice(0,10)}.json`, 'application/json',
      JSON.stringify({ format:'fulfillment-writing', version:1, answers,
        pinned:PROMPTS.filter(p => pinned(p.id)).map(p => p.id) }, null, 2));
    notify('Backup downloaded.');
  }
});

document.addEventListener('input', e => {
  if (e.target.id !== 'reflection') return;
  const ok = saveEditor(false);
  $('#wordCount').textContent = wordCount(e.target.value) + ' words';
  const pill = $('.entry-head-meta .status');
  const st = effStatus(PROMPT_BY_ID[e.target.dataset.reflection]);
  if (pill) { pill.className = 'status ' + st; pill.textContent = ok ? STATUS_LABEL[st] : 'Not saved'; }
});

document.addEventListener('change', async e => {
  if (e.target.id === 'moduleSelect') location.hash = `#/paths/${e.target.dataset.book}/${e.target.value}`;
  if (e.target.id === 'queueBook' || e.target.id === 'queueStatus') {
    openState[e.target.id === 'queueBook' ? 'book' : 'status'] = e.target.value;
    queueLimit = 18; $('#openResults').innerHTML = openList();
  }
  if (e.target.id === 'importWriting') {
    try {
      const f = e.target.files[0]; if (!f) return;
      if (f.size > 5000000) throw Error('Backup is too large.');
      const data = JSON.parse(await f.text());
      if (data.format !== 'fulfillment-writing' || data.version !== 1 || !Array.isArray(data.answers))
        throw Error('Choose a Fulfillment backup file.');
      const valid = data.answers.every(d => d && PROMPT_BY_ID[d.id] && typeof d.text === 'string'
        && d.text.length <= 200000 && typeof d.complete === 'boolean'
        && typeof d.at === 'string' && Number.isFinite(Date.parse(d.at)));
      if (!valid) throw Error('This backup contains invalid answers. Nothing was imported.');
      let count = 0, failed = 0;
      for (const d of data.answers) {
        const old = Drafts.get(d.id);
        if (!old || Date.parse(d.at) > Date.parse(old.at || 0)) {
          if (putLocal(Drafts.key(d.id), { text:d.text, complete:d.complete, at:d.at })) count++; else failed++;
        }
      }
      if (Array.isArray(data.pinned)) data.pinned.filter(id => PROMPT_BY_ID[id]).forEach(id => putLocal('fh.pin.' + id, true));
      route(); notify(`${count} entries restored. ${failed ? failed + ' could not be saved.' : 'Newer writing on this device was kept.'}`);
    } catch (err) { notify(err.message); } finally { e.target.value = ''; }
  }
});

/* accessible overlays: move focus in, keep it there, hand it back */
let overlayReturn;
const _openDrawer = openDrawer, _closeDrawer = closeDrawer, _openPalette = openPalette, _closePalette = closePalette;
openDrawer = function (id) {
  overlayReturn = document.activeElement;
  _openDrawer(id);
  $('#drawerTitle').textContent = titleCase(EV_BY_ID[id]?.title || '');
  $('#drawer').setAttribute('role','dialog');
  $('#drawer').setAttribute('aria-modal','true');
  $('#drawerClose').focus();
};
closeDrawer  = function () { _closeDrawer();  overlayReturn?.focus?.(); };
openPalette  = function () { overlayReturn = document.activeElement; buildPaletteIndex(); _openPalette(); $('.palette').setAttribute('aria-modal','true'); };
closePalette = function () { _closePalette(); overlayReturn?.focus?.(); };

document.addEventListener('keydown', e => {
  if (e.key !== 'Tab') return;
  const box = !$('#drawer').hidden ? $('#drawer') : !$('#paletteScrim').hidden ? $('.palette') : null;
  if (!box) return;
  const els = $$('button,input,a[href],textarea,select', box).filter(x => !x.disabled);
  const first = els[0], last = els.at(-1);
  if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
  else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
});

const _buildIndex = buildPaletteIndex;
buildPaletteIndex = function () {
  _buildIndex();
  paletteIndex.forEach(x => { if (x.kind === 'Prompt') x.hay += ' ' + Drafts.text(x.tag).toLowerCase(); });
};

/* ── the router ────────────────────────────────────────────────────── */
const TITLES = { contents:'Contents', creed:'The Creed', paths:'The Books',
  threads:'Patterns & Tensions', evidence:'Testimony', conversation:'The Conversation',
  open:'What Remains Open', writing:'My Notes' };

removeEventListener('hashchange', route);
route = function () {
  const parts = (location.hash.replace(/^#\/?/,'') || 'contents').split('/').filter(Boolean);
  const v = parts[0];

  $('#main').innerHTML =
      v === 'paths'        ? V.paths(...parts.slice(1))
    : v === 'conversation' ? V.conversation(parts[1])
    : v === 'evidence'     ? V.evidence(parts[1])
    : (V[v] || V.contents)();

  $$('#nav a').forEach(a => {
    const on = a.dataset.book ? (v === 'paths' && parts[1] === a.dataset.book)
             : a.dataset.view === v || (v === 'horizon' && a.dataset.view === 'contents')
             || (!V[v] && a.dataset.view === 'contents');
    a.classList.toggle('active', on);
    if (on) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current');
  });

  document.title = (v === 'paths' && parts[3] ? PROMPT_BY_ID[parts[3]]?.prompt : TITLES[v] || 'Contents')
    + ' · Fulfillment & Meaning';

  scrollTo({ top:0, behavior:'auto' });
  $('#main').focus({ preventScroll:true });
};
addEventListener('hashchange', route);
drawConstellation = function () {};

/* ── boot ──────────────────────────────────────────────────────────── */
$('.brand-text em').textContent = 'A reference for the life I am building';
$('#footNote').innerHTML =
  `${PROMPTS.length} entries · ${DOC.evidence.length} passages of testimony · ` +
  `${TX.sections.reduce((n,s) => n + s.entries.length, 0)} recorded answers. ` +
  `<a href="#/writing">My notes &amp; backups</a>` +
  `<details><summary>Sources</summary><p>${DOC.sources.map(esc).join(' · ')}</p></details>`;

initTheme();
initScene();
buildPaletteIndex();
route();
