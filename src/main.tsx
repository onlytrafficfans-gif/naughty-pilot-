import React, { useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Upload, Sparkles, LayoutDashboard, WandSparkles, ChartNoAxesCombined, Route, Rocket, SlidersHorizontal, Check, CircleDollarSign, MousePointer2, Eye, Users, TrendingUp, Info, ArrowUpRight, Image as ImageIcon, RotateCw, ShieldCheck, Bell, Settings, Zap, MessageCircle, Plus, Bot, Library, CreditCard, LockKeyhole, X, Send, Layers3 } from 'lucide-react';
import './styles.css';

// ─── DATA ────────────────────────────────────────────────────────────────────

const CHANNELS = [
  { id:'reddit',   label:'Reddit Ads',       cpm:0.9,  ctr:0.28, color:'#ff4500' },
  { id:'twitter',  label:'X / Twitter',      cpm:1.4,  ctr:0.22, color:'#1da1f2' },
  { id:'snap',     label:'Snapchat',          cpm:2.1,  ctr:0.35, color:'#fffc00' },
  { id:'tiktok',   label:'TikTok',            cpm:1.6,  ctr:0.41, color:'#69c9d0' },
  { id:'traffic',  label:'Traffic Junky',     cpm:0.5,  ctr:0.19, color:'#e84040' },
  { id:'taboola',  label:'Taboola',           cpm:0.7,  ctr:0.15, color:'#3b5eda' },
  { id:'bing',     label:'Microsoft Ads',     cpm:2.8,  ctr:0.31, color:'#008272' },
];

const TRAFFIC_MIX_DEFAULT: Record<string,number> = {
  reddit:24, twitter:20, snap:14, tiktok:12, traffic:11, taboola:11, bing:8
};

const skillCatalog: [string,string][] = [
  ['Creative Hook Writer','High-CTR opening lines for adult-creator ads'],
  ['Audience Profiler','Build lookalike and interest segments'],
  ['A/B Copy Tester','Split-test headlines and CTAs'],
  ['Compliance Checker','Flag policy-risky claims before launch'],
  ['Revenue Forecaster','Project subscriber revenue from spend'],
  ['Retargeting Planner','Re-engage clicks that did not convert'],
  ['Brand Voice Setter','Lock tone, vocabulary, and POV'],
  ['Landing Page Reviewer','CRO audit for OF link pages'],
];

const cheatCodes: [string,string][] = [
  ['High-CTR Hook','"She wanted to show you something..."'],
  ['Soft CTA','"See the rest — link in bio"'],
  ['Urgency Frame','"Only 3 spots left this week"'],
  ['Social Proof','"14,000 subscribers can not be wrong"'],
];

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function calcModel(budget: number, price: number, goal: number, mix: Record<string,number>) {
  let clicks = 0;
  CHANNELS.forEach(ch => {
    const pct = (mix[ch.id] || 0) / 100;
    const spend = budget * pct;
    const impressions = (spend / ch.cpm) * 1000;
    clicks += impressions * (ch.ctr / 100);
  });
  const visits   = Math.round(clicks * 0.31);
  const convRate = 0.04;
  const mid      = Math.round(visits * convRate);
  const low      = Math.round(mid * 0.67);
  const high     = Math.round(mid * 1.32);
  const revenue  = mid * price;
  return { clicks: Math.round(clicks), visits, mid, low, high, revenue };
}

function fmtNum(n: number) {
  return n >= 1000 ? (n/1000).toFixed(1).replace(/\.0$/,'')+'k' : String(n);
}

// ─── SMALL COMPONENTS ────────────────────────────────────────────────────────

function Metric({ label, value, icon: Icon }: any) {
  return (
    <div className="metric">
      <span>{label}<Icon size={13}/></span>
      <b>{value}</b>
    </div>
  );
}

function AdPlaceholder({ angle, hook, cta, image }: any) {
  const bg = image ? `url(${image}) center/cover` : 'linear-gradient(160deg,#1a0708,#0a0303)';
  return (
    <div className="ad" style={{background:bg}}>
      <div className="ad-overlay">
        <span>{angle}</span>
        <h3>{hook}</h3>
        <p>Tap to unlock exclusive content — limited availability.</p>
        <button><ArrowUpRight size={11}/> {cta}</button>
      </div>
    </div>
  );
}

