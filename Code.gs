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
var SHEET_GAMESCORES = 'GameScores'; // ใหม่ — เก็บคะแนนเกมต่อพนักงาน/ผู้เล่น

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
// ── ข้อมูลพนักงานเก่า (Seed สำหรับ Persons sheet) ──────────
// month: 1-12 (เดือนเกิด)
// ============================================================
var PERSONS_SEED = [
  {code:'90245',name:'ประจักษ์ แก้วหานาม',dept:'PDI Operation',month:1,pos:'พนักงานตรวจสอบรถใหม่',day:23},
  {code:'90308',name:'สกุล พรมมี',dept:'PDI Operation',month:1,pos:'พนักงานปรับแต่ง',day:29},
  {code:'90576',name:'อานนท์ โสธรรมมงคล',dept:'Accessories Installetion',month:1,pos:'พนักงานปรับแต่ง',day:24},
  {code:'90954',name:'วิรัตน์ สมศรี',dept:'Yard Operation',month:1,pos:'พนักงาน Yard Control',day:5},
  {code:'91038',name:'เสรี คะรัมย์',dept:'Accessories Installetion',month:1,pos:'พนักงานติดตั้งอุปกรณ์รถใหม่',day:13},
  {code:'91115',name:'ชาญวิทย์ ฤทธิ์สยาม',dept:'Accessories Installetion',month:1,pos:'พนักงานติดตั้งอุปกรณ์',day:21},
  {code:'90239',name:'กิตติกา จันทร์สายทอง',dept:'Yard Operation',month:2,pos:'พนักงาน Yard Control',day:5},
  {code:'90615',name:'ประธาน แช่มโชติ',dept:'Accessories Installetion',month:2,pos:'พนักงานติดตั้งอุปกรณ์รถใหม่',day:19},
  {code:'90638',name:'รังสรรค์ แจ่มประเสริฐ',dept:'PDI Operation',month:2,pos:'หัวหน้าหน่วยล้างรถใหม่',day:21},
  {code:'91021',name:'โชสิญา ดานเรือง',dept:'HR&GA',month:2,pos:'ผู้ช่วย้จัดการส่วน HR&GA',day:2},
  {code:'90057',name:'ทวี กัณหา',dept:'Accessories Installetion',month:3,pos:'เจ้าหน้าที่เคลม',day:8},
  {code:'90841',name:'สัมพันธ์ สำนวน',dept:'Accessories Installetion',month:3,pos:'หัวหน้ากลุ่มงานติดตั้งอุปกรณ์รถใหม่',day:26},
  {code:'91100',name:'วิระพงษ์ กิระหัด',dept:'Accessories Installetion',month:3,pos:'พนักงานติดตั้งอุปกรณ์รถใหม่',day:27},
  {code:'91112',name:'กุหลาบ กองทอง',dept:'PDI Operation',month:3,pos:'พนักงานปรับแต่ง',day:28},
  {code:'90040',name:'ภูวดล ปาราลิตร์',dept:'HR&GA',month:4,pos:'พนักงานธุรการทั่วไป',day:2},
  {code:'90258',name:'นาเรณ มูฮำหมัด',dept:'PDI Operation',month:4,pos:'พนักงานตรวจสอบรถใหม่',day:17},
  {code:'90566',name:'ยืนยง กันหา',dept:'Yard Operation',month:4,pos:'พนักงาน Yard Control',day:24},
  {code:'90715',name:'ณธีพัฒน์ รัตนอธิพัฒน์',dept:'PDI Operation',month:4,pos:'พนักงานตรวจสอบรถใหม่',day:5},
  {code:'90835',name:'คำภา ปานิสัย',dept:'Accessories Installetion',month:4,pos:'เจ้าหน้าที่สโตร์',day:24},
  {code:'91059',name:'ปัทมา เห็มบุตร',dept:'บัญชีและการเงิน',month:4,pos:'เจ้าหน้าที่บัญชี',day:16},
  {code:'91079',name:'ณัฐวุฒิ เลิศวงษ์วรรณ',dept:'Yard Operation',month:4,pos:'ผู้ช่วยผู้จัดการส่วน Yrad Control',day:30},
  {code:'91116',name:'คณิน บุญอยู่',dept:'PDI Operation',month:4,pos:'พนักงานปรับแต่ง',day:5},
  {code:'90354',name:'นำพล เล็กใจกล้า',dept:'HR&GA',month:5,pos:'เจ้าหน้าที่จัดซื้อ',day:31},
  {code:'90439',name:'ปุณยนุช ม่วงศรี',dept:'บัญชีและการเงิน',month:5,pos:'ผู้ช่วยผู้จัดการส่วนบัญชีและการเงิน',day:19},
  {code:'90713',name:'บุญเลี้ยง เหมภูมิ',dept:'Accessories Installetion',month:5,pos:'พนักงานติดตั้งอุปกรณ์รถใหม่',day:3},
  {code:'90939',name:'สุรกิจ ตันกุล',dept:'PC&PDI Operation',month:5,pos:'ผู้จัดกรส่วนอาวุโส',day:21},
  {code:'90459',name:'ดนุพล วังใจ',dept:'Accessories Installetion',month:6,pos:'หัวหน้าหน่วยติดตั้งอุปกรณ์รถใหม่',day:15},
  {code:'90495',name:'บุญช่วย เนียมมาก',dept:'PDI Operation',month:6,pos:'พนักงานอาวุโสเทียบเท่าหัวหน้างาน(Final Judgement)',day:24},
  {code:'90570',name:'ชาญณรงค์ ดวงสิน',dept:'Yard Operation',month:6,pos:'พนักงาน Yard Control',day:3},
  {code:'91010',name:'โสภา สุดตาภักดี',dept:'บัญชีและการเงิน',month:6,pos:'เจ้าหน้าที่บัญชีทรัพย์สิน',day:18},
  {code:'91146',name:'อลงกรณ์ สัตยาคุณ',dept:'Accessories Installetion',month:6,pos:'เจ้าหน้าที่เคลม',day:9},
  {code:'90714',name:'วัชรินทร์ จันทำ',dept:'Accessories Installetion',month:7,pos:'พนักงานติดตั้งอุปกรณ์รถใหม่',day:24},
  {code:'91155',name:'สุนิษา เกษพิจิตร',dept:'HR&GA',month:7,pos:'จป.วิชาชีพ',day:5},
  {code:'91147',name:'ณัฐวิช เลิศวงษ์วรรณ',dept:'Yard Operation',month:8,pos:'พนักงาน Yard Control',day:3},
  {code:'91152',name:'วิวัฒน์ ตันติวีรกุล',dept:'Accessories Installetion',month:8,pos:'ผู้จัดการส่วน Accessories Installetion',day:15},
  {code:'90352',name:'อาทิตย์ ภูแล่นคู่',dept:'PDI Operation',month:9,pos:'หัวหน้าหน่วยตรวจสอบรถใหม่',day:15},
  {code:'90498',name:'อำนาจ ศุลญลา',dept:'PDI Operation',month:9,pos:'พนักงานตรวจสอบรถใหม่',day:23},
  {code:'90526',name:'ยศศักดิ์ ทัศนพงษ์',dept:'HR&GA',month:9,pos:'เจ้าหน้าที่ IT',day:24},
  {code:'91064',name:'วิภาวดี โตประดิษฐ์',dept:'Yard Operation',month:9,pos:'หัวหน้าแผนก Yard Operation',day:30},
  {code:'91118',name:'อดิเรก บัวจันทร์',dept:'Accessories Installetion',month:9,pos:'พนักงานติดตั้งอุปกรณ์รถใหม่',day:18},
  {code:'90368',name:'ฤทธิรงค์ อุปถัมภ์',dept:'Accessories Installetion',month:10,pos:'พนักงานติดตั้งอุปกรณ์รถใหม่',day:26},
  {code:'90986',name:'พรรณเชษฐ์ นครรัตน์',dept:'Yard Operation',month:10,pos:'พนักงาน Yard Control',day:26},
  {code:'90325',name:'ระวิ จันทโรทัย',dept:'PDI Operation',month:11,pos:'หัวหน้าแผนก PDI Operation',day:7},
  {code:'90696',name:'ดลลดา ใจแก้ว',dept:'HR&GA',month:11,pos:'เจ้าหน้าที่สรรหา',day:6},
  {code:'90722',name:'ธนโชติ โพธิ์ใต้',dept:'PDI Operation',month:11,pos:'พนักงานปรับแต่ง',day:23},
  {code:'91068',name:'วราภรณ์ ใสสม',dept:'Yard Operation',month:11,pos:'หัวหน้าหน่วย Yard Control',day:3},
  {code:'90179',name:'ณุชัย หาญรักษ์',dept:'PDI Operation',month:12,pos:'หัวหน้าหน่วยปรับแต่ง',day:28},
  {code:'90934',name:'เชิดชัย มิกขุนทด',dept:'-',month:12,pos:'ผู้ช่วยกรมการผู้จัดการ',day:17},
  {code:'91133',name:'กฤษณะ เหลืองมิวาย',dept:'Accessories Installetion',month:12,pos:'เจ้าหน้าที่สโตร์(Accessories)',day:24}
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
    else if (action === 'deleteWish')     result = deleteWish(p);
    else if (action === 'getPersons')     result = getPersons();
    else if (action === 'getPoints')      result = getPoints(p);
    else if (action === 'addPoints')      result = addPoints(p);
    else if (action === 'getLeaderboard') result = getLeaderboard(p);
    else if (action === 'getMonthlyStats')result = getMonthlyStats();
    else if (action === 'seedPersons')    result = seedPersons();
    else if (action === 'saveGameScore')  result = saveGameScore(p);
    else if (action === 'getGameLeaderboard') result = getGameLeaderboard(p);
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
// ── WISHES ────────────────────────────────────────────────
// Sheet columns: ID, Name, Message, Mood, Photo, Likes, Timestamp,
//                Month, EmpId, EmpName, SenderDept, Emoji, Ts
// New uploaded UI sends: action=addWish, empId, empName, senderName,
//                        senderDept, msg, emoji, ts
// getWishes returns a RAW ARRAY (not wrapped) — that's what the
// client's loadWishes()/deleteWish() expect (Array.isArray check).
// Each item carries BOTH new field names (empId/empName/senderName/
// senderDept/msg/emoji/ts) AND legacy field names (name/message/
// mood/photo/timestamp/month) for backward compatibility with the
// old index.html.
// ============================================================
function ensureWishesSheet(ss) {
  var ws = ss.getSheetByName(SHEET_WISHES);
  if (!ws) {
    ws = ss.insertSheet(SHEET_WISHES);
    ws.appendRow(['ID','Name','Message','Mood','Photo','Likes','Timestamp','Month','EmpId','EmpName','SenderDept','Emoji','Ts']);
    ws.setFrozenRows(1);
    ws.getRange(1, 1, 1, 13).setBackground('#FF6B9D').setFontColor('#fff').setFontWeight('bold');
  }
  // Backward-compat: add any missing columns to old sheets
  var headers = ws.getRange(1, 1, 1, Math.max(ws.getLastColumn(), 1)).getValues()[0];
  var want = ['ID','Name','Message','Mood','Photo','Likes','Timestamp','Month','EmpId','EmpName','SenderDept','Emoji','Ts'];
  for (var i = 0; i < want.length; i++) {
    if (headers.indexOf(want[i]) === -1) {
      ws.getRange(1, ws.getLastColumn() + 1).setValue(want[i]);
    }
  }
  return ws;
}

function getWishes(p) {
  var empId = (p && p.empId) ? String(p.empId).trim() : '';
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var ws = ensureWishesSheet(ss);
  var rows = ws.getDataRange().getValues();
  if (rows.length < 2) return [];
  var headers = rows[0];
  var IDX = makeIdx(headers);
  var wishes = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (!r[0]) continue;
    var rowEmpId = String(r[IDX['EmpId']] || '');
    if (empId && rowEmpId !== empId) continue;
    var tsRaw = r[IDX['Timestamp']];
    var tsIso = tsRaw ? new Date(tsRaw).toISOString() : '';
    wishes.push({
      // new field names (used by uploaded UI)
      id:         r[0],
      empId:      rowEmpId,
      empName:    r[IDX['EmpName']]    || '',
      senderName: r[IDX['Name']]       || r[IDX['SenderName']] || '',
      senderDept: r[IDX['SenderDept']] || '',
      msg:        r[IDX['Message']]    || '',
      emoji:      r[IDX['Emoji']]      || r[IDX['Mood']] || '',
      ts:         r[IDX['Ts']]         || tsIso,
      // legacy field names (old index.html)
      name:       r[IDX['Name']]       || '',
      message:    r[IDX['Message']]    || '',
      mood:       r[IDX['Mood']]       || '',
      photo:      r[IDX['Photo']]      || '',
      likes:      r[IDX['Likes']]      || 0,
      timestamp:  tsIso,
      month:      r[IDX['Month']]      || ''
    });
  }
  return wishes.reverse();
}

