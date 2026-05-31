# /context-status

Valuta lo stato attuale del context window e fornisci indicazioni operative.

Produci un report con:
1. **Stima utilizzo context** — bassa (<40%) / media (40-70%) / alta (>70%)
2. **Ultimo step completato** — descrizione in una frase
3. **Prossimo step pianificato** — descrizione in una frase
4. **Raccomandazione**:
   - Se bassa: "Puoi continuare normalmente"
   - Se media: "Esegui `/compact` con questo hint: 'Stiamo costruendo RoomAdvisor. Ultimo step: [X]. Prossimo: [Y].'"
   - Se alta: "Esegui `/clear` ora. Prima di farlo, salva questo hint: [hint completo da usare all'inizio della prossima sessione]"

Lo scopo è prevenire il context rot prima che degradi la qualità delle risposte.
