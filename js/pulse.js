/* ============================================================
   PULSE v2 — Daily Wellness Tracker
   Single-step wizard for Today, glass UI, compact header
   ============================================================ */
console.log('Pulse v2 loaded');
window.__PULSE_VERSION = '1.0.0008';

const STORE_KEY='pulse_data_v1',SETTINGS_KEY='pulse_settings_v1';
const DEFAULT_SETTINGS={proteinMeal:50,steps:8000,waterMl:2500,exerciseMin:30,sleepHrs:7.5,hrMin:60,hrMax:100,weightGoal:null,height:null,name:''};
let settings=loadSettings(),data=loadData(),currentDate=todayStr(),currentRange=7;
let scoreChart,proteinChart,stepsChart,sleepChart,waterChart;

/* ---- utils ---- */
function todayStr(){return fmtDate(new Date())}
function fmtDate(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
function loadSettings(){try{const r=localStorage.getItem(SETTINGS_KEY);return r?Object.assign({},DEFAULT_SETTINGS,JSON.parse(r)):{...DEFAULT_SETTINGS}}catch(e){return{...DEFAULT_SETTINGS}}}
function saveSettingsToStore(){localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings))}
function loadData(){try{const r=localStorage.getItem(STORE_KEY);const s=r?JSON.parse(r):{};if(Object.keys(s).length)return s;const lr=localStorage.getItem('rit_pcod_data');if(!lr)return s;const legacy=JSON.parse(lr),m={};Object.values(legacy).flat().forEach(e=>{if(!e||!e.date)return;m[e.date]=Object.assign(emptyDay(),{steps:Number(e.steps)||0,waterMl:Math.round((Number(e.water)||0)*1000),sleepHrs:Number(e.sleep)||0,hr:e.hr?Number(e.hr):null,weight:e.wMorn?Number(e.wMorn):null,exerciseMin:e.exYN==='Yes'?30:0,mood:e.mood||null,energy:Number(e.energy)||6,notes:e.notes||''})});if(Object.keys(m).length){localStorage.setItem(STORE_KEY,JSON.stringify(m));return m}return s}catch(e){return{}}}
function saveData(){localStorage.setItem(STORE_KEY,JSON.stringify(data))}
function emptyDay(){return{protein:{morning:0,lunch:0,dinner:0},steps:0,waterMl:0,sleepHrs:0,sleepQuality:'Good',stress:'Low',hr:null,weight:null,exerciseMin:0,exerciseType:'',mood:null,energy:6,notes:''}}
function getDay(ds){if(!data[ds])data[ds]=emptyDay();data[ds]=Object.assign(emptyDay(),data[ds]);return data[ds]}
function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1600)}
function avg(arr){const a=arr.filter(v=>v!==undefined&&v!==null);return a.length?a.reduce((x,y)=>x+y,0)/a.length:0}
function pct(v,t){return t>0?Math.min(1,v/t):0}
function lastNDays(n){const arr=[];let d=new Date(todayStr()+'T00:00:00');for(let i=n-1;i>=0;i--){const dd=new Date(d);dd.setDate(d.getDate()-i);arr.push(fmtDate(dd))}return arr}

/* ---- supabase auth ---- */
const SUPABASE_URL='https://ujkupyimtbqzkusiefyb.supabase.co';
const SUPABASE_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqa3VweWltdGJxemt1c2llZnliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxMTEzNDMsImV4cCI6MjEwMzY4NzM0M30.rfJEm7yu0dxuVRkYjNwikeeN7MrhKHAJW_S_Kw9TWnU';
let sbClient=null;try{const c=window.supabase.createClient;if(c)sbClient=c(SUPABASE_URL,SUPABASE_KEY)}catch(e){}
let currentUser=null;
function showError(m){document.getElementById('authError').textContent=m;document.getElementById('authError').style.display='block';document.getElementById('authSuccess').style.display='none'}
function showSuccess(m){document.getElementById('authSuccess').textContent=m;document.getElementById('authSuccess').style.display='block';document.getElementById('authError').style.display='none'}
function hideMessages(){document.getElementById('authError').style.display='none';document.getElementById('authSuccess').style.display='none'}
function showLogin(){document.getElementById('loginScreen').hidden=false;document.getElementById('loginEmail').focus()}
function hideLogin(){document.getElementById('loginScreen').hidden=true}

