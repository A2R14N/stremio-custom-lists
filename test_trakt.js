import 'dotenv/config';
import axios from 'axios';

const traktClientId = process.env.TRAKT_CLIENT_ID;

async function run() {
    try {
        console.log("Fetching: sort=released,asc");
        const res = await axios.get("https://api.trakt.tv/users/a2r14n/lists/droopy/items?sort=released,asc", {
            headers: {
                'Content-Type': 'application/json',
                'trakt-api-version': '2',
                'trakt-api-key': traktClientId
            }
        });

        console.log("First 3 items (released,asc):");
        console.log(res.data.slice(0, 3).map(item => `${item.type === 'show' ? item.show.title : item.movie.title} (${item.type === 'show' ? item.show.year : item.movie.year})`));

        console.log("\nFetching: sort=title,asc");
        const res2 = await axios.get("https://api.trakt.tv/users/a2r14n/lists/droopy/items?sort=title,asc", {
            headers: {
                'Content-Type': 'application/json',
                'trakt-api-version': '2',
                'trakt-api-key': traktClientId
            }
        });

        console.log("First 3 items (title,asc):");
        console.log(res2.data.slice(0, 3).map(item => `${item.type === 'show' ? item.show.title : item.movie.title} (${item.type === 'show' ? item.show.year : item.movie.year})`));

    } catch (e) {
        console.error("Failed:", e.message);
    }
}
run();
