import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Upload, Sparkles, LayoutDashboard, WandSparkles, ChartNoAxesCombined, Route, Rocket, SlidersHorizontal, Check, CircleDollarSign, MousePointer2, Eye, Users, TrendingUp, Info, ArrowUpRight, Image as ImageIcon, RotateCw, ShieldCheck, Bell, Settings, Zap, MessageCircle, Plus, Bot, Library, CreditCard, LockKeyhole, X, Send, Layers3 } from 'lucide-react';
import './styles.css';

const channels = [
  { name:'TrafficJunky', model:'CPM', color:'#ff554f', base:24, note:'Tube inventory · keyword + geo' },
  { name:'ExoClick', model:'CPC / sCPM', color:'#ff806b', base:20, note:'Native + display · source rules' },
  { name:'JuicyAds', model:'CPC / CPM', color:'#ffad72', base:14, note:'Native + banner · device targeting' },
  { name:'Reddit', model:'Organic', color:'#e5c277', base:12, note:'Community-led discovery' },
  { name:'X / Social', model:'Organic', color:'#c3d661', base:11, note:'Preview-safe social funnel' },
  { name:'Creator swaps', model:'Flat fee', color:'#9fcf54', base:11, note:'Audience-aligned shoutouts' },
  { name:'SEO / Clips', model:'Owned', color:'#76bf52', base:8, note:'Compounding discovery' },
];

const nav = [
  [LayoutDashboard,'Overview'],[MessageCircle,'Chat Studio'],[ImageIcon,'Model Assets'],[WandSparkles,'Campaign Builder'],[ImageIcon,'Creatives'],[ChartNoAxesCombined,'Traffic Mix'],[Route,'Forecast'],[Rocket,'Launch Plan'],[Sparkles,'AI Skills'],[Zap,'Naughty Cheat Codes']
] as const;

const cheatCodes=[
  ['Viral Hook Formula','Turn any photo into a scroll-stopping first line'],
  ['Price Anchor Stack','Frame your subscription so $X feels like a steal'],
  ['Scarcity Trigger','Limited-time language that converts without lying'],
  ['DM Opener Sequence','3-message sequence from cold follow to paid sub'],
  ['Re-sub Winback','Recover churned subs with one well-timed message'],
  ['Free Trial Funnel','Trial-to-paid conversion blueprint'],
  ['Bundle Upsell Script','Turn one purchase into three'],
  ['Content Calendar OS','30-day posting cadence for max algorithmic reach'],
];

const skillCatalog=[
  [Sparkles,'Conversion Copy','Write captions, bios, and CTAs that convert'],
  [ImageIcon,'Creative Analysis','Score and rank your photos by predicted CTR'],
  [Users,'Audience Intel','Map demographics, interests, and lookalikes'],
  [ChartNoAxesCombined,'Forecast Modeling','Project subs and revenue from spend inputs'],
  [Route,'Traffic Routing','Allocate budget across channels by ROI'],
  [WandSparkles,'Ad Variation Engine','Generate 9 ad variants from one creative'],
  [MessageCircle,'DM Sequences','Automate warm-up to conversion messages'],
  [Rocket,'Launch Sequencer','Step-by-step campaign go-live checklist'],
  [Library,'Content Library','Organize, tag, and repurpose your media'],
  [Bot,'Compliance Auditor','Flag policy violations before you spend'],
  [Zap,'Retargeting Playbook','Re-engage visitors who didn\'t convert'],
  [Settings,'A/B Test Planner','Design split tests with statistical confidence'],
];

function model(budget:number,price:number,goal:number){
  const cpc=.10,ctr=.043,cvr=.04;
  const clicks=Math.round((budget/cpc)*ctr*10);
  const visits=Math.round(clicks*ctr*100);
  const mid=Math.round(visits*cvr);
  const rev=mid*price;
  return{clicks,visits,mid,low:Math.round(mid*.68),high:Math.round(mid*1.32),rev,roas:(rev/budget)};
}

