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
  ['Viral Hook Formula','Turn any photo into a scroll-stopping first line','VIRAL HOOK FORMULA — Structure: [Pattern break] + [Curiosity gap] + [Implied payoff]. 1) Open with a statement that contradicts expectation ("I almost deleted this one."). 2) Leave one specific detail unsaid — curiosity drives the click, not description. 3) Never explain the photo; tease the story behind it. Test 3 hooks per creative, keep the one with top CTR after 48h. Want me to write 3 hooks for your current campaign angle?'],
  ['Price Anchor Stack','Frame your subscription so $X feels like a steal','PRICE ANCHOR STACK — Never present your price alone. Stack: 1) Name the full value first ("weekly exclusive sets + DM priority + custom requests"). 2) Anchor high: reference what customs cost à la carte ($50+). 3) Then reveal the sub price — it now reads as a discount, not a cost. 4) Add a decoy tier priced close to the top tier to push mid-tier picks. Your current price point works best framed against a $45+ anchor. Want a tier structure for your price?'],
  ['Scarcity Trigger','Limited-time language that converts without lying','SCARCITY TRIGGER — Only use real limits (fake countdowns burn trust and re-bills). Levers: 1) Capacity: "First 50 subs get X" — count real. 2) Time-boxed bonus, not discount: price stays, bonus expires. 3) Content retirement: "This set leaves the wall Friday." Announce the deadline twice — once early, once 3h before. Never extend a stated deadline. Want a launch-week scarcity plan?'],
  ['DM Opener Sequence','3-message sequence from cold follow to paid sub','DM OPENER SEQUENCE — Msg 1 (on follow, <5 min): thank + one specific personal touch, no pitch. Msg 2 (24h): a piece of free value — a preview or behind-the-scenes, still no pitch. Msg 3 (48h): the ask, framed as an invitation with a reason ("I only push my best stuff to subs — join and today\'s set is yours"). Cold→paid runs 3-6% on this flow when Msg 1 lands fast. Want me to draft the 3 messages in your brand voice?'],
  ['Re-sub Winback','Recover churned subs with one well-timed message','RE-SUB WINBACK — Timing beats copy: send on day 3-5 after expiry (card declines resolve, attention resets). Structure: 1) No guilt, no "we miss you". 2) Lead with what they missed — one concrete highlight. 3) One-tap re-sub link + a small returning-sub bonus. Expected recovery: 8-15% of churned subs monthly. Automate the trigger off expiry date, not billing failure. Want the message template?'],
  ['Free Trial Funnel','Trial-to-paid conversion blueprint','FREE TRIAL FUNNEL — Trials convert when the first 24h is engineered: 1) Instant welcome DM with your single best set pinned. 2) Day 2: interactive touch (poll, question) to build habit. 3) Day 5: preview of sub-only content they can\'t open yet. 4) Expiry day: convert with a first-month offer, not a plea. Keep trials at 7 days — 30-day trials kill urgency. Target: 20-30% trial→paid. Want the day-by-day message plan?'],
  ['Bundle Upsell Script','Turn one purchase into three','BUNDLE UPSELL SCRIPT — The moment after a purchase is your highest-intent window. Within 10 min send: "Since you grabbed [X], the [X+Y+Z] bundle is yours for [single-item price +60%] — only offered right after a purchase." Rules: bundle must be thematically linked, discount framed as access not markdown, one follow-up max. Attach rate target: 25-35%. Want a bundle matrix built from your content categories?'],
  ['Content Calendar OS','30-day posting cadence for max algorithmic reach','CONTENT CALENDAR OS — Weekly spine: 3 feed posts (Mon/Wed/Fri peak hours per platform), daily stories/casual, 1 collab or swap, 1 wall-exclusive drop announced 24h ahead. Batch-shoot monthly: one 3-hour shoot = 12+ feed assets. Track per-post CTR to your page link weekly; double down on the top format, cut the bottom. The calendar compounds — reach builds week 3+, not day 3. Want a 30-day calendar for your niche?'],
] as const;

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
  const[images,setImages]=useState<string[]>([]);
  const[aiCampaign,setAiCampaign]=useState<any>(null);
  const image=images[0]||null;
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
  const[settingsOpen,setSettingsOpen]=useState(false);
  const[websiteUrl,setWebsiteUrl]=useState('');
  const[websiteLoading,setWebsiteLoading]=useState(false);
  const[websiteResult,setWebsiteResult]=useState<any>(null);
  const[websiteError,setWebsiteError]=useState<string|null>(null);
  const fileRef=useRef<HTMLInputElement>(null);
  const chatRef=useRef<HTMLDivElement>(null);

  const m=useMemo(()=>model(budget,price,goal),[budget,price,goal]);
  const totalMix=mix.reduce((a,b)=>a+b,0);

  function notify(msg:string){setToast(msg);setTimeout(()=>setToast(null),3200);}

  function loadCheatCode(name:string,body:string){
    setChatLog(l=>[...l,{role:'ai',text:body}]);
    setPage('Chat Studio');
    notify(`${name} loaded into Chat Studio.`);
    setTimeout(()=>chatRef.current?.scrollTo({top:99999,behavior:'smooth'}),100);
  }

  function runBuild(doneMsg?:string){
    setBuilding(true);setGenerated(false);setDemoStep(1);
    let s=1;
    const iv=setInterval(()=>{s++;setDemoStep(s);if(s>=6){clearInterval(iv);setBuilding(false);setGenerated(true);if(doneMsg)notify(doneMsg);}},900);
  }

  async function requestAiCampaign(payloads:{url?:string,base64?:string}[]){
    setAiCampaign(null);
    try{
      const r=await fetch('/api/generate-campaign',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        images:payloads.slice(0,6),angle,region,budget,price,
        brand:websiteResult?.profile?.brand,positioning:websiteResult?.profile?.positioning,
        siteHooks:websiteResult?.adSuggestions?.slice(0,3),
      })});
      if(!r.ok)throw new Error();
      setAiCampaign(await r.json());
    }catch{/* heuristic fallbacks stay in place */}
  }

  function fileToResizedDataUrl(file:File):Promise<string>{
    return new Promise((resolve,reject)=>{
      const img=new Image();
      const objectUrl=URL.createObjectURL(file);
      img.onload=()=>{
        const max=640,scale=Math.min(1,max/Math.max(img.width,img.height));
        const canvas=document.createElement('canvas');
        canvas.width=Math.round(img.width*scale);canvas.height=Math.round(img.height*scale);
        canvas.getContext('2d')!.drawImage(img,0,0,canvas.width,canvas.height);
        resolve(canvas.toDataURL('image/jpeg',.75));
      };
      img.onerror=reject;
      img.src=objectUrl;
    });
  }

  async function upload(files?:FileList|null){
    if(!files||!files.length)return;
    const list=[...files].filter(f=>f.type.startsWith('image/'));
    if(!list.length)return;
    const urls=list.map(f=>URL.createObjectURL(f));
    setImages(prev=>[...prev,...urls]);
    runBuild(`Campaign built from ${urls.length>1?`${urls.length} creatives`:'your creative'} — every layer is editable.`);
    try{
      const payloads=await Promise.all(list.map(async f=>({base64:await fileToResizedDataUrl(f)})));
      requestAiCampaign(payloads);
    }catch{/* keep heuristics */}
  }

  function buildFromSite(){
    if(!websiteResult)return;
    const siteImages=(websiteResult.images||[]).slice(0,6);
    if(siteImages.length)setImages(siteImages);
    setPage('Campaign Builder');
    runBuild(`Campaign built from ${websiteResult.profile?.brand||'your site'} — every layer is editable.`);
    if(siteImages.length)requestAiCampaign(siteImages.map((u:string)=>({url:u})));
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
            <button aria-label="Notifications" onClick={()=>notify('No new notifications.')}><Bell/></button>
            <button aria-label="Billing & settings" onClick={()=>setSettingsOpen(true)}><Settings/></button>
          </div>
        </header>

        {page==='Overview'&&<OverviewPage budget={budget} setBudget={setBudget} price={price} setPrice={setPrice} goal={goal} setGoal={setGoal} image={image} images={images} building={building} demoStep={demoStep} generated={generated} upload={upload} fileRef={fileRef} m={m} mixOpen={mixOpen} setMixOpen={setMixOpen} mix={mix} setMix={setMix} totalMix={totalMix} angle={angle} setAngle={setAngle} region={region} setRegion={setRegion} isBlack={isBlack} websiteUrl={websiteUrl} setWebsiteUrl={setWebsiteUrl} websiteLoading={websiteLoading} websiteResult={websiteResult} websiteError={websiteError} analyzeWebsite={analyzeWebsite} buildFromSite={buildFromSite} aiCampaign={aiCampaign} onBuild={()=>runBuild('Campaign built — every layer is editable.')}/>}
        {page==='Campaign Builder'&&<CampaignPage budget={budget} setBudget={setBudget} price={price} setPrice={setPrice} goal={goal} setGoal={setGoal} image={image} images={images} building={building} demoStep={demoStep} generated={generated} upload={upload} fileRef={fileRef} m={m} angle={angle} setAngle={setAngle} region={region} setRegion={setRegion} setBillingOpen={setBillingOpen} adHook={websiteResult?.adSuggestions?.[0]} aiCampaign={aiCampaign} onBuild={()=>runBuild('Campaign built — every layer is editable.')}/>}
        {page==='Chat Studio'&&<ChatPage chatLog={chatLog} chatMsg={chatMsg} setChatMsg={setChatMsg} sendChat={sendChat} chatRef={chatRef} drawerOpen={drawerOpen} setDrawerOpen={setDrawerOpen} notify={notify}/>}
        {page==='Model Assets'&&<AssetsPage websiteUrl={websiteUrl} setWebsiteUrl={setWebsiteUrl} websiteLoading={websiteLoading} websiteResult={websiteResult} websiteError={websiteError} analyzeWebsite={analyzeWebsite} buildFromSite={buildFromSite}/>}
        {page==='Creatives'&&<CreativesPage images={images} aiCampaign={aiCampaign} upload={upload} fileRef={fileRef} notify={notify}/>}
        {page==='Traffic Mix'&&<TrafficPage mix={mix} setMix={setMix} totalMix={totalMix} notify={notify}/>}
        {page==='Forecast'&&<ForecastPage m={m} budget={budget} price={price}/>}
        {page==='Launch Plan'&&<LaunchPage m={m} budget={budget} price={price} creatorName={creatorName} setBillingOpen={setBillingOpen} notify={notify}/>}
        {page==='AI Skills'&&<SkillsPage notify={notify}/>}
        {page==='Naughty Cheat Codes'&&<CheatCodesPage notify={notify} loadCode={loadCheatCode}/>}

        <footer>
          <b>NAUGHTY PILOT</b>
          <span>Forecasts vary with creative quality, audience, offer, tracking, seasonality, and traffic quality.</span>
        </footer>
      </main>

      {toast&&<div className="toast" onClick={()=>setToast(null)}><span>✓</span> {toast}</div>}
      {settingsOpen&&<SettingsModal close={()=>setSettingsOpen(false)} onFund={()=>{setSettingsOpen(false);setBillingOpen(true);}}/>}
      {billingOpen&&<BillingBoundary budget={budget} creatorName={creatorName} close={()=>setBillingOpen(false)}/>}
      {drawerOpen&&<Drawer title={drawerOpen} close={()=>setDrawerOpen(null)} notify={notify}/>}
    </div>
  );
}