document.getElementById('loginForm').addEventListener('submit',async(e)=>{
  e.preventDefault();hideMessages();if(!sbClient){showError('Auth not loaded.');return}
  const em=document.getElementById('loginEmail').value.trim(),pw=document.getElementById('loginPassword').value;if(!em||!pw)return;
  const btn=document.getElementById('loginButton');btn.disabled=true;btn.textContent='Signing in…';
  try{const{data:r,error}=await sbClient.auth.signInWithPassword({email:em,password:pw});if(error){showError(error.message);return}if(!r||!r.user){showError('No user data.');return}currentUser=r.user;settings.name=em.split('@')[0];saveSettingsToStore();hideLogin();toast('Welcome!')}catch(e){showError('Server unreachable.')}finally{btn.disabled=false;btn.textContent='Sign in'}
});
document.getElementById('signUpBtn').addEventListener('click',async()=>{
  hideMessages();if(!sbClient){showError('Auth not loaded.');return}
  const em=document.getElementById('loginEmail').value.trim(),pw=document.getElementById('loginPassword').value;
  if(!em||!pw){showError('Enter email & password.');return}if(pw.length<6){showError('Min 6 chars.');return}
  const btn=document.getElementById('signUpBtn');btn.disabled=true;btn.textContent='Creating…';
  try{const{data:r,error}=await sbClient.auth.signUp({email:em,password:pw});if(error){showError(error.message);return}if(r.user&&r.user.identities&&r.user.identities.length===0){showError('Account exists.');return}if(!r.user){showError('Check email.');return}currentUser=r.user;settings.name=em.split('@')[0];saveSettingsToStore();hideLogin();toast('Welcome!')}catch(e){showError('Server unreachable.')}finally{btn.disabled=false;btn.textContent='Create account'}
});
document.getElementById('forgotPwBtn').addEventListener('click',async(ev)=>{
  ev.preventDefault();ev.stopPropagation();hideMessages();if(!sbClient){showError('Auth not loaded.');return}
  const em=document.getElementById('loginEmail').value.trim();if(!em){showError('Enter email first.');return}
  try{const{error}=await sbClient.auth.resetPasswordForEmail(em,{redirectTo:window.location.origin+'/RITS_PCOD/reset-password.html'});if(error){showError(error.message);return}showSuccess('Reset email sent!')}catch(e){showError('Failed.')}
});
document.getElementById('signOut').addEventListener('click',async()=>{try{if(sbClient)await sbClient.auth.signOut()}catch(e){}currentUser=null;location.reload()});
async function checkSession(){if(!sbClient){showLogin();return false}try{const{data:{session}}=await sbClient.auth.getSession();if(session&&session.user){currentUser=session.user;settings.name=(currentUser.email||'').split('@')[0];saveSettingsToStore();hideLogin();return true}}catch(e){}showLogin();return false}

/* ---- navigation ---- */
document.querySelectorAll('.nav-btn').forEach(btn=>btn.addEventListener('click',()=>{
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  btn.classList.add('active');document.getElementById('page-'+btn.dataset.page).classList.add('active');
  if(btn.dataset.page==='trends')renderTrends();if(btn.dataset.page==='insights')renderInsights();if(btn.dataset.page==='settings')fillSettingsForm();
}));
document.getElementById('prevDay').addEventListener('click',()=>{const d=new Date(currentDate);d.setDate(d.getDate()-1);currentDate=fmtDate(d);renderStep()});
document.getElementById('nextDay').addEventListener('click',()=>{const d=new Date(currentDate);d.setDate(d.getDate()+1);currentDate=fmtDate(d);renderStep()});
document.getElementById('jumpToday').addEventListener('click',()=>{currentDate=todayStr();renderStep()});

/* ============================================================
   STEP WIZARD — 8 steps, single card, no scroll needed
   ============================================================ */
const STEPS=[
  {id:'food', icon:'🍽', label:'Food · Protein', render:renderFoodStep},
  {id:'steps', icon:'👣', label:'Steps', render:renderStepsStep},
  {id:'water', icon:'💧', label:'Water', render:renderWaterStep},
  {id:'sleep', icon:'🌙', label:'Sleep', render:renderSleepStep},
  {id:'vitals', icon:'❤', label:'Heart & Weight', render:renderVitalsStep},
  {id:'exercise', icon:'🏃', label:'Exercise', render:renderExerciseStep},
  {id:'mood', icon:'🙂', label:'Mood & Energy', render:renderMoodStep},
  {id:'notes', icon:'📝', label:'Notes', render:renderNotesStep}
];
let currentStep=0;

function initStepDots(){
  const dots=document.getElementById('stepDots');dots.innerHTML='';
  STEPS.forEach((_,i)=>{const d=document.createElement('div');d.className='step-dot';dots.appendChild(d)});
}
function updateStepUI(){
  const dots=document.querySelectorAll('.step-dot');
  dots.forEach((d,i)=>{d.className='step-dot'+(i===currentStep?' active':(i<currentStep?' done':''))});
  document.getElementById('stepLabel').textContent=STEPS[currentStep].icon+' '+(currentStep+1)+' / '+STEPS.length;
  document.getElementById('stepPrev').style.display=currentStep===0?'none':'';
  document.getElementById('stepNext').textContent=currentStep===STEPS.length-1?'Done ✓':'Next →';
}
function renderStep(){
  // update date label
  const dLabel=new Date(currentDate+'T00:00:00');
  const isToday=currentDate===todayStr();
  document.getElementById('dateLabel').textContent=dLabel.toLocaleDateString('en-IN',{weekday:'short',day:'2-digit',month:'short'})+(isToday?' · today':'');
  updateStepUI();
  STEPS[currentStep].render();
  updateCompactScore();
  if(isToday)checkHonor();
}
function goStep(dir){
  saveData();
  currentStep=Math.max(0,Math.min(STEPS.length-1,currentStep+dir));
  renderStep();
  // auto-show honor popup when reaching step 6+ (most tabs filled)
  if(dir===1&&currentStep>=5&&honorData.length>0){setTimeout(()=>openHonorModal(),400);}
  if(currentStep===STEPS.length-1)toast('Auto-saved ✓');
}
document.getElementById('stepPrev').addEventListener('click',()=>goStep(-1));
document.getElementById('stepNext').addEventListener('click',()=>goStep(1));

