// ═══════════════════════════════════════════════════════════════════════════════
// ALLDAY PICKLE CO. — Backend v3
// Supports: Bookings + Manual Blocks + Inventory
// ═══════════════════════════════════════════════════════════════════════════════
//
// SETUP (run each ONCE in order):
// 1. Paste this file into Apps Script, replacing all existing code
// 2. Update ADMIN_EMAIL and ADMIN_PASSWORD below
// 3. Run setupSheet()           — refreshes Bookings tab headers
// 4. Run setupBlocksSheet()     — creates Blocks tab
// 5. Run setupInventorySheet()  — creates Inventory tab
// 6. Run setupTimeTrigger()     — installs hourly auto-release cron
// 7. Deploy → New deployment → Web App (Execute as: Me, Access: Anyone)
// 8. Copy URL → update API_URL in index.html and admin.html
// ═══════════════════════════════════════════════════════════════════════════════

const BOOKING_SHEET   = "Bookings";
const BLOCKS_SHEET    = "Blocks";
const INVENTORY_SHEET = "Inventory";
const HOLD_HOURS      = 1;
const ADMIN_EMAIL     = "house@alldaypickleco.com";
const ADMIN_PASSWORD  = "adpc2025admin";   // ← change this
const WA_NUMBER       = "85294747571";

// ─── Bookings columns (0-based) ───────────────────────────────────────────────
const COL = {
  BOOKING_ID:0, CREATED_AT:1, DATE:2, COURT:3, START_TIME:4, END_TIME:5,
  DURATION:6, NAME:7, WHATSAPP:8, PRICE:9, TOTAL:10, PAYMENT_METHOD:11,
  STATUS:12, BOOKED_VIA:13, DOOR_CODE:14, DISCOUNT:15, CONFIRMED_AT:16,
  NOTES:17, EXPIRES_AT:18
};

// ─── Blocks columns (0-based) ─────────────────────────────────────────────────
const BLK = {
  ID:0, DATE:1, COURT:2, START_HOUR:3, END_HOUR:4,
  REASON:5, ACTIVE:6, CREATED_AT:7, CREATED_BY:8
};

const COURT_LABELS = {
  home:     "Home Court 主場",
  practice: "Practice Court 練習場",
  both:     "Both Courts 全場"
};

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTING
// ═══════════════════════════════════════════════════════════════════════════════
function doGet(e) {
  const action = e.parameter.action || "";
  const pw     = e.parameter.password || "";

  // Public
  if (action === "availability") return json(getAvailability(e.parameter));
  if (action === "book")         return json(createBooking(e.parameter));

  // Protected
  if (!checkPw(pw)) return json({ error: "Unauthorized", code: 401 });

  if (action === "confirm")          return json(confirmBooking(e.parameter.id));
  if (action === "release")          return json(releaseBooking(e.parameter.id));
  if (action === "addNote")          return json(addNote(e.parameter));
  if (action === "admin")            return json(getAdminData());
  if (action === "getBlocks")        return json(getBlocks(e.parameter));
  if (action === "addBlock")         return json(addBlock(e.parameter));
  if (action === "removeBlock")      return json(removeBlock(e.parameter.id));
  if (action === "inventory")        return json(getInventory());
  if (action === "updateInventory")  return json(updateInventory(e.parameter));

  return json({ error: "Unknown action" });
}

function json(d) {
  return ContentService
    .createTextOutput(JSON.stringify(d))
    .setMimeType(ContentService.MimeType.JSON);
}

function checkPw(pw) { return pw === ADMIN_PASSWORD; }

