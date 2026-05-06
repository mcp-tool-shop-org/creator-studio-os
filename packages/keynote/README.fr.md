<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.md">English</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/keynote

> Outils Keynote pour Creator Studio OS — 56 outils pour l'automatisation des présentations, l'importation de Markdown, la conversion de storyboards en FCPXML et l'exportation dans de nombreux formats.

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-99%25-brightgreen.svg" alt="Coverage 99%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Fait partie du plan de contrôle MCP [Creator Studio OS](../../README.md) pour les applications Apple Creator Studio.

---

## Installation

```bash
npm install @creator-studio-os/keynote
```

Nécessite Keynote (Creator Studio ou version autonome) et macOS 13+.

## Ce que fait ce paquet

L'interface AppleScript la plus complète de toutes les applications Apple — Keynote expose un dictionnaire sdef riche pour la création, la modification et l'exportation de présentations. `@creator-studio-os/keynote` englobe toute cette interface : 56 outils couvrant le cycle de vie des diapositives, le texte, les tableaux, les graphiques, les images, les transitions, les effets ML, l'exportation et deux ponts de pipeline (importation Markdown + exportation de storyboard FCPXML).

## Outils (56)

### Cycle de vie de l'application

| Outil | Description |
|------|-------------|
| `keynote_app_open` | Activer Keynote |
| `keynote_app_running` | Vérifier si Keynote est en cours d'exécution |

### Cycle de vie du document

| Outil | Description |
|------|-------------|
| `keynote_open` | Ouvrir un fichier `.key` ; renvoie son nom (utilisé par tous les autres outils) |
| `keynote_close` | Fermer un document (avec option de sauvegarde) |
| `keynote_save` | Sauvegarder un document, éventuellement vers un autre chemin |
| `keynote_list_presentations` | Lister tous les documents ouverts |
| `keynote_create_presentation` | Créer une nouvelle présentation vide |
| `keynote_set_doc_size` | Définir les dimensions de la diapositive (par exemple, 1920x1080 pour le format 16:9) |
| `keynote_set_kiosk_mode` | Configurer la lecture automatique, la boucle automatique et le délai d'inactivité pour les écrans de type borne interactive |

### Thèmes et modèles

| Outil | Description |
|------|-------------|
| `keynote_list_themes` | Lister tous les thèmes disponibles |
| `keynote_apply_theme` | Appliquer un thème à un document |
| `keynote_list_masters` | Lister les mises en page de modèle de diapositive dans le thème actuel |
| `keynote_set_slide_master` | Définir la mise en page de modèle pour une diapositive |

### Gestion des diapositives

| Outil | Description |
|------|-------------|
| `keynote_list_slides` | Lister toutes les diapositives avec leur index, leur titre et leur statut de saut |
| `keynote_get_slide` | Lire le titre, le corps du texte et les notes pour une diapositive |
| `keynote_make_slide` | Ajouter une nouvelle diapositive |
| `keynote_delete_slide` | Supprimer une diapositive |
| `keynote_duplicate_slide` | Dupliquer une diapositive |
| `keynote_reorder_slide` | Déplacer une diapositive vers une autre position |
| `keynote_skip_slide` | Marquer une diapositive comme sautée ou la rendre non sautée |

### Texte et contenu

| Outil | Description |
|------|-------------|
| `keynote_set_title` | Définir le texte du titre sur une diapositive |
| `keynote_set_body` | Définir le texte du corps sur une diapositive |
| `keynote_set_text_style` | Appliquer un style au texte (police, taille, couleur) sur n'importe quel élément de la diapositive |
| `keynote_get_presenter_notes` | Lire les notes du présentateur à partir d'une diapositive |
| `keynote_set_presenter_notes` | Définir les notes du présentateur sur une diapositive |
| `keynote_extract_all_notes` | Extraire les notes du présentateur et les titres de chaque diapositive |

### Transitions