export function App(){
  const[page,setPage]=useState('Overview');
  const[budget,setBudget]=useState(300);
  const[price,setPrice]=useState(19.99);
  const[goal,setGoal]=useState(240);
  const[image,setImage]=useState<string|null>(null);
  const[building,setBuilding]=useState(false);
  const[demoStep,setDemoStep]=useState(0);
  const[generated,setGenerated]=useState(false);
  const[mixOpen,setMixOpen]=useState(false);
  const[mix,setMix]=useState(channels.map(c=>c.base));
  const[toast,setToast]=useState<string|null>(null);
  const[drawerOpen,setDrawerOpen]=useState<string|null>(null);
  const[chatMsg,setChatMsg]=useState('');
  const[chatLog,setChatLog]=useState<{role:string,text:string}[]>([{role:'ai',text:'Hey — drop a question about your campaign, traffic mix, or creative strategy. I\'ll give you a direct answer.'}]);
  const[creatorName,setCreatorName]=useState('');
  const[niche,setNiche]=useState('');
  const[angle,setAngle]=useState('Confident & playful');
  const[region,setRegion]=useState('United States · 21+');
  const[billingOpen,setBillingOpen]=useState(false);
  const[websiteUrl,setWebsiteUrl]=useState('');
  const[websiteLoading,setWebsiteLoading]=useState(false);
  const[websiteResult,setWebsiteResult]=useState<any>(null);
  const[websiteError,setWebsiteError]=useState<string|null>(null);
  const fileRef=useRef<HTMLInputElement>(null);
  const chatRef=useRef<HTMLDivElement>(null);

  const m=useMemo(()=>model(budget,price,goal),[budget,price,goal]);
  const totalMix=mix.reduce((a,b)=>a+b,0);

  function notify(msg:string){setToast(msg);setTimeout(()=>setToast(null),3200);}

  function runBuild(doneMsg?:string){
    setBuilding(true);setGenerated(false);setDemoStep(1);
    let s=1;
    const iv=setInterval(()=>{s++;setDemoStep(s);if(s>=6){clearInterval(iv);setBuilding(false);setGenerated(true);if(doneMsg)notify(doneMsg);}},900);
  }

  function upload(file?:File){
    if(!file)return;
    setImage(URL.createObjectURL(file));
    runBuild('Campaign built from your creative — every layer is editable.');
  }

  function buildFromSite(){
    if(!websiteResult)return;
    const siteImage=websiteResult.images?.[0];
    if(siteImage)setImage(siteImage);
    setPage('Campaign Builder');
    runBuild(`Campaign built from ${websiteResult.profile?.brand||'your site'} — every layer is editable.`);
  }

  function sendChat(){
    if(!chatMsg.trim())return;
    const q=chatMsg.trim();
    setChatLog(l=>[...l,{role:'user',text:q}]);
    setChatMsg('');
    setTimeout(()=>{
      const lower=q.toLowerCase();
      let reply='Here\'s the breakdown: focus your first $500 on TrafficJunky CPM targeting 21+ US, then layer in ExoClick native once you have CTR data. Optimize to the top 2 sources by day 4.';
      if(/budget|spend/i.test(lower))reply=`With $${budget} test budget at $${price}/mo, the model projects ${m.mid} paid subs (range ${m.low}–${m.high}). Allocate 40% TrafficJunky, 30% ExoClick, rest across Reddit and X organic.`;
      if(/creative|photo|image/i.test(lower))reply='Upload a JPG or PNG in the Campaign Builder tab. The AI analyzes the strongest angle — face-forward with natural lighting consistently outperforms.';
      if(/traffic|channel|source/i.test(lower))reply='Your current mix puts 24% on TrafficJunky and 20% ExoClick — that\'s the right spine. Reddit and X organic at ~12% each compound over time without added spend.';
      if(/forecast|project|revenue/i.test(lower))reply=`At $${price}/mo with ${m.mid} conversions, modeled revenue is $${m.rev.toFixed(0)}. ROAS: ${m.roas.toFixed(2)}x. That improves significantly after the test phase when you cut low-performing sources.`;
      setChatLog(l=>[...l,{role:'ai',text:reply}]);
      setTimeout(()=>chatRef.current?.scrollTo({top:9999,behavior:'smooth'}),50);
    },1100);
  }

  async function analyzeWebsite(){
    if(!websiteUrl.trim())return;
    setWebsiteLoading(true);setWebsiteResult(null);setWebsiteError(null);
    try{
      const r=await fetch('/api/analyze-website',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:websiteUrl})});
      const d=await r.json();
      if(!r.ok)throw new Error(d.error||'Analysis failed.');
      setWebsiteResult(d);
      if(d.profile?.brand)setCreatorName(d.profile.brand);
      const positioning=d.profile?.positioning||'';
      if(/luxury/i.test(positioning))setAngle('Luxury lifestyle');
      else if(/fantasy|discreet/i.test(positioning))setAngle('Mysterious & exclusive');
    }catch(e:any){setWebsiteError(e.message);}
    finally{setWebsiteLoading(false);}
  }

  const isBlack=true;

  const[isDesktop,setIsDesktop]=useState(()=>typeof window==='undefined'||window.innerWidth>=1180);
  useEffect(()=>{
    const mq=window.matchMedia('(min-width: 1180px)');
    const onChange=()=>setIsDesktop(mq.matches);
    mq.addEventListener('change',onChange);
    return()=>mq.removeEventListener('change',onChange);
  },[]);

  if(!isDesktop)return(
    <div className="desktop-gate">
      <img src="/naughty-pilot-logo.png" alt="Naughty Pilot"/>
      <p>NaughtyPilot is a desktop campaign workspace. Open it on a screen at least 1180px wide.</p>
    </div>
  );

  return(
    <div className="app">
      <aside>
        <div className="brand"><img src="/naughty-pilot-logo.png" alt="Naughty Pilot"/></div>
        {isBlack&&<div className="tier elite"><SlidersHorizontal/><div><b>BLACK ACCOUNT</b><span>Highest access level</span></div></div>}
        <nav>
          {nav.map(([Icon,label])=>
            <button key={label} className={page===label?'on':''} onClick={()=>setPage(label)}>
              <Icon/><span>{label}</span>
            </button>
          )}
        </nav>
        <div className="side-note elite">
          <Zap/><div><b>Operator priority active</b><span>Unlimited planning · premium source presets · priority campaign routing</span></div>
        </div>
      </aside>

      <main>
        <header>
          <span className="head-title">Ready to build from your photos</span>
          <div className="head-actions">
            <button aria-label="Notifications"><Bell/></button>
            <button aria-label="Settings"><Settings/></button>
          </div>
        </header>

        {isBlack&&<div className="account-strip">
          <div><span>ACCOUNT STATUS</span><b><i/>Active</b></div>
          <div><span>MEDIA BALANCE</span><b>$25,000.00</b></div>
          <div><span>ACTIVE CAMPAIGNS</span><b>08</b></div>
          <div><span>30-DAY REVENUE</span><b>$48,920</b></div>
          <div><span>ACCOUNT MANAGER</span><b>Priority desk</b></div>
        </div>}

        {page==='Overview'&&<OverviewPage budget={budget} setBudget={setBudget} price={price} setPrice={setPrice} goal={goal} setGoal={setGoal} image={image} building={building} demoStep={demoStep} generated={generated} upload={upload} fileRef={fileRef} m={m} mixOpen={mixOpen} setMixOpen={setMixOpen} mix={mix} setMix={setMix} totalMix={totalMix} angle={angle} setAngle={setAngle} region={region} setRegion={setRegion} isBlack={isBlack} websiteUrl={websiteUrl} setWebsiteUrl={setWebsiteUrl} websiteLoading={websiteLoading} websiteResult={websiteResult} websiteError={websiteError} analyzeWebsite={analyzeWebsite} buildFromSite={buildFromSite} onBuild={()=>runBuild('Campaign built — every layer is editable.')}/>}
        {page==='Campaign Builder'&&<CampaignPage budget={budget} setBudget={setBudget} price={price} setPrice={setPrice} goal={goal} setGoal={setGoal} image={image} building={building} demoStep={demoStep} generated={generated} upload={upload} fileRef={fileRef} m={m} angle={angle} setAngle={setAngle} region={region} setRegion={setRegion} setBillingOpen={setBillingOpen} adHook={websiteResult?.adSuggestions?.[0]} onBuild={()=>runBuild('Campaign built — every layer is editable.')}/>}
        {page==='Chat Studio'&&<ChatPage chatLog={chatLog} chatMsg={chatMsg} setChatMsg={setChatMsg} sendChat={sendChat} chatRef={chatRef} drawerOpen={drawerOpen} setDrawerOpen={setDrawerOpen} notify={notify}/>}
        {page==='Model Assets'&&<AssetsPage websiteUrl={websiteUrl} setWebsiteUrl={setWebsiteUrl} websiteLoading={websiteLoading} websiteResult={websiteResult} websiteError={websiteError} analyzeWebsite={analyzeWebsite} buildFromSite={buildFromSite}/>}
        {page==='Creatives'&&<CreativesPage image={image} upload={upload} fileRef={fileRef} notify={notify}/>}
        {page==='Traffic Mix'&&<TrafficPage mix={mix} setMix={setMix} totalMix={totalMix} notify={notify}/>}
        {page==='Forecast'&&<ForecastPage m={m} budget={budget} price={price}/>}
        {page==='Launch Plan'&&<LaunchPage m={m} budget={budget} price={price} creatorName={creatorName} setBillingOpen={setBillingOpen} notify={notify}/>}
        {page==='AI Skills'&&<SkillsPage notify={notify}/>}
        {page==='Naughty Cheat Codes'&&<CheatCodesPage notify={notify}/>}

        <footer>
          <b>NAUGHTY PILOT</b>
          <span>Forecasts vary with creative quality, audience, offer, tracking, seasonality, and traffic quality.</span>
        </footer>
      </main>

      {toast&&<div className="toast" onClick={()=>setToast(null)}><span>✓</span> {toast}</div>}
      {billingOpen&&<BillingBoundary budget={budget} creatorName={creatorName} close={()=>setBillingOpen(false)}/>}
      {drawerOpen&&<Drawer title={drawerOpen} close={()=>setDrawerOpen(null)} notify={notify}/>}
    </div>
  );
}

