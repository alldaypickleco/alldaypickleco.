
// ── ALLDAY PICKLE CO. — app.js ──
// Language switching, page rendering, navigation, initialisation
// This file ties everything together — runs last

let lang = 'en';

// ── Language switcher ─────────────────────────────────────────────────────────
function setLang(l) {
  lang = l;
  document.querySelectorAll('[data-lang]').forEach(b => {
    b.classList.toggle('on', b.getAttribute('data-lang') === l);
  });
  selCourt = null; startH = null; dur = 1; step = 1; tabIdx = 0;

  // Overlay spinner while re-rendering
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(13,31,23,.7);z-index:9998;display:flex;align-items:center;justify-content:center;transition:opacity .4s';
  overlay.innerHTML = '<div style="text-align:center"><div style="width:36px;height:36px;border:3px solid rgba(255,255,255,.2);border-top-color:#1B5C3F;border-radius:50%;animation:spin .8s linear infinite;margin:0 auto 12px"></div><div style="font-size:12px;color:rgba(255,255,255,.5);letter-spacing:2px;text-transform:uppercase">Updating...</div></div>';
  document.body.appendChild(overlay);

  if (!document.getElementById('spin-style')) {
    const s = document.createElement('style');
    s.id = 'spin-style';
    s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
    document.head.appendChild(s);
  }

  setTimeout(() => {
    renderAll();
    overlay.style.opacity = '0';
    setTimeout(() => overlay.remove(), 400);
  }, 400);
}

// ── Safe element setter ───────────────────────────────────────────────────────
function set(id, html, inner = false) {
  try {
    const e = document.getElementById(id);
    if (e) { inner ? e.innerHTML = html : e.textContent = html; }
  } catch (err) {}
}

