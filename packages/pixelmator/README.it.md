<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.md">English</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/pixelmator

> Strumenti di Pixelmator Pro per Creator Studio OS: modifica dei livelli, effetti di apprendimento automatico (ML), composizione di schede di branding ed esportazione in formati multipli.

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
npm install @creator-studio-os/pixelmator
```

Richiede Pixelmator Pro (versione Creator Studio o standalone) e macOS 13 o successivo.

## Cosa fa questo pacchetto

`@creator-studio-os/pixelmator` controlla Pixelmator Pro tramite la sua interfaccia AppleScript, offrendo la più ricca API di modifica immagini potenziata da ML disponibile su macOS. Include 33 strumenti che coprono l'intero ciclo di vita del documento, la manipolazione dello stack dei livelli, algoritmi di ML, regolazioni del colore, effetti e un compositore di schede di branding con dimensioni multiple.

## Strumenti (33)

### Ciclo di vita dell'applicazione e del documento

| Strumento | Descrizione |
|------|-------------|
| `pixelmator_app_open` | Attiva Pixelmator Pro |
| `pixelmator_app_running` | Verifica se Pixelmator Pro è in esecuzione |
| `pixelmator_open` | Apri un documento; restituisce il nome del documento (utilizzato da tutti gli altri strumenti) |
| `pixelmator_close` | Chiudi un documento (senza salvare) |
| `pixelmator_export` | Esporta in formato PNG, JPEG, TIFF, PSD, WebP, HEIC, AVIF |
| `pixelmator_export_hdr` | Esporta in formato HDR JPEG, HDR HEIC, HDR AVIF o HDR PNG |
| `pixelmator_export_video` | Esporta i livelli video in formato MP4 o QuickTime |
| `pixelmator_export_animated` | Esporta in formato GIF animato o PNG animato |
| `pixelmator_export_for_web` | PNG, JPEG, WebP, GIF o SVG ottimizzati per il web |
| `pixelmator_batch_export_project_images` | Esporta in batch tutte le immagini in una cartella `images/` di un progetto |
| `pixelmator_batch_export_project_images_dryrun` | Esecuzione di prova: elenca cosa verrebbe elaborato durante l'esportazione in batch |

### Trasformazioni del documento

| Strumento | Descrizione |
|------|-------------|
| `pixelmator_resize` | Modifica delle dimensioni e/o della risoluzione del documento |
| `pixelmator_crop` | Ritaglia alle dimensioni `{x, y, larghezza, altezza}` |
| `pixelmator_rotate` | Ruota di 180 gradi, a destra (90 gradi in senso orario) o a sinistra (90 gradi in senso antiorario) |
| `pixelmator_flip` | Inverti orizzontalmente o verticalmente |

### Stack dei livelli

| Strumento | Descrizione |
|------|-------------|
| `pixelmator_make_layer` | Aggiungi un livello immagine, di testo o una forma |
| `pixelmator_set_layer_properties` | Modifica della visibilità, dell'opacità, della modalità di fusione, della posizione o delle dimensioni |
| `pixelmator_layer_order` | Riordina un livello (in primo piano/sfondo/prima/dopo) |
| `pixelmator_group_layers` | Sposta i livelli in un nuovo gruppo |
| `pixelmator_ungroup` | Disgruppa un gruppo di livelli |
| `pixelmator_set_layer_text` | Modifica del contenuto e dello stile del testo in un livello di testo |
| `pixelmator_make_shape` | Crea un rettangolo, un'ellisse, un rettangolo con angoli arrotondati o una linea riempita |
| `pixelmator_set_blend_mode` | Imposta la modalità di fusione di composizione (tutte le 28 modalità di Pixelmator Pro) |
| `pixelmator_set_layer_shadow` | Aggiungi o modifica un'ombra |
| `pixelmator_set_layer_stroke` | Aggiungi o modifica un contorno |

### Effetti e regolazioni del colore

| Strumento | Descrizione |
|------|-------------|
| `pixelmator_apply_effect` | Applica una qualsiasi delle 23 classi di effetti non distruttivi |
| `pixelmator_apply_color_adjustment` | Imposta una qualsiasi delle 24 proprietà di regolazione del colore (inclusi il percorso LUT e la vignettatura) |

### ML (Apprendimento Automatico)

| Strumento | Descrizione |
|------|-------------|
| `pixelmator_apply_ml` | Esegui super_resolution, enhance, denoise, deband, match_colors, remove_background, select_subject o auto-adjust |
| `pixelmator_run_shortcut` | Esegui un'azione di Pixelmator Shortcuts per nome tramite `shortcuts run` |

### Rilevamento e sostituzione

| Strumento | Descrizione |
|------|-------------|
| `pixelmator_detect` | Rileva volti o codici QR (riquadri; QR include il payload decodificato) |
| `pixelmator_replace_text` | Trova e sostituisci il testo in tutti i livelli di testo |
| `pixelmator_replace_layer` | Sostituisci il contenuto dei pixel di un livello immagine con un nuovo file |

### Compositore di schede di branding

| Strumento | Descrizione |
|------|-------------|
| `pixelmator_compose_brand_card` | Apri un modello `.pxd`, sostituisci i token `{{HEADLINE}}` / `{{SUBHEAD}}` / `{{LOGO}}` ed esporta in dimensioni multiple |

## Esempio

Genera schede di branding in tre dimensioni da un modello:

```json
// Tool: pixelmator_compose_brand_card
{
  "templatePath": "/projects/csos-showcase/brand/card-template.pxd",
  "brand": {
    "headline": "Creator Studio OS",
    "subhead": "Eight apps. One pipeline.",
    "logoPath": "/projects/csos-showcase/brand/csos-logo.png"
  },
  "sizes": [
    { "width": 1920, "height": 1080, "label": "16x9" },
    { "width": 1080, "height": 1080, "label": "square" },
    { "width": 1080, "height": 1920, "label": "story" }
  ],
  "outputDir": "/projects/csos-showcase/out/brand-cards"
}
```

Applica super-resolution ML e riesporta:

```json
// Tool: pixelmator_apply_ml
{
  "documentName": "hero.pxd",
  "algorithm": "super_resolution"
}

// Tool: pixelmator_export
{
  "documentName": "hero.pxd",
  "outputPath": "/projects/csos-showcase/out/hero-4k.png",
  "format": "PNG"
}
```

## Profilo di ripristino

```typescript
import { recovery } from "@creator-studio-os/pixelmator";
// recovery.app === "pixelmator"
```

## Requisito macOS

`@creator-studio-os/pixelmator` è disponibile solo per macOS (`"os": ["darwin"]`). Gli strumenti ML richiedono Pixelmator Pro dalla sottoscrizione Creator Studio o dall'App Store di Mac.

---

[README principale](../../README.md) · [Registro delle modifiche](../../CHANGELOG.md) · [Sicurezza](../../SECURITY.md)
