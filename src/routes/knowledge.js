const express = require('express');
const { searchArticles } = require('../services/knowledge');

const router = express.Router();

router.get('/search', async (req, res, next) => {
  try {
    const { q, limit } = req.query;
    if (!q || q.trim().length < 3) {
      return res.status(400).json({ error: 'Query param "q" required (min 3 chars).' });
    }
    const results = await searchArticles(q, Number(limit) || 5);
    res.json({ query: q, count: results.length, articles: results });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
