<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.md">English</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/core

> Ambiente de execução compartilhado para o Creator Studio OS — executores de AppleScript, esquema de projeto, registro, tipos de erro, automação compartilhada do iWork.

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-89%25-brightgreen.svg" alt="Coverage 89%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Parte do plano de controle MCP (Metadata Control Plane) para aplicativos Apple Creator Studio, conforme descrito em [Creator Studio OS](../../README.md).

---

## Instalação

```bash
npm install @creator-studio-os/core
```

## O que este pacote faz

`@creator-studio-os/core` é a base do ambiente de execução compartilhada por todos os outros pacotes `@creator-studio-os/*`. Ele fornece:

- **Executores de AppleScript** — `runAppleScript`, `runApp`, `awaitOutput`, `openApp`, `withDaemonRecovery`
- **Esquema de projeto** — Esquema Zod `ProjectV2`, resolvedor e mapa de caminhos tipados
- **Sistema de erros** — `CreatorStudioError` com estrutura `{ código, mensagem, dica }`
- **Configuração** — `loadConfig()` lê `CREATOR_STUDIO_DATA_DIR` e todos os identificadores de aplicativos (bundle IDs)
- **Registro** — Histórico estruturado de projetos e operações em `<dataDir>/.csos/ledger.jsonl`
- **iWork compartilhado** — `openDocumentInApp`, `closeDocumentInApp`, `exportDocumentInApp`, `activateApp`, `isAppRunning`

## Ferramenta (1)

| Ferramenta | Descrição |
|------|-------------|
| `csos_app_status` | Verifica se algum aplicativo Creator Studio está em execução e funcionando corretamente. Passe `app="all"` para consultar todos os 8 de uma vez. |

## Exemplo

```typescript
import {
  runAppleScript,
  CreatorStudioError,
  loadConfig,
  registerStatusTool,
} from "@creator-studio-os/core";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "csos", version: "2.0.0" });
registerStatusTool(server);

// Escape user input before interpolation — always
const name = escapeAppleScriptString(userInput);
const result = await runAppleScript(`tell app "Keynote" to get name of document "${name}"`);
```

## Tratamento de erros

Todos os erros de tempo de execução são `CreatorStudioError`:

```typescript
import { CreatorStudioError } from "@creator-studio-os/core";

try {
  await runAppleScript(`...`);
} catch (err) {
  if (err instanceof CreatorStudioError) {
    console.error(err.code);   // "E_OSASCRIPT_FAILED", "E_AUTOMATION_DENIED", …
    console.error(err.hint);   // actionable suggestion
  }
}
```

## Requisitos do macOS

`@creator-studio-os/core` é exclusivo para macOS (`"os": ["darwin"]`). Os executores de AppleScript invocam `osascript`; `openApp` usa `open -b <bundleId>`.

---

[README principal](../../README.md) · [Registro de alterações](../../CHANGELOG.md) · [Segurança](../../SECURITY.md)
