## Scarica

| Sistema | File |
|---|---|
| **Windows** 10/11 | `RoomAdvisor-Setup-{{VERSION}}.exe` |
| **macOS** Apple Silicon (M1/M2/M3/M4) | `RoomAdvisor-{{VERSION}}-arm64.dmg` |
| **macOS** Intel | `RoomAdvisor-{{VERSION}}-x64.dmg` |
| macOS, in alternativa al DMG | `RoomAdvisor-{{VERSION}}-arm64-mac.zip` / `RoomAdvisor-{{VERSION}}-x64-mac.zip`: estrai e trascina l'app in Applicazioni |
| **Linux** (qualsiasi distro) | `RoomAdvisor-{{VERSION}}.AppImage` |
| **Linux** Debian / Ubuntu | `roomadvisor_{{VERSION}}_amd64.deb` |

Al primo avvio l'app chiede due chiavi API gratuite: [Gemini](https://aistudio.google.com/apikey) e [SerpAPI](https://serpapi.com/manage-api-key).

## Primo avvio

Gli installer non sono firmati digitalmente, quindi il sistema mostra un avviso:

- **Windows**: "Ulteriori informazioni" → "Esegui comunque".
- **macOS**: tasto destro sull'app → "Apri" → "Apri". Se dice che l'app è danneggiata, esegui una volta nel Terminale `xattr -cr /Applications/RoomAdvisor.app`.
- **Linux AppImage**: `chmod +x RoomAdvisor-{{VERSION}}.AppImage` e avvialo.
