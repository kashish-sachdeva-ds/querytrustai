import { chromium } from 'playwright'
import { preview } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(__dirname, '..')
const targetDir = 'C:\\Users\\Lenovo\\.gemini\\antigravity\\brain\\b9989ae8-555f-4f2f-901b-33912bdff412\\navbar_icon_audit'

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
    console.log('Navigating to landing page...')
    await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)

    // 1. Navbar Light close-up
    console.log('Capturing Navbar Light...')
    const headerEl = page.locator('header')
    await headerEl.screenshot({
      path: path.join(targetDir, 'navbar_light.png'),
    })

    // 2. Hero Light with Navbar
    console.log('Capturing Hero Light...')
    await page.screenshot({
      path: path.join(targetDir, 'hero_light.png'),
      fullPage: false,
    })

    // 3. Toggle Dark Mode
    console.log('Toggling Dark Mode...')
    const themeBtn = page.locator('header button[title*="Dark"]').first()
    if (await themeBtn.count() > 0) {
      await themeBtn.click()
      await page.waitForTimeout(500)

      // 4. Navbar Dark close-up
      console.log('Capturing Navbar Dark...')
      await headerEl.screenshot({
        path: path.join(targetDir, 'navbar_dark.png'),
      })

      // 5. Hero Dark with Navbar
      console.log('Capturing Hero Dark...')
      await page.screenshot({
        path: path.join(targetDir, 'hero_dark.png'),
        fullPage: false,
      })
    }

    console.log('All screenshots captured successfully!')
  } catch (err) {
    console.error('Error during capture:', err)
  } finally {
    await browser.close()
    await previewServer.close()
    process.exit(0)
  }
}

run()

