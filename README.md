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

**`POST /api/recommend`** — the only endpoint the client uses. Accepts `{ images, dimensions?, budget? }`, returns `text/event-stream`. Emits `analysis`, then `product` events one by one, then `shared` and `done`. Emits `error` with code `NOT_A_ROOM` if the images don't show a room.

**`GET /api/share/[id]`** — returns a saved result by ID. 404 if expired or not found.

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
- No server-side rate limiting. Gemini and SerpAPI both have free-tier quotas that are enough for personal use, not for production traffic.
- The Google Shopping price filter (`tbs ppr_max`) is best-effort. Some results will be over budget.

---

## License

[MIT](./LICENSE) — Nassim, 2026
