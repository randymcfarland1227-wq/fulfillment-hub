/* =====================================================================
 *  VIEWS
 *  REFLECT → UNDERSTAND → DESIGN. Three modes that feel connected but
 *  mentally distinct. Nothing claims more certainty than the material.
 * ===================================================================== */
'use strict';

/* ── words ─────────────────────────────────────────────────────────── */
const LOWER = new Set(['a','an','and','as','at','but','by','for','from','in','into','nor','of',
  'on','onto','or','over','per','the','to','up','via','vs','with','within','without']);
function titleCase(str) {
  if (!str) return '';
  const words = String(str).split(/(\s+)/);
  const last = words.filter(w => w.trim()).length;
  let n = 0;
  return words.map(w => {
    if (!w.trim()) return w;
    n++;
    if (/[A-Z]/.test(w.slice(1))) return w;
    const bare = w.replace(/[^A-Za-z’'-]/g,'').toLowerCase();
    if (n !== 1 && n !== last && LOWER.has(bare)) return w.toLowerCase();
    return w.split('-').map(x => x.charAt(0).toUpperCase() + x.slice(1)).join('-');
  }).join('');
}
const tc = s => esc(titleCase(s));
const fmtDate = iso => { try { return new Date(iso).toLocaleDateString(undefined,{ day:'numeric', month:'short', year:'numeric' }); } catch { return ''; } };

/* ── notices ───────────────────────────────────────────────────────── */
let noticeTimer;
function notify(msg) {
  const el = $('#notice'); if (!el) return;
  el.textContent = msg; el.hidden = false;
  clearTimeout(noticeTimer); noticeTimer = setTimeout(() => el.hidden = true, 4500);
}

/* ── shared furniture ──────────────────────────────────────────────── */
const pageHead = (eyebrow, title, lede) => `
  <header class="page-head">
    <span class="eyebrow">${esc(eyebrow)}</span>
    <h1>${esc(title)}</h1>
    ${lede ? `<p class="lede">${esc(lede)}</p>` : ''}
  </header>`;

const crumbs = parts => `<nav class="crumbs" aria-label="Breadcrumb">${
  parts.map((p,i) => p.href
    ? `<a href="${p.href}">${esc(p.label)}</a>${i < parts.length-1 ? '<span aria-hidden="true">→</span>' : ''}`
    : `<span>${esc(p.label)}</span>${i < parts.length-1 ? '<span aria-hidden="true">→</span>' : ''}`).join('')}</nav>`;

const statusPill = s => `<span class="pill pill-${s}">${STATUS_LABEL[s]}</span>`;

const evChips = (ids, label) => !ids?.length ? '' : `
  <div class="chip-row">${label ? `<span class="chip-label">${esc(label)}</span>` : ''}${
    ids.map(id => `<button class="chip chip-ev" data-ev="${esc(id)}">${tc(EV_BY_ID[id]?.title || id)}<span>${esc(id)}</span></button>`).join('')}</div>`;

const entryChips = ids => !ids?.length ? '' : `
  <div class="chip-row">${ids.map(id => {
    const p = PROMPT_BY_ID[id];
    return p ? `<a class="chip" href="#/entry/${esc(id)}">${esc(p.prompt.slice(0,52))}${p.prompt.length>52?'…':''}<span>${esc(id)}</span></a>` : '';
  }).join('')}</div>`;

/* "Why do we think this?" — the honest ledger behind any statement.
   Said / detected / still uncertain are never blurred together. */
function evidenceMode({ said = [], detected = [], interpreted = '', uncertain = '', passages = [] }) {
  return `<details class="evidence">
    <summary>Why do we think this?</summary>
    <div class="evidence-body">
      ${said.length ? `<div class="evidence-part"><h4>What you said</h4>${entryChips(said)}</div>` : ''}
      ${passages.length ? `<div class="evidence-part"><h4>In your own words</h4>${evChips(passages)}</div>` : ''}
      ${detected.length ? `<div class="evidence-part"><h4>What was detected</h4>
        <p class="note">Word matches across your reflections — a count, not a conclusion.</p>${entryChips(detected.slice(0,12))}
        ${detected.length > 12 ? `<p class="note">…and ${detected.length - 12} more.</p>` : ''}</div>` : ''}
      ${interpreted ? `<div class="evidence-part"><h4>What was inferred</h4><p class="note">${esc(interpreted)}</p></div>` : ''}
      ${uncertain ? `<div class="evidence-part"><h4>Still uncertain</h4><p class="note">${esc(uncertain)}</p></div>` : ''}
    </div>
  </details>`;
}

const empty = (what, how) => `<div class="empty"><p>${esc(what)}</p><p class="note">${esc(how)}</p></div>`;

function entryRow(p, opts = {}) {
  const st = effStatus(p), r = Reflections.get(p.id);
  const body = Reflections.text(p.id) || p.answer || '';
  return `<a class="entry-row" href="#/entry/${esc(p.id)}">
    <span class="entry-meta">
      <span class="entry-ref">${esc(p.id)}</span>
      ${opts.showArea && p.area ? `<span class="entry-area">${esc(p.area.name)}</span>` : ''}
      ${r?.core ? '<span class="entry-tag">Core</span>' : ''}
      ${r?.changed ? '<span class="entry-tag">Changed</span>' : ''}
    </span>
    <span class="entry-main">
      <span class="entry-q">${esc(p.prompt)}</span>
      ${body ? `<span class="entry-a">${esc(body.slice(0,180))}${body.length>180?'…':''}</span>` : ''}
    </span>
    ${statusPill(st)}
  </a>`;
}

const V = {};

/* ══════════════════════════════════════════════════════════════════════
   HOME — a command centre, not a questionnaire
   ══════════════════════════════════════════════════════════════════════ */
V.home = () => {
  const t = tally(PROMPTS);
  const lastId = Store.read('fh.last');
  const last = PROMPT_BY_ID[lastId];
  const strong = PATTERN_INDEX.filter(p => p.confidence === 'Strong Pattern').slice(0,4);
  const cross = PATTERN_INDEX.filter(p => p.books.length === 3).slice(0,1)[0];
  const revisit = Reflections.all().filter(x => x.rec.versions.length || x.rec.draft.trim())[0];
  const openQ = PROMPTS.filter(p => effStatus(p) === 'partial')[Math.floor(Math.random()*30)] || PROMPTS.find(p => isOpen(p));
  const quote = QUOTES[Math.floor(Math.random()*QUOTES.length)];
  const ms = milestones().filter(m => m.done).slice(-2);
  const hour = new Date().getHours();
  const greet = hour < 5 ? 'Still up' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return `<section class="view">
    <header class="page-head">
      <span class="eyebrow">${esc(greet)}</span>
      <h1>Your life, as far as you have described it.</h1>
      <p class="lede">Everything here comes from what you have already said. Nothing is scored, and nothing is finished.</p>
    </header>

    <div class="grid-2">
      <a class="panel panel-lead" href="${last ? `#/entry/${last.id}` : '#/reflect'}">
        <span class="eyebrow">${last ? 'Continue where you left off' : 'A place to begin'}</span>
        <h2>${esc(last ? last.prompt : (openQ?.prompt || 'Open a reflection'))}</h2>
        <p class="note">${esc(last ? `${last.area?.name || last.book.title} · ${last.module.title}` : 'Choose how much time you have.')}</p>
        <span class="cta">Continue <span aria-hidden="true">→</span></span>
      </a>
      <div class="panel panel-quote">
        <span class="eyebrow">In your own words</span>
        <blockquote>${esc(quote.text)}</blockquote>
        <p class="note">${esc(quote.source)}</p>
        ${quote.evidence?.length ? `<button class="link" data-ev="${esc(quote.evidence[0])}">Read the passage</button>` : ''}
      </div>
    </div>

    <section class="block">
      <div class="block-head"><h2>Your Life Map</h2><a class="link" href="#/map">Open the map</a></div>
      <div class="realm-strip">
        ${REALMS.map(r => {
          const ps = PROMPTS.filter(p => p.area && p.area.realm.id === r.id);
          const rt = tally(ps);
          return `<a class="realm-tile" href="#/map#realm-${r.id}">
            <span class="realm-name">${esc(r.name)}</span>
            <span class="realm-depth">${depthOf(rt)}</span>
            <span class="bar"><i style="width:${rt.total?Math.round((rt.answered+rt.drafted)/rt.total*100):0}%"></i></span>
            <span class="note">${rt.total} entries · ${r.areas.length} areas</span>
          </a>`;
        }).join('')}
      </div>
    </section>

    <div class="grid-2">
      <section class="block">
        <div class="block-head"><h2>Strongest Patterns</h2><a class="link" href="#/patterns">Pattern Atlas</a></div>
        <div class="stack">
          ${strong.map(p => `<a class="mini" href="#/patterns/${p.id}">
            <span class="mini-title">${esc(p.name)}</span>
            <span class="conf conf-strong">${esc(p.confidence)}</span>
            <span class="note">Detected in ${p.entries.length} reflections across ${p.areas.length} areas</span>
          </a>`).join('')}
        </div>
      </section>
      <section class="block">
        <div class="block-head"><h2>Recently Discovered</h2></div>
        <div class="stack">
          ${cross ? `<div class="mini mini-static">
            <span class="mini-title">${esc(cross.name)} appears in all three books</span>
            <span class="note">Independently present in Life, Relationships and Place — ${cross.entries.length} reflections in total.</span>
            <a class="link" href="#/patterns/${cross.id}">See where</a>
          </div>` : ''}
          ${ms.map(m => `<div class="mini mini-static">
            <span class="mini-title">${esc(m.label)}</span><span class="note">${esc(m.detail)}</span></div>`).join('')}
          ${revisit ? `<a class="mini" href="#/entry/${revisit.prompt.id}">
            <span class="mini-title">Worth revisiting</span>
            <span class="note">${esc(revisit.prompt.prompt.slice(0,90))}</span></a>` : ''}
        </div>
      </section>
    </div>

    <section class="block">
      <div class="block-head"><h2>An Open Question</h2><a class="link" href="#/open">All open questions</a></div>
      ${openQ ? `<a class="panel panel-open" href="#/entry/${openQ.id}">
        <h2>${esc(openQ.prompt)}</h2>
        <p class="note">${esc(openQ.area?.name || openQ.book.title)} · ${esc(openQ.module.title)} · ${statusPill(effStatus(openQ)).replace(/<[^>]+>/g,'')}</p>
      </a>` : empty('Every entry is answered.','That will not stay true for long — come back when something changes.')}
    </section>

    <p class="privacy-line">Everything you write stays in this browser on this device. Nothing is uploaded.
      <a class="link" href="#/data">What is stored, and how to export it</a></p>
  </section>`;
};

/* ══════════════════════════════════════════════════════════════════════
   REFLECT
   ══════════════════════════════════════════════════════════════════════ */

V.reflect = () => {
  const lastId = Store.read('fh.last'), last = PROMPT_BY_ID[lastId];
  const openAreas = REALMS.flatMap(r => r.areas).map(a => {
    const ps = PROMPTS.filter(p => p.area === a);
    return { area:a, open:ps.filter(isOpen).length, t:tally(ps) };
  }).filter(x => x.open).sort((a,b) => b.open - a.open);

  return `<section class="view">
    ${pageHead('Reflect','How much do you have in you right now?',
      'There is no order to get right and nothing is due. Pick a size, or pick an area you are curious about.')}

    <div class="session-row">
      ${last ? `<a class="session session-resume" href="#/entry/${last.id}">
        <span class="session-name">Continue Where I Left Off</span>
        <span class="note">${esc(last.prompt.slice(0,70))}${last.prompt.length>70?'…':''}</span></a>` : ''}
      ${SESSIONS.map(s => `<button class="session" data-session="${s.id}">
        <span class="session-name">${esc(s.name)}</span>
        <span class="note">${esc(s.blurb)}</span></button>`).join('')}
    </div>

    <section class="block">
      <div class="block-head"><h2>Where There Is Most Left to Say</h2></div>
      <div class="area-grid">
        ${openAreas.slice(0,9).map(({area,open,t}) => `<a class="area-card" href="#/map/${area.id}">
          <span class="eyebrow">${esc(area.realm.name)}</span>
          <span class="area-name">${esc(area.name)}</span>
          <span class="note">${esc(area.question)}</span>
          <span class="area-foot"><span class="depth">${depthOf(t)}</span><span class="note">${open} open</span></span>
        </a>`).join('')}
      </div>
    </section>
  </section>`;
};

/* ── Reflection Mode: one entry, almost nothing else ───────────────── */
V.entry = (id) => {
  const p = PROMPT_BY_ID[id];
  if (!p) return V.home();
  Store.write('fh.last', p.id);
  const peers = p.module.items.filter(x => x.kind === 'prompt');
  const i = peers.indexOf(p);
  const rec = Reflections.get(p.id);
  const versions = Reflections.versions(p.id);
  const text = Reflections.text(p.id);
  const related = searchCorpus(p.prompt, ['entry'])
    .filter(r => r.item.prompt !== p && r.item.prompt.status !== 'unanswered').slice(0,3);

  return `<section class="view view-reflect">
    ${crumbs([
      { label: p.area?.realm.name || p.book.title, href:'#/map' },
      { label: p.area?.name || p.module.title, href: p.area ? `#/map/${p.area.id}` : '#/map' },
      { label: titleCase(p.module.title), href:`#/chapter/${p.book.id}/${p.module.num}` },
      { label: `${i+1} of ${peers.length}` },
    ])}

    <div class="reflect-head">
      <h1>${esc(p.prompt)}</h1>
      <div class="reflect-meta">
        ${statusPill(effStatus(p))}
        <span class="ref">${esc(p.id)}</span>
        <button class="link" data-flag="core" data-id="${esc(p.id)}" aria-pressed="${!!rec?.core}">${rec?.core ? 'Core Reflection ✓' : 'Mark as Core Reflection'}</button>
        <button class="link" data-flag="changed" data-id="${esc(p.id)}" aria-pressed="${!!rec?.changed}">${rec?.changed ? 'Marked “This Changed” ✓' : 'This Changed'}</button>
      </div>
    </div>

    ${p.status !== 'unanswered' ? `
      <section class="standing">
        <h2 class="quiet-h">What stands today</h2>
        <p class="prose">${esc(p.answer)}</p>
        <p class="note">Assembled from your conversation — not a verbatim quote. The exact wording is in the passages below.</p>
      </section>` : `
      <section class="standing standing-empty">
        <h2 class="quiet-h">What this is waiting for</h2>
        <p class="prose">${esc(p.answer || 'No substantive answer has been recorded yet.')}</p>
      </section>`}

    <section class="writer">
      <label class="quiet-h" for="reflection">${p.status === 'unanswered' ? 'Your answer' : 'Add to this'}</label>
      <p class="note" id="whyAsking">${esc(p.module.title)} · ${esc(p.area?.question || '')}</p>
      <textarea id="reflection" data-id="${esc(p.id)}" aria-describedby="whyAsking"
        placeholder="Start where you are. Nothing here has to be finished.">${esc(text)}</textarea>
      <div class="writer-bar">
        <span class="save-state" id="saveState" role="status">${text ? 'Saved on this device' : 'Saves as you write'}</span>
        <span class="note" id="wordCount">${text.trim() ? text.trim().split(/\s+/).length : 0} words</span>
        <span class="writer-tools">
          <button class="link" data-insert="• ">Bullets</button>
          <button class="link" id="dictate" hidden>Dictate</button>
        </span>
      </div>
      <div class="writer-actions">
        <button class="btn btn-primary" data-complete="${esc(p.id)}">${rec?.complete ? 'Keep This Updated' : 'Save &amp; Mark Answered'}</button>
        <button class="btn" data-version="${esc(p.id)}">Save as New Version</button>
        ${rec?.complete ? `<button class="btn btn-quiet" data-reopen="${esc(p.id)}">Reopen</button>` : ''}
        <button class="btn btn-quiet" data-skip="unknown" data-id="${esc(p.id)}">I Don't Know Yet</button>
        <button class="btn btn-quiet" data-skip="later" data-id="${esc(p.id)}">Come Back Later</button>
      </div>
      ${rec?.skip ? `<p class="note">Set aside as “${STATUS_LABEL[rec.skip]}”. Writing anything here clears that.</p>` : ''}
    </section>

    ${versions.length > 1 ? `<section class="block">
      <div class="block-head"><h2>Then and Now</h2><a class="link" href="#/changes">All changes</a></div>
      <div class="versions">
        ${versions.map((v,vi) => `<article class="version${vi === versions.length-1 ? ' version-now' : ''}">
          <span class="eyebrow">${vi === 0 ? 'First written' : vi === versions.length-1 ? 'Now' : 'Revision ' + vi} · ${fmtDate(v.at)}</span>
          <p class="prose">${esc(v.text)}</p>
        </article>`).join('')}
      </div>
    </section>` : ''}

    ${p.evidence?.length ? `<section class="block">
      <div class="block-head"><h2>Your Own Words</h2></div>
      ${evChips(p.evidence)}
    </section>` : ''}

    ${related.length ? `<section class="block">
      <div class="block-head"><h2>You Have Said Something Near This Before</h2></div>
      <div class="stack">
        ${related.map(r => `<a class="mini" href="#/entry/${r.item.prompt.id}">
          <span class="mini-title">${esc(r.item.prompt.prompt)}</span>
          <span class="note">${esc(r.item.prompt.answer.slice(0,120))}…</span></a>`).join('')}
      </div>
    </section>` : ''}

    <nav class="entry-nav">
      ${peers[i-1] ? `<a class="btn btn-quiet" href="#/entry/${peers[i-1].id}">← Previous</a>` : '<span></span>'}
      ${peers[i+1] ? `<a class="btn" href="#/entry/${peers[i+1].id}">Next entry →</a>`
                   : `<a class="btn" href="#/chapter/${p.book.id}/${p.module.num}">Finish section →</a>`}
    </nav>
  </section>`;
};

/* ── chapter ───────────────────────────────────────────────────────── */
V.chapter = (bookId, num) => {
  const m = MODULE_BY_KEY[`${bookId}/${num}`];
  if (!m) return V.map();
  const area = AREA_OF_CHAPTER[m.key];
  const ps = m.items.filter(x => x.kind === 'prompt');
  const t = tally(ps);
  return `<section class="view">
    ${crumbs([
      { label:area?.realm.name || m.book.title, href:'#/map' },
      { label:area?.name || '—', href:area ? `#/map/${area.id}` : '#/map' },
      { label:titleCase(m.title) },
    ])}
    ${pageHead(area ? area.name : m.book.title, titleCase(m.title), area?.question || '')}
    <p class="depth-line"><span class="depth">${depthOf(t)}</span> · ${t.total} entries ·
      ${t.answered} answered · ${t.partial} in progress · ${t.unanswered} not started</p>
    <div class="entry-list">${m.items.map(it => it.kind === 'prompt' ? entryRow(it) : inventoryBlock(it)).join('')}</div>
    <nav class="entry-nav">
      <a class="btn btn-quiet" href="#/map/${area?.id || ''}">← ${esc(area?.name || 'Life Map')}</a>
      <a class="btn" href="#/reflect">Reflect somewhere else →</a>
    </nav>
  </section>`;
};

const inventoryBlock = it => `<div class="inventory">
  <h3>${tc(it.title)}</h3>
  <p class="note">${it.body.map(esc).join(' ')}</p>
  ${it.fields.length ? `<div class="field-list">${it.fields.map(f => `<span>${esc(f)}</span>`).join('')}</div>` : ''}
  ${evChips(it.evidence)}
</div>`;

/* ── Life Map ──────────────────────────────────────────────────────── */
V.map = (areaId) => {
  if (areaId && AREA_BY_ID[areaId]) return areaView(AREA_BY_ID[areaId]);
  return `<section class="view">
    ${pageHead('Reflect','Life Map',`${REALMS.length} realms, ${Object.keys(AREA_BY_ID).length} areas. Every chapter of your material sits in exactly one of them, and each area opens into its reflections, patterns and passages.`)}
    ${REALMS.map(r => {
      const ps = PROMPTS.filter(p => p.area && p.area.realm.id === r.id);
      return `<section class="block" id="realm-${r.id}">
        <div class="block-head">
          <h2>${esc(r.name)}</h2>
          <span class="note">${esc(r.blurb)} · ${depthOf(tally(ps))}</span>
        </div>
        <div class="area-grid">
          ${r.areas.map(a => {
            const ap = PROMPTS.filter(p => p.area === a);
            const at = tally(ap);
            const pats = PATTERN_INDEX.filter(p => p.areas.includes(a.id)).length;
            return `<a class="area-card" href="#/map/${a.id}">
              <span class="area-name">${esc(a.name)}</span>
              <span class="note">${esc(a.question)}</span>
              <span class="area-foot">
                <span class="depth">${depthOf(at)}</span>
                <span class="note">${at.total ? at.total + ' entries' : 'carried by testimony'}${pats ? ` · ${pats} patterns` : ''}</span>
              </span>
            </a>`;
          }).join('')}
        </div>
      </section>`;
    }).join('')}
  </section>`;
};

function areaView(a) {
  const ps = PROMPTS.filter(p => p.area === a);
  const t = tally(ps);
  const pats = PATTERN_INDEX.filter(p => p.areas.includes(a.id)).sort((x,y) => y.entries.length - x.entries.length);
  const chapters = a.chapters.map(k => MODULE_BY_KEY[k]).filter(Boolean);
  return `<section class="view">
    ${crumbs([{ label:'Life Map', href:'#/map' }, { label:a.realm.name, href:'#/map' }, { label:a.name }])}
    ${pageHead(a.realm.name, a.name, a.question)}
    <p class="depth-line"><span class="depth">${depthOf(t)}</span>${t.total ? ` · ${t.total} entries · ${t.answered} answered · ${t.partial} in progress · ${t.unanswered} not started` : ' · no chapter of its own — carried by your passages'}</p>

    ${chapters.length ? `<section class="block">
      <div class="block-head"><h2>Chapters</h2></div>
      <div class="stack">
        ${chapters.map(m => { const mt = tally(m.items.filter(x => x.kind === 'prompt'));
          return `<a class="mini" href="#/chapter/${m.book.id}/${m.num}">
            <span class="mini-title">${tc(m.title)}</span>
            <span class="note">${esc(m.book.title)} · ${mt.total} entries · ${depthOf(mt)}</span>
            <span class="bar"><i style="width:${mt.total?Math.round((mt.answered+mt.drafted)/mt.total*100):0}%"></i></span>
          </a>`; }).join('')}
      </div>
    </section>` : ''}

    ${pats.length ? `<section class="block">
      <div class="block-head"><h2>Patterns Appearing Here</h2><a class="link" href="#/patterns">Pattern Atlas</a></div>
      <div class="stack">
        ${pats.slice(0,6).map(p => `<a class="mini" href="#/patterns/${p.id}">
          <span class="mini-title">${esc(p.name)}</span>
          <span class="conf conf-${p.confidence.split(' ')[0].toLowerCase()}">${esc(p.confidence)}</span>
          <span class="note">${p.entries.filter(e => e.area === a).length} reflections in ${esc(a.name)}</span>
        </a>`).join('')}
      </div>
    </section>` : ''}

    ${a.evidence.length ? `<section class="block">
      <div class="block-head"><h2>Your Own Words</h2></div>
      ${evChips(a.evidence)}
    </section>` : ''}

    ${ps.length ? `<section class="block">
      <div class="block-head"><h2>Every Entry in ${tc(a.name)}</h2><span class="note">${ps.length}</span></div>
      <div class="entry-list">${ps.map(p => entryRow(p)).join('')}</div>
    </section>` : empty(
      `${a.name} has no chapter of its own yet.`,
      'It is carried by your passages and by the patterns above. New reflections mentioning it will collect here.')}
  </section>`;
}

/* ══════════════════════════════════════════════════════════════════════
   REFLECTION LIBRARY
   ══════════════════════════════════════════════════════════════════════ */
const lib = { q:'', realm:'all', status:'all', flag:'all', pattern:'all', limit:25 };

function libraryResults() {
  let list = PROMPTS.slice();
  if (lib.realm !== 'all')   list = list.filter(p => p.area?.realm.id === lib.realm);
  if (lib.status !== 'all')  list = list.filter(p => effStatus(p) === lib.status);
  if (lib.flag === 'core')   list = list.filter(p => Reflections.get(p.id)?.core);
  if (lib.flag === 'changed')list = list.filter(p => Reflections.get(p.id)?.changed);
  if (lib.flag === 'mine')   list = list.filter(p => Reflections.has(p.id));
  if (lib.pattern !== 'all') {
    const ids = new Set(PATTERN_INDEX_BY_ID[lib.pattern].entries.map(e => e.id));
    list = list.filter(p => ids.has(p.id));
  }
  if (lib.q.trim()) {
    const ids = new Set(searchCorpus(lib.q, ['entry']).map(r => r.item.id));
    list = list.filter(p => ids.has(p.id));
  }
  return list;
}

V.library = () => {
  const list = libraryResults();
  const shown = list.slice(0, lib.limit);
  return `<section class="view">
    ${pageHead('Reflect','Reflection Library','Every entry, searchable by what you actually wrote. Filters narrow it; nothing is ever deleted.')}
    <div class="filters">
      <label class="filter-search">
        <span class="sr-only">Search reflections</span>
        <input id="libQ" type="search" value="${esc(lib.q)}" placeholder="Search the text of your answers…">
      </label>
      <label>Realm<select id="libRealm">
        <option value="all">All realms</option>
        ${REALMS.map(r => `<option value="${r.id}"${lib.realm===r.id?' selected':''}>${esc(r.name)}</option>`).join('')}
      </select></label>
      <label>Status<select id="libStatus">
        ${[['all','Any status'],['answered','Answered'],['partial','In Progress'],['unanswered','Not Started'],['drafted','Draft Saved'],['unknown',"Don't Know Yet"],['later','Set Aside']]
          .map(([v,l]) => `<option value="${v}"${lib.status===v?' selected':''}>${l}</option>`).join('')}
      </select></label>
      <label>Marked<select id="libFlag">
        ${[['all','Everything'],['mine','Written by me'],['core','Core Reflections'],['changed','This Changed']]
          .map(([v,l]) => `<option value="${v}"${lib.flag===v?' selected':''}>${l}</option>`).join('')}
      </select></label>
      <label>Theme<select id="libPattern">
        <option value="all">Any theme</option>
        ${PATTERN_INDEX.map(p => `<option value="${p.id}"${lib.pattern===p.id?' selected':''}>${esc(p.name)}</option>`).join('')}
      </select></label>
    </div>
    <p class="result-count" role="status">${list.length} of ${PROMPTS.length} entries</p>
    <div class="entry-list" id="libList">
      ${shown.length ? shown.map(p => entryRow(p, { showArea:true })).join('')
        : empty('Nothing matches those filters.','Clear the search or widen a filter — every entry is still here.')}
    </div>
    ${list.length > lib.limit ? `<button class="btn full" id="libMore">Show 25 more (${list.length - lib.limit} remaining)</button>` : ''}
  </section>`;
};

/* ── Open Questions ────────────────────────────────────────────────── */
V.open = () => {
  const partial = PROMPTS.filter(p => effStatus(p) === 'partial');
  const notStarted = PROMPTS.filter(p => effStatus(p) === 'unanswered');
  const setAside = PROMPTS.filter(p => ['unknown','later'].includes(effStatus(p)));
  /* questions that come from a genuine gap, not from a desire to keep you busy */
  const gaps = DOC.tensions.slice(0,4).map(t => ({
    title:t.title, body:t.body.join(' '), evidence:t.evidence,
    ask:'This is unresolved on purpose. What would have to be true for both sides to hold?',
  }));
  return `<section class="view">
    ${pageHead('Reflect','Open Questions','What this still does not understand about you — drawn from gaps and contradictions in what you have already said, not from a quota.')}

    <section class="block">
      <div class="block-head"><h2>Raised by Your Own Contradictions</h2><a class="link" href="#/tensions">Tension Map</a></div>
      <div class="stack">
        ${gaps.map(g => `<div class="mini mini-static">
          <span class="mini-title">${tc(g.title)}</span>
          <span class="note">${esc(g.body)}</span>
          <span class="ask">${esc(g.ask)}</span>
          ${evChips(g.evidence)}
        </div>`).join('')}
      </div>
    </section>

    <section class="block">
      <div class="block-head"><h2>In Progress</h2><span class="note">${partial.length} · a real answer that still needs one specific thing</span></div>
      <div class="entry-list">${partial.slice(0,12).map(p => entryRow(p, { showArea:true })).join('')}</div>
      ${partial.length > 12 ? `<a class="btn full" href="#/library">See all ${partial.length} in the library</a>` : ''}
    </section>

    <section class="block">
      <div class="block-head"><h2>Not Started</h2><span class="note">${notStarted.length} · each one says what it is waiting for</span></div>
      <div class="entry-list">${notStarted.slice(0,12).map(p => entryRow(p, { showArea:true })).join('')}</div>
      ${notStarted.length > 12 ? `<a class="btn full" href="#/library">See all ${notStarted.length} in the library</a>` : ''}
    </section>

    ${setAside.length ? `<section class="block">
      <div class="block-head"><h2>Set Aside by You</h2><span class="note">${setAside.length}</span></div>
      <div class="entry-list">${setAside.map(p => entryRow(p, { showArea:true })).join('')}</div>
    </section>` : ''}

    <section class="block">
      <div class="block-head"><h2>Deliberately Left Open</h2></div>
      <div class="prose-block">${DOC.deferred.map(d => `<p>${esc(d.text)}</p>`).join('')}</div>
    </section>

    <section class="block">
      <div class="block-head"><h2>Supporting Fields Still Empty</h2><span class="note">Separate from the entry counts above</span></div>
      <div class="prose-block">${DOC.supporting.map(s => `<p>${esc(s)}</p>`).join('')}</div>
    </section>
  </section>`;
};

/* ══════════════════════════════════════════════════════════════════════
   UNDERSTAND
   ══════════════════════════════════════════════════════════════════════ */

V.patterns = (id) => {
  if (id && PATTERN_INDEX_BY_ID[id]) return patternView(PATTERN_INDEX_BY_ID[id]);
  const groups = ['Strong Pattern','Emerging Pattern','Possible Pattern'];
  return `<section class="view">
    ${pageHead('Understand','Pattern Atlas',
      'Needs you named yourself, then counted wherever your own words repeat them. A count is a detection, not a verdict — every one opens into the reflections behind it.')}
    <p class="note legend">Confidence reflects spread, not truth: <strong>Strong</strong> = present in all three books and many reflections · <strong>Emerging</strong> = two books · <strong>Possible</strong> = one context only.</p>
    ${groups.map(g => {
      const list = PATTERN_INDEX.filter(p => p.confidence === g);
      if (!list.length) return '';
      return `<section class="block">
        <div class="block-head"><h2>${g}s</h2><span class="note">${list.length}</span></div>
        <div class="pattern-grid">
          ${list.map(p => `<a class="pattern-card" href="#/patterns/${p.id}">
            <span class="conf conf-${g.split(' ')[0].toLowerCase()}">${g}</span>
            <span class="pattern-name">${esc(p.name)}</span>
            <span class="note">${p.entries.length} reflections · ${p.areas.length} areas · ${p.books.length} of 3 books</span>
            <span class="bar"><i style="width:${Math.min(100, p.entries.length*3)}%"></i></span>
          </a>`).join('')}
        </div>
      </section>`;
    }).join('')}
  </section>`;
};

function patternView(p) {
  const byArea = {};
  p.entries.forEach(e => { const k = e.area?.id || 'other'; (byArea[k] ||= []).push(e); });
  const related = PATTERN_INDEX.filter(o => o.id !== p.id && o.areas.some(a => p.areas.includes(a)))
    .sort((a,b) => b.areas.filter(x => p.areas.includes(x)).length - a.areas.filter(x => p.areas.includes(x)).length)
    .slice(0,4);
  const tension = DOC.tensions.find(t => norm(t.title + t.body.join(' ')).includes(norm(p.name).split(' ')[0]));
  return `<section class="view">
    ${crumbs([{ label:'Pattern Atlas', href:'#/patterns' }, { label:p.name }])}
    ${pageHead('Pattern', p.name, '')}
    <p class="depth-line"><span class="conf conf-${p.confidence.split(' ')[0].toLowerCase()}">${p.confidence}</span>
      · detected in ${p.entries.length} reflections · ${p.areas.length} areas · ${p.books.length} of 3 books · ${p.passages.length} passages</p>

    ${p.seedPrompt ? `<section class="standing">
      <h2 class="quiet-h">What it means to you</h2>
      <p class="prose">${esc(p.seedPrompt.answer)}</p>
      <p class="note">Your own answer to “${esc(p.seedPrompt.prompt)}” · ${esc(p.seedPrompt.id)}</p>
      <a class="link" href="#/entry/${p.seedPrompt.id}">Open that entry</a>
    </section>` : ''}

    ${p.books.length === 3 ? `<div class="callout">
      <strong>${esc(p.name)} appears independently in all three books.</strong>
      <p class="note">A need that recurs across unrelated areas of life carries more weight than one that only appears in a single context.</p>
    </div>` : ''}

    ${evidenceMode({
      said: p.seedPrompt ? [p.seedPrompt.id] : [],
      detected: p.entries.map(e => e.id),
      passages: p.passages.slice(0,6).map(e => e.id),
      interpreted: `Confidence is assigned by spread: ${p.books.length} of 3 books and ${p.entries.length} reflections put this at “${p.confidence}”.`,
      uncertain: 'Word matching cannot tell the difference between wanting something and describing its absence. Read the reflections before trusting the count.',
    })}

    <section class="block">
      <div class="block-head"><h2>Where It Appears</h2></div>
      ${Object.entries(byArea).sort((a,b) => b[1].length - a[1].length).map(([k,list]) => {
        const a = AREA_BY_ID[k];
        return `<div class="where-row">
          <a class="where-name" href="${a ? `#/map/${a.id}` : '#/library'}">${esc(a?.name || 'Elsewhere')}</a>
          <span class="bar"><i style="width:${Math.round(list.length / p.entries.length * 100)}%"></i></span>
          <span class="note">${list.length}</span>
        </div>`;
      }).join('')}
    </section>

    ${p.passages.length ? `<section class="block">
      <div class="block-head"><h2>Supporting Passages</h2></div>
      ${evChips(p.passages.slice(0,10).map(e => e.id))}
    </section>` : ''}

    ${tension ? `<section class="block">
      <div class="block-head"><h2>Where It Pulls Against Something Else</h2><a class="link" href="#/tensions">Tension Map</a></div>
      <div class="mini mini-static"><span class="mini-title">${tc(tension.title)}</span>
        <span class="note">${esc(tension.body.join(' '))}</span></div>
    </section>` : ''}

    ${related.length ? `<section class="block">
      <div class="block-head"><h2>Related Patterns</h2></div>
      <div class="chip-row">${related.map(r => `<a class="chip" href="#/patterns/${r.id}">${esc(r.name)}</a>`).join('')}</div>
    </section>` : ''}

    <section class="block">
      <div class="block-head"><h2>Every Reflection Behind This</h2><span class="note">${p.entries.length}</span></div>
      <div class="entry-list">${p.entries.map(e => entryRow(e, { showArea:true })).join('')}</div>
    </section>
  </section>`;
}

/* ── Tension Map ───────────────────────────────────────────────────── */
V.tensions = () => `<section class="view">
  ${pageHead('Understand','Tension Map',
    'Where two real needs pull against each other. None of these is a flaw to fix — the aim is a life that can hold both.')}
  <div class="stack stack-wide">
    ${DOC.tensions.map((t,i) => `<article class="tension" id="tension-${i}">
      <h2>${tc(t.title)}</h2>
      <p class="prose">${esc(t.body.join(' '))}</p>
      ${evChips(t.evidence, 'In your own words')}
      ${evidenceMode({ passages:t.evidence,
        interpreted:'Named as a tension because both sides appear in your material with comparable weight.',
        uncertain:'Whether this needs resolving at all is your call. Some tensions are simply the shape of a person.' })}
      <p class="ask">Open question · What would a life look like that makes room for both?</p>
    </article>`).join('')}
  </div>
</section>`;

/* ── Non-Negotiables ───────────────────────────────────────────────── */
V.nonneg = () => `<section class="view">
  ${pageHead('Understand','Non-Negotiables',
    'Surfaced from the entries where you said what you will not trade. They stay unrated until you rate them — how often something is mentioned is not the same as how essential it is.')}
  <div class="stack stack-wide">
    ${NON_NEGOTIABLES.map(n => {
      const cur = importanceOf(n.domain);
      return `<article class="nn">
        <div class="nn-head">
          <h2>${esc(n.domain)}</h2>
          <label class="nn-rate">Importance
            <select data-nn="${esc(n.domain)}">
              ${IMPORTANCE.map(v => `<option${cur===v?' selected':''}>${v}</option>`).join('')}
            </select>
          </label>
        </div>
        ${n.prompts.length ? `<div class="nn-body">
          ${n.prompts.map(p => `<div class="nn-item">
            <p class="prose">${esc(p.answer || p.prompt)}</p>
            <p class="note">${esc(p.prompt)} · <a class="link" href="#/entry/${p.id}">${esc(p.id)}</a></p>
          </div>`).join('')}
        </div>` : empty('Nothing recorded here yet.','Answer the entries in this domain and candidates will appear.')}
        ${evChips(n.evidence.map(e => e.id), 'Passages')}
        ${evidenceMode({ said:n.prompts.map(p => p.id), passages:n.evidence.map(e => e.id),
          interpreted:'These entries were selected because they explicitly name a limit, a refusal, or a condition.',
          uncertain:'Importance is yours to set. Nothing here is treated as essential until you say so.' })}
      </article>`;
    }).join('')}
  </div>
</section>`;

/* ── Personal Definitions ──────────────────────────────────────────── */
V.definitions = () => `<section class="view">
  ${pageHead('Understand','Personal Definitions',
    'What these words mean when you use them. Generic definitions are useless here — only yours matter.')}
  <div class="def-grid">
    ${DEFINITIONS.map(d => {
      const mine = Store.read('fh.def.' + d.word, '');
      const src = d.prompts.map(id => PROMPT_BY_ID[id]).filter(Boolean);
      return `<article class="def">
        <h2>${esc(d.word)}</h2>
        ${mine ? `<p class="prose def-mine">${esc(mine)}</p><p class="note">Your definition</p>`
               : src[0] ? `<p class="prose">${esc(src[0].answer)}</p><p class="note">From your answer to “${esc(src[0].prompt)}” · ${esc(src[0].id)}</p>`
               : `<p class="note">Nothing recorded for this word yet.</p>`}
        <details class="def-edit">
          <summary>${mine ? 'Edit your definition' : 'Write your own definition'}</summary>
          <textarea data-def="${esc(d.word)}" placeholder="${esc(d.word)} means…">${esc(mine)}</textarea>
          <button class="btn btn-primary" data-def-save="${esc(d.word)}">Save</button>
        </details>
        ${src.length ? `<div class="chip-row">${src.map(p => `<a class="chip" href="#/entry/${p.id}">${esc(p.id)}</a>`).join('')}</div>` : ''}
        ${evChips(d.evidence)}
      </article>`;
    }).join('')}
  </div>
</section>`;

/* ── Quotes From Me ────────────────────────────────────────────────── */
V.quotes = () => `<section class="view">
  ${pageHead('Understand','Quotes From Me',
    'Lines that are literally yours — anchor phrases and the exact wording preserved inside your answers. Nothing paraphrased appears here.')}
  <div class="quote-wall">
    ${QUOTES.map(q => `<blockquote class="quote-card"${q.evidence?.length ? ` data-ev="${esc(q.evidence[0])}"` : ''}>
      <p>${esc(q.text)}</p>
      <cite>${esc(q.source)}</cite>
    </blockquote>`).join('')}
  </div>
</section>`;

/* ── Testimony ─────────────────────────────────────────────────────── */
V.testimony = (evId) => {
  if (evId && EV_BY_ID[evId]) setTimeout(() => openDrawer(evId), 50);
  const groups = { L:[], R:[], C:[], '—':[] };
  DOC.evidence.forEach(e => {
    const n = { L:0, R:0, C:0 };
    e.mapped.forEach(id => { if (n[id[0]] !== undefined) n[id[0]]++; });
    const top = Object.keys(n).sort((a,b) => n[b] - n[a])[0];
    groups[n[top] ? top : '—'].push(e);
  });
  const labels = { L:'On the Life', R:'On the People', C:'On the Place', '—':'Not Yet Mapped' };
  return `<section class="view">
    ${pageHead('Understand','Testimony', DOC.evidenceNote[0] || '')}
    <div class="filters">
      <label class="filter-search"><span class="sr-only">Search passages</span>
        <input id="evSearch" type="search" placeholder="Search the passages…"></label>
      <span class="note" id="evCount">${DOC.evidence.length} passages</span>
    </div>
    <div id="evList">
      ${Object.keys(labels).filter(k => groups[k].length).map(k => `<section class="block">
        <div class="block-head"><h2>${labels[k]}</h2><span class="note">${groups[k].length}</span></div>
        <div class="entry-list">
          ${groups[k].map(e => `<button class="entry-row" data-ev="${esc(e.id)}">
            <span class="entry-meta"><span class="entry-ref">${esc(e.id)}</span></span>
            <span class="entry-main">
              <span class="entry-q">${tc(e.title)}</span>
              <span class="entry-a">${esc(e.body.join(' ').slice(0,170))}…</span>
            </span>
            <span class="note">${e.mapped.length} entries</span>
          </button>`).join('')}
        </div>
      </section>`).join('')}
    </div>
    <div class="prose-block">${DOC.evidenceNote.slice(1).map(p => `<p>${esc(p)}</p>`).join('')}</div>
  </section>`;
};

/* ── The Conversation ──────────────────────────────────────────────── */
V.conversation = (secIdx) => {
  const idx = Math.max(0, Math.min(TX.sections.length-1, parseInt(secIdx,10) || 0));
  const sec = TX.sections[idx];
  return `<section class="view">
    ${pageHead('Understand','The Conversation', TX.note[0] || '')}
    <div class="chip-row">${TX.sections.map((s,i) =>
      `<button class="chip${i===idx?' chip-on':''}" data-sec="${i}">${tc(s.title)}</button>`).join('')}</div>
    <div class="qa-list">
      ${sec.entries.map((e,i) => `<article class="qa${i===0?' open':''}">
        <button class="qa-head" data-qa>
          <span class="qa-n">${String(e.n).padStart(2,'0')}</span>
          <span class="qa-q">${esc(e.question)}</span>
          <span class="qa-caret" aria-hidden="true">→</span>
        </button>
        <div class="qa-body"${i===0?'':' hidden'}>${e.answer.map(p => `<p class="prose">${esc(p)}</p>`).join('')}</div>
      </article>`).join('')}
    </div>
  </section>`;
};

/* ══════════════════════════════════════════════════════════════════════
   DESIGN
   ══════════════════════════════════════════════════════════════════════ */

/* ── Ideal Life Blueprint ──────────────────────────────────────────── */
V.blueprint = () => {
  const t = tally(PROMPTS);
  return `<section class="view">
    ${pageHead('Design','Ideal Life Blueprint',
      'A standing synthesis of how you appear to thrive, assembled only from things you have already said. It will keep changing, because you will.')}
    <p class="note legend">Drawn from ${t.answered + t.partial} answered or partly answered entries, ${DOC.evidence.length} passages and ${DOC.northStar.length} north-star statements. Last recomputed just now, from the current state of your material.</p>

    <div class="blueprint">
      ${BLUEPRINT.map(b => {
        const ns = b.northStar ? DOC.northStar.find(n => n.title === b.northStar) : null;
        const ps = (b.prompts || []).map(id => PROMPT_BY_ID[id]).filter(Boolean);
        const answered = ps.filter(p => p.status !== 'unanswered');
        const lead = ns ? ns.body.join(' ') : answered[0]?.answer || '';
        return `<article class="bp">
          <h2>${esc(b.title)}</h2>
          ${lead ? `<p class="prose">${esc(lead)}</p>` : empty('Not enough recorded yet.','Answer the entries linked below and this section will fill itself in.')}
          ${answered.length > (ns ? 0 : 1) ? `<ul class="bp-list">
            ${answered.slice(ns ? 0 : 1).map(p => `<li><span class="prose">${esc(p.answer)}</span>
              <a class="link" href="#/entry/${p.id}">${esc(p.id)}</a></li>`).join('')}
          </ul>` : ''}
          ${evidenceMode({
            said: ps.map(p => p.id),
            passages: b.evidence || [],
            interpreted: ns ? `Led by your north-star statement “${ns.title}”.` : 'Assembled from the entries listed, in the order you gave them.',
            uncertain: ps.length > answered.length ? `${ps.length - answered.length} of the entries feeding this are still unanswered.` : '',
          })}
        </article>`;
      }).join('')}
    </div>

    <div class="grid-2">
      <a class="panel" href="#/nonneg"><span class="eyebrow">Carries into</span><h2>Non-Negotiables</h2>
        <p class="note">The conditions you are least willing to trade.</p></a>
      <a class="panel" href="#/decisions"><span class="eyebrow">Carries into</span><h2>Decision Lab</h2>
        <p class="note">Turn all of this into criteria for a real choice.</p></a>
    </div>
  </section>`;
};

/* ── Decision Lab ──────────────────────────────────────────────────── */
V.decisions = (id) => {
  if (id) return decisionView(id);
  const all = Decisions.all();
  return `<section class="view">
    ${pageHead('Design','Decision Lab',
      'Your established needs become the criteria, so you never have to reinvent what matters. Nothing here declares a right answer — it shows what aligns, what does not, and what you would be trading.')}

    <section class="block">
      <div class="block-head"><h2>Start a Decision</h2></div>
      <div class="kind-grid">
        ${DECISION_KINDS.map(k => `<button class="kind" data-kind="${k.id}">
          <span class="kind-name">${esc(k.name)}</span>
          <span class="note">${k.criteria.length} criteria drawn from your needs</span>
        </button>`).join('')}
      </div>
    </section>

    <section class="block">
      <div class="block-head"><h2>Your Decisions</h2><span class="note">${all.length}</span></div>
      ${all.length ? `<div class="entry-list">
        ${all.map(d => `<a class="entry-row" href="#/decisions/${d.id}">
          <span class="entry-meta"><span class="entry-ref">${fmtDate(d.at)}</span></span>
          <span class="entry-main">
            <span class="entry-q">${esc(d.name)}</span>
            <span class="entry-a">${d.options.length} option${d.options.length===1?'':'s'} · ${d.criteria.length} criteria</span>
          </span>
        </a>`).join('')}
      </div>` : empty('No decisions yet.','Pick a kind above. The criteria arrive already filled in from what you have said matters.')}
    </section>
  </section>`;
};

function decisionView(id) {
  const d = Decisions.get(id);
  if (!d) return V.decisions();
  const crits = d.criteria.map(c => Decisions.criterion(c));
  const scored = d.options.map(o => ({ o, s:Decisions.score(d, o) }))
    .sort((a,b) => (b.s.pct ?? -1) - (a.s.pct ?? -1));
  const top = scored[0], next = scored[1];

  return `<section class="view">
    ${crumbs([{ label:'Decision Lab', href:'#/decisions' }, { label:d.name }])}
    ${pageHead('Decision', d.name, 'Weight what matters, then say how each option does on it. Leave anything you genuinely do not know as Unknown — a gap is more useful than a guess.')}

    ${scored.length >= 2 && top.s.pct !== null ? `<div class="callout">
      <strong>${esc(top.o.name)} currently aligns more strongly with your stated needs${top.s.strong.length ? ` for ${esc(top.s.strong.slice(0,4).join(', '))}` : ''}.</strong>
      <p class="note">${top.s.weak.length ? `${esc(top.s.weak.slice(0,3).join(', '))} ${top.s.weak.length===1?'remains a':'remain'} tradeoff.` : ''}
        ${next && next.s.pct !== null ? ` ${esc(next.o.name)} is close behind${next.s.strong.length ? ` on ${esc(next.s.strong.slice(0,2).join(' and '))}` : ''}.` : ''}
        ${top.s.unknown.length ? ` ${top.s.unknown.length} criteria are still unrated, so this is provisional.` : ''}</p>
      <p class="note">This is a description of fit against criteria you set — not a recommendation.</p>
    </div>` : ''}

    <section class="block">
      <div class="block-head"><h2>Criteria</h2><span class="note">Drawn from your reflections · adjust the weight</span></div>
      <div class="crit-list">
        ${crits.map(c => `<div class="crit">
          <span class="crit-name">${esc(c.name)}</span>
          <label class="crit-weight">Weight
            <select data-weight="${esc(c.id)}" data-decision="${esc(d.id)}">
              ${[[1,'Minor'],[2,'Matters'],[3,'Decisive']].map(([v,l]) =>
                `<option value="${v}"${(d.weights[c.id]??2)==v?' selected':''}>${l}</option>`).join('')}
            </select>
          </label>
          ${c.prompts.length ? `<a class="link" href="#/entry/${c.prompts[0]}">${esc(c.prompts[0])}</a>` : ''}
        </div>`).join('')}
      </div>
    </section>

    <section class="block">
      <div class="block-head"><h2>Options</h2>
        <button class="link" data-add-option="${esc(d.id)}">Add an option</button></div>
      ${d.options.length ? `<div class="table-scroll"><table class="matrix">
        <thead><tr><th scope="col">Criterion</th>
          ${d.options.map(o => `<th scope="col">${esc(o.name)}</th>`).join('')}</tr></thead>
        <tbody>
          ${crits.map(c => `<tr><th scope="row">${esc(c.name)}
            <span class="note">${['','Minor','Matters','Decisive'][d.weights[c.id]??2]}</span></th>
            ${d.options.map((o,oi) => `<td>
              <select data-score="${esc(c.id)}" data-oi="${oi}" data-decision="${esc(d.id)}"
                      aria-label="${esc(o.name)} on ${esc(c.name)}">
                ${ALIGN.map((l,v) => `<option value="${v}"${(o.scores?.[c.id]??0)==v?' selected':''}>${l}</option>`).join('')}
              </select></td>`).join('')}
          </tr>`).join('')}
          <tr class="matrix-total"><th scope="row">Alignment</th>
            ${d.options.map(o => { const s = Decisions.score(d,o);
              return `<td>${s.pct === null ? '<span class="note">Not enough rated</span>'
                : `<span class="align">${s.pct}%</span><span class="note">${s.unknown.length} unknown</span>`}</td>`; }).join('')}
          </tr>
        </tbody>
      </table></div>` : empty('No options yet.','Add the cities, jobs or apartments you are actually weighing.')}
    </section>

    ${scored.some(x => x.s.unknown.length) ? `<section class="block">
      <div class="block-head"><h2>Where Certainty Is Low</h2></div>
      <div class="stack">
        ${scored.filter(x => x.s.unknown.length).slice(0,3).map(x => `<div class="mini mini-static">
          <span class="mini-title">${esc(x.o.name)}</span>
          <span class="note">Unrated: ${esc(x.s.unknown.join(', '))}</span>
          <span class="ask">Try this and learn more — a visit, a trial week, a conversation would settle these faster than more thinking.</span>
          <button class="link" data-experiment-from="${esc(d.id)}|${esc(x.o.name)}">Design an experiment</button>
        </div>`).join('')}
      </div>
    </section>` : ''}

    <div class="danger-row"><button class="btn btn-quiet" data-delete-decision="${esc(d.id)}">Delete this decision</button></div>
  </section>`;
}

/* ── Experiments ───────────────────────────────────────────────────── */
V.experiments = () => {
  const mine = Store.read('fh.experiments', []);
  const fromBook = PROMPTS.filter(p => /experiment|test|try/i.test(p.prompt) && p.status !== 'answered').slice(0,10);
  return `<section class="view">
    ${pageHead('Design','Experiments',
      'When certainty is low, a small real action teaches more than more reflection. Nothing here tells you what to do — it proposes something to find out.')}

    <section class="block">
      <div class="block-head"><h2>Running</h2>
        <button class="link" id="newExperiment">Design an experiment</button></div>
      ${mine.length ? `<div class="stack stack-wide">
        ${mine.map(x => `<article class="mini mini-static">
          <span class="mini-title">${esc(x.title)}</span>
          ${x.why ? `<span class="note">To learn: ${esc(x.why)}</span>` : ''}
          ${x.action ? `<span class="note">Action: ${esc(x.action)}</span>` : ''}
          <label class="exp-result">What happened
            <textarea data-exp-result="${esc(x.id)}" placeholder="Write it down once you know.">${esc(x.result||'')}</textarea>
          </label>
          <span class="note">Started ${fmtDate(x.at)}</span>
          <button class="link" data-delete-exp="${esc(x.id)}">Remove</button>
        </article>`).join('')}
      </div>` : empty('No experiments yet.','Good ones come from the Decision Lab, wherever an option has criteria you cannot honestly rate.')}
    </section>

    <section class="block">
      <div class="block-head"><h2>Proposed by Your Own Material</h2>
        <span class="note">Entries that already ask for a test</span></div>
      <div class="entry-list">${fromBook.map(p => entryRow(p, { showArea:true })).join('')}</div>
    </section>
  </section>`;
};

/* ══════════════════════════════════════════════════════════════════════
   HISTORY
   ══════════════════════════════════════════════════════════════════════ */

V.timeline = () => {
  const events = Events.all();
  const writings = Reflections.all().flatMap(({prompt,rec}) =>
    rec.versions.map((v,i) => ({ prompt, at:v.at, kind:i === 0 ? 'first' : 'revision' })))
    .sort((a,b) => (b.at||'').localeCompare(a.at||''));
  return `<section class="view">
    ${pageHead('History','Personal Timeline',
      'The periods you described, and everything you have written since. Nothing here has been dated for you — the seeded entries use your own framing.')}

    <section class="block">
      <div class="block-head"><h2>Life Events</h2><button class="link" id="addEvent">Add an event</button></div>
      <ol class="timeline">
        ${events.map(e => `<li class="tl-item">
          <span class="tl-when">${esc(e.when || '')}</span>
          <span class="tl-body">
            <span class="tl-label">${esc(e.label)}</span>
            ${e.note ? `<span class="note">${esc(e.note)}</span>` : ''}
            ${e.seeded ? '<span class="note">As you described it</span>' : ''}
            ${e.evidence?.length ? evChips(e.evidence) : ''}
          </span>
          ${!e.seeded ? `<button class="link" data-delete-event="${esc(e.id)}">Remove</button>` : ''}
        </li>`).join('')}
      </ol>
    </section>

    <section class="block">
      <div class="block-head"><h2>What You Have Written</h2><span class="note">${writings.length} entries in time order</span></div>
      ${writings.length ? `<ol class="timeline">
        ${writings.slice(0,40).map(w => `<li class="tl-item">
          <span class="tl-when">${fmtDate(w.at)}</span>
          <span class="tl-body">
            <a class="tl-label" href="#/entry/${w.prompt.id}">${esc(w.prompt.prompt)}</a>
            <span class="note">${w.kind === 'first' ? 'First written' : 'Revised'} · ${esc(w.prompt.area?.name || w.prompt.book.title)}</span>
          </span>
        </li>`).join('')}
      </ol>` : empty('Your timeline is still forming.','Once you write and revise reflections, this becomes a record of how your thinking moved.')}
    </section>
  </section>`;
};

V.changes = () => {
  const revised = Reflections.all().filter(x => x.rec.versions.length > 1);
  const flagged = PROMPTS.filter(p => Reflections.get(p.id)?.changed);
  return `<section class="view">
    ${pageHead('History','Then vs Now',
      'Nothing you write is overwritten. When an answer changes, both versions are kept and shown side by side.')}

    <section class="block">
      <div class="block-head"><h2>Revised Reflections</h2><span class="note">${revised.length}</span></div>
      ${revised.length ? revised.map(({prompt,rec}) => {
        const first = rec.versions[0], now = rec.versions.at(-1);
        return `<article class="then-now">
          <h3><a href="#/entry/${prompt.id}">${esc(prompt.prompt)}</a></h3>
          <div class="tn-grid">
            <div><span class="eyebrow">Then · ${fmtDate(first.at)}</span><p class="prose">${esc(first.text)}</p></div>
            <div><span class="eyebrow">Now · ${fmtDate(now.at)}</span><p class="prose">${esc(now.text)}</p></div>
          </div>
          <p class="note">${rec.versions.length} versions kept. What changed is for you to name — nothing is inferred here.</p>
        </article>`;
      }).join('') : empty('No reflection has more than one version yet.',
        'Use “Save as New Version” when your answer genuinely shifts, and the earlier one is preserved here rather than replaced.')}
    </section>

    <section class="block">
      <div class="block-head"><h2>Marked “This Changed”</h2><span class="note">${flagged.length}</span></div>
      ${flagged.length ? `<div class="entry-list">${flagged.map(p => entryRow(p, { showArea:true })).join('')}</div>`
        : empty('Nothing flagged yet.','On any entry, “This Changed” marks a belief you have moved on from without deleting the record of it.')}
    </section>
  </section>`;
};

/* ── Ask My Life ───────────────────────────────────────────────────── */
const ask = { q:'', results:null };
V.ask = () => {
  const suggestions = ['Why do I keep wanting to move?','What do I actually want from work?',
    'What makes me feel at home?','What keeps appearing in my relationships?','What drains me?','What does independence mean to me?'];
  return `<section class="view">
    ${pageHead('Understand','Ask My Life',
      'A way into your own archive. Every answer is made of your reflections and passages, quoted and cited — nothing is generated on your behalf.')}
    <div class="ask-box">
      <label class="sr-only" for="askQ">Ask a question</label>
      <input id="askQ" type="search" value="${esc(ask.q)}" placeholder="Ask something about yourself…">
      <button class="btn btn-primary" id="askGo">Search my archive</button>
    </div>
    <div class="chip-row">${suggestions.map(s => `<button class="chip" data-ask="${esc(s)}">${esc(s)}</button>`).join('')}</div>
    <div id="askResults">${ask.results ? askResults() : empty(
      'Ask anything you would ask a friend who had read everything you have written.',
      'Searching “independence” also finds living alone, having control, and making my own decisions — it matches meaning, not just spelling.')}</div>
  </section>`;
};

function askResults() {
  const res = searchCorpus(ask.q);
  if (!res.length) return empty(`Nothing in your archive matches “${ask.q}”.`,
    'Try a plainer word. The archive only knows what you have already said.');
  const by = k => res.filter(r => r.item.kind === k);
  const block = (label, list, render) => !list.length ? '' : `<section class="block">
    <div class="block-head"><h2>${label}</h2><span class="note">${list.length}</span></div>${render(list)}</section>`;
  return `<p class="result-count" role="status">${res.length} places in your own words</p>
    ${block('From your reflections', by('entry').slice(0,10),
      l => `<div class="entry-list">${l.map(r => entryRow(r.item.prompt, { showArea:true })).join('')}</div>`)}
    ${block('From your passages', by('passage').slice(0,8),
      l => evChips(l.map(r => r.item.id)))}
    ${block('From the recording', by('recording').slice(0,6),
      l => `<div class="stack">${l.map(r => `<a class="mini" href="#/conversation/${r.item.section}">
        <span class="mini-title">${esc(r.item.title)}</span>
        <span class="note">${esc(r.item.body.slice(0,150))}…</span></a>`).join('')}</div>`)}
    <p class="note legend">Matched on: ${esc(expand(ask.q).slice(0,10).join(', '))}. Ranked by how many of those words appear — not by importance.</p>`;
}

/* ── Data & privacy ────────────────────────────────────────────────── */
V.data = () => {
  const written = Reflections.all();
  const versions = written.reduce((n,x) => n + x.rec.versions.length, 0);
  return `<section class="view">
    ${pageHead('Your Data','What Is Stored, and Where',
      'Everything you write lives in this browser, on this device, in local storage. It is never uploaded, and nothing analyses it anywhere else.')}
    <div class="stack stack-wide">
      <div class="mini mini-static"><span class="mini-title">Held on this device</span>
        <span class="note">${written.length} reflections · ${versions} versions kept · ${Decisions.all().length} decisions ·
          ${Store.read('fh.experiments',[]).length} experiments · ${Store.read('fh.events',[]).length} events you added</span></div>
      <div class="mini mini-static"><span class="mini-title">What analyses it</span>
        <span class="note">Only this page, in your browser. Pattern detection is word matching over your own text; there is no server and no model.</span></div>
      <div class="mini mini-static"><span class="mini-title">The source material</span>
        <span class="note">The 376 entries and ${DOC.evidence.length} passages ship with the site. Note this site is published publicly — anyone with the link can read the source material, though not what you write here.</span></div>
    </div>
    <section class="block">
      <div class="block-head"><h2>Take It With You</h2></div>
      <div class="btn-row">
        <button class="btn btn-primary" id="exportJson">Export everything (JSON)</button>
        <button class="btn" id="exportMd">Export writing (Markdown)</button>
        <label class="btn import-label">Restore from backup<input id="importJson" type="file" accept=".json,application/json"></label>
      </div>
      <p class="note">A backup restores your reflections, versions, marks, decisions and events. Nothing is ever deleted without asking.</p>
    </section>
    <section class="block">
      <div class="block-head"><h2>Delete</h2></div>
      <div class="btn-row"><button class="btn btn-quiet" id="wipe">Delete everything I have written</button></div>
      <p class="note">This clears your writing from this browser only. Export first — it cannot be undone.</p>
    </section>
  </section>`;
};

/* ══════════════════════════════════════════════════════════════════════
   OVERLAYS
   ══════════════════════════════════════════════════════════════════════ */
let overlayReturn = null;

function openDrawer(evId) {
  const e = EV_BY_ID[evId]; if (!e) return;
  overlayReturn = document.activeElement;
  $('#drawerEyebrow').textContent = `${e.id} · ${e.source}`;
  $('#drawerTitle').textContent = titleCase(e.title);
  $('#drawerBody').innerHTML =
    e.body.map(p => `<p class="prose">${esc(p)}</p>`).join('') +
    (e.mapped.length ? `<div class="block"><div class="block-head"><h2>Entries This Supports</h2>
      <span class="note">${e.mapped.length}</span></div>${entryChips(e.mapped)}</div>` : '');
  $('#drawer').hidden = false; $('#drawerScrim').hidden = false;
  $('#drawerBody').scrollTop = 0;
  document.body.style.overflow = 'hidden';
  $('#drawerClose').focus();
}
function closeDrawer() {
  $('#drawer').hidden = true; $('#drawerScrim').hidden = true;
  document.body.style.overflow = '';
  overlayReturn?.focus?.();
}

let paletteHits = [];
function renderPalette(q) {
  const box = $('#paletteResults');
  if (!q.trim()) { box.innerHTML = `<div class="empty"><p>Search everything you have said.</p>
    <p class="note">Entries, passages, the recording, patterns, quotes and decisions.</p></div>`; paletteHits = []; return; }
  const hits = [];
  searchCorpus(q).slice(0,24).forEach(r => {
    const c = r.item;
    if (c.kind === 'entry')      hits.push({ tag:c.id, kind:'Entry', main:c.title, sub:c.prompt.answer, go:() => location.hash = `#/entry/${c.id}` });
    else if (c.kind === 'passage') hits.push({ tag:c.id, kind:'Passage', main:titleCase(c.title), sub:c.body, go:() => { closePalette(); openDrawer(c.id); } });
    else hits.push({ tag:c.id, kind:'Recording', main:c.title, sub:c.body, go:() => location.hash = `#/conversation/${c.section}` });
  });
  const ql = norm(q);
  PATTERN_INDEX.filter(p => norm(p.name).includes(ql)).forEach(p =>
    hits.unshift({ tag:'Pattern', kind:p.confidence, main:p.name, sub:`${p.entries.length} reflections across ${p.areas.length} areas`, go:() => location.hash = `#/patterns/${p.id}` }));
  QUOTES.filter(x => norm(x.text).includes(ql)).slice(0,4).forEach(x =>
    hits.push({ tag:'Quote', kind:'Your words', main:x.text, sub:x.source, go:() => location.hash = '#/quotes' }));
  Decisions.all().filter(d => norm(d.name).includes(ql)).forEach(d =>
    hits.unshift({ tag:'Decision', kind:'Design', main:d.name, sub:`${d.options.length} options`, go:() => location.hash = `#/decisions/${d.id}` }));
  paletteHits = hits;
  box.innerHTML = hits.length ? hits.map((h,i) => `<button class="pres${i===0?' sel':''}" data-pi="${i}">
      <span class="pres-top"><b>${esc(h.tag)}</b> ${esc(h.kind)}</span>
      <span class="pres-main">${esc(String(h.main).slice(0,110))}</span>
      <span class="pres-sub">${esc(String(h.sub || '').slice(0,140))}</span>
    </button>`).join('') : `<div class="empty"><p>Nothing matched “${esc(q)}”.</p></div>`;
}
function openPalette() {
  overlayReturn = document.activeElement;
  $('#paletteScrim').hidden = false;
  const i = $('#paletteInput'); i.value = ''; renderPalette('');
  document.body.style.overflow = 'hidden';
  setTimeout(() => i.focus(), 20);
}
function closePalette() {
  $('#paletteScrim').hidden = true; document.body.style.overflow = '';
  overlayReturn?.focus?.();
}

/* small inline form, so nothing ever falls back to a browser prompt */
function inlineForm(anchor, title, fields, onSubmit) {
  anchor.parentElement.querySelector('.inline-form')?.remove();
  const f = document.createElement('form');
  f.className = 'inline-form';
  f.innerHTML = `<h3>${esc(title)}</h3>${
    fields.map(x => `<label>${esc(x.label)}${x.long
      ? `<textarea name="${x.name}" ${x.required?'required':''}></textarea>`
      : `<input name="${x.name}" ${x.required?'required':''} autocomplete="off">`}</label>`).join('')}
    <div class="btn-row"><button class="btn btn-primary" type="submit">Save</button>
      <button class="btn btn-quiet" type="button" data-cancel>Cancel</button></div>`;
  f.addEventListener('submit', ev => {
    ev.preventDefault();
    const data = {}; fields.forEach(x => data[x.name] = f.elements[x.name].value.trim());
    if (onSubmit(data) !== false) f.remove();
  });
  f.addEventListener('click', ev => { if (ev.target.dataset.cancel !== undefined) f.remove(); });
  anchor.insertAdjacentElement('afterend', f);
  f.querySelector('input,textarea')?.focus();
}

/* ══════════════════════════════════════════════════════════════════════
   NAVIGATION
   ══════════════════════════════════════════════════════════════════════ */
const NAV = [
  { label:'Home', href:'#/home', view:'home' },
  { group:'Reflect', items:[
    { label:'Continue',       href:'#/reflect',  view:'reflect' },
    { label:'Life Map',       href:'#/map',      view:'map' },
    { label:'Reflections',    href:'#/library',  view:'library' },
    { label:'Open Questions', href:'#/open',     view:'open' },
  ]},
  { group:'Understand', items:[
    { label:'Patterns',        href:'#/patterns',     view:'patterns' },
    { label:'Tensions',        href:'#/tensions',     view:'tensions' },
    { label:'Non-Negotiables', href:'#/nonneg',       view:'nonneg' },
    { label:'Definitions',     href:'#/definitions',  view:'definitions' },
    { label:'Quotes From Me',  href:'#/quotes',       view:'quotes' },
    { label:'Testimony',       href:'#/testimony',    view:'testimony' },
    { label:'The Conversation',href:'#/conversation', view:'conversation' },
    { label:'Ask My Life',     href:'#/ask',          view:'ask' },
  ]},
  { group:'Design', items:[
    { label:'Ideal Life',  href:'#/blueprint',   view:'blueprint' },
    { label:'Decisions',   href:'#/decisions',   view:'decisions' },
    { label:'Experiments', href:'#/experiments', view:'experiments' },
  ]},
  { group:'History', items:[
    { label:'Timeline',    href:'#/timeline', view:'timeline' },
    { label:'Then vs Now', href:'#/changes',  view:'changes' },
  ]},
];
const MODE_OF = {
  home:'home', reflect:'reflect', entry:'reflect', chapter:'reflect', map:'reflect', library:'reflect', open:'reflect',
  patterns:'analysis', tensions:'analysis', nonneg:'analysis', definitions:'analysis', quotes:'analysis',
  testimony:'analysis', conversation:'analysis', ask:'analysis',
  blueprint:'design', decisions:'design', experiments:'design',
  timeline:'history', changes:'history', data:'home',
};

function renderNav(view) {
  const openGroups = NAV.filter(s => s.group && s.items.some(i => i.view === view)).map(s => s.group);
  $('#nav').innerHTML = NAV.map(s => {
    if (!s.group) return `<a href="${s.href}" data-view="${s.view}" class="${view===s.view?'active':''}">${s.label}</a>`;
    const isOpen = openGroups.includes(s.group) || Store.read('fh.nav.' + s.group, false);
    return `<div class="nav-group${isOpen?' open':''}" data-group="${s.group}">
      <button class="nav-toggle" aria-expanded="${isOpen}">${s.group}<span aria-hidden="true">${isOpen?'−':'+'}</span></button>
      <div class="nav-items">${s.items.map(i =>
        `<a href="${i.href}" data-view="${i.view}" class="${view===i.view?'active':''}">${i.label}</a>`).join('')}</div>
    </div>`;
  }).join('');
}

/* ══════════════════════════════════════════════════════════════════════
   ROUTER
   ══════════════════════════════════════════════════════════════════════ */
const TITLES = { home:'Home', reflect:'Reflect', entry:'Reflection', chapter:'Chapter', map:'Life Map',
  library:'Reflection Library', open:'Open Questions', patterns:'Pattern Atlas', tensions:'Tension Map',
  nonneg:'Non-Negotiables', definitions:'Personal Definitions', quotes:'Quotes From Me', testimony:'Testimony',
  conversation:'The Conversation', ask:'Ask My Life', blueprint:'Ideal Life Blueprint', decisions:'Decision Lab',
  experiments:'Experiments', timeline:'Timeline', changes:'Then vs Now', data:'Your Data' };

const ALIAS = { contents:'home', horizon:'home', creed:'blueprint', threads:'patterns',
                evidence:'testimony', writing:'data' };

function route() {
  let parts = (location.hash.replace(/^#\/?/,'') || 'home').split('/').filter(Boolean);
  let v = parts[0];
  if (v === 'paths') {                      // every old deep link still resolves
    if (parts[3]) { location.hash = `#/entry/${parts[3]}`; return; }
    if (parts[2]) { location.hash = `#/chapter/${parts[1]}/${parts[2]}`; return; }
    v = 'map'; parts = ['map'];
  }
  if (ALIAS[v]) { v = ALIAS[v]; parts = [v, ...parts.slice(1)]; }
  if (!V[v]) { v = 'home'; parts = ['home']; }

  $('#main').innerHTML =
      v === 'entry'   ? V.entry(parts[1])
    : v === 'chapter' ? V.chapter(parts[1], parts[2])
    : v === 'map'     ? V.map(parts[1])
    : v === 'patterns'? V.patterns(parts[1])
    : v === 'testimony'? V.testimony(parts[1])
    : v === 'conversation' ? V.conversation(parts[1])
    : v === 'decisions'? V.decisions(parts[1])
    : V[v]();

  document.body.dataset.mode = MODE_OF[v] || 'home';
  renderNav(v);
  document.title = (v === 'entry' && PROMPT_BY_ID[parts[1]] ? PROMPT_BY_ID[parts[1]].prompt : TITLES[v] || 'Home')
    + ' · Fulfillment & Meaning';
  scrollTo({ top:0, behavior:'auto' });
  $('#main').focus({ preventScroll:true });
  if (v === 'entry') setupDictation();
}

/* ══════════════════════════════════════════════════════════════════════
   BEHAVIOUR
   ══════════════════════════════════════════════════════════════════════ */
/* The text is captured when it is typed, never re-read from the DOM when
   the debounce fires — a re-render in between would otherwise save a blank. */
function autosave(id, text) {
  const ok = Reflections.autosave(id, text);
  const s = $('#saveState');
  if (s && $('#reflection')?.dataset.id === id) s.textContent = ok ? 'Saved on this device' : 'Not saved — export a copy';
  return !!ok;
}
/* commit takes a snapshot of whatever is in the box right now */
function commitReflection(id, { complete } = {}) {
  const ta = $('#reflection');
  if (!ta || ta.dataset.id !== id) return false;
  if (complete && !ta.value.trim() && PROMPT_BY_ID[id].status !== 'answered') {
    notify('Write something first, or set it aside instead.'); ta.focus(); return false;
  }
  Reflections.autosave(id, ta.value);
  return !!Reflections.commit(id, { complete });
}

function setupDictation() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const btn = $('#dictate'); if (!btn || !SR) return;
  btn.hidden = false;
  let rec = null;
  btn.addEventListener('click', () => {
    const ta = $('#reflection');
    if (rec) { rec.stop(); rec = null; btn.textContent = 'Dictate'; return; }
    rec = new SR(); rec.continuous = true; rec.interimResults = false;
    rec.onresult = e => {
      const said = Array.from(e.results).slice(e.resultIndex).map(r => r[0].transcript).join(' ');
      ta.value = (ta.value ? ta.value.trimEnd() + ' ' : '') + said.trim();
      ta.dispatchEvent(new Event('input', { bubbles:true }));
    };
    rec.onerror = () => { notify('Dictation stopped.'); rec = null; btn.textContent = 'Dictate'; };
    rec.onend = () => { rec = null; btn.textContent = 'Dictate'; };
    rec.start(); btn.textContent = 'Stop dictating';
  }, { once:false });
}

function download(name, type, text) {
  const u = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a'); a.href = u; a.download = name; a.click();
  setTimeout(() => URL.revokeObjectURL(u), 1000);
}
function backupPayload() {
  return { format:'fulfillment-life', version:2, exported:new Date().toISOString(),
    reflections: PROMPTS.map(p => ({ id:p.id, ...Reflections.get(p.id) })).filter(r => r.versions && (r.versions.length || r.draft)),
    importance: Object.fromEntries(NON_NEGOTIABLES.map(n => [n.domain, importanceOf(n.domain)])),
    definitions: Object.fromEntries(DEFINITIONS.map(d => [d.word, Store.read('fh.def.' + d.word, '')]).filter(x => x[1])),
    decisions: Decisions.all(), experiments: Store.read('fh.experiments', []), events: Store.read('fh.events', []) };
}
function markdownExport() {
  const lines = ['# Fulfillment & Meaning — my writing', '', `_Exported ${new Date().toLocaleString()}_`, ''];
  let area = '';
  Reflections.all().filter(x => x.rec.versions.length || x.rec.draft.trim()).forEach(({prompt,rec}) => {
    const a = prompt.area?.name || prompt.book.title;
    if (a !== area) { lines.push('', `## ${a}`, ''); area = a; }
    lines.push(`### ${prompt.id} — ${prompt.prompt}`, '');
    if (prompt.status !== 'unanswered') lines.push(`_What stood before:_ ${prompt.answer}`, '');
    rec.versions.forEach((v,i) => lines.push(`**${i === 0 ? 'First written' : 'Revision ' + i}, ${fmtDate(v.at)}**`, '', v.text, ''));
    if (rec.draft.trim()) lines.push('**Working draft**', '', rec.draft, '');
  });
  return lines.join('\n');
}

/* ── clicks ────────────────────────────────────────────────────────── */
document.addEventListener('click', e => {
  const t = e.target;
  if (t.closest('.skip-link')) { e.preventDefault(); $('#main').focus(); return; }

  const ev = t.closest('[data-ev]');
  if (ev && ev.dataset.ev) { openDrawer(ev.dataset.ev); return; }
  if (t.closest('#drawerClose') || t.id === 'drawerScrim') { closeDrawer(); return; }
  if (t.closest('#searchBtn')) { openPalette(); return; }
  if (t.id === 'paletteScrim') { closePalette(); return; }
  const pres = t.closest('.pres'); if (pres) { const h = paletteHits[+pres.dataset.pi]; closePalette(); h?.go(); return; }

  const toggle = t.closest('.nav-toggle');
  if (toggle) {
    const g = toggle.closest('.nav-group');
    const open = g.classList.toggle('open');
    toggle.setAttribute('aria-expanded', String(open));
    toggle.querySelector('span').textContent = open ? '−' : '+';
    Store.write('fh.nav.' + g.dataset.group, open); return;
  }

  const b = t.closest('button'); if (!b) return;

  /* reflection mode */
  if (b.dataset.complete)  { if (commitReflection(b.dataset.complete, { complete:true })) { notify('Marked answered. Nothing is locked — you can reopen it any time.'); route(); } return; }
  if (b.dataset.version)   { if (commitReflection(b.dataset.version)) { notify('Saved as a new version. The earlier one is kept.'); route(); } return; }
  if (b.dataset.reopen)    { Reflections.flag(b.dataset.reopen, 'complete', false); notify('Reopened.'); route(); return; }
  if (b.dataset.skip)      { Reflections.flag(b.dataset.id, 'skip', b.dataset.skip);
                             notify(b.dataset.skip === 'unknown' ? "Recorded as “don't know yet”. That is an answer too." : 'Set aside for later.'); route(); return; }
  if (b.dataset.flag)      { const id = b.dataset.id, f = b.dataset.flag;
                             Reflections.flag(id, f, !Reflections.get(id)?.[f]); route(); return; }
  if (b.dataset.insert)    { const ta = $('#reflection'); const at = ta.selectionStart;
                             ta.setRangeText((at && ta.value[at-1] !== '\n' ? '\n' : '') + b.dataset.insert, at, ta.selectionEnd, 'end');
                             ta.focus(); ta.dispatchEvent(new Event('input', { bubbles:true })); return; }

  /* sessions */
  if (b.dataset.session) {
    const s = SESSIONS.find(x => x.id === b.dataset.session);
    const pool = PROMPTS.filter(isOpen);
    const pick = s.id === 'deep'
      ? pool.filter(p => p.module === pool[0]?.module)[0] || pool[0]
      : pool[Math.floor(Math.random() * Math.min(pool.length, 40))];
    if (pick) { Store.write('fh.session', { id:s.id, left:s.count }); location.hash = `#/entry/${pick.id}`; }
    return;
  }

  /* library */
  if (b.id === 'libMore') { lib.limit += 25; route(); return; }

  /* conversation */
  if (b.dataset.sec !== undefined) { location.hash = `#/conversation/${b.dataset.sec}`; return; }
  const qa = b.closest('[data-qa]');
  if (qa) { const card = qa.parentElement; const open = card.classList.toggle('open');
            card.querySelector('.qa-body').hidden = !open; return; }

  /* definitions */
  if (b.dataset.defSave) {
    const w = b.dataset.defSave;
    Store.write('fh.def.' + w, b.closest('.def-edit').querySelector('textarea').value.trim());
    notify(`Your definition of ${w} is saved.`); route(); return;
  }

  /* decisions */
  if (b.dataset.kind) {
    inlineForm(b.closest('.kind-grid'), 'Name this decision',
      [{ name:'name', label:'What are you deciding?', required:true }], data => {
        const k = DECISION_KINDS.find(x => x.id === b.dataset.kind);
        const d = { id:'d' + Date.now().toString(36), kind:k.id, name:data.name, at:new Date().toISOString(),
                    criteria:k.criteria.slice(), weights:Object.fromEntries(k.criteria.map(c => [c,2])), options:[] };
        Decisions.put(d); location.hash = `#/decisions/${d.id}`;
      });
    return;
  }
  if (b.dataset.addOption) {
    const d = Decisions.get(b.dataset.addOption);
    inlineForm(b.closest('.block-head'), 'Add an option',
      [{ name:'name', label:'Option', required:true }], data => {
        d.options.push({ name:data.name, scores:{} }); Decisions.put(d); route();
      });
    return;
  }
  if (b.dataset.deleteDecision) {
    if (confirm('Delete this decision? Your reflections are untouched.')) { Decisions.remove(b.dataset.deleteDecision); location.hash = '#/decisions'; }
    return;
  }
  if (b.dataset.experimentFrom) {
    const [did, opt] = b.dataset.experimentFrom.split('|');
    const xs = Store.read('fh.experiments', []);
    xs.push({ id:'x' + Date.now().toString(36), title:`Test ${opt}`, why:'Rate the criteria currently unknown.',
              action:'', result:'', at:new Date().toISOString(), decisionId:did });
    Store.write('fh.experiments', xs); notify('Experiment created.'); location.hash = '#/experiments'; return;
  }

  /* experiments */
  if (b.id === 'newExperiment') {
    inlineForm(b.closest('.block-head'), 'Design an experiment', [
      { name:'title', label:'What will you try?', required:true },
      { name:'why',   label:'What do you want to learn?' },
      { name:'action',label:'The smallest real action', long:true },
    ], data => {
      const xs = Store.read('fh.experiments', []);
      xs.push({ ...data, id:'x' + Date.now().toString(36), result:'', at:new Date().toISOString() });
      Store.write('fh.experiments', xs); route();
    });
    return;
  }
  if (b.dataset.deleteExp) {
    Store.write('fh.experiments', Store.read('fh.experiments', []).filter(x => x.id !== b.dataset.deleteExp)); route(); return;
  }

  /* timeline */
  if (b.id === 'addEvent') {
    inlineForm(b.closest('.block-head'), 'Add a life event', [
      { name:'label', label:'What happened?', required:true },
      { name:'when',  label:'When (in your own words is fine)' },
      { name:'note',  label:'Anything worth remembering', long:true },
    ], data => { Events.add({ ...data, id:'e' + Date.now().toString(36) }); route(); });
    return;
  }
  if (b.dataset.deleteEvent) { Events.remove(b.dataset.deleteEvent); route(); return; }

  /* ask */
  if (b.id === 'askGo')  { ask.q = $('#askQ').value; ask.results = true; $('#askResults').innerHTML = ask.q.trim() ? askResults() : ''; return; }
  if (b.dataset.ask)     { ask.q = b.dataset.ask; ask.results = true; route(); setTimeout(() => { $('#askQ').value = ask.q; }, 0); return; }

  /* data */
  if (b.id === 'exportJson') { download(`fulfillment-backup-${new Date().toISOString().slice(0,10)}.json`, 'application/json', JSON.stringify(backupPayload(), null, 2)); notify('Backup downloaded.'); return; }
  if (b.id === 'exportMd')   { download(`fulfillment-writing-${new Date().toISOString().slice(0,10)}.md`, 'text/markdown', markdownExport()); notify('Markdown downloaded.'); return; }
  if (b.id === 'wipe') {
    if (!confirm('Delete everything you have written in this browser? Export first — this cannot be undone.')) return;
    Object.keys(localStorage).filter(k => k.startsWith('fh.') && k !== 'fh.theme').forEach(k => localStorage.removeItem(k));
    notify('Your writing has been deleted from this browser.'); route(); return;
  }
});

/* ── typing ────────────────────────────────────────────────────────── */
let saveTimer;
document.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'reflection') {
    const n = t.value.trim() ? t.value.trim().split(/\s+/).length : 0;
    $('#wordCount').textContent = `${n} word${n===1?'':'s'}`;
    $('#saveState').textContent = 'Saving…';
    const id = t.dataset.id, text = t.value;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => autosave(id, text), 400);
    return;
  }
  if (t.id === 'libQ')     { lib.q = t.value; lib.limit = 25; refreshLibrary(); return; }
  if (t.id === 'evSearch') {
    const q = norm(t.value.trim()); let n = 0;
    $$('#evList .entry-row').forEach(row => {
      const ent = EV_BY_ID[row.dataset.ev];
      const hit = !q || norm(ent.id + ' ' + ent.title + ' ' + ent.body.join(' ')).includes(q);
      row.hidden = !hit; if (hit) n++;
    });
    $$('#evList .block').forEach(s => { s.hidden = !s.querySelector('.entry-row:not([hidden])'); });
    $('#evCount').textContent = `${n} passage${n===1?'':'s'}`;
    return;
  }
  if (t.id === 'paletteInput') { renderPalette(t.value); return; }
  if (t.dataset.expResult !== undefined) {
    const xs = Store.read('fh.experiments', []);
    const x = xs.find(y => y.id === t.dataset.expResult);
    if (x) { x.result = t.value; Store.write('fh.experiments', xs); }
  }
});

function refreshLibrary() {
  const list = libraryResults(), shown = list.slice(0, lib.limit);
  $('#libList').innerHTML = shown.length ? shown.map(p => entryRow(p, { showArea:true })).join('')
    : `<div class="empty"><p>Nothing matches those filters.</p><p class="note">Clear the search or widen a filter — every entry is still here.</p></div>`;
  $('.result-count').textContent = `${list.length} of ${PROMPTS.length} entries`;
}

document.addEventListener('change', e => {
  const t = e.target;
  if (['libRealm','libStatus','libFlag','libPattern'].includes(t.id)) {
    lib[{ libRealm:'realm', libStatus:'status', libFlag:'flag', libPattern:'pattern' }[t.id]] = t.value;
    lib.limit = 25; route(); return;
  }
  if (t.dataset.nn) { Store.write('fh.nn.' + t.dataset.nn, t.value); notify(`${t.dataset.nn} marked “${t.value}”.`); return; }
  if (t.dataset.weight) { const d = Decisions.get(t.dataset.decision); d.weights[t.dataset.weight] = +t.value; Decisions.put(d); route(); return; }
  if (t.dataset.score)  { const d = Decisions.get(t.dataset.decision);
                          (d.options[+t.dataset.oi].scores ||= {})[t.dataset.score] = +t.value; Decisions.put(d); route(); return; }
  if (t.id === 'importJson') {
    const f = t.files[0]; if (!f) return;
    f.text().then(txt => {
      const data = JSON.parse(txt);
      if (!['fulfillment-life','fulfillment-writing'].includes(data.format)) throw Error('That is not a Fulfillment backup.');
      let n = 0;
      (data.reflections || data.answers || []).forEach(r => {
        if (!PROMPT_BY_ID[r.id]) return;
        const versions = r.versions || (r.text ? [{ text:r.text, at:r.at || new Date().toISOString() }] : []);
        if (!versions.length && !r.draft) return;
        Store.write(Reflections.key(r.id), { draft:r.draft || '', versions, complete:!!r.complete, core:!!r.core, changed:!!r.changed, skip:r.skip || null });
        n++;
      });
      Object.entries(data.importance || {}).forEach(([k,v]) => Store.write('fh.nn.' + k, v));
      Object.entries(data.definitions || {}).forEach(([k,v]) => Store.write('fh.def.' + k, v));
      if (data.decisions)   Store.write('fh.decisions', data.decisions);
      if (data.experiments) Store.write('fh.experiments', data.experiments);
      if (data.events)      Store.write('fh.events', data.events);
      notify(`${n} reflections restored.`); route();
    }).catch(err => notify(err.message)).finally(() => { t.value = ''; });
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (!$('#paletteScrim').hidden) return closePalette();
    if (!$('#drawer').hidden) return closeDrawer();
  }
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
  if ((e.key === '/' || ((e.key === 'k') && (e.metaKey || e.ctrlKey))) && !typing) { e.preventDefault(); openPalette(); return; }
  if (e.key === 'Enter' && document.activeElement?.id === 'askQ') { e.preventDefault(); $('#askGo').click(); return; }
  if (!$('#paletteScrim').hidden && ['ArrowDown','ArrowUp','Enter'].includes(e.key)) {
    const items = $$('.pres'); if (!items.length) return;
    let i = items.findIndex(x => x.classList.contains('sel'));
    if (e.key === 'Enter') { e.preventDefault(); const h = paletteHits[i < 0 ? 0 : i]; closePalette(); h?.go(); return; }
    e.preventDefault(); items[i]?.classList.remove('sel');
    i = e.key === 'ArrowDown' ? Math.min(items.length-1, i+1) : Math.max(0, i-1);
    items[i].classList.add('sel'); items[i].scrollIntoView({ block:'nearest' });
  }
  /* keep focus inside an open overlay */
  if (e.key === 'Tab') {
    const box = !$('#drawer').hidden ? $('#drawer') : !$('#paletteScrim').hidden ? $('.palette') : null;
    if (!box) return;
    const els = $$('button,input,a[href],textarea,select', box).filter(x => !x.disabled && !x.hidden);
    const first = els[0], lastEl = els.at(-1);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl?.focus(); }
    else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first?.focus(); }
  }
});

addEventListener('hashchange', route);

/* ── boot ──────────────────────────────────────────────────────────── */
$('.brand-text em').textContent = 'Reflect · Understand · Design';
$('#footNote').innerHTML =
  `${PROMPTS.length} entries · ${DOC.evidence.length} passages · ${TX.sections.reduce((n,s) => n + s.entries.length, 0)} recorded answers · ` +
  `${PATTERN_INDEX.length} patterns tracked. <a href="#/data">Your data</a>`;
initTheme();
initScene();
route();
