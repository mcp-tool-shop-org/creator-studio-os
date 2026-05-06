<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.md">English</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/keynote

> Ferramentas para Keynote no Creator Studio OS — 56 ferramentas para automação de apresentações, importação de Markdown, conversão de storyboard para FCPXML e exportação em múltiplos formatos.

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-99%25-brightgreen.svg" alt="Coverage 99%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Parte do plano de controle MCP do [Creator Studio OS](../../README.md) para aplicativos Apple Creator Studio.

---

## Instalação

```bash
npm install @creator-studio-os/keynote
```

Requer Keynote (Creator Studio ou versão independente) e macOS 13 ou superior.

## O que este pacote faz

A interface de AppleScript mais completa de qualquer aplicativo da Apple — o Keynote expõe um dicionário sdef rico para criar, editar e exportar apresentações. `@creator-studio-os/keynote` encapsula toda essa interface: 56 ferramentas que abrangem o ciclo de vida da apresentação, texto, tabelas, gráficos, imagens, transições, efeitos de ML, exportação e duas pontes de pipeline (importação de Markdown + exportação de storyboard para FCPXML).

## Ferramentas (56)

### Ciclo de vida do aplicativo

| Ferramenta | Descrição |
|------|-------------|
| `keynote_app_open` | Ativar o Keynote |
| `keynote_app_running` | Verificar se o Keynote está em execução |

### Ciclo de vida do documento

| Ferramenta | Descrição |
|------|-------------|
| `keynote_open` | Abrir um arquivo `.key`; retorna o nome do arquivo (usado por todas as outras ferramentas) |
| `keynote_close` | Fechar um documento (com opção de salvar) |
| `keynote_save` | Salvar um documento, opcionalmente em um caminho diferente |
| `keynote_list_presentations` | Listar todos os documentos abertos |
| `keynote_create_presentation` | Criar uma apresentação em branco |
| `keynote_set_doc_size` | Definir as dimensões do slide (por exemplo, 1920x1080 para 16:9) |
| `keynote_set_kiosk_mode` | Configurar a reprodução automática, o loop automático e o tempo limite de inatividade para telas de quiosque |

### Temas e modelos

| Ferramenta | Descrição |
|------|-------------|
| `keynote_list_themes` | Listar todos os temas disponíveis |
| `keynote_apply_theme` | Aplicar um tema a um documento |
| `keynote_list_masters` | Listar os layouts de modelo de slide no tema atual |
| `keynote_set_slide_master` | Definir o layout de modelo para um slide |

### Gerenciamento de slides

| Ferramenta | Descrição |
|------|-------------|
| `keynote_list_slides` | Listar todos os slides com índice, título e status de "ignorado" |
| `keynote_get_slide` | Ler o título, o corpo, as notas e a transição de um slide |
| `keynote_make_slide` | Adicionar um novo slide |
| `keynote_delete_slide` | Excluir um slide |
| `keynote_duplicate_slide` | Duplicar um slide |
| `keynote_reorder_slide` | Mover um slide para uma posição diferente |
| `keynote_skip_slide` | Marcar um slide como "ignorado" ou desmarcá-lo |

### Texto e conteúdo

| Ferramenta | Descrição |
|------|-------------|
| `keynote_set_title` | Definir o texto do título em um slide |
| `keynote_set_body` | Definir o texto do corpo em um slide |
| `keynote_set_text_style` | Estilizar o texto (fonte, tamanho, cor) em qualquer elemento do slide |
| `keynote_get_presenter_notes` | Ler as notas do apresentador de um slide |
| `keynote_set_presenter_notes` | Definir as notas do apresentador em um slide |
| `keynote_extract_all_notes` | Extrair as notas do apresentador e os títulos de cada slide |

### Transições

| Ferramenta | Descrição |
|------|-------------|
| `keynote_set_transition` | Definir uma transição de slide (todos os 43 efeitos sdef + tempo) |
| `keynote_plan_magic_move` | Preparar dois slides para uma transição Magic Move |

