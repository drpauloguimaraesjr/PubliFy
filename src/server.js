require('dotenv').config();

const express = require('express');
const cors = require('cors');

const generateRoute = require('./routes/generate');
const renderRoute = require('./routes/render');
const carouselRoute = require('./routes/carousel');

const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const { version } = require('../package.json');

app.get('/', (_req, res) => {
  res.json({
    name: 'PubliFy API',
    status: 'ok',
    version,
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/generate', generateRoute);
app.use('/api/render', renderRoute);
app.use('/api/carousel', carouselRoute);

app.use((err, _req, res, _next) => {
  console.error('[error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`PubliFy API running on port ${PORT}`);
});
