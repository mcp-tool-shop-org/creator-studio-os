<p align="center">
  <a href="README.md">English</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/iwork-docs

> Creator Studio OS向けのPagesおよびNumbersツール。ドキュメントおよびスプレッドシートのライフサイクル管理、および複数の形式（PDF、Word、EPUB、Excel、CSV）でのエクスポート機能を提供します。

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-100%25-brightgreen.svg" alt="Coverage 100%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

AppleのCreator Studioアプリ向けのMCP（Management Control Plane）の一部として、[Creator Studio OS](../../README.md)に含まれています。

---

## インストール

```bash
npm install @creator-studio-os/iwork-docs
```

Pagesおよび/またはNumbers（Apple iWorkの一部。Mac App Storeから無料で入手可能）と、macOS 13以降が必要です。

## このパッケージの機能

AppleScriptを通じてApple PagesおよびNumbersを操作します。GUIに触れることなく、複数の形式でドキュメントを開いたり、閉じたり、エクスポートしたりできます。

## ツール（10個）

### Pages（5個）

| ツール | 説明 |
|------|-------------|
| `pages_app_open` | Pagesの起動 |
| `pages_app_running` | Pagesが実行中かどうかを確認 |
| `pages_open` | Pagesのドキュメントを開く（ドキュメント名を返します） |
| `pages_close` | Pagesのドキュメントを閉じる（必要に応じて保存） |
| `pages_export` | PDF、Word、RTF、プレーンテキスト、またはEPUB形式でエクスポート |

### Numbers（5個）

| ツール | 説明 |
|------|-------------|
| `numbers_app_open` | Numbersの起動 |
| `numbers_app_running` | Numbersが実行中かどうかを確認 |
| `numbers_open` | Numbersのドキュメントを開く（ドキュメント名を返します） |
| `numbers_close` | Numbersのドキュメントを閉じる（必要に応じて保存） |
| `numbers_export` | PDF、Microsoft Excel、またはCSV形式でエクスポート |

## 例

```typescript
import { registerPagesTools, registerNumbersTools } from "@creator-studio-os/iwork-docs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "csos", version: "2.0.0" });
registerPagesTools(server);
registerNumbersTools(server);
```

PagesのドキュメントをWord形式でエクスポート：

```json
// Tool: pages_export
{
  "documentName": "Creative Brief.pages",
  "outputPath": "/projects/brief.docx",
  "format": "Word"
}
```

NumbersのスプレッドシートをCSV形式でエクスポート：

```json
// Tool: numbers_export
{
  "documentName": "Production Log.numbers",
  "outputPath": "/projects/log.csv",
  "format": "CSV"
}
```

## 復旧プロファイル

```typescript
import { pagesRecovery, numbersRecovery } from "@creator-studio-os/iwork-docs";

// pagesRecovery.app   === "pages"
// numbersRecovery.app === "numbers"
```

## macOSの要件

`@creator-studio-os/iwork-docs`はmacOSのみをサポートします（`"os": ["darwin"]`）。PagesおよびNumbersをインストールし、初回実行時にアクセシビリティ/自動化の許可を付与する必要があります。

---

[メインのREADME](../../README.md) · [変更履歴](../../CHANGELOG.md) · [セキュリティ](../../SECURITY.md)
