// ============================================================
// SML Birthday Wishes System — Code.gs v2
// เพิ่มใหม่: Points, Monthly_Stats, QR, ยอดสะสม มิ.ย.-ธ.ค. 2569
// ============================================================
// Sheet ID เดิม — ไม่ต้องเปลี่ยน
var SHEET_ID      = '1rpJKzrWoBQwJAM9OiByecs1CYLB-CSumkdXg6ldJ0JU';
var SHEET_WISHES  = 'Wishes';
var SHEET_PERSONS = 'Persons';
var SHEET_POINTS  = 'Points';        // ใหม่
var SHEET_STATS   = 'Monthly_Stats'; // ใหม่

// เดือนที่กิจกรรมเปิด (admin กำหนด) — มิ.ย. = 6, ธ.ค. = 12
var ACTIVITY_START_MONTH = 6;   // มิถุนายน 2569
var ACTIVITY_START_YEAR  = 2569;
var ACTIVITY_END_MONTH   = 12;  // ธันวาคม 2569
var ACTIVITY_END_YEAR    = 2569;

var THAI_MONTHS = [
  '','มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน',
  'กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'
];
var THAI_MONTHS_SHORT = [
  '','ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.',
  'ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'
];

// ============================================================
// ROUTER — GET เท่านั้น (ป้องกัน CORS)
// ============================================================
function doGet(e) {
  var p      = e.parameter || {};
  var action = p.action    || '';
  var cb     = p.callback  || '';

  try {
    var result;
    if (action === 'getWishes')           result = getWishes(p);
    else if (action === 'addWish')        result = addWish(p);
    else if (action === 'getPersons')     result = getPersons();
    else if (action === 'getPoints')      result = getPoints(p);
    else if (action === 'addPoints')      result = addPoints(p);
    else if (action === 'getLeaderboard') result = getLeaderboard(p);
    else if (action === 'getMonthlyStats')result = getMonthlyStats();
    else if (action === 'ping')           result = {ok: true, time: new Date().toISOString()};
    else result = {error: 'unknown action: ' + action};

    return jsonOut(result, cb);
  } catch(err) {
    return jsonOut({error: err.toString()}, cb);
  }
}

function jsonOut(data, cb) {
  var str = JSON.stringify(data);
  if (cb) str = cb + '(' + str + ')';
  return ContentService
    .createTextOutput(str)
    .setMimeType(cb ? ContentService.MimeType.JAVASCRIPT : ContentService.MimeType.JSON);
}

// ============================================================
// ── WISHES (เดิม ไม่เปลี่ยน) ──────────────────────────────
// ============================================================
function getWishes(p) {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var ws = ss.getSheetByName(SHEET_WISHES);
  if (!ws) return {wishes: []};
  var rows = ws.getDataRange().getValues();
  var wishes = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (!r[0]) continue;
    wishes.push({
      id:        r[0],
      name:      r[1],
      message:   r[2],
      mood:      r[3],
      photo:     r[4] || '',
      likes:     r[5] || 0,
      timestamp: r[6] ? new Date(r[6]).toISOString() : '',
      month:     r[7] || ''
    });
  }
  return {wishes: wishes.reverse()};
}

function addWish(p) {
  var name    = (p.name    || '').trim();
  var message = (p.message || '').trim();
  var mood    = p.mood    || '';
  var photo   = p.photo   || '';
  var month   = p.month   || '';
  if (!name || !message) return {ok: false, error: 'name/message required'};

  var ss  = SpreadsheetApp.openById(SHEET_ID);
  var ws  = ss.getSheetByName(SHEET_WISHES);
  if (!ws) { ws = ss.insertSheet(SHEET_WISHES); ws.appendRow(['ID','Name','Message','Mood','Photo','Likes','Timestamp','Month']); }

  var id  = 'W' + new Date().getTime();
  var now = new Date();
  ws.appendRow([id, name, message, mood, photo, 0, now, month]);

  // อัปเดต Monthly Stats
  updateMonthlyStat(now, 'wish', name);

  return {ok: true, id: id};
}

// ============================================================
// ── PERSONS (เดิม ไม่เปลี่ยน) ─────────────────────────────
// ============================================================
function getPersons() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var ws = ss.getSheetByName(SHEET_PERSONS);
  if (!ws) return {persons: []};
  var rows = ws.getDataRange().getValues();
  var persons = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (!r[0]) continue;
    persons.push({
      code:   r[0],
      name:   r[1],
      month:  r[2],
      dept:   r[3] || '',
      active: r[4] !== false && r[4] !== 'FALSE'
    });
  }
  return {persons: persons};
}

