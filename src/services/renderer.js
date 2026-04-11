const puppeteer = require('puppeteer');
const { renderSlideHtml } = require('../templates/renderHtml');

let browserPromise = null;

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--font-render-hinting=none'],
    });
  }
  return browserPromise;
}

async function closeBrowser() {
  if (browserPromise) {
    const b = await browserPromise;
    await b.close();
    browserPromise = null;
  }
}

async function renderSlideToBuffer(slide) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setViewport({ width: 1080, height: 1350, deviceScaleFactor: 2 });
    const html = renderSlideHtml(slide);
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    await page.evaluateHandle('document.fonts.ready');
    const buffer = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: 1080, height: 1350 },
      omitBackground: false,
    });
    return buffer;
  } finally {
    await page.close();
  }
}

async function renderCarousel(slides) {
  const buffers = [];
  for (const slide of slides) {
    const buf = await renderSlideToBuffer(slide);
    buffers.push({ index: slide.index, type: slide.type, buffer: buf });
  }
  return buffers;
}

module.exports = { renderSlideToBuffer, renderCarousel, closeBrowser };
