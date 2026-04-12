const puppeteer = require('puppeteer');
const { renderSlideHtml } = require('../templates/renderHtml');

let browserPromise = null;

async function launchBrowser() {
  return puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
  });
}

async function getBrowser() {
  if (browserPromise) {
    try {
      const b = await browserPromise;
      if (b && b.connected !== false) return b;
    } catch (_) {
      // swallow — singleton will be reset below
    }
    browserPromise = null;
  }
  browserPromise = launchBrowser().catch((err) => {
    browserPromise = null;
    throw err;
  });
  return browserPromise;
}

async function closeBrowser() {
  if (!browserPromise) return;
  try {
    const b = await browserPromise;
    await b.close();
  } catch (_) {
    // ignore
  }
  browserPromise = null;
}

function isBrowserGoneError(err) {
  const msg = String(err?.message || '');
  return /Target closed|Session closed|Protocol error|Browser closed|disconnected/i.test(msg);
}

async function renderSlideToBuffer(slide, options = {}) {
  const attempt = async () => {
    const browser = await getBrowser();
    const page = await browser.newPage();
    try {
      await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 2 });
      const html = renderSlideHtml(slide, options);
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
      await page.evaluateHandle('document.fonts.ready');
      const buffer = await page.screenshot({
        type: 'png',
        clip: { x: 0, y: 0, width: 1080, height: 1350 },
        omitBackground: false,
      });
      return buffer;
    } finally {
      try { await page.close(); } catch (_) {}
    }
  };

  try {
    return await attempt();
  } catch (err) {
    if (isBrowserGoneError(err)) {
      console.warn('[renderer] browser error, resetting singleton and retrying once:', err.message);
      await closeBrowser();
      return await attempt();
    }
    throw err;
  }
}

async function renderCarousel(slides, options = {}) {
  const buffers = [];
  for (const slide of slides) {
    const buf = await renderSlideToBuffer(slide, options);
    buffers.push({ index: slide.index, type: slide.type, buffer: buf });
  }
  return buffers;
}

module.exports = { renderSlideToBuffer, renderCarousel, closeBrowser };
