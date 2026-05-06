<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.md">English</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/protocols

> Protocolos de composição entre aplicativos para o Creator Studio OS — pipelines de orquestração "brand-deck-minimal" e "steam-trailer-minimal".

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-85%25-brightgreen.svg" alt="Coverage 85%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Parte do plano de controle MCP (Media Content Platform) do [Creator Studio OS](../../README.md) para aplicativos Apple Creator Studio.

---

## Instalação

```bash
npm install @creator-studio-os/protocols
```

Requer todos os oito aplicativos Creator Studio e macOS 13 ou superior.

## O que este pacote faz

`@creator-studio-os/protocols` orquestra todo o pipeline entre aplicativos — cartões de marca do Pixelmator → renderização de vinhetas do Motion → construção de FCPXML → importação para o FCP → codificação com o Compressor — em uma única execução que pode ser retomada.

Os protocolos são **geradores passo a passo**: cada etapa é idempotente e a execução pode ser retomada de qualquer etapa concluída usando `--resume <taskId>`.

## Ferramentas (3)

| Ferramenta | Descrição |
|------|-------------|
| `csos_protocol_run` | Executa um protocolo entre aplicativos de ponta a ponta contra um arquivo `ProjectV2` project.json. Retorna um `taskId` imediatamente; verifique o status e o resumo da etapa final. Suporta `--resume <taskId>` para pular etapas já concluídas. |
| `csos_protocol_list` | Lista todos os protocolos registrados com nomes, descrições e contagem de etapas. |
| `csos_protocol_describe` | Descreve um protocolo específico — propósito, nomes das etapas e notas de uso. |

## Protocolos

### `brand-deck-minimal` (13 etapas)

O pipeline principal entre aplicativos. Dado um arquivo `ProjectV2` project.json com cenas definidas:

1. Valida as entradas e o esquema do projeto.
2. Componha cartões de marca do Pixelmator por cena (tokens `{{HEADLINE}}` e `{{SUBHEAD}}`).
3. *(opcional)* Renderize uma vinheta do Motion sobreposta por cena de forma autônoma via Compressor.
4. Crie uma linha do tempo FCPXML 1.14 a partir da lista de cenas.
5. Valide o FCPXML em relação ao DTD incluído.
6. Grave o FCPXML em `<project>/fcp/`.
7. Importe para o Final Cut Pro.
8. Envie a tarefa de codificação principal para o Compressor.
9. Envie a tarefa de codificação para redes sociais para o Compressor.
10. Monitore o progresso da codificação até o estado final.
11. Verifique se os arquivos de saída existem.
12. Grave uma entrada no registro.
13. Retorne o resumo da etapa final.

### `steam-trailer-minimal`

Apelido para `brand-deck-minimal` (v1.7.7+). Sequência de etapas idêntica.

## Exemplo

```typescript
import { registerProtocolTools } from "@creator-studio-os/protocols";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "csos", version: "2.0.0" });
registerProtocolTools(server);
```

Execute o pipeline completo:

```json
// Tool: csos_protocol_run
{
  "protocol": "brand-deck-minimal",
  "projectPath": "/projects/csos-showcase/project.json"
}
// → { "taskId": "task_abc123", "status": "running" }

// Poll for completion:
// Tool: csos_protocol_describe — for step names
// Tool: csos_protocol_run with --resume <taskId> — to resume after interruption
```

## Possibilidade de retomada

Cada etapa registra sua saída no registro do projeto. Se uma execução for interrompida (falha do Compressor, travamento da importação no FCP), retome da última etapa concluída:

```json
// Tool: csos_protocol_run
{
  "protocol": "brand-deck-minimal",
  "projectPath": "/projects/csos-showcase/project.json",
  "resume": "task_abc123"
}
```

## Uso programático

```typescript
import { runProtocol, listProtocols, STEP_NAMES } from "@creator-studio-os/protocols";

for await (const step of runProtocol({ protocol: "brand-deck-minimal", projectPath: "..." })) {
  console.log(step.name, step.status);
}
```

## Requisito do macOS

`@creator-studio-os/protocols` é exclusivo para macOS (`"os": ["darwin"]`). Todos os oito aplicativos Creator Studio devem estar instalados e com permissão de automação concedida.

---

[README principal](../../README.md) · [Registro de alterações](../../CHANGELOG.md) · [Segurança](../../SECURITY.md)
