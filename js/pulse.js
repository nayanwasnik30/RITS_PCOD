/* ============================================================
   PULSE — Daily Wellness Tracker v1.0.0008
   All data stored in localStorage under key "pulse_v1"
   ============================================================ */
console.log('Pulse v1.0.0008 loaded');
window.__PULSE_VERSION = '1.0.0008';

const STORE_KEY = 'pulse_data_v1';
const SETTINGS_KEY = 'pulse_settings_v1';
const SESSION_KEY = 'pulse_signed_in_v1';

const DEFAULT_SETTINGS = {
  proteinMeal: 50,       // g per meal (breakfast/lunch/dinner) — adjustable
  steps: 8000,
  waterMl: 2500,
  exerciseMin: 30,
  sleepHrs: 7.5,
  hrMin: 60,
  hrMax: 100,
  weightGoal: null,
  height: null,
  name: ''
};

let settings = loadSettings();
let data = loadData(); // { "YYYY-MM-DD": {...day} }
let currentDate = todayStr();
let currentRange = 7;
let scoreChart, proteinChart, stepsChart, sleepChart, waterChart;

function todayStr(){
  const d = new Date();
  return fmtDate(d);
}
function fmtDate(d){
  const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${day}`;
}
function loadSettings(){
  try{
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? Object.assign({}, DEFAULT_SETTINGS, JSON.parse(raw)) : {...DEFAULT_SETTINGS};
  }catch(e){ return {...DEFAULT_SETTINGS}; }
}
function saveSettingsToStore(){
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
function loadData(){
  try{
    const raw = localStorage.getItem(STORE_KEY);
    const saved = raw ? JSON.parse(raw) : {};
    if(Object.keys(saved).length) return saved;

    // Bring entries from the earlier dashboard into the full tracker once.
    const legacyRaw = localStorage.getItem('rit_pcod_data');
    if(!legacyRaw) return saved;
    const legacy = JSON.parse(legacyRaw);
    const migrated = {};
    Object.values(legacy).flat().forEach(entry=>{
      if(!entry || !entry.date) return;
      migrated[entry.date] = Object.assign(emptyDay(), {
        steps: Number(entry.steps)||0,
        waterMl: Math.round((Number(entry.water)||0)*1000),
        sleepHrs: Number(entry.sleep)||0,
        hr: entry.hr ? Number(entry.hr) : null,
        weight: entry.wMorn ? Number(entry.wMorn) : null,
        exerciseMin: entry.exYN === 'Yes' ? 30 : 0,
        mood: entry.mood || null,
        energy: Number(entry.energy)||6,
        notes: entry.notes || ''
      });
    });
    if(Object.keys(migrated).length){
      localStorage.setItem(STORE_KEY, JSON.stringify(migrated));
      return migrated;
    }
    return saved;
  }catch(e){ return {}; }
}
function saveData(){
  localStorage.setItem(STORE_KEY, JSON.stringify(data));
}
function emptyDay(){
  return {
    protein: {morning:0, lunch:0, dinner:0},
    steps:0, waterMl:0, sleepHrs:0, sleepQuality:'Good', stress:'Low',
    hr:null, weight:null, exerciseMin:0, exerciseType:'',
    mood:null, energy:6, notes:''
  };
}
function getDay(dateStr){
  if(!data[dateStr]) data[dateStr] = emptyDay();
  // backfill any missing keys (for older saved days)
  data[dateStr] = Object.assign(emptyDay(), data[dateStr]);
  return data[dateStr];
}
function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'), 1600);
}

/* ---------- Supabase Auth ---------- */
const SUPABASE_URL = 'https://ujkupyimtbqzkusiefyb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqa3VweWltdGJxemt1c2llZnliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxMTEzNDMsImV4cCI6MjEwMzY4NzM0M30.rfJEm7yu0dxuVRkYjNwikeeN7MrhKHAJW_S_Kw9TWnU';
let sbClient = null;
try {
  const createClient = window.supabase.createClient;
  if(createClient) {
    sbClient = createClient(SUPABASE_URL, SUPABASE_KEY);
  } else {
    console.error('Supabase createClient not found');
  }
} catch(e) { console.error('Supabase init error:', e); }
let currentUser = null;

function showError(msg){
  const el = document.getElementById('authError');
  el.textContent = msg; el.style.display = 'block';
  document.getElementById('authSuccess').style.display = 'none';
}
function showSuccess(msg){
  const el = document.getElementById('authSuccess');
  el.textContent = msg; el.style.display = 'block';
  document.getElementById('authError').style.display = 'none';
}
function hideMessages(){
  document.getElementById('authError').style.display = 'none';
  document.getElementById('authSuccess').style.display = 'none';
}
function hideError(){
  document.getElementById('authError').style.display = 'none';
}

function showLogin(){
  document.getElementById('loginScreen').hidden = false;
  document.getElementById('loginEmail').focus();
}
function hideLogin(){ document.getElementById('loginScreen').hidden = true; }

// Sign in with email/password
document.getElementById('loginForm').addEventListener('submit', async (event)=>{
  event.preventDefault();
  hideError();
  if(!sbClient){ showError('Auth system not loaded. Please refresh the page.'); return; }
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  if(!email || !password) return;

  const loginBtn = document.getElementById('loginButton');
  loginBtn.disabled = true;
  loginBtn.textContent = 'Signing in…';
  try {
    const { data: result, error } = await sbClient.auth.signInWithPassword({ email, password });
    if(error){
      showError(error.message);
      return;
    }
    if(!result || !result.user){
      showError('Sign-in succeeded but no user data was returned. Please try again.');
      return;
    }
    currentUser = result.user;
    settings.name = email.split('@')[0];
    saveSettingsToStore();
    hideLogin();
    toast(`Welcome, ${settings.name}`);
  } catch(e) {
    console.error('Sign-in error:', e);
    showError('Could not reach the server. Check your internet connection and try again.');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Sign in';
  }
});

// Sign up with email/password
document.getElementById('signUpBtn').addEventListener('click', async ()=>{
  hideError();
  if(!sbClient){ showError('Auth system not loaded. Please refresh the page.'); return; }
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  if(!email || !password){ showError('Please enter email and password.'); return; }
  if(password.length < 6){ showError('Password must be at least 6 characters.'); return; }

  const signUpBtn = document.getElementById('signUpBtn');
  signUpBtn.disabled = true;
  signUpBtn.textContent = 'Creating account…';
  try {
    const { data: result, error } = await sbClient.auth.signUp({ email, password });
    if(error){
      showError(error.message);
      return;
    }
    if(result.user && result.user.identities && result.user.identities.length === 0){
      showError('An account with this email already exists.');
      return;
    }
    if(!result.user){
      showError('Account may have been created. Check your email for a confirmation link, then sign in.');
      return;
    }
    currentUser = result.user;
    settings.name = email.split('@')[0];
    saveSettingsToStore();
    hideLogin();
    toast(`Account created! Welcome, ${settings.name}`);
  } catch(e) {
    console.error('Sign-up error:', e);
    showError('Could not reach the server. Check your internet connection and try again.');
  } finally {
    signUpBtn.disabled = false;
    signUpBtn.textContent = 'Create account';
  }
});

// Forgot password
document.getElementById('forgotPwBtn').addEventListener('click', async (e)=>{
  e.preventDefault();
  e.stopPropagation();
  hideMessages();
  if(!sbClient){ showError('Auth not loaded — refresh the page.'); return; }
  const email = document.getElementById('loginEmail').value.trim();
  if(!email){ showError('Enter your email above first, then click Forgot password.'); return; }
  try {
    const { error } = await sbClient.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/RITS_PCOD/reset-password.html'
    });
    if(error){ showError(error.message); return; }
    showSuccess('Password reset email sent! Check your inbox.');
  } catch(err) { showError('Reset failed: ' + err.message); }
});

// Sign out
document.getElementById('signOut').addEventListener('click', async ()=>{
  try {
    if(sbClient) await sbClient.auth.signOut();
  } catch(e) { console.error('Sign-out error:', e); }
  currentUser = null;
  location.reload();
});

// Check session on load
async function checkSession(){
  if(!sbClient){ showLogin(); return false; }
  try {
    const { data: { session } } = await sbClient.auth.getSession();
    if(session && session.user){
      currentUser = session.user;
      settings.name = (currentUser.email || '').split('@')[0];
      saveSettingsToStore();
      hideLogin();
      return true;
    }
  } catch(e) {
    console.error('Session check failed:', e);
  }
  showLogin();
  return false;
}

/* ---------- Navigation ---------- */
document.querySelectorAll('.nav-btn').forEach(btn=>{
  btn.addEventListener('click', ()=>{
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('page-'+btn.dataset.page).classList.add('active');
    if(btn.dataset.page === 'trends') renderTrends();
    if(btn.dataset.page === 'insights') renderInsights();
    if(btn.dataset.page === 'settings') fillSettingsForm();
  });
});

document.getElementById('prevDay').addEventListener('click', ()=>{
  const d = new Date(currentDate); d.setDate(d.getDate()-1);
  currentDate = fmtDate(d); renderToday();
});
document.getElementById('nextDay').addEventListener('click', ()=>{
  const d = new Date(currentDate); d.setDate(d.getDate()+1);
  currentDate = fmtDate(d); renderToday();
});
document.getElementById('jumpToday').addEventListener('click', ()=>{
  currentDate = todayStr(); renderToday();
});

/* ---------- Build dynamic chip rows ---------- */
function buildChips(container, values, unit, onClick){
  container.innerHTML = '';
  values.forEach(v=>{
    const b = document.createElement('button');
    b.className = 'chip';
    b.textContent = unit ? `${v}${unit}` : v;
    b.addEventListener('click', ()=>onClick(v));
    container.appendChild(b);
  });
}

function buildMealRows(){
  const wrap = document.getElementById('mealRows');
  wrap.innerHTML = '';
  const meals = [
    {key:'morning', label:'Breakfast', chips:[6,10,18,20,25,30]},
    {key:'lunch', label:'Lunch', chips:[10,18,20,25,30,40]},
    {key:'dinner', label:'Dinner', chips:[10,18,20,25,30,40]}
  ];
  meals.forEach(m=>{
    const row = document.createElement('div');
    row.className = 'meal-row';
    row.innerHTML = `
      <div class="meal-top">
        <span>${m.label}</span>
        <span class="mono" id="meal-${m.key}-val">0g / ${settings.proteinMeal}g</span>
      </div>
      <div class="bar-track"><div class="bar-fill" id="meal-${m.key}-bar" style="width:0%; background:var(--teal);"></div></div>
      <div class="chip-row" id="meal-${m.key}-chips"></div>
      <div class="manual-row">
        <button class="small-btn" data-meal="${m.key}" data-delta="-5">−</button>
        <input type="number" id="meal-${m.key}-input" min="0" step="1">
        <button class="small-btn" data-meal="${m.key}" data-delta="5">+</button>
        <span class="unit">g protein</span>
      </div>
    `;
    wrap.appendChild(row);
    buildChips(row.querySelector(`#meal-${m.key}-chips`), m.chips, 'g', (v)=>{
      const day = getDay(currentDate);
      day.protein[m.key] += v;
      saveData(); renderToday();
    });
  });

  // delegate +/- and manual input
  wrap.addEventListener('click', (e)=>{
    const btn = e.target.closest('button[data-meal]');
    if(!btn) return;
    const key = btn.dataset.meal, delta = parseFloat(btn.dataset.delta);
    const day = getDay(currentDate);
    day.protein[key] = Math.max(0, (day.protein[key]||0) + delta);
    saveData(); renderToday();
  });
  wrap.addEventListener('change', (e)=>{
    if(e.target.matches('input[id^="meal-"]')){
      const key = e.target.id.split('-')[1];
      const day = getDay(currentDate);
      day.protein[key] = Math.max(0, parseFloat(e.target.value)||0);
      saveData(); renderToday();
    }
  });
}

