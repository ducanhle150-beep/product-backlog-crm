// Mở Chrome thật với profile riêng (.pw-profile) và bật cổng CDP 9222
// để các script khác (inspect.mjs) kết nối vào và dùng lại phiên đăng nhập.
import { chromium } from 'playwright';

const url = process.argv[2] ?? 'about:blank';

const ctx = await chromium.launchPersistentContext('./.pw-profile', {
  channel: 'chrome',
  headless: false,
  viewport: null,
  args: ['--remote-debugging-port=9222', '--start-maximized'],
});

const page = ctx.pages()[0] ?? (await ctx.newPage());
await page.goto(url);
console.log('Browser ready on CDP http://localhost:9222');

ctx.on('close', () => process.exit(0));