function OverviewPage({budget,setBudget,price,setPrice,goal,setGoal,image,building,demoStep,generated,upload,fileRef,m,mixOpen,setMixOpen,mix,setMix,totalMix,angle,setAngle,region,setRegion,isBlack,websiteUrl,setWebsiteUrl,websiteLoading,websiteResult,websiteError,analyzeWebsite,buildFromSite,onBuild}:any){
  return(
    <div className="intro">
      <div>
        <span>COMMAND CENTER</span>
        <h1>Command every channel.<br/><em>Scale what converts.</em></h1>
        <p>Your highest-access acquisition workspace—creative generation, premium traffic routing, forecast modeling, and campaign execution in one command center.</p>
      </div>
      <Builder budget={budget} setBudget={setBudget} price={price} setPrice={setPrice} goal={goal} setGoal={setGoal} image={image} building={building} demoStep={demoStep} generated={generated} upload={upload} fileRef={fileRef} m={m} mixOpen={mixOpen} setMixOpen={setMixOpen} mix={mix} setMix={setMix} totalMix={totalMix} angle={angle} setAngle={setAngle} region={region} setRegion={setRegion} adHook={websiteResult?.adSuggestions?.[0]} onBuild={onBuild}/>
      {isBlack&&<div className="website-panel">
        <div><span>MODEL INTELLIGENCE</span><h2>Website brand scan</h2><p>Drop your OF/Fansly URL — AI extracts brand signals, ad angles, and copy hooks, then builds your campaign from them.</p></div>
        <div><div className="website-form"><input value={websiteUrl} onChange={e=>setWebsiteUrl(e.target.value)} placeholder="https://onlyfans.com/yourname" onKeyDown={e=>e.key==='Enter'&&analyzeWebsite()}/><button onClick={analyzeWebsite} disabled={websiteLoading}>{websiteLoading?<><i className="site-loader"/></>:<><Sparkles/>Scan</>}</button></div>{websiteError&&<div className="site-error">{websiteError}</div>}{websiteResult&&<><div className="site-result"><div><span>BRAND</span><b>{websiteResult.profile?.brand}</b></div><div><span>POSITIONING</span><b>{websiteResult.profile?.positioning}</b></div><div><span>PRIMARY CTA</span><b>{websiteResult.profile?.primaryCta}</b></div><div><span>VOICE</span><b>{websiteResult.profile?.voice}</b></div>{websiteResult.adSuggestions?.slice(0,2).map((s:string,i:number)=><div key={i} className="wide"><span>AD HOOK {i+1}</span><b>{s}</b></div>)}</div><button className="primary" style={{marginTop:12}} onClick={buildFromSite}><WandSparkles/>Build campaign from this site</button></>}</div>
      </div>}
    </div>
  );
}

