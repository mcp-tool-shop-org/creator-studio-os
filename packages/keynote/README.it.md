<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.md">English</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/keynote

> Strumenti per Keynote per Creator Studio OS: 56 strumenti per l'automazione delle presentazioni, l'importazione di Markdown, la conversione di storyboard in FCPXML e l'esportazione in formati multipli.

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-99%25-brightgreen.svg" alt="Coverage 99%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Parte del piano di controllo MCP [Creator Studio OS](../../README.md) per le app Apple Creator Studio.

---

## Installazione

```bash
npm install @creator-studio-os/keynote
```

Richiede Keynote (versione Creator Studio o standalone) e macOS 13 o superiore.

## Cosa fa questo pacchetto

L'interfaccia AppleScript più completa di qualsiasi app Apple: Keynote espone un ricco dizionario sdef per la creazione, la modifica e l'esportazione di presentazioni. `@creator-studio-os/keynote` include l'intera interfaccia: 56 strumenti che coprono l'intero ciclo di vita delle slide, testo, tabelle, grafici, immagini, transizioni, effetti ML, esportazione e due bridge per pipeline (importazione di Markdown + esportazione di storyboard in FCPXML).

## Strumenti (56)

### Ciclo di vita dell'applicazione

| Strumento | Descrizione |
|------|-------------|
| `keynote_app_open` | Attiva Keynote |
| `keynote_app_running` | Verifica se Keynote è in esecuzione |

### Ciclo di vita del documento

| Strumento | Descrizione |
|------|-------------|
| `keynote_open` | Apri un file `.key`; restituisce il suo nome (utilizzato da tutti gli altri strumenti) |
| `keynote_close` | Chiudi un documento (con salvataggio opzionale) |
| `keynote_save` | Salva un documento, eventualmente in un percorso diverso |
| `keynote_list_presentations` | Elenca tutti i documenti aperti |
| `keynote_create_presentation` | Crea una nuova presentazione vuota |
| `keynote_set_doc_size` | Imposta le dimensioni delle slide (ad esempio, 1920x1080 per 16:9) |
| `keynote_set_kiosk_mode` | Configura la riproduzione automatica, il loop automatico e il timeout di inattività per i display kiosk |

### Temi e modelli

| Strumento | Descrizione |
|------|-------------|
| `keynote_list_themes` | Elenca tutti i temi disponibili |
| `keynote_apply_theme` | Applica un tema a un documento |
| `keynote_list_masters` | Elenca i layout del modello delle slide nel tema corrente |
| `keynote_set_slide_master` | Imposta il layout del modello per una slide |

### Gestione delle slide

| Strumento | Descrizione |
|------|-------------|
| `keynote_list_slides` | Elenca tutte le slide con indice, titolo e stato di "salto" |
| `keynote_get_slide` | Leggi il titolo, il corpo, le note e la transizione di una slide |
| `keynote_make_slide` | Aggiungi una nuova slide |
| `keynote_delete_slide` | Elimina una slide |
| `keynote_duplicate_slide` | Duplica una slide |
| `keynote_reorder_slide` | Sposta una slide in una posizione diversa |
| `keynote_skip_slide` | Imposta una slide come "saltata" o rimuovi il flag di "salto" |

### Testo e contenuto

| Strumento | Descrizione |
|------|-------------|
| `keynote_set_title` | Imposta il testo del titolo in una slide |
| `keynote_set_body` | Imposta il testo del corpo in una slide |
| `keynote_set_text_style` | Applica uno stile al testo (font, dimensione, colore) su qualsiasi elemento della slide |
| `keynote_get_presenter_notes` | Leggi le note del presentatore da una slide |
| `keynote_set_presenter_notes` | Imposta le note del presentatore in una slide |
| `keynote_extract_all_notes` | Estrai le note del presentatore e i titoli da ogni slide |

### Transizioni

| Strumento | Descrizione |
|------|-------------|
| `keynote_set_transition` | Imposta una transizione per una slide (tutti i 43 effetti sdef + timing) |
| `keynote_plan_magic_move` | Prepara due slide per una transizione Magic Move |

### Elementi: immagini, forme, linee, tabelle, grafici

