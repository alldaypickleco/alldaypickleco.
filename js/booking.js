// ── ALLDAY PICKLE CO. — booking.js ──
// Booking widget logic: step rendering, pricing, API calls
// Edit this file to change booking flow behaviour

// ── State ────────────────────────────────────────────────────────────────────
let step = 1, selDate = null, selCourt = null, startH = null, dur = 1, tabIdx = 0;

// ── Helpers ───────────────────────────────────────────────────────────────────
function L()       { return T[lang]; }
function COURTS()  { return ALL_COURTS[lang]; }

function isPeak(d, h) {
  const w = d.getDay();
  return (w === 0 || w === 6) ? h >= 8 : h >= 18;
}

function calcTotal(ct, d, sh, du) {
  let s = 0;
  for (let i = 0; i < du; i++) {
    const h = (sh + i) % 24;
    s += isPeak(d, h) ? ct.pk : ct.np;
  }
  const disc = du >= 3 ? 10 : du >= 2 ? 5 : 0;
  const da   = Math.round(s * disc / 100);
  return { sub: s, disc, discAmt: da, total: s - da };
}

function fmtDate(d) {
  if (!d) return '';
  const l = L();
  return `${l.dayNames[d.getDay()]}, ${d.getDate()} ${l.months[d.getMonth()]}`;
}

function fmtH(h)      { return String(h % 24).padStart(2, '0') + ':00'; }
function toDateKey(d)  { return d ? d.toISOString().split('T')[0] : ''; }

function fmtEnd(sh, du) {
  const e = sh + du;
  if (e === 24) return '00:00(+1)';
  if (e > 24)   return String(e - 24).padStart(2, '0') + ':00(+1)';
  return String(e).padStart(2, '0') + ':00';
}

// ── Step bar ──────────────────────────────────────────────────────────────────
function renderStepBar() {
  const labels = L().stepLabels;
  let h = '';
  labels.forEach((lbl, i) => {
    const n = i + 1, done = step > n, active = step === n;
    h += `<div style="display:flex;align-items:flex-start;${i < 3 ? 'flex:1' : ''}">
      <div style="display:flex;flex-direction:column;align-items:center;gap:3px">
        <div class="sdot ${done ? 'done' : active ? 'active' : 'idle'}">${done ? '✓' : n}</div>
        <div style="font-size:9px;font-weight:700;color:${active ? G : done ? '#6B8C7A' : '#9B9591'};white-space:nowrap">${lbl}</div>
      </div>
      ${i < 3 ? `<div class="sline ${step > n ? 'done' : ''}"></div>` : ''}</div>`;
  });
  document.getElementById('stepBar').innerHTML = h;
}

function renderStep() {
  renderStepBar();
  const c = document.getElementById('stepContent');
  if      (step === 1) c.innerHTML = rS1();
  else if (step === 2) c.innerHTML = rS2();
  else if (step === 3) c.innerHTML = rS3();
  else if (step === 4) c.innerHTML = rS4();
}

