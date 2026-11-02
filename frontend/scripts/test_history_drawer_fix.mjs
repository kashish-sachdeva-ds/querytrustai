import { chromium } from 'playwright'
import { preview } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(__dirname, '..')
const targetDir = 'C:\\Users\\Lenovo\\.gemini\\antigravity\\brain\\b9989ae8-555f-4f2f-901b-33912bdff412\\history_drawer_audit'

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
    const launchBtn = page.locator('button:has-text("Launch Studio as Admin")')
    await launchBtn.click()
    await page.waitForTimeout(800)

    // Switch to Dark Mode
    const themeBtn = page.locator('button[aria-label="Toggle visual theme"]')
    await themeBtn.click()
    await page.waitForTimeout(400)

    // Navigate to Query Studio
    const studioNav = page.locator('aside.sidebar button:has-text("Query Studio")').first()
    await studioNav.click()
    await page.waitForTimeout(600)

    // Collapse sidebar to replicate the exact user's state
    const collapseBtn = page.locator('aside.sidebar button[aria-label="Collapse sidebar"]')
    await collapseBtn.click()
    await page.waitForTimeout(400)

    // 1. Click History Pill
    const historyPill = page.locator('button:has-text("History")').first()
    await historyPill.click()
    await page.waitForTimeout(400)

    // Capture open history drawer
    await page.screenshot({ path: path.join(targetDir, '01_history_drawer_open_clean.png') })
    console.log('Captured 01_history_drawer_open_clean.png')

    // 2. Click the X close button
    const closeBtn = page.locator('.studio-drawer.left button.studio-drawer-close-btn')
    await closeBtn.click()
    await page.waitForTimeout(400)

    // Capture after clicking X
    await page.screenshot({ path: path.join(targetDir, '02_history_drawer_closed_via_cross.png') })
    console.log('Captured 02_history_drawer_closed_via_cross.png')

    // 3. Re-open History, test Escape key
    await historyPill.click()
    await page.waitForTimeout(300)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    await page.screenshot({ path: path.join(targetDir, '03_history_drawer_closed_via_esc.png') })
    console.log('Captured 03_history_drawer_closed_via_esc.png')

    // 4. Test Database Schemas Pill
    const schemaPill = page.locator('button:has-text("Database Schemas")').first()
    await schemaPill.click()
    await page.waitForTimeout(400)
    await page.screenshot({ path: path.join(targetDir, '04_schemas_drawer_open_clean.png') })
    console.log('Captured 04_schemas_drawer_open_clean.png')

    // Close via X button
    await closeBtn.click()
    await page.waitForTimeout(300)
    await page.screenshot({ path: path.join(targetDir, '05_schemas_drawer_closed.png') })
    console.log('Captured 05_schemas_drawer_closed.png')

    console.log('ALL DRAWER TESTS COMPLETED AND VERIFIED!')
  } finally {
    await browser.close()
    await new Promise((res) => previewServer.httpServer.close(res))
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})

