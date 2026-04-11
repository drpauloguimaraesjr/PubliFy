const express = require('express');
const { generateCarouselScript } = require('../services/claude');
const { renderCarousel } = require('../services/renderer');
const { uploadCarouselSlides } = require('../services/storage');
const {
  createCarousel,
  updateCarousel,
  getCarousel,
  listCarousels,
  saveContentInput,
} = require('../services/firestore');

const router = express.Router();

// POST /api/carousel — pipeline completo: input bruto → roteiro → PNGs → Firebase
router.post('/', async (req, res, next) => {
  try {
    const { input, post_type, audience, slide_count } = req.body || {};

    if (!input || typeof input !== 'string' || input.trim().length < 10) {
      return res.status(400).json({ error: 'Field "input" required (min 10 chars).' });
    }

    // 1. Gera roteiro via Claude
    const { script, usage } = await generateCarouselScript(input, { post_type, audience, slide_count });

    // 2. Cria documento no Firestore (status: draft)
    const carousel = await createCarousel({
      topic: script.topic,
      category: script.category,
      audience: script.audience,
      post_type: script.post_type,
      hook_variants: script.hook_variants,
      slides: script.slides,
      caption: script.caption,
      hashtags: script.hashtags,
      status: 'rendering',
      claude_usage: usage,
    });

    // 3. Salva input bruto ligado ao carousel
    await saveContentInput({
      type: 'text',
      raw_content: input,
      carousel_id: carousel.id,
    });

    // 4. Renderiza todos os slides em paralelo (bloqueante — avisa se demorar)
    const rendered = await renderCarousel(script.slides);

    // 5. Upload pro Firebase Storage
    const urls = await uploadCarouselSlides(carousel.id, rendered);

    // 6. Mescla URLs nos slides e atualiza Firestore
    const slidesWithUrls = script.slides.map(s => {
      const match = urls.find(u => u.index === s.index);
      return { ...s, image_url: match?.url };
    });

    const updated = await updateCarousel(carousel.id, {
      slides: slidesWithUrls,
      status: 'draft',
    });

    res.json({ carousel: updated, slide_urls: urls });
  } catch (err) {
    next(err);
  }
});

// GET /api/carousel — lista
router.get('/', async (req, res, next) => {
  try {
    const { status, limit } = req.query;
    const items = await listCarousels({ status, limit: Number(limit) || 50 });
    res.json({ items, count: items.length });
  } catch (err) {
    next(err);
  }
});

// GET /api/carousel/:id
router.get('/:id', async (req, res, next) => {
  try {
    const item = await getCarousel(req.params.id);
    if (!item) return res.status(404).json({ error: 'Not found' });
    res.json(item);
  } catch (err) {
    next(err);
  }
});

// PATCH /api/carousel/:id — edição inline (texto dos slides, caption, status)
router.patch('/:id', async (req, res, next) => {
  try {
    const allowed = ['slides', 'caption', 'hashtags', 'status', 'scheduled_at'];
    const patch = {};
    for (const k of allowed) if (k in req.body) patch[k] = req.body[k];
    const updated = await updateCarousel(req.params.id, patch);
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
