# SML Birthday — Enterprise Architecture Redesign
> วิเคราะห์จากโค้ดจริง: `Code.gs` (1184 บรรทัด), `index.html` (2319 บรรทัด)

---

## 0. สรุปสถานะปัจจุบัน (Code Audit)

| รายการ | เก็บที่ไหนตอนนี้ | หลักฐานในโค้ด |
|---|---|---|
| Admin Password | `localStorage['adminPass']`, fallback hardcode `'sml2569'` | `index.html:1212-1213` |
| Master Key | `localStorage['adminMasterKey']`, generate ครั้งแรกถ้าไม่มี | `index.html:2219-2224` |
| Apps Script URL | `localStorage['sml_api_url']` | `index.html:688-693` |
| Wishes (cache) | `localStorage['sml_wishes']` + queue `sml_pending` | `index.html:684-685,871,941,1020` |
| Wish hidden flag | `localStorage['sml_hidden']` | `index.html:1271-1294` |
| Likes/Votes | `localStorage['votes_'+empKey]`, `myvote_'+empKey` | `index.html:1510-1553,1964` |
| Quiz คำถาม custom (ต่อ client) | `localStorage['customQ_'+empKey]` — **คนละเครื่องเห็นคนละชุด** | `index.html:1601-1717` |
| Quiz/Game Leaderboard | `localStorage['lbGame_'+empKey]` | `index.html:1906-2100` |
| Photos | `localStorage['photo_'+empKey]` (cache, fallback ก่อน fetch sheet) | `index.html:1332,1360,2053,2167` |
| เดือนที่เปิดให้ดู (active months) | `localStorage['sml_active_months']` | `index.html:1169-1176` |
| ชื่อ/รหัสพนักงานที่กรอกไว้ | `localStorage['playerName','playerEmpId']` | `index.html:957-960,1427-1444` |

**ข้อที่ Code.gs ทำถูกแล้ว (ใช้ Google Sheets/Drive อยู่แล้ว)**: Wishes, Persons, Points, Monthly_Stats, GameScores, Photos (Drive+Sheet), CustomQuestions (sheet กลาง แต่ frontend ยังไม่เรียกใช้เต็มที่ - มี fallback ไป localStorage), Settings (มีแค่ `lbRangeStart/End`).

**ช่องโหว่ Security ที่ร้ายแรงที่สุด**: Admin password/Master key ตรวจสอบฝั่ง client เท่านั้น (`getAdminPass()` เทียบ string ใน browser) — ใครก็เปิด DevTools console พิมพ์ `localStorage.setItem('adminPass','x')` หรือเรียก `enterAdmin()` ตรงๆได้เลย ไม่มีการ verify ฝั่ง server เลย ทุก endpoint ที่แก้ข้อมูล (`addCustomQuestion`, `deleteWish`, `uploadPhoto`, `setLbRange`) ไม่มีการเช็คสิทธิ์ฝั่ง Apps Script — ใครรู้ URL ก็ยิง action เหล่านี้ตรงได้

---

## 1. Architecture Diagram

```
┌─────────────────────────────┐
│  Browser (index.html)       │
│  - ไม่เก็บ secret ใน localStorage  │
│  - เก็บแค่ sessionToken (สั้น, มี exp) ใน sessionStorage
│  - เก็บ apiUrl ใน localStorage ได้ (ไม่ลับ)
└────────────┬─────────────────┘
             │ HTTPS (GET/POST, JSON)
             ▼
┌─────────────────────────────┐
│  Google Apps Script (Code.gs)│
│  doGet/doPost → Router       │
│  ┌─────────────────────────┐ │
│  │ AuthGuard (ใหม่)         │ │  ← ตรวจ sessionToken ทุก action ที่แก้ข้อมูล/อ่านข้อมูลลับ
│  │ - verifySession(token)   │ │
│  │ - requireAdmin(action,p) │ │
│  └─────────────────────────┘ │
│  Business logic (เดิม+ใหม่)   │
│  AuditLogger (ใหม่) — log ทุกครั้งที่มีการเขียน
└────────────┬─────────────────┘
             ▼
┌─────────────────────────────┐
│  Google Sheets (Single Source of Truth) │
│  Settings | AdminCreds | Sessions | AuditLog
│  Persons | Wishes | Points | Likes
│  QuizQuestions | QuizResults | ScoreTx
│  GameScores | Monthly_Stats | Photos
└────────────┬─────────────────┘
             ▼
┌─────────────────────────────┐
│  Google Drive                │
│  /SML Birthday Photos/        │
└───────────────────────────────┘
```

