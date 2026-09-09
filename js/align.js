/* =====================================================================
 *  ALIGN
 *  REFLECT discovers · UNDERSTAND organises · ALIGN compares against the
 *  life as it actually is · DESIGN chooses what to do next.
 *
 *  Nothing here overwrites the reflection system. It reads what is
 *  already there, offers candidates in his own words, and waits to be
 *  confirmed. Every statement carries its evidence.
 * ===================================================================== */
'use strict';

/* ── state ─────────────────────────────────────────────────────────── */
const Align = {
  status(areaId)          { return Store.read('fh.align.' + areaId, 'Unclear'); },
  setStatus(areaId, v)    { return Store.write('fh.align.' + areaId, v); },
  verdict(driftId)        { return Store.read('fh.drift.' + driftId, 'Unreviewed'); },
  setVerdict(driftId, v)  { return Store.write('fh.drift.' + driftId, v); },
  protectOn(id)           { return Store.read('fh.protect.' + id, true); },
  guardOn(id)             { return Store.read('fh.guard.' + id, true); },
  season()                { return Store.read('fh.season', ''); },
  heading()               { return Store.read('fh.heading', ''); },
  northStar()             { return Store.read('fh.northstar', null); },   // null = not yet confirmed
  priorities()            { return Store.read('fh.priorities', { primary:[], secondary:[], maintain:[], notNow:[] }); },
  setPriorities(p)        { return Store.write('fh.priorities', p); },
  tradeoffs()             { return Store.read('fh.tradeoffs', []); },
  setTradeoffs(t)         { return Store.write('fh.tradeoffs', t); },
  checkins()              { return Store.read('fh.checkins', []); },
};

/* ── the derived picture ───────────────────────────────────────────── */

/* North Star = the conditions that recur most across everything he said.
   Derived, shown as a draft, and never silently rewritten. */
function northStarConditions() {
  return PATTERN_INDEX
    .filter(p => p.confidence !== 'Possible Pattern')
    .slice(0, 10)
    .map(p => ({ id:p.id, name:p.name, confidence:p.confidence,
                 entries:p.entries.length, areas:p.areas.length, seed:p.seed }));
}
function northStarState() {
  const derived = northStarConditions();
  const confirmed = Align.northStar();
  if (!confirmed) return { derived, confirmed:null, changed:false };
  const now = derived.map(d => d.id).join(',');
  return { derived, confirmed, changed: confirmed.signature !== now };
}

/* A drift is a condition he described that works against a need he named.
   Confidence comes from how much material supports each side. */
const DRIFTS = CURRENT_REALITY.map(cr => {
  const needs = cr.conflicts.map(id => PATTERN_INDEX_BY_ID[id]).filter(Boolean);
  const areas = [...new Set(needs.flatMap(n => n.areas))];
  const support = needs.reduce((n, x) => n + x.entries.length, 0);
  const confidence = cr.strength === 'Sustained' && needs.length >= 3 ? 'Sustained drift'
                   : needs.length >= 2 ? 'Emerging drift' : 'Short-term fluctuation';
  return { ...cr, needs, areas, support, confidence };
}).sort((a,b) => b.areas.length - a.areas.length);

/* One condition explaining several problems beats five separate problems. */
function bottleneck() {
  const live = DRIFTS.filter(d => !['Not Relevant','Intentional'].includes(Align.verdict(d.id)));
  return live[0] || null;
}

/* Ranked by how many areas a change would move, weighted by how strongly
   those needs recur, then tempered by difficulty. */
function leveragePoints() {
  const weightOf = a => PATTERN_INDEX.filter(p => p.areas.includes(a))
    .reduce((n,p) => n + (p.confidence === 'Strong Pattern' ? 3 : p.confidence === 'Emerging Pattern' ? 2 : 1), 0);
  const cost = { Low:1, Medium:1.25, High:1.6 };
  return LEVERAGE_SEED
    .map(l => ({ ...l, reach:l.areas.length,
                 weight:Math.round(l.areas.reduce((n,a) => n + weightOf(a), 0) / (cost[l.difficulty] || 1)) }))
    .sort((a,b) => b.weight - a.weight);
}

function alignmentPicture() {
  const areas = REALMS.flatMap(r => r.areas).map(a => ({ area:a, status:Align.status(a.id) }));
  const aligned  = areas.filter(x => ['Strongly Aligned','Aligned','Mostly Aligned'].includes(x.status));
  const drifting = areas.filter(x => ['Drifting','Misaligned'].includes(x.status));
  const chosen   = areas.filter(x => x.status === 'Intentionally Misaligned');
  const unclear  = areas.filter(x => x.status === 'Unclear');
  const rated = areas.length - unclear.length;
  const course = !rated ? 'Unclear'
    : drifting.length > aligned.length ? 'Drifting'
    : aligned.length >= rated * 0.6 ? 'Improving' : 'Stable';
  return { areas, aligned, drifting, chosen, unclear, rated, course };
}

/* Enough is known to say something useful — or it isn't, and we say that. */
const evidenceDepth = () => {
  const p = alignmentPicture();
  return p.rated >= 8 ? 'rich' : p.rated >= 3 ? 'partial' : 'thin';
};

/* ── shared pieces ─────────────────────────────────────────────────── */
const STATE_SHAPE = {
  'Strongly Aligned':'●', 'Aligned':'●', 'Mostly Aligned':'◐',
  'Drifting':'◇', 'Misaligned':'◆', 'Unclear':'○', 'Intentionally Misaligned':'◈',
};
const stateClass = s => 'st-' + s.toLowerCase().replace(/\s+/g,'-');
/* shape + label + colour, never colour alone */
const stateChip = s => `<span class="state ${stateClass(s)}"><span class="state-mark" aria-hidden="true">${STATE_SHAPE[s]}</span>${esc(s)}</span>`;

/* Glance → Understand → Evidence. Glance is the default everywhere. */
function depth({ glance, understand, said = [], detected = [], passages = [], uncertain = '' }) {
  return `<div class="depth">
    <div class="depth-glance">${glance}</div>
    ${understand ? `<details class="depth-more"><summary>Why does this matter?</summary>
      <div class="depth-body">${understand}</div></details>` : ''}
    ${evidenceMode({ said, detected, passages, uncertain })}
  </div>`;
}

/* ══════════════════════════════════════════════════════════════════════
   LIFE COMPASS
   ══════════════════════════════════════════════════════════════════════ */

/* A radial alignment field: angle groups by realm, distance from the
   centre is how far that area has drifted from where he says it belongs. */
function compassField() {
  const areas = REALMS.flatMap(r => r.areas);
  const radiusOf = s => ({ 'Strongly Aligned':26, 'Aligned':44, 'Mostly Aligned':62,
                           'Unclear':84, 'Intentionally Misaligned':100, 'Drifting':118, 'Misaligned':136 })[s] ?? 84;
  const C = 170;
  let i = 0;
  const nodes = REALMS.flatMap((r, ri) => {
    const span = 360 / REALMS.length;
    return r.areas.map((a, ai) => {
      const ang = (ri * span) + (span / (r.areas.length + 1)) * (ai + 1) - 90;
      const rad = radiusOf(Align.status(a.id));
      const x = C + Math.cos(ang * Math.PI/180) * rad;
      const y = C + Math.sin(ang * Math.PI/180) * rad;
      return { a, x, y, r, status:Align.status(a.id), i:i++ };
    });
  });
  return `<figure class="compass">
    <svg viewBox="0 0 340 340" role="img" aria-label="Alignment field: areas closer to the centre are closer to where you say they belong">
      ${[26,62,100,136].map(rr => `<circle cx="${C}" cy="${C}" r="${rr}" class="ring"/>`).join('')}
      ${REALMS.map((r,ri) => { const ang = (ri * (360/REALMS.length)) - 90;
        const x = C + Math.cos(ang*Math.PI/180) * 158, y = C + Math.sin(ang*Math.PI/180) * 158;
        return `<line x1="${C}" y1="${C}" x2="${x}" y2="${y}" class="spoke"/>`; }).join('')}
      ${nodes.map(n => `<line x1="${C}" y1="${C}" x2="${n.x}" y2="${n.y}" class="thread ${stateClass(n.status)}"/>`).join('')}
      ${nodes.map(n => `<circle cx="${n.x}" cy="${n.y}" r="6" class="node ${stateClass(n.status)}"
          tabindex="0" role="button" data-compass="${n.a.id}"
          aria-label="${esc(n.a.name)} — ${esc(n.status)}"><title>${esc(n.a.name)} · ${esc(n.status)}</title></circle>`).join('')}
      <circle cx="${C}" cy="${C}" r="9" class="core"/>
      <text x="${C}" y="${C+3}" class="core-label">★</text>
    </svg>
    <figcaption class="note">Centre is your north star. Each point is a life area, placed by how aligned you have marked it.
      ${REALMS.map(r => esc(r.name)).join(' · ')} run clockwise from the top.</figcaption>
  </figure>`;
}

