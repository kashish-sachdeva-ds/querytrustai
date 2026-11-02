import { chromium } from 'playwright'
import { preview } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(__dirname, '..')
const targetDir = 'C:\\Users\\Lenovo\\.gemini\\antigravity\\brain\\b9989ae8-555f-4f2f-901b-33912bdff412\\gold_standard_audit'

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true })
}

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

    // Navigate to Query Studio
    const studioNav = page.locator('button:has-text("Query Studio"), a:has-text("Query Studio")').first()
    await studioNav.click()
    await page.waitForTimeout(600)

    // Fill query in prompt input matching user screenshot prompt
    console.log('Filling prompt: Retrieve records from enterprise table access_requests')
    const input = page.locator('input.studio-prompt-input')
    await input.fill("Retrieve records from enterprise table 'access_requests'")
    await page.waitForTimeout(300)

    // Submit
    const askBtn = page.locator('button.studio-submit-btn')
    await askBtn.click()
    await page.waitForTimeout(1600)

    // Capture overall Query Studio with active query results
    console.log('Capturing 01_gold_standard_query_results_dark.png...')
    await page.screenshot({ path: path.join(targetDir, '01_gold_standard_query_results_dark.png'), fullPage: false })

    // Scroll canvas down slightly to verify sticky compact prompt card
    console.log('Scrolling canvas down to verify sticky prompt card...')
    await page.evaluate(() => {
      const canvas = document.querySelector('.ask-studio-canvas')
      if (canvas) canvas.scrollTop = 120
    })
    await page.waitForTimeout(400)
    await page.screenshot({ path: path.join(targetDir, '02_gold_standard_sticky_prompt_scrolled.png'), fullPage: false })

    // Expand SQL
    const viewSqlBtn = page.locator('button:has-text("View SQL")')
    if (await viewSqlBtn.count() > 0) {
      console.log('Expanding SQL disclosure...')
      await viewSqlBtn.click()
      await page.waitForTimeout(400)
      await page.screenshot({ path: path.join(targetDir, '03_gold_standard_sql_expanded_dark.png'), fullPage: false })
    }

    console.log('Audit screenshots saved successfully!')
  } catch (err) {
    console.error('Audit run error:', err)
  } finally {
    await browser.close()
    await previewServer.close()
    process.exit(0)
  }
}

run()

