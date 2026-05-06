<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.md">English</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/protocols

> Protocolli di composizione tra applicazioni per Creator Studio OS: pipeline di orchestrazione "brand-deck-minimal" e "steam-trailer-minimal".

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-85%25-brightgreen.svg" alt="Coverage 85%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Parte del piano di controllo MCP (Management Control Plane) per le applicazioni Apple Creator Studio.

---

## Installazione

```bash
npm install @creator-studio-os/protocols
```

Richiede tutte e otto le applicazioni Creator Studio e macOS 13 o versioni successive.

## Cosa fa questo pacchetto

`@creator-studio-os/protocols` orchestra l'intera pipeline tra applicazioni: schede di branding di Pixelmator → rendering di elementi grafici di Motion → creazione di file FCPXML → importazione in FCP → codifica con Compressor, il tutto in un'unica operazione riavviabile.

I protocolli sono **generatori passo-passo**: ogni passaggio è idempotente e l'esecuzione può essere ripresa da qualsiasi passaggio completato utilizzando `--resume <taskId>`.

## Strumenti (3)

| Strumento | Descrizione |
|------|-------------|
| `csos_protocol_run` | Esegue un protocollo tra applicazioni dall'inizio alla fine su un file `ProjectV2` project.json. Restituisce immediatamente un `taskId`; monitora lo stato e riepiloga l'ultimo passaggio. Supporta `--resume <taskId>` per saltare i passaggi già completati. |
| `csos_protocol_list` | Elenca tutti i protocolli registrati con nomi, descrizioni e numero di passaggi. |
| `csos_protocol_describe` | Descrive un singolo protocollo: scopo, nomi dei passaggi e note sull'utilizzo. |

## Protocolli

### `brand-deck-minimal` (13 passaggi)

La pipeline principale tra applicazioni. Utilizza un file `ProjectV2` project.json con scene definite:

1. Valida gli input e lo schema del progetto.
2. Crea le schede di branding di Pixelmator per ogni scena (utilizzando i token `{{HEADLINE}}` e `{{SUBHEAD}}`).
3. *(opzionale)* Renderizza un elemento grafico di Motion per ogni scena in modalità "headless" tramite Compressor.
4. Crea una timeline FCPXML 1.14 dalla lista delle scene.
5. Valida il file FCPXML rispetto al DTD incluso.
6. Scrive il file FCPXML nella cartella `<project>/fcp/`.
7. Importa il file in Final Cut Pro.
8. Invia il lavoro di codifica principale a Compressor.
9. Invia il lavoro di codifica per i social media a Compressor.
10. Monitora l'avanzamento della codifica fino al completamento.
11. Verifica che i file di output esistano.
12. Scrive una voce nel registro.
13. Restituisce un riepilogo dell'ultimo passaggio.

### `steam-trailer-minimal`

Alias di `brand-deck-minimal` (versione 1.7.7 o successiva). Stessa sequenza di passaggi.

## Esempio

```typescript
import { registerProtocolTools } from "@creator-studio-os/protocols";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "csos", version: "2.0.0" });
registerProtocolTools(server);
```

Esegue l'intera pipeline:

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

## Riavviabilità

Ogni passaggio registra il suo output nel registro del progetto. Se un'esecuzione viene interrotta (arresto anomalo di Compressor, blocco dell'importazione in FCP), è possibile riprenderla dall'ultimo passaggio completato:

```json
// Tool: csos_protocol_run
{
  "protocol": "brand-deck-minimal",
  "projectPath": "/projects/csos-showcase/project.json",
  "resume": "task_abc123"
}
```

## Utilizzo programmatico

```typescript
import { runProtocol, listProtocols, STEP_NAMES } from "@creator-studio-os/protocols";

for await (const step of runProtocol({ protocol: "brand-deck-minimal", projectPath: "..." })) {
  console.log(step.name, step.status);
}
```

## Requisiti di macOS

`@creator-studio-os/protocols` è disponibile solo per macOS (`"os": ["darwin"]`). Tutte e otto le applicazioni Creator Studio devono essere installate e devono essere concesse le autorizzazioni di automazione.

---

[README principale](../../README.md) · [Registro delle modifiche](../../CHANGELOG.md) · [Sicurezza](../../SECURITY.md)
