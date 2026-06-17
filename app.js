function toggleMonthCtrl(){const el=document.getElementById('adminMonthCtrl');if(el)el.classList.toggle('open');}
// Render emoji bar as soon as DOM is ready (before async init)
document.addEventListener('DOMContentLoaded',function(){
  if(typeof initStickerSystem==='function') initStickerSystem();
  if(typeof renderTemplates==='function') renderTemplates();
});
function updateStatRow(){
  const empKey=curEmp?(curEmp.code||curEmp.name):'';
  const wishes=localWishes[empKey]||[];
  const board=JSON.parse(localStorage.getItem('lbGame_'+empKey)||'[]');
  const votes=JSON.parse(localStorage.getItem('votes_'+empKey)||'{}');
  const totalLikes=Object.values(votes).reduce((a,b)=>a+b,0);
  const wc=document.getElementById('wish-count');const lt=document.getElementById('like-total');const pc=document.getElementById('player-count');
  if(wc)wc.textContent=wishes.length;
  if(lt)lt.textContent='❤️ '+totalLikes;
  if(pc)pc.textContent=board.length;
}

const EMOJIS=['🎉','🌟','💖','🎂','🥳','🌈','✨','🎁','🍀','🏆','🌺','💐','🦋','⭐'];

let curEmp = null;
let selMonth = -1;
let localWishes = JSON.parse(localStorage.getItem('sml_wishes') || '{}');
let pendingQueue = JSON.parse(localStorage.getItem('sml_pending') || '[]');
let gameState = {score:0, qIdx:0, questions:[], answered:false};
let lbTab = 'game';

// ─── API ───────────────────────────────────────────────────
function getApiUrl(){ return (localStorage.getItem('sml_api_url')||'').trim(); }
function saveApiUrl(){
  const url = document.getElementById('apiUrl').value.trim();
  localStorage.setItem('sml_api_url', url);
  setApiStatus('pending','ยังไม่ได้ทดสอบ');
}
function setApiStatus(type, text){
  const el = document.getElementById('apiStatus');
  el.className = 'api-status api-'+type;
  el.textContent = text;
}
async function testApi(){
  const url = getApiUrl();
  if(!url){setApiStatus('err','ยังไม่ได้ใส่ URL');return;}
  setApiStatus('pending','กำลังทดสอบ...');
  try{
    const r = await fetch(url+'?action=ping');
    const d = await r.json();
    if(d.ok) setApiStatus('ok','✅ เชื่อมต่อแล้ว');
    else setApiStatus('err','ตอบกลับผิดปกติ');
  }catch(e){setApiStatus('err','❌ เชื่อมต่อไม่ได้');}
}
async function apiGet(params){
  const url = getApiUrl();
  if(!url) return null;
  const qs = Object.entries(params).map(([k,v])=>k+'='+encodeURIComponent(v)).join('&');
  try{ 
    const r = await fetch(url+'?'+qs);
    if(!r.ok) throw new Error('HTTP '+r.status);
    return await r.json(); 
  }
  catch(e){ console.error('apiGet error:', e); return null; }
}
async function apiPost(body){
  const url = getApiUrl();
  if(!url) return null;
  try{
    // ใช้ GET แทน POST เพื่อหลีกเลี่ยงปัญหา CORS ของ Google Apps Script
    const params = new URLSearchParams();
    Object.entries(body).forEach(([k,v]) => params.append(k, v));
    const r = await fetch(url + '?' + params.toString());
    return await r.json();
  }catch(e){ 
    console.error('API error:', e);
    return null; 
  }
}

// ─── PARTICLES ───────────────────────────────────────────
// particles removed

// ─── EMOJI ROW ───────────────────────────────────────────
// ── EMOJI GRID ────────────────────────────────────
function initStickerSystem(){
  const bar=document.getElementById('emojiBar');
  if(!bar){ setTimeout(initStickerSystem,200); return; }
  const emojis=['🎉','🎂','🎊','🎁','🥳','🎈','🎀','🧁','🍰','🥂',
    '❤️','💖','💝','🥰','😍','🤩','✨','🌟','⭐','🏆',
    '👑','💪','🙏','😊','🤗','🌸','🌺','🦋','🌈','🍀',
    '😄','🤣','😜','😎','🚀','💎','🎯','💡','🌙','☀️'];
  bar.innerHTML=emojis.map(e=>
    `<button class="emo" onclick="insertEmoji('${e}')">${e}</button>`
  ).join('');
}
// Auto-call when script loads
if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded', initStickerSystem);
} else {
  initStickerSystem();
}
function insertEmoji(e){
  const ta=document.getElementById('wf-text');
  if(!ta) return;
  const s=ta.selectionStart||ta.value.length;
  const en=ta.selectionEnd||ta.value.length;
  ta.value=ta.value.slice(0,s)+e+ta.value.slice(en);
  ta.focus(); ta.selectionStart=ta.selectionEnd=s+e.length;
  onTextInput();
}

// ─── MONTH TABS ──────────────────────────────────────────
function buildMonthTabs(){
  const isAdmin=document.body.classList.contains('admin-mode');
  const allowed=getActiveMonths();
  document.getElementById('monthTabs').innerHTML=MTH.map((m,i)=>{
    const hasEmp=calPersons.some(p=>p.month===i);
    const isAllowed=allowed.includes(i);
    const cls=['mtab', i===selMonth?'active':'', !isAdmin&&!isAllowed?'hidden-month':''].filter(Boolean).join(' ');
    return `<button class="${cls}" onclick="selectMonth(${i})">${m.substring(0,3)}</button>`;
  }).join('');
}
function selectMonth(mi){
  selMonth=mi; buildMonthTabs();
  const chips=document.getElementById('personChips');
  const isAdmin=document.body.classList.contains('admin-mode');
  const allowed=getActiveMonths();
  // Non-admin: block hidden months
  if(!isAdmin && !allowed.includes(mi)){
    chips.innerHTML='<div class="person-locked">🔒 ยังไม่เปิดให้ดูเดือนนี้</div>';
    return;
  }
  const list=calPersons.filter(p=>p.month===mi);
  if(!list.length){chips.innerHTML='<div style="font-size:.78rem;color:rgba(255,255,255,.3)">ไม่มีพนักงานเกิดเดือนนี้</div>';return;}
  chips.innerHTML=list.map((p,i)=>
    `<div class="pchip${curEmp&&curEmp.code===p.code?' active':''}" onclick="selectPerson('${p.code}')">
      <span class="pchip-dot"></span>คุณ${p.name.split(' ')[0]}
    </div>`
  ).join('');
  if(!curEmp||curEmp.month!==mi) selectPerson(list[0].code);
}
function selectPerson(code){
  curEmp=calPersons.find(p=>p.code===code)||null;
  if(!curEmp)return;
  // Update chips
  document.querySelectorAll('.pchip').forEach(c=>{
    c.classList.toggle('active', c.textContent.includes(curEmp.name.split(' ')[0]));
  });
  // Update hero
  document.getElementById('hero-name').textContent='คุณ'+curEmp.name;
  document.getElementById('hero-pos').textContent=(curEmp.pos||'')+(curEmp.faction?' | '+curEmp.faction:'')+(curEmp.code?' | รหัส '+curEmp.code:'');
  document.getElementById('hero-date').innerHTML=`<span>🎂</span><span>เกิดเดือน${MTH[curEmp.month]}</span>`;
  // Load saved photo for this employee
  loadEmpPhoto(curEmp.code||curEmp.name);
  // Update game title
  const gtt = document.getElementById('gameTitleText');
  if(gtt) gtt.textContent = '🎯 คุณเป็นแฟนพันธุ์แท้ของคุณ'+curEmp.name.split(' ')[0]+' หรือไม่?';
  // Show game section
  const gs=document.getElementById('gameSection');
  if(gs) gs.style.display='block';
  // Always show wheel + participants sections when person is selected
  const ws=document.getElementById('wheelSection');
  if(ws) ws.style.display='block';
  const ps=document.getElementById('partSection');
  if(ps) ps.style.display='block';
  startGame();
  renderCustomQList();
  renderParticipants();
  renderLeaderboard();
  setTimeout(drawWheel, 100);
  loadWishes();
}

