<p align="center">
  <a href="README.md">English</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# ```
@creator-studio-os/fcp

> Final Cut Pro ツールセット for Creator Studio OS — FCPXML 1.14 の作成、DTD 検証、Final Cut Pro へのインポート、および AppleScript ライブラリの検査機能を提供します。

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-97%25-brightgreen.svg" alt="Coverage 97%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Apple Creator Studio アプリケーション向けの [Creator Studio OS](../../README.md) MCP コントロールプレーンの一部です。

---

## インストール

```bash
npm install @creator-studio-os/fcp
```

Final Cut Pro (Creator Studio またはスタンドアロン版) および macOS 13 以降が必要です。

## このパッケージの機能

Final Cut Pro の AppleScript インターフェースは**読み取り専用**です。ライブラリやメタデータを検査できますが、AppleScript を使用してタイムラインを作成することはできません。サポートされている作成方法は、FCPXML のインポートです。

`@creator-studio-os/fcp` は、その橋渡し役です。JSON 形式でタイムラインを作成し、FCPXML 1.14 (または 1.13) をビルドおよび検証し、ディスクに書き込み、Final Cut Pro へのインポートをトリガーします。これらはすべて、1 つの呼び出しで実行できます。

## ツール (22)

| ツール | 説明 |
|------|-------------|
| `fcp_project_list` | データディレクトリ内のプロジェクトを一覧表示します。 |
| `fcp_project_create` | 標準のサブディレクトリ構造を持つプロジェクトディレクトリを作成します。 |
| `fcp_project_info` | プロジェクトのメタデータと解決されたパスを読み取ります。 |
| `fcp_fcpxml_build` | JSON 形式からタイムラインを作成します (クリップ、タイトル、トランジション、オーディオ)。 |
| `fcp_fcpxml_validate` | バンドルされている DTD (`xmllint`) に対して FCPXML を検証します。 |
| `fcp_fcpxml_write` | FCPXML ドキュメントをプロジェクトの `fcp/` ディレクトリに書き込みます。 |
| `fcp_fcpxml_import` | Final Cut Pro で FCPXML ファイルを開きます。 |
| `fcp_fcpxml_build_write_import` | ビルド、検証、書き込み、およびインポートを 1 つの呼び出しで実行します。 |
| `fcp_library_list` | Final Cut Pro で開いているライブラリを一覧表示します。 |
| `fcp_library_events` | 開いているライブラリ内のイベントを一覧表示します。 |
| `fcp_event_projects` | イベント内のプロジェクトを一覧表示します。 |
| `fcp_project_metadata` | シーケンスのメタデータ (再生時間、フレームレート、タイムコード形式) を読み取ります。 |
| `fcp_safety_compound` | 暗黙的な複合クリップを引き起こす、プライマリ・スピンクリップの重複をチェックします。 |
| `fcp_safety_captions` | Final Cut Pro が要求する形式に合わせた、キャプションの役割の割り当てをチェックします。 |
| `fcp_safety_anchors` | レーン間のタイトルアンカーの衝突を検出します。 |
| `fcp_app_open` | Final Cut Pro を起動します。 |
| `fcp_app_activate` | Final Cut Pro を前面に表示します。 |
| `fcp_app_running` | Final Cut Pro が現在実行中かどうかを確認します。 |
| `fcp_bind_motion_param` | Motion テンプレートから公開されたパラメータを読み取ります。 |
| `fcp_effects_catalog` | Motion テンプレートのディレクトリを検索し、すべてのエフェクトのカタログを返します。 |
| `fcp_round_trip_diff` | 2 つの FCPXML ドキュメントを比較し、Final Cut Pro が知っている 12 種類のラウンドトリップ変換を検出します。 |
| `fcp_round_trip_capture` | Final Cut Pro ライブラリバンドルから FCPXML を抽出します。 |

## 例

タイムラインを 1 つの呼び出しで作成し、インポートします。

```json
// Tool: fcp_fcpxml_build_write_import
{
  "projectName": "csos-showcase",
  "spec": {
    "format": { "frameDuration": "1001/30000s", "width": 1920, "height": 1080 },
    "primaryClips": [
      { "asset": "hook.mov", "offset": "0s", "duration": "5s" },
      { "asset": "fcp-demo.mov", "offset": "5s", "duration": "6s" }
    ],
    "titles": [
      { "lane": 1, "offset": "0s", "duration": "3s", "text": "Creator Studio OS" }
    ]
  }
}
```

## FCPXML ビルダ

```typescript
import { buildFCPXML, validateFCPXML } from "@creator-studio-os/fcp";

const xml = buildFCPXML(spec);           // returns FCPXML string
const { valid, output } = validateFCPXML(xml);  // runs xmllint against bundled DTD
```

## macOS の要件

`@creator-studio-os/fcp` は macOS のみで動作します (`"os": ["darwin"]`)。DTD の検証には、Xcode Command Line Tools に含まれる `xmllint` が使用されます。バンドルされている DTD は、Final Cut Pro アプリケーションバンドルに含まれる `FCPXMLv1_14.dtd` です。

---

[メインの README](../../README.md) · [変更履歴](../../CHANGELOG.md) · [FCPXML リファレンス](../../docs/reference/fcpxml.md)
```