/* ---- step renderers ---- */
function renderFoodStep(){
  const day=getDay(currentDate),meals=['morning','lunch','dinner'];
  let total=0;const tgt=settings.proteinMeal*3;
  let html='<div style="font-size:14px;font-weight:600;margin-bottom:10px;">🍽 Food · Protein</div>';
  meals.forEach(k=>{
    const v=day.protein[k]||0;total+=v;
    const pct2=Math.min(100,(v/settings.proteinMeal)*100);
    const emoji=pct2>=100?'✅':pct2>=60?'👍':'❗';
    html+=`<div style="margin-bottom:10px;"><div style="display:flex;justify-content:space-between;font-size:13px;font-weight:500;"><span>${emoji} ${k==='morning'?'Breakfast':k==='lunch'?'Lunch':'Dinner'}</span><span style="color:var(--ink-soft);font-size:12px;">${v}g</span></div><div class="bar-track"><div class="bar-fill" style="width:${pct2}%;background:linear-gradient(90deg,rgba(200,95,135,.4),var(--teal));"></div></div><div class="chip-row" style="margin-top:6px;"><button class="chip" onclick="addProtein('${k}',-5)" style="color:var(--bad);">−5</button>${[6,10,18,20,25,30].map(g=>`<button class="chip" onclick="addProtein('${k}',${g})">${g}g</button>`).join('')}</div></div>`;
  });
  document.getElementById('stepContent').innerHTML=html;
}
window.addProtein=function(k,g){const day=getDay(currentDate);day.protein[k]+=g;saveData();renderStep()};

function renderStepsStep(){
  const day=getDay(currentDate),s=day.steps,tgt=settings.steps,p=Math.min(100,(s/tgt)*100);
  const emoji=p>=100?'🎉':p>=75?'💪':p>=50?'🚶':p>=25?'👟':'😴';
  const msg=p>=100?'Crushing it!':p>=75?'Almost there!':p>=50?'Good start!':p>=25?'Keep going!':'Let\'s move!';
  document.getElementById('stepContent').innerHTML=`
    <div style="font-size:14px;font-weight:600;margin-bottom:10px;">👣 Steps</div>
    <div style="text-align:center;font-size:36px;margin:6px 0;">${emoji}</div>
    <div style="text-align:center;font-size:13px;color:var(--ink-soft);margin-bottom:8px;">${msg}</div>
    <div class="bar-track" style="height:10px;"><div class="bar-fill" style="width:${p}%;background:linear-gradient(90deg,var(--teal),var(--coral));"></div></div>
    <div style="display:flex;gap:6px;align-items:center;justify-content:center;margin:10px 0;">
      <button class="small-btn" onclick="adjSteps(-1000)" style="color:var(--bad);">−1k</button>
      <button class="small-btn" onclick="adjSteps(-500)" style="color:var(--bad);">−500</button>
      <input type="number" id="stepsInput" value="${s}" min="0" step="100" onchange="setSteps(this.value)" style="width:65px;padding:8px;text-align:center;border-radius:10px;border:1px solid rgba(255,255,255,.4);background:rgba(255,255,255,.35);font-family:'IBM Plex Mono';font-size:14px;">
      <button class="small-btn" onclick="adjSteps(500)">+500</button>
      <button class="small-btn" onclick="adjSteps(1000)">+1k</button>
    </div>
    <div class="chip-row" style="justify-content:center;">${[2000,5000,8000,10000,12000].map(v=>`<button class="chip" onclick="setSteps(${v})">${v.toLocaleString()}</button>`).join('')}</div>`;
}
window.adjSteps=function(d){const day=getDay(currentDate);day.steps=Math.max(0,day.steps+d);saveData();renderStep()};
window.setSteps=function(v){getDay(currentDate).steps=Math.max(0,parseInt(v)||0);saveData();renderStep()};

function renderWaterStep(){
  const day=getDay(currentDate),ml=day.waterMl,tgt=settings.waterMl,p=Math.min(100,(ml/tgt)*100);
  const emoji=p>=100?'🌊':p>=75?'💧':p>=50?'🥤':p>=25?'🫗':'🏜️';
  const msg=p>=100?'Fully hydrated!':p>=75?'Almost full!':p>=50?'Halfway!':p>=25?'Sip more!':'Need water!';
  document.getElementById('stepContent').innerHTML=`
    <div style="font-size:14px;font-weight:600;margin-bottom:10px;">💧 Water</div>
    <div style="text-align:center;font-size:36px;margin:6px 0;">${emoji}</div>
    <div style="text-align:center;font-size:13px;color:var(--ink-soft);margin-bottom:8px;">${msg}</div>
    <div class="bar-track" style="height:10px;"><div class="bar-fill" style="width:${p}%;background:linear-gradient(90deg,var(--sky),var(--lilac));"></div></div>
    <div class="chip-row" style="justify-content:center;margin-top:10px;">
      <button class="chip" onclick="addWater(-250)" style="color:var(--bad);">−250ml</button>
      <button class="chip plus" onclick="addWater(250)">+250ml</button>
      <button class="chip plus" onclick="addWater(500)">+500ml</button>
      <button class="chip plus" onclick="addWater(750)">+1 bottle</button>
      <button class="chip" onclick="setWater(0)">reset</button>
    </div>`;
}
window.addWater=function(ml){const d=getDay(currentDate);d.waterMl=Math.max(0,d.waterMl+ml);saveData();renderStep()};
window.setWater=function(v){getDay(currentDate).waterMl=v;saveData();renderStep()};

