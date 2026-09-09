'use strict';
// Keep the original content and draft keys. Drafts require an explicit completion decision.
STATUS_LABEL.partial = 'Needs detail';
STATUS_LABEL.unanswered = 'Unanswered';
STATUS_LABEL.drafted = 'Draft saved';
const shortBook = b => ({life:'Life & purpose',relationships:'Relationships',location:'Location'})[b.id];
const linkFor = p => `#/paths/${p.book.id}/${p.module.num}/${p.id}`;
const readLocal = (key, fallback=null) => { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } };
let noticeTimer;
function notify(message) { const el=$('#notice'); el.textContent=message; el.hidden=false; clearTimeout(noticeTimer); noticeTimer=setTimeout(()=>el.hidden=true,5000); }
function putLocal(key, value) { try { localStorage.setItem(key,JSON.stringify(value)); return true; } catch { notify('Could not save in this browser. Keep this page open and download a backup.'); return false; } }
const sessionEdits = new Map();
const storedGet=Drafts.get.bind(Drafts);
Drafts.get=id=>sessionEdits.get(id)||storedGet(id);
Drafts.set=function(id,text,complete=false) {
 const record={text,complete,at:new Date().toISOString()};
 const ok=putLocal(this.key(id),record);
 if(ok)sessionEdits.delete(id);else sessionEdits.set(id,record);
 return ok;
};
const pinned = id => readLocal('fh.pin.'+id,false);
const nextQuestion=()=>PROMPTS.find(p=>pinned(p.id)&&isOpenQ(p)) || PROMPTS.find(p=>effStatus(p)==='drafted') || PROMPTS.find(p=>effStatus(p)==='partial') || PROMPTS.find(isOpenQ);
const homeQuestion=p=>p.id==='L01.9'?'Put your north star into practice.':p.prompt;
const progressText=t=>`${t.answered} answered · ${t.partial} need detail · ${t.unanswered} unanswered${t.drafted?` · ${t.drafted} drafts`:''}`;
const pageHead=(tag,title,description)=>`<header class="page-heading"><span class="eyebrow">${esc(tag)}</span><h1>${esc(title)}</h1><p>${esc(description)}</p></header>`;

evRow=function(ids,label='Read the source') {
 if(!ids?.length)return '';
 return `<div class="ev-row"><span class="ev-label">${esc(label)}</span>${ids.map(id=>`<button class="ev-chip" data-ev="${esc(id)}" title="${esc(EV_BY_ID[id]?.title||id)}">${esc(EV_BY_ID[id]?.title||id)} <span>${esc(id)}</span></button>`).join('')}</div>`;
};
promptCard=function(p) {
 const st=effStatus(p),draft=Drafts.text(p.id);
 return `<a class="question-row" href="${linkFor(p)}"><div><span class="eyebrow">${esc(p.id)}${pinned(p.id)?' · Saved for later':''}</span><h3>${esc(p.prompt)}</h3><p>${esc((draft||p.answer||'Add your first answer.').slice(0,170))}${(draft||p.answer||'').length>170?'…':''}</p></div>${statusPill(st)}<span aria-hidden="true">↗</span></a>`;
};

