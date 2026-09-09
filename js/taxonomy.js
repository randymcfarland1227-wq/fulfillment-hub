/* =====================================================================
 *  TAXONOMY — the knowledge layer
 *
 *  Everything here is editorial: how this person's material is organised,
 *  and which words to look for when detecting a pattern. Nothing here
 *  invents content. Every mapping points at material that already exists
 *  in data.js, so any claim the interface makes can be traced back.
 * ===================================================================== */
'use strict';

/* ── LIFE MAP ──────────────────────────────────────────────────────────
 * Five realms, twenty-two areas. Every one of the 40 chapters appears
 * exactly once (verified at boot). Areas with no chapter are still real —
 * they are carried by testimony and by the creed.                       */

const REALMS = [
  { id:'self', name:'Self', blurb:'Who I am when nothing is being performed.', areas:[
    { id:'identity',     name:'Identity',     chapters:['life/06'], evidence:['E26','E37','E49','E50'],
      question:'Who am I, underneath the roles?' },
    { id:'values',       name:'Values',       chapters:['life/01','life/05','life/13','life/15'], evidence:['E14','E33','E61'],
      question:'What do I actually hold to be worth it?' },
    { id:'authenticity', name:'Authenticity', chapters:['life/03','life/17'], evidence:['E23','E24','E59'],
      question:'Where do I stop being myself?' },
    { id:'growth',       name:'Growth',       chapters:['life/07'], evidence:['E35','E39','E50'],
      question:'Who am I becoming?' },
    { id:'vitality',     name:'Vitality',     chapters:['life/02','life/14'], evidence:['E05','E10','E35','E47'],
      question:'What makes me feel alive, and what flattens me?' },
  ]},
  { id:'connection', name:'Connection', blurb:'The people I can stay myself among.', areas:[
    { id:'friendship',  name:'Friendship',  chapters:['relationships/04','relationships/09'], evidence:['E22','E56'],
      question:'What do I want friendship to be?' },
    { id:'romance',     name:'Romance',     chapters:['relationships/05'], evidence:['E14','E17','E55'],
      question:'What does love have to reach in me?' },
    { id:'family',      name:'Family',      chapters:['relationships/06'], evidence:['E03','E16','E18','E54'],
      question:'What can I give, and what must I stop giving?' },
    { id:'community',   name:'Community',   chapters:['relationships/07','relationships/08'], evidence:['E04','E44','E61'],
      question:'What am I willing to build for other people?' },
    { id:'belonging',   name:'Belonging',   chapters:['relationships/01','relationships/02','relationships/03','relationships/10','relationships/11'], evidence:['E02','E31'],
      question:'Where do I not have to explain myself?' },
  ]},
  { id:'expression', name:'Expression', blurb:'What I make, and what it is for.', areas:[
    { id:'creativity',   name:'Creativity',   chapters:['life/08'], evidence:['E13','E15','E27','E36','E57','E60'],
      question:'What do I need to make?' },
    { id:'purpose',      name:'Purpose',      chapters:['life/16','life/18'], evidence:['E01','E12','E25'],
      question:'What is my effort for?' },
    { id:'work',         name:'Work',         chapters:['location/06'], evidence:['E32','E42','E58'],
      question:'What kind of work fits me?' },
    { id:'contribution', name:'Contribution', chapters:[], evidence:['E20','E33','E37','E48'],
      question:'What do I want to leave behind in other people?' },
  ]},
  { id:'environment', name:'Environment', blurb:'The conditions a place has to meet.', areas:[
    { id:'home',      name:'Home',            chapters:['location/07'], evidence:['E08','E09','E21','E46'],
      question:'What does home have to give me?' },
    { id:'location',  name:'Location',        chapters:['location/01','location/02','location/08','location/09','location/10','location/11'], evidence:['E30'],
      question:'Where can this life actually happen?' },
    { id:'nature',    name:'Nature & Beauty', chapters:['location/04'], evidence:['E21','E30','E48','E53'],
      question:'What do I need to be surrounded by?' },
    { id:'culture',   name:'Culture',         chapters:['location/05'], evidence:['E04','E29','E43'],
      question:'What kind of world do I want around me?' },
    { id:'lifestyle', name:'Lifestyle',       chapters:['life/10','life/12','location/03'], evidence:['E06','E19','E45','E47'],
      question:'What does an ordinary day look like?' },
    { id:'means',     name:'Money & Security',chapters:['life/09'], evidence:['E06','E07','E20'],
      question:'What does enough actually mean?' },
  ]},
  { id:'future', name:'Future', blurb:'What I am walking toward.', areas:[
    { id:'aspirations', name:'Aspirations', chapters:['life/04','life/11'], evidence:['E07','E20','E44','E45','E52'],
      question:'What am I actually reaching for?' },
    { id:'adventure',   name:'Adventure',   chapters:[], evidence:['E11','E30','E38','E52'],
      question:'How much of the unknown do I want?' },
    { id:'legacy',      name:'Legacy',      chapters:[], evidence:['E37','E49','E51','E53','E54'],
      question:'What do I want to have been?' },
  ]},
];