// ============================================================
// ── POINTS ────────────────────────────────────────────────
// ============================================================

// GET: ?action=getPoints&name=สมใจ&quarter=มิ.ย.-2569
function getPoints(p) {
  var name    = (p.name || '').trim();
  var quarter = p.quarter || '';
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var ws = ensurePointsSheet(ss);
  var rows = ws.getDataRange().getValues();
  if (rows.length < 2) return {found: false, totalPts: 0};

  var headers = rows[0];
  var IDX = makeIdx(headers);

  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (normName(r[IDX['Name']]) === normName(name) && r[IDX['Quarter']] === quarter) {
      return {
        found:     true,
        name:      r[IDX['Name']],
        wishPts:   r[IDX['WishPts']]  || 0,
        quizPts:   r[IDX['QuizPts']]  || 0,
        totalPts:  r[IDX['TotalPts']] || 0,
        wishDone:  r[IDX['WishDone']] === true || r[IDX['WishDone']] === 'TRUE',
        quizDone:  r[IDX['QuizDone']] === true || r[IDX['QuizDone']] === 'TRUE',
        quarter:   r[IDX['Quarter']]
      };
    }
  }
  return {found: false, totalPts: 0, wishDone: false, quizDone: false};
}

// GET: ?action=addPoints&type=wish&name=สมใจ&quarter=มิ.ย.-2569
// GET: ?action=addPoints&type=quiz&name=สมใจ&score=3&total=3&quarter=มิ.ย.-2569
function addPoints(p) {
  var type    = p.type    || '';
  var name    = (p.name   || '').trim();
  var quarter = p.quarter || getCurrentQuarter();
  var score   = parseInt(p.score  || '0', 10);
  var total   = parseInt(p.total  || '0', 10);
  if (!name) return {ok: false, error: 'name required'};

  var ss  = SpreadsheetApp.openById(SHEET_ID);
  var ws  = ensurePointsSheet(ss);
  var rows = ws.getDataRange().getValues();
  var headers = rows[0];
  var IDX = makeIdx(headers);

  // หาแถวของคนนี้ใน quarter นี้
  var rowIdx = -1;
  for (var i = 1; i < rows.length; i++) {
    if (normName(rows[i][IDX['Name']]) === normName(name) && rows[i][IDX['Quarter']] === quarter) {
      rowIdx = i + 1; // 1-indexed sheet row
      break;
    }
  }

  var now = new Date();

  if (rowIdx === -1) {
    // สร้างแถวใหม่
    ws.appendRow([name, 0, 0, 0, false, false, quarter, now]);
    rows = ws.getDataRange().getValues();
    rowIdx = rows.length;
    headers = rows[0];
    IDX = makeIdx(headers);
  }

  // อ่านค่าปัจจุบัน
  var curRow   = ws.getRange(rowIdx, 1, 1, headers.length).getValues()[0];
  var wishDone = curRow[IDX['WishDone']] === true || curRow[IDX['WishDone']] === 'TRUE';
  var quizDone = curRow[IDX['QuizDone']] === true || curRow[IDX['QuizDone']] === 'TRUE';
  var wishPts  = parseFloat(curRow[IDX['WishPts']]) || 0;
  var quizPts  = parseFloat(curRow[IDX['QuizPts']]) || 0;
  var earned   = 0;

  if (type === 'wish') {
    if (wishDone) return {ok: false, error: 'already_done', msg: 'อวยพรแล้วในไตรมาสนี้'};
    earned  = 1;
    wishPts += earned;
    ws.getRange(rowIdx, IDX['WishPts']  + 1).setValue(wishPts);
    ws.getRange(rowIdx, IDX['WishDone'] + 1).setValue(true);
    updateMonthlyStat(now, 'wish', name);

  } else if (type === 'quiz') {
    if (quizDone) return {ok: false, error: 'already_done', msg: 'ตอบ Quiz แล้วในไตรมาสนี้'};
    earned  = (score === total && total > 0) ? 2 : 1;
    quizPts += earned;
    ws.getRange(rowIdx, IDX['QuizPts']  + 1).setValue(quizPts);
    ws.getRange(rowIdx, IDX['QuizDone'] + 1).setValue(true);
    updateMonthlyStat(now, 'quiz', name);

  } else {
    return {ok: false, error: 'type must be wish or quiz'};
  }

  var newTotal = wishPts + quizPts;
  ws.getRange(rowIdx, IDX['TotalPts']    + 1).setValue(newTotal);
  ws.getRange(rowIdx, IDX['LastUpdated'] + 1).setValue(now);

  return {ok: true, earned: earned, totalPts: newTotal, wishPts: wishPts, quizPts: quizPts};
}