V.horizon=()=>{
 const t=tally(PROMPTS),last=PROMPT_BY_ID[readLocal('fh.last')],next=last&&isOpenQ(last)?last:nextQuestion();
 return `<section class="view">${pageHead('Your reflection space','A life that feels like yours.','Return to what matters. Give one answer a little more room. Then take it into your life.')}
 <div class="home-feature"><div class="continue-card"><span class="eyebrow">${last===next?'Pick up where you left off':'A place to begin'}</span>${next?`<div class="small muted">${esc(shortBook(next.book))} / ${esc(next.module.title)}</div><h2>${esc(homeQuestion(next))}</h2><p>${effStatus(next)==='partial'?'You already have a starting point. Refine what is still missing.':effStatus(next)==='drafted'?'Your draft is waiting exactly where you left it.':'There is no answer to repeat. Start with what comes to mind.'}</p><a class="btn btn-primary" href="${linkFor(next)}">${last===next?'Continue reflecting':'Open this question'} <span aria-hidden="true">→</span></a>`:'<h2>Your main prompts are answered.</h2><a class="btn" href="#/paths">Revisit your workbooks</a>'}<a class="text-link" href="#/open">Choose a different question</a></div>
 <aside class="anchor-card"><span class="eyebrow">A reminder in your own words</span><blockquote>“The path creates itself when you walk.”</blockquote><p>You can prepare and still leave room for what comes next.</p><button class="text-link" data-ev="E61">Read the full reflection ↗</button></aside></div>
 <section class="section"><div class="section-head"><h2>Your three workbooks</h2><span class="small muted">${t.answered} of ${t.total} main prompts answered</span></div><div class="book-grid">${DOC.books.map((b,i)=>{const c=tally(b.modules.flatMap(m=>m.items.filter(x=>x.kind==='prompt')));return `<a href="#/paths/${b.id}" class="book-card" style="--accent:${accentOf(b)}"><span class="book-number">0${i+1}</span><h3>${esc(shortBook(b))}</h3><p>${esc(b.tag)}</p>${stackBar(c)}<span class="small">${progressText(c)}</span><strong class="text-link">Explore workbook →</strong></a>`;}).join('')}</div><p class="caption">A saved draft stays open until you mark it answered. Supporting ratings and exercises are separate from these totals.</p></section>
 <section class="section"><div class="section-head"><h2>Your north star</h2><a class="text-link" href="#/threads">Explore the patterns →</a></div><p class="muted">Working statements from your conversation. Open one when you need to reconnect with your direction.</p><div class="north-grid">${DOC.northStar.map(n=>`<details class="north-note"><summary>${esc(n.title)}</summary><div>${n.body.map(p=>`<p>${esc(p)}</p>`).join('')}${evRow(n.evidence)}</div></details>`).join('')}</div></section>
 <div class="backup-strip"><div><strong>Your new writing stays in this browser.</strong><p>Download a backup to keep a copy or move your answers to another device.</p></div><a class="btn" href="#/writing">My writing & backups</a></div></section>`;
};

const oldPaths=V.paths;
V.paths=(bookId,modNum,focusId)=>{
 if(focusId&&PROMPT_BY_ID[focusId])return focusView(PROMPT_BY_ID[focusId]);
 const b=BOOK_BY_ID[bookId];
 if(!b)return `<section class="view">${pageHead('Workbooks','Three ways into your life.','Choose the area you want to understand, then work through one section at a time.')}<div class="book-grid">${DOC.books.map(b=>`<a class="book-card" href="#/paths/${b.id}" style="--accent:${accentOf(b)}"><h2>${esc(shortBook(b))}</h2><p>${esc(b.tag)}</p><span>${b.modules.length} sections</span><strong class="text-link">Open workbook →</strong></a>`).join('')}</div></section>`;
 const m=b.modules.find(m=>m.num===modNum);
 return `<section class="view"><a class="text-link" href="#/paths">← All workbooks</a>${pageHead(shortBook(b),m?m.title:b.title,m?'Read an existing answer or open a question to reflect.':b.tag)}${m?`<div class="section-switch"><label for="moduleSelect">Section</label><select id="moduleSelect" data-book="${b.id}">${b.modules.map(x=>`<option value="${x.num}"${x===m?' selected':''}>${esc(x.num+' '+x.title)}</option>`).join('')}</select><a class="text-link" href="#/paths/${b.id}">All sections</a></div><div class="question-list">${m.items.map(it=>it.kind==='prompt'?promptCard(it):inventoryCard(it)).join('')}</div>`:`<div class="module-grid">${b.modules.map(m=>{const t=tally(m.items.filter(x=>x.kind==='prompt'));return `<a class="module-tile" href="#/paths/${b.id}/${m.num}"><span class="eyebrow">Section ${m.num}</span><h3>${esc(m.title)}</h3><p>${t.total?progressText(t):'Supporting exercise · open fields'}</p>${t.total?stackBar(t):''}</a>`;}).join('')}</div>`}</section>`;
};

