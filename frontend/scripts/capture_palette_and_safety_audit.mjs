import { chromium } from 'playwright'
import { preview } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(__dirname, '..')
const targetDir = 'C:\\Users\\Lenovo\\.gemini\\antigravity\\brain\\b9989ae8-555f-4f2f-901b-33912bdff412\\palette_safety_audit'

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true })
}

async function run() {
  const previewServer = await preview({
    root: frontendRoot,
    preview: { port: 4176, host: '127.0.0.1' },
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
    await page.goto('http://127.0.0.1:4176/', { waitUntil: 'networkidle' })
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

    // 1. Navigate to Anomalies page
    console.log('Navigating to Anomalies page...')
    const anomaliesNav = page.locator('button:has-text("Anomalies"), a:has-text("Anomalies")').first()
    await anomaliesNav.click()
    await page.waitForTimeout(700)

    // Open Command Palette with Ctrl+K or Cmd+K
    console.log('Opening Command Palette via keyboard...')
    await page.keyboard.press('Control+k')
    await page.waitForTimeout(400)

    // Fallback click on search input in topbar if keyboard didn't open
    const palette = page.locator('.command-palette')
    if (await palette.count() === 0) {
      const topSearch = page.locator('input[placeholder*="Search or ask query"]')
      await topSearch.click()
      await page.waitForTimeout(400)
    }

    console.log('Capturing 01_command_palette_over_anomalies_dark.png...')
    await page.screenshot({ path: path.join(targetDir, '01_command_palette_over_anomalies_dark.png'), fullPage: false })

    // Close palette via Escape
    await page.keyboard.press('Escape')
    await page.waitForTimeout(400)

    // 2. Navigate to AST Safety Proof page
    console.log('Navigating to AST Safety Proof page...')
    const safetyNav = page.locator('button:has-text("AST Safety Proof"), a:has-text("AST Safety Proof")').first()
    await safetyNav.click()
    await page.waitForTimeout(700)

    console.log('Capturing 02_ast_safety_proof_dark.png...')
    await page.screenshot({ path: path.join(targetDir, '02_ast_safety_proof_dark.png'), fullPage: false })

    console.log('All audit captures completed successfully!')
  } catch (err) {
    console.error('Audit run error:', err)
  } finally {
    await browser.close()
    await previewServer.close()
    process.exit(0)
  }
}

run()