// ── Step 1: Date ──────────────────────────────────────────────────────────────
function rS1() {
  const l = L(), today = new Date(); today.setHours(0,0,0,0);
  const max = new Date(today); max.setDate(max.getDate() + 60);
  const mths = [0,1,2].map(i => {
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    return { year: d.getFullYear(), month: d.getMonth(), label: `${l.months[d.getMonth()]} ${d.getFullYear()}` };
  });
  const { year, month } = mths[tabIdx];
  const fd  = (new Date(year, month, 1).getDay() + 6) % 7;
  const dim = new Date(year, month + 1, 0).getDate();

  let tabs = '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin-bottom:12px">';
  mths.forEach((m, i) => { tabs += `<button class="m-tab${tabIdx === i ? ' on' : ''}" onclick="tabIdx=${i};renderStep()">${m.label}</button>`; });
  tabs += '</div>';

  let cal = '<div class="cal-grid">';
  l.days.forEach(d => { cal += `<div class="cal-hdr">${d}</div>`; });
  for (let i = 0; i < fd; i++) cal += '<div></div>';
  for (let d = 1; d <= dim; d++) {
    const date = new Date(year, month, d); date.setHours(0,0,0,0);
    const dis  = date < today || date > max;
    const sel  = selDate && selDate.toDateString() === date.toDateString();
    const isT  = date.toDateString() === today.toDateString();
    cal += `<button class="cal-day${sel ? ' sel' : ''}${isT && !sel ? ' today' : ''}" ${dis ? 'disabled' : ''} onclick="if(!${dis}){selDate=new Date(${year},${month},${d});renderStep()}">${d}</button>`;
  }
  cal += '</div>';

  return `<h2 style="font-family:'DM Serif Display',serif;font-size:19px;font-weight:400;margin-bottom:4px;color:#1A1A1A">${l.s1h}</h2>
  <p style="color:#6B6560;font-size:13px;margin-bottom:14px">${l.s1p}</p>${tabs}
  <div style="background:#F9F6F1;border-radius:12px;padding:12px 10px;border:1px solid rgba(184,196,202,.4);margin-bottom:13px">${cal}</div>
  ${selDate ? `<div style="text-align:center;font-size:12px;color:${G};font-weight:700;margin-bottom:11px">${fmtDate(selDate)}</div>` : ''}
  <button class="bk-btn" onclick="if(selDate){step=2;renderStep()}" style="background:${selDate ? G : '#E8E3DC'};color:${selDate ? 'white' : '#9B9591'};cursor:${selDate ? 'pointer' : 'not-allowed'};box-shadow:${selDate ? '0 4px 14px rgba(27,92,63,.22)' : 'none'}">${l.cc}</button>`;
}

// ── Step 2: Court ─────────────────────────────────────────────────────────────
function rS2() {
  const l = L(), cts = COURTS();
  const rows = cts.map((ct, i) => {
    const sel = selCourt && selCourt.idx === i;
    return `<button class="ct-btn${sel ? ' sel' : ''}" onclick="selCourt=COURTS()[${i}];renderStep()">
      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px">
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:700;color:#1A1A1A;margin-bottom:2px">${ct.name}</div>
          <div style="font-size:11px;color:#6B6560">${ct.sub}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:12px;font-weight:700;color:#1A1A1A">$${ct.np}–$${ct.pk}</div>
          <div style="font-size:10px;color:#9B9591">HKD/hr</div>
          ${sel ? `<div style="color:${G};font-weight:800;font-size:12px;margin-top:2px">✓</div>` : ''}
        </div>
      </div></button>`;
  }).join('');

  return `<button onclick="step=1;renderStep()" style="background:none;border:none;color:#6B6560;cursor:pointer;font-size:13px;margin-bottom:12px;padding:0;font-family:inherit">${l.back}</button>
  <div style="background:#F9F6F1;border-radius:9px;padding:8px 11px;margin-bottom:14px;font-size:12px;color:${G};font-weight:600">📅 ${fmtDate(selDate)}</div>
  <h2 style="font-family:'DM Serif Display',serif;font-size:19px;font-weight:400;margin-bottom:4px;color:#1A1A1A">${l.s2h}</h2>
  <p style="color:#6B6560;font-size:13px;margin-bottom:13px">${l.s2p}</p>${rows}
  <button class="bk-btn" style="margin-top:4px;background:${selCourt ? G : '#E8E3DC'};color:${selCourt ? 'white' : '#9B9591'};cursor:${selCourt ? 'pointer' : 'not-allowed'};box-shadow:${selCourt ? '0 4px 14px rgba(27,92,63,.22)' : 'none'}" onclick="if(selCourt){step=3;startH=null;renderStep()}">${l.ct}</button>`;
}

