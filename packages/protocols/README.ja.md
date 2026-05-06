<p align="center">
  <a href="README.md">English</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/protocols

> Creator Studio OS向けの、アプリケーション間の連携を可能にするプロトコル群。ブランド紹介動画作成パイプライン（brand-deck-minimal）と、ゲームのトレーラー作成パイプライン（steam-trailer-minimal）が含まれます。

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-85%25-brightgreen.svg" alt="Coverage 85%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

AppleのCreator Studioアプリ向けの、[Creator Studio OS](../../README.md)のMCP（Management and Control Plane）の一部です。

---

## インストール

```bash
npm install @creator-studio-os/protocols
```

Creator Studioのすべての8つのアプリと、macOS 13以降が必要です。

## このパッケージの機能

`@creator-studio-os/protocols`は、複数のアプリケーションを連携させる一連の処理（Pixelmatorでのブランドカード作成 → Motionでのローワーサードのレンダリング → FCPXMLのビルド → Final Cut Proへのインポート → Compressorでのエンコード）を、中断可能な形で実行します。

プロトコルは、**段階的な処理を行うもの**です。各段階は冪等であり、`--resume <taskId>`オプションを使用することで、完了した段階から処理を再開できます。

## ツール（3つ）

| ツール | 説明 |
|------|-------------|
| `csos_protocol_run` | `ProjectV2`形式のproject.jsonファイルに対して、アプリケーション間の連携プロトコルを最初から最後まで実行します。すぐに`taskId`が返されます。ステータスを確認し、最終的な処理の概要を表示します。すでに完了している段階をスキップするために、`--resume <taskId>`オプションを使用できます。 |
| `csos_protocol_list` | 登録されているすべてのプロトコルを、名前、説明、および段階数とともに一覧表示します。 |
| `csos_protocol_describe` | 特定のプロトコルについて、目的、段階名、および使用上の注意点などを説明します。 |

## プロトコル

### `brand-deck-minimal`（13段階）

主要なアプリケーション連携パイプラインです。`ProjectV2`形式のproject.jsonファイルに、シーンが定義されている必要があります。

1. 入力とプロジェクトのスキーマを検証します。
2. シーンごとに、Pixelmatorでブランドカードを作成します（`{{HEADLINE}}`、`{{SUBHEAD}}`トークンを使用）。
3. （オプション）Compressorを使用して、シーンごとのMotionローワーサードをレンダリングします。
4. シーンリストから、FCPXML 1.14のタイムラインを生成します。
5. FCPXMLを、同梱されているDTDに対して検証します。
6. FCPXMLを`<project>/fcp/`ディレクトリに書き込みます。
7. Final Cut Proにインポートします。
8. メインのエンコードジョブをCompressorに送信します。
9. ソーシャルメディア用のエンコードジョブをCompressorに送信します。
10. エンコードの進捗状況を監視します。
11. 出力ファイルが存在することを確認します。
12. ログエントリを書き込みます。
13. 最終的な処理の概要を返します。

### `steam-trailer-minimal`

`brand-deck-minimal`（v1.7.7以降）の別名です。段階の順序は同じです。

## 例

```typescript
import { registerProtocolTools } from "@creator-studio-os/protocols";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "csos", version: "2.0.0" });
registerProtocolTools(server);
```

パイプライン全体を実行します。

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

## 再開機能

各段階の出力は、プロジェクトのログに記録されます。処理が中断された場合（Compressorのクラッシュ、Final Cut Proへのインポートの停止など）、最後に完了した段階から再開できます。

```json
// Tool: csos_protocol_run
{
  "protocol": "brand-deck-minimal",
  "projectPath": "/projects/csos-showcase/project.json",
  "resume": "task_abc123"
}
```

## プログラムによる利用

```typescript
import { runProtocol, listProtocols, STEP_NAMES } from "@creator-studio-os/protocols";

for await (const step of runProtocol({ protocol: "brand-deck-minimal", projectPath: "..." })) {
  console.log(step.name, step.status);
}
```

## macOSの要件

`@creator-studio-os/protocols`は、macOSでのみ動作します（`"os": ["darwin"]`）。Creator Studioのすべての8つのアプリがインストールされており、自動化の許可が付与されている必要があります。

---

[メインのREADME](../../README.md) · [変更履歴](../../CHANGELOG.md) · [セキュリティ](../../SECURITY.md)