// ═══════════════════════════════════════════════════════════════════════════════
// AVAILABILITY — checks both Bookings AND Blocks
// ═══════════════════════════════════════════════════════════════════════════════
function getAvailability(params) {
  releaseExpiredBookings();

  const date  = params.date;
  const court = params.court; // "home" | "practice" | "both"
  const blocked = {};

  // ── 1. Check website bookings ──────────────────────────────────────────────
  const bSheet = getSheet(BOOKING_SHEET);
  const bRows  = bSheet.getDataRange().getValues().slice(1);

  bRows.forEach(row => {
    const status = row[COL.STATUS];
    if (status !== "PENDING" && status !== "CONFIRMED") return;
    if (String(row[COL.DATE]) !== date) return;

    const rowCourt = String(row[COL.COURT]);
    if (!courtsConflict(rowCourt, court)) return;

    const startH = timeToHour(String(row[COL.START_TIME]));
    const dur    = Number(row[COL.DURATION]);
    for (let i = 0; i < dur; i++) {
      const h = String((startH + i) % 24);
      if (!blocked[h] || status === "CONFIRMED") blocked[h] = status;
    }
  });

  // ── 2. Check manual blocks ─────────────────────────────────────────────────
  try {
    const blkSheet = getSheet(BLOCKS_SHEET);
    const blkRows  = blkSheet.getDataRange().getValues().slice(1);

    blkRows.forEach(row => {
      if (String(row[BLK.ACTIVE]).toLowerCase() !== "yes") return;
      if (String(row[BLK.DATE]) !== date) return;

      const blkCourt = String(row[BLK.COURT]);
      if (!courtsConflict(blkCourt, court)) return;

      const startH = Number(row[BLK.START_HOUR]);
      const endH   = Number(row[BLK.END_HOUR]);
      for (let h = startH; h < endH; h++) {
        blocked[String(h % 24)] = "CONFIRMED"; // show as booked to customers
      }
    });
  } catch(e) {
    Logger.log("Blocks sheet not found: " + e.message);
  }

  return { blocked };
}

// Helper: do two court strings conflict?
function courtsConflict(existingCourt, requestedCourt) {
  const existing  = courtKey(existingCourt);
  const requested = requestedCourt;
  return existing === requested || existing === "both" || requested === "both";
}

// Convert court label back to key
function courtKey(label) {
  if (label === COURT_LABELS.home)     return "home";
  if (label === COURT_LABELS.practice) return "practice";
  if (label === COURT_LABELS.both)     return "both";
  return label.toLowerCase();
}

// ═══════════════════════════════════════════════════════════════════════════════
// CREATE BOOKING
// ═══════════════════════════════════════════════════════════════════════════════
function createBooking(params) {
  releaseExpiredBookings();

  const date      = params.date;
  const court     = params.court;
  const startH    = Number(params.startHour);
  const dur       = Number(params.duration);
  const name      = params.name      || "Guest";
  const phone     = params.phone     || "";
  const total     = params.total     || "0";
  const price     = params.price     || total;
  const payMethod = params.paymentMethod || "FPS";

  if (!date || !court || isNaN(startH) || isNaN(dur)) return { success:false, error:"Missing fields" };
  if (dur < 1 || dur > 3) return { success:false, error:"Duration 1–3 hours only" };

  const avail = getAvailability({ date, court });
  for (let i = 0; i < dur; i++) {
    const h = String((startH + i) % 24);
    if (avail.blocked[h]) return { success:false, error:"Slot no longer available", takenStatus: avail.blocked[h] };
  }

  const startStr   = padH(startH) + ":00";
  const endH       = startH + dur;
  const endStr     = padH(endH >= 24 ? endH - 24 : endH) + ":00";
  const courtLabel = COURT_LABELS[court] || court;
  const bookingId  = "ADPC-" + Date.now().toString(36).toUpperCase();
  const now        = new Date();
  const expires    = new Date(now.getTime() + HOLD_HOURS * 3600 * 1000);

  getSheet(BOOKING_SHEET).appendRow([
    bookingId, now.toISOString(), date, courtLabel, startStr, endStr, dur,
    name, phone, price, total, payMethod, "PENDING", "Website",
    "", "", "", "", expires.toISOString()
  ]);

  notifyAdmin(bookingId, { date, courtLabel, startStr, endStr, dur, name, phone, total, payMethod });
  return { success:true, bookingId, expiresAt: expires.toISOString() };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIRM / RELEASE / NOTE
// ═══════════════════════════════════════════════════════════════════════════════
function confirmBooking(bookingId) {
  const sheet = getSheet(BOOKING_SHEET);
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][COL.BOOKING_ID] !== bookingId) continue;
    if (data[i][COL.STATUS] === "CONFIRMED") return { success:true, message:`${bookingId} already confirmed.` };
    const now = new Date();
    sheet.getRange(i+1, COL.STATUS+1).setValue("CONFIRMED");
    sheet.getRange(i+1, COL.CONFIRMED_AT+1).setValue(now.toLocaleString("en-HK"));
    return { success:true, message:`✅ ${bookingId} confirmed! Remember to send door code via WhatsApp.`, booking: rowToObj(data[i]) };
  }
  return { success:false, error:"Not found" };
}

