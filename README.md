# SML Birthday Wishes System — Google Apps Script Version

ระบบอวยพรวันเกิดพนักงาน พร้อม Admin Login กลาง, เก็บรูปบน Google Drive, เก็บข้อมูลบน Google Sheets และระบบคะแนนสะสม

## Files

- `Code.gs` — Google Apps Script backend
- `index.html` — Frontend web page
- `appsscript.json` — Apps Script manifest / OAuth scopes

## Important Security Note

ก่อนอัปขึ้น GitHub แบบ Public ห้ามใส่ Google Sheet ID จริง, URL จริง, Password หรือ Master Key ลง repository

ในไฟล์ `Code.gs` ให้แก้บรรทัดนี้ก่อน Deploy จริง:

```js
var SHEET_ID = 'PUT_YOUR_GOOGLE_SHEET_ID_HERE';
```

เปลี่ยนเป็น Sheet ID จริงของคุณใน Apps Script Editor หรือใช้ GitHub Private repository เท่านั้น

## Setup

1. เปิด Google Apps Script
2. วาง `Code.gs`
3. เปิด Project Settings → เปิด `Show appsscript.json manifest file in editor`
4. วาง `appsscript.json`
5. แก้ `SHEET_ID` ใน `Code.gs`
6. กด Save
7. เลือกฟังก์ชัน `setup`
8. กด Run และ Allow permissions
9. จด `Master Key` ที่ระบบแสดงไว้ เพราะจะแสดงครั้งแรกเท่านั้น
10. Deploy → New deployment → Web app
    - Execute as: Me
    - Who has access: Anyone
11. Copy Web App URL ไปใส่ในช่อง Script URL หน้าเว็บ

## Default Admin

หลัง Run `setup()` ครั้งแรก ระบบจะสร้าง Admin เริ่มต้น:

- Password: `sml2569`
- Master Key: สุ่มอัตโนมัติ แสดงครั้งแรกเท่านั้น

ควร Login แล้วเปลี่ยนรหัสทันที

## What changed in this version

- Admin password ไม่เก็บใน Browser แล้ว
- Password เก็บเป็น Hash + Salt ใน Google Sheet `AdminCreds`
- ใช้ Session Token อายุ 8 ชั่วโมง
- Admin actions ต้องส่ง token
- มี Lockout เมื่อ Login ผิดหลายครั้ง
- รูปพนักงานเก็บใน Google Drive และ URL เก็บใน Sheet `Photos`
- เพิ่ม `AuditLog`
- เพิ่ม `ScoreTransactions` สำหรับตรวจสอบคะแนนย้อนหลัง
- `uploadPhoto()` ลบรูปเก่าด้วย FileId เพื่อให้เร็วขึ้น

## Google Sheets Created

- Wishes
- Persons
- Points
- Monthly_Stats
- GameScores
- Photos
- CustomQuestions
- Settings
- AdminCreds
- Sessions
- AuditLog
- ScoreTransactions

## App Script Scopes

ดูได้ใน `appsscript.json`

- Google Drive
- Google Sheets
- External request