// ─── WISHES ──────────────────────────────────────────────
async function loadWishes(){
  if(!curEmp)return;
  const empId=curEmp.code||curEmp.name;
  // Try API first
  const remote=await apiGet({action:'getWishes',empId});
  let wishes;
  if(remote&&Array.isArray(remote)){
    wishes=remote;
    // merge local pending
    localWishes[empId]=wishes;
    localStorage.setItem('sml_wishes',JSON.stringify(localWishes));
  } else {
    wishes=localWishes[empId]||[];
  }
  renderWishes(wishes);
  document.getElementById('wish-count').textContent=wishes.length;
}
function renderWishes(wishes){
  const grid=document.getElementById('wish-grid');
  const isAdmin=document.body.classList.contains('admin-mode');
  const hidden=JSON.parse(localStorage.getItem('sml_hidden')||'[]');
  const visible=isAdmin ? wishes : wishes.filter(w=>!hidden.includes(String(w.ts||w.timestamp||w.senderName)));

  if(!visible.length){
    grid.innerHTML='<div class="wish-empty"><div class="wish-empty-icon">💭</div><div>ยังไม่มีคำอวยพร<br><span style="font-size:.75rem">เป็นคนแรกที่ส่งคำอวยพร!</span></div></div>';
    document.getElementById('voteSection').style.display='none';
    return;
  }

  grid.innerHTML=wishes.map((w,i)=>{
    const wid=String(w.ts||w.timestamp||w.senderName||i);
    const isHidden=hidden.includes(wid);
    if(!isAdmin && isHidden) return '';
    return `<div class="wish-card wc-${i%6}${isHidden?' wish-hidden':''}" style="animation-delay:${i*0.05}s;position:relative">
      <div class="wish-actions">
        <button class="wish-act-btn wish-act-hide" onclick="toggleHideWish('${wid.replace(/'/g,"\'")}',this)" title="${isHidden?'แสดง':'ซ่อน'}">${isHidden?'👁':'🙈'}</button>
        <button class="wish-act-btn wish-act-del" onclick="deleteWish('${wid.replace(/'/g,"\'")}',this)" title="ลบ">🗑</button>
      </div>
      <div class="wish-emoji">${w.emoji||'🎉'}</div>
      <div class="wish-msg">${escHtml(w.msg||w.message||'')}</div>
      <div class="wish-from">
        <span class="wish-from-name">${escHtml(w.senderName||w.name||'ไม่ระบุชื่อ')}</span>
        <span>· ${escHtml(w.senderDept||w.dept||'ทีมงาน')}</span>
        <span class="wish-ts">${w.ts||w.timestamp||''}</span>
      </div>
    </div>`;
  }).join('');

  // Update vote list with visible wishes
  renderVoteList(visible.slice(0,10));
}
function escHtml(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

// ─── SUBMIT ──────────────────────────────────────────────
async function submitWish(){
  if(!curEmp){showToast('กรุณาเลือกพนักงานก่อนครับ');return;}
  const name=document.getElementById('wf-name').value.trim();
  const dept=document.getElementById('wf-dept').value.trim();
  const text=document.getElementById('wf-text').value.trim();
  if(!name){shake('wf-name');return;}
  if(!text){shake('wf-text');return;}

  const empId=curEmp.code||curEmp.name;
  const wish={
    action:'addWish', empId, empName:curEmp.name,
    senderName:name, senderDept:dept||'ทีมงาน', msg:text,
    emoji:EMOJIS[~~(Math.random()*EMOJIS.length)],
    ts:new Date().toLocaleString('th-TH')
  };

  const btn=document.getElementById('send-btn');
  btn.disabled=true;btn.textContent='⏳ กำลังส่ง...';

  // Save locally first
  if(!localWishes[empId])localWishes[empId]=[];
  const localWish={...wish};
  localWishes[empId].unshift(localWish);
  localStorage.setItem('sml_wishes',JSON.stringify(localWishes));

  // Try API
  const result=await apiPost(wish);
  if(!result||result.error){
    // Queue for later
    pendingQueue.push(wish);
    localStorage.setItem('sml_pending',JSON.stringify(pendingQueue));
    showToast('💾 บันทึกในเครื่องแล้ว (จะส่งเมื่อออนไลน์)','warn');
  } else {
    showToast('🎉 ส่งคำอวยพรสำเร็จ!');
    fireConfetti();
  }

  // Auto-save game score with this name if not saved yet
  if (name) {
    localStorage.setItem('playerName', name);
    const empKey = curEmp ? (curEmp.code||curEmp.name) : 'general';
    const board = JSON.parse(localStorage.getItem('lbGame_'+empKey)||'[]');
    const alreadySaved = board.find(r=>r.name===name);
    if (!alreadySaved) {
      // Mark as participant even without playing game
      saveGameScore(name, 0, 0);
    }
  }
  // UI
  document.getElementById('wf-name').value='';
  document.getElementById('wf-dept').value='';
  document.getElementById('wf-text').value='';
  const succ=document.getElementById('success-msg');
  succ.classList.add('show');
  setTimeout(()=>{succ.classList.remove('show');btn.disabled=false;btn.textContent='🎊 ส่งคำอวยพร!';},3500);
  loadWishes();
}

function shake(id){
  const el=document.getElementById(id);
  el.style.animation='';el.style.borderColor='var(--rose)';
  el.style.animation='shake .4s';
  const style=document.getElementById('shakeStyle')||document.createElement('style');
  style.id='shakeStyle';style.textContent='@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-5px)}40%,80%{transform:translateX(5px)}}';
  document.head.appendChild(style);
  setTimeout(()=>{el.style.borderColor='';el.style.animation='';},500);
}

// ─── CONFETTI ────────────────────────────────────────────
function fireConfetti(){
  const colors=['#f5c842','#ff6b9d','#00e5cc','#a78bfa','#f97316','#34d399'];
  for(let i=0;i<40;i++){
    const p=document.createElement('div');p.className='confetti-piece';
    p.style.cssText=`left:${Math.random()*100}vw;top:-10px;background:${colors[~~(Math.random()*colors.length)]};transform:rotate(${Math.random()*360}deg);--dx:${(Math.random()-0.5)*300}px;animation-delay:${Math.random()*.5}s;animation-duration:${Math.random()*1+1.5}s`;
    document.body.appendChild(p);
    setTimeout(()=>p.remove(),3000);
  }
}

// ─── TOAST ───────────────────────────────────────────────
let toastTimer;
function showToast(msg,type){
  const t=document.getElementById('toast');
  t.textContent=msg;t.className='toast show';
  if(type==='warn')t.style.borderColor='var(--gold)';
  else t.style.borderColor='var(--mint)';
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),3000);
}

// ─── SYNC PENDING ─────────────────────────────────────────
async function syncPending(){
  if(!pendingQueue.length)return;
  const url=getApiUrl();if(!url)return;
  const remaining=[];
  for(const wish of pendingQueue){
    try{const r=await apiPost(wish);if(!r||r.error)remaining.push(wish);}
    catch{remaining.push(wish);}
  }
  pendingQueue=remaining;
  localStorage.setItem('sml_pending',JSON.stringify(pendingQueue));
}

// ─── OFFLINE ─────────────────────────────────────────────
window.addEventListener('online',()=>{document.getElementById('offline-banner').style.display='none';syncPending();});
window.addEventListener('offline',()=>{document.getElementById('offline-banner').style.display='block';});

// ─── INIT ─────────────────────────────────────────────────
// ── LOAD PERSONS FROM GOOGLE SHEET ───────────────────────────────────
async function loadPersonsFromSheet(){
  const url = getApiUrl();
  if(!url) return false;
  const statusEl = document.getElementById('syncStatus');
  if(statusEl) statusEl.textContent = 'กำลังโหลดข้อมูลพนักงาน...';
  try{
    const data = await apiGet({action:'getPersons'});
    if(!data || !Array.isArray(data) || data.length === 0) return false;
    // Convert sheet format → calPersons format
    // Sheet: {code, name(fname+lname), pos, faction, day, month(0-based)}
    const parsed = data
      .filter(p => p.name && String(p.name).trim())
      .map(p => ({
        code:    String(p.code||'').trim(),
        name:    String(p.name||'').trim().replace(/\s+/,' '),
        pos:     String(p.pos||'').trim(),
        faction: String(p.faction||'').trim(),
        day:     parseInt(p.day)||1,
        month:   typeof p.month==='number' ? p.month : Math.max(0,parseInt(p.month||0)-1),
      }));
    if(parsed.length === 0) return false;
    calPersons = parsed;
    if(statusEl) statusEl.textContent = 'โหลดข้อมูลพนักงานแล้ว ' + parsed.length + ' คน';
    setTimeout(()=>{ if(statusEl) statusEl.textContent=''; }, 3000);
    return true;
  } catch(e){
    console.error('loadPersons error:', e);
    return false;
  }
}


