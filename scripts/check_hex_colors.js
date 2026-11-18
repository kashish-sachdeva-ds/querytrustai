/**
 * CI/Lint script to monitor and prevent regressions in hardcoded hex color literals.
 *
 * Scans `frontend/src` (excluding legitimate token definition files `design-system.css` and `index.css`).
 * Fails if total hardcoded hex color count in components exceeds the baseline.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', 'frontend', 'src');
const EXCLUDED_FILES = new Set(['design-system.css', 'index.css']);
const HEX_REGEX = /#(?:[0-9a-fA-F]{3,4}){1,2}\b/g;

// Phase 2 ratcheted budget: exactly 979 hardcoded hex colors in components (saved 78 in OverviewView)
const BASELINE_BUDGET = 979;

function walkDir(dir, fileList = []) {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      walkDir(fullPath, fileList);
    } else if (stat.isFile()) {
      const ext = path.extname(item).toLowerCase();
      if (['.ts', '.tsx', '.css', '.js', '.jsx'].includes(ext)) {
        fileList.push(fullPath);
      }
    }
  }
  return fileList;
}

function checkHexColors() {
  const files = walkDir(ROOT_DIR);
  let totalComponentHex = 0;
  let totalTokenHex = 0;
  const breakdown = [];

  for (const file of files) {
    const baseName = path.basename(file);
    const content = fs.readFileSync(file, 'utf-8');
    const matches = content.match(HEX_REGEX) || [];
    const count = matches.length;

    if (EXCLUDED_FILES.has(baseName)) {
      totalTokenHex += count;
    } else {
      totalComponentHex += count;
      if (count > 0) {
        breakdown.push({
          file: path.relative(path.resolve(__dirname, '..'), file).replace(/\\/g, '/'),
          count
        });
      }
    }
  }

  breakdown.sort((a, b) => b.count - a.count);

  console.log('====================================================');
  console.log(' QueryTrust AI — Hex Literal CI Verification');
  console.log('====================================================');
  console.log(`Token Files Hex Count (Allowed token definitions) : ${totalTokenHex}`);
  console.log(`Component Hex Count   (Violations to eliminate)   : ${totalComponentHex}`);
  console.log(`Baseline Ceiling Budget                           : ${BASELINE_BUDGET}`);
  console.log('----------------------------------------------------');

  if (totalComponentHex > BASELINE_BUDGET) {
    console.error(
      `[FAIL] Component hex literal count (${totalComponentHex}) exceeds baseline budget (${BASELINE_BUDGET}) by ${totalComponentHex - BASELINE_BUDGET}!`
    );
    process.exit(1);
  }

  console.log(
    `[PASS] Component hex count (${totalComponentHex}) is within budget (saved ${BASELINE_BUDGET - totalComponentHex} hex literals).`
  );
  process.exit(0);
}

checkHexColors();