V.compass = () => {
  const ns = northStarState();
  const pic = alignmentPicture();
  const bn = bottleneck();
  const lev = leveragePoints();
  const heading = Align.heading();
  const season = Align.season();
  const pr = Align.priorities();
  const tr = Align.tradeoffs().filter(t => !t.done);

  return `<section class="view">
    ${pageHead('Align','Life Compass',
      'The Life Map explains how you are built. This is about direction: where you say you are going, where you actually are, and what is pulling between the two.')}

    <div class="compass-layout">
      ${compassField()}
      <div class="compass-side">
        <div class="hero-stat">
          <span class="eyebrow">Overall course</span>
          <strong class="hero-course ${stateClass(pic.course === 'Improving' ? 'Aligned' : pic.course === 'Drifting' ? 'Drifting' : 'Unclear')}">${pic.course}</strong>
          <p class="note">${pic.rated} of ${pic.areas.length} areas marked${pic.rated ? '' : ' — nothing has been marked yet, so this is genuinely unknown'}.</p>
        </div>
        <div class="compass-legend">
          ${['Strongly Aligned','Mostly Aligned','Unclear','Intentionally Misaligned','Drifting','Misaligned'].map(s =>
            `<span class="state ${stateClass(s)}"><span class="state-mark" aria-hidden="true">${STATE_SHAPE[s]}</span>${s}</span>`).join('')}
        </div>
      </div>
    </div>

    <section class="block">
      <div class="block-head"><h2>North Star</h2>
        ${ns.confirmed ? '<span class="note">Confirmed by you</span>' : '<span class="note">Draft — derived, not yet confirmed</span>'}</div>
      ${ns.changed ? `<div class="callout callout-notice"><strong>Possible change detected.</strong>
        <p class="note">The conditions recurring most in your material are no longer the ones you confirmed. Nothing has been rewritten — review and re-confirm when you want to.</p></div>` : ''}
      ${depth({
        glance: `<p class="lede">I am trying to build a life with:</p>
          <ul class="ns-list">${(ns.confirmed?.items || ns.derived).map(c =>
            `<li><a href="#/patterns/${c.id}"><span class="ns-name">${esc(c.name)}</span>
              <span class="note">${c.confidence} · ${c.entries} reflections across ${c.areas} areas</span></a></li>`).join('')}</ul>
          <div class="btn-row"><button class="btn ${ns.confirmed ? '' : 'btn-primary'}" id="confirmNS">${ns.confirmed ? 'Re-confirm this north star' : 'Confirm this as my north star'}</button>
            <a class="btn btn-quiet" href="#/blueprint">Open the full blueprint</a></div>`,
        understand: `<p class="note">These are the needs that recur most across your reflections, weighted by how many separate life areas they appear in — not the ones mentioned most often in one place. Confidence describes spread, never truth.</p>`,
        detected: PATTERN_INDEX.slice(0,3).flatMap(p => p.entries.slice(0,4).map(e => e.id)),
        said: northStarConditions().map(c => c.seed).filter(Boolean),
        uncertain: 'A recurring word is not automatically a requirement. Confirming this list is what turns it from a detection into your own statement.',
      })}
    </section>

    <section class="block">
      <div class="block-head"><h2>Current Heading</h2></div>
      ${heading ? `<p class="heading-line">${esc(heading)}</p>`
        : `<p class="heading-line heading-draft">${esc(draftHeading())}</p>
           <p class="note">A draft assembled from your priorities and strongest patterns. It is not something you said — edit it into your own words.</p>`}
      <div class="btn-row">
        <button class="btn" id="editHeading">${heading ? 'Edit heading' : 'Make this mine'}</button>
        <label class="season-pick">Current season
          <select id="seasonPick"><option value="">Not set</option>
            ${SEASONS.map(s => `<option${season===s?' selected':''}>${s}</option>`).join('')}</select></label>
      </div>
      <p class="note">A season describes this chapter, not you.</p>
    </section>

    <div class="grid-2">
      <section class="block">
        <div class="block-head"><h2>Current Position</h2><a class="link" href="#/now">Life Right Now</a></div>
        <div class="stack">
          <div class="mini mini-static"><span class="mini-title">On course</span>
            <span class="note">${pic.aligned.length ? pic.aligned.map(x => esc(x.area.name)).join(' · ') : 'Nothing marked aligned yet.'}</span></div>
          <div class="mini mini-static"><span class="mini-title">Drifting</span>
            <span class="note">${pic.drifting.length ? pic.drifting.map(x => esc(x.area.name)).join(' · ') : 'Nothing marked as drifting.'}</span></div>
          ${pic.chosen.length ? `<div class="mini mini-static"><span class="mini-title">Off course on purpose</span>
            <span class="note">${pic.chosen.map(x => esc(x.area.name)).join(' · ')}</span></div>` : ''}
        </div>
      </section>
      <section class="block">
        <div class="block-head"><h2>Right Now</h2><a class="link" href="#/priorities">Priorities</a></div>
        <div class="stack">
          ${pr.primary.length ? `<div class="mini mini-static"><span class="mini-title">Primary</span>
            <span class="note">${pr.primary.map(esc).join(' · ')}</span></div>` : ''}
          ${pr.maintain.length ? `<div class="mini mini-static"><span class="mini-title">Maintain</span>
            <span class="note">${pr.maintain.map(esc).join(' · ')}</span></div>` : ''}
          ${tr.length ? `<div class="mini mini-static"><span class="mini-title">Current tradeoff</span>
            <span class="note">Less ${esc(tr[0].less)} for more ${esc(tr[0].more)}${tr[0].reassess ? ` · reassess ${esc(tr[0].reassess)}` : ''}</span></div>` : ''}
          ${!pr.primary.length && !tr.length ? `<div class="mini mini-static"><span class="mini-title">Nothing set</span>
            <span class="note">Naming one or two priorities stops everything unfinished from looking equally urgent.</span>
            <a class="link" href="#/priorities">Set priorities</a></div>` : ''}
        </div>
      </section>
    </div>

    ${bn ? `<section class="block">
      <div class="block-head"><h2>Current Bottleneck</h2><a class="link" href="#/corrections">Course corrections</a></div>
      ${bottleneckCard(bn)}
    </section>` : ''}

    <section class="block">
      <div class="block-head"><h2>Highest-Leverage Adjustment</h2></div>
      ${leverageCard(lev[0])}
    </section>

    <section class="block">
      <div class="block-head"><h2>Things to Protect</h2><a class="link" href="#/corrections">All of it</a></div>
      <div class="chip-row">${PROTECT_SEED.filter(p => Align.protectOn(p.id)).map(p =>
        `<span class="chip chip-protect">${esc(p.label)}</span>`).join('')}</div>
    </section>

    <section class="block">
      <div class="block-head"><h2>Next Checkpoint</h2></div>
      <p class="note">${Align.checkins().length
        ? `Last check-in ${fmtDate(Align.checkins().at(-1).at)}.`
        : 'No check-in yet.'} A navigation check takes about two minutes and updates everything above.</p>
      <div class="btn-row"><a class="btn btn-primary" href="#/checkin">Check my direction now</a>
        <a class="btn" href="#/review">Open a course review</a></div>
    </section>
  </section>`;
};

