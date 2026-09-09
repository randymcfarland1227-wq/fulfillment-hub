/* =====================================================================
 *  Fulfillment & Meaning — app
 *  Static, no build step. Reads DATA from js/data.js, keeps your own
 *  answer drafts in localStorage under fh.draft.<promptId>.
 * ===================================================================== */
'use strict';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const DOC = DATA.doc;
const TX  = DATA.transcript;

const STATUS_LABEL = { answered:'Answered', partial:'In progress', unanswered:'Not started', drafted:'Drafted by me' };
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ------------------------------------------------------------------ index */
const BOOK_BY_ID     = {};
const BOOK_BY_LETTER = {};
const PROMPTS        = [];
const PROMPT_BY_ID   = {};
const EV_BY_ID       = {};

DOC.books.forEach(b => {
  BOOK_BY_ID[b.id] = b;
  BOOK_BY_LETTER[b.letter] = b;
  b.modules.forEach(m => {
    m.book = b;
    m.items.forEach(it => {
      it.module = m; it.book = b;
      if (it.kind === 'prompt') { PROMPTS.push(it); PROMPT_BY_ID[it.id] = it; }
    });
  });
});
DOC.evidence.forEach(e => { EV_BY_ID[e.id] = e; });

/* --------------------------------------------------------------- drafts */
const Drafts = {
  key: id => 'fh.draft.' + id,
  get(id) { try { return JSON.parse(localStorage.getItem(this.key(id))) || null; } catch { return null; } },
  text(id) { const d = this.get(id); return d && d.text ? d.text : ''; },
  set(id, text) {
    try {
      if (text && text.trim()) localStorage.setItem(this.key(id), JSON.stringify({ text, at: new Date().toISOString() }));
      else localStorage.removeItem(this.key(id));
    } catch (e) { /* private mode — the page still works, it just won't remember */ }
  },
  all() {
    const out = [];
    PROMPTS.forEach(p => { const t = this.text(p.id); if (t) out.push({ prompt: p, text: t, at: (this.get(p.id) || {}).at }); });
    return out;
  }
};

const effStatus = p => { const d = Drafts.get(p.id); return d?.complete ? 'answered' : d?.text ? 'drafted' : p.status; };
const isOpenQ   = p => effStatus(p) !== 'answered';

function tally(list) {
  const t = { answered:0, partial:0, unanswered:0, drafted:0, total:list.length };
  list.forEach(p => t[effStatus(p)]++);
  t.done = t.answered;
  t.started = t.done + t.partial + t.drafted;
  return t;
}

/* ================================================================ SCENE */
function seeded(seed) { let s = seed; return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; }

function building(r, x, w, h, base, fill, litChance) {
  const y = base - h;
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${fill}"/>`;
  const cols = Math.max(1, Math.floor(w / 11));
  const rows = Math.max(1, Math.floor(h / 15));
  for (let c = 0; c < cols; c++) {
    for (let ro = 0; ro < rows; ro++) {
      if (r() > litChance) continue;
      const wx = x + 5 + c * 11, wy = y + 8 + ro * 15;
      if (wy > base - 8) continue;
      // Only a handful of windows flicker: hundreds of live CSS animations over a
      // blurred fixed layer will stall the compositor and blank the page.
      const live = r() < 0.11;
      s += `<rect${live ? ' class="win"' : ''} x="${wx}" y="${wy}" width="4" height="6" rx="1" fill="var(--win)" `
         + `style="${live ? `animation-delay:${(r() * 12).toFixed(1)}s;` : ''}opacity:${(0.3 + r() * 0.6).toFixed(2)}"/>`;
    }
  }
  return s;
}

function conifer(x, w, h, base, fill) {
  const half = w / 2, tiers = 3;
  let d = '';
  for (let i = 0; i < tiers; i++) {
    const ty = base - h + (h / (tiers + 1)) * i;
    const tw = half * (1 - i * 0.22);
    const by = base - (h / (tiers + 1)) * (tiers - 1 - i) * 0.62;
    d += `M${x} ${ty} L${x + tw} ${by} L${x - tw} ${by} Z `;
  }
  return `<path d="${d}" fill="${fill}"/><rect x="${x - 1.6}" y="${base - h * 0.16}" width="3.2" height="${h * 0.16}" fill="${fill}"/>`;
}

function buildLayer(el, opts) {
  const r = seeded(opts.seed);
  const W = 1200, H = opts.h, base = H;
  let s = '';
  let x = -20;
  while (x < W + 20) {
    const isTree = r() < opts.treeMix;
    if (isTree) {
      const w = opts.treeW * (0.7 + r() * 0.7), h = opts.treeH * (0.65 + r() * 0.75);
      s += conifer(x + w / 2, w, h, base, opts.tree);
      x += w * 0.62;
    } else {
      const w = opts.bW * (0.6 + r() * 0.9), h = opts.bH * (0.45 + r() * 0.95);
      s += building(r, x, w, h, base, opts.bldg, opts.lit);
      x += w + 3 + r() * 10;
    }
  }
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax meet">${s}</svg>`;
}