หลักการ: **Apps Script เป็น API gateway เดียว, Sheets เป็น DB เดียว, ไม่มี secret ฝั่ง client** ทุกอุปกรณ์ที่เปิดหน้าเว็บ จะ fetch ข้อมูลจาก Sheet ผ่าน Apps Script เท่านั้น — เห็นเหมือนกันทุกเครื่องโดยอัตโนมัติ เพราะไม่มี local cache ของ "ความจริง" อีกต่อไป (cache ฝั่ง client ใช้ได้แค่เป็น perf cache ที่ invalidate ได้ ไม่ใช่ source of truth)

---

## 2. Google Sheets Design (ตาราง + Column + Data Type)

### 2.1 `Settings` (ขยายจากเดิม Key/Value)
| Column | Type | ตัวอย่าง |
|---|---|---|
| Key | string | `lbRangeStart`, `activityStartMonth`, `activeMonths` |
| Value | string/JSON | `1`, `6`, `[0,1,5,6]` |
| UpdatedAt | datetime | |
| UpdatedBy | string (empId/admin) | |

### 2.2 `AdminCreds` (ใหม่ — แทน localStorage adminPass)
| Column | Type | หมายเหตุ |
|---|---|---|
| Id | string | `'admin'` (single row ระบบเดี่ยว) หรือ AdminId ถ้าจะรองรับหลาย admin |
| PasswordHash | string | SHA-256 + salt (Apps Script `Utilities.computeDigest`) |
| Salt | string | random ต่อ record |
| MasterKeyHash | string | hash ของ Master Key เดิม (ไม่เก็บ plaintext) |
| FailedAttempts | number | rate-limit/lockout |
| LockedUntil | datetime | |
| UpdatedAt | datetime | |

### 2.3 `Sessions` (ใหม่ — แทนการเช็ค admin-mode ฝั่ง client)
| Column | Type |
|---|---|
| Token | string (UUID) |
| Role | string (`admin`) |
| CreatedAt | datetime |
| ExpiresAt | datetime |
| IP/UA (optional) | string |

### 2.4 `Persons` (เดิม, คงโครงสร้าง A→H ภาษาไทย — เพิ่ม column ให้ตรง)
รหัสพนักงาน(string) | ชื่อ(string) | นามสกุล(string) | ตำแหน่ง(string) | Faction/แผนก(string) | วัน(number 1-31) | เดือน(number 1-12) | สถานะ(string Active/Inactive)

### 2.5 `Wishes` (เดิม, คงไว้) — เพิ่ม `Hidden` (boolean) แทน `sml_hidden` ใน localStorage
ID | Name | Message | Mood | Photo | Likes | Timestamp | Month | EmpId | EmpName | SenderDept | Emoji | Ts | **Hidden(bool, ใหม่)**

### 2.6 `Likes` (ใหม่ — แทน `votes_*`/`myvote_*` ใน localStorage)
| Column | Type |
|---|---|
| WishId | string (FK→Wishes.ID) |
| VoterEmpId | string |
| VoterName | string |
| CreatedAt | datetime |

Unique key เชิงตรรกะ = (WishId, VoterEmpId) → กัน vote ซ้ำฝั่ง server (เดิม client เช็คเองผ่าน `myvote_`)

