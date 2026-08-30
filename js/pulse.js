/* ============================================================
   PULSE — Daily Wellness Tracker v1.0.0010
   Simplified Jarvis: question → Gemini AI → answer
   ============================================================ */
console.log('Pulse v1.0.0010 loaded');
window.__PULSE_VERSION = '1.0.0010';

const STORE_KEY = 'pulse_data_v1';
const SETTINGS_KEY = 'pulse_settings_v1';
const JARVIS_KEY = 'pulse_jarvis_key';

const DEFAULT_SETTINGS = {
  proteinMeal: 50, steps: 8000, waterMl: 2500, exerciseMin: 30,
  sleepHrs: 7.5, hrMin: 60, hrMax: 100, weightGoal: null, height: null, name: ''
};

let settings = loadSettings();
let data = loadData();
let currentDate = todayStr();
let currentRange = 7;
let scoreChart, proteinChart, stepsChart, sleepChart, waterChart;

/* ---------- Utilities ---------- */
function todayStr(){ return fmtDate(new Date()); }
function fmtDate(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function loadSettings(){ try{ const r=localStorage.getItem(SETTINGS_KEY); return r?Object.assign({},DEFAULT_SETTINGS,JSON.parse(r)):{...DEFAULT_SETTINGS}; }catch(e){ return {...DEFAULT_SETTINGS}; } }
function saveSettingsToStore(){ localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); }
function loadData(){ try{ const r=localStorage.getItem(STORE_KEY); const s=r?JSON.parse(r):{}; if(Object.keys(s).length) return s; const lr=localStorage.getItem('rit_pcod_data'); if(!lr) return s; const legacy=JSON.parse(lr), m={}; Object.values(legacy).flat().forEach(e=>{ if(!e||!e.date) return; m[e.date]=Object.assign(emptyDay(),{steps:Number(e.steps)||0,waterMl:Math.round((Number(e.water)||0)*1000),sleepHrs:Number(e.sleep)||0,hr:e.hr?Number(e.hr):null,weight:e.wMorn?Number(e.wMorn):null,exerciseMin:e.exYN==='Yes'?30:0,mood:e.mood||null,energy:Number(e.energy)||6,notes:e.notes||''}); }); if(Object.keys(m).length){ localStorage.setItem(STORE_KEY,JSON.stringify(m)); return m; } return s; }catch(e){ return {}; } }
function saveData(){ localStorage.setItem(STORE_KEY, JSON.stringify(data)); }
function emptyDay(){ return {protein:{morning:0,lunch:0,dinner:0},steps:0,waterMl:0,sleepHrs:0,sleepQuality:'Good',stress:'Low',hr:null,weight:null,exerciseMin:0,exerciseType:'',mood:null,energy:6,notes:''}; }
function getDay(ds){ if(!data[ds]) data[ds]=emptyDay(); data[ds]=Object.assign(emptyDay(),data[ds]); return data[ds]; }
function toast(msg){ const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),1600); }
function avg(arr){ const a=arr.filter(v=>v!==undefined&&v!==null); return a.length?a.reduce((x,y)=>x+y,0)/a.length:0; }
function cap(s){ return s.charAt(0).toUpperCase()+s.slice(1); }
function pct(val,target){ return target>0?Math.min(1,val/target):0; }
function lastNDays(n){ const arr=[]; let d=new Date(todayStr()+'T00:00:00'); for(let i=n-1;i>=0;i--){ const dd=new Date(d); dd.setDate(d.getDate()-i); arr.push(fmtDate(dd)); } return arr; }

/* ---------- Supabase Auth ---------- */
const SUPABASE_URL='https://ujkupyimtbqzkusiefyb.supabase.co';
const SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqa3VweWltdGJxemt1c2llZnliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxMTEzNDMsImV4cCI6MjEwMzY4NzM0M30.rfJEm7yu0dxuVRkYjNwikeeN7MrhKHAJW_S_Kw9TWnU';
let sbClient=null;
try{ const c=window.supabase.createClient; if(c) sbClient=c(SUPABASE_URL,SUPABASE_KEY); }catch(e){}
let currentUser=null;