// GET: ?action=getLeaderboard&quarter=มิ.ย.-2569&limit=20
function getLeaderboard(p) {
  var quarter = p.quarter || '';
  var limit   = parseInt(p.limit || '20', 10);
  var ss  = SpreadsheetApp.openById(SHEET_ID);
  var ws  = ensurePointsSheet(ss);
  var rows = ws.getDataRange().getValues();
  if (rows.length < 2) return {board: []};
  var headers = rows[0];
  var IDX = makeIdx(headers);

  var board = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (quarter && r[IDX['Quarter']] !== quarter) continue;
    var pts = parseFloat(r[IDX['TotalPts']]) || 0;
    if (pts > 0) board.push({name: r[IDX['Name']], totalPts: pts, wishPts: r[IDX['WishPts']] || 0, quizPts: r[IDX['QuizPts']] || 0});
  }
  board.sort(function(a, b) { return b.totalPts - a.totalPts; });
  return {board: board.slice(0, limit)};
}

// ============================================================
// ── MONTHLY STATS ─────────────────────────────────────────
// ============================================================

// อัปเดต Monthly_Stats ทุกครั้งที่มีกิจกรรม
function updateMonthlyStat(dateObj, type, name) {
  var ss  = SpreadsheetApp.openById(SHEET_ID);
  var ws  = ensureStatsSheet(ss);
  var rows = ws.getDataRange().getValues();
  var headers = rows[0];
  var IDX = makeIdx(headers);

  var jsYear  = dateObj.getFullYear();
  var month   = dateObj.getMonth() + 1; // 1-12
  var thaiYear = jsYear + 543;

  // เช็คว่าเดือนนี้อยู่ในช่วงกิจกรรมไหม
  if (!isInActivityRange(month, thaiYear)) return;

  var monthKey = month + '-' + thaiYear; // เช่น "6-2569"

  // หาแถวของเดือนนี้
  var rowIdx = -1;
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][IDX['MonthKey']] === monthKey) { rowIdx = i + 1; break; }
  }

  if (rowIdx === -1) {
    // สร้างแถวใหม่
    ws.appendRow([
      monthKey,
      month,
      thaiYear,
      THAI_MONTHS[month],
      THAI_MONTHS_SHORT[month],
      0, 0, 0,
      new Date()
    ]);
    rows = ws.getDataRange().getValues();
    rowIdx = rows.length;
    headers = rows[0];
    IDX = makeIdx(headers);
  }

  // นับ unique names จาก Wishes และ Points sheets
  var counts = countUniqueForMonth(month, jsYear);
  var sheetRange = ws.getRange(rowIdx, 1, 1, headers.length);
  var curRow = sheetRange.getValues()[0];

  curRow[IDX['WishCount']]         = counts.wishCount;
  curRow[IDX['QuizCount']]         = counts.quizCount;
  curRow[IDX['TotalParticipants']] = counts.totalUnique;
  curRow[IDX['UpdatedAt']]         = new Date();

  sheetRange.setValues([curRow]);
}

// นับ unique participants จาก Wishes + Points ของเดือนนั้น
function countUniqueForMonth(month, jsYear) {
  var ss = SpreadsheetApp.openById(SHEET_ID);

  // นับจาก Wishes sheet
  var wishNames = {};
  var wsW = ss.getSheetByName(SHEET_WISHES);
  if (wsW && wsW.getLastRow() > 1) {
    var wRows = wsW.getDataRange().getValues();
    var wHeaders = wRows[0];
    var wIDX = makeIdx(wHeaders);
    for (var i = 1; i < wRows.length; i++) {
      var ts = wRows[i][wIDX['Timestamp']];
      if (!ts) continue;
      var d = new Date(ts);
      if (d.getMonth() + 1 === month && d.getFullYear() === jsYear) {
        var n = normName(wRows[i][wIDX['Name']]);
        if (n) wishNames[n] = true;
      }
    }
  }

  // นับจาก Points sheet (QuizDone)
  var quizNames = {};
  var wsP = ss.getSheetByName(SHEET_POINTS);
  if (wsP && wsP.getLastRow() > 1) {
    var pRows = wsP.getDataRange().getValues();
    var pHeaders = pRows[0];
    var pIDX = makeIdx(pHeaders);
    for (var j = 1; j < pRows.length; j++) {
      var updAt = pRows[j][pIDX['LastUpdated']];
      if (!updAt) continue;
      var pd = new Date(updAt);
      if (pd.getMonth() + 1 === month && pd.getFullYear() === jsYear) {
        var pn = normName(pRows[j][pIDX['Name']]);
        var qd = pRows[j][pIDX['QuizDone']];
        if (pn && (qd === true || qd === 'TRUE')) quizNames[pn] = true;
      }
    }
  }

  // Union
  var allNames = {};
  Object.keys(wishNames).forEach(function(k) { allNames[k] = true; });
  Object.keys(quizNames).forEach(function(k) { allNames[k] = true; });

  return {
    wishCount:    Object.keys(wishNames).length,
    quizCount:    Object.keys(quizNames).length,
    totalUnique:  Object.keys(allNames).length
  };
}

