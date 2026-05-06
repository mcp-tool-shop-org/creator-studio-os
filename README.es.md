<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.md">English</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="550">
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/creator-studio-os/actions/workflows/ci.yml"><img src="https://github.com/mcp-tool-shop-org/creator-studio-os/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <a href="https://mcp-tool-shop-org.github.io/creator-studio-os/"><img src="https://img.shields.io/badge/docs-handbook-informational" alt="Handbook"></a>
</p>

MCP (Media Content Protocol) para aplicaciones de Apple Creator Studio. Controle **Final Cut Pro**, **Compressor**, **Motion**, **Pixelmator Pro**, **Logic Pro**, **Keynote**, **Pages** y **Numbers** desde Claude o cualquier cliente MCP. Cree entregables de video a partir de una especificación JSON, renderice elementos gráficos de Motion sin interfaz gráfica, codifique mediante Compressor y genere recursos de marca en una única canalización que abarca varias aplicaciones.

> **v1.7.10** — 78 herramientas en las 8 aplicaciones de Apple Creator Studio. Protocolo de composición entre aplicaciones en funcionamiento: tarjetas de marca de Pixelmator + elementos gráficos ProRes 4444 de Motion + codificación final de Compressor. 9 de 9 fases de "smoke" completadas correctamente. Solo para macOS.

---

## ¿Por qué existe esto?

El diccionario de AppleScript de Final Cut Pro es de solo lectura: puede listar bibliotecas y leer metadatos, pero no puede crear líneas de tiempo mediante AppleScript. La ruta de creación admitida es la **importación de FCPXML**: escriba un documento FCPXML 1.14 bien formado, entréguelo a FCP y FCP creará el proyecto.

`creator-studio-os` es el puente: Claude crea líneas de tiempo como especificaciones JSON, el servidor construye y valida FCPXML, activa la importación de FCP, renderiza plantillas de elementos gráficos de Motion sin interfaz gráfica mediante Compressor y gestiona Pixelmator Pro para recursos de marca, todo en una única canalización que abarca varias aplicaciones.

## Seguridad

`creator-studio-os` se ejecuta completamente en el dispositivo. Realiza las siguientes acciones:

- Ejecuta `osascript` dirigido a aplicaciones por ID de paquete (nunca por nombre de archivo).
- Escribe solo dentro de `CREATOR_STUDIO_DATA_DIR`: no crea archivos del sistema, ni tampoco modifica el contenido interno de las bibliotecas de FCP.
- **No realiza llamadas de red**: no recopila datos de telemetría, ni análisis, ni validaciones remotas.
- **No persiste credenciales, tokens ni datos de usuario**.
- Escapa todas las cadenas proporcionadas por el usuario antes de la interpolación de AppleScript (`escapeAppleScriptString`).

Modelo de amenazas completo: [`docs/threat-model.md`](./docs/threat-model.md) · [`SECURITY.md`](./SECURITY.md)

## Instalación

```bash
npm install -g @mcptoolshop/creator-studio-os
```

Configuración del cliente MCP (`claude_desktop_config.json` o equivalente):

```json
{
  "mcpServers": {
    "creator-studio-os": {
      "command": "creator-studio-os",
      "args": ["serve"]
    }
  }
}
```

O mediante npx:

```json
{ "command": "npx", "args": ["-y", "@mcptoolshop/creator-studio-os", "serve"] }
```

## Verifique su configuración

```bash
creator-studio-os verify
```

Verifica la plataforma, `osascript`, `xmllint`, la instalación de Final Cut Pro, el DTD de FCPXML 1.14, el directorio de datos y ejecuta una operación de ida y vuelta de FCPXML a través del DTD incluido.

## Directorio de datos

Predeterminado: `/Volumes/T9-Shared/AI/creator-studio` (se puede sobrescribir con `CREATOR_STUDIO_DATA_DIR`).

