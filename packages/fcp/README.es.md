<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.md">English</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/fcp

> Herramientas para Final Cut Pro en Creator Studio OS: creación de archivos FCPXML 1.14, validación de DTD, importación a FCP e inspección de la biblioteca de AppleScript.

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-97%25-brightgreen.svg" alt="Coverage 97%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Parte del plano de control MCP para aplicaciones de Apple Creator Studio.

---

## Instalación

```bash
npm install @creator-studio-os/fcp
```

Requiere Final Cut Pro (Creator Studio o versión independiente) y macOS 13 o superior.

## ¿Qué hace este paquete?

La interfaz de AppleScript de Final Cut Pro es de **solo lectura**: puede inspeccionar bibliotecas y metadatos, pero no puede crear líneas de tiempo mediante AppleScript. La ruta de creación admitida es la importación de FCPXML.

`@creator-studio-os/fcp` es el puente: crea líneas de tiempo como especificaciones JSON, genera y valida FCPXML 1.14 (o 1.13), escribe en el disco y activa la importación a FCP, todo en una sola llamada.

## Herramientas (22)

| Herramienta | Descripción |
|------|-------------|
| `fcp_project_list` | Lista los proyectos en el directorio de datos. |
| `fcp_project_create` | Crea un directorio de proyecto con la estructura de subdirectorios estándar. |
| `fcp_project_info` | Lee los metadatos del proyecto y las rutas resueltas. |
| `fcp_fcpxml_build` | Crea una línea de tiempo a partir de una especificación JSON: clips, títulos, transiciones, audio. |
| `fcp_fcpxml_validate` | Valida el archivo FCPXML contra el DTD incluido (`xmllint`). |
| `fcp_fcpxml_write` | Escribe un documento FCPXML en el directorio `fcp/` de un proyecto. |
| `fcp_fcpxml_import` | Abre un archivo FCPXML en Final Cut Pro. |
| `fcp_fcpxml_build_write_import` | Genera, valida, escribe e importa en una sola llamada. |
| `fcp_library_list` | Lista las bibliotecas abiertas en Final Cut Pro. |
| `fcp_library_events` | Lista los eventos dentro de una biblioteca abierta. |
| `fcp_event_projects` | Lista los proyectos dentro de un evento. |
| `fcp_project_metadata` | Lee los metadatos de la secuencia (duración, velocidad de fotogramas, formato de código de tiempo). |
| `fcp_safety_compound` | Comprueba si hay superposiciones de clips principales que causan clips compuestos implícitos. |
| `fcp_safety_captions` | Verifica la asignación de roles de subtítulos para el formato requerido por FCP. |
| `fcp_safety_anchors` | Detecta colisiones de anclajes de títulos entre carriles. |
| `fcp_app_open` | Abre Final Cut Pro. |
| `fcp_app_activate` | Mueve Final Cut Pro al frente. |
| `fcp_app_running` | Comprueba si Final Cut Pro se está ejecutando actualmente. |
| `fcp_bind_motion_param` | Lee los parámetros publicados de una plantilla de Motion. |
| `fcp_effects_catalog` | Recorre los directorios de plantillas de Motion y devuelve un catálogo de todos los efectos. |
| `fcp_round_trip_diff` | Compara dos documentos FCPXML; detecta las 12 transformaciones de ida y vuelta conocidas de FCP. |
| `fcp_round_trip_capture` | Extrae el archivo FCPXML de un paquete de biblioteca de FCP. |

## Ejemplo

Crea e importa una línea de tiempo en una sola llamada:

```json
// Tool: fcp_fcpxml_build_write_import
{
  "projectName": "csos-showcase",
  "spec": {
    "format": { "frameDuration": "1001/30000s", "width": 1920, "height": 1080 },
    "primaryClips": [
      { "asset": "hook.mov", "offset": "0s", "duration": "5s" },
      { "asset": "fcp-demo.mov", "offset": "5s", "duration": "6s" }
    ],
    "titles": [
      { "lane": 1, "offset": "0s", "duration": "3s", "text": "Creator Studio OS" }
    ]
  }
}
```

## Generador de FCPXML

```typescript
import { buildFCPXML, validateFCPXML } from "@creator-studio-os/fcp";

const xml = buildFCPXML(spec);           // returns FCPXML string
const { valid, output } = validateFCPXML(xml);  // runs xmllint against bundled DTD
```

## Requisitos de macOS

`@creator-studio-os/fcp` es solo para macOS (`"os": ["darwin"]`). La validación de DTD utiliza `xmllint` de las Herramientas de la línea de comandos de Xcode. El DTD incluido es `FCPXMLv1_14.dtd` del paquete de la aplicación Final Cut Pro.

---

[README principal](../../README.md) · [Registro de cambios](../../CHANGELOG.md) · [Referencia de FCPXML](../../docs/reference/fcpxml.md)