// ── MOOD & TEMPLATE SYSTEM ─────────────────────────────────
const MOOD_TEMPLATES = {
  warm: [
    'ขอให้วันเกิดนี้เต็มไปด้วยความสุขและรอยยิ้มนะ ❤️',
    'ขอบคุณที่เป็นเพื่อนร่วมงานที่ดีเสมอมา สุขสันต์วันเกิดครับ/ค่ะ 🎂',
    'ขอให้สุขภาพแข็งแรง มีแต่เรื่องดีๆ เข้ามาในชีวิตตลอดปีนะ 🌟',
    'ขอให้ทุกความฝันเป็นจริง ประสบความสำเร็จในทุกด้าน 🏆',
  ],
  cute: [
    'แก่แต่กาย ใจยังสาวเสมอนะจ๊ะ 🥰 สุขสันต์วันเกิดค้าบ!',
    'เกิดมาดีมากเลยนะ ขอให้ปีนี้ดีกว่าเดิมอีก 100 เท่า 💖',
    'ขอให้น่ารักและเก่งแบบนี้ไปตลอด ไม่มีวันแก่เลย! 🌸',
    'วันเกิดแล้ว! ขอให้ได้ของขวัญที่อยากได้ทุกอย่างเลยนะ 🎁',
  ],
  cool: [
    'Happy Birthday! Stay awesome เหมือนเดิมนะ 😎✨',
    'ปีใหม่ชีวิตใหม่ ไปให้ถึงเป้าหมายที่ตั้งไว้ได้เลย 🚀',
    'Level up! อีกหนึ่งปีที่แกร่งขึ้น เก่งขึ้น เจ๋งขึ้น 💪',
    'ขอให้ความสำเร็จตามมาหาเอง ไม่ต้องวิ่งหาเลย 🏆',
  ],
  funny: [
    'ยินดีด้วยที่แก่ขึ้นอีกปี! แต่ยังดูเด็กกว่าอายุจริงมากนะ 😄',
    'อายุเพิ่ม แต่หล่อ/สวยเพิ่มด้วย ไม่ยุติธรรมกับคนอื่นเลย 🤣',
    'สุขสันต์วันเกิด! ปีนี้ขอให้ได้นอนพักผ่อนเยอะๆ นะ 😴💤',
    'ขอให้วันเกิดปีนี้ไม่ต้องทำงานล่วงเวลานะ 🙏😂',
  ],
};
let curMood='warm';