function showError(msg){ document.getElementById('authError').textContent=msg; document.getElementById('authError').style.display='block'; document.getElementById('authSuccess').style.display='none'; }
function showSuccess(msg){ document.getElementById('authSuccess').textContent=msg; document.getElementById('authSuccess').style.display='block'; document.getElementById('authError').style.display='none'; }
function hideMessages(){ document.getElementById('authError').style.display='none'; document.getElementById('authSuccess').style.display='none'; }
function showLogin(){ document.getElementById('loginScreen').hidden=false; document.getElementById('loginEmail').focus(); }
function hideLogin(){ document.getElementById('loginScreen').hidden=true; }

document.getElementById('loginForm').addEventListener('submit', async(event)=>{
  event.preventDefault(); hideMessages();
  if(!sbClient){ showError('Auth system not loaded. Please refresh.'); return; }
  const email=document.getElementById('loginEmail').value.trim(), pw=document.getElementById('loginPassword').value;
  if(!email||!pw) return;
  const btn=document.getElementById('loginButton'); btn.disabled=true; btn.textContent='Signing in…';
  try{ const{data:result,error}=await sbClient.auth.signInWithPassword({email,password:pw}); if(error){ showError(error.message); return; } if(!result||!result.user){ showError('No user data returned.'); return; } currentUser=result.user; settings.name=email.split('@')[0]; saveSettingsToStore(); hideLogin(); toast('Welcome, '+settings.name); }
  catch(e){ showError('Could not reach the server.'); }
  finally{ btn.disabled=false; btn.textContent='Sign in'; }
});

document.getElementById('signUpBtn').addEventListener('click', async()=>{
  hideMessages();
  if(!sbClient){ showError('Auth not loaded.'); return; }
  const email=document.getElementById('loginEmail').value.trim(), pw=document.getElementById('loginPassword').value;
  if(!email||!pw){ showError('Please enter email and password.'); return; }
  if(pw.length<6){ showError('Password must be at least 6 characters.'); return; }
  const btn=document.getElementById('signUpBtn'); btn.disabled=true; btn.textContent='Creating account…';
  try{ const{data:result,error}=await sbClient.auth.signUp({email,password:pw}); if(error){ showError(error.message); return; } if(result.user&&result.user.identities&&result.user.identities.length===0){ showError('Account already exists.'); return; } if(!result.user){ showError('Check email for confirmation.'); return; } currentUser=result.user; settings.name=email.split('@')[0]; saveSettingsToStore(); hideLogin(); toast('Account created!'); }
  catch(e){ showError('Could not reach the server.'); }
  finally{ btn.disabled=false; btn.textContent='Create account'; }
});

document.getElementById('forgotPwBtn').addEventListener('click', async(e)=>{
  e.preventDefault(); e.stopPropagation(); hideMessages();
  if(!sbClient){ showError('Auth not loaded.'); return; }
  const email=document.getElementById('loginEmail').value.trim();
  if(!email){ showError('Enter email first.'); return; }
  try{ const{error}=await sbClient.auth.resetPasswordForEmail(email,{redirectTo:window.location.origin+'/RITS_PCOD/reset-password.html'}); if(error){ showError(error.message); return; } showSuccess('Password reset email sent!'); }
  catch(err){ showError('Reset failed: '+err.message); }
});

document.getElementById('signOut').addEventListener('click', async()=>{ try{ if(sbClient) await sbClient.auth.signOut(); }catch(e){} currentUser=null; location.reload(); });

async function checkSession(){ if(!sbClient){ showLogin(); return false; } try{ const{data:{session}}=await sbClient.auth.getSession(); if(session&&session.user){ currentUser=session.user; settings.name=(currentUser.email||'').split('@')[0]; saveSettingsToStore(); hideLogin(); return true; } }catch(e){} showLogin(); return false; }

/* ---------- Navigation ---------- */
document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  btn.classList.add('active'); document.getElementById('page-'+btn.dataset.page).classList.add('active');
  if(btn.dataset.page==='trends') renderTrends(); if(btn.dataset.page==='insights') renderInsights(); if(btn.dataset.page==='settings') fillSettingsForm();
}));
document.getElementById('prevDay').addEventListener('click',()=>{ const d=new Date(currentDate); d.setDate(d.getDate()-1); currentDate=fmtDate(d); renderToday(); });
document.getElementById('nextDay').addEventListener('click',()=>{ const d=new Date(currentDate); d.setDate(d.getDate()+1); currentDate=fmtDate(d); renderToday(); });
document.getElementById('jumpToday').addEventListener('click',()=>{ currentDate=todayStr(); renderToday(); });

