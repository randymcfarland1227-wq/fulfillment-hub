/* =====================================================================
 *  ENGINE
 *  Indexes the material, holds everything the user writes, and derives
 *  only what the material actually supports. No view code lives here.
 * ===================================================================== */
'use strict';

const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;

const DOC = DATA.doc;
const TX  = DATA.transcript;

/* ── index ─────────────────────────────────────────────────────────── */
const BOOK_BY_ID = {}, PROMPTS = [], PROMPT_BY_ID = {}, EV_BY_ID = {},
      MODULE_BY_KEY = {}, AREA_BY_ID = {}, AREA_OF_CHAPTER = {}, PATTERN_BY_ID = {};

DOC.books.forEach(b => {
  BOOK_BY_ID[b.id] = b;
  b.modules.forEach(m => {
    m.book = b; m.key = `${b.id}/${m.num}`;
    MODULE_BY_KEY[m.key] = m;
    m.items.forEach(it => {
      it.module = m; it.book = b;
      if (it.kind === 'prompt') { PROMPTS.push(it); PROMPT_BY_ID[it.id] = it; }
    });
  });
});
DOC.evidence.forEach(e => { EV_BY_ID[e.id] = e; });
PATTERNS.forEach(p => { PATTERN_BY_ID[p.id] = p; });

REALMS.forEach(r => r.areas.forEach(a => {
  a.realm = r; AREA_BY_ID[a.id] = a;
  a.chapters.forEach(k => { AREA_OF_CHAPTER[k] = a; });
}));
PROMPTS.forEach(p => { p.area = AREA_OF_CHAPTER[p.module.key] || null; });

/* every chapter must be placed exactly once — a silent gap would mean
   material quietly disappearing from the Life Map */
(() => {
  const placed = REALMS.flatMap(r => r.areas.flatMap(a => a.chapters));
  const missing = Object.keys(MODULE_BY_KEY).filter(k => !placed.includes(k));
  const dupes = placed.filter((k,i) => placed.indexOf(k) !== i);
  if (missing.length || dupes.length) console.warn('Life Map coverage', { missing, dupes });
})();

/* ── storage ───────────────────────────────────────────────────────── */
const Store = {
  read(k, fb = null) { try { return JSON.parse(localStorage.getItem(k)) ?? fb; } catch { return fb; } },
  write(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; }
    catch { notify?.('Could not save in this browser. Keep this page open and export a copy.'); return false; }
  },
  remove(k) { try { localStorage.removeItem(k); } catch {} },
};

/* A reflection keeps its whole history. Beliefs change; the record of
   what was believed before is never overwritten.

   `draft` is what is being typed right now. `versions` are the snapshots
   deliberately committed. Autosave only ever touches the draft, so a
   keystroke can never quietly rewrite something already committed. */
const Reflections = {
  key: id => 'fh.r.' + id,

  get(id) {
    let r = Store.read(this.key(id));
    if (!r) {                                   // migrate earlier shapes
      const old = Store.read('fh.draft.' + id);
      if (old && old.text) {
        r = { draft:'', versions:[{ text:old.text, at:old.at || new Date().toISOString() }],
              complete:!!old.complete, core:!!Store.read('fh.pin.' + id, false), changed:false, skip:null };
        Store.write(this.key(id), r);
      }
    }
    if (r && r.draft === undefined) r.draft = '';
    return r;
  },
  blank: () => ({ draft:'', versions:[], complete:false, core:false, changed:false, skip:null }),
  versions(id) { return this.get(id)?.versions || []; },
  /* what to show: the live draft if there is one, else the last commit */
  text(id) {
    const r = this.get(id);
    if (!r) return '';
    return r.draft || (r.versions.length ? r.versions.at(-1).text : '');
  },
  has(id) { const r = this.get(id); return !!(r && (r.draft.trim() || r.versions.length)); },

  autosave(id, text) {
    const r = this.get(id) || this.blank();
    if (!text.trim() && !r.versions.length && !r.draft) return r;   // nothing to record yet
    r.draft = text;
    if (text.trim()) r.skip = null;
    return Store.write(this.key(id), r) ? r : null;
  },
  /* take a snapshot — only when the wording has actually moved on */
  commit(id, { complete } = {}) {
    const r = this.get(id) || this.blank();
    const last = r.versions.at(-1);
    const text = (r.draft || last?.text || '').trim();
    if (text && text !== last?.text) r.versions.push({ text, at:new Date().toISOString() });
    if (complete !== undefined) r.complete = complete;
    r.draft = '';
    return Store.write(this.key(id), r) ? r : null;
  },
  flag(id, field, value) {
    const r = this.get(id) || this.blank();
    r[field] = value;
    return Store.write(this.key(id), r);
  },
  all() {
    return PROMPTS.map(p => ({ prompt:p, rec:this.get(p.id) }))
                  .filter(x => x.rec && (x.rec.versions.length || x.rec.draft.trim() || x.rec.skip));
  },
};

