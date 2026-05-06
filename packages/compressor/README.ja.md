<p align="center">
  <a href="README.md">English</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/compressor

> Creator Studio OS向けのコンプレッサーツール。ヘッドレスエンコード、バッチ処理、ライブ進行状況のストリーミング、およびデーモンの復旧機能を提供します。

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-95%25-brightgreen.svg" alt="Coverage 95%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Apple Creator Studioアプリ向けの[Creator Studio OS](../../README.md) MCPコントロールプレーンの一部です。

---

## インストール

```bash
npm install @creator-studio-os/compressor
```

Compressor（Apple Creator Studioの一部）とmacOS 13.0以降が必要です。

## このパッケージの機能

CLI（`-jobpath`、`-monitor`）を介してApple Compressorを制御します。GUIスクリプトは不要です。エンコードジョブの送信、ライブ進行状況のストリーミング、`.compressorsetting`ファイルの確認、およびデーモンの停止からの復旧が可能です。

## ツール (15)

| ツール | 説明 |
|------|-------------|
| `compressor_app_open` | Compressorを起動します（冪等性あり。初回実行時にライセンス認証を行います）。 |
| `compressor_app_running` | Compressorが現在実行中かどうかを確認します。 |
| `compressor_encode` | CLIを介してCompressorのキューに単一のエンコードジョブを送信します。 |
| `compressor_encode_project` | csosプロジェクトのスコープ内でのワークフロー向けエンコードジョブのラッパー。 |
| `compressor_status` | ジョブまたはバッチの状態を一時的に確認します（完了率、残り時間など）。 |
| `compressor_monitor_stream` | `-monitor -format json`を介してエンコードの進行状況をストリーミングします。定期的にStatusFramesを送信します。 |
| `compressor_pause` | ジョブまたはバッチの一時停止。 |
| `compressor_resume` | 一時停止されたジョブまたはバッチの再開。 |
| `compressor_kill` | ジョブまたはバッチのキャンセル。 |
| `compressor_wait_for` | ジョブが完了、失敗、またはキャンセルされるまでポーリングします。 |
| `compressor_settings_list` | 利用可能なエンコード設定と、その可用性フラグを一覧表示します。 |
| `compressor_settings_inspect` | `.compressorsetting`ファイルを解析します（コーデック、ビットレート、解像度、HDRメタデータ）。 |
| `compressor_settings_resolve` | 表示名から`.compressorsetting`ファイルのパスを逆検索します。 |
| `compressor_locations_list` | 利用可能なCompressorの出力先を一覧表示します。 |
| `compressor_codec_availability` | このホストで利用可能なコーデックを報告します。 |

## 例

```typescript
import { registerCompressorTools } from "@creator-studio-os/compressor";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "csos", version: "2.0.0" });
registerCompressorTools(server);
```

エンコードジョブを送信し、進行状況をストリーミングします。

```json
// Tool: compressor_encode
{
  "inputPath": "/projects/csos-showcase/out/timeline.mov",
  "settingName": "Apple ProRes 422",
  "outputPath": "/projects/csos-showcase/out/final.mov"
}

// Tool: compressor_monitor_stream
{ "jobId": "<returned jobId>" }
```

## 復旧

```typescript
import { recovery } from "@creator-studio-os/compressor";

// recovery.app === "compressor"
// recovery.recover() restarts the Compressor daemon if it hangs
```

`recovery`プロファイルは、`@creator-studio-os/core`の`withDaemonRecovery`と連携し、デーモンが停止した場合に自動的に再起動します。

## macOSの要件

`@creator-studio-os/compressor`はmacOS専用です（`package.json`の`"os": ["darwin"]`）。CompressorのCLIパスは、インストールされているアプリケーションバンドルから実行時に解決されます。

---

[メインのREADME](../../README.md) · [変更履歴](../../CHANGELOG.md) · [セキュリティ](../../SECURITY.md)
