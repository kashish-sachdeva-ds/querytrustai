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

  page.on('console', msg => console.log('PAGE LOG:', msg.text()))
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message))

  try {
    console.log('Navigating to http://127.0.0.1:4173/ ...')
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)

    console.log('Clicking "Launch Studio as Admin"...')
    const launchBtn = page.locator('button:has-text("Launch Studio as Admin")')
    console.log('Launch button count:', await launchBtn.count())
    await launchBtn.click()

    await page.waitForTimeout(1000)
    console.log('Current URL:', page.url())

    // Take screenshot of whatever is on screen now
    await page.screenshot({ path: path.join(targetDir, 'debug_after_launch_click.png') })

    // Check if header is present
    const topNavbar = page.locator('header.app-top-navbar')
    console.log('Top navbar count:', await topNavbar.count())

    if (await topNavbar.count() > 0) {
      await topNavbar.screenshot({ path: path.join(targetDir, '03_workbench_navbar_dark.png') })
      console.log('Captured top navbar!')

      // Profile dropdown
      const profileBtn = page.locator('button[aria-label="User account menu"]')
      console.log('Profile button count:', await profileBtn.count())
      await profileBtn.click()
      await page.waitForTimeout(400)
      await page.screenshot({ path: path.join(targetDir, '04_profile_dropdown_dark.png') })

      // Accordion
      const permBtn = page.locator('button:has-text("What can an Admin do?")')
      if (await permBtn.count() > 0) {
        await permBtn.click()
        await page.waitForTimeout(300)
        await page.screenshot({ path: path.join(targetDir, '04b_profile_accordion_expanded.png') })
      }

      await profileBtn.click()
      await page.waitForTimeout(200)

      // Role switcher
      const roleBtn = page.locator('button[aria-label*="Click to switch role"]')
      await roleBtn.click()
      await page.waitForTimeout(400)
      await page.screenshot({ path: path.join(targetDir, '05_role_switcher_dark.png') })
      await roleBtn.click()
      await page.waitForTimeout(200)

      // Switch to Light Mode
      const themeBtn = page.locator('button[aria-label="Toggle visual theme"]')
      if (await themeBtn.count() > 0) {
        await themeBtn.click()
        await page.waitForTimeout(500)
        await page.screenshot({ path: path.join(targetDir, '06_workbench_full_light.png') })
        await topNavbar.screenshot({ path: path.join(targetDir, '07_workbench_navbar_light.png') })

        // Open profile in light mode
        await profileBtn.click()
        await page.waitForTimeout(400)
        await page.screenshot({ path: path.join(targetDir, '08_profile_dropdown_light.png') })
      }
    }
  } finally {
    await browser.close()
    await previewServer.close()
    process.exit(0)
  }
}

run()
