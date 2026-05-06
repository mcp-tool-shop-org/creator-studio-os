<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.md">English</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="550">
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/creator-studio-os/actions/workflows/ci.yml"><img src="https://github.com/mcp-tool-shop-org/creator-studio-os/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://codecov.io/gh/mcp-tool-shop-org/creator-studio-os"><img src="https://codecov.io/gh/mcp-tool-shop-org/creator-studio-os/branch/main/graph/badge.svg" alt="Coverage"></a>
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

# @creator-studio-os/creator-studio-os

Plano de control MCP para aplicaciones de Apple Creator Studio. Permite controlar **Final Cut Pro**, **Compressor**, **Motion**, **Pixelmator Pro**, **Logic Pro**, **Keynote**, **Pages** y **Numbers** desde Claude o cualquier cliente MCP.

Este paquete es la **interfaz de línea de comandos (CLI) principal**; agrupa los 9 paquetes `@creator-studio-os/*` y los expone como un único comando `creator-studio-os serve`.

## Instalación

```bash
npm install -g @creator-studio-os/creator-studio-os
```

O a través de npx (sin instalación):

```bash
npx @creator-studio-os/creator-studio-os serve
```

## Configuración del cliente MCP

Añada lo siguiente a `claude_desktop_config.json` (o equivalente):

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

## ¿Qué incluye?

| Paquete | Herramientas | Lo que controla |
|---------|-------|----------------|
| `@creator-studio-os/core` | 1 | Entorno de ejecución compartido, ejecutores de AppleScript, esquema de proyecto. |
| `@creator-studio-os/compressor` | 15 | Codificación sin interfaz gráfica, trabajos por lotes, progreso en tiempo real. |
| `@creator-studio-os/fcp` | 22 | Creación de archivos FCPXML 1.14, validación de DTD, importación a FCP. |
| `@creator-studio-os/iwork-docs` | 10 | Ciclo de vida y exportación de documentos de Pages y Numbers. |
| `@creator-studio-os/keynote` | 56 | Automatización completa de Keynote: diapositivas, ML, exportación, puentes de flujo de trabajo. |
| `@creator-studio-os/logic` | 3 | Inicio de Logic Pro y apertura de proyectos `.logicx`. |
| `@creator-studio-os/motion` | 10 | Mutación de plantillas OZML, renderizado sin interfaz gráfica. |
| `@creator-studio-os/pixelmator` | 33 | Edición de capas, efectos de ML, compositor de tarjetas de marca. |
| `@creator-studio-os/protocols` | 3 | Flujos de trabajo interaplicaciones. |

**Total: 153 herramientas en 9 paquetes.**

## Flujo de trabajo interaplicaciones

El caso de uso principal: `csos_protocol_run` orquesta las 8 aplicaciones en un solo comando:

1. Pixelmator Pro compone tarjetas de marca por escena.
2. Motion renderiza superposiciones de tercio inferior sin interfaz gráfica a través de Compressor.
3. Se crea y se importa la línea de tiempo FCPXML 1.14 en Final Cut Pro.
4. Compressor codifica el producto final (ProRes principal + H.264 para redes sociales).

## CLI

```bash
creator-studio-os serve          # start MCP server
creator-studio-os verify         # verify xmllint + DTD round-trip
creator-studio-os smoke          # run 9-phase smoke test against live apps
creator-studio-os smoke --dry-run  # smoke test without live app calls
```

## Uso de los paquetes individualmente

Cada paquete de aplicación se publica por separado. Instale solo lo que necesita:

```bash
npm install @creator-studio-os/fcp       # Final Cut Pro only
npm install @creator-studio-os/keynote   # Keynote only
npm install @creator-studio-os/pixelmator  # Pixelmator Pro only
```

## Seguridad

Se ejecuta completamente en el dispositivo: no hay llamadas de red, no hay telemetría, no se almacenan credenciales. Modelo de amenazas completo en [SECURITY.md](SECURITY.md) y en [`docs/threat-model.md`](https://github.com/mcp-tool-shop-org/creator-studio-os/blob/main/docs/threat-model.md).

## Requisitos de macOS

macOS 13+ y suscripción a Apple Creator Studio (o compras individuales de aplicaciones en la Mac App Store, donde estén disponibles). Consulte el archivo README de cada paquete para conocer los requisitos específicos de cada aplicación.

---

[Documentación completa](https://github.com/mcp-tool-shop-org/creator-studio-os) · [Registro de cambios](CHANGELOG.md) · [Seguridad](SECURITY.md)