function CampaignPage({budget,setBudget,price,setPrice,goal,setGoal,image,building,demoStep,generated,upload,fileRef,m,angle,setAngle,region,setRegion,setBillingOpen,adHook,onBuild}:any){
  const[step,setStep]=useState(1);
  return(
    <div className="campaign-flow">
      <div className="campaign-tabs">
        {[['1','Campaign'],['2','Ad set'],['3','Creatives']].map(([n,label],i)=>
          <React.Fragment key={n}><button className={step===i+1?'active':''} onClick={()=>setStep(i+1)}><span>{n}</span>{label}</button>{i<2&&<i/>}</React.Fragment>
        )}
        <div className="autosave"><i/>Autosaved</div>
      </div>
      {step===1&&<div className="campaign-stage">
        <div className="stage-hero"><span>AI MEDIA BUYER</span><h1>Drop your photos.<br/><em>AI builds the campaign.</em></h1><p>From one creative to a complete campaign—objective, audience, placements, budget, copy, ad variations, and forecast.</p><button className="ai-do" onClick={()=>setStep(2)}><WandSparkles/>AI DO IT <ArrowUpRight/></button></div>
        <Builder budget={budget} setBudget={setBudget} price={price} setPrice={setPrice} goal={goal} setGoal={setGoal} image={image} building={building} demoStep={demoStep} generated={generated} upload={upload} fileRef={fileRef} m={m} angle={angle} setAngle={setAngle} region={region} setRegion={setRegion} adHook={adHook} onBuild={onBuild} aiMode/>
      </div>}
      {step===2&&<AdSetPage budget={budget} setBudget={setBudget} angle={angle} setAngle={setAngle} region={region} setRegion={setRegion} onNext={()=>setStep(3)}/>}
      {step===3&&<CreativesPage image={image} upload={upload} fileRef={fileRef} notify={(msg:string)=>{}} onLaunch={()=>setBillingOpen(true)}/>}
    </div>
  );
}

const angleHooks:Record<string,string>={
  'Confident & playful':'Come see what everyone keeps talking about.',
  'Mysterious & exclusive':'Some doors only open once. This is one of them.',
  'Girl next door':'Your favorite girl, closer than ever.',
  'Luxury lifestyle':'Indulge in the experience you deserve.',
  'Fitness & wellness':'Strong, confident, completely unfiltered.',
};

