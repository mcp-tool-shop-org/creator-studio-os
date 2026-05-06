<p align="center">
  <a href="README.md">English</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/pixelmator

> Creator Studio OS用のPixelmator Proツール。レイヤー編集、機械学習（ML）によるエフェクト、ブランドカードの作成、および様々な形式でのエクスポート機能を提供します。

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-99%25-brightgreen.svg" alt="Coverage 99%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Apple Creator Studioアプリ向けのMCP（Media Control Plane）の一部として、[Creator Studio OS](../../README.md)に組み込まれています。

---

## インストール

```bash
npm install @creator-studio-os/pixelmator
```

Pixelmator Pro（Creator Studio版またはスタンドアロン版）とmacOS 13以降が必要です。

## このパッケージの機能

`@creator-studio-os/pixelmator`は、AppleScriptインターフェースを通じてPixelmator Proを制御します。macOSで利用可能な、機械学習を活用した画像編集APIの中で最も豊富な機能を提供します。ドキュメントのライフサイクル全体、レイヤーの操作、機械学習アルゴリズム、カラー調整、エフェクト、および様々なサイズでのブランドカード作成機能を備えた33種類のツールを提供します。

## ツール（33種類）

### アプリとドキュメントのライフサイクル

| ツール | 説明 |
|------|-------------|
| `pixelmator_app_open` | Pixelmator Proを起動 |
| `pixelmator_app_running` | Pixelmator Proが実行中かどうかを確認 |
| `pixelmator_open` | ドキュメントを開く（ドキュメント名が返されます。他のすべてのツールで使用されます） |
| `pixelmator_close` | ドキュメントを閉じる（保存は行われません） |
| `pixelmator_export` | PNG、JPEG、TIFF、PSD、WebP、HEIC、AVIF形式でエクスポート |
| `pixelmator_export_hdr` | HDR JPEG、HDR HEIC、HDR AVIF、またはHDR PNG形式でエクスポート |
| `pixelmator_export_video` | ビデオレイヤーをMP4またはQuickTime形式でエクスポート |
| `pixelmator_export_animated` | アニメーションGIFまたはアニメーションPNG形式でエクスポート |
| `pixelmator_export_for_web` | Webに最適化されたPNG、JPEG、WebP、GIF、またはSVG形式でエクスポート |
| `pixelmator_batch_export_project_images` | プロジェクト内の`images/`ディレクトリにあるすべての画像をバッチエクスポート |
| `pixelmator_batch_export_project_images_dryrun` | テスト実行：バッチエクスポートで処理されるものをリスト表示 |

### ドキュメントの変換

| ツール | 説明 |
|------|-------------|
| `pixelmator_resize` | ドキュメントのサイズと/または解像度を変更 |
| `pixelmator_crop` | 指定された範囲 `{x, y, width, height}` にトリミング |
| `pixelmator_rotate` | 180度回転、右回転（90度時計回り）、または左回転（90度反時計回り） |
| `pixelmator_flip` | 水平または垂直方向に反転 |

### レイヤーのスタック

| ツール | 説明 |
|------|-------------|
| `pixelmator_make_layer` | 画像、テキスト、またはシェイプレイヤーを追加 |
| `pixelmator_set_layer_properties` | 可視性、不透明度、ブレンドモード、位置、またはサイズを変更 |
| `pixelmator_layer_order` | レイヤーの順序を変更（手前/奥/前/後） |
| `pixelmator_group_layers` | レイヤーを新しいグループに移動 |
| `pixelmator_ungroup` | グループレイヤーをグループ解除 |
| `pixelmator_set_layer_text` | テキストレイヤーのテキストコンテンツとスタイルを編集 |
| `pixelmator_make_shape` | 塗りつぶされた長方形、楕円、角丸長方形、または直線を作成 |
| `pixelmator_set_blend_mode` | 合成ブレンドモードを設定（Pixelmator Proの28種類のモードすべて） |
| `pixelmator_set_layer_shadow` | ドロップシャドウを追加または編集 |
| `pixelmator_set_layer_stroke` | アウトラインストロークを追加または編集 |

### エフェクトとカラー調整

| ツール | 説明 |
|------|-------------|
| `pixelmator_apply_effect` | 23種類の非破壊エフェクトを適用 |
| `pixelmator_apply_color_adjustment` | 24種類のカラー調整プロパティを設定（LUTパス、ビネットなどを含む） |

### 機械学習（ML）

| ツール | 説明 |
|------|-------------|
| `pixelmator_apply_ml` | 超解像、鮮明化、ノイズ除去、デバンド、カラーマッチング、背景除去、被写体選択、または自動調整を実行 |
| `pixelmator_run_shortcut` | `shortcuts run`コマンドを使用して、Pixelmator Shortcutsのアクションを名前で実行 |

### 検出と置換

| ツール | 説明 |
|------|-------------|
| `pixelmator_detect` | 顔またはQRコードを検出（バウンディングボックス。QRコードにはデコードされたデータも含まれます） |
| `pixelmator_replace_text` | すべてのテキストレイヤー内のテキストを検索して置換 |
| `pixelmator_replace_layer` | 新しいファイルから、画像レイヤーのピクセルコンテンツを置換 |

### ブランドカード作成ツール

| ツール | 説明 |
|------|-------------|
| `pixelmator_compose_brand_card` | `.pxd`テンプレートを開き、`{{HEADLINE}}`、`{{SUBHEAD}}`、`{{LOGO}}`のトークンを置換し、複数のサイズでエクスポート |

## 例

テンプレートから3つのサイズのブランドカードを生成：

```json
// Tool: pixelmator_compose_brand_card
{
  "templatePath": "/projects/csos-showcase/brand/card-template.pxd",
  "brand": {
    "headline": "Creator Studio OS",
    "subhead": "Eight apps. One pipeline.",
    "logoPath": "/projects/csos-showcase/brand/csos-logo.png"
  },
  "sizes": [
    { "width": 1920, "height": 1080, "label": "16x9" },
    { "width": 1080, "height": 1080, "label": "square" },
    { "width": 1080, "height": 1920, "label": "story" }
  ],
  "outputDir": "/projects/csos-showcase/out/brand-cards"
}
```

機械学習による超解像を適用して再エクスポート：

```json
// Tool: pixelmator_apply_ml
{
  "documentName": "hero.pxd",
  "algorithm": "super_resolution"
}

// Tool: pixelmator_export
{
  "documentName": "hero.pxd",
  "outputPath": "/projects/csos-showcase/out/hero-4k.png",
  "format": "PNG"
}
```

## リカバリープロファイル

```typescript
import { recovery } from "@creator-studio-os/pixelmator";
// recovery.app === "pixelmator"
```

## macOSの要件

`@creator-studio-os/pixelmator`はmacOS専用です（`"os": ["darwin"]`）。機械学習機能を使用するには、Creator StudioのサブスクリプションまたはMac App StoreからPixelmator Proが必要です。

---

[メインのREADME](../../README.md) · [変更履歴](../../CHANGELOG.md) · [セキュリティ](../../SECURITY.md)
```
