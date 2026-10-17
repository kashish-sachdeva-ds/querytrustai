import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR || path.join(process.cwd(), 'screenshots');
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

async function runLiveAudit() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  // Suppress onboarding popup by pre-seeding localStorage
  await page.addInitScript(() => {
    localStorage.setItem('qt_onboarded', 'true');
  });

  const auditResults = {};

  try {
    // 1. LOGIN PAGE (Light & Dark)
    console.log('Auditing Login Page...');
    await page.goto('http://localhost:5173/?tab=login');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('.login-split-page');

    // Axe on Login (Light)
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
    await page.waitForTimeout(400);
    const loginLight = await new AxeBuilder({ page }).analyze();
    auditResults['Login_Light'] = {
      violations: loginLight.violations.map(v => ({ id: v.id, impact: v.impact, description: v.description, nodes: v.nodes.length, targets: v.nodes.map(n => n.target) })),
      passes: loginLight.passes.length
    };

    // Axe on Login (Dark)
    await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
    await page.waitForTimeout(400);
    const loginDark = await new AxeBuilder({ page }).analyze();
    auditResults['Login_Dark'] = {
      violations: loginDark.violations.map(v => ({ id: v.id, impact: v.impact, description: v.description, nodes: v.nodes.length, targets: v.nodes.map(n => n.target) })),
      passes: loginDark.passes.length
    };

    // 2. LOG IN AS ADMIN
    console.log('Logging in as Admin...');
    await page.locator('button.demo-chip', { hasText: 'Try as Admin' }).click();
    await page.waitForTimeout(2000);

    // List of screens to audit in admin session
    const screens = [
      { name: 'Home', tab: 'overview', selector: '.overview-container' },
      { name: 'Equipment', tab: 'devices', selector: '.devices-view, .device-table' },
      { name: 'Data_health', tab: 'data-quality', selector: '.data-quality-view, .dq-table-card' },
      { name: 'Unusual_activity', tab: 'anomalies', selector: '.anomaly-monitor-view' },
      { name: 'Safety_proof', tab: 'evaluations', selector: '.eval-lab' },
      { name: 'People_and_access', tab: 'admin', selector: '.admin-view' },
      { name: 'Ask_data', tab: 'ask-data', selector: '.ask-data-view, .ask-data-container' }
    ];

    for (const screen of screens) {
      console.log(`Auditing ${screen.name}...`);
      await page.goto(`http://localhost:5173/?tab=${screen.tab}`);
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(1000);

      // Light mode
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'light');
        document.documentElement.setAttribute('data-color-scheme', 'light');
      });
      await page.waitForTimeout(400);
      const resLight = await new AxeBuilder({ page }).analyze();
      auditResults[`${screen.name}_Light`] = {
        violations: resLight.violations.map(v => ({ id: v.id, impact: v.impact, description: v.description, nodes: v.nodes.length, targets: v.nodes.map(n => n.target) })),
        passes: resLight.passes.length
      };

      // Dark mode
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
        document.documentElement.setAttribute('data-color-scheme', 'dark');
      });
      await page.waitForTimeout(400);
      const resDark = await new AxeBuilder({ page }).analyze();
      auditResults[`${screen.name}_Dark`] = {
        violations: resDark.violations.map(v => ({ id: v.id, impact: v.impact, description: v.description, nodes: v.nodes.length, targets: v.nodes.map(n => n.target) })),
        passes: resDark.passes.length
      };
    }

    // Save full JSON output immediately after axe runs
    fs.writeFileSync(
      path.join(ARTIFACTS_DIR, 'axe_audit_results.json'),
      JSON.stringify(auditResults, null, 2)
    );
    console.log('Axe audit JSON saved to axe_audit_results.json');
    console.log('SUMMARY OF VIOLATIONS:');
    for (const [key, data] of Object.entries(auditResults)) {
      console.log(`${key}: ${data.violations.length} violations, ${data.passes} passed rules`);
      if (data.violations.length > 0) {
        console.log(`   Violations: ${JSON.stringify(data.violations)}`);
      }
    }

    // 3. CAPTURE 360PX SCREENSHOTS
    console.log('Capturing 360px mobile screenshots...');
    const phoneContext = await browser.newContext({
      viewport: { width: 360, height: 740 },
      isMobile: true,
      hasTouch: true
    });
    const phonePage = await phoneContext.newPage();
    await phonePage.addInitScript(() => {
      localStorage.setItem('qt_onboarded', 'true');
      localStorage.setItem('qt-sidebar-collapsed', 'true');
    });

    // 3a. Login (360px)
    await phonePage.goto('http://localhost:5173/?tab=login');
    await phonePage.waitForLoadState('networkidle');
    await phonePage.waitForSelector('.login-split-page');
    await phonePage.screenshot({ path: path.join(ARTIFACTS_DIR, 'phone_360_login.png'), fullPage: false });

    // Log in on mobile as Analyst
    await phonePage.locator('button.demo-chip', { hasText: 'Try as Analyst' }).click();
    await phonePage.waitForTimeout(2000);

    // 3b. Home (360px)
    await phonePage.screenshot({ path: path.join(ARTIFACTS_DIR, 'phone_360_home.png'), fullPage: false });

    // 3c. Ask (360px)
    await phonePage.goto('http://localhost:5173/?tab=ask-data');
    await phonePage.waitForLoadState('networkidle');
    await phonePage.waitForTimeout(1500);
    await phonePage.screenshot({ path: path.join(ARTIFACTS_DIR, 'phone_360_ask.png'), fullPage: false });

    // 3d. Equipment (360px)
    await phonePage.goto('http://localhost:5173/?tab=devices');
    await phonePage.waitForLoadState('networkidle');
    await phonePage.waitForTimeout(1500);
    await phonePage.screenshot({ path: path.join(ARTIFACTS_DIR, 'phone_360_equipment.png'), fullPage: false });

    // 3e. Device Drawer (360px)
    await phonePage.goto('http://localhost:5173/?tab=devices&device=1');
    await phonePage.waitForLoadState('networkidle');
    await phonePage.waitForSelector('.device-drawer, .device-detail-drawer, [role="dialog"]', { timeout: 8000 }).catch(() => {});
    await phonePage.waitForTimeout(1500);
    await phonePage.screenshot({ path: path.join(ARTIFACTS_DIR, 'phone_360_device_drawer.png'), fullPage: false });

    console.log('Mobile screenshots captured successfully.');

  } catch (err) {
    console.error('Error during live audit:', err);
  } finally {
    await browser.close();
  }
}

runLiveAudit();