/* steps / sleep / exercise chips (static, rebuilt on render for target awareness) */
function buildStaticChips(){
  buildChips(document.getElementById('stepsChips'), [2000,5000,8000,10000,12000], '', (v)=>{
    const day = getDay(currentDate); day.steps = v; saveData(); renderToday();
  });
  buildChips(document.getElementById('sleepChips'), [5,6,6.5,7,7.5,8,9], 'h', (v)=>{
    const day = getDay(currentDate); day.sleepHrs = v; saveData(); renderToday();
  });
  buildChips(document.getElementById('exChips'), [0,15,30,45,60,90], 'm', (v)=>{
    const day = getDay(currentDate); day.exerciseMin = v; saveData(); renderToday();
  });
}

function buildMoodRow(){
  const moods = [
    {k:'Happy', e:'😄'}, {k:'Calm', e:'😌'}, {k:'Tired', e:'😴'}, {k:'Stressed', e:'😣'}, {k:'Low', e:'😔'}
  ];
  const wrap = document.getElementById('moodRow');
  wrap.innerHTML = '';
  moods.forEach(m=>{
    const b = document.createElement('button');
    b.className = 'emoji-btn';
    b.dataset.mood = m.k;
    b.innerHTML = `${m.e}<span class="emoji-label">${m.k}</span>`;
    b.addEventListener('click', ()=>{
      const day = getDay(currentDate);
      day.mood = m.k; saveData(); renderToday();
    });
    wrap.appendChild(b);
  });
}

