<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.md">English</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/motion

> Ferramentas de animação para o Creator Studio OS — mutação de modelos OZML, renderização "headless" com o Compressor e catálogo de modelos.

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-92%25-brightgreen.svg" alt="Coverage 92%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Parte do plano de controle MCP (Media Content Platform) para aplicativos Apple Creator Studio.

---

## Instalação

```bash
npm install @creator-studio-os/motion
```

Requer o Motion (Creator Studio) e macOS 13 ou superior. A renderização "headless" requer o Compressor.

## O que este pacote faz

O Motion não expõe nenhuma interface AppleScript. O `@creator-studio-os/motion` funciona no nível do formato de arquivo — ele lê e modifica diretamente o formato de modelo OZML do Motion (`.motn` / `.moti`), sem iniciar o Motion:

- **Inspeção de modelos** — analisa o OZML, lista todos os parâmetros publicados.
- **Modificação de parâmetros** — define qualquer valor de parâmetro (texto, cor, número) de forma atômica.
- **Edição de texto** — substitui o conteúdo de texto visível, incluindo listas de glifos e estilos.
- **Validação estrutural** — 31 invariantes do OZML antes de qualquer escrita.
- **Renderização "headless"** — envia um modelo `.motn` para o Compressor via `-jobpath` — não é necessária uma interface gráfica.
- **Publicação no FCP (Final Cut Pro)** — alterna o marcador "Publicar no FCP" em qualquer parâmetro.

> **Importante**: Nunca modifique modelos integrados da Apple. Sempre clone o modelo primeiro com `motion_template_clone`.

## Ferramentas (10)

| Ferramenta | Descrição |
|------|-------------|
| `motion_app_open` | Abrir o Motion (apenas para transferência de arquivo; sem interface AppleScript) |
| `motion_app_running` | Verificar se o Motion está em execução |
| `motion_open` | Abrir um modelo ou projeto `.motn` no Motion |
| `motion_template_inspect` | Analisar um modelo e retornar seu resumo OZML e lista de parâmetros |
| `motion_template_set_param` | Modificar um único valor de parâmetro em um modelo do Motion |
| `motion_template_edit_text` | Editar o conteúdo de texto visível (CDATA + lista de glifos + estilos) |
| `motion_template_validate` | Validar em relação a 31 invariantes estruturais do OZML |
| `motion_template_clone` | Copiar um modelo para um novo caminho antes de modificá-lo |
| `motion_render_via_compressor` | Renderizar um modelo `.motn` de forma "headless" via Compressor `-jobpath` |
| `motion_publish_to_fcp` | Alternar o marcador "Publicar no FCP" em um parâmetro do modelo |

## Exemplo

Clonar um modelo integrado, definir um parâmetro de texto, validar e renderizar de forma "headless":

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

## Compatível com `@creator-studio-os/fcp`

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

## Perfil de recuperação

```typescript
import { recovery } from "@creator-studio-os/motion";
// recovery.app === "motion"
```

## Requisitos do macOS

O `@creator-studio-os/motion` é exclusivo para macOS (`"os": ["darwin"]`). A inspeção e a modificação de modelos não requerem que nenhum aplicativo esteja em execução. A renderização "headless" requer o Compressor da assinatura Creator Studio.

---

[README principal](../../README.md) · [Registro de alterações](../../CHANGELOG.md) · [Segurança](../../SECURITY.md)
