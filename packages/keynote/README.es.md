<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.md">English</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/keynote

> Herramientas para Keynote en Creator Studio OS: 56 herramientas para la automatización de presentaciones, importación de Markdown, conversión de guiones gráficos a FCPXML y exportación en múltiples formatos.

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-99%25-brightgreen.svg" alt="Coverage 99%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Parte del plano de control MCP de [Creator Studio OS](../../README.md) para aplicaciones de Apple Creator Studio.

---

## Instalación

```bash
npm install @creator-studio-os/keynote
```

Requiere Keynote (versión de Creator Studio o independiente) y macOS 13 o superior.

## ¿Qué hace este paquete?

La interfaz de AppleScript más completa de cualquier aplicación de Apple: Keynote expone un diccionario sdef rico para crear, editar y exportar presentaciones. `@creator-studio-os/keynote` incluye toda la interfaz: 56 herramientas que cubren el ciclo de vida de las diapositivas, texto, tablas, gráficos, imágenes, transiciones, efectos de aprendizaje automático (ML), exportación y dos puentes de procesamiento (importación de Markdown y exportación de guiones gráficos a FCPXML).

## Herramientas (56)

### Ciclo de vida de la aplicación

| Herramienta | Descripción |
|------|-------------|
| `keynote_app_open` | Activar Keynote |
| `keynote_app_running` | Comprobar si Keynote está en ejecución |

### Ciclo de vida del documento

| Herramienta | Descripción |
|------|-------------|
| `keynote_open` | Abrir un archivo `.key`; devuelve su nombre (utilizado por todas las demás herramientas) |
| `keynote_close` | Cerrar un documento (con opción de guardar) |
| `keynote_save` | Guardar un documento, opcionalmente en una ruta diferente |
| `keynote_list_presentations` | Listar todos los documentos abiertos |
| `keynote_create_presentation` | Crear una presentación nueva y vacía |
| `keynote_set_doc_size` | Establecer las dimensiones de la diapositiva (por ejemplo, 1920x1080 para 16:9) |
| `keynote_set_kiosk_mode` | Configurar la reproducción automática, el bucle automático y el tiempo de inactividad para pantallas de quiosco |

### Temas y plantillas

| Herramienta | Descripción |
|------|-------------|
| `keynote_list_themes` | Listar todos los temas disponibles |
| `keynote_apply_theme` | Aplicar un tema a un documento |
| `keynote_list_masters` | Listar las plantillas de la diapositiva maestra en el tema actual |
| `keynote_set_slide_master` | Establecer la plantilla maestra para una diapositiva |

### Gestión de diapositivas

| Herramienta | Descripción |
|------|-------------|
| `keynote_list_slides` | Listar todas las diapositivas con índice, título y estado de omisión |
| `keynote_get_slide` | Leer el título, el cuerpo, las notas y la transición de una diapositiva |
| `keynote_make_slide` | Añadir una nueva diapositiva |
| `keynote_delete_slide` | Eliminar una diapositiva |
| `keynote_duplicate_slide` | Duplicar una diapositiva |
| `keynote_reorder_slide` | Mover una diapositiva a una posición diferente |
| `keynote_skip_slide` | Marcar una diapositiva como omitida o desmarcarla |

### Texto y contenido

| Herramienta | Descripción |
|------|-------------|
| `keynote_set_title` | Establecer el texto del título en una diapositiva |
| `keynote_set_body` | Establecer el texto del cuerpo en una diapositiva |
| `keynote_set_text_style` | Estilizar el texto (fuente, tamaño, color) en cualquier elemento de la diapositiva |
| `keynote_get_presenter_notes` | Leer las notas del presentador de una diapositiva |
| `keynote_set_presenter_notes` | Establecer las notas del presentador en una diapositiva |
| `keynote_extract_all_notes` | Extraer las notas y los títulos del presentador de cada diapositiva |

### Transiciones

| Herramienta | Descripción |
|------|-------------|
| `keynote_set_transition` | Establecer una transición de diapositiva (todos los 43 efectos sdef + temporización) |
| `keynote_plan_magic_move` | Preparar dos diapositivas para una transición Magic Move |

### Elementos: imágenes, formas, líneas, tablas, gráficos

