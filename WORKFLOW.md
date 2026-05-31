# RoomAdvisor — Workflow Operativo

Ciclo standard da seguire per ogni nuova feature, senza eccezioni.

---

## Ciclo per ogni feature

### 1. PLAN (prima di toccare qualsiasi file)
```
/plan-feature [descrizione della feature]
```
- Leggi il piano prodotto da Claude Code
- Verifica che i file coinvolti siano solo dentro `room-advisor/`
- Verifica che non ci siano chiamate API dirette dal frontend
- **Conferma esplicitamente**: scrivi "ok procedi" o richiedi modifiche al piano
- NON lasciare che Claude Code inizi senza la tua conferma

### 2. IMPLEMENT (un step alla volta)
- Claude Code implementa **un solo step** del piano per volta
- Dopo ogni step: leggi il diff, capisci cosa è cambiato
- Se qualcosa non torna: scrivi "stop" e chiedi spiegazione prima di accettare
- Tieni d'occhio il context: ogni 30-40 minuti esegui `/context-status`

### 3. TEST (dopo ogni step accettato)
```bash
npm run type-check   # zero errori TypeScript
npm run lint         # zero warning ESLint
npm run dev          # verifica visiva nel browser su localhost:3000
```
- Se un test fallisce: risolvilo prima di passare allo step successivo
- Non accumulare errori — ogni step deve lasciare il progetto in stato funzionante

### 4. CHECKPOINT (dopo ogni step verificato)
```
/checkpoint
```
- Esegue type-check + lint + commit automaticamente
- Il commit fissa uno stato sicuro a cui tornare se qualcosa si rompe
- Messaggio commit generato automaticamente — leggilo e confermalo

### 5. REVIEW (prima di ogni sessione di deploy o merge)
```
/review
```
- Controlla sicurezza, convenzioni, errori non gestiti
- Risolvi tutto ciò che segnala prima di procedere

---

## Gestione context window

| Soglia | Segnale | Azione |
|--------|---------|--------|
| <40%   | Claude Code risponde veloce e preciso | Continua normalmente |
| 40-70% | Risposte più generiche, ripete cose già dette | `/compact` con hint preciso |
| >70%   | Inizia a ignorare CLAUDE.md, inventa API, modifica file sbagliati | `/clear` immediato |

**Hint da usare con `/compact`:**
```
Stiamo costruendo RoomAdvisor (Next.js 14 + Claude Vision + SerpAPI).
Ultimo step completato: [descrivi in una frase].
Prossimo step: [descrivi in una frase].
Stack: Next.js 14, TypeScript, Tailwind, App Router.
Le API keys sono in .env.local. Le route API sono in app/api/.
```

---

## Gestione errori e regressioni

**Se qualcosa si rompe dopo un accept:**
```bash
git rewind    # torna all'ultimo commit stabile
```
oppure
```bash
git log --oneline   # trova il commit stabile
git checkout [hash] -- [file]   # ripristina file specifico
```

**Se Claude Code modifica file non autorizzati:**
- Scrivi "stop" immediatamente
- Esegui `git diff` per vedere tutti i cambiamenti
- Fai `git checkout .` per annullare tutto
- Riparti con `/plan-feature` e un piano più specifico

**Se la risposta di Claude Code sembra vaga o generica:**
- Esegui `/context-status`
- Se context è alto: `/compact` con hint, poi ripeti la domanda
- Non accettare codice che non capisci

---

## Sequenza di avvio sessione

Ogni volta che apri Claude Code su questo progetto:

1. `cd C:\Users\nassi\Desktop\RoomAdvisor`
2. `claude` — avvia Claude Code
3. Claude Code carica CLAUDE.md automaticamente
4. Scrivi: "Riprendi da: [ultimo step completato]"
5. Verifica che Claude Code citi correttamente lo stack e le convenzioni prima di procedere

---

## Ordine di implementazione MVP

1. Setup progetto Next.js + TypeScript + Tailwind
2. Componente upload foto (1-3 immagini, preview)
3. API route `/api/analyze` — riceve immagini, chiama Claude Vision
4. Prompt Claude Vision per analisi stanza (colori, stile, dimensioni)
5. API route `/api/products` — riceve output analisi, chiama SerpAPI
6. Componente risultati (3-5 prodotti con nome, descrizione, link)
7. Collegamento UI completo upload → analisi → risultati
8. Gestione errori e stati di caricamento
