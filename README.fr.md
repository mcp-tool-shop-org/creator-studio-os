<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.md">English</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="400">
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/creator-studio-os/actions/workflows/ci.yml"><img src="https://github.com/mcp-tool-shop-org/creator-studio-os/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <a href="https://mcp-tool-shop-org.github.io/creator-studio-os/"><img src="https://img.shields.io/badge/docs-handbook-informational" alt="Handbook"></a>
</p>

MCP (Media Content Protocol) pour les applications Apple Creator Studio. Pilotez **Final Cut Pro**, **Compressor**, **Motion**, **Pixelmator Pro**, **Logic Pro**, **Keynote**, **Pages** et **Numbers** depuis Claude ou n'importe quel client MCP. Créez des livrables vidéo à partir de spécifications JSON, effectuez des rendus de génériques Motion en arrière-plan, encodez via Compressor et générez des éléments de marque dans un pipeline intégré.

> **v1.7.10** — 78 outils pour les 8 applications Apple Creator Studio. Protocole composite multi-applications en direct : cartes de marque Pixelmator + génériques Motion ProRes 4444 + encodage final Compressor. 9 phases de "smoke" sur 9, terminées. macOS uniquement.

---

## Pourquoi cela existe

Le dictionnaire AppleScript de Final Cut Pro est en **lecture seule** : vous pouvez lister les bibliothèques et lire les métadonnées, mais vous ne pouvez pas créer de séquences via AppleScript. Le chemin d'importation pris en charge est l'**importation FCPXML** : créez un document FCPXML 1.14 valide, transmettez-le à FCP, et FCP crée le projet.

`creator-studio-os` est le pont : Claude crée des séquences sous forme de spécifications JSON, le serveur construit et valide le FCPXML, déclenche l'importation FCP, effectue des rendus de modèles de génériques Motion en arrière-plan via Compressor, et utilise Pixelmator Pro pour les éléments de marque, le tout dans un pipeline intégré.

## Sécurité

`creator-studio-os` s'exécute entièrement sur l'appareil. Il :

- Lance `osascript` en ciblant les applications par identifiant de bundle (et non par nom de fichier).
- N'écrit que dans le répertoire `CREATOR_STUDIO_DATA_DIR` : pas de fichiers système, pas de données internes des bibliothèques FCP.
- Ne fait **aucun appel réseau** : pas de télémétrie, pas d'analyses, pas de validation à distance.
- Ne conserve **aucunes informations d'identification, jetons ou données utilisateur**.
- Échappe toutes les chaînes fournies par l'utilisateur avant l'interpolation AppleScript (`escapeAppleScriptString`).

Modèle de menace complet : [`docs/threat-model.md`](./docs/threat-model.md) · [`SECURITY.md`](./SECURITY.md)

## Installation

```bash
npm install -g @mcptoolshop/creator-studio-os
```

Configuration du client MCP (`claude_desktop_config.json` ou équivalent) :

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

Ou via npx :

```json
{ "command": "npx", "args": ["-y", "@mcptoolshop/creator-studio-os", "serve"] }
```

## Vérifiez votre configuration

```bash
creator-studio-os verify
```

Vérifie la plateforme, `osascript`, `xmllint`, l'installation de Final Cut Pro, le DTD FCPXML 1.14, le répertoire de données, et effectue un cycle d'importation/export FCPXML via le DTD intégré.

## Répertoire de données

Par défaut : `/Volumes/T9-Shared/AI/creator-studio` (remplacez avec `CREATOR_STUDIO_DATA_DIR`).

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

## Protocole multi-applications : `brand-deck-minimal`

Le pipeline phare : 13 étapes, d'une spécification `project.json` à un fichier ProRes MOV :

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

Le format `project.json` : [`src/projects/types.ts`](./src/projects/types.ts) · Démonstration : [`demo/csos-showcase/project.json`](./demo/csos-showcase/project.json)

## Outils

### Final Cut Pro (22 outils)

