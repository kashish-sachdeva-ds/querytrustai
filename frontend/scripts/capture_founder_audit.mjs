import { chromium } from 'playwright'
import { preview } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(__dirname, '..')
const targetDir = 'C:\\Users\\Lenovo\\.gemini\\antigravity\\brain\\b9989ae8-555f-4f2f-901b-33912bdff412\\founder_audit'

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true })
}

async function run() {
  console.log('Starting Vite preview...')
  const previewServer = await preview({
    root: frontendRoot,
    preview: {
      port: 4173,
      host: '127.0.0.1',
    },
  })

  let browser
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

  try {
    browser = await chromium.launch({ executablePath: chromePath, headless: true })
  } catch {
    browser = await chromium.launch({ executablePath: edgePath, headless: true })
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  })

  const page = await context.newPage()

  try {
    // Inject localStorage so it starts directly logged in as Admin in Dark mode
    await page.addInitScript(() => {
      window.localStorage.setItem('qt_offline_demo', 'true')
      window.localStorage.setItem('qt_cached_user', JSON.stringify({
        id: 1,
        email: 'admin@querytrust.local',
        role: 'admin',
        display_name: 'System Administrator',
        workspace_name: 'Default Workspace',
      }))
      window.localStorage.setItem('theme', 'dark')
    })

    console.log('Navigating directly into Workbench in Dark Mode...')
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    // Capture Full Workbench in Dark Mode
    console.log('Capturing Workbench Full (Dark)...')
    await page.screenshot({ path: path.join(targetDir, '02_workbench_dark_full.png'), fullPage: false })

    // Capture Navbar in Dark Mode
    const headerEl = page.locator('header.app-top-navbar')
    await headerEl.screenshot({ path: path.join(targetDir, '03_workbench_navbar_dark.png') })

    // Click user profile to open dropdown
    console.log('Opening Profile Dropdown (Dark)...')
    const profileBtn = page.locator('button[aria-label="User account menu"]')
    await profileBtn.click()
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(targetDir, '04_profile_dropdown_dark.png'), fullPage: false })

    // Click to toggle permissions accordion
    console.log('Toggling permissions accordion in profile...')
    const permBtn = page.locator('button:has-text("What can an Admin do?")')
    if (await permBtn.count() > 0) {
      await permBtn.click()
      await page.waitForTimeout(400)
      await page.screenshot({ path: path.join(targetDir, '04b_profile_accordion_expanded.png'), fullPage: false })
    }

    // Close profile dropdown
    await profileBtn.click()
    await page.waitForTimeout(300)

    // Open Role switcher dropdown
    console.log('Opening Role Switcher (Dark)...')
    const roleBtn = page.locator('button[aria-label*="Click to switch role"]')
    await roleBtn.click()
    await page.waitForTimeout(400)
    await page.screenshot({ path: path.join(targetDir, '05_role_switcher_dark.png'), fullPage: false })
    await roleBtn.click()
    await page.waitForTimeout(300)

    // Navigate to Query Studio tab
    console.log('Navigating to Query Studio...')
    const queryStudioNav = page.locator('button:has-text("Query Studio"), a:has-text("Query Studio")').first()
    if (await queryStudioNav.count() > 0) {
      await queryStudioNav.click()
      await page.waitForTimeout(800)
      await page.screenshot({ path: path.join(targetDir, '06_query_studio_dark.png'), fullPage: false })
    }

    // Switch to Light Mode
    console.log('Switching to Light Mode...')
    const themeBtn = page.locator('button[aria-label="Toggle visual theme"]')
    await themeBtn.click()
    await page.waitForTimeout(600)

    // Capture Query Studio Light
    await page.screenshot({ path: path.join(targetDir, '07_query_studio_light.png'), fullPage: false })
    await headerEl.screenshot({ path: path.join(targetDir, '08_workbench_navbar_light.png') })

    // Open Profile Dropdown in Light Mode
    await profileBtn.click()
    await page.waitForTimeout(400)
    await page.screenshot({ path: path.join(targetDir, '09_profile_dropdown_light.png'), fullPage: false })

    console.log('SUCCESS! All founder screenshots captured!')
  } catch (err) {
    console.error('Error during capture:', err)
  } finally {
    await browser.close()
    await previewServer.close()
    process.exit(0)
  }
}

run()