function Builder({budget,setBudget,price,setPrice,goal,setGoal,image,building,demoStep,generated,upload,fileRef,m,mixOpen,setMixOpen,mix,setMix,totalMix,angle,setAngle,region,setRegion,adHook,onBuild,aiMode}:any){
  const totalMixVal=mix?mix.reduce((a:number,b:number)=>a+b,0):100;
  const topChannels=[...channels].sort((a,b)=>b.base-a.base).slice(0,3).map(c=>c.name).join(' · ');
  const copyHook=adHook||angleHooks[angle]||angleHooks['Confident & playful'];
  return(
    <div className="builder">
      <div className="upload" onClick={()=>fileRef?.current?.click()} style={{cursor:'pointer',position:'relative'}}>
        {building&&<div className="scan"><Sparkles/><b>Building campaign</b><span>{['','Analyzing creative','Selecting objective','Building audience','Allocating placements','Generating ad suggestions','Campaign complete'][demoStep]}</span><div className="progress"><i style={{width:`${(demoStep/6)*100}%`}}/></div></div>}
        {image&&!building&&<img src={image} alt="Campaign creative" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',borderRadius:0,opacity:.55}}/>}
        <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>upload(e.target.files?.[0])}/>
        <Upload style={{width:36,height:36,marginBottom:12,color:'#ef2931'}}/>
        <b>Drop {aiMode?'campaign photos':'your main photo'}</b>
        <span>{aiMode?'One or more JPG/PNG files · AI analyzes the strongest angle':'JPG or PNG · tasteful, policy-ready creative'}</span>
        <button className="primary" style={{marginTop:16}} onClick={e=>{e.stopPropagation();fileRef?.current?.click();}}>Choose {aiMode?'photos':'photo'}</button>
      </div>
      <div className="controls">
        <div className="ai-title">
          {aiMode?<WandSparkles/>:<ShieldCheck/>}
          <div><b>AI campaign setup</b><span>{generated?'Campaign generated · ready to edit':'Upload photos to generate every layer'}</span></div>
        </div>
        <label>Total test budget<b>${budget.toLocaleString()}</b>
          <input type="range" min={100} max={10000} step={100} value={budget} onChange={e=>setBudget(+e.target.value)}/>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:8,color:'#666',marginTop:4}}><span>$100</span><span>$10k</span></div>
        </label>
        <label>Subscription price<b>${price}</b>
          <input type="range" min={4.99} max={49.99} step={1} value={price} onChange={e=>setPrice(+e.target.value)}/>
        </label>
        <label>Subscriber target<b>{goal}+</b>
          <input type="range" min={10} max={500} step={5} value={goal} onChange={e=>setGoal(+e.target.value)}/>
        </label>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:14}}>
          <select value={angle} onChange={e=>setAngle(e.target.value)}>
            {['Confident & playful','Mysterious & exclusive','Girl next door','Luxury lifestyle','Fitness & wellness'].map(a=><option key={a}>{a}</option>)}
          </select>
          <select value={region} onChange={e=>setRegion(e.target.value)}>
            {['United States · 21+','United Kingdom · 21+','Canada · 21+','Australia · 21+','Global · 21+'].map(r=><option key={r}>{r}</option>)}
          </select>
        </div>
        <button className="primary" style={{width:'100%',padding:'14px',fontSize:12,display:'flex',alignItems:'center',justifyContent:'center',gap:8}} onClick={()=>{image?onBuild?.():fileRef?.current?.click();}}>
          <Sparkles/>Build {aiMode?'full campaign':'my campaign'} with AI
        </button>
      </div>
      {generated&&<div className="ai-output">
        <div><span>OBJECTIVE</span><b>Subscriber growth</b><small>Optimized for paid conversions</small></div>
        <div><span>AUDIENCE</span><b>{region}</b><small>{angle}</small></div>
        <div><span>PLACEMENTS</span><b>{topChannels}</b><small>Top sources by modeled ROI</small></div>
        <div><span>AD COPY</span><b>{copyHook}</b><small>{adHook?'Pulled from your site scan':'Generated from your creative angle'}</small></div>
      </div>}
      <div className="metrics">
        <div className="forecast-lead">
          <span>MODELED MIDPOINT</span>
          <strong>{m.mid}</strong>
          <p>paid subscribers</p>
          <em>Likely planning range <b>{m.low}–{m.high}</b></em>
        </div>
        <div className="metric"><CircleDollarSign/><span>Test spend</span><b>${budget.toLocaleString()}</b></div>
        <div className="metric"><MousePointer2/><span>Est. clicks</span><b>{m.clicks.toLocaleString()}</b></div>
        <div className="metric"><Eye/><span>Landing visits</span><b>{m.visits.toLocaleString()}</b></div>
        <div className="metric"><Users/><span>Paid conversions</span><b>{m.mid}</b></div>
        <div className="metric"><TrendingUp/><span>Modeled revenue</span><b>${m.rev.toLocaleString(undefined,{maximumFractionDigits:0})}</b></div>
        <div className="metric"><Info/><span>Visit → paid</span><b>{(m.roas*2).toFixed(2)}%</b></div>
      </div>
      {setMixOpen&&<div className="mix">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
          <span style={{fontSize:9,fontFamily:'DM Mono',color:'#888',letterSpacing:'.08em'}}>RECOMMENDED TRAFFIC MIX</span>
          <button style={{fontSize:9,color:'#aaa',display:'flex',alignItems:'center',gap:6,border:'1px solid #333',borderRadius:4,padding:'6px 10px',background:'none'}} onClick={()=>setMixOpen(!mixOpen)}><SlidersHorizontal style={{width:12}}/>Adjust mix</button>
        </div>
        <div className="channel-grid">
          {channels.map((c,i)=><button key={c.name}><i style={{background:c.color,width:7,height:7,borderRadius:'50%',display:'inline-block'}}/><span style={{fontSize:9,color:'#ccc'}}>{c.name}</span><span style={{fontSize:9,color:'#888',marginLeft:'auto'}}>{Math.round((mix[i]/totalMixVal)*100)}%</span></button>)}
        </div>
        {mixOpen&&<div className="mixer">
          {channels.map((c,i)=><label key={c.name}>{c.name}<input type="range" min={0} max={50} value={mix[i]} onChange={e=>{const n=[...mix];n[i]=+e.target.value;setMix(n);}}/><b>{Math.round((mix[i]/totalMixVal)*100)}%</b></label>)}
        </div>}
      </div>}
    </div>
  );
}

function AdSetPage({budget,setBudget,angle,setAngle,region,setRegion,onNext}:any){
  return(
    <div className="workspace">
      <div className="workspace-head"><div><span>AD SET</span><h1>Audience & placement</h1><p>Configure targeting, geo, and channel allocation for this ad set.</p></div><button onClick={onNext}>Next: Creatives <ArrowUpRight/></button></div>
      <div className="form-grid">
        <section><h2>TARGETING</h2>
          <label>Creative angle<select value={angle} onChange={e=>setAngle(e.target.value)}>{['Confident & playful','Mysterious & exclusive','Girl next door','Luxury lifestyle','Fitness & wellness'].map(a=><option key={a}>{a}</option>)}</select></label>
          <label>Region & age gate<select value={region} onChange={e=>setRegion(e.target.value)}>{['United States · 21+','United Kingdom · 21+','Canada · 21+','Australia · 21+','Global · 21+'].map(r=><option key={r}>{r}</option>)}</select></label>
          <label>Audience type<select><option>High-intent · lookalike</option><option>Broad · interest</option><option>Retargeting</option></select></label>
        </section>
        <section><h2>BUDGET</h2>
          <label>Daily test budget<b>${budget.toLocaleString()}</b><input type="range" min={100} max={10000} step={100} value={budget} onChange={e=>setBudget(+e.target.value)}/></label>
          <label>Bid strategy<select><option>Auto · AI optimized</option><option>Manual CPC</option><option>Target CPA</option></select></label>
        </section>
        <section><h2>SCHEDULE</h2>
          <label>Start date<input type="date" defaultValue={new Date().toISOString().split('T')[0]}/></label>
          <label>Duration<select><option>7 days (test)</option><option>14 days</option><option>30 days</option><option>Ongoing</option></select></label>
        </section>
      </div>
    </div>
  );
}

