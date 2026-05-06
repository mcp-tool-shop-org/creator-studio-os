<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.md">English</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/compressor

> Herramientas de compresión para Creator Studio OS: codificación sin interfaz gráfica, trabajos por lotes, transmisión en vivo del progreso y recuperación del demonio.

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-95%25-brightgreen.svg" alt="Coverage 95%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Parte del plano de control MCP para aplicaciones de Apple Creator Studio.

---

## Instalación

```bash
npm install @creator-studio-os/compressor
```

Requiere Compressor (parte de Apple Creator Studio) y macOS 13 o superior.

## ¿Qué hace este paquete?

Controla Apple Compressor a través de su interfaz de línea de comandos (CLI) (`-jobpath`, `-monitor`). No requiere scripting de la interfaz gráfica. Permite enviar trabajos de codificación, transmitir el progreso en vivo, inspeccionar archivos `.compressorsetting` y recuperarse de fallos del demonio.

## Herramientas (15)

| Herramienta | Descripción |
|------|-------------|
| `compressor_app_open` | Abre Compressor (idempotente; activa la licencia de compra en la primera ejecución). |
| `compressor_app_running` | Comprueba si Compressor se está ejecutando actualmente. |
| `compressor_encode` | Envía un único trabajo de codificación a la cola de Compressor a través de la CLI. |
| `compressor_encode_project` | Envoltorio para trabajos de codificación para flujos de trabajo específicos del proyecto csos. |
| `compressor_status` | Comprobación de estado única para un trabajo o lote (percentComplete, timeRemaining, etc.). |
| `compressor_monitor_stream` | Transmite el progreso de la codificación a través de `-monitor -format json`; emite StatusFrames periódicos. |
| `compressor_pause` | Pausa un trabajo o lote. |
| `compressor_resume` | Reanuda un trabajo o lote pausado. |
| `compressor_kill` | Cancela un trabajo o lote. |
| `compressor_wait_for` | Espera hasta que un trabajo alcance un estado final (completado/fallido/cancelado). |
| `compressor_settings_list` | Lista los ajustes de codificación disponibles con sus indicadores de disponibilidad. |
| `compressor_settings_inspect` | Analiza un archivo `.compressorsetting`: códec, bitrate, dimensiones, metadatos HDR. |
| `compressor_settings_resolve` | Busca la ruta de un archivo `.compressorsetting` a partir de su nombre para mostrar. |
| `compressor_locations_list` | Lista las ubicaciones de salida disponibles para Compressor. |
| `compressor_codec_availability` | Informa qué códecs están disponibles en este host. |

## Ejemplo

```typescript
import { registerCompressorTools } from "@creator-studio-os/compressor";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "csos", version: "2.0.0" });
registerCompressorTools(server);
```

Envía un trabajo de codificación y transmite el progreso:

```json
// Tool: compressor_encode
{
  "inputPath": "/projects/csos-showcase/out/timeline.mov",
  "settingName": "Apple ProRes 422",
  "outputPath": "/projects/csos-showcase/out/final.mov"
}

// Tool: compressor_monitor_stream
{ "jobId": "<returned jobId>" }
```

## Recuperación

```typescript
import { recovery } from "@creator-studio-os/compressor";

// recovery.app === "compressor"
// recovery.recover() restarts the Compressor daemon if it hangs
```

El perfil `recovery` se integra con `withDaemonRecovery` de `@creator-studio-os/core` para reiniciar automáticamente el demonio en caso de fallo.

## Requisito de macOS

`@creator-studio-os/compressor` es exclusivo de macOS (`"os": ["darwin"]` en `package.json`). La ruta de la CLI de Compressor se resuelve en tiempo de ejecución a partir del paquete de la aplicación instalada.

---

[README principal](../../README.md) · [Registro de cambios](../../CHANGELOG.md) · [Seguridad](../../SECURITY.md)
