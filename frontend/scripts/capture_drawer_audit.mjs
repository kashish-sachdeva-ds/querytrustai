import { chromium } from 'playwright'
import { preview } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(__dirname, '..')
const targetDir = 'C:\\Users\\Lenovo\\.gemini\\antigravity\\brain\\b9989ae8-555f-4f2f-901b-33912bdff412\\drawer_audit'

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true })
}

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

    // Navigate to Data Catalog
    const catalogNav = page.locator('button:has-text("Data Catalog"), a:has-text("Data Catalog")').first()
    await catalogNav.click()
    await page.waitForTimeout(800)

    // Switch to dark mode
    const themeBtn = page.locator('button[aria-label="Toggle visual theme"]')
    await themeBtn.click()
    await page.waitForTimeout(400)

    // Click on the first device row to open drawer
    console.log('Clicking on first device row...')
    const firstRow = page.locator('.devices-table-row').first()
    await firstRow.click()
    await page.waitForTimeout(800)

    // Capture drawer open in Dark Mode
    console.log('Capturing drawer in Dark Mode...')
    await page.screenshot({ path: path.join(targetDir, '01_drawer_dark_current.png'), fullPage: false })

    // Switch to Light Mode
    console.log('Switching to Light Mode with drawer open...')
    await themeBtn.click()
    await page.waitForTimeout(500)

    // Capture drawer in Light Mode
    console.log('Capturing drawer in Light Mode...')
    await page.screenshot({ path: path.join(targetDir, '02_drawer_light_current.png'), fullPage: false })

    console.log('Drawer audit complete!')
  } catch (err) {
    console.error('Error:', err)
  } finally {
    await browser.close()
    await previewServer.close()
    process.exit(0)
  }
}

run()