function addWish(p) {
  // Support both the new uploaded UI's field names and the legacy ones
  var empId      = (p.empId      || '').trim();
  var empName    = (p.empName    || '').trim();
  var senderName = (p.senderName || p.name    || '').trim();
  var senderDept = (p.senderDept || p.dept    || '').trim();
  var msg        = (p.msg        || p.message || '').trim();
  var emoji      = p.emoji  || p.mood  || '';
  var photo      = p.photo  || '';
  var month      = p.month  || '';
  var ts         = p.ts     || '';
  if (!senderName || !msg) return {ok: false, error: 'name/message required'};

  var ss = SpreadsheetApp.openById(SHEET_ID);
  var ws = ensureWishesSheet(ss);

  var id  = 'W' + new Date().getTime();
  var now = new Date();
  ws.appendRow([id, senderName, msg, emoji, photo, 0, now, month, empId, empName, senderDept, emoji, ts || now.toLocaleString()]);

  // อัปเดต Monthly Stats
  updateMonthlyStat(now, 'wish', senderName);

  return {ok: true, id: id};
}

// ลบคำอวยพร 1 แถวตาม wid (ts/timestamp/senderName ตัวใดตัวหนึ่งที่ตรงกับ
// ค่าที่ client คำนวณไว้ — client ใช้ w.ts||w.timestamp||w.senderName เป็น id)
function deleteWish(p) {
  var wid = (p.wid || '').trim();
  if (!wid) return {ok: false, error: 'wid required'};
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var ws = ensureWishesSheet(ss);
  var rows = ws.getDataRange().getValues();
  if (rows.length < 2) return {ok: false, error: 'no wishes'};
  var headers = rows[0];
  var IDX = makeIdx(headers);
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    var rowTs   = String(r[IDX['Ts']] || '');
    var rowTime = r[IDX['Timestamp']] ? new Date(r[IDX['Timestamp']]).toISOString() : '';
    var rowName = String(r[IDX['Name']] || '');
    if (wid === rowTs || wid === rowTime || wid === rowName || wid === String(r[0])) {
      ws.deleteRow(i + 1);
      return {ok: true};
    }
  }
  return {ok: false, error: 'not found'};
}

