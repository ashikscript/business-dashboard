// ===== FIREBASE CONFIG =====
const firebaseConfig = {
  apiKey: "AIzaSyBcRFtlxPDLNky9TYw0b0uw0umO9CveVx0",
  authDomain: "business-dashboard-3c595.firebaseapp.com",
  databaseURL: "https://business-dashboard-3c595-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "business-dashboard-3c595",
  storageBucket: "business-dashboard-3c595.firebasestorage.app",
  messagingSenderId: "54477116171",
  appId: "1:54477116171:web:6f4ba160cbeefb32abc80e"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const FB_PATH = 'bizdata/owner';
let _cache = null;
let _syncStarted = false;
let _appStarted = false;

// ===== DATA =====
function defaultData() {
  return { sales:[], trash:[], dueWA:0, dueTG:0, dueLog:[], stock:0, stockLog:[], expenses:[], lastReset:null, sup1Due:0, sup2Due:0, supLog:[], sup1Name:'Supplier 1', sup2Name:'Supplier 2', bankTransfers:[] };
}
function getData() {
  if (_cache) return JSON.parse(JSON.stringify(_cache));
  try { return JSON.parse(localStorage.getItem('biz_v4')) || defaultData(); }
  catch(e) { return defaultData(); }
}
function setData(d) {
  // Ensure no undefined/null arrays (Firebase doesn't like them)
  d.sales = d.sales || [];
  d.trash = d.trash || [];
  d.dueLog = d.dueLog || [];
  d.stockLog = d.stockLog || [];
  d.expenses = d.expenses || [];
  d.dueWA = d.dueWA || 0;
  d.dueTG = d.dueTG || 0;
  d.stock = d.stock || 0;
  d.sup1Due = d.sup1Due || 0;
  d.sup2Due = d.sup2Due || 0;
  d.supLog = d.supLog || [];
  d.sup1Name = d.sup1Name || 'Supplier 1';
  d.sup2Name = d.sup2Name || 'Supplier 2';
  d.bankTransfers = d.bankTransfers || [];
  // Remove undefined values (Firebase rejects them)
  const clean = JSON.parse(JSON.stringify(d));
  _cache = clean;
  localStorage.setItem('biz_v4', JSON.stringify(clean));
  db.ref(FB_PATH).set(clean).catch(e => console.error('Firebase write error:', e));
}
function startFirebaseSync() {
  if (_syncStarted) return;
  _syncStarted = true;
  db.ref(FB_PATH).on('value', snap => {
    const val = snap.val();
    if (val && typeof val === 'object') {
      val.sales = val.sales || [];
      val.trash = val.trash || [];
      val.dueLog = val.dueLog || [];
      val.stockLog = val.stockLog || [];
      val.expenses = val.expenses || [];
      val.dueWA = val.dueWA || 0;
      val.dueTG = val.dueTG || 0;
      val.stock = val.stock || 0;
      val.sup1Due = val.sup1Due || 0;
      val.sup2Due = val.sup2Due || 0;
      val.supLog = val.supLog || [];
      val.sup1Name = val.sup1Name || 'Supplier 1';
      val.sup2Name = val.sup2Name || 'Supplier 2';
      val.bankTransfers = val.bankTransfers || [];
      _cache = val;
      localStorage.setItem('biz_v4', JSON.stringify(val));
      if (val.pin) localStorage.setItem('biz_pin', val.pin);
      // Always re-render when Firebase pushes new data
      if (_appStarted) renderAll();
    } else {
      const local = getData();
      if (local && local.lastReset) {
        db.ref(FB_PATH).set(local);
      }
    }
  }, err => {
    console.error('Firebase sync error:', err);
  });
}

// ===== AUTH =====
const PIN_KEY = 'biz_pin';
const SESSION_KEY = 'biz_session';
const SESSION_DAYS = 7;

function getPin() {
  if (_cache && _cache.pin) return _cache.pin;
  return localStorage.getItem(PIN_KEY) || '1234';
}
function isSessionValid() {
  const s = localStorage.getItem(SESSION_KEY);
  if (!s) return false;
  return (Date.now() - parseInt(s)) < SESSION_DAYS * 24 * 60 * 60 * 1000;
}
function saveSession() { localStorage.setItem(SESSION_KEY, Date.now().toString()); }
function clearSession() { localStorage.removeItem(SESSION_KEY); }

function showApp() {
  document.getElementById('loginScreen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  const footer = document.getElementById('siteFooter');
  if (footer) footer.style.display = 'block';
  if (!_appStarted) { _appStarted = true; initApp(); }
}

function checkLogin() {
  const entered = document.getElementById('pinInput').value;
  const loginBtn = document.querySelector('#loginScreen .btn-primary');
  const loginErr = document.getElementById('loginErr');
  loginErr.style.display = 'none';

  // Always fetch PIN from Firebase first to ensure cross-device sync
  if (loginBtn) { loginBtn.textContent = 'Checking...'; loginBtn.disabled = true; }
  db.ref(FB_PATH + '/pin').once('value').then(snap => {
    const firebasePin = snap.val();
    if (firebasePin) localStorage.setItem(PIN_KEY, firebasePin);
    const correctPin = firebasePin || localStorage.getItem(PIN_KEY) || '1234';
    if (entered === correctPin) {
      saveSession();
      showApp();
    } else {
      loginErr.style.display = 'block';
      document.getElementById('pinInput').value = '';
    }
  }).catch(() => {
    // Firebase failed, fall back to local
    if (entered === getPin()) {
      saveSession();
      showApp();
    } else {
      loginErr.style.display = 'block';
      document.getElementById('pinInput').value = '';
    }
  }).finally(() => {
    if (loginBtn) { loginBtn.textContent = 'Enter'; loginBtn.disabled = false; }
  });
}

document.getElementById('pinInput').addEventListener('keydown', e => { if(e.key==='Enter') checkLogin(); });

function logout() {
  clearSession();
  _appStarted = false;
  _syncStarted = false;
  _cache = null;
  document.getElementById('app').style.display = 'none';
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('pinInput').value = '';
  document.getElementById('loginErr').style.display = 'none';
  const footer = document.getElementById('siteFooter');
  if (footer) footer.style.display = 'none';
  // Stop Firebase listener
  db.ref(FB_PATH).off();
}

function changePin() {
  const np = document.getElementById('newPin').value;
  const cp = document.getElementById('confirmPin').value;
  const msg = document.getElementById('pinMsg');
  if (np.length < 4) { msg.style.color='var(--accent3)'; msg.textContent='PIN must be at least 4 digits.'; return; }
  if (np !== cp) { msg.style.color='var(--accent3)'; msg.textContent='PINs do not match.'; return; }
  localStorage.setItem(PIN_KEY, np);
  const d = getData(); d.pin = np; setData(d);
  msg.style.color='var(--accent2)'; msg.textContent='PIN updated on all devices! ✅';
  document.getElementById('newPin').value='';
  document.getElementById('confirmPin').value='';
}

// ===== HELPERS =====
function todayStr() {
  // Use local date (Bangladesh UTC+6), not UTC
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth()+1).padStart(2,'0');
  const day = String(d.getDate()).padStart(2,'0');
  return y+'-'+m+'-'+day;
}
function monthStr() { return todayStr().slice(0,7); }
function fmt(n) {
  const num = Math.round(n||0);
  return '৳' + num.toLocaleString('en-IN');
}
function timeStr() { return new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',hour12:true}); }
function fmtDate(s) {
  if (!s) return '';
  // Parse date string directly to avoid timezone issues
  const parts = s.split('-');
  if (parts.length === 3) {
    const d = new Date(parseInt(parts[0]), parseInt(parts[1])-1, parseInt(parts[2]));
    return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
  }
  return s;
}
function actionBtns(editFn, delFn) {
  return `<td><button class="act-btn" onclick="${editFn}" title="Edit">✏️</button> <button class="act-btn del" onclick="${delFn}" title="Delete">🗑</button></td>`;
}

// ===== INIT =====
function initApp() {
  cleanTrash();
  checkMidnightReset();
  renderDate();
  startFirebaseSync(); // Start listener first - it will call renderAll() when data arrives
  renderAll();         // Also render local data immediately so UI isn't blank
  setInterval(checkMidnightReset, 60000);
}

function checkMidnightReset() {
  const d = getData();
  const today = todayStr();
  if (d.lastReset !== today) {
    d.lastReset = today;
    setData(d);
    renderAll(); // refresh display on new day
  }
  const el = document.getElementById('lastReset');
  if (el) el.textContent = d.lastReset || '-';
}

function cleanTrash() {
  const d = getData();
  const now = Date.now();
  const before = (d.trash||[]).length;
  d.trash = (d.trash||[]).filter(t => (now-(t.deletedAt||0)) < 30*24*60*60*1000);
  if (d.trash.length !== before) setData(d);
}

function renderDate() {
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const d = new Date();
  const el = document.getElementById('todayLabel');
  if (el) el.textContent = days[d.getDay()]+', '+d.getDate()+' '+months[d.getMonth()]+' '+d.getFullYear();
}

function renderAll() {
  renderSummary();
  renderTodaySales();
  renderDue();
  renderStock();
  renderTrash();
  renderExpenseSummary();
  renderExpenseList();
  renderSupplier();
  renderBankTransfer();
  if (document.getElementById('tab-history')?.classList.contains('active')) renderHistory();
  if (document.getElementById('tab-reports')?.classList.contains('active')) renderReports();
}

// ===== SUMMARY =====
function renderSummary() {
  const d = getData();
  const today = todayStr();
  const month = monthStr();
  const sales = d.sales || [];
  const todaySales = sales.filter(s=>s.date===today);
  const wS = todaySales.filter(s=>s.channel==='website');
  const tS = todaySales.filter(s=>s.channel==='telegram');
  const wAmt = wS.reduce((a,s)=>a+s.amount,0);
  const tAmt = tS.reduce((a,s)=>a+s.amount,0);
  const wProfit = wS.reduce((a,s)=>a+(s.amount-s.cost),0);
  const tProfit = tS.reduce((a,s)=>a+(s.amount-s.cost),0);
  const todayProfit = todaySales.reduce((a,s)=>a+(s.amount-s.cost),0);
  const totalDue = (d.dueWA||0)+(d.dueTG||0);
  const monthSales = sales.filter(s=>s.date&&s.date.startsWith(month));
  const monthProfit = monthSales.reduce((a,s)=>a+(s.amount-s.cost),0);
  const todayExp = (d.expenses||[]).filter(e=>e.date===today).reduce((a,e)=>a+e.amount,0);
  const monthExp = (d.expenses||[]).filter(e=>e.date&&e.date.startsWith(month)).reduce((a,e)=>a+e.amount,0);
  const netProfit = todayProfit - todayExp;
  const el = document.getElementById('summaryGrid');
  if (!el) return;
  el.innerHTML = `
    <div class="sum-card"><div class="sum-label">Website Sales</div><div class="sum-val green">${fmt(wAmt)}</div></div>
    <div class="sum-card"><div class="sum-label">Telegram Sales</div><div class="sum-val green">${fmt(tAmt)}</div></div>
    <div class="sum-card"><div class="sum-label">Website Profit</div><div class="sum-val purple">${fmt(wProfit)}</div></div>
    <div class="sum-card"><div class="sum-label">Telegram Profit</div><div class="sum-val purple">${fmt(tProfit)}</div></div>
    <div class="sum-card"><div class="sum-label">Today Expense</div><div class="sum-val red">${fmt(todayExp)}</div></div>
    <div class="sum-card"><div class="sum-label">Total Due</div><div class="sum-val red">${fmt(totalDue)}</div></div>
    <div class="sum-card"><div class="sum-label">Stock Value</div><div class="sum-val amber">${fmt(d.stock||0)}</div></div>
    <div class="sum-card"><div class="sum-label">Net Profit Today</div><div class="sum-val ${netProfit>=0?'green':'red'}">${fmt(netProfit)}</div></div>
    <div class="sum-card"><div class="sum-label">Monthly Expense</div><div class="sum-val red">${fmt(monthExp)}</div></div>
    <div class="sum-card"><div class="sum-label">Monthly Profit</div><div class="sum-val ${monthProfit>=0?'green':'red'}">${fmt(monthProfit)}</div></div>
    <div class="sum-card" style="border-color:rgba(255,201,71,.3);"><div class="sum-label">${d.sup1Name||'Supplier 1'} Due</div><div class="sum-val ${(d.sup1Due||0)>0?'red':'green'}">${fmt(d.sup1Due||0)}</div></div>
    <div class="sum-card" style="border-color:rgba(255,201,71,.3);"><div class="sum-label">${d.sup2Name||'Supplier 2'} Due</div><div class="sum-val ${(d.sup2Due||0)>0?'red':'green'}">${fmt(d.sup2Due||0)}</div></div>
  `;
}

// ===== SALES =====
let editingId = null;

// Profit টাইপ করলে Cost auto-calculate
function syncSaleCost() {
  const amt = parseFloat(document.getElementById('f-amt').value) || 0;
  const profit = parseFloat(document.getElementById('f-profit').value) || 0;
  const cost = Math.max(0, amt - profit);
  document.getElementById('f-cost').value = cost > 0 ? cost : '';
}
// Amount টাইপ করলে Profit দেওয়া থাকলে Cost update
function syncSaleProfit() {
  const profit = document.getElementById('f-profit').value;
  if (profit !== '') syncSaleCost();
}

function addSale() {
  const desc = document.getElementById('f-desc').value.trim();
  const amt = parseFloat(document.getElementById('f-amt').value)||0;
  const profitVal = document.getElementById('f-profit').value;
  let cost;
  if (profitVal !== '') {
    // profit দেওয়া থাকলে cost = amount - profit
    cost = Math.max(0, amt - (parseFloat(profitVal)||0));
  } else {
    cost = parseFloat(document.getElementById('f-cost').value)||0;
  }
  const chan = document.getElementById('f-chan').value;
  if (!amt) { alert('Please enter an amount!'); return; }
  const d = getData();
  if (!d.sales) d.sales = [];
  d.sales.push({ id:'sale_'+Date.now(), desc, amount:amt, cost, channel:chan, date:todayStr(), time:timeStr() });
  setData(d);
  document.getElementById('f-desc').value = '';
  document.getElementById('f-amt').value = '';
  document.getElementById('f-profit').value = '';
  document.getElementById('f-cost').value = '';
  renderAll();
}

function renderTodaySales() {
  const d = getData();
  const today = todayStr();
  const sales = (d.sales||[]).filter(s=>s.date===today).slice().reverse().slice(0,10);
  const tbody = document.getElementById('todayTbody');
  if (!tbody) return;
  if (!sales.length) { tbody.innerHTML='<tr><td colspan="8" class="empty-row">No sales today yet.</td></tr>'; return; }
  tbody.innerHTML = sales.map((s,i) => {
    const profit = s.amount - s.cost;
    return `<tr>
      <td style="color:var(--muted);font-size:11px;">${i+1}</td>
      <td>${s.desc||'-'}</td>
      <td><span class="badge badge-${s.channel==='website'?'web':'tg'}">${s.channel}</span></td>
      <td style="font-family:var(--mono);">${fmt(s.amount)}</td>
      <td style="font-family:var(--mono);color:var(--muted);">${fmt(s.cost)}</td>
      <td style="font-family:var(--mono);color:${profit>=0?'var(--accent2)':'var(--accent3)'};">${fmt(profit)}</td>
      <td style="font-size:11px;color:var(--muted);">${s.time||''}</td>
      ${actionBtns(`openEditSale('${s.id}')`,`deleteSale('${s.id}')`)}
    </tr>`;
  }).join('');
}

function openEditSale(id) {
  const d = getData();
  const s = (d.sales||[]).find(x=>x.id===id);
  if (!s) return;
  editingId = id;
  document.getElementById('edit-desc').value = s.desc||'';
  document.getElementById('edit-amt').value = s.amount||0;
  document.getElementById('edit-cost').value = s.cost||0;
  document.getElementById('edit-chan').value = s.channel||'website';
  document.getElementById('editModal').style.display = 'flex';
}

function saveEdit() {
  const d = getData();
  const s = (d.sales||[]).find(x=>x.id===editingId);
  if (!s) return;
  s.desc = document.getElementById('edit-desc').value.trim();
  s.amount = parseFloat(document.getElementById('edit-amt').value)||0;
  s.cost = parseFloat(document.getElementById('edit-cost').value)||0;
  s.channel = document.getElementById('edit-chan').value;
  setData(d);
  closeModal('editModal');
  renderAll();
}

function deleteSale(id) {
  if (!confirm('Move to Trash?')) return;
  const d = getData();
  const idx = (d.sales||[]).findIndex(s=>s.id===id);
  if (idx < 0) return;
  const item = d.sales.splice(idx,1)[0];
  item.deletedAt = Date.now();
  item.trashType = 'sale';
  if (!d.trash) d.trash = [];
  d.trash.push(item);
  setData(d);
  renderAll();
}

// ===== HISTORY =====
function renderHistory() {
  const dateVal = document.getElementById('histDate')?.value || '';
  const chanVal = document.getElementById('histChan')?.value || '';
  const d = getData();
  let sales = (d.sales||[]).slice().reverse();
  if (dateVal) sales = sales.filter(s=>s.date===dateVal);
  if (chanVal) sales = sales.filter(s=>s.channel===chanVal);
  const totalAmt = sales.reduce((a,s)=>a+s.amount,0);
  const totalProfit = sales.reduce((a,s)=>a+(s.amount-s.cost),0);
  const hs = document.getElementById('histSummary');
  if (hs) hs.innerHTML = `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:1rem;">
    <div class="sum-card" style="flex:1;min-width:130px;"><div class="sum-label">Total Sales</div><div class="sum-val green">${fmt(totalAmt)}</div></div>
    <div class="sum-card" style="flex:1;min-width:130px;"><div class="sum-label">Total Profit</div><div class="sum-val ${totalProfit>=0?'purple':'red'}">${fmt(totalProfit)}</div></div>
    <div class="sum-card" style="flex:1;min-width:130px;"><div class="sum-label">Transactions</div><div class="sum-val">${sales.length}</div></div>
  </div>`;
  const tbody = document.getElementById('histTbody');
  if (!tbody) return;
  if (!sales.length) { tbody.innerHTML='<tr><td colspan="8" class="empty-row">No data found.</td></tr>'; return; }
  tbody.innerHTML = sales.map(s => {
    const profit = s.amount - s.cost;
    return `<tr>
      <td style="font-size:12px;">${fmtDate(s.date)}</td>
      <td>${s.desc||'-'}</td>
      <td><span class="badge badge-${s.channel==='website'?'web':'tg'}">${s.channel}</span></td>
      <td style="font-family:var(--mono);">${fmt(s.amount)}</td>
      <td style="font-family:var(--mono);color:var(--muted);">${fmt(s.cost)}</td>
      <td style="font-family:var(--mono);color:${profit>=0?'var(--accent2)':'var(--accent3)'};">${fmt(profit)}</td>
      <td style="font-size:11px;color:var(--muted);">${s.time||''}</td>
      ${actionBtns(`openEditSale('${s.id}')`,`deleteSale('${s.id}')`)}
    </tr>`;
  }).join('');
}

// ===== DUE =====
let editingDueId = null;

function updateDue() {
  const platform = document.getElementById('due-platform').value;
  const amt = parseFloat(document.getElementById('due-amt').value)||0;
  const action = document.getElementById('due-action').value;
  const note = document.getElementById('due-note').value.trim();
  if (action !== 'zero' && !amt) { alert('Please enter an amount!'); return; }
  const d = getData();
  const key = platform==='whatsapp' ? 'dueWA' : 'dueTG';
  if (action==='add') d[key] = (d[key]||0)+amt;
  else if (action==='clear') d[key] = Math.max(0,(d[key]||0)-amt);
  else if (action==='set') d[key] = amt;
  else if (action==='zero') d[key] = 0; // set to zero
  if (!d.dueLog) d.dueLog = [];
  d.dueLog.push({ id:'due_'+Date.now(), date:todayStr(), platform, action, amount: action==='zero'?0:amt, note });
  setData(d);
  document.getElementById('due-amt').value = '';
  document.getElementById('due-note').value = '';
  renderAll();
}

function renderDue() {
  const d = getData();
  const wa = document.getElementById('waDue');
  const tg = document.getElementById('tgDue');
  if (wa) { wa.textContent=fmt(d.dueWA||0); wa.className='due-big'+((d.dueWA||0)>0?' red':''); }
  if (tg) { tg.textContent=fmt(d.dueTG||0); tg.className='due-big'+((d.dueTG||0)>0?' red':''); }
  const tbody = document.getElementById('dueTbody');
  if (!tbody) return;
  const log = (d.dueLog||[]).slice().reverse().slice(0,30);
  if (!log.length) { tbody.innerHTML='<tr><td colspan="6" class="empty-row">No due records.</td></tr>'; return; }
  tbody.innerHTML = log.map(l => `<tr>
    <td style="font-size:12px;">${fmtDate(l.date)}</td>
    <td><span class="badge badge-${l.platform==='telegram'?'tg':'wa'}">${l.platform}</span></td>
    <td style="color:${l.action==='add'?'var(--accent3)':'var(--accent2)'};">${l.action==='add'?'+ Added':'- Cleared'}</td>
    <td style="font-family:var(--mono);">${fmt(l.amount)}</td>
    <td style="color:var(--muted);font-size:12px;">${l.note||''}</td>
    ${actionBtns(`openEditDue('${l.id}')`,`deleteDueLog('${l.id}')`)}
  </tr>`).join('');
}

function openEditDue(id) {
  const d = getData();
  const l = (d.dueLog||[]).find(x=>x.id===id);
  if (!l) return;
  editingDueId = id;
  document.getElementById('editdue-amt').value = l.amount||0;
  document.getElementById('editdue-note').value = l.note||'';
  document.getElementById('editDueModal').style.display = 'flex';
}

function saveDueEdit() {
  const d = getData();
  const l = (d.dueLog||[]).find(x=>x.id===editingDueId);
  if (!l) return;
  l.amount = parseFloat(document.getElementById('editdue-amt').value)||0;
  l.note = document.getElementById('editdue-note').value.trim();
  setData(d);
  closeModal('editDueModal');
  renderAll();
}

function deleteDueLog(id) {
  if (!confirm('Delete this due entry?')) return;
  const d = getData();
  d.dueLog = (d.dueLog||[]).filter(l=>l.id!==id);
  setData(d);
  renderAll();
}

// ===== STOCK =====
let editingStockId = null;

function updateStock() {
  const action = document.getElementById('stock-action').value;
  const amt = parseFloat(document.getElementById('stock-amt').value)||0;
  const note = document.getElementById('stock-note').value.trim();
  if (!amt) return;
  const d = getData();
  if (action==='add') d.stock = (d.stock||0)+amt;
  else if (action==='remove') d.stock = Math.max(0,(d.stock||0)-amt);
  else d.stock = amt;
  if (!d.stockLog) d.stockLog = [];
  d.stockLog.push({ id:'stk_'+Date.now(), date:todayStr(), action, amount:amt, note, balance:d.stock });
  setData(d);
  document.getElementById('stock-amt').value = '';
  document.getElementById('stock-note').value = '';
  renderAll();
}

function renderStock() {
  const d = getData();
  const sd = document.getElementById('stockDisplay');
  if (sd) sd.textContent = fmt(d.stock||0);
  const tbody = document.getElementById('stockTbody');
  if (!tbody) return;
  const log = (d.stockLog||[]).slice().reverse().slice(0,30);
  if (!log.length) { tbody.innerHTML='<tr><td colspan="6" class="empty-row">No stock records.</td></tr>'; return; }
  tbody.innerHTML = log.map(l => `<tr>
    <td style="font-size:12px;">${fmtDate(l.date)}</td>
    <td style="color:${l.action==='add'?'var(--accent2)':l.action==='remove'?'var(--accent3)':'var(--accent)'};">${l.action}</td>
    <td style="font-family:var(--mono);">${fmt(l.amount)}</td>
    <td style="color:var(--muted);font-size:12px;">${l.note||''}</td>
    <td style="font-family:var(--mono);color:var(--amber);">${fmt(l.balance)}</td>
    ${actionBtns(`openEditStock('${l.id}')`,`deleteStockLog('${l.id}')`)}
  </tr>`).join('');
}

function openEditStock(id) {
  const d = getData();
  const l = (d.stockLog||[]).find(x=>x.id===id);
  if (!l) return;
  editingStockId = id;
  document.getElementById('editstock-amt').value = l.amount||0;
  document.getElementById('editstock-note').value = l.note||'';
  document.getElementById('editStockModal').style.display = 'flex';
}

function saveStockEdit() {
  const d = getData();
  const l = (d.stockLog||[]).find(x=>x.id===editingStockId);
  if (!l) return;
  l.amount = parseFloat(document.getElementById('editstock-amt').value)||0;
  l.note = document.getElementById('editstock-note').value.trim();
  setData(d);
  closeModal('editStockModal');
  renderAll();
}

function deleteStockLog(id) {
  if (!confirm('Delete this stock entry?')) return;
  const d = getData();
  d.stockLog = (d.stockLog||[]).filter(l=>l.id!==id);
  setData(d);
  renderAll();
}

// ===== EXPENSE =====
let expView = 'today';
let editingExpId = null;

function setExpView(v, btn) {
  expView = v;
  document.querySelectorAll('#tab-expense .filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderExpenseList();
}

function addExpense() {
  const desc = document.getElementById('exp-desc').value.trim();
  const amt = parseFloat(document.getElementById('exp-amt').value)||0;
  const cat = document.getElementById('exp-cat').value;
  const note = document.getElementById('exp-note').value.trim();
  if (!amt) { alert('Please enter an amount!'); return; }
  const d = getData();
  if (!d.expenses) d.expenses = [];
  d.expenses.push({ id:'exp_'+Date.now(), desc, amount:amt, category:cat, note, date:todayStr(), time:timeStr() });
  setData(d);
  document.getElementById('exp-desc').value = '';
  document.getElementById('exp-amt').value = '';
  document.getElementById('exp-note').value = '';
  renderAll();
}

function deleteExpense(id) {
  if (!confirm('Move to Trash?')) return;
  const d = getData();
  const idx = (d.expenses||[]).findIndex(e=>e.id===id);
  if (idx < 0) return;
  const item = d.expenses.splice(idx,1)[0];
  item.deletedAt = Date.now();
  item.trashType = 'expense';
  if (!d.trash) d.trash = [];
  d.trash.push(item);
  setData(d);
  renderAll();
}

function openEditExp(id) {
  const d = getData();
  const e = (d.expenses||[]).find(x=>x.id===id);
  if (!e) return;
  editingExpId = id;
  document.getElementById('editexp-desc').value = e.desc||'';
  document.getElementById('editexp-amt').value = e.amount||0;
  document.getElementById('editexp-cat').value = e.category||'other';
  document.getElementById('editexp-note').value = e.note||'';
  document.getElementById('editExpModal').style.display = 'flex';
}

function saveExpEdit() {
  const d = getData();
  const e = (d.expenses||[]).find(x=>x.id===editingExpId);
  if (!e) return;
  e.desc = document.getElementById('editexp-desc').value.trim();
  e.amount = parseFloat(document.getElementById('editexp-amt').value)||0;
  e.category = document.getElementById('editexp-cat').value;
  e.note = document.getElementById('editexp-note').value.trim();
  setData(d);
  closeModal('editExpModal');
  renderAll();
}

const CAT_COLORS = { product:'badge-web', transport:'badge-wa', ads:'badge-tg', tools:'badge-web', personal:'badge-wa', other:'badge-tg' };

function renderExpenseSummary() {
  const d = getData();
  const today = todayStr();
  const month = monthStr();
  const exps = d.expenses||[];
  const todayE = exps.filter(e=>e.date===today).reduce((a,e)=>a+e.amount,0);
  const monthE = exps.filter(e=>e.date&&e.date.startsWith(month)).reduce((a,e)=>a+e.amount,0);
  const totalE = exps.reduce((a,e)=>a+e.amount,0);
  const cats = {};
  exps.filter(e=>e.date&&e.date.startsWith(month)).forEach(e=>{ cats[e.category]=(cats[e.category]||0)+e.amount; });
  const topCat = Object.entries(cats).sort((a,b)=>b[1]-a[1])[0];
  const el = document.getElementById('expSummaryGrid');
  if (!el) return;
  el.innerHTML = `
    <div class="sum-card"><div class="sum-label">Today Expense</div><div class="sum-val red">${fmt(todayE)}</div></div>
    <div class="sum-card"><div class="sum-label">Monthly Expense</div><div class="sum-val red">${fmt(monthE)}</div></div>
    <div class="sum-card"><div class="sum-label">Total All Time</div><div class="sum-val amber">${fmt(totalE)}</div></div>
    <div class="sum-card"><div class="sum-label">Top Category</div><div class="sum-val" style="font-size:14px;">${topCat ? topCat[0]+' '+fmt(topCat[1]) : '-'}</div></div>
  `;
}

function renderExpenseList() {
  const d = getData();
  const today = todayStr();
  const month = monthStr();
  const dateFilter = document.getElementById('expDate')?.value || '';
  const catFilter = document.getElementById('expCatFilter')?.value || '';
  let exps = (d.expenses||[]).slice().reverse();
  if (expView==='today') exps = exps.filter(e=>e.date===today);
  else if (expView==='month') exps = exps.filter(e=>e.date&&e.date.startsWith(month));
  if (dateFilter) exps = exps.filter(e=>e.date===dateFilter);
  if (catFilter) exps = exps.filter(e=>e.category===catFilter);
  const tbody = document.getElementById('expTbody');
  if (!tbody) return;
  if (!exps.length) { tbody.innerHTML='<tr><td colspan="8" class="empty-row">No expenses found.</td></tr>'; return; }
  tbody.innerHTML = exps.map((e,i) => `<tr>
    <td style="color:var(--muted);font-size:11px;">${i+1}</td>
    <td style="font-size:12px;">${fmtDate(e.date)}</td>
    <td>${e.desc||'-'}</td>
    <td><span class="badge ${CAT_COLORS[e.category]||'badge-web'}">${e.category}</span></td>
    <td style="font-family:var(--mono);color:var(--accent3);">${fmt(e.amount)}</td>
    <td style="font-size:12px;color:var(--muted);">${e.note||''}</td>
    <td style="font-size:11px;color:var(--muted);">${e.time||''}</td>
    ${actionBtns(`openEditExp('${e.id}')`,`deleteExpense('${e.id}')`)}
  </tr>`).join('');
}

// ===== REPORTS =====
let reportView = 'weekly';

function setReportView(v, btn) {
  reportView = v;
  document.querySelectorAll('#tab-reports .filter-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderReports();
}

function renderReports() {
  const d = getData();
  const today = new Date();
  let content = '';
  if (reportView==='weekly') {
    const days = [];
    for (let i=6;i>=0;i--) { const dt=new Date(today); dt.setDate(dt.getDate()-i); days.push(dt.toISOString().slice(0,10)); }
    const rows = days.map(day => {
      const s = (d.sales||[]).filter(x=>x.date===day);
      return { day, amt:s.reduce((a,x)=>a+x.amount,0), profit:s.reduce((a,x)=>a+(x.amount-x.cost),0),
        wAmt:s.filter(x=>x.channel==='website').reduce((a,x)=>a+x.amount,0),
        tAmt:s.filter(x=>x.channel==='telegram').reduce((a,x)=>a+x.amount,0) };
    });
    const maxP = Math.max(...rows.map(r=>Math.abs(r.profit)),1);
    content = `<div class="card" style="margin-bottom:1rem;"><div class="sec-title">Weekly Profit (Last 7 Days)</div><div style="margin-top:12px;">
      ${rows.map(r=>`<div class="bar-row">
        <div class="bar-label">${r.day.slice(5)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.round(Math.abs(r.profit)/maxP*100)}%;background:${r.profit>=0?'var(--accent2)':'var(--accent3)'};"></div></div>
        <div class="bar-val">${fmt(r.profit)}</div>
      </div>`).join('')}
    </div></div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Date</th><th>Website</th><th>Telegram</th><th>Total</th><th>Profit</th></tr></thead>
      <tbody>${rows.map(r=>`<tr>
        <td style="font-size:12px;">${fmtDate(r.day)}</td>
        <td style="font-family:var(--mono);color:var(--accent);">${fmt(r.wAmt)}</td>
        <td style="font-family:var(--mono);color:var(--accent2);">${fmt(r.tAmt)}</td>
        <td style="font-family:var(--mono);">${fmt(r.amt)}</td>
        <td style="font-family:var(--mono);color:${r.profit>=0?'var(--accent2)':'var(--accent3)'};">${fmt(r.profit)}</td>
      </tr>`).join('')}</tbody>
    </table></div></div>`;
  } else if (reportView==='monthly') {
    const months = {};
    (d.sales||[]).forEach(s=>{if(!s.date)return;const m=s.date.slice(0,7);if(!months[m])months[m]={amt:0,profit:0,wAmt:0,tAmt:0,count:0};months[m].amt+=s.amount;months[m].profit+=s.amount-s.cost;if(s.channel==='website')months[m].wAmt+=s.amount;else months[m].tAmt+=s.amount;months[m].count++;});
    const keys = Object.keys(months).sort().reverse();
    const maxP = Math.max(...keys.map(k=>Math.abs(months[k].profit)),1);
    content = `<div class="card" style="margin-bottom:1rem;"><div class="sec-title">Monthly Profit</div><div style="margin-top:12px;">
      ${keys.length ? keys.map(k=>`<div class="bar-row">
        <div class="bar-label">${k}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${Math.round(Math.abs(months[k].profit)/maxP*100)}%;background:${months[k].profit>=0?'var(--accent2)':'var(--accent3)'};"></div></div>
        <div class="bar-val">${fmt(months[k].profit)}</div>
      </div>`).join('') : '<p style="color:var(--muted);font-size:13px;">No data yet.</p>'}
    </div></div>
    <div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Month</th><th>Website</th><th>Telegram</th><th>Total</th><th>Profit</th><th>Txns</th></tr></thead>
      <tbody>${keys.length ? keys.map(k=>`<tr>
        <td style="font-family:var(--mono);font-size:12px;">${k}</td>
        <td style="font-family:var(--mono);color:var(--accent);">${fmt(months[k].wAmt)}</td>
        <td style="font-family:var(--mono);color:var(--accent2);">${fmt(months[k].tAmt)}</td>
        <td style="font-family:var(--mono);">${fmt(months[k].amt)}</td>
        <td style="font-family:var(--mono);color:${months[k].profit>=0?'var(--accent2)':'var(--accent3)'};">${fmt(months[k].profit)}</td>
        <td style="color:var(--muted);">${months[k].count}</td>
      </tr>`).join('') : '<tr><td colspan="6" class="empty-row">No data.</td></tr>'}</tbody>
    </table></div></div>`;
  } else {
    const years = {};
    (d.sales||[]).forEach(s=>{if(!s.date)return;const y=s.date.slice(0,4);if(!years[y])years[y]={amt:0,profit:0,wAmt:0,tAmt:0,count:0};years[y].amt+=s.amount;years[y].profit+=s.amount-s.cost;if(s.channel==='website')years[y].wAmt+=s.amount;else years[y].tAmt+=s.amount;years[y].count++;});
    const keys = Object.keys(years).sort().reverse();
    content = `<div class="card"><div class="table-wrap"><table>
      <thead><tr><th>Year</th><th>Website</th><th>Telegram</th><th>Total</th><th>Profit</th><th>Txns</th></tr></thead>
      <tbody>${keys.length ? keys.map(k=>`<tr>
        <td style="font-family:var(--mono);">${k}</td>
        <td style="font-family:var(--mono);color:var(--accent);">${fmt(years[k].wAmt)}</td>
        <td style="font-family:var(--mono);color:var(--accent2);">${fmt(years[k].tAmt)}</td>
        <td style="font-family:var(--mono);">${fmt(years[k].amt)}</td>
        <td style="font-family:var(--mono);color:${years[k].profit>=0?'var(--accent2)':'var(--accent3)'};">${fmt(years[k].profit)}</td>
        <td style="color:var(--muted);">${years[k].count}</td>
      </tr>`).join('') : '<tr><td colspan="6" class="empty-row">No data.</td></tr>'}</tbody>
    </table></div></div>`;
  }
  const rc = document.getElementById('reportContent');
  if (rc) rc.innerHTML = content;
}

// ===== TRASH =====
function renderTrash() {
  const d = getData();
  const trash = (d.trash||[]).slice().reverse();
  const tbody = document.getElementById('trashTbody');
  if (!tbody) return;
  if (!trash.length) { tbody.innerHTML='<tr><td colspan="6" class="empty-row">Trash is empty.</td></tr>'; return; }
  tbody.innerHTML = trash.map(s => {
    const delDate = s.deletedAt ? new Date(s.deletedAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '-';
    const expDate = s.deletedAt ? new Date(s.deletedAt+30*24*60*60*1000).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}) : '-';
    const type = s.trashType||'sale';
    return `<tr>
      <td style="font-size:11px;color:var(--muted);">${delDate}</td>
      <td><span class="badge badge-${type==='expense'?'wa':'web'}">${type}</span></td>
      <td>${s.desc||'-'}</td>
      <td style="font-family:var(--mono);">${fmt(s.amount)}</td>
      <td style="font-size:11px;color:var(--accent3);">${expDate}</td>
      <td><button class="act-btn" onclick="restoreTrash('${s.id}')" title="Restore">↩️</button></td>
    </tr>`;
  }).join('');
}

function restoreTrash(id) {
  const d = getData();
  const idx = (d.trash||[]).findIndex(t=>t.id===id);
  if (idx < 0) return;
  const item = d.trash.splice(idx,1)[0];
  const type = item.trashType||'sale';
  delete item.deletedAt;
  delete item.trashType;
  if (type==='expense') { if(!d.expenses) d.expenses=[]; d.expenses.push(item); }
  else { if(!d.sales) d.sales=[]; d.sales.push(item); }
  setData(d);
  renderAll();
}


// ===== SUPPLIER DUE =====
function updateSupplierDue() {
  const name   = document.getElementById('sup-name').value;
  const action = document.getElementById('sup-action').value;
  const amt    = parseFloat(document.getElementById('sup-amt').value)||0;
  const note   = document.getElementById('sup-note').value.trim();
  if (action !== 'zero' && !amt) { alert('Please enter an amount!'); return; }
  const d = getData();
  const key = name==='supplier1' ? 'sup1Due' : 'sup2Due';
  const prev = d[key]||0;
  if      (action==='add')  d[key] = prev + amt;
  else if (action==='paid') d[key] = Math.max(0, prev - amt);
  else if (action==='zero') d[key] = 0;
  const logAmt = action==='zero' ? prev : amt;
  if (!d.supLog) d.supLog = [];
  d.supLog.push({ id:'sup_'+Date.now(), date:todayStr(), supplier:name, action, amount:logAmt, note, balance:d[key] });
  setData(d);
  document.getElementById('sup-amt').value  = '';
  document.getElementById('sup-note').value = '';
  renderAll();
}

function renderSupplier() {
  const d = getData();
  const cards = document.getElementById('supplierDueCards');
  if (cards) {
    cards.innerHTML = `
      <div class="due-card">
        <div class="sum-label">${d.sup1Name||'Supplier 1'}</div>
        <div class="due-big ${(d.sup1Due||0)>0?'red':''}">${fmt(d.sup1Due||0)}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:4px;">Amount I Owe</div>
      </div>
      <div class="due-card">
        <div class="sum-label">${d.sup2Name||'Supplier 2'}</div>
        <div class="due-big ${(d.sup2Due||0)>0?'red':''}">${fmt(d.sup2Due||0)}</div>
        <div style="font-size:11px;color:var(--muted);margin-top:4px;">Amount I Owe</div>
      </div>`;
  }
  const tb = document.getElementById('supplierTbody'); if (!tb) return;
  const log = (d.supLog||[]).slice().reverse().slice(0,30);
  if (!log.length) { tb.innerHTML='<tr><td colspan="7" class="empty-row">No supplier records yet.</td></tr>'; return; }
  tb.innerHTML = log.map(l => {
    const sName = l.supplier==='supplier1' ? (d.sup1Name||'Supplier 1') : (d.sup2Name||'Supplier 2');
    const aColor = l.action==='add' ? 'var(--accent3)' : 'var(--accent2)';
    const aLabel = l.action==='add' ? '+ Bought on Credit' : l.action==='paid' ? '- Payment Made' : '✓ Fully Paid Off';
    return `<tr>
      <td style="font-size:12px;">${fmtDate(l.date)}</td>
      <td><span class="badge badge-wa">${sName}</span></td>
      <td style="color:${aColor};font-size:12px;">${aLabel}</td>
      <td style="font-family:var(--mono);">${fmt(l.amount)}</td>
      <td style="color:var(--muted);font-size:12px;">${l.note||''}</td>
      <td style="font-family:var(--mono);color:var(--amber);">${fmt(l.balance)}</td>
      <td><button class="act-btn del" onclick="delSupLog('${l.id}')" title="Delete">🗑</button></td>
    </tr>`;
  }).join('');
}

function delSupLog(id) {
  if (!confirm('Delete this entry?')) return;
  const d = getData();
  d.supLog = (d.supLog||[]).filter(l=>l.id!==id);
  setData(d); renderAll();
}

function saveSupplierNames() {
  const n1 = document.getElementById('sup1NameInput')?.value.trim();
  const n2 = document.getElementById('sup2NameInput')?.value.trim();
  const msg = document.getElementById('supNameMsg');
  if (!n1 || !n2) { if(msg){msg.style.color='var(--accent3)';msg.textContent='Please enter both names!';} return; }
  const d = getData();
  d.sup1Name = n1; d.sup2Name = n2;
  // update dropdown options
  const sel = document.getElementById('sup-name');
  if (sel) { sel.options[0].text = n1; sel.options[1].text = n2; }
  setData(d);
  if(msg){msg.style.color='var(--accent2)';msg.textContent='Supplier names updated!';}
  renderSupplier(); renderSummary();
}

function loadSupplierNames() {
  const d = getData();
  const i1 = document.getElementById('sup1NameInput');
  const i2 = document.getElementById('sup2NameInput');
  if (i1) i1.value = d.sup1Name||'';
  if (i2) i2.value = d.sup2Name||'';
  const sel = document.getElementById('sup-name');
  if (sel) { sel.options[0].text = d.sup1Name||'Supplier 1'; sel.options[1].text = d.sup2Name||'Supplier 2'; }
}

// ===== MODAL =====
function closeModal(id, e) {
  if (!e || e.target===document.getElementById(id))
    document.getElementById(id).style.display = 'none';
}

// ===== TAB SWITCH =====
function switchTab(name, btn) {
  const current = localStorage.getItem('biz_active_tab') || 'today';
  const oldTab = document.getElementById('tab-'+current);
  const newTab = document.getElementById('tab-'+name);
  if (!newTab || current === name) return;

  // Hide old tab
  if (oldTab) oldTab.classList.remove('active');

  // Render content before showing
  if (name==='history') renderHistory();
  if (name==='reports') renderReports();
  if (name==='expense') { renderExpenseSummary(); renderExpenseList(); }
  if (name==='bank') renderBankTransfer();

  // Show new tab (CSS animation handles the fade-in)
  newTab.classList.add('active');

  // Scroll to top on tab change
  window.scrollTo({ top: 0, behavior: 'smooth' });

  // Update nav buttons
  document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
  if (btn) {
    btn.classList.add('active');
  } else {
    document.querySelectorAll('.nav-tab').forEach(b => {
      if (b.getAttribute('onclick') && b.getAttribute('onclick').includes("'"+name+"'")) b.classList.add('active');
    });
  }

  localStorage.setItem('biz_active_tab', name);
}


// ===== BANK TRANSFER =====
let bankView = 'all';

function setBankView(v, btn) {
  bankView = v;
  document.querySelectorAll('#bankFilterBtns .filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderBankTransferList();
}

function setBankMonthFilter() {
  bankView = 'custom';
  document.querySelectorAll('#bankFilterBtns .filter-btn').forEach(b => b.classList.remove('active'));
  renderBankTransferList();
}

function addBankTransfer() {
  const amt = parseFloat(document.getElementById('bank-amt').value) || 0;
  const note = document.getElementById('bank-note').value.trim();
  if (!amt) { alert('Please enter an amount!'); return; }
  const d = getData();
  if (!d.bankTransfers) d.bankTransfers = [];
  d.bankTransfers.push({ id: 'bnk_' + Date.now(), date: todayStr(), time: timeStr(), amount: amt, note });
  setData(d);
  document.getElementById('bank-amt').value = '';
  document.getElementById('bank-note').value = '';
  renderBankTransfer();
}

function delBankTransfer(id) {
  if (!confirm('Delete this transfer?')) return;
  const d = getData();
  d.bankTransfers = (d.bankTransfers || []).filter(t => t.id !== id);
  setData(d); renderBankTransfer();
}

function renderBankTransfer() {
  // Summary cards
  const d = getData();
  const all = d.bankTransfers || [];
  const today = todayStr();
  const month = monthStr();
  const todayAmt = all.filter(t => t.date === today).reduce((a, t) => a + t.amount, 0);
  const monthAmt = all.filter(t => t.date && t.date.startsWith(month)).reduce((a, t) => a + t.amount, 0);
  const totalAmt = all.reduce((a, t) => a + t.amount, 0);
  const sc = document.getElementById('bankSummaryCards');
  if (sc) sc.innerHTML = `
    <div class="sum-card"><div class="sum-label">Today's Transfer</div><div class="sum-val amber">${fmt(todayAmt)}</div></div>
    <div class="sum-card"><div class="sum-label">This Month's Transfer</div><div class="sum-val amber">${fmt(monthAmt)}</div></div>
    <div class="sum-card"><div class="sum-label">Total Transferred</div><div class="sum-val" style="color:var(--accent);">${fmt(totalAmt)}</div></div>
  `;
  renderBankTransferList();
}

function renderBankTransferList() {
  const d = getData();
  let list = (d.bankTransfers || []).slice().reverse();
  const today = todayStr();
  const month = monthStr();
  const customMonth = document.getElementById('bank-month-filter')?.value || '';

  if (bankView === '7days') {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 6);
    const cutStr = cutoff.toISOString().slice(0, 10);
    list = list.filter(t => t.date >= cutStr);
  } else if (bankView === 'month') {
    list = list.filter(t => t.date && t.date.startsWith(month));
  } else if (bankView === 'year') {
    const year = today.slice(0, 4);
    list = list.filter(t => t.date && t.date.startsWith(year));
  } else if (bankView === 'custom' && customMonth) {
    list = list.filter(t => t.date && t.date.startsWith(customMonth));
  }

  // Recent 5 shown in summary card
  const recent5 = (d.bankTransfers || []).slice().reverse().slice(0, 5);
  const r5el = document.getElementById('bankRecent5');
  if (r5el) {
    if (!recent5.length) { r5el.innerHTML = '<tr><td colspan="5" class="empty-row">No transfer records.</td></tr>'; }
    else r5el.innerHTML = recent5.map(t => `<tr>
      <td style="font-size:12px;">${fmtDate(t.date)}</td>
      <td style="font-size:11px;color:var(--muted);">${t.time || ''}</td>
      <td style="font-family:var(--mono);color:var(--amber);">${fmt(t.amount)}</td>
      <td style="color:var(--muted);font-size:12px;">${t.note || '-'}</td>
      <td><button class="act-btn del" onclick="delBankTransfer('${t.id}')" title="Delete">🗑</button></td>
    </tr>`).join('');
  }

  // Full filtered list
  const fullEl = document.getElementById('bankFullList');
  const filterTotal = list.reduce((a, t) => a + t.amount, 0);
  const ftEl = document.getElementById('bankFilterTotal');
  if (ftEl) ftEl.textContent = 'Total: ' + fmt(filterTotal) + ' (' + list.length + ' records)';
  if (fullEl) {
    if (!list.length) { fullEl.innerHTML = '<tr><td colspan="5" class="empty-row">No records found.</td></tr>'; }
    else fullEl.innerHTML = list.map(t => `<tr>
      <td style="font-size:12px;">${fmtDate(t.date)}</td>
      <td style="font-size:11px;color:var(--muted);">${t.time || ''}</td>
      <td style="font-family:var(--mono);color:var(--amber);">${fmt(t.amount)}</td>
      <td style="color:var(--muted);font-size:12px;">${t.note || '-'}</td>
      <td><button class="act-btn del" onclick="delBankTransfer('${t.id}')" title="Delete">🗑</button></td>
    </tr>`).join('');
  }
}

// ===== BACKUP & RESTORE =====
function downloadBackup() {
  const d = getData();
  const backup = {
    version: 'biz_backup_v1',
    exportedAt: new Date().toISOString(),
    data: d
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'biz-backup-' + todayStr() + '.json';
  a.click();
  URL.revokeObjectURL(url);
  const msg = document.getElementById('backupMsg');
  if (msg) { msg.style.color='var(--accent2)'; msg.textContent='✅ Backup downloaded!'; setTimeout(()=>msg.textContent='',3000); }
}

function restoreBackup(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const backup = JSON.parse(e.target.result);
      if (!backup.version || !backup.data) { alert('Invalid backup file!'); return; }
      if (!confirm('Restoring this backup will replace all current data. Continue?')) return;
      const d = backup.data;
      setData(d);
      const msg = document.getElementById('backupMsg');
      if (msg) { msg.style.color='var(--accent2)'; msg.textContent='✅ Data restored successfully!'; }
      renderAll();
    } catch(err) {
      alert('Backup file read error: ' + err.message);
    }
    input.value = '';
  };
  reader.readAsText(file);
}

function autoBackupToFirebase() {
  const d = getData();
  const today = todayStr();
  db.ref('backups/'+today).set({
    savedAt: new Date().toISOString(),
    data: d
  }).catch(e => console.warn('Auto backup failed:', e));
}

// ===== CLEAR ALL =====
function clearAllData() {
  const pinEl = document.getElementById('dangerPin');
  const msgEl = document.getElementById('dangerMsg');
  const entered = pinEl ? pinEl.value : '';

  if (!entered) {
    if (msgEl) { msgEl.style.color='var(--accent3)'; msgEl.textContent='Please enter your PIN!'; }
    return;
  }
  if (entered !== getPin()) {
    if (msgEl) { msgEl.style.color='var(--accent3)'; msgEl.textContent='Wrong PIN! Data not deleted.'; }
    if (pinEl) pinEl.value = '';
    return;
  }
  if (!confirm('Are you sure you want to delete ALL data? This cannot be undone!')) return;
  if (!confirm('Final confirmation — all data will be permanently deleted!')) return;

  _cache = null;
  localStorage.removeItem('biz_v4');
  db.ref(FB_PATH).remove();
  if (pinEl) pinEl.value = '';
  if (msgEl) { msgEl.style.color='var(--accent2)'; msgEl.textContent='All data cleared.'; }
  renderAll();
}

// ===== START =====
window.addEventListener('load', () => {
  const hd = document.getElementById('histDate');
  if (hd) hd.value = todayStr();
  if (isSessionValid()) {
    showApp();
    // Restore last active tab directly (no animation on initial load)
    const lastTab = localStorage.getItem('biz_active_tab');
    if (lastTab && lastTab !== 'today') {
      // Directly switch without delay to avoid flicker
      const todayEl = document.getElementById('tab-today');
      const lastEl = document.getElementById('tab-' + lastTab);
      if (todayEl && lastEl) {
        todayEl.classList.remove('active');
        lastEl.classList.add('active');
        // Update nav button
        document.querySelectorAll('.nav-tab').forEach(b => {
          b.classList.remove('active');
          if (b.getAttribute('onclick') && b.getAttribute('onclick').includes("'" + lastTab + "'")) b.classList.add('active');
        });
        // Render content for the restored tab
        if (lastTab === 'history') renderHistory();
        if (lastTab === 'reports') renderReports();
        if (lastTab === 'expense') { renderExpenseSummary(); renderExpenseList(); }
        if (lastTab === 'bank') renderBankTransfer();
      }
    }
  }
});