/* ---------- Chip builders ---------- */
function buildChips(c,vals,u,fn){ c.innerHTML=''; vals.forEach(v=>{const b=document.createElement('button');b.className='chip';b.textContent=u?v+u:v;b.addEventListener('click',()=>fn(v));c.appendChild(b);}); }
function buildMealRows(){
  const w=document.getElementById('mealRows'); w.innerHTML='';
  [{key:'morning',label:'Breakfast',chips:[6,10,18,20,25,30]},{key:'lunch',label:'Lunch',chips:[10,18,20,25,30,40]},{key:'dinner',label:'Dinner',chips:[10,18,20,25,30,40]}].forEach(m=>{
    const r=document.createElement('div'); r.className='meal-row';
    r.innerHTML=`<div class="meal-top"><span>${m.label}</span><span class="mono" id="meal-${m.key}-val">0g / ${settings.proteinMeal}g</span></div><div class="bar-track"><div class="bar-fill" id="meal-${m.key}-bar" style="width:0%;background:var(--teal);"></div></div><div class="chip-row" id="meal-${m.key}-chips"></div><div class="manual-row"><button class="small-btn" data-meal="${m.key}" data-delta="-5">−</button><input type="number" id="meal-${m.key}-input" min="0" step="1"><button class="small-btn" data-meal="${m.key}" data-delta="5">+</button><span class="unit">g protein</span></div>`;
    w.appendChild(r);
    buildChips(r.querySelector('#meal-'+m.key+'-chips'),m.chips,'g',(v)=>{const d=getDay(currentDate);d.protein[m.key]+=v;saveData();renderToday();});
  });
  w.addEventListener('click',(e)=>{const b=e.target.closest('button[data-meal]');if(!b)return;const k=b.dataset.meal,d=parseFloat(b.dataset.delta),day=getDay(currentDate);day.protein[k]=Math.max(0,(day.protein[k]||0)+d);saveData();renderToday();});
  w.addEventListener('change',(e)=>{if(e.target.matches('input[id^="meal-"]')){const k=e.target.id.split('-')[1],day=getDay(currentDate);day.protein[k]=Math.max(0,parseFloat(e.target.value)||0);saveData();renderToday();}});
}
function buildStaticChips(){
  buildChips(document.getElementById('stepsChips'),[2000,5000,8000,10000,12000],'',(v)=>{const d=getDay(currentDate);d.steps=v;saveData();renderToday();});
  buildChips(document.getElementById('sleepChips'),[5,6,6.5,7,7.5,8,9],'h',(v)=>{const d=getDay(currentDate);d.sleepHrs=v;saveData();renderToday();});
  buildChips(document.getElementById('exChips'),[0,15,30,45,60,90],'m',(v)=>{const d=getDay(currentDate);d.exerciseMin=v;saveData();renderToday();});
}
function buildMoodRow(){
  const w=document.getElementById('moodRow'); w.innerHTML='';
  [{k:'Happy',e:'😄'},{k:'Calm',e:'😌'},{k:'Tired',e:'😴'},{k:'Stressed',e:'😣'},{k:'Low',e:'😔'}].forEach(m=>{
    const b=document.createElement('button'); b.className='emoji-btn'; b.dataset.mood=m.k; b.innerHTML=m.e+'<span class="emoji-label">'+m.k+'</span>';
    b.addEventListener('click',()=>{const d=getDay(currentDate);d.mood=m.k;saveData();renderToday();}); w.appendChild(b);
  });
}

