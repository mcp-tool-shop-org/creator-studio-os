<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.md">English</a>
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

Plano de controle MCP para aplicativos Apple Creator Studio. Controle o **Final Cut Pro**, **Compressor**, **Motion**, **Pixelmator Pro**, **Logic Pro**, **Keynote**, **Pages** e **Numbers** a partir do Claude ou de qualquer cliente MCP.

Este pacote é a **interface de linha de comando (CLI) principal** — ele agrupa todos os 9 pacotes `@creator-studio-os/*` e os expõe como um único comando `creator-studio-os serve`.

## Instalação

```bash
npm install -g @creator-studio-os/creator-studio-os
```

Ou via npx (sem instalação):

```bash
npx @creator-studio-os/creator-studio-os serve
```

## Configuração do cliente MCP

Adicione o seguinte a `claude_desktop_config.json` (ou equivalente):

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

## O que está incluído

| Pacote | Ferramentas | O que ele controla |
|---------|-------|----------------|
| `@creator-studio-os/core` | 1 | Ambiente de execução compartilhado, executores de AppleScript, esquema de projeto. |
| `@creator-studio-os/compressor` | 15 | Codificação sem interface, tarefas em lote, progresso em tempo real. |
| `@creator-studio-os/fcp` | 22 | Criação de FCPXML 1.14, validação de DTD, importação para FCP. |
| `@creator-studio-os/iwork-docs` | 10 | Ciclo de vida e exportação de documentos Pages e Numbers. |
| `@creator-studio-os/keynote` | 56 | Automação completa do Keynote — slides, ML, exportação, pontes de pipeline. |
| `@creator-studio-os/logic` | 3 | Inicialização do Logic Pro e abertura de projetos `.logicx`. |
| `@creator-studio-os/motion` | 10 | Mutação de modelo OZML, renderização sem interface. |
| `@creator-studio-os/pixelmator` | 33 | Edição de camadas, efeitos de ML, compositor de cartões de marca. |
| `@creator-studio-os/protocols` | 3 | Pipelines de orquestração entre aplicativos. |

**Total: 153 ferramentas em 9 pacotes.**

## Pipeline entre aplicativos

O caso de uso principal: `csos_protocol_run` orquestra todos os 8 aplicativos em um único comando —

1. Pixelmator Pro compõe cartões de marca por cena.
2. Motion renderiza sobreposições de "lower-third" sem interface, via Compressor.
3. A linha do tempo FCPXML 1.14 é criada e importada para o Final Cut Pro.
4. O Compressor codifica o produto final (ProRes principal + H.264 para redes sociais).

## Interface de linha de comando (CLI)

```bash
creator-studio-os serve          # start MCP server
creator-studio-os verify         # verify xmllint + DTD round-trip
creator-studio-os smoke          # run 9-phase smoke test against live apps
creator-studio-os smoke --dry-run  # smoke test without live app calls
```

## Usando os pacotes individualmente

Cada pacote de aplicativo é publicado separadamente. Instale apenas o que você precisa:

```bash
npm install @creator-studio-os/fcp       # Final Cut Pro only
npm install @creator-studio-os/keynote   # Keynote only
npm install @creator-studio-os/pixelmator  # Pixelmator Pro only
```

## Segurança

Executa totalmente no dispositivo — sem chamadas de rede, sem telemetria, sem credenciais armazenadas. Modelo de ameaças completo em [SECURITY.md](SECURITY.md) e em [`docs/threat-model.md`](https://github.com/mcp-tool-shop-org/creator-studio-os/blob/main/docs/threat-model.md).

## Requisitos do macOS

macOS 13+ e assinatura Apple Creator Studio (ou compras individuais de aplicativos na Mac App Store, quando disponíveis). Consulte o arquivo README de cada pacote para os requisitos específicos de cada aplicativo.

---

[Documentação completa](https://github.com/mcp-tool-shop-org/creator-studio-os) · [Registro de alterações](CHANGELOG.md) · [Segurança](SECURITY.md)
