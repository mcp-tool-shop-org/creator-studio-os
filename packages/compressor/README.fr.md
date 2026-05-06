<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.md">English</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/compressor

> Outils de compression pour Creator Studio OS : encodage sans interface graphique, tâches par lots, diffusion en direct de la progression et reprise en cas de problème du démon.

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-95%25-brightgreen.svg" alt="Coverage 95%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Fait partie du plan de contrôle MCP (Media Content Platform) de [Creator Studio OS](../../README.md) pour les applications Apple Creator Studio.

---

## Installation

```bash
npm install @creator-studio-os/compressor
```

Nécessite Compressor (inclus dans Apple Creator Studio) et macOS 13 ou version ultérieure.

## Ce que fait ce paquet

Contrôle Apple Compressor via son interface en ligne de commande (CLI) (`-jobpath`, `-monitor`) — aucune scriptisation d'interface graphique n'est requise. Soumettez des tâches d'encodage, diffusez la progression en direct, examinez les fichiers `.compressorsetting` et récupérez en cas de blocage du démon.

## Outils (15)

| Outil | Description |
|------|-------------|
| `compressor_app_open` | Ouvre Compressor (opération idempotente ; active la licence lors de la première exécution). |
| `compressor_app_running` | Vérifie si Compressor est actuellement en cours d'exécution. |
| `compressor_encode` | Soumet une seule tâche d'encodage à la file d'attente de Compressor via l'interface en ligne de commande. |
| `compressor_encode_project` | Wrapper pour les tâches d'encodage, spécifique aux projets csos. |
| `compressor_status` | Vérification d'état ponctuelle pour une tâche ou un lot (pourcentage d'achèvement, temps restant, etc.). |
| `compressor_monitor_stream` | Diffuse la progression de l'encodage via `-monitor -format json` ; émet des trames d'état périodiques. |
| `compressor_pause` | Met en pause une tâche ou un lot. |
| `compressor_resume` | Reprend une tâche ou un lot mis en pause. |
| `compressor_kill` | Annule une tâche ou un lot. |
| `compressor_wait_for` | Surveille jusqu'à ce qu'une tâche atteigne un état final (terminée/échouée/annulée). |
| `compressor_settings_list` | Liste les paramètres d'encodage disponibles avec les indicateurs de disponibilité. |
| `compressor_settings_inspect` | Analyse un fichier `.compressorsetting` : codec, débit, dimensions, métadonnées HDR. |
| `compressor_settings_resolve` | Recherche le chemin d'un fichier `.compressorsetting` à partir de son nom d'affichage. |
| `compressor_locations_list` | Liste les emplacements de sortie disponibles pour Compressor. |
| `compressor_codec_availability` | Indique les codecs disponibles sur cet hôte. |

## Exemple

```typescript
import { registerCompressorTools } from "@creator-studio-os/compressor";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "csos", version: "2.0.0" });
registerCompressorTools(server);
```

Soumet une tâche d'encodage et diffuse la progression :

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

## Récupération

```typescript
import { recovery } from "@creator-studio-os/compressor";

// recovery.app === "compressor"
// recovery.recover() restarts the Compressor daemon if it hangs
```

Le profil `recovery` s'intègre à `withDaemonRecovery` de `@creator-studio-os/core` pour un redémarrage automatique en cas de défaillance du démon.

## Prérequis macOS

`@creator-studio-os/compressor` est uniquement compatible avec macOS (`"os": ["darwin"]` dans `package.json`). Le chemin de l'interface en ligne de commande de Compressor est résolu au moment de l'exécution à partir du paquet de l'application installée.

---

[README principal](../../README.md) · [Journal des modifications](../../CHANGELOG.md) · [Sécurité](../../SECURITY.md)