function draftHeading() {
  const pr = Align.priorities();
  const lev = leveragePoints()[0];
  const top = northStarConditions().slice(0,3).map(c => c.name.toLowerCase());
  const season = Align.season();
  const focus = pr.primary[0] || (lev ? lev.label.toLowerCase() : 'a first move');
  return `${season ? season + '. ' : ''}Working toward ${focus}, while protecting ${top.slice(0,2).join(' and ')}${top[2] ? ' and ' + top[2] : ''}.`;
}

function bottleneckCard(d) {
  return depth({
    glance: `<div class="hero-insight">
        <p class="hero-kicker">You are not drifting everywhere.</p>
        <h3 class="hero-line">${esc(d.label)}</h3>
        <p class="note">Currently touching ${d.areas.length} areas: ${d.areas.map(a => esc(AREA_BY_ID[a]?.name || a)).join(' · ')}</p>
        <blockquote class="hero-quote">“${esc(d.quote)}”</blockquote>
        <div class="chip-row">${d.needs.map(n => `<a class="chip" href="#/patterns/${n.id}">${esc(n.name)}<span>${n.entries.length}</span></a>`).join('')}</div>
      </div>`,
    understand: `<p class="note">One condition is working against ${d.needs.length} separate needs you named. That is why several areas look off at once — treating them as ${d.needs.length} problems would be treating symptoms. Signal strength: <strong>${d.confidence}</strong>, from ${d.evidence.length} passages and ${d.support} reflections behind the conflicting needs.</p>`,
    said: d.prompts, passages: d.evidence,
    uncertain: 'Whether this is the binding constraint is a judgement only you can make. Mark it below if it is wrong.',
  }) + driftVerdictRow(d);
}

function driftVerdictRow(d) {
  const v = Align.verdict(d.id);
  return `<div class="verdict-row">
    <span class="note">Does this land?</span>
    ${DRIFT_VERDICTS.slice(1).map(x => `<button class="chip${v===x?' chip-on':''}" data-verdict="${esc(d.id)}|${esc(x)}">${x}</button>`).join('')}
    ${v !== 'Unreviewed' ? `<span class="note">Marked “${esc(v)}”.</span>` : ''}
  </div>`;
}

function leverageCard(l) {
  if (!l) return '';
  return depth({
    glance: `<div class="hero-insight">
        <h3 class="hero-line">${esc(l.label)}</h3>
        <p class="note">Would touch ${l.reach} areas: ${l.areas.map(a => esc(AREA_BY_ID[a]?.name || a)).join(' · ')}</p>
        <div class="meta-row">
          <span class="meta"><em>Difficulty</em>${l.difficulty}</span>
          <span class="meta"><em>Reversibility</em>${l.reversibility}</span>
          <span class="meta"><em>Areas moved</em>${l.reach}</span>
        </div>
        <div class="btn-row"><a class="btn" href="#/check">Check this direction</a>
          <button class="btn btn-quiet" data-leverage-exp="${esc(l.id)}">Turn into an experiment</button></div>
      </div>`,
    understand: `<p class="note">${esc(l.why)}</p>`,
    passages: l.evidence,
    uncertain: 'Ranking weighs how many areas a change would move against how hard it is. It cannot know your timing.',
  });
}

/* ══════════════════════════════════════════════════════════════════════
   LIFE RIGHT NOW — the page that should be readable at a glance
   ══════════════════════════════════════════════════════════════════════ */
V.now = () => {
  const pic = alignmentPicture(), bn = bottleneck(), lev = leveragePoints()[0];
  const pr = Align.priorities(), tr = Align.tradeoffs().filter(t => !t.done);
  const season = Align.season(), heading = Align.heading() || draftHeading();
  const staying = !bn || DRIFTS.every(d => ['Not Relevant','Intentional'].includes(Align.verdict(d.id)));

  return `<section class="view view-now">
    ${pageHead('Align','Life Right Now','Where things stand today. The deeper material is all still one click away.')}

    <p class="statement">${esc(heading)}</p>
    <div class="now-meta">
      ${season ? `<span class="meta"><em>Season</em>${esc(season)}</span>` : ''}
      <span class="meta"><em>Overall course</em>${pic.course}</span>
      <span class="meta"><em>Areas marked</em>${pic.rated} of ${pic.areas.length}</span>
    </div>

    ${staying ? `<div class="callout callout-good">
      <strong>Stay the course.</strong>
      <p class="note">Nothing you have marked is pulling against what you said you need. No adjustment is called for right now — that is a real answer, not an empty one.</p>
    </div>` : ''}

    <div class="now-grid">
      <section class="now-cell">
        <h2>What matters most right now</h2>
        ${pr.primary.length || pr.maintain.length ? `
          ${pr.primary.length ? `<p class="now-list"><em>Primary</em> ${pr.primary.map(esc).join(' · ')}</p>` : ''}
          ${pr.secondary.length ? `<p class="now-list"><em>Secondary</em> ${pr.secondary.map(esc).join(' · ')}</p>` : ''}
          ${pr.maintain.length ? `<p class="now-list"><em>Maintain</em> ${pr.maintain.map(esc).join(' · ')}</p>` : ''}
          ${pr.notNow.length ? `<p class="now-list"><em>Not a focus</em> ${pr.notNow.map(esc).join(' · ')}</p>` : ''}`
        : empty('Nothing named as a priority yet.','Two or three is enough. It stops every unfinished area from looking equally urgent.')}
        <a class="link" href="#/priorities">Set priorities</a>
      </section>

      <section class="now-cell">
        <h2>On course</h2>
        ${pic.aligned.length ? `<ul class="state-list">${pic.aligned.map(x =>
          `<li><a href="#/map/${x.area.id}">${esc(x.area.name)}</a>${stateChip(x.status)}</li>`).join('')}</ul>`
        : empty('Nothing marked aligned yet.','Open a life area and mark how it currently stands. It takes seconds and everything here sharpens.')}
      </section>

      <section class="now-cell">
        <h2>Drifting</h2>
        ${pic.drifting.length ? `<ul class="state-list">${pic.drifting.map(x =>
          `<li><a href="#/map/${x.area.id}">${esc(x.area.name)}</a>${stateChip(x.status)}</li>`).join('')}</ul>`
        : `<p class="note">Nothing marked as drifting.</p>`}
        ${pic.chosen.length ? `<p class="note">Off course on purpose: ${pic.chosen.map(x => esc(x.area.name)).join(' · ')}</p>` : ''}
      </section>

      <section class="now-cell now-wide">
        <h2>Primary bottleneck</h2>
        ${bn ? bottleneckCard(bn) : `<p class="note">No single condition is currently explaining several problems at once.</p>`}
      </section>

      <section class="now-cell">
        <h2>Current tradeoff</h2>
        ${tr.length ? tr.map(t => tradeoffCard(t)).join('')
          : empty('No tradeoff recorded.','If you are accepting less of something on purpose, say so — it stops the system reading a strategy as a failure.')}
        <a class="link" href="#/corrections">Record a tradeoff</a>
      </section>

      <section class="now-cell">
        <h2>Highest-leverage move</h2>
        ${lev ? `<p class="now-lead">${esc(lev.label)}</p><p class="note">Would touch ${lev.reach} areas · ${lev.difficulty} difficulty</p>
          <a class="link" href="#/compass">See why</a>` : ''}
      </section>

      <section class="now-cell now-wide">
        <h2>Protect</h2>
        <div class="chip-row">${PROTECT_SEED.filter(p => Align.protectOn(p.id)).map(p =>
          `<span class="chip chip-protect">${esc(p.label)}</span>`).join('')}</div>
        <p class="note">Before any big decision, check it would not quietly cost you one of these.</p>
      </section>
    </div>

    <section class="block">
      <div class="block-head"><h2>Next Checkpoint</h2></div>
      <div class="btn-row"><a class="btn btn-primary" href="#/checkin">Navigation check</a>
        <a class="btn" href="#/check">Check a decision</a>
        <a class="btn" href="#/rightlife">Am I building the right life?</a></div>
    </section>
  </section>`;
};

