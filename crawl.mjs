// Read-only crawl: với mỗi trang -> điều hướng, cuộn để tải hết dữ liệu, chụp màn hình từng đoạn, lưu text.
// Không click, không nhập liệu. Dùng: node crawl.mjs <outDir>
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = 'https://workspace.mida-app.io';
const PAGES = [
  ['01-bang', 'Bảng', '/page/3268d987-c8f1-43f6-b9c4-a4c5125a7834'],
  ['02-hom-nay', 'Hôm nay', '/page/5f1eeec9-29cb-4aa3-b951-b7cd05e680c3'],
  ['03-du-an', 'Dự án', '/objects/projects?viewId=60e47666-e744-42d8-a158-236c6e096ad4'],
  ['04-sprint', 'Sprint', '/objects/sprints?viewId=afe3b976-c348-4101-ac51-d1dbe2a8e10d'],
  ['05-ung-dung', 'Ứng dụng', '/objects/apps?viewId=c6421a6c-aeba-4b54-83b1-54ccf762b586'],
  ['06-quyen-truy-cap-app', 'Quyền truy cập app', '/objects/appAccesses?viewId=568b274a-4aef-47cc-bb7a-3aa08b48fc64'],
  ['07-trang-thai-issue', 'Trạng thái issue', '/objects/issueStatuses?viewId=afa73f76-7f8e-4926-923c-9c360d8bd746'],
];
const outDir = process.argv[2] ?? './quan-ly-cong-viec';
// node crawl.mjs <outDir> <slug> "<name>"  -> chỉ chụp tab hiện tại, không điều hướng (vd. tab Backlog cùng URL).
const only = process.argv[3] ? [[process.argv[3], process.argv[4] ?? process.argv[3], null]] : null;

