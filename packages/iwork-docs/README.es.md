<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.md">English</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/iwork-docs

> Herramientas de Pages y Numbers para Creator Studio OS: ciclo de vida de documentos y hojas de cálculo, exportación en múltiples formatos (PDF, Word, EPUB, Excel, CSV).

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-100%25-brightgreen.svg" alt="Coverage 100%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Parte del plano de control MCP para aplicaciones de Apple Creator Studio.

---

## Instalación

```bash
npm install @creator-studio-os/iwork-docs
```

Requiere Pages y/o Numbers (parte de Apple iWork, disponible de forma gratuita en la Mac App Store) y macOS 13 o superior.

## ¿Qué hace este paquete?

Controla Apple Pages y Numbers a través de AppleScript: abre, cierra y exporta documentos en múltiples formatos sin interactuar con la interfaz gráfica.

## Herramientas (10)

### Pages (5)

| Herramienta | Descripción |
|------|-------------|
| `pages_app_open` | Activar Pages |
| `pages_app_running` | Comprobar si Pages está en ejecución |
| `pages_open` | Abrir un documento de Pages; devuelve el nombre del documento |
| `pages_close` | Cerrar un documento de Pages (con opción de guardar) |
| `pages_export` | Exportar a PDF, Word, RTF, texto plano o EPUB |

### Numbers (5)

| Herramienta | Descripción |
|------|-------------|
| `numbers_app_open` | Activar Numbers |
| `numbers_app_running` | Comprobar si Numbers está en ejecución |
| `numbers_open` | Abrir un documento de Numbers; devuelve el nombre del documento |
| `numbers_close` | Cerrar un documento de Numbers (con opción de guardar) |
| `numbers_export` | Exportar a PDF, Microsoft Excel o CSV |

## Ejemplo

```typescript
import { registerPagesTools, registerNumbersTools } from "@creator-studio-os/iwork-docs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "csos", version: "2.0.0" });
registerPagesTools(server);
registerNumbersTools(server);
```

Exportar un documento de Pages a Word:

```json
// Tool: pages_export
{
  "documentName": "Creative Brief.pages",
  "outputPath": "/projects/brief.docx",
  "format": "Word"
}
```

Exportar una hoja de cálculo de Numbers a CSV:

```json
// Tool: numbers_export
{
  "documentName": "Production Log.numbers",
  "outputPath": "/projects/log.csv",
  "format": "CSV"
}
```

## Perfiles de recuperación

```typescript
import { pagesRecovery, numbersRecovery } from "@creator-studio-os/iwork-docs";

// pagesRecovery.app   === "pages"
// numbersRecovery.app === "numbers"
```

## Requisitos de macOS

`@creator-studio-os/iwork-docs` es solo para macOS (`"os": ["darwin"]`). Pages y Numbers deben estar instalados y se debe conceder el permiso de Accesibilidad/Automatización en la primera ejecución.

---

[README principal](../../README.md) · [Registro de cambios](../../CHANGELOG.md) · [Seguridad](../../SECURITY.md)