// ── Render entire page ────────────────────────────────────────────────────────
function renderAll() {
  const l = L();

  // Loader tag
  const ldrTag = document.getElementById('ldr-tag');
  if (ldrTag) ldrTag.textContent = l.ldrTag;

  // Banner
  const tBanner = document.getElementById('t-banner');
  if (tBanner) tBanner.innerHTML = l.banner;

  // Nav
  const navIds = ['nt-courts','nt-events','nt-pricing','nt-location','nt-contact','nt-book'];
  const mobIds = ['nm-courts','nm-events','nm-pricing','nm-location','nm-contact','nm-book'];
  l.nav.forEach((v, i) => { set(navIds[i], v); set(mobIds[i], v); });

  // Hero
  set('hero-h1', l['hero-h1'], true); set('hero-sub', l['hero-sub']); set('hero-det', l['hero-det']);
  set('hero-b1', l['hero-b1']); set('hero-b2', l['hero-b2']);

  // Booking section
  set('sl-bk', l['sl-bk']); set('st-bk', l['st-bk'], true); set('sd-bk', l['sd-bk']);
  document.getElementById('trust-pills').innerHTML = l.trust.map(t => `<div class="tp">${t}</div>`).join('');

  // Courts section
  set('sl-c', l['sl-c']); set('st-c', l['st-c'], true); set('sd-c', l['sd-c']);
  document.getElementById('courts-grid').innerHTML = l.courts.map((c, i) => `
    <div class="cc">
      <div class="cc-hd" style="background:${c.dark ? 'linear-gradient(135deg,#3D1B5C,#1B0F3D)' : 'linear-gradient(135deg,var(--g),var(--g2))'}">
        <div class="cc-badge">${c.badge}</div>
        <div class="cc-name">${c.name}</div>
        <div class="cc-sub">${c.sub}</div>
      </div>
      <div class="cc-bd">
        <div class="cc-desc">${c.desc}</div>
        <div class="cc-pr">
          <div><div class="cc-price">$${COURTS()[i].np}–$${COURTS()[i].pk}</div><div class="cc-plab">/hr · HKD</div></div>
          <a href="#booking" class="btn-p" style="font-size:12px;padding:9px 16px">${l.book}</a>
        </div>
        <div class="cc-tags">${c.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
      </div>
    </div>`).join('');

  // Pricing
  set('sl-p', l['sl-p']); set('st-p', l['st-p'], true); set('sd-p', l['sd-p']);
  set('pt-op', l['pt-op']); set('pt-pk', l['pt-pk']);
  document.getElementById('pr-op').innerHTML = l.rows.map(r => `<div class="pr-row"><span>${r[0]}</span><span><strong>${r[1]}</strong></span></div>`).join('');
  document.getElementById('pr-pk').innerHTML = l.rows.map(r => `<div class="pr-row"><span>${r[0]}</span><span><strong>${r[2]}</strong></span></div>`).join('');
  set('d2h', l['d2h']); set('d3h', l['d3h']); set('pnote', l.pnote);

  // Events
  set('sl-ev', l['sl-ev']); set('st-ev', l['st-ev'], true); set('sd-ev', l['sd-ev']);
  document.getElementById('events-grid').innerHTML = l.events.map(ev => {
    const calTitle   = encodeURIComponent(ev.title + ' - Allday Pickle Co.');
    const calDetails = encodeURIComponent(ev.desc + '\n\nLocation: 寶源亞洲中心, Lai Chi Kok\nWhatsApp: +852 9474 7571');
    const calLoc     = encodeURIComponent('寶源亞洲中心, Lai Chi Kok, Kowloon, Hong Kong');
    const calUrl     = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + calTitle + '&details=' + calDetails + '&location=' + calLoc + '&sf=true&output=xml';
    return `<div class="ev-card">
      <div class="ev-stripe" style="background:${ev.stripe}"></div>
      <div class="ev-body">
        <div class="ev-type ${ev.type}">${ev.typeLabel}</div>
        <div class="ev-date">${ev.date}</div>
        <div class="ev-title">${ev.title}</div>
        <div class="ev-desc">${ev.desc}</div>
        <div class="ev-meta">
          <span class="ev-pill">⏰ ${ev.time}</span>
          <span class="ev-pill">👥 ${ev.spots}</span>
        </div>
        <div style="display:flex;gap:8px;margin-top:14px;flex-wrap:wrap">
          <a href="https://wa.me/${WA}" target="_blank" rel="noreferrer" class="ev-cta">WhatsApp to join →</a>
          <a href="${calUrl}" target="_blank" rel="noreferrer" style="display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:700;color:rgba(255,255,255,.5);text-decoration:none;border:1px solid rgba(255,255,255,.15);padding:7px 14px;border-radius:20px;transition:.2s" onmouseover="this.style.background='rgba(255,255,255,.08)'" onmouseout="this.style.background='transparent'">📅 Add to Calendar</a>
        </div>
      </div>
    </div>`;
  }).join('');
  set('ev-cta', l['ev-cta']);

  // Amenities
  set('sl-am', l['sl-am']); set('st-am', l['st-am'], true); set('sd-am', l['sd-am']);
  document.getElementById('am-grid').innerHTML = l.am.map(a => `
    <div class="am-card"><div class="am-icon">${a.icon}</div><div class="am-title">${a.title}</div><div class="am-desc">${a.desc}</div></div>`).join('');

  // Inventory
  set('sl-inv', l['sl-inv']); set('st-inv', l['st-inv'], true); set('sd-inv', l['sd-inv']);
  document.getElementById('inv-grid').innerHTML = l.inv.map(c => `
    <div class="inv-card">
      <div class="inv-hd ${c.cls}"><div class="inv-ititle">${c.icon} ${c.title}</div><div class="inv-badge ${c.bc}">${c.badge}</div></div>
      <div class="inv-body">${c.rows.map(r => `<div class="inv-row"><span>${r[0]}</span><div class="inv-st"><span class="dot ${r[1]}"></span>${r[2]}</div></div>`).join('')}</div>
    </div>`).join('');
  document.getElementById('inv-note').innerHTML = l['inv-note'];

  // Location
  set('sl-l', l['sl-l']); set('st-l', l['st-l'], true); set('loc-h3', l['loc-h3']);
  document.getElementById('loc-rows').innerHTML = l.locRows.map(r => `
    <div class="lrow"><div class="li">${r.i}</div><div class="lc"><strong>${r.t}</strong><span>${r.d}</span></div></div>`).join('');
  set('loc-contact-link', l['loc-contact-link']);

  // FAQ
  set('sl-faq', l['sl-faq']); set('st-faq', l['st-faq'], true);
  document.getElementById('faq-list').innerHTML = l.faqs.map(f => `
    <div class="faq-item"><div class="fq">${f.q}</div><div class="fa">${f.a}</div></div>`).join('');

  // CTA
  set('sl-cta', l['sl-cta']); set('st-cta', l['st-cta']); set('sd-cta', l['sd-cta']);
  set('cta-b1', l['cta-b1']); set('cta-b2', l['cta-b2']);

  // Footer
  set('ft-desc', l['ft-desc']); set('fc-nav', l['fc-nav']); set('fc-con', l['fc-con']);
  ['fn-courts','fn-events','fn-pricing','fn-location','fn-contact'].forEach((id, i) => set(id, l.fnav[i]));
  set('fn-terms', l['fn-terms']); set('ft-made', l['ft-made']); set('wa-lbl', l['wa-lbl']);

  // Booking widget
  renderStep();
}

// ── Mobile menu ───────────────────────────────────────────────────────────────
function toggleMenu() {
  document.getElementById('mobMenu').classList.toggle('open');
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  renderAll();
});

window.addEventListener('load', () => {
  setTimeout(() => {
    const el = document.getElementById('loader');
    if (el) {
      el.classList.add('hide');
      setTimeout(() => { el.remove(); window.scrollTo({ top:0, behavior:'instant' }); }, 800);
    }
  }, 1600);
});
