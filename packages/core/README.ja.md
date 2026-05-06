<p align="center">
  <a href="README.md">English</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/core

> Creator Studio OSで使用される共通ランタイム。AppleScript実行機能、プロジェクトスキーマ、ログ、エラーの種類、iWorkとの連携機能を提供します。

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-89%25-brightgreen.svg" alt="Coverage 89%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Apple Creator Studioアプリケーション向けのMCP（Management Control Plane）の一部として、[Creator Studio OS](../../README.md)に含まれています。

---

## インストール

```bash
npm install @creator-studio-os/core
```

## このパッケージの機能

`@creator-studio-os/core`は、他のすべての`@creator-studio-os/*`パッケージで共有されるランタイムの基盤です。以下の機能を提供します。

- **AppleScript実行機能** — `runAppleScript`, `runApp`, `awaitOutput`, `openApp`, `withDaemonRecovery`
- **プロジェクトスキーマ** — `ProjectV2`のZodスキーマ、リゾルバー、および型付きパスマップ
- **エラーシステム** — 構造化された`{ code, message, hint }`形式のエラーオブジェクト`CreatorStudioError`
- **設定** — `loadConfig()`関数は、`CREATOR_STUDIO_DATA_DIR`とすべてのアプリケーションバンドルIDを読み込みます。
- **ログ** — `<dataDir>/.csos/ledger.jsonl`に構造化されたエンコード/プロジェクト履歴を保存します。
- **iWork連携** — `openDocumentInApp`, `closeDocumentInApp`, `exportDocumentInApp`, `activateApp`, `isAppRunning`

## ツール (1)

| ツール | 説明 |
|------|-------------|
| `csos_app_status` | Creator Studioのアプリケーションが実行中であり、正常に動作しているかどうかを確認します。すべての8つのアプリケーションをまとめて確認するには、`app="all"`を指定します。 |

## 例

```typescript
import {
  runAppleScript,
  CreatorStudioError,
  loadConfig,
  registerStatusTool,
} from "@creator-studio-os/core";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "csos", version: "2.0.0" });
registerStatusTool(server);

// Escape user input before interpolation — always
const name = escapeAppleScriptString(userInput);
const result = await runAppleScript(`tell app "Keynote" to get name of document "${name}"`);
```

## エラー処理

すべてのランタイムエラーは`CreatorStudioError`として扱われます。

```typescript
import { CreatorStudioError } from "@creator-studio-os/core";

try {
  await runAppleScript(`...`);
} catch (err) {
  if (err instanceof CreatorStudioError) {
    console.error(err.code);   // "E_OSASCRIPT_FAILED", "E_AUTOMATION_DENIED", …
    console.error(err.hint);   // actionable suggestion
  }
}
```

## macOSの要件

`@creator-studio-os/core`はmacOSでのみ動作します (`"os": ["darwin"]`)。AppleScript実行機能は`osascript`を呼び出し、`openApp`は`open -b <bundleId>`を使用します。

---

[メインのREADME](../../README.md) · [変更履歴](../../CHANGELOG.md) · [セキュリティ](../../SECURITY.md)
