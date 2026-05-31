# /debug-api

Diagnostica un problema con una API route di RoomAdvisor.

Esegui in ordine:
1. **Identifica la route** — quale file in `app/api/` è coinvolto
2. **Leggi il file** — mostra il codice attuale della route
3. **Controlla il tipo di errore**:
   - Errore TypeScript → mostra il tipo atteso vs ricevuto
   - Errore runtime → traccia il flusso dati dall'input alla risposta
   - Errore API esterna (Claude/SerpAPI) → verifica struttura della richiesta e gestione della risposta
4. **Verifica sicurezza**:
   - Le variabili d'ambiente sono lette con `process.env`?
   - L'input utente è validato prima di essere passato all'API?
   - Il try/catch copre tutto il blocco async?
5. **Proponi fix** — codice corretto con spiegazione del problema

NON modificare il file prima che l'utente abbia confermato il fix proposto.