// GET: ?action=getMonthlyStats
function getMonthlyStats() {
  var ss  = SpreadsheetApp.openById(SHEET_ID);
  var ws  = ensureStatsSheet(ss);

  // สร้างแถว placeholder สำหรับ มิ.ย.-ธ.ค. ที่ยังไม่มีข้อมูล
  initActivityMonths(ss, ws);

  var rows = ws.getDataRange().getValues();
  if (rows.length < 2) return {stats: [], summary: {totalWish: 0, totalQuiz: 0, totalUnique: 0}};
  var headers = rows[0];
  var IDX = makeIdx(headers);

  var stats = [];
  var totalWish = 0, totalQuiz = 0, allNames = {};

  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    var wc = parseInt(r[IDX['WishCount']])         || 0;
    var qc = parseInt(r[IDX['QuizCount']])          || 0;
    var tp = parseInt(r[IDX['TotalParticipants']]) || 0;
    totalWish += wc;
    totalQuiz += qc;
    stats.push({
      monthKey:          r[IDX['MonthKey']],
      month:             r[IDX['Month']],
      year:              r[IDX['Year']],
      monthName:         r[IDX['MonthName']],
      monthShort:        r[IDX['MonthShort']],
      wishCount:         wc,
      quizCount:         qc,
      totalParticipants: tp
    });
  }

  // เรียงตามเดือน มิ.ย.→ธ.ค.
  stats.sort(function(a, b) { return a.month - b.month; });

  // Top 10 โดย totalParticipants
  var top10 = stats.slice().sort(function(a, b) {
    return b.totalParticipants - a.totalParticipants;
  }).slice(0, 10);

  var totalUnique = 0;
  stats.forEach(function(s) { totalUnique = Math.max(totalUnique, s.totalParticipants); });
  // นับ unique สะสมจากทุกเดือนแทน
  totalUnique = countAllTimeUnique(ss);

  return {
    stats:  stats,
    top10:  top10,
    summary: {
      totalWish:   totalWish,
      totalQuiz:   totalQuiz,
      totalUnique: totalUnique
    }
  };
}

// นับ unique names ทั้งหมดตลอด มิ.ย.-ธ.ค.
function countAllTimeUnique(ss) {
  var allNames = {};
  var wsW = ss.getSheetByName(SHEET_WISHES);
  if (wsW && wsW.getLastRow() > 1) {
    var rows = wsW.getDataRange().getValues();
    for (var i = 1; i < rows.length; i++) {
      var n = normName(rows[i][1]);
      if (n) allNames[n] = true;
    }
  }
  var wsP = ss.getSheetByName(SHEET_POINTS);
  if (wsP && wsP.getLastRow() > 1) {
    var prows = wsP.getDataRange().getValues();
    var ph = prows[0]; var pidx = makeIdx(ph);
    for (var j = 1; j < prows.length; j++) {
      var pn = normName(prows[j][pidx['Name']]);
      if (pn) allNames[pn] = true;
    }
  }
  return Object.keys(allNames).length;
}

// สร้าง placeholder rows มิ.ย.-ธ.ค. ถ้ายังไม่มี
function initActivityMonths(ss, ws) {
  var rows = ws.getDataRange().getValues();
  var headers = rows[0];
  var IDX = makeIdx(headers);
  var existing = {};
  for (var i = 1; i < rows.length; i++) {
    existing[rows[i][IDX['MonthKey']]] = true;
  }
  for (var m = ACTIVITY_START_MONTH; m <= ACTIVITY_END_MONTH; m++) {
    var key = m + '-' + ACTIVITY_START_YEAR;
    if (!existing[key]) {
      ws.appendRow([key, m, ACTIVITY_START_YEAR, THAI_MONTHS[m], THAI_MONTHS_SHORT[m], 0, 0, 0, new Date()]);
    }
  }
}

