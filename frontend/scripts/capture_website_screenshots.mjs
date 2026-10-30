import { chromium } from 'playwright'
import { preview } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(__dirname, '..')
const screenshotDir = 'C:\\Users\\Lenovo\\.gemini\\antigravity\\brain\\d998ba12-922c-4430-8e40-449d2097c160\\screenshots'

async function run() {
  console.log('Starting Vite preview server on port 4173...')
  const previewServer = await preview({
    root: frontendRoot,
    preview: {
      port: 4173,
      host: '127.0.0.1',
    },
  })

  console.log('Vite preview server listening at http://127.0.0.1:4173')

  let browser
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'

  try {
    browser = await chromium.launch({ executablePath: chromePath, headless: true })
  } catch (e1) {
    try {
      browser = await chromium.launch({ executablePath: edgePath, headless: true })
    } catch (e2) {
      console.error('Failed to launch browser with Chrome and Edge:', e1, e2)
      process.exit(1)
    }
  }

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  })

  const page = await context.newPage()

  try {
    // 1. Landing Page
    console.log('Capturing Landing Page...')
    await page.goto('http://127.0.0.1:4173/')
    await page.waitForTimeout(1000)

    // Capture Landing Hero
    await page.screenshot({
      path: path.join(screenshotDir, '1_landing_hero.png'),
      fullPage: false,
    })
    console.log('Saved 1_landing_hero.png')

    // Switch preview tab to "Blocked SQL Injection"
    const blockedTabBtn = page.locator('button:has-text("Blocked SQL Injection")')
    if (await blockedTabBtn.count() > 0) {
      await blockedTabBtn.click()
      await page.waitForTimeout(500)
      await page.screenshot({
        path: path.join(screenshotDir, '2_landing_blocked_injection.png'),
        fullPage: false,
      })
      console.log('Saved 2_landing_blocked_injection.png')
    }

    // Scroll to 3-pillar Bento Grid
    const bentoSection = page.locator('#pillars')
    if (await bentoSection.count() > 0) {
      await bentoSection.scrollIntoViewIfNeeded()
      await page.waitForTimeout(500)
      await page.screenshot({
        path: path.join(screenshotDir, '3_landing_bento_grid.png'),
        fullPage: false,
      })
      console.log('Saved 3_landing_bento_grid.png')
    }

    // 2. Sign-In Page
    console.log('Navigating to Sign-In Page...')
    const signInBtn = page.locator('button:has-text("Sign In")').first()
    if (await signInBtn.count() > 0) {
      await signInBtn.click()
    } else {
      await page.goto('http://127.0.0.1:4173/?tab=login')
    }
    await page.waitForTimeout(1000)
    await page.screenshot({
      path: path.join(screenshotDir, '4_login_page_centered.png'),
      fullPage: false,
    })
    console.log('Saved 4_login_page_centered.png')

    // 3. Enter App as Analyst / Admin
    console.log('Entering Workspace via 1-click Evaluator...')
    const analystBtn = page.locator('button:has-text("Analyst")').first()
    if (await analystBtn.count() > 0) {
      await analystBtn.click()
    } else {
      await page.goto('http://127.0.0.1:4173/?tab=overview')
    }
    await page.waitForTimeout(1500)

    // Capture Overview with New Linear Minimalist Sidebar
    await page.screenshot({
      path: path.join(screenshotDir, '5_workspace_overview.png'),
      fullPage: false,
    })
    console.log('Saved 5_workspace_overview.png')

    // Test Sidebar Collapse Toggle
    const collapseBtn = page.locator('button[aria-label="Toggle sidebar collapse"]')
    if (await collapseBtn.count() > 0) {
      await collapseBtn.click()
      await page.waitForTimeout(300)
      await page.screenshot({
        path: path.join(screenshotDir, '7_workspace_collapsed_sidebar.png'),
        fullPage: false,
      })
      console.log('Saved 7_workspace_collapsed_sidebar.png')
      // Expand back
      await collapseBtn.click()
      await page.waitForTimeout(300)
    }

    // 4. Navigate to Ask Data
    console.log('Navigating to Ask Data studio...')
    await page.goto('http://127.0.0.1:4173/?tab=ask-data')
    await page.waitForTimeout(1500)
    await page.screenshot({
      path: path.join(screenshotDir, '6_workspace_ask_data.png'),
      fullPage: false,
    })
    console.log('Saved 6_workspace_ask_data.png')

    console.log('All screenshots captured successfully!')
  } catch (err) {
    console.error('Error during capture:', err)
  } finally {
    await browser.close()
    previewServer.httpServer.close()
    console.log('Server closed.')
    process.exit(0)
  }
}

run()