function Toast({ msg, onDone }: any) {
  React.useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t); }, []);
  return <div className="toast"><span>✓</span> {msg}</div>;
}

// ─── DRAWER ──────────────────────────────────────────────────────────────────

function Drawer({ title, close, notify }: any) {
  const items=title==='Skills'?skillCatalog.slice(0,8).map(x=>[x[0],x[1]]):title==='Agents'?[['Brand Strategist','Positioning, voice, and offer alignment'],['Creative Director','Hooks, formats, copy, and variations'],['Media Buyer','Source mix, allocation, and optimization'],['Compliance Reviewer','18+, consent, policy, and claim checks'],['Website Analyst','Live public-site brand intelligence']]:cheatCodes;
  return <div className="drawer"><div className="drawer-head"><div><span>ADD TO CHAT</span><h2>{title}</h2></div><button onClick={close}><X/></button></div><div className="drawer-list">{items.map(([name,description]:any)=><button key={name} onClick={()=>{notify(`${name} added to Chat Studio.`);close()}}><div>{title==='Agents'?<Bot/>:title==='Skills'?<Sparkles/>:<Zap/>}</div><span><b>{name}</b><small>{description}</small></span><Plus/></button>)}</div></div>;
}

function BillingBoundary({budget,creatorName,close}:any){return <div className="billing-overlay"><div className="billing-modal"><button className="modal-close" onClick={close}><X/></button><div className="billing-lock"><LockKeyhole/></div><span>SECURE ACTIVATION HANDOFF</span><h1>Campaign is ready to fund.</h1><p>The complete demo ends here. A production account would continue to a PCI-compliant payment provider; Naughty Pilot does not collect card details on this screen.</p><div className="billing-summary"><div><span>Campaign</span><b>{creatorName||'Creator'} · Subscriber Growth</b></div><div><span>Test media budget</span><b>${budget}.00</b></div><div><span>Activation status</span><b>Ready</b></div></div><button className="payment-boundary" onClick={()=>{}}><CreditCard/> Add payment method <ArrowUpRight/></button><small><ShieldCheck/> DEMO STOP POINT · No charge made · No card data collected</small></div></div>;}
function Field({label,value,placeholder,onChange}:any){return <label>{label}<input value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/></label>;}

// ─── MAIN APP ────────────────────────────────────────────────────────────────

