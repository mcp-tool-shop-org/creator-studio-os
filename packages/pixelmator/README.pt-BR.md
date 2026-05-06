<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.md">English</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/pixelmator

> Ferramentas do Pixelmator Pro para o Creator Studio OS — edição de camadas, efeitos de aprendizado de máquina (ML), composição de cartões de marca e exportação em vários formatos.

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-99%25-brightgreen.svg" alt="Coverage 99%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Parte do plano de controle [Creator Studio OS](../../README.md) para aplicativos Apple Creator Studio.

---

## Instalação

```bash
npm install @creator-studio-os/pixelmator
```

Requer Pixelmator Pro (versão Creator Studio ou independente) e macOS 13 ou superior.

## O que este pacote faz

`@creator-studio-os/pixelmator` controla o Pixelmator Pro através de sua interface AppleScript — a API de edição de imagem aprimorada com aprendizado de máquina (ML) mais completa disponível no macOS. 33 ferramentas que abrangem todo o ciclo de vida do documento, manipulação da pilha de camadas, algoritmos de ML, ajustes de cor, efeitos e um compositor de cartões de marca com vários tamanhos.

## Ferramentas (33)

### Ciclo de vida do aplicativo e do documento

| Ferramenta | Descrição |
|------|-------------|
| `pixelmator_app_open` | Ativar o Pixelmator Pro |
| `pixelmator_app_running` | Verificar se o Pixelmator Pro está em execução |
| `pixelmator_open` | Abrir um documento; retorna o nome do documento (usado por todas as outras ferramentas) |
| `pixelmator_close` | Fechar um documento (sem salvar) |
| `pixelmator_export` | Exportar para PNG, JPEG, TIFF, PSD, WebP, HEIC, AVIF |
| `pixelmator_export_hdr` | Exportar como HDR JPEG, HDR HEIC, HDR AVIF ou HDR PNG |
| `pixelmator_export_video` | Exportar camadas de vídeo para MP4 ou QuickTime |
| `pixelmator_export_animated` | Exportar como GIF animado ou PNG animado |
| `pixelmator_export_for_web` | PNG, JPEG, WebP, GIF ou SVG otimizado para a web |
| `pixelmator_batch_export_project_images` | Exportar em lote todas as imagens em um diretório `images/` de um projeto |
| `pixelmator_batch_export_project_images_dryrun` | Teste: listar o que a exportação em lote processaria |

### Transformações do documento

| Ferramenta | Descrição |
|------|-------------|
| `pixelmator_resize` | Alterar as dimensões e/ou a resolução do documento |
| `pixelmator_crop` | Cortar para as bordas `{x, y, largura, altura}` |
| `pixelmator_rotate` | Rotacionar 180 graus, para a direita (90 graus no sentido horário) ou para a esquerda (90 graus no sentido anti-horário) |
| `pixelmator_flip` | Inverter horizontalmente ou verticalmente |

### Pilha de camadas

| Ferramenta | Descrição |
|------|-------------|
| `pixelmator_make_layer` | Adicionar uma camada de imagem, texto ou forma |
| `pixelmator_set_layer_properties` | Alterar a visibilidade, a opacidade, o modo de mesclagem, a posição ou o tamanho |
| `pixelmator_layer_order` | Reordenar uma camada (para frente/para trás/antes/depois) |
| `pixelmator_group_layers` | Mover camadas para um novo grupo |
| `pixelmator_ungroup` | Desagrupar uma camada de grupo |
| `pixelmator_set_layer_text` | Editar o conteúdo e o estilo de texto em uma camada de texto |
| `pixelmator_make_shape` | Criar um retângulo preenchido, elipse, retângulo arredondado ou linha |
| `pixelmator_set_blend_mode` | Definir o modo de mesclagem de composição (todos os 28 modos do Pixelmator Pro) |
| `pixelmator_set_layer_shadow` | Adicionar ou editar uma sombra projetada |
| `pixelmator_set_layer_stroke` | Adicionar ou editar um contorno |

### Efeitos e ajustes de cor

| Ferramenta | Descrição |
|------|-------------|
| `pixelmator_apply_effect` | Aplicar qualquer uma das 23 classes de efeitos não destrutivos |
| `pixelmator_apply_color_adjustment` | Definir qualquer uma das 24 propriedades de ajuste de cor (incluindo o caminho da LUT, vinheta) |

### Aprendizado de Máquina (ML)

| Ferramenta | Descrição |
|------|-------------|
| `pixelmator_apply_ml` | Executar super_resolution, enhance, denoise, deband, match_colors, remove_background, select_subject ou auto-adjust |
| `pixelmator_run_shortcut` | Executar uma ação do Pixelmator Shortcuts por nome através de `shortcuts run` |

### Detecção e substituição

| Ferramenta | Descrição |
|------|-------------|
| `pixelmator_detect` | Detectar rostos ou códigos QR (caixas delimitadoras; QR inclui o payload decodificado) |
| `pixelmator_replace_text` | Encontrar e substituir texto em todas as camadas de texto |
| `pixelmator_replace_layer` | Substituir o conteúdo de pixels de uma camada de imagem por um novo arquivo |

### Compositor de cartões de marca

| Ferramenta | Descrição |
|------|-------------|
| `pixelmator_compose_brand_card` | Abrir um modelo `.pxd`, substituir os tokens `{{HEADLINE}}` / `{{SUBHEAD}}` / `{{LOGO}}` e exportar em vários tamanhos. |

## Exemplo

Gerar cartões de marca em três tamanhos a partir de um modelo:

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

Aplicar super-resolução de ML e reexportar:

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

## Perfil de recuperação

```typescript
import { recovery } from "@creator-studio-os/pixelmator";
// recovery.app === "pixelmator"
```

## Requisito do macOS

`@creator-studio-os/pixelmator` é exclusivo para macOS (`"os": ["darwin"]`). As ferramentas de ML requerem o Pixelmator Pro da assinatura Creator Studio ou da Mac App Store.

---

[README principal](../../README.md) · [Registro de alterações](../../CHANGELOG.md) · [Segurança](../../SECURITY.md)
