<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.md">English</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/motion

> Outils Motion pour Creator Studio OS — mutation de modèles OZML, rendu headless via Compressor et catalogue de modèles.

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-92%25-brightgreen.svg" alt="Coverage 92%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Fait partie du plan de contrôle MCP (Media Content Platform) pour les applications Apple Creator Studio.

---

## Installation

```bash
npm install @creator-studio-os/motion
```

Nécessite Motion (Creator Studio) et macOS 13 ou version ultérieure. Le rendu headless nécessite Compressor.

## Ce que fait ce paquet

Motion n'expose **aucune interface AppleScript**. `@creator-studio-os/motion` fonctionne au niveau du format de fichier : il lit et modifie directement le format de modèle OZML de Motion (`.motn` / `.moti`), sans lancer Motion.

- **Inspection des modèles** — analyse du format OZML, liste de tous les paramètres publiés.
- **Modification des paramètres** — définition de la valeur de n'importe quel paramètre (texte, couleur, nombre) de manière atomique.
- **Édition de texte** — remplacement du contenu textuel visible, y compris les listes de glyphes et les styles.
- **Validation structurelle** — 31 invariants OZML avant toute écriture.
- **Rendu headless** — envoi d'un modèle `.motn` à Compressor via l'option `-jobpath` — aucune interface graphique requise.
- **Publication vers FCP** — activation/désactivation du marqueur "Publier vers FCP" sur n'importe quel paramètre.

> **Important** : Ne modifiez jamais les modèles intégrés d'Apple. Clonez toujours d'abord le modèle avec `motion_template_clone`.

## Outils (10)

| Outil | Description |
|------|-------------|
| `motion_app_open` | Ouvrir Motion (transfert de fichier uniquement ; aucune interface AppleScript). |
| `motion_app_running` | Vérifier si Motion est en cours d'exécution. |
| `motion_open` | Ouvrir un modèle ou un projet `.motn` dans Motion. |
| `motion_template_inspect` | Analyser un modèle et renvoyer son résumé OZML et sa liste de paramètres. |
| `motion_template_set_param` | Modifier la valeur d'un seul paramètre dans un modèle Motion. |
| `motion_template_edit_text` | Modifier le contenu textuel visible (CDATA + liste de glyphes + styles). |
| `motion_template_validate` | Valider par rapport aux 31 invariants structurels OZML. |
| `motion_template_clone` | Copier un modèle vers un nouvel emplacement avant de le modifier. |
| `motion_render_via_compressor` | Effectuer un rendu headless d'un modèle `.motn` via Compressor avec l'option `-jobpath`. |
| `motion_publish_to_fcp` | Activer/désactiver le marqueur "Publier vers FCP" sur un paramètre de modèle. |

## Exemple

Cloner un modèle intégré, définir un paramètre texte, valider et effectuer un rendu headless :

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

## Compatible avec `@creator-studio-os/fcp`

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

## Profil de récupération

```typescript
import { recovery } from "@creator-studio-os/motion";
// recovery.app === "motion"
```

## Exigence macOS

`@creator-studio-os/motion` est uniquement compatible avec macOS (`"os": ["darwin"]`). L'inspection et la modification des modèles ne nécessitent aucune application en cours d'exécution. Le rendu headless nécessite Compressor, qui est inclus dans l'abonnement Creator Studio.

---

[README principal](../../README.md) · [Journal des modifications](../../CHANGELOG.md) · [Sécurité](../../SECURITY.md)