function renderSleepStep(){
  const day=getDay(currentDate),h=day.sleepHrs||0,tgt=settings.sleepHrs,p=Math.min(100,(h/tgt)*100);
  const emoji=h>=8?'😴':h>=7?'😌':h>=6?'🥱':h>=5?'😵':'💤';
  const msg=h>=8?'Slept like a baby!':h>=7?'Solid rest!':h>=6?'Could be more':h>=5?'Tired?':'Need sleep!';
  document.getElementById('stepContent').innerHTML=`
    <div style="font-size:14px;font-weight:600;margin-bottom:10px;">🌙 Sleep</div>
    <div style="text-align:center;font-size:36px;margin:6px 0;">${emoji}</div>
    <div style="text-align:center;font-size:13px;color:var(--ink-soft);margin-bottom:8px;">${msg}</div>
    <div class="bar-track" style="height:10px;"><div class="bar-fill" style="width:${p}%;background:linear-gradient(90deg,var(--lilac),var(--teal));"></div></div>
    <div class="chip-row" style="justify-content:center;margin:10px 0;">
      <button class="chip" onclick="setSleep(${Math.max(0,h-0.5)})" style="color:var(--bad);">−.5h</button>
      ${[5,6,6.5,7,7.5,8,9].map(v=>`<button class="chip${h===v?' plus':''}" onclick="setSleep(${v})">${v}h</button>`).join('')}
    </div>
    <div class="field-grid">
      <div class="field"><label>Quality</label><select id="sleepQuality" onchange="getDay(currentDate).sleepQuality=this.value;saveData()"><option>Poor</option><option>Fair</option><option ${day.sleepQuality==='Good'?'selected':''}>Good</option><option>Excellent</option></select></div>
      <div class="field"><label>Stress</label><select id="stressLevel" onchange="getDay(currentDate).stress=this.value;saveData()"><option ${day.stress==='Low'?'selected':''}>Low</option><option>Medium</option><option>High</option></select></div>
    </div>`;
}
window.setSleep=function(v){getDay(currentDate).sleepHrs=v;saveData();renderStep()};

function renderVitalsStep(){
  const day=getDay(currentDate);
  document.getElementById('stepContent').innerHTML=`
    <div style="font-size:14px;font-weight:600;margin-bottom:10px;">❤ Heart rate & weight</div>
    <div class="field-grid">
      <div class="field"><label>Resting HR (bpm)</label><input type="number" id="hrInput" value="${day.hr??''}" min="0" placeholder="e.g. 68" onchange="getDay(currentDate).hr=this.value===''?null:parseFloat(this.value);saveData();renderStep()"></div>
      <div class="field"><label>Weight (kg)</label><input type="number" id="weightInput" value="${day.weight??''}" step="0.1" placeholder="e.g. 62.4" onchange="getDay(currentDate).weight=this.value===''?null:parseFloat(this.value);saveData();renderStep()"></div>
    </div>
    <div class="hint" style="margin-top:8px;">Range: ${settings.hrMin}–${settings.hrMax} bpm</div>`;
}

function renderExerciseStep(){
  const day=getDay(currentDate),m=day.exerciseMin||0,tgt=settings.exerciseMin,p=Math.min(100,(m/tgt)*100);
  const emoji=p>=100?'🏆':p>=75?'💪':p>=50?'🏃':p>=25?'🚶':'🛋️';
  const msg=p>=100?'Workout done!':p>=75?'Great session!':p>=50?'Moving!':p>=25?'Light activity':'Rest day?';
  document.getElementById('stepContent').innerHTML=`
    <div style="font-size:14px;font-weight:600;margin-bottom:10px;">🏃 Exercise</div>
    <div style="text-align:center;font-size:36px;margin:6px 0;">${emoji}</div>
    <div style="text-align:center;font-size:13px;color:var(--ink-soft);margin-bottom:8px;">${msg}</div>
    <div class="bar-track" style="height:10px;"><div class="bar-fill" style="width:${p}%;background:linear-gradient(90deg,var(--amber),var(--coral));"></div></div>
    <div class="chip-row" style="justify-content:center;margin:10px 0;">
      <button class="chip" onclick="setEx(Math.max(0,${m}-15))" style="color:var(--bad);">−15m</button>
      ${[0,15,30,45,60,90].map(v=>`<button class="chip${m===v?' plus':''}" onclick="setEx(${v})">${v}m</button>`).join('')}
    </div>
    <div class="field" style="margin-top:8px;"><label>Type (optional)</label><input type="text" id="exType" value="${day.exerciseType||''}" placeholder="e.g. Walk, Yoga, Gym" onchange="getDay(currentDate).exerciseType=this.value;saveData()"></div>`;
}
window.setEx=function(v){getDay(currentDate).exerciseMin=v;saveData();renderStep()};

function renderMoodStep(){
  const day=getDay(currentDate),mood=day.mood,en=day.energy||6;
  document.getElementById('stepContent').innerHTML=`
    <div style="font-size:14px;font-weight:600;margin-bottom:10px;">🙂 Mood & Energy</div>
    <div class="emoji-row">${[{k:'Happy',e:'😄'},{k:'Calm',e:'😌'},{k:'Tired',e:'😴'},{k:'Stressed',e:'😣'},{k:'Low',e:'😔'}].map(m=>`<button class="emoji-btn${mood===m.k?' sel':''}" onclick="setMood('${m.k}')"><span style="font-size:22px;">${m.e}</span><span class="emoji-label">${m.k}</span></button>`).join('')}</div>
    <div style="margin-top:14px;"><label style="font-size:11.5px;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.04em;">Energy (1–10)</label><input type="range" id="energyRange" min="1" max="10" value="${en}" style="width:100%;margin-top:6px;" oninput="setEnergy(this.value)"><div class="hint" style="text-align:center;" id="energyVal">${en} / 10</div></div>`;
}
window.setMood=function(v){getDay(currentDate).mood=v;saveData();renderStep()};
window.setEnergy=function(v){document.getElementById('energyVal').textContent=v+' / 10';getDay(currentDate).energy=parseInt(v);saveData()};

function renderNotesStep(){
  const day=getDay(currentDate);
  document.getElementById('stepContent').innerHTML=`
    <div style="font-size:14px;font-weight:600;margin-bottom:10px;">📝 Notes / symptoms</div>
    <textarea id="notesInput" style="width:100%;min-height:100px;border:1px solid rgba(255,255,255,.4);border-radius:12px;padding:10px;font-family:Inter;font-size:13px;background:rgba(255,255,255,.3);backdrop-filter:blur(8px);resize:vertical;" placeholder="Anything worth remembering about today…" onchange="getDay(currentDate).notes=this.value;saveData()">${day.notes||''}</textarea>`;
}

