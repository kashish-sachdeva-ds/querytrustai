import { chromium } from 'playwright'
import { preview } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(__dirname, '..')
const targetDir = 'C:\\Users\\Lenovo\\.gemini\\antigravity\\brain\\b9989ae8-555f-4f2f-901b-33912bdff412\\sidebar_audit'

async function run() {
  const previewServer = await preview({
    root: frontendRoot,
    preview: { port: 4174, host: '127.0.0.1' },
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
    await page.goto('http://127.0.0.1:4174/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)

    // Launch studio as admin
    const launchBtn = page.locator('button:has-text("Launch Studio as Admin")')
    await launchBtn.click()
    await page.waitForTimeout(800)

    // Switch to Dark Mode
    const themeBtn = page.locator('button[aria-label="Toggle visual theme"]')
    await themeBtn.click()
    await page.waitForTimeout(400)

    // 1. Capture Expanded Dark Mode Sidebar (Active on Fleet Overview)
    const sidebar = page.locator('aside.sidebar')
    await sidebar.screenshot({ path: path.join(targetDir, 'sidebar_expanded_fleet_dark.png') })
    console.log('Captured sidebar_expanded_fleet_dark.png')

    // Navigate to Query Studio
    const studioNav = page.locator('aside.sidebar button:has-text("Query Studio")').first()
    await studioNav.click()
    await page.waitForTimeout(500)

    // 2. Capture Expanded Dark Mode Sidebar (Active on Query Studio - indented glass, neon sky line)
    await sidebar.screenshot({ path: path.join(targetDir, 'sidebar_expanded_studio_dark.png') })
    console.log('Captured sidebar_expanded_studio_dark.png')

    // 3. Open Live Schemas accordion
    const schemasToggle = page.locator('aside.sidebar button:has-text("Live Schemas")').first()
    await schemasToggle.click()
    await page.waitForTimeout(300)
    await sidebar.screenshot({ path: path.join(targetDir, 'sidebar_expanded_schemas_dark.png') })
    console.log('Captured sidebar_expanded_schemas_dark.png')

    // 4. Capture Profile Popover (Clean, no duplicate navigation links)
    const profileBtn = page.locator('button[aria-label="User account menu"]').first()
    await profileBtn.click()
    await page.waitForTimeout(400)
    await page.screenshot({ path: path.join(targetDir, 'profile_popover_clean_dark.png') })
    console.log('Captured profile_popover_clean_dark.png')

    // Close profile popover
    await page.keyboard.press('Escape')
    await page.waitForTimeout(200)

    // 5. Test "+ New Query" action
    const newQueryBtn = page.locator('aside.sidebar button:has-text("New Query")').first()
    await newQueryBtn.click()
    await page.waitForTimeout(400)

    // 6. Collapse Sidebar
    const collapseBtn = page.locator('aside.sidebar button[aria-label="Collapse sidebar"]')
    await collapseBtn.click()
    await page.waitForTimeout(400)

    // 7. Capture Collapsed Sidebar Rail in Dark Mode
    await sidebar.screenshot({ path: path.join(targetDir, 'sidebar_rail_awwwards_dark.png') })
    console.log('Captured sidebar_rail_awwwards_dark.png')

    // Full screen view of Query Studio with collapsed rail
    await page.screenshot({ path: path.join(targetDir, 'full_screen_studio_collapsed_dark.png') })
    console.log('Captured full_screen_studio_collapsed_dark.png')

    console.log('ALL SCREENSHOTS CAPTURED SUCCESSFULLY!')
  } finally {
    await browser.close()
    await new Promise((res) => previewServer.httpServer.close(res))
  }
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