const tradeoffCard = t => `<article class="tradeoff${t.done ? ' tradeoff-done' : ''}">
  <span class="state st-intentionally-misaligned"><span class="state-mark" aria-hidden="true">◈</span>${t.temporary ? 'Temporary tradeoff' : 'Long-term tradeoff'}</span>
  <p class="tradeoff-line"><em>Less</em> ${esc(t.less)}</p>
  <p class="tradeoff-line"><em>For more</em> ${esc(t.more)}</p>
  ${t.why ? `<p class="note">${esc(t.why)}</p>` : ''}
  ${t.reassess ? `<p class="note"><em>Reassess</em> ${esc(t.reassess)}</p>` : ''}
  <button class="link" data-tradeoff-done="${esc(t.id)}">${t.done ? 'Reopen' : 'Mark reassessed'}</button>
</article>`;

/* ══════════════════════════════════════════════════════════════════════
   COURSE CORRECTIONS — one correction, two adjustments, three to protect
   ══════════════════════════════════════════════════════════════════════ */
V.corrections = () => {
  const live = DRIFTS.filter(d => !['Not Relevant','Intentional'].includes(Align.verdict(d.id)));
  const [correct, ...rest] = live;
  const watch = rest.slice(0,2);
  const explore = PROMPTS.filter(p => effStatus(p) === 'unanswered' && /experiment|test|decide|choose/i.test(p.prompt)).slice(0,3);
  const protect = PROTECT_SEED.filter(p => Align.protectOn(p.id)).slice(0,3);
  const tr = Align.tradeoffs();

  return `<section class="view">
    ${pageHead('Align','Course Corrections',
      'Deliberately short. One thing worth correcting, two worth watching, and what should be left alone.')}

    ${correct ? `<section class="correction correction-now">
      <span class="eyebrow">Correct now</span>
      ${bottleneckCard(correct)}
      <div class="btn-row">
        <button class="btn btn-primary" data-leverage-exp="${esc(leveragePoints()[0]?.id || '')}">Smallest useful next move</button>
        <a class="btn" href="#/check">Check a direction</a>
        <a class="btn btn-quiet" href="#/open">Open questions behind this</a>
      </div>
    </section>` : `<div class="callout callout-good"><strong>Stay the course.</strong>
      <p class="note">Nothing currently needs correcting. Everything flagged has been reviewed and either resolved, marked intentional, or dismissed.</p></div>`}

    ${watch.length ? `<section class="block">
      <div class="block-head"><h2>Watch</h2><span class="note">Beginning to pull, not yet urgent</span></div>
      <div class="stack stack-wide">
        ${watch.map(d => `<article class="mini mini-static">
          <span class="state ${stateClass('Drifting')}"><span class="state-mark" aria-hidden="true">◇</span>${esc(d.confidence)}</span>
          <span class="mini-title">${esc(d.label)}</span>
          <span class="note">Works against ${d.needs.map(n => esc(n.name)).join(', ')}.</span>
          <blockquote class="inline-quote">“${esc(d.quote)}”</blockquote>
          ${evChips(d.evidence)}
          ${driftVerdictRow(d)}
        </article>`).join('')}
      </div>
    </section>` : ''}

    <section class="block">
      <div class="block-head"><h2>Explore</h2><span class="note">Still genuinely uncertain</span></div>
      <div class="entry-list">${explore.map(p => entryRow(p, { showArea:true })).join('')}</div>
    </section>

    <section class="block">
      <div class="block-head"><h2>Protect</h2><span class="note">Working — do not spend it</span></div>
      <div class="stack">
        ${PROTECT_SEED.map(p => `<div class="mini mini-static">
          <label class="protect-toggle"><input type="checkbox" data-protect="${esc(p.id)}"${Align.protectOn(p.id)?' checked':''}>
            <span class="mini-title">${esc(p.label)}</span></label>
          <span class="note">${p.areas.map(a => esc(AREA_BY_ID[a]?.name || a)).join(' · ')}</span>
          ${evChips(p.evidence)}
        </div>`).join('')}
      </div>
    </section>

    <section class="block">
      <div class="block-head"><h2>Intentional Tradeoffs</h2>
        <button class="link" id="newTradeoff">Record a tradeoff</button></div>
      <p class="note">Accepting less of something on purpose is a strategy, not drift. Recorded tradeoffs are shown differently everywhere else on the site.</p>
      ${tr.length ? `<div class="stack stack-wide">${tr.map(t => tradeoffCard(t)).join('')}</div>`
        : empty('Nothing recorded.','For example: less creative time in exchange for financial stabilisation, reassess in December.')}
    </section>
  </section>`;
};

/* ══════════════════════════════════════════════════════════════════════
   GUARDRAILS
   ══════════════════════════════════════════════════════════════════════ */
V.guardrails = () => {
  const mine = Store.read('fh.guardrails.mine', []);
  return `<section class="view">
    ${pageHead('Align','Guardrails',
      'Lessons you drew yourself, kept short enough to actually remember. They surface again inside decisions.')}
    <div class="stack stack-wide">
      ${[...GUARDRAIL_SEED.map(g => ({...g, seeded:true})), ...mine].map(g => `<article class="guardrail${Align.guardOn(g.id) ? '' : ' guardrail-off'}">
        <label class="protect-toggle"><input type="checkbox" data-guard="${esc(g.id)}"${Align.guardOn(g.id)?' checked':''}>
          <p class="guardrail-text">${esc(g.text)}</p></label>
        ${g.evidence?.length ? evChips(g.evidence, 'Drawn from') : '<p class="note">Added by you.</p>'}
        ${!g.seeded ? `<button class="link" data-delete-guard="${esc(g.id)}">Remove</button>` : ''}
      </article>`).join('')}
    </div>
    <div class="btn-row" style="margin-top:var(--s3)"><button class="btn" id="newGuardrail">Add a guardrail</button></div>
  </section>`;
};

/* ══════════════════════════════════════════════════════════════════════
   CURRENT PRIORITIES
   ══════════════════════════════════════════════════════════════════════ */
