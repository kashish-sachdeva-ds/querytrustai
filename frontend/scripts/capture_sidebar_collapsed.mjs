import { chromium } from 'playwright'
import { preview } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(__dirname, '..')
const targetDir = 'C:\\Users\\Lenovo\\.gemini\\antigravity\\brain\\b9989ae8-555f-4f2f-901b-33912bdff412\\resize_audit'

async function run() {
  const previewServer = await preview({
    root: frontendRoot,
    preview: { port: 4173, host: '127.0.0.1' },
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
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
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
    const studioNav = page.locator('button:has-text("Query Studio"), a:has-text("Query Studio")').first()
    await studioNav.click()
    await page.waitForTimeout(600)

    // Collapse sidebar
    const collapseBtn = page.locator('button[aria-label="Toggle sidebar collapse"], button[title*="Collapse sidebar"]')
    await collapseBtn.click()
    await page.waitForTimeout(500)

    // Take screenshot of the collapsed sidebar rail in Dark Mode
    const sidebar = page.locator('aside.sidebar')
    await sidebar.screenshot({ path: path.join(targetDir, 'sidebar_rail_dark.png') })
    console.log('Captured sidebar_rail_dark.png')

    // Take full window screenshot showing the collapsed sidebar next to Query Studio
    await page.screenshot({ path: path.join(targetDir, 'window_studio_collapsed_dark.png') })
    console.log('Captured window_studio_collapsed_dark.png')

    // Switch to Light Mode
    await themeBtn.click()
    await page.waitForTimeout(400)

    await sidebar.screenshot({ path: path.join(targetDir, 'sidebar_rail_light.png') })
    console.log('Captured sidebar_rail_light.png')

    console.log('All collapsed sidebar captures completed successfully!')
  } catch (err) {
    console.error('Error during capture:', err)
  } finally {
    await browser.close()
    await previewServer.close()
    process.exit(0)
  }
}

run()

