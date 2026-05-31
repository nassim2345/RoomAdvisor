# /checkpoint

Esegui un commit git dello stato attuale e documenta il progresso.

Sequenza obbligatoria:
1. Esegui `npm run type-check` — se fallisce, segnala gli errori e NON procedere al commit
2. Esegui `npm run lint` — se fallisce, segnala gli errori e NON procedere al commit
3. Esegui `git status` per mostrare i file modificati
4. Esegui `git add .`
5. Esegui `git commit -m "[descrizione]"` con un messaggio descrittivo che include:
   - Cosa è stato implementato
   - Quale step del piano è stato completato
6. Mostra il log dell'ultimo commit con `git log -1`

Formato messaggio commit: `feat: [cosa fa] — step [N] completato`
Esempi:
- `feat: upload foto con preview — step 1 completato`
- `feat: API route analisi Claude Vision — step 2 completato`
- `fix: gestione errore upload file troppo grande`
