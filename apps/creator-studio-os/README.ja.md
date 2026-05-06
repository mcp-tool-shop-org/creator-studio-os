<p align="center">
  <a href="README.md">English</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
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

Apple Creator Studio アプリケーション向けの MCP (Media Control Plane) コントロールプレーン。Claude またはその他の MCP クライアントから、**Final Cut Pro**、**Compressor**、**Motion**、**Pixelmator Pro**、**Logic Pro**、**Keynote**、**Pages**、および **Numbers** を操作できます。

このパッケージは、**包括的な CLI (コマンドラインインターフェース)** であり、9 つの `@creator-studio-os/*` パッケージをすべてバンドルし、`creator-studio-os serve` という単一のコマンドとして公開します。

## インストール

```bash
npm install -g @creator-studio-os/creator-studio-os
```

または、npx を使用して (インストール不要):

```bash
npx @creator-studio-os/creator-studio-os serve
```

## MCP クライアントの設定

`claude_desktop_config.json` (または同等のファイル) に以下を追加します。

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

## 含まれるもの

| パッケージ | ツール | 動作対象 |
|---------|-------|----------------|
| `@creator-studio-os/core` | 1 | 共有ランタイム、AppleScript ランナー、プロジェクトスキーマ |
| `@creator-studio-os/compressor` | 15 | ヘッドレスエンコード、バッチ処理、ライブ進行状況 |
| `@creator-studio-os/fcp` | 22 | FCPXML 1.14 形式の作成、DTD 検証、Final Cut Pro へのインポート |
| `@creator-studio-os/iwork-docs` | 10 | Pages および Numbers ドキュメントのライフサイクルとエクスポート |
| `@creator-studio-os/keynote` | 56 | Keynote の完全自動化：スライド、ML (機械学習)、エクスポート、パイプライン連携 |
| `@creator-studio-os/logic` | 3 | Logic Pro の起動と `.logicx` プロジェクトのオープン |
| `@creator-studio-os/motion` | 10 | OZML テンプレートの変更、ヘッドレスレンダリング |
| `@creator-studio-os/pixelmator` | 33 | レイヤー編集、ML エフェクト、ブランドカードコンポジター |
| `@creator-studio-os/protocols` | 3 | アプリケーションを横断する連携パイプライン |

**合計: 9 つのパッケージにまたがる 153 のツール。**

## アプリケーションを横断するパイプライン

主要なユースケース: `csos_protocol_run` は、1 つのコマンドで 8 つのアプリケーションをすべて連携させます。

1. Pixelmator Pro が、シーンごとにブランドカードを作成します。
2. Motion が、Compressor を使用して、オーバーレイをヘッドレスでレンダリングします。
3. FCPXML 1.14 形式のタイムラインが作成され、Final Cut Pro にインポートされます。
4. Compressor が、最終的な成果物 (ProRes メイン + H.264 ソーシャル) をエンコードします。

## CLI (コマンドラインインターフェース)

```bash
creator-studio-os serve          # start MCP server
creator-studio-os verify         # verify xmllint + DTD round-trip
creator-studio-os smoke          # run 9-phase smoke test against live apps
creator-studio-os smoke --dry-run  # smoke test without live app calls
```

## 個々のパッケージの使用

各アプリケーションのパッケージは個別に公開されています。必要なものだけをインストールしてください。

```bash
npm install @creator-studio-os/fcp       # Final Cut Pro only
npm install @creator-studio-os/keynote   # Keynote only
npm install @creator-studio-os/pixelmator  # Pixelmator Pro only
```

## セキュリティ

完全にオンデバイスで実行されます。ネットワーク接続は不要で、テレメトリーも収集されず、認証情報は保存されません。詳細な脅威モデルは [SECURITY.md](SECURITY.md) および [`docs/threat-model.md`](https://github.com/mcp-tool-shop-org/creator-studio-os/blob/main/docs/threat-model.md) で確認できます。

## macOS の要件

macOS 13 以降および Apple Creator Studio のサブスクリプション (または、Mac App Store で利用可能な個別のアプリケーションの購入)。各パッケージの README で、アプリケーションごとの要件を確認してください。

---

[詳細なドキュメント](https://github.com/mcp-tool-shop-org/creator-studio-os) · [変更履歴](CHANGELOG.md) · [セキュリティ](SECURITY.md)