function focusView(p){
 const peers=p.module.items.filter(x=>x.kind==='prompt'),index=peers.indexOf(p),d=Drafts.get(p.id);
 putLocal('fh.last',p.id);
 return `<section class="view focus-view"><nav class="breadcrumbs" aria-label="Breadcrumb"><a href="#/paths/${p.book.id}">${esc(shortBook(p.book))}</a><span>/</span><a href="#/paths/${p.book.id}/${p.module.num}">${esc(p.module.title)}</a><span>/ ${index+1} of ${peers.length}</span></nav><div class="focus-top">${statusPill(effStatus(p))}<button class="btn btn-ghost" data-pin="${p.id}" aria-pressed="${pinned(p.id)}">${pinned(p.id)?'Saved for later':'Save for later'}</button></div><h1>${esc(p.prompt)}</h1><p class="caption">${p.id} · Original workbook question</p>
 <div class="reflection-layout"><div class="writing-column">${p.status!=='unanswered'?`<section class="existing-answer"><span class="eyebrow">Your answer so far</span><p>${esc(p.answer)}</p><span class="caption">Assembled from your conversation; the original wording is in the sources.</span></section>`:`<p class="question-guidance"><strong>A starting point</strong><br>${esc(p.answer||'Write what feels true to you now.')}</p>`}
 <section class="writing-panel"><label for="reflection">${p.status==='unanswered'?'Your answer':'Your additions & refinements'}</label><p class="caption">Keep the existing answer above. Add what has changed or what is still missing.</p><textarea id="reflection" data-reflection="${p.id}" placeholder="Start where you are. Your wording belongs here.">${esc(d?.text||'')}</textarea><div class="editor-meta"><span id="saveState" role="status">${d?'Saved in this browser':'Auto-saves as you write'}</span><span id="wordCount">${wordCount(d?.text||'')} words</span></div><div class="editor-actions"><button class="btn btn-primary" data-complete="${p.id}">${effStatus(p)==='answered'?'Keep answer updated':'Mark answered'}</button>${d?.complete?`<button class="btn" data-reopen="${p.id}">Reopen as draft</button>`:''}<button class="btn btn-ghost" data-save-draft="${p.id}">Save draft</button></div><p class="caption">Only mark answered when you feel the main question is covered.</p></section>
 <nav class="question-nav" aria-label="Questions">${peers[index-1]?`<a class="btn" href="${linkFor(peers[index-1])}">← Previous</a>`:'<span></span>'}${peers[index+1]?`<a class="btn" href="${linkFor(peers[index+1])}">Next question →</a>`:`<a class="btn" href="#/open">Back to open questions →</a>`}</nav></div>
 <aside class="reflection-aside"><h2>Your words, in context</h2><p>Revisit a memory or example without leaving this question.</p>${evRow(p.evidence,'Source passages')||'<p class="caption">No source passage is mapped to this question yet.</p>'}<details><summary>What does this status mean?</summary><p>Answered: the main question is covered. Needs detail: an existing answer still needs refinement. Draft saved: you have written here but have not marked it answered.</p></details><a class="text-link" href="#/writing">Back up your writing →</a></aside></div></section>`;
}
const wordCount=t=>t.trim()?t.trim().split(/\s+/).length:0;

let queueLimit=18;
function queueItems(){return PROMPTS.filter(p=>isOpenQ(p)&&(openState.book==='all'||p.book.id===openState.book)&&(openState.status==='all'||effStatus(p)===openState.status)&&(p.id+' '+p.prompt+' '+p.answer+' '+Drafts.text(p.id)+' '+p.module.title).toLowerCase().includes(openState.q.toLowerCase()));}
openList=function(){const list=queueItems();return `<p class="result-count" role="status">${list.length} matching questions</p>${list.length?list.slice(0,queueLimit).map(promptCard).join(''):'<div class="empty">No questions match these filters. Choose another status or clear your search.</div>'}${list.length>queueLimit?`<button class="btn load-more" id="moreQuestions">Show 18 more (${list.length-queueLimit} remaining)</button>`:''}`;};
V.open=()=>`<section class="view">${pageHead('Continue your discovery','One question at a time.','Refine an answer that is already here, start a new one, or return to a saved draft.')}<div class="queue-toolbar"><label>Workbook<select id="queueBook"><option value="all">All workbooks</option>${DOC.books.map(b=>`<option value="${b.id}"${openState.book===b.id?' selected':''}>${esc(shortBook(b))}</option>`).join('')}</select></label><label>Status<select id="queueStatus">${[['all','All open questions'],['partial','Needs detail'],['unanswered','Unanswered'],['drafted','Draft saved']].map(([v,l])=>`<option value="${v}"${openState.status===v?' selected':''}>${l}</option>`).join('')}</select></label><label class="queue-search">Search<input id="openSearch" type="search" placeholder="A topic, question, or phrase…" value="${esc(openState.q)}"></label></div><div id="openResults" class="question-list">${openList()}</div><details class="supporting"><summary>Supporting exercises & deliberately deferred questions</summary><p>These are separate from the main-prompt count. Ratings, costs, dates, and experiments still need your input in the workbooks.</p>${DOC.supporting.map(s=>`<p>${esc(s)}</p>`).join('')}${DOC.deferred.map(d=>`<p>${esc(d.text)}</p>`).join('')}</details></section>`;

