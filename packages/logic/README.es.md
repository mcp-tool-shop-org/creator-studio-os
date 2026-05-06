<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.md">English</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/logic

> Herramientas de Logic Pro para Creator Studio OS: gestión del ciclo de vida y transferencia de proyectos `.logicx`.

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-100%25-brightgreen.svg" alt="Coverage 100%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Parte del plano de control MCP de [Creator Studio OS](../../README.md) para aplicaciones de Apple Creator Studio.

---

## Instalación

```bash
npm install @creator-studio-os/logic
```

Requiere Logic Pro (Creator Studio) y macOS 13 o superior.

## ¿Qué hace este paquete?

Logic Pro no expone **ninguna interfaz de AppleScript**: no existe ningún diccionario sdef. `@creator-studio-os/logic` gestiona lo que es posible: iniciar Logic, verificar si está en ejecución y abrir archivos de proyecto `.logicx` mediante `open -b com.apple.logic10`. La automatización posterior a la apertura depende del usuario en la interfaz gráfica de Logic.

## Herramientas (3)

| Herramienta | Descripción |
|------|-------------|
| `logic_app_open` | Abrir Logic Pro (sin efecto si ya está en ejecución). |
| `logic_app_running` | Comprobar si Logic Pro está en ejecución. |
| `logic_open` | Abrir un archivo de proyecto `.logicx`: Logic se inicia y lo abre. |

## Ejemplo

```typescript
import { registerLogicTools } from "@creator-studio-os/logic";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "csos", version: "2.0.0" });
registerLogicTools(server);
```

Abrir un proyecto de Logic:

```json
// Tool: logic_open
{ "path": "/projects/csos-showcase/audio/session.logicx" }
```

## Perfil de recuperación

```typescript
import { recovery } from "@creator-studio-os/logic";
// recovery.app === "logic"
// recovery.badStatePattern === null  (no bad-state detection for Logic)
```

## Requisitos de macOS

`@creator-studio-os/logic` es solo para macOS (`"os": ["darwin"]`). Se requiere Logic Pro, que se incluye como parte de la suscripción de Apple Creator Studio.

---

[README principal](../../README.md) · [Registro de cambios](../../CHANGELOG.md) · [Seguridad](../../SECURITY.md)