```
creator-studio/
├── projects/
│   └── <name>/
│       ├── project.json     # ProjectV2 spec (scenes, deliverables, brand, scoreMap)
│       ├── footage/         # raw video
│       ├── audio/           # stems, voiceover, music
│       ├── images/          # stills, thumbnails, key art
│       ├── brand/           # logos, type, color tokens
│       ├── refs/            # mood, scripts, canon excerpts
│       ├── fcp/             # FCPXML output
│       └── out/             # rendered deliverables
└── shared/
    ├── brand/               # studio-wide assets
    └── presets/             # Compressor settings
```

## Protocolo entre aplicaciones: `brand-deck-minimal`

La canalización principal: 13 pasos desde una especificación `project.json` hasta un archivo ProRes MOV:

```bash
creator-studio-os protocol run brand-deck-minimal --project demo/csos-showcase/project.json
```

```
1  validate-project       — assert ProjectV2 schema + scene count
2  compose-brand-cards    — Pixelmator Pro: hue-rotated identity cards per scene
3  render-scene-clips     — Motion: clone template → patch title/subhead → Compressor ProRes 4444 render
4  edit-motion-title      — set project-level Motion template title
5  resolve-fcp-params     — compute timeline geometry
6  build-fcpxml           — write FCPXML 1.14 to out/fcp/
7  safety-preflight       — assert brand card files exist
8  dtd-validate           — xmllint against bundled FCP DTD
9  fcp-import             — open .fcpxml in Final Cut Pro
10 compressor-encode      — ffmpeg overlay (brand card + ProRes 4444 alpha clip) → Compressor final encode
11 monitor-encode         — poll encode until done
12 verify-output          — assert MOV exists and has bytes
13 write-replay-manifest  — finalise manifest with completedAt
```

El formato de `project.json`: [`src/projects/types.ts`](./src/projects/types.ts) · demostración: [`demo/csos-showcase/project.json`](./demo/csos-showcase/project.json)

## Herramientas

### Final Cut Pro (22 herramientas)

| Herramienta | Propósito |
|------|---------|
| `fcp_project_list` | Lista los proyectos en el directorio de datos |
| `fcp_project_create` | Crea un directorio de proyecto y un archivo `project.json` |
| `fcp_project_info` | Lee los metadatos del proyecto y las rutas resueltas |
| `fcp_fcpxml_build` | Crea un archivo FCPXML 1.14 a partir de una especificación JSON |
| `fcp_fcpxml_validate` | Valida el archivo FCPXML contra el DTD incluido |
| `fcp_fcpxml_write` | Escribe el archivo FCPXML en `projects/<nombre>/fcp/` |
| `fcp_fcpxml_import` | Abre un archivo FCPXML en Final Cut Pro |
| `fcp_fcpxml_build_write_import` | Proceso completo: creación → validación → escritura → importación |
| `fcp_library_list` | Lista las bibliotecas abiertas en FCP |
| `fcp_library_events` | Lista los eventos en una biblioteca |
| `fcp_event_projects` | Lista los proyectos en un evento |
| `fcp_project_metadata` | Lee la duración de la secuencia, la frecuencia de fotogramas y el formato de la señal de tiempo |
| `fcp_app_open` / `fcp_app_running` / `fcp_app_activate` | Ciclo de vida |
| `fcp_round_trip_diff` | Compara dos archivos FCPXML y genera una diferencia estructurada |
| `fcp_fcpxml_add_title` | Agrega un clip de efecto de títulos a una secuencia |
| `fcp_fcpxml_add_transition` | Agrega una transición entre clips |
| `fcp_fcpxml_add_marker` | Agrega un marcador de capítulo/tarea pendiente/completado |
| `fcp_safety_preflight` | Verifica que todos los archivos fuente de FCPXML existan antes de la importación |
| `fcp_multicam_build` | Crea un clip multicámara a partir de las especificaciones de los ángulos |
| `fcp_caption_build` | Construir una pista de subtítulos a partir de una transcripción. |
| `fcp_compound_clip_build` | Construir un clip compuesto a partir de especificaciones de secuencia anidadas. |

### Compresor (15 herramientas)

Compresor no tiene diccionario de AppleScript; la interfaz es la línea de comandos más los archivos `.compressorbatch`. La primera ejecución por sesión activa la validación de la licencia de la App Store (esperado).

