import { chromium } from 'playwright'
import { preview } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(__dirname, '..')
const targetDir = 'C:\\Users\\Lenovo\\.gemini\\antigravity\\brain\\b9989ae8-555f-4f2f-901b-33912bdff412\\awwwards_audit'

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
    await page.waitForTimeout(1000)

    // 1. Full page light
    console.log('Capturing full page light...')
    await page.screenshot({
      path: path.join(targetDir, 'landing_fullpage_light.png'),
      fullPage: true,
    })

    // 2. Hero + top capsule + trust strip
    console.log('Capturing Hero...')
    await page.screenshot({
      path: path.join(targetDir, '1_hero_nominee.png'),
      fullPage: false,
    })

    // 3. Compiler Lab Safe
    console.log('Capturing Compiler Lab Safe...')
    const compilerLab = page.locator('#compiler-lab')
    await compilerLab.scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)
    await page.screenshot({
      path: path.join(targetDir, '2_compiler_lab_safe.png'),
      fullPage: false,
    })

    // 3b. Compiler Lab Attack (click Malicious DROP TABLE)
    console.log('Clicking Malicious DROP TABLE scenario...')
    const dropBtn = page.locator('button:has-text("Malicious DROP TABLE")')
    if (await dropBtn.count() > 0) {
      await dropBtn.click()
      await page.waitForTimeout(500)
      await page.screenshot({
        path: path.join(targetDir, '2b_compiler_lab_attack.png'),
        fullPage: false,
      })
    }

    // 4. Capabilities Section - Studio Tab
    console.log('Capturing Capabilities - Studio Tab...')
    const capabilities = page.locator('#platform-showcase')
    await capabilities.scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)
    await page.screenshot({
      path: path.join(targetDir, '3a_capabilities_studio.png'),
      fullPage: false,
    })

    // Click View SQL in Studio
    const viewSqlBtn = page.locator('button:has-text("View SQL")')
    if (await viewSqlBtn.count() > 0) {
      await viewSqlBtn.click()
      await page.waitForTimeout(400)
      await page.screenshot({
        path: path.join(targetDir, '3a2_capabilities_sql_expanded.png'),
        fullPage: false,
      })
    }

    // 4b. Topology Tab
    console.log('Clicking Fleet Overview & Telemetry tab...')
    const topologyTab = page.locator('button:has-text("Fleet Overview & Telemetry")')
    if (await topologyTab.count() > 0) {
      await topologyTab.click()
      await page.waitForTimeout(500)
      await page.screenshot({
        path: path.join(targetDir, '3b_capabilities_topology.png'),
        fullPage: false,
      })
    }

    // 4c. Kernel Tab
    console.log('Clicking Dual-Role PostgreSQL Kernel tab...')
    const kernelTab = page.locator('button:has-text("Dual-Role PostgreSQL Kernel")')
    if (await kernelTab.count() > 0) {
      await kernelTab.click()
      await page.waitForTimeout(500)
      await page.screenshot({
        path: path.join(targetDir, '3c_capabilities_kernel.png'),
        fullPage: false,
      })
    }

    // 5. Architectural Monoliths
    console.log('Capturing Architectural Monoliths...')
    const monoliths = page.locator('#three-invariants')
    await monoliths.scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)
    await page.screenshot({
      path: path.join(targetDir, '4_architectural_monoliths.png'),
      fullPage: false,
    })

    // 6. Threat Defense Matrix
    console.log('Capturing Threat Defense Matrix...')
    const threatMatrix = page.locator('#attack-matrix')
    await threatMatrix.scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)
    await page.screenshot({
      path: path.join(targetDir, '5_threat_matrix.png'),
      fullPage: false,
    })

    // Click another threat in matrix
    const threat2 = page.locator('button:has-text("System Catalog & Password Exfiltration")')
    if (await threat2.count() > 0) {
      await threat2.click()
      await page.waitForTimeout(500)
      await page.screenshot({
        path: path.join(targetDir, '5b_threat_matrix_catalog_exfil.png'),
        fullPage: false,
      })
    }

    // 7. Benchmarks & Editorial Footer
    console.log('Capturing Benchmarks & Editorial Footer...')
    const footer = page.locator('footer')
    await footer.scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)
    await page.screenshot({
      path: path.join(targetDir, '6_editorial_footer.png'),
      fullPage: false,
    })

    // 8. Toggle Dark Mode & Capture Full Page Dark
    console.log('Toggling Dark Mode...')
    const themeBtn = page.locator('header button[title*="Dark"]').first()
    if (await themeBtn.count() > 0) {
      await themeBtn.click()
      await page.waitForTimeout(600)
      await page.screenshot({
        path: path.join(targetDir, 'landing_fullpage_dark.png'),
        fullPage: true,
      })
      console.log('Saved landing_fullpage_dark.png')
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