/* ---- compact header score ---- */
function computeScore(day){
  const pt=(day.protein.morning||0)+(day.protein.lunch||0)+(day.protein.dinner||0),ptgt=settings.proteinMeal*3;
  const pp=pct(pt,ptgt),sp=pct(day.steps,settings.steps),wp=pct(day.waterMl,settings.waterMl);
  const slp=day.sleepHrs>0?Math.min(1,1-Math.abs(day.sleepHrs-settings.sleepHrs)/settings.sleepHrs):0;
  const ep=pct(day.exerciseMin,settings.exerciseMin);
  let hrp=null;if(day.hr)hrp=(day.hr>=settings.hrMin&&day.hr<=settings.hrMax)?1:.4;
  const w={protein:.28,steps:.2,water:.15,sleep:.22,exercise:.1,hr:.05};let t=0,ws=0;
  t+=pp*w.protein;ws+=w.protein;t+=sp*w.steps;ws+=w.steps;t+=wp*w.water;ws+=w.water;t+=Math.max(0,slp)*w.sleep;ws+=w.sleep;t+=ep*w.exercise;ws+=w.exercise;if(hrp!==null){t+=hrp*w.hr;ws+=w.hr}
  if(pt<=0&&day.steps<=0&&day.waterMl<=0&&day.sleepHrs<=0&&day.exerciseMin<=0&&!day.hr)return null;
  return Math.round((t/ws)*100);
}
function computeStreak(){let s=0;let d=new Date(todayStr()+'T00:00:00');while(true){const ds=fmtDate(d),day=data[ds];if(day&&computeScore(Object.assign(emptyDay(),day))!==null){s++;d.setDate(d.getDate()-1)}else break}return s}
function updateCompactScore(){
  const day=getDay(currentDate),score=computeScore(day);
  const emoji=score===null?'—':score>=85?'✨':score>=65?'👍':'⚠️';
  document.getElementById('ringNum').textContent=score===null?'—':emoji+' '+score;
  const el=document.getElementById('scoreMini');
  if(score!==null){el.style.background=score>=85?'rgba(182,90,123,.3)':score>=65?'rgba(212,154,88,.3)':'rgba(198,87,110,.3)'}
}

/* ---- Honor: compare today vs all previous days ---- */
let honorData=[];
function checkHonor(){
  const today=getDay(currentDate);
  const todayDate=currentDate;
  const prevDays=Object.keys(data).filter(d=>d<todayDate).map(d=>Object.assign(emptyDay(),data[d]));
  honorData=[];
  if(prevDays.length===0){showHonorIcon(false);return;}
  const todayTotal=today.protein.morning+today.protein.lunch+today.protein.dinner;
  const prevMax=prevDays.length?Math.max(...prevDays.map(d=>d.protein.morning+d.protein.lunch+d.protein.dinner)):0;
  if(todayTotal>0&&todayTotal>prevMax)honorData.push({icon:'🥇',text:'Best protein day',detail:todayTotal+'g (prev: '+prevMax+'g)',color:'rgba(247,184,207,.15)'});
  if(today.steps>0){const prevSteps=Math.max(...prevDays.map(d=>d.steps));if(today.steps>prevSteps)honorData.push({icon:'🥇',text:'Best step day',detail:today.steps.toLocaleString()+' (prev: '+prevSteps.toLocaleString()+')',color:'rgba(165,139,197,.15)'});}
  if(today.waterMl>0){const prevWater=Math.max(...prevDays.map(d=>d.waterMl));if(today.waterMl>prevWater)honorData.push({icon:'🥇',text:'Most hydrated day',detail:(today.waterMl/1000).toFixed(1)+'L (prev: '+(prevWater/1000).toFixed(1)+'L)',color:'rgba(139,138,199,.15)'});}
  if(today.sleepHrs>0){const prevSleep=Math.max(...prevDays.map(d=>d.sleepHrs));if(today.sleepHrs>prevSleep)honorData.push({icon:'🥇',text:'Best sleep day',detail:today.sleepHrs+'h (prev: '+prevSleep+'h)',color:'rgba(212,155,189,.15)'});}
  if(today.exerciseMin>0){const prevEx=Math.max(...prevDays.map(d=>d.exerciseMin));if(today.exerciseMin>prevEx)honorData.push({icon:'🥇',text:'Most active day',detail:today.exerciseMin+'min (prev: '+prevEx+'min)',color:'rgba(212,154,88,.15)'});}
  const todayScore=computeScore(today);
  if(todayScore!==null){const prevScores=prevDays.map(d=>computeScore(d)).filter(s=>s!==null);const prevBest=prevScores.length?Math.max(...prevScores):0;if(todayScore>prevBest)honorData.push({icon:'🏆',text:'Personal best score',detail:todayScore+'/100 (prev: '+prevBest+')',color:'rgba(200,95,135,.12)'});}
  showHonorIcon(honorData.length>0);
}
function showHonorIcon(show){const el=document.getElementById('honorIcon');if(el)el.style.display=show?'flex':'none';}
function openHonorModal(){
  const modal=document.getElementById('honorModal');const list=document.getElementById('honorList');const empty=document.getElementById('honorEmpty');
  if(!modal)return;
  modal.style.display='flex';
  if(honorData.length>0){
    list.style.display='flex';empty.style.display='none';
    list.innerHTML=honorData.map(h=>`<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:14px;background:${h.color};backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.35);transition:all .2s cubic-bezier(.34,1.56,.64,1);" onmouseenter="this.style.transform='translateY(-2px)'" onmouseleave="this.style.transform='none'"><span style="font-size:22px;">${h.icon}</span><div><div style="font-size:14px;font-weight:600;">${h.text}</div><div style="font-size:12px;color:var(--ink-soft);margin-top:2px;">${h.detail}</div></div></div>`).join('');
  }else{list.style.display='none';empty.style.display='';}
}
function closeHonorModal(){document.getElementById('honorModal').style.display='none';}