/* ── status ────────────────────────────────────────────────────────── */
const STATUS_LABEL = {
  answered:'Answered', partial:'In Progress', unanswered:'Not Started',
  drafted:'Draft Saved', unknown:"Don't Know Yet", later:'Set Aside',
};
function effStatus(p) {
  const r = Reflections.get(p.id);
  if (r?.complete) return 'answered';
  if (r && (r.versions.length || r.draft.trim())) return 'drafted';
  if (r?.skip) return r.skip;
  return p.status;
}
const isOpen = p => !['answered'].includes(effStatus(p));

function tally(list) {
  const t = { answered:0, partial:0, unanswered:0, drafted:0, unknown:0, later:0, total:list.length };
  list.forEach(p => t[effStatus(p)]++);
  t.done = t.answered;
  t.explored = t.answered + t.drafted + t.partial;
  return t;
}
/* meaningful progress language, never a completion percentage */
function depthOf(t) {
  if (!t.total) return 'Not Yet Explored';
  const r = (t.answered + t.drafted) / t.total, e = t.explored / t.total;
  if (r >= .7) return 'Deeply Explored';
  if (e >= .8 && r >= .25) return 'Developing';
  if (e >= .3) return 'Early Exploration';
  return 'Not Yet Explored';
}

/* ── searchable corpus ─────────────────────────────────────────────── */
const CORPUS = [];
PROMPTS.forEach(p => CORPUS.push({
  kind:'entry', id:p.id, prompt:p,
  title:p.prompt, area:p.area, book:p.book, module:p.module,
  get body() { return p.answer + ' ' + Reflections.text(p.id); },
}));
DOC.evidence.forEach(e => CORPUS.push({
  kind:'passage', id:e.id, evidence:e, title:e.title, body:e.body.join(' '),
}));
TX.sections.forEach((s,i) => s.entries.forEach(en => CORPUS.push({
  kind:'recording', id:'Q' + en.n, section:i, title:en.question, body:en.answer.join(' '),
})));

const norm = s => String(s).toLowerCase();
/* one word finds the way he actually says it */
function expand(query) {
  const q = norm(query).trim();
  const terms = new Set(q.split(/\s+/).filter(w => w.length > 2));
  Object.entries(CONCEPTS).forEach(([concept, syns]) => {
    if (q.includes(concept) || syns.some(s => q.includes(s))) {
      terms.add(concept); syns.forEach(s => terms.add(s));
    }
  });
  if (!terms.size && q) terms.add(q);
  return [...terms];
}
function searchCorpus(query, kinds) {
  const terms = expand(query);
  if (!terms.length) return [];
  return CORPUS
    .filter(c => !kinds || kinds.includes(c.kind))
    .map(c => {
      const hay = norm(c.title + ' ' + c.body + ' ' + c.id);
      const hits = terms.filter(t => hay.includes(t));
      return { item:c, score:hits.length + (norm(c.title).includes(norm(query)) ? 3 : 0), hits };
    })
    .filter(r => r.score > 0)
    .sort((a,b) => b.score - a.score);
}

/* ── pattern detection ─────────────────────────────────────────────── *
 * A count of where words appear. That is a detection, not a verdict —
 * every view that shows it must say so and link to the material.       */
const PATTERN_INDEX = PATTERNS.map(p => {
  const entries = [], passages = [], areas = new Set(), books = new Set();
  const hit = text => p.words.some(w => norm(text).includes(w));
  PROMPTS.forEach(x => {
    if (x.status !== 'unanswered' && hit(x.answer)) {
      entries.push(x); books.add(x.book.id);
      if (x.area) areas.add(x.area.id);
    }
  });
  DOC.evidence.forEach(e => { if (hit(e.body.join(' '))) passages.push(e); });
  /* Confidence describes spread, not truth. A need has to recur across
     many separate areas — not just be a common word — to count as strong. */
  const confidence = books.size === 3 && areas.size >= 14 && entries.length >= 45 ? 'Strong Pattern'
                   : books.size >= 2  && entries.length >= 18                     ? 'Emerging Pattern'
                   : 'Possible Pattern';
  return { ...p, entries, passages, areas:[...areas], books:[...books], confidence,
           seedPrompt: PROMPT_BY_ID[p.seed] || null };
}).sort((a,b) => b.entries.length - a.entries.length);
const PATTERN_INDEX_BY_ID = Object.fromEntries(PATTERN_INDEX.map(p => [p.id, p]));