// ── Step 3: Time + Duration ───────────────────────────────────────────────────
function rS3() {
  const l = L();
  let hrs = '<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:4px;margin-bottom:14px">';
  for (let h = 0; h < 24; h++) {
    const sel = startH === h;
    hrs += `<button class="hr-btn${sel ? ' sel' : ''}" onclick="startH=${h};dur=1;renderStep()">${fmtH(h)}</button>`;
  }
  hrs += '</div>';

  let durS = '', priceP = '';
  if (startH !== null) {
    durS = `<div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#9B9591;margin-bottom:8px">Duration</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:5px;margin-bottom:13px">`;
    [1,2,3].forEach(d => {
      const sel  = dur === d;
      const disc = d >= 3 ? 10 : d >= 2 ? 5 : 0;
      durS += `<button class="dur-btn${sel ? ' sel' : ''}" onclick="dur=${d};renderStep()">${d}h
        <div style="font-size:9px;font-weight:400;margin-top:1px;color:${sel ? 'rgba(255,255,255,.6)' : '#9B9591'}">${fmtEnd(startH, d)}</div>
        ${disc ? `<div style="font-size:8px;font-weight:700;color:${sel ? 'rgba(255,255,255,.8)' : G}">-${disc}%</div>` : ''}
      </button>`;
    });
    durS += '</div>';
    durS += `<a href="https://wa.me/${WA}" target="_blank" style="display:block;text-align:center;font-size:12px;color:#6B6560;margin-bottom:10px;text-decoration:none">Need more than 3 hours? <span style="color:#25D366;font-weight:600">WhatsApp us →</span></a>`;

    const p = calcTotal(selCourt, selDate, startH, dur);
    priceP = `<div style="background:#F9F6F1;border-radius:10px;padding:12px 13px;margin-bottom:12px;border:1px solid rgba(184,196,202,.35)">
      ${p.disc > 0 ? `<div style="display:flex;justify-content:space-between;font-size:12px;color:${G};font-weight:600;margin-bottom:4px"><span>-${p.disc}% off</span><span>-HKD $${p.discAmt}</span></div>` : ''}
      <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:800;color:#1A1A1A"><span>${l.tot}</span><span>HKD $${p.total}</span></div></div>`;
  }

  return `<button onclick="step=2;renderStep()" style="background:none;border:none;color:#6B6560;cursor:pointer;font-size:13px;margin-bottom:12px;padding:0;font-family:inherit">${l.back}</button>
  <div style="display:flex;gap:6px;margin-bottom:14px;flex-wrap:wrap">
    <div style="background:#F9F6F1;border-radius:9px;padding:6px 10px;font-size:11px;color:${G};font-weight:600">📅 ${fmtDate(selDate)}</div>
    <div style="background:#F9F6F1;border-radius:9px;padding:6px 10px;font-size:11px;color:${G};font-weight:600">🏓 ${selCourt.name}</div>
  </div>
  <h2 style="font-family:'DM Serif Display',serif;font-size:19px;font-weight:400;margin-bottom:4px;color:#1A1A1A">${l.s3h}</h2>
  <p style="color:#6B6560;font-size:13px;margin-bottom:13px">${l.s3p}</p>
  <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#9B9591;margin-bottom:8px">Start Time</div>
  ${hrs}${durS}${priceP}
  <button class="bk-btn" onclick="if(startH!==null){step=4;renderStep()}" style="background:${startH !== null ? G : '#E8E3DC'};color:${startH !== null ? 'white' : '#9B9591'};cursor:${startH !== null ? 'pointer' : 'not-allowed'};box-shadow:${startH !== null ? '0 4px 14px rgba(27,92,63,.22)' : 'none'}">${l.rb}</button>`;
}