/* ---------- Input wiring ---------- */
document.querySelectorAll('button[data-adj="steps"]').forEach(b=>b.addEventListener('click',()=>{const d=getDay(currentDate);d.steps=Math.max(0,d.steps+parseInt(b.dataset.delta));saveData();renderToday();}));
document.getElementById('stepsInput').addEventListener('change',(e)=>{const d=getDay(currentDate);d.steps=Math.max(0,parseInt(e.target.value)||0);saveData();renderToday();});
document.querySelectorAll('button[data-water]').forEach(b=>b.addEventListener('click',()=>{const d=getDay(currentDate);d.waterMl=Math.max(0,d.waterMl+parseInt(b.dataset.water));saveData();renderToday();}));
document.getElementById('waterReset').addEventListener('click',()=>{const d=getDay(currentDate);d.waterMl=0;saveData();renderToday();});
document.getElementById('hrInput').addEventListener('change',(e)=>{const d=getDay(currentDate);d.hr=e.target.value===''?null:parseFloat(e.target.value);saveData();renderToday();});
document.getElementById('weightInput').addEventListener('change',(e)=>{const d=getDay(currentDate);d.weight=e.target.value===''?null:parseFloat(e.target.value);saveData();renderToday();});
document.getElementById('sleepQuality').addEventListener('change',(e)=>{getDay(currentDate).sleepQuality=e.target.value;saveData();});
document.getElementById('stressLevel').addEventListener('change',(e)=>{getDay(currentDate).stress=e.target.value;saveData();});
document.getElementById('exType').addEventListener('change',(e)=>{getDay(currentDate).exerciseType=e.target.value;saveData();});
document.getElementById('energyRange').addEventListener('input',(e)=>{document.getElementById('energyVal').textContent=e.target.value+' / 10';getDay(currentDate).energy=parseInt(e.target.value);saveData();});
document.getElementById('notesInput').addEventListener('change',(e)=>{getDay(currentDate).notes=e.target.value;saveData();});

/* ---------- Score ---------- */
function computeScore(day){
  const pt=(day.protein.morning||0)+(day.protein.lunch||0)+(day.protein.dinner||0), ptgt=settings.proteinMeal*3;
  const pp=pct(pt,ptgt), sp=pct(day.steps,settings.steps), wp=pct(day.waterMl,settings.waterMl);
  const slp=day.sleepHrs>0?Math.min(1,1-Math.abs(day.sleepHrs-settings.sleepHrs)/settings.sleepHrs):0;
  const ep=pct(day.exerciseMin,settings.exerciseMin);
  let hrp=null; if(day.hr) hrp=(day.hr>=settings.hrMin&&day.hr<=settings.hrMax)?1:0.4;
  const w={protein:.28,steps:.2,water:.15,sleep:.22,exercise:.1,hr:.05};
  let t=0,ws=0; t+=pp*w.protein;ws+=w.protein;t+=sp*w.steps;ws+=w.steps;t+=wp*w.water;ws+=w.water;t+=Math.max(0,slp)*w.sleep;ws+=w.sleep;t+=ep*w.exercise;ws+=w.exercise;if(hrp!==null){t+=hrp*w.hr;ws+=w.hr;}
  if(pt<=0&&day.steps<=0&&day.waterMl<=0&&day.sleepHrs<=0&&day.exerciseMin<=0&&!day.hr) return null;
  return Math.round((t/ws)*100);
}

