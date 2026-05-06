<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.md">English</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="550">
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/creator-studio-os/actions/workflows/ci.yml"><img src="https://github.com/mcp-tool-shop-org/creator-studio-os/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://codecov.io/gh/mcp-tool-shop-org/creator-studio-os"><img src="https://codecov.io/gh/mcp-tool-shop-org/creator-studio-os/branch/main/graph/badge.svg" alt="Coverage"></a>
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <a href="https://mcp-tool-shop-org.github.io/creator-studio-os/"><img src="https://img.shields.io/badge/docs-handbook-informational" alt="Handbook"></a>
</p>

MCP (Media Content Protocol) per le applicazioni Apple Creator Studio. Gestite **Final Cut Pro**, **Compressor**, **Motion**, **Pixelmator Pro**, **Logic Pro**, **Keynote**, **Pages** e **Numbers** da Claude o da qualsiasi client MCP: create contenuti video da specifiche JSON, eseguite il rendering di elementi grafici Motion in background, effettuate la codifica tramite Compressor e generate risorse di branding in un'unica pipeline integrata.

> **v1.7.10** — 78 strumenti per tutte le 8 applicazioni Apple Creator Studio. Protocollo composito cross-app attivo: schede di branding Pixelmator + elementi grafici Motion ProRes 4444 + codifica finale con Compressor. 9 fasi di "smoke" completate con successo. Solo per macOS.

---

## Perché questo strumento esiste

Il dizionario AppleScript di Final Cut Pro è **solo in lettura**: è possibile elencare le librerie e leggere i metadati, ma non è possibile creare sequenze tramite AppleScript. Il percorso di creazione supportato è l'**importazione di file FCPXML**: si scrive un documento FCPXML 1.14 ben formato, lo si passa a FCP e FCP crea il progetto.

`creator-studio-os` è il ponte: Claude crea le sequenze come specifiche JSON, il server crea e convalida i file FCPXML, avvia l'importazione in FCP, esegue il rendering di modelli di elementi grafici Motion in background tramite Compressor e gestisce Pixelmator Pro per le risorse di branding, il tutto in un'unica pipeline integrata.

## Sicurezza

`creator-studio-os` funziona interamente sul dispositivo. Esso:

- Esegue script `osascript` indirizzati alle applicazioni tramite l'ID del bundle (mai tramite il nome del file)
- Scrive solo all'interno della directory `CREATOR_STUDIO_DATA_DIR` — nessun file di sistema, nessun elemento interno delle librerie di FCP
- Non effettua **nessuna chiamata di rete** — nessuna telemetria, nessuna analisi, nessuna convalida remota
- Non memorizza **nessuna credenziale, token o dato utente**
- Esegue l'escape di tutte le stringhe fornite dall'utente prima dell'interpolazione AppleScript (`escapeAppleScriptString`)

Modello di minaccia completo: [`docs/threat-model.md`](./docs/threat-model.md) · [`SECURITY.md`](./SECURITY.md)

## Installazione

```bash
npm install -g @mcptoolshop/creator-studio-os
```

Configurazione del client MCP (`claude_desktop_config.json` o equivalente):

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

Oppure tramite npx:

```json
{ "command": "npx", "args": ["-y", "@mcptoolshop/creator-studio-os", "serve"] }
```

## Verificare la configurazione

```bash
creator-studio-os verify
```

Controlla la piattaforma, `osascript`, `xmllint`, l'installazione di Final Cut Pro, il DTD FCPXML 1.14, la directory dei dati ed esegue un ciclo di importazione/esportazione FCPXML tramite il DTD incluso.

## Directory dei dati

Predefinita: `/Volumes/T9-Shared/AI/creator-studio` (sovrascrivibile tramite `CREATOR_STUDIO_DATA_DIR`).

