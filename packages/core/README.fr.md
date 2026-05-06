<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.md">English</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/core

> Environnement d'exécution partagé pour Creator Studio OS : exécuteurs AppleScript, schéma de projet, registre, types d'erreurs, automatisation partagée iWork.

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-89%25-brightgreen.svg" alt="Coverage 89%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Fait partie du plan de contrôle MCP (MCP Control Plane) de [Creator Studio OS](../../README.md) pour les applications Apple Creator Studio.

---

## Installation

```bash
npm install @creator-studio-os/core
```

## Ce que fait ce paquet

`@creator-studio-os/core` est la base de l'environnement d'exécution partagée par tous les autres paquets `@creator-studio-os/*`. Il fournit :

- **Exécuteurs AppleScript** — `runAppleScript`, `runApp`, `awaitOutput`, `openApp`, `withDaemonRecovery`
- **Schéma de projet** — Schéma Zod `ProjectV2`, résolveur et carte de chemins typés
- **Système d'erreurs** — `CreatorStudioError` avec une structure `{ code, message, hint }`
- **Configuration** — `loadConfig()` lit `CREATOR_STUDIO_DATA_DIR` et tous les identifiants de bundle des applications
- **Registre** — Enregistrement structuré de l'historique des projets à `<dataDir>/.csos/ledger.jsonl`
- **iWork partagé** — `openDocumentInApp`, `closeDocumentInApp`, `exportDocumentInApp`, `activateApp`, `isAppRunning`

## Outil (1)

| Outil | Description |
|------|-------------|
| `csos_app_status` | Vérifie si une application Creator Studio est en cours d'exécution et fonctionne correctement. Passez `app="all"` pour interroger les 8 applications en même temps. |

## Exemple

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

## Gestion des erreurs

Toutes les erreurs d'exécution sont des `CreatorStudioError` :

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

## Prérequis macOS

`@creator-studio-os/core` est uniquement compatible avec macOS (`"os": ["darwin"]`). Les exécuteurs AppleScript invoquent `osascript` ; `openApp` utilise `open -b <bundleId>`.

---

[README principal](../../README.md) · [Journal des modifications](../../CHANGELOG.md) · [Sécurité](../../SECURITY.md)
