import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { motion, AnimatePresence, useScroll, useSpring, useMotionValue, animate, LayoutGroup } from 'framer-motion';
import htm from 'htm';

const html = htm.bind(React.createElement);
const EASE = [0.16, 1, 0.3, 1];

/* ============================ SERVER BRIDGE ============================ */
/**
 * The panel is a passive cache of `/api/owner/workspace`.
 *  - GET bootstraps every synced key plus session + metrics.
 *  - POST persists one key; the response carries the authoritative rows
 *    (audit columns are added server-side) so the cache stays truthful.
 * Per-device preferences (workspace, theme) never leave this browser.
 */
const NASHE_STORE = {
  data: Object.create(null),
  session: null,
  metrics: null,
  ready: false,
  subs: new Set(),
  sessionSubs: new Set(),
};

async function nasheBootstrap(){
  try{
    const res = await fetch('/api/owner/workspace', { credentials:'same-origin', headers:{ accept:'application/json' } });
    if(res.status === 401){ window.location.replace('/owner-login'); return; }
    const json = await res.json();
    NASHE_STORE.data = Object.assign(Object.create(null), json.localStorageState || {});
    NASHE_STORE.session = json.session || null;
    NASHE_STORE.metrics = json.metrics || null;
  }catch(err){
    console.error('[owner-workspace] bootstrap failed', err);
  }finally{
    NASHE_STORE.ready = true;
    NASHE_STORE.subs.forEach(fn => fn());
    NASHE_STORE.sessionSubs.forEach(fn => fn());
  }
}

function useLocalState(key, initialValue){
  const [value, setValue] = useState(() => {
    try{
      const raw = window.localStorage.getItem(key);
      if(raw !== null) return JSON.parse(raw);
    }catch{ /* fall through */ }
    return typeof initialValue === 'function' ? initialValue() : initialValue;
  });
  useEffect(() => {
    try{ window.localStorage.setItem(key, JSON.stringify(value)); }catch{ /* quota */ }
  }, [key, value]);
  return [value, setValue];
}

function useStoredState(key, initialValue){
  const fallback = () => (typeof initialValue === 'function' ? initialValue() : initialValue);
  // A stored JSON `null` (or a value of the wrong shape) must never blank the
  // page: fall back to the component's own default instead.
  const coerce = (raw) => {
    let parsed = raw;
    if (typeof raw === 'string'){
      try{ parsed = JSON.parse(raw); }catch{ return fallback(); }
    }
    return parsed === null || parsed === undefined ? fallback() : parsed;
  };

  const readInitial = () => {
    if(Object.prototype.hasOwnProperty.call(NASHE_STORE.data, key)){
      return coerce(NASHE_STORE.data[key]);
    }
    return fallback();
  };

  const [value, setValue] = useState(readInitial);

  // What the value was before this component touched it. Used to avoid
  // posting a brand-new key its own default the moment it mounts.
  const baseline = useRef(null);
  if(baseline.current === null){
    try{ baseline.current = JSON.stringify(readInitial()); }catch{ baseline.current = null; }
  }

  // Adopt the server copy whenever it changes (post-hydration refreshes).
  useEffect(() => {
    const adopt = () => {
      if(!NASHE_STORE.ready) return;
      if(!Object.prototype.hasOwnProperty.call(NASHE_STORE.data, key)) return;
      const next = coerce(NASHE_STORE.data[key]);
      setValue((prev) => {
        try{ return JSON.stringify(prev) === JSON.stringify(next) ? prev : next; }catch{ return next; }
      });
    };
    NASHE_STORE.subs.add(adopt);
    adopt();
    return () => { NASHE_STORE.subs.delete(adopt); };
  }, [key]);

  // Persist after a short settle. The cache is updated optimistically so a
  // page remount reads back exactly what was just saved.
  useEffect(() => {
    if(!NASHE_STORE.ready) return;
    let encoded;
    try{ encoded = JSON.stringify(value); }catch{ return; }
    const cached = NASHE_STORE.data[key];
    if(cached === undefined ? encoded === baseline.current : cached === encoded) return;
    const t = window.setTimeout(() => {
      fetch('/api/owner/workspace', {
        method:'POST',
        credentials:'same-origin',
        headers:{ 'content-type':'application/json' },
        body: JSON.stringify({ key, value }),
      })
        .then(r => r.ok ? r.json() : Promise.reject(new Error('HTTP '+r.status)))
        .then(res => {
          if(res && res.ok){
            NASHE_STORE.data[key] = encoded;
            NASHE_STORE.subs.forEach(fn => fn());
          }
        })
        .catch(err => console.error('[owner-workspace] sync failed', key, err));
    }, 450);
    return () => window.clearTimeout(t);
  }, [key, value]);

  return [value, setValue];
}

/** Session + metrics are broadcast to every subscriber once bootstrap lands. */
function useWorkspaceSync(){
  const [, bump] = useState(0);
  useEffect(() => {
    const fn = () => bump(n => n + 1);
    NASHE_STORE.sessionSubs.add(fn);
    return () => { NASHE_STORE.sessionSubs.delete(fn); };
  }, []);
}

function useSession(){
  useWorkspaceSync();
  return NASHE_STORE.session || { owner:null, roster:[], capabilities:[] };
}

function useMetrics(){
  useWorkspaceSync();
  return NASHE_STORE.metrics;
}

/** Task load per founder, counted from the shared task board. */
function useOwnerLoad(roster){
  const [tasks] = useStoredState('nashe:tasks', []);
  return useMemo(() => {
    const list = Array.isArray(tasks) ? tasks : [];
    const open = new Map(), total = new Map();
    for(const t of list){
      const k = t.owner || 'Unassigned';
      total.set(k, (total.get(k)||0)+1);
      if(!t.done) open.set(k, (open.get(k)||0)+1);
    }
    const maxOpen = Math.max(1, ...open.values());
    return roster.map(m => ({
      ...m,
      open: open.get(m.name) || 0,
      total: total.get(m.name) || 0,
      load: Math.round((open.get(m.name) || 0)/maxOpen*100),
    }));
  }, [roster, tasks]);
}

/* ============================== HELPERS ============================== */
const fmt = (v,d) => Number(v||0).toLocaleString('en-US',{minimumFractionDigits:d, maximumFractionDigits:d});
const money = v => '$' + Number(v||0).toLocaleString('en-US',{maximumFractionDigits:0});

function seriesPts(data, w, h, pad){
  if(!data || data.length === 0) return [[pad,h-pad],[w-pad,h-pad]];
  if(data.length === 1) return [[pad,h-pad],[w-pad,h-pad]];
  const max = Math.max(...data, 1) * 1.12;
  const stepX = (w - pad*2)/(data.length-1);
  return data.map((v,i) => [pad + i*stepX, h - pad - (v/max)*(h - pad*2)]);
}
const pathFrom = pts => pts.map((p,i) => (i===0?'M':'L') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ');
const relativeTime = iso => {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return '';
  const seconds = Math.round((Date.now() - t) / 1000);
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return Math.round(seconds/60) + 'm ago';
  if (seconds < 86400) return Math.round(seconds/3600) + 'h ago';
  if (seconds < 604800) return Math.round(seconds/86400) + 'd ago';
  return new Date(t).toLocaleDateString('en-GB',{ day:'numeric', month:'short' });
};

/* ============================== ICONS ============================== */
const IconOverview = () => html`<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>`;
const IconPipeline = () => html`<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h7M4 12h4M4 19h7"/><circle cx="17" cy="5" r="2.2"/><circle cx="13.5" cy="12" r="2.2"/><circle cx="18" cy="19" r="2.2"/></svg>`;
const IconTeam = () => html`<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="8" r="3.2"/><path d="M3.5 19c.6-3 3-4.5 5.5-4.5s4.9 1.5 5.5 4.5"/><circle cx="17" cy="9" r="2.6"/><path d="M16 14.6c2.4.3 4 1.6 4.5 4"/></svg>`;
const IconSparkle = () => html`<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/></svg>`;
const IconChat = () => html`<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H5l-1.5 2v-5.1A7.5 7.5 0 1 1 20 11.5Z"/><path d="M8 11h8M8 14.5h5"/></svg>`;

/* ============================== ATOMS ============================== */
function ScrollProgress(){
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness:140, damping:28 });
  return html`<${motion.div} class="scroll-progress" style=${{ scaleX }}/>`;
}

function MouseGlow(){
  const x = useMotionValue(-700), y = useMotionValue(-700);
  const sx = useSpring(x, { stiffness:70, damping:22 });
  const sy = useSpring(y, { stiffness:70, damping:22 });
  useEffect(() => {
    const h = e => { x.set(e.clientX); y.set(e.clientY); };
    window.addEventListener('mousemove', h);
    return () => window.removeEventListener('mousemove', h);
  }, []);
  return html`<${motion.div} class="mouse-glow" aria-hidden="true" style=${{ x:sx, y:sy }}/>`;
}

