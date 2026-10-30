import { chromium } from 'playwright'
import { preview } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(__dirname, '..')
const auditDir = 'C:\\Users\\Lenovo\\.gemini\\antigravity\\brain\\d998ba12-922c-4430-8e40-449d2097c160\\audit_screens'

if (!fs.existsSync(auditDir)) {
  fs.mkdirSync(auditDir, { recursive: true })
}

async function runAudit() {
  console.log('Starting Vite preview server on port 4174...')
  const previewServer = await preview({
    root: frontendRoot,
    preview: {
      port: 4174,
      host: '127.0.0.1',
    },
  })

  console.log('Vite preview listening at http://127.0.0.1:4174')

  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
  const browser = await chromium.launch({ executablePath: chromePath, headless: true })

  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    })

    const page = await context.newPage()

    // 1. Capture Landing (Dark & Light)
    console.log('Capturing Landing Page...')
    await page.goto('http://127.0.0.1:4174/')
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(auditDir, '1_landing_dark.png') })

    // 2. Capture Login Page
    console.log('Capturing Login Page...')
    await page.goto('http://127.0.0.1:4174/?tab=login')
    await page.waitForTimeout(1000)
    await page.screenshot({ path: path.join(auditDir, '2_login_dark.png') })

    // 3. Authenticate as Admin via 1-click Evaluator
    console.log('Logging in as Admin...')
    const adminBtn = page.locator('button:has-text("Admin")').first()
    await adminBtn.click()
    await page.waitForTimeout(1500)

    // Set theme to dark in the app
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'dark')
      document.documentElement.classList.add('dark')
      localStorage.setItem('qt-theme-preference', 'dark')
      localStorage.setItem('qt-theme', 'dark')
    })
    await page.waitForTimeout(500)

    const tabsToAudit = [
      { tab: 'overview', name: '3_overview_dark' },
      { tab: 'ask-data', name: '4_query_studio_dark' },
      { tab: 'devices', name: '5_catalog_dark' },
      { tab: 'evaluations', name: '6_safety_proof_dark' },
      { tab: 'data-quality', name: '7_data_health_dark' },
      { tab: 'anomalies', name: '8_anomalies_dark' },
      { tab: 'data-sources', name: '9_sources_dark' },
      { tab: 'admin', name: '10_people_admin_dark' },
    ]

    for (const item of tabsToAudit) {
      console.log(`Capturing ${item.name}...`)
      await page.goto(`http://127.0.0.1:4174/?tab=${item.tab}`)
      await page.waitForTimeout(1200)
      await page.screenshot({ path: path.join(auditDir, `${item.name}.png`) })
    }

    // Now switch to Light mode and capture key views
    console.log('Switching to Light Mode...')
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-theme', 'light')
      document.documentElement.classList.remove('dark')
      localStorage.setItem('qt-theme-preference', 'light')
      localStorage.setItem('qt-theme', 'light')
    })
    await page.waitForTimeout(500)

    const lightTabs = [
      { tab: 'overview', name: '3_overview_light' },
      { tab: 'ask-data', name: '4_query_studio_light' },
      { tab: 'devices', name: '5_catalog_light' },
      { tab: 'evaluations', name: '6_safety_proof_light' },
    ]

    for (const item of lightTabs) {
      console.log(`Capturing ${item.name}...`)
      await page.goto(`http://127.0.0.1:4174/?tab=${item.tab}`)
      await page.waitForTimeout(1200)
      await page.screenshot({ path: path.join(auditDir, `${item.name}.png`) })
    }

    console.log('All audit screenshots captured successfully!')
  } catch (err) {
    console.error('Audit failed:', err)
  } finally {
    await browser.close()
    previewServer.httpServer.close()
    console.log('Server closed.')
  }
}

runAudit()