/* ---------- Steps / water / hr / weight / notes wiring ---------- */
document.querySelectorAll('button[data-adj="steps"]').forEach(b=>{
  b.addEventListener('click', ()=>{
    const day = getDay(currentDate);
    day.steps = Math.max(0, day.steps + parseInt(b.dataset.delta));
    saveData(); renderToday();
  });
});
document.getElementById('stepsInput').addEventListener('change', (e)=>{
  const day = getDay(currentDate);
  day.steps = Math.max(0, parseInt(e.target.value)||0);
  saveData(); renderToday();
});
document.querySelectorAll('button[data-water]').forEach(b=>{
  b.addEventListener('click', ()=>{
    const day = getDay(currentDate);
    day.waterMl = Math.max(0, day.waterMl + parseInt(b.dataset.water));
    saveData(); renderToday();
  });
});
document.getElementById('waterReset').addEventListener('click', ()=>{
  const day = getDay(currentDate); day.waterMl = 0; saveData(); renderToday();
});
document.getElementById('hrInput').addEventListener('change', (e)=>{
  const day = getDay(currentDate);
  day.hr = e.target.value === '' ? null : parseFloat(e.target.value);
  saveData(); renderToday();
});
document.getElementById('weightInput').addEventListener('change', (e)=>{
  const day = getDay(currentDate);
  day.weight = e.target.value === '' ? null : parseFloat(e.target.value);
  saveData(); renderToday();
});
document.getElementById('sleepQuality').addEventListener('change', (e)=>{
  getDay(currentDate).sleepQuality = e.target.value; saveData();
});
document.getElementById('stressLevel').addEventListener('change', (e)=>{
  getDay(currentDate).stress = e.target.value; saveData();
});
document.getElementById('exType').addEventListener('change', (e)=>{
  getDay(currentDate).exerciseType = e.target.value; saveData();
});
document.getElementById('energyRange').addEventListener('input', (e)=>{
  document.getElementById('energyVal').textContent = `${e.target.value} / 10`;
  getDay(currentDate).energy = parseInt(e.target.value); saveData();
});
document.getElementById('notesInput').addEventListener('change', (e)=>{
  getDay(currentDate).notes = e.target.value; saveData();
});

/* ---------- Score calculation ---------- */
function pct(val, target){ return target > 0 ? Math.min(1, val/target) : 0; }