/* ---- trends ---- */
document.querySelectorAll('.range-tabs button').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.range-tabs button').forEach(x=>x.classList.remove('active'));b.classList.add('active');currentRange=parseInt(b.dataset.range);renderTrends()}));
function makeChart(ctx,ex,cfg){if(ex){try{ex.destroy()}catch(e){}}if(!ctx)return null;try{return new Chart(ctx,cfg)}catch(e){const w=ctx.parentElement;if(w&&!w.querySelector('.chart-unavailable'))w.innerHTML='<div class="chart-unavailable">Chart unavailable.</div>';return null}}

function renderTrends(){
  const days=lastNDays(currentRange),labels=days.map(d=>new Date(d+'T00:00:00').toLocaleDateString('en-IN',{day:'2-digit',month:'short'})),rows=days.map(d=>data[d]?Object.assign(emptyDay(),data[d]):null);
  const scores=rows.map(r=>r?computeScore(r):null),pt=rows.map(r=>r?(r.protein.morning+r.protein.lunch+r.protein.dinner):null),st=rows.map(r=>r?r.steps:null),sl=rows.map(r=>r?r.sleepHrs:null),wa=rows.map(r=>r?+(r.waterMl/1000).toFixed(2):null);
  
  const bo={responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{font:{family:'IBM Plex Mono',size:8},color:'rgba(63,39,52,.4)'}},y:{grid:{color:'rgba(255,255,255,.08)'},ticks:{font:{family:'IBM Plex Mono',size:8},color:'rgba(63,39,52,.4)'}}}};
  
  // hero stats
  const vs=scores.filter(s=>s!==null),avgS=vs.length?Math.round(vs.reduce((a,b)=>a+b,0)/vs.length):0,best=vs.length?Math.max(...vs):0,ld=rows.filter(r=>r!==null).length;
  document.getElementById('statAvgNum').textContent=avgS||'—';
  document.getElementById('statBestNum').textContent=best||'—';
  document.getElementById('statDaysNum').textContent=ld+'/'+currentRange;
  document.getElementById('trendScoreBadge').textContent=avgS?avgS+'/100':'—';
  
  // metric averages
  const proteinAvg=pt.filter(v=>v).length?Math.round(avg(pt.filter(v=>v))):0;
  const stepsAvg=st.filter(v=>v).length?Math.round(avg(st.filter(v=>v))):0;
  const sleepAvg=sl.filter(v=>v).length?avg(sl.filter(v=>v)).toFixed(1):0;
  const waterAvg=wa.filter(v=>v).length?avg(wa.filter(v=>v)).toFixed(1):0;
  document.getElementById('metricProtein').textContent=proteinAvg+'g';
  document.getElementById('metricSteps').textContent=stepsAvg.toLocaleString();
  document.getElementById('metricSleep').textContent=sleepAvg+'h';
  document.getElementById('metricWater').textContent=waterAvg+'L';
  
  // charts
  try{scoreChart=makeChart(document.getElementById('chartScore'),scoreChart,{type:'line',data:{labels,datasets:[{data:scores,borderColor:'#C85F87',backgroundColor:'rgba(200,95,135,.2)',fill:true,tension:.4,spanGaps:true,pointRadius:3,pointBackgroundColor:'#C85F87',pointBorderColor:'#fff',pointBorderWidth:1}]},options:Object.assign({},bo,{scales:Object.assign({},bo.scales,{y:Object.assign({},bo.scales.y,{min:0,max:100})})})})}catch(e){}
  try{const ptgt=settings.proteinMeal*3;proteinChart=makeChart(document.getElementById('chartProtein'),proteinChart,{type:'bar',data:{labels,datasets:[{data:pt,backgroundColor:'rgba(247,184,207,.6)',borderRadius:6,barThickness:14},{type:'line',data:days.map(()=>ptgt),borderColor:'rgba(217,122,154,.5)',borderDash:[4,4],pointRadius:0,borderWidth:1}]},options:JSON.parse(JSON.stringify(bo))})}catch(e){}
  try{stepsChart=makeChart(document.getElementById('chartSteps'),stepsChart,{type:'bar',data:{labels,datasets:[{data:st,backgroundColor:'rgba(165,139,197,.6)',borderRadius:6,barThickness:14}]},options:JSON.parse(JSON.stringify(bo))})}catch(e){}
  try{sleepChart=makeChart(document.getElementById('chartSleep'),sleepChart,{type:'bar',data:{labels,datasets:[{data:sl,backgroundColor:'rgba(212,155,189,.6)',borderRadius:6,barThickness:14}]},options:JSON.parse(JSON.stringify(bo))})}catch(e){}
  try{waterChart=makeChart(document.getElementById('chartWater'),waterChart,{type:'bar',data:{labels,datasets:[{data:wa,backgroundColor:'rgba(139,138,199,.6)',borderRadius:6,barThickness:14}]},options:JSON.parse(JSON.stringify(bo))})}catch(e){}
  
  // achievements
  renderAchievements(vs,ld,proteinAvg,stepsAvg,sleepAvg);
}