// ============================================================
// ── PERSONS ───────────────────────────────────────────────
// Actual sheet columns (A→H): รหัสพนักงาน, ชื่อ, นามสกุล, ตำแหน่ง,
// Faction/แผนก, วัน, เดือน (1-12), สถานะ — read positionally since
// the live sheet's headers are Thai labels, not the English names
// 'Name'/'Month'/'Dept'/'Pos'/'Day' the old header-lookup code expected.
// getPersons returns a RAW ARRAY (matches loadPersonsFromSheet's
// Array.isArray check in the uploaded UI). month returned is 1-12
// (sheet convention); the client's loadPersonsFromSheet converts it
// to 0-indexed itself.
// ============================================================
function getPersons() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var ws = ensurePersonsSheet(ss);
  var rows = ws.getDataRange().getValues();
  if (rows.length < 2) return [];
  var persons = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (!r[0]) continue;
    var fname = r[1] || '';
    var lname = r[2] || '';
    var dept  = r[4] || '';
    persons.push({
      code:    r[0],
      name:    (String(fname) + ' ' + String(lname)).trim(),
      pos:     r[3] || '',
      dept:    dept,
      faction: dept,
      day:     r[5] || 1,
      month:   r[6] || 1,
      active:  r[7] !== false && r[7] !== 'FALSE' && r[7] !== 'Inactive'
    });
  }
  return persons;
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