const PRIORITY_BANDS = [
  { key:'primary',   label:'Primary',          max:3, hint:'What this season is actually about. One to three.' },
  { key:'secondary', label:'Secondary',        max:3, hint:'Real, but not what you would defend first.' },
  { key:'maintain',  label:'Maintain',         max:3, hint:'Working — keep it steady rather than push it.' },
  { key:'notNow',    label:'Not a focus now',  max:4, hint:'Named on purpose, so it stops reading as failure.' },
];
V.priorities = () => {
  const pr = Align.priorities();
  const suggestions = [...leveragePoints().map(l => l.label), ...northStarConditions().map(c => c.name)];
  return `<section class="view">
    ${pageHead('Align','Current Priorities',
      'Separate what is always important from what is important right now. Everything else stays valued without being urgent.')}
    <p class="note legend">Your values do not change here. This only says where the weight sits this season, so the rest of the site stops treating every unfinished area as a problem.</p>

    <div class="priority-grid">
      ${PRIORITY_BANDS.map(b => `<section class="priority-band" data-band="${b.key}">
        <div class="block-head"><h2>${b.label}</h2><span class="note">${pr[b.key].length} of ${b.max}</span></div>
        <p class="note">${b.hint}</p>
        <ul class="priority-list">
          ${pr[b.key].map(x => `<li>${esc(x)}<button class="link" data-drop-priority="${b.key}|${esc(x)}" aria-label="Remove ${esc(x)}">×</button></li>`).join('')
            || '<li class="note">Nothing here yet.</li>'}
        </ul>
        ${pr[b.key].length < b.max ? `<button class="link" data-add-priority="${b.key}">Add</button>` : '<p class="note">Full — that is the point.</p>'}
      </section>`).join('')}
    </div>

    <section class="block">
      <div class="block-head"><h2>Suggestions From Your Own Material</h2></div>
      <div class="chip-row">${[...new Set(suggestions)].slice(0,10).map(s =>
        `<button class="chip" data-quick-priority="${esc(s)}">${esc(s)}</button>`).join('')}</div>
      <p class="note">Clicking one adds it to Primary if there is room, otherwise Secondary.</p>
    </section>
  </section>`;
};

/* ══════════════════════════════════════════════════════════════════════
   CHECK MY DIRECTION — fast, for everyday choices
   ══════════════════════════════════════════════════════════════════════ */
const check = { name:'', kind:'city', scores:{} };
V.check = () => {
  const needs = CHECK_NEEDS.map(id => PATTERN_INDEX_BY_ID[id]).filter(Boolean);
  const has = Object.values(check.scores).some(v => v);
  return `<section class="view">
    ${pageHead('Align','Check My Direction',
      'A two-minute read on a real choice, against needs you have already established. For anything bigger, the Decision Lab keeps the full working.')}

    <div class="check-head">
      <label class="check-name">What are you weighing?
        <input id="checkName" type="text" value="${esc(check.name)}" placeholder="A job, a flat, a city, an invitation…"></label>
      <label>Kind<select id="checkKind">
        ${DECISION_KINDS.map(k => `<option value="${k.id}"${check.kind===k.id?' selected':''}>${esc(k.name)}</option>`).join('')}
      </select></label>
    </div>

    <div class="check-grid">
      ${needs.map(n => {
        const v = check.scores[n.id] || 'neutral';
        return `<div class="check-row">
          <div class="check-need"><span class="check-name-label">${esc(n.name)}</span>
            <span class="note">${n.confidence} · ${n.entries.length} reflections</span></div>
          <div class="check-toggle" role="group" aria-label="${esc(n.name)}">
            ${[['toward','Toward'],['away','Away'],['neutral','Neutral'],['unsure','Unsure']].map(([k,l]) =>
              `<button class="seg${v===k?' seg-on':''}" data-check="${n.id}|${k}">${l}</button>`).join('')}
          </div>
        </div>`;
      }).join('')}
    </div>

    ${has ? checkResult(needs) : `<p class="note">Mark a few and the reading appears here.</p>`}

    <div class="btn-row" style="margin-top:var(--s3)">
      <button class="btn btn-primary" id="checkToLab">Open in Decision Lab</button>
      <button class="btn btn-quiet" id="checkReset">Clear</button>
    </div>
  </section>`;
};

function checkResult(needs) {
  const by = k => needs.filter(n => check.scores[n.id] === k);
  const toward = by('toward'), away = by('away'), unsure = by('unsure'), neutral = by('neutral');
  const guards = GUARDRAIL_SEED.filter(g => Align.guardOn(g.id))
    .filter(g => away.some(a => norm(g.text).includes(norm(a.name).split(' ')[0])));
  const protects = PROTECT_SEED.filter(p => Align.protectOn(p.id))
    .filter(p => away.some(a => a.areas.some(ar => p.areas.includes(ar))));
  return `<section class="check-result">
    <div class="check-cols">
      <div><span class="eyebrow">Moves me toward</span>
        ${toward.length ? `<ul class="plain">${toward.map(n => `<li><a href="#/patterns/${n.id}">${esc(n.name)}</a></li>`).join('')}</ul>` : '<p class="note">Nothing marked.</p>'}</div>
      <div><span class="eyebrow">Moves me away from</span>
        ${away.length ? `<ul class="plain">${away.map(n => `<li><a href="#/patterns/${n.id}">${esc(n.name)}</a></li>`).join('')}</ul>` : '<p class="note">Nothing marked.</p>'}</div>
      <div><span class="eyebrow">Neutral</span>
        ${neutral.length ? `<ul class="plain">${neutral.map(n => `<li>${esc(n.name)}</li>`).join('')}</ul>` : '<p class="note">—</p>'}</div>
      <div><span class="eyebrow">Uncertain</span>
        ${unsure.length ? `<ul class="plain">${unsure.map(n => `<li>${esc(n.name)}</li>`).join('')}</ul>` : '<p class="note">—</p>'}</div>
    </div>
    ${toward.length && away.length ? `<p class="statement statement-small">Key tradeoff — more ${esc(toward[0].name.toLowerCase())} in exchange for less ${esc(away[0].name.toLowerCase())}.</p>` : ''}
    ${protects.length ? `<div class="callout callout-notice"><strong>This would cost something currently working.</strong>
      <p class="note">${protects.map(p => esc(p.label)).join(' · ')}</p></div>` : ''}
    ${guards.length ? `<div class="callout callout-notice"><strong>A guardrail applies here.</strong>
      ${guards.map(g => `<p class="note">${esc(g.text)}</p>`).join('')}</div>` : ''}
    ${unsure.length ? `<p class="note">${unsure.length} need${unsure.length===1?'':'s'} you could not rate. An experiment would settle those faster than more thinking —
      <button class="link" id="checkToExperiment">design one</button>.</p>` : ''}
    <p class="note">This describes fit against criteria you set. It is not a recommendation.</p>
  </section>`;
}

/* ══════════════════════════════════════════════════════════════════════
   NAVIGATION CHECK & COURSE REVIEW
   ══════════════════════════════════════════════════════════════════════ */
const CHECKIN_Qs = [
  { k:'moving',    q:'Do you currently feel like you are moving toward the life you want?' },
  { k:'aligned',   q:'What feels most aligned right now?' },
  { k:'off',       q:'What feels furthest off course?' },
  { k:'intent',    q:'Is any current sacrifice intentional?' },
  { k:'attention', q:'What deserves your attention next?' },
];
V.checkin = () => {
  const past = Align.checkins();
  return `<section class="view view-reflect">
    ${pageHead('Align','Navigation Check','Five short questions. Not journaling — just a bearing. Two minutes is plenty.')}
    <form id="checkinForm" class="checkin">
      ${CHECKIN_Qs.map((c,i) => `<label class="checkin-q">
        <span class="checkin-num">${i+1}</span>
        <span class="checkin-text">${esc(c.q)}</span>
        <textarea name="${c.k}" rows="2" placeholder="A line is enough."></textarea>
      </label>`).join('')}
      <div class="btn-row"><button class="btn btn-primary" type="submit">Save this check</button>
        <a class="btn btn-quiet" href="#/now">Skip for now</a></div>
    </form>
    ${past.length ? `<section class="block">
      <div class="block-head"><h2>Previous Checks</h2><span class="note">${past.length}</span></div>
      <div class="stack stack-wide">
        ${past.slice().reverse().slice(0,6).map(c => `<article class="mini mini-static">
          <span class="eyebrow">${fmtDate(c.at)}</span>
          ${CHECKIN_Qs.filter(q => c[q.k]).map(q => `<p class="note"><em>${esc(q.q)}</em><br>${esc(c[q.k])}</p>`).join('')}
        </article>`).join('')}
      </div>
    </section>` : ''}
  </section>`;
};

