# RoomAdvisor

Upload 1–3 photos of a room. Get a style analysis and a short list of furniture you can actually buy.

The analysis shows up first — dominant colors, aesthetic, estimated dimensions. Then products appear one at a time as the search runs. No spinner for 20 seconds.

---

## How it works

You upload photos. Two things happen in parallel: one model looks at the room and describes it, another plans which furniture categories would work. Then it searches Google Shopping for each category and streams results back as they arrive.

If the photo isn't a room, it says so instead of returning garbage.

You can set a budget per item and enter the room dimensions manually if you want more accurate recommendations. Each category comes with up to three options — hit **Cambia** to swap one, and the set total updates live. There's a shareable link after each analysis (it expires after 24 hours), and it unfurls on social/chat apps as a preview card with the room's palette and style.

Photos are resized in the browser (max 1600px, JPEG) before upload: a 9 MB phone photo goes out as ~200 KB, which keeps requests well under Vercel's 4.5 MB body limit and makes the analysis faster.

---

## Stack

- Next.js 14 (App Router) + React 18 + TypeScript 5
- Tailwind CSS 3
- Gemini 2.5 Flash — vision analysis and furniture planning
- SerpAPI Google Shopping — product search
- Node.js 20+

---

## Setup

```bash
git clone https://github.com/<your-username>/RoomAdvisor.git
cd RoomAdvisor
npm install
cp .env.example .env.local
```

Fill in `.env.local`:

