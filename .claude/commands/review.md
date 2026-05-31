# /review

Esegui una review completa del codice modificato in questa sessione.

Controlla in ordine:
1. **TypeScript** — niente `any` impliciti, tipi corretti su props e return values
2. **Sicurezza** — nessuna API key inline, nessuna chiamata API dal frontend, tutti gli input utente validati
3. **Errori non gestiti** — ogni chiamata async ha try/catch con risposta strutturata
4. **Convenzioni** — nomi file PascalCase per componenti, camelCase per lib, API routes sotto `app/api/`
5. **Performance** — immagini elaborate server-side, nessuna operazione pesante nel render
6. **NEVER violations** — verifica che nessuna regola del CLAUDE.md sezione NEVER sia stata violata

Per ogni problema trovato: indica file, riga, problema, soluzione concreta.
Se non ci sono problemi, scrivi esplicitamente: "Nessuna violazione rilevata."

Dopo la review, esegui `npm run type-check` e `npm run lint` e riporta l'output.