V.review = () => {
  const pic = alignmentPicture(), bn = bottleneck(), lev = leveragePoints();
  const tr = Align.tradeoffs().filter(t => !t.done);
  const checks = Align.checkins();
  const revised = Reflections.all().filter(x => x.rec.versions.length > 1);
  return `<section class="view">
    ${pageHead('Align','Course Review','A longer look, whenever you want one. Nothing here is scheduled or owed.')}
    <div class="review">
      ${[
        ['Overall direction', `${pic.course}. ${pic.rated} of ${pic.areas.length} areas marked; ${pic.aligned.length} on course, ${pic.drifting.length} drifting${pic.chosen.length ? `, ${pic.chosen.length} off course on purpose` : ''}.`],
        ['Biggest improvement', revised.length ? `${revised.length} reflection${revised.length===1?' has':'s have'} been revised since you first wrote them — the clearest sign of movement the site can see.` : 'Nothing revised yet, so there is no movement to report.'],
        ['Largest drift', bn ? `${bn.label} — working against ${bn.needs.map(n => n.name).join(', ')}.` : 'Nothing currently marked as drifting.'],
        ['Current bottleneck', bn ? `${bn.label}, touching ${bn.areas.length} areas at once.` : 'No single constraint is explaining several problems.'],
        ['Current tradeoff', tr.length ? `Less ${tr[0].less} for more ${tr[0].more}${tr[0].reassess ? `, reassess ${tr[0].reassess}` : ''}.` : 'None recorded.'],
        ['Highest-leverage adjustment', lev[0] ? `${lev[0].label} — would touch ${lev[0].reach} areas.` : '—'],
        ['What to protect', PROTECT_SEED.filter(p => Align.protectOn(p.id)).map(p => p.label).join(' · ') || '—'],
        ['What to focus on next', Align.priorities().primary[0] || (lev[0] ? lev[0].label : 'Not yet named.')],
      ].map(([h,b]) => `<section class="review-row"><h2>${h}</h2><p class="prose">${esc(b)}</p></section>`).join('')}
    </div>
    ${checks.length ? `<p class="note">Last navigation check ${fmtDate(checks.at(-1).at)}.</p>` : ''}
    <div class="btn-row"><a class="btn" href="#/checkin">Navigation check</a><a class="btn btn-quiet" href="#/compass">Life Compass</a></div>
  </section>`;
};

/* ══════════════════════════════════════════════════════════════════════
   AM I BUILDING THE RIGHT LIFE?
   ══════════════════════════════════════════════════════════════════════ */
V.rightlife = () => {
  const ns = northStarState(), pic = alignmentPicture(), bn = bottleneck();
  const tr = Align.tradeoffs().filter(t => !t.done);
  const accidental = DRIFTS.filter(d => !['Intentional','Not Relevant'].includes(Align.verdict(d.id)));
  return `<section class="view view-synthesis">
    ${pageHead('Align','Am I Building the Right Life?','A single read on the whole thing. Every line opens into what it came from.')}

    <p class="statement statement-hero">You are not drifting everywhere.</p>
    <p class="lede">${bn
      ? `Most of what currently looks off traces back to one condition — ${esc(bn.label.toLowerCase())} — rather than to ${accidental.length} separate failures.`
      : 'Nothing you have marked is pulling against what you said you need.'}</p>

    <div class="synth">
      <section class="synth-row"><h2>What I am building toward</h2>
        <div class="chip-row">${(ns.confirmed?.items || ns.derived).map(c =>
          `<a class="chip" href="#/patterns/${c.id}">${esc(c.name)}</a>`).join('')}</div>
        <p class="note">${ns.confirmed ? 'Confirmed by you.' : 'Derived from your reflections and not yet confirmed.'}
          <a class="link" href="#/compass">Review the north star</a></p></section>

      <section class="synth-row"><h2>What my current life supports</h2>
        ${pic.aligned.length ? `<ul class="plain">${pic.aligned.map(x => `<li><a href="#/map/${x.area.id}">${esc(x.area.name)}</a> ${stateChip(x.status)}</li>`).join('')}</ul>`
          : empty('Not marked yet.','Open any life area and set how it currently stands.')}
        <div class="chip-row">${PROTECT_SEED.filter(p => Align.protectOn(p.id)).map(p => `<span class="chip chip-protect">${esc(p.label)}</span>`).join('')}</div></section>

      <section class="synth-row"><h2>What currently contradicts it</h2>
        ${accidental.length ? `<div class="stack stack-wide">${accidental.map(d => `<div class="mini mini-static">
          <span class="mini-title">${esc(d.label)}</span>
          <span class="note">Works against ${d.needs.map(n => esc(n.name)).join(', ')} · ${esc(d.confidence)}</span>
          ${evChips(d.evidence)}</div>`).join('')}</div>`
          : '<p class="note">Nothing outstanding.</p>'}</section>

      <section class="synth-row"><h2>Where I am compromising on purpose</h2>
        ${tr.length ? tr.map(t => tradeoffCard(t)).join('')
          : empty('Nothing recorded as intentional.','If a compromise is deliberate, saying so keeps it from being read as drift.')}</section>

      <section class="synth-row"><h2>Where I may be compromising accidentally</h2>
        ${accidental.filter(d => Align.verdict(d.id) === 'Unreviewed').length
          ? `<p class="note">${accidental.filter(d => Align.verdict(d.id) === 'Unreviewed').map(d => esc(d.label)).join(' · ')} — none of these has been reviewed yet.</p>
             <a class="link" href="#/corrections">Review them</a>`
          : '<p class="note">Everything flagged has been reviewed.</p>'}</section>

      <section class="synth-row"><h2>What needs attention</h2>
        ${bn ? `<p class="now-lead">${esc(bn.label)}</p><p class="note">${esc(bn.quote)}</p><a class="link" href="#/corrections">Course corrections</a>`
             : '<p class="note">Nothing pressing.</p>'}</section>

      <section class="synth-row"><h2>What should remain untouched</h2>
        <div class="chip-row">${PROTECT_SEED.filter(p => Align.protectOn(p.id)).map(p =>
          `<span class="chip chip-protect">${esc(p.label)}</span>`).join('')}</div>
        <p class="note">Check any major decision against these before making it.</p></section>
    </div>
  </section>`;
};

/* ══════════════════════════════════════════════════════════════════════
   ENHANCEMENTS TO WHAT ALREADY EXISTS
   ══════════════════════════════════════════════════════════════════════ */

/* Dropped into every life area page, beneath the existing analysis. */
function alignmentPanel(a) {
  const status = Align.status(a.id);
  const drifts = DRIFTS.filter(d => d.areas.includes(a.id));
  const lev = leveragePoints().filter(l => l.areas.includes(a.id))[0];
  const protect = PROTECT_SEED.filter(p => p.areas.includes(a.id) && Align.protectOn(p.id));
  return `<section class="align-panel">
    <div class="align-head">
      <span class="eyebrow">Alignment</span>
      <label class="align-set">How does this stand right now?
        <select data-align="${esc(a.id)}">
          ${ALIGN_STATES.map(s => `<option${status===s?' selected':''}>${s}</option>`).join('')}
        </select></label>
      ${stateChip(status)}
    </div>
    <div class="align-grid">
      <div><span class="eyebrow">Destination</span><p class="note">${esc(a.question)}</p></div>
      <div><span class="eyebrow">Current reality</span><p class="note">${drifts.length
        ? esc(drifts[0].label) + ' — ' + esc(drifts[0].quote.slice(0,90)) + '…'
        : status === 'Unclear' ? 'Not described yet.' : 'As you have marked it.'}</p></div>
      <div><span class="eyebrow">Direction</span><p class="note">${
        ['Strongly Aligned','Aligned'].includes(status) ? 'Holding.'
        : status === 'Intentionally Misaligned' ? 'Off course on purpose.'
        : drifts.length ? 'Pulled by ' + esc(drifts[0].label.toLowerCase()) + '.' : 'Unknown.'}</p></div>
      <div><span class="eyebrow">Next useful move</span><p class="note">${lev ? esc(lev.label) : 'Nothing specific yet.'}</p></div>
    </div>
    ${protect.length ? `<div class="chip-row"><span class="chip-label">Protect</span>${
      protect.map(p => `<span class="chip chip-protect">${esc(p.label)}</span>`).join('')}</div>` : ''}
    ${drifts.length ? evChips(drifts[0].evidence, 'Why this reading') : ''}
  </section>`;
}

