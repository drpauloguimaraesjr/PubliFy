const express = require('express');
const fs = require('fs');
const path = require('path');
const { renderCarousel } = require('../services/renderer');

const router = express.Router();

const OUTPUT_DIR = path.join(process.cwd(), 'output');

router.post('/', async (req, res, next) => {
  try {
    const { slides, save_to_disk = true, carousel_id } = req.body || {};

    if (!Array.isArray(slides) || slides.length === 0) {
      return res.status(400).json({ error: 'Field "slides" must be a non-empty array.' });
    }

    const rendered = await renderCarousel(slides);

    let saved = [];
    if (save_to_disk) {
      const id = carousel_id || `carousel_${Date.now()}`;
      const dir = path.join(OUTPUT_DIR, id);
      fs.mkdirSync(dir, { recursive: true });
      saved = rendered.map(({ index, type, buffer }) => {
        const filename = `${String(index).padStart(2, '0')}_${type}.png`;
        const fullPath = path.join(dir, filename);
        fs.writeFileSync(fullPath, buffer);
        return { index, type, path: fullPath };
      });
    }

    res.json({
      slides_rendered: rendered.length,
      saved_to: save_to_disk ? saved : null,
      sizes_kb: rendered.map(r => Math.round(r.buffer.length / 1024)),
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
