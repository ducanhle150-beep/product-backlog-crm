// Kết nối vào Chrome đang chạy (browser.mjs) và in trạng thái tab + chụp màn hình.
// Dùng: node inspect.mjs [url]  — có url thì điều hướng tab hiện tại tới url đó trước.
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const url = process.argv[2];

const browser = await chromium.connectOverCDP('http://localhost:9222');
const ctx = browser.contexts()[0];
const page = ctx.pages().filter((p) => p.url().startsWith('http')).at(-1) ?? ctx.pages().at(-1);

if (url) await page.goto(url, { waitUntil: 'domcontentloaded' });
await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

mkdirSync('./screenshots', { recursive: true });
const file = `./screenshots/${Date.now()}.png`;
await page.screenshot({ path: file });

console.log(JSON.stringify({ url: page.url(), title: await page.title(), screenshot: file }, null, 2));
console.log('--- TEXT ---');
console.log((await page.innerText('body').catch(() => '')).slice(0, 8000));

await browser.close(); // chỉ ngắt kết nối CDP, không đóng Chrome
