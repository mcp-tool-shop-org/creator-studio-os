<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.md">English</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/protocols

> Protocoles de composition inter-applications pour Creator Studio OS — pipelines d'orchestration "brand-deck-minimal" et "steam-trailer-minimal".

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-85%25-brightgreen.svg" alt="Coverage 85%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Fait partie du plan de contrôle MCP (Management Control Plane) de [Creator Studio OS](../../README.md) pour les applications Apple Creator Studio.

---

## Installation

```bash
npm install @creator-studio-os/protocols
```

Nécessite les huit applications Creator Studio et macOS 13 ou version ultérieure.

## Ce que fait ce paquet

`@creator-studio-os/protocols` orchestre l'ensemble du pipeline inter-applications : cartes de marque Pixelmator → rendus de génériques Motion → construction FCPXML → importation dans FCP → encodage avec Compressor, le tout dans une seule exécution pouvant être reprise.

Les protocoles sont des **générateurs étape par étape** : chaque étape est idempotente et l'exécution peut être reprise à partir de n'importe quelle étape terminée en utilisant l'option `--resume <taskId>`.

## Outils (3)

| Outil | Description |
|------|-------------|
| `csos_protocol_run` | Exécute un protocole inter-applications de bout en bout sur un fichier project.json `ProjectV2`. Renvoie immédiatement un `taskId`; surveillez l'état et le résumé de l'étape finale. Prend en charge `--resume <taskId>` pour ignorer les étapes déjà terminées. |
| `csos_protocol_list` | Liste tous les protocoles enregistrés avec leurs noms, descriptions et nombre d'étapes. |
| `csos_protocol_describe` | Décrit un protocole spécifique : objectif, noms des étapes et notes d'utilisation. |

## Protocoles

### `brand-deck-minimal` (13 étapes)

Le pipeline inter-applications principal. Il utilise un fichier project.json `ProjectV2` contenant des scènes définies :

1. Valide les entrées et le schéma du projet.
2. Crée des cartes de marque Pixelmator pour chaque scène (en utilisant les jetons `{{HEADLINE}}` et `{{SUBHEAD}}`).
3. *(facultatif)* Génère un générique Motion pour chaque scène en arrière-plan via Compressor.
4. Crée une timeline FCPXML 1.14 à partir de la liste des scènes.
5. Valide le FCPXML par rapport au DTD inclus.
6. Écrit le FCPXML dans le répertoire `<project>/fcp/`.
7. Importe le fichier dans Final Cut Pro.
8. Soumet la tâche d'encodage principale à Compressor.
9. Soumet la tâche d'encodage pour les réseaux sociaux à Compressor.
10. Surveille la progression de l'encodage jusqu'à l'état final.
11. Vérifie que les fichiers de sortie existent.
12. Écrit une entrée dans le registre.
13. Renvoie le résumé de l'étape finale.

### `steam-trailer-minimal`

Alias de `brand-deck-minimal` (v1.7.7+). Séquence d'étapes identique.

## Exemple

```typescript
import { registerProtocolTools } from "@creator-studio-os/protocols";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "csos", version: "2.0.0" });
registerProtocolTools(server);
```

Exécute l'ensemble du pipeline :

```json
// Tool: csos_protocol_run
{
  "protocol": "brand-deck-minimal",
  "projectPath": "/projects/csos-showcase/project.json"
}
// → { "taskId": "task_abc123", "status": "running" }

// Poll for completion:
// Tool: csos_protocol_describe — for step names
// Tool: csos_protocol_run with --resume <taskId> — to resume after interruption
```

## Reprise

Chaque étape enregistre sa sortie dans le registre du projet. Si une exécution est interrompue (plantage de Compressor, blocage de l'importation dans FCP), reprenez à partir de la dernière étape terminée :

```json
// Tool: csos_protocol_run
{
  "protocol": "brand-deck-minimal",
  "projectPath": "/projects/csos-showcase/project.json",
  "resume": "task_abc123"
}
```

## Utilisation programmatique

```typescript
import { runProtocol, listProtocols, STEP_NAMES } from "@creator-studio-os/protocols";

for await (const step of runProtocol({ protocol: "brand-deck-minimal", projectPath: "..." })) {
  console.log(step.name, step.status);
}
```

## Prérequis macOS

`@creator-studio-os/protocols` est uniquement compatible avec macOS (`"os": ["darwin"]`). Les huit applications Creator Studio doivent être installées et l'autorisation d'automatisation doit être accordée.

---

[README principal](../../README.md) · [Journal des modifications](../../CHANGELOG.md) · [Sécurité](../../SECURITY.md)
