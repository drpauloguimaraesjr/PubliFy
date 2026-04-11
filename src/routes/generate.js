const express = require('express');
const { generateCarouselScript } = require('../services/claude');

const router = express.Router();

router.post('/', async (req, res, next) => {
  try {
    const { input, post_type, audience, slide_count } = req.body || {};

    if (!input || typeof input !== 'string' || input.trim().length < 10) {
      return res.status(400).json({
        error: 'Field "input" is required (string, min 10 chars).',
      });
    }

    const result = await generateCarouselScript(input, {
      post_type,
      audience,
      slide_count,
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