| Herramienta | Propósito |
|------|---------|
| `compressor_app_open` / `compressor_app_running` | Ciclo de vida |
| `compressor_settings_list` | Enumerar las configuraciones predefinidas `.compressorsetting`. |
| `compressor_locations_list` | Enumerar los archivos `.compressorlocation`. |
| `compressor_encode` | Enviar un único trabajo de codificación. |
| `compressor_encode_project` | Codificar en relación con el directorio de un proyecto. |
| `compressor_monitor_stream` | Transmitir los fotogramas de progreso de la codificación. |
| `compressor_job_status` | Consultar el estado de un único trabajo. |
| `compressor_batch_status` | Consultar el estado de todos los trabajos por lotes activos. |
| `compressor_cancel_job` | Cancelar un trabajo activo. |
| `compressor_settings_inspect` | Inspeccionar un archivo `.compressorsetting`. |
| `compressor_batch_build` | Construir un documento XML `.compressorbatch`. |
| `compressor_await_output` | Esperar hasta que un archivo de salida no esté vacío. |
| `compressor_daemon_recover` | Recuperar un demonio de Compressor bloqueado. |

Ver [`docs/reference/compressor-cli.md`](./docs/reference/compressor-cli.md).

### Motion (10 herramientas)

| Herramienta | Propósito |
|------|---------|
| `motion_app_open` / `motion_app_running` | Ciclo de vida |
| `motion_open` | Abrir una plantilla `.motn`. |
| `motion_template_clone` | Clonar una plantilla `.motn` a una nueva ruta. |
| `motion_template_set_param` | Establecer un valor de parámetro publicado (edición OZML). |
| `motion_template_get_params` | Listar todos los parámetros publicados en una plantilla. |
| `motion_template_validate` | Validar la estructura OZML de un archivo `.motn`. |
| `motion_template_publish_catalog` | Listar todas las plantillas en el catálogo de publicación de Motion. |
| `motion_publish_to_fcp` | Publicar una plantilla de Motion en el navegador de títulos de FCP. |
| `motion_render_via_compressor` | Renderizar una plantilla `.motn` a video de forma autónoma a través de Compressor. |

Nota: `motion_template_set_param` y `motion_render_via_compressor` no tienen precedentes en ninguna herramienta MCP global; la mutación y el renderizado autónomos de Motion OZML están habilitados de forma única por csos.

### Pixelmator Pro (33 herramientas)

| Herramienta | Propósito |
|------|---------|
| `pixelmator_app_open` / `pixelmator_app_running` | Ciclo de vida |
| `pixelmator_open` / `pixelmator_close` | Abrir / cerrar documentos. |
| `pixelmator_export` | Exportar a PNG / JPEG / TIFF / HEIC / GIF / WebP / PDF / SVG. |
| `pixelmator_resize` / `pixelmator_crop` / `pixelmator_rotate` / `pixelmator_flip` | Transformar. |
| `pixelmator_batch_export_project_images` | Conversión por lotes de `projects/<name>/images/`. |
| `pixelmator_layer_list` / `pixelmator_layer_create` / `pixelmator_layer_delete` | Gestión de capas. |
| `pixelmator_layer_set_text` / `pixelmator_layer_set_fill` / `pixelmator_layer_move` | Edición de capas. |
| `pixelmator_effects_apply` / `pixelmator_effects_catalog` | Canal de efectos de aprendizaje automático (ML). |
| `pixelmator_compose_brand_card` | Componer una tarjeta de marca con rotación de tono y texto de título. |
| `pixelmator_hdr_export` | Exportar con mapeo de tonos HDR. |
| `pixelmator_text_card` | Renderizar una tarjeta de solo texto con control de fuente y color. |

### Logic Pro (3 herramientas)

Logic no tiene diccionario de AppleScript. Interfaz: ciclo de vida y transferencia de apertura de archivos para proyectos `.logicx`.

| Herramienta | Propósito |
|------|---------|
| `logic_app_open` / `logic_app_running` | Ciclo de vida |
| `logic_open` | Abrir un proyecto `.logicx`. |

