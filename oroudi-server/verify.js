const { chromium } = require('playwright');
async function run() {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto('https://abukootsh.github.io/oroudi/', { waitUntil: 'networkidle', timeout: 40000 });
  await page.waitForTimeout(4000);
  console.log('document.dir:', await page.evaluate(() => document.documentElement.dir));

  // نبحث سكر
  const inp = await page.$('input');
  await inp.click();
  await inp.type('سكر', { delay: 100 });
  await page.waitForTimeout(500);
  await inp.press('Enter');
  await page.waitForTimeout(6000);

  const check = await page.evaluate(() => {
    const t = document.body.innerText;
    return { hasTaheen: t.includes('طحين'), hasDaqeeq: t.includes('دقيق'), hasSukkar: t.includes('سكر') };
  });
  console.log('LIVE سكر check:', JSON.stringify(check));
  await page.screenshot({ path: '/tmp/live_verify.png' });
  await browser.close();
}
run().catch((e) => { console.error(e); process.exit(1); });
