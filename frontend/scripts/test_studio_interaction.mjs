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
    await page.waitForTimeout(600)

    // Fill query in the search input
    console.log('Typing query into prompt input...')
    const input = page.locator('input.studio-prompt-input')
    await input.fill('Show all devices with warranty expiring within 60 days')
    await page.waitForTimeout(300)

    // Now click Ask Fleet AI
    console.log('Clicking Ask Fleet AI...')
    const askBtn = page.locator('button.studio-submit-btn')
    await askBtn.click()
    await page.waitForTimeout(1500)

    // Capture Query Studio with active query results
    console.log('Capturing results...')
    await page.screenshot({ path: path.join(targetDir, '12_query_studio_active_results_light.png'), fullPage: false })

    // Open "View SQL"
    const viewSqlBtn = page.locator('button:has-text("View SQL")')
    if (await viewSqlBtn.count() > 0) {
      console.log('Expanding SQL drawer...')
      await viewSqlBtn.click()
      await page.waitForTimeout(500)
      await page.screenshot({ path: path.join(targetDir, '13_query_studio_sql_expanded_light.png'), fullPage: false })
    }

    // Switch to Dark mode
    console.log('Switching to dark mode...')
    const themeBtn = page.locator('button[aria-label="Toggle visual theme"]')
    await themeBtn.click()
    await page.waitForTimeout(600)

    // Capture Dark mode active query results
    await page.screenshot({ path: path.join(targetDir, '14_query_studio_active_results_dark.png'), fullPage: false })

    console.log('All studio interaction captures done!')
  } catch (err) {
    console.error('CAUGHT ERROR:', err)
  } finally {
    await browser.close()
    await previewServer.close()
    process.exit(0)
  }
}

run()
