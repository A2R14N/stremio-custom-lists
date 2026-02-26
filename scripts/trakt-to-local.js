import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { fileURLToPath } from 'url';
import { fetchCinemetaMeta, getBasicMeta } from '../src/services/cinemeta.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRAKT_CLIENT_ID = process.env.TRAKT_CLIENT_ID;

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 3) {
        console.error('Usage: node trakt-to-local.js <trakt_username> <list_id> <category_type>');
        console.error('Example: node trakt-to-local.js a2r14n droopy cartoon');
        console.error('\nEnsure you have set the TRAKT_CLIENT_ID environment variable.');
        console.error('You can get a Trakt Client ID by creating an app at: https://trakt.tv/oauth/applications');
        process.exit(1);
    }

    if (!TRAKT_CLIENT_ID) {
        console.error('Error: TRAKT_CLIENT_ID environment variable is missing.');
        console.error('Example (Windows): set TRAKT_CLIENT_ID=your_client_id_here');
        console.error('Example (Linux/Mac): export TRAKT_CLIENT_ID=your_client_id_here');
        process.exit(1);
    }

    const [username, listId, categoryType] = args;

    console.log(`[Trakt API] Fetching list "${listId}" from user "${username}"...`);
    let items = [];
    let listInfo = null;

    try {
        // Fetch list summary for name
        const listRes = await axios.get(`https://api.trakt.tv/users/${username}/lists/${listId}`, {
            headers: {
                'Content-Type': 'application/json',
                'trakt-api-version': '2',
                'trakt-api-key': TRAKT_CLIENT_ID
            }
        });
        listInfo = listRes.data;

        // Fetch list items
        const res = await axios.get(`https://api.trakt.tv/users/${username}/lists/${listId}/items`, {
            headers: {
                'Content-Type': 'application/json',
                'trakt-api-version': '2',
                'trakt-api-key': TRAKT_CLIENT_ID
            }
        });
        items = res.data;
    } catch (e) {
        console.error('\n[Error] Failed to fetch from Trakt API:', e.response?.data || e.message);
        process.exit(1);
    }

    console.log(`[Trakt API] Found ${items.length} items. Fetching rich metadata from Cinemeta...`);

    const resultItems = [];

    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const type = item.type; // 'movie', 'show', 'season', 'episode'

        // We only support movies and shows at the catalog level
        if (type !== 'movie' && type !== 'show') {
            console.log(`[${i + 1}/${items.length}] Skipping unsupported type "${type}"...`);
            continue;
        }

        const media = item[type];
        if (!media) continue;

        const imdbId = media.ids?.imdb;
        const title = media.title;
        const year = media.year;

        if (!imdbId) {
            console.warn(`[${i + 1}/${items.length}] Skipping "${title}" (Missing IMDB ID)`);
            continue;
        }

        process.stdout.write(`[${i + 1}/${items.length}] Fetching ${title} (${imdbId})... `);

        const stremioType = type === 'show' ? 'series' : 'movie';
        let meta = await fetchCinemetaMeta(imdbId, stremioType, title);

        if (!meta) {
            console.log(`Fallback basic meta`);
            meta = getBasicMeta(imdbId, title, stremioType);
            meta.releaseInfo = year ? year.toString() : undefined;
        } else {
            console.log(`Cinemeta OK`);
        }

        resultItems.push(meta);

        // Minimal delay to prevent hammering Cinemeta
        await new Promise(resolve => setTimeout(resolve, 150));
    }

    const outputJson = {
        id: `list_${listId.replace(/-/g, '_')}`,
        name: listInfo.name || listId,
        type: categoryType,
        items: resultItems
    };

    const outPath = path.join(__dirname, `../src/data/lists/${listId}.json`);
    fs.writeFileSync(outPath, JSON.stringify(outputJson, null, 2));
    console.log(`\n[Success] Wrote ${resultItems.length} items to ${outPath}`);
    console.log(`Your list will be automatically injected as a "${categoryType}" catalog the next time you start the addon.`);
}

main().catch(console.error);