// Columns (A→H): รหัสพนักงาน, ชื่อ, นามสกุล, ตำแหน่ง, Faction/แผนก, วัน, เดือน (1-12), สถานะ
function ensurePersonsSheet(ss) {
  var ws = ss.getSheetByName(SHEET_PERSONS);
  if (!ws) {
    ws = ss.insertSheet(SHEET_PERSONS);
    ws.appendRow(['รหัสพนักงาน','ชื่อ','นามสกุล','ตำแหน่ง','Faction/แผนก','วัน','เดือน (1-12)','สถานะ']);
    ws.setFrozenRows(1);
    ws.getRange(1, 1, 1, 8).setBackground('#00E5CC').setFontColor('#000').setFontWeight('bold');
  }
  return ws;
}

// นำเข้าข้อมูลพนักงานเก่า (PERSONS_SEED) เข้า Persons sheet — ข้ามรายการที่มี Code อยู่แล้ว
function seedPersons() {
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var ws = ensurePersonsSheet(ss);
  var rows = ws.getDataRange().getValues();
  var existingCodes = {};
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][0]) existingCodes[String(rows[i][0])] = true;
  }

  var added = 0;
  PERSONS_SEED.forEach(function(p) {
    if (existingCodes[p.code]) return;
    var nameParts = String(p.name || '').trim().split(/\s+/);
    var fname = nameParts.shift() || '';
    var lname = nameParts.join(' ');
    ws.appendRow([p.code, fname, lname, p.pos || '', p.dept || '', p.day || '', p.month, 'Active']);
    added++;
  });

  return {ok: true, added: added, total: PERSONS_SEED.length};
}