/* ── PATTERN ATLAS ─────────────────────────────────────────────────────
 * Each need he named in Core Needs (L05) becomes a pattern. `words` are
 * the terms scanned for across every reflection and every passage — a
 * detection, never an interpretation. `seed` is the prompt where he
 * described the need in his own words.                                  */

const PATTERNS = [
  { id:'autonomy',   name:'Autonomy',        seed:'L05.5',  words:['autonomy','autonomous','independent','independence','my own place','on my own','control','decide for myself','freedom','free to','my own way'] },
  { id:'security',   name:'Financial Security', seed:'L05.6', words:['money','financial','finances','rent','bills','savings','saving','debt','paycheck','afford','cost','income','budget','secure'] },
  { id:'creativity', name:'Creativity',      seed:'L05.7',  words:['creative','creativity','create','creating','music','musical','sound','song','sing','singing','artistic','produce','production','imagination','compose'] },
  { id:'beauty',     name:'Beauty',          seed:'L05.8',  words:['beauty','beautiful','aesthetic','aesthetics','stained glass','sunlight','decorate','decorating','foliage','pretty','opulent','lovely'] },
  { id:'adventure',  name:'Adventure',       seed:'L05.9',  words:['adventure','adventurous','travel','traveling','explore','exploring','backpack','new city','surprise','wander','somewhere new'] },
  { id:'stability',  name:'Stability',       seed:'L05.10', words:['stable','stability','foundation','steady','predictable','reliable','grounded','settled','consistent'] },
  { id:'belonging',  name:'Belonging',       seed:'L05.11', words:['belong','belonging','community','village','friends','friendship','connection','connected','together','my people'] },
  { id:'intimacy',   name:'Intimacy',        seed:'L05.12', words:['intimacy','intimate','romance','romantic','partner','love','loved','close','closeness','affection','seen','tenderness'] },
  { id:'recognition',name:'Recognition',     seed:'L05.13', words:['recognition','recognized','praise','validate','validation','admired','known for','credit','seen for'] },
  { id:'mastery',    name:'Mastery',         seed:'L05.14', words:['master','mastery','skill','skills','toolkit','craft','practice','good at','competent','learn to','technique'] },
  { id:'contribution',name:'Contribution',   seed:'L05.15', words:['contribute','contribution','helping','give back','make a difference','serve','generous','look after'] },
  { id:'play',       name:'Play',            seed:'L05.16', words:['play','playful','fun','laugh','laughter','toys','celebrate','celebration','joy','silly','dance'] },
  { id:'learning',   name:'Learning',        seed:'L05.17', words:['learn','learning','curious','curiosity','research','study','figure out','teach myself'] },
  { id:'novelty',    name:'Novelty',         seed:'L05.18', words:['novelty','something new','new city','fresh','surprise','unfamiliar','never done','first time'] },
  { id:'peace',      name:'Peace',           seed:'L05.19', words:['peace','peaceful','calm','rested','quiet','unbothered','restore','restful','at ease'] },
  { id:'expression', name:'Self-Expression', seed:'L05.20', words:['express','expression','individuality','individual','my voice','my style','authentic','unique','eccentric','my own way'] },
  { id:'body',       name:'Physical Vitality',seed:'L05.21',words:['gym','body','health','healthy','strength','workout','sleep','vitality','physically','fitness'] },
  { id:'meaning',    name:'Spiritual Meaning',seed:'L05.22',words:['spiritual','divine','soul','something larger','sacred','wonder','connected to something'] },
];

/* ── PERSONAL DEFINITIONS ──────────────────────────────────────────────
 * Words that mean something specific to him. `sources` are the entries
 * and passages where he says what he means.                             */

