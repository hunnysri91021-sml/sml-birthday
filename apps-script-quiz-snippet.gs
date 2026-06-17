/**
 * เพิ่ม snippet นี้เข้าไปใน Google Apps Script โปรเจกต์ที่ใช้อยู่แล้ว
 * (โปรเจกต์เดียวกับที่จัดการ "คำอวยพร" / "พนักงาน" ผ่าน Script URL ที่ตั้งค่าไว้ในหน้า admin)
 *
 * วิธีติดตั้ง:
 * 1. เปิด Apps Script โปรเจกต์เดิม (script.google.com)
 * 2. หาฟังก์ชัน doGet(e) ที่มีอยู่แล้ว แล้วเพิ่ม case ใหม่ตามด้านล่าง
 *    (หรือถ้าใช้ if/else ตาม action ก็เพิ่มเงื่อนไข action==='addQuizResult' เข้าไป)
 * 3. วาง helper function addQuizResult_(e) ไว้ในไฟล์เดียวกัน
 * 4. Deploy > Manage deployments > เลือก deployment เดิม > New version เพื่ออัปเดต
 *    (ไม่ต้องเปลี่ยน Script URL เดิม)
 *
 * ผลลัพธ์: คำตอบ/คะแนนของพนักงานที่เล่นเกมจะถูกบันทึกเพิ่มในชีตชื่อ "QuizResults"
 * (จะถูกสร้างให้อัตโนมัติถ้ายังไม่มี) คอลัมน์: Timestamp, รหัสพนักงาน, ชื่อพนักงาน(เจ้าของวันเกิด),
 * ชื่อผู้เล่น, คะแนน, คะแนนเต็ม
 */

// ── เพิ่มเข้าไปใน doGet(e) เดิม ──────────────────────────────
// ตัวอย่าง: ถ้า doGet เดิมหน้าตาคล้ายนี้
//
// function doGet(e) {
//   const action = e.parameter.action;
//   if (action === 'ping') return jsonOut({ok:true});
//   if (action === 'addWish') return addWish_(e);
//   if (action === 'getWishes') return getWishes_(e);
//   if (action === 'getPersons') return getPersons_(e);
//   if (action === 'deleteWish') return deleteWish_(e);
//   ...
// }
//
// ให้เพิ่มบรรทัดนี้เข้าไปในรายการ if ด้านบน:
//
//   if (action === 'addQuizResult') return addQuizResult_(e);
//

function addQuizResult_(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('QuizResults');
  if (!sheet) {
    sheet = ss.insertSheet('QuizResults');
    sheet.appendRow(['Timestamp', 'รหัสพนักงาน', 'ชื่อพนักงาน(เจ้าของวันเกิด)', 'ชื่อผู้เล่น', 'คะแนน', 'คะแนนเต็ม']);
  }
  const p = e.parameter;
  sheet.appendRow([
    p.ts || new Date().toLocaleString('th-TH'),
    p.empCode || '',
    p.empName || '',
    p.playerName || '',
    p.score || 0,
    p.total || 0
  ]);
  return jsonOut({ ok: true });
}

// ใช้ jsonOut(obj) ฟังก์ชันเดิมที่มีอยู่แล้ว (ส่ง ContentService JSON กลับ)
// ถ้าโปรเจกต์เดิมยังไม่มี ให้เพิ่มฟังก์ชันนี้:
//
// function jsonOut(obj) {
//   return ContentService.createTextOutput(JSON.stringify(obj))
//     .setMimeType(ContentService.MimeType.JSON);
// }