/* ---------- Render Today ---------- */
function renderToday(){
  const day=getDay(currentDate), dLabel=new Date(currentDate+'T00:00:00'), isToday=currentDate===todayStr();
  document.getElementById('dateLabel').textContent=dLabel.toLocaleDateString('en-IN',{weekday:'short',day:'2-digit',month:'short'})+(isToday?' · today':'');
  const meals=['morning','lunch','dinner']; let pt=0;
  meals.forEach(k=>{const v=day.protein[k]||0;pt+=v;const tgt=settings.proteinMeal;document.getElementById('meal-'+k+'-val').textContent=v+'g / '+tgt+'g';document.getElementById('meal-'+k+'-bar').style.width=Math.min(100,(v/tgt)*100)+'%';document.getElementById('meal-'+k+'-bar').style.background=v/tgt>=1?'var(--good)':(v/tgt>=.6?'var(--warn)':'var(--bad)');document.getElementById('meal-'+k+'-input').value=v||'';});
  const ptgt=settings.proteinMeal*3, pr=document.getElementById('proteinReadout'); pr.textContent=pt+'/'+ptgt+'g'; pr.className='card-readout '+(pt>=ptgt?'readout-good':(pt>=ptgt*.6?'readout-warn':'readout-bad'));
  document.getElementById('proteinTargetHint').textContent='Target: '+settings.proteinMeal+'g per meal · '+ptgt+'g/day. Adjust in Settings.';
  document.getElementById('stepsInput').value=day.steps||''; document.getElementById('stepsReadout').textContent=day.steps.toLocaleString(); document.getElementById('stepsBar').style.width=Math.min(100,(day.steps/settings.steps)*100)+'%';
  document.getElementById('waterReadout').textContent=(day.waterMl/1000).toFixed(2)+'L'; document.getElementById('waterBar').style.width=Math.min(100,(day.waterMl/settings.waterMl)*100)+'%';
  document.getElementById('sleepReadout').textContent=(day.sleepHrs||0).toFixed(1)+'h'; document.getElementById('sleepBar').style.width=Math.min(100,((day.sleepHrs||0)/settings.sleepHrs)*100)+'%';
  document.getElementById('sleepQuality').value=day.sleepQuality||'Good'; document.getElementById('stressLevel').value=day.stress||'Low';
  document.getElementById('hrInput').value=day.hr??''; document.getElementById('weightInput').value=day.weight??'';
  const hr=document.getElementById('hrReadout'); if(day.hr){hr.textContent=day.hr+' bpm';hr.className='card-readout '+(day.hr>=settings.hrMin&&day.hr<=settings.hrMax?'readout-good':'readout-warn');}else{hr.textContent='— bpm';hr.className='card-readout readout-neutral';}
  document.getElementById('hrRangeHint').textContent='Reference range: '+settings.hrMin+'–'+settings.hrMax+' bpm.';
  document.getElementById('exReadout').textContent=(day.exerciseMin||0)+' min'; document.getElementById('exType').value=day.exerciseType||'';
  document.querySelectorAll('#moodRow .emoji-btn').forEach(b=>b.classList.toggle('sel',b.dataset.mood===day.mood));
  document.getElementById('energyRange').value=day.energy||6; document.getElementById('energyVal').textContent=(day.energy||6)+' / 10';
  document.getElementById('notesInput').value=day.notes||'';
  const score=computeScore(day), rf=document.getElementById('ringFg'), circ=188.4;
  if(score===null){rf.style.strokeDashoffset=circ;document.getElementById('ringNum').textContent='—';document.getElementById('scoreSub').textContent='Log today to see your score';}
  else{rf.style.strokeDashoffset=circ-(circ*score/100);document.getElementById('ringNum').textContent=score;document.getElementById('scoreSub').textContent=score>=85?'Excellent day':score>=65?'Solid — a few gaps':'Needs attention';}
  document.getElementById('streakNum').textContent=computeStreak();
}
function computeStreak(){let s=0;let d=new Date(todayStr()+'T00:00:00');while(true){const ds=fmtDate(d),day=data[ds];if(day&&computeScore(Object.assign(emptyDay(),day))!==null){s++;d.setDate(d.getDate()-1);}else break;}return s;}

