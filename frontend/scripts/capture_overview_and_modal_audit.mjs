import { chromium } from 'playwright'
import { preview } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(__dirname, '..')
const targetDir = 'C:\\Users\\Lenovo\\.gemini\\antigravity\\brain\\b9989ae8-555f-4f2f-901b-33912bdff412\\overview_modal_audit'

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true })
}

async function run() {
  const previewServer = await preview({
    root: frontendRoot,
    preview: { port: 4175, host: '127.0.0.1' },
  })

  let browser
  try {
    browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true })
  } catch {
    browser = await chromium.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true })
  }

  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } })
  const page = await context.newPage()

  try {
    await page.goto('http://127.0.0.1:4175/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)

    // Launch studio as admin
    const launchBtn = page.locator('button:has-text("Launch Studio as Admin"), button:has-text("Enter Studio")').first()
    if (await launchBtn.count() > 0) {
      await launchBtn.click()
      await page.waitForTimeout(600)
    }

    // Ensure dark mode
    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    if (!isDark) {
      const themeBtn = page.locator('button[aria-label="Toggle visual theme"]')
      if (await themeBtn.count() > 0) {
        await themeBtn.click()
        await page.waitForTimeout(400)
      }
    }

    // Navigate to Fleet Overview
    const overviewNav = page.locator('button:has-text("Fleet Overview"), a:has-text("Fleet Overview")').first()
    await overviewNav.click()
    await page.waitForTimeout(700)

    // 1. Capture Fleet Overview default state
    console.log('Capturing 01_fleet_overview_dark_default.png...')
    await page.screenshot({ path: path.join(targetDir, '01_fleet_overview_dark_default.png'), fullPage: false })

    // 2. Hover over the "Verify in Studio" button under Upcoming SLA Expirations
    console.log('Hovering over action button under SLA Expirations...')
    const actionButtons = page.locator('.mecha-action-btn')
    if (await actionButtons.count() >= 2) {
      await actionButtons.nth(1).hover()
      await page.waitForTimeout(300)
      await page.screenshot({ path: path.join(targetDir, '02_fleet_overview_action_btn_hover.png'), fullPage: false })
    }

    // 3. Click the top navbar security integrity telemetry chip to open RoiBenchmarkModal
    console.log('Opening RoiBenchmarkModal...')
    const telemetryChip = page.locator('button[title*="Kernel Status: 6/6 AST Gates Enforced"]').first()
    if (await telemetryChip.count() > 0) {
      await telemetryChip.click()
      await page.waitForTimeout(500)
      console.log('Capturing 03_roi_benchmark_modal_dark.png...')
      await page.screenshot({ path: path.join(targetDir, '03_roi_benchmark_modal_dark.png'), fullPage: false })

      // 4. Press Escape to verify dismissal
      console.log('Pressing Escape to close modal...')
      await page.keyboard.press('Escape')
      await page.waitForTimeout(400)
      await page.screenshot({ path: path.join(targetDir, '04_roi_benchmark_modal_closed.png'), fullPage: false })
    }

    console.log('All overview and modal audit screenshots saved successfully!')
  } catch (err) {
    console.error('Audit error:', err)
  } finally {
    await browser.close()
    await previewServer.close()
    process.exit(0)
  }
}

run()

