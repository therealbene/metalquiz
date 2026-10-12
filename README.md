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
visible. Answer early for more points: the multiplier falls linearly from 1.5x to 0.4x (`zoomTimeFactor`), on top of the
normal scoring. Difficulty and round set the start size and the duration (Normal: 13 s in round 1, 9 s in round 10).
The window grows geometrically so the zoom feels even. It is animated with `requestAnimationFrame` directly on the
DOM node, time only advances while the tab is visible, and with "reduce motion" enabled it moves in eight steps
instead of continuously. A bar along the bottom edge shows the remaining time.

### Genre

The start screen has a genre picker: All, Heavy (Heavy Metal, NWOBHM, speed and anything unclassified), Thrash,
Death, Black, Doom, Power and Prog. `categoryOf()` in `src/game/categories.ts` maps any free-text subgenre or Discogs
style to one category (a blackened death metal band counts as Black, progressive death metal as Prog). The
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