// ============================================================
// ── GAME SCORES ───────────────────────────────────────────
// Sheet columns: EmpId, PlayerName, Score, Total, Plays, BestScore, LastTs
// ============================================================
function ensureGameScoresSheet(ss) {
  var ws = ss.getSheetByName(SHEET_GAMESCORES);
  if (!ws) {
    ws = ss.insertSheet(SHEET_GAMESCORES);
    ws.appendRow(['EmpId','PlayerName','Score','Total','Plays','BestScore','LastTs']);
    ws.setFrozenRows(1);
    ws.getRange(1, 1, 1, 7).setBackground('#34D399').setFontColor('#000').setFontWeight('bold');
  }
  return ws;
}

// GET: ?action=saveGameScore&empId=90245&playerName=สมใจ&score=2&total=3
// Upserts a row keyed by (EmpId, PlayerName).
function saveGameScore(p) {
  var empId      = String(p.empId      || '').trim();
  var playerName = String(p.playerName || '').trim();
  var score      = parseInt(p.score || '0', 10) || 0;
  var total      = parseInt(p.total || '0', 10) || 0;
  if (!playerName) return {ok: false, error: 'playerName required'};

  var ss = SpreadsheetApp.openById(SHEET_ID);
  var ws = ensureGameScoresSheet(ss);
  var rows = ws.getDataRange().getValues();
  var headers = rows[0];
  var IDX = makeIdx(headers);

  var rowIdx = -1;
  for (var i = 1; i < rows.length; i++) {
    if (String(rows[i][IDX['EmpId']]) === empId && normName(rows[i][IDX['PlayerName']]) === normName(playerName)) {
      rowIdx = i + 1;
      break;
    }
  }

  var now = new Date().toLocaleString('th-TH');

  if (rowIdx === -1) {
    ws.appendRow([empId, playerName, score, total, 1, score, now]);
    return {ok: true, bestScore: score, plays: 1};
  }

  var curRow    = ws.getRange(rowIdx, 1, 1, headers.length).getValues()[0];
  var plays     = (parseInt(curRow[IDX['Plays']], 10) || 0) + 1;
  var bestScore = Math.max(parseInt(curRow[IDX['BestScore']], 10) || 0, score);

  ws.getRange(rowIdx, IDX['Score']     + 1).setValue(score);
  ws.getRange(rowIdx, IDX['Total']     + 1).setValue(total);
  ws.getRange(rowIdx, IDX['Plays']     + 1).setValue(plays);
  ws.getRange(rowIdx, IDX['BestScore'] + 1).setValue(bestScore);
  ws.getRange(rowIdx, IDX['LastTs']    + 1).setValue(now);

  return {ok: true, bestScore: bestScore, plays: plays};
}