function computeScore(day){
  const proteinTotal = (day.protein.morning||0)+(day.protein.lunch||0)+(day.protein.dinner||0);
  const proteinTarget = settings.proteinMeal * 3;
  const proteinPct = pct(proteinTotal, proteinTarget);
  const stepsPct = pct(day.steps, settings.steps);
  const waterPct = pct(day.waterMl, settings.waterMl);
  const sleepPct = day.sleepHrs>0 ? Math.min(1, 1-Math.abs(day.sleepHrs-settings.sleepHrs)/settings.sleepHrs) : 0;
  const exPct = pct(day.exerciseMin, settings.exerciseMin);
  let hrPct = null;
  if(day.hr){
    hrPct = (day.hr>=settings.hrMin && day.hr<=settings.hrMax) ? 1 : 0.4;
  }

  const weights = {protein:0.28, steps:0.2, water:0.15, sleep:0.22, exercise:0.1, hr:0.05};
  let total = 0, weightSum = 0;
  total += proteinPct*weights.protein; weightSum += weights.protein;
  total += stepsPct*weights.steps; weightSum += weights.steps;
  total += waterPct*weights.water; weightSum += weights.water;
  total += Math.max(0,sleepPct)*weights.sleep; weightSum += weights.sleep;
  total += exPct*weights.exercise; weightSum += weights.exercise;
  if(hrPct!==null){ total += hrPct*weights.hr; weightSum += weights.hr; }

  const anyLogged = proteinTotal>0 || day.steps>0 || day.waterMl>0 || day.sleepHrs>0 || day.exerciseMin>0 || day.hr;
  if(!anyLogged) return null;
  return Math.round((total/weightSum)*100);
}

function statusClass(pctVal){
  if(pctVal >= 0.9) return 'good';
  if(pctVal >= 0.6) return 'warn';
  return 'bad';
}

/* ---------- Render Today ---------- */
function renderToday(){
  const day = getDay(currentDate);
  const dLabel = new Date(currentDate+'T00:00:00');
  const isToday = currentDate === todayStr();
  document.getElementById('dateLabel').textContent = dLabel.toLocaleDateString('en-IN',{weekday:'short', day:'2-digit', month:'short'}) + (isToday?' · today':'');

  // protein
  const meals = ['morning','lunch','dinner'];
  let proteinTotal = 0;
  meals.forEach(k=>{
    const v = day.protein[k]||0;
    proteinTotal += v;
    const target = settings.proteinMeal;
    document.getElementById(`meal-${k}-val`).textContent = `${v}g / ${target}g`;
    document.getElementById(`meal-${k}-bar`).style.width = Math.min(100,(v/target)*100)+'%';
    document.getElementById(`meal-${k}-bar`).style.background = v/target>=1 ? 'var(--good)' : (v/target>=0.6?'var(--warn)':'var(--bad)');
    document.getElementById(`meal-${k}-input`).value = v||'';
  });
  const proteinTarget = settings.proteinMeal*3;
  const pReadout = document.getElementById('proteinReadout');
  pReadout.textContent = `${proteinTotal}/${proteinTarget}g`;
  pReadout.className = 'card-readout ' + (proteinTotal>=proteinTarget?'readout-good':(proteinTotal>=proteinTarget*0.6?'readout-warn':'readout-bad'));
  document.getElementById('proteinTargetHint').textContent = `Target: ${settings.proteinMeal}g per meal · ${proteinTarget}g/day. Adjust in Settings.`;

  // steps
  document.getElementById('stepsInput').value = day.steps||'';
  document.getElementById('stepsReadout').textContent = day.steps.toLocaleString();
  document.getElementById('stepsBar').style.width = Math.min(100,(day.steps/settings.steps)*100)+'%';

  // water
  const waterL = (day.waterMl/1000).toFixed(2);
  document.getElementById('waterReadout').textContent = waterL+'L';
  document.getElementById('waterBar').style.width = Math.min(100,(day.waterMl/settings.waterMl)*100)+'%';

  // sleep
  document.getElementById('sleepReadout').textContent = (day.sleepHrs||0).toFixed(1)+'h';
  document.getElementById('sleepBar').style.width = Math.min(100,((day.sleepHrs||0)/settings.sleepHrs)*100)+'%';
  document.getElementById('sleepQuality').value = day.sleepQuality||'Good';
  document.getElementById('stressLevel').value = day.stress||'Low';

  // hr / weight
  document.getElementById('hrInput').value = day.hr ?? '';
  document.getElementById('weightInput').value = day.weight ?? '';
  const hrReadout = document.getElementById('hrReadout');
  if(day.hr){
    const inRange = day.hr>=settings.hrMin && day.hr<=settings.hrMax;
    hrReadout.textContent = `${day.hr} bpm`;
    hrReadout.className = 'card-readout ' + (inRange?'readout-good':'readout-warn');
  }else{
    hrReadout.textContent = '— bpm';
    hrReadout.className = 'card-readout readout-neutral';
  }
  document.getElementById('hrRangeHint').textContent = `Reference range: ${settings.hrMin}–${settings.hrMax} bpm. Adjust in Settings.`;

  // exercise
  document.getElementById('exReadout').textContent = (day.exerciseMin||0)+' min';
  document.getElementById('exType').value = day.exerciseType||'';

  // mood
  document.querySelectorAll('#moodRow .emoji-btn').forEach(b=>{
    b.classList.toggle('sel', b.dataset.mood===day.mood);
  });
  document.getElementById('energyRange').value = day.energy||6;
  document.getElementById('energyVal').textContent = `${day.energy||6} / 10`;

  // notes
  document.getElementById('notesInput').value = day.notes||'';

  // score ring
  const score = computeScore(day);
  const ringFg = document.getElementById('ringFg');
  const circumference = 188.4;
  if(score===null){
    ringFg.style.strokeDashoffset = circumference;
    document.getElementById('ringNum').textContent = '—';
    document.getElementById('scoreSub').textContent = 'Log today to see your score';
  }else{
    ringFg.style.strokeDashoffset = circumference - (circumference*score/100);
    document.getElementById('ringNum').textContent = score;
    let msg = score>=85 ? 'Excellent day' : score>=65 ? 'Solid — a few gaps' : 'Needs attention';
    document.getElementById('scoreSub').textContent = msg;
  }

  // streak
  document.getElementById('streakNum').textContent = computeStreak();
}

