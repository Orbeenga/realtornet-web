const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const outDir = path.resolve(__dirname, '..', 'tmp-pw-screens');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const url = 'http://localhost:3000';
  console.log('navigating to', url);
  await page.goto(url, { waitUntil: 'networkidle' });

  // Desktop: open property type via desktop trigger
  console.log('Desktop: waiting for desktop trigger');
  await page.waitForSelector('#desktop-property-type', { timeout: 5000 });
  await page.click('#desktop-property-type');
  await page.waitForSelector('[data-slot="popover-content"]', { timeout: 3000 });
  const desktopPopovers = await page.$$('[data-slot="popover-content"]');
  console.log('desktop popover count =', desktopPopovers.length);
  await page.screenshot({ path: path.join(outDir, 'desktop.png'), fullPage: true });

  // Close popover
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);

  // Mobile viewport: open mobile property type trigger
  await page.setViewportSize({ width: 375, height: 800 });
  console.log('Mobile: waiting for mobile trigger');
  await page.waitForSelector('#mobile-property-type', { timeout: 5000 });
  await page.click('#mobile-property-type');
  await page.waitForSelector('[data-slot="popover-content"]', { timeout: 3000 });
  const mobilePopovers = await page.$$('[data-slot="popover-content"]');
  console.log('mobile popover count =', mobilePopovers.length);
  await page.screenshot({ path: path.join(outDir, 'mobile.png'), fullPage: true });

  // Test committing a selection and checking hidden inputs in hero form
  // For a robust selector, click the second checkbox option inside listbox (skip "All Property Types")
  // First ensure viewport is desktop so the propertyTypeFilter is present as the PopoverTrigger root
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForSelector('#desktop-property-type', { timeout: 5000 });
  await page.click('#desktop-property-type');
  await page.waitForSelector('ul[role="listbox"] li:nth-child(2) input[type="checkbox"]', { timeout: 3000 });
  await page.click('ul[role="listbox"] li:nth-child(2) input[type="checkbox"]');
  // Click OK
  await page.click('button:has-text("OK")');
  await page.waitForTimeout(500);

  // Count hidden inputs
  const hiddenInputs = await page.$$eval('input[type="hidden"][name="property_type_id"]', (els) => els.map(e => e.value));
  console.log('hidden property_type_id inputs =', hiddenInputs.length, hiddenInputs);

  // Save a screenshot after commit
  await page.screenshot({ path: path.join(outDir, 'after-commit.png'), fullPage: true });

  await browser.close();
  console.log('screenshots saved to', outDir);
})();