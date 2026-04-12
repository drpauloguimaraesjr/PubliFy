require('dotenv').config();

const express = require('express');
const cors = require('cors');

const generateRoute = require('./routes/generate');
const renderRoute = require('./routes/render');
const carouselRoute = require('./routes/carousel');
const pipelineRoute = require('./routes/pipeline');

const app = express();

const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/publi-fy-jfrg\.vercel\.app$/,
  /^https:\/\/publi-fy-[a-z0-9]+-drpauloguimaraesjrs-projects\.vercel\.app$/,
  /^http:\/\/localhost:\d+$/,
  /^http:\/\/127\.0\.0\.1:\d+$/,
];

app.use(cors({
  origin: (origin, cb) => {
    if (!origin) return cb(null, true); // server-to-server / curl
    const ok = ALLOWED_ORIGIN_PATTERNS.some(rx => rx.test(origin));
    return ok ? cb(null, true) : cb(new Error('CORS: origin not allowed: ' + origin));
  },
  credentials: false,
}));

app.use(express.json({ limit: '10mb' }));

const { version } = require('../package.json');

app.get('/', (_req, res) => {
  res.json({
    name: 'PubliFy API',
    status: 'ok',
    version,
    docs: 'https://github.com/drpauloguimaraesjr/PubliFy',
  });
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/generate', generateRoute);
app.use('/api/render', renderRoute);
app.use('/api/carousel', carouselRoute);
app.use('/api/pipeline', pipelineRoute);

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