function OverviewPage({budget,setBudget,price,setPrice,goal,setGoal,image,images,building,demoStep,generated,upload,fileRef,m,mixOpen,setMixOpen,mix,setMix,totalMix,angle,setAngle,region,setRegion,isBlack,websiteUrl,setWebsiteUrl,websiteLoading,websiteResult,websiteError,analyzeWebsite,buildFromSite,aiCampaign,onBuild}:any){
  return(
    <div className="intro">
      <div>
        <span>COMMAND CENTER</span>
        <h1>Command every channel.<br/><em>Scale what converts.</em></h1>
        <p>Your highest-access acquisition workspace—creative generation, premium traffic routing, forecast modeling, and campaign execution in one command center.</p>
      </div>
      <Builder budget={budget} setBudget={setBudget} price={price} setPrice={setPrice} goal={goal} setGoal={setGoal} image={image} images={images} building={building} demoStep={demoStep} generated={generated} upload={upload} fileRef={fileRef} m={m} mixOpen={mixOpen} setMixOpen={setMixOpen} mix={mix} setMix={setMix} totalMix={totalMix} angle={angle} setAngle={setAngle} region={region} setRegion={setRegion} adHook={websiteResult?.adSuggestions?.[0]} aiCampaign={aiCampaign} onBuild={onBuild}/>
      {isBlack&&<div className="website-panel">
        <div><span>MODEL INTELLIGENCE</span><h2>Website brand scan</h2><p>Drop your OF/Fansly URL — AI extracts brand signals, ad angles, and copy hooks, then builds your campaign from them.</p></div>
        <div><div className="website-form"><input value={websiteUrl} onChange={e=>setWebsiteUrl(e.target.value)} placeholder="https://onlyfans.com/yourname" onKeyDown={e=>e.key==='Enter'&&analyzeWebsite()}/><button onClick={analyzeWebsite} disabled={websiteLoading}>{websiteLoading?<><i className="site-loader"/></>:<><Sparkles/>Scan</>}</button></div>{websiteError&&<div className="site-error">{websiteError}</div>}{websiteResult&&<><div className="site-result"><div><span>BRAND</span><b>{websiteResult.profile?.brand}</b></div><div><span>POSITIONING</span><b>{websiteResult.profile?.positioning}</b></div><div><span>PRIMARY CTA</span><b>{websiteResult.profile?.primaryCta}</b></div><div><span>VOICE</span><b>{websiteResult.profile?.voice}</b></div>{websiteResult.adSuggestions?.slice(0,2).map((s:string,i:number)=><div key={i} className="wide"><span>AD HOOK {i+1}</span><b>{s}</b></div>)}</div><button className="primary" style={{marginTop:12}} onClick={buildFromSite}><WandSparkles/>Build campaign from this site</button></>}</div>
      </div>}
    </div>
  );
}

