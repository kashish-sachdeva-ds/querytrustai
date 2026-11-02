import { chromium } from 'playwright'
import { preview } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(__dirname, '..')
const targetDir = 'C:\\Users\\Lenovo\\.gemini\\antigravity\\brain\\b9989ae8-555f-4f2f-901b-33912bdff412\\drawer_audit'

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

    // Ensure Dark Mode
    const themeBtn = page.locator('button[aria-label="Toggle visual theme"]')
    await themeBtn.click()
    await page.waitForTimeout(400)

    // Click on the first device row to open drawer
    console.log('Clicking on first device row...')
    const firstRow = page.locator('.devices-table-row').first()
    await firstRow.click()
    await page.waitForTimeout(800)

    // Capture drawer open in Dark Mode
    console.log('Capturing new drawer in Dark Mode...')
    await page.screenshot({ path: path.join(targetDir, '10_drawer_dark_new.png'), fullPage: false })

    // Scroll inside drawer body
    console.log('Scrolling inside drawer body...')
    const drawerBody = page.locator('.asset-drawer-body')
    await drawerBody.evaluate((el) => { el.scrollTop = 300 })
    await page.waitForTimeout(300)
    await page.screenshot({ path: path.join(targetDir, '11_drawer_dark_scrolled.png'), fullPage: false })

    // Close drawer
    console.log('Closing drawer...')
    const closeBtn = page.locator('button[aria-label="Close device inspection drawer"]')
    await closeBtn.click()
    await page.waitForTimeout(400)

    // Switch to Light Mode
    console.log('Switching to Light Mode...')
    await themeBtn.click()
    await page.waitForTimeout(400)

    // Click first row again in Light Mode
    console.log('Opening drawer in Light Mode...')
    await firstRow.click()
    await page.waitForTimeout(800)
    await page.screenshot({ path: path.join(targetDir, '12_drawer_light_new.png'), fullPage: false })

    console.log('All new drawer screenshots captured successfully!')
  } catch (err) {
    console.error('Error during capture:', err)
  } finally {
    await browser.close()
    await previewServer.close()
    process.exit(0)
  }
}

run()