- `GEMINI_API_KEY` — from [Google AI Studio](https://aistudio.google.com/apikey). Free tier works.
- `SERPAPI_KEY` — from [SerpAPI](https://serpapi.com/manage-api-key). 100 searches/month free.

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Commands

| Command | What it does |
|---|---|
| `npm run dev` | Dev server on `:3000` |
| `npm run build` | Production build |
| `npm run start` | Start production build |
| `npm run lint` | ESLint |
| `npm run type-check` | `tsc --noEmit` |
| `npm test` | Unit + route integration tests (Vitest, Gemini/SerpAPI mocked) |
| `node scripts/smoke-recommend.mjs` | Smoke test the main endpoint (needs dev server + a `test-room.jpg` in root) |

---

## Endpoints

**`POST /api/recommend`** — the only endpoint the client uses. Accepts `{ images, dimensions?, budget?, goal?, ownedItems? }`, returns `text/event-stream`. Emits `analysis`, then `product` events one by one (each with a `rank` for stable ordering and up to two `alternatives`), an optional `warning` if some categories failed, then `shared` and `done`. Emits `error` with code `NOT_A_ROOM` if the images don't show a room. Returns `HTTP 429 { code: "RATE_LIMITED" }` (plain JSON, not SSE) when the per-IP rate limit is hit.

**`GET /api/share/[id]`** — returns a saved result by ID. 404 if expired or not found.

---

## Deploy

Works on Vercel Hobby or Pro. The streaming endpoint sets `maxDuration = 60s` via segment config (`app/api/recommend/route.ts`); Hobby allows up to 300s, so no Pro plan is required for this MVP.

Three steps:

1. Import the GitHub repo into Vercel.
2. Set environment variables in the project settings:
   - `GEMINI_API_KEY`
   - `SERPAPI_KEY`
3. Add a Redis store: Vercel → Storage → Upstash for Redis (or set `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`). Without it, shared links and rate limiting fall back to per-instance memory, and shared links will 404 whenever a request lands on a different instance.
4. Deploy.

Security headers (`X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`) and `productionBrowserSourceMaps: false` are configured in `next.config.mjs` and apply automatically.

**Rate limiting:** 10 req/IP/60s on `/api/recommend`, fixed window. With Redis configured it is shared across instances; the client IP comes from `x-real-ip` (set by Vercel, not spoofable). If Redis is unreachable the limiter fails open to the per-instance memory limit.

---

## Desktop app

RoomAdvisor also ships as an installable desktop app for **Windows, macOS and Linux**. It's the same app, running locally in its own window: no browser and no server to set up.

### Install

1. Open the [Releases](https://github.com/nassim2345/RoomAdvisor/releases) page and download the file for your system:
   - **Windows** → `RoomAdvisor-Setup-x.y.z.exe`
   - **macOS** → `RoomAdvisor-x.y.z-arm64.dmg` (Apple Silicon) or `RoomAdvisor-x.y.z-x64.dmg` (Intel)
   - **Linux** → `RoomAdvisor-x.y.z.AppImage` (any distro) or `roomadvisor_x.y.z_amd64.deb` (Debian/Ubuntu)
2. Install it like any other app.
3. On first launch, paste your two API keys (Gemini + SerpAPI, both have free tiers). You can change them later from the **Chiavi API…** menu (`Ctrl/Cmd + ,`).

The installers are **not code-signed**, so the first launch shows a warning:

- **Windows** (SmartScreen): *More info* → *Run anyway*.
- **macOS**: right-click the app → *Open* → *Open*. If it says the app is "damaged", run `xattr -cr /Applications/RoomAdvisor.app` once in Terminal.
- **Linux AppImage**: `chmod +x RoomAdvisor-*.AppImage`, then run it.

Keys are stored only on your computer, in the app's data folder, encrypted with the OS keychain where one is available (always on Windows and macOS; on Linux only if a keyring such as GNOME Keyring is running). Share links are disabled in the desktop app, since the local server isn't reachable by anyone else.

### Publish a new version

```bash
git tag v0.2.0
git push origin v0.2.0
```

The **Desktop release** workflow builds the three installers and attaches them to a GitHub Release named after the tag (the app version is taken from the tag). To build without publishing, run the workflow manually from the Actions tab: the installers appear as downloadable artifacts of the run.

### Run or build locally

| Command | What it does |
|---|---|
| `npm run desktop` | Build and open the desktop app |
| `npm run desktop:dist` | Build the installer for the current OS into `dist-desktop/` |

How it works: `next build` produces a self-contained server (`output: "standalone"`). Electron starts it on a random `127.0.0.1` port using its bundled Node runtime, passes your keys as environment variables, and opens it in a window. Product links open in your normal browser. The code is in `electron/`.

### Install from the browser (PWA)

The deployed web version is also installable: in Chrome/Edge use the install icon in the address bar, on iPhone use *Share → Add to Home Screen*.

---

## Project structure

```
app/
  api/
    recommend/route.ts    # SSE pipeline: analyze+plan (parallel) → search → share
    share/[id]/route.ts   # GET shared result
  results/[id]/           # shared result page + generated Open Graph image
  layout.tsx, page.tsx
components/
  ImageUploader.tsx       # drag & drop, compression, form inputs
  ResultsPanel.tsx        # colors (click to copy), style, dimensions
  ProductsPanel.tsx       # product grid, alternatives, set total
  ShareButton.tsx, ResetButton.tsx, Skeleton.tsx, IssuesPanel.tsx
lib/
  gemini.ts, prompts.ts   # Gemini models, system instructions, JSON schemas
  serpapi.ts              # Google Shopping wrapper: options, budget filter, URL safety
  validation.ts           # request parsing, analysis schema checks
  kv.ts                   # dependency-free Redis REST client (Upstash / Vercel KV)
  share-store.ts          # shared results (Redis, memory fallback)
  rate-limit.ts           # distributed rate limiter (Redis, memory fallback)
  async.ts                # timeouts linked to client aborts, retry with backoff
  sse.ts                  # SSE formatting + incremental parser
  recommend-client.ts     # browser client for the SSE endpoint
  image.ts, products.ts, color.ts, budget.ts, types.ts
tests/                    # Vitest
electron/                 # desktop app: main process, preload, setup screen
scripts/
  smoke-recommend.mjs
  prepare-desktop.mjs     # copies static assets into the standalone server
```

---

## Known limitations

- Without Redis configured, shared results live in memory and disappear on restart.
- Photos are never saved — only the analysis and product list go into the share store.
- The Google Shopping price filter (`tbs ppr_max`) is best-effort; results with a known price above budget are dropped server-side, results without a price are kept.
- HEIC photos can't be decoded by most non-Safari browsers, so they're sent uncompressed; if they exceed the size limit the user is asked to export as JPG.
- The project is pinned to Next.js 14.2.x. `npm audit` reports 4 high-severity advisories on Next 14 (image optimizer DoS, request smuggling, SSRF on websocket upgrades, cache poisoning); all fixes require a major bump to Next 16, which is a separate review.

---

## License

[MIT](./LICENSE) — Nassim, 2026
