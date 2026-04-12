const express = require('express');
const { classifyInput, generateScript, generateCaption } = require('../services/claude');
const { renderCarousel } = require('../services/renderer');
const { uploadCarouselSlides } = require('../services/storage');
const { createCarousel, updateCarousel } = require('../services/firestore');
const { normalizeSlides } = require('../utils/normalizeSlide');

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
    const script = { ...result.data, slides: normalizeSlides(result.data.slides) };
    res.json({ script, usage: result.usage });
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

// POST /api/pipeline/render-upload — slides → PNGs → Storage + Firestore
// Aceita contexto completo (briefing, script, caption, hashtags, template_config)
// e persiste tudo em Firestore. Retorna o carousel_id REAL do doc criado.
router.post('/render-upload', async (req, res, next) => {
  try {
    const {
      slides,
      briefing,
      script,
      caption,
      hashtags,
      template_config,
      input,
    } = req.body || {};

    const slidesToRender = normalizeSlides(slides || script?.slides);
    if (!slidesToRender.length) {
      return res.status(400).json({ error: 'Field "slides" (or "script.slides") must be a non-empty array.' });
    }

    // 1. Cria doc Firestore com status "rendering" (ID real)
    const carouselDoc = await createCarousel({
      topic:         briefing?.topic           ?? script?.topic         ?? null,
      category:      briefing?.category        ?? null,
      audience:      briefing?.audience        ?? null,
      technical_level: briefing?.technical_level ?? null,
      post_type:     briefing?.post_type       ?? null,
      main_angle:    briefing?.main_angle      ?? null,
      hook_variants: script?.hook_variants     ?? [],
      slides:        slidesToRender,
      caption:       caption                   ?? null,
      hashtags:      hashtags                  ?? [],
      template_config: template_config         ?? null,
      raw_input:     input                     ?? null,
      status: 'rendering',
    });

    // 2. Renderiza (com accent color se template_config tiver)
    const renderOptions = {};
    if (template_config?.accent) renderOptions.accent = template_config.accent;
    const rendered = await renderCarousel(slidesToRender, renderOptions);

    // 3. Upload Firebase Storage usando ID REAL (não mais draft_)
    const urls = await uploadCarouselSlides(carouselDoc.id, rendered);

    // 4. Mescla URLs nos slides e atualiza status → draft (revisão)
    const slidesWithUrls = slidesToRender.map(s => {
      const match = urls.find(u => u.index === s.index);
      return { ...s, image_url: match?.url ?? null };
    });

    const updated = await updateCarousel(carouselDoc.id, {
      slides: slidesWithUrls,
      status: 'draft',
    });

    res.json({
      carousel_id: carouselDoc.id,
      slide_urls: urls,
      carousel: updated,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
