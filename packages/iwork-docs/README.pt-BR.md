<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.md">English</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/iwork-docs

> Ferramentas Pages e Numbers para o Creator Studio OS — ciclo de vida de documentos e planilhas, exportação em múltiplos formatos (PDF, Word, EPUB, Excel, CSV).

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-100%25-brightgreen.svg" alt="Coverage 100%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Parte do plano de controle MCP do [Creator Studio OS](../../README.md) para aplicativos Apple Creator Studio.

---

## Instalação

```bash
npm install @creator-studio-os/iwork-docs
```

Requer Pages e/ou Numbers (parte do Apple iWork, gratuito na Mac App Store) e macOS 13 ou superior.

## O que este pacote faz

Controla o Apple Pages e o Numbers através do AppleScript — abre, fecha e exporta documentos em múltiplos formatos sem interagir com a interface gráfica.

## Ferramentas (10)

### Pages (5)

| Ferramenta | Descrição |
|------|-------------|
| `pages_app_open` | Ativar Pages |
| `pages_app_running` | Verifica se o Pages está em execução |
| `pages_open` | Abre um documento Pages; retorna o nome do documento |
| `pages_close` | Fecha um documento Pages (com opção de salvar) |
| `pages_export` | Exporta para PDF, Word, RTF, texto simples ou EPUB |

### Numbers (5)

| Ferramenta | Descrição |
|------|-------------|
| `numbers_app_open` | Ativar Numbers |
| `numbers_app_running` | Verifica se o Numbers está em execução |
| `numbers_open` | Abre um documento Numbers; retorna o nome do documento |
| `numbers_close` | Fecha um documento Numbers (com opção de salvar) |
| `numbers_export` | Exporta para PDF, Microsoft Excel ou CSV |

## Exemplo

```typescript
import { registerPagesTools, registerNumbersTools } from "@creator-studio-os/iwork-docs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "csos", version: "2.0.0" });
registerPagesTools(server);
registerNumbersTools(server);
```

Exporta um documento Pages para Word:

```json
// Tool: pages_export
{
  "documentName": "Creative Brief.pages",
  "outputPath": "/projects/brief.docx",
  "format": "Word"
}
```

Exporta uma planilha Numbers para CSV:

```json
// Tool: numbers_export
{
  "documentName": "Production Log.numbers",
  "outputPath": "/projects/log.csv",
  "format": "CSV"
}
```

## Perfis de recuperação

```typescript
import { pagesRecovery, numbersRecovery } from "@creator-studio-os/iwork-docs";

// pagesRecovery.app   === "pages"
// numbersRecovery.app === "numbers"
```

## Requisito do macOS

`@creator-studio-os/iwork-docs` é exclusivo para macOS (`"os": ["darwin"]`). Pages e Numbers devem estar instalados e as permissões de Acessibilidade/Automação devem ser concedidas na primeira execução.

---

[README principal](../../README.md) · [Registro de alterações](../../CHANGELOG.md) · [Segurança](../../SECURITY.md)