function computeStreak(){
  let streak = 0;
  let d = new Date(todayStr()+'T00:00:00');
  while(true){
    const ds = fmtDate(d);
    const day = data[ds];
    if(day && computeScore(Object.assign(emptyDay(), day)) !== null){
      streak++;
      d.setDate(d.getDate()-1);
    } else break;
  }
  return streak;
}

/* ---------- Trends ---------- */
document.querySelectorAll('.range-tabs button').forEach(b=>{
  b.addEventListener('click', ()=>{
    document.querySelectorAll('.range-tabs button').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    currentRange = parseInt(b.dataset.range);
    renderTrends();
  });
});

function lastNDays(n){
  const arr = [];
  let d = new Date(todayStr()+'T00:00:00');
  for(let i=n-1;i>=0;i--){
    const dd = new Date(d); dd.setDate(d.getDate()-i);
    arr.push(fmtDate(dd));
  }
  return arr;
}

function makeChart(ctx, existing, config){
  if(existing){ try{ existing.destroy(); }catch(e){} }
  if(!ctx) return null;
  try{
    return new Chart(ctx, config);
  }catch(e){
    console.warn('Chart render failed:', e);
    const wrap = ctx.parentElement;
    if(wrap && !wrap.querySelector('.chart-unavailable')){
      wrap.innerHTML = '<div class="chart-unavailable">Chart unavailable — check your network connection and reload.</div>';
    }
    return null;
  }
}

function renderTrends(){
  const days = lastNDays(currentRange);
  const labels = days.map(d=>{
    const dt = new Date(d+'T00:00:00');
    return dt.toLocaleDateString('en-IN',{day:'2-digit', month:'short'});
  });
  const rows = days.map(d=> data[d] ? Object.assign(emptyDay(), data[d]) : null);

  const scores = rows.map(r=> r ? computeScore(r) : null);
  const proteinTotals = rows.map(r=> r ? (r.protein.morning+r.protein.lunch+r.protein.dinner) : null);
  const steps = rows.map(r=> r ? r.steps : null);
  const sleep = rows.map(r=> r ? r.sleepHrs : null);
  const water = rows.map(r=> r ? +(r.waterMl/1000).toFixed(2) : null);

  const baseOpts = {
    responsive:true, maintainAspectRatio:false,
    plugins:{legend:{display:false}},
    scales:{ x:{grid:{display:false}, ticks:{font:{family:'IBM Plex Mono', size:9}}}, y:{grid:{color:'#F5DDE7'}, ticks:{font:{family:'IBM Plex Mono', size:9}}} }
  };

  try{
    scoreChart = makeChart(document.getElementById('chartScore'), scoreChart, {
      type:'line', data:{labels, datasets:[{data:scores, borderColor:'#C85F87', backgroundColor:'rgba(200,95,135,.14)', fill:true, tension:.35, spanGaps:true, pointRadius:2}]},
      options: Object.assign({}, baseOpts, {scales:Object.assign({}, baseOpts.scales, {y:Object.assign({}, baseOpts.scales.y,{min:0,max:100})})})
    });
  }catch(e){ console.warn('Score chart failed', e); }

  try{
    const proteinTarget = settings.proteinMeal*3;
    proteinChart = makeChart(document.getElementById('chartProtein'), proteinChart, {
      type:'bar', data:{labels, datasets:[
        {data:proteinTotals, backgroundColor:'#F7B8CF'},
        {type:'line', data:days.map(()=>proteinTarget), borderColor:'#D97A9A', borderDash:[4,4], pointRadius:0, borderWidth:1.5}
      ]},
      options: JSON.parse(JSON.stringify(baseOpts))
    });
  }catch(e){ console.warn('Protein chart failed', e); }

  try{
    stepsChart = makeChart(document.getElementById('chartSteps'), stepsChart, {
      type:'bar', data:{labels, datasets:[{data:steps, backgroundColor:'#A58BC5'}]}, options: JSON.parse(JSON.stringify(baseOpts))
    });
  }catch(e){ console.warn('Steps chart failed', e); }

  try{
    sleepChart = makeChart(document.getElementById('chartSleep'), sleepChart, {
      type:'bar', data:{labels, datasets:[{data:sleep, backgroundColor:'#D49ABD'}]}, options: JSON.parse(JSON.stringify(baseOpts))
    });
  }catch(e){ console.warn('Sleep chart failed', e); }

  try{
    waterChart = makeChart(document.getElementById('chartWater'), waterChart, {
      type:'bar', data:{labels, datasets:[{data:water, backgroundColor:'#F3A8C1'}]}, options: JSON.parse(JSON.stringify(baseOpts))
    });
  }catch(e){ console.warn('Water chart failed', e); }

  const validScores = scores.filter(s=>s!==null);
  const avg = validScores.length ? Math.round(validScores.reduce((a,b)=>a+b,0)/validScores.length) : 0;
  const best = validScores.length ? Math.max(...validScores) : 0;
  const loggedDays = rows.filter(r=>r!==null).length;
  document.getElementById('scoreStats').innerHTML = `
    <div class="stat-box"><div class="n">${avg}</div><div class="l">avg score</div></div>
    <div class="stat-box"><div class="n">${best}</div><div class="l">best day</div></div>
    <div class="stat-box"><div class="n">${loggedDays}/${currentRange}</div><div class="l">days logged</div></div>
  `;
}

