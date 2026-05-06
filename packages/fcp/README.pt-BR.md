<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.md">English</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/fcp

> Ferramentas para Final Cut Pro no Creator Studio OS — criação de arquivos FCPXML 1.14, validação de DTD, importação para o FCP e inspeção da biblioteca AppleScript.

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-97%25-brightgreen.svg" alt="Coverage 97%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Parte do plano de controle MCP do [Creator Studio OS](../../README.md) para aplicativos Apple Creator Studio.

---

## Instalação

```bash
npm install @creator-studio-os/fcp
```

Requer Final Cut Pro (Creator Studio ou versão independente) e macOS 13 ou superior.

## O que este pacote faz

A interface AppleScript do Final Cut Pro é **somente leitura** — você pode inspecionar bibliotecas e metadados, mas não pode criar linhas do tempo via AppleScript. O caminho de criação suportado é a importação de arquivos FCPXML.

`@creator-studio-os/fcp` é a ponte: crie linhas do tempo como especificações JSON, construa + valide arquivos FCPXML 1.14 (ou 1.13), grave no disco e acione a importação para o FCP — tudo em uma única chamada.

## Ferramentas (22)

| Ferramenta | Descrição |
|------|-------------|
| `fcp_project_list` | Lista os projetos no diretório de dados |
| `fcp_project_create` | Cria um diretório de projeto com a estrutura de subdiretórios padrão |
| `fcp_project_info` | Lê os metadados do projeto e os caminhos resolvidos |
| `fcp_fcpxml_build` | Cria uma linha do tempo a partir de uma especificação JSON — clipes, títulos, transições, áudio |
| `fcp_fcpxml_validate` | Valida o arquivo FCPXML em relação ao DTD incluído (`xmllint`) |
| `fcp_fcpxml_write` | Grava um documento FCPXML no diretório `fcp/` do projeto |
| `fcp_fcpxml_import` | Abre um arquivo FCPXML no Final Cut Pro |
| `fcp_fcpxml_build_write_import` | Constrói, valida, grava e importa em uma única chamada |
| `fcp_library_list` | Lista as bibliotecas abertas no Final Cut Pro |
| `fcp_library_events` | Lista os eventos dentro de uma biblioteca aberta |
| `fcp_event_projects` | Lista os projetos dentro de um evento |
| `fcp_project_metadata` | Lê os metadados da sequência (duração, taxa de quadros, formato de timecode) |
| `fcp_safety_compound` | Verifica sobreposições de clipes primários que causam clipes compostos implícitos |
| `fcp_safety_captions` | Verifica a formatação das atribuições de função de legenda para o formato exigido pelo FCP |
| `fcp_safety_anchors` | Detecta colisões de âncoras de títulos entre as faixas |
| `fcp_app_open` | Abre o Final Cut Pro |
| `fcp_app_activate` | Traz o Final Cut Pro para a frente |
| `fcp_app_running` | Verifica se o Final Cut Pro está atualmente em execução |
| `fcp_bind_motion_param` | Lê os parâmetros publicados de um modelo Motion |
| `fcp_effects_catalog` | Percorre os diretórios de modelos Motion e retorna um catálogo de todos os efeitos |
| `fcp_round_trip_diff` | Compara dois documentos FCPXML; detecta as 12 transformações de ida e volta conhecidas do FCP |
| `fcp_round_trip_capture` | Extrai o FCPXML de dentro de um pacote de biblioteca do FCP |

## Exemplo

Cria e importa uma linha do tempo em uma única chamada:

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

## Construtor de FCPXML

```typescript
import { buildFCPXML, validateFCPXML } from "@creator-studio-os/fcp";

const xml = buildFCPXML(spec);           // returns FCPXML string
const { valid, output } = validateFCPXML(xml);  // runs xmllint against bundled DTD
```

## Requisitos do macOS

`@creator-studio-os/fcp` é exclusivo para macOS (`"os": ["darwin"]`). A validação de DTD usa o `xmllint` das Ferramentas de Linha de Comando do Xcode. O DTD incluído é o `FCPXMLv1_14.dtd` do pacote do aplicativo Final Cut Pro.

---

[README principal](../../README.md) · [Registro de alterações](../../CHANGELOG.md) · [Referência FCPXML](../../docs/reference/fcpxml.md)