const DEFINITIONS = [
  { word:'Home',         prompts:['L04.6','C07.9','C07.10'], evidence:['E08','E09','E21','E46'] },
  { word:'Freedom',      prompts:['L05.5','L03.19'],         evidence:['E08','E23','E33'] },
  { word:'Success',      prompts:['L04.12','L03.21'],        evidence:['E11','E26','E42'] },
  { word:'Love',         prompts:['L05.12'],                 evidence:['E17','E22','E55'] },
  { word:'Belonging',    prompts:['L05.11','R02.12'],        evidence:['E04','E31','E56'] },
  { word:'Purpose',      prompts:['L01.19','L16.5'],         evidence:['E01','E12','E25'] },
  { word:'Independence', prompts:['L04.6','L03.19'],         evidence:['E08','E09'] },
  { word:'Adventure',    prompts:['L05.9','L04.10'],         evidence:['E11','E30','E38'] },
  { word:'Stability',    prompts:['L05.10','L04.5'],         evidence:['E06','E12','E40'] },
  { word:'Beauty',       prompts:['L05.8','L04.13'],         evidence:['E21','E30','E53'] },
  { word:'Enough',       prompts:['L09.9'],                  evidence:['E06','E07'] },
  { word:'Family',       prompts:['R06.6'],                  evidence:['E03','E16','E54'] },
  { word:'Rest',         prompts:['L05.19'],                 evidence:['E40','E47','E61'] },
  { word:'Play',         prompts:['L05.16'],                 evidence:['E21','E43','E45'] },
];

/* ── NON-NEGOTIABLES ───────────────────────────────────────────────────
 * Candidates only. They are surfaced from the entries where he says what
 * he will not trade, and stay unrated until he rates them himself —
 * frequency is not the same thing as essential.                         */

const NON_NEGOTIABLE_SOURCES = [
  { domain:'Self',          prompts:['L03.19','L03.22','L15.18'], evidence:['E23','E33','E16'] },
  { domain:'Home',          prompts:['L04.6','C07.13'],           evidence:['E08','E09'] },
  { domain:'Relationships', prompts:['R04.14','R05.14','R06.15'], evidence:['E14','E16','E56'] },
  { domain:'Work',          prompts:['C06.14','L04.7'],           evidence:['E32','E42'] },
  { domain:'Place',         prompts:['C11.13','C08.13'],          evidence:['E30'] },
];

/* ── IDEAL LIFE BLUEPRINT ──────────────────────────────────────────────
 * Fourteen standing questions, each answered only out of material that
 * already exists. Nothing here is generated prose.                      */

const BLUEPRINT = [
  { title:'How I Want to Live',       northStar:'My way of living', prompts:['L01.20','L01.21','L01.22'], evidence:['E09','E45'] },
  { title:'Where I Thrive',           prompts:['C11.18','C02.13'],  evidence:['E30','E08'] },
  { title:'How I Want to Work',       prompts:['L04.7','L08.19','C06.14'], evidence:['E32','E42','E58'] },
  { title:'Who I Want Around Me',     northStar:'My relationships', prompts:['R04.14','R05.13'], evidence:['E14','E55','E56'] },
  { title:'What Gives Me Energy',     prompts:['L02.22','L02.23','L02.24'], evidence:['E04','E06','E47'] },
  { title:'What Drains Me',           prompts:['L03.20','L14.19'],  evidence:['E05','E18','E42'] },
  { title:'What I Need Control Over', prompts:['L05.5','L04.6'],    evidence:['E08','E09'] },
  { title:'What I Need Freedom From', prompts:['L03.19','L03.22'],  evidence:['E16','E18','E23'] },
  { title:'What I Want More Of',      prompts:['L01.6','L11.19'],   evidence:['E21','E44','E53'] },
  { title:'What I Want Less Of',      prompts:['L03.21','L17.6'],   evidence:['E11','E42'] },
  { title:'My Foundation',            northStar:'My foundation',    prompts:['L09.9'], evidence:['E06','E46'] },
  { title:'My Work and Voice',        northStar:'My work and voice',prompts:['L04.8'], evidence:['E13','E15','E60'] },
  { title:'My Contribution',          northStar:'My contribution',  prompts:['L04.11'], evidence:['E20','E33'] },
  { title:'My Current Direction',     prompts:['L18.21','R11.16','C11.18'], evidence:['E01','E52'] },
];

/* ── DECISION LAB ──────────────────────────────────────────────────────
 * Criteria are drawn from needs he already named, so he never has to
 * reinvent what matters. Each carries the entry it came from.           */