### Keynote / Pages / Numbers (18 herramientas combinadas)

Las tres comparten una forma de AppleScript casi idéntica. Catálogo completo de formatos de exportación: [`docs/reference/iwork-automation.md`](./docs/reference/iwork-automation.md).

**Keynote (8 herramientas):** abrir, cerrar, exportar PDF / imágenes / película / PPTX, ciclo de vida.
**Pages (5 herramientas):** abrir, cerrar, exportar PDF / Word / RTF / EPUB, ciclo de vida.
**Numbers (5 herramientas):** abrir, cerrar, exportar PDF / Excel / CSV, ciclo de vida.

### Infraestructura

| Herramienta | Propósito |
|------|---------|
| `csos_app_status` | Comprobación de estado de las 8 aplicaciones (en ejecución, versión, profundidad de la cola). |
| `csos_protocol_run` | Ejecutar un protocolo entre aplicaciones de extremo a extremo (asíncrono, transmisión de pasos). |
| `csos_protocol_list` | Listar todos los protocolos registrados. |
| `csos_protocol_describe` | Describe los pasos y el propósito de un protocolo. |

## Configuración recomendada con tool-compass

[tool-compass](https://github.com/mcp-tool-shop-org/tool-compass) es una puerta de enlace semántica HNSW que encuentra la herramienta adecuada a partir de la intención expresada en lenguaje natural; esto es esencial cuando 78 herramientas abarcan 8 aplicaciones.

```bash
pip install tool-compass
```

El "harness" de pruebas verifica 12 consultas representativas en la Fase 7. Cualquier cambio en la descripción que elimine un objetivo del top 3 con una puntuación > 0.4, provoca que la prueba falle.

## Permisos

La primera vez que el servidor utiliza AppleScript con una aplicación, macOS solicita permiso para la **automatización** en la configuración del sistema → Privacidad y seguridad → Automatización. El AppleScript de solo lectura también requiere este permiso.

## CI / verificación

| Comprobación. | ¿Qué? |
|-------|------|
| **A. Security** | [`SECURITY.md`](./SECURITY.md), [`docs/threat-model.md`](./docs/threat-model.md), sin secretos, sin telemetría, sin red. |
| **B. Errors** | `CreatorStudioError { code, message, hint }`, códigos de salida de la línea de comandos, sin trazas de pila sin procesar. |
| **C. Docs** | Este archivo README, [`CHANGELOG.md`](./CHANGELOG.md), [`LICENSE`](./LICENSE), `--help` preciso. |
| **D. Hygiene** | `npm test`, `npm run typecheck`, la versión coincide con la etiqueta, `npm audit`, empaquetado limpio. |

CI se ejecuta en `ubuntu-latest` (verificación de tipos + compilación + pruebas unitarias + auditoría). Las pruebas de integración contra aplicaciones reales se ejecutan a través de `npm run smoke:ci`; los entornos de macOS no están incluidos en CI de forma intencionada (el costo de macOS es aproximadamente 10 veces el de Linux por minuto).

## Hoja de ruta

- **v1.7.x** — protocolo compuesto entre aplicaciones (`brand-deck-minimal`): Tarjetas de marca de Pixelmator + tercetos inferiores de Motion + codificación de Compressor → ProRes MOV — **disponible en v1.7.10**.
- **v1.8.x** — validación de límites de texto `patchSiblingText`: advertencia de ledger cuando el texto entrante puede recortar los límites de renderizado fijos de la plantilla de Motion.
- **v2.0** — Fase 3: superficie de protocolo ampliada (flujos de trabajo de tráilers de Steam, devlogs, tarjetas sociales).

Hojas de ruta de las aplicaciones: [`docs/roadmap-fcp.md`](./docs/roadmap-fcp.md), [`docs/roadmap-compressor.md`](./docs/roadmap-compressor.md), [`docs/roadmap.md`](./docs/roadmap.md).

## Licencia

MIT — consulte [LICENSE](./LICENSE).

---

<p align="center">Built by <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a></p>
