// ============================================================
// SML Birthday Wishes — Google Apps Script Backend
// แก้ไข: รับทั้ง GET และ POST, แก้ CORS, บันทึกผลเกมเข้า QuizResults
// ============================================================
const SHEET_ID = '1rpJKzrWoBQwJAM9OiByecs1CYLB-CSumkdXg6ldJ0JU';
const SHEET_WISHES = 'Wishes';
const SHEET_PERSONS = 'Persons';
const SHEET_QUIZ = 'QuizResults';

function doGet(e) {
  const p = e.parameter || {};
  const action = p.action || '';
  try {
    if (action === 'ping')          return resp({ok:true, time:new Date().toISOString()});
    if (action === 'getWishes')     return resp(getWishes(p.empId || ''));
    if (action === 'getPersons')    return resp(getPersons());
    // รับ addWish ผ่าน GET ด้วย (แก้ปัญหา CORS)
    if (action === 'addWish')       return resp(addWish(p));
    if (action === 'deleteWish')    return resp(deleteWish(p.wid || ''));
    if (action === 'addQuizResult') return resp(addQuizResult(p));
    if (action === 'getQuizResults')   return resp(getQuizResults());
    if (action === 'deleteQuizResult') return resp(deleteQuizResult(p.empCode || '', p.playerName || ''));
    return resp({error:'unknown action'});
  } catch(err) {
    return resp({error: err.message});
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.action === 'addWish')       return resp(addWish(body));
    if (body.action === 'addQuizResult') return resp(addQuizResult(body));
    return resp({error:'unknown action'});
  } catch(err) {
    return resp({error: err.message});
  }
}

function resp(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getWishes(empId) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const ws = ss.getSheetByName(SHEET_WISHES);
  if (!ws) return [];
  const rows = ws.getDataRange().getValues();
  if (rows.length <= 1) return [];
  return rows.slice(1)
    .filter(r => !empId || String(r[0]) === String(empId))
    .map(r => ({
      empId:r[0], empName:r[1], senderName:r[2],
      senderDept:r[3], msg:r[4], emoji:r[5], ts:r[6]
    }))
    .reverse();
}

function addWish(p) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let ws = ss.getSheetByName(SHEET_WISHES);
  if (!ws) {
    ws = ss.insertSheet(SHEET_WISHES);
    ws.appendRow(['empId','empName','senderName','senderDept','message','emoji','timestamp']);
    ws.setFrozenRows(1);
  }
  const emojis = ['🎉','🌟','💖','🎂','🥳','🌈','✨','🎁','🍀','🏆'];
  ws.appendRow([
    p.empId   || '',
    p.empName || '',
    p.senderName || '',
    p.senderDept || 'ทีมงาน',
    p.msg     || '',
    emojis[Math.floor(Math.random()*emojis.length)],
    new Date().toLocaleString('th-TH')
  ]);
  return {ok: true};
}

function getPersons() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const ws = ss.getSheetByName(SHEET_PERSONS);
  if (!ws) return [];
  const rows = ws.getDataRange().getValues();
  if (rows.length <= 1) return [];
  return rows.slice(1)
    .filter(r => r[0] || r[1])
    .filter(r => {
      const rawStatus = String(r[9] || '').trim();
      const fallbackStatus = String(r[7] || '').trim();
      const status = rawStatus || (isStatusValue(fallbackStatus) ? fallbackStatus : 'Active');
      return !isInactiveStatus(status);
    })
    .map(r => ({
      code:    String(r[0] || '').trim(),
      name:    (String(r[1] || '') + ' ' + String(r[2] || '')).trim(),
      pos:     String(r[3] || '').trim(),
      faction: String(r[4] || '').trim(),
      // หมายเหตุ: ไม่ส่งวันเกิดที่ชัดเจนกลับไป (เฉพาะเดือน) ตามข้อกำหนด PDPA
      month:   Math.min(11, Math.max(0, (parseInt(r[6], 10) || 1) - 1)),
    }));
}

function isStatusValue(value) {
  return ['Active','Resigned','Leave','ลาออก','พักงาน','ออก','ไม่ใช้งาน'].indexOf(String(value || '').trim()) >= 0;
}

function isInactiveStatus(value) {
  return ['Resigned','Leave','ลาออก','พักงาน','ออก','ไม่ใช้งาน'].indexOf(String(value || '').trim()) >= 0;
}