/* ── quotes in his own words ───────────────────────────────────────── *
 * Only text that is literally inside quotation marks, plus the anchor
 * phrases. Nothing paraphrased is ever presented as a quote.           */
const QUOTES = [];
DOC.anchors.forEach(a => QUOTES.push({ text:a.text, evidence:a.evidence, source:'Anchor phrase' }));
PROMPTS.forEach(p => {
  const m = p.answer.match(/[“"]([^”"]{12,240})[”"]/g) || [];
  m.forEach(raw => QUOTES.push({
    text: raw.replace(/^[“"]|[”"]$/g,''), prompt:p, evidence:p.evidence,
    source: `${p.module.title} · ${p.id}`,
  }));
});

/* ── non-negotiable candidates ─────────────────────────────────────── */
const NON_NEGOTIABLES = NON_NEGOTIABLE_SOURCES.map(src => ({
  ...src,
  prompts: src.prompts.map(id => PROMPT_BY_ID[id]).filter(Boolean),
  evidence: src.evidence.map(id => EV_BY_ID[id]).filter(Boolean),
}));
const IMPORTANCE = ['Unrated','Essential','Strong Preference','Nice to Have','Neutral','Actively Undesirable'];
const importanceOf = key => Store.read('fh.nn.' + key, 'Unrated');

/* ── decisions ─────────────────────────────────────────────────────── */
const ALIGN = ['Unknown','Poor fit','Some fit','Good fit','Strong fit'];
const Decisions = {
  all()      { return Store.read('fh.decisions', []); },
  get(id)    { return this.all().find(d => d.id === id) || null; },
  put(d)     { const all = this.all(); const i = all.findIndex(x => x.id === d.id);
               if (i < 0) all.push(d); else all[i] = d; return Store.write('fh.decisions', all); },
  remove(id) { return Store.write('fh.decisions', this.all().filter(d => d.id !== id)); },
  criterion(cid) {
    const p = PATTERN_INDEX_BY_ID[cid];
    if (p) return { id:cid, name:p.name, prompts:[p.seed].filter(Boolean), evidence:p.passages.slice(0,3).map(e => e.id) };
    const x = EXTRA_CRITERIA[cid];
    return x ? { id:cid, name:x.name, prompts:x.prompts, evidence:x.evidence } : { id:cid, name:cid, prompts:[], evidence:[] };
  },
  /* weighted alignment, reported as a description rather than a verdict */
  score(decision, option) {
    let got = 0, possible = 0; const strong = [], weak = [], unknown = [];
    decision.criteria.forEach(cid => {
      const w = decision.weights[cid] ?? 2;
      const v = option.scores?.[cid] ?? 0;
      const name = this.criterion(cid).name;
      if (!v) { unknown.push(name); return; }
      possible += w * 4; got += w * v;
      if (v >= 3) strong.push(name); else if (v <= 2) weak.push(name);
    });
    return { pct: possible ? Math.round(got / possible * 100) : null, strong, weak, unknown };
  },
};

/* ── timeline ──────────────────────────────────────────────────────── *
 * Seeded only with periods he described himself, in his own framing.
 * No dates are invented; each links back to the passage.               */
const SEED_EVENTS = [
  { id:'seed-hs',      label:'Elected class president',            when:'High school',        evidence:['E03'] },
  { id:'seed-hista',   label:'HISTA scholarship, West Virginia',   when:'Before college',     evidence:['E03'] },
  { id:'seed-college', label:'Full ride; student body president',  when:'College',            evidence:['E01'] },
  { id:'seed-grad',    label:'Graduated; Morgantown and Xfinity',  when:'After college',      evidence:['E03'] },
  { id:'seed-move',    label:'Moved to the family house in Baltimore', when:'Two years ago, September', evidence:['E03'] },
  { id:'seed-order',   label:'Protective order',                   when:'Recently',           evidence:['E03'] },
  { id:'seed-interview',label:'This discovery conversation',       when:'8 September 2026',   evidence:[] },
];
const Events = {
  all() {
    const mine = Store.read('fh.events', []);
    return [...SEED_EVENTS.map(e => ({ ...e, seeded:true })), ...mine];
  },
  add(e)     { const m = Store.read('fh.events', []); m.push(e); return Store.write('fh.events', m); },
  remove(id) { return Store.write('fh.events', Store.read('fh.events', []).filter(e => e.id !== id)); },
};

/* ── milestones ────────────────────────────────────────────────────── *
 * Understanding reached, never quantity produced.                      */
function milestones() {
  const out = [];
  const strong = PATTERN_INDEX.filter(p => p.confidence === 'Strong Pattern');
  const cross  = PATTERN_INDEX.filter(p => p.books.length === 3);
  const written = Reflections.all().filter(x => x.rec.versions.length || x.rec.draft.trim()).length;
  const rated  = NON_NEGOTIABLES.filter(n => importanceOf(n.domain) !== 'Unrated').length;
  const defined = DEFINITIONS.filter(d => Store.read('fh.def.' + d.word)).length;
  out.push({ done:cross.length > 0,  label:'First cross-domain pattern found',
             detail:`${cross.length} needs appear in all three books.` });
  out.push({ done:strong.length >= 5, label:'Pattern Atlas taking shape',
             detail:`${strong.length} strong patterns detected.` });
  out.push({ done:written >= 1,      label:'First reflection in your own hand',
             detail:written ? `${written} written so far.` : 'Nothing written here yet.' });
  out.push({ done:rated >= 3,        label:'Non-negotiables becoming yours',
             detail:`${rated} of ${NON_NEGOTIABLES.length} domains rated.` });
  out.push({ done:defined >= 3,      label:'Your definitions are becoming clearer',
             detail:`${defined} of ${DEFINITIONS.length} words defined in your words.` });
  return out;
}

/* ── theme ─────────────────────────────────────────────────────────── */
function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  $('#themeBtn').innerHTML = `<svg viewBox="0 0 24 24"><use href="#i-${t === 'dusk' ? 'sun' : 'moon'}"/></svg>`;
  Store.write('fh.theme', t);
}
function initTheme() {
  let t = Store.read('fh.theme');
  if (!t) t = matchMedia('(prefers-color-scheme: light)').matches ? 'dawn' : 'dusk';
  applyTheme(t);
  $('#themeBtn').addEventListener('click', () =>
    applyTheme(document.documentElement.getAttribute('data-theme') === 'dusk' ? 'dawn' : 'dusk'));
}