### Elementos: imagens, formas, linhas, tabelas, gráficos

| Ferramenta | Descrição |
|------|-------------|
| `keynote_list_items` | Listar todos os elementos iWork em um slide |
| `keynote_position_item` | Reposicionar e/ou redimensionar um elemento do slide |
| `keynote_format_item` | Definir a opacidade, a rotação e a reflexão de um elemento do slide |
| `keynote_get_item_info` | Ler a posição, o tamanho, a opacidade e a rotação de um elemento |
| `keynote_insert_image` | Inserir uma imagem a partir de um caminho de arquivo |
| `keynote_set_voiceover_description` | Definir a descrição de acessibilidade VoiceOver em uma imagem do slide |
| `keynote_insert_shape` | Inserir uma forma retangular |
| `keynote_insert_line` | Inserir um elemento de linha |
| `keynote_insert_table` | Inserir uma tabela |
| `keynote_read_table` | Ler os valores das células como uma matriz 2D |
| `keynote_write_table` | Escrever os valores das células a partir de uma matriz 2D |
| `keynote_make_chart` | Adicionar um gráfico com nomes de linhas, nomes de colunas e dados |
| `keynote_make_image_slides` | Adicionar em lote uma imagem por slide a partir de uma lista de arquivos |

### Efeitos de ML (apenas para Creator Studio)

| Ferramenta | Descrição |
|------|-------------|
| `keynote_clean_up_slide` | Otimizar o layout de um slide usando a otimização de layout integrada do Keynote |
| `keynote_super_resolution` | Aplicar um efeito de super-resolução para aumentar a resolução de uma imagem do slide |
| `keynote_remove_background` | Remover o fundo de uma imagem do slide usando ML |

### Apresentação

| Ferramenta | Descrição |
|------|-------------|
| `keynote_start` | Iniciar a apresentação, opcionalmente a partir de um slide específico |
| `keynote_stop` | Interromper a apresentação ativa |

### Exportar

| Ferramenta | Descrição |
|------|-------------|
| `keynote_export_pdf` | Exportar para PDF |
| `keynote_export_pdf_advanced` | Exportar para PDF com layout de folheto, notas, senhas e opções de qualidade de imagem. |
| `keynote_export_images` | Exportar cada slide como PNG / JPEG / TIFF. |
| `keynote_export_movie` | Exportar como um filme QuickTime. |
| `keynote_export_movie_advanced` | Exportar como um filme com codec (H.264, HEVC, escala completa ProRes), resolução e taxa de quadros. |
| `keynote_export_pptx` | Exportar como Microsoft PowerPoint. |
| `keynote_export_html` | Exportar como um site HTML estático. |

### Conexões (pipelines)

| Ferramenta | Descrição |
|------|-------------|
| `keynote_from_markdown` | Criar uma apresentação a partir de um documento Markdown (títulos → slides). |
| `keynote_to_storyboard_fcp` | Converter uma apresentação Keynote para um storyboard FCP em formato FCPXML. |
| `keynote_to_compressor_gif` | Exportar uma apresentação como um GIF animado usando o Compressor. |

## Exemplo

Criar uma apresentação a partir de Markdown e exportar para PPTX:

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

Exportar os slides como um filme ProRes:

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

## Perfil de recuperação

```typescript
import { recovery } from "@creator-studio-os/keynote";
// recovery.app === "keynote"
```

## Requisitos do macOS

`@creator-studio-os/keynote` é exclusivo para macOS (`"os": ["darwin"]`). As ferramentas de aprendizado de máquina requerem o Keynote da assinatura Creator Studio. As ferramentas padrão funcionam com o Keynote gratuito e independente da Mac App Store.

---

[README principal](../../README.md) · [Registro de alterações](../../CHANGELOG.md) · [Segurança](../../SECURITY.md)