/* ---------- Trends ---------- */
document.querySelectorAll('.range-tabs button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.range-tabs button').forEach(x=>x.classList.remove('active'));b.classList.add('active');currentRange=parseInt(b.dataset.range);renderTrends();}));
function makeChart(ctx,ex,config){if(ex){try{ex.destroy();}catch(e){}}if(!ctx)return null;try{return new Chart(ctx,config);}catch(e){const w=ctx.parentElement;if(w&&!w.querySelector('.chart-unavailable'))w.innerHTML='<div class="chart-unavailable">Chart unavailable — reload.</div>';return null;}}
function renderTrends(){
  const days=lastNDays(currentRange),labels=days.map(d=>new Date(d+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short'})),rows=days.map(d=>data[d]?Object.assign(emptyDay(),data[d]):null);
  const scores=rows.map(r=>r?computeScore(r):null),pt=rows.map(r=>r?(r.protein.morning+r.protein.lunch+r.protein.dinner):null),st=rows.map(r=>r?r.steps:null),sl=rows.map(r=>r?r.sleepHrs:null),wa=rows.map(r=>r?+(r.waterMl/1000).toFixed(2):null);
  const bo={responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{font:{family:'IBM Plex Mono',size:9}}},y:{grid:{color:'#F5DDE7'},ticks:{font:{family:'IBM Plex Mono',size:9}}}}};
  try{scoreChart=makeChart(document.getElementById('chartScore'),scoreChart,{type:'line',data:{labels,datasets:[{data:scores,borderColor:'#C85F87',backgroundColor:'rgba(200,95,135,.14)',fill:true,tension:.35,spanGaps:true,pointRadius:2}]},options:Object.assign({},bo,{scales:Object.assign({},bo.scales,{y:Object.assign({},bo.scales.y,{min:0,max:100})})})});}catch(e){}
  try{const ptgt=settings.proteinMeal*3;proteinChart=makeChart(document.getElementById('chartProtein'),proteinChart,{type:'bar',data:{labels,datasets:[{data:pt,backgroundColor:'#F7B8CF'},{type:'line',data:days.map(()=>ptgt),borderColor:'#D97A9A',borderDash:[4,4],pointRadius:0,borderWidth:1.5}]},options:JSON.parse(JSON.stringify(bo))});}catch(e){}
  try{stepsChart=makeChart(document.getElementById('chartSteps'),stepsChart,{type:'bar',data:{labels,datasets:[{data:st,backgroundColor:'#A58BC5'}]},options:JSON.parse(JSON.stringify(bo))});}catch(e){}
  try{sleepChart=makeChart(document.getElementById('chartSleep'),sleepChart,{type:'bar',data:{labels,datasets:[{data:sl,backgroundColor:'#D49ABD'}]},options:JSON.parse(JSON.stringify(bo))});}catch(e){}
  try{waterChart=makeChart(document.getElementById('chartWater'),waterChart,{type:'bar',data:{labels,datasets:[{data:wa,backgroundColor:'#F3A8C1'}]},options:JSON.parse(JSON.stringify(bo))});}catch(e){}
  const vs=scores.filter(s=>s!==null),avgS=vs.length?Math.round(vs.reduce((a,b)=>a+b,0)/vs.length):0,best=vs.length?Math.max(...vs):0,ld=rows.filter(r=>r!==null).length;
  document.getElementById('scoreStats').innerHTML=`<div class="stat-box"><div class="n">${avgS}</div><div class="l">avg score</div></div><div class="stat-box"><div class="n">${best}</div><div class="l">best day</div></div><div class="stat-box"><div class="n">${ld}/${currentRange}</div><div class="l">days logged</div></div>`;
}

/* ---------- Insights ---------- */
function renderInsights(){
  const days=lastNDays(7),rows=days.map(d=>data[d]?Object.assign(emptyDay(),data[d]):null).filter(r=>r!==null),list=document.getElementById('insightList');list.innerHTML='';
  if(rows.length<2){list.innerHTML='<div class="insight-item"><div class="insight-dot" style="background:var(--ink-faint);"></div><div class="insight-text"><b>Not enough data yet</b><span>Log at least 2–3 days.</span></div></div>';return;}
  const ins=[],ptgt=settings.proteinMeal*3;
  const pa=avg(rows.map(r=>r.protein.morning+r.protein.lunch+r.protein.dinner)),pdm=rows.filter(r=>(r.protein.morning+r.protein.lunch+r.protein.dinner)>=ptgt).length;
  ins.push({level:pa>=ptgt?'good':pa>=ptgt*.7?'warn':'bad',title:'Protein averaged '+Math.round(pa)+'g/day',body:'Target is '+ptgt+'g/day. Hit it on '+pdm+'/'+rows.length+' days.'+(pa<ptgt?' Try adding one more protein source.':' Nice consistency!')});
  const ma={morning:avg(rows.map(r=>r.protein.morning)),lunch:avg(rows.map(r=>r.protein.lunch)),dinner:avg(rows.map(r=>r.protein.dinner))},wk=Object.entries(ma).sort((a,b)=>a[1]-b[1])[0];
  if(wk[1]<settings.proteinMeal*.6) ins.push({level:'warn',title:cap(wk[0])+' is lightest for protein',body:'Avg '+Math.round(wk[1])+'g vs '+settings.proteinMeal+'g target.'});
  const sa=avg(rows.map(r=>r.steps));ins.push({level:sa>=settings.steps?'good':sa>=settings.steps*.7?'warn':'bad',title:'Steps averaged '+Math.round(sa).toLocaleString()+'/day',body:'Target: '+settings.steps.toLocaleString()+'.'});
  const sla=avg(rows.map(r=>r.sleepHrs).filter(v=>v>0));if(sla)ins.push({level:Math.abs(sla-settings.sleepHrs)<=.5?'good':'warn',title:'Sleep averaged '+sla.toFixed(1)+'h',body:'Target: '+settings.sleepHrs+'h.'});
  const wa2=avg(rows.map(r=>r.waterMl));ins.push({level:wa2>=settings.waterMl?'good':wa2>=settings.waterMl*.7?'warn':'bad',title:'Water averaged '+(wa2/1000).toFixed(1)+'L/day',body:'Target: '+(settings.waterMl/1000).toFixed(1)+'L.'});
  const ea=avg(rows.map(r=>r.exerciseMin)),ed=rows.filter(r=>r.exerciseMin>0).length;ins.push({level:ed>=rows.length*.7?'good':ed>=rows.length*.4?'warn':'bad',title:'Exercised '+ed+'/'+rows.length+' days',body:'Avg '+Math.round(ea)+' min/day.'});
  const cm={good:'var(--good)',warn:'var(--warn)',bad:'var(--bad)'};
  ins.forEach(i=>{const d=document.createElement('div');d.className='insight-item';d.innerHTML='<div class="insight-dot" style="background:'+cm[i.level]+'"></div><div class="insight-text"><b>'+i.title+'</b><span>'+i.body+'</span></div>';list.appendChild(d);});
}