function Clock(){
  const [now, setNow] = useState(new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  return html`<span class="clock">${now.toLocaleTimeString('en-GB',{hour12:false})}</span>`;
}

function Counter({ value, decimals }){
  const [v, setV] = useState(0);
  useEffect(() => {
    const c = animate(0, Number(value)||0, { duration:1.1, ease:EASE, onUpdate: x => setV(x) });
    return () => c.stop();
  }, [value]);
  return html`<span>${fmt(v, decimals||0)}</span>`;
}

function Spark({ data, delay }){
  const pts = seriesPts(data, 76, 30, 3);
  return html`
    <svg class="kpi-spark" width="76" height="30" viewBox="0 0 76 30">
      <defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#8b5cf6" stop-opacity=".35"/><stop offset="1" stop-color="#8b5cf6" stop-opacity="0"/>
      </linearGradient></defs>
      <path d="${pathFrom(pts)} L 73 27 L 3 27 Z" fill="url(#sg)" stroke="none"/>
      <${motion.path} d="${pathFrom(pts)}" fill="none" stroke="#a78bfa" stroke-width="1.6" stroke-linecap="round"
        initial=${{ pathLength:0 }} animate=${{ pathLength:1 }} transition=${{ duration:1.4, delay, ease:'easeInOut' }}/>
    </svg>`;
}

const stagger = { show:{ transition:{ staggerChildren:.07, delayChildren:.05 } } };
const rise = { hidden:{ opacity:0, y:24, filter:'blur(6px)' }, show:{ opacity:1, y:0, filter:'blur(0px)', transition:{ duration:.65, ease:EASE } } };

function EmptyState({ title, hint, action, actionLabel }){
  return html`<div class="empty-state" style=${{ textAlign:'center', padding:'34px 18px' }}>
    <b style=${{ display:'block', fontSize:'13px', color:'var(--txt)' }}>${title}</b>
    ${hint && html`<span style=${{ display:'block', marginTop:'6px' }}>${hint}</span>`}
    ${action && html`<button class="btn btn-ghost" style=${{ marginTop:'14px' }} onClick=${action}>${actionLabel}</button>`}
  </div>`;
}

/* ============================== LOADER ============================== */
/**
 * Keeps a single failing page from blanking the whole panel — the shell,
 * navigation and identity stay usable and the founder can reload.
 */
class PanelBoundary extends React.Component {
  constructor(props){ super(props); this.state = { error: null }; }
  static getDerivedStateFromError(error){ return { error }; }
  componentDidCatch(error, info){ console.error('[owner-workspace] render failed', error, info); }
  render(){
    const error = this.state.error;
    if(error){
      return html`<div class="card" style=${{ margin:'40px 0', padding:'48px 24px', textAlign:'center' }}>
        <b style=${{ display:'block', fontSize:'14px', color:'var(--txt)' }}>This view stopped rendering.</b>
        <span style=${{ display:'block', marginTop:'8px', color:'var(--dim)', fontSize:'12px' }}>${String(error && error.message || error)}</span>
        <button class="btn btn-pri" style=${{ marginTop:'18px' }} onClick=${() => window.location.reload()}>Reload the panel</button>
      </div>`;
    }
    return this.props.children;
  }
}

function Loader(){
  const word = 'NASHEMANN';
  return html`
    <${motion.div} class="loader" exit=${{ opacity:0, transition:{ duration:.55, ease:'easeInOut' } }}>
      <div class="loader-inner">
        <div class="loader-word">
          ${word.split('').map((ch,i) => html`
            <${motion.span} key=${i} initial=${{ opacity:0, y:34, filter:'blur(10px)' }}
              animate=${{ opacity:1, y:0, filter:'blur(0px)' }} transition=${{ delay:.06*i, duration:.6, ease:EASE }}>${ch}<//>`)}
        </div>
        <div class="loader-bar"><${motion.div} class="loader-bar-fill" style=${{ height:'100%' }}
          initial=${{ scaleX:0 }} animate=${{ scaleX:1 }} transition=${{ duration:1.25, ease:'easeInOut' }}/></div>
      </div>
    <//>`;
}

/* ============================== NAVIGATION ============================== */
const NAV = [
  { id:'overview', label:'Overview', icon:IconOverview, section:'Workspace' },
  { id:'pipeline', label:'Pipeline', icon:IconPipeline, section:'Workspace' },
  { id:'tasks', label:'Tasks & Goals', icon:IconSparkle, section:'Workspace' },
  { id:'calendar', label:'Calendar & Milestones', icon:IconSparkle, section:'Workspace' },
  { id:'risks', label:'Risks & Incidents', icon:IconSparkle, section:'Workspace' },
  { id:'tech', label:'Tech & Product', icon:IconSparkle, section:'Domains' },
  { id:'marketing', label:'Marketing & Growth', icon:IconSparkle, section:'Domains' },
  { id:'sales', label:'Sales & Clients', icon:IconSparkle, section:'Domains' },
  { id:'vendors', label:'Vendor Operations', icon:IconSparkle, section:'Domains' },
  { id:'customers', label:'Customer Experience', icon:IconSparkle, section:'Domains' },
  { id:'finance', label:'Finance & Accounting', icon:IconSparkle, section:'Finance' },
  { id:'profit', label:'Profit & Reserves', icon:IconSparkle, section:'Finance' },
  { id:'founders', label:'Founders & Ownership', icon:IconTeam, section:'Governance' },
  { id:'decisions', label:'Company Decisions', icon:IconSparkle, section:'Governance' },
  { id:'team', label:'Team', icon:IconTeam, section:'Governance' },
  { id:'chat', label:'Owner Group Chat', icon:IconChat, section:'Collaboration' },
  { id:'reports', label:'Reports & Analytics', icon:IconSparkle, section:'Company' },
  { id:'documents', label:'Documents & Contracts', icon:IconSparkle, section:'Company' },
  { id:'notifications', label:'Notifications & Activity', icon:IconSparkle, section:'Company' },
  { id:'settings', label:'Settings & Permissions', icon:IconSparkle, section:'Company' },
  { id:'features', label:'Platform Feature Requests', icon:IconSparkle, section:'Company' },
];
const NAV_GROUPS = ['Workspace','Domains','Finance','Governance','Collaboration','Company'];

/** Mirrors src/lib/founders/workspaces.ts — keys must stay identical. */
const WORKSPACES = {
  technology:{ label:'Technology', short:'TECH', subtitle:'PRODUCT · ENGINEERING', home:'tech', focus:'Architecture, product delivery, security and platform reliability.', pages:['overview','pipeline','tasks','calendar','risks','tech','team','chat','reports','documents','notifications','settings','features'] },
  finance:{ label:'Finance', short:'FINANCE', subtitle:'CASH · CONTROLS · REPORTING', home:'finance', focus:'Cash position, settlements, pricing controls and reporting.', pages:['overview','tasks','calendar','risks','finance','profit','founders','decisions','chat','reports','documents','notifications','settings','features'] },
  marketing:{ label:'Marketing', short:'GROWTH', subtitle:'CAMPAIGNS · SALES · BRAND', home:'marketing', focus:'Positioning, acquisition, campaigns, vendor growth and pipeline.', pages:['overview','pipeline','tasks','calendar','risks','marketing','sales','vendors','customers','team','chat','reports','documents','notifications','settings','features'] }
};
const PAGE_WORKSPACE = { tech:'technology', finance:'finance', profit:'finance', marketing:'marketing', sales:'marketing', pipeline:'marketing', vendors:'marketing', customers:'marketing' };

/** Pages that belong to one workspace's domain and must not be viewed by other founders. */
const DOMAIN_PAGES = {
  technology: new Set(['tech']),
  finance: new Set(['finance','profit']),
  marketing: new Set(['marketing','sales','vendors','customers']),
};

/** Pages every active founder may see. */
const SHARED_PAGES = new Set(['overview','pipeline','tasks','calendar','risks','team','chat','reports','documents','notifications','settings','features','founders','decisions']);

function accessiblePages(workspace){
  const own = DOMAIN_PAGES[workspace] || new Set();
  return new Set([...SHARED_PAGES, ...own]);
}

function WorkspaceOptions({workspace,setWorkspace}){
  return html`<div class="workspace-switcher" role="group" aria-label="Choose workspace">
    ${Object.entries(WORKSPACES).map(([id,w])=>html`<button key=${id} type="button" class="workspace-option" data-workspace=${id} aria-pressed=${workspace===id} onClick=${()=>setWorkspace(id)}>
      <strong>${w.label}</strong><small>${w.subtitle}</small>
    </button>`)}
  </div>`;
}

function Sidebar({ page, setPage, workspace, setWorkspace, me }){
  const allowed = [...accessiblePages(workspace)];
  const navItems = NAV.filter(n=>allowed.includes(n.id));
  const navGroups = NAV_GROUPS.filter(section=>navItems.some(n=>n.section===section));
  return html`
    <aside class="sidebar">
      <div class="logo">
        <div class="logo-mark">N</div>
        <div><div class="logo-name">Nashemann</div><div class="logo-sub">Co-Founder OS</div></div>
      </div>
      <div class="nav-scroll">
        <${LayoutGroup}>
          ${navGroups.map(section => html`
            <div key=${section} class="nav-group">
              <div class="nav-label">${section}</div>
              ${navItems.filter(n => n.section===section).map(n => html`
                <button key=${n.id} type="button" title=${n.label} aria-current=${page===n.id?'page':undefined} class=${'nav-item' + (page===n.id ? ' active' : '')} onClick=${() => setPage(n.id)}>
                  ${page===n.id && html`<${motion.span} layoutId="nav-pill" class="nav-pill" transition=${{ type:'spring', stiffness:480, damping:38 }}/>`}
                  <${n.icon}/><span class="nav-text">${n.label}</span>
                </button>`)}
            </div>`)}
        <//>
      </div>
      <div class="side-foot">
        <div class="sf-avatar" style=${{ background:'linear-gradient(135deg,'+(me?me.color:'#8b5cf6')+',#3b2a8f)' }}>${me?me.initials:'··'}</div>
        <div><div class="sf-name">${me?me.name:'Founder'}</div><div class="sf-role">${me?me.role:'Owner workspace'}</div></div>
      </div>
    </aside>`;
}

/* ============================== CHART ============================== */
function ChartCard({ series }){
  const W = 600, H = 236, PAD = 42;
  const data = (series||[]).map(p => Number(p.value)||0);
  const labels = (series||[]).map(p => p.label);
  const allPts = seriesPts(data, W, H, PAD);
  const actPts = allPts.slice(0, data.length);
  const projPts = actPts.length ? allPts.slice(Math.max(0, actPts.length - 1)) : [];
  const max = Math.max(...data, 1) * 1.12;
  const gridY = [0,1,2,3].map(i => PAD + i*(H - PAD*2)/3);
  const gridV = [0,1,2,3].map(i => fmt(max*(1 - i/3), 0));
  const hasData = data.some(v => v !== 0);

  if(!actPts.length || !hasData){
    return html`
      <div class="card" style=${{ padding:'22px' }}>
        <div class="card-head"><div class="card-title">Revenue trajectory</div></div>
        <${EmptyState} title="No ledger entries yet."
          hint="Add income or expenses on the Finance page and the revenue trajectory is drawn straight from those records."/>
      </div>`;
  }

  const step = labels.length > 1 ? (W-PAD-14)/(labels.length-1) : 0;
  return html`
    <div class="card" style=${{ padding:'22px 22px 12px' }}>
      <div class="card-head">
        <div class="card-title">Revenue trajectory</div>
        <div class="legend">
          <span><i style=${{ background:'#a78bfa' }}></i>Recorded</span>
        </div>
      </div>
      <svg width="100%" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style=${{ display:'block', overflow:'visible' }}>
        <defs>
          <linearGradient id="areaG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#8b5cf6" stop-opacity=".32"/><stop offset="1" stop-color="#8b5cf6" stop-opacity="0"/>
          </linearGradient>
          <linearGradient id="strokeG" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stop-color="#8b5cf6"/><stop offset="1" stop-color="#22d3ee"/>
          </linearGradient>
        </defs>
        ${gridY.map((y,i) => html`
          <${motion.line} key=${'g'+i} x1=${PAD} x2=${W-10} y1=${y} y2=${y} stroke="rgba(255,255,255,.07)" stroke-dasharray="3 5"
            initial=${{ opacity:0 }} animate=${{ opacity:1 }} transition=${{ delay:.15 + i*.08 }}/>
          <text x=${PAD-10} y=${y+3.5} text-anchor="end" fill="#55556a" font-size="9.5" font-family="JetBrains Mono">${gridV[i]}</text>`)}
        <${motion.path} d="${pathFrom(actPts)} L ${actPts[actPts.length-1][0]} ${H-PAD} L ${PAD} ${H-PAD} Z"
          fill="url(#areaG)" initial=${{ opacity:0 }} animate=${{ opacity:1 }} transition=${{ delay:.7, duration:.9 }}/>
        <${motion.path} d="${pathFrom(actPts)}" fill="none" stroke="url(#strokeG)" stroke-width="2.4" stroke-linecap="round"
          initial=${{ pathLength:0 }} animate=${{ pathLength:1 }} transition=${{ duration:1.6, ease:'easeInOut' }}/>
        <${motion.circle} cx=${actPts[actPts.length-1][0]} cy=${actPts[actPts.length-1][1]} r="4" fill="#a78bfa"
          initial=${{ opacity:0 }} animate=${{ opacity:1 }} transition=${{ delay:1.5 }}/>
        <${motion.circle} cx=${actPts[actPts.length-1][0]} cy=${actPts[actPts.length-1][1]} fill="none" stroke="#a78bfa" stroke-width="1.5"
          initial=${{ opacity:.8, r:4 }} animate=${{ opacity:0, r:18 }} transition=${{ delay:1.6, duration:1.8, repeat:Infinity, repeatDelay:.4, ease:'easeOut' }}/>
        ${labels.map((m,i) => html`
          <text key=${'m'+i} x=${PAD + i*step} y=${H-8} fill="#55556a" font-size="9.5" font-family="JetBrains Mono" text-anchor=${i===labels.length-1?'end':'start'}>${m}</text>`)}
      </svg>
    </div>`;
}

/* ============================== FEED ============================== */
const FEED_CHIPS = [ ['all','All'], ['finance','Finance'], ['product','Product'], ['growth','Growth'], ['ops','Ops'], ['collab','Chat'] ];
const FEED_COLORS = { finance:'#34d399', product:'#8b5cf6', growth:'#22d3ee', ops:'#f472b6', collab:'#fbbf24' };

function FeedCard({ items }){
  const [filter, setFilter] = useState('all');
  const shown = (items||[]).filter(f => filter==='all' || f.category===filter);
  return html`
    <div class="card" id="feed">
      <div class="card-head">
        <div class="card-title">Activity</div>
        <div style=${{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
          ${FEED_CHIPS.map(([id,l]) => html`
            <button key=${id} class=${'chip' + (filter===id?' active':'')} onClick=${() => setFilter(id)}>
              ${id!=='all' && html`<span class="chip-dot" style=${{ background: FEED_COLORS[id] }}/>`}${l}
            </button>`)}
        </div>
      </div>
      ${shown.length === 0
        ? html`<${EmptyState} title=${items&&items.length ? 'Nothing in this filter yet.' : 'No activity recorded yet.'}
            hint="Every change a founder makes to a record shows up here."/>`
        : html`<${AnimatePresence} mode="popLayout" initial=${false}>
            ${shown.map(f => html`
              <${motion.div} key=${f.id} layout initial=${{ opacity:0, y:14 }} animate=${{ opacity:1, y:0 }} exit=${{ opacity:0, scale:.96 }}
                transition=${{ duration:.35, ease:EASE }}>
                <div class="feed-item">
                  <div class="avatar" style=${{ background:'linear-gradient(135deg,'+f.color+',#3b2a8f)' }}>${f.initials}</div>
                  <div class="feed-body"><b>${f.actor}</b> ${f.text}<div class="feed-time">${relativeTime(f.at)}</div></div>
                </div>
              <//>`)}
          <//>`}
    </div>`;
}

/* ============================== OVERVIEW ============================== */
function Overview({ goPipeline, metrics, roster, me, counts }){
  const h = new Date().getHours();
  const daypart = h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening';
  const date = new Date().toLocaleDateString('en-US',{ weekday:'long', month:'long', day:'numeric' });

  const kpis = metrics ? [
    { label:'Net revenue this month', prefix:'$', value:metrics.revenue.thisMonth, decimals:0,
      delta: metrics.revenue.deltaPct==null ? 'no comparison' : (metrics.revenue.deltaPct>0?'+':'')+metrics.revenue.deltaPct+'% MoM',
      spark: metrics.revenue.monthly.map(p=>p.value) },
    { label:'Open tasks', value:counts.openTasks, decimals:0, delta:counts.completedTasks+' completed', spark:null },
    { label:'Open risks', value:counts.openRisks, decimals:0, delta:counts.highSeverityRisks+' high severity', spark:null },
    { label:'Pipeline value', prefix:'$', value:counts.pipelineValue, decimals:0, delta:counts.openLeads+' open leads', spark:null },
  ] : [];

  const donePct = counts.openTasks + counts.completedTasks > 0
    ? Math.round(counts.completedTasks/(counts.openTasks+counts.completedTasks)*100) : 0;

  return html`
    <${motion.div} variants=${stagger} initial="hidden" animate="show">
      <section class="hero">
        <${motion.div} variants=${rise} class="crumb"><span class="live-dot"/>LIVE · ${date}</>
        <${motion.h1}>
          <${motion.span} variants=${rise} class="h1-line">Good ${daypart}${me?', '+me.name.split(' ')[0]:''}.<//>
          <${motion.span} variants=${rise} class="h1-line grad">The whole company. One panel.<//>
        </>
        <${motion.p} variants=${rise}>Every metric, signal and decision the founders record — compressed into a single command surface. Nothing here is a sample.<//>
        <${motion.div} variants=${rise} class="hero-cta">
          <button class="btn btn-pri" onClick=${goPipeline}>Review pipeline ${'→'}</button>
          <button class="btn btn-ghost" onClick=${() => document.getElementById('feed').scrollIntoView({ behavior:'smooth' })}>Recent activity</button>
        <//>
      </section>

      ${metrics && html`
        <section class="kpi-grid">
          ${kpis.map((k,i) => html`
            <${motion.div} key=${k.label} variants=${rise} class="card kpi" whileHover=${{ y:-4 }}>
              <div class="kpi-top"><span class="kpi-label">${k.label}</span><span class="delta up">${k.delta}</span></div>
              <div class="kpi-value">${k.prefix && html`<span class="kpi-prefix">${k.prefix}</span>`}<${Counter} value=${k.value} decimals=${k.decimals}/></div>
              ${k.spark && k.spark.some(v=>v!==0)
                ? html`<${Spark} data=${k.spark} delay=${.5 + i*.1}/>`
                : html`<div class="kpi-label" style=${{ marginTop:'10px' }}>No history yet</div>`}
            <//>`)}
        </section>`}

      <section class="grid-2">
        <${motion.div} variants=${rise}><${ChartCard} series=${metrics?metrics.revenue.monthly:[]}/><//>
        <${motion.div} variants=${rise}><${FeedCard} items=${metrics?metrics.activity:[]}/><//>
      </section>

      <${motion.div} variants=${rise} class="card stack-card">
        <div class="stack-avatars">
          ${roster.map(m => html`<div key=${m.id} class="avatar" title=${m.name} style=${{ background:'linear-gradient(135deg,'+m.color+',#3b2a8f)' }}>${m.initials}</div>`)}
        </div>
        <div class="stack-info">
          <b>${roster.length} founder${roster.length===1?'':'s'}</b>
          <span>${roster.map(m=>m.name).join(' · ') || 'No founders provisioned yet'}</span>
        </div>
        <div class="deepwork"><b>${counts.openTasks}</b><span>open tasks</span></div>
        <div class="deepwork"><b>${donePct}%</b><span>tasks completed</span></div>
      <//>
    <//>`;
}

/* ============================== PIPELINE ============================== */
const EMPTY_BOARD = [
  { id:'idea',  title:'Ideation', color:'#f472b6', cards:[] },
  { id:'build', title:'Building', color:'#8b5cf6', cards:[] },
  { id:'live',  title:'Launched', color:'#34d399', cards:[] },
];

function Column({ col, onAdd, onRemove }){
  const [text, setText] = useState('');
  const submit = () => { if(!text.trim()) return; onAdd(col.id, text.trim()); setText(''); };
  return html`
    <div>
      <div class="col-head">
        <span class="col-title"><span class="col-dot" style=${{ background:col.color, boxShadow:'0 0 10px '+col.color }}/>${col.title}</span>
        <span class="count">${col.cards.length}</span>
      </div>
      ${col.cards.length === 0 && html`<p class="muted-small" style=${{ padding:'10px 2px 14px' }}>Nothing here yet.</p>`}
      <${AnimatePresence} initial=${false}>
        ${col.cards.map(c => html`
          <${motion.div} key=${c.id} layout initial=${{ opacity:0, y:16, scale:.96 }} animate=${{ opacity:1, y:0, scale:1 }}
            exit=${{ opacity:0, scale:.9, transition:{ duration:.22 } }} transition=${{ type:'spring', stiffness:420, damping:34 }}>
            <${motion.div} class="pcard" drag="y" dragSnapToOrigin whileDrag=${{ scale:1.04, rotate:1.2, boxShadow:'0 18px 40px rgba(0,0,0,.5)', borderColor:'rgba(139,92,246,.6)', zIndex:5 }}>
              <button class="x-btn" aria-label=${'Remove '+c.t} onClick=${() => onRemove(col.id, c.id)}>✕</button>
              <h4>${c.t}</h4>${c.d && html`<p>${c.d}</p>`}
              <div class="ptags"><span class="ptag">${c.tag||'NEW'}</span></div>
            <//>
          <//>`)}
      <//>
      <input class="pcard-input" placeholder="+ Add initiative…" value=${text}
        onChange=${e => setText(e.target.value)} onKeyDown=${e => e.key==='Enter' && submit()}/>
    </div>`;
}

function PipelinePage(){
  const [board, setBoard] = useStoredState('nashe:pipeline', EMPTY_BOARD);
  const columns = Array.isArray(board) && board.length ? board : EMPTY_BOARD;
  const addCard = (colId, t) => setBoard(b => (Array.isArray(b)&&b.length?b:EMPTY_BOARD).map(c => c.id===colId
    ? { ...c, cards:[ ...c.cards, { id:'c'+Date.now(), t, d:'', tag:'NEW' } ] } : c));
  const removeCard = (colId, cardId) => setBoard(b => (Array.isArray(b)&&b.length?b:EMPTY_BOARD).map(c => c.id===colId
    ? { ...c, cards:c.cards.filter(x => x.id!==cardId) } : c));
  return html`
    <${motion.div} variants=${stagger} initial="hidden" animate="show">
      <section class="hero" style=${{ marginBottom:'28px' }}>
        <${motion.div} variants=${rise} class="crumb"><span class="live-dot"/>PIPELINE · SHARED ACROSS EVERY WORKSPACE</>
        <${motion.h1}><${motion.span} variants=${rise} class="h1-line">What are we <span class="grad">building next?</span><//></>
        <${motion.p} variants=${rise}>Add an initiative to any column and it is saved for every founder, on every device.<//>
      </section>
      <section class="board">
        ${columns.map(col => html`
          <${motion.div} key=${col.id} variants=${rise} class="card" style=${{ padding:'18px' }}>
            <${Column} col=${col} onAdd=${addCard} onRemove=${removeCard}/>
          <//>`)}
      </section>
    <//>`;
}

/* ============================== TEAM ============================== */
function MemberCard({ m, i }){
  const C = 2 * Math.PI * 30;
  return html`
    <${motion.div} variants=${rise} class="card member" whileHover=${{ y:-5 }} transition=${{ type:'spring', stiffness:300, damping:24 }}>
      <div class="m-avatar" style=${{ background:'linear-gradient(135deg,'+m.color+',#3b2a8f)' }}>${m.initials}</div>
      <div class="m-name">${m.name}</div>
      <div class="m-role">${m.role}</div>
      <div class="ring-wrap">
        <svg width="76" height="76" viewBox="0 0 76 76">
          <defs><linearGradient id="rg${i}" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#8b5cf6"/><stop offset="1" stop-color="#22d3ee"/></linearGradient></defs>
          <circle cx="38" cy="38" r="30" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="5"/>
          <${motion.circle} cx="38" cy="38" r="30" fill="none" stroke=${`url(#rg${i})`} stroke-width="5" stroke-linecap="round"
            stroke-dasharray=${C} initial=${{ strokeDashoffset:C }} animate=${{ strokeDashoffset:C*(1-m.load/100) }}
            transition=${{ duration:1.4, delay:.3 + i*.1, ease:EASE }}/>
        </svg>
        <div class="ring-label">${m.open}</div>
      </div>
      <div class="m-meta">${m.total} ASSIGNED · ${m.open} OPEN</div>
    <//>`;
}

function TeamPage({ roster, counts }){
  return html`
    <${motion.div} variants=${stagger} initial="hidden" animate="show">
      <section class="hero" style=${{ marginBottom:'28px' }}>
        <${motion.div} variants=${rise} class="crumb"><span class="live-dot"/>FOUNDERS · ${roster.length} ACTIVE</>
        <${motion.h1}><${motion.span} variants=${rise} class="h1-line">Your crew, <span class="grad">at a glance.</span><//></>
        <${motion.p} variants=${rise}>Task load is counted from the shared task board — the ring shows how much of each founder's work is still open.<//>
      </section>
      ${roster.length === 0
        ? html`<${EmptyState} title="No founders provisioned yet." hint="Owner memberships are created by the platform administrator from the owner-management console."/>`
        : html`<section class="team-grid">
            ${roster.map((m,i) => html`<${MemberCard} key=${m.id} m=${m} i=${i}/>`)}
          </section>`}
    <//>`;
}

/* ============================== PAGE COPY ============================== */
const PAGE_INFO = {
  founders:{eyebrow:'GOVERNANCE · OWNERSHIP',title:'Shared ownership. <span class="grad">Clear accountability.</span>',desc:'Equal ownership with domain-specific responsibility. Every founder leads their own workspace, and the decisions that affect the whole company stay shared.'},
  finance:{eyebrow:'FINANCE · ACCOUNTING',title:'Know where every <span class="grad">dollar goes.</span>',desc:'Record income and expenses against one live ledger, review what still needs approval, and export the register whenever you need it.'},
  profit:{eyebrow:'FINANCE · DISTRIBUTIONS',title:'Profit with a <span class="grad">plan.</span>',desc:'Set an operating reserve, then model what each founder receives from the distributable pool before any payout is approved.'},
  tech:{eyebrow:'DOMAIN · TECHNOLOGY',title:'Turn the roadmap into <span class="grad">releases.</span>',desc:'Track product milestones, engineering priorities, incidents, and technical decisions in one place.'},
  marketing:{eyebrow:'DOMAIN · MARKETING',title:'Make growth <span class="grad">measurable.</span>',desc:'Organize campaigns, channels, experiments, and the signals that show whether marketing is working.'},
  sales:{eyebrow:'REVENUE · CLIENTS',title:'From first contact to <span class="grad">closed deal.</span>',desc:'Keep leads, client relationships, expected revenue, and follow-ups visible to every founder.'},
  tasks:{eyebrow:'EXECUTION · GOALS',title:'Move the work <span class="grad">forward.</span>',desc:'A shared action list for outcomes, ownership, due dates, and delivery status.'},
  calendar:{eyebrow:'EXECUTION · PLANNING',title:'Make the next steps <span class="grad">visible.</span>',desc:'Founder check-ins, releases, campaign reviews, and finance close dates on a single milestone board.'},
  risks:{eyebrow:'OPERATIONS · RISK',title:'Surface risks before they <span class="grad">become incidents.</span>',desc:'Track product blockers, cash-flow concerns, vendor issues, customer escalations, and the owner responsible for mitigation.'},
  vendors:{eyebrow:'MARKETPLACE · OPERATIONS',title:'Keep vendor operations <span class="grad">moving.</span>',desc:'Coordinate onboarding, catalogue readiness, fulfilment quality, payout checks, and vendor support across the marketplace.'},
  customers:{eyebrow:'CUSTOMER · EXPERIENCE',title:'Turn customer friction into <span class="grad">clear action.</span>',desc:'Triage customer feedback, delivery issues, refunds, and support follow-ups with a visible owner and next action.'},
  decisions:{eyebrow:'GOVERNANCE · DECISIONS',title:'Discuss it. <span class="grad">Decide together.</span>',desc:'Record proposals, collect a signal from every founder, and keep the final outcome in the governance register.'},
  reports:{eyebrow:'INTELLIGENCE · REPORTS',title:'Signals, trends, <span class="grad">and context.</span>',desc:'Every figure on this page is computed from the records the founders actually keep. Export the rows and take them anywhere.'},
  documents:{eyebrow:'COMPANY · DOCUMENTS',title:'Keep the paperwork <span class="grad">in order.</span>',desc:'Contracts, receipts, and verification material in one shared place, visible to every founder.'},
  notifications:{eyebrow:'ACTIVITY · INBOX',title:'Nothing important <span class="grad">slips through.</span>',desc:'A consolidated activity inbox for decisions, finance checks, product releases, and co-founder updates.'},
  settings:{eyebrow:'ADMIN · CONFIGURATION',title:'Make the workspace <span class="grad">yours.</span>',desc:'Theme, notifications, and the permission boundaries this workspace enforces server-side.'},
  features:{eyebrow:'PRODUCT GOVERNANCE · CROSS-PLATFORM',title:'Build what Nashemann <span class="grad">needs next.</span>',desc:'One shared register for changes to Technology, Finance, Marketing, or the whole panel. Writing to it requires the technology.manage capability, and entries can never be deleted.'},
};

function PageStat({label,value,foot}){
  return html`<${motion.div} class="panel-card page-stat" variants=${rise} whileHover=${{y:-3}} transition=${{type:'spring',stiffness:320,damping:26}}>
    <div class="ps-label">${label}</div><div class="ps-value">${value}</div>${foot && html`<div class="ps-foot">${foot}</div>`}
  <//>`;
}

function downloadCSV(filename, rows){
  const csv = rows.map(row => row.map(cell => '"'+String(cell ?? '').replace(/"/g,'""')+'"').join(',')).join('\r\n');
  const blob = new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=filename; a.rel='noopener'; document.body.appendChild(a); a.click(); a.remove(); window.setTimeout(()=>URL.revokeObjectURL(url),1000);
}

function ThemeToggle({ theme, setTheme }){
  const next = theme==='dark' ? 'light' : 'dark';
  return html`<button class="btn btn-ghost theme-toggle" aria-label=${'Switch to '+next+' theme'} title=${'Switch to '+next+' theme'} onClick=${() => setTheme(next)}>
    <span style=${{fontSize:'15px'}}>${theme==='dark' ? '☼' : '☾'}</span>${theme==='dark' ? 'Light mode' : 'Dark mode'}
  </button>`;
}

function MobileNavigation({page,setPage,workspace}){
  const items=NAV.filter(n=>accessiblePages(workspace).has(n.id));
  return html`<nav class="mobile-nav" aria-label="${WORKSPACES[workspace].label} workspace pages">${items.map(n => html`<button key=${n.id} type="button" aria-current=${page===n.id?'page':undefined} class=${page===n.id?'active':''} onClick=${() => setPage(n.id)}>${n.id==='chat'?'✉':n.id==='finance'?'$':n.id==='marketing'?'↗':n.id==='tech'?'⌘':'✦'} ${n.label}</button>`)}</nav>`;
}

/* ============================== BUSINESS PAGES ============================== */
function BusinessPage({page,theme,setTheme}){
  const info = PAGE_INFO[page] || PAGE_INFO.founders;
  const { owner, roster } = useSession();
  const metrics = useMetrics();
  const [transactions,setTransactions] = useStoredState('nashe:transactions',[]);
  const [tasks,setTasks] = useStoredState('nashe:tasks',[]);
  const [leads,setLeads] = useStoredState('nashe:leads',[]);
  const [campaigns,setCampaigns] = useStoredState('nashe:campaigns',[]);
  const [notices,setNotices] = useStoredState('nashe:notices',[]);
  const [profitTotal,setProfitTotal] = useStoredState('nashe:profit-total','0');
  const [reservePct,setReservePct] = useStoredState('nashe:reserve-pct','20');
  const [techItems,setTechItems] = useStoredState('nashe:tech-items',[]);
  const [documents,setDocuments] = useStoredState('nashe:documents',[]);
  const [permissions,setPermissions] = useStoredState('nashe:permissions',{finance:true,ownerChat:true,changeRoles:false,deleteRecords:false});
  const [settings,setSettings] = useStoredState('nashe:settings',{releaseAlerts:true,weeklyDigest:true,decisionReminders:true});
  const [milestones,setMilestones] = useStoredState('nashe:milestones',[]);
  const [riskItems,setRiskItems] = useStoredState('nashe:risks',[]);
  const [vendorItems,setVendorItems] = useStoredState('nashe:vendors',[]);
  const [customerItems,setCustomerItems] = useStoredState('nashe:customer-issues',[]);

  const me = owner ? owner.name : 'Unassigned';
  const [financeLabel,setFinanceLabel] = useState('');
  const [financeAmount,setFinanceAmount] = useState('');
  const [taskTitle,setTaskTitle] = useState('');
  const [leadName,setLeadName] = useState('');
  const [leadValue,setLeadValue] = useState('');
  const [techTitle,setTechTitle] = useState('');
  const [milestoneTitle,setMilestoneTitle] = useState('');
  const [milestoneDate,setMilestoneDate] = useState('');
  const [riskTitle,setRiskTitle] = useState('');
  const [vendorName,setVendorName] = useState('');
  const [customerTitle,setCustomerTitle] = useState('');
  const [campaignName,setCampaignName] = useState('');
  const [campaignChannel,setCampaignChannel] = useState('');

  const founderCount = Math.max(1, roster.length);
  const split = v => Math.max(0, Number(v||0))/founderCount;
  const revenue = transactions.reduce((sum,t)=>sum+Number(t.amount||0),0);
  const reserveValue = Math.max(0,Number(profitTotal||0)*Math.min(100,Math.max(0,Number(reservePct||0)))/100);
  const distributable = Math.max(0,Number(profitTotal||0)-reserveValue);
  const formatMoney = value => '$'+Number(value||0).toLocaleString('en-US',{maximumFractionDigits:2});

  const addTransaction = (type, status) => {
    const amount = Number(financeAmount);
    if(!financeLabel.trim() || !Number.isFinite(amount) || amount <= 0) return;
    const signed = type === 'Income' ? amount : -amount;
    setTransactions(rows => [{
      id:'t'+Date.now(),
      date:new Date().toISOString().slice(0,10),
      type, label:financeLabel.trim(), amount:signed, status,
    }, ...rows]);
    setFinanceLabel(''); setFinanceAmount('');
  };
  const addExpense = () => addTransaction('Expense', 'Needs review');
  const addIncome = () => addTransaction('Income', 'Recorded');
  const addTask = () => { if(!taskTitle.trim()) return; setTasks(rows=>[{id:'task'+Date.now(),title:taskTitle.trim(),owner:me,due:'No due date',done:false},...rows]); setTaskTitle(''); };
  const addLead = () => { if(!leadName.trim()||Number(leadValue)<0) return; setLeads(rows=>[{id:'l'+Date.now(),name:leadName.trim(),contact:'New lead',value:Number(leadValue)||0,stage:'Discovery'},...rows]); setLeadName(''); setLeadValue(''); };
  const addCampaign = () => { if(!campaignName.trim()) return; setCampaigns(rows=>[{id:'cmp'+Date.now(),name:campaignName.trim(),channel:campaignChannel.trim()||'Unassigned',status:'Planning',progress:0,owner:me},...rows]); setCampaignName(''); setCampaignChannel(''); };
  const addRisk = () => { if(!riskTitle.trim()) return; setRiskItems(rows=>[{id:'r'+Date.now(),title:riskTitle.trim(),area:'General',severity:'Medium',owner:me,status:'Open',next:''},...rows]); setRiskTitle(''); };
  const addVendor = () => { if(!vendorName.trim()) return; setVendorItems(rows=>[{id:'v'+Date.now(),name:vendorName.trim(),stage:'Planned',priority:'Medium',owner:me,next:''},...rows]); setVendorName(''); };
  const addCustomerIssue = () => { if(!customerTitle.trim()) return; setCustomerItems(rows=>[{id:'ci'+Date.now(),title:customerTitle.trim(),type:'Feedback',priority:'Medium',status:'Open',owner:me,next:''},...rows]); setCustomerTitle(''); };
  const addTechItem = () => { if(!techTitle.trim()) return; setTechItems(rows=>[{id:'p'+Date.now(),title:techTitle.trim(),desc:'',tag:'NEW',status:'Next up'},...rows]); setTechTitle(''); };
  const handleDocs = async e => {
    const files=Array.from(e.target.files||[]); e.target.value='';
    const read=file=>new Promise(resolve=>{if(file.size>512*1024){resolve({error:file.name});return;}const r=new FileReader();r.onload=()=>resolve({id:'doc'+Date.now()+Math.random(),name:file.name,size:file.size,type:file.type||'application/octet-stream',dataUrl:String(r.result||''),date:new Date().toLocaleDateString(),owner:me});r.onerror=()=>resolve({error:file.name});r.readAsDataURL(file);});
    const results=await Promise.all(files.map(read));const failed=results.filter(x=>x.error);if(failed.length)alert('Each file must be under 512 KB: '+failed.map(f=>f.error).join(', '));setDocuments(d=>[...results.filter(x=>!x.error),...d]);
  };

  const ownerCards = roster.map(o => ({
    ...o,
    share: (100/founderCount).toFixed(founderCount===3?1:1)+'%',
    focus: WORKSPACES[o.workspace] ? WORKSPACES[o.workspace].focus : 'Shared governance across every domain.',
  }));

  let body;
  if(page==='founders') body = html`
    ${ownerCards.length === 0 ? html`<${EmptyState} title="No founders provisioned yet." hint="Owner memberships are created from the owner-management console."/>` : html`
    <section class="owner-cards">
      ${ownerCards.map((o,i)=>html`<${motion.div} key=${o.id} class="panel-card owner-card" variants=${rise} whileHover=${{y:-5}} transition=${{type:'spring',stiffness:320,damping:24}}>
        <div class="owner-mark" style=${{background:'linear-gradient(135deg,'+o.color+',#3b2a8f)'}}>${o.initials}</div><div class="owner-name">${o.name}</div><div class="owner-domain">${o.role}</div><div class="owner-share">${o.share}</div><p>Equity allocation</p><div class="progress-track"><div class="progress-fill" style=${{width:o.share,background:'linear-gradient(90deg,'+o.color+',var(--cy))'}}/></div><p>${o.focus}</p>
      <//>`)}
    </section>`}
    <section class="page-grid"><div class="panel-card"><div class="card-head"><div class="card-title">Ownership principles</div></div><div class="action-line"><span>Ownership</span><b>${founderCount===3?'⅓ each':'Equal'}</b></div><div class="action-line"><span>Profit share</span><b>After expenses & reserves</b></div><div class="action-line"><span>Domain leadership</span><b>Skill-based</b></div><div class="action-line"><span>Major decisions</span><b>Shared approval</b></div></div><div class="panel-card"><div class="card-title">Working agreement</div><p style=${{marginTop:'9px'}}>Domain owners lead day-to-day work in their area. Equal ownership does not automatically mean that every owner should have unrestricted access to every sensitive action.</p><div class="soft-note">Sensitive actions are enforced on the server against your founder membership, not in this interface.</div><button class="btn btn-ghost" style=${{marginTop:'14px'}} onClick=${()=>window.dispatchEvent(new CustomEvent('nashe:navigate',{detail:'settings'}))}>Review permissions →</button></div></section>`;

  else if(page==='finance') body = html`
    <section class="page-grid four"><${PageStat} label="Net recorded" value=${formatMoney(revenue)} foot="FROM THE LEDGER"/><${PageStat} label="Income entries" value=${transactions.filter(t=>Number(t.amount)>0).length} foot="TRANSACTIONS"/><${PageStat} label="Expense entries" value=${transactions.filter(t=>Number(t.amount)<0).length} foot="TRANSACTIONS"/><${PageStat} label="Awaiting review" value=${transactions.filter(t=>t.status==='Needs review').length} foot="PENDING REVIEW"/></section>
    <section class="page-grid"><div class="panel-card"><div class="card-head"><div class="card-title">Record an entry</div></div><div class="form-row"><input class="form-field" placeholder="Description" value=${financeLabel} onChange=${e=>setFinanceLabel(e.target.value)}/><input class="form-field" style=${{maxWidth:'150px'}} type="number" min="0" placeholder="Amount ($)" value=${financeAmount} onChange=${e=>setFinanceAmount(e.target.value)}/><button class="btn btn-pri" onClick=${addExpense}>Add expense</button><button class="btn btn-ghost" onClick=${addIncome}>Add income</button></div><p class="muted-small">Every entry is stored in Supabase and visible to all founders immediately.</p></div><div class="panel-card"><div class="card-title">Finance controls</div><div class="action-line"><span>Transaction records</span><span class="status-pill good">Live</span></div><div class="action-line"><span>Approval workflow</span><span class="status-pill">Via decisions</span></div><div class="action-line"><span>Bank reconciliation</span><span class="status-pill">Not connected</span></div></div></section>
    <section class="panel-card"><div class="card-head"><div class="card-title">Transactions</div><button class="btn btn-ghost" onClick=${()=>downloadCSV('nashemann-transactions.csv',[['Date','Type','Description','Amount','Status'],...transactions.map(t=>[t.date,t.type,t.label,t.amount,t.status])])}>Export CSV ↓</button></div>
      ${transactions.length===0
        ? html`<${EmptyState} title="The ledger is empty." hint="Record your first expense or income above and it appears here for every founder."/>`
        : html`<div class="table-wrap"><table class="page-table"><thead><tr><th>Date</th><th>Type</th><th>Description</th><th>Amount</th><th>Status</th><th></th></tr></thead><tbody>${transactions.map(t=>html`<tr key=${t.id}><td>${t.date}</td><td>${t.type}</td><td>${t.label}</td><td style=${{color:Number(t.amount)<0?'var(--pk)':'var(--grn)',fontWeight:600}}>${formatMoney(t.amount)}</td><td><span class=${'status-pill '+(t.status==='Needs review'?'warn':'good')}>${t.status}</span></td><td><button class="link-button" onClick=${()=>setTransactions(rows=>rows.filter(x=>x.id!==t.id))}>Remove</button></td></tr>`)}</tbody></table></div>`}
    </section>`;

  else if(page==='profit') body = html`
    <section class="page-grid"><div class="panel-card"><div class="card-title">Distribution calculator</div><label class="field-label">Profit available after expenses ($)</label><input class="form-field" type="number" min="0" value=${profitTotal} onChange=${e=>setProfitTotal(e.target.value)}/><label class="field-label">Reserve percentage</label><input class="form-field" type="number" min="0" max="100" value=${reservePct} onChange=${e=>setReservePct(e.target.value)}/><div class="soft-note"> </div></div><div class="panel-card"><div class="card-title">Allocation</div><div class="action-line"><span>Total available</span><b>${formatMoney(profitTotal)}</b></div><div class="action-line"><span>Reserve (${Math.min(100,Math.max(0,Number(reservePct)||0))}%)</span><b>${formatMoney(reserveValue)}</b></div><div class="action-line"><span>Distributable pool</span><b style=${{color:'var(--grn)'}}>${formatMoney(distributable)}</b></div><div class="soft-note">Split ${founderCount} way${founderCount===1?'':'s'} across the provisioned founders — each receives <b style=${{color:'var(--txt)'}}>${formatMoney(split(distributable))}</b> before any applicable tax or legal treatment.</div></div></section>
    ${roster.length === 0 ? html`<${EmptyState} title="No founders provisioned yet." hint="Distributions are split across active owner memberships."/>` : html`
    <section class="owner-cards">${roster.map(o=>html`<div key=${o.id} class="panel-card owner-card"><div class="owner-mark" style=${{background:'linear-gradient(135deg,'+o.color+',#3b2a8f)'}}>${o.initials}</div><div class="owner-name">${o.name}</div><div class="owner-share">${formatMoney(split(distributable))}</div><p>Equal share of the distributable pool</p></div>`)}</section>`}`;

  else if(page==='tech') body = html`
    <section class="page-grid three"><${PageStat} label="Roadmap items" value=${techItems.length} foot="VISIBLE INITIATIVES"/><${PageStat} label="In progress" value=${techItems.filter(t=>t.status==='Building').length} foot="ACTIVE BUILD"/><${PageStat} label="Shipped" value=${techItems.filter(t=>t.status==='Shipped').length} foot="DELIVERED"/></section>
    <section class="panel-card"><div class="card-head"><div class="card-title">Product & engineering roadmap</div><span class="status-pill">Technology owner</span></div><div class="form-row"><input class="form-field" placeholder="Add a roadmap item…" value=${techTitle} onChange=${e=>setTechTitle(e.target.value)} onKeyDown=${e=>e.key==='Enter'&&addTechItem()}/><button class="btn btn-pri" onClick=${addTechItem}>Add item +</button></div>
      ${techItems.length===0
        ? html`<${EmptyState} title="No roadmap items yet." hint="Add the first item above — it is shared with every founder."/>`
        : techItems.map(t=>html`<div key=${t.id} class="list-row"><div class="small-icon">⌘</div><div class="list-row-body"><div class="list-row-title">${t.title}</div>${t.desc&&html`<div class="list-row-desc">${t.desc}</div>`}<div class="list-row-meta">${t.tag} · ${t.status}</div></div><select class="form-field" style=${{flex:'0 0 130px'}} value=${t.status} onChange=${e=>setTechItems(rows=>rows.map(x=>x.id===t.id?{...x,status:e.target.value}:x))}><option>Next up</option><option>Building</option><option>In review</option><option>Shipped</option></select><button class="link-button" onClick=${()=>setTechItems(rows=>rows.filter(x=>x.id!==t.id))}>Remove</button></div>`)}
    </section>`;

  else if(page==='marketing') body = html`
    <section class="page-grid three"><${PageStat} label="Active campaigns" value=${campaigns.filter(c=>c.status==='Running').length} foot="CAMPAIGN BOARD"/><${PageStat} label="Channels in use" value=${new Set(campaigns.map(c=>c.channel)).size} foot="TRACKED"/><${PageStat} label="Open leads" value=${leads.filter(l=>l.stage!=='Won'&&l.stage!=='Lost').length} foot="FROM THE SALES PIPELINE"/></section>
    <section class="panel-card"><div class="card-head"><div class="card-title">Campaign performance tracker</div><button class="btn btn-ghost" onClick=${()=>downloadCSV('nashemann-campaigns.csv',[['Campaign','Channel','Status','Progress','Owner'],...campaigns.map(c=>[c.name,c.channel,c.status,c.progress,c.owner])])}>Export CSV ↓</button></div>
      <div class="form-row"><input class="form-field" placeholder="Campaign name" value=${campaignName} onChange=${e=>setCampaignName(e.target.value)}/><input class="form-field" style=${{flex:'0 0 160px'}} placeholder="Channel" value=${campaignChannel} onChange=${e=>setCampaignChannel(e.target.value)}/><button class="btn btn-pri" onClick=${addCampaign}>Add campaign +</button></div>
      ${campaigns.length===0
        ? html`<${EmptyState} title="No campaigns tracked yet." hint="Add a campaign above to start measuring what marketing actually moves."/>`
        : campaigns.map(c=>html`<div key=${c.id} class="list-row"><div class="small-icon">↗</div><div class="list-row-body"><div class="list-row-title">${c.name}</div><div class="list-row-desc">${c.channel} · owned by ${c.owner}</div><div class="progress-track"><div class="progress-fill" style=${{width:c.progress+'%'}}/></div><div class="list-row-meta">${c.progress}% of planned work complete</div></div><select class="form-field" style=${{flex:'0 0 125px'}} value=${c.status} onChange=${e=>setCampaigns(rows=>rows.map(x=>x.id===c.id?{...x,status:e.target.value}:x))}><option>Planning</option><option>Running</option><option>Paused</option><option>Complete</option></select></div>`)}
    </section>`;

  else if(page==='sales') body = html`
    <section class="page-grid three"><${PageStat} label="Open leads" value=${leads.filter(l=>l.stage!=='Won'&&l.stage!=='Lost').length} foot="LIVE PIPELINE"/><${PageStat} label="Potential value" value=${formatMoney(leads.reduce((n,l)=>n+Number(l.value||0),0))} foot="QUALIFIED VALUE"/><${PageStat} label="Won" value=${leads.filter(l=>l.stage==='Won').length} foot="CLOSED"/></section>
    <section class="panel-card"><div class="card-head"><div class="card-title">Lead & client pipeline</div><button class="btn btn-ghost" onClick=${()=>downloadCSV('nashemann-leads.csv',[['Lead','Contact','Value','Stage'],...leads.map(l=>[l.name,l.contact,l.value,l.stage])])}>Export CSV ↓</button></div><div class="form-row"><input class="form-field" placeholder="Client or lead name" value=${leadName} onChange=${e=>setLeadName(e.target.value)}/><input class="form-field" style=${{maxWidth:'160px'}} type="number" min="0" placeholder="Potential value ($)" value=${leadValue} onChange=${e=>setLeadValue(e.target.value)}/><button class="btn btn-pri" onClick=${addLead}>Add lead +</button></div>
      ${leads.length===0
        ? html`<${EmptyState} title="No leads in the pipeline." hint="Add the first lead above and it is visible to every founder."/>`
        : html`<div class="table-wrap"><table class="page-table"><thead><tr><th>Account</th><th>Contact</th><th>Potential value</th><th>Stage</th><th></th></tr></thead><tbody>${leads.map(l=>html`<tr key=${l.id}><td><b>${l.name}</b></td><td>${l.contact}</td><td>${formatMoney(l.value)}</td><td><select class="form-field" style=${{minWidth:'120px'}} value=${l.stage} onChange=${e=>setLeads(rows=>rows.map(x=>x.id===l.id?{...x,stage:e.target.value}:x))}><option>Discovery</option><option>Qualified</option><option>Proposal</option><option>Negotiation</option><option>Won</option><option>Lost</option></select></td><td><button class="link-button" onClick=${()=>setLeads(rows=>rows.filter(x=>x.id!==l.id))}>Remove</button></td></tr>`)}</tbody></table></div>`}
    </section>`;

  else if(page==='tasks') body = html`
    <section class="page-grid three"><${PageStat} label="Tasks in list" value=${tasks.length} foot="SHARED TASKS"/><${PageStat} label="Completed" value=${tasks.filter(t=>t.done).length} foot="COMPLETED"/><${PageStat} label="Remaining" value=${tasks.filter(t=>!t.done).length} foot="IN PROGRESS"/></section>
    <section class="panel-card"><div class="card-head"><div class="card-title">Shared tasks & goals</div></div><div class="form-row"><input class="form-field" placeholder="What needs to get done?" value=${taskTitle} onChange=${e=>setTaskTitle(e.target.value)} onKeyDown=${e=>e.key==='Enter'&&addTask()}/><button class="btn btn-pri" onClick=${addTask}>Add task +</button></div>
      ${tasks.length===0
        ? html`<${EmptyState} title="No tasks yet." hint="Add the first one above — every founder sees the same list."/>`
        : tasks.map(t=>html`<div key=${t.id} class="list-row"><button class=${'check-dot '+(t.done?'done':'')} aria-label=${t.done?'Mark incomplete':'Mark complete'} onClick=${()=>setTasks(rows=>rows.map(x=>x.id===t.id?{...x,done:!x.done}:x))}>${t.done?'✓':''}</button><div class="list-row-body"><div class="list-row-title" style=${t.done?{textDecoration:'line-through',opacity:.58}:{}}>${t.title}</div><div class="list-row-desc">${t.owner||'Unassigned'} · ${t.due||'No due date'}</div></div><button class="link-button" onClick=${()=>setTasks(rows=>rows.filter(x=>x.id!==t.id))}>Remove</button></div>`)}
    </section>`;

  else if(page==='calendar') body = html`
    <section class="page-grid three"><${PageStat} label="Upcoming milestones" value=${milestones.filter(m=>m.status!=='Complete').length} foot="MILESTONE BOARD"/><${PageStat} label="In progress" value=${milestones.filter(m=>m.status==='In progress').length} foot="IN PROGRESS"/><${PageStat} label="Completed" value=${milestones.filter(m=>m.status==='Complete').length} foot="COMPLETED"/></section>
    <section class="panel-card"><div class="card-head"><div class="card-title">Add a milestone</div></div><div class="form-row"><input class="form-field" placeholder="Milestone or meeting title" value=${milestoneTitle} onChange=${e=>setMilestoneTitle(e.target.value)} /><input class="form-field" type="date" value=${milestoneDate} onChange=${e=>setMilestoneDate(e.target.value)} style=${{maxWidth:'180px'}}/><button class="btn btn-pri" onClick=${()=>{if(!milestoneTitle.trim()||!milestoneDate)return;setMilestones(rows=>[...rows,{id:'ms'+Date.now(),title:milestoneTitle.trim(),date:milestoneDate,owner:me,kind:'General',status:'Planned'}]);setMilestoneTitle('');setMilestoneDate('')}}>Add milestone +</button></div></section>
    <section class="panel-card"><div class="card-head"><div class="card-title">Milestone schedule</div><button class="btn btn-ghost" onClick=${()=>downloadCSV('nashemann-milestones.csv',[['Title','Date','Owner','Type','Status'],...milestones.map(m=>[m.title,m.date,m.owner,m.kind,m.status])])}>Export CSV ↓</button></div>
      ${milestones.length===0
        ? html`<${EmptyState} title="No milestones scheduled." hint="Add a date above to put the next check-in or release on the shared board."/>`
        : [...milestones].sort((a,b)=>String(a.date).localeCompare(String(b.date))).map(m=>html`<div key=${m.id} class="list-row"><div class="small-icon">◷</div><div class="list-row-body"><div class="list-row-title">${m.title}</div><div class="list-row-desc">${m.date} · ${m.owner} · ${m.kind}</div></div><select class="form-field" style=${{flex:'0 0 140px'}} value=${m.status} onChange=${e=>setMilestones(rows=>rows.map(x=>x.id===m.id?{...x,status:e.target.value}:x))}><option>Planned</option><option>In progress</option><option>Complete</option><option>Blocked</option></select><button class="link-button" onClick=${()=>setMilestones(rows=>rows.filter(x=>x.id!==m.id))}>Remove</button></div>`)}
    </section>`;

  else if(page==='risks') body = html`
    <section class="page-grid three"><${PageStat} label="Open risks" value=${riskItems.filter(r=>r.status!=='Resolved').length} foot="RISK REGISTER"/><${PageStat} label="High severity" value=${riskItems.filter(r=>r.severity==='High'&&r.status!=='Resolved').length} foot="HIGH SEVERITY"/><${PageStat} label="Resolved" value=${riskItems.filter(r=>r.status==='Resolved').length} foot="RESOLVED"/></section>
    <section class="panel-card"><div class="card-head"><div class="card-title">Register a risk or incident</div></div><div class="form-row"><input class="form-field" placeholder="Risk, blocker, or incident" value=${riskTitle} onChange=${e=>setRiskTitle(e.target.value)} onKeyDown=${e=>e.key==='Enter'&&riskTitle.trim()&&addRisk()}/><button class="btn btn-pri" onClick=${addRisk}>Add risk +</button></div></section>
    <section class="panel-card"><div class="card-head"><div class="card-title">Risk register</div><button class="btn btn-ghost" onClick=${()=>downloadCSV('nashemann-risk-register.csv',[['Risk','Area','Severity','Owner','Status','Mitigation'],...riskItems.map(r=>[r.title,r.area,r.severity,r.owner,r.status,r.next])])}>Export CSV ↓</button></div>
      ${riskItems.length===0
        ? html`<${EmptyState} title="No risks registered." hint="Register anything that could stop a delivery, a payout, or a launch."/>`
        : riskItems.map(r=>html`<div key=${r.id} class="list-row"><div class="small-icon">!</div><div class="list-row-body"><div class="list-row-title">${r.title}</div><div class="list-row-desc">${r.area} · ${r.owner}${r.next&&html`<br/>Next: ${r.next}`}</div></div><select class="form-field" style=${{flex:'0 0 120px'}} value=${r.severity} onChange=${e=>setRiskItems(rows=>rows.map(x=>x.id===r.id?{...x,severity:e.target.value}:x))}><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select><select class="form-field" style=${{flex:'0 0 130px'}} value=${r.status} onChange=${e=>setRiskItems(rows=>rows.map(x=>x.id===r.id?{...x,status:e.target.value}:x))}><option>Open</option><option>Mitigating</option><option>Resolved</option></select></div>`)}
    </section>`;

  else if(page==='vendors') body = html`
    <section class="page-grid three"><${PageStat} label="Workstreams" value=${vendorItems.length} foot="VENDOR OPS"/><${PageStat} label="Needs attention" value=${vendorItems.filter(v=>v.stage==='Needs attention').length} foot="ATTENTION"/><${PageStat} label="High priority" value=${vendorItems.filter(v=>v.priority==='High').length} foot="HIGH SEVERITY"/></section>
    <section class="panel-card"><div class="card-head"><div class="card-title">Vendor operations workboard</div></div><div class="form-row"><input class="form-field" placeholder="Add an operational workstream" value=${vendorName} onChange=${e=>setVendorName(e.target.value)} onKeyDown=${e=>e.key==='Enter'&&addVendor()}/><button class="btn btn-pri" onClick=${addVendor}>Add workstream +</button></div>
      ${vendorItems.length===0
        ? html`<${EmptyState} title="No vendor workstreams yet." hint="Add onboarding, catalogue, fulfilment, or payout checks as they come up."/>`
        : vendorItems.map(v=>html`<div key=${v.id} class="list-row"><div class="small-icon">▦</div><div class="list-row-body"><div class="list-row-title">${v.name}</div><div class="list-row-desc">${v.owner}${v.next&&html` · Next: ${v.next}`}</div></div><select class="form-field" style=${{flex:'0 0 150px'}} value=${v.stage} onChange=${e=>setVendorItems(rows=>rows.map(x=>x.id===v.id?{...x,stage:e.target.value}:x))}><option>Planned</option><option>In progress</option><option>Needs attention</option><option>Complete</option></select><select class="form-field" style=${{flex:'0 0 115px'}} value=${v.priority} onChange=${e=>setVendorItems(rows=>rows.map(x=>x.id===v.id?{...x,priority:e.target.value}:x))}><option>Low</option><option>Medium</option><option>High</option></select></div>`)}
    </section>`;

  else if(page==='customers') body = html`
    <section class="page-grid three"><${PageStat} label="Customer issues" value=${customerItems.length} foot="CUSTOMER QUEUE"/><${PageStat} label="Open" value=${customerItems.filter(c=>c.status==='Open').length} foot="OPEN"/><${PageStat} label="High priority" value=${customerItems.filter(c=>c.priority==='High'&&c.status!=='Resolved').length} foot="HIGH"/></section>
    <section class="panel-card"><div class="card-head"><div class="card-title">Customer experience queue</div></div><div class="form-row"><input class="form-field" placeholder="Customer issue or feedback" value=${customerTitle} onChange=${e=>setCustomerTitle(e.target.value)} onKeyDown=${e=>e.key==='Enter'&&addCustomerIssue()}/><button class="btn btn-pri" onClick=${addCustomerIssue}>Add issue +</button></div>
      ${customerItems.length===0
        ? html`<${EmptyState} title="No customer issues queued." hint="Log delivery problems, refunds, and feedback so every founder sees the same queue."/>`
        : html`<div class="table-wrap"><table class="page-table"><thead><tr><th>Issue</th><th>Type</th><th>Priority</th><th>Status</th><th>Owner</th><th></th></tr></thead><tbody>${customerItems.map(c=>html`<tr key=${c.id}><td><b>${c.title}</b>${c.next&&html`<div class="list-row-desc">${c.next}</div>`}</td><td>${c.type}</td><td><select class="form-field" value=${c.priority} onChange=${e=>setCustomerItems(rows=>rows.map(x=>x.id===c.id?{...x,priority:e.target.value}:x))}><option>Low</option><option>Medium</option><option>High</option></select></td><td><select class="form-field" value=${c.status} onChange=${e=>setCustomerItems(rows=>rows.map(x=>x.id===c.id?{...x,status:e.target.value}:x))}><option>Open</option><option>In review</option><option>Resolved</option></select></td><td>${c.owner}</td><td><button class="link-button" onClick=${()=>setCustomerItems(rows=>rows.filter(x=>x.id!==c.id))}>Remove</button></td></tr>`)}</tbody></table></div>`}
    </section>`;

  else if(page==='decisions') body = html`${html`<${DecisionsPage} />`}`;

  else if(page==='reports') body = html`
    <section class="page-grid four">
      <${PageStat} label="Net revenue this month" value=${metrics?money(metrics.revenue.thisMonth):'—'} foot="FROM THE LEDGER"/>
      <${PageStat} label="Net recorded total" value=${metrics?money(metrics.revenue.netTotal):'—'} foot="ALL TRANSACTIONS"/>
      <${PageStat} label="Open pipeline" value=${metrics?money(metrics.counts.pipelineValue):'—'} foot="OPEN LEADS"/>
      <${PageStat} label="Founders" value=${metrics?metrics.counts.founders:'—'} foot="ACTIVE MEMBERSHIPS"/>
    </section>
    <${ChartCard} series=${metrics?metrics.revenue.monthly:[]}/>
    <section class="page-grid"><div class="panel-card"><div class="card-title">Export center</div><p style=${{marginTop:'8px'}}>These figures are computed from the rows the founders keep in Supabase. Export them for the board pack or your accountant.</p><button class="btn btn-pri" style=${{marginTop:'14px'}} onClick=${()=>downloadCSV('nashemann-transactions.csv',[['Date','Type','Description','Amount','Status'],...transactions.map(t=>[t.date,t.type,t.label,t.amount,t.status])])}>Download ledger CSV ↓</button><button class="btn btn-ghost" style=${{marginTop:'14px'}} onClick=${()=>downloadCSV('nashemann-metrics.csv',[['Metric','Value'],['Net revenue this month',metrics?metrics.revenue.thisMonth:0],['Net recorded total',metrics?metrics.revenue.netTotal:0],['Open tasks',metrics?metrics.counts.openTasks:0],['Completed tasks',metrics?metrics.counts.completedTasks:0],['Open risks',metrics?metrics.counts.openRisks:0],['Active campaigns',metrics?metrics.counts.activeCampaigns:0],['Pipeline value',metrics?metrics.counts.pipelineValue:0]])}>Download metrics CSV ↓</button></div><div class="panel-card"><div class="card-title">Recurring reports</div>${['Weekly founder snapshot','Monthly profit and cash report','Campaign performance review','Product delivery and incidents','Decision and approval audit'].map(x=>html`<div key=${x} class="action-line"><span>${x}</span><span class="status-pill">Scheduled by you</span></div>`)}</div></section>`;

  else if(page==='documents') body = html`
    <section class="page-grid three"><${PageStat} label="Saved files" value=${documents.length} foot="SHARED STORAGE"/><${PageStat} label="Attachment limit" value="512 KB" foot="PER FILE"/><${PageStat} label="Visible to" value=${roster.length+' founder'+(roster.length===1?'':'s')} foot="SAME REGISTER"/></section>
    <section class="panel-card"><div class="card-head"><div class="card-title">Documents & contracts</div><label class="attach-label">＋ Select files<input type="file" multiple style=${{display:'none'}} onChange=${handleDocs}/></label></div><p style=${{marginBottom:'10px'}}>Contracts, receipts, and verification material. Files are stored with the workspace record and visible to every founder.</p>
      ${documents.length===0
        ? html`<${EmptyState} title="No documents uploaded yet." hint="Files are capped at 512 KB each. Large originals belong in private object storage."/>`
        : documents.map(doc=>html`<div key=${doc.id} class="list-row"><div class="small-icon">${doc.type.startsWith('image/')?'▧':'▤'}</div><div class="list-row-body"><div class="list-row-title">${doc.name}</div><div class="list-row-desc">${(doc.size/1024).toFixed(1)} KB · ${doc.date}</div></div><a class="link-button" href=${doc.dataUrl} download=${doc.name}>Download</a><button class="link-button" onClick=${()=>setDocuments(rows=>rows.filter(x=>x.id!==doc.id))}>Remove</button></div>`)}
    </section>`;

  else if(page==='notifications') body = html`
    <section class="page-grid three"><${PageStat} label="Unread" value=${notices.filter(n=>!n.read).length} foot="ACTIVITY INBOX"/><${PageStat} label="Total" value=${notices.length} foot="INBOX"/><${PageStat} label="Sources" value=${new Set(notices.map(n=>n.icon)).size} foot="DISTINCT"/></section>
    <section class="panel-card"><div class="card-head"><div class="card-title">Activity inbox</div><button class="btn btn-ghost" onClick=${()=>setNotices(rows=>rows.map(n=>({...n,read:true})))}>Mark all read</button></div>
      ${notices.length===0
        ? html`<${EmptyState} title="Nothing in the inbox." hint="Use notifications to flag decisions, approvals, and releases for the other founders."/>`
        : notices.map(n=>html`<div key=${n.id} class="list-row" style=${n.read?{opacity:.62}:{}}><div class="small-icon">${n.icon||'!'}</div><div class="list-row-body"><div class="list-row-title">${n.title} ${!n.read&&html`<span class="status-pill good">New</span>`}</div><div class="list-row-desc">${n.desc}</div><div class="list-row-meta">${n.time}</div></div>${!n.read&&html`<button class="link-button" onClick=${()=>setNotices(rows=>rows.map(x=>x.id===n.id?{...x,read:true}:x))}>Mark read</button>`}</div>`)}
    </section>
    <section class="panel-card"><div class="card-head"><div class="card-title">Recent activity by founder</div></div>
      ${(!metrics||!metrics.activity||!metrics.activity.length)
        ? html`<${EmptyState} title="No activity yet." hint="Actions you and the other founders take are attributed to them here."/>`
        : metrics.activity.slice(0,12).map(a=>html`<div key=${a.id} class="list-row"><div class="chat-avatar" style=${{width:'32px',height:'32px',fontSize:'11px',background:'linear-gradient(135deg,'+a.color+',#3b2a8f)'}}>${a.initials}</div><div class="list-row-body"><div class="list-row-title">${a.text}</div><div class="list-row-meta">${a.actor} � ${relativeTime(a.at)||a.at}</div></div><span class="status-pill">${a.category}</span></div>`)}
    </section>`;

  else if(page==='settings') body = html`
    <section class="page-grid"><div class="panel-card"><div class="card-head"><div class="card-title">Appearance</div></div><p>Keep the dark founder palette as your default, or switch to a light one. The preference is stored per device.</p><div class="form-row"><div class="segmented"><button class=${theme==='dark'?'active':''} onClick=${()=>setTheme('dark')}>☾ Dark</button><button class=${theme==='light'?'active':''} onClick=${()=>setTheme('light')}>☼ Light</button></div></div></div><div class="panel-card"><div class="card-title">Notifications</div>${[{key:'releaseAlerts',label:'Product release alerts'},{key:'weeklyDigest',label:'Weekly company digest'},{key:'decisionReminders',label:'Decision reminders'}].map(x=>html`<div key=${x.key} class="choice-row"><span>${x.label}</span><button class=${'toggle-switch '+(settings[x.key]?'on':'')} aria-label=${'Toggle '+x.label} aria-pressed=${!!settings[x.key]} onClick=${()=>setSettings(s=>({...s,[x.key]:!s[x.key]}))}><span/></button></div>`)}</div></section>
    <section class="panel-card"><div class="card-head"><div class="card-title">Your capabilities</div><span class="status-pill">${owner?owner.role:'—'}</span></div><p style=${{marginBottom:'8px'}}>These are the capabilities attached to your founder membership. The server re-checks them on every write, so what you see here is what you can actually do.</p>
      ${owner && owner.capabilities.length
        ? html`<div class="action-line" style=${{flexWrap:'wrap',gap:'8px'}}>${owner.capabilities.map(c=>html`<span key=${c} class="status-pill">${c}</span>`)}</div>`
        : html`<${EmptyState} title="No capabilities granted yet." hint="Ask the platform administrator to activate your founder membership."/>`}
    </section>
    <section class="panel-card"><div class="card-head"><div class="card-title">Sensitive action defaults</div></div><p style=${{marginBottom:'8px'}}>Defaults for how the founders treat restricted actions. Enforcement happens on the server, not here.</p>${[{key:'finance',label:'Access finance records',desc:'Finance domain owner and explicitly authorized co-founders'},{key:'ownerChat',label:'Access owner group chat',desc:'Authenticated founders only'},{key:'changeRoles',label:'Change roles and permissions',desc:'Requires explicit platform-admin approval'},{key:'deleteRecords',label:'Delete sensitive records',desc:'Restricted and audited'}].map(x=>html`<div key=${x.key} class="choice-row"><div><div class="list-row-title">${x.label}</div><div class="list-row-desc">${x.desc}</div></div><button class=${'toggle-switch '+(permissions[x.key]?'on':'')} aria-label=${'Toggle '+x.label} aria-pressed=${!!permissions[x.key]} onClick=${()=>setPermissions(p=>({...p,[x.key]:!p[x.key]}))}><span/></button></div>`)}</section>`;

  return html`
    <${motion.div} variants=${stagger} initial="hidden" animate="show">
      <section class="hero" style=${{marginBottom:'28px'}}>
        <${motion.div} variants=${rise} class="crumb"><span class="live-dot"/>${info.eyebrow}</>
        <${motion.h1}><span class="h1-line" dangerouslySetInnerHTML=${{__html:info.title}}/><//>
        <${motion.p} variants=${rise}>${info.desc}<//>
      </section>
      ${body}
    <//>`;
}

/* ============================== OWNER CHAT ============================== */
function OwnerChatPage(){
  const { owner, roster } = useSession();
  const [messages,setMessages] = useStoredState('nashe:owner-chat',[]);
  const [draft,setDraft] = useState('');
  const [attachments,setAttachments] = useState([]);
  const [notice,setNotice] = useState('');
  const me = owner || { id:'me', name:'Founder', initials:'F', color:'#8b5cf6', role:'Owner workspace' };

  const attachFiles = async e => {
    const files=Array.from(e.target.files||[]);e.target.value='';
    const read=file=>new Promise(resolve=>{if(file.size>512*1024){resolve({error:file.name});return;}const r=new FileReader();r.onload=()=>resolve({name:file.name,type:file.type||'application/octet-stream',size:file.size,dataUrl:String(r.result||'')});r.onerror=()=>resolve({error:file.name});r.readAsDataURL(file);});
    const results=await Promise.all(files.map(read));const failed=results.filter(x=>x.error);
    if(failed.length)setNotice('Each selected file must be 512 KB or smaller: '+failed.map(f=>f.error).join(', '));else setNotice('');
    setAttachments(prev=>[...prev,...results.filter(x=>!x.error)]);
  };

  const send = () => {
    const text=draft.trim();if(!text&&!attachments.length)return;
    const time=new Date().toISOString();
    setMessages(rows=>[...rows,{
      id:'msg'+Date.now()+Math.random(),
      owner:me.workspace||'technology',
      name:me.name,
      initials:me.initials,
      color:me.color,
      text,
      time,
      attachments:attachments.map(a=>({...a}))
    }]);
    setDraft('');setAttachments([]);
  };

  return html`
    <${motion.div} variants=${stagger} initial="hidden" animate="show">
      <section class="hero" style=${{marginBottom:'26px'}}>
        <${motion.div} variants=${rise} class="crumb"><span class="live-dot"/>CO-FOUNDER COLLABORATION · PRIVATE GROUP</>
        <${motion.h1}><span class="h1-line">One room. <span class="grad">Every founder.</span></span><//>
        <${motion.p} variants=${rise} class="muted-small">Cross-domain discussion, approvals, and document verification. Only the signed-in founder can post as themselves.<//>
      </section>
      <section class="panel-card owner-chat">
        <div class="chat-toolbar"><div class="chat-title"><div class="small-icon" style=${{width:'44px',height:'44px',fontSize:'19px'}}>✉</div><div><h3>Nashemann Owners</h3><div class="chat-presence"><span class="live-dot"/>${roster.length} founder${roster.length===1?'':'s'} on this thread</div></div></div><div><label class="field-label" style=${{marginTop:0}}>Signed in as</label><div class="form-field" style=${{minWidth:'205px',background:'transparent',border:'none',color:'var(--txt)',fontWeight:600}}>${me.name} (you)</div></div></div>
        <div class="chat-stream" aria-live="polite">
          ${messages.length===0 ? html`<div class="empty-state">No messages yet. Start the conversation below.</div>`:messages.map(m=>html`
            <div key=${m.id} class=${'chat-message '+(m.name===me.name?'mine':'')}>
              <div class="chat-avatar" style=${{background:'linear-gradient(135deg,'+m.color+',#3b2a8f)'}}>${m.initials}</div>
              <div class="chat-bubble"><div class="chat-meta"><span class="chat-author">${m.name}</span><span class="chat-time">${relativeTime(m.time)||m.time}</span></div>${m.text&&html`<div class="chat-text">${m.text}</div>`}
                ${m.attachments&&m.attachments.length>0&&html`<div class="chat-attachments">${m.attachments.map((a,i)=>html`<a key=${m.id+'a'+i} class="chat-attachment" href=${a.dataUrl} download=${a.name} target="_blank">${a.type&&a.type.startsWith('image/')?html`<img src=${a.dataUrl} alt=${a.name}/>`:html`<span class="small-icon" style=${{width:'32px',height:'32px'}}>▤</span>`}<span>${a.name}<span style=${{display:'block',color:'var(--dim)',fontSize:'9px',marginTop:'3px'}}>${(a.size/1024).toFixed(1)} KB · download</span></span></a>`)}</div>`}
              </div>
            </div>`)}
        </div>
        <div class="chat-compose">
          ${attachments.length>0&&html`<div>${attachments.map((a,i)=>html`<span key=${a.name+i} class="attachment-chip">${a.type.startsWith('image/')?'▧':'▤'} ${a.name}<button aria-label=${'Remove '+a.name} onClick=${()=>setAttachments(rows=>rows.filter((_,j)=>j!==i))}>×</button></span>`)}</div>`}
          ${notice&&html`<p style=${{color:'var(--pk)',fontSize:'11px',marginBottom:'8px'}}>${notice}</p>`}
          <textarea placeholder="Write a message to all founders… (Ctrl/⌘ + Enter to send)" value=${draft} onChange=${e=>setDraft(e.target.value)} onKeyDown=${e=>{if((e.ctrlKey||e.metaKey)&&e.key==='Enter'){e.preventDefault();send();}}}/>
          <div class="chat-compose-actions"><div style=${{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap'}}><label class="attach-label">＋ Attach image / document<input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.ppt,.pptx" style=${{display:'none'}} onChange=${attachFiles}/></label><span class="muted-small">Images, PDF, Office files, CSV and text — 512 KB each</span></div><button class="btn btn-pri" onClick=${send}>Send message ↗</button></div>
        </div>
      </section>
      <p class="muted-small" style=${{marginTop:'14px',textAlign:'center'}}>Messages are written against your authenticated session - the sender is always the signed-in founder. Record final decisions on the Decisions page.</p>
    <//>`;
}

/* ============================== DECISIONS ============================== */
const DECISION_DOMAINS = [
  { id:'product_technology', label:'Product & technology' },
  { id:'business_strategy', label:'Business strategy' },
];
const DECISION_STATUS_LABELS = { proposed:'Proposed', approved:'Approved', rejected:'Rejected', deferred:'Deferred' };

function DecisionsPage(){
  const { owner } = useSession();
  const [items,setItems] = useState(null);
  const [loadError,setLoadError] = useState('');
  const [votes, setVotes] = useStoredState('nashe:decision-votes',{});
  const [title,setTitle] = useState('');
  const [summary,setSummary] = useState('');
  const [domain,setDomain] = useState('');
  const [notice,setNotice] = useState('');
  const [saving,setSaving] = useState(false);

  const allowedDomains = useMemo(() => {
    const owned = new Set(owner ? owner.workspaces : []);
    return DECISION_DOMAINS.filter(d =>
      (d.id==='product_technology' && owned.has('technology')) ||
      (d.id==='business_strategy' && owned.has('marketing')));
  }, [owner]);

  useEffect(()=>{ if(!domain && allowedDomains.length) setDomain(allowedDomains[0].id); },[domain,allowedDomains]);

  const load = useCallback(()=>{
    fetch('/api/owners/decisions',{credentials:'same-origin'})
      .then(r=>{ if(!r.ok) throw new Error('unavailable'); return r.json(); })
      .then(j=>{ setItems(Array.isArray(j.decisions)?j.decisions:[]); setLoadError(''); })
      .catch(()=>{ setItems([]); setLoadError('unavailable'); });
  },[]);
  useEffect(()=>{ load(); },[load]);

  const submit = async () => {
    if(saving || !domain || title.trim().length<3) return;
    setSaving(true); setNotice('');
    try{
      const res = await fetch('/api/owners/decisions',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({domain,title:title.trim(),summary:summary.trim()||null})});
      const payload = await res.json().catch(()=>({}));
      if(!res.ok) throw new Error(payload.error||'Could not record this decision.');
      setTitle('');setSummary('');load();
    }catch(e){ setNotice(e.message); } finally { setSaving(false); }
  };

  const domainLabel = id => (DECISION_DOMAINS.find(d=>d.id===id)||{label:id}).label;

  return html`
    <section class="page-grid three">
      <${PageStat} label="Proposals" value=${items===null?'—':items.filter(d=>d.status==='proposed').length} foot="IN THE REGISTER"/>
      <${PageStat} label="Voting model" value="Signal" foot="AUTHORITATIVE APPROVAL IS SERVER-SIDE"/>
      <${PageStat} label="Final record" value="Governance" foot="OWNER DECISIONS TABLE"/>
    </section>
    <section class="page-grid">
      <div class="panel-card">
        <div class="card-head"><div class="card-title">Decision room</div><button class="btn btn-ghost" onClick=${load}>Refresh</button></div>
        ${items===null
          ? html`<${EmptyState} title="Loading decisions…"/>`
          : loadError
            ? html`<${EmptyState} title="Decisions are unavailable right now." hint="Your membership may not include governance.read for any domain."/>`
            : items.length===0
              ? html`<${EmptyState} title="No decisions recorded yet." hint="Propose the first one below — it lands in the shared governance register."/>`
              : items.map(d=>html`<div key=${d.id} class="list-row"><div class="small-icon">⌁</div><div class="list-row-body"><div class="list-row-title">${d.title}</div>${d.summary&&html`<div class="list-row-desc">${d.summary}</div>`}<div class="list-row-meta">${domainLabel(d.domain)}</div><div class="list-row-meta">${Number(votes[d.id]||0)} founder signal${Number(votes[d.id]||0)===1?'':'s'}</div></div><span class="status-pill">${DECISION_STATUS_LABELS[d.status]||d.status}</span><button class="btn btn-ghost" onClick=${()=>setVotes(v=>({...((v&&typeof v==='object')?v:{}),[d.id]:(Number(v&&v[d.id])||0)+1}))}>Signal +</button></div>`)}
      </div>
      <div class="panel-card">
        <div class="card-title">Propose a decision</div>
        ${allowedDomains.length === 0
          ? html`<div class="soft-note">You do not own a workspace with decision authority. Ask a fellow founder to raise it, or request the matching responsibility.</div>`
          : html`
            <label class="field-label">Title</label>
            <input class="form-field" placeholder="What are we deciding?" value=${title} onChange=${e=>setTitle(e.target.value)}/>
            <label class="field-label">Summary</label>
            <textarea class="form-field" rows="3" placeholder="Why it matters, and what you recommend" value=${summary} onChange=${e=>setSummary(e.target.value)}></textarea>
            <label class="field-label">Domain</label>
            <select class="form-field" value=${domain} onChange=${e=>setDomain(e.target.value)}>
              ${allowedDomains.map(d=>html`<option key=${d.id} value=${d.id}>${d.label}</option>`)}
            </select>
            ${notice&&html`<p style=${{color:'var(--pk)',fontSize:'11px',marginTop:'8px'}}>${notice}</p>`}
            <button class="btn btn-pri" style=${{marginTop:'12px'}} disabled=${saving||title.trim().length<3} onClick=${submit}>${saving?'Recording…':'Record proposal'}</button>`}
      </div>
    </section>`;
}

/* ============================== COMMAND PALETTE ============================== */
function CommandPalette({ open, setOpen, onNavigate }){
  const [q, setQ] = useState('');
  useEffect(() => {
    const h = e => {
      if((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'){ e.preventDefault(); setOpen(o => !o); }
      if(e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);
  useEffect(() => { if(!open) setQ(''); }, [open]);

  const actions = [
    ...NAV.map(n => ({ label:'Go to '+n.label, tag:'nav', run:() => onNavigate(n.id) })),
    { label:'Record a decision', tag:'create', run:() => onNavigate('decisions') },
    { label:'Add an initiative', tag:'create', run:() => onNavigate('pipeline') },
    { label:'Message the founders', tag:'collab', run:() => onNavigate('chat') },
  ].filter(a => a.label.toLowerCase().includes(q.toLowerCase()));

  return html`
    <${AnimatePresence}>
      ${open && html`
        <${motion.div} class="cmdk-backdrop" initial=${{ opacity:0 }} animate=${{ opacity:1 }} exit=${{ opacity:0 }}
          transition=${{ duration:.22 }} onClick=${() => setOpen(false)}>
          <${motion.div} class="cmdk" role="dialog" aria-modal="true" onClick=${e => e.stopPropagation()}
            initial=${{ opacity:0, y:16, scale:.965 }} animate=${{ opacity:1, y:0, scale:1 }} exit=${{ opacity:0, y:10, scale:.97 }}
            transition=${{ type:'spring', stiffness:480, damping:34 }}>
            <input autoFocus placeholder="Type a command or search…" value=${q} onChange=${e => setQ(e.target.value)}/>
            <div class="cmdk-list">
              <${AnimatePresence} initial=${false}>
                ${actions.length === 0 && html`<div class="cmdk-empty">No results for “${q}”</div>`}
                ${actions.map(a => html`
                  <${motion.button} key=${a.label} layout class="cmdk-item" onClick=${() => { a.run(); setOpen(false); }}
                    initial=${{ opacity:0, y:6 }} animate=${{ opacity:1, y:0 }} exit=${{ opacity:0 }} transition=${{ duration:.18 }}>
                    <${IconSparkle}/>${a.label}<span class="cmdk-tag">${a.tag}</span>
                  <//>`)}
              <//>
            </div>
            <div class="cmdk-foot"><span><kbd>↑↓</kbd> navigate</span><span><kbd>↵</kbd> select</span><span><kbd>esc</kbd> close</span></div>
          <//>
        <//>`}
    <//>`;
}

/* ============================== MARQUEE ============================== */
function Marquee(){
  const metrics = useMetrics();
  const items = metrics ? [
    'SYSTEM NOMINAL',
    'NET REVENUE <b>'+money(metrics.revenue.thisMonth)+'</b>',
    'OPEN TASKS <b>'+metrics.counts.openTasks+'</b>',
    'COMPLETED TASKS <b>'+metrics.counts.completedTasks+'</b>',
    'OPEN RISKS <b>'+metrics.counts.openRisks+'</b>',
    'ACTIVE CAMPAIGNS <b>'+metrics.counts.activeCampaigns+'</b>',
    'PIPELINE <b>'+money(metrics.counts.pipelineValue)+'</b>',
    'UNREAD <b>'+metrics.counts.unreadNotices+'</b>',
    'FOUNDERS <b>'+metrics.counts.founders+'</b>',
    'ALL SIGNALS LIVE ✦'
  ] : ['CONNECTING…'];
  const doubled = [...items, ...items];
  return html`
    <div class="marquee" aria-hidden="true">
      <div class="marquee-track">
        ${doubled.map((m,i) => html`<span key=${i}>${'✦'} <span dangerouslySetInnerHTML=${{ __html: m + ' ' }}/></span>`)}
      </div>
    </div>
    <div class="foot-note">NASHEMANN SYSTEMS · TECH · FINANCE · MARKETING · FOUNDER WORKSPACE</div>`;
}

/* ============================== APP ============================== */
function App(){
  const { owner, roster } = useSession();
  const metrics = useMetrics();
  const counts = metrics ? metrics.counts : { openTasks:0, completedTasks:0, openRisks:0, highSeverityRisks:0, activeCampaigns:0, openLeads:0, pipelineValue:0, unreadNotices:0, upcomingMilestones:0, savedDocuments:0, openFeatureRequests:0, chatMessages:0, founders:0, decisions:0 };
  const rosterWithLoad = useOwnerLoad(roster);

  // Per-device preferences. Earlier prototypes stored the workspace as "tech"
  // and left demo keys behind, so both are normalised on boot rather than
  // trusted.
  const [storedWorkspace, setWorkspaceState] = useLocalState("nashe:workspace", "technology");
  const [storedTheme, setTheme] = useLocalState("nashe:theme", "dark");

  // A founder's workspace is determined by their identity, never by the device.
  // Locking it here is what keeps each founder's domain unbothered by the
  // other two: no cross-workspace preview, no stale "tech" preference.
  const ownerWorkspace = owner && owner.workspace && WORKSPACES[owner.workspace] ? owner.workspace : null;
  const workspace = ownerWorkspace || (WORKSPACES[storedWorkspace] ? storedWorkspace : "technology");
  const theme = storedTheme === "light" ? "light" : "dark";

  useEffect(() => {
    if (ownerWorkspace && storedWorkspace !== ownerWorkspace) setWorkspaceState(ownerWorkspace);
    if (storedTheme !== theme) setTheme(theme);
    const PER_DEVICE = new Set(["nashe:workspace", "nashe:theme", "nashe:workspace-seeded"]);
    for (let i = window.localStorage.length - 1; i >= 0; i -= 1) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith("nashe:") && !PER_DEVICE.has(key)) {
        window.localStorage.removeItem(key);
      }
    }
  }, [ownerWorkspace, storedWorkspace, storedTheme, theme]);

  const accessible = accessiblePages(workspace);

  const setWorkspace = id => {
    // Workspace follows identity; ignore cross-workspace switching.
    if (!WORKSPACES[id] || id !== workspace) return;
  };
  const navigateTo = id => {
    if (!accessible.has(id)) { setPageState(WORKSPACES[workspace].home); return; }
    if (!NAV.some(n=>n.id===id)) return;
    setPageState(id);
  };

  const [page, setPageState] = useState(() => WORKSPACES[workspace].home);
  const [booted, setBooted] = useState(false);
  const [cmdk, setCmdk] = useState(false);

  // Keep the visible page inside the founder's accessible set.
  useEffect(() => {
    if (!accessible.has(page)) setPageState(WORKSPACES[workspace].home);
  }, [accessible, page, workspace]);

  // Land the founder in their own workspace the first time this browser opens.
  useEffect(() => {
    if (!owner?.workspace || !WORKSPACES[owner.workspace]) return;
    if (localStorage.getItem('nashe:workspace-seeded')) return;
    localStorage.setItem('nashe:workspace-seeded','1');
    setWorkspaceState(owner.workspace);
    setPageState(WORKSPACES[owner.workspace].home);
  }, [owner]);

  useEffect(() => {
    window.__appMounted = true;
    const t = setTimeout(() => setBooted(true), 1500);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => { document.documentElement.setAttribute('data-theme',theme); },[theme]);
  useEffect(() => {
    const handleNavigate=e=>{if(e.detail)navigateTo(e.detail);};
    window.addEventListener('nashe:navigate',handleNavigate);return()=>window.removeEventListener('nashe:navigate',handleNavigate);
  },[]);

  // Task load per founder comes from useOwnerLoad(roster) above.

  return html`
    <div class="bg-grid"/><div class="aurora a1"/><div class="aurora a2"/><div class="aurora a3"/><div class="noise"/>
    <${MouseGlow}/>
    <${ScrollProgress}/>
    <${Sidebar} page=${page} setPage=${navigateTo} workspace=${workspace} setWorkspace=${setWorkspace} me=${owner}/>
    <main class="main">
      <div class="topbar">
        <div class="crumb"><span class="live-dot"/>NASHEMANN HQ · <${Clock}/> <span class="status-pill good">LIVE</span></div>
        <div class="top-actions">
          <button class="cmdk-trigger" onClick=${() => setCmdk(true)}>
            <${IconSparkle}/>Command… <kbd>⌘K</kbd>
          </button>
          <${ThemeToggle} theme=${theme} setTheme=${setTheme}/>
        </div>
      </div>
      <div class="mobile-workspace-switcher" style=${{display:'none'}}><${WorkspaceOptions} workspace=${workspace} setWorkspace=${setWorkspace}/></div>
      <${MobileNavigation} page=${page} setPage=${navigateTo} workspace=${workspace}/>
      <${AnimatePresence} mode="wait">
        <${motion.div} key=${page} initial=${{ opacity:0, y:22 }} animate=${{ opacity:1, y:0 }} exit=${{ opacity:0, y:-14 }}
          transition=${{ duration:.4, ease:EASE }}>
          <div id="workspace-content">
          <${PanelBoundary}>
          ${page==='features' ? html`<${FeatureGovernance}/>`
            : page==='overview' ? html`<${Overview} goPipeline=${() => navigateTo('pipeline')} metrics=${metrics} roster=${rosterWithLoad} me=${owner} counts=${counts}/>`
            : page==='pipeline' ? html`<${PipelinePage}/>`
            : page==='team' ? html`<${TeamPage} roster=${rosterWithLoad} counts=${counts}/>`
            : page==='chat' ? html`<${OwnerChatPage}/>`
            : html`<${BusinessPage} page=${page} theme=${theme} setTheme=${setTheme}/>`}
          <//>
          </div>
          <${Marquee}/>
        <//>
      <//>
    </main>
    <${CommandPalette} open=${cmdk} setOpen=${setCmdk} onNavigate=${navigateTo}/>
    <${AnimatePresence}>${!booted && html`<${Loader}/>`}<//>
  `;
}

/* ============================== FEATURE GOVERNANCE ============================== */
const FEATURE_SCOPES = [
  { id:'whole_panel', label:'Whole panel' },
  { id:'technology', label:'Technology' },
  { id:'finance', label:'Finance' },
  { id:'marketing', label:'Marketing' },
];
const FEATURE_STATUSES = ['proposed','approved','in_progress','shipped','declined'];
const FEATURE_STATUS_LABELS = { proposed:'Proposed', approved:'Approved', in_progress:'In review', shipped:'Shipped', declined:'Declined' };

function FeatureGovernance(){
  const { owner } = useSession();
  const [features,setFeatures] = useStoredState('nashe:platform-features',[]);
  const [title,setTitle] = useState('');
  const [scope,setScope] = useState('whole_panel');
  const [description,setDescription] = useState('');
  const canManage = Boolean(owner && owner.canManageFeatureRequests);
  const rows = Array.isArray(features) ? features : [];

  const addFeature = () => {
    if(!canManage || title.trim().length<3) return;
    setFeatures(items => [{
      id: (crypto.randomUUID ? crypto.randomUUID() : 'feat-'+Date.now()),
      title: title.trim(),
      scope,
      description: description.trim(),
      status: 'proposed',
      by: owner ? owner.name : 'Founder',
    }, ...(Array.isArray(items)?items:[])]);
    setTitle('');setDescription('');setScope('whole_panel');
  };
  const updateStatus = (id, next) => {
    if(!canManage) return;
    setFeatures(items => (Array.isArray(items)?items:[]).map(item => item.id===id ? {...item, status: next} : item));
  };

  return html`
    <${motion.div} variants=${stagger} initial="hidden" animate="show">
      <section class="hero">
        <div class="crumb"><span class="live-dot"/>SHARED REGISTER · ${canManage?'TECHNOLOGY OWNER CONTROL':'READ ONLY'}</div>
        <h1>Platform <span class="grad">features.</span></h1>
        <p>Propose and track improvements to Technology, Finance, Marketing, or the whole founder panel. Entries are governed by the technology.manage capability and can never be deleted.</p>
      </section>
      <section class="panel-card">
        <div class="card-head"><h3>Feature governance</h3><span class="status-pill ${canManage?'good':'warn'}">${canManage?'CAN MANAGE':'READ ONLY'}</span></div>
        ${canManage ? html`
          <div class="feature-form">
            <input class="form-field" aria-label="Feature title" placeholder="Feature title" value=${title} onChange=${e=>setTitle(e.target.value)}/>
            <select class="form-field" aria-label="Target platform" value=${scope} onChange=${e=>setScope(e.target.value)}>
              ${FEATURE_SCOPES.map(s=>html`<option key=${s.id} value=${s.id}>${s.label}</option>`)}
            </select>
            <textarea class="form-field wide" aria-label="Feature description" placeholder="What should change and why?" value=${description} onChange=${e=>setDescription(e.target.value)} rows="3"></textarea>
            <button class="btn btn-pri" type="button" disabled=${title.trim().length<3} onClick=${addFeature}>＋ Add feature</button>
          </div>
        ` : html`<div class="permission-banner"><span>◉</span><div><strong>Read only.</strong> You can review the shared register, but only the technology owner can add proposals or change their status.</div></div>`}
        <div>
          ${rows.length === 0
            ? html`<${EmptyState} title="No proposals yet." hint=${canManage?'Add the first one above.':'The technology owner has not filed anything yet.'}/>`
            : rows.map(item=>html`
            <article key=${item.id} class="feature-item">
              <div class="feature-item-head"><h4>${item.title}</h4>
                ${canManage ? html`<select class="form-field" aria-label=${'Status for '+item.title} value=${item.status} onChange=${e=>updateStatus(item.id,e.target.value)} style=${{maxWidth:'155px',padding:'7px 9px',minHeight:'34px'}}>${FEATURE_STATUSES.map(st=>html`<option key=${st} value=${st}>${FEATURE_STATUS_LABELS[st]}</option>`)}</select>` : html`<span class="status-pill">${FEATURE_STATUS_LABELS[item.status]||item.status}</span>`}
              </div>
              <div class="feature-meta">${(FEATURE_SCOPES.find(s=>s.id===item.scope)||{label:item.scope}).label} · ${item.by||'Founder'}</div>
              <p>${item.description || 'No additional details provided.'}</p>
            </article>
          `)}
        </div>
        <div class="soft-note">Feature governance is enforced server-side: writes require technology.manage on your active founder membership, and row-level security blocks everything else.</div>
      </section>
    <//>`;
}

/* ============================== BOOTSTRAP ============================== */
// Render immediately with per-device state; hydration swaps in the server copy
// as soon as `/api/owner/workspace` resolves (and bounces to /owner-login on 401).
createRoot(document.getElementById('root')).render(html`<${App}/>`);
nasheBootstrap();
