import { chromium } from 'playwright'
import { preview } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(__dirname, '..')
const targetDir = 'C:\\Users\\Lenovo\\.gemini\\antigravity\\brain\\b9989ae8-555f-4f2f-901b-33912bdff412\\founder_audit'

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

    // Navigate to Query Studio
    const studioNav = page.locator('button:has-text("Query Studio"), a:has-text("Query Studio")').first()
    await studioNav.click()
    await page.waitForTimeout(800)

    // Capture Query Studio Dark
    await page.screenshot({ path: path.join(targetDir, '10_query_studio_dark_current.png'), fullPage: false })

    // Switch theme to Light Mode
    const themeBtn = page.locator('button[aria-label="Toggle visual theme"]')
    await themeBtn.click()
    await page.waitForTimeout(500)

    // Capture Query Studio Light
    await page.screenshot({ path: path.join(targetDir, '11_query_studio_light_current.png'), fullPage: false })

    console.log('Query studio captures complete!')
  } finally {
    await browser.close()
    await previewServer.close()
    process.exit(0)
  }
}

run()