function ChatPage({chatLog,chatMsg,setChatMsg,sendChat,chatRef,drawerOpen,setDrawerOpen,notify}:any){
  return(
    <div className="workspace">
      <div className="workspace-head"><div><span>CHAT STUDIO</span><h1>AI campaign advisor</h1></div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>setDrawerOpen('Skills')}><Sparkles/>Skills</button>
          <button onClick={()=>setDrawerOpen('Agents')}><Bot/>Agents</button>
          <button onClick={()=>setDrawerOpen('Cheat Codes')}><Zap/>Cheat Codes</button>
        </div>
      </div>
      <div style={{background:'#080808',border:'1px solid #321214',borderRadius:10,display:'flex',flexDirection:'column',height:460}}>
        <div ref={chatRef} style={{flex:1,overflowY:'auto',padding:20,display:'flex',flexDirection:'column',gap:12}}>
          {chatLog.map((m:any,i:number)=>
            <div key={i} style={{display:'flex',gap:10,flexDirection:m.role==='user'?'row-reverse':'row'}}>
              <div style={{width:28,height:28,borderRadius:'50%',background:m.role==='user'?'#d71920':'#1a1a1a',display:'grid',placeItems:'center',flexShrink:0,fontSize:10,fontWeight:700}}>{m.role==='user'?'U':<Bot style={{width:14}}/>}</div>
              <div style={{background:m.role==='user'?'#1a0405':'#111',border:'1px solid',borderColor:m.role==='user'?'#4a1215':'#2a2a2a',borderRadius:8,padding:'10px 14px',maxWidth:'75%',fontSize:11,lineHeight:1.6,color:'#ddd'}}>{m.text}</div>
            </div>
          )}
        </div>
        <div style={{borderTop:'1px solid #251012',padding:12,display:'flex',gap:8}}>
          <input value={chatMsg} onChange={e=>setChatMsg(e.target.value)} onKeyDown={e=>e.key==='Enter'&&sendChat()} placeholder="Ask about strategy, creatives, traffic mix..." style={{flex:1,background:'#111',border:'1px solid #382022',borderRadius:5,color:'#fff',padding:'10px 12px',fontSize:10,fontFamily:'Manrope,sans-serif'}}/>
          <button onClick={sendChat} style={{background:'#d71920',border:0,borderRadius:5,color:'#fff',padding:'0 14px',cursor:'pointer'}}><Send style={{width:14}}/></button>
        </div>
      </div>
      {drawerOpen&&<Drawer title={drawerOpen} close={()=>setDrawerOpen(null)} notify={notify}/>}
    </div>
  );
}

function AssetsPage({websiteUrl,setWebsiteUrl,websiteLoading,websiteResult,websiteError,analyzeWebsite,buildFromSite}:any){
  return(
    <div className="workspace">
      <div className="workspace-head"><div><span>MODEL ASSETS</span><h1>Brand intelligence</h1><p>Scan your creator page to extract brand signals and ad copy hooks.</p></div></div>
      <div className="website-panel" style={{marginTop:0}}>
        <div><span>WEBSITE SCANNER</span><h2>Drop your creator URL</h2><p>AI extracts brand positioning, audience signals, and campaign-ready copy from your live page.</p></div>
        <div><div className="website-form"><input value={websiteUrl} onChange={e=>setWebsiteUrl(e.target.value)} placeholder="https://onlyfans.com/yourname" onKeyDown={e=>e.key==='Enter'&&analyzeWebsite()}/><button onClick={analyzeWebsite} disabled={websiteLoading}>{websiteLoading?<><i className="site-loader"/>Scanning...</>:<><Sparkles/>Analyze</>}</button></div>
        {websiteError&&<div className="site-error">{websiteError}</div>}
        {websiteResult&&<div className="site-result">
          <div><span>BRAND NAME</span><b>{websiteResult.profile?.brand}</b></div>
          <div><span>POSITIONING</span><b>{websiteResult.profile?.positioning}</b></div>
          <div><span>VOICE</span><b>{websiteResult.profile?.voice}</b></div>
          <div><span>TOP CTA</span><b>{websiteResult.profile?.primaryCta}</b></div>
          {websiteResult.adSuggestions?.map((s:string,i:number)=><div key={i} className="wide"><span>AD HOOK {i+1}</span><b>{s}</b></div>)}
        </div>}
        {websiteResult&&<button className="primary" style={{marginTop:12}} onClick={buildFromSite}><WandSparkles/>Build campaign from this site</button>}
        </div>
      </div>
    </div>
  );
}

function CreativesPage({image,upload,fileRef,notify,onLaunch}:any){
  return(
    <div className="workspace">
      <div className="workspace-head"><div><span>CREATIVES</span><h1>Ad variations</h1><p>AI generates copy, crop, CTA, and format variants from your creative.</p></div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>fileRef?.current?.click()}><Upload style={{width:14}}/>New creative</button>
          {onLaunch&&<button className="primary" onClick={onLaunch}><Rocket style={{width:14}}/>Fund &amp; launch</button>}
        </div>
      </div>
      <div className="creative-library">
        {[...Array(6)].map((_,i)=>(
          <div key={i} className="ad" style={{background:'#080808',border:'1px solid #321214',borderRadius:10,overflow:'hidden',display:'flex',flexDirection:'column'}}>
            <div style={{flex:1,background:image?`url(${image}) center/cover`:'#111',position:'relative'}}>
              {!image&&<div style={{position:'absolute',inset:0,display:'grid',placeItems:'center',color:'#333'}}><ImageIcon/></div>}
              <div style={{position:'absolute',top:8,left:8,background:'#d71920',color:'#fff',fontSize:7,fontFamily:'DM Mono',padding:'3px 7px',borderRadius:3}}>VARIANT {i+1}</div>
            </div>
            <div style={{padding:12}}>
              <h3 style={{fontSize:10,marginBottom:4,color:'#fff'}}>{['Confidence lead','Exclusive angle','FOMO hook','Direct CTA','Lifestyle frame','Value stack'][i]}</h3>
              <p style={{fontSize:9,color:'#888',margin:0,marginBottom:8}}>AI-generated copy variant · {['21+ US','Global','US/UK','Retarget','Lookalike','Broad'][i]} audience</p>
              <button style={{background:'#d71920',border:0,color:'#fff',padding:'7px 12px',borderRadius:4,fontSize:8,fontFamily:'DM Mono',cursor:'pointer',display:'flex',alignItems:'center',gap:6}} onClick={()=>notify(`Variant ${i+1} added to campaign.`)}><Check style={{width:10}}/>Use this</button>
            </div>
          </div>
        ))}
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={e=>upload(e.target.files?.[0])}/>
    </div>
  );
}