```
creator-studio/
├── projects/
│   └── <name>/
│       ├── project.json     # ProjectV2 spec (scenes, deliverables, brand, scoreMap)
│       ├── footage/         # raw video
│       ├── audio/           # stems, voiceover, music
│       ├── images/          # stills, thumbnails, key art
│       ├── brand/           # logos, type, color tokens
│       ├── refs/            # mood, scripts, canon excerpts
│       ├── fcp/             # FCPXML output
│       └── out/             # rendered deliverables
└── shared/
    ├── brand/               # studio-wide assets
    └── presets/             # Compressor settings
```

## Protocollo cross-app: `brand-deck-minimal`

La pipeline principale: 13 passaggi da una specifica `project.json` a un file ProRes MOV:

```bash
creator-studio-os protocol run brand-deck-minimal --project demo/csos-showcase/project.json
```

```
1  validate-project       — assert ProjectV2 schema + scene count
2  compose-brand-cards    — Pixelmator Pro: hue-rotated identity cards per scene
3  render-scene-clips     — Motion: clone template → patch title/subhead → Compressor ProRes 4444 render
4  edit-motion-title      — set project-level Motion template title
5  resolve-fcp-params     — compute timeline geometry
6  build-fcpxml           — write FCPXML 1.14 to out/fcp/
7  safety-preflight       — assert brand card files exist
8  dtd-validate           — xmllint against bundled FCP DTD
9  fcp-import             — open .fcpxml in Final Cut Pro
10 compressor-encode      — ffmpeg overlay (brand card + ProRes 4444 alpha clip) → Compressor final encode
11 monitor-encode         — poll encode until done
12 verify-output          — assert MOV exists and has bytes
13 write-replay-manifest  — finalise manifest with completedAt
```

Il formato `project.json`: [`src/projects/types.ts`](./src/projects/types.ts) · esempio: [`demo/csos-showcase/project.json`](./demo/csos-showcase/project.json)

## Strumenti

### Final Cut Pro (22 strumenti)

| Strumento | Scopo |
|------|---------|
| `fcp_project_list` | Elenca i progetti nella directory dei dati |
| `fcp_project_create` | Crea una directory di progetto e un file `project.json` |
| `fcp_project_info` | Legge i metadati del progetto e i percorsi risolti |
| `fcp_fcpxml_build` | Crea un file FCPXML 1.14 da una specifica JSON |
| `fcp_fcpxml_validate` | Convalida il file FCPXML rispetto al DTD incluso |
| `fcp_fcpxml_write` | Scrive il file FCPXML in `projects/<nome>/fcp/` |
| `fcp_fcpxml_import` | Apre un file FCPXML in Final Cut Pro |
| `fcp_fcpxml_build_write_import` | Esecuzione completa: creazione → convalida → scrittura → importazione |
| `fcp_library_list` | Elenca le librerie aperte in FCP |
| `fcp_library_events` | Elenca gli eventi in una libreria |
| `fcp_event_projects` | Elenca i progetti in un evento |
| `fcp_project_metadata` | Legge la durata della sequenza, la frequenza dei fotogrammi, il formato del timecode |
| `fcp_app_open` / `fcp_app_running` / `fcp_app_activate` | Ciclo di vita |
| `fcp_round_trip_diff` | Confronta due file FCPXML, genera una differenza strutturata |
| `fcp_fcpxml_add_title` | Aggiunge un effetto "Titles" a una sequenza |
| `fcp_fcpxml_add_transition` | Aggiunge una transizione tra clip |
| `fcp_fcpxml_add_marker` | Aggiunge un marcatore di capitolo/attività/completamento |
| `fcp_safety_preflight` | Verifica che tutti i file sorgente FCPXML esistano prima dell'importazione |
| `fcp_multicam_build` | Crea un clip multicamera a partire dalle specifiche degli angoli |
| `fcp_caption_build` | Costruisci una traccia di sottotitoli da una trascrizione. |
| `fcp_compound_clip_build` | Costruisci un clip composto da specifiche di sequenza nidificate. |

### Compressore (15 strumenti)

Il Compressore non dispone di un dizionario AppleScript; l'interfaccia è la riga di comando più i file `.compressorbatch`. La prima esecuzione per sessione attiva la convalida delle autorizzazioni dell'App Store (previsto).

