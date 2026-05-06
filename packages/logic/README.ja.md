<p align="center">
  <a href="README.md">English</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/logic

> Creator Studio OS向けのLogic Proツール。ライフサイクル管理と`.logicx`プロジェクトファイルのオープン機能を提供します。

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-100%25-brightgreen.svg" alt="Coverage 100%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

AppleのCreator Studioアプリ向けの[Creator Studio OS](../../README.md) MCPコントロールプレーンの一部です。

---

## インストール

```bash
npm install @creator-studio-os/logic
```

Logic Pro (Creator Studio)とmacOS 13.0以降が必要です。

## このパッケージの機能

Logic Proは**AppleScriptインターフェースを提供していません**。つまり、sdef辞書はありません。`@creator-studio-os/logic`は、Logicの起動、動作状況の確認、および`open -b com.apple.logic10`コマンドを使用した`.logicx`プロジェクトファイルのオープンといった、可能な範囲の機能を提供します。Logic GUI上でのさらなる自動化は、ユーザー自身が行う必要があります。

## ツール (3)

| ツール | 説明 |
|------|-------------|
| `logic_app_open` | Logic Proを起動します（すでに起動している場合は何もしません）。 |
| `logic_app_running` | Logic Proが動作しているかどうかを確認します。 |
| `logic_open` | `.logicx`プロジェクトファイルをオープンします。Logicが起動し、ファイルが開かれます。 |

## 例

```typescript
import { registerLogicTools } from "@creator-studio-os/logic";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "csos", version: "2.0.0" });
registerLogicTools(server);
```

Logicプロジェクトを開く:

```json
// Tool: logic_open
{ "path": "/projects/csos-showcase/audio/session.logicx" }
```

## 復旧プロファイル

```typescript
import { recovery } from "@creator-studio-os/logic";
// recovery.app === "logic"
// recovery.badStatePattern === null  (no bad-state detection for Logic)
```

## macOSの要件

`@creator-studio-os/logic`はmacOSのみで動作します (`"os": ["darwin"]`)。Logic Proが必要です。Logic Proは、Apple Creator Studioのサブスクリプションに含まれています。

---

[メインのREADME](../../README.md) · [変更履歴](../../CHANGELOG.md) · [セキュリティ](../../SECURITY.md)