/* ── the window ────────────────────────────────────────────────────── *
 * Still. It sets a tone; it must never compete with reading, so there
 * is no parallax, no drift, and it is removed entirely while writing.  */
function seeded(seed) { let s = seed; return () => (s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; }

function building(r, x, w, h, base, fill) {
  const y = base - h;
  let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="3" fill="${fill}"/>`;
  const cols = Math.max(1, Math.floor(w / 11)), rows = Math.max(1, Math.floor(h / 15));
  for (let c = 0; c < cols; c++) for (let ro = 0; ro < rows; ro++) {
    if (r() > 0.2) continue;
    const wx = x + 5 + c * 11, wy = y + 8 + ro * 15;
    if (wy > base - 8) continue;
    s += `<rect x="${wx}" y="${wy}" width="4" height="6" rx="1" fill="var(--win)" opacity="${(0.3 + r()*0.6).toFixed(2)}"/>`;
  }
  return s;
}
function conifer(x, w, h, base, fill) {
  const half = w/2, tiers = 3; let d = '';
  for (let i = 0; i < tiers; i++) {
    const ty = base - h + (h/(tiers+1))*i, tw = half*(1 - i*0.22);
    const by = base - (h/(tiers+1))*(tiers-1-i)*0.62;
    d += `M${x} ${ty} L${x+tw} ${by} L${x-tw} ${by} Z `;
  }
  return `<path d="${d}" fill="${fill}"/><rect x="${x-1.6}" y="${base-h*0.16}" width="3.2" height="${h*0.16}" fill="${fill}"/>`;
}
function buildLayer(el, o) {
  if (!el) return;
  const r = seeded(o.seed), W = 1200, base = o.h;
  let s = '', x = -20;
  while (x < W + 20) {
    if (r() < o.treeMix) { const w = o.treeW*(0.7+r()*0.7), h = o.treeH*(0.65+r()*0.75);
      s += conifer(x + w/2, w, h, base, o.tree); x += w*0.62; }
    else { const w = o.bW*(0.6+r()*0.9), h = o.bH*(0.45+r()*0.95);
      s += building(r, x, w, h, base, o.bldg); x += w + 3 + r()*10; }
  }
  el.innerHTML = `<svg viewBox="0 0 ${W} ${base}" preserveAspectRatio="xMidYMax meet">${s}</svg>`;
}
function initScene() {
  buildLayer($('.scene-far'), { seed:8231, h:212, treeMix:.22, treeW:34, treeH:70,  bW:46, bH:158, tree:'var(--tree-2)', bldg:'var(--bldg)' });
  buildLayer($('.scene-mid'), { seed:5117, h:244, treeMix:.46, treeW:48, treeH:106, bW:54, bH:130, tree:'var(--tree)',   bldg:'color-mix(in srgb,var(--bldg) 74%, #000)' });
  buildLayer($('.scene-near'),{ seed:9043, h:276, treeMix:.88, treeW:68, treeH:154, bW:62, bH:98,  tree:'var(--tree-2)', bldg:'var(--tree)' });
}