### 2.7 `QuizQuestions` (แทนที่ `CustomQuestions` เดิม ให้ชัดเจนขึ้น — ใช้ sheet เดิมต่อได้ แค่ทำให้ frontend ดึงจาก sheet เสมอ ไม่ fallback localStorage)
Id | EmpId(เจ้าของวันเกิด) | Question | Opt1-4 | Answer | CreatedBy | CreatedAt

### 2.8 `QuizResults` (ใหม่ — แยกจาก Points ให้ track เป็นรายครั้ง/audit ได้)
| Column | Type |
|---|---|
| Id | string |
| SenderEmpId | string |
| SenderName | string |
| TargetEmpId | string (เจ้าของวันเกิด) |
| Score | number |
| Total | number (=5 ตาม spec) |
| PointsEarned | number (2 หรือ 1) |
| Ts | datetime |

### 2.9 `ScoreTransactions` (ใหม่ — ledger กลาง, ป้องกันคะแนนเพี้ยน/ตรวจสอบย้อนหลังได้)
| Column | Type |
|---|---|
| Id | string |
| SenderEmpId | string |
| TargetEmpId | string |
| Type | string (`wish` \| `quiz`) |
| Points | number |
| Month | number |
| Year | number (พ.ศ.) |
| Ts | datetime |

> `Points` sheet เดิม (1 แถวต่อคู่ sender/target) เก็บไว้เป็น **materialized view** สำหรับ query เร็ว ส่วน `ScoreTransactions` เป็น source of truth/audit — เขียนคะแนนที่ฟังก์ชันเดียว (`grantPoints()`) แล้วอัปเดตทั้งสอง sheet พร้อมกัน

### 2.10 `Leaderboard` — ไม่ต้องเป็น sheet จริง คำนวณ on-the-fly จาก `ScoreTransactions` ตามช่วงวันที่ที่ admin เลือก (ดู §5.2) — เก็บเป็น sheet จะ stale เร็วเกินไป

### 2.11 `AuditLog` (ใหม่ — บังคับตาม requirement "ทุกการแก้ไขต้องมี Audit Log")
| Column | Type |
|---|---|
| Id | string |
| Ts | datetime |
| Actor | string (empId หรือ `'admin'`) |
| Action | string (`deleteWish`,`uploadPhoto`,`changePassword`,`setLbRange`,...) |
| Target | string (เช่น wishId, empId) |
| Detail | string (JSON ของ before/after หรือ params) |
| Result | string (`ok`/`error`+msg) |

### 2.12 `Photos`, `GameScores`, `Monthly_Stats` — คงเดิมตามที่มีใน Code.gs (ใช้งานได้ดีอยู่แล้ว)

---

## 3. ระบบคะแนน — Mapping เข้ากับ Schema

- Birthday Wish สำเร็จ → +1 (เขียนผ่าน `grantPoints(senderEmpId, targetEmpId, 'wish', 1)`)
- Quiz 5/5 → +2, ตอบผิด ≥1 → +1 (`grantPoints(..., 'quiz', earned)`) — ปรับ `addQuizPoint` เดิมให้ `total` ต้อง `=== 5` เสมอ (ปัจจุบันรับ `total` จาก client ตรงๆ ไม่ validate → แก้เป็น enforce `TOTAL_QUIZ_QUESTIONS=5` ฝั่ง server กัน client โกง)
- Cap ต่อคู่ (ผู้ร่วม 1 คน, เจ้าของวันเกิด 1 คน) สูงสุด 3 → มีอยู่แล้วโดยปริยายจาก `WishDone`/`QuizDone` flag กันทำซ้ำ ใน `Points` sheet (`Code.gs:565-577,603-616`) — คงไว้ แค่ย้าย "การตัดสิน" ไปอยู่ที่ `ScoreTransactions` ทั้งหมด (เขียน flag กันซ้ำ + ledger ในฟังก์ชันเดียว ไม่กระจาย logic เหมือนปัจจุบันที่ `addWishPoint`/`addQuizPoint` คนละฟังก์ชันคัดลอกโค้ดเช็คซ้ำกัน)