function setMood(btn){
  document.querySelectorAll('.mood-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  curMood=btn.dataset.mood;
  renderTemplates();
  const ta=document.getElementById('wf-text');
  const ph={warm:'ส่งความปรารถนาดีจากใจ...',cute:'เขียนอะไรน่ารักๆ ให้เจ้าของวันเกิด...',cool:'Cool message goes here...',funny:'ฮาๆ หน่อยก็ได้นะ! 😄'};
  if(ta) ta.placeholder=ph[curMood]||'เขียนคำอวยพรให้เพื่อนร่วมงาน...';
}

function renderTemplates(){
  const row=document.getElementById('tmplRow');
  if(!row) return;
  const tmpls=MOOD_TEMPLATES[curMood]||[];
  row.innerHTML='<span style="font-size:.62rem;color:var(--mute);align-self:center;flex-shrink:0">เลือก:</span>'+
    tmpls.map(t=>`<button class="tmpl-btn" onclick="useTmpl(this)" title="${t}">${t.substring(0,18)}…</button>`).join('');
}

function useTmpl(btn){
  const ta=document.getElementById('wf-text');
  if(!ta) return;
  ta.value=btn.title; ta.focus(); onTextInput();
  ta.style.borderColor='rgba(245,200,66,.6)';
  setTimeout(()=>ta.style.borderColor='',800);
}

function onNameInput(){
  const name=(document.getElementById('wf-name')||{value:''}).value.trim();
  const badge=document.getElementById('wishFormBadge');
  if(badge){
    if(name){badge.textContent='พร้อมส่ง! 🎊';badge.style.color='var(--mint)';badge.style.borderColor='rgba(0,229,204,.3)';}
    else{badge.textContent='กรอกชื่อก่อนนะ';badge.style.color='';badge.style.borderColor='';}
  }
}

function onTextInput(){
  const ta=document.getElementById('wf-text');
  const counter=document.getElementById('charCounter');
  if(!ta||!counter) return;
  const len=ta.value.length, max=parseInt(ta.maxLength)||200;
  counter.textContent=len+'/'+max;
  counter.classList.toggle('warn',len>=max*0.85);
}

(async function(){
  // Load saved API URL
  const savedUrl=getApiUrl();
  if(savedUrl){
    document.getElementById('apiUrl').value=savedUrl;
    testApi();
    // Load persons from Sheet before building UI
    await loadPersonsFromSheet();
  }
  // Build UI
  buildMonthTabs();
  // Auto-select current month
  const now=new Date();
  selectMonth(now.getMonth());
  // Sync pending
  syncPending();
  // Auto-refresh wishes every 30s
  setInterval(loadWishes, 30000);
  // Draw placeholder wheel on load
  setTimeout(drawWheel, 300);
  // Init emoji grid + templates
  initStickerSystem();
  renderTemplates();
  // Auto-refresh persons every 5 minutes
  setInterval(async()=>{
    const ok = await loadPersonsFromSheet();
    if(ok){ buildMonthTabs(); if(selMonth>=0) selectMonth(selMonth); }
  }, 5*60*1000);
})();


// ── ADMIN MONTH CONTROL ─────────────────────────────────────────────
function getActiveMonths(){
  const saved=localStorage.getItem('sml_active_months');
  if(saved) return JSON.parse(saved);
  // Default: current month only
  return [new Date().getMonth()];
}

function saveActiveMonths(arr){
  localStorage.setItem('sml_active_months', JSON.stringify(arr));
}

function buildAmcGrid(){
  const active=getActiveMonths();
  const grid=document.getElementById('amcGrid');
  if(!grid) return;
  grid.innerHTML=MTH.map((m,i)=>
    `<button class="amp-chip ${active.includes(i)?'on':'off'}" onclick="toggleAdminMonth(${i})" id="amc-${i}">${m.substring(0,3)}</button>`
  ).join('');
}

function toggleAdminMonth(mi){
  const active=getActiveMonths();
  const idx=active.indexOf(mi);
  if(idx>=0) active.splice(idx,1);
  else active.push(mi);
  saveActiveMonths(active);
  buildAmcGrid();
  buildMonthTabs();
  // If current selMonth is now hidden, clear person list
  if(!active.includes(selMonth)){
    document.getElementById('personChips').innerHTML='<div class="person-locked">🔒 ยังไม่เปิดให้ดูเดือนนี้</div>';
  }
}

function toggleAllMonths(){
  const active=getActiveMonths();
  const newActive = active.length===12 ? [] : MTH.map((_,i)=>i);
  saveActiveMonths(newActive);
  buildAmcGrid();
  buildMonthTabs();
}

// ── WHEEL MONTH CONTROL (which months' players get pooled into the wheel) ──
function toggleWheelMonthCtrl(){
  const el=document.getElementById('wheelMonthCtrl');
  if(el) el.classList.toggle('open');
  buildWmcGrid();
}

function getWheelMonths(){
  const saved=localStorage.getItem('wheel_active_months');
  if(saved) return JSON.parse(saved);
  // Default: current month only
  return [new Date().getMonth()];
}

function saveWheelMonths(arr){
  localStorage.setItem('wheel_active_months', JSON.stringify(arr));
}

function buildWmcGrid(){
  const active=getWheelMonths();
  const grid=document.getElementById('wmcGrid');
  if(!grid) return;
  grid.innerHTML=MTH.map((m,i)=>
    `<button class="amp-chip ${active.includes(i)?'on':'off'}" onclick="toggleWheelMonth(${i})" id="wmc-${i}">${m.substring(0,3)}</button>`
  ).join('');
  updateWmcConfirm();
}

function toggleWheelMonth(mi){
  const active=getWheelMonths();
  const idx=active.indexOf(mi);
  if(idx>=0) active.splice(idx,1);
  else active.push(mi);
  saveWheelMonths(active);
  buildWmcGrid();
  renderParticipants();
}

function toggleAllWheelMonths(){
  const active=getWheelMonths();
  const newActive = active.length===12 ? [] : MTH.map((_,i)=>i);
  saveWheelMonths(newActive);
  buildWmcGrid();
  renderParticipants();
}

function updateWmcConfirm(){
  const txt=document.getElementById('wmcConfirmText');
  if(!txt) return;
  const count = getWheelParticipants().length;
  txt.innerHTML = `รวมผู้เล่น <b>${count} คน</b> เข้าวงล้อ`;
}

// ── ADMIN MODE ──────────────────────────────────────────────────────
// Password stored in localStorage — changeable without editing code
function getAdminPass(){ return localStorage.getItem('adminPass') || 'sml2569'; }
function setAdminPass(p){ localStorage.setItem('adminPass', p); }

function showAdminPrompt(){
  if(document.body.classList.contains('admin-mode')){
    exitAdmin(); return;
  }
  showAdminLoginModal();
}

function enterAdmin(){
  document.body.classList.add('admin-mode');
  document.getElementById('apiBar').classList.add('show');
  document.getElementById('adminLock').classList.add('active');
  document.getElementById('adminLock').textContent='🔓';
  document.getElementById('adminLock').title='ออกจาก Admin Mode';
  // Photo hints
  const ph = document.getElementById('photoUploadHint');
  if(ph) ph.style.display='block';
  const pf = document.getElementById('empPhotoFrame');
  if(pf) pf.style.cursor='pointer';
  // Load saved URL
  const saved=getApiUrl();
  if(saved){ document.getElementById('apiUrl').value=saved; testApi(); }
  // Build admin month grid
  buildAmcGrid();
  buildWmcGrid();
  renderParticipants();
  // Render custom questions
  renderCustomQList();
  // Show admin-only wheel controls
  const wa=document.getElementById('wheelAdminArea');
  const wh=document.getElementById('wheelPublicHint');
  if(wa) wa.style.display='flex';
  if(wh) wh.style.display='none';
  // Reload persons from sheet
  loadPersonsFromSheet().then(ok=>{
    buildMonthTabs();
    showToast(ok?'เข้าสู่ Admin Mode — พนักงาน '+calPersons.length+' คน':'เข้าสู่ Admin Mode แล้ว');
  });
  loadWishes();
}

function exitAdmin(){
  document.body.classList.remove('admin-mode');
  document.getElementById('apiBar').classList.remove('show');
  document.getElementById('adminLock').classList.remove('active');
  document.getElementById('adminLock').textContent='🔒';
  document.getElementById('adminLock').title='Admin Login';
  // Photo hints
  const ph = document.getElementById('photoUploadHint');
  if(ph) ph.style.display='none';
  const pf = document.getElementById('empPhotoFrame');
  if(pf) pf.style.cursor='default';
  // Hide admin-only wheel controls
  const wa=document.getElementById('wheelAdminArea');
  const wh=document.getElementById('wheelPublicHint');
  if(wa) wa.style.display='none';
  if(wh) wh.style.display='block';
  showToast('ออกจาก Admin Mode แล้ว');
  loadWishes();
}

// ── HIDE / SHOW WISH ─────────────────────────────────────────────────
function toggleHideWish(wid, btn){
  const hidden=JSON.parse(localStorage.getItem('sml_hidden')||'[]');
  const idx=hidden.indexOf(wid);
  if(idx>=0){ hidden.splice(idx,1); }
  else { hidden.push(wid); }
  localStorage.setItem('sml_hidden',JSON.stringify(hidden));
  loadWishes();
  showToast(idx>=0?'แสดงคำอวยพรแล้ว':'ซ่อนคำอวยพรแล้ว');
}

// ── DELETE WISH ──────────────────────────────────────────────────────
async function deleteWish(wid, btn){
  if(!confirm('ลบคำอวยพรนี้? ไม่สามารถกู้คืนได้')) return;
  // 1. Remove from local cache
  if(curEmp){
    const empId=curEmp.code||curEmp.name;
    if(localWishes[empId]){
      localWishes[empId]=localWishes[empId].filter(w=>String(w.ts||w.timestamp||w.senderName||w.msg)!==wid);
      localStorage.setItem('sml_wishes',JSON.stringify(localWishes));
    }
  }
  // 2. Remove from hidden list
  const hidden=JSON.parse(localStorage.getItem('sml_hidden')||'[]');
  const hi=hidden.indexOf(wid);
  if(hi>=0){ hidden.splice(hi,1); localStorage.setItem('sml_hidden',JSON.stringify(hidden)); }
  // 3. Delete from Google Sheet via API
  const result=await apiGet({action:'deleteWish', wid:encodeURIComponent(wid)});
  if(result&&result.ok){
    showToast('ลบออกจาก Google Sheet แล้ว');
  } else {
    showToast('ลบจากหน้าเว็บแล้ว (Sheet อาจต้องลบเอง)','warn');
  }
  // 4. Force reload from server
  const empId=curEmp?curEmp.code||curEmp.name:'';
  const fresh=await apiGet({action:'getWishes',empId});
  if(fresh&&Array.isArray(fresh)){
    localWishes[empId]=fresh;
    localStorage.setItem('sml_wishes',JSON.stringify(localWishes));
  }
  loadWishes();
}


async function reloadPersons(){
  const ok = await loadPersonsFromSheet();
  if(ok){
    buildMonthTabs();
    if(selMonth>=0) selectMonth(selMonth);
    showToast('โหลดข้อมูลพนักงานใหม่แล้ว ' + calPersons.length + ' คน');
  } else {
    showToast('โหลดไม่ได้ — ตรวจสอบ Script URL','warn');
  }
}


// ══════════════════════════════════════════════════
// PHOTO FEATURE
// ══════════════════════════════════════════════════
function loadEmpPhoto(empKey) {
  const saved = localStorage.getItem('photo_'+empKey);
  const img = document.getElementById('empPhoto');
  const emoji = document.getElementById('empPhotoEmoji');
  if (saved) {
    img.src = saved; img.style.display='block'; emoji.style.display='none';
  } else {
    img.src=''; img.style.display='none'; emoji.style.display='block';
  }
}
function adminUploadPhoto() {
  if (!document.body.classList.contains('admin-mode')) return;
  document.getElementById('photoInput').click();
}
function onPhotoSelected(evt) {
  const file = evt.target.files[0]; if(!file||!curEmp) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    const key = 'photo_'+(curEmp.code||curEmp.name);
    // Resize to ~300px for storage efficiency
    const canvas = document.createElement('canvas');
    const tmpImg = new Image();
    tmpImg.onload = function() {
      const size = 300;
      canvas.width = size; canvas.height = size;
      const ctx = canvas.getContext('2d');
      const min = Math.min(tmpImg.width, tmpImg.height);
      const sx = (tmpImg.width-min)/2, sy = (tmpImg.height-min)/2;
      ctx.drawImage(tmpImg, sx, sy, min, min, 0, 0, size, size);
      const data = canvas.toDataURL('image/jpeg', 0.82);
      localStorage.setItem(key, data);
      loadEmpPhoto(curEmp.code||curEmp.name);
      showToast('อัปโหลดรูปสำเร็จ');
    };
    tmpImg.src = e.target.result;
  };
  reader.readAsDataURL(file);
  evt.target.value='';
}
// photo hints handled inside enterAdmin/exitAdmin directly

