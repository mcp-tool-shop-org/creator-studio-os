<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.md">English</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/iwork-docs

> Strumenti Pages e Numbers per Creator Studio OS: ciclo di vita dei documenti e dei fogli di calcolo, esportazione in formati multipli (PDF, Word, EPUB, Excel, CSV).

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-100%25-brightgreen.svg" alt="Coverage 100%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Parte del piano di controllo MCP per le applicazioni Apple Creator Studio.

---

## Installazione

```bash
npm install @creator-studio-os/iwork-docs
```

Richiede Pages e/o Numbers (inclusi in Apple iWork, disponibili gratuitamente sull'App Store di Mac) e macOS 13 o versioni successive.

## Cosa fa questo pacchetto

Controlla Apple Pages e Numbers tramite AppleScript: apre, chiude ed esporta documenti in diversi formati senza interagire con l'interfaccia grafica.

## Strumenti (10)

### Pages (5)

| Strumento | Descrizione |
|------|-------------|
| `pages_app_open` | Attiva Pages |
| `pages_app_running` | Verifica se Pages è in esecuzione |
| `pages_open` | Apre un documento Pages; restituisce il nome del documento |
| `pages_close` | Chiude un documento Pages (con possibilità di salvare) |
| `pages_export` | Esporta in PDF, Word, RTF, testo semplice o EPUB |

### Numbers (5)

| Strumento | Descrizione |
|------|-------------|
| `numbers_app_open` | Attiva Numbers |
| `numbers_app_running` | Verifica se Numbers è in esecuzione |
| `numbers_open` | Apre un documento Numbers; restituisce il nome del documento |
| `numbers_close` | Chiude un documento Numbers (con possibilità di salvare) |
| `numbers_export` | Esporta in PDF, Microsoft Excel o CSV |

## Esempio

```typescript
import { registerPagesTools, registerNumbersTools } from "@creator-studio-os/iwork-docs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "csos", version: "2.0.0" });
registerPagesTools(server);
registerNumbersTools(server);
```

Esporta un documento Pages in formato Word:

```json
// Tool: pages_export
{
  "documentName": "Creative Brief.pages",
  "outputPath": "/projects/brief.docx",
  "format": "Word"
}
```

Esporta un foglio di calcolo Numbers in formato CSV:

```json
// Tool: numbers_export
{
  "documentName": "Production Log.numbers",
  "outputPath": "/projects/log.csv",
  "format": "CSV"
}
```

## Profili di ripristino

```typescript
import { pagesRecovery, numbersRecovery } from "@creator-studio-os/iwork-docs";

// pagesRecovery.app   === "pages"
// numbersRecovery.app === "numbers"
```

## Requisiti macOS

`@creator-studio-os/iwork-docs` è disponibile solo per macOS (`"os": ["darwin"]`). Pages e Numbers devono essere installati e devono essere concesse le autorizzazioni di Accessibilità/Automazione al primo avvio.

---

[README principale](../../README.md) · [Registro delle modifiche](../../CHANGELOG.md) · [Sicurezza](../../SECURITY.md)