---

## 4. API Design (Apps Script doGet/doPost)

ของเดิมเป็น query-string actions ทั้งหมด (ดี สำหรับ Apps Script เพราะ avoid CORS) — คงรูปแบบเดิม เพิ่ม:

```
POST ?action=login          body:{password}              → {ok,token,expiresAt}
POST ?action=verifySession  body:{token}                  → {ok,valid,role}
POST ?action=logout         body:{token}                  → {ok}
POST ?action=changePassword body:{token,oldPass,newPass}  → {ok}
POST ?action=resetWithMasterKey body:{masterKey,newPass}  → {ok}
GET  ?action=getSettings                                   → {activeMonths,lbRangeStart,lbRangeEnd}
POST ?action=setSettings    body:{token,...}               → {ok}   (ต้อง token admin)
POST ?action=toggleHideWish body:{token,wishId,hidden}     → {ok}
POST ?action=deleteWish     body:{token,wishId}            → {ok}   (ย้ายจาก GET เดิมที่ไม่เช็ค auth)
POST ?action=likeWish       body:{wishId,voterEmpId}       → {ok,likes}
GET  ?action=getLeaderboard ?from=2026-06-01&to=2026-12-31  → {board:[{empId,name,dept,photo,totalPts}]}
GET  ?action=getAuditLog    ?token=...&limit=100            → {logs:[...]}  (admin only)
```

**กฎสำคัญ**: ทุก action ที่เป็นการ "เขียน/ลบ/อ่านข้อมูลลับ" ต้องผ่าน `requireAdmin(p)` ก่อนเข้า handler — เพิ่ม guard ตรงนี้ที่ `doGet`/`doPost` router (`Code.gs:89-146`) แบบ allowlist:

```js
var ADMIN_ONLY_ACTIONS = [
  'deleteWish','toggleHideWish','setLbRange','setSettings',
  'changePassword','getAuditLog','addCustomQuestion',
  'updateCustomQuestion','deleteCustomQuestion','bulkAddCustomQuestions'
];

function checkAuth(action, p) {
  if (ADMIN_ONLY_ACTIONS.indexOf(action) === -1) return {ok:true};
  var token = p.token || '';
  var session = verifySessionToken(token);
  if (!session.ok) return {ok:false, error:'unauthorized'};
  return {ok:true, actor:session.actor};
}
```

---

## 5. Database Schema สรุป (ER แบบย่อ)

```
Persons(EmpId PK) ──< Wishes(EmpId FK)
Persons(EmpId PK) ──< Photos(Code FK)
Wishes(ID PK) ──< Likes(WishId FK)
Persons(EmpId PK) ──< QuizQuestions(EmpId FK)
ScoreTransactions(SenderEmpId, TargetEmpId) >── Persons(EmpId) x2
Points(SenderEmpId, EmpId) [materialized from ScoreTransactions]
AuditLog(Actor, Target) — soft refs, ไม่ enforce FK
Sessions(Token PK)
```

---

## 5.2 Admin เลือกช่วงคะแนน (รายเดือน/ไตรมาส/ปี/กำหนดเอง)

