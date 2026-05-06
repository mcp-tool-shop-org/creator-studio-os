<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.md">English</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/logic

> Outils Logic Pro pour Creator Studio OS : gestion du cycle de vie et transmission de fichiers de projet `.logicx`.

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-100%25-brightgreen.svg" alt="Coverage 100%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Fait partie du plan de contrôle MCP de [Creator Studio OS](../../README.md) pour les applications Apple Creator Studio.

---

## Installation

```bash
npm install @creator-studio-os/logic
```

Nécessite Logic Pro (Creator Studio) et macOS 13 ou version ultérieure.

## Ce que fait ce paquet

Logic Pro n'expose **aucune interface AppleScript** ; il n'y a pas de dictionnaire sdef. `@creator-studio-os/logic` gère ce qui est possible : le lancement de Logic, la vérification de son état de fonctionnement et l'ouverture de fichiers de projet `.logicx` via `open -b com.apple.logic10`. Toute automatisation supplémentaire après l'ouverture est à la charge de l'utilisateur dans l'interface graphique de Logic.

## Outils (3)

| Outil | Description |
|------|-------------|
| `logic_app_open` | Ouvre Logic Pro (sans effet si Logic est déjà en cours d'exécution) |
| `logic_app_running` | Vérifie si Logic Pro est en cours d'exécution |
| `logic_open` | Ouvre un fichier de projet `.logicx` : Logic se lance et l'ouvre. |

## Exemple

```typescript
import { registerLogicTools } from "@creator-studio-os/logic";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "csos", version: "2.0.0" });
registerLogicTools(server);
```

Ouvrir un projet Logic :

```json
// Tool: logic_open
{ "path": "/projects/csos-showcase/audio/session.logicx" }
```

## Profil de récupération

```typescript
import { recovery } from "@creator-studio-os/logic";
// recovery.app === "logic"
// recovery.badStatePattern === null  (no bad-state detection for Logic)
```

## Exigence macOS

`@creator-studio-os/logic` est uniquement compatible avec macOS (`"os": ["darwin"]`). Logic Pro est requis ; il est fourni avec l'abonnement Apple Creator Studio.

---

[README principal](../../README.md) · [Journal des modifications](../../CHANGELOG.md) · [Sécurité](../../SECURITY.md)
