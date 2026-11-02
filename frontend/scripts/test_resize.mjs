import { chromium } from 'playwright'
import { preview } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(__dirname, '..')
const targetDir = 'C:\\Users\\Lenovo\\.gemini\\antigravity\\brain\\b9989ae8-555f-4f2f-901b-33912bdff412\\resize_audit'

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

  const page = await browser.newPage()

  try {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)

    const launchBtn = page.locator('button:has-text("Launch Studio as Admin")')
    await launchBtn.click()
    await page.waitForTimeout(800)

    // Switch to dark mode
    const themeBtn = page.locator('button[aria-label="Toggle visual theme"]')
    await themeBtn.click()
    await page.waitForTimeout(400)

    // Test different viewports
    const widths = [1200, 1024, 800, 768, 600, 480]
    for (const w of widths) {
      console.log(`Setting viewport to ${w}x900...`)
      await page.setViewportSize({ width: w, height: 900 })
      await page.waitForTimeout(500)
      await page.screenshot({ path: path.join(targetDir, `viewport_${w}.png`), fullPage: false })
    }

    // Now test clicking sidebar collapse
    console.log('Testing sidebar collapse button...')
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.waitForTimeout(400)
    const collapseBtn = page.locator('button[aria-label="Toggle sidebar collapse"]')
    if (await collapseBtn.count() > 0) {
      await collapseBtn.click()
      await page.waitForTimeout(400)
      await page.screenshot({ path: path.join(targetDir, 'sidebar_collapsed.png'), fullPage: false })
    }

    console.log('Resize test complete!')
  } catch (err) {
    console.error('Error:', err)
  } finally {
    await browser.close()
    await previewServer.close()
    process.exit(0)
  }
}

run()

