'use strict';
const fs = require('node:fs');

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

function assertScreenshotProof(bytes, viewport) {
  if (!Buffer.isBuffer(bytes) || bytes.length < 1000 || !bytes.subarray(0,8).equals(PNG_SIGNATURE))
    throw new Error('Screenshot returned no valid PNG evidence');
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  if (!width || !height || viewport && (width < viewport.width || height < viewport.height))
    throw new Error('Screenshot pixel dimensions are smaller than the tested viewport');
}

async function browserFontStatus(page, waitMs) {
  return page.evaluate(async ms => {
    if (!document.fonts) return 'unsupported';
    return Promise.race([
      document.fonts.ready.then(() => 'ready', () => 'rejected'),
      new Promise(resolve => setTimeout(() => resolve('pending'), ms))
    ]);
  }, waitMs);
}

async function captureViaChrome(page, filePath, reason) {
  // Capture actual rendered pixels without Playwright's stalled font Promise.
  // This is NOT a screenshot stub; missing, malformed or incomplete pixels fail.
  const context = page.context();
  const client = await context.newCDPSession(page);
  try {
    const visual = await page.evaluate(() => {
      const body = document.body?.getBoundingClientRect();
      return !!(body && body.width >= 200 && body.height >= 100 &&
        document.visibilityState !== 'hidden');
    });
    if (!visual) throw new Error('Unable to verify a visible browser document for screenshot');
    const {data} = await client.send('Page.captureScreenshot', {
      format: 'png', fromSurface: true, captureBeyondViewport: false
    });
    if (typeof data !== 'string' || !data) throw new Error('Chromium supplied no screenshot data');
    const bytes = Buffer.from(data, 'base64');
    assertScreenshotProof(bytes, page.viewportSize?.());
    fs.writeFileSync(filePath, bytes);
    return {
      check: 'External font readiness incomplete during browser evidence capture',
      issue: 'Rendered viewport captured through Chromium CDP after ' + reason +
        '; font availability remains unverified and is not reported as passing.',
      image: filePath
    };
  } finally {
    await client.detach().catch(() => {});
  }
}

async function captureAuditedScreenshot(page, filePath, {fontWaitMs = 8000} = {}) {
  // Browser fonts may be blocked by third-party DNS/CDN on a CI runner.
  // Never mark a screenshot as passed unless actual PNG pixels are written.
  const status = await browserFontStatus(page, fontWaitMs);
  if (status === 'pending' || status === 'rejected')
    return captureViaChrome(page, filePath, 'font status '+status+' at '+fontWaitMs+' ms');
  let first;
  try {
    await page.screenshot({path:filePath, animations:'disabled', timeout:30000});
    assertScreenshotProof(fs.readFileSync(filePath), page.viewportSize?.());
    return null;
  } catch (error) {
    first = error;
  }
  try {
    await page.screenshot({path:filePath, animations:'allow', timeout:20000});
    assertScreenshotProof(fs.readFileSync(filePath), page.viewportSize?.());
    return null;
  } catch (error) {
    const reason=String(first?.message||'')+'\n'+String(error.message||'');
    if (/waiting for fonts to load/i.test(reason))
      return captureViaChrome(page, filePath, 'both Playwright captures stalled on fonts');
    throw error;
  }
}

module.exports = {captureAuditedScreenshot, assertScreenshotProof};