/* ── Home: a control centre led by direction ───────────────────────── */
/* Modules rotate so the page is alive without the navigation ever moving. */
V.home = () => {
  const pic = alignmentPicture(), bn = bottleneck(), lev = leveragePoints()[0];
  const ns = northStarState(), heading = Align.heading() || draftHeading();
  const tr = Align.tradeoffs().filter(t => !t.done)[0];
  const lastId = Store.read('fh.last'), last = PROMPT_BY_ID[lastId];
  const openQ = PROMPTS.find(p => isOpen(p) && effStatus(p) === 'partial') || PROMPTS.find(isOpen);
  const quote = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  const insight = PATTERN_INDEX.filter(p => p.books.length === 3)[Math.floor(Math.random() * 4)] || PATTERN_INDEX[0];
  const staying = !bn;
  const hour = new Date().getHours();
  const greet = hour < 5 ? 'Still up' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const depthNow = evidenceDepth();

  return `<section class="view view-home">
    <header class="home-head">
      <span class="eyebrow">${esc(greet)}</span>
      <p class="statement">${esc(heading)}</p>
      <div class="now-meta">
        ${Align.season() ? `<span class="meta"><em>Season</em>${esc(Align.season())}</span>` : ''}
        <span class="meta"><em>Overall course</em>${pic.course}</span>
        ${!Align.heading() ? '<span class="meta"><em>Heading</em>draft</span>' : ''}
        <a class="link" href="#/compass">Life Compass →</a>
      </div>
    </header>

    ${depthNow === 'thin' ? `<div class="callout">
      <strong>The alignment layer is still forming.</strong>
      <p class="note">It compares what you said you need against how things actually stand — which means marking a few life areas. Two or three is enough for the compass to start saying something real.</p>
      <div class="btn-row"><a class="btn btn-primary" href="#/map">Mark a life area</a><a class="btn" href="#/compass">See the compass anyway</a></div>
    </div>` : ''}

    <div class="home-grid">
      <a class="tile tile-lead" href="#/compass">
        <span class="eyebrow">Life Compass</span>
        ${compassField()}
      </a>

      <div class="tile-col">
        ${staying ? `<div class="tile tile-good">
          <span class="eyebrow">Stay the course</span>
          <p class="tile-lead-text">Nothing you have marked is pulling against what you said you need.</p>
          <p class="note">No adjustment is called for. That is a real answer.</p>
        </div>` : `<a class="tile tile-alert" href="#/corrections">
          <span class="eyebrow">Primary bottleneck</span>
          <p class="tile-lead-text">${esc(bn.label)}</p>
          <p class="note">Touching ${bn.areas.length} areas at once · ${esc(bn.confidence)}</p>
          <span class="cta">Course corrections →</span>
        </a>`}
        ${lev ? `<a class="tile" href="#/compass">
          <span class="eyebrow">Highest-leverage move</span>
          <p class="tile-lead-text">${esc(lev.label)}</p>
          <p class="note">Would touch ${lev.reach} areas · ${lev.difficulty} difficulty</p>
        </a>` : ''}
      </div>
    </div>

    <div class="home-grid-3">
      <section class="tile">
        <span class="eyebrow">On course</span>
        ${pic.aligned.length ? `<ul class="plain">${pic.aligned.slice(0,5).map(x =>
          `<li><a href="#/map/${x.area.id}">${esc(x.area.name)}</a></li>`).join('')}</ul>`
          : `<p class="note">Nothing marked yet.</p>`}
      </section>
      <section class="tile">
        <span class="eyebrow">Needs attention</span>
        ${pic.drifting.length ? `<ul class="plain">${pic.drifting.slice(0,5).map(x =>
          `<li><a href="#/map/${x.area.id}">${esc(x.area.name)}</a></li>`).join('')}</ul>`
          : `<p class="note">Nothing marked as drifting.</p>`}
      </section>
      <section class="tile">
        <span class="eyebrow">Protect</span>
        <ul class="plain">${PROTECT_SEED.filter(p => Align.protectOn(p.id)).slice(0,4).map(p =>
          `<li>${esc(p.label)}</li>`).join('')}</ul>
      </section>
    </div>

    <div class="home-grid">
      <a class="tile" href="${last ? `#/entry/${last.id}` : '#/reflect'}">
        <span class="eyebrow">${last ? 'Continue where you left off' : 'Continue reflecting'}</span>
        <p class="tile-lead-text">${esc((last || openQ)?.prompt || 'Open a reflection')}</p>
        <p class="note">${esc((last || openQ)?.area?.name || '')}</p>
        <span class="cta">Continue →</span>
      </a>
      <div class="tile-col">
        ${tr ? `<a class="tile" href="#/corrections"><span class="eyebrow">Current tradeoff</span>
          <p class="tile-lead-text">Less ${esc(tr.less)} for more ${esc(tr.more)}</p>
          <p class="note">${tr.reassess ? 'Reassess ' + esc(tr.reassess) : 'A strategy, not drift.'}</p></a>` : ''}
        <a class="tile" href="#/patterns/${insight.id}">
          <span class="eyebrow">Recent insight</span>
          <p class="tile-lead-text">${esc(insight.name)} appears in all three books</p>
          <p class="note">${insight.entries.length} reflections across ${insight.areas.length} areas</p>
        </a>
        <div class="tile tile-quote">
          <span class="eyebrow">In your own words</span>
          <blockquote>${esc(quote.text)}</blockquote>
          <p class="note">${esc(quote.source)}</p>
        </div>
      </div>
    </div>

    <div class="btn-row home-actions">
      <a class="btn btn-primary" href="#/check">Check my direction</a>
      <a class="btn" href="#/now">Life right now</a>
      <a class="btn" href="#/rightlife">Am I building the right life?</a>
      <a class="btn btn-quiet" href="#/open">Open questions</a>
    </div>

    <p class="privacy-line">Everything you write stays in this browser on this device.
      <a class="link" href="#/data">What is stored, and how to export it</a></p>
  </section>`;
};

/* ── navigation: ALIGN sits between UNDERSTAND and DESIGN ──────────── */
NAV.splice(3, 0, { group:'Align', items:[
  { label:'Life Compass',      href:'#/compass',     view:'compass' },
  { label:'Life Right Now',    href:'#/now',         view:'now' },
  { label:'Course Corrections',href:'#/corrections', view:'corrections' },
  { label:'Guardrails',        href:'#/guardrails',  view:'guardrails' },
  { label:'Current Priorities',href:'#/priorities',  view:'priorities' },
  { label:'Check My Direction',href:'#/check',       view:'check' },
]});
Object.assign(MODE_OF, { compass:'align', now:'align', corrections:'align', guardrails:'align',
  priorities:'align', check:'align', checkin:'align', review:'align', rightlife:'align' });
Object.assign(TITLES, { compass:'Life Compass', now:'Life Right Now', corrections:'Course Corrections',
  guardrails:'Guardrails', priorities:'Current Priorities', check:'Check My Direction',
  checkin:'Navigation Check', review:'Course Review', rightlife:'Am I Building the Right Life?' });

/* ══════════════════════════════════════════════════════════════════════
   BEHAVIOUR
   ══════════════════════════════════════════════════════════════════════ */
document.addEventListener('click', e => {
  const t = e.target;

  const node = t.closest('[data-compass]');
  if (node) { location.hash = `#/map/${node.dataset.compass}`; return; }

  const b = t.closest('button'); if (!b) return;

  if (b.dataset.verdict) {
    const [id, v] = b.dataset.verdict.split('|');
    Align.setVerdict(id, Align.verdict(id) === v ? 'Unreviewed' : v);
    notify(v === 'Intentional' ? 'Recorded as intentional — it will be shown as a strategy, not drift.' : `Marked “${v}”.`);
    route(); return;
  }
  if (b.id === 'confirmNS') {
    const items = northStarConditions();
    Align.northStar || 0;
    Store.write('fh.northstar', { items, signature:items.map(i => i.id).join(','), at:new Date().toISOString() });
    notify('North star confirmed. It will never be rewritten without telling you.'); route(); return;
  }
  if (b.id === 'editHeading') {
    inlineForm(b.closest('.block'), 'Your current heading', [
      { name:'heading', label:'One sentence, in your words', long:true, required:true },
    ], d => { Store.write('fh.heading', d.heading); notify('Heading saved.'); route(); });
    return;
  }
  if (b.dataset.addPriority) {
    const band = b.dataset.addPriority;
    inlineForm(b.closest('.priority-band'), 'Add a priority',
      [{ name:'name', label:'What is it?', required:true }], d => {
        const pr = Align.priorities(); pr[band].push(d.name); Align.setPriorities(pr); route();
      });
    return;
  }
  if (b.dataset.dropPriority) {
    const [band, name] = b.dataset.dropPriority.split('|');
    const pr = Align.priorities(); pr[band] = pr[band].filter(x => x !== name); Align.setPriorities(pr); route(); return;
  }
  if (b.dataset.quickPriority) {
    const pr = Align.priorities();
    const band = pr.primary.length < 3 ? 'primary' : pr.secondary.length < 3 ? 'secondary' : 'maintain';
    if (!pr[band].includes(b.dataset.quickPriority)) pr[band].push(b.dataset.quickPriority);
    Align.setPriorities(pr); notify(`Added to ${band === 'notNow' ? 'not a focus' : band}.`); route(); return;
  }
  if (b.id === 'newTradeoff') {
    inlineForm(b.closest('.block-head'), 'Record an intentional tradeoff', [
      { name:'less', label:'Accepting less of', required:true },
      { name:'more', label:'In exchange for more', required:true },
      { name:'why',  label:'Why it is worth it right now', long:true },
      { name:'reassess', label:'When to reassess' },
    ], d => {
      const tr = Align.tradeoffs();
      tr.push({ ...d, id:'t' + Date.now().toString(36), temporary:!!d.reassess, done:false, at:new Date().toISOString() });
      Align.setTradeoffs(tr); notify('Recorded as a strategy, not drift.'); route();
    });
    return;
  }
  if (b.dataset.tradeoffDone) {
    const tr = Align.tradeoffs(); const x = tr.find(y => y.id === b.dataset.tradeoffDone);
    if (x) { x.done = !x.done; Align.setTradeoffs(tr); route(); } return;
  }
  if (b.id === 'newGuardrail') {
    inlineForm(b.closest('.view'), 'Add a guardrail',
      [{ name:'text', label:'A short rule you want to remember', long:true, required:true }], d => {
        const m = Store.read('fh.guardrails.mine', []);
        m.push({ id:'gm' + Date.now().toString(36), text:d.text, evidence:[] });
        Store.write('fh.guardrails.mine', m); route();
      });
    return;
  }
  if (b.dataset.deleteGuard) {
    Store.write('fh.guardrails.mine', Store.read('fh.guardrails.mine', []).filter(g => g.id !== b.dataset.deleteGuard));
    route(); return;
  }
  if (b.dataset.leverageExp) {
    const l = LEVERAGE_SEED.find(x => x.id === b.dataset.leverageExp) || leveragePoints()[0];
    if (!l) return;
    const xs = Store.read('fh.experiments', []);
    xs.push({ id:'x' + Date.now().toString(36), title:l.label, why:l.why,
              action:'The smallest version of this you could try in a week.', result:'', at:new Date().toISOString() });
    Store.write('fh.experiments', xs); notify('Added to Experiments — try it and learn more.');
    location.hash = '#/experiments'; return;
  }
  if (b.dataset.check) {
    const [id, val] = b.dataset.check.split('|');
    check.scores[id] = check.scores[id] === val ? '' : val;
    route(); return;
  }
  if (b.id === 'checkReset') { check.scores = {}; check.name = ''; route(); return; }
  if (b.id === 'checkToLab') {
    const k = DECISION_KINDS.find(x => x.id === check.kind) || DECISION_KINDS[0];
    const d = { id:'d' + Date.now().toString(36), kind:k.id, name:check.name || 'Untitled decision',
      at:new Date().toISOString(), criteria:k.criteria.slice(),
      weights:Object.fromEntries(k.criteria.map(c => [c,2])),
      options:[{ name:check.name || 'This option', scores:Object.fromEntries(
        Object.entries(check.scores).map(([c,v]) => [c, v === 'toward' ? 4 : v === 'away' ? 1 : v === 'neutral' ? 3 : 0])) }] };
    Decisions.put(d); notify('Carried into the Decision Lab with what you already marked.');
    location.hash = `#/decisions/${d.id}`; return;
  }
  if (b.id === 'checkToExperiment') {
    const xs = Store.read('fh.experiments', []);
    xs.push({ id:'x' + Date.now().toString(36), title:`Test: ${check.name || 'this direction'}`,
      why:'Settle the needs you could not rate.', action:'', result:'', at:new Date().toISOString() });
    Store.write('fh.experiments', xs); location.hash = '#/experiments'; return;
  }
});