// ══════════════════════════════════════════════════
// GAME FEATURE
// ══════════════════════════════════════════════════
function generateQuestionsAuto(emp) {
  if (!emp) return [];
  const qs = [];
  const mthName = MTH[emp.month];
  // Q1: เดือนเกิด
  const wrongMonths = MTH.filter(m=>m!==mthName).sort(()=>Math.random()-.5).slice(0,3);
  const opts1 = [mthName,...wrongMonths].sort(()=>Math.random()-.5);
  qs.push({q:`คุณ${emp.name.split(' ')[0]} เกิดเดือนอะไร?`, opts:opts1, ans:mthName});
  // Q2: แผนก
  const allFactions=[...new Set(calPersons.map(p=>p.faction).filter(Boolean))];
  const wrongF = allFactions.filter(f=>f!==emp.faction).sort(()=>Math.random()-.5).slice(0,3);
  if(wrongF.length>=2) {
    const opts2 = [emp.faction,...wrongF.slice(0,3)].sort(()=>Math.random()-.5);
    qs.push({q:`คุณ${emp.name.split(' ')[0]} อยู่แผนกไหน?`, opts:opts2, ans:emp.faction});
  }
  // Q3: ทาย emoji ที่เหมาะกับ
  const emojis = ['🎉','🌟','💖','🎂','🥳','🌈','✨','🎁'];
  const ans3 = emojis[Math.floor(Math.random()*emojis.length)];
  const opts3 = [ans3,...emojis.filter(e=>e!==ans3).sort(()=>Math.random()-.5).slice(0,3)].sort(()=>Math.random()-.5);
  qs.push({q:`เลือก emoji ที่เหมาะกับคุณ${emp.name.split(' ')[0]} ที่สุด!`, opts:opts3, ans:ans3, fun:true});
  return qs;
}

function startGame() {
  if (!curEmp) return;
  gameState = {score:0, qIdx:0, questions:generateQuestions(curEmp), answered:false};
  renderGame();
}

