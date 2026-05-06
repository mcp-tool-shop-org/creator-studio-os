<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.md">English</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/motion

> Herramientas de Motion para Creator Studio OS: mutación de plantillas OZML, renderizado sin interfaz de usuario de Compressor y catálogo de plantillas.

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-92%25-brightgreen.svg" alt="Coverage 92%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Parte del plano de control MCP para aplicaciones de Apple Creator Studio.

---

## Instalación

```bash
npm install @creator-studio-os/motion
```

Requiere Motion (Creator Studio) y macOS 13 o superior. El renderizado sin interfaz de usuario requiere Compressor.

## ¿Qué hace este paquete?

Motion no expone ninguna interfaz de AppleScript. `@creator-studio-os/motion` funciona a nivel de formato de archivo: lee y modifica directamente el formato de plantilla OZML de Motion (`.motn` / `.moti`), sin necesidad de ejecutar Motion:

- **Inspección de plantillas**: analiza el formato OZML, lista todos los parámetros publicados.
- **Modificación de parámetros**: establece cualquier valor de parámetro (texto, color, número) de forma atómica.
- **Edición de texto**: reemplaza el contenido de texto visible, incluyendo la lista de glifos y los estilos.
- **Validación estructural**: verifica 31 invariantes de OZML antes de cualquier escritura.
- **Renderizado sin interfaz de usuario**: envía una plantilla `.motn` a Compressor a través de `-jobpath`; no se requiere interfaz gráfica.
- **Publicación en FCP**: activa o desactiva el indicador "Publicar en FCP" en cualquier parámetro.

> **Importante**: Nunca modifique las plantillas integradas de Apple. Siempre clone la plantilla primero con `motion_template_clone`.

## Herramientas (10)

| Herramienta | Descripción |
|------|-------------|
| `motion_app_open` | Abrir Motion (solo transferencia de archivos; no hay interfaz de AppleScript). |
| `motion_app_running` | Comprobar si Motion está en ejecución. |
| `motion_open` | Abrir una plantilla o proyecto `.motn` en Motion. |
| `motion_template_inspect` | Analizar una plantilla y devolver su resumen OZML y la lista de parámetros. |
| `motion_template_set_param` | Modificar el valor de un solo parámetro en una plantilla de Motion. |
| `motion_template_edit_text` | Editar el contenido de texto visible (CDATA + lista de glifos + estilos). |
| `motion_template_validate` | Validar contra 31 invariantes estructurales de OZML. |
| `motion_template_clone` | Copiar una plantilla a una nueva ruta antes de modificarla. |
| `motion_render_via_compressor` | Renderizar una plantilla `.motn` sin interfaz de usuario a través de Compressor con `-jobpath`. |
| `motion_publish_to_fcp` | Activar o desactivar el indicador "Publicar en FCP" en un parámetro de plantilla. |

## Ejemplo

Clonar una plantilla integrada, establecer un parámetro de texto, validar y renderizar sin interfaz de usuario:

```json
// Tool: motion_template_clone
{
  "sourcePath": "/Applications/Motion Creator Studio.app/Contents/Resources/Templates.localized/Compositions.localized/Atmospheric.localized/Atmospheric-Lower Third.localized/Atmospheric-Lower Third.motn",
  "destPath": "/projects/csos-showcase/motion/lower-third.motn"
}

// Tool: motion_template_edit_text
{
  "templatePath": "/projects/csos-showcase/motion/lower-third.motn",
  "paramId": "Text.0",
  "newText": "Creator Studio OS"
}

// Tool: motion_template_validate
{ "templatePath": "/projects/csos-showcase/motion/lower-third.motn" }

// Tool: motion_render_via_compressor
{
  "templatePath": "/projects/csos-showcase/motion/lower-third.motn",
  "outputPath": "/projects/csos-showcase/out/lower-third.mov",
  "settingName": "Apple ProRes 4444"
}
```

## Compatible con `@creator-studio-os/fcp`

```json
// Tool: fcp_bind_motion_param — discover parameters for FCP binding
{ "templatePath": "/projects/csos-showcase/motion/lower-third.motn" }

// Tool: motion_publish_to_fcp — expose a parameter in FCP's inspector
{
  "templatePath": "/projects/csos-showcase/motion/lower-third.motn",
  "paramId": "Text.0",
  "publish": true
}
```

## Perfil de recuperación

```typescript
import { recovery } from "@creator-studio-os/motion";
// recovery.app === "motion"
```

## Requisitos de macOS

`@creator-studio-os/motion` es exclusivo de macOS (`"os": ["darwin"]`). La inspección y modificación de plantillas no requieren que se ejecute ninguna aplicación. El renderizado sin interfaz de usuario requiere Compressor de la suscripción de Creator Studio.

---

[README principal](../../README.md) · [Registro de cambios](../../CHANGELOG.md) · [Seguridad](../../SECURITY.md)
