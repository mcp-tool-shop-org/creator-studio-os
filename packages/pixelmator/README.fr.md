<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.md">English</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/pixelmator

> Outils Pixelmator Pro pour Creator Studio OS : édition des calques, effets d'apprentissage automatique (ML), composition de cartes de marque et exportation dans de nombreux formats.

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
npm install @creator-studio-os/pixelmator
```

Nécessite Pixelmator Pro (version Creator Studio ou autonome) et macOS 13+.

## Ce que fait ce paquet

`@creator-studio-os/pixelmator` utilise Pixelmator Pro via son interface AppleScript, offrant ainsi l'API d'édition d'images enrichie par l'apprentissage automatique (ML) la plus complète disponible sur macOS. Il comprend 33 outils couvrant l'ensemble du cycle de vie du document, la manipulation des calques, des algorithmes d'apprentissage automatique, des ajustements de couleurs, des effets et un compositeur de cartes de marque multi-tailles.

## Outils (33)

### Cycle de vie de l'application et du document

| Outil | Description |
|------|-------------|
| `pixelmator_app_open` | Activer Pixelmator Pro |
| `pixelmator_app_running` | Vérifier si Pixelmator Pro est en cours d'exécution |
| `pixelmator_open` | Ouvrir un document ; renvoie le nom du document (utilisé par tous les autres outils) |
| `pixelmator_close` | Fermer un document (sans enregistrer) |
| `pixelmator_export` | Exporter au format PNG, JPEG, TIFF, PSD, WebP, HEIC, AVIF |
| `pixelmator_export_hdr` | Exporter au format HDR JPEG, HDR HEIC, HDR AVIF ou HDR PNG |
| `pixelmator_export_video` | Exporter les calques vidéo au format MP4 ou QuickTime |
| `pixelmator_export_animated` | Exporter au format GIF animé ou PNG animé |
| `pixelmator_export_for_web` | PNG, JPEG, WebP, GIF ou SVG optimisés pour le web |
| `pixelmator_batch_export_project_images` | Exporter par lots toutes les images d'un projet dans le répertoire `images/` |
| `pixelmator_batch_export_project_images_dryrun` | Test : afficher ce qui serait traité lors d'une exportation par lots |

### Transformations du document

| Outil | Description |
|------|-------------|
| `pixelmator_resize` | Modifier les dimensions et/ou la résolution du document |
| `pixelmator_crop` | Rogner aux limites `{x, y, width, height}` |
| `pixelmator_rotate` | Rotation de 180 degrés, à droite (90 degrés dans le sens des aiguilles d'une montre) ou à gauche (90 degrés dans le sens inverse des aiguilles d'une montre) |
| `pixelmator_flip` | Retournement horizontal ou vertical |

### Pile de calques

| Outil | Description |
|------|-------------|
| `pixelmator_make_layer` | Ajouter un calque image, texte ou forme |
| `pixelmator_set_layer_properties` | Modifier la visibilité, l'opacité, le mode de fusion, la position ou la taille |
| `pixelmator_layer_order` | Réorganiser un calque (devant/derrière/avant/après) |
| `pixelmator_group_layers` | Déplacer des calques vers un nouveau groupe |
| `pixelmator_ungroup` | Dégrouper un calque de groupe |
| `pixelmator_set_layer_text` | Modifier le contenu et le style du texte sur un calque de texte |
| `pixelmator_make_shape` | Créer un rectangle, une ellipse, un rectangle arrondi ou une ligne remplis |
| `pixelmator_set_blend_mode` | Définir le mode de fusion de composition (tous les 28 modes de Pixelmator Pro) |
| `pixelmator_set_layer_shadow` | Ajouter ou modifier une ombre portée |
| `pixelmator_set_layer_stroke` | Ajouter ou modifier un contour |

### Effets et ajustements de couleurs

| Outil | Description |
|------|-------------|
| `pixelmator_apply_effect` | Appliquer l'une des 23 classes d'effets non destructifs |
| `pixelmator_apply_color_adjustment` | Définir l'une des 24 propriétés d'ajustement des couleurs (y compris le chemin LUT, la vignette) |

### Apprentissage automatique (ML)

| Outil | Description |
|------|-------------|
| `pixelmator_apply_ml` | Exécuter les fonctions super_resolution, enhance, denoise, deband, match_colors, remove_background, select_subject ou auto-adjust |
| `pixelmator_run_shortcut` | Exécuter une action Pixelmator Shortcuts par son nom via `shortcuts run` |

### Détection et remplacement

| Outil | Description |
|------|-------------|
| `pixelmator_detect` | Détecter les visages ou les codes QR (boîtes englobantes ; QR comprend la charge utile décodée) |
| `pixelmator_replace_text` | Rechercher et remplacer du texte dans tous les calques de texte |
| `pixelmator_replace_layer` | Remplacer le contenu des pixels d'un calque image à partir d'un nouveau fichier |

### Compositeur de cartes de marque

| Outil | Description |
|------|-------------|
| `pixelmator_compose_brand_card` | Ouvrir un modèle `.pxd`, remplacer les jetons `{{HEADLINE}}` / `{{SUBHEAD}}` / `{{LOGO}}` et exporter à plusieurs tailles |

## Exemple

Générer des cartes de marque à trois tailles à partir d'un modèle :

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

Appliquer la super-résolution ML et réexporter :

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

## Profil de récupération

```typescript
import { recovery } from "@creator-studio-os/pixelmator";
// recovery.app === "pixelmator"
```

## Exigence macOS

`@creator-studio-os/pixelmator` est uniquement compatible macOS (`"os": ["darwin"]`). Les outils d'apprentissage automatique nécessitent Pixelmator Pro de l'abonnement Creator Studio ou de l'App Store Mac.

---

[README principal](../../README.md) · [Journal des modifications](../../CHANGELOG.md) · [Sécurité](../../SECURITY.md)