| Outil | Fonction |
|------|---------|
| `fcp_project_list` | Liste les projets dans le répertoire de données |
| `fcp_project_create` | Crée un répertoire de projet et un fichier `project.json` |
| `fcp_project_info` | Lit les métadonnées du projet et les chemins résolus |
| `fcp_fcpxml_build` | Crée un fichier FCPXML 1.14 à partir d'une spécification JSON |
| `fcp_fcpxml_validate` | Valide le fichier FCPXML par rapport au DTD intégré |
| `fcp_fcpxml_write` | Écrit le fichier FCPXML dans `projects/<nom>/fcp/` |
| `fcp_fcpxml_import` | Ouvre un fichier FCPXML dans Final Cut Pro |
| `fcp_fcpxml_build_write_import` | Ensemble : construction → validation → écriture → importation |
| `fcp_library_list` | Liste les bibliothèques ouvertes dans FCP |
| `fcp_library_events` | Liste les événements dans une bibliothèque |
| `fcp_event_projects` | Liste les projets dans un événement |
| `fcp_project_metadata` | Lit la durée de la séquence, la fréquence d'images, le format de la référence temporelle |
| `fcp_app_open` / `fcp_app_running` / `fcp_app_activate` | Cycle de vie |
| `fcp_round_trip_diff` | Compare deux fichiers FCPXML, génère une différence structurée |
| `fcp_fcpxml_add_title` | Ajoute un effet de titre à une séquence |
| `fcp_fcpxml_add_transition` | Ajoute une transition entre des clips |
| `fcp_fcpxml_add_marker` | Ajoute un marqueur de chapitre/tâche/complétion |
| `fcp_safety_preflight` | Vérifie que tous les fichiers sources FCPXML existent avant l'importation |
| `fcp_multicam_build` | Crée un clip multicam à partir des spécifications d'angle |
| `fcp_caption_build` | Créer une piste de sous-titres à partir d'une transcription. |
| `fcp_compound_clip_build` | Créer un clip composé à partir de spécifications de séquence imbriquées. |

### Compresseur (15 outils)

Compresseur ne possède pas de dictionnaire AppleScript. L'interface est la ligne de commande (CLI) ainsi que les fichiers `.compressorbatch`. La première invocation par session déclenche une validation des droits d'accès de l'App Store (ce qui est attendu).

| Outil | Fonction |
|------|---------|
| `compressor_app_open` / `compressor_app_running` | Cycle de vie |
| `compressor_settings_list` | Énumérer les paramètres prédéfinis `.compressorsetting`. |
| `compressor_locations_list` | Énumérer les fichiers `.compressorlocation`. |
| `compressor_encode` | Soumettre une seule tâche d'encodage. |
| `compressor_encode_project` | Encoder par rapport au répertoire d'un projet. |
| `compressor_monitor_stream` | Afficher les images de progression de l'encodage en continu. |
| `compressor_job_status` | Vérifier l'état d'une seule tâche. |
| `compressor_batch_status` | Vérifier l'état de toutes les tâches batch actives. |
| `compressor_cancel_job` | Annuler une tâche active. |
| `compressor_settings_inspect` | Examiner un fichier `.compressorsetting`. |
| `compressor_batch_build` | Créer un document XML `.compressorbatch`. |
| `compressor_await_output` | Attendre qu'un fichier de sortie ne soit plus vide. |
| `compressor_daemon_recover` | Récupérer un démon Compresseur bloqué. |

Voir [`docs/reference/compressor-cli.md`](./docs/reference/compressor-cli.md).

### Motion (10 outils)

| Outil | Fonction |
|------|---------|
| `motion_app_open` / `motion_app_running` | Cycle de vie |
| `motion_open` | Ouvrir un modèle `.motn`. |
| `motion_template_clone` | Cloner un modèle `.motn` vers un nouvel emplacement. |
| `motion_template_set_param` | Définir une valeur de paramètre publiée (édition OZML). |
| `motion_template_get_params` | Lister tous les paramètres publiés dans un modèle. |
| `motion_template_validate` | Valider la structure OZML d'un fichier `.motn`. |
| `motion_template_publish_catalog` | Lister tous les modèles dans le catalogue de publication de Motion. |
| `motion_publish_to_fcp` | Publier un modèle Motion dans le navigateur de titres de FCP. |
| `motion_render_via_compressor` | Rendre un fichier `.motn` en vidéo via Compresseur (sans interface graphique). |

Note : `motion_template_set_param` et `motion_render_via_compressor` n'ont aucun équivalent connu dans aucun autre MCP (Media Content Platform) – la mutation et le rendu OZML de Motion sans interface graphique sont rendus possibles uniquement par csos.

### Pixelmator Pro (33 outils)

| Outil | Fonction |
|------|---------|
| `pixelmator_app_open` / `pixelmator_app_running` | Cycle de vie |
| `pixelmator_open` / `pixelmator_close` | Ouvrir / fermer des documents. |
| `pixelmator_export` | Exporter au format PNG / JPEG / TIFF / HEIC / GIF / WebP / PDF / SVG. |
| `pixelmator_resize` / `pixelmator_crop` / `pixelmator_rotate` / `pixelmator_flip` | Transformation. |
| `pixelmator_batch_export_project_images` | Conversion en lot des fichiers dans `projects/<name>/images/`. |
| `pixelmator_layer_list` / `pixelmator_layer_create` / `pixelmator_layer_delete` | Gestion des calques. |
| `pixelmator_layer_set_text` / `pixelmator_layer_set_fill` / `pixelmator_layer_move` | Modification des calques. |
| `pixelmator_effects_apply` / `pixelmator_effects_catalog` | Pipeline d'effets ML. |
| `pixelmator_compose_brand_card` | Composer une carte de marque avec rotation de teinte et texte. |
| `pixelmator_hdr_export` | Exporter avec mappage tonal HDR. |
| `pixelmator_text_card` | Rendre une carte avec uniquement du texte, avec contrôle de la police et de la couleur. |

