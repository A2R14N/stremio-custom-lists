# Custom Local Lists

You can now add custom lists (such as Cartoons or Anime) directly to your Stremio Addon without relying on slow external APIs like Trakt. 

By dropping formatted `.json` files into the `src/data/lists/` directory, the addon will automatically load them into memory on startup and instantly serve them as Stremio catalogs.

## How it works
1. Convert your Trakt lists (or any other source) into the required Stremio Meta JSON format (shown below).
2. Save the file as a `.json` file inside `src/data/lists/` (e.g. `src/data/lists/droopy.json`).
3. Restart the addon.
4. When you install/configure the addon via the Web UI, you will now see your new lists automatically injected into your Stremio Discover board under the category you specified (e.g. `cartoon`).

## Example JSON Format
Your JSON files **must** contain an `id`, `name`, `type`, and an `items` array representing the content.

```json
{
  "id": "list_droopy",
  "name": "Droopy Cartoons",
  "type": "cartoon",
  "items": [
    {
      "id": "tt0035824",
      "name": "Dumb-Hounded",
      "poster": "https://m.media-amazon.com/images/M/MV5BMjA5NzQ2Njc5MF5BMl5BanBnXkFtZTcwNzY3ODYzMQ@@._V1_FMjpg_UX600_.jpg",
      "posterShape": "poster",
      "type": "movie",
      "description": "Droopy is an unassuming basset hound who continually thwarts an escaped convict.",
      "releaseInfo": "1943"
    }
  ]
}
```

### Supported Properties for Items:
- `id`: The IMDB ID (e.g., `tt0035824`). **(Required)**
- `name`: Title of the movie or series. **(Required)**
- `type`: Either `movie` or `series`. **(Required)**
- `poster`: URL to the poster image.
- `posterShape`: Typically `"poster"`.
- `description`: Text synopsis.
- `releaseInfo`: Year of release.

## Automated Trakt Importer Tool

If you want to quickly import a public list from Trakt.tv into this Addon, you can use the built-in CLI tool instead of writing JSON manually!

### Prerequisites
You will need a free Trakt **Client ID**. You can get one by creating an application here: [https://trakt.tv/oauth/applications](https://trakt.tv/oauth/applications) 

Set your Client ID as an environment variable in your terminal:
- **Windows (CMD):** `set TRAKT_CLIENT_ID=your_client_id_here`
- **Windows (PowerShell):** `$env:TRAKT_CLIENT_ID="your_client_id_here"`
- **Linux/Mac:** `export TRAKT_CLIENT_ID=your_client_id_here`

### Usage
From the root directory of the addon project, run:
```bash
node scripts/trakt-to-local.js <trakt_username> <list_id> <category_type>
```

**Example:**
If you want to import `https://trakt.tv/users/a2r14n/lists/droopy` under the `cartoon` category:

```bash
node scripts/trakt-to-local.js a2r14n droopy cartoon
```

The script will automatically fetch the Trakt data, grab IMDB IDs, query Cinemeta for the richest Stremio metadata possible, and automatically save `list_droopy.json` directly into `src/data/lists/`. After restarting your addon server, the new interactive catalog will simply appear inside Stremio!
