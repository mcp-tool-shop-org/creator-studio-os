<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.md">English</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/fcp

> Strumenti per Final Cut Pro per Creator Studio OS: creazione di file FCPXML 1.14, validazione DTD, importazione in FCP e ispezione della libreria AppleScript.

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-97%25-brightgreen.svg" alt="Coverage 97%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Parte del piano di controllo MCP (Media Content Platform) per le applicazioni Apple Creator Studio.

---

## Installazione

```bash
npm install @creator-studio-os/fcp
```

Richiede Final Cut Pro (versione Creator Studio o standalone) e macOS 13 o superiore.

## Cosa fa questo pacchetto

L'interfaccia AppleScript di Final Cut Pro è **solo in lettura**: è possibile ispezionare librerie e metadati, ma non è possibile creare sequenze tramite AppleScript. Il percorso di creazione supportato è l'importazione di file FCPXML.

`@creator-studio-os/fcp` è il collegamento: crea sequenze come specifiche JSON, genera e valida file FCPXML 1.14 (o 1.13), scrive su disco e avvia l'importazione in FCP, il tutto con una singola chiamata.

## Strumenti (22)

| Strumento | Descrizione |
|------|-------------|
| `fcp_project_list` | Elenca i progetti nella directory dei dati |
| `fcp_project_create` | Crea una directory di progetto con la struttura di sottodirectory standard |
| `fcp_project_info` | Legge i metadati del progetto e i percorsi risolti |
| `fcp_fcpxml_build` | Crea una sequenza da una specifica JSON: clip, titoli, transizioni, audio |
| `fcp_fcpxml_validate` | Valida il file FCPXML rispetto al DTD incluso (`xmllint`) |
| `fcp_fcpxml_write` | Scrive un documento FCPXML nella directory `fcp/` del progetto |
| `fcp_fcpxml_import` | Apre un file FCPXML in Final Cut Pro |
| `fcp_fcpxml_build_write_import` | Genera, valida, scrive e importa con una singola chiamata |
| `fcp_library_list` | Elenca le librerie aperte in Final Cut Pro |
| `fcp_library_events` | Elenca gli eventi all'interno di una libreria aperta |
| `fcp_event_projects` | Elenca i progetti all'interno di un evento |
| `fcp_project_metadata` | Legge i metadati della sequenza (durata, frame rate, formato timecode) |
| `fcp_safety_compound` | Verifica la sovrapposizione di clip principali che causano clip composti impliciti |
| `fcp_safety_captions` | Verifica la corretta formattazione delle assegnazioni di ruolo delle didascalie per il formato richiesto da FCP |
| `fcp_safety_anchors` | Rileva collisioni di ancoraggio dei titoli tra le tracce |
| `fcp_app_open` | Apre Final Cut Pro |
| `fcp_app_activate` | Porta Final Cut Pro in primo piano |
| `fcp_app_running` | Verifica se Final Cut Pro è attualmente in esecuzione |
| `fcp_bind_motion_param` | Legge i parametri pubblicati da un modello Motion |
| `fcp_effects_catalog` | Scansiona le directory dei modelli Motion e restituisce un catalogo di tutti gli effetti |
| `fcp_round_trip_diff` | Confronta due documenti FCPXML; rileva le 12 trasformazioni "round-trip" note di FCP |
| `fcp_round_trip_capture` | Estrae il file FCPXML da un pacchetto di libreria FCP |

## Esempio

Genera e importa una sequenza con una singola chiamata:

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

## Generatore di file FCPXML

```typescript
import { buildFCPXML, validateFCPXML } from "@creator-studio-os/fcp";

const xml = buildFCPXML(spec);           // returns FCPXML string
const { valid, output } = validateFCPXML(xml);  // runs xmllint against bundled DTD
```

## Requisiti macOS

`@creator-studio-os/fcp` è disponibile solo per macOS (`"os": ["darwin"]`). La validazione DTD utilizza `xmllint` dagli strumenti a riga di comando di Xcode. Il DTD incluso è `FCPXMLv1_14.dtd` dal pacchetto dell'applicazione Final Cut Pro.

---

[README principale](../../README.md) · [Registro delle modifiche](../../CHANGELOG.md) · [Riferimento FCPXML](../../docs/reference/fcpxml.md)