// GET: ?action=getGameLeaderboard&empId=90245
function getGameLeaderboard(p) {
  var empId = String(p.empId || '').trim();
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var ws = ensureGameScoresSheet(ss);
  var rows = ws.getDataRange().getValues();
  if (rows.length < 2) return {board: []};
  var headers = rows[0];
  var IDX = makeIdx(headers);

  var board = [];
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    if (!r[IDX['PlayerName']]) continue;
    if (empId && String(r[IDX['EmpId']]) !== empId) continue;
    board.push({
      playerName: r[IDX['PlayerName']],
      bestScore:  parseInt(r[IDX['BestScore']], 10) || 0,
      plays:      parseInt(r[IDX['Plays']], 10) || 0,
      lastTs:     r[IDX['LastTs']] || ''
    });
  }
  board.sort(function(a, b) { return b.bestScore - a.bestScore; });
  return {board: board};
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
  ensureWishesSheet(ss);
  ensurePersonsSheet(ss);
  ensurePointsSheet(ss);
  ensureGameScoresSheet(ss);
  var statsWs = ensureStatsSheet(ss);
  initActivityMonths(ss, statsWs);
  var seedResult = seedPersons();
  SpreadsheetApp.getUi().alert(
    '✅ Setup สำเร็จ!\n\nSheets ที่พร้อมแล้ว:\n- Wishes (เพิ่ม EmpId/SenderDept/Emoji/Ts)\n- Persons (นำเข้าพนักงานใหม่ ' + seedResult.added + ' คน, เพิ่ม Pos/Day)\n- Points (ใหม่)\n- Monthly_Stats มิ.ย.-ธ.ค. 2569 (ใหม่)\n- GameScores (ใหม่)'
  );
}

function importPersonsMenu() {
  var result = seedPersons();
  SpreadsheetApp.getUi().alert('✅ นำเข้าข้อมูลพนักงานแล้ว!\n\nเพิ่มใหม่ ' + result.added + ' คน จากทั้งหมด ' + result.total + ' คน\n(รายการที่มีรหัสซ้ำจะถูกข้าม)');
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
    .addItem('👥 นำเข้าข้อมูลพนักงาน (Persons)', 'importPersonsMenu')
    .addItem('🔄 คำนวณยอดสะสมใหม่ทั้งหมด', 'recalcAllStats')
    .addToUi();
}