/* ============================================================
   JARVIS — Simple Gemini AI
   Question → Gemini API → Answer shown on page
   ============================================================ */
const apiKeyInput=document.getElementById('apiKeyInput');
const savedKey=localStorage.getItem(JARVIS_KEY)||'';
if(savedKey) apiKeyInput.value=savedKey;

apiKeyInput.addEventListener('change',()=>{
  const k=apiKeyInput.value.trim();
  if(k) localStorage.setItem(JARVIS_KEY,k);
});

document.getElementById('clearKey').addEventListener('click',()=>{
  localStorage.removeItem(JARVIS_KEY);
  apiKeyInput.value='';
  toast('API key cleared');
});

const JARVIS_SYSTEM=`You are Jarvis, a warm, supportive PCOD-aware wellness companion. Be inclusive, encouraging, and practical. Give short, concrete suggestions that respect Indian food and everyday routines when useful. Never diagnose, prescribe medication, shame the user, or claim certainty. Mention a clinician for persistent, worsening, or concerning symptoms. Current targets: protein ${settings.proteinMeal}g per meal, ${settings.steps} steps, water ${settings.waterMl}ml, sleep ${settings.sleepHrs}h.`;

async function askJarvis(question){
  const key=apiKeyInput.value.trim();
  if(!key){ return '🔑 Please add your Gemini API key above first. Tap the button to get one free!'; }

  const recentDays=lastNDays(7).map(d=>data[d]?{date:d,...data[d]}:null).filter(Boolean);
  const context='\nRecent wellness logs: '+JSON.stringify(recentDays).slice(0,3000);
  const fullPrompt=JARVIS_SYSTEM+context+'\n\nUser question: '+question;

  const resp=await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key='+key,{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
      contents:[{role:'user',parts:[{text:fullPrompt}]}],
      generationConfig:{maxOutputTokens:600,temperature:0.7}
    })
  });
  if(!resp.ok){ const err=await resp.text(); if(err.includes('API_KEY_INVALID')) throw new Error('Invalid API key — get a free one at aistudio.google.com/apikey'); throw new Error('API error '+resp.status); }
  const json=await resp.json();
  if(json.error) throw new Error(json.error.message||'Gemini error');
  return (json.candidates||[])[0]?.content?.parts?.[0]?.text?.trim()||'No response received.';
}

