const express = require('express');
const { classifyInput, generateScript, generateCaption } = require('../services/claude');
const { renderCarousel } = require('../services/renderer');
const { uploadCarouselSlides } = require('../services/storage');

const router = express.Router();

// POST /api/pipeline/classify — input bruto → briefing JSON
router.post('/classify', async (req, res, next) => {
  try {
    const { input, content_type } = req.body || {};
    if (!input || typeof input !== 'string' || input.trim().length < 10) {
      return res.status(400).json({ error: 'Field "input" required (min 10 chars).' });
    }
    const result = await classifyInput(input, content_type);
    res.json({ briefing: result.data, usage: result.usage });
  } catch (err) {
    next(err);
  }
});

// POST /api/pipeline/script — briefing → roteiro (slides + hook_variants)
router.post('/script', async (req, res, next) => {
  try {
    const { briefing, slide_count } = req.body || {};
    if (!briefing || typeof briefing !== 'object') {
      return res.status(400).json({ error: 'Field "briefing" (object) required.' });
    }
    const result = await generateScript(briefing, { slide_count });
    res.json({ script: result.data, usage: result.usage });
  } catch (err) {
    next(err);
  }
});

// POST /api/pipeline/caption — briefing + roteiro → caption + hashtags
router.post('/caption', async (req, res, next) => {
  try {
    const { briefing, script, cta_type } = req.body || {};
    if (!briefing || !script) {
      return res.status(400).json({ error: 'Fields "briefing" and "script" required.' });
    }
    const result = await generateCaption(briefing, script, { cta_type });
    res.json({ caption: result.data.caption, hashtags: result.data.hashtags, usage: result.usage });
  } catch (err) {
    next(err);
  }
});

// POST /api/pipeline/render-upload — slides → PNGs → Firebase Storage
router.post('/render-upload', async (req, res, next) => {
  try {
    const { slides, carousel_id } = req.body || {};
    if (!Array.isArray(slides) || slides.length === 0) {
      return res.status(400).json({ error: 'Field "slides" must be a non-empty array.' });
    }
    const id = carousel_id || `draft_${Date.now()}`;
    const rendered = await renderCarousel(slides);
    const urls = await uploadCarouselSlides(id, rendered);
    res.json({ carousel_id: id, slide_urls: urls });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
