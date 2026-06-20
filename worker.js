/**
 * Cloudflare Worker — proxy หน้าเว็บ -> Google Apps Script จริง
 *
 * จุดประสงค์: ซ่อน URL จริงของ Apps Script ไม่ให้เห็นแม้ตอนเปิด DevTools/Network tab
 * index.html เรียก URL ของ Worker นี้แทน Worker จะ forward ไป Apps Script จริง
 * แล้วส่ง response กลับ พร้อมเปิด CORS ให้ GitHub Pages เรียกได้
 *
 * วิธี deploy:
 * 1. สมัคร/ล็อกอิน https://dash.cloudflare.com -> Workers & Pages -> Create -> Create Worker
 * 2. วางโค้ดนี้ทับโค้ด default ทั้งหมด -> Deploy
 * 3. ไปที่ Settings -> Variables and Secrets -> Add -> ชื่อ GAS_URL
 *    ค่า = URL จริงของ Apps Script Web App ที่ลงท้าย /exec (เลือก Secret, ไม่ใช่ Text ธรรมดา)
 * 4. Save and deploy
 * 5. คัดลอก URL ของ Worker (รูปแบบ https://<ชื่อ>.<account>.workers.dev) มาตั้งเป็น DEFAULT_API_URL ใน index.html
 */

export default {
  async fetch(request, env) {
    const gasUrl = env.GAS_URL;
    if (!gasUrl) {
      return new Response(JSON.stringify({ error: 'GAS_URL not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const incoming = new URL(request.url);
    const target = new URL(gasUrl);
    target.search = incoming.search;

    const init = {
      method: request.method,
      headers: { 'Content-Type': request.headers.get('Content-Type') || 'text/plain' },
      redirect: 'follow',
    };
    if (request.method === 'POST') {
      init.body = await request.text();
    }

    const resp = await fetch(target.toString(), init);
    const body = await resp.text();

    return new Response(body, {
      status: resp.status,
      headers: { 'Content-Type': resp.headers.get('Content-Type') || 'application/json', ...corsHeaders },
    });
  },
};
