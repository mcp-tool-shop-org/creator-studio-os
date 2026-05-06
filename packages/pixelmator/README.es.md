<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.md">English</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/pixelmator

> Herramientas de Pixelmator Pro para Creator Studio OS: edición de capas, efectos de aprendizaje automático (ML), composición de tarjetas de marca y exportación en múltiples formatos.

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-99%25-brightgreen.svg" alt="Coverage 99%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Parte del plano de control [Creator Studio OS](../../README.md) para aplicaciones de Apple Creator Studio.

---

## Instalación

```bash
npm install @creator-studio-os/pixelmator
```

Requiere Pixelmator Pro (versión para Creator Studio o versión independiente) y macOS 13 o superior.

## ¿Qué hace este paquete?

`@creator-studio-os/pixelmator` controla Pixelmator Pro a través de su interfaz de AppleScript, que ofrece la API de edición de imágenes con aprendizaje automático (ML) más completa disponible en macOS. Incluye 33 herramientas que abarcan todo el ciclo de vida del documento, la manipulación de la pila de capas, algoritmos de ML, ajustes de color, efectos y un compositor de tarjetas de marca con múltiples tamaños.

## Herramientas (33)

### Ciclo de vida de la aplicación y el documento

| Herramienta | Descripción |
|------|-------------|
| `pixelmator_app_open` | Activar Pixelmator Pro |
| `pixelmator_app_running` | Comprobar si Pixelmator Pro está en ejecución |
| `pixelmator_open` | Abrir un documento; devuelve el nombre del documento (utilizado por todas las demás herramientas) |
| `pixelmator_close` | Cerrar un documento (sin guardar) |
| `pixelmator_export` | Exportar a PNG, JPEG, TIFF, PSD, WebP, HEIC, AVIF |
| `pixelmator_export_hdr` | Exportar como HDR JPEG, HDR HEIC, HDR AVIF o HDR PNG |
| `pixelmator_export_video` | Exportar capas de video a MP4 o QuickTime |
| `pixelmator_export_animated` | Exportar como GIF animado o PNG animado |
| `pixelmator_export_for_web` | PNG, JPEG, WebP, GIF o SVG optimizado para la web |
| `pixelmator_batch_export_project_images` | Exportación por lotes de todas las imágenes en el directorio `images/` de un proyecto |
| `pixelmator_batch_export_project_images_dryrun` | Prueba: lista qué imágenes se procesarían en una exportación por lotes |

### Transformaciones del documento

| Herramienta | Descripción |
|------|-------------|
| `pixelmator_resize` | Cambiar las dimensiones y/o la resolución del documento |
| `pixelmator_crop` | Recortar a los límites `{x, y, ancho, alto}` |
| `pixelmator_rotate` | Rotar 180 grados, a la derecha (90 grados en sentido horario) o a la izquierda (90 grados en sentido antihorario) |
| `pixelmator_flip` | Voltear horizontal o verticalmente |

### Pila de capas

| Herramienta | Descripción |
|------|-------------|
| `pixelmator_make_layer` | Añadir una capa de imagen, texto o forma |
| `pixelmator_set_layer_properties` | Cambiar la visibilidad, la opacidad, el modo de fusión, la posición o el tamaño |
| `pixelmator_layer_order` | Reordenar una capa (delante/detrás/antes/después) |
| `pixelmator_group_layers` | Mover capas a un nuevo grupo |
| `pixelmator_ungroup` | Desagrupar una capa de grupo |
| `pixelmator_set_layer_text` | Editar el contenido y el estilo de texto en una capa de texto |
| `pixelmator_make_shape` | Crear un rectángulo, elipse, rectángulo redondeado o línea rellenos |
| `pixelmator_set_blend_mode` | Establecer el modo de fusión de composición (todos los 28 modos de Pixelmator Pro) |
| `pixelmator_set_layer_shadow` | Añadir o editar una sombra difusa |
| `pixelmator_set_layer_stroke` | Añadir o editar un contorno |

### Efectos y ajustes de color

| Herramienta | Descripción |
|------|-------------|
| `pixelmator_apply_effect` | Aplicar cualquiera de las 23 clases de efectos no destructivos |
| `pixelmator_apply_color_adjustment` | Establecer cualquiera de las 24 propiedades de ajuste de color (incl. ruta LUT, viñeteado) |

### Aprendizaje automático (ML)

| Herramienta | Descripción |
|------|-------------|
| `pixelmator_apply_ml` | Ejecutar super_resolución, mejora, reducción de ruido, eliminación de artefactos, coincidencia de colores, eliminación de fondo, selección de sujeto o ajuste automático |
| `pixelmator_run_shortcut` | Ejecutar una acción de Pixelmator Shortcuts por nombre a través de `shortcuts run` |

### Detección y reemplazo

| Herramienta | Descripción |
|------|-------------|
| `pixelmator_detect` | Detectar rostros o códigos QR (cuadros delimitadores; QR incluye la carga útil decodificada) |
| `pixelmator_replace_text` | Buscar y reemplazar texto en todas las capas de texto |
| `pixelmator_replace_layer` | Reemplazar el contenido de píxeles de una capa de imagen con el contenido de un nuevo archivo |

### Compositor de tarjetas de marca

| Herramienta | Descripción |
|------|-------------|
| `pixelmator_compose_brand_card` | Abrir una plantilla `.pxd`, reemplazar los tokens `{{HEADLINE}}` / `{{SUBHEAD}}` / `{{LOGO}}` y exportar en múltiples tamaños |

## Ejemplo

Generar tarjetas de marca en tres tamaños a partir de una plantilla:

```json
// Tool: pixelmator_compose_brand_card
{
  "templatePath": "/projects/csos-showcase/brand/card-template.pxd",
  "brand": {
    "headline": "Creator Studio OS",
    "subhead": "Eight apps. One pipeline.",
    "logoPath": "/projects/csos-showcase/brand/csos-logo.png"
  },
  "sizes": [
    { "width": 1920, "height": 1080, "label": "16x9" },
    { "width": 1080, "height": 1080, "label": "square" },
    { "width": 1080, "height": 1920, "label": "story" }
  ],
  "outputDir": "/projects/csos-showcase/out/brand-cards"
}
```

Aplicar super-resolución de ML y volver a exportar:

```json
// Tool: pixelmator_apply_ml
{
  "documentName": "hero.pxd",
  "algorithm": "super_resolution"
}

// Tool: pixelmator_export
{
  "documentName": "hero.pxd",
  "outputPath": "/projects/csos-showcase/out/hero-4k.png",
  "format": "PNG"
}
```

## Perfil de recuperación

```typescript
import { recovery } from "@creator-studio-os/pixelmator";
// recovery.app === "pixelmator"
```

## Requisito de macOS

`@creator-studio-os/pixelmator` es solo para macOS (`"os": ["darwin"]`). Las herramientas de aprendizaje automático requieren Pixelmator Pro de la suscripción Creator Studio o de la Mac App Store.

---

[README principal](../../README.md) · [Registro de cambios](../../CHANGELOG.md) · [Seguridad](../../SECURITY.md)