// ── Step 4: Review & Hold ─────────────────────────────────────────────────────
function rS4() {
  const l = L(), p = calcTotal(selCourt, selDate, startH, dur);
  return `<button onclick="step=3;renderStep()" style="background:none;border:none;color:#6B6560;cursor:pointer;font-size:13px;margin-bottom:13px;padding:0;font-family:inherit">${l.back}</button>
  <h2 style="font-family:'DM Serif Display',serif;font-size:19px;font-weight:400;margin-bottom:4px;color:#1A1A1A">${l.s4h}</h2>
  <p style="color:#6B6560;font-size:13px;margin-bottom:13px">${l.s4p}</p>
  <div style="background:linear-gradient(135deg,${G},#0F3D27);border-radius:14px;padding:17px;color:white;margin-bottom:12px">
    <div style="font-size:10px;letter-spacing:1.5px;color:rgba(255,255,255,.35);margin-bottom:4px">ALLDAY PICKLE CO.</div>
    <div style="font-size:15px;font-weight:700;margin-bottom:3px">${selCourt.name}</div>
    <div style="font-size:12px;color:rgba(255,255,255,.55)">${fmtDate(selDate)} · ${fmtH(startH)}–${fmtEnd(startH, dur)} (${dur}h)</div>
    <div style="border-top:1px solid rgba(255,255,255,.15);margin-top:10px;padding-top:10px;display:flex;justify-content:space-between">
      <span style="font-size:13px;font-weight:700">${l.tot}</span>
      <span style="font-size:13px;font-weight:700">HKD $${p.total}</span>
    </div>
  </div>
  <div style="margin-bottom:9px">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#9B9591;margin-bottom:5px">${l.nl}</div>
    <input id="bkN" type="text" placeholder="${l.np}" style="width:100%;padding:10px 12px;border-radius:9px;border:1.5px solid rgba(184,196,202,.65);background:white;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box"/>
  </div>
  <div style="margin-bottom:13px">
    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#9B9591;margin-bottom:5px">${l.pl}</div>
    <input id="bkP" type="tel" placeholder="${l.pp}" style="width:100%;padding:10px 12px;border-radius:9px;border:1.5px solid rgba(184,196,202,.65);background:white;font-size:13px;font-family:inherit;outline:none;box-sizing:border-box"/>
  </div>
  <div style="background:rgba(244,120,32,.07);border:1px solid rgba(244,120,32,.2);border-radius:9px;padding:10px 12px;margin-bottom:13px;font-size:11px;color:#7A4A1A">${l.tn}</div>
  <button class="bk-btn" onclick="holdSlot()" style="background:${G};color:white;cursor:pointer;box-shadow:0 4px 14px rgba(27,92,63,.22)">${l.hold}</button>
  <p style="text-align:center;font-size:11px;color:#9B9591;margin-top:7px">${l.hs2}</p>`;
}

// ── Hold Slot (API call) ──────────────────────────────────────────────────────
function newBooking() {
  selDate = null; selCourt = null; startH = null; dur = 1; step = 1; tabIdx = 0;
  renderStep();
}