function releaseBooking(bookingId) {
  const sheet = getSheet(BOOKING_SHEET);
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][COL.BOOKING_ID] !== bookingId) continue;
    sheet.getRange(i+1, COL.STATUS+1).setValue("RELEASED");
    sheet.getRange(i+1, COL.NOTES+1).setValue("Released manually " + new Date().toLocaleString("en-HK"));
    return { success:true, message:`🔓 ${bookingId} released.` };
  }
  return { success:false, error:"Not found" };
}

function addNote(params) {
  const sheet = getSheet(BOOKING_SHEET);
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][COL.BOOKING_ID] !== params.id) continue;
    sheet.getRange(i+1, COL.NOTES+1).setValue(params.note || "");
    return { success:true };
  }
  return { success:false, error:"Not found" };
}

// ═══════════════════════════════════════════════════════════════════════════════
// BLOCKS — Manual court blocking
// ═══════════════════════════════════════════════════════════════════════════════
function getBlocks(params) {
  const sheet = getSheet(BLOCKS_SHEET);
  const data  = sheet.getDataRange().getValues().slice(1);
  let rows = data.map(r => ({
    id:        String(r[BLK.ID]),
    date:      String(r[BLK.DATE]),
    court:     String(r[BLK.COURT]),
    startHour: Number(r[BLK.START_HOUR]),
    endHour:   Number(r[BLK.END_HOUR]),
    reason:    String(r[BLK.REASON]),
    active:    String(r[BLK.ACTIVE]).toLowerCase() === "yes",
    createdAt: String(r[BLK.CREATED_AT]),
    createdBy: String(r[BLK.CREATED_BY]),
  })).filter(r => r.id && r.date);

  // Optional: filter by date range
  if (params.from) rows = rows.filter(r => r.date >= params.from);
  if (params.to)   rows = rows.filter(r => r.date <= params.to);

  return { blocks: rows };
}

function addBlock(params) {
  const sheet = getSheet(BLOCKS_SHEET);
  const id    = "BLK-" + Date.now().toString(36).toUpperCase();
  const now   = new Date();

  // Validate
  const date      = params.date;
  const court     = params.court;   // "home" | "practice" | "both"
  const startHour = Number(params.startHour);
  const endHour   = Number(params.endHour);
  const reason    = params.reason   || "Offline Booking";
  const createdBy = params.createdBy || "Admin";

  if (!date || !court || isNaN(startHour) || isNaN(endHour)) {
    return { success:false, error:"Missing fields" };
  }
  if (startHour >= endHour) {
    return { success:false, error:"End hour must be after start hour" };
  }

  sheet.appendRow([
    id, date, court, startHour, endHour, reason, "yes",
    now.toISOString(), createdBy
  ]);

  return { success:true, blockId: id };
}

function removeBlock(blockId) {
  const sheet = getSheet(BLOCKS_SHEET);
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][BLK.ID]) !== blockId) continue;
    sheet.getRange(i+1, BLK.ACTIVE+1).setValue("no");
    return { success:true, message:`Block ${blockId} removed.` };
  }
  return { success:false, error:"Block not found" };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN DATA
