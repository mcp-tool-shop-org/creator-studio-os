<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.md">English</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/protocols

> Protocolos de composición entre aplicaciones para Creator Studio OS: flujos de trabajo "brand-deck-minimal" y "steam-trailer-minimal".

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-85%25-brightgreen.svg" alt="Coverage 85%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Parte del plano de control MCP (Management Control Plane) para las aplicaciones de Apple Creator Studio.

---

## Instalación

```bash
npm install @creator-studio-os/protocols
```

Requiere las ocho aplicaciones de Creator Studio y macOS 13 o superior.

## ¿Qué hace este paquete?

`@creator-studio-os/protocols` orquesta todo el flujo de trabajo entre aplicaciones: tarjetas de marca de Pixelmator → renderizado de tercio inferior en Motion → creación de FCPXML → importación en FCP → codificación con Compressor, todo en una única ejecución que se puede reanudar.

Los protocolos son **generadores paso a paso**: cada paso es idempotente y la ejecución se puede reanudar desde cualquier paso completado utilizando `--resume <taskId>`.

## Herramientas (3)

| Herramienta | Descripción |
|------|-------------|
| `csos_protocol_run` | Ejecuta un protocolo entre aplicaciones de principio a fin contra un archivo `project.json` de tipo `ProjectV2`. Devuelve un `taskId` inmediatamente; consulta el estado y el resumen del último paso. Admite `--resume <taskId>` para omitir los pasos ya completados. |
| `csos_protocol_list` | Lista todos los protocolos registrados con sus nombres, descripciones y número de pasos. |
| `csos_protocol_describe` | Describe un protocolo específico: propósito, nombres de los pasos y notas de uso. |

## Protocolos

### `brand-deck-minimal` (13 pasos)

El flujo de trabajo entre aplicaciones principal. Dado un archivo `project.json` de tipo `ProjectV2` con escenas definidas:

1. Valida las entradas y el esquema del proyecto.
2. Crea tarjetas de marca de Pixelmator por escena (usando los tokens `{{HEADLINE}}` y `{{SUBHEAD}}`).
3. *(opcional)* Renderiza una superposición de tercio inferior en Motion de forma autónoma a través de Compressor.
4. Crea una línea de tiempo FCPXML 1.14 a partir de la lista de escenas.
5. Valida el FCPXML contra el DTD incluido.
6. Escribe el FCPXML en `<project>/fcp/`.
7. Importa en Final Cut Pro.
8. Envía el trabajo de codificación principal a Compressor.
9. Envía el trabajo de codificación para redes sociales a Compressor.
10. Supervisa el progreso de la codificación hasta que finalice.
11. Verifica que los archivos de salida existen.
12. Escribe una entrada en el registro.
13. Devuelve el resumen del último paso.

### `steam-trailer-minimal`

Alias de `brand-deck-minimal` (v1.7.7+). Secuencia de pasos idéntica.

## Ejemplo

```typescript
import { registerProtocolTools } from "@creator-studio-os/protocols";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "csos", version: "2.0.0" });
registerProtocolTools(server);
```

Ejecuta todo el flujo de trabajo:

```json
// Tool: csos_protocol_run
{
  "protocol": "brand-deck-minimal",
  "projectPath": "/projects/csos-showcase/project.json"
}
// → { "taskId": "task_abc123", "status": "running" }

// Poll for completion:
// Tool: csos_protocol_describe — for step names
// Tool: csos_protocol_run with --resume <taskId> — to resume after interruption
```

## Reanudación

Cada paso guarda su salida en el registro del proyecto. Si una ejecución se interrumpe (fallo de Compressor, interrupción de la importación en FCP), se puede reanudar desde el último paso completado:

```json
// Tool: csos_protocol_run
{
  "protocol": "brand-deck-minimal",
  "projectPath": "/projects/csos-showcase/project.json",
  "resume": "task_abc123"
}
```

## Uso programático

```typescript
import { runProtocol, listProtocols, STEP_NAMES } from "@creator-studio-os/protocols";

for await (const step of runProtocol({ protocol: "brand-deck-minimal", projectPath: "..." })) {
  console.log(step.name, step.status);
}
```

## Requisitos de macOS

`@creator-studio-os/protocols` es exclusivo de macOS (`"os": ["darwin"]`). Se deben instalar las ocho aplicaciones de Creator Studio y se debe conceder permiso de automatización.

---

[README principal](../../README.md) · [Registro de cambios](../../CHANGELOG.md) · [Seguridad](../../SECURITY.md)