const DECISION_KINDS = [
  { id:'city',        name:'A City',            criteria:['autonomy','security','beauty','belonging','adventure','culture','nature','work','means'] },
  { id:'home',        name:'A Home',            criteria:['autonomy','beauty','peace','security','nature','means'] },
  { id:'job',         name:'A Job or Career',   criteria:['autonomy','security','creativity','mastery','recognition','contribution','means'] },
  { id:'relationship',name:'A Relationship',    criteria:['intimacy','expression','belonging','peace','contribution'] },
  { id:'commitment',  name:'A Major Commitment',criteria:['autonomy','stability','adventure','meaning','security'] },
];

/* extra criteria that are not Core Needs but matter to specific decisions */
const EXTRA_CRITERIA = {
  culture: { name:'Culture & Scene',  prompts:['C05.10'], evidence:['E04','E43'] },
  nature:  { name:'Nature Access',    prompts:['C04.10'], evidence:['E30','E48'] },
  work:    { name:'Work Access',      prompts:['C06.13'], evidence:['E32'] },
  means:   { name:'Cost of Living',   prompts:['C06.16'], evidence:['E06','E07'] },
};

/* ── ASK MY LIFE ───────────────────────────────────────────────────────
 * Concept expansion, so searching one word finds the way he actually
 * says it. This is a thesaurus, not a model.                            */

const CONCEPTS = {
  independence:['living alone','my own place','autonomy','control','decide for myself','privacy','on my own'],
  home:['apartment','living alone','my own space','decorate','rent','neighborhood','house'],
  work:['job','career','role','employer','office','nine to five','paycheck'],
  money:['financial','rent','bills','savings','debt','paycheck','afford','cost','budget'],
  love:['romance','partner','intimacy','affection','loved','relationship'],
  family:['mom','sister','grandma','dad','twin','rescue','addiction'],
  creativity:['music','sound','singing','voice','production','toolkit','make'],
  rest:['peace','quiet','restore','sleep','calm','recover'],
  fear:['afraid','scared','regret','worry','anxious'],
  beauty:['aesthetic','stained glass','sunlight','foliage','colors','character'],
  moving:['new city','relocate','leave','baltimore','reset','somewhere else'],
  friends:['friendship','community','village','people','connection'],
  purpose:['meaning','why','direction','calling','lasting'],
};

/* ── SESSIONS ──────────────────────────────────────────────────────────
 * Ways in, sized to how much he has in him right now.                   */

const SESSIONS = [
  { id:'quick',    name:'Quick Reflection', count:1,  blurb:'One entry. Five minutes.' },
  { id:'topic',    name:'Explore a Topic',  count:5,  blurb:'Five entries from one area.' },
  { id:'deep',     name:'Deep Session',     count:12, blurb:'A long sitting in one chapter.' },
];

/* ═══════════════════════════════════════════════════════════════════════
   ALIGNMENT LAYER
   Destination is what he said he needs. Current reality is what he said
   about his life as it stands. Everything below is a *candidate* drawn
   from his own words, offered for confirmation — never a verdict.
   ═══════════════════════════════════════════════════════════════════════ */

const ALIGN_STATES = ['Unclear','Strongly Aligned','Aligned','Mostly Aligned','Drifting','Misaligned','Intentionally Misaligned'];
const SEASONS = ['Exploring','Stabilizing','Building','Recovering','Transitioning','Connecting','Creating','Expanding','Reinventing'];
const DRIFT_VERDICTS = ['Unreviewed','Accurate','Partly Accurate','Intentional','Not Relevant','Revisit Later'];

/* Present-tense conditions he described. `conflicts` are the pattern ids
   each one works against; `quote` is his literal wording. */
