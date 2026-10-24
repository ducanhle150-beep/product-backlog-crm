// Read-only CDP client: điều hướng, đọc DOM, chụp màn hình. Không click/sửa gì.
// Dùng: node cdp.mjs <command> [arg]
//   info                 -> url + title tab hiện tại
//   goto <url>           -> điều hướng tab tới url
//   eval <js>            -> chạy biểu thức JS chỉ-đọc, in kết quả JSON
//   shot <file.png>      -> chụp toàn trang
const [cmd, arg] = process.argv.slice(2);

const targets = await (await fetch('http://localhost:9222/json/list')).json();
const target = targets.find((t) => t.type === 'page' && t.url.startsWith('http'));
if (!target) throw new Error('No http page target found');

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 0;
const pending = new Map();
const listeners = [];
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  else listeners.forEach((l) => l(msg));
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

if (cmd === 'info') {
  console.log(JSON.stringify(await evaluate('({url: location.href, title: document.title})')));
} else if (cmd === 'goto') {
  await send('Page.enable');
  await send('Page.navigate', { url: arg });
  await sleep(6000);
  console.log(JSON.stringify(await evaluate('({url: location.href, title: document.title})')));
} else if (cmd === 'eval') {
  console.log(JSON.stringify(await evaluate(arg), null, 2));
} else if (cmd === 'shot') {
  const { data } = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  const { writeFileSync, mkdirSync } = await import('node:fs');
  const { dirname } = await import('node:path');
  mkdirSync(dirname(arg), { recursive: true });
  writeFileSync(arg, Buffer.from(data, 'base64'));
  console.log('saved', arg);
}
ws.close();