/* ---------- Insights (free, rule-based) ---------- */
function renderInsights(){
  const days = lastNDays(7);
  const rows = days.map(d=> data[d] ? Object.assign(emptyDay(), data[d]) : null).filter(r=>r!==null);
  const list = document.getElementById('insightList');
  list.innerHTML = '';

  if(rows.length < 2){
    list.innerHTML = `<div class="insight-item"><div class="insight-dot" style="background:var(--ink-faint);"></div><div class="insight-text"><b>Not enough data yet</b><span>Log at least 2–3 days and insights will appear here automatically.</span></div></div>`;
    return;
  }

  const insights = [];
  const proteinTarget = settings.proteinMeal*3;

  // protein
  const proteinAvg = avg(rows.map(r=>r.protein.morning+r.protein.lunch+r.protein.dinner));
  const proteinDaysMet = rows.filter(r=>(r.protein.morning+r.protein.lunch+r.protein.dinner)>=proteinTarget).length;
  insights.push({
    level: proteinAvg>=proteinTarget ? 'good' : proteinAvg>=proteinTarget*0.7 ? 'warn' : 'bad',
    title: `Protein averaged ${Math.round(proteinAvg)}g/day`,
    body: `Target is ${proteinTarget}g/day. You hit it on ${proteinDaysMet} of ${rows.length} logged days.` +
      (proteinAvg<proteinTarget ? ` Try adding one more protein source at the meal that's usually lowest.` : ` Nicely consistent — keep it up.`)
  });

  // which meal is weakest
  const mealAvgs = {morning:avg(rows.map(r=>r.protein.morning)), lunch:avg(rows.map(r=>r.protein.lunch)), dinner:avg(rows.map(r=>r.protein.dinner))};
  const weakest = Object.entries(mealAvgs).sort((a,b)=>a[1]-b[1])[0];
  if(weakest[1] < settings.proteinMeal*0.6){
    insights.push({level:'warn', title:`${cap(weakest[0])} is your lightest meal for protein`, body:`Averaging ${Math.round(weakest[1])}g vs a ${settings.proteinMeal}g target. A quick add-on (dal, eggs, paneer, curd, whey) at ${weakest[0]} would close most of the gap.`});
  }

  // steps
  const stepsAvg = avg(rows.map(r=>r.steps));
  insights.push({
    level: stepsAvg>=settings.steps ? 'good' : stepsAvg>=settings.steps*0.7 ? 'warn' : 'bad',
    title:`Steps averaged ${Math.round(stepsAvg).toLocaleString()}/day`,
    body:`Target is ${settings.steps.toLocaleString()}. ` + (stepsAvg<settings.steps ? `You're short by about ${Math.round(settings.steps-stepsAvg).toLocaleString()} steps on an average day.` : `You're consistently meeting your target.`)
  });

  // sleep
  const sleepAvg = avg(rows.map(r=>r.sleepHrs).filter(v=>v>0));
  if(sleepAvg){
    insights.push({
      level: Math.abs(sleepAvg-settings.sleepHrs)<=0.5 ? 'good' : Math.abs(sleepAvg-settings.sleepHrs)<=1.5 ? 'warn' : 'bad',
      title:`Sleep averaged ${sleepAvg.toFixed(1)}h`,
      body:`Target is ${settings.sleepHrs}h. ` + (sleepAvg<settings.sleepHrs-0.5 ? `You're running a sleep deficit most nights — consider an earlier wind-down.` : sleepAvg>settings.sleepHrs+1.5 ? `You're sleeping notably more than your target — worth noting if it's new.` : `You're close to target most nights.`)
    });
  }

  // water
  const waterAvg = avg(rows.map(r=>r.waterMl));
  insights.push({
    level: waterAvg>=settings.waterMl ? 'good' : waterAvg>=settings.waterMl*0.7 ? 'warn' : 'bad',
    title:`Water averaged ${(waterAvg/1000).toFixed(1)}L/day`,
    body:`Target is ${(settings.waterMl/1000).toFixed(1)}L. ` + (waterAvg<settings.waterMl ? `A couple of extra glasses spread through the afternoon would close the gap.` : `Good hydration consistency.`)
  });

  // heart rate anomalies
  const hrVals = rows.map(r=>r.hr).filter(v=>v);
  if(hrVals.length){
    const outOfRange = hrVals.filter(v=>v<settings.hrMin||v>settings.hrMax).length;
    if(outOfRange>0){
      insights.push({level:'warn', title:`Resting HR outside range on ${outOfRange} day(s)`, body:`Your reference range is ${settings.hrMin}–${settings.hrMax} bpm. Occasional blips are normal, but a repeating pattern is worth mentioning to a doctor.`});
    }
  }

  // mood/stress correlation (very simple)
  const stressedDays = rows.filter(r=>r.stress==='High');
  if(stressedDays.length>=2){
    const stressedProtein = avg(stressedDays.map(r=>r.protein.morning+r.protein.lunch+r.protein.dinner));
    const stressedSleep = avg(stressedDays.map(r=>r.sleepHrs).filter(v=>v>0));
    if(stressedSleep && stressedSleep < settings.sleepHrs-1){
      insights.push({level:'warn', title:`High-stress days tend to be low-sleep days`, body:`On days you logged "High" stress, average sleep was ${stressedSleep.toFixed(1)}h vs your ${settings.sleepHrs}h target — worth watching if the pattern continues.`});
    }
  }

  // exercise
  const exAvg = avg(rows.map(r=>r.exerciseMin));
  const exDays = rows.filter(r=>r.exerciseMin>0).length;
  insights.push({
    level: exDays>=rows.length*0.7 ? 'good' : exDays>=rows.length*0.4 ? 'warn' : 'bad',
    title:`Exercised on ${exDays} of ${rows.length} logged days`,
    body:`Averaging ${Math.round(exAvg)} min/day against a ${settings.exerciseMin} min target.`
  });

  const colorMap = {good:'var(--good)', warn:'var(--warn)', bad:'var(--bad)'};
  insights.forEach(ins=>{
    const div = document.createElement('div');
    div.className = 'insight-item';
    div.innerHTML = `<div class="insight-dot" style="background:${colorMap[ins.level]}"></div><div class="insight-text"><b>${ins.title}</b><span>${ins.body}</span></div>`;
    list.appendChild(div);
  });
}
function avg(arr){ const a = arr.filter(v=>v!==undefined && v!==null); return a.length ? a.reduce((x,y)=>x+y,0)/a.length : 0; }
function cap(s){ return s.charAt(0).toUpperCase()+s.slice(1); }