```js
// GET ?action=getLeaderboard&from=2026-06-01&to=2026-08-31&limit=10
function getLeaderboard(p) {
  var from = new Date(p.from);
  var to   = new Date(p.to);
  var ss = SpreadsheetApp.openById(SHEET_ID);
  var ws = ss.getSheetByName('ScoreTransactions');
  var rows = ws.getDataRange().getValues();
  var headers = rows[0], IDX = makeIdx(headers);
  var totals = {}; // empId -> points
  for (var i = 1; i < rows.length; i++) {
    var r = rows[i];
    var ts = new Date(r[IDX['Ts']]);
    if (ts < from || ts > to) continue;
    var key = String(r[IDX['SenderEmpId']]);
    totals[key] = (totals[key]||0) + (parseFloat(r[IDX['Points']])||0);
  }
  var persons = getPersons();
  var byId = {}; persons.forEach(function(pp){ byId[String(pp.code)] = pp; });
  var board = Object.keys(totals).map(function(k){
    var pp = byId[k] || {};
    return {empId:k, name:pp.name||'', dept:pp.dept||'', photo:pp.photo||'', totalPts: totals[k]};
  });
  board.sort(function(a,b){ return b.totalPts - a.totalPts; });
  return {from:p.from, to:p.to, board: board.slice(0, parseInt(p.limit||'10',10))};
}
```
Frontend ส่ง preset แปลงเป็น from/to ก่อนยิง: รายเดือน = วันที่ 1–สิ้นเดือนปัจจุบัน, รายไตรมาส = ปัดลง 3 เดือน, รายปี = 1 ม.ค.–31 ธ.ค., กำหนดเอง = 2 `<input type=date>`

---

## 6. Apps Script Functions ที่ต้องเพิ่ม/แก้ (สรุป)

| ฟังก์ชัน | สถานะ | งาน |
|---|---|---|
| `ensureAdminCredsSheet`, `login`, `verifySessionToken`, `logout`, `changePassword`, `resetWithMasterKey` | ใหม่ | auth ฝั่ง server, ใช้ `Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,...)` hash password |
| `ensureSessionsSheet`, cleanup expired sessions (time-based trigger) | ใหม่ | session lifecycle |
| `requireAdmin/checkAuth` ใน router | ใหม่ | guard ตาม §4 |
| `logAudit(actor, action, target, detail, result)` | ใหม่ | เรียกจากทุก handler ที่เขียนข้อมูล |
| `grantPoints(senderEmpId, targetEmpId, type, points, month)` | refactor จาก `addWishPoint`/`addQuizPoint` | รวม logic กันคะแนนซ้ำ + เขียน ScoreTransactions + audit |
| `getLeaderboard(p)` | ใหม่ | แทน `getMonthlyLeaderboard` แบบเดือนเดียว → รองรับช่วงวันที่ใดก็ได้ |
| `likeWish(p)` / `unlikeWish(p)` | ใหม่ | แทน localStorage votes |
| `getLikesForWish` / `getMyLike` | ใหม่ | กัน double-vote ฝั่ง server |
| `toggleHideWish(p)` | ใหม่ (ต้อง token) | แทน `sml_hidden` |
| `setSettings/getSettings` | ขยายจาก `getLbRange/setLbRange` | รวม activeMonths เข้ามาด้วย |
| `deleteWish` | แก้ | เพิ่ม auth guard + audit log (เดิมไม่มี auth ที่ `Code.gs:462-482`) |

---

## 7. Frontend Modification Plan (index.html)

