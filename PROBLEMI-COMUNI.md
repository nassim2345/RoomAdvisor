# RoomAdvisor — Problemi Comuni e Soluzioni

---

## 1. Context drift tra sessioni
**Sintomo:** Apri Claude Code il giorno dopo e non ricorda lo stack, propone soluzioni
incompatibili con ciò che hai già costruito, chiama le cose con nomi diversi.

**Perché succede:** Claude Code non ha memoria tra sessioni. Ogni avvio è una sessione nuova.

**Soluzione:**
- CLAUDE.md viene caricato automaticamente — contiene stack, convenzioni, NEVER/ALWAYS
- All'avvio di ogni sessione scrivi sempre: "Riprendi da: [ultimo step completato]"
- Usa `/checkpoint` alla fine di ogni sessione — il messaggio del commit diventa
  il tuo riferimento per la sessione successiva
- Se Claude Code propone qualcosa di incompatibile con lo stack: cita esplicitamente
  il CLAUDE.md — "Nel CLAUDE.md è specificato X, procedi in quel modo"

---

## 2. Context rot (window >40-70%)
**Sintomo:** Claude Code inizia a inventare nomi di funzioni che non esistono, modifica
file già funzionanti senza motivo, ignora le convenzioni di naming, produce codice
con `any` di TypeScript o API keys inline.

**Perché succede:** Il context window si riempie e Claude Code perde di vista
le istruzioni iniziali. Le prime istruzioni (CLAUDE.md) vengono "schiacciate" dai
messaggi recenti.

**Soluzione per context 40-70%:**
```
/compact

Hint: Stiamo costruendo RoomAdvisor (Next.js 14 + Claude Vision + SerpAPI).
Ultimo step completato: [descrivi].
Prossimo step: [descrivi].
API keys in .env.local. Route API in app/api/. Componenti in components/.
```

**Soluzione per context >70%:**
```
/clear
```
Poi alla nuova sessione: "Riprendi da: [ultimo step]. Stack: Next.js 14,
TypeScript, Tailwind, Claude Vision API, SerpAPI. Leggi CLAUDE.md prima di procedere."

**Prevenzione:** Esegui `/context-status` ogni 30-40 minuti. Non aspettare i sintomi.

---

## 3. Scope drift (Claude Code modifica file non autorizzati)
**Sintomo:** Hai chiesto di modificare un componente e Claude Code ha riscritto
anche la API route, o ha modificato `package.json`, o ha creato file nuovi
non pianificati.

**Perché succede:** Senza un piano esplicito, Claude Code ottimizza in autonomia
oltre lo scope richiesto.

**Soluzione immediata:**
```bash
git diff        # vedi esattamente cosa è cambiato
git checkout .  # annulla TUTTO (torna all'ultimo commit)
```

**Prevenzione:**
- Usa SEMPRE `/plan-feature` prima di implementare — il piano lista i file esatti
- In Plan Mode Claude Code non scrive codice: solo pianifica
- Se il piano include file che non ti aspetti, chiedi spiegazione prima di confermare
- I commit frequenti con `/checkpoint` limitano il danno: il rollback è sempre
  a pochi minuti di lavoro, non ore

---

## 4. Regressioni silenziose
**Sintomo:** Una feature che funzionava smette di funzionare dopo modifiche
a un'altra parte del codice. TypeScript non segnala nulla ma il browser mostra errori.

**Perché succede:** Next.js App Router ha dipendenze implicite tra componenti e
route. Una modifica a `lib/types.ts` può rompere sia il frontend che il backend
senza errori evidenti in fase di scrittura.

**Soluzione:**
```bash
git log --oneline       # trova l'ultimo commit funzionante
git diff [hash] HEAD    # vedi tutte le differenze da quel punto
```
Per ripristinare un file specifico:
```bash
git checkout [hash] -- app/api/analyze/route.ts
```

**Prevenzione:**
- `npm run type-check` dopo OGNI modifica accettata — non solo a fine sessione
- `npm run dev` e test visivo nel browser dopo ogni step
- `/checkpoint` frequenti: ogni commit è un punto di ripristino
- Non accettare mai più di uno step alla volta senza verificare

---

## 5. Sicurezza base — API keys esposte
**Sintomo:** Le API keys di Anthropic o SerpAPI finiscono nel codice sorgente,
nel browser, o peggio su git.

**Perché succede:** Claude Code potrebbe hardcodare una key per "far funzionare
velocemente" qualcosa, o creare una chiamata API direttamente in un componente
React (che gira nel browser, quindi espone la key a chiunque apra i devtools).

**Regole non negoziabili:**
- Tutte le keys vivono SOLO in `.env.local` — mai in nessun altro file
- `.env.local` è in `.gitignore` — verificalo con `git status` prima del primo commit
- Le chiamate a Claude API e SerpAPI avvengono SOLO in `app/api/` (server-side)
- Il frontend chiama solo `/api/analyze` e `/api/products` — mai direttamente Anthropic o SerpAPI
- Se Claude Code propone codice con `process.env.ANTHROPIC_API_KEY` in un
  componente React: rifiuta e cita il CLAUDE.md

**Verifica immediata:**
```bash
git grep "ANTHROPIC_API_KEY" --cached   # cerca keys nei file tracciati da git
git grep "SERPAPI_KEY" --cached
```
Se trova risultati fuori da `.env.local`: rimuovi e aggiungi `.env.local` a `.gitignore`.

**Setup .gitignore — deve contenere almeno:**
```
.env.local
.env*.local
node_modules/
.next/
```

---

## 6. Problema specifico RoomAdvisor — immagini troppo grandi
**Sintomo:** L'upload di foto ad alta risoluzione causa timeout o errori 413
(payload too large) sulla API route.

**Perché succede:** Next.js ha un limite di default sul body size delle API routes.
Foto da smartphone moderne superano facilmente i 4-10MB.

**Soluzione da implementare nello step 2 (upload):**
- Resize client-side prima dell'upload con `canvas` API — max 1200px sul lato lungo
- Converti in JPEG con qualità 0.85 prima di inviare
- Aggiungi in `app/api/analyze/route.ts`:
```typescript
export const config = {
  api: { bodyParser: { sizeLimit: '10mb' } }
}
```
- Segnala questo rischio a Claude Code durante `/plan-feature` dello step upload

---

## Checklist pre-deploy (quando vorrai rendere l'app pubblica)

- [ ] `npm run build` completa senza errori
- [ ] Nessuna API key in chiaro nel codice (`git grep` pulito)
- [ ] `.env.local` non committato (`git status` pulito)
- [ ] Tutti gli input utente validati nelle API routes
- [ ] Gestione errori su tutte le chiamate a Claude API e SerpAPI
- [ ] Rate limiting considerato (Claude API ha costi per chiamata)
- [ ] `/review` eseguito e output pulito