const CURRENT_REALITY = [
  { id:'housing', label:'The family house in Baltimore',
    quote:'my current living situation withholds me from having romance or connections or friendship',
    evidence:['E02','E03','E08'], prompts:['R03.11','C01.9'],
    conflicts:['autonomy','peace','intimacy','belonging','beauty'], strength:'Sustained' },
  { id:'money', label:'Unstable rent, bills and employment',
    quote:'it’s so shaky as to like feeling confident with the rent and the bills and my stuff',
    evidence:['E02','E06','E07'], prompts:['L09.9','C06.14'],
    conflicts:['security','stability','adventure','autonomy'], strength:'Sustained' },
  { id:'family', label:'Open-ended responsibility for family',
    quote:'making decisions out of being an altruistic person of responsibility and inevitably… leading to my demise',
    evidence:['E03','E16','E18'], prompts:['R06.15','L03.19'],
    conflicts:['peace','autonomy','contribution'], strength:'Sustained' },
  { id:'creative', label:'No protected space for the music',
    quote:'I would regret never sharing it while young',
    evidence:['E13','E15','E60'], prompts:['L08.19','L04.8'],
    conflicts:['creativity','expression','mastery'], strength:'Emerging' },
  { id:'work', label:'Work that does not fit',
    quote:'seeing people who have lived their whole lives… accepting defeat',
    evidence:['E32','E42','E05'], prompts:['C06.14','L04.7'],
    conflicts:['mastery','expression','security'], strength:'Emerging' },
];

/* Conditions that already work. The system must never imply everything
   needs optimising. */
const PROTECT_SEED = [
  { id:'taste',     label:'Trust in my own taste',            evidence:['E19','E58','E59'], areas:['identity','creativity'] },
  { id:'system',    label:'The Wednesday money system',       evidence:['E06'],             areas:['means','lifestyle'] },
  { id:'body',      label:'The gym habit, and what it proved',evidence:['E35','E47'],       areas:['vitality','growth'] },
  { id:'connector', label:'Being the person who connects people', evidence:['E04','E44'],   areas:['community','belonging'] },
  { id:'voice',     label:'The voice itself',                 evidence:['E13','E27'],       areas:['creativity','expression'] },
  { id:'curiosity', label:'Curiosity as the compass',         evidence:['E61','E39'],       areas:['growth','identity'] },
];

/* Changes likely to move several areas at once. */
const LEVERAGE_SEED = [
  { id:'own-place', label:'Living alone, in my own place',
    areas:['home','identity','creativity','vitality','romance','belonging'], evidence:['E08','E09','E46'],
    difficulty:'High', reversibility:'Low',
    why:'Living alone is named as a need in its own right — privacy, my own food and laundry, quiet reflection — not a stand-in for autonomy.' },
  { id:'relocate', label:'Moving to a city that actually fits',
    areas:['location','culture','community','adventure','work'], evidence:['E08','E30'],
    difficulty:'High', reversibility:'Medium',
    why:'The wish to leave Baltimore and reset appears repeatedly; which city meets the needs is still open.' },
  { id:'income', label:'Stabilising income and restarting the money system',
    areas:['means','home','adventure','aspirations'], evidence:['E06','E07'],
    difficulty:'Medium', reversibility:'High',
    why:'The Wednesday ritual is described as energising in itself, and it is what made the rest feel possible.' },
  { id:'toolkit', label:'Protected weekly time on the musical toolkit',
    areas:['creativity','expression','purpose'], evidence:['E60','E36'],
    difficulty:'Low', reversibility:'High',
    why:'The toolkit is what turns a spark into something finished, and it is the cheapest of these to start.' },
  { id:'finite-help', label:'A finite, written limit on family help',
    areas:['family','vitality','identity'], evidence:['E03','E16','E18'],
    difficulty:'Medium', reversibility:'High',
    why:'“Being more tactical with self-sacrifice” is the lesson drawn in his own words; the limit itself is still undefined.' },
];

/* Lessons he drew himself. Small on purpose. */
const GUARDRAIL_SEED = [
  { id:'g1', text:'Do not trade away all autonomy for stability.',                              evidence:['E08','E12'] },
  { id:'g2', text:'Be tactical with self-sacrifice — open-ended help has cost me every time.',   evidence:['E03','E33'] },
  { id:'g3', text:'Do not make a permanent decision to solve a temporary discomfort.',           evidence:['E39','E52'] },
  { id:'g4', text:'Do not let fear turn into regret.',                                          evidence:['E61','E15'] },
  { id:'g5', text:'Do not confuse being around people with belonging.',                         evidence:['E04','E56'] },
  { id:'g6', text:'Do not stay somewhere only because leaving is intimidating.',                 evidence:['E08','E11'] },
  { id:'g7', text:'Do not postpone happiness until the life is finished — look at the flowers.', evidence:['E48','E61'] },
];

/* Fast decision test — the needs most likely to be moved by a real choice. */
const CHECK_NEEDS = ['autonomy','security','creativity','belonging','intimacy','beauty','adventure','peace','expression','stability'];