1. **ลบ `getAdminPass()/setAdminPass()`** (`index.html:1212-1213`) → แทนด้วย `apiPost({action:'login',password})`, เก็บ `token` ใน `sessionStorage` (ไม่ใช่ localStorage — หายไปเมื่อปิด tab/browser ตามอายุงาน admin session)
2. **`enterAdmin()`/`exitAdmin()`** (`:1222-1267`) → เปลี่ยนเป็น async, รอ login response ก่อน toggle UI; เก็บ `adminToken` ใน memory + sessionStorage แทน boolean class เพียวๆ
3. **Master Key UI** (`:2219-2224`, `showMasterKey()`) → ลบการ generate/เก็บฝั่ง client ทั้งหมด เปลี่ยนเป็นเรียก `resetWithMasterKey` ผ่าน API เท่านั้น (ไม่มีปุ่ม "แสดง Master Key" อีกต่อไป เพราะ hash แล้วกู้กลับไม่ได้ — ถ้าต้องโชว์ ให้ admin คนแรก gen แล้วโชว์ครั้งเดียวตอน setup ผ่าน Apps Script editor)
4. **Wishes cache** (`localWishes`, `:684,871,941`) → คงไว้ได้เป็น *read cache* แต่ต้อง refetch จาก `getWishes` ทุกครั้งที่เปิดหน้า/สลับพนักงาน ห้ามใช้เป็นแหล่งความจริงตอน submit/delete (เดิม `addWish`/`deleteWish` เขียน localStorage ก่อนแล้วค่อย sync — เปลี่ยนเป็น "เขียน Sheet ก่อน, sync local cache จาก response เท่านั้น")
5. **Hide wish** (`toggleHideWish`, `:1270-1277`) → เปลี่ยนเป็นเรียก API `toggleHideWish` แทน `sml_hidden` array; `loadWishes()` กรอง `Hidden` จาก response
6. **Likes/Vote** (`:1510-1553`) → เปลี่ยนเป็นเรียก `likeWish`/`getLikesForWish`; ปุ่มโหวต disable ทันทีหลัง vote (กัน double-click) แล้ว sync จำนวนจาก server response
7. **Custom Quiz Questions** (`getCustomQList/saveCustomQList`, `:1601-1717`) → ลบ fallback `customQ_+empKey` ทั้งหมด ให้ดึงจาก `getCustomQuestions` API เสมอเป็น single source — ปัจจุบันมี API endpoint นี้ใน Code.gs อยู่แล้ว (`Code.gs:255-275`) แค่ frontend ยังไม่ถูกบังคับให้ใช้เพียงอย่างเดียว
8. **Game leaderboard** (`lbGame_+empKey`, `:1906-2100`) → ใช้ `saveGameScore`/`getGameLeaderboard` ที่มีอยู่แล้ว (`Code.gs:993-1060`) เป็นแหล่งเดียว ลบการอ่าน/เขียน localStorage คู่กัน เหลือไว้แค่ optimistic UI ระหว่างรอ response
9. **Active months** (`sml_active_months`, `:1169-1176`) → ย้ายเป็น `Settings.Key='activeMonths'` ผ่าน `setSettings`/`getSettings` (admin ตั้งจากเครื่องไหนก็เห็นพร้อมกันทุกเครื่องทันที — ตรงนี้คือบั๊กใหญ่ของระบบเดิมที่ "Admin ตั้งเดือนที่เครื่อง A แต่เครื่อง B ไม่เห็น")
10. **Photo cache** (`photo_+empKey`, `:1332,2053,2167`) → ใช้เป็น perf cache ได้ (รูปไม่ลับ) แต่ต้อง fetch จาก `getPersons()`/`getPhotosMap()` ก่อนเสมอเป็นค่าหลัก, local เป็น fallback ตอนออฟไลน์เท่านั้น
11. **`playerName`/`playerEmpId`** (`:957-960`) → เก็บใน localStorage ต่อได้ (เป็นแค่ convenience autofill ไม่ใช่ข้อมูลสำคัญ)

---

## 8. Migration Plan (LocalStorage → Google Platform)

### Phase 0 — เตรียม Sheet (ทำครั้งเดียวผ่าน `setup()` ที่ขยายแล้ว)
เพิ่ม `ensureAdminCredsSheet`, `ensureSessionsSheet`, `ensureLikesSheet`, `ensureScoreTxSheet`, `ensureAuditLogSheet`, `ensureQuizResultsSheet` เข้า `setup()` (`Code.gs:1093-1105`)