function renderAchievements(scores,loggedDays,proteinAvg,stepsAvg,sleepAvg){
  const el=document.getElementById('achievements');if(!el)return;el.innerHTML='';
  const badges=[];
  const streak=computeStreak();
  if(streak>=3)badges.push({icon:'🔥',label:streak+' day streak!',color:'rgba(200,95,135,.15)'});
  if(streak>=7)badges.push({icon:'💎',label:'Week warrior',color:'rgba(168,120,184,.15)'});
  if(streak>=14)badges.push({icon:'👑',label:'2 week legend',color:'rgba(212,154,88,.15)'});
  const best=scores.length?Math.max(...scores):0;
  if(best>=90)badges.push({icon:'⭐',label:'Scored 90+',color:'rgba(247,184,207,.15)'});
  if(best===100)badges.push({icon:'💯',label:'Perfect day!',color:'rgba(182,90,123,.15)'});
  if(proteinAvg>=settings.proteinMeal*3)badges.push({icon:'🥩',label:'Protein master',color:'rgba(247,184,207,.15)'});
  if(stepsAvg>=settings.steps)badges.push({icon:'🏃',label:'Step crusher',color:'rgba(165,139,197,.15)'});
  if(sleepAvg>=settings.sleepHrs)badges.push({icon:'😴',label:'Sleep champion',color:'rgba(212,155,189,.15)'});
  if(loggedDays>=30)badges.push({icon:'📝',label:'30 days logged',color:'rgba(139,138,199,.15)'});
  if(loggedDays>=7)badges.push({icon:'📊',label:'7 day logger',color:'rgba(200,95,135,.1)'});
  if(!badges.length)badges.push({icon:'🌱',label:'Keep going!',color:'rgba(200,95,135,.08)'});
  el.innerHTML=badges.map(b=>`<div style="display:flex;align-items:center;gap:6px;padding:6px 12px;border-radius:16px;background:${b.color};backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1px solid rgba(255,255,255,.3);font-size:12px;font-weight:500;"><span>${b.icon}</span><span>${b.label}</span></div>`).join('');
}

/* ---- insights ---- */
function renderInsights(){
  const days=lastNDays(7),rows=days.map(d=>data[d]?Object.assign(emptyDay(),data[d]):null).filter(r=>r!==null),list=document.getElementById('insightList');list.innerHTML='';
  if(rows.length<2){list.innerHTML='<div class="insight-item"><div class="insight-dot" style="background:var(--ink-faint);"></div><div class="insight-text"><b>Not enough data</b><span>Log 2+ days for insights.</span></div></div>';return}
  const ins=[],ptgt=settings.proteinMeal*3,pa=avg(rows.map(r=>r.protein.morning+r.protein.lunch+r.protein.dinner));
  const paPct=Math.min(100,Math.round(pa/ptgt*100));
  ins.push({l:paPct>=100?'good':paPct>=70?'warn':'bad',t:'🍽 Protein',b:paPct>=100?'Goal hit daily!':paPct+'% average — try adding one more source'});
  const sa=avg(rows.map(r=>r.steps)),saPct=Math.min(100,Math.round(sa/settings.steps*100));
  ins.push({l:saPct>=100?'good':saPct>=70?'warn':'bad',t:'👣 Movement',b:saPct>=100?'Step goal crushed!':saPct+'% average — a 10-min walk helps'});
  const sla=avg(rows.map(r=>r.sleepHrs).filter(v=>v>0));if(sla){
  const slPct=Math.min(100,Math.round(sla/settings.sleepHrs*100));
  ins.push({l:slPct>=90?'good':'warn',t:'🌙 Rest',b:slPct>=90?'Sleep is on point!':'Running a bit low — wind down earlier'});}
  const wa2=avg(rows.map(r=>r.waterMl)),wPct=Math.min(100,Math.round(wa2/settings.waterMl*100));
  ins.push({l:wPct>=100?'good':wPct>=70?'warn':'bad',t:'💧 Hydration',b:wPct>=100?'Fully hydrated!':'A couple extra glasses would help'});
  const ed=rows.filter(r=>r.exerciseMin>0).length,edPct=Math.round(ed/rows.length*100);
  ins.push({l:edPct>=70?'good':edPct>=40?'warn':'bad',t:'🏃 Active days',b:edPct>=70?'Moving most days!':'Try to move a little more often'});
  const cm={good:'var(--good)',warn:'var(--warn)',bad:'var(--bad)'};
  ins.forEach(i=>{const d=document.createElement('div');d.className='insight-item';d.innerHTML='<div class="insight-dot" style="background:'+cm[i.l]+'"></div><div class="insight-text"><b>'+i.t+'</b><span>'+i.b+'</span></div>';list.appendChild(d)});
}