### Logic Pro (3 outils)

Logic ne possède pas de dictionnaire AppleScript. Interface : cycle de vie et transmission d'ouverture de fichier pour les projets `.logicx`.

| Outil | Fonction |
|------|---------|
| `logic_app_open` / `logic_app_running` | Cycle de vie |
| `logic_open` | Ouvrir un projet `.logicx`. |

### Keynote / Pages / Numbers (18 outils combinés)

Les trois applications partagent une structure AppleScript presque identique. Catalogue complet des formats d'exportation : [`docs/reference/iwork-automation.md`](./docs/reference/iwork-automation.md).

**Keynote (8 outils) :** ouvrir, fermer, exporter PDF / images / vidéo / PPTX, cycle de vie.
**Pages (5 outils) :** ouvrir, fermer, exporter PDF / Word / RTF / EPUB, cycle de vie.
**Numbers (5 outils) :** ouvrir, fermer, exporter PDF / Excel / CSV, cycle de vie.

### Infrastructure

| Outil | Fonction |
|------|---------|
| `csos_app_status` | Vérification de l'état de santé de toutes les 8 applications (en cours d'exécution, version, profondeur de la file d'attente). |
| `csos_protocol_run` | Exécuter un protocole inter-applications de bout en bout (asynchrone, affichage des étapes). |
| `csos_protocol_list` | Lister tous les protocoles enregistrés. |
| `csos_protocol_describe` | Décrire les étapes et le but d'un protocole. |

## Configuration recommandée avec tool-compass

[tool-compass](https://github.com/mcp-tool-shop-org/tool-compass) est une passerelle HNSW sémantique qui permet de trouver l'outil approprié en fonction de l'intention exprimée en langage naturel. Ceci est essentiel lorsque 78 outils sont répartis sur 8 applications.

```bash
pip install tool-compass
```

Le test de validation vérifie 12 requêtes représentatives lors de la phase 7. Toute modification de la description qui fait disparaître un résultat du top 3 avec un score supérieur à 0,4 entraîne un échec du test de validation.

## Permissions

La première fois que le serveur utilise AppleScript avec une application, macOS affiche une demande pour accorder la **permission d'automatisation** dans les paramètres système → Confidentialité et sécurité → Automatisation. L'utilisation d'AppleScript en lecture seule nécessite également cette autorisation.

## CI / vérification

| Vérification | Quoi |
|-------|------|
| **A. Security** | [`SECURITY.md`](./SECURITY.md), [`docs/threat-model.md`](./docs/threat-model.md), pas de secrets, pas de télémétrie, pas de réseau. |
| **B. Errors** | `CreatorStudioError { code, message, hint }`, codes de sortie de la CLI, pas de piles brutes. |
| **C. Docs** | Ce fichier README, [`CHANGELOG.md`](./CHANGELOG.md), [`LICENSE`](./LICENSE), `--help` précis. |
| **D. Hygiene** | `npm test`, `npm run typecheck`, la version correspond à la balise, `npm audit`, emballage propre. |

La CI s'exécute sur `ubuntu-latest` (vérification de type + construction + tests unitaires + audit). Les tests d'intégration sur de vraies applications sont exécutés via `npm run smoke:ci`. Les exécutions macOS ne sont intentionnellement pas incluses dans la CI (coût : macOS ≈ 10 fois Linux par minute).

## Feuille de route

- **v1.7.x** — protocole composite multi-applications (`brand-deck-minimal`) : Cartes de marque Pixelmator + génériques Motion + encodage Compressor → ProRes MOV — **disponible en v1.7.10**.
- **v1.8.x** — validation des limites de texte `patchSiblingText` : avertissement Ledger lorsque le texte entrant risque de dépasser les limites de rendu du modèle Motion.
- **v2.0** — Phase 3 : extension de la surface des protocoles (pipelines de bandes-annonces Steam, devlogs, cartes sociales).

Feuilles de route des applications : [`docs/roadmap-fcp.md`](./docs/roadmap-fcp.md), [`docs/roadmap-compressor.md`](./docs/roadmap-compressor.md), [`docs/roadmap.md`](./docs/roadmap.md).

## Licence

MIT — voir [LICENSE](./LICENSE).

---

<p align="center">Built by <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a></p>
