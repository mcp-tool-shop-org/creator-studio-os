<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.md">English</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/iwork-docs

> Outils Pages et Numbers pour Creator Studio OS — cycle de vie des documents et des feuilles de calcul, exportation dans plusieurs formats (PDF, Word, EPUB, Excel, CSV).

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-100%25-brightgreen.svg" alt="Coverage 100%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Fait partie du plan de contrôle MCP [Creator Studio OS](../../README.md) pour les applications Apple Creator Studio.

---

## Installation

```bash
npm install @creator-studio-os/iwork-docs
```

Nécessite Pages et/ou Numbers (inclus dans Apple iWork, disponible gratuitement sur le Mac App Store) et macOS 13 ou version ultérieure.

## Ce que fait ce paquet

Contrôle Apple Pages et Numbers via AppleScript — ouvre, ferme et exporte des documents dans plusieurs formats sans intervention sur l'interface graphique.

## Outils (10)

### Pages (5)

| Outil | Description |
|------|-------------|
| `pages_app_open` | Activer Pages |
| `pages_app_running` | Vérifie si Pages est en cours d'exécution |
| `pages_open` | Ouvre un document Pages ; renvoie le nom du document |
| `pages_close` | Ferme un document Pages (avec option de sauvegarde) |
| `pages_export` | Exporte au format PDF, Word, RTF, texte brut ou EPUB |

### Numbers (5)

| Outil | Description |
|------|-------------|
| `numbers_app_open` | Activer Numbers |
| `numbers_app_running` | Vérifie si Numbers est en cours d'exécution |
| `numbers_open` | Ouvre un document Numbers ; renvoie le nom du document |
| `numbers_close` | Ferme un document Numbers (avec option de sauvegarde) |
| `numbers_export` | Exporte au format PDF, Microsoft Excel ou CSV |

## Exemple

```typescript
import { registerPagesTools, registerNumbersTools } from "@creator-studio-os/iwork-docs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "csos", version: "2.0.0" });
registerPagesTools(server);
registerNumbersTools(server);
```

Exporte un document Pages au format Word :

```json
// Tool: pages_export
{
  "documentName": "Creative Brief.pages",
  "outputPath": "/projects/brief.docx",
  "format": "Word"
}
```

Exporte une feuille de calcul Numbers au format CSV :

```json
// Tool: numbers_export
{
  "documentName": "Production Log.numbers",
  "outputPath": "/projects/log.csv",
  "format": "CSV"
}
```

## Profils de récupération

```typescript
import { pagesRecovery, numbersRecovery } from "@creator-studio-os/iwork-docs";

// pagesRecovery.app   === "pages"
// numbersRecovery.app === "numbers"
```

## Exigence macOS

`@creator-studio-os/iwork-docs` est uniquement compatible avec macOS (`"os": ["darwin"]`). Pages et Numbers doivent être installés et l'autorisation d'accessibilité/automatisation doit être accordée lors de la première exécution.

---

[README principal](../../README.md) · [Journal des modifications](../../CHANGELOG.md) · [Sécurité](../../SECURITY.md)