document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset.align)   { Align.setStatus(t.dataset.align, t.value); notify(`Marked “${t.value}”.`); route(); return; }
  if (t.dataset.protect) { Store.write('fh.protect.' + t.dataset.protect, t.checked); return; }
  if (t.dataset.guard)   { Store.write('fh.guard.' + t.dataset.guard, t.checked); return; }
  if (t.id === 'seasonPick') { Store.write('fh.season', t.value); route(); return; }
  if (t.id === 'checkKind')  { check.kind = t.value; return; }
});
document.addEventListener('input', e => { if (e.target.id === 'checkName') check.name = e.target.value; });

document.addEventListener('submit', e => {
  if (e.target.id !== 'checkinForm') return;
  e.preventDefault();
  const f = e.target, rec = { at:new Date().toISOString() };
  CHECKIN_Qs.forEach(q => rec[q.k] = f.elements[q.k].value.trim());
  if (!Object.values(rec).some(v => typeof v === 'string' && v && v !== rec.at)) { notify('Nothing to save yet.'); return; }
  const all = Align.checkins(); all.push(rec); Store.write('fh.checkins', all);
  notify('Bearing recorded.'); location.hash = '#/now';
});

/* ── boot ──────────────────────────────────────────────────────────── */
$('.brand-text em').textContent = 'Reflect · Understand · Align · Design';
$('#footNote').innerHTML =
  `${PROMPTS.length} entries · ${DOC.evidence.length} passages · ${PATTERN_INDEX.length} patterns tracked · ` +
  `${REALMS.flatMap(r => r.areas).length} life areas. <a href="#/data">Your data</a>`;
initTheme();
initScene();
route();
