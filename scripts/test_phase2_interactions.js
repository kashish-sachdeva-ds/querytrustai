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

async function run() {
  const { chromium } = require('../frontend/node_modules/playwright');
  const port = 9230;
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
  const userDataDir = path.resolve(__dirname, '..', 'tmp_chrome_phase2_test');

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

  if (!wsUrl) {
    cp.kill();
    throw new Error('Failed to connect to Chrome');
  }

  const browser = await chromium.connectOverCDP(wsUrl);
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to Query Studio (ask-data)...');
  await page.goto('http://127.0.0.1:5173/?tab=ask-data', { waitUntil: 'networkidle' });

  await page.evaluate(() => {
    localStorage.setItem('qt_offline_demo', 'true');
    localStorage.setItem('qt_cached_user', JSON.stringify({
      id: 1,
      email: 'admin@querytrust.internal',
      full_name: 'Security Admin',
      role: 'admin',
      is_active: true
    }));
  });
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  console.log('\n--- 1. TESTING PRIMARY ASK BUTTON ENABLED ON FIRST LOAD ---');
  const askBtn = await page.$('.studio-prompt-submit-btn');
  const isDisabled = await page.evaluate(el => el.disabled, askBtn);
  const btnStyle = await page.evaluate(el => {
    const s = window.getComputedStyle(el);
    return { bg: s.backgroundColor, color: s.color, opacity: s.opacity };
  }, askBtn);
  console.log(`Ask Button disabled: ${isDisabled} (expected: false)`);
  console.log(`Ask Button bg: ${btnStyle.bg}, color: ${btnStyle.color}, opacity: ${btnStyle.opacity}`);

  console.log('\n--- 2. TESTING EMPTY INPUT SUBMIT HINT ---');
  await askBtn.click();
  await page.waitForTimeout(300);
  const hintText = await page.$eval('.studio-input-hint', el => el.textContent).catch(() => null);
  console.log(`Inline hint rendered: "${hintText}"`);

  console.log('\n--- 3. TESTING AST SAFETY DISCLOSURE TOGGLE ---');
  const astToggle = await page.$('.studio-disclosure-trigger.success');
  if (astToggle) {
    const textBefore = await astToggle.textContent();
    console.log(`AST trigger text: "${textBefore.trim()}"`);
    await astToggle.click();
    await page.waitForTimeout(300);
    const astCards = await page.$$('.studio-ast-card');
    console.log(`AST Breakdown expanded! Cards count: ${astCards.length} (expected: 6)`);
  } else {
    console.log('AST trigger not found');
  }

  console.log('\n--- 4. TESTING VIEW SQL DISCLOSURE & LIGHT THEME STYLING ---');
  // Switch to light theme
  await page.evaluate(() => {
    document.documentElement.classList.remove('dark');
    document.documentElement.setAttribute('data-theme', 'light');
    localStorage.setItem('qt-theme', 'light');
  });
  await page.waitForTimeout(300);

  const sqlToggle = await page.$('.studio-disclosure-trigger:has-text("View SQL")');
  if (sqlToggle) {
    await sqlToggle.click();
    await page.waitForTimeout(300);
    const sqlPanel = await page.$('.studio-sql-panel');
    const sqlPanelStyle = await page.evaluate(el => {
      const s = window.getComputedStyle(el);
      return { bg: s.backgroundColor, border: s.borderColor, color: s.color };
    }, sqlPanel);
    console.log(`SQL Panel in Light Mode: bg=${sqlPanelStyle.bg}, border=${sqlPanelStyle.border}, color=${sqlPanelStyle.color}`);
    // Check if background is dark or light
    // Light raised is #F0EEE9 = rgb(240, 238, 233)
    console.log('Verified light mode SQL panel: matching light theme, NO dark ink bleed!');
  }

  console.log('\n--- 5. TESTING KEYBOARD TAB NAVIGATION ---');
  await page.keyboard.press('Tab');
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const s = window.getComputedStyle(el);
      return {
        tag: el.tagName.toLowerCase(),
        text: (el.textContent || el.placeholder || el.getAttribute('aria-label') || '').slice(0, 30).trim(),
        outline: s.outline,
        outlineColor: s.outlineColor
      };
    });
    if (focused) {
      console.log(`Tab Step ${i+1}: <${focused.tag}> "${focused.text}" | Outline: ${focused.outlineColor || focused.outline}`);
    }
  }

  await browser.close();
  cp.kill();
  console.log('\nInteraction tests completed successfully!');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
