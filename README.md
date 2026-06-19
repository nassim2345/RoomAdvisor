# RoomAdvisor

Upload 1–3 photos of a room. Get a style analysis and a short list of furniture you can actually buy.

The analysis shows up first — dominant colors, aesthetic, estimated dimensions. Then products appear one at a time as the search runs. No spinner for 20 seconds.

---

## How it works

You upload photos. Two things happen in parallel: one model looks at the room and describes it, another plans which furniture categories would work. Then it searches Google Shopping for each category and streams results back as they arrive.

If the photo isn't a room, it says so instead of returning garbage.

You can set a budget per item and enter the room dimensions manually if you want more accurate recommendations. There's a shareable link after each analysis — it expires after 24 hours.

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
| `node scripts/smoke-recommend.mjs` | Smoke test the main endpoint (needs dev server + a `test-room.jpg` in root) |

---

## Endpoints

**`POST /api/recommend`** — the only endpoint the client uses. Accepts `{ images, dimensions?, budget?, goal?, ownedItems? }`, returns `text/event-stream`. Emits `analysis`, then `product` events one by one, then `shared` and `done`. Emits `error` with code `NOT_A_ROOM` if the images don't show a room. Returns `HTTP 429 { code: "RATE_LIMITED" }` (plain JSON, not SSE) when the per-IP rate limit is hit.

**`GET /api/share/[id]`** — returns a saved result by ID. 404 if expired or not found.

---

## Deploy

Works on Vercel Hobby or Pro. The streaming endpoint sets `maxDuration = 60s` via segment config (`app/api/recommend/route.ts`); Hobby allows up to 300s, so no Pro plan is required for this MVP.

Three steps:

1. Import the GitHub repo into Vercel.
2. Set environment variables in the project settings:
   - `GEMINI_API_KEY`
   - `SERPAPI_KEY`
3. Deploy.

Security headers (`X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security`) and `productionBrowserSourceMaps: false` are configured in `next.config.mjs` and apply automatically.

**Honest note on rate limiting:** the in-memory limiter (10 req/IP/60s on `/api/recommend`) is a stopgap. On Vercel with multiple concurrent function instances the effective limit is roughly N×10 — it deters trivial abuse but does not protect against a determined attacker. For real protection put a distributed limiter (Upstash, Vercel KV) or a WAF in front.

---

## Project structure

```
app/
  api/
    recommend/route.ts    # SSE streaming endpoint
    share/[id]/route.ts   # GET shared result
  results/[id]/           # shared result page (read-only)
  layout.tsx, page.tsx
components/
  ImageUploader.tsx       # drag & drop, SSE consumer, budget/dimensions inputs
  ResultsPanel.tsx        # colors, style, dimensions
  ProductsPanel.tsx       # product grid, streams in incrementally
  ShareButton.tsx, ResetButton.tsx, Skeleton.tsx
lib/
  gemini.ts               # Gemini client, vision model, image planner model
  prompts.ts              # system instructions and JSON schemas
  serpapi.ts              # Google Shopping wrapper with price filter
  share-store.ts          # in-memory TTL store for shared results
  budget.ts, types.ts
scripts/smoke-recommend.mjs
```

---

## Known limitations

- Shared results are stored in memory. They disappear on server restart. In production, swap `lib/share-store.ts` for Redis or Vercel KV.
- Photos are never saved — only the analysis and product list go into the share store.
- Rate limiting is in-memory and per-instance, not distributed (see Deploy note above).
- The Google Shopping price filter (`tbs ppr_max`) is best-effort. Some results will be over budget.
- The project is pinned to Next.js 14.2.x. `npm audit` reports 4 high-severity advisories on Next 14 (image optimizer DoS, request smuggling, SSRF on websocket upgrades, cache poisoning); all fixes require a major bump to Next 16, which is a separate review.

---

## License

[MIT](./LICENSE) — Nassim, 2026
