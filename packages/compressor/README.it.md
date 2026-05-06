<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.md">English</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/compressor

> Strumenti per la compressione per Creator Studio OS: codifica senza interfaccia grafica, elaborazione in batch, streaming in tempo reale dello stato di avanzamento e ripristino del demone.

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-95%25-brightgreen.svg" alt="Coverage 95%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Parte del piano di controllo MCP (Media Conversion Pipeline) per le applicazioni Apple Creator Studio.

---

## Installazione

```bash
npm install @creator-studio-os/compressor
```

Richiede Compressor (incluso in Apple Creator Studio) e macOS 13 o superiore.

## Cosa fa questo pacchetto

Controlla Apple Compressor tramite la sua interfaccia a riga di comando (CLI) (`-jobpath`, `-monitor`) – non è necessaria la programmazione dell'interfaccia grafica. Invia lavori di codifica, visualizza lo stato di avanzamento in tempo reale, esamina i file `.compressorsetting` e ripristina il sistema in caso di blocchi del demone.

## Strumenti (15)

| Strumento | Descrizione |
|------|-------------|
| `compressor_app_open` | Apri Compressor (operazione idempotente; attiva la licenza al primo utilizzo). |
| `compressor_app_running` | Verifica se Compressor è attualmente in esecuzione. |
| `compressor_encode` | Invia un singolo lavoro di codifica alla coda di Compressor tramite la CLI. |
| `compressor_encode_project` | Wrapper per lavori di codifica per i workflow specifici del progetto csos. |
| `compressor_status` | Controllo dello stato di un lavoro o di un batch (percentuale di completamento, tempo rimanente, ecc.). |
| `compressor_monitor_stream` | Visualizza lo stato di avanzamento della codifica tramite `-monitor -format json`; emette periodicamente StatusFrames. |
| `compressor_pause` | Metti in pausa un lavoro o un batch. |
| `compressor_resume` | Riprendi un lavoro o un batch in pausa. |
| `compressor_kill` | Annulla un lavoro o un batch. |
| `compressor_wait_for` | Monitora fino a quando un lavoro raggiunge uno stato finale (completato/fallito/annullato). |
| `compressor_settings_list` | Elenca le impostazioni di codifica disponibili con i relativi flag di disponibilità. |
| `compressor_settings_inspect` | Analizza un file `.compressorsetting` – codec, bitrate, dimensioni, metadati HDR. |
| `compressor_settings_resolve` | Ricerca inversa del percorso di un file `.compressorsetting` tramite il nome visualizzato. |
| `compressor_locations_list` | Elenca le posizioni di output disponibili per Compressor. |
| `compressor_codec_availability` | Indica quali codec sono disponibili su questo sistema. |

## Esempio

```typescript
import { registerCompressorTools } from "@creator-studio-os/compressor";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "csos", version: "2.0.0" });
registerCompressorTools(server);
```

Invia un lavoro di codifica e visualizza lo stato di avanzamento:

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

## Ripristino

```typescript
import { recovery } from "@creator-studio-os/compressor";

// recovery.app === "compressor"
// recovery.recover() restarts the Compressor daemon if it hangs
```

Il profilo `recovery` si integra con `withDaemonRecovery` da `@creator-studio-os/core` per il riavvio automatico in caso di guasto del demone.

## Requisito macOS

`@creator-studio-os/compressor` è disponibile solo per macOS (`"os": ["darwin"]` in `package.json`). Il percorso della CLI di Compressor viene risolto in fase di esecuzione dal bundle dell'applicazione installata.

---

[README principale](../../README.md) · [Registro delle modifiche](../../CHANGELOG.md) · [Sicurezza](../../SECURITY.md)