V.writing=()=>{
 const ds=Drafts.all().sort((a,b)=>(b.at||'').localeCompare(a.at||''));const pins=PROMPTS.filter(p=>pinned(p.id));
 return `<section class="view">${pageHead('Your writing','Keep what you are discovering.','Your writing is stored on this device, in this browser. It is not synced to the website or other devices.')}<div class="backup-strip"><div><strong>Take a copy with you</strong><p>A backup restores your writing and completion choices. Markdown gives you a readable document.</p></div><div class="backup-actions"><button class="btn btn-primary" id="backupWriting">Download backup</button><button class="btn" id="exportBtn"${ds.length?'':' disabled'}>Export Markdown</button><label class="btn import-label">Restore backup<input id="importWriting" type="file" accept=".json,application/json"></label></div></div><h2 class="section-title">My writing <span class="muted">${ds.length}</span></h2><div class="question-list">${ds.length?ds.map(d=>promptCard(d.prompt)).join(''):'<p class="empty">Your first reflection will appear here. <a class="text-link" href="#/open">Choose a question →</a></p>'}</div><h2 class="section-title">Saved for later <span class="muted">${pins.length}</span></h2><div class="question-list">${pins.length?pins.map(promptCard).join(''):'<p class="muted">Use “Save for later” on any question to keep it here.</p>'}</div></section>`;
};