const targets = await (await fetch('http://localhost:9222/json/list')).json();
const target = targets.find((t) => t.type === 'page' && t.url.startsWith('http'));
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 0;
const pending = new Map();
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
};
const send = (method, params = {}) => new Promise((r, j) => {
  const i = ++id;
  pending.set(i, (msg) => (msg.error ? j(new Error(msg.error.message)) : r(msg.result)));
  ws.send(JSON.stringify({ id: i, method, params }));
});
const evaluate = async (expression) => {
  const res = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (res.exceptionDetails) throw new Error(res.exceptionDetails.exception?.description ?? 'eval error');
  return res.result.value;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const shot = async (file) => {
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(file, Buffer.from(data, 'base64'));
};

// Chọn container cuộn lớn nhất trong vùng nội dung chính (bỏ sidebar), gắn data-crawl-scroll để cuộn.
const PICK_SCROLLER = `(() => {
  document.querySelectorAll('[data-crawl-scroll]').forEach(e => e.removeAttribute('data-crawl-scroll'));
  const cands = [...document.querySelectorAll('*')].filter(e => {
    const s = getComputedStyle(e), r = e.getBoundingClientRect();
    return r.left > 200 && r.width > 300 && r.height > 200 &&
      ((/(auto|scroll)/.test(s.overflowY) && e.scrollHeight > e.clientHeight + 20) ||
       (/(auto|scroll)/.test(s.overflowX) && e.scrollWidth > e.clientWidth + 20));
  });
  cands.sort((a, b) => b.clientWidth * b.clientHeight - a.clientWidth * a.clientHeight);
  const el = cands[0];
  if (!el) return null;
  el.setAttribute('data-crawl-scroll', '1');
  return { sh: el.scrollHeight, ch: el.clientHeight, sw: el.scrollWidth, cw: el.clientWidth };
})()`;

// Bảng record (Twenty): header .record-table-column-field-N, ô [data-record-table-col=N] trong hàng [data-selectable-id].
const TABLE_EXTRACT = `(() => {
  const clean = (s) => s.replace(/\\s*\\n\\s*/g, ' · ').trim();
  const headers = {};
  document.querySelectorAll('.header-cell').forEach((h) => {
    const m = h.className.match(/record-table-column-field-(\\d+)/);
    if (m) headers[m[1]] = clean(h.innerText);
  });
  const rows = [...document.querySelectorAll('[data-selectable-id]')].map((r) => {
    const cells = {};
    r.querySelectorAll('[data-record-table-col]').forEach((c) => { cells[c.dataset.recordTableCol] = clean(c.innerText); });
    return { id: r.dataset.selectableId, cells };
  });
  return { headers, rows };
})()`;

await send('Page.enable');
mkdirSync(outDir, { recursive: true });
const index = [];

for (const [slug, name, path] of only ?? PAGES) {
  const dir = `${outDir}/${slug}`;
  mkdirSync(dir, { recursive: true });
  if (path) {
    await send('Page.navigate', { url: BASE + path });
    await sleep(7000);
  }

  // firstText: text nguyên bản lần đầu; extra: dòng mới xuất hiện khi cuộn; rows: bảng record theo id.
  let firstText = null;
  const extra = [];
  const seen = new Set();
  const headers = {};
  const rows = new Map();
  const collect = async () => {
    const text = await evaluate(`(document.querySelector('main') || document.body).innerText`);
    const ls = text.split('\n').map((s) => s.trim()).filter(Boolean);
    if (firstText === null) { firstText = text; ls.forEach((l) => seen.add(l)); }
    else for (const l of ls) if (!seen.has(l)) { seen.add(l); extra.push(l); }
    const t = await evaluate(TABLE_EXTRACT);
    Object.assign(headers, t.headers);
    for (const r of t.rows) rows.set(r.id, { ...(rows.get(r.id) ?? {}), ...r.cells });
  };

  let n = 1;
  await shot(`${dir}/${String(n).padStart(2, '0')}.png`);
  await collect();

  const sc = await evaluate(PICK_SCROLLER);
  if (sc) {
    // Cuộn dọc hết, rồi cuộn ngang hết (bảng nhiều cột / board nhiều cột).
    for (const axis of ['y', 'x']) {
      if (axis === 'y' ? sc.sh <= sc.ch + 20 : sc.sw <= sc.cw + 20) continue;
      for (let step = 1; step <= 40; step++) {
        const done = await evaluate(`(() => {
          const e = document.querySelector('[data-crawl-scroll]');
          if (!e) return true;
          const k = '${axis}' === 'y' ? 'scrollTop' : 'scrollLeft';
          const size = '${axis}' === 'y' ? e.clientHeight : e.clientWidth;
          const before = e[k];
          e[k] += size * 0.85;
          return e[k] === before;
        })()`);
        if (done) break;
        await sleep(1500);
        n++;
        await shot(`${dir}/${String(n).padStart(2, '0')}.png`);
        await collect();
      }
    }
  }

  const { url, title } = await evaluate('({url: location.href, title: document.title})');
  let table = '';
  if (rows.size) {
    const cols = Object.keys(headers).sort((a, b) => a - b);
    const esc = (v) => (v ?? '').replace(/\|/g, '\\|');
    table = `## Bảng dữ liệu (${rows.size} dòng)\n\n| ${cols.map((c) => esc(headers[c])).join(' | ')} |\n|${cols.map(() => '---').join('|')}|\n` +
      [...rows.values()].map((r) => `| ${cols.map((c) => esc(r[c])).join(' | ')} |`).join('\n') + '\n\n';
  }
  const more = extra.length ? `\n## Nội dung thêm khi cuộn\n\n${extra.join('\n')}\n` : '';
  writeFileSync(`${dir}/content.md`,
    `# ${name}\n\n- URL: ${url}\n- Title: ${title}\n- Captured: ${new Date().toISOString()}\n- Screenshots: ${n}\n\n${table}## Nội dung màn hình (text)\n\n${firstText}\n${more}`);
  index.push(`| ${slug} | ${name} | ${n} | ${rows.size || '-'} | ${url} |`);
  console.log(`done ${slug}: ${n} screenshots, ${rows.size} table rows`);
}

if (!only) writeFileSync(`${outDir}/README.md`,
  `# Quản lý công việc — snapshot (read-only)\n\nCaptured: ${new Date().toISOString()}\n\n| Folder | Trang | Screenshots | Số dòng bảng | URL |\n|---|---|---|---|---|\n${index.join('\n')}\n`);
if (only) console.log(index[0]);
ws.close();
