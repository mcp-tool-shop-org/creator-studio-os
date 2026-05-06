<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.md">English</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/logic

> Ferramentas do Logic Pro para o Creator Studio OS — gerenciamento do ciclo de vida e transferência de projetos `.logicx`.

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-100%25-brightgreen.svg" alt="Coverage 100%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Parte do plano de controle MCP (Management Control Plane) do Creator Studio OS para aplicativos Apple Creator Studio.

---

## Instalação

```bash
npm install @creator-studio-os/logic
```

Requer Logic Pro (Creator Studio) e macOS 13 ou superior.

## O que este pacote faz

O Logic Pro não expõe nenhuma interface AppleScript — não existe um dicionário sdef. `@creator-studio-os/logic` lida com o que é possível: iniciar o Logic, verificar se ele está em execução e abrir arquivos de projeto `.logicx` através do comando `open -b com.apple.logic10`. A automação adicional após a abertura fica a cargo do usuário na interface gráfica do Logic.

## Ferramentas (3)

| Ferramenta | Descrição |
|------|-------------|
| `logic_app_open` | Abrir o Logic Pro (não faz nada se já estiver em execução) |
| `logic_app_running` | Verificar se o Logic Pro está em execução |
| `logic_open` | Abrir um arquivo de projeto `.logicx` — o Logic é iniciado e ele é aberto |

## Exemplo

```typescript
import { registerLogicTools } from "@creator-studio-os/logic";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "csos", version: "2.0.0" });
registerLogicTools(server);
```

Abrir um projeto do Logic:

```json
// Tool: logic_open
{ "path": "/projects/csos-showcase/audio/session.logicx" }
```

## Perfil de recuperação

```typescript
import { recovery } from "@creator-studio-os/logic";
// recovery.app === "logic"
// recovery.badStatePattern === null  (no bad-state detection for Logic)
```

## Requisito do macOS

`@creator-studio-os/logic` é exclusivo para macOS (`"os": ["darwin"]`). É necessário o Logic Pro, que é fornecido como parte da assinatura Apple Creator Studio.

---

[README principal](../../README.md) · [Histórico de alterações](../../CHANGELOG.md) · [Segurança](../../SECURITY.md)
