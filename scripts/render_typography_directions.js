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
const outDir = path.resolve(__dirname, '../docs/design/screenshots/phase0');

const htmlContent = (direction, theme) => {
  const isDark = theme === 'dark';
  const bgPage = isDark ? '#0E0F11' : '#F7F6F3';
  const bgSurface = isDark ? '#141518' : '#FFFFFF';
  const bgRaised = isDark ? '#1A1B1F' : '#FAFAFA';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.08)' : '#E6E4DF';
  const textPrimary = isDark ? '#ECECEE' : '#16171A';
  const textSecondary = isDark ? '#9A9CA3' : '#686B74';
  const accentPrimary = '#5B5EE6';
  const accentLink = isDark ? '#9B9EF5' : '#4A4DD6';
  const successColor = isDark ? '#4E9A51' : '#2E7D32';
  const warningColor = isDark ? '#E59B38' : '#C77700';
  const errorColor = isDark ? '#D9534F' : '#C62828';

  const isSerif = direction === 'A';
  const h1Font = isSerif ? "'Instrument Serif', Georgia, serif" : "'Geist', -apple-system, sans-serif";
  const h1Weight = isSerif ? "400" : "600";
  const h1Size = isSerif ? "38px" : "30px";
  const h1Tracking = isSerif ? "-0.01em" : "-0.03em";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: ${bgPage};
      color: ${textPrimary};
      font-family: 'Geist', -apple-system, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      padding: 48px;
      -webkit-font-smoothing: antialiased;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .badge-direction {
      display: inline-block;
      font-size: 11px;
      font-weight: 500;
      color: ${accentLink};
      background: ${isDark ? 'rgba(91, 94, 230, 0.12)' : 'rgba(91, 94, 230, 0.08)'};
      border: 1px solid ${isDark ? 'rgba(91, 94, 230, 0.25)' : 'rgba(91, 94, 230, 0.20)'};
      padding: 3px 10px;
      border-radius: 4px;
      margin-bottom: 16px;
      letter-spacing: 0.02em;
    }
    .page-header {
      margin-bottom: 40px;
      border-bottom: 1px solid ${borderColor};
      padding-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .page-title {
      font-family: ${h1Font};
      font-size: ${h1Size};
      font-weight: ${h1Weight};
      letter-spacing: ${h1Tracking};
      line-height: 1.15;
      color: ${textPrimary};
      margin-bottom: 8px;
    }
    .page-desc {
      color: ${textSecondary};
      font-size: 14px;
      max-width: 640px;
    }
    .btn-primary {
      background: ${accentPrimary};
      color: #FFFFFF;
      border: 1px solid ${accentPrimary};
      border-radius: 4px;
      padding: 8px 16px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .hero-prompt-box {
      background: ${bgSurface};
      border: 1px solid ${borderColor};
      border-radius: 6px;
      padding: 16px 20px;
      margin-bottom: 36px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .prompt-text {
      color: ${textSecondary};
      font-size: 14px;
    }
    .kpi-row {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 48px;
    }
    .kpi-card {
      background: ${bgSurface};
      border: 1px solid ${borderColor};
      border-radius: 4px;
      padding: 16px 20px;
    }
    .kpi-label {
      font-size: 12px;
      color: ${textSecondary};
      margin-bottom: 6px;
    }
    .kpi-val-row {
      display: flex;
      align-items: baseline;
      gap: 8px;
    }
    .kpi-number {
      font-family: 'Geist Mono', monospace;
      font-size: 24px;
      font-weight: 500;
      font-feature-settings: "tnum" 1;
      color: ${textPrimary};
    }
    .status-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      display: inline-block;
    }
    .status-ok { background-color: ${successColor}; }
    .status-warn { background-color: ${warningColor}; }
    .status-err { background-color: ${errorColor}; }

    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: ${textPrimary};
      margin-bottom: 16px;
    }
    .table-container {
      background: ${bgSurface};
      border: 1px solid ${borderColor};
      border-radius: 4px;
      overflow: hidden;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    th {
      font-size: 12px;
      font-weight: 500;
      color: ${textSecondary};
      padding: 12px 16px;
      border-bottom: 1px solid ${borderColor};
      background: ${bgRaised};
    }
    th.num, td.num {
      text-align: right;
    }
    td {
      padding: 14px 16px;
      font-size: 13px;
      border-bottom: 1px solid ${borderColor};
      color: ${textPrimary};
    }
    tr:last-child td {
      border-bottom: none;
    }
    .mono-cell {
      font-family: 'Geist Mono', monospace;
      font-feature-settings: "tnum" 1;
      color: ${textPrimary};
    }
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: ${textSecondary};
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="badge-direction">
      Typographic Direction ${direction}: ${isSerif ? 'Geist + Instrument Serif (H1)' : 'Geist Modern Mono-Family'} • ${theme.toUpperCase()}
    </div>
    
    <header class="page-header">
      <div>
        <h1 class="page-title">Fleet Overview</h1>
        <p class="page-desc">Natural-language analytics and telemetry health across 5,000 active nodes with continuous AST validation.</p>
      </div>
      <div>
        <button class="btn-primary">
          <span>Ask question</span>
        </button>
      </div>
    </header>

    <div class="hero-prompt-box">
      <span class="prompt-text">Which devices have warranties expiring in the next 30 days?</span>
      <button class="btn-primary" style="padding: 6px 14px; font-size: 12px;">Ask Query &rarr;</button>
    </div>

    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-label">Total fleet nodes</div>
        <div class="kpi-val-row">
          <span class="kpi-number">5,000</span>
          <span class="status-dot status-ok"></span>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Operational</div>
        <div class="kpi-val-row">
          <span class="kpi-number">3,019</span>
          <span class="status-dot status-ok"></span>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Requires attention</div>
        <div class="kpi-val-row">
          <span class="kpi-number">258</span>
          <span class="status-dot status-warn"></span>
        </div>
      </div>
      <div class="kpi-card">
        <div class="kpi-label">Open repairs</div>
        <div class="kpi-val-row">
          <span class="kpi-number">1,500</span>
          <span class="status-dot status-err"></span>
        </div>
      </div>
    </div>

    <h2 class="section-title">Data Health Findings</h2>
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Rule check</th>
            <th>Category</th>
            <th>Impacted records</th>
            <th>Severity</th>
            <th class="num">Health score</th>
            <th class="num">Last run</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Missing warranty expiration date</td>
            <td>Schema completeness</td>
            <td class="mono-cell">1,500</td>
            <td><span class="status-badge"><span class="status-dot status-err"></span> Critical</span></td>
            <td class="num mono-cell">87.4%</td>
            <td class="num mono-cell">10m ago</td>
          </tr>
          <tr>
            <td>Null serial number tags</td>
            <td>Asset integrity</td>
            <td class="mono-cell">258</td>
            <td><span class="status-badge"><span class="status-dot status-warn"></span> Warning</span></td>
            <td class="num mono-cell">94.8%</td>
            <td class="num mono-cell">14m ago</td>
          </tr>
          <tr>
            <td>Unusual telemetry drift (DAL-01)</td>
            <td>Signal distribution</td>
            <td class="mono-cell">50</td>
            <td><span class="status-badge"><span class="status-dot status-warn"></span> Warning</span></td>
            <td class="num mono-cell">96.2%</td>
            <td class="num mono-cell">22m ago</td>
          </tr>
          <tr>
            <td>Kernel dual-key role separation</td>
            <td>Access security</td>
            <td class="mono-cell">0</td>
            <td><span class="status-badge"><span class="status-dot status-ok"></span> Passed</span></td>
            <td class="num mono-cell">100.0%</td>
            <td class="num mono-cell">1m ago</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</body>
</html>`;
};

// 1. Launch Chrome via spawn with CDP
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-typo-'));
const cdpPort = 9235;
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

const browser = await chromium.connectOverCDP(wsUrl);

for (const dir of ['A', 'B']) {
  for (const theme of ['dark', 'light']) {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const content = htmlContent(dir, theme);
    await page.setContent(content, { waitUntil: 'networkidle' });
    // Allow Google Web Fonts to load
    await page.waitForTimeout(600);

    const shotPath = path.join(outDir, `typography-direction-${dir}-${theme}-1440.png`);
    const buf = await page.screenshot({ fullPage: false });
    fs.writeFileSync(shotPath, buf);
    console.log(`Saved typography mockup: ${path.basename(shotPath)}`);
    await page.close();
  }
}

await browser.close();
cp.kill();
console.log('Typography mockups generated successfully!');
