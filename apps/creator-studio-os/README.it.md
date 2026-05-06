<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.md">English</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="550">
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/creator-studio-os/actions/workflows/ci.yml"><img src="https://github.com/mcp-tool-shop-org/creator-studio-os/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://codecov.io/gh/mcp-tool-shop-org/creator-studio-os"><img src="https://codecov.io/gh/mcp-tool-shop-org/creator-studio-os/branch/main/graph/badge.svg" alt="Coverage"></a>
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

# @creator-studio-os/creator-studio-os

Piano di controllo MCP per le applicazioni Apple Creator Studio. Controlla **Final Cut Pro**, **Compressor**, **Motion**, **Pixelmator Pro**, **Logic Pro**, **Keynote**, **Pages** e **Numbers** da Claude o da qualsiasi client MCP.

Questo pacchetto è la **CLI principale** (interfaccia a riga di comando) che raggruppa tutti i 9 pacchetti `@creator-studio-os/*` e li espone come un singolo comando `creator-studio-os serve`.

## Installazione

```bash
npm install -g @creator-studio-os/creator-studio-os
```

Oppure tramite npx (senza installazione):

```bash
npx @creator-studio-os/creator-studio-os serve
```

## Configurazione del client MCP

Aggiungi a `claude_desktop_config.json` (o equivalente):

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

## Cosa è incluso

| Pacchetto | Strumenti | Cosa controlla |
|---------|-------|----------------|
| `@creator-studio-os/core` | 1 | Runtime condiviso, esecutori di AppleScript, schema del progetto |
| `@creator-studio-os/compressor` | 15 | Codifica senza interfaccia grafica, processi batch, monitoraggio in tempo reale |
| `@creator-studio-os/fcp` | 22 | Creazione di file FCPXML 1.14, validazione DTD, importazione in FCP |
| `@creator-studio-os/iwork-docs` | 10 | Ciclo di vita e esportazione dei documenti Pages + Numbers |
| `@creator-studio-os/keynote` | 56 | Automazione completa di Keynote: diapositive, ML (Machine Learning), esportazione, connettori per pipeline |
| `@creator-studio-os/logic` | 3 | Avvio di Logic Pro e apertura di progetti `.logicx` |
| `@creator-studio-os/motion` | 10 | Modifica di modelli OZML, rendering senza interfaccia grafica |
| `@creator-studio-os/pixelmator` | 33 | Modifica dei livelli, effetti ML, compositore di elementi grafici |
| `@creator-studio-os/protocols` | 3 | Pipeline di orchestrazione tra applicazioni |

**Totale: 153 strumenti in 9 pacchetti.**

## Pipeline tra applicazioni

Caso d'uso principale: `csos_protocol_run` orchestra tutte e 8 le applicazioni con un singolo comando:

1. Pixelmator Pro crea elementi grafici per ogni scena.
2. Motion esegue il rendering di sovrapposizioni inferiori in modalità headless tramite Compressor.
3. La timeline FCPXML 1.14 viene creata e importata in Final Cut Pro.
4. Compressor codifica il prodotto finale (ProRes principale + H.264 per i social media).

## CLI (Interfaccia a riga di comando)

```bash
creator-studio-os serve          # start MCP server
creator-studio-os verify         # verify xmllint + DTD round-trip
creator-studio-os smoke          # run 9-phase smoke test against live apps
creator-studio-os smoke --dry-run  # smoke test without live app calls
```

## Utilizzo dei pacchetti individualmente

Ogni pacchetto dell'applicazione è pubblicato separatamente. Installa solo ciò di cui hai bisogno:

```bash
npm install @creator-studio-os/fcp       # Final Cut Pro only
npm install @creator-studio-os/keynote   # Keynote only
npm install @creator-studio-os/pixelmator  # Pixelmator Pro only
```

## Sicurezza

Funziona interamente sul dispositivo: nessuna chiamata di rete, nessuna telemetria, nessuna credenziale memorizzata. Modello di minaccia completo disponibile in [SECURITY.md](SECURITY.md) e in [`docs/threat-model.md`](https://github.com/mcp-tool-shop-org/creator-studio-os/blob/main/docs/threat-model.md).

## Requisiti macOS

macOS 13+ e abbonamento Apple Creator Studio (o acquisti individuali delle applicazioni dall'App Store di Mac, ove disponibili). Consulta il file README di ogni pacchetto per i requisiti specifici dell'applicazione.

---

[Documentazione completa](https://github.com/mcp-tool-shop-org/creator-studio-os) · [Registro delle modifiche](CHANGELOG.md) · [Sicurezza](SECURITY.md)