// บันทึกผลเกม/คำตอบของพนักงานลงชีต QuizResults (สร้างให้อัตโนมัติถ้ายังไม่มี)
function addQuizResult(p) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  let ws = ss.getSheetByName(SHEET_QUIZ);
  if (!ws) {
    ws = ss.insertSheet(SHEET_QUIZ);
    ws.appendRow(['Timestamp','รหัสพนักงาน','ชื่อพนักงาน(เจ้าของวันเกิด)','ชื่อผู้เล่น','คะแนน','คะแนนเต็ม']);
    ws.setFrozenRows(1);
  }
  ws.appendRow([
    p.ts || new Date().toLocaleString('th-TH'),
    p.empCode || '',
    p.empName || '',
    p.playerName || '',
    Number(p.score) || 0,
    Number(p.total) || 0
  ]);
  return {ok: true};
}

// อ่านผลตอบคำถามทั้งหมดของทุกพนักงาน (ใช้เป็นฐานข้อมูลเดียวสำหรับกระดานคะแนน/วงล้อ/หน้า admin)
function getQuizResults() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const ws = ss.getSheetByName(SHEET_QUIZ);
  if (!ws) return [];
  const rows = ws.getDataRange().getValues();
  if (rows.length <= 1) return [];
  return rows.slice(1)
    .filter(r => r[1] || r[3])
    .map(r => ({
      ts: r[0], empCode: String(r[1]||'').trim(), empName: r[2],
      playerName: r[3], score: r[4], total: r[5]
    }));
}

// ลบผลตอบคำถามของผู้เล่นคนหนึ่งสำหรับพนักงานคนหนึ่ง (ลบทุกแถวที่ตรงกัน)
function deleteQuizResult(empCode, playerName) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const ws = ss.getSheetByName(SHEET_QUIZ);
  if (!ws) return {ok:false, msg:'sheet not found'};
  const decodedName = decodeURIComponent(playerName || '');
  const rows = ws.getDataRange().getValues();
  let deleted = 0;
  for (let i = rows.length-1; i >= 1; i--) {
    if (String(rows[i][1]) === String(empCode) && String(rows[i][3]) === decodedName) {
      ws.deleteRow(i+1);
      deleted++;
    }
  }
  return deleted > 0 ? {ok:true, deleted} : {ok:false, msg:'not found'};
}

function setupSheets() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  if (!ss.getSheetByName(SHEET_WISHES)) {
    const ws = ss.insertSheet(SHEET_WISHES);
    ws.appendRow(['empId','empName','senderName','senderDept','message','emoji','timestamp']);
    ws.setFrozenRows(1);
  }
  if (!ss.getSheetByName(SHEET_PERSONS)) {
    const ps = ss.insertSheet(SHEET_PERSONS);
    ps.appendRow(['รหัสพนักงาน','ชื่อ','นามสกุล','ตำแหน่ง','Faction','วัน','เดือน(1-12)','เดือนไทย','ปีพ.ศ.','สถานะ']);
    ps.setFrozenRows(1);
  }
  if (!ss.getSheetByName(SHEET_QUIZ)) {
    const qs = ss.insertSheet(SHEET_QUIZ);
    qs.appendRow(['Timestamp','รหัสพนักงาน','ชื่อพนักงาน(เจ้าของวันเกิด)','ชื่อผู้เล่น','คะแนน','คะแนนเต็ม']);
    qs.setFrozenRows(1);
  }
}

function deleteWish(wid) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const ws = ss.getSheetByName(SHEET_WISHES);
  if (!ws) return {ok:false, msg:'sheet not found'};
  const decoded = decodeURIComponent(wid || '');
  const rows = ws.getDataRange().getValues();
  let deleted = 0;
  // Delete bottom-up so row indices stay valid
  for (let i = rows.length-1; i >= 1; i--) {
    const ts = String(rows[i][6]);
    if (ts === decoded || ts === wid) {
      ws.deleteRow(i+1);
      deleted++;
    }
  }
  if (deleted > 0) return {ok:true, deleted};
  // fallback: search by senderName+msg combo
  return {ok:false, msg:'not found', searched:rows.length};
}

// ทดสอบ
function testAddWish() {
  const result = addWish({
    empId:'90245', empName:'ประจักษ์ แก้วหานาม',
    senderName:'HR Test', senderDept:'HR&GA', msg:'ทดสอบระบบ'
  });
  Logger.log(JSON.stringify(result));
}

function testGetWishes() {
  const result = getWishes('90245');
  Logger.log(JSON.stringify(result));
}

function testAddQuizResult() {
  const result = addQuizResult({
    empCode:'90245', empName:'ประจักษ์ แก้วหานาม',
    playerName:'ทดสอบ', score:3, total:5
  });
  Logger.log(JSON.stringify(result));
}