// ═══════════════════════════════════════════════════════════════════════════════
function getAdminData() {
  releaseExpiredBookings();
  const sheet = getSheet(BOOKING_SHEET);
  const data  = sheet.getDataRange().getValues().slice(1);
  const today = new Date().toISOString().split("T")[0];
  const all   = data.map(r => rowToObj(r)).filter(r => r.bookingId);

  const pending   = all.filter(r => r.status === "PENDING");
  const confirmed = all.filter(r => r.status === "CONFIRMED");
  const todayBk   = all.filter(r => r.date === today);
  const revenue   = confirmed.reduce((s, r) => s + (Number(r.total) || 0), 0);
  const upcoming  = confirmed.filter(r => r.date >= today)
                             .sort((a,b) => a.date.localeCompare(b.date))
                             .slice(0, 20);

  return {
    stats:    { pending: pending.length, confirmed: confirmed.length, today: todayBk.length, revenue },
    pending:  pending.sort((a,b) => a.createdAt.localeCompare(b.createdAt)),
    upcoming,
    recent:   all.sort((a,b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50),
    apiBase:  ScriptApp.getService().getUrl()
  };
}

function rowToObj(r) {
  return {
    bookingId: r[COL.BOOKING_ID]||"", createdAt: r[COL.CREATED_AT]||"",
    date: r[COL.DATE]||"", court: r[COL.COURT]||"",
    startTime: r[COL.START_TIME]||"", endTime: r[COL.END_TIME]||"",
    duration: r[COL.DURATION]||"", name: r[COL.NAME]||"",
    whatsapp: r[COL.WHATSAPP]||"", price: r[COL.PRICE]||"",
    total: r[COL.TOTAL]||"", paymentMethod: r[COL.PAYMENT_METHOD]||"",
    status: r[COL.STATUS]||"", bookedVia: r[COL.BOOKED_VIA]||"",
    doorCode: r[COL.DOOR_CODE]||"", discount: r[COL.DISCOUNT]||"",
    confirmedAt: r[COL.CONFIRMED_AT]||"", notes: r[COL.NOTES]||""
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// INVENTORY
// ═══════════════════════════════════════════════════════════════════════════════
function getInventory() {
  const sheet = getSheet(INVENTORY_SHEET);
  const data  = sheet.getDataRange().getValues().slice(1);
  return { items: data.map(r => ({
    id: r[0]||"", category: r[1]||"", item: r[2]||"",
    total: Number(r[3])||0, available: Number(r[4])||0, inUse: Number(r[5])||0,
    condition: r[6]||"Good", notes: r[7]||"", updatedAt: r[8]||""
  }))};
}

function updateInventory(params) {
  const sheet = getSheet(INVENTORY_SHEET);
  const data  = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) !== String(params.itemId)) continue;
    if (params.available  !== undefined) sheet.getRange(i+1,5).setValue(Number(params.available));
    if (params.inUse      !== undefined) sheet.getRange(i+1,6).setValue(Number(params.inUse));
    if (params.condition  !== undefined) sheet.getRange(i+1,7).setValue(params.condition);
    if (params.notes      !== undefined) sheet.getRange(i+1,8).setValue(params.notes);
    sheet.getRange(i+1,9).setValue(new Date().toLocaleString("en-HK"));
    return { success:true };
  }
  return { success:false, error:"Item not found" };
}