function TrafficPage({mix,setMix,totalMix,notify}:any){
  const total=mix.reduce((a:number,b:number)=>a+b,0);
  return(
    <div className="workspace">
      <div className="workspace-head"><div><span>TRAFFIC MIX</span><h1>Channel allocation</h1><p>Research-backed source presets with live allocation controls.</p></div>
        <div className="traffic-actions">
          <button onClick={()=>{setMix(channels.map(c=>c.base));notify('Mix reset to AI recommendation.');}}><RotateCw style={{width:12}}/>Reset to AI</button>
        </div>
      </div>
      <div className="traffic-table">
        <div className="tr th"><span>SOURCE</span><span>MODEL</span><span>ALLOCATION</span><span>NOTES</span><span>ACTIVE</span></div>
        {channels.map((c,i)=>(
          <div key={c.name} className="tr">
            <span><i style={{background:c.color}}/><span>{c.name}<small>{c.note}</small></span></span>
            <span>{c.model}</span>
            <span>{Math.round((mix[i]/total)*100)}%</span>
            <span style={{fontSize:9,color:'#888'}}>{c.note}</span>
            <button className={`switch ${mix[i]>0?'on':''}`} onClick={()=>{const n=[...mix];n[i]=mix[i]>0?0:c.base;setMix(n);notify(`${c.name} ${mix[i]>0?'disabled':'enabled'}.`);}}><i/></button>
          </div>
        ))}
      </div>
      <div className="mixer" style={{marginTop:16}}>
        {channels.map((c,i)=><label key={c.name}>{c.name}<input type="range" min={0} max={50} value={mix[i]} onChange={e=>{const n=[...mix];n[i]=+e.target.value;setMix(n);}}/><b>{Math.round((mix[i]/total)*100)}%</b></label>)}
      </div>
    </div>
  );
}

