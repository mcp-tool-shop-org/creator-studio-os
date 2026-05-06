<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.md">English</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/core

> Ambiente di esecuzione condiviso per Creator Studio OS: eseguitori di AppleScript, schema del progetto, registro, tipi di errore, automazione condivisa per iWork.

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-89%25-brightgreen.svg" alt="Coverage 89%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Parte del piano di controllo MCP (Management Control Plane) per le applicazioni Apple Creator Studio, come descritto in [Creator Studio OS](../../README.md).

---

## Installazione

```bash
npm install @creator-studio-os/core
```

## Cosa fa questo pacchetto

`@creator-studio-os/core` è l'ambiente di esecuzione di base condiviso da tutti gli altri pacchetti `@creator-studio-os/*`. Fornisce:

- **Eseguitori di AppleScript** — `runAppleScript`, `runApp`, `awaitOutput`, `openApp`, `withDaemonRecovery`
- **Schema del progetto** — Schema Zod `ProjectV2`, resolver e mappa di percorsi tipizzata
- **Sistema di errori** — `CreatorStudioError` con struttura `{ code, message, hint }`
- **Configurazione** — `loadConfig()` legge `CREATOR_STUDIO_DATA_DIR` e tutti gli ID bundle delle applicazioni
- **Registro** — Registro strutturato della cronologia dei progetti in `<dataDir>/.csos/ledger.jsonl`
- **Integrazione con iWork** — `openDocumentInApp`, `closeDocumentInApp`, `exportDocumentInApp`, `activateApp`, `isAppRunning`

## Strumento (1)

| Strumento | Descrizione |
|------|-------------|
| `csos_app_status` | Verifica se una qualsiasi applicazione Creator Studio è in esecuzione e funzionante correttamente. Passare `app="all"` per interrogare tutte e 8 contemporaneamente. |

## Esempio

```typescript
import {
  runAppleScript,
  CreatorStudioError,
  loadConfig,
  registerStatusTool,
} from "@creator-studio-os/core";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "csos", version: "2.0.0" });
registerStatusTool(server);

// Escape user input before interpolation — always
const name = escapeAppleScriptString(userInput);
const result = await runAppleScript(`tell app "Keynote" to get name of document "${name}"`);
```

## Gestione degli errori

Tutti gli errori di runtime sono di tipo `CreatorStudioError`:

```typescript
import { CreatorStudioError } from "@creator-studio-os/core";

try {
  await runAppleScript(`...`);
} catch (err) {
  if (err instanceof CreatorStudioError) {
    console.error(err.code);   // "E_OSASCRIPT_FAILED", "E_AUTOMATION_DENIED", …
    console.error(err.hint);   // actionable suggestion
  }
}
```

## Requisiti macOS

`@creator-studio-os/core` è disponibile solo per macOS (`"os": ["darwin"]`). Gli eseguitori di AppleScript invocano `osascript`; `openApp` utilizza `open -b <bundleId>`.

---

[README principale](../../README.md) · [Registro delle modifiche](../../CHANGELOG.md) · [Sicurezza](../../SECURITY.md)
