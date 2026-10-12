# Metal Cover Quiz

Guess the metal album from a cropped fragment of its cover. 10 rounds, 4 answers, harder every round.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # game logic + Discogs adapter
npm run build
```

Works out of the box with a mock catalogue (about 110 real albums, real metadata). No API keys needed.

## Mock artwork is generated, not real

Real covers are copyrighted and only available via the Discogs API with credentials, so the mock source
generates placeholder SVG covers (`src/data/coverArt.ts`). They carry a fake logo and title, like real covers,
so the crop logic that avoids text is exercised. Switch to Discogs to play with real artwork.

## Architecture

| Folder | Responsibility |
| --- | --- |
| `src/domain` | Types: `Album`, `Question`, `Difficulty` |
| `src/game` | Pure logic, no React: `difficulty`, `scoring`, `ranks`, `crop`, `questionBuilder`, `reducer` |
| `src/data` | `AlbumSource` interface, `MockAlbumSource`, `DiscogsAlbumSource`, `createAlbumSource` |
| `src/hooks` | `useQuiz` (loads albums, drives the reducer), `useCrop`, `useCountUp` |
| `src/components` | UI only |

The game depends only on `AlbumSource.getAlbums()`. Nothing is hardcoded to 10 albums: `buildQuiz` takes any pool
of at least 10 albums by 4 artists.

### Start screen logo

The start screen shows `public/logo.webp` as the page title (an `h1` with alt text "Metal Cover Quiz"), with the tagline centred below it.
Use a WebP or PNG with a transparent background, because the page is dark. If the file is missing, the plain text
title is shown instead.

### Zoom mode

An alternative to the fixed fragment: the cover starts as a tiny crop and zooms out until the whole cover is
visible. Answer early for more points: the multiplier falls from 1.5x to 0.25x (`zoomTimeFactor`), fast at first (squared:
below 1x after a quarter of the time, about 0.56x halfway), on top of the
normal scoring. Difficulty and round set the start size and the duration (Normal: 13 s in round 1, 9 s in round 10).
The window grows geometrically so the zoom feels even. It is animated with `requestAnimationFrame` directly on the
DOM node, time only advances while the tab is visible, and with "reduce motion" enabled it moves in eight steps
instead of continuously. A bar along the bottom edge and a "×1.2" chip show what the answer is worth right now.

### Genre

The start screen has a genre picker: All, Heavy (Heavy Metal, NWOBHM, speed, power, progressive and anything
unclassified), Thrash, Death, Black, Doom, Sludge and Grind (grindcore, goregrind, crust). `categoryOf()` in
`src/game/categories.ts` maps any free-text subgenre or Discogs style to one category (a blackened death metal band
counts as Black, deathgrind as Grind). The
chosen genre filters both the correct albums and the wrong answers. With Discogs, only the styles of that genre are
fetched, so the first load is faster. Play Again and Try Hard Mode keep the genre.

### Difficulty

`getRoundProfile(mode, round)` returns three values that change smoothly across the 10 rounds:
crop size, target album difficulty and distractor similarity. Easy, Normal and Hard are different ranges of those
values (`MODE_CONFIG`). The default mode is Normal, which starts easy and ends hard.

- **Album choice:** every unused album can be picked, weighted by a bell curve around the round's target difficulty, so the progression holds but games differ. A second artist from the same game is down-weighted, and so are albums this browser saw recently (the last 400 are remembered in `localStorage`, `src/game/seenAlbums.ts`).
- **Distractors:** ranked by similarity (same subgenre, release year, art style, popularity) blended with randomness. Early rounds are mostly random, late rounds mostly the most similar. Every option is a different artist.

### Crop

`pickCrop` samples 120 random square windows and keeps the best. It rejects windows that overlap known logo/title
regions (`Album.avoidRegions`) and, when pixels are readable, flat areas and very edge-dense areas (likely lettering).
Without hints it penalises the top and bottom bands where metal logos usually sit. The crop is shown with CSS
`background-size` and `background-position` on the same image, and the reveal animates both back to the full cover.

Limitation: the text check is a heuristic, not OCR. For real Discogs covers it can still occasionally show part of a
logo. Also, Discogs image hosts may not send CORS headers, in which case pixels cannot be read and only the positional
rule is used.

### Scoring

`base (100 / 200 / 300 by album difficulty) + 10 per round after the first + 25 per previous consecutive correct (max 5)`,
multiplied by 1 / 1.25 / 1.5 for Easy / Normal / Hard.

## Prebuilt album list (recommended for production)

`npm run catalog` runs `scripts/build-catalog.ts`, which asks Discogs once for many albums and writes
`public/albums.json` (about 1,400 albums, 840 KB, around 200 KB compressed). With `VITE_ALBUM_SOURCE=catalog` the app reads only that
file: picking albums needs **no Discogs calls at all**, so there is no rate-limit wait and no load on your token. Only
the cover images are still loaded from Discogs' image host.

```bash
npm run catalog -- --small   # quick test: 3 styles, 30 albums, under a minute
npm run catalog              # full run, about 30 minutes and ~1,500 requests with your token (needs DISCOGS_TOKEN in .env.local)
```

What the script does: fetches search pages 1 to 12 for every style, drops live albums, demos, splits, compilations and
albums with fewer than 25 Discogs owners, allows at most 3 albums per artist and genre, then picks per genre the most collected
albums plus a stable sample of the rest. Albums already in `public/albums.json` are always kept, so raising the
numbers in `PER_GENRE` only ever adds albums and keeps their cached covers, detected text and manual fixes, so lesser known albums are included for the late rounds.
It looks up each cover URL once. Progress is cached in `scripts/.catalog-cache.json` (ignored by Git), so an
interrupted run resumes; delete that file to start from scratch. Re-run it whenever you want to refresh the list.

### Avoiding lettering in the crops

Discogs' image host sends no CORS headers, so the browser cannot read the pixels of real covers and cannot check a
crop for text itself. The catalogue build therefore does it once, offline: `scripts/detect_text.py` downloads each
cover (`scripts/.covers`, ignored by Git) and marks lettering with two detectors, OCR (tesseract, three scales,
normal and inverted) and a stroke-structure detector for logos OCR cannot read. The rectangles are stored per album as
`avoidRegions`. When picking a crop, any overlap with them costs a lot, plus a smaller penalty for the typical logo and
title zones at the top and bottom; if every position overlaps something, the least bad one wins. The step needs
`python3` with Pillow, numpy and scipy, and the `tesseract` command (`brew install tesseract`). Use
`npm run catalog -- --no-text` to skip it.

This is a heuristic and **not perfect**. Titles and ordinary lettering are found reliably; heavily stylised logos,
tilted stamps and text on busy artwork are sometimes missed, and busy artwork is sometimes flagged although it has no
text (which only makes the crop choice more cautious). Some Discogs "covers" are photos of the record or a cassette.
Fix single cases by hand in `scripts/catalog-overrides.json`: `avoid` adds rectangles `[x, y, width, height]` (0 to 1,
from the top left) for an album id, `exclude` removes an album. Then run `npm run catalog` again. It takes seconds,
because everything else is cached. In zoom mode the text appears at the end anyway, when the whole cover is visible.

If a stored cover URL stops working (Discogs image URLs are signed), the app asks the proxy for a fresh one once, and
offers "Skip this round" if that fails too.

Check the Discogs API terms before committing and publishing `albums.json`: it contains their metadata and image links.

## Using Discogs (through the built-in proxy)

The browser never sees your token. It calls `/api/discogs/...` on your own site, and a small server-side proxy
(`server/discogsProxy.ts`) adds the token and forwards the request to Discogs.

```bash
cp .env.example .env.local   # then fill in DISCOGS_TOKEN and set VITE_ALBUM_SOURCE=discogs
npm run dev                  # the Vite dev server serves the same proxy locally
```

| Variable | Where it lives | Purpose |
| --- | --- | --- |
| `VITE_ALBUM_SOURCE=discogs` | build time, public | switches from mock data to Discogs |
| `VITE_DISCOGS_BASE_URL=/api/discogs` | build time, public | points the app at the proxy |
| `DISCOGS_TOKEN` | **server only**, no `VITE_` prefix | your Discogs personal access token |

**Deploying (Vercel):** import the repo, add the three variables above under Project Settings > Environment Variables,
and deploy. `api/discogs/[...path].ts` becomes the proxy function. Locally the proxy is tested and works; the Vercel
function itself has not been deployed from here, so check `/api/discogs/masters/7710` on the first deploy (it should
return JSON). On other hosts, wrap `handleDiscogsRequest(request, token)` in that host's function format.

**Deploying (Cloudflare, Workers with static assets, the current default flow):** connect the GitHub repo
(private is fine). `wrangler.jsonc` and `worker/index.ts` are picked up automatically. Settings:

- Build command `npm run build`, deploy command `npx wrangler deploy` (the defaults).
- Under *Build > Variables and secrets* (build time): `VITE_ALBUM_SOURCE=discogs` and `VITE_DISCOGS_BASE_URL=/api/discogs`.
- Under *Settings > Variables and Secrets* of the Worker (runtime): `DISCOGS_TOKEN` as a **secret**. It is a different place
  from the build variables, and the token must never be a build variable.

Only `/api/discogs/*` runs the Worker; everything else is served as static files. Tested locally with `wrangler dev`.
If you use classic **Cloudflare Pages** instead, `functions/api/discogs/[[path]].ts` is the equivalent
(output directory `dist`, `DISCOGS_TOKEN` as a secret). A real Cloudflare deployment has not been done from here, so
check `/api/discogs/masters/7710` after the first deploy.

**What the proxy allows:** only `GET /database/search` (type and genre are forced, `style` is validated, paging is
clamped) and `GET /masters/{numeric id}`. Everything else returns 404 or 405, and client-sent `Authorization`
headers are ignored, so it cannot be used as a general relay for your token. Successful responses are cached by the
CDN for a day, so many players share one Discogs call. The proxy has no per-visitor rate limit of its own; if the site
gets heavy traffic, add one (for example with your host's firewall or a key-value store).

`DiscogsAlbumSource` was verified against the live API:

- **Covers are looked up lazily.** Discogs search results contain empty image fields. Only `GET /masters/{id}` returns image URLs. The quiz therefore starts immediately and resolves the 10 target covers in round order in the background (about 10 extra requests per game; distractors are text only). If a cover cannot be found the round offers "Skip this round".
- **Rate limits:** requests are spaced 1.1 s apart (limit is 60/min with a token). `429` responses wait for `Retry-After` and retry. Each session samples random (style, page) combinations from search pages 1 to 5, biased towards the first pages, until about 200 albums are found (80 for a single genre). Deeper pages hold the lesser known albums, so the pool contains both famous and obscure records and differs from session to session. The pool is kept for the rest of the session, so further games start instantly.
- **Caching:** each search page is cached in `localStorage` for 7 days (metadata only) and at the proxy CDN. Cover URLs are kept in memory only, because Discogs image URLs are signed and could go stale.
- **Filtering:** only releases with format "Album" are used; singles, EPs and compilations are dropped. Live albums are still labelled "Album" by Discogs, so some can appear.
- **Attribution:** the footer shows "Metadata and artwork via Discogs" and every revealed album links to its Discogs page.
- **Popularity:** derived from how many Discogs users own the release (`community.have`) on a fixed log scale (30,000 owners = 100), so it means the same whichever pages were fetched. Difficulty is its inverse.

Before publishing, check the current Discogs API Terms of Use (image usage and caching rules) and the copyright
position of showing album artwork. This README is not legal advice.

Initial Discogs load takes several seconds because of the rate limit. For production, build the album list once on a
server (or ship a curated JSON file behind a new `AlbumSource`) instead of calling Discogs from every browser.