function ForecastPage({m,budget,price}:any){
  const bars=[.4,.55,.7,.82,.9,.95,1,.97,.93,.88,.85,.82];
  return(
    <div className="workspace">
      <div className="workspace-head"><div><span>FORECAST</span><h1>Revenue projection</h1><p>Directional estimates based on your current campaign inputs.</p></div></div>
      <div className="forecast-screen">
        <div className="forecast-big">
          <span>MODELED MIDPOINT</span>
          <strong>{m.mid}</strong>
          <p>paid subscribers at ${price}/mo</p>
          <p style={{marginTop:8}}>Likely range: <b style={{color:'#ef2931'}}>{m.low}–{m.high}</b></p>
        </div>
        <div className="chart">
          <span style={{fontSize:9,fontFamily:'DM Mono',color:'#888',letterSpacing:'.08em'}}>PROJECTED SUBSCRIBER GROWTH</span>
          <div className="chart-bars">{bars.map((h,i)=><i key={i} style={{height:`${h*100}%`}}/>)}</div>
          <div className="chart-labels">{['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map(m=><span key={m}>{m}</span>)}</div>
        </div>
      </div>
      <div className="forecast-kpis">
        {[['Test spend',`$${budget.toLocaleString()}`],['Est. clicks',m.clicks.toLocaleString()],['Landing visits',m.visits.toLocaleString()],['Conversions',m.mid],['Modeled revenue',`$${m.rev.toLocaleString(undefined,{maximumFractionDigits:0})}`],['ROAS',`${m.roas.toFixed(2)}x`],['Visit→paid',`${(m.roas*2).toFixed(2)}%`],['CPA',`$${(budget/Math.max(m.mid,1)).toFixed(2)}`]].map(([label,val])=>(
          <div key={label} style={{padding:'16px 18px',borderRight:'1px solid #391315',display:'grid',gap:5}}>
            <span style={{fontSize:8,fontFamily:'DM Mono',color:'#888',letterSpacing:'.08em'}}>{label}</span>
            <b style={{fontSize:14,fontFamily:'Manrope,sans-serif',fontWeight:700}}>{val}</b>
          </div>
        ))}
      </div>
    </div>
  );
}

function LaunchPage({m,budget,price,creatorName,setBillingOpen,notify}:any){
  const steps=[
    ['Creative approved','Policy-safe creative confirmed','DONE'],
    ['Audience locked','21+ high-intent US segment','DONE'],
    ['Placements set','7-channel optimized mix','DONE'],
    ['Tracking verified','Pixel + postback configured','DONE'],
    ['Budget allocated',`$${budget.toLocaleString()} test media ready`,'DONE'],
    ['Launch review','Final check before spend','PENDING'],
  ];
  return(
    <div className="launch-screen" style={{padding:'30px 30px 0'}}>
      <section>
        <h2>LAUNCH CHECKLIST</h2>
        <div className="steps">
          {steps.map(([title,desc,status])=>(
            <div key={title} className={`step ${status==='DONE'?'done':''}`}>
              <i><Rocket style={{width:12}}/></i>
              <span>{title}<small>{desc}</small></span>
              {status==='DONE'?<Check style={{width:14,color:'#ef2931'}}/>:<ArrowUpRight style={{width:14,color:'#555'}}/>}
            </div>
          ))}
        </div>
        <button className="launch primary" style={{marginTop:20,width:'100%',padding:14,fontSize:12,display:'flex',alignItems:'center',justifyContent:'center',gap:8}} onClick={()=>setBillingOpen(true)}><Rocket/>Fund &amp; launch campaign</button>
      </section>
      <div className="launch-summary">
        <span>CAMPAIGN SUMMARY</span>
        <h2>{creatorName||'Creator'} · Subscriber Growth</h2>
        <dl>
          {[['Test budget',`$${budget.toLocaleString()}`],['Subscription price',`$${price}`],['Projected subs',`${m.mid} (range ${m.low}–${m.high})`],['Modeled revenue',`$${m.rev.toLocaleString(undefined,{maximumFractionDigits:0})}`],['Channels','7-source optimized mix'],['Status','Ready to fund']].map(([dt,dd])=><div key={dt}><dt>{dt}</dt><dd>{dd}</dd></div>)}
        </dl>
        <button className="primary" style={{marginTop:18,width:'100%',padding:12,fontSize:11,display:'flex',alignItems:'center',justifyContent:'center',gap:8}} onClick={()=>setBillingOpen(true)}><Rocket/>Activate campaign</button>
      </div>
    </div>
  );
}

function SkillsPage({notify}:any){
  return(
    <div className="workspace">
      <div className="workspace-head"><div><span>AI SKILLS</span><h1>Skill library</h1><p>Activate specialized AI modules for your campaigns.</p></div></div>
      <div className="skills-summary">
        <div><span>SKILLS AVAILABLE</span><strong>{skillCatalog.length}</strong></div>
        <p>Each skill adds a specialized AI capability to your campaign workflow — from copy generation to compliance auditing.</p>
      </div>
      <div className="skill-library">
        {skillCatalog.map(([Icon,name,desc]:any)=>(
          <button key={name} className="skill-card" onClick={()=>notify(`${name} activated.`)}>
            <div><Icon/><span>SKILL</span></div>
            <h2>{name}</h2>
            <p>{desc}</p>
            <footer><b>ACTIVATE</b><ArrowUpRight style={{width:14}}/></footer>
          </button>
        ))}
      </div>
    </div>
  );
}

function CheatCodesPage({notify}:any){
  return(
    <div className="workspace">
      <div className="workspace-head"><div><span>CHEAT CODES</span><h1>Naughty Cheat Codes</h1><p>Battle-tested formulas and playbooks for adult creator growth.</p></div></div>
      <div className="skill-library">
        {cheatCodes.map(([name,desc]:any)=>(
          <button key={name} className="skill-card" onClick={()=>notify(`${name} loaded into Chat Studio.`)}>
            <div><Zap/><span>FORMULA</span></div>
            <h2>{name}</h2>
            <p>{desc}</p>
            <footer><b>USE THIS</b><ArrowUpRight style={{width:14}}/></footer>
          </button>
        ))}
      </div>
    </div>
  );
}

function Drawer({title,close,notify}:any){
  const items=title==='Skills'?skillCatalog.slice(0,8).map((x:any)=>[x[0],x[1]]):title==='Agents'?[['Brand Strategist','Positioning, voice, and offer alignment'],['Creative Director','Hooks, formats, copy, and variations'],['Media Buyer','Source mix, allocation, and optimization'],['Compliance Reviewer','18+, consent, policy, and claim checks'],['Website Analyst','Live public-site brand intelligence']]:cheatCodes;
  return <div className="drawer"><div className="drawer-head"><div><span>ADD TO CHAT</span><h2>{title}</h2></div><button onClick={close}><X/></button></div><div className="drawer-list">{items.map(([name,description]:any)=><button key={name} onClick={()=>{notify(`${name} added to Chat Studio.`);close()}}><div>{title==='Agents'?<Bot/>:title==='Skills'?<Sparkles/>:<Zap/>}</div><span><b>{name}</b><small>{description}</small></span><Plus/></button>)}</div></div>;
}

function BillingBoundary({budget,creatorName,close}:any){
  return <div className="billing-overlay"><div className="billing-modal"><button className="modal-close" onClick={close}><X/></button><div className="billing-lock"><LockKeyhole/></div><span>SECURE ACTIVATION HANDOFF</span><h1>Campaign is ready to fund.</h1><p>The complete demo ends here. A production account would continue to a PCI-compliant payment provider; Naughty Pilot does not collect card details on this screen.</p><div className="billing-summary"><div><span>Campaign</span><b>{creatorName||'Creator'} · Subscriber Growth</b></div><div><span>Test media budget</span><b>${budget}.00</b></div><div><span>Activation status</span><b>Ready</b></div></div><button className="payment-boundary" onClick={()=>{}}><CreditCard/> Add payment method <ArrowUpRight/></button><small><ShieldCheck/> DEMO STOP POINT · No charge made · No card data collected</small></div></div>;
}

function Field({label,value,placeholder,onChange}:any){
  return <label>{label}<input value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/></label>;
}