### Phase 1 — Security ก่อนอื่นใด (สำคัญสุด เสี่ยงสุด)
1. Deploy auth endpoints (`login/verifySession/changePassword/resetWithMasterKey`)
2. Migrate password: รัน one-time script ที่ hash ค่า default `'sml2569'` ลง `AdminCreds` แล้วแจ้ง admin คนจริงให้เปลี่ยนทันทีหลัง deploy
3. แก้ frontend ให้ admin login ผ่าน API — **ห้าม deploy คู่กับโค้ดเดิมที่ยัง bypass ได้พร้อมกัน** (mixed state จะเปิดช่องโหว่)

### Phase 2 — Data ที่กระทบ "เห็นไม่ตรงกันข้ามเครื่อง" (priority ตาม pain)
1. `activeMonths`/`lbRange` → Settings (กระทบ admin ทำงานข้ามเครื่อง)
2. Likes/Votes → Likes sheet
3. Custom quiz questions → บังคับใช้ sheet (ตัด fallback)
4. Hide wish flag → Wishes.Hidden column

### Phase 3 — Score integrity
1. เพิ่ม ScoreTransactions, เขียนคู่กับ Points sheet เดิมผ่าน `grantPoints()`
2. Backfill ScoreTransactions จาก Points sheet เดิม (script one-time, อ่าน Points ทุกแถวที่ `WishDone`/`QuizDone=true` แล้วสร้าง tx ย้อนหลัง)

### Phase 4 — Audit & Leaderboard ranges
1. เพิ่ม AuditLog, ติด `logAudit()` ในทุก mutating handler
2. เพิ่ม `getLeaderboard(from,to)` ใหม่, เปลี่ยน UI dropdown รายเดือนเป็น preset รายเดือน/ไตรมาส/ปี/กำหนดเอง — คง `getMonthlyLeaderboard` เดิมไว้ deprecated ได้ระยะหนึ่งเพื่อ backward compat

### Phase 5 — Cleanup
ลบ `getAdminPass/setAdminPass`, `adminMasterKey` generation, `sml_hidden`, `votes_*`, `myvote_*`, `customQ_*`, `sml_active_months` ออกจาก index.html ทั้งหมด; localStorage ที่เหลือ = `sml_api_url` (ไม่ลับ), `playerName/playerEmpId` (convenience), `adminToken` ย้ายไป sessionStorage

### Rollback Plan
เก็บโค้ดเดิมเป็น git tag ก่อนแก้แต่ละ phase; เพราะ Sheets เป็น append-only ในหลาย action (ไม่ overwrite ทำลายข้อมูลเดิม) การ rollback โค้ดฝั่ง frontend/Apps Script ทำได้โดยไม่กระทบข้อมูลที่เก็บไปแล้ว

---

## 9. ของที่ยังไม่ทำในเอกสารนี้ (ต้องตัดสินใจ/ทำต่อ)

- **Hash algorithm**: ใช้ `Utilities.computeDigest` (SHA-256+salt) พอสำหรับ Apps Script — ไม่มี bcrypt native ใน Apps Script ต้องยอมรับข้อจำกัดนี้ หรือเรียก external hashing service (เพิ่ม complexity เกินจำเป็นสำหรับระบบขนาดนี้)
- **Rate limiting / lockout**: ออกแบบ column ไว้แล้ว (`FailedAttempts/LockedUntil`) แต่ logic ยังไม่เขียน
- **Employee Engagement Platform ในอนาคต**: schema ปัจจุบัน (Persons/ScoreTransactions/AuditLog แยกชัด) ขยายเพิ่ม module ใหม่ (เช่น survey, recognition) ได้โดยเพิ่ม sheet ใหม่ + reuse `Persons`/`Sessions`/`AuditLog` เป็นแกนกลาง โดยไม่ต้องรื้อของเดิม

---

ถ้าต้องการให้ลงมือแก้โค้ดจริงใน `Code.gs`/`index.html` ตาม Phase ไหนก่อน บอกมาได้เลย — แนะนำเริ่ม **Phase 1 (Security/Auth)** ก่อน เพราะเป็นช่องโหว่ที่ใหญ่ที่สุดและกระทบทุก phase ถัดไป
