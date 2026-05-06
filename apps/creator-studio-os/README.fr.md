<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.md">English</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

Plan de contrôle MCP pour les applications Apple Creator Studio. Pilote **Final Cut Pro**, **Compressor**, **Motion**, **Pixelmator Pro**, **Logic Pro**, **Keynote**, **Pages** et **Numbers** depuis Claude ou tout client MCP.

Ce paquet est l'**interface de ligne de commande principale** — il regroupe les 9 paquets `@creator-studio-os/*` et les expose sous une seule commande `creator-studio-os serve`.

## Installation

```bash
npm install -g @creator-studio-os/creator-studio-os
```

Ou via npx (sans installation) :

```bash
npx @creator-studio-os/creator-studio-os serve
```

## Configuration du client MCP

Ajoutez ceci à `claude_desktop_config.json` (ou équivalent) :

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

## Ce qui est inclus

| Paquet | Outils | Ce que cela pilote |
|---------|-------|----------------|
| `@creator-studio-os/core` | 1 | Environnement d'exécution partagé, exécuteurs AppleScript, schéma de projet |
| `@creator-studio-os/compressor` | 15 | Encodage sans interface graphique, tâches par lots, progression en direct |
| `@creator-studio-os/fcp` | 22 | Création de fichiers FCPXML 1.14, validation DTD, importation FCP |
| `@creator-studio-os/iwork-docs` | 10 | Cycle de vie et exportation des documents Pages + Numbers |
| `@creator-studio-os/keynote` | 56 | Automatisation complète de Keynote : diapositives, ML, exportation, ponts de flux de travail |
| `@creator-studio-os/logic` | 3 | Lancement de Logic Pro et ouverture de projets `.logicx` |
| `@creator-studio-os/motion` | 10 | Mutation de modèles OZML, rendu sans interface graphique |
| `@creator-studio-os/pixelmator` | 33 | Édition de calques, effets ML, compositeur de cartes de marque |
| `@creator-studio-os/protocols` | 3 | Flux de travail inter-applications |

**Total : 153 outils répartis dans 9 paquets.**

## Flux de travail inter-applications

Cas d'utilisation principal : `csos_protocol_run` orchestre les 8 applications en une seule commande :

1. Pixelmator Pro crée des cartes de marque par scène.
2. Motion effectue des rendus de superpositions en bas de l'écran sans interface graphique via Compressor.
3. Une chronologie FCPXML 1.14 est créée et importée dans Final Cut Pro.
4. Compressor encode le produit final (ProRes principal + H.264 pour les réseaux sociaux).

## Interface en ligne de commande

```bash
creator-studio-os serve          # start MCP server
creator-studio-os verify         # verify xmllint + DTD round-trip
creator-studio-os smoke          # run 9-phase smoke test against live apps
creator-studio-os smoke --dry-run  # smoke test without live app calls
```

## Utilisation des paquets individuellement

Chaque paquet d'application est publié séparément. Installez uniquement ce dont vous avez besoin :

```bash
npm install @creator-studio-os/fcp       # Final Cut Pro only
npm install @creator-studio-os/keynote   # Keynote only
npm install @creator-studio-os/pixelmator  # Pixelmator Pro only
```

## Sécurité

Fonctionne entièrement sur l'appareil — aucun appel réseau, aucune télémétrie, aucune information d'identification stockée. Modèle de menace complet disponible dans [SECURITY.md](SECURITY.md) et dans [`docs/threat-model.md`](https://github.com/mcp-tool-shop-org/creator-studio-os/blob/main/docs/threat-model.md).

## Exigences macOS

macOS 13+ et abonnement Apple Creator Studio (ou achats individuels d'applications sur le Mac App Store, le cas échéant). Consultez le fichier README de chaque paquet pour connaître les exigences spécifiques à chaque application.

---

[Documentation complète](https://github.com/mcp-tool-shop-org/creator-studio-os) · [Journal des modifications](CHANGELOG.md) · [Sécurité](SECURITY.md)
