<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.md">English</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/fcp

> Outils pour Final Cut Pro pour Creator Studio OS — création de fichiers FCPXML 1.14, validation DTD, importation dans FCP et inspection de la bibliothèque AppleScript.

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-97%25-brightgreen.svg" alt="Coverage 97%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Fait partie du plan de contrôle MCP de [Creator Studio OS](../../README.md) pour les applications Apple Creator Studio.

---

## Installation

```bash
npm install @creator-studio-os/fcp
```

Nécessite Final Cut Pro (Creator Studio ou version autonome) et macOS 13 ou version ultérieure.

## Ce que fait ce paquet

L'interface AppleScript de Final Cut Pro est **en lecture seule** : vous pouvez examiner les bibliothèques et les métadonnées, mais vous ne pouvez pas créer de séquences via AppleScript. Le chemin de création pris en charge est l'importation de fichiers FCPXML.

`@creator-studio-os/fcp` est le pont : créez des séquences sous forme de spécifications JSON, générez et validez des fichiers FCPXML 1.14 (ou 1.13), écrivez-les sur le disque et déclenchez l'importation dans FCP, le tout en une seule commande.

## Outils (22)

| Outil | Description |
|------|-------------|
| `fcp_project_list` | Liste les projets dans le répertoire de données |
| `fcp_project_create` | Crée un répertoire de projet avec une structure de sous-répertoires standard |
| `fcp_project_info` | Lit les métadonnées du projet et les chemins résolus |
| `fcp_fcpxml_build` | Crée une séquence à partir d'une spécification JSON : clips, titres, transitions, audio |
| `fcp_fcpxml_validate` | Valide un fichier FCPXML par rapport au DTD inclus (`xmllint`) |
| `fcp_fcpxml_write` | Écrit un document FCPXML dans le répertoire `fcp/` d'un projet |
| `fcp_fcpxml_import` | Ouvre un fichier FCPXML dans Final Cut Pro |
| `fcp_fcpxml_build_write_import` | Génère, valide, écrit et importe en une seule commande |
| `fcp_library_list` | Liste les bibliothèques ouvertes dans Final Cut Pro |
| `fcp_library_events` | Liste les événements à l'intérieur d'une bibliothèque ouverte |
| `fcp_event_projects` | Liste les projets à l'intérieur d'un événement |
| `fcp_project_metadata` | Lit les métadonnées de la séquence (durée, fréquence d'images, format de timecode) |
| `fcp_safety_compound` | Vérifie les chevauchements de clips principaux qui entraînent la création de clips composés implicites |
| `fcp_safety_captions` | Vérifie le format des affectations de rôles de sous-titres requis par FCP |
| `fcp_safety_anchors` | Détecte les collisions d'ancres de titres entre les pistes |
| `fcp_app_open` | Ouvre Final Cut Pro |
| `fcp_app_activate` | Amène Final Cut Pro au premier plan |
| `fcp_app_running` | Vérifie si Final Cut Pro est actuellement en cours d'exécution |
| `fcp_bind_motion_param` | Lit les paramètres publiés à partir d'un modèle Motion |
| `fcp_effects_catalog` | Parcourt les répertoires des modèles Motion et renvoie un catalogue de tous les effets |
| `fcp_round_trip_diff` | Compare deux documents FCPXML ; détecte les 12 transformations aller-retour connues de FCP |
| `fcp_round_trip_capture` | Extrait un fichier FCPXML d'un paquet de bibliothèque FCP |

## Exemple

Crée et importe une séquence en une seule commande :

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

## Générateur FCPXML

```typescript
import { buildFCPXML, validateFCPXML } from "@creator-studio-os/fcp";

const xml = buildFCPXML(spec);           // returns FCPXML string
const { valid, output } = validateFCPXML(xml);  // runs xmllint against bundled DTD
```

## Exigence macOS

`@creator-studio-os/fcp` est uniquement compatible macOS (`"os": ["darwin"]`). La validation DTD utilise `xmllint` des outils de ligne de commande Xcode. Le DTD inclus est `FCPXMLv1_14.dtd` du paquet d'application Final Cut Pro.

---

[README principal](../../README.md) · [Journal des modifications](../../CHANGELOG.md) · [Référence FCPXML](../../docs/reference/fcpxml.md)
