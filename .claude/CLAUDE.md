# RoomAdvisor — Claude Code Instructions

## Progetto
App web che analizza foto di stanze tramite Claude Vision e restituisce consigli
d'arredo personalizzati con link d'acquisto reali. Stack: Next.js 14 + Claude API
+ SerpAPI. Deploy locale in sviluppo, potenzialmente pubblico in futuro.

## MVP Core
Upload 1-3 foto → analisi colori/stile/dimensioni → 3-5 pezzi consigliati con
nome, descrizione, link acquisto.

## Stack e versioni
- Next.js 14 (App Router)
- React 18
- TypeScript 5
- Claude API (claude-sonnet-4-20250514, vision)
- SerpAPI (ricerca prodotti)
- Tailwind CSS 3
- Node.js 20+

## Comandi
```bash
npm run dev          # Avvia server locale su localhost:3000
npm run build        # Build produzione
npm run lint         # ESLint
npm run type-check   # tsc --noEmit
```

## Struttura file — convenzioni
- API routes in `app/api/[nome]/route.ts`
- Componenti in `components/[Nome].tsx` — PascalCase
- Logica pura in `lib/[nome].ts` — camelCase
- Tipi condivisi in `lib/types.ts`
- Variabili d'ambiente solo via `process.env` — mai inline

## NEVER
- NEVER hardcode API keys, token o secrets nel codice
- NEVER modificare `.env.local` — suggerisci le variabili, non scriverle
- NEVER saltare TypeScript — niente `any` impliciti, niente `@ts-ignore` senza commento
- NEVER modificare file fuori dalla root del progetto
- NEVER fare chiamate dirette a Claude API o SerpAPI dal frontend — solo tramite API routes
- NEVER committare `node_modules/`, `.env.local`, `.next/`
- NEVER procedere a implementare se il piano non è stato confermato dall'utente

## ALWAYS
- ALWAYS eseguire `npm run type-check` dopo modifiche a file TypeScript
- ALWAYS eseguire `npm run lint` prima di considerare uno step completato
- ALWAYS usare Plan Mode (`/plan`) prima di ogni nuova feature o refactor
- ALWAYS fare commit prima di iniziare una nuova feature
- ALWAYS tenere le API routes sotto `app/api/` — nessuna logica di business nei componenti
- ALWAYS gestire esplicitamente gli errori nelle chiamate API (try/catch + risposta strutturata)

## Context management
- Se il context supera il 40%, esegui `/compact` con hint:
  "Stiamo costruendo RoomAdvisor. Ultimo step completato: [descrivi]. Prossimo: [descrivi]."
- Se il context supera il 70%, `/clear` e riparti da CLAUDE.md
- Segnala proattivamente quando il context si avvicina alla soglia

## Variabili d'ambiente richieste
```
ANTHROPIC_API_KEY=
SERPAPI_KEY=
```
Entrambe vanno in `.env.local` — mai altrove.

## Note architetturali
- Il frontend non chiama mai API esterne direttamente: tutto passa per `app/api/`
- L'analisi immagini avviene server-side per non esporre la API key
- Le immagini caricate non vengono salvate su disco — elaborazione in memoria per il MVP