// ============================================================
// ── HELPERS ───────────────────────────────────────────────
// ============================================================
function isInActivityRange(month, thaiYear) {
  if (thaiYear < ACTIVITY_START_YEAR || thaiYear > ACTIVITY_END_YEAR) return false;
  if (thaiYear === ACTIVITY_START_YEAR && month < ACTIVITY_START_MONTH) return false;
  if (thaiYear === ACTIVITY_END_YEAR   && month > ACTIVITY_END_MONTH)   return false;
  return true;
}

function getCurrentQuarter() {
  var now   = new Date();
  var month = now.getMonth() + 1;
  var year  = now.getFullYear() + 543;
  return THAI_MONTHS_SHORT[month] + '-' + year;
}

function normName(s) {
  return String(s || '').replace(/\s+/g,' ').trim().toLowerCase();
}

function makeIdx(headers) {
  var idx = {};
  for (var i = 0; i < headers.length; i++) idx[headers[i]] = i;
  return idx;
}

function ensurePointsSheet(ss) {
  var ws = ss.getSheetByName(SHEET_POINTS);
  if (!ws) {
    ws = ss.insertSheet(SHEET_POINTS);
    ws.appendRow(['Name','WishPts','QuizPts','TotalPts','WishDone','QuizDone','Quarter','LastUpdated']);
    ws.setFrozenRows(1);
    ws.getRange(1, 1, 1, 8).setBackground('#A855F7').setFontColor('#fff').setFontWeight('bold');
  }
  return ws;
}

function ensureStatsSheet(ss) {
  var ws = ss.getSheetByName(SHEET_STATS);
  if (!ws) {
    ws = ss.insertSheet(SHEET_STATS);
    ws.appendRow(['MonthKey','Month','Year','MonthName','MonthShort','WishCount','QuizCount','TotalParticipants','UpdatedAt']);
    ws.setFrozenRows(1);
    ws.getRange(1, 1, 1, 9).setBackground('#FF6B9D').setFontColor('#fff').setFontWeight('bold');
  }
  return ws;
}

// ============================================================
// ── SETUP & MENU ──────────────────────────────────────────
// ============================================================
function setup() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ensurePointsSheet(ss);
  var statsWs = ensureStatsSheet(ss);
  initActivityMonths(ss, statsWs);
  SpreadsheetApp.getUi().alert('✅ Setup สำเร็จ!\n\nSheets ที่พร้อมแล้ว:\n- Wishes\n- Persons\n- Points (ใหม่)\n- Monthly_Stats มิ.ย.-ธ.ค. 2569 (ใหม่)');
}

function recalcAllStats() {
  var ss  = SpreadsheetApp.openById(SHEET_ID);
  var ws  = ensureStatsSheet(ss);
  for (var m = ACTIVITY_START_MONTH; m <= ACTIVITY_END_MONTH; m++) {
    var jsYear = ACTIVITY_START_YEAR - 543;
    var counts = countUniqueForMonth(m, jsYear);
    var key    = m + '-' + ACTIVITY_START_YEAR;
    var rows   = ws.getDataRange().getValues();
    var headers = rows[0];
    var IDX = makeIdx(headers);
    for (var i = 1; i < rows.length; i++) {
      if (rows[i][IDX['MonthKey']] === key) {
        ws.getRange(i+1, IDX['WishCount']+1).setValue(counts.wishCount);
        ws.getRange(i+1, IDX['QuizCount']+1).setValue(counts.quizCount);
        ws.getRange(i+1, IDX['TotalParticipants']+1).setValue(counts.totalUnique);
        ws.getRange(i+1, IDX['UpdatedAt']+1).setValue(new Date());
        break;
      }
    }
  }
  SpreadsheetApp.getUi().alert('✅ คำนวณยอดสะสมใหม่ทั้งหมดแล้ว!');
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🎂 Birthday Activity')
    .addItem('▶️ Setup ครั้งแรก', 'setup')
    .addSeparator()
    .addItem('🔄 คำนวณยอดสะสมใหม่ทั้งหมด', 'recalcAllStats')
    .addToUi();
}