/* ---------- Form: question → Gemini → answer ---------- */
document.getElementById('jarvisForm').addEventListener('submit',async(event)=>{
  event.preventDefault();
  const input=document.getElementById('jarvisInput');
  const output=document.getElementById('jarvisOutput');
  const question=input.value.trim();
  if(!question) return;

  input.value='';
  output.innerHTML='<span style="opacity:.5">✨ Thinking…</span>';

  try{
    const answer=await askJarvis(question);
    output.innerHTML=answer.replace(/\*\*(.*?)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br>');
  }catch(e){
    output.innerHTML='⚠️ '+e.message;
  }
});

/* ---------- Settings ---------- */
function fillSettingsForm(){
  document.getElementById('setProteinMeal').value=settings.proteinMeal;document.getElementById('setProteinDay').value=settings.proteinMeal*3;
  document.getElementById('setSteps').value=settings.steps;document.getElementById('setWater').value=settings.waterMl;
  document.getElementById('setExercise').value=settings.exerciseMin;document.getElementById('setSleep').value=settings.sleepHrs;
  document.getElementById('setWeightGoal').value=settings.weightGoal??'';document.getElementById('setHrMin').value=settings.hrMin;
  document.getElementById('setHrMax').value=settings.hrMax;document.getElementById('setHeight').value=settings.height??'';
  document.getElementById('setName').value=settings.name||'';
}
document.getElementById('setProteinMeal').addEventListener('input',(e)=>{document.getElementById('setProteinDay').value=(parseFloat(e.target.value)||0)*3;});
document.getElementById('saveSettings').addEventListener('click',()=>{
  settings.proteinMeal=parseFloat(document.getElementById('setProteinMeal').value)||50;
  settings.steps=parseInt(document.getElementById('setSteps').value)||8000;
  settings.waterMl=parseInt(document.getElementById('setWater').value)||2500;
  settings.exerciseMin=parseInt(document.getElementById('setExercise').value)||30;
  settings.sleepHrs=parseFloat(document.getElementById('setSleep').value)||7.5;
  settings.weightGoal=document.getElementById('setWeightGoal').value?parseFloat(document.getElementById('setWeightGoal').value):null;
  settings.hrMin=parseInt(document.getElementById('setHrMin').value)||60;
  settings.hrMax=parseInt(document.getElementById('setHrMax').value)||100;
  settings.height=document.getElementById('setHeight').value?parseFloat(document.getElementById('setHeight').value):null;
  settings.name=document.getElementById('setName').value||'';
  saveSettingsToStore();buildMealRows();renderToday();toast('Settings saved');
});

/* ---------- Export / Import / Wipe ---------- */
function downloadBlob(b,f){const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=f;a.click();URL.revokeObjectURL(u);}
document.getElementById('exportData').addEventListener('click',()=>{downloadBlob(new Blob([JSON.stringify({settings,data},null,2)],{type:'application/json'}),'pulse-backup-'+todayStr()+'.json');});
document.getElementById('exportCsv').addEventListener('click',()=>{
  const dates=Object.keys(data).sort(),h=['Date','Breakfast(g)','Lunch(g)','Dinner(g)','ProteinTotal(g)','Steps','Water(ml)','Sleep(h)','SleepQuality','Stress','HR(bpm)','Weight(kg)','ExerciseMin','ExerciseType','Mood','Energy','Notes'];
  const rows=dates.map(d=>{const r=Object.assign(emptyDay(),data[d]);const t=r.protein.morning+r.protein.lunch+r.protein.dinner;return [d,r.protein.morning,r.protein.lunch,r.protein.dinner,t,r.steps,r.waterMl,r.sleepHrs,r.sleepQuality,r.stress,r.hr??'',r.weight??'',r.exerciseMin,r.exerciseType,r.mood??'',r.energy,'"'+(r.notes||'').replace(/"/g,'""')+'"'].join(',');});
  downloadBlob(new Blob([[h.join(','),...rows].join('\n')],{type:'text/csv'}),'pulse-log-'+todayStr()+'.csv');
});
document.getElementById('importFile').addEventListener('change',(e)=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=(ev)=>{try{const p=JSON.parse(ev.target.result);if(p.data)data=p.data;if(p.settings)settings=Object.assign({...DEFAULT_SETTINGS},p.settings);saveData();saveSettingsToStore();buildMealRows();renderToday();fillSettingsForm();toast('Backup imported');}catch(err){toast('Could not read file');}};r.readAsText(f);});
document.getElementById('wipeData').addEventListener('click',()=>{if(confirm('Erase all data? This cannot be undone.')){localStorage.removeItem(STORE_KEY);data={};renderToday();toast('All data erased');}});

/* ---------- Save Today ---------- */
document.getElementById('saveToday').addEventListener('click',()=>{saveData();renderToday();toast('Saved!');});

/* ---------- Init ---------- */
const _hash=window.location.hash;
if(_hash.includes('type=recovery')||_hash.includes('access_token')){window.location.replace('reset-password.html'+_hash+window.location.search);}
else{buildMealRows();buildStaticChips();buildMoodRow();renderToday();checkSession();}
