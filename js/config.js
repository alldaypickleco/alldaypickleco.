// ── ALLDAY PICKLE CO. — config.js ──
// Edit this file to update API URL, phone number, and court pricing

const WA      = '85294747571';
const API_URL = 'https://script.google.com/macros/s/AKfycbzUhq-cB14FXodw5vlY8U77u7W8ufIAOZjOvy6dWZMvACjPJKRy2R8PL1xWj95n_fc2pg/exec';

// Brand colors (must match CSS variables in main.css)
const G    = '#1B5C3F';
const O    = '#F47820';
const LIME = '#7DC52E';

// Court data — edit np (off-peak price) and pk (peak price) here
// idx must match position: 0=home, 1=practice, 2=both
const ALL_COURTS = {
  en: [
    { idx:0, name:'Home Court 主場',      sub:'Court A · Regulation size',      np:300, pk:400 },
    { idx:1, name:'Practice Court 練習場', sub:'Court B · Compact size',          np:200, pk:300 },
    { idx:2, name:'Both Courts 全場',      sub:'Full venue · Groups & Events',    np:500, pk:700 }
  ],
  zh: [
    { idx:0, name:'主場',     sub:'A場 · 標準規格',       np:300, pk:400 },
    { idx:1, name:'練習場',   sub:'B場 · 面積較細',       np:200, pk:300 },
    { idx:2, name:'全場',     sub:'全場租用 · 適合團體',  np:500, pk:700 }
  ],
  ja: [
    { idx:0, name:'ホームコート 主場',  sub:'コートA · 正規サイズ',       np:300, pk:400 },
    { idx:1, name:'練習コート 練習場',  sub:'コートB · コンパクト',        np:200, pk:300 },
    { idx:2, name:'両コート 全場',      sub:'施設全体 · グループ向け',     np:500, pk:700 }
  ]
};
