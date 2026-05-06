<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.md">English</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/core

> Entorno de ejecución compartido para Creator Studio OS: ejecutores de AppleScript, esquema de proyecto, registro, tipos de error, automatización compartida de iWork.

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-89%25-brightgreen.svg" alt="Coverage 89%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Parte del plano de control MCP para aplicaciones de Apple Creator Studio, descrito en [Creator Studio OS](../../README.md).

---

## Instalación

```bash
npm install @creator-studio-os/core
```

## ¿Qué hace este paquete?

`@creator-studio-os/core` es la base del entorno de ejecución que comparten todos los demás paquetes `@creator-studio-os/*`. Proporciona:

- **Ejecutores de AppleScript:** `runAppleScript`, `runApp`, `awaitOutput`, `openApp`, `withDaemonRecovery`.
- **Esquema de proyecto:** Esquema `ProjectV2` de Zod, resolutor y mapa de rutas tipadas.
- **Sistema de errores:** `CreatorStudioError` con una estructura `{ código, mensaje, sugerencia }`.
- **Configuración:** `loadConfig()` lee `CREATOR_STUDIO_DATA_DIR` y todos los identificadores de paquetes de aplicaciones.
- **Registro:** Historial estructurado de proyectos y operaciones en `<dataDir>/.csos/ledger.jsonl`.
- **iWork compartido:** `openDocumentInApp`, `closeDocumentInApp`, `exportDocumentInApp`, `activateApp`, `isAppRunning`.

## Herramienta (1)

| Herramienta | Descripción |
|------|-------------|
| `csos_app_status` | Verifica si alguna aplicación de Creator Studio está en ejecución y funcionando correctamente. Pasa `app="all"` para consultar las 8 aplicaciones a la vez. |

## Ejemplo

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

## Manejo de errores

Todos los errores de tiempo de ejecución son `CreatorStudioError`:

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

## Requisitos de macOS

`@creator-studio-os/core` es exclusivo de macOS (`"os": ["darwin"]`). Los ejecutores de AppleScript invocan `osascript`; `openApp` utiliza `open -b <bundleId>`.

---

[README principal](../../README.md) · [Registro de cambios](../../CHANGELOG.md) · [Seguridad](../../SECURITY.md)
