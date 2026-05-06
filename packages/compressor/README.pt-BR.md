<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.md">English</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/compressor

> Ferramentas de compressão para o Creator Studio OS — codificação sem interface gráfica, tarefas em lote, transmissão de progresso em tempo real e recuperação de processos.

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-95%25-brightgreen.svg" alt="Coverage 95%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Parte do plano de controle MCP (Media Conversion Pipeline) do Creator Studio OS para aplicativos Apple Creator Studio.

---

## Instalação

```bash
npm install @creator-studio-os/compressor
```

Requer o Compressor (parte do Apple Creator Studio) e macOS 13 ou superior.

## O que este pacote faz

Controla o Apple Compressor através da sua interface de linha de comando (CLI) (`-jobpath`, `-monitor`) — não é necessário scripting de interface gráfica. Envie tarefas de codificação, transmita o progresso em tempo real, inspecione arquivos `.compressorsetting` e recupere-se de travamentos do processo.

## Ferramentas (15)

| Ferramenta | Descrição |
|------|-------------|
| `compressor_app_open` | Abre o Compressor (idempotente; ativa a licença na primeira execução). |
| `compressor_app_running` | Verifica se o Compressor está atualmente em execução. |
| `compressor_encode` | Envia uma única tarefa de codificação para a fila do Compressor através da CLI. |
| `compressor_encode_project` | Wrapper para tarefas de codificação para fluxos de trabalho específicos do projeto csos. |
| `compressor_status` | Verificação de status única para uma tarefa ou lote (percentagem de conclusão, tempo restante, etc.). |
| `compressor_monitor_stream` | Transmite o progresso da codificação através de `-monitor -format json`; emite StatusFrames periódicos. |
| `compressor_pause` | Pausa uma tarefa ou lote. |
| `compressor_resume` | Retoma uma tarefa ou lote pausada. |
| `compressor_kill` | Cancela uma tarefa ou lote. |
| `compressor_wait_for` | Monitora até que uma tarefa atinja um estado final (concluída/falhada/cancelada). |
| `compressor_settings_list` | Lista as configurações de codificação disponíveis com indicadores de disponibilidade. |
| `compressor_settings_inspect` | Analisa um arquivo `.compressorsetting` — codec, taxa de bits, dimensões, metadados HDR. |
| `compressor_settings_resolve` | Pesquisa o caminho de um arquivo `.compressorsetting` a partir do nome de exibição. |
| `compressor_locations_list` | Lista os locais de saída disponíveis para o Compressor. |
| `compressor_codec_availability` | Informa quais codecs estão disponíveis neste sistema. |

## Exemplo

```typescript
import { registerCompressorTools } from "@creator-studio-os/compressor";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "csos", version: "2.0.0" });
registerCompressorTools(server);
```

Envia uma tarefa de codificação e transmite o progresso:

```json
// Tool: compressor_encode
{
  "inputPath": "/projects/csos-showcase/out/timeline.mov",
  "settingName": "Apple ProRes 422",
  "outputPath": "/projects/csos-showcase/out/final.mov"
}

// Tool: compressor_monitor_stream
{ "jobId": "<returned jobId>" }
```

## Recuperação

```typescript
import { recovery } from "@creator-studio-os/compressor";

// recovery.app === "compressor"
// recovery.recover() restarts the Compressor daemon if it hangs
```

O perfil `recovery` integra-se com `withDaemonRecovery` do `@creator-studio-os/core` para reinicialização automática em caso de falha do processo.

## Requisito do macOS

`@creator-studio-os/compressor` é exclusivo para macOS (`"os": ["darwin"]` em `package.json`). O caminho da CLI do Compressor é resolvido em tempo de execução a partir do pacote de instalação.

---

[README principal](../../README.md) · [Registro de alterações](../../CHANGELOG.md) · [Segurança](../../SECURITY.md)