function initScene() {
  buildLayer($('.scene-far'), { seed:8231, h:212, treeMix:.22, treeW:34, treeH:70,  bW:46, bH:158, lit:.26, tree:'var(--tree-2)', bldg:'var(--bldg)' });
  buildLayer($('.scene-mid'), { seed:5117, h:244, treeMix:.46, treeW:48, treeH:106, bW:54, bH:130, lit:.19, tree:'var(--tree)',   bldg:'color-mix(in srgb,var(--bldg) 74%, #000)' });
  buildLayer($('.scene-near'),{ seed:9043, h:276, treeMix:.88, treeW:68, treeH:154, bW:62, bH:98,  lit:.11, tree:'var(--tree-2)', bldg:'var(--tree)' });

  const c = $('#motes'), ctx = c.getContext('2d');
  let motes = [], raf = 0;
  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    c.width = innerWidth * dpr; c.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    motes = Array.from({ length: Math.round(innerWidth / 26) }, () => ({
      x: Math.random() * innerWidth, y: Math.random() * innerHeight,
      r: 0.6 + Math.random() * 1.7, a: 0.15 + Math.random() * 0.5,
      vx: (Math.random() - .5) * 0.16, vy: -0.05 - Math.random() * 0.18,
      p: Math.random() * Math.PI * 2
    }));
  }
  function frame(t) {
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const m of motes) {
      m.x += m.vx; m.y += m.vy; m.p += 0.012;
      if (m.y < -10) { m.y = innerHeight + 10; m.x = Math.random() * innerWidth; }
      if (m.x < -10) m.x = innerWidth + 10; if (m.x > innerWidth + 10) m.x = -10;
      const a = m.a * (0.55 + 0.45 * Math.sin(m.p));
      ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, 7);
      ctx.fillStyle = `rgba(240,210,160,${a.toFixed(3)})`; ctx.fill();
    }
    raf = requestAnimationFrame(frame);
  }
  size(); addEventListener('resize', size);
  if (!REDUCED) raf = requestAnimationFrame(frame);

  if (!REDUCED) {
    const far = $('.scene-far'), mid = $('.scene-mid'), near = $('.scene-near'), glow = $('.scene-glow');
    let ticking = false;
    addEventListener('scroll', () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const y = scrollY;
        far.style.transform  = `translate3d(0,${(y * 0.030).toFixed(1)}px,0)`;
        mid.style.transform  = `translate3d(0,${(y * 0.016).toFixed(1)}px,0)`;
        near.style.transform = `translate3d(0,${(-y * 0.010).toFixed(1)}px,0)`;
        glow.style.opacity   = Math.max(0.25, 1 - y / 1400).toFixed(2);
        ticking = false;
      });
    }, { passive: true });
  }
}