| Herramienta | Descripción |
|------|-------------|
| `keynote_list_items` | Listar todos los elementos de iWork en una diapositiva |
| `keynote_position_item` | Reposicionar y/o redimensionar un elemento de la diapositiva |
| `keynote_format_item` | Establecer la opacidad, la rotación y el reflejo de un elemento de la diapositiva |
| `keynote_get_item_info` | Leer la posición, el tamaño, la opacidad y la rotación de un elemento |
| `keynote_insert_image` | Insertar una imagen desde una ruta de archivo |
| `keynote_set_voiceover_description` | Establecer la descripción de accesibilidad VoiceOver en una imagen de la diapositiva |
| `keynote_insert_shape` | Insertar una forma rectangular |
| `keynote_insert_line` | Insertar un elemento de línea |
| `keynote_insert_table` | Insertar una tabla |
| `keynote_read_table` | Leer los valores de las celdas como un array 2D |
| `keynote_write_table` | Escribir los valores de las celdas desde un array 2D |
| `keynote_make_chart` | Añadir un gráfico con nombres de fila, nombres de columna y datos |
| `keynote_make_image_slides` | Añadir en masa una diapositiva por imagen desde una lista de archivos |

### Efectos de aprendizaje automático (ML) (solo Creator Studio)

| Herramienta | Descripción |
|------|-------------|
| `keynote_clean_up_slide` | Limpiar una diapositiva utilizando la optimización de diseño integrada de Keynote |
| `keynote_super_resolution` | Aplicar un aumento de superresolución mediante ML a una imagen de la diapositiva |
| `keynote_remove_background` | Eliminar el fondo de una imagen de la diapositiva utilizando ML |

### Presentación

| Herramienta | Descripción |
|------|-------------|
| `keynote_start` | Iniciar la presentación, opcionalmente desde una diapositiva específica |
| `keynote_stop` | Detener la presentación activa |

### Exportar

| Herramienta | Descripción |
|------|-------------|
| `keynote_export_pdf` | Exportar a PDF |
| `keynote_export_pdf_advanced` | Exportar a PDF con diseño para folletos, notas, contraseñas y opciones de calidad de imagen. |
| `keynote_export_images` | Exportar cada diapositiva como PNG / JPEG / TIFF. |
| `keynote_export_movie` | Exportar como un archivo de video QuickTime. |
| `keynote_export_movie_advanced` | Exportar como un archivo de video con códec (H.264, HEVC, escala completa de ProRes), resolución y frecuencia de fotogramas. |
| `keynote_export_pptx` | Exportar como un archivo de Microsoft PowerPoint. |
| `keynote_export_html` | Exportar como un sitio HTML estático. |

### Puentes de flujo de trabajo

| Herramienta | Descripción |
|------|-------------|
| `keynote_from_markdown` | Crear una presentación a partir de un documento Markdown (títulos → diapositivas). |
| `keynote_to_storyboard_fcp` | Convertir una presentación de Keynote a un guion de FCP en formato FCPXML. |
| `keynote_to_compressor_gif` | Exportar una presentación como un GIF animado a través de Compressor. |

## Ejemplo

Crear una presentación a partir de Markdown y exportarla a PPTX:

```json
// Tool: keynote_from_markdown
{
  "markdownPath": "/projects/brief.md",
  "masterMap": {
    "h1": "Title",
    "h2": "Section Header",
    "bullets": "Bullets"
  }
}

// Tool: keynote_export_pptx
{
  "documentName": "brief.key",
  "outputPath": "/projects/brief.pptx"
}
```

Exportar las diapositivas como un archivo de video ProRes:

```json
// Tool: keynote_export_movie_advanced
{
  "documentName": "csos-showcase.key",
  "outputPath": "/projects/csos-showcase/out/slideshow.mov",
  "codec": "ProRes 4444",
  "width": 1920,
  "height": 1080,
  "frameRate": "29.97"
}
```

## Perfil de recuperación

```typescript
import { recovery } from "@creator-studio-os/keynote";
// recovery.app === "keynote"
```

## Requisitos de macOS

`@creator-studio-os/keynote` es exclusivo de macOS (`"os": ["darwin"]`). Las herramientas de aprendizaje automático requieren Keynote de la suscripción Creator Studio. Las herramientas estándar funcionan con la versión gratuita independiente de Keynote de la Mac App Store.

---

[README principal](../../README.md) · [Registro de cambios](../../CHANGELOG.md) · [Seguridad](../../SECURITY.md)
