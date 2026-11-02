import { chromium } from 'playwright'
import { preview } from 'vite'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const frontendRoot = path.resolve(__dirname, '..')
const targetDir = 'C:\\Users\\Lenovo\\.gemini\\antigravity\\brain\\1a7eeb4a-320e-4c42-b13a-113852ae1e49\\awwwards_landing_audit'

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true })
}

async function run() {
  const previewServer = await preview({
    root: frontendRoot,
    preview: { port: 4175, host: '127.0.0.1' },
  })

  let browser
  try {
    browser = await chromium.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true })
  } catch {
    browser = await chromium.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true })
  }

  const context = await browser.newContext({ viewport: { width: 1440, height: 960 } })
  const page = await context.newPage()

  try {
    console.log('Navigating to http://127.0.0.1:4175/ ...')
    await page.goto('http://127.0.0.1:4175/', { waitUntil: 'networkidle' })
    await page.waitForTimeout(1000)

    // 1. Capture Hero in Light Mode
    await page.screenshot({ path: path.join(targetDir, '01_hero_light_mode.png') })
    console.log('Captured 01_hero_light_mode.png')

    // Switch to Dark Mode via Theme Toggle in Header
    const themeBtn = page.locator('button[title*="Dark"], button[title*="Light"]').first()
    if (await themeBtn.isVisible()) {
      await themeBtn.click()
      await page.waitForTimeout(600)
    }

    // 2. Capture Hero in Dark Mode (Monumental headline, liquid-metal shimmer, HUD counters, 3D Centerpiece)
    await page.screenshot({ path: path.join(targetDir, '02_hero_dark_mode.png') })
    console.log('Captured 02_hero_dark_mode.png')

    // 3. Scroll to AST Compiler & Interception Lab
    const compilerLab = page.locator('#compiler-lab')
    await compilerLab.scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(targetDir, '03_ast_compiler_lab_dark.png') })
    console.log('Captured 03_ast_compiler_lab_dark.png')

    // Click on Malicious DROP TABLE scenario
    const dropTableBtn = page.locator('button:has-text("Malicious DROP TABLE")').first()
    if (await dropTableBtn.isVisible()) {
      await dropTableBtn.click()
      await page.waitForTimeout(600)
      await page.screenshot({ path: path.join(targetDir, '04_ast_compiler_drop_table_deflected.png') })
      console.log('Captured 04_ast_compiler_drop_table_deflected.png')
    }

    // 4. Scroll to Section 02: Platform Capabilities Showcase
    const platformShowcase = page.locator('#platform-showcase')
    await platformShowcase.scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(targetDir, '05_platform_capabilities_studio_tab.png') })
    console.log('Captured 05_platform_capabilities_studio_tab.png')

    // Switch to Fleet Overview & Telemetry Tab (SVG World Map / Datacenter Topology Graph)
    const topologyTabBtn = page.locator('button:has-text("Fleet Overview & Telemetry")').first()
    if (await topologyTabBtn.isVisible()) {
      await topologyTabBtn.click()
      await page.waitForTimeout(600)
      await page.screenshot({ path: path.join(targetDir, '06_platform_capabilities_topology_tab.png') })
      console.log('Captured 06_platform_capabilities_topology_tab.png')
    }

    // Switch to Dual-Role PostgreSQL Kernel Tab
    const kernelTabBtn = page.locator('button:has-text("Dual-Role PostgreSQL Kernel")').first()
    if (await kernelTabBtn.isVisible()) {
      await kernelTabBtn.click()
      await page.waitForTimeout(600)
      await page.screenshot({ path: path.join(targetDir, '07_platform_capabilities_kernel_tab.png') })
      console.log('Captured 07_platform_capabilities_kernel_tab.png')
    }

    // 5. Scroll to Section 03: Core Architectural Invariants (3 Bento Cards)
    const invariantsSec = page.locator('#three-invariants')
    await invariantsSec.scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(targetDir, '08_architectural_monoliths_3_bentos.png') })
    console.log('Captured 08_architectural_monoliths_3_bentos.png')

    // 6. Scroll to Section 04: Live Attack & Defense Proof Matrix
    const attackSec = page.locator('#attack-matrix')
    await attackSec.scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(targetDir, '09_attack_defense_matrix_radar.png') })
    console.log('Captured 09_attack_defense_matrix_radar.png')

    // 7. Scroll to Section 05: Benchmarks & Section 06: Cyber Footer (3D Portal CTA)
    const metricsSec = page.locator('#metrics')
    await metricsSec.scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(targetDir, '10_metrics_strip_oscilloscope.png') })
    console.log('Captured 10_metrics_strip_oscilloscope.png')

    // Scroll to bottom footer
    const footer = page.locator('footer')
    await footer.scrollIntoViewIfNeeded()
    await page.waitForTimeout(500)
    await page.screenshot({ path: path.join(targetDir, '11_cyber_footer_portal_cta.png') })
    console.log('Captured 11_cyber_footer_portal_cta.png')

    console.log('ALL 11 SCREENSHOTS CAPTURED SUCCESSFULLY!')
  } finally {
    await browser.close()
    await new Promise((res) => previewServer.httpServer.close(res))
  }
}

run().catch((err) => {
  console.error('Playwright Error:', err)
  process.exit(1)
})