async function holdSlot() {
  const l     = L();
  const name  = document.getElementById('bkN')?.value?.trim();
  const phone = document.getElementById('bkP')?.value?.trim();
  if (!name || !phone) {
    alert(lang === 'ja' ? 'お名前とWhatsApp番号を入力してください。' : lang === 'zh' ? '請輸入姓名及WhatsApp號碼。' : 'Please enter your name and WhatsApp number.');
    return;
  }
  const p = calcTotal(selCourt, selDate, startH, dur);

  // Loading state
  document.getElementById('stepContent').innerHTML = '<div style="text-align:center;padding:40px 0"><div style="font-size:36px;margin-bottom:16px">⏳</div><div style="font-size:14px;color:#6B6560">' + (lang === 'zh' ? '正在鎖定時段...' : lang === 'ja' ? 'スロットを確保中...' : 'Holding your slot...') + '</div></div>';

  let bookId;
  try {
    const courtKey = selCourt.idx === 0 ? 'home' : selCourt.idx === 1 ? 'practice' : 'both';
    const params   = new URLSearchParams({ action:'book', date:toDateKey(selDate), court:courtKey, startHour:startH, duration:dur, name, phone, price:p.sub, total:p.total, paymentMethod:'FPS' });
    const res      = await fetch(API_URL + '?' + params);
    const result   = await res.json();

    if (result.success) {
      bookId = result.bookingId;
    } else {
      // Slot taken
      document.getElementById('stepContent').innerHTML = '<div style="text-align:center;padding:20px 0"><div style="font-size:40px;margin-bottom:12px">😅</div><p style="color:#6B6560;font-size:13px;margin-bottom:20px">' + (lang === 'zh' ? '時段剛被預約，請選擇其他時間。' : lang === 'ja' ? 'スロットが取られました。' : 'Someone just grabbed that slot. Try another time.') + '</p><button onclick="step=3;renderStep()" style="width:100%;padding:13px;border-radius:12px;border:none;background:#1B5C3F;color:white;font-size:14px;font-weight:700;cursor:pointer;font-family:inherit;margin-bottom:10px">' + (lang === 'zh' ? '選擇其他時間' : lang === 'ja' ? '別の時間を選ぶ' : 'Choose a Different Time') + '</button><a href="https://wa.me/' + WA + '" target="_blank" style="display:flex;align-items:center;justify-content:center;gap:7px;width:100%;padding:13px;border-radius:12px;background:#25D366;color:white;font-size:13px;font-weight:700;text-decoration:none;box-sizing:border-box">💬 WhatsApp Us</a></div>';
      renderStepBar(); return;
    }
  } catch (err) {
    // API error — fallback with local ID + WhatsApp
    bookId = 'ADPC-' + Date.now().toString(36).toUpperCase();
  }

  const btnLabel = lang === 'zh' ? '再預約一個球場' : lang === 'ja' ? 'もう一つ予約する' : 'Book Another Court';
  const waDate   = encodeURIComponent(fmtDate(selDate));
  const waCourt  = encodeURIComponent(selCourt.name);
  const waTime   = encodeURIComponent(fmtH(startH) + ' - ' + fmtEnd(startH, dur) + ' (' + dur + 'h)');
  const waMsg    = 'Hi Allday Pickle!%0A%0ABooking ID: ' + bookId + '%0ADate: ' + waDate + '%0ACourt: ' + waCourt + '%0ATime: ' + waTime + '%0ATotal: HKD $' + p.total + '%0A%0APayment sent via FPS. Please confirm!';

  document.getElementById('stepContent').innerHTML = `
    <div style="text-align:center;padding:14px 0">
      <div style="font-size:44px;margin-bottom:12px">🏓</div>
      <div style="background:linear-gradient(135deg,${G},#0F3D27);border-radius:14px;padding:18px;color:white;margin-bottom:13px">
        <div style="font-size:16px;font-weight:700;margin-bottom:5px">${l.ht}</div>
        <div style="font-size:12px;color:rgba(255,255,255,.6);margin-bottom:11px">${l.hs}</div>
        <div style="background:rgba(255,255,255,.12);border-radius:7px;padding:8px;font-family:monospace;font-size:11px;letter-spacing:1px">${bookId}</div>
      </div>
      <div style="background:#F9F6F1;border-radius:12px;padding:13px;margin-bottom:11px;text-align:left">
        <div style="font-size:13px;font-weight:700;margin-bottom:4px">${selCourt.name}</div>
        <div style="font-size:12px;color:#6B6560">${fmtDate(selDate)} · ${fmtH(startH)}–${fmtEnd(startH, dur)}</div>
        <div style="border-top:1px solid rgba(184,196,202,.4);margin-top:9px;padding-top:9px;display:flex;justify-content:space-between;font-size:14px;font-weight:800;color:#1A1A1A"><span>${l.tot}</span><span>HKD $${p.total}</span></div>
      </div>
      <div style="background:#F9F6F1;border-radius:12px;padding:13px;margin-bottom:11px;text-align:left">
        <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#9B9591;margin-bottom:7px">${l.fpsl}</div>
        <div style="font-size:13px;color:#1A1A1A;line-height:2">Phone: <strong>+852 9474 7571</strong><br/>Amount: <strong style="color:${G}">HKD $${p.total}</strong><br/>Remark: <strong>${bookId}</strong></div>
      </div>
      <a href="https://wa.me/${WA}?text=${waMsg}" target="_blank" rel="noreferrer" style="display:flex;align-items:center;justify-content:center;gap:7px;width:100%;padding:13px;border-radius:12px;background:#25D366;color:white;font-size:13px;font-weight:700;text-decoration:none;box-sizing:border-box;margin-bottom:10px">
        💬 ${l.ws}
      </a>
      <button onclick="newBooking()" style="width:100%;padding:13px;border-radius:12px;border:2px solid #1B5C3F;background:white;color:#1B5C3F;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;margin-bottom:7px">${btnLabel}</button>
      <p style="font-size:11px;color:#9B9591">${l.hf}</p>
    </div>`;
  renderStepBar();
}
