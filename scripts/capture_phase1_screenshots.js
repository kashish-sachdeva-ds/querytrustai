const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

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

async function capture() {
  const { chromium } = require('../frontend/node_modules/playwright');

  const outDir = path.resolve(__dirname, '..', 'docs', 'design', 'screenshots', 'phase1');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const port = 9228;
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const userDataDir = path.resolve(__dirname, '..', 'tmp_chrome_phase1');

  console.log('Spawning Chrome headless on port', port);
  const cp = spawn(chromePath, [
    '--headless=new',
    '--no-sandbox',
    '--disable-gpu',
    `--user-data-dir=${userDataDir}`,
    `--remote-debugging-port=${port}`
  ]);

  // Wait for Chrome to initialize
  let wsUrl = null;
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 500));
    try {
      wsUrl = await getWsUrl(port);
      if (wsUrl) break;
    } catch {}
  }

  if (!wsUrl) {
    cp.kill();
    throw new Error('Failed to obtain WebSocket URL from Chrome');
  }

  console.log('Connecting Playwright to Chrome CDP at:', wsUrl);
  const browser = await chromium.connectOverCDP(wsUrl);

  const targets = [
    { name: 'fleet-overview', tab: 'overview' },
    { name: 'data-health', tab: 'data-quality' },
    { name: 'query-studio', tab: 'ask-data' },
    { name: 'anomalies', tab: 'anomalies' }
  ];

  const viewports = [
    { label: '1440px', width: 1440, height: 900 },
    { label: '390px', width: 390, height: 844, isMobile: true }
  ];

  const themes = ['dark', 'light'];

  for (const theme of themes) {
    for (const vp of viewports) {
      const context = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.isMobile || false,
        deviceScaleFactor: 2
      });
      const page = await context.newPage();

      // Go to app initial
      await page.goto('http://127.0.0.1:5173', { waitUntil: 'domcontentloaded' });

      // Set auth & theme
      await page.evaluate((th) => {
        localStorage.setItem('qt_offline_demo', 'true');
        localStorage.setItem('qt_cached_user', JSON.stringify({
          id: 1,
          email: 'admin@querytrust.internal',
          full_name: 'Security Admin',
          role: 'admin',
          is_active: true
        }));
        localStorage.setItem('qt-theme', th);
        if (th === 'dark') {
          document.documentElement.classList.add('dark');
          document.documentElement.setAttribute('data-theme', 'dark');
        } else {
          document.documentElement.classList.remove('dark');
          document.documentElement.setAttribute('data-theme', 'light');
        }
      }, theme);

      for (const t of targets) {
        await page.goto(`http://127.0.0.1:5173/?tab=${t.tab}`, { waitUntil: 'networkidle' });
        // Ensure theme applied after navigation
        await page.evaluate((th) => {
          if (th === 'dark') {
            document.documentElement.classList.add('dark');
            document.documentElement.setAttribute('data-theme', 'dark');
          } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.setAttribute('data-theme', 'light');
          }
        }, theme);

        await page.waitForTimeout(1200);

        const filename = `${t.name}-${theme}-${vp.label}.png`;
        const filepath = path.join(outDir, filename);
        await page.screenshot({ path: filepath, fullPage: false });
        console.log(`Captured: ${filename}`);
      }

      await context.close();
    }
  }

  await browser.close();
  cp.kill();
  console.log('All screenshots captured successfully!');
}

capture().catch((e) => {
  console.error(e);
  process.exit(1);
});