/* ---------- AI (BYOK — user's own Anthropic API key) ---------- */
const savedKey = localStorage.getItem('pulse_api_key');
if(savedKey) document.getElementById('apiKeyInput').value = savedKey;

document.getElementById('clearKey').addEventListener('click', ()=>{
  localStorage.removeItem('pulse_api_key');
  document.getElementById('apiKeyInput').value = '';
  toast('API key cleared');
});

document.getElementById('runAI').addEventListener('click', async ()=>{
  const key = document.getElementById('apiKeyInput').value.trim();
  const out = document.getElementById('aiOutput');
  if(!key){ out.textContent = 'Paste your Anthropic API key above first.'; return; }
  localStorage.setItem('pulse_api_key', key);

  const days = lastNDays(14);
  const rows = days.map(d=> data[d] ? {date:d, ...data[d]} : null).filter(r=>r!==null);
  if(rows.length < 2){ out.textContent = 'Log at least a couple of days before running AI analysis.'; return; }

  out.textContent = 'Analyzing…';
  const summary = JSON.stringify(rows).slice(0, 6000);

  try{
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'x-api-key': key,
        'anthropic-version':'2023-06-01',
        'anthropic-dangerous-direct-browser-access':'true'
      },
      body: JSON.stringify({
        model:'claude-sonnet-4-6',
        max_tokens: 700,
        messages:[{
          role:'user',
          content:`You are a wellness data analyst. Here is JSON of a person's last ${rows.length} logged days (protein in grams per meal, steps, water in ml, sleepHrs, hr=resting heart rate bpm, weight in kg, exerciseMin, mood, stress, energy 1-10, notes). Their targets: ${settings.proteinMeal}g protein per meal, ${settings.steps} steps, ${settings.waterMl}ml water, ${settings.sleepHrs}h sleep, HR range ${settings.hrMin}-${settings.hrMax}, ${settings.exerciseMin} min exercise. Give a short, specific analysis (5-7 sentences) of patterns and 3 concrete, actionable suggestions. Be direct and practical, not generic. Data:\n${summary}`
        }]
      })
    });
    if(!resp.ok){
      const errText = await resp.text();
      out.textContent = `Request failed (${resp.status}). ${errText.slice(0,300)}`;
      return;
    }
    const json = await resp.json();
    const text = (json.content||[]).map(b=>b.text||'').join('\n');
    out.textContent = text || 'No response received.';
  }catch(e){
    out.textContent = 'Could not reach the Anthropic API from this browser (' + e.message + '). Some browsers/networks block direct API calls — this is expected in a few environments.';
  }
});

/* ---------- Live care coach (BYOK) ---------- */
const coachHistory = [];
function addCoachMessage(role, text){
  const message = document.createElement('div');
  message.className = `coach-message ${role}`;
  message.textContent = text;
  const chat = document.getElementById('coachChat');
  chat.appendChild(message);
  chat.scrollTop = chat.scrollHeight;
  return message;
}
document.getElementById('coachForm').addEventListener('submit', async (event)=>{
  event.preventDefault();
  const input = document.getElementById('coachInput');
  const question = input.value.trim();
  const key = document.getElementById('apiKeyInput').value.trim();
  if(!question) return;
  if(!key){ addCoachMessage('coach', 'Add your Anthropic API key above first, then I can reply.'); return; }

  localStorage.setItem('pulse_api_key', key);
  addCoachMessage('user', question);
  input.value = '';
  const pending = addCoachMessage('coach', 'Thinking of a gentle, practical answer…');
  const recentDays = lastNDays(7).map(date=>data[date] ? {date, ...data[date]} : null).filter(Boolean);
  coachHistory.push({role:'user', content:question});

  try{
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':key,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({
        model:'claude-sonnet-4-6', max_tokens:450,
        system:`You are a warm, supportive PCOD-aware wellness coach. Be inclusive, encouraging, and practical. Give short, concrete suggestions that respect Indian food and everyday routines when useful. Never diagnose, prescribe medication, shame the user, or claim certainty. Mention a clinician for persistent, worsening, or concerning symptoms. Current targets: protein ${settings.proteinMeal}g per meal, ${settings.steps} steps, water ${settings.waterMl}ml, sleep ${settings.sleepHrs}h. Recent optional wellness logs: ${JSON.stringify(recentDays).slice(0,4000)}`,
        messages:coachHistory.slice(-8)
      })
    });
    if(!response.ok) throw new Error(`Request failed (${response.status})`);
    const payload = await response.json();
    const answer = (payload.content||[]).map(block=>block.text||'').join('\n').trim() || 'I could not form a reply just now.';
    pending.textContent = answer;
    coachHistory.push({role:'assistant', content:answer});
  }catch(error){
    pending.textContent = `I couldn't connect right now. Check your API key and internet connection, then try again. (${error.message})`;
    coachHistory.pop();
  }
});