function CampaignPage({budget,setBudget,price,setPrice,goal,setGoal,image,images,building,demoStep,generated,upload,fileRef,m,angle,setAngle,region,setRegion,setBillingOpen,adHook,aiCampaign,onBuild}:any){
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
        <Builder budget={budget} setBudget={setBudget} price={price} setPrice={setPrice} goal={goal} setGoal={setGoal} image={image} images={images} building={building} demoStep={demoStep} generated={generated} upload={upload} fileRef={fileRef} m={m} angle={angle} setAngle={setAngle} region={region} setRegion={setRegion} adHook={adHook} aiCampaign={aiCampaign} onBuild={onBuild} aiMode/>
      </div>}
      {step===2&&<AdSetPage budget={budget} setBudget={setBudget} angle={angle} setAngle={setAngle} region={region} setRegion={setRegion} onNext={()=>setStep(3)}/>}
      {step===3&&<CreativesPage images={images} aiCampaign={aiCampaign} upload={upload} fileRef={fileRef} notify={(msg:string)=>{}} onLaunch={()=>setBillingOpen(true)}/>}
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

function Builder({budget,setBudget,price,setPrice,goal,setGoal,image,images,building,demoStep,generated,upload,fileRef,m,mixOpen,setMixOpen,mix,setMix,totalMix,angle,setAngle,region,setRegion,adHook,aiCampaign,onBuild,aiMode}:any){
  const totalMixVal=mix?mix.reduce((a:number,b:number)=>a+b,0):100;
  const topChannels=[...channels].sort((a,b)=>b.base-a.base).slice(0,3).map(c=>c.name).join(' · ');
  const copyHook=aiCampaign?.adCopy?.[0]?.hook||adHook||angleHooks[angle]||angleHooks['Confident & playful'];
  const objective=aiCampaign?.objective||'Subscriber growth';
  const audienceNote=aiCampaign?.audienceNotes||angle;
  return(
    <div className="builder">
      <div className="upload" onClick={()=>fileRef?.current?.click()} style={{cursor:'pointer',position:'relative'}}>
        {building&&<div className="scan"><Sparkles/><b>Building campaign</b><span>{['','Analyzing creative','Selecting objective','Building audience','Allocating placements','Generating ad suggestions','Campaign complete'][demoStep]}</span><div className="progress"><i style={{width:`${(demoStep/6)*100}%`}}/></div></div>}
        {image&&!building&&<img src={image} alt="Campaign creative" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',borderRadius:0,opacity:.55}}/>}
        <input ref={fileRef} type="file" accept="image/*" multiple style={{display:'none'}} onChange={e=>upload(e.target.files)}/>
        <Upload style={{width:36,height:36,marginBottom:12,color:'#ef2931'}}/>
        <b>{images?.length?`${images.length} photo${images.length>1?'s':''} loaded`:'Drop campaign photos'}</b>
        <span>{images?.length>1?'AI ranked your creatives · strongest angle leads':'One or more JPG/PNG files · AI analyzes and ranks every photo'}</span>
        <button className="primary" style={{marginTop:16}} onClick={e=>{e.stopPropagation();fileRef?.current?.click();}}>{images?.length?'Add more photos':'Choose photos'}</button>
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
        <div><span>OBJECTIVE</span><b>{objective}</b><small>Optimized for paid conversions</small></div>
        <div><span>AUDIENCE</span><b>{region}</b><small>{audienceNote}</small></div>
        <div><span>PLACEMENTS</span><b>{aiCampaign?.ranking?.[0]?.placement||topChannels}</b><small>Top sources by modeled ROI</small></div>
        <div><span>AD COPY</span><b>{copyHook}</b><small>{aiCampaign?'Written by AI from your photos':adHook?'Pulled from your site scan':'Generated from your creative angle'}</small></div>
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

function rankImages(images:string[]){
  const score=(s:string,i:number)=>{let h=0;for(const ch of s)h=(h*31+ch.charCodeAt(0))%997;return 6+((h+i*137)%40)/10;};
  return images.map((src,i)=>({src,ctr:score(src,i)})).sort((a,b)=>b.ctr-a.ctr);
}

function CreativesPage({images,aiCampaign,upload,fileRef,notify,onLaunch}:any){
  const heuristic=rankImages(images||[]);
  const ranked=aiCampaign?.ranking?.length
    ?aiCampaign.ranking.filter((r:any)=>images?.[r.index]).map((r:any)=>({src:images[r.index],ctr:r.score,reason:r.reason,placement:r.placement}))
    :heuristic;
  const variants=['Confidence lead','Exclusive angle','FOMO hook','Direct CTA','Lifestyle frame','Value stack'];
  const audiences=['21+ US','Global','US/UK','Retarget','Lookalike','Broad'];
  const placements=['TrafficJunky · CPM','ExoClick · Native','JuicyAds · Banner','Reddit · Organic','X / Social','Creator swaps'];
  const count=Math.max(6,ranked.length);
  return(
    <div className="workspace">
      <div className="workspace-head"><div><span>CREATIVES</span><h1>Ad variations</h1><p>{ranked.length?`${aiCampaign?'AI vision analysis ranked':'AI ranked'} ${ranked.length} creative${ranked.length>1?'s':''} by predicted performance and matched each to its best placement.`:'Upload photos — AI generates ranked ad variants and placement recommendations.'}</p></div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>fileRef?.current?.click()}><Upload style={{width:14}}/>Add creatives</button>
          {onLaunch&&<button className="primary" onClick={onLaunch}><Rocket style={{width:14}}/>Fund &amp; launch</button>}
        </div>
      </div>
      <div className="creative-library">
        {[...Array(count)].map((_,i)=>{
          const r=ranked.length?ranked[i%ranked.length]:null;
          const isTop=ranked.length>0&&i<ranked.length&&i===0;
          return(
          <div key={i} className="ad" style={{background:'#080808',border:`1px solid ${isTop?'#7a1518':'#321214'}`,borderRadius:10,overflow:'hidden',display:'flex',flexDirection:'column'}}>
            <div style={{flex:1,minHeight:170,background:r?`url(${r.src}) center/cover`:'#111',position:'relative'}}>
              {!r&&<div style={{position:'absolute',inset:0,display:'grid',placeItems:'center',color:'#333'}}><ImageIcon/></div>}
              <div style={{position:'absolute',top:8,left:8,display:'flex',gap:6}}>
                {i<ranked.length&&<span style={{background:isTop?'#d71920':'#1c0e0e',border:'1px solid #d71920',color:'#fff',fontSize:7,fontFamily:'DM Mono',padding:'3px 7px',borderRadius:3}}>{isTop?'★ RANK #1':`RANK #${i+1}`}</span>}
                <span style={{background:'#000c',color:'#fff',fontSize:7,fontFamily:'DM Mono',padding:'3px 7px',borderRadius:3}}>VARIANT {i+1}</span>
              </div>
              {r&&<span style={{position:'absolute',bottom:8,right:8,background:'#000c',color:'#8fdc7a',fontSize:7,fontFamily:'DM Mono',padding:'3px 7px',borderRadius:3}}>{aiCampaign?`SCORE ${Number(r.ctr).toFixed(1)}/10`:`CTR ${Number(r.ctr).toFixed(1)}%`}</span>}
            </div>
            <div style={{padding:12}}>
              <h3 style={{fontSize:10,marginBottom:4,color:'#fff'}}>{aiCampaign?.adCopy?.[i]?.variant||variants[i%6]}</h3>
              {aiCampaign?.adCopy?.[i]?.hook
                ?<p style={{fontSize:9,color:'#c9b9b9',margin:0,marginBottom:4,lineHeight:1.5}}>&ldquo;{aiCampaign.adCopy[i].hook}&rdquo;</p>
                :<p style={{fontSize:9,color:'#888',margin:0,marginBottom:4}}>{audiences[i%6]} audience</p>}
              {(r as any)?.reason&&<p style={{fontSize:8,color:'#7a6a6a',margin:0,marginBottom:4,lineHeight:1.5}}>{(r as any).reason}</p>}
              <p style={{fontSize:8,color:'#ef2931',fontFamily:'DM Mono',margin:0,marginBottom:8}}>PLACE: {(r as any)?.placement||placements[i%6]}</p>
              <button style={{background:'#d71920',border:0,color:'#fff',padding:'7px 12px',borderRadius:4,fontSize:8,fontFamily:'DM Mono',cursor:'pointer',display:'flex',alignItems:'center',gap:6}} onClick={()=>notify(`Variant ${i+1} added to campaign.`)}><Check style={{width:10}}/>Use this</button>
            </div>
          </div>
        );})}
      </div>
      <input ref={fileRef} type="file" accept="image/*" multiple style={{display:'none'}} onChange={e=>upload(e.target.files)}/>
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

function slugify(s:string){return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');}

async function downloadSkillFile(name:string,notify:(m:string)=>void){
  const slug=slugify(name);
  try{
    const r=await fetch(`/skills/${slug}.md`);
    if(!r.ok)throw new Error();
    const blob=await r.blob();
    const a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download=`${slug}.md`;
    document.body.appendChild(a);a.click();a.remove();
    notify(`${name} downloaded — drop it into any AI assistant.`);
  }catch{notify(`Couldn't download ${name}. Try again.`);}
}

function SkillsPage({notify}:any){
  return(
    <div className="workspace">
      <div className="workspace-head"><div><span>AI SKILLS</span><h1>Skill library</h1><p>Download any skill as a .md playbook — use it here or drop it into your own AI assistant.</p></div></div>
      <div className="skills-summary">
        <div><span>SKILLS AVAILABLE</span><strong>{skillCatalog.length}</strong></div>
        <p>Each skill is a real, downloadable playbook — from copy generation to compliance auditing. Click a card to download the .md file.</p>
      </div>
      <div className="skill-library">
        {skillCatalog.map(([Icon,name,desc]:any)=>(
          <button key={name} className="skill-card" onClick={()=>downloadSkillFile(name,notify)}>
            <div><Icon/><span>SKILL</span></div>
            <h2>{name}</h2>
            <p>{desc}</p>
            <footer><b>DOWNLOAD .MD</b><ArrowUpRight style={{width:14}}/></footer>
          </button>
        ))}
      </div>
    </div>
  );
}

function CheatCodesPage({notify,loadCode}:any){
  return(
    <div className="workspace">
      <div className="workspace-head"><div><span>CHEAT CODES</span><h1>Naughty Cheat Codes</h1><p>Battle-tested formulas — click one to load the full playbook into Chat Studio, or download it.</p></div></div>
      <div className="skill-library">
        {cheatCodes.map(([name,desc,body]:any)=>(
          <div key={name} className="skill-card" style={{cursor:'default'}}>
            <div><Zap/><span>FORMULA</span></div>
            <h2>{name}</h2>
            <p>{desc}</p>
            <footer style={{display:'flex',gap:14}}>
              <b style={{cursor:'pointer'}} onClick={()=>loadCode(name,body)}>USE IN CHAT</b>
              <b style={{cursor:'pointer',color:'#8a7a7a'}} onClick={()=>downloadSkillFile(name,notify)}>DOWNLOAD</b>
            </footer>
          </div>
        ))}
      </div>
    </div>
  );
}

function Drawer({title,close,notify}:any){
  const items=title==='Skills'?skillCatalog.slice(0,8).map((x:any)=>[x[0],x[1]]):title==='Agents'?[['Brand Strategist','Positioning, voice, and offer alignment'],['Creative Director','Hooks, formats, copy, and variations'],['Media Buyer','Source mix, allocation, and optimization'],['Compliance Reviewer','18+, consent, policy, and claim checks'],['Website Analyst','Live public-site brand intelligence']]:cheatCodes;
  return <div className="drawer"><div className="drawer-head"><div><span>ADD TO CHAT</span><h2>{title}</h2></div><button onClick={close}><X/></button></div><div className="drawer-list">{items.map(([name,description]:any)=><button key={name} onClick={()=>{notify(`${name} added to Chat Studio.`);close()}}><div>{title==='Agents'?<Bot/>:title==='Skills'?<Sparkles/>:<Zap/>}</div><span><b>{name}</b><small>{description}</small></span><Plus/></button>)}</div></div>;
}

function SettingsModal({close,onFund}:any){
  return(
    <div className="billing-overlay" onClick={e=>{if(e.target===e.currentTarget)close();}}>
      <div className="billing-modal" style={{textAlign:'left',maxWidth:440}}>
        <button className="modal-close" onClick={close}><X/></button>
        <span>BILLING &amp; SETTINGS</span>
        <h1 style={{fontSize:20}}>Account</h1>
        <div className="billing-summary">
          <div><span>Account status</span><b style={{color:'#8fdc7a'}}>● Active · Black tier</b></div>
          <div><span>Media balance</span><b>$25,000.00</b></div>
          <div><span>Active campaigns</span><b>08</b></div>
          <div><span>30-day revenue</span><b>$48,920</b></div>
          <div><span>Account manager</span><b>Priority desk</b></div>
        </div>
        <button className="primary" style={{width:'100%',padding:13}} onClick={onFund}><CreditCard/> Add funds</button>
      </div>
    </div>
  );
}

function BillingBoundary({budget,creatorName,close}:any){
  return <div className="billing-overlay"><div className="billing-modal"><button className="modal-close" onClick={close}><X/></button><div className="billing-lock"><LockKeyhole/></div><span>SECURE ACTIVATION HANDOFF</span><h1>Campaign is ready to fund.</h1><p>The complete demo ends here. A production account would continue to a PCI-compliant payment provider; Naughty Pilot does not collect card details on this screen.</p><div className="billing-summary"><div><span>Campaign</span><b>{creatorName||'Creator'} · Subscriber Growth</b></div><div><span>Test media budget</span><b>${budget}.00</b></div><div><span>Activation status</span><b>Ready</b></div></div><button className="payment-boundary" onClick={()=>{}}><CreditCard/> Add payment method <ArrowUpRight/></button><small><ShieldCheck/> DEMO STOP POINT · No charge made · No card data collected</small></div></div>;
}

function Field({label,value,placeholder,onChange}:any){
  return <label>{label}<input value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/></label>;
}
