import { chromium } from 'playwright'
import { preview } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(__dirname, '..')
const targetDir = 'C:\\Users\\Lenovo\\.gemini\\antigravity\\brain\\b9989ae8-555f-4f2f-901b-33912bdff412\\sidebar_light_dark_audit'

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
    await page.waitForTimeout(500)

    // Launch studio as admin
    const launchBtn = page.locator('button:has-text("Launch Studio as Admin")')
    await launchBtn.click()
    await page.waitForTimeout(800)

    // Ensure we are in Light Mode first (default or toggle if dark)
    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    if (isDark) {
      const themeBtn = page.locator('button[aria-label="Toggle visual theme"]').or(page.locator('button:has-text("Switch to")'))
      await themeBtn.first().click()
      await page.waitForTimeout(400)
    }

    const sidebar = page.locator('aside.sidebar')

    // 1. Capture Fleet Overview in Light Mode (Full Window)
    await page.screenshot({ path: path.join(targetDir, '01_fleet_overview_light_fullscreen.png') })
    console.log('Captured 01_fleet_overview_light_fullscreen.png')

    // 2. Capture Focused Sidebar in Light Mode (Fleet Overview active)
    await sidebar.screenshot({ path: path.join(targetDir, '02_sidebar_light_fleet_active.png') })
    console.log('Captured 02_sidebar_light_fleet_active.png')

    // 3. Switch to Query Studio in Light Mode
    const studioNav = page.locator('aside.sidebar button:has-text("Query Studio")').first()
    await studioNav.click()
    await page.waitForTimeout(500)
    await sidebar.screenshot({ path: path.join(targetDir, '03_sidebar_light_studio_active.png') })
    console.log('Captured 03_sidebar_light_studio_active.png')

    // 4. Open Live Schemas accordion in Light Mode
    const schemasToggle = page.locator('aside.sidebar button:has-text("Live Schemas")').first()
    await schemasToggle.click()
    await page.waitForTimeout(300)
    await sidebar.screenshot({ path: path.join(targetDir, '04_sidebar_light_schemas_open.png') })
    console.log('Captured 04_sidebar_light_schemas_open.png')

    // 5. Collapse Sidebar in Light Mode
    const collapseBtn = page.locator('aside.sidebar button[aria-label="Collapse sidebar"]')
    await collapseBtn.click()
    await page.waitForTimeout(400)
    await sidebar.screenshot({ path: path.join(targetDir, '05_sidebar_light_rail_collapsed.png') })
    console.log('Captured 05_sidebar_light_rail_collapsed.png')

    // 6. Expand Sidebar back
    const expandBtn = page.locator('aside.sidebar button[aria-label="Expand sidebar"]').first()
    await expandBtn.click()
    await page.waitForTimeout(400)

    // 7. Switch to Dark Mode
    const themeToggleBtn = page.locator('header button[aria-label="Toggle visual theme"]').or(page.locator('header button:has(.lucide-sun, .lucide-moon)'))
    await themeToggleBtn.first().click()
    await page.waitForTimeout(400)

    // Verify dark mode class is active
    const nowDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    console.log('Switched to dark mode:', nowDark)

    // 8. Capture Focused Sidebar in Dark Mode (Query Studio active)
    await sidebar.screenshot({ path: path.join(targetDir, '06_sidebar_dark_studio_active.png') })
    console.log('Captured 06_sidebar_dark_studio_active.png')

    // 9. Switch back to Fleet Overview in Dark Mode
    const overviewNav = page.locator('aside.sidebar button:has-text("Fleet Overview")').first()
    await overviewNav.click()
    await page.waitForTimeout(500)
    await sidebar.screenshot({ path: path.join(targetDir, '07_sidebar_dark_fleet_active.png') })
    console.log('Captured 07_sidebar_dark_fleet_active.png')

    // 10. Collapse Sidebar in Dark Mode
    const collapseBtnDark = page.locator('aside.sidebar button[aria-label="Collapse sidebar"]')
    await collapseBtnDark.click()
    await page.waitForTimeout(400)
    await sidebar.screenshot({ path: path.join(targetDir, '08_sidebar_dark_rail_collapsed.png') })
    console.log('Captured 08_sidebar_dark_rail_collapsed.png')

    console.log('ALL SIDEBAR AUDIT SCREENSHOTS CAPTURED!')
  } finally {
    await browser.close()
    await new Promise((res) => previewServer.httpServer.close(res))
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})