| Strumento | Descrizione |
|------|-------------|
| `keynote_list_items` | Elenca tutti gli elementi iWork in una slide |
| `keynote_position_item` | Ridisponi e/o ridimensiona un elemento della slide |
| `keynote_format_item` | Imposta l'opacità, la rotazione e la riflessione su un elemento della slide |
| `keynote_get_item_info` | Leggi la posizione, le dimensioni, l'opacità e la rotazione di un elemento |
| `keynote_insert_image` | Inserisci un'immagine da un percorso di file |
| `keynote_set_voiceover_description` | Imposta la descrizione di accessibilità VoiceOver su un'immagine della slide |
| `keynote_insert_shape` | Inserisci una forma rettangolare |
| `keynote_insert_line` | Inserisci un elemento linea |
| `keynote_insert_table` | Inserisci una tabella |
| `keynote_read_table` | Leggi i valori delle celle come un array 2D |
| `keynote_write_table` | Scrivi i valori delle celle da un array 2D |
| `keynote_make_chart` | Aggiungi un grafico con nomi di riga, nomi di colonna e dati |
| `keynote_make_image_slides` | Aggiungi in blocco una slide per ogni immagine da una lista di file |

### Effetti ML (solo per Creator Studio)

| Strumento | Descrizione |
|------|-------------|
| `keynote_clean_up_slide` | Pulisci una slide utilizzando l'ottimizzazione del layout integrata di Keynote |
| `keynote_super_resolution` | Applica l'upscaling a super-risoluzione ML a un'immagine della slide |
| `keynote_remove_background` | Rimuovi lo sfondo da un'immagine della slide utilizzando l'ML |

### Presentazione

| Strumento | Descrizione |
|------|-------------|
| `keynote_start` | Avvia la presentazione, eventualmente da una slide specifica |
| `keynote_stop` | Interrompi la presentazione attiva |

### Esportazione

| Strumento | Descrizione |
|------|-------------|
| `keynote_export_pdf` | Esportazione in PDF |
| `keynote_export_pdf_advanced` | Esportazione in PDF con layout per dispense, note, password e opzioni di qualità delle immagini. |
| `keynote_export_images` | Esportazione di ogni diapositiva come file PNG / JPEG / TIFF. |
| `keynote_export_movie` | Esportazione come video QuickTime. |
| `keynote_export_movie_advanced` | Esportazione come video con codec (H.264, HEVC, scala completa di ProRes), risoluzione e framerate. |
| `keynote_export_pptx` | Esportazione in formato Microsoft PowerPoint. |
| `keynote_export_html` | Esportazione come sito HTML statico. |

### Connessioni (pipeline)

| Strumento | Descrizione |
|------|-------------|
| `keynote_from_markdown` | Creazione di una presentazione da un documento Markdown (titoli → diapositive). |
| `keynote_to_storyboard_fcp` | Conversione di una presentazione Keynote in uno storyboard FCP in formato FCPXML. |
| `keynote_to_compressor_gif` | Esportazione di una presentazione come GIF animata tramite Compressor. |

## Esempio

Creazione di una presentazione da Markdown ed esportazione in formato PPTX:

```json
// Tool: keynote_from_markdown
{
  "markdownPath": "/projects/brief.md",
  "masterMap": {
    "h1": "Title",
    "h2": "Section Header",
    "bullets": "Bullets"
  }
}

// Tool: keynote_export_pptx
{
  "documentName": "brief.key",
  "outputPath": "/projects/brief.pptx"
}
```

Esportazione delle diapositive come video ProRes:

```json
// Tool: keynote_export_movie_advanced
{
  "documentName": "csos-showcase.key",
  "outputPath": "/projects/csos-showcase/out/slideshow.mov",
  "codec": "ProRes 4444",
  "width": 1920,
  "height": 1080,
  "frameRate": "29.97"
}
```

## Profilo di ripristino

```typescript
import { recovery } from "@creator-studio-os/keynote";
// recovery.app === "keynote"
```

## Requisiti macOS

`@creator-studio-os/keynote` è disponibile solo per macOS (`"os": ["darwin"]`). Gli strumenti di machine learning richiedono Keynote incluso nell'abbonamento Creator Studio. Gli strumenti standard funzionano con la versione gratuita di Keynote disponibile sull'App Store di Mac.

---

[README principale](../../README.md) · [Registro delle modifiche](../../CHANGELOG.md) · [Sicurezza](../../SECURITY.md)
