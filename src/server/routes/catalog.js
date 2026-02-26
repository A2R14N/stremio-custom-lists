import { replaceRpdbPosters } from '../../lib/stremio.js';
import axios from 'axios';
import { fetchCinemetaMeta, getBasicMeta } from '../../services/cinemeta.js';
import { Redis } from '@upstash/redis';

/**
 * Catalog route handler
 */
export async function handleCatalog(req, res, mixpanel) {
  res.setHeader('Cache-Control', 'max-age=86400,stale-while-revalidate=86400,stale-if-error=86400,public');
  res.setHeader('content-type', 'application/json');

  // Decode stateless BYOK URL Configuration
  let byokConfig = null;
  if (req.params?.configuration) {
    try {
      let raw = req.params.configuration;
      while (raw.length % 4) raw += '=';
      byokConfig = JSON.parse(Buffer.from(raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    } catch (e) {
      console.error('[Catalog] Failed to parse BYOK configuration string from URL:', e.message);
    }
  }

  const { id } = req.params;

  // Use BYOK Upstash credentials if provided, fall back to server-side env vars
  let redis = req.app.locals.redis;
  if (byokConfig?.upstashUrl && byokConfig?.upstashToken) {
    try {
      redis = new Redis({ url: byokConfig.upstashUrl, token: byokConfig.upstashToken });
    } catch (e) {
      console.warn('[Redis] Failed to create BYOK Redis client:', e.message);
    }
  }

  // Stremio requested a Trakt Custom List ('id' matches the 'trakt:username:listId' format output in manifest.js)
  if (byokConfig && byokConfig.traktClientId && id.startsWith('trakt:')) {
    const parts = id.split(':');
    const username = parts[1];
    const listId = parts[2];
    const sort = parts.length > 3 ? parts.slice(3).join(':') : null;

    const traktClientId = byokConfig.traktClientId;
    const redisKey = `trakt:${username}:${listId}${sort ? `:${sort}` : ''}`;

    // 1. Check Upstash Redis Cache first
    if (req.app.locals.redis) {
      try {
        const cachedMetas = await req.app.locals.redis.get(redisKey);
        if (cachedMetas) {
          console.log(`[Cache Hit] Serving list ${listId} natively from Upstash.`);
          const parsedMetas = typeof cachedMetas === 'string' ? JSON.parse(cachedMetas) : cachedMetas;
          res.send({ metas: parsedMetas });
          return;
        }
      } catch (err) {
        console.error('[Redis] Cache get error:', err.message);
      }
    }

    // 2. Fetch Live from Trakt.tv (BYOK Logic)
    try {
      console.log(`[Trakt Live Fetch] Fetching list "${listId}" from user "${username}" using BYOK token...`);
      const sortQuery = sort ? `?sort=${sort}` : '';
      const resTrakt = await axios.get(`https://api.trakt.tv/users/${username}/lists/${listId}/items${sortQuery}`, {
        headers: {
          'Content-Type': 'application/json',
          'trakt-api-version': '2',
          'trakt-api-key': traktClientId
        },
        timeout: 10000
      });

      const items = resTrakt.data || [];
      const resultItems = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const type = item.type;
        if (type !== 'movie' && type !== 'show') continue;

        const media = item[type];
        if (!media) continue;

        const imdbId = media.ids?.imdb;
        const title = media.title;
        const year = media.year;

        if (!imdbId) continue;

        const stremioType = type === 'show' ? 'series' : 'movie';
        let meta = await fetchCinemetaMeta(imdbId, stremioType, title);

        if (!meta) {
          meta = getBasicMeta(imdbId, title, stremioType);
          meta.releaseInfo = year ? year.toString() : undefined;
        }

        resultItems.push(meta);
      }

      // 3. Save to Upstash Redis Permanently
      if (redis) {
        try {
          await redis.set(redisKey, JSON.stringify(resultItems));
          console.log(`[Cache Miss] Successfully compiled ${resultItems.length} items and saved to Upstash permanently.`);
        } catch (err) {
          console.error('[Redis] Cache save error:', err.message);
        }
      }

      res.send({ metas: resultItems });
      return;

    } catch (e) {
      console.error(`[Trakt API Error] BYOK Fetch failed: ${e.message}`);
      // Fall through to empty response
    }
  }

  // Fallback empty response
  res.send({ metas: [] });
}