// Render only the active workspace, keeping deep links from the original site valid.
removeEventListener('hashchange',route);
route=function(){
 const parts=(location.hash.replace(/^#\/?/,'')||'horizon').split('/').filter(Boolean),v=parts[0];
 $('#main').innerHTML=v==='paths'?V.paths(...parts.slice(1)):v==='conversation'?V.conversation(parts[1]):v==='evidence'?V.evidence(parts[1]):(V[v]||V.horizon)();
 $$('#nav a').forEach(a=>{const yes=a.dataset.view===v||v==='horizon'&&a.dataset.view==='horizon';a.classList.toggle('active',yes);if(yes)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
 // Replace the decorative constellation with direct, readable theme navigation.
 if(v==='threads'&&$('#constellation')){const c=$('#constellation');c.className='theme-index';c.innerHTML=DOC.themes.map((t,i)=>`<button class="chip" data-theme-jump="${i}">${esc(t.title)}</button>`).join('');c.previousElementSibling.querySelector('h2').textContent='Find a theme';c.previousElementSibling.querySelector('p').textContent='Choose a theme to read the reflection and its sources.';}
 scrollTo({top:0,behavior:'auto'});$('#main').focus({preventScroll:true});
 document.title=(v==='paths'&&parts[3]?PROMPT_BY_ID[parts[3]]?.prompt:({horizon:'Today',open:'Open questions',writing:'My writing',paths:'Workbooks',threads:'Patterns',evidence:'Source library',conversation:'Conversation'})[v]||'Today')+' · Fulfillment & Meaning';
};
addEventListener('hashchange',route);
drawConstellation=function(){};

function saveEditor(complete){const area=$('#reflection');if(!area)return false;const id=area.dataset.reflection;if(complete&&!area.value.trim()&&PROMPT_BY_ID[id].status!=='answered'){notify('Add your answer or refinement before marking this complete.');area.focus();return false;}const ok=Drafts.set(id,area.value,complete);$('#saveState').textContent=ok?'Saved in this browser':'Not saved to browser — download a backup';return ok;}
document.addEventListener('input',e=>{
 if(e.target.id==='reflection'){const ok=saveEditor(false);$('#wordCount').textContent=wordCount(e.target.value)+' words';const pill=$('.focus-top .status'),st=effStatus(PROMPT_BY_ID[e.target.dataset.reflection]);if(pill){pill.className='status '+st;pill.textContent=ok?STATUS_LABEL[st]:'Not saved';}}
});
document.addEventListener('change',async e=>{
 if(e.target.id==='moduleSelect')location.hash=`#/paths/${e.target.dataset.book}/${e.target.value}`;
 if(e.target.id==='queueBook'||e.target.id==='queueStatus'){openState[e.target.id==='queueBook'?'book':'status']=e.target.value;queueLimit=18;$('#openResults').innerHTML=openList();}
 if(e.target.id==='importWriting'){
  try{const f=e.target.files[0];if(!f)return;if(f.size>5000000)throw Error('Backup is too large.');const data=JSON.parse(await f.text());if(data.format!=='fulfillment-writing'||data.version!==1||!Array.isArray(data.answers))throw Error('Choose a Fulfillment backup file.');
   const valid=data.answers.every(d=>d&&PROMPT_BY_ID[d.id]&&typeof d.text==='string'&&d.text.length<=200000&&typeof d.complete==='boolean'&&typeof d.at==='string'&&Number.isFinite(Date.parse(d.at)));
   if(!valid)throw Error('This backup contains invalid answers. No answers were imported.');
   let count=0,failed=0;for(const d of data.answers){const old=Drafts.get(d.id);if(!old||Date.parse(d.at)>Date.parse(old.at||0)){if(putLocal(Drafts.key(d.id),{text:d.text,complete:d.complete,at:d.at}))count++;else failed++;}}
   if(Array.isArray(data.pinned))data.pinned.filter(id=>PROMPT_BY_ID[id]).forEach(id=>putLocal('fh.pin.'+id,true));
   route();notify(`${count} answers restored. ${failed?failed+' could not be saved.':'Newer writing on this device was kept.'}`);
  }catch(err){notify(err.message);}finally{e.target.value='';}
 }
});
function download(name,type,text){const u=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.dataset.complete&&saveEditor(true)){route();notify('Marked answered. Your progress is updated.');}
 if(b.dataset.reopen&&saveEditor(false)){route();notify('Reopened as a draft.');}
 if(b.dataset.saveDraft&&saveEditor(false)){route();notify('Draft saved. It stays in your open questions.');}
 if(b.dataset.pin){const id=b.dataset.pin;if(putLocal('fh.pin.'+id,!pinned(id))){b.textContent=pinned(id)?'Saved for later':'Save for later';b.setAttribute('aria-pressed',String(pinned(id)));}}
 if(b.id==='moreQuestions'){queueLimit+=18;$('#openResults').innerHTML=openList();}
 if(b.dataset.themeJump){$('#theme-'+b.dataset.themeJump)?.scrollIntoView({block:'start',behavior:REDUCED?'auto':'smooth'});}
 if(b.id==='backupWriting'){const answers=PROMPTS.map(p=>({id:p.id,...Drafts.get(p.id)})).filter(d=>typeof d.text==='string');download(`fulfillment-backup-${new Date().toISOString().slice(0,10)}.json`,'application/json',JSON.stringify({format:'fulfillment-writing',version:1,answers,pinned:PROMPTS.filter(p=>pinned(p.id)).map(p=>p.id)},null,2));notify('Backup downloaded.');}
});

// Accessible overlays: move focus in, contain it, and return it on close.
let overlayReturn;
const originalDrawer=openDrawer,originalCloseDrawer=closeDrawer,originalPalette=openPalette,originalClosePalette=closePalette;
openDrawer=function(id){overlayReturn=document.activeElement;originalDrawer(id);$('#drawer').setAttribute('role','dialog');$('#drawer').setAttribute('aria-modal','true');$('#drawerClose').focus();};
closeDrawer=function(){originalCloseDrawer();overlayReturn?.focus?.();};
openPalette=function(){overlayReturn=document.activeElement;buildPaletteIndex();originalPalette();$('.palette').setAttribute('aria-modal','true');};
closePalette=function(){originalClosePalette();overlayReturn?.focus?.();};
document.addEventListener('keydown',e=>{if(e.key!=='Tab')return;const box=!$('#drawer').hidden?$('#drawer'):!$('#paletteScrim').hidden?$('.palette'):null;if(!box)return;const els=$$('button,input,a[href],textarea,select',box).filter(x=>!x.disabled);const first=els[0],last=els.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}});
const oldIndex=buildPaletteIndex;
buildPaletteIndex=function(){oldIndex();paletteIndex.forEach(x=>{if(x.kind==='Prompt')x.hay+=' '+Drafts.text(x.tag).toLowerCase();});};

const navLabels={horizon:'Today',paths:'Workbooks',threads:'Patterns',evidence:'Source library',conversation:'Conversation',open:'Open questions'};
$$('#nav a').forEach(a=>a.textContent=navLabels[a.dataset.view]);
$('#nav').insertAdjacentHTML('beforeend','<a href="#/writing" data-view="writing">My writing & backups</a>');
$('.brand-text em').textContent='A space to become yourself';
$('#footNote').innerHTML=`${PROMPTS.length} original prompts · ${DOC.evidence.length} source passages. <a href="#/writing">Your writing & backups</a><details><summary>About the source material</summary>${DOC.howto.map(p=>`<p>${esc(p)}</p>`).join('')}<p>${DOC.sources.map(esc).join(' · ')}</p></details>`;
initTheme();buildPaletteIndex();route();