function App() {
  const [tab, setTab]           = useState<'overview'|'builder'|'creatives'|'traffic'|'forecast'|'launch'>('overview');
  const [step, setStep]         = useState(1); // campaign wizard step 1-3
  const [budget, setBudget]     = useState(2000);
  const [price, setPrice]       = useState(19.99);
  const [goal, setGoal]         = useState(240);
  const [creatorName, setCreatorName] = useState('');
  const [ofUrl, setOfUrl]       = useState('');
  const [image, setImage]       = useState<string|null>(null);
  const [generated, setGenerated] = useState(false);
  const [building, setBuilding] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [mix, setMix]           = useState<Record<string,number>>({...TRAFFIC_MIX_DEFAULT});
  const [mixOpen, setMixOpen]   = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMsg, setChatMsg]   = useState('');
  const [chatLog, setChatLog]   = useState<{role:string;text:string}[]>([
    {role:'ai', text:'Hi! I'm your AI media buyer. Upload a photo or ask me anything about your campaign.'}
  ]);
  const [drawer, setDrawer]     = useState<string|null>(null);
  const [toast, setToast]       = useState<string|null>(null);
  const [billing, setBilling]   = useState(false);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [scanning, setScanning] = useState(false);
  const [siteData, setSiteData] = useState<any>(null);
  const [siteError, setSiteError] = useState<string|null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const model = useMemo(() => calcModel(budget, price, goal, mix), [budget, price, goal, mix]);

  function notify(msg: string) { setToast(msg); }

  function upload(file: File | undefined) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => { setImage(e.target?.result as string); setGenerated(false); setBuilding(false); setDemoStep(0); };
    reader.readAsDataURL(file);
  }

  function runBuild() {
    if (!image) return;
    setBuilding(true); setGenerated(false); setDemoStep(1);
    let s = 1;
    const iv = setInterval(() => {
      s++; setDemoStep(s);
      if (s >= 6) { clearInterval(iv); setTimeout(() => { setBuilding(false); setGenerated(true); setDemoStep(0); notify('Campaign built! Review each layer before launch.'); }, 700); }
    }, 750);
  }

  function sendChat(e: React.FormEvent) {
    e.preventDefault();
    if (!chatMsg.trim()) return;
    const userMsg = chatMsg.trim();
    setChatLog(l => [...l, {role:'user', text:userMsg}]);
    setChatMsg('');
    setTimeout(() => {
      const reply = userMsg.toLowerCase().includes('budget') ? `For a $${budget} test budget I'd recommend allocating roughly 24% to Reddit, 20% to X, and 14% to Snapchat — those three alone should reach ~${fmtNum(model.clicks)} estimated clicks.`
        : userMsg.toLowerCase().includes('convert') ? `At a 4% visit-to-paid rate you're modeled for ~${model.mid} subscribers. Increasing your subscription price to $24.99 could lift revenue ~25% with the same traffic.`
        : `Great question. Based on your current campaign inputs — $${budget} budget, $${price} price — the model shows a likely range of ${model.low}–${model.high} new subscribers.`;
      setChatLog(l => [...l, {role:'ai', text:reply}]);
    }, 900);
  }

  async function analyzeWebsite() {
    if (!websiteUrl.trim()) return;
    setScanning(true); setSiteData(null); setSiteError(null);
    try {
      const res = await fetch('/api/analyze-website', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({url:websiteUrl}) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Analysis failed.');
      setSiteData(data);
    } catch(err:any) { setSiteError(err.message); }
    finally { setScanning(false); }
  }

  const NAV = [
    { id:'overview',  label:'Overview',         Icon: LayoutDashboard },
    { id:'builder',   label:'Campaign Builder',  Icon: WandSparkles },
    { id:'creatives', label:'Creatives',         Icon: ImageIcon },
    { id:'traffic',   label:'Traffic Mix',       Icon: ChartNoAxesCombined },
    { id:'forecast',  label:'Forecast',          Icon: TrendingUp },
    { id:'launch',    label:'Launch Plan',       Icon: Rocket },
  ];

  return (
    <div className="app">
      {/* ── SIDEBAR ── */}
      <aside>
        <div className="brand">
          <img src="https://i.imgur.com/placeholder-np.png" alt="NP" onError={e=>{(e.target as HTMLImageElement).style.display='none'}} />
          <span className="brand-text">NAUGHTY<br/>PILOT</span>
        </div>
        <div className="tier">
          <Crown size={16}/>
          <div><b>BLACK ACCOUNT</b><span>Highest access level</span></div>
        </div>
        <nav>
          {NAV.map(({id,label,Icon})=>(
            <button key={id} className={tab===id?'on':''} onClick={()=>setTab(id as any)}>
              <Icon size={15}/><span>{label}</span>
            </button>
          ))}
        </nav>
        <div className="side-note elite">
          <Zap size={14}/>
          <div><b>Operator priority active</b><span>Unlimited planning · premium source presets · priority campaign routing</span></div>
        </div>
      </aside>

      {/* ── MAIN ── */}
      <main>
        {/* header */}
        <header>
          <div className="sim live"><i/>AI MEDIA BUYER ONLINE<span>· Ready to build from your photos</span></div>
          <div className="head-actions">
            <button><Bell size={14}/></button>
            <button><Settings size={14}/></button>
            <button className="profile"><span className="np-avatar">NP</span><span><b>Naughty Pilot Black</b><small>AI campaign workspace</small></span></button>
          </div>
        </header>

        {/* ─── OVERVIEW ─────────────────────────────────────── */}
        {tab==='overview' && (
          <div className="workspace">
            <div className="intro">
              <div>
                <h1>Drop your photos.<br/><em>AI builds the campaign.</em></h1>
                <p>Like an ads manager with an AI media buyer inside it. Upload once and get the objective, audience, placements, budget, copy, creative variants, and forecast automatically.</p>
                <button className="ai-do" onClick={()=>setTab('builder')}><Sparkles size={17}/>AI DO IT<ArrowUpRight size={15}/></button>
              </div>
              <div className="truth"><ShieldCheck size={14}/><b>AI build mode</b><span>Every campaign layer remains editable before launch.</span></div>
            </div>

            {/* builder preview */}
            <div className="builder">
              <div className="upload">
                {!image && (
                  <div className="drop-zone" onClick={()=>fileRef.current?.click()}>
                    <Upload size={32}/>
                    <b>Drop campaign photos</b>
                    <span>One or more JPG/PNG files · AI analyzes the strongest angle</span>
                    <button className="primary">Choose photos</button>
                  </div>
                )}
                {image && !building && (
                  <div className="preview-wrap">
                    <img src={image} alt="campaign creative"/>
                    <button className="replace" onClick={()=>fileRef.current?.click()}><RotateCw size={12}/> Replace</button>
                  </div>
                )}
                {building && (
                  <div className="scan scanning">
                    <Sparkles size={36}/>
                    <b>{['','Analyzing creative','Selecting objective','Building audience','Allocating placements','Generating ad suggestions','Campaign complete'][demoStep]}</b>
                    <span>AI campaign automation in progress</span>
                    <div className="progress"><i style={{width:`${demoStep*16}%`}}/></div>
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>upload(e.target.files?.[0])}/>
              </div>
              <div className="controls">
                <div className="ai-title"><Sparkles/><div><b>AI campaign setup</b><span>{generated?'Campaign generated · ready to edit':'Upload a photo to generate every layer'}</span></div></div>
                <label>Daily test budget<b>${budget.toLocaleString()}</b>
                  <input type="range" min={500} max={10000} step={100} value={budget} onChange={e=>setBudget(+e.target.value)}/>
                  <div className="range-ends"><span>$500</span><span>$10k</span></div>
                </label>
                <label>Subscription price<b>${price.toFixed(2)}</b>
                  <input type="range" min={4.99} max={49.99} step={1} value={price} onChange={e=>setPrice(+e.target.value)}/>
                </label>
                <label>Subscriber target<b>{goal}+</b>
                  <input type="range" min={50} max={500} step={10} value={goal} onChange={e=>setGoal(+e.target.value)}/>
                </label>
                <div className="mixer">
                  <select><option>AI chooses best angle</option><option>Confident & playful</option><option>Mysterious & exclusive</option></select>
                  <select><option>AI optimized · 21+</option><option>United States · 21+</option><option>United Kingdom · 21+</option></select>
                </div>
                <button className="primary" onClick={runBuild} disabled={!image||building}><Sparkles size={15}/> Build full campaign with AI</button>
              </div>
            </div>

            {/* KPIs */}
            <div className="metrics">
              <div className="forecast-lead">
                <span>MODELED MIDPOINT</span>
                <strong>{model.mid}</strong>
                <p>paid subscribers</p>
                <small>Likely planning range <em>{model.low}–{model.high}</em></small>
              </div>
              <Metric label="Test spend" value={`$${budget.toLocaleString()}`} icon={CircleDollarSign}/>
              <Metric label="Est. clicks" value={fmtNum(model.clicks)} icon={MousePointer2}/>
              <Metric label="Landing visits" value={fmtNum(model.visits)} icon={Eye}/>
              <Metric label="Paid conversions" value={model.mid} icon={Users}/>
              <Metric label="Modeled revenue" value={`$${model.revenue.toLocaleString()}`} icon={TrendingUp}/>
              <Metric label="Visit → paid" value="4.00%" icon={Info}/>
            </div>

            {/* Traffic mix preview */}
            <div className="mix">
              <div className="mix-head">
                <span>RECOMMENDED TRAFFIC MIX</span>
                <p>Research-backed source presets, modeled here with your spend and outcomes.</p>
                <button onClick={()=>setMixOpen(m=>!m)}><SlidersHorizontal size={12}/> Adjust mix</button>
              </div>
              <div className="channel-grid">
                {CHANNELS.map(ch=>(
                  <div key={ch.id} className="channel-row">
                    <i style={{background:ch.color}}/>
                    <span>{ch.label}</span>
                    <b>{mix[ch.id]}%</b>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ─── CAMPAIGN BUILDER ─────────────────────────────── */}
        {tab==='builder' && (
          <div className="workspace">
            <div className="workspace-head">
              <div><span>CAMPAIGN WIZARD</span><h1>Build My Campaign</h1><p>From one photo to a full launch plan.</p></div>
              <button onClick={()=>setTab('overview')}><X size={14}/> Close</button>
            </div>

            {/* Step tabs */}
            <div className="campaign-tabs">
              {[['1','Campaign'],['2','Ad set'],['3','Creatives']].map(([n,l],i)=>(
                <button key={n} className={step===i+1?'active':''} onClick={()=>setStep(i+1)}>
                  <span>{n}</span>{l}
                </button>
              ))}
              <i/><i/>
              <div className="autosave"><i/>Autosaved</div>
            </div>

            {step===1 && (
              <div className="form-grid">
                <section>
                  <h2>CAMPAIGN</h2>
                  <Field label="Creator name" value={creatorName} placeholder="e.g. Luna Rose" onChange={setCreatorName}/>
                  <Field label="OnlyFans URL" value={ofUrl} placeholder="https://onlyfans.com/..." onChange={setOfUrl}/>
                  <label>Campaign objective
                    <select><option>Subscriber Growth</option><option>Fan Retention</option><option>PPV Launch</option></select>
                  </label>
                </section>
                <section>
                  <h2>BUDGET</h2>
                  <label>Daily test budget<b>${budget}</b>
                    <input type="range" min={500} max={10000} step={100} value={budget} onChange={e=>setBudget(+e.target.value)}/>
                  </label>
                  <label>Subscription price<b>${price.toFixed(2)}</b>
                    <input type="range" min={4.99} max={49.99} step={1} value={price} onChange={e=>setPrice(+e.target.value)}/>
                  </label>
                </section>
                <section>
                  <h2>AUDIENCE</h2>
                  <label>Primary market
                    <select><option>United States · 21+</option><option>United Kingdom · 21+</option><option>Global · 21+</option></select>
                  </label>
                  <label>Content tone
                    <select><option>Confident & playful</option><option>Mysterious & exclusive</option><option>Intimate & personal</option></select>
                  </label>
                </section>
              </div>
            )}

            {step===2 && (
              <div className="form-grid">
                <section>
                  <h2>OBJECTIVE</h2>
                  <div className="ai-output">
                    <div><span>OBJECTIVE</span><b>Subscriber Growth · Conversions</b><small>Optimized for paid membership events</small></div>
                    <div><span>AUDIENCE</span><b>High-intent · US · 21+</b><small>Expanded interests and lookalike segment</small></div>
                    <div><span>PLACEMENTS</span><b>7-channel optimized mix</b><small>Automatic source-level allocation</small></div>
                    <div><span>CREATIVE</span><b>3 angles · 9 variations</b><small>Copy, crop, CTA, and format generated</small></div>
                  </div>
                </section>
              </div>
            )}

            {step===3 && (
              <div className="workspace">
                <div className="creative-toolbar">
                  <button className="primary" onClick={()=>setTab('creatives')}><Sparkles size={14}/> Generate creatives</button>
                  <span>{generated?'3 angles ready':'Upload photo first to generate'}</span>
                </div>
                <div className="creative-library">
                  {['Confident & Direct','Mystery & Tease','Exclusive Access'].map((angle,i)=>(
                    <AdPlaceholder key={i} angle={`ANGLE ${i+1}`} hook={angle} cta="Subscribe now" image={i===0?image:null}/>
                  ))}
                </div>
              </div>
            )}

            <div style={{display:'flex',gap:12,marginTop:20}}>
              {step>1 && <button className="primary" style={{background:'#222',border:'1px solid #444'}} onClick={()=>setStep(s=>s-1)}>← Back</button>}
              {step<3 && <button className="primary" onClick={()=>setStep(s=>s+1)}>Continue →</button>}
              {step===3 && <button className="primary" onClick={()=>{ notify('Campaign saved. Review in Launch Plan.'); setTab('launch'); }}>Save campaign</button>}
            </div>
          </div>
        )}

        {/* ─── CREATIVES ────────────────────────────────────── */}
        {tab==='creatives' && (
          <div className="workspace">
            <div className="workspace-head">
              <div><span>CREATIVE STUDIO</span><h1>Ad Creatives</h1><p>AI-generated angles from your campaign photo.</p></div>
            </div>
            <div className="creative-toolbar">
              <button className="primary" onClick={()=>fileRef.current?.click()}><Upload size={14}/> Upload photo</button>
              <button className="primary" onClick={runBuild} disabled={!image||building}><Sparkles size={14}/> Regenerate</button>
              <span className="muted">{image?'3 creative variations':'No photo uploaded'}</span>
            </div>
            <div className="creative-library">
              {['Confident & Direct','Mystery & Tease','Exclusive Access'].map((angle,i)=>(
                <AdPlaceholder key={i} angle={`ANGLE ${i+1}`} hook={angle} cta={i===0?'Subscribe now':i===1?'See more →':'Join exclusively'} image={i===0?image:null}/>
              ))}
            </div>
            <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>upload(e.target.files?.[0])}/>
          </div>
        )}

        {/* ─── TRAFFIC MIX ─────────────────────────────────── */}
        {tab==='traffic' && (
          <div className="workspace">
            <div className="workspace-head">
              <div><span>TRAFFIC ROUTING</span><h1>Traffic Mix</h1><p>Allocate your test budget across channels.</p></div>
            </div>
            <div className="traffic-table">
              <div className="tr th">
                <span>CHANNEL</span><span>ALLOC</span><span>EST. CLICKS</span><span>CPM</span><span>ACTIVE</span>
              </div>
              {CHANNELS.map(ch => {
                const spend = (budget * (mix[ch.id]||0)) / 100;
                const clicks = Math.round((spend / ch.cpm) * 1000 * (ch.ctr / 100));
                return (
                  <div key={ch.id} className="tr">
                    <span><i style={{background:ch.color}}/><span>{ch.label}<small>${ch.cpm.toFixed(2)} CPM</small></span></span>
                    <span><b>{mix[ch.id]}%</b></span>
                    <span>{fmtNum(clicks)}</span>
                    <span>${ch.cpm.toFixed(2)}</span>
                    <button className={`switch ${mix[ch.id]>0?'on':''}`} onClick={()=>setMix(m=>({...m,[ch.id]:m[ch.id]>0?0:TRAFFIC_MIX_DEFAULT[ch.id]}))}>  <i/></button>
                  </div>
                );
              })}
            </div>
            <div className="traffic-actions">
              <button onClick={()=>setMix({...TRAFFIC_MIX_DEFAULT})}><RotateCw size={12}/> Reset to AI default</button>
              <span>Total: {Object.values(mix).reduce((a,b)=>a+b,0)}%</span>
            </div>
          </div>
        )}

        {/* ─── FORECAST ────────────────────────────────────── */}
        {tab==='forecast' && (
          <div className="workspace">
            <div className="workspace-head">
              <div><span>REVENUE MODEL</span><h1>Forecast</h1><p>Directional subscriber and revenue estimates.</p></div>
            </div>
            <div className="forecast-screen">
              <div className="forecast-big">
                <span>MODELED MIDPOINT</span>
                <strong>{model.mid}</strong>
                <p>paid subscribers<br/>Range: {model.low}–{model.high}</p>
              </div>
              <div className="chart">
                <div className="chart-bars">
                  {[0.4,0.55,0.7,0.85,1,0.9,1.1].map((h,i)=>(
                    <i key={i} style={{height:`${h*model.mid/model.high*90}%`}}/>
                  ))}
                </div>
                <div className="chart-labels">{['Wk 1','Wk 2','Wk 3','Wk 4','Wk 5','Wk 6','Wk 7'].map(l=><span key={l}>{l}</span>)}</div>
              </div>
            </div>
            <div className="forecast-kpis">
              <Metric label="Test spend" value={`$${budget.toLocaleString()}`} icon={CircleDollarSign}/>
              <Metric label="Est. clicks" value={fmtNum(model.clicks)} icon={MousePointer2}/>
              <Metric label="Landing visits" value={fmtNum(model.visits)} icon={Eye}/>
              <Metric label="Modeled revenue" value={`$${model.revenue.toLocaleString()}`} icon={TrendingUp}/>
            </div>
          </div>
        )}

        {/* ─── LAUNCH PLAN ─────────────────────────────────── */}
        {tab==='launch' && (
          <div className="workspace">
            <div className="workspace-head">
              <div><span>EXECUTION PLAN</span><h1>Launch Plan</h1><p>Review every layer before activating your campaign.</p></div>
            </div>
            <div className="launch-screen">
              <div>
                {[['Campaign setup','Creator name, objective, and placements configured',true],
                  ['Creative angles','3 ad angles with 9 copy variations',generated],
                  ['Traffic routing','7-channel allocation locked in',true],
                  ['Forecast reviewed','Subscriber and revenue model reviewed',true],
                  ['Compliance check','Policy review passed for all placements',true],
                ].map(([title,desc,done]:any,i)=>(
                  <div key={i} className="review-row">
                    <i><Rocket size={12}/></i>
                    <span>{title}<small>{desc}</small></span>
                    {done ? <Check size={14} color="#ef2931"/> : <span style={{color:'#555',fontSize:9}}>PENDING</span>}
                  </div>
                ))}
              </div>
              <div className="launch-summary">
                <span>CAMPAIGN SUMMARY</span>
                <h2>{creatorName||'Your Campaign'}</h2>
                <dl>
                  {[['Budget',`$${budget.toLocaleString()}`],['Price',`$${price.toFixed(2)}/mo`],['Target',`${goal}+ subscribers`],['Channels','7 sources'],['Modeled subs',`${model.low}–${model.high}`],['Revenue est.',`$${model.revenue.toLocaleString()}`]].map(([k,v])=>(
                    <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
                  ))}
                </dl>
                <button className="primary launch" onClick={()=>setBilling(true)}><Rocket size={15}/> Activate campaign</button>
              </div>
            </div>
          </div>
        )}

        <footer>
          <b>NAUGHTY PILOT</b>
          <span>Forecasts vary with creative quality, audience, offer, tracking, seasonality, and traffic quality. This tool provides directional planning estimates, not guaranteed results.</span>
        </footer>
      </main>

      {/* ── CHAT ── */}
      {chatOpen && (
        <div className="chat-panel">
          <div className="chat-head"><Bot size={15}/><b>AI Media Buyer</b><button onClick={()=>setChatOpen(false)}><X size={14}/></button></div>
          <div className="chat-log">{chatLog.map((m,i)=>(
            <div key={i} className={`chat-msg ${m.role}`}>{m.text}</div>
          ))}</div>
          <form className="chat-form" onSubmit={sendChat}>
            <input value={chatMsg} onChange={e=>setChatMsg(e.target.value)} placeholder="Ask about your campaign..."/>
            <button type="submit"><Send size={14}/></button>
          </form>
          <div className="chat-actions">
            {(['Skills','Agents','Cheats'] as const).map(d=>(
              <button key={d} onClick={()=>setDrawer(d)}>{d==='Skills'?<Library size={12}/>:d==='Agents'?<Bot size={12}/>:<Zap size={12}/>} {d}</button>
            ))}
          </div>
        </div>
      )}

      {/* chat toggle */}
      <button className="chat-fab" onClick={()=>setChatOpen(o=>!o)}>
        {chatOpen ? <X size={20}/> : <MessageCircle size={20}/>}
      </button>

      {/* drawer */}
      {drawer && <Drawer title={drawer} close={()=>setDrawer(null)} notify={notify}/>}

      {/* billing modal */}
      {billing && <BillingBoundary budget={budget} creatorName={creatorName} close={()=>setBilling(false)}/>}

      {/* toast */}
      {toast && <Toast msg={toast} onDone={()=>setToast(null)}/>}
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App/>);