| Outil | Description |
|------|-------------|
| `keynote_set_transition` | Définir une transition de diapositive (les 43 effets sdef + la durée) |
| `keynote_plan_magic_move` | Préparer deux diapositives pour une transition Magic Move |

### Éléments : images, formes, lignes, tableaux, graphiques

| Outil | Description |
|------|-------------|
| `keynote_list_items` | Lister tous les éléments iWork sur une diapositive |
| `keynote_position_item` | Redimensionner et/ou déplacer un élément de diapositive |
| `keynote_format_item` | Définir l'opacité, la rotation et la réflexion d'un élément de diapositive |
| `keynote_get_item_info` | Lire la position, la taille, l'opacité et la rotation d'un élément |
| `keynote_insert_image` | Insérer une image à partir d'un chemin de fichier |
| `keynote_set_voiceover_description` | Définir la description d'accessibilité VoiceOver sur une image de diapositive |
| `keynote_insert_shape` | Insérer une forme rectangulaire |
| `keynote_insert_line` | Insérer un élément de ligne |
| `keynote_insert_table` | Insérer un tableau |
| `keynote_read_table` | Lire les valeurs des cellules sous forme de tableau 2D |
| `keynote_write_table` | Écrire les valeurs des cellules à partir d'un tableau 2D |
| `keynote_make_chart` | Ajouter un graphique avec les noms de lignes, les noms de colonnes et les données |
| `keynote_make_image_slides` | Ajouter en masse une diapositive par image à partir d'une liste de fichiers |

### Effets ML (Creator Studio uniquement)

| Outil | Description |
|------|-------------|
| `keynote_clean_up_slide` | Nettoyer une diapositive en utilisant l'optimisation de mise en page intégrée de Keynote |
| `keynote_super_resolution` | Appliquer une mise à l'échelle de super-résolution ML à une image de diapositive |
| `keynote_remove_background` | Supprimer l'arrière-plan d'une image de diapositive à l'aide de l'IA |

### Présentation

| Outil | Description |
|------|-------------|
| `keynote_start` | Démarrer la présentation, éventuellement à partir d'une diapositive spécifique |
| `keynote_stop` | Arrêter la présentation en cours |

### Exporter

| Outil | Description |
|------|-------------|
| `keynote_export_pdf` | Exporter vers PDF |
| `keynote_export_pdf_advanced` | Exporter vers PDF avec mise en page de document distribué, notes, mots de passe et options de qualité d'image. |
| `keynote_export_images` | Exporter chaque diapositive au format PNG / JPEG / TIFF. |
| `keynote_export_movie` | Exporter au format QuickTime. |
| `keynote_export_movie_advanced` | Exporter au format vidéo avec codec (H.264, HEVC, gamme complète de ProRes), résolution et fréquence d'images. |
| `keynote_export_pptx` | Exporter au format Microsoft PowerPoint. |
| `keynote_export_html` | Exporter au format site HTML statique. |

### Ponts de pipeline

| Outil | Description |
|------|-------------|
| `keynote_from_markdown` | Créer une présentation à partir d'un document Markdown (titres → diapositives). |
| `keynote_to_storyboard_fcp` | Convertir une présentation Keynote en storyboard FCP au format FCPXML. |
| `keynote_to_compressor_gif` | Exporter une présentation sous forme de GIF animé via Compressor. |

## Exemple

Créer une présentation à partir de Markdown et exporter au format PPTX :

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

Exporter les diapositives au format vidéo ProRes :

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

## Profil de récupération

```typescript
import { recovery } from "@creator-studio-os/keynote";
// recovery.app === "keynote"
```

## Exigences macOS

`@creator-studio-os/keynote` est uniquement compatible avec macOS ("os": ["darwin"]). Les outils d'apprentissage automatique nécessitent Keynote de l'abonnement Creator Studio. Les outils standard fonctionnent avec la version gratuite autonome de Keynote disponible sur le Mac App Store.

---

[README principal](../../README.md) · [Journal des modifications](../../CHANGELOG.md) · [Sécurité](../../SECURITY.md)