function renderGame() {
  const body = document.getElementById('gameBody');
  const score = document.getElementById('gameScore');
  if (!body) return;
  score.textContent = gameState.score + ' คะแนน';
  // Show hint if name not filled
  const hint = document.getElementById('gameNameHint');
  const wfName = (document.getElementById('wf-name')||{value:''}).value.trim();
  const saved = localStorage.getItem('playerName');
  if(hint) hint.style.display = (!wfName && !saved) ? 'block' : 'none';
  const qs = gameState.questions;
  if (!qs.length) { body.innerHTML='<div style="text-align:center;color:rgba(255,255,255,.3);padding:1rem">ไม่มีคำถาม</div>'; return; }
  if (gameState.qIdx >= qs.length) {
    const total = qs.length;
    const s = gameState.score;
    const msg = s===total?'เก่งมาก! 🏆':s>total/2?'ดีมาก! 👍':'ลองใหม่นะ 😊';
    // Auto-get name from wish form (no extra input needed)
    const wishFormName = (document.getElementById('wf-name')||{value:''}).value.trim();
    const savedName = wishFormName || localStorage.getItem('playerName') || '';
    if (savedName) {
      localStorage.setItem('playerName', savedName);
      saveGameScore(savedName, s, total);
    }
    const hasName = !!savedName;
    body.innerHTML = `<div class="qi-result">
      <div style="font-size:2rem;margin-bottom:.5rem">${s===total?'🏆':s>total/2?'🌟':'💪'}</div>
      <div style="font-size:1rem;font-weight:500;margin-bottom:.3rem">${msg}</div>
      <div style="font-size:.82rem;color:rgba(255,255,255,.5);margin-bottom:.65rem">${s}/${total} ข้อถูก</div>
      ${hasName
        ? `<div style="font-size:.78rem;color:rgba(245,200,66,.8);margin-bottom:.5rem">✅ บันทึกคะแนนของ <b>${escHtml(savedName)}</b> แล้ว</div>`
        : `<div style="font-size:.75rem;color:rgba(255,255,255,.4);margin-bottom:.45rem">กรอกชื่อในช่องเขียนคำอวยพรก่อนนะ เพื่อขึ้นกระดานคะแนน</div>`
      }
      <button class="qi-next" onclick="${!hasName?`autoSaveThenRestart();`:'startGame()'}">
        ${!hasName?'⬇ เลื่อนลงกรอกชื่อ':'🔄 เล่นอีกครั้ง'}
      </button>
    </div>`;
    return;
  }
  const q = qs[gameState.qIdx];
  body.innerHTML = `
    <div class="qi-q">${q.q}${q.fun?' <span style="font-size:.72rem;color:var(--gold)">(ข้อสนุก!)</span>':''}</div>
    <div class="qi-opts">
      ${q.opts.map(o=>`<button class="qopt" onclick="answerGame(this,'${o.replace(/'/g,"\\'")}','${q.ans.replace(/'/g,"\\'")}','${q.fun?'fun':''}')">${o}</button>`).join('')}
    </div>`;
}

function answerGame(btn, selected, ans, type) {
  if (gameState.answered) return;
  gameState.answered = true;
  const opts = document.querySelectorAll('.qopt');
  const isCorrect = type==='fun' || selected===ans;
  opts.forEach(o => {
    o.disabled = true;
    if (o.textContent.trim()===ans) o.classList.add('correct');
    else if (o===btn && !isCorrect) o.classList.add('wrong');
  });
  if (isCorrect) {
    gameState.score++;
    fireConfetti();
    showToast(type==='fun'?'สนุกมาก! +1 คะแนน':'ถูกต้อง! +1 คะแนน');
  } else {
    showToast('ไม่ถูกนะ คำตอบที่ถูกคือ '+ans,'warn');
  }
  document.getElementById('gameScore').textContent = gameState.score+' คะแนน';
  // Auto next after 1.5s
  setTimeout(()=>{
    gameState.qIdx++;
    gameState.answered = false;
    renderGame();
  }, 1500);
}

// ══════════════════════════════════════════════════
// VOTE FEATURE
// ══════════════════════════════════════════════════
function renderVoteList(wishes) {
  const voteEl = document.getElementById('voteSection');
  const listEl = document.getElementById('voteList');
  if (!voteEl||!listEl) return;
  if (!wishes||!wishes.length) {
    voteEl.style.display='none'; return;
  }
  voteEl.style.display='block';
  const empKey = curEmp ? (curEmp.code||curEmp.name) : '';
  const votes = JSON.parse(localStorage.getItem('votes_'+empKey)||'{}');
  // Sort by vote count desc
  const wWithVotes = wishes
    .filter(w=>(w.msg||w.message))
    .map(w=>({...w, voteCount: votes[String(w.ts||w.timestamp||w.senderName||w.msg)]||0}))
    .sort((a,b)=>b.voteCount-a.voteCount)
    .slice(0,5);
  const maxV = Math.max(...wWithVotes.map(w=>w.voteCount), 1);
  const myVote = localStorage.getItem('myvote_'+empKey);
  const medals = ['🥇','🥈','🥉','4️⃣','5️⃣'];
  listEl.innerHTML = wWithVotes.map((w,i)=>{
    const wid = String(w.ts||w.timestamp||w.senderName||w.msg||i);
    const pct = Math.round(w.voteCount/maxV*100);
    const isVoted = myVote===wid;
    return `<div class="vote-card${isVoted?' voted':''}" onclick="voteWish('${wid.replace(/'/g,"\\'")}')">
      <span class="vote-heart">${medals[i]||'⭐'}</span>
      <div style="flex:1;min-width:0">
        <div class="vote-msg">"${escHtml(w.msg||w.message||'')}"</div>
        <div style="display:flex;align-items:center;gap:.4rem;margin-top:.25rem">
          <div class="vote-bar-wrap"><div class="vote-bar" style="width:${pct}%"></div></div>
          <span style="font-size:.62rem;color:rgba(255,255,255,.35)">❤️ ${w.voteCount}</span>
        </div>
      </div>
    </div>`;
  }).join('');
}

function voteWish(wid) {
  if (!curEmp) return;
  const empKey = curEmp.code||curEmp.name;
  const prev = localStorage.getItem('myvote_'+empKey);
  const votes = JSON.parse(localStorage.getItem('votes_'+empKey)||'{}');
  if (prev === wid) {
    votes[wid] = Math.max(0,(votes[wid]||1)-1);
    localStorage.removeItem('myvote_'+empKey);
    showLikeNotif('💔 ยกเลิกไลก์แล้ว', false);
  } else {
    if (prev) votes[prev] = Math.max(0,(votes[prev]||1)-1);
    votes[wid] = (votes[wid]||0)+1;
    localStorage.setItem('myvote_'+empKey, wid);
    showLikeNotif('❤️ ไลก์คำอวยพรนี้แล้ว!', true);
    spawnHearts();
  }
  localStorage.setItem('votes_'+empKey, JSON.stringify(votes));
  const empId = curEmp.code||curEmp.name;
  const ws = localWishes[empId]||[];
  renderVoteList(ws.slice(0,10));
}

let likeTimer;
function showLikeNotif(msg, isLike) {
  const el = document.getElementById('likeNotif');
  if (!el) return;
  el.innerHTML = (isLike?'❤️ ':'💔 ') + msg;
  el.style.borderColor = isLike ? '#ff6b9d' : '#888';
  el.style.color = isLike ? '#ff6b9d' : 'rgba(255,255,255,.5)';
  el.style.background = isLike ? 'rgba(255,107,157,.15)' : 'rgba(255,255,255,.05)';
  el.classList.add('show');
  clearTimeout(likeTimer);
  likeTimer = setTimeout(()=>el.classList.remove('show'), 2200);
}

function spawnHearts() {
  const colors = ['❤️','💖','💝','💗','🌸'];
  for (let i=0;i<6;i++) {
    setTimeout(()=>{
      const h = document.createElement('div');
      h.className = 'like-heart-fly';
      h.textContent = colors[~~(Math.random()*colors.length)];
      h.style.left = (30+Math.random()*40)+'vw';
      h.style.bottom = '80px';
      h.style.animationDelay = Math.random()*0.3+'s';
      document.body.appendChild(h);
      setTimeout(()=>h.remove(), 1400);
    }, i*80);
  }
}


// ══════════════════════════════════════════════════
// CUSTOM QUIZ QUESTIONS (ADMIN)
// ══════════════════════════════════════════════════
function getCustomQuestions(empKey) {
  return JSON.parse(localStorage.getItem('customQ_'+(empKey||''))||'[]');
}
function saveCustomQuestions(empKey, qs) {
  localStorage.setItem('customQ_'+(empKey||''), JSON.stringify(qs));
}

function renderCustomQList() {
  const el = document.getElementById('customQList');
  if (!el) return;
  const empKey = curEmp ? (curEmp.code||curEmp.name) : '';
  const qs = getCustomQuestions(empKey);
  if (!qs.length) {
    el.innerHTML = '<div style="font-size:.72rem;color:rgba(255,255,255,.25);padding:.25rem">ยังไม่มีคำถามของตัวเอง</div>';
    return;
  }
  el.innerHTML = qs.map((q,i) => `
    <div class="qe-item">
      <span class="qe-item-q" title="${q.q}">${i+1}. ${q.q}</span>
      <button class="qe-del" onclick="deleteCustomQ(${i})" title="ลบ">✕</button>
    </div>`).join('');
}

function addCustomQuestion() {
  const q  = document.getElementById('qeQuestion').value.trim();
  const o1 = document.getElementById('qeOpt1').value.trim();
  const o2 = document.getElementById('qeOpt2').value.trim();
  const o3 = document.getElementById('qeOpt3').value.trim();
  const o4 = document.getElementById('qeOpt4').value.trim();
  if (!q || !o1 || !o2) { showToast('กรอกคำถาม + ตัวเลือก 1-2 ก่อนนะ','warn'); return; }
  const empKey = curEmp ? (curEmp.code||curEmp.name) : '';
  const allOpts = [o1, o2, o3, o4];
  const correctIdx = Number((document.querySelector('input[name="qeCorrect"]:checked')||{}).value || 0);
  const ans = allOpts[correctIdx];
  if (!ans) { showToast('ตัวเลือกที่เลือกเป็นคำตอบที่ถูกต้องยังไม่ได้กรอก','warn'); return; }
  const opts = allOpts.filter(Boolean);
  const qs = getCustomQuestions(empKey);
  qs.push({ q, opts, ans });
  saveCustomQuestions(empKey, qs);
  // Clear inputs
  ['qeQuestion','qeOpt1','qeOpt2','qeOpt3','qeOpt4'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.querySelector('input[name="qeCorrect"][value="0"]').checked = true;
  renderCustomQList();
  startGame();
  showToast('เพิ่มคำถามแล้ว! ' + qs.length + ' คำถามทั้งหมด');
}

function deleteCustomQ(idx) {
  const empKey = curEmp ? (curEmp.code||curEmp.name) : '';
  const qs = getCustomQuestions(empKey);
  qs.splice(idx, 1);
  saveCustomQuestions(empKey, qs);
  renderCustomQList();
  showToast('ลบคำถามแล้ว');
}

// Combine auto-generated questions with admin's custom questions
function generateQuestions(emp) {
  const auto = generateQuestionsAuto(emp);
  const empKey = emp ? (emp.code||emp.name) : '';
  const custom = getCustomQuestions(empKey).map(q => ({
    ...q,
    opts: [...q.opts].sort(()=>Math.random()-.5), // shuffle options
  }));
  // Interleave: auto first, then custom, shuffle together
  const all = [...auto, ...custom].sort(()=>Math.random()-.5);
  return all;
}

// customQList rendered inside enterAdmin directly


// ══════════════════════════════════════════════════
// LEADERBOARD
// ══════════════════════════════════════════════════
function switchLbTab(tab) {
  lbTab = tab;
  document.getElementById('lbTabGame').classList.toggle('active', tab==='game');
  document.getElementById('lbTabLike').classList.toggle('active', tab==='like');
  renderLeaderboard();
}

function saveGameScore(playerName, score, total) {
  const empKey = curEmp ? (curEmp.code||curEmp.name) : 'general';
  const key = 'lbGame_' + empKey;
  const board = JSON.parse(localStorage.getItem(key)||'[]');
  const ts = new Date().toLocaleString('th-TH');
  const existing = board.find(r=>r.name===playerName);
  if (existing) {
    existing.score = Math.max(existing.score||0, score);
    existing.games = (existing.games||0) + 1;
    existing.lastScore = score;
    existing.lastTs = ts;
  } else {
    board.push({name:playerName, score, games:1, lastScore:score, lastTs:ts});
  }
  board.sort((a,b)=>b.score-a.score);
  localStorage.setItem(key, JSON.stringify(board.slice(0,50)));
  renderLeaderboard();
  renderParticipants();
  // Show wheel and participants
  const ps = document.getElementById('partSection');
  const ws = document.getElementById('wheelSection');
  if(ps) ps.style.display='block';
  if(ws) ws.style.display='block';
  drawWheel();
  syncQuizResult(playerName, score, total, ts);
}

// ─── SYNC QUIZ RESULT TO GOOGLE SHEET ─────────────────────
async function syncQuizResult(playerName, score, total, ts) {
  if (!getApiUrl()) return;
  const result = {
    action: 'addQuizResult',
    empCode: curEmp ? (curEmp.code||'') : '',
    empName: curEmp ? curEmp.name : '',
    playerName, score, total, ts
  };
  const r = await apiPost(result);
  if (!r || r.error) {
    pendingQueue.push(result);
    localStorage.setItem('sml_pending', JSON.stringify(pendingQueue));
  }
}

function renderLeaderboard() {
  const el = document.getElementById('lbList');
  if (!el) return;
  const empKey = curEmp ? (curEmp.code||curEmp.name) : 'general';
  const medals = ['🥇','🥈','🥉'];

  if (lbTab === 'game') {
    const board = JSON.parse(localStorage.getItem('lbGame_'+empKey)||'[]');
    if (!board.length) {
      el.innerHTML='<div class="lb-empty">ยังไม่มีคะแนน — เล่นเกมเพื่อขึ้นกระดาน!</div>'; return;
    }
    el.innerHTML = board.slice(0,10).map((r,i)=>`
      <div class="lb-row">
        <span class="lb-rank">${medals[i]||'#'+(i+1)}</span>
        <div class="lb-ava">${r.name.substring(0,2)}</div>
        <div class="lb-name">${escHtml(r.name)}</div>
        <div class="lb-score">${r.score} แต้ม · ${r.games} รอบ</div>
      </div>`).join('');
  } else {
    // Like leaderboard: who sent most-liked wishes
    const votes = JSON.parse(localStorage.getItem('votes_'+empKey)||'{}');
    const wishes = localWishes[empKey]||[];
    const senderVotes = {};
    wishes.forEach(w=>{
      const wid = String(w.ts||w.timestamp||w.senderName||w.msg);
      const v = votes[wid]||0;
      const sender = w.senderName||w.name||'ไม่ระบุ';
      senderVotes[sender] = (senderVotes[sender]||0) + v;
    });
    const sorted = Object.entries(senderVotes).sort((a,b)=>b[1]-a[1]).filter(e=>e[1]>0);
    if (!sorted.length) {
      el.innerHTML='<div class="lb-empty">ยังไม่มีคะแนนไลก์ — ส่งคำอวยพรให้คนอื่นโหวต!</div>'; return;
    }
    el.innerHTML = sorted.slice(0,10).map(([name,v],i)=>`
      <div class="lb-row">
        <span class="lb-rank">${medals[i]||'#'+(i+1)}</span>
        <div class="lb-ava">${name.substring(0,2)}</div>
        <div class="lb-name">${escHtml(name)}</div>
        <div class="lb-score">❤️ ${v} ไลก์</div>
      </div>`).join('');
  }
}


function doSaveScore(s, total) {
  const inp = document.getElementById('lbNameInput');
  const name = inp ? inp.value.trim() : localStorage.getItem('playerName');
  if (name) {
    localStorage.setItem('playerName', name);
    saveGameScore(name, s, total);
    showToast('บันทึกคะแนนแล้ว! ดู 🏆 กระดานด้านล่าง');
  }
}

function autoSaveThenRestart() {
  // Scroll to wish form so user fills in name
  const wf = document.getElementById('wish-form');
  if (wf) {
    wf.scrollIntoView({behavior:'smooth', block:'center'});
    // Highlight the name input
    const inp = document.getElementById('wf-name');
    if (inp) {
      inp.focus();
      inp.style.borderColor = '#f5c842';
      inp.placeholder = 'กรอกชื่อที่นี่ก่อนเพื่อขึ้นกระดานคะแนน...';
      setTimeout(()=>{ inp.style.borderColor=''; inp.placeholder='ชื่อ-นามสกุล หรือ ชื่อเล่น'; }, 3000);
    }
  }
  showToast('กรอกชื่อในช่อง "เขียนคำอวยพร" ด้านล่างนะครับ');
}


// ══════════════════════════════════════════════════
// PARTICIPANTS LIST
// ══════════════════════════════════════════════════
function renderParticipants() {
  const empKey = curEmp ? (curEmp.code||curEmp.name) : 'general';
  const board = JSON.parse(localStorage.getItem('lbGame_'+empKey)||'[]');
  const grid = document.getElementById('partGrid');
  const cnt  = document.getElementById('partCount');
  if (!grid) return;
  const ps = document.getElementById('partSection');
  const ws = document.getElementById('wheelSection');
  if (!board.length) {
    if(ps) ps.style.display='none';
  } else {
    if(ps) ps.style.display='block';
    if(cnt) cnt.textContent = board.length + ' คน';
    const winner = localStorage.getItem('wheelWinner_'+empKey)||'';
    grid.innerHTML = board.map(r=>`
      <div class="part-chip${r.name===winner?' winner':''}">
        ${r.name===winner?'🏆 ':''}${escHtml(r.name)}
        <span style="opacity:.5;font-size:.65rem">${r.score}แต้ม</span>
      </div>`).join('');
  }
  const wheelNames = getWheelParticipants();
  if (ws) ws.style.display = wheelNames.length ? 'block' : 'none';
  updateWmcConfirm();
  drawWheel();
}

// ══════════════════════════════════════════════════
// WHEEL OF FORTUNE
// ══════════════════════════════════════════════════
const WHEEL_COLORS = [
  '#E94560','#F5A623','#7ED321','#4A90D9','#9B59B6',
  '#1ABC9C','#E67E22','#E91E63','#00BCD4','#8BC34A',
  '#FF5722','#3F51B5','#009688','#FF9800','#673AB7'
];
let wheelAngle = 0;
let wheelSpinning = false;

function getWheelScopeKey(){
  return getWheelMonths().slice().sort((a,b)=>a-b).join('-') || 'none';
}

function getWheelParticipants() {
  const months = getWheelMonths();
  const byName = new Map();
  calPersons.forEach(p=>{
    if (!months.includes(p.month)) return;
    const empKey = p.code || p.name;
    const board = JSON.parse(localStorage.getItem('lbGame_'+empKey)||'[]');
    board.forEach(r=>{
      const existing = byName.get(r.name);
      if (!existing || r.score > existing.score) byName.set(r.name, r);
    });
  });
  return Array.from(byName.values());
}

function getWheelNames() {
  return getWheelParticipants().map(r=>r.name);
}

function drawWheel(highlightIdx=-1) {
  const canvas = document.getElementById('wheelCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const names = getWheelNames();
  if (!names.length) {
    ctx.clearRect(0,0,260,260);
    // Draw decorative empty wheel
    const emptyColors=['#2a1a4e','#3d2a6e','#2a1a5e','#1a2a5e','#2a3a6e','#1a3a4e','#3a2a5e','#2a3a5e'];
    const emptyLabels=['🎂','🎉','🌟','🎁','🥳','✨','💖','🎊'];
    const eArc = Math.PI*2/8;
    for(let i=0;i<8;i++){
      ctx.beginPath(); ctx.moveTo(130,130);
      ctx.arc(130,130,120,i*eArc,(i+1)*eArc); ctx.closePath();
      ctx.fillStyle=emptyColors[i]; ctx.fill();
      ctx.strokeStyle='rgba(245,200,66,.2)'; ctx.lineWidth=1; ctx.stroke();
      ctx.save(); ctx.translate(130,130); ctx.rotate(i*eArc+eArc/2);
      ctx.font='18px sans-serif'; ctx.textAlign='right';
      ctx.fillText(emptyLabels[i],105,6); ctx.restore();
    }
    ctx.beginPath(); ctx.arc(130,130,22,0,Math.PI*2);
    ctx.fillStyle='#0f0c1d'; ctx.fill();
    ctx.strokeStyle='#f5c842'; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle='#f5c842'; ctx.font='bold 10px Kanit,sans-serif';
    ctx.textAlign='center'; ctx.fillText('SML',130,134);
    // Center text
    ctx.fillStyle='rgba(255,255,255,.4)'; ctx.font='13px Kanit,sans-serif';
    ctx.fillText('เลือกพนักงาน',130,180);
    ctx.font='11px Kanit,sans-serif'; ctx.fillStyle='rgba(255,255,255,.25)';
    ctx.fillText('แล้วเล่นเกมเพื่อขึ้นวงล้อ',130,198);
    return;
  }
  const n = names.length;
  const arc = (Math.PI*2)/n;
  ctx.clearRect(0,0,260,260);

  for (let i=0;i<n;i++) {
    const start = wheelAngle + i*arc;
    const end   = start + arc;
    const color = WHEEL_COLORS[i%WHEEL_COLORS.length];
    // Sector
    ctx.beginPath();
    ctx.moveTo(130,130);
    ctx.arc(130,130,120,start,end);
    ctx.closePath();
    ctx.fillStyle = i===highlightIdx ? '#f5c842' : color;
    ctx.fill();
    ctx.strokeStyle='rgba(0,0,0,.15)';
    ctx.lineWidth=1.5;
    ctx.stroke();
    // Text
    ctx.save();
    ctx.translate(130,130);
    ctx.rotate(start + arc/2);
    ctx.textAlign='right';
    ctx.fillStyle='#fff';
    ctx.font=`${Math.min(13, 200/n)}px Kanit,sans-serif`;
    ctx.shadowColor='rgba(0,0,0,.5)';
    ctx.shadowBlur=3;
    const name = names[i].split(' ')[0]; // first name only
    const maxLen = Math.floor(100/Math.max(8,name.length));
    ctx.fillText(name.substring(0,maxLen+(maxLen<name.length?-1:0))+(name.length>maxLen?'…':''), 110, 5);
    ctx.restore();
  }
  // Center circle
  ctx.beginPath();
  ctx.arc(130,130,22,0,Math.PI*2);
  ctx.fillStyle='#1a0a2e';
  ctx.fill();
  ctx.strokeStyle='#f5c842';
  ctx.lineWidth=2;
  ctx.stroke();
  ctx.fillStyle='#f5c842';
  ctx.font='bold 11px Kanit,sans-serif';
  ctx.textAlign='center';
  ctx.fillText('SML',130,134);
}

function spinWheel() {
  if (!document.body.classList.contains('admin-mode')) {
    showToast('เฉพาะ Admin เท่านั้นที่กดหมุนได้ครับ','warn'); return;
  }
  const names = getWheelNames();
  if (!names.length || wheelSpinning) return;
  wheelSpinning = true;
  const btn = document.getElementById('wheelSpinBtn');
  const resEl = document.getElementById('wheelResult');
  btn.disabled = true;
  btn.textContent = '🌀 กำลังหมุน...';
  if(resEl) resEl.textContent = '';

  // Pick random winner
  const winIdx = Math.floor(Math.random()*names.length);
  const arc = (Math.PI*2)/names.length;
  // Calculate target angle: pointer at top = -π/2, sector center at winIdx
  const targetSectorAngle = -(winIdx * arc + arc/2) - Math.PI/2;
  const spins = 5 + Math.random()*4; // 5-9 full rotations
  const totalRot = spins * Math.PI*2 + ((targetSectorAngle - wheelAngle) % (Math.PI*2));
  const duration = 4500;
  const startAngle = wheelAngle;
  const start = performance.now();

  function animate(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed/duration, 1);
    // Ease out cubic
    const ease = 1 - Math.pow(1-progress, 3);
    wheelAngle = startAngle + totalRot * ease;
    drawWheel();
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      wheelAngle = startAngle + totalRot;
      drawWheel(winIdx);
      wheelSpinning = false;
      btn.disabled = false;
      btn.textContent = '🎡 หมุนอีกครั้ง!';
      const winner = names[winIdx];
      if(resEl) resEl.innerHTML = `🏆 ผู้โชคดีคือ <span style="color:#f5c842;font-weight:600">${escHtml(winner)}</span>!`;
      // Save winner (scoped to the currently pooled wheel months)
      localStorage.setItem('wheelWinner_months_'+getWheelScopeKey(), winner);
      renderParticipants();
      fireConfetti();
      showToast('🏆 ผู้โชคดี: ' + winner);
    }
  }
  requestAnimationFrame(animate);
}

// ══════════════════════════════════════════════════
// EXPORT SCORES TO EXCEL
// ══════════════════════════════════════════════════
function exportScoresExcel() {
  if (!document.body.classList.contains('admin-mode')) {
    showToast('เฉพาะ Admin เท่านั้นครับ','warn'); return;
  }
  if (typeof XLSX==='undefined') {
    const s=document.createElement('script');
    s.src='https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    s.onload=exportScoresExcel; document.head.appendChild(s); return;
  }
  const empKey = curEmp ? (curEmp.code||curEmp.name) : 'general';
  const empName = curEmp ? curEmp.name : 'ทั้งหมด';
  const board = JSON.parse(localStorage.getItem('lbGame_'+empKey)||'[]');
  const winner = localStorage.getItem('wheelWinner_'+empKey)||'';

  const wb = XLSX.utils.book_new();

  // Sheet 1: Scores
  const hdr = [['อันดับ','ชื่อ','คะแนนสูงสุด','จำนวนครั้งที่เล่น','คะแนนล่าสุด','วันที่','ผู้โชคดี']];
  const rows = board.map((r,i)=>[
    i+1, r.name, r.score, r.games, r.lastScore||r.score,
    r.lastTs||'', r.name===winner?'🏆 ผู้โชคดี':''
  ]);
  const ws1 = XLSX.utils.aoa_to_sheet([...hdr,...rows]);
  ws1['!cols']=[{wch:6},{wch:24},{wch:14},{wch:16},{wch:14},{wch:20},{wch:14}];
  XLSX.utils.book_append_sheet(wb,ws1,'คะแนนเกม');

  // Sheet 2: Summary
  const summary = [
    ['เกมวันเกิด','คุณเป็นแฟนพันธุ์แท้ของ '+empName+' หรือไม่?'],
    ['จำนวนผู้เข้าร่วม',board.length],
    ['ผู้โชคดี (วงล้อ)',winner||'ยังไม่ได้สุ่ม'],
    ['คะแนนสูงสุด',board[0]?board[0].score:'—'],
    ['ผู้ชนะ',board[0]?board[0].name:'—'],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(summary);
  ws2['!cols']=[{wch:20},{wch:40}];
  XLSX.utils.book_append_sheet(wb,ws2,'สรุป');

  const fname = 'SML_Game_Score_'+empName.replace(/\s+/g,'_')+'_'+new Date().toLocaleDateString('th-TH').replace(/\//g,'-')+'.xlsx';
  XLSX.writeFile(wb, fname);
  showToast('Export คะแนนสำเร็จ!');
}


// ══════════════════════════════════════════════════
// ADMIN AUTH & SETTINGS
// ══════════════════════════════════════════════════
function getMasterKey(){
  let mk = localStorage.getItem('adminMasterKey');
  if (!mk) {
    // Generate random 8-char key on first use
    mk = Math.random().toString(36).substring(2,6).toUpperCase() +
         Math.random().toString(36).substring(2,6).toUpperCase();
    localStorage.setItem('adminMasterKey', mk);
  }
  return mk;
}

function showAdminLoginModal(){
  const m = document.getElementById('loginModal');
  if(m){ m.style.display='flex'; setTimeout(()=>document.getElementById('loginPassInput').focus(),100); }
}

function doLogin(){
  const inp = document.getElementById('loginPassInput');
  if(!inp) return;
  const pw = inp.value;
  if(pw === getAdminPass() || pw === getMasterKey()){
    inp.value='';
    document.getElementById('loginModal').style.display='none';
    enterAdmin();
  } else {
    inp.style.borderColor='#ff6b9d';
    inp.value='';
    inp.placeholder='รหัสไม่ถูกต้อง ลองใหม่...';
    setTimeout(()=>{ inp.style.borderColor=''; inp.placeholder='ใส่รหัส Admin...'; },2000);
    showToast('รหัสไม่ถูกต้องครับ','warn');
  }
}

function showAdminSettings(){
  const m = document.getElementById('settingsModal');
  if(m){ m.style.display='flex'; }
  // Clear fields
  ['settOldPass','settNewPass','settConfPass'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value='';
  });
  const sm = document.getElementById('settSuccessMsg');
  if(sm) sm.style.display='none';
  const mkd = document.getElementById('masterKeyDisplay');
  if(mkd) mkd.textContent='••••••••';
}

function changePassword(){
  const old   = (document.getElementById('settOldPass')||{value:''}).value;
  const nw    = (document.getElementById('settNewPass')||{value:''}).value;
  const conf  = (document.getElementById('settConfPass')||{value:''}).value;
  const sm    = document.getElementById('settSuccessMsg');

  if(old !== getAdminPass() && old !== getMasterKey()){
    showToast('รหัสเดิมไม่ถูกต้อง','warn'); return;
  }
  if(nw.length < 4){ showToast('รหัสใหม่ต้องมีอย่างน้อย 4 ตัว','warn'); return; }
  if(nw !== conf){ showToast('รหัสยืนยันไม่ตรงกัน','warn'); return; }

  setAdminPass(nw);
  ['settOldPass','settNewPass','settConfPass'].forEach(id=>{
    const el=document.getElementById(id); if(el) el.value='';
  });
  if(sm){ sm.style.display='block'; setTimeout(()=>sm.style.display='none',3000); }
  showToast('เปลี่ยนรหัสผ่านสำเร็จ!');
}

function showMasterKey(){
  const mk = getMasterKey();
  const el = document.getElementById('masterKeyDisplay');
  if(el){
    if(el.textContent==='••••••••'){
      el.textContent = mk;
      showToast('Master Key: ' + mk + ' — จำไว้ด้วยนะครับ');
    } else {
      el.textContent='••••••••';
    }
  }
}

function showForgotPass(){
  document.getElementById('loginModal').style.display='none';
  const m = document.getElementById('forgotModal');
  if(m){ m.style.display='flex'; setTimeout(()=>document.getElementById('forgotMasterKey').focus(),100); }
}

function resetWithMasterKey(){
  const mk  = (document.getElementById('forgotMasterKey')||{value:''}).value;
  const nw  = (document.getElementById('forgotNewPass')||{value:''}).value;
  if(mk !== getMasterKey()){ showToast('Master Key ไม่ถูกต้อง','warn'); return; }
  if(nw.length < 4){ showToast('รหัสใหม่ต้องมีอย่างน้อย 4 ตัว','warn'); return; }
  setAdminPass(nw);
  document.getElementById('forgotModal').style.display='none';
  showToast('รีเซ็ตรหัสผ่านสำเร็จ! รหัสใหม่: ' + nw);
  // Auto open login modal
  setTimeout(showAdminLoginModal, 1000);
}