| Strumento | Scopo |
|------|---------|
| `compressor_app_open` / `compressor_app_running` | Ciclo di vita |
| `compressor_settings_list` | Elenca le impostazioni predefinite `.compressorsetting`. |
| `compressor_locations_list` | Elenca i file `.compressorlocation`. |
| `compressor_encode` | Invia un singolo lavoro di codifica. |
| `compressor_encode_project` | Codifica rispetto alla directory di un progetto. |
| `compressor_monitor_stream` | Trasmetti i fotogrammi di avanzamento della codifica. |
| `compressor_job_status` | Verifica lo stato di un singolo lavoro. |
| `compressor_batch_status` | Verifica lo stato di tutti i lavori batch attivi. |
| `compressor_cancel_job` | Annulla un lavoro attivo. |
| `compressor_settings_inspect` | Esamina un file `.compressorsetting`. |
| `compressor_batch_build` | Crea un documento XML `.compressorbatch`. |
| `compressor_await_output` | Attendi fino a quando un file di output non è vuoto. |
| `compressor_daemon_recover` | Ripristina un demone di Compressore bloccato. |

Consulta la documentazione [`docs/reference/compressor-cli.md`](./docs/reference/compressor-cli.md).

### Motion (10 strumenti)

| Strumento | Scopo |
|------|---------|
| `motion_app_open` / `motion_app_running` | Ciclo di vita |
| `motion_open` | Apri un modello `.motn`. |
| `motion_template_clone` | Clona un modello `.motn` in un nuovo percorso. |
| `motion_template_set_param` | Imposta un valore di parametro pubblicato (modifica OZML). |
| `motion_template_get_params` | Elenca tutti i parametri pubblicati in un modello. |
| `motion_template_validate` | Convalida la struttura OZML di un file `.motn`. |
| `motion_template_publish_catalog` | Elenca tutti i modelli nel catalogo di pubblicazione di Motion. |
| `motion_publish_to_fcp` | Pubblica un modello di Motion nel browser dei titoli di FCP. |
| `motion_render_via_compressor` | Esegui il rendering di un file `.motn` in video tramite Compressore (senza interfaccia grafica). |

Nota: `motion_template_set_param` e `motion_render_via_compressor` non hanno precedenti in nessun MCP a livello globale; la modifica e il rendering OZML di Motion senza interfaccia grafica sono abilitati esclusivamente da csos.

### Pixelmator Pro (33 strumenti)

| Strumento | Scopo |
|------|---------|
| `pixelmator_app_open` / `pixelmator_app_running` | Ciclo di vita |
| `pixelmator_open` / `pixelmator_close` | Apri/chiudi documenti. |
| `pixelmator_export` | Esporta in PNG / JPEG / TIFF / HEIC / GIF / WebP / PDF / SVG. |
| `pixelmator_resize` / `pixelmator_crop` / `pixelmator_rotate` / `pixelmator_flip` | Trasformazioni. |
| `pixelmator_batch_export_project_images` | Conversione batch di `projects/<nome>/images/`. |
| `pixelmator_layer_list` / `pixelmator_layer_create` / `pixelmator_layer_delete` | Gestione dei livelli. |
| `pixelmator_layer_set_text` / `pixelmator_layer_set_fill` / `pixelmator_layer_move` | Modifica dei livelli. |
| `pixelmator_effects_apply` / `pixelmator_effects_catalog` | Pipeline di effetti ML. |
| `pixelmator_compose_brand_card` | Crea una scheda di marca con rotazione di tonalità e testo del titolo. |
| `pixelmator_hdr_export` | Esporta con mappatura tonale HDR. |
| `pixelmator_text_card` | Esegui il rendering di una scheda con solo testo, con controllo del font e del colore. |

### Logic Pro (3 strumenti)

Logic non dispone di un dizionario AppleScript. Interfaccia: ciclo di vita e passaggio di apertura file per progetti `.logicx`.

| Strumento | Scopo |
|------|---------|
| `logic_app_open` / `logic_app_running` | Ciclo di vita |
| `logic_open` | Apri un progetto `.logicx`. |

