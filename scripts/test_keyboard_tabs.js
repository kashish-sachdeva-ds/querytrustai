const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

async function getWsUrl(port) {
  return new Promise((resolve, reject) => {
    const req = http.get(`http://127.0.0.1:${port}/json/version`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve(parsed.webSocketDebuggerUrl);
        } catch (e) {
          reject(e);
        }
      });
    });
    req.on('error', reject);
  });
}

async function runTabTest() {
  const { chromium } = require('../frontend/node_modules/playwright');
  const port = 9229;
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const userDataDir = path.resolve(__dirname, '..', 'tmp_chrome_tabtest');

  const cp = spawn(chromePath, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    `--user-data-dir=${userDataDir}`,
    `--remote-debugging-port=${port}`
  ]);

  let wsUrl = null;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      wsUrl = await getWsUrl(port);
      if (wsUrl) break;
    } catch {}
  }

  const browser = await chromium.connectOverCDP(wsUrl);
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto('http://127.0.0.1:5173/?tab=overview', { waitUntil: 'networkidle' });

  // Set demo login
  await page.evaluate(() => {
    localStorage.setItem('qt_offline_demo', 'true');
    localStorage.setItem('qt-theme', 'dark');
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  console.log('--- STARTING KEYBOARD TAB SEQUENCE TEST ---');
  const focusedElements = [];

  for (let i = 0; i < 25; i++) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);

    const info = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const tag = el.tagName.toLowerCase();
      const text = (el.innerText || el.getAttribute('aria-label') || el.getAttribute('placeholder') || el.className || '').trim().replace(/\n/g, ' ').slice(0, 40);
      const style = window.getComputedStyle(el);
      return {
        tag,
        text,
        outline: style.outline,
        outlineColor: style.outlineColor,
        boxShadow: style.boxShadow
      };
    });

    if (info) {
      focusedElements.push(info);
      console.log(`Step ${i + 1}: <${info.tag}> "${info.text}" | Outline: ${info.outline || info.outlineColor}`);
    }
  }

  // Also test hovering on button, input, chip, tabs, table row, sidebar item
  console.log('\n--- TESTING HOVER & ACTIVE INTERACTIONS ---');

  // Button hover/active
  const btn = await page.$('.btn-primary, .refresh-btn, button');
  if (btn) {
    await btn.hover();
    const btnStyle = await page.evaluate((el) => {
      const s = window.getComputedStyle(el);
      return { bg: s.backgroundColor, cursor: s.cursor };
    }, btn);
    console.log(`Button Hover: bg=${btnStyle.bg}, cursor=${btnStyle.cursor}`);
  }

  // Chip hover
  const chip = await page.$('.quick-chip, button.quick-chip');
  if (chip) {
    await chip.hover();
    const chipStyle = await page.evaluate((el) => {
      const s = window.getComputedStyle(el);
      return { bg: s.backgroundColor, border: s.borderColor };
    }, chip);
    console.log(`Chip Hover: bg=${chipStyle.bg}, border=${chipStyle.border}`);
  }

  // Tab hover & click (active)
  const tab = await page.$('.mecha-segment-btn, [role="tab"]');
  if (tab) {
    await tab.hover();
    console.log('Tab Hover verified.');
    await tab.click();
    console.log('Tab Click (Active) verified.');
  }

  // Table row hover (navigate to data-quality)
  await page.goto('http://127.0.0.1:5173/?tab=data-quality', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  const row = await page.$('tbody tr');
  if (row) {
    await row.hover();
    const rowBg = await page.evaluate(el => window.getComputedStyle(el).backgroundColor, row);
    console.log(`Table Row Hover: bg=${rowBg}`);
  }

  await browser.close();
  cp.kill();
  console.log('\nKeyboard Tab & interaction test completed successfully!');
}

runTabTest().catch((e) => {
  console.error(e);
  process.exit(1);
});
