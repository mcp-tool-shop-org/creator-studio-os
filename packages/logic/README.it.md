<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.md">English</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/logic

> Strumenti di Logic Pro per Creator Studio OS: gestione del ciclo di vita e passaggio di file di progetto `.logicx`.

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-100%25-brightgreen.svg" alt="Coverage 100%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Parte del piano di controllo MCP (Management Control Plane) di [Creator Studio OS](../../README.md) per le applicazioni Apple Creator Studio.

---

## Installazione

```bash
npm install @creator-studio-os/logic
```

Richiede Logic Pro (Creator Studio) e macOS 13 o versioni successive.

## Cosa fa questo pacchetto

Logic Pro non espone **nessuna interfaccia AppleScript**; non esiste un dizionario sdef. `@creator-studio-os/logic` gestisce ciò che è possibile: avviare Logic, verificare se è in esecuzione e aprire file di progetto `.logicx` tramite `open -b com.apple.logic10`. Ulteriori automatismi dopo l'apertura sono a carico dell'utente nell'interfaccia grafica di Logic.

## Strumenti (3)

| Strumento | Descrizione |
|------|-------------|
| `logic_app_open` | Avvia Logic Pro (nessuna azione se già in esecuzione) |
| `logic_app_running` | Verifica se Logic Pro è in esecuzione |
| `logic_open` | Apri un file di progetto `.logicx` – Logic si avvia e lo apre |

## Esempio

```typescript
import { registerLogicTools } from "@creator-studio-os/logic";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "csos", version: "2.0.0" });
registerLogicTools(server);
```

Apri un progetto Logic:

```json
// Tool: logic_open
{ "path": "/projects/csos-showcase/audio/session.logicx" }
```

## Profilo di ripristino

```typescript
import { recovery } from "@creator-studio-os/logic";
// recovery.app === "logic"
// recovery.badStatePattern === null  (no bad-state detection for Logic)
```

## Requisito macOS

`@creator-studio-os/logic` è disponibile solo per macOS (`"os": ["darwin"]`). È necessario Logic Pro, che viene fornito come parte dell'abbonamento Apple Creator Studio.

---

[README principale](../../README.md) · [Registro delle modifiche](../../CHANGELOG.md) · [Sicurezza](../../SECURITY.md)
