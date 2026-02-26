import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Mixpanel from 'mixpanel';
import { fileURLToPath } from 'url';
import path from 'path';
import { handleConfiguredManifest, handleDefaultManifest } from './routes/manifest.js';
import { handleCatalog } from './routes/catalog.js';
import { Redis } from '@upstash/redis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Upstash Redis instance
let redis = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  console.log('[Redis] Connected to Upstash Serverless DB');
} else {
  console.warn('[Redis] Warning: UPSTASH_REDIS keys are missing. Public cache will fail.');
}

const REFRESH_INTERVAL = process.env.REFRESH_INTERVAL || 21600000; // 6 hours in milliseconds

const app = express();
app.use(cors());
app.use(express.json()); // Enable JSON body parsing for API payloads

// Attach redis to express locals for route accessibility
app.locals.redis = redis;

// Serve static files from Vue build
app.use(express.static(path.join(__dirname, '../../vue/dist')));

// Initialize tracking
const mixpanel = process.env.MIXPANEL_TOKEN ? Mixpanel.init(process.env.MIXPANEL_TOKEN) : null;

// Production error handling

// Routes
app.get('/:configuration/manifest.json', (req, res) => {
  handleConfiguredManifest(req, res, mixpanel);
});

app.get('/manifest.json', (req, res) => {
  handleDefaultManifest(req, res, mixpanel);
});

app.get('/:configuration?/catalog/:type/:id/:extra?.json', (req, res) => {
  handleCatalog(req, res, mixpanel);
});

// Fallback to Vue
app.get(/.*/, (req, res) => {
  res.setHeader('Cache-Control', 'max-age=86400,stale-while-revalidate=86400,stale-if-error=86400,public');
  res.setHeader('content-type', 'text/html');
  res.sendFile(path.join(__dirname, '../../vue/dist/index.html'));
});

export default app;
