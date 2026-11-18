import http from 'http';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const { chromium } = require('../frontend/node_modules/playwright');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, '../frontend/dist');
const outDir = path.resolve(__dirname, '../docs/design/screenshots/phase0');

if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// 1. Static HTTP Server for dist
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0].split('#')[0];
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  let filePath = path.join(distDir, reqPath);
  
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    filePath = path.join(distDir, 'index.html');
  }

  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const port = server.address().port;
const baseUrl = `http://127.0.0.1:${port}`;
console.log(`Static server running at ${baseUrl}`);

// 2. Launch Chrome via spawn with CDP
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-'));
const cdpPort = 9228;
const cp = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--user-data-dir=' + tmpDir,
  `--remote-debugging-port=${cdpPort}`
]);

let wsUrl = null;
for (let i = 0; i < 30; i++) {
  await new Promise(r => setTimeout(r, 200));
  try {
    wsUrl = await new Promise((resolve, reject) => {
      const req = http.get(`http://127.0.0.1:${cdpPort}/json/version`, res => {
        let d = '';
        res.on('data', c => d += c);
        res.on('end', () => {
          try {
            resolve(JSON.parse(d).webSocketDebuggerUrl);
          } catch (e) {
            reject(e);
          }
        });
      });
      req.on('error', reject);
      req.setTimeout(500, () => req.destroy(new Error('timeout')));
    });
    if (wsUrl) break;
  } catch (e) {}
}

if (!wsUrl) {
  console.error('Failed to get WebSocketDebuggerUrl from Chrome');
  cp.kill();
  server.close();
  process.exit(1);
}

console.log('Connected to Chrome CDP at:', wsUrl);
const browser = await chromium.connectOverCDP(wsUrl);

const pagesToTest = [
  { tab: 'overview', name: 'fleet-overview' },
  { tab: 'ask-data', name: 'query-studio' },
  { tab: 'devices', name: 'data-catalog' },
  { tab: 'data-quality', name: 'data-health' },
  { tab: 'anomalies', name: 'anomalies' },
  { tab: 'evaluations', name: 'ast-safety' },
  { tab: 'data-sources', name: 'sources-kernel' },
  { tab: 'admin', name: 'people-access' }
];

const viewports = [
  { width: 1440, height: 900, label: '1440' },
  { width: 390, height: 844, label: '390' }
];

const themes = ['dark', 'light'];
const sampledMetrics = {};

for (const theme of themes) {
  for (const vp of viewports) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height }
    });

    await context.addInitScript(({ theme }) => {
      localStorage.setItem('qt-theme-v2', theme);
      localStorage.setItem('qt_offline_demo', 'true');
      localStorage.setItem('qt_cached_user', JSON.stringify({
        email: 'admin@querytrust.local',
        role: 'admin',
        display_name: 'System Administrator'
      }));
    }, { theme });

    const page = await context.newPage();

    for (const p of pagesToTest) {
      const url = `${baseUrl}/?tab=${p.tab}`;
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(400);

      const shotPath = path.join(outDir, `${p.name}-${theme}-${vp.label}.png`);
      const buf = await page.screenshot({ fullPage: false });
      fs.writeFileSync(shotPath, buf);
      console.log(`Saved screenshot: ${path.basename(shotPath)} (${buf.length} bytes)`);

      if (vp.label === '1440') {
        const key = `${p.name}-${theme}`;
        sampledMetrics[key] = await page.evaluate(() => {
          const results = {};
          const btns = Array.from(document.querySelectorAll('button'));
          for (const b of btns) {
            const txt = b.textContent?.trim().replace(/\s+/g, ' ');
            const style = window.getComputedStyle(b);
            if (txt && (txt.includes('Ask Query') || txt.includes('Ask Fleet AI') || txt.includes('Scan') || txt.includes('Show 50') || txt.includes('Run Live') || txt.includes('All') || txt.includes('Download safety report'))) {
              results[txt] = {
                bg: style.backgroundColor,
                color: style.color,
                border: style.borderColor,
                opacity: style.opacity
              };
            }
          }
          return results;
        });
      }
    }

    await context.close();
  }
}

// Keyboard tab focus test
const tabContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await tabContext.addInitScript(() => {
  localStorage.setItem('qt-theme-v2', 'dark');
  localStorage.setItem('qt_offline_demo', 'true');
});
const tabTestPage = await tabContext.newPage();
await tabTestPage.goto(`${baseUrl}/?tab=fleet-overview`, { waitUntil: 'networkidle' });
const focusResults = [];
for (let i = 0; i < 15; i++) {
  await tabTestPage.keyboard.press('Tab');
  const focusedInfo = await tabTestPage.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const style = window.getComputedStyle(el);
    return {
      tag: el.tagName,
      className: el.className,
      text: el.textContent?.trim().slice(0, 30),
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      outlineColor: style.outlineColor,
      boxShadow: style.boxShadow
    };
  });
  if (focusedInfo) focusResults.push(focusedInfo);
}
await tabContext.close();

await browser.close();
cp.kill();
server.close();

fs.writeFileSync(
  path.join(outDir, 'sampled_metrics.json'),
  JSON.stringify({ sampledMetrics, focusResults }, null, 2)
);
console.log('ALL SCREENSHOTS CAPTURED SUCCESSFULLY!');
