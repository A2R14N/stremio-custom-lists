/**
 * Manifest route handlers
 */

/**
 * Build configured manifest route handler
 * (Returns Stremio manifest with active custom local lists only)
 */
export function handleConfiguredManifest(req, res, mixpanel) {
  res.setHeader('Cache-Control', 'max-age=86400,stale-while-revalidate=86400,stale-if-error=86400,public');
  res.setHeader('content-type', 'application/json');

  // Parse config
  // Parse stateless base64 JSON payload from URL
  let byokConfig = { lists: [] };
  if (req.params?.configuration) {
    try {
      // Restore stripped base64url padding before decoding
      let raw = req.params.configuration;
      while (raw.length % 4) raw += '=';
      byokConfig = JSON.parse(Buffer.from(raw.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    } catch (e) {
      console.error('[Manifest] Failed to parse BYOK configuration string from URL:', e.message);
    }
  }

  // Build the catalog manifests dynamically based purely on the Installation URL metadata
  const catalogs = byokConfig.lists.map(list => {
    const sortSuffix = list.sort ? `:${list.sort}` : '';
    return {
      id: `trakt:${list.username}:${list.listId}${sortSuffix}`,
      type: list.categoryName,
      name: `${list.username} / ${list.listId}`
    };
  });

  // Dynamically extract missing layout types from the encoded catalogs
  const layoutTypes = ['movie', 'series'];
  catalogs.forEach(cat => {
    if (!layoutTypes.includes(cat.type)) {
      layoutTypes.push(cat.type);
    }
  });

  res.send({
    id: 'community.trakt.custom-lists',
    logo: 'https://play-lh.googleusercontent.com/TBRwjS_qfJCSj1m7zZB93FnpJM5fSpMA_wUlFDLxWAb45T9RmwBvQd5cWR5viJJOhkI',
    version: process.env.npm_package_version,
    name: 'Stremio Custom Lists',
    description: 'Serve custom local JSON and Trakt.tv lists to Stremio.',
    catalogs: catalogs,
    resources: ['catalog'],
    types: layoutTypes,
    idPrefixes: ['tt'],
    behaviorHints: {
      configurable: true
    }
  });
}

/**
 * Default fallback manifest handler
 */
export function handleDefaultManifest(req, res, mixpanel) {
  res.setHeader('Cache-Control', 'max-age=86400,stale-while-revalidate=86400,stale-if-error=86400,public');
  res.setHeader('content-type', 'application/json');

  res.send({
    id: 'community.trakt.custom-lists',
    logo: 'https://play-lh.googleusercontent.com/TBRwjS_qfJCSj1m7zZB93FnpJM5fSpMA_wUlFDLxWAb45T9RmwBvQd5cWR5viJJOhkI',
    version: process.env.npm_package_version,
    name: 'Stremio Custom Lists',
    description: 'Serve custom local JSON and Trakt.tv lists to Stremio.',
    catalogs: [],
    resources: ['catalog'],
    types: [],
    idPrefixes: ['tt'],
    behaviorHints: {
      configurable: true
    }
  });
}