/* ---- coach (original care coach) ---- */
const coachHistory=[];
function addCoachMsg(role,text){const m=document.createElement('div');m.className='coach-message '+role;m.textContent=text;const chat=document.getElementById('coachChat');chat.appendChild(m);chat.scrollTop=chat.scrollHeight;return m}
document.getElementById('coachForm').addEventListener('submit',async(e)=>{
  e.preventDefault();const input=document.getElementById('coachInput'),q=input.value.trim(),key=document.getElementById('apiKeyInput').value.trim();
  if(!q)return;if(!key){addCoachMsg('coach','Add your Anthropic API key above first.');return}
  localStorage.setItem('pulse_api_key',key);addCoachMsg('user',q);input.value='';
  const pending=addCoachMsg('coach','Thinking…');coachHistory.push({role:'user',content:q});
  try{const resp=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:450,system:`You are a warm PCOD-aware wellness coach. Current targets: protein ${settings.proteinMeal}g/meal, ${settings.steps} steps, water ${settings.waterMl}ml, sleep ${settings.sleepHrs}h. Recent logs: ${JSON.stringify(lastNDays(7).map(d=>data[d]?{date:d,...data[d]}:null).filter(Boolean)).slice(0,4000)}`,messages:coachHistory.slice(-8)})});
  if(!resp.ok)throw new Error(resp.status);const json=await resp.json();const ans=(json.content||[]).map(b=>b.text||'').join('\n').trim()||'No response.';pending.textContent=ans;coachHistory.push({role:'assistant',content:ans})}
  catch(err){pending.textContent='Error: '+err.message;coachHistory.pop()}
});
const savedKey=localStorage.getItem('pulse_api_key');if(savedKey)document.getElementById('apiKeyInput').value=savedKey;
document.getElementById('clearKey').addEventListener('click',()=>{localStorage.removeItem('pulse_api_key');document.getElementById('apiKeyInput').value='';toast('Key cleared')});
document.getElementById('runAI').addEventListener('click',async()=>{
  const key=document.getElementById('apiKeyInput').value.trim(),out=document.getElementById('aiOutput');
  if(!key){out.textContent='Add your key first.';return}localStorage.setItem('pulse_api_key',key);
  const days=lastNDays(14),rows=days.map(d=>data[d]?{date:d,...data[d]}:null).filter(r=>r!==null);
  if(rows.length<2){out.textContent='Log a few days first.';return}out.textContent='Analyzing…';
  try{const resp=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},body:JSON.stringify({model:'claude-sonnet-4-6',max_tokens:700,messages:[{role:'user',content:'Analyze my '+rows.length+' days of wellness data. Give 3-5 sentences + 3 suggestions.\n'+JSON.stringify(rows).slice(0,6000)}]})});
  if(!resp.ok)throw new Error(resp.status);const json=await resp.json();out.textContent=(json.content||[]).map(b=>b.text||'').join('\n')||'No response.'}
  catch(e){out.textContent='Error: '+e.message}
});

/* ---- settings ---- */
function fillSettingsForm(){document.getElementById('setProteinMeal').value=settings.proteinMeal;document.getElementById('setProteinDay').value=settings.proteinMeal*3;document.getElementById('setSteps').value=settings.steps;document.getElementById('setWater').value=settings.waterMl;document.getElementById('setExercise').value=settings.exerciseMin;document.getElementById('setSleep').value=settings.sleepHrs;document.getElementById('setWeightGoal').value=settings.weightGoal??'';document.getElementById('setHrMin').value=settings.hrMin;document.getElementById('setHrMax').value=settings.hrMax;document.getElementById('setHeight').value=settings.height??'';document.getElementById('setName').value=settings.name||''}
document.getElementById('setProteinMeal').addEventListener('input',e=>{document.getElementById('setProteinDay').value=(parseFloat(e.target.value)||0)*3});
document.getElementById('saveSettings').addEventListener('click',()=>{settings.proteinMeal=parseFloat(document.getElementById('setProteinMeal').value)||50;settings.steps=parseInt(document.getElementById('setSteps').value)||8000;settings.waterMl=parseInt(document.getElementById('setWater').value)||2500;settings.exerciseMin=parseInt(document.getElementById('setExercise').value)||30;settings.sleepHrs=parseFloat(document.getElementById('setSleep').value)||7.5;settings.weightGoal=document.getElementById('setWeightGoal').value?parseFloat(document.getElementById('setWeightGoal').value):null;settings.hrMin=parseInt(document.getElementById('setHrMin').value)||60;settings.hrMax=parseInt(document.getElementById('setHrMax').value)||100;settings.height=document.getElementById('setHeight').value?parseFloat(document.getElementById('setHeight').value):null;settings.name=document.getElementById('setName').value||'';saveSettingsToStore();renderStep();toast('Settings saved!')});

/* ---- export/import ---- */
function downloadBlob(b,f){const u=URL.createObjectURL(b),a=document.createElement('a');a.href=u;a.download=f;a.click();URL.revokeObjectURL(u)}
document.getElementById('exportData').addEventListener('click',()=>downloadBlob(new Blob([JSON.stringify({settings,data},null,2)],{type:'application/json'}),'pulse-backup-'+todayStr()+'.json'));
document.getElementById('exportCsv').addEventListener('click',()=>{const dates=Object.keys(data).sort(),h=['Date','Breakfast','Lunch','Dinner','Protein','Steps','Water','Sleep','Quality','Stress','HR','Weight','ExMin','ExType','Mood','Energy','Notes'];const rows=dates.map(d=>{const r=Object.assign(emptyDay(),data[d]);return [d,r.protein.morning,r.protein.lunch,r.protein.dinner,r.protein.morning+r.protein.lunch+r.protein.dinner,r.steps,r.waterMl,r.sleepHrs,r.sleepQuality,r.stress,r.hr??'',r.weight??'',r.exerciseMin,r.exerciseType,r.mood??'',r.energy,'"'+(r.notes||'').replace(/"/g,'""')+'"'].join(',')});downloadBlob(new Blob([[h.join(','),...rows].join('\n')],{type:'text/csv'}),'pulse-log-'+todayStr()+'.csv')});
document.getElementById('importFile').addEventListener('change',e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=ev=>{try{const p=JSON.parse(ev.target.result);if(p.data)data=p.data;if(p.settings)settings=Object.assign({...DEFAULT_SETTINGS},p.settings);saveData();saveSettingsToStore();renderStep();fillSettingsForm();toast('Imported!')}catch(e){toast('Failed')}};r.readAsText(f)});
document.getElementById('wipeData').addEventListener('click',()=>{if(confirm('Erase all data?')){localStorage.removeItem(STORE_KEY);data={};renderStep();toast('Erased!')}});

/* ---- init ---- */
const _hash=window.location.hash;
if(_hash.includes('type=recovery')||_hash.includes('access_token')){window.location.replace('reset-password.html'+_hash+window.location.search)}
else{initStepDots();renderStep();checkSession()}