### Keynote / Pages / Numbers (18 strumenti combinati)

Tutti e tre condividono una struttura AppleScript quasi identica. Catalogo completo dei formati di esportazione: [`docs/reference/iwork-automation.md`](./docs/reference/iwork-automation.md).

**Keynote (8 strumenti):** apri, chiudi, esporta PDF / immagini / filmato / PPTX, ciclo di vita.
**Pages (5 strumenti):** apri, chiudi, esporta PDF / Word / RTF / EPUB, ciclo di vita.
**Numbers (5 strumenti):** apri, chiudi, esporta PDF / Excel / CSV, ciclo di vita.

### Infrastruttura

| Strumento | Scopo |
|------|---------|
| `csos_app_status` | Controllo dello stato di tutte le 8 applicazioni (in esecuzione, versione, profondità della coda). |
| `csos_protocol_run` | Esegui un protocollo cross-app end-to-end (asincrono, flussi di passaggi). |
| `csos_protocol_list` | Elenca tutti i protocolli registrati. |
| `csos_protocol_describe` | Descrizione dei passaggi e dello scopo di un protocollo. |

## Configurazione consigliata con tool-compass

[tool-compass](https://github.com/mcp-tool-shop-org/tool-compass) è un gateway HNSW semantico che trova lo strumento giusto in base all'intento espresso in linguaggio naturale, il che è fondamentale quando 78 strumenti coprono 8 applicazioni.

```bash
pip install tool-compass
```

Il test di verifica (smoke test) valida 12 query rappresentative nella Fase 7. Qualsiasi modifica alla descrizione che esclude un elemento dai primi 3 risultati con un punteggio superiore a 0,4 fa fallire il test di verifica.

## Permessi

La prima volta che il server utilizza AppleScript su un'applicazione, macOS richiede di concedere il permesso di **automazione** nelle Impostazioni di Sistema → Privacy e Sicurezza → Automazione. Anche l'utilizzo di AppleScript in sola lettura richiede questa autorizzazione.

## CI / verifica

| Verifica. | Cosa. |
|-------|------|
| **A. Security** | [`SECURITY.md`](./SECURITY.md), [`docs/threat-model.md`](./docs/threat-model.md), nessun segreto, nessuna telemetria, nessuna connessione di rete. |
| **B. Errors** | `CreatorStudioError { code, message, hint }`, codici di uscita della CLI, nessuna traccia di stack grezza. |
| **C. Docs** | Questo file README, [`CHANGELOG.md`](./CHANGELOG.md), [`LICENSE`](./LICENSE), `--help` accurato. |
| **D. Hygiene** | `npm test`, `npm run typecheck`, la versione corrisponde al tag, `npm audit`, confezionamento pulito. |

Il CI viene eseguito su `ubuntu-latest` (typecheck + build + unit test + audit). I test di integrazione su applicazioni reali vengono eseguiti tramite `npm run smoke:ci` — i runner macOS non sono inclusi nel CI (costo: macOS ≈ 10 volte Linux al minuto).

## Roadmap (Piano di sviluppo)

- **v1.7.x** — protocollo composito multi-applicazione (`brand-deck-minimal`): schede di branding di Pixelmator + elementi grafici di Motion + codifica di Compressor → ProRes MOV — **disponibile nella versione v1.7.10**.
- **v1.8.x** — validazione dei limiti di testo `patchSiblingText`: avviso di ledger quando il testo in ingresso potrebbe superare i limiti di rendering del template Motion.
- **v2.0** — Fase 3: ampliamento della superficie dei protocolli (pipeline per trailer di Steam, devlog, schede social).

Roadmap delle applicazioni: [`docs/roadmap-fcp.md`](./docs/roadmap-fcp.md), [`docs/roadmap-compressor.md`](./docs/roadmap-compressor.md), [`docs/roadmap.md`](./docs/roadmap.md).

## Licenza

MIT — vedere [LICENSE](./LICENSE).

---

<p align="center">Built by <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a></p>