/* ================================================================ THEME */
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  $('#themeBtn').innerHTML = `<svg viewBox="0 0 24 24"><use href="#i-${t === 'dusk' ? 'sun' : 'moon'}"/></svg>`;
  try { localStorage.setItem('fh.theme', t); } catch {}
}
function initTheme() {
  let t;
  try { t = localStorage.getItem('fh.theme'); } catch {}
  if (!t) t = matchMedia('(prefers-color-scheme: light)').matches ? 'dawn' : 'dusk';
  applyTheme(t);
  $('#themeBtn').addEventListener('click', () =>
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dusk' ? 'dawn' : 'dusk'));
}

/* =============================================================== PIECES */
const statusPill = s => `<span class="status ${s}">${STATUS_LABEL[s]}</span>`;

function evRow(ids, label = 'In my own words') {
  if (!ids || !ids.length) return '';
  return `<div class="ev-row"><span class="ev-label">${label}</span>`
    + ids.map(id => `<button class="ev-chip" data-ev="${esc(id)}">${esc(id)}</button>`).join('')
    + `</div>`;
}

function stackBar(t) {
  const pct = n => (t.total ? (n / t.total) * 100 : 0);
  return `<div class="stack-bar">
    <i style="width:${pct(t.answered)}%;background:var(--ok)"></i>
    <i style="width:${pct(t.drafted)}%;background:var(--draft)"></i>
    <i style="width:${pct(t.partial)}%;background:var(--mid)"></i>
    <i style="width:${pct(t.unanswered)}%;background:var(--none)"></i>
  </div>`;
}

function ring(t, accent) {
  const R = 33, C = 2 * Math.PI * R;
  const done = t.total ? t.done / t.total : 0;
  const started = t.total ? t.started / t.total : 0;
  return `<div class="ring" style="--accent:${accent}">
    <svg viewBox="0 0 78 78">
      <circle class="track" cx="39" cy="39" r="${R}" stroke-width="7"/>
      <circle class="arc2"  cx="39" cy="39" r="${R}" stroke-width="7"
        stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - started)}"/>
      <circle class="arc"   cx="39" cy="39" r="${R}" stroke-width="7"
        stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - done)}"/>
    </svg>
    <div class="ring-num">${Math.round(done * 100)}%</div>
  </div>`;
}

const accentOf = book => `var(--${book.id === 'life' ? 'life' : book.id === 'relationships' ? 'rel' : 'loc'})`;

/* ------------------------------------------------------------- composer */
function composer(p) {
  const t = Drafts.text(p.id);
  return `<div class="composer" data-composer="${esc(p.id)}">
    <label>${p.status === 'unanswered' ? 'Write your answer' : 'Extend this answer'}</label>
    <textarea placeholder="${p.status === 'unanswered'
      ? 'Nothing here yet — this is the invitation, not a verdict.'
      : 'What the answer above is still missing…'}">${esc(t)}</textarea>
    <div class="composer-row">
      <button class="btn btn-primary" data-save="${esc(p.id)}">Save</button>
      ${t ? `<button class="btn btn-ghost" data-clear="${esc(p.id)}">Clear</button>` : ''}
      <span class="saved-note">Saved to this browser</span>
    </div>
  </div>`;
}

function promptCard(p, opts = {}) {
  const st = effStatus(p);
  return `<article class="prompt${opts.open ? ' open' : ''}" id="p-${esc(p.id)}" style="--accent:${accentOf(p.book)}">
    <button class="prompt-head" data-toggle="prompt">
      <span class="prompt-id">${esc(p.id)}</span>
      <span class="prompt-text">${esc(p.prompt)}</span>
      ${statusPill(st)}
      <span class="prompt-caret"><svg viewBox="0 0 24 24"><use href="#i-arrow"/></svg></span>
    </button>
    ${opts.open ? promptCardBody(p) : ''}
  </article>`;
}

function inventoryCard(it) {
  return `<div class="inventory">
    <h4>${esc(it.title)}</h4>
    <p class="small muted">${it.body.map(esc).join(' ')}</p>
    ${it.fields.length ? `<div class="field-list">${it.fields.map(f => `<span>${esc(f)}</span>`).join('')}</div>` : ''}
    ${evRow(it.evidence)}
  </div>`;
}

/* ================================================================ VIEWS */
const V = {};

/* ------------------------------------------------------------- horizon */
V.horizon = () => {
  const all = tally(PROMPTS);
  const anchors = DOC.anchors;
  const anchor = anchors[Math.floor(Math.random() * anchors.length)];
  const open = PROMPTS.filter(isOpenQ);
  const tonight = open[Math.floor(Math.random() * open.length)];

  return `<section class="view">
    <div class="hero">
      <span class="eyebrow">Randy McFarland · discovery hub</span>
      <h1>The life, the people, and the place.</h1>
      <p class="hero-lede">${esc(DOC.intro[0])}</p>
      <blockquote class="hero-quote" id="anchorQuote">
        “${esc(anchor.text)}”
        <span>anchor phrase · <button class="ev-chip" data-ev="${esc(anchor.evidence[0] || '')}">${esc(anchor.evidence[0] || '')}</button></span>
      </blockquote>
    </div>

    <div class="section">
      <div class="section-head">
        <h2>Where the work stands</h2>
        <p class="small muted">The solid arc is answered in substance; the faint arc reaches everything already in progress —
          a real answer that is only missing a specific detail. Grey is not started yet.</p>
      </div>
      <div class="rings">
        ${DOC.books.map(b => {
          const t = tally(b.modules.flatMap(m => m.items.filter(i => i.kind === 'prompt')));
          return `<a class="card card-lift ring-card" href="#/paths/${b.id}" style="--accent:${accentOf(b)}">
            ${ring(t, accentOf(b))}
            <div>
              <h3>${esc(b.title)}</h3>
              <div class="ring-sub">${t.answered} answered · ${t.partial} in progress</div>
              <div class="ring-legend">
                <span><i style="background:var(--ok)"></i>${t.answered}</span>
                ${t.drafted ? `<span><i style="background:var(--draft)"></i>${t.drafted}</span>` : ''}
                <span><i style="background:var(--mid)"></i>${t.partial}</span>
                <span><i style="background:var(--none)"></i>${t.unanswered}</span>
              </div>
            </div>
          </a>`;
        }).join('')}
      </div>
    </div>

    <div class="section two-col">
      <div class="card">
        <span class="eyebrow">One question tonight</span>
        ${tonight ? `
          <h2 style="margin-bottom:10px">${esc(tonight.prompt)}</h2>
          <div class="chips" style="margin-bottom:8px">${statusPill(tonight.status)}</div>
          <p class="small muted">${esc(tonight.book.title)} · ${esc(tonight.module.label)} · ${esc(tonight.id)}</p>
          <div class="composer-row" style="margin-top:16px">
            <a class="btn btn-primary" href="#/paths/${tonight.book.id}/${tonight.module.num}/${tonight.id}">Answer it</a>
            <button class="btn btn-ghost" id="rerollBtn">Show me another</button>
          </div>` : `<p class="muted">Every prompt has an answer or a draft. That is the whole workbook.</p>`}
      </div>
      <div class="card">
        <span class="eyebrow">All prompt rows</span>
        <div class="progress-strip">
          <span class="big">${all.started}<span class="faint" style="font-size:18px">/${all.total}</span></span>
          <span class="small muted">already have an answer on the page</span>
        </div>
        ${stackBar(all)}
        <p class="small muted" style="margin-top:12px">
          ${all.answered} answered in substance · ${all.partial} in progress · ${all.unanswered} not started${all.drafted ? ` · ${all.drafted} drafted here` : ''}.
        </p>
        <div class="composer-row"><a class="btn" href="#/open">Open the queue</a></div>
      </div>
    </div>

    <div class="section">
      <div class="section-head">
        <h2>North star</h2>
        <p class="small muted">${esc((DOC.northStar[0] && DOC.northStar[0].note) || 'Working statements assembled from the evidence — editable, not commitments.')}</p>
      </div>
      <div class="path-grid">
        ${DOC.northStar.map((n, i) => `<div class="card card-lift" style="--accent:${[ 'var(--life)','var(--rel)','var(--loc)','var(--gold)' ][i % 4]}">
          <span class="eyebrow">${esc(n.title)}</span>
          <p style="font-family:'Fraunces',serif;font-size:16.5px;line-height:1.5">${n.body.map(esc).join(' ')}</p>
          ${evRow(n.evidence)}
        </div>`).join('')}
      </div>
    </div>

    <div class="section">
      <div class="section-head"><h2>Start anywhere</h2></div>
      <div class="path-grid">
        ${[
          ['#/paths','🌲','The Three Paths','Every prompt from the three workbooks, grouped the way they were asked.'],
          ['#/threads','✨','Threads','The patterns that repeat, the statements they add up to, and the tensions that stay unresolved.'],
          ['#/evidence','🕯️','Evidence','Sixty-one passages in your own words — the source under every conclusion.'],
          ['#/conversation','🎙️','Conversation','The full discovery interview, question by question.'],
        ].map(([href, icon, title, blurb]) => `<a class="card card-lift path-card" href="${href}" style="--accent:var(--gold)">
          <div class="path-icon">${icon}</div>
          <h2>${title}</h2>
          <p class="small muted">${blurb}</p>
        </a>`).join('')}
      </div>
    </div>

    <div class="section">
      <details class="card">
        <summary style="cursor:pointer;font-family:'Fraunces',serif;font-size:17px">How this document reads itself</summary>
        <div style="margin-top:14px" class="muted small">${DOC.howto.map(p => `<p>${esc(p)}</p>`).join('')}</div>
      </details>
    </div>
  </section>`;
};

/* --------------------------------------------------------------- paths */
V.paths = (bookId, modNum, focusId) => {
  if (!bookId) {
    return `<section class="view">
      <div class="hero">
        <span class="eyebrow">The three paths</span>
        <h1>Three workbooks, one question each.</h1>
        <p class="hero-lede">${esc(DOC.intro[1])}</p>
      </div>
      <div class="section path-grid">
        ${DOC.books.map(b => {
          const t = tally(b.modules.flatMap(m => m.items.filter(i => i.kind === 'prompt')));
          return `<a class="card card-lift path-card" href="#/paths/${b.id}" style="--accent:${accentOf(b)}">
            <div class="path-icon">${b.icon}</div>
            <h2>${esc(b.title)}</h2>
            <p class="path-q">${esc(b.tag)}</p>
            <div class="path-meta"><b>${t.answered}</b><span>of ${t.total} answered · ${t.partial} in progress · ${b.modules.length} sections</span></div>
            ${stackBar(t)}
          </a>`;
        }).join('')}
      </div>
    </section>`;
  }

  const book = BOOK_BY_ID[bookId];
  if (!book) return V.paths();
  const mod = modNum ? book.modules.find(m => m.num === modNum) : null;
  const accent = accentOf(book);

  const grove = `<div class="grove">
    ${book.modules.map(m => {
      const t = tally(m.items.filter(i => i.kind === 'prompt'));
      return `<a class="module${mod === m ? ' active' : ''}" href="#/paths/${book.id}/${m.num}" style="--accent:${accent}">
        <div class="module-num">${esc(m.num)}</div>
        <h3>${esc(m.title)}</h3>
        ${stackBar(t)}
        <div class="module-counts">
          <span><b>${t.done}</b> answered</span><span><b>${t.partial}</b> in progress</span><span><b>${t.unanswered}</b> not started</span>
        </div>
      </a>`;
    }).join('')}
  </div>`;

  let detail = '';
  if (mod) {
    detail = `<div class="section" id="moduleDetail" style="--accent:${accent}">
      <div class="section-head">
        <div>
          <span class="eyebrow">${esc(book.title)} · section ${esc(mod.num)}</span>
          <h2>${esc(mod.title)}</h2>
        </div>
      </div>
      ${mod.items.map(it => it.kind === 'prompt'
        ? promptCard(it, { open: focusId === it.id })
        : inventoryCard(it)).join('')}
    </div>`;
  }

  return `<section class="view" style="--accent:${accent}">
    <button class="back-link" onclick="location.hash='#/paths'"><svg viewBox="0 0 24 24"><use href="#i-arrow"/></svg>All three paths</button>
    <div class="hero" style="padding-top:6px">
      <span class="eyebrow">${book.icon} workbook</span>
      <h1>${esc(book.title)}</h1>
      <p class="hero-lede">${esc(book.tag)}</p>
    </div>
    <div class="section">
      <div class="section-head"><h2>Sections</h2><p class="small muted">Pick one to open its prompts.</p></div>
      ${grove}
    </div>
    ${detail}
  </section>`;
};

/* ------------------------------------------------------------- threads */
V.threads = () => `<section class="view">
  <div class="hero">
    <span class="eyebrow">Threads</span>
    <h1>What keeps coming back.</h1>
    <p class="hero-lede">Twelve patterns that repeat across all three workbooks, the statements they add up to, and the tensions that are still genuinely two-sided.</p>
  </div>

  <div class="section">
    <div class="section-head"><h2>Constellation</h2><p class="small muted">Tap a light to read the pattern.</p></div>
    <div class="constellation" id="constellation"><svg id="conLinks"></svg></div>
  </div>

  <div class="section">
    <div class="section-head"><h2>Recurring themes</h2></div>
    <div class="theme-list">
      ${DOC.themes.map((t, i) => `<div class="card card-lift" id="theme-${i}" style="--accent:var(--gold)">
        <h3>${esc(t.title)}</h3>
        <p class="muted" style="margin-top:8px">${t.body.map(esc).join(' ')}</p>
        ${evRow(t.evidence)}
      </div>`).join('')}
    </div>
  </div>

  <div class="section">
    <div class="section-head">
      <h2>Core contradictions</h2>
      <p class="small muted">Neither side is the mistake. These are the trade-offs a decision has to hold, not errors to resolve.</p>
    </div>
    <div class="theme-list">
      ${DOC.tensions.map(t => `<div class="tension">
        <div class="tension-head"><h3>${esc(t.title)}</h3></div>
        <div class="tension-body">${t.body.map(esc).join(' ')}${evRow(t.evidence)}</div>
        <div class="tension-scale"><em>one truth</em><i></i><em>the other</em></div>
      </div>`).join('')}
    </div>
  </div>

  <div class="section">
    <div class="section-head"><h2>Anchor phrases</h2><p class="small muted">Said out loud, kept exactly.</p></div>
    <div class="anchor-wall">
      ${DOC.anchors.map(a => `<div class="anchor" data-ev="${esc(a.evidence[0] || '')}">
        <span class="q">“</span>${esc(a.text)}
      </div>`).join('')}
    </div>
  </div>
</section>`;

/* ------------------------------------------------------------ evidence */
V.evidence = (evId) => {
  if (evId && EV_BY_ID[evId]) setTimeout(() => openDrawer(evId), 60);
  return `<section class="view">
    <div class="hero">
      <span class="eyebrow">Evidence library</span>
      <h1>Sixty-one passages, unedited.</h1>
      <p class="hero-lede">${esc(DOC.evidenceNote[0] || '')}</p>
    </div>
    <div class="section">
      <div class="filters">
        <div class="search-inline">
          <svg viewBox="0 0 24 24"><use href="#i-search"/></svg>
          <input id="evSearch" type="search" placeholder="Search the passages…" autocomplete="off">
        </div>
        <span class="chip chip-static" id="evCount">${DOC.evidence.length} passages</span>
      </div>
      <div class="ev-grid" id="evGrid">
        ${DOC.evidence.map(e => `<button class="ev-card" data-ev="${esc(e.id)}">
          <div class="ev-id">${esc(e.id)}</div>
          <h3>${esc(e.title)}</h3>
          <p>${esc(e.mapped.length)} prompts · ${esc((e.body.join(' ')).slice(0, 96))}…</p>
        </button>`).join('')}
      </div>
    </div>
    <div class="section">
      <div class="card">
        <span class="eyebrow">Kept on purpose</span>
        ${DOC.evidenceNote.slice(1).map(p => `<p class="small muted">${esc(p)}</p>`).join('')}
      </div>
    </div>
  </section>`;
};

/* -------------------------------------------------------- conversation */
V.conversation = (secIdx) => {
  const idx = Math.max(0, Math.min(TX.sections.length - 1, parseInt(secIdx, 10) || 0));
  const sec = TX.sections[idx];
  return `<section class="view">
    <div class="hero">
      <span class="eyebrow">The conversation</span>
      <h1>Sixty-six questions, answered out loud.</h1>
      <p class="hero-lede">${esc(TX.note[0] || '')}</p>
    </div>
    <div class="section">
      <div class="rail">
        ${TX.sections.map((s, i) => `<button data-sec="${i}" class="${i === idx ? 'active' : ''}">${esc(s.title)}</button>`).join('')}
      </div>
      ${sec.entries.map((e, i) => `<article class="qa${i === 0 ? ' open' : ''}">
        <button class="qa-head" data-toggle="qa">
          <span class="qa-n">${esc(String(e.n).padStart(2, '0'))}</span>
          <span class="qa-q">${esc(e.question)}</span>
          <span class="prompt-caret"><svg viewBox="0 0 24 24"><use href="#i-arrow"/></svg></span>
        </button>
        <div class="qa-body"${i === 0 ? '' : ' hidden'}>${e.answer.map(p => `<p>${esc(p)}</p>`).join('')}</div>
      </article>`).join('')}
    </div>
  </section>`;
};

/* ------------------------------------------------------------ open Qs  */
const openState = { book:'all', status:'all', q:'' };

function openList() {
  let list = PROMPTS.filter(isOpenQ);
  if (openState.book !== 'all')   list = list.filter(p => p.book.id === openState.book);
  if (openState.status !== 'all') list = list.filter(p => p.status === openState.status);
  if (openState.q) {
    const q = openState.q.toLowerCase();
    list = list.filter(p => (p.id + ' ' + p.prompt + ' ' + p.answer + ' ' + p.module.label).toLowerCase().includes(q));
  }
  if (!list.length) return `<p class="empty">Nothing open here. Try another filter.</p>`;

  const groups = [];
  list.forEach(p => {
    const key = p.book.id + '/' + p.module.num;
    let g = groups.find(x => x.key === key);
    if (!g) { groups.push(g = { key, book:p.book, mod:p.module, items:[] }); }
    g.items.push(p);
  });
  return groups.map(g => `<div class="section" style="--accent:${accentOf(g.book)};margin-top:26px">
    <div class="section-head" style="margin-bottom:10px">
      <div>
        <span class="eyebrow">${esc(g.book.title)}</span>
        <h3>${esc(g.mod.label)}</h3>
        <span class="small faint">${(() => {
          const ip = g.items.filter(x => x.status === 'partial').length;
          const ns = g.items.length - ip;
          return [ip ? ip + ' in progress' : '', ns ? ns + ' not started' : ''].filter(Boolean).join(' · ');
        })()}</span>
      </div>
    </div>
    ${g.items.map(p => promptCard(p)).join('')}
  </div>`).join('');
}

V.open = () => {
  const drafts = Drafts.all();
  const t = tally(PROMPTS);
  return `<section class="view">
    <div class="hero">
      <span class="eyebrow">Open questions</span>
      <h1>The invitation, not the verdict.</h1>
      <p class="hero-lede">${esc(DOC.queueNote[0] || '')} <strong>In progress</strong> means the answer above should be extended,
        not rewritten. <strong>Not started</strong> means a new response is still needed. Anything you write here is saved in this
        browser and marked as your draft.</p>
    </div>

    <div class="section path-grid">
      <div class="card" style="--accent:var(--mid)">
        <span class="eyebrow">In progress</span>
        <div class="progress-strip"><span class="big" style="color:var(--mid)">${t.partial}</span></div>
        <p class="small muted">Real answers already on the page. Each one is missing a specific detail —
          a choice, a ranking, a frequency, a boundary, or an experiment.</p>
      </div>
      <div class="card" style="--accent:var(--none)">
        <span class="eyebrow">Not started</span>
        <div class="progress-strip"><span class="big" style="color:var(--none)">${t.unanswered}</span></div>
        <p class="small muted">No substantive answer located yet. Each one says exactly what it is waiting for.</p>
      </div>
      <div class="card" style="--accent:var(--draft)">
        <span class="eyebrow">Your drafts</span>
        <div class="progress-strip"><span class="big" style="color:var(--draft)">${drafts.length}</span>
          <span class="small muted">saved in this browser</span></div>
        <div class="composer-row">
          <button class="btn" id="exportBtn"${drafts.length ? '' : ' disabled style="opacity:.45"'}>Export as Markdown</button>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="filters">
        <div class="search-inline">
          <svg viewBox="0 0 24 24"><use href="#i-search"/></svg>
          <input id="openSearch" type="search" placeholder="Filter open prompts…" value="${esc(openState.q)}" autocomplete="off">
        </div>
        ${[['all','All three'], ...DOC.books.map(b => [b.id, b.title])].map(([v, l]) =>
          `<button class="chip${openState.book === v ? ' chip-on' : ''}" data-fbook="${v}"
            style="${openState.book === v ? 'border-color:var(--gold);color:var(--text)' : ''}">${esc(l)}</button>`).join('')}
        ${[['all','Both states'],['partial','In progress'],['unanswered','Not started']].map(([v, l]) =>
          `<button class="chip" data-fstatus="${v}"
            style="${openState.status === v ? 'border-color:var(--gold);color:var(--text)' : ''}">${esc(l)}</button>`).join('')}
      </div>
      <div id="openResults">${openList()}</div>
    </div>

    <div class="section">
      <div class="section-head"><h2>Deliberately left open</h2>
        <p class="small muted">Material the conversation set aside on purpose. Nothing has been invented to fill these.</p></div>
      <div class="theme-list">
        ${DOC.deferred.map(d => `<div class="card"><p class="muted">${esc(d.text)}</p>${evRow(d.evidence)}</div>`).join('')}
      </div>
    </div>

    <div class="section">
      <div class="section-head"><h2>Supporting fields still to complete</h2>
        <p class="small muted">The structured tables inside the workbooks — ratings, frequencies, costs, dates — that no entry was supplied for.</p></div>
      <div class="theme-list">
        ${DOC.supporting.map(s => {
          const [head, ...rest] = s.split(':');
          return `<div class="card"><span class="eyebrow">${esc(head)}</span><p class="muted small">${esc(rest.join(':').trim())}</p></div>`;
        }).join('')}
      </div>
    </div>
  </section>`;
};

/* =============================================================== DRAWER */
function openDrawer(evId) {
  const e = EV_BY_ID[evId];
  if (!e) return;
  $('#drawerEyebrow').textContent = `${e.id} · ${e.source}`;
  $('#drawerTitle').textContent = e.title;
  $('#drawerBody').innerHTML =
    e.body.map(p => `<p class="passage">${esc(p)}</p>`).join('')
    + (e.mapped.length ? `<div class="ev-row"><span class="ev-label">Answers it supports</span>${
        e.mapped.map(id => `<button class="ev-chip" data-goto="${esc(id)}">${esc(id)}</button>`).join('')}</div>` : '');
  $('#drawer').hidden = false;
  $('#drawerScrim').hidden = false;
  $('#drawerBody').scrollTop = 0;
  document.body.style.overflow = 'hidden';
}
function closeDrawer() {
  $('#drawer').hidden = true;
  $('#drawerScrim').hidden = true;
  document.body.style.overflow = '';
}

function gotoPrompt(id) {
  const p = PROMPT_BY_ID[id];
  if (!p) return;
  closeDrawer();
  closePalette();
  location.hash = `#/paths/${p.book.id}/${p.module.num}/${p.id}`;
}

/* ============================================================== PALETTE */
let paletteIndex = [];
function buildPaletteIndex() {
  paletteIndex = [];
  PROMPTS.forEach(p => paletteIndex.push({
    kind:'Prompt', tag:p.id, main:p.prompt, sub:p.answer || 'Not answered yet',
    hay:(p.id + ' ' + p.prompt + ' ' + p.answer + ' ' + p.module.label + ' ' + p.book.title).toLowerCase(),
    go:() => gotoPrompt(p.id)
  }));
  DOC.evidence.forEach(e => paletteIndex.push({
    kind:'Evidence', tag:e.id, main:e.title, sub:e.body[0] || '',
    hay:(e.id + ' ' + e.title + ' ' + e.body.join(' ')).toLowerCase(),
    go:() => { closePalette(); openDrawer(e.id); }
  }));
  TX.sections.forEach((s, i) => s.entries.forEach(en => paletteIndex.push({
    kind:'Conversation', tag:'Q' + en.n, main:en.question, sub:en.answer[0] || '',
    hay:(en.question + ' ' + en.answer.join(' ')).toLowerCase(),
    go:() => { closePalette(); location.hash = `#/conversation/${i}`; }
  })));
  DOC.themes.forEach((t, i) => paletteIndex.push({
    kind:'Theme', tag:'★', main:t.title, sub:t.body.join(' '),
    hay:(t.title + ' ' + t.body.join(' ')).toLowerCase(),
    go:() => { closePalette(); location.hash = '#/threads'; setTimeout(() => $('#theme-' + i)?.scrollIntoView({ block:'center' }), 120); }
  }));
}

function hl(text, q) {
  const s = esc(String(text).slice(0, 200));
  if (!q) return s;
  const i = s.toLowerCase().indexOf(q);
  if (i < 0) return s;
  return s.slice(0, i) + '<mark>' + s.slice(i, i + q.length) + '</mark>' + s.slice(i + q.length);
}

function renderPalette(q) {
  const box = $('#paletteResults');
  const query = q.trim().toLowerCase();
  if (!query) {
    box.innerHTML = `<div class="empty" style="padding:28px">Search 376 prompts, 61 passages and the whole interview.</div>`;
    return;
  }
  const hits = paletteIndex.filter(x => x.hay.includes(query)).slice(0, 40);
  paletteHits = hits;
  box.innerHTML = hits.length ? hits.map((x, i) => `<button class="pres${i === 0 ? ' sel' : ''}" data-pi="${i}">
      <div class="pres-top"><b>${esc(x.tag)}</b> ${esc(x.kind)}</div>
      <div class="pres-main">${hl(x.main, query)}</div>
      <div class="pres-sub">${hl(x.sub, query)}</div>
    </button>`).join('') : `<div class="empty" style="padding:28px">Nothing matched “${esc(q)}”.</div>`;
}
let paletteHits = [];

function openPalette() {
  $('#paletteScrim').hidden = false;
  renderPalette('');
  const inp = $('#paletteInput'); inp.value = ''; setTimeout(() => inp.focus(), 20);
  document.body.style.overflow = 'hidden';
}
function closePalette() {
  $('#paletteScrim').hidden = true;
  document.body.style.overflow = '';
}

/* =============================================================== ROUTER */
function route() {
  const parts = (location.hash.replace(/^#\/?/, '') || 'horizon').split('/').filter(Boolean);
  const view = parts[0];
  const main = $('#main');

  let html;
  switch (view) {
    case 'paths':        html = V.paths(parts[1], parts[2], parts[3]); break;
    case 'threads':      html = V.threads(); break;
    case 'evidence':     html = V.evidence(parts[1]); break;
    case 'conversation': html = V.conversation(parts[1]); break;
    case 'open':         html = V.open(); break;
    default:             html = V.horizon();
  }
  main.innerHTML = html;
  $$('#nav a').forEach(a => a.classList.toggle('active', a.dataset.view === (V[view] ? view : 'horizon')));

  if (view === 'threads') drawConstellation();

  if (parts[0] === 'paths' && parts[3]) {
    setTimeout(() => {
      const el = $('#p-' + CSS.escape(parts[3]));
      if (el) { el.scrollIntoView({ block:'center', behavior: REDUCED ? 'auto' : 'smooth' }); el.querySelector('textarea')?.focus({ preventScroll:true }); }
    }, 90);
  } else if (parts[0] === 'paths' && parts[2]) {
    setTimeout(() => $('#moduleDetail')?.scrollIntoView({ block:'start', behavior: REDUCED ? 'auto' : 'smooth' }), 90);
  } else {
    scrollTo({ top:0, behavior:'auto' });
  }
}

/* ------------------------------------------------------- constellation */
function drawConstellation() {
  const host = $('#constellation');
  if (!host) return;
  const svg = $('#conLinks');
  const W = host.clientWidth, H = host.clientHeight;
  const r = seeded(4242);
  const pts = DOC.themes.map((t, i) => {
    const cols = 4, row = Math.floor(i / cols), col = i % cols;
    const x = ((col + 0.5) / cols) * W + (r() - .5) * (W / cols) * 0.36;
    const y = ((row + 0.5) / Math.ceil(DOC.themes.length / cols)) * H + (r() - .5) * 60;
    return { t, i, x:Math.max(70, Math.min(W - 70, x)), y:Math.max(38, Math.min(H - 38, y)) };
  });
  let links = '';
  pts.forEach((p, i) => {
    const near = pts.filter(q => q !== p).sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y)).slice(0, 2);
    near.forEach(q => { if (q.i > i) links += `<line class="link" x1="${p.x}" y1="${p.y}" x2="${q.x}" y2="${q.y}"/>`; });
  });
  svg.innerHTML = links;
  host.querySelectorAll('.node').forEach(n => n.remove());
  pts.forEach(p => {
    const b = document.createElement('button');
    b.className = 'node';
    b.style.left = p.x + 'px'; b.style.top = p.y + 'px';
    b.style.animationDelay = (p.i * 0.6) + 's';
    b.innerHTML = `<span>${esc(p.t.title)}</span>`;
    b.addEventListener('click', () => {
      const card = $('#theme-' + p.i);
      card?.scrollIntoView({ block:'center', behavior: REDUCED ? 'auto' : 'smooth' });
      card?.animate([{ borderColor:'var(--gold)' }, { borderColor:'var(--line)' }], { duration:1600 });
    });
    host.appendChild(b);
  });
}

/* ================================================================ WIRE */
function exportDrafts() {
  const drafts = Drafts.all();
  if (!drafts.length) return;
  const lines = ['# Fulfillment & Meaning — my drafted answers', '',
    `_${drafts.length} draft${drafts.length === 1 ? '' : 's'}, exported ${new Date().toLocaleString()}_`, ''];
  let lastMod = '';
  drafts.forEach(d => {
    const label = `${d.prompt.book.title} · ${d.prompt.module.label}`;
    if (label !== lastMod) { lines.push('', `## ${label}`, ''); lastMod = label; }
    lines.push(`### ${d.prompt.id} — ${d.prompt.prompt}`, '');
    if (d.prompt.status !== 'unanswered') lines.push(`_Existing answer:_ ${d.prompt.answer}`, '');
    lines.push(d.text, '');
  });
  const blob = new Blob([lines.join('\n')], { type:'text/markdown' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `fulfillment-drafts-${new Date().toISOString().slice(0, 10)}.md`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

document.addEventListener('click', ev => {
  const t = ev.target;

  const evBtn = t.closest('[data-ev]');
  if (evBtn && evBtn.dataset.ev) { openDrawer(evBtn.dataset.ev); return; }

  const gotoBtn = t.closest('[data-goto]');
  if (gotoBtn) { gotoPrompt(gotoBtn.dataset.goto); return; }

  if (t.closest('#drawerClose') || t.closest('#drawerScrim')) { closeDrawer(); return; }
  if (t.closest('#searchBtn')) { openPalette(); return; }
  if (t.id === 'paletteScrim') { closePalette(); return; }

  const pres = t.closest('.pres');
  if (pres) { paletteHits[+pres.dataset.pi]?.go(); return; }

  const head = t.closest('[data-toggle="prompt"]');
  if (head) {
    const card = head.parentElement;
    const p = PROMPT_BY_ID[card.id.slice(2)];
    const open = card.classList.toggle('open');
    if (open) head.insertAdjacentHTML('afterend', promptCardBody(p));
    else card.querySelector('.prompt-body')?.remove();
    return;
  }

  const qaHead = t.closest('[data-toggle="qa"]');
  if (qaHead) {
    const card = qaHead.parentElement;
    const open = card.classList.toggle('open');
    card.querySelector('.qa-body').hidden = !open;
    return;
  }

  const save = t.closest('[data-save]');
  if (save) {
    const id = save.dataset.save;
    const wrap = save.closest('[data-composer]');
    Drafts.set(id, wrap.querySelector('textarea').value);
    const note = wrap.querySelector('.saved-note');
    note.classList.add('show'); setTimeout(() => note.classList.remove('show'), 1800);
    const card = $('#p-' + CSS.escape(id));
    if (card) {
      const pill = card.querySelector('.prompt-head .status');
      const st = effStatus(PROMPT_BY_ID[id]);
      pill.className = 'status ' + st; pill.textContent = STATUS_LABEL[st];
    }
    return;
  }

  const clear = t.closest('[data-clear]');
  if (clear) {
    const id = clear.dataset.clear;
    Drafts.set(id, '');
    const card = $('#p-' + CSS.escape(id));
    if (card) {
      card.querySelector('.prompt-body').outerHTML = promptCardBody(PROMPT_BY_ID[id]);
      const pill = card.querySelector('.prompt-head .status');
      const st = effStatus(PROMPT_BY_ID[id]);
      pill.className = 'status ' + st; pill.textContent = STATUS_LABEL[st];
    }
    return;
  }

  const sec = t.closest('[data-sec]');
  if (sec) { location.hash = `#/conversation/${sec.dataset.sec}`; return; }

  const fb = t.closest('[data-fbook]');
  if (fb) { openState.book = fb.dataset.fbook; route(); return; }
  const fs = t.closest('[data-fstatus]');
  if (fs) { openState.status = fs.dataset.fstatus; route(); return; }

  if (t.closest('#exportBtn')) { exportDrafts(); return; }

  if (t.closest('#rerollBtn')) {
    const open = PROMPTS.filter(isOpenQ);
    const p = open[Math.floor(Math.random() * open.length)];
    if (!p) return;
    const card = t.closest('.card');
    card.querySelector('h2').textContent = p.prompt;
    card.querySelector('p').textContent = `${p.book.title} · ${p.module.label} · ${p.id}`;
    card.querySelector('a.btn').href = `#/paths/${p.book.id}/${p.module.num}/${p.id}`;
    return;
  }
});

function promptCardBody(p) {
  const draft = Drafts.text(p.id);
  return `<div class="prompt-body">
      ${p.status === 'unanswered'
        ? `<span class="eyebrow">What this still needs</span>
           <p class="prompt-empty">${esc(p.answer || 'No substantive answer was located in the conversation.')}</p>`
        : `${p.status === 'partial' ? '<span class="eyebrow">Answered so far</span>' : ''}
           <p class="prompt-answer">${esc(p.answer)}</p>`}
      ${draft ? `<p class="prompt-answer" style="margin-top:12px"><strong>My draft ·</strong> ${esc(draft)}</p>` : ''}
      ${evRow(p.evidence)}
      ${composer(p)}
    </div>`;
}

document.addEventListener('input', ev => {
  if (ev.target.id === 'evSearch') {
    const q = ev.target.value.trim().toLowerCase();
    let n = 0;
    $$('#evGrid .ev-card').forEach(c => {
      const e = EV_BY_ID[c.dataset.ev];
      const hit = !q || (e.id + ' ' + e.title + ' ' + e.body.join(' ')).toLowerCase().includes(q);
      c.style.display = hit ? '' : 'none';
      if (hit) n++;
    });
    $('#evCount').textContent = `${n} passage${n === 1 ? '' : 's'}`;
  }
  if (ev.target.id === 'openSearch') {
    openState.q = ev.target.value;
    $('#openResults').innerHTML = openList();
  }
  if (ev.target.id === 'paletteInput') renderPalette(ev.target.value);
});

document.addEventListener('keydown', ev => {
  if (ev.key === 'Escape') {
    if (!$('#paletteScrim').hidden) return closePalette();
    if (!$('#drawer').hidden) return closeDrawer();
  }
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
  if ((ev.key === '/' || (ev.key === 'k' && (ev.metaKey || ev.ctrlKey))) && !typing) {
    ev.preventDefault(); openPalette(); return;
  }
  if (!$('#paletteScrim').hidden && (ev.key === 'ArrowDown' || ev.key === 'ArrowUp' || ev.key === 'Enter')) {
    const items = $$('.pres');
    if (!items.length) return;
    let i = items.findIndex(x => x.classList.contains('sel'));
    if (ev.key === 'Enter') { ev.preventDefault(); paletteHits[i < 0 ? 0 : i]?.go(); return; }
    ev.preventDefault();
    items[i]?.classList.remove('sel');
    i = ev.key === 'ArrowDown' ? Math.min(items.length - 1, i + 1) : Math.max(0, i - 1);
    items[i].classList.add('sel');
    items[i].scrollIntoView({ block:'nearest' });
  }
});

addEventListener('resize', () => { if (location.hash.startsWith('#/threads')) drawConstellation(); });
addEventListener('hashchange', route);

/* ================================================================ BOOT */
// Views, routing and boot live in js/book.js — this file is the engine.