// ═══════════════════════════════════════════════════════════════════════════════
// AUTO-RELEASE
// ═══════════════════════════════════════════════════════════════════════════════
function releaseExpiredBookings() {
  const sheet = getSheet(BOOKING_SHEET);
  const data  = sheet.getDataRange().getValues();
  const now   = new Date();
  for (let i = 1; i < data.length; i++) {
    if (data[i][COL.STATUS] !== "PENDING") continue;
    const expires = new Date(data[i][COL.EXPIRES_AT]);
    if (now > expires) {
      sheet.getRange(i+1, COL.STATUS+1).setValue("RELEASED");
      sheet.getRange(i+1, COL.NOTES+1).setValue("Auto-released " + now.toLocaleString("en-HK"));
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN EMAIL
// ═══════════════════════════════════════════════════════════════════════════════
function notifyAdmin(bookingId, b) {
  const base       = ScriptApp.getService().getUrl();
  const confirmUrl = `${base}?action=confirm&id=${bookingId}&password=${ADMIN_PASSWORD}`;
  const releaseUrl = `${base}?action=release&id=${bookingId}&password=${ADMIN_PASSWORD}`;
  const subject    = `🏓 New Booking ${bookingId} — ${b.date} ${b.courtLabel}`;
  const body = [
    `New website booking:`,``,
    `Booking ID : ${bookingId}`,
    `Date       : ${b.date}`,
    `Court      : ${b.courtLabel}`,
    `Time       : ${b.startStr} – ${b.endStr} (${b.dur}h)`,
    `Customer   : ${b.name}`,
    `WhatsApp   : ${b.phone}`,
    `Total      : HKD $${b.total}`,
    `Payment    : ${b.payMethod}`,``,
    `✅ CONFIRM: ${confirmUrl}`,``,
    `❌ RELEASE: ${releaseUrl}`,``,
    `⚠️  After confirming — send door code via WhatsApp!`,
    `Slot auto-releases in ${HOLD_HOURS} hour.`
  ].join("\n");
  try { MailApp.sendEmail(ADMIN_EMAIL, subject, body); } catch(e) { Logger.log(e); }
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
function getSheet(name)    { return SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name); }
function padH(h)           { return String(h).padStart(2,"0"); }
function timeToHour(str)   { return parseInt((str||"0").split(":")[0], 10); }

// ═══════════════════════════════════════════════════════════════════════════════
// SETUP — Run each ONCE
// ═══════════════════════════════════════════════════════════════════════════════
function setupSheet() {
  const sheet = getSheet(BOOKING_SHEET);
  const h = ["Booking ID","Created At","Date","Court","Start Time","End Time",
    "Duration (hrs)","Name","WhatsApp","Price (HKD)","Total (HKD)","Payment Method",
    "Status","Booked Via","Door Code","Discount (HKD)","Confirmed At","Notes","Expires At"];
  sheet.getRange(1,1,1,h.length).setValues([h]);
  sheet.getRange(1,1,1,h.length).setBackground("#1B5C3F").setFontColor("white").setFontWeight("bold");
  sheet.getRange(1,15,1,4).setBackground("#F47820").setFontColor("white");
  sheet.setFrozenRows(1);
  sheet.hideColumns(19);
  Logger.log("✅ Bookings sheet ready.");
}

function setupBlocksSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(BLOCKS_SHEET);
  if (!sheet) sheet = ss.insertSheet(BLOCKS_SHEET);
  const h = ["Block ID","Date","Court","Start Hour","End Hour","Reason","Active","Created At","Created By"];
  sheet.getRange(1,1,1,h.length).setValues([h]);
  sheet.getRange(1,1,1,h.length).setBackground("#F47820").setFontColor("white").setFontWeight("bold");
  sheet.setFrozenRows(1);
  // Sample row
  sheet.getRange(2,1,1,9).setValues([[
    "BLK-SAMPLE","2026-04-20","Home Court 主場",14,18,"Private Event - Sample","no",
    new Date().toISOString(),"Admin"
  ]]);
  sheet.getRange(2,1,1,9).setBackground("#FFF3E0");
  Logger.log("✅ Blocks sheet created. The sample row is inactive (Active=no). Delete it when ready.");
}

function setupInventorySheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(INVENTORY_SHEET);
  if (!sheet) sheet = ss.insertSheet(INVENTORY_SHEET);
  const h = ["ID","Category","Item","Total","Available","In Use","Condition","Notes","Updated At"];
  sheet.getRange(1,1,1,h.length).setValues([h]);
  sheet.getRange(1,1,1,h.length).setBackground("#1B5C3F").setFontColor("white").setFontWeight("bold");
  const items = [
    ["1","Paddles","Beginner Paddle",8,8,0,"Good","",""],
    ["2","Paddles","Intermediate Paddle",6,6,0,"Good","",""],
    ["3","Paddles","Advanced Paddle",4,4,0,"Good","",""],
    ["4","Balls","Onix Indoor Ball",20,20,0,"Good","",""],
    ["5","Balls","Outdoor Ball",12,12,0,"Good","",""],
    ["6","Balls","Practice Ball",15,15,0,"Good","",""],
    ["7","Shoes","Rental Shoes 38-40",3,3,0,"Good","",""],
    ["8","Shoes","Rental Shoes 41-43",2,2,0,"Good","",""],
    ["9","Shoes","Rental Shoes 44-46",2,2,0,"Good","",""],
  ];
  sheet.getRange(2,1,items.length,h.length).setValues(items);
  sheet.setFrozenRows(1);
  Logger.log("✅ Inventory sheet created.");
}

function setupTimeTrigger() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === "releaseExpiredBookings")
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger("releaseExpiredBookings").timeBased().everyHours(1).create();
  Logger.log("✅ Hourly trigger installed.");
}
