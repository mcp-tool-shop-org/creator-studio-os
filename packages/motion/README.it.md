<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.md">English</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/motion

> Strumenti per Motion in Creator Studio OS: mutazione dei modelli OZML, rendering headless tramite Compressor e catalogo dei modelli.

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-92%25-brightgreen.svg" alt="Coverage 92%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Parte del piano di controllo MCP (Media Content Platform) per le applicazioni Apple Creator Studio.

---

## Installazione

```bash
npm install @creator-studio-os/motion
```

Richiede Motion (Creator Studio) e macOS 13 o superiore. Il rendering headless richiede Compressor.

## Cosa fa questo pacchetto

Motion non espone **nessuna interfaccia AppleScript**. `@creator-studio-os/motion` opera a livello di formato file: legge e modifica direttamente il formato dei modelli OZML di Motion (`.motn` / `.moti`), senza avviare Motion:

- **Ispezione dei modelli** — analizza OZML, elenca tutti i parametri pubblicati.
- **Modifica dei parametri** — imposta qualsiasi valore di parametro (testo, colore, numero) in modo atomico.
- **Modifica del testo** — sostituisce il contenuto di testo visibile, inclusi elenchi di glifi e stili.
- **Validazione strutturale** — verifica 31 invarianti OZML prima di qualsiasi scrittura.
- **Rendering headless** — invia un modello `.motn` a Compressor tramite l'opzione `-jobpath` — non è necessaria un'interfaccia grafica.
- **Pubblicazione su FCP** — attiva o disattiva il flag "Pubblica su FCP" per qualsiasi parametro.

> **Importante**: Non modificare mai i modelli inclusi. Clona sempre prima il modello con `motion_template_clone`.

## Strumenti (10)

| Strumento | Descrizione |
|------|-------------|
| `motion_app_open` | Apri Motion (solo passaggio del file; nessuna interfaccia AppleScript) |
| `motion_app_running` | Verifica se Motion è in esecuzione |
| `motion_open` | Apri un modello o un progetto `.motn` in Motion |
| `motion_template_inspect` | Analizza un modello e restituisce il suo riepilogo OZML e l'elenco dei parametri |
| `motion_template_set_param` | Modifica il valore di un singolo parametro in un modello Motion |
| `motion_template_edit_text` | Modifica il contenuto di testo visibile (CDATA + elenco di glifi + stili) |
| `motion_template_validate` | Verifica rispetto a 31 invarianti strutturali OZML |
| `motion_template_clone` | Copia un modello in un nuovo percorso prima di modificarlo |
| `motion_render_via_compressor` | Esegui il rendering headless di un modello `.motn` tramite Compressor con l'opzione `-jobpath` |
| `motion_publish_to_fcp` | Attiva o disattiva il flag "Pubblica su FCP" per un parametro del modello |

## Esempio

Clona un modello incluso, imposta un parametro di testo, verifica e esegui il rendering headless:

```json
// Tool: motion_template_clone
{
  "sourcePath": "/Applications/Motion Creator Studio.app/Contents/Resources/Templates.localized/Compositions.localized/Atmospheric.localized/Atmospheric-Lower Third.localized/Atmospheric-Lower Third.motn",
  "destPath": "/projects/csos-showcase/motion/lower-third.motn"
}

// Tool: motion_template_edit_text
{
  "templatePath": "/projects/csos-showcase/motion/lower-third.motn",
  "paramId": "Text.0",
  "newText": "Creator Studio OS"
}

// Tool: motion_template_validate
{ "templatePath": "/projects/csos-showcase/motion/lower-third.motn" }

// Tool: motion_render_via_compressor
{
  "templatePath": "/projects/csos-showcase/motion/lower-third.motn",
  "outputPath": "/projects/csos-showcase/out/lower-third.mov",
  "settingName": "Apple ProRes 4444"
}
```

## Compatibile con `@creator-studio-os/fcp`

```json
// Tool: fcp_bind_motion_param — discover parameters for FCP binding
{ "templatePath": "/projects/csos-showcase/motion/lower-third.motn" }

// Tool: motion_publish_to_fcp — expose a parameter in FCP's inspector
{
  "templatePath": "/projects/csos-showcase/motion/lower-third.motn",
  "paramId": "Text.0",
  "publish": true
}
```

## Profilo di ripristino

```typescript
import { recovery } from "@creator-studio-os/motion";
// recovery.app === "motion"
```

## Requisiti macOS

`@creator-studio-os/motion` è disponibile solo per macOS (`"os": ["darwin"]`). L'ispezione e la modifica dei modelli non richiedono un'applicazione in esecuzione. Il rendering headless richiede Compressor, incluso nell'abbonamento Creator Studio.

---

[README principale](../../README.md) · [Registro delle modifiche](../../CHANGELOG.md) · [Sicurezza](../../SECURITY.md)