/* ---------- Settings ---------- */
function fillSettingsForm(){
  document.getElementById('setProteinMeal').value = settings.proteinMeal;
  document.getElementById('setProteinDay').value = settings.proteinMeal*3;
  document.getElementById('setSteps').value = settings.steps;
  document.getElementById('setWater').value = settings.waterMl;
  document.getElementById('setExercise').value = settings.exerciseMin;
  document.getElementById('setSleep').value = settings.sleepHrs;
  document.getElementById('setWeightGoal').value = settings.weightGoal ?? '';
  document.getElementById('setHrMin').value = settings.hrMin;
  document.getElementById('setHrMax').value = settings.hrMax;
  document.getElementById('setHeight').value = settings.height ?? '';
  document.getElementById('setName').value = settings.name || '';
}
document.getElementById('setProteinMeal').addEventListener('input', (e)=>{
  document.getElementById('setProteinDay').value = (parseFloat(e.target.value)||0)*3;
});
document.getElementById('saveSettings').addEventListener('click', ()=>{
  settings.proteinMeal = parseFloat(document.getElementById('setProteinMeal').value)||50;
  settings.steps = parseInt(document.getElementById('setSteps').value)||8000;
  settings.waterMl = parseInt(document.getElementById('setWater').value)||2500;
  settings.exerciseMin = parseInt(document.getElementById('setExercise').value)||30;
  settings.sleepHrs = parseFloat(document.getElementById('setSleep').value)||7.5;
  settings.weightGoal = document.getElementById('setWeightGoal').value ? parseFloat(document.getElementById('setWeightGoal').value) : null;
  settings.hrMin = parseInt(document.getElementById('setHrMin').value)||60;
  settings.hrMax = parseInt(document.getElementById('setHrMax').value)||100;
  settings.height = document.getElementById('setHeight').value ? parseFloat(document.getElementById('setHeight').value) : null;
  settings.name = document.getElementById('setName').value || '';
  saveSettingsToStore();
  buildMealRows();
  renderToday();
  toast('Settings saved');
});

/* ---------- Export / Import / Wipe ---------- */
document.getElementById('exportData').addEventListener('click', ()=>{
  const blob = new Blob([JSON.stringify({settings, data}, null, 2)], {type:'application/json'});
  downloadBlob(blob, `pulse-backup-${todayStr()}.json`);
});
document.getElementById('exportCsv').addEventListener('click', ()=>{
  const dates = Object.keys(data).sort();
  const header = ['Date','Breakfast(g)','Lunch(g)','Dinner(g)','ProteinTotal(g)','Steps','Water(ml)','Sleep(h)','SleepQuality','Stress','HR(bpm)','Weight(kg)','ExerciseMin','ExerciseType','Mood','Energy','Notes'];
  const rows = dates.map(d=>{
    const r = Object.assign(emptyDay(), data[d]);
    const total = r.protein.morning+r.protein.lunch+r.protein.dinner;
    return [d,r.protein.morning,r.protein.lunch,r.protein.dinner,total,r.steps,r.waterMl,r.sleepHrs,r.sleepQuality,r.stress,r.hr??'',r.weight??'',r.exerciseMin,r.exerciseType,r.mood??'',r.energy,'"'+(r.notes||'').replace(/"/g,'""')+'"'].join(',');
  });
  const csv = [header.join(','), ...rows].join('\n');
  downloadBlob(new Blob([csv],{type:'text/csv'}), `pulse-log-${todayStr()}.csv`);
});
function downloadBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}
document.getElementById('importFile').addEventListener('change', (e)=>{
  const file = e.target.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = (ev)=>{
    try{
      const parsed = JSON.parse(ev.target.result);
      if(parsed.data) data = parsed.data;
      if(parsed.settings) settings = Object.assign({...DEFAULT_SETTINGS}, parsed.settings);
      saveData(); saveSettingsToStore();
      buildMealRows(); renderToday(); fillSettingsForm();
      toast('Backup imported');
    }catch(err){ toast('Could not read that file'); }
  };
  reader.readAsText(file);
});
document.getElementById('wipeData').addEventListener('click', ()=>{
  if(confirm('This erases all logged data on this device. This cannot be undone. Continue?')){
    localStorage.removeItem(STORE_KEY);
    data = {};
    renderToday();
    toast('All data erased');
  }
});

/* ---------- Save Today ---------- */
document.getElementById('saveToday').addEventListener('click', ()=>{
  saveData();
  renderToday();
  toast('Today\u2019s log saved');
});

/* ---------- Init ---------- */
// If this is a password reset link, redirect to reset page IMMEDIATELY
const _hash = window.location.hash;
if(_hash.includes('type=recovery') || _hash.includes('access_token')){
  window.location.replace('reset-password.html' + _hash + window.location.search);
} else {
  buildMealRows();
  buildStaticChips();
  buildMoodRow();
  renderToday();
  checkSession();
}
