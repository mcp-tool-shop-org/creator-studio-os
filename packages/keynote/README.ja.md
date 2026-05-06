<p align="center">
  <a href="README.md">English</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/keynote

> Keynoteツール：Creator Studio OS向け。スライドデッキの自動化、Markdownインポート、ストーリーボードからFCPXMLへの変換、およびマルチフォーマットエクスポートのための56種類のツールを提供します。

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-99%25-brightgreen.svg" alt="Coverage 99%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Apple Creator Studioアプリ向けのMCP（管理プレーン）の一部として、[Creator Studio OS](../../README.md)に含まれています。

---

## インストール

```bash
npm install @creator-studio-os/keynote
```

Keynote（Creator Studio版またはスタンドアロン版）とmacOS 13以降が必要です。

## このパッケージの機能

Appleアプリの中で最も深いAppleScriptインターフェースを提供します。Keynoteは、スライドデッキの作成、編集、およびエクスポートのための豊富なsdef辞書を公開しています。`@creator-studio-os/keynote`は、この機能をすべて網羅しており、スライドのライフサイクル、テキスト、表、グラフ、画像、トランジション、機械学習（ML）エフェクト、エクスポート、および2つのパイプラインブリッジ（Markdownインポート + FCPXMLストーリーボードエクスポート）をカバーする56種類のツールを提供します。

## ツール（56種類）

### アプリケーションのライフサイクル

| ツール | 説明 |
|------|-------------|
| `keynote_app_open` | Keynoteを起動 |
| `keynote_app_running` | Keynoteが実行中かどうかを確認 |

### ドキュメントのライフサイクル

| ツール | 説明 |
|------|-------------|
| `keynote_open` | `.key`ファイルを開く。ファイル名を返します（他のすべてのツールで使用）。 |
| `keynote_close` | ドキュメントを閉じる（オプションで保存） |
| `keynote_save` | ドキュメントを保存する（オプションで別の場所に保存） |
| `keynote_list_presentations` | 開いているすべてのドキュメントを一覧表示 |
| `keynote_create_presentation` | 新しい空白のプレゼンテーションを作成 |
| `keynote_set_doc_size` | スライドのサイズを設定する（例：16:9の場合は1920×1080） |
| `keynote_set_kiosk_mode` | キオスクディスプレイのための自動再生、自動ループ、およびアイドルタイムアウトを設定 |

### テーマとマスター

| ツール | 説明 |
|------|-------------|
| `keynote_list_themes` | 利用可能なすべてのテーマを一覧表示 |
| `keynote_apply_theme` | ドキュメントにテーマを適用 |
| `keynote_list_masters` | 現在のテーマにあるスライドマスターのレイアウトを一覧表示 |
| `keynote_set_slide_master` | スライドのマスターレイアウトを設定 |

### スライドの管理

| ツール | 説明 |
|------|-------------|
| `keynote_list_slides` | インデックス、タイトル、およびスキップ状態とともに、すべてのスライドを一覧表示 |
| `keynote_get_slide` | スライドのタイトル、本文、メモ、およびトランジションを読み取る |
| `keynote_make_slide` | 新しいスライドを追加 |
| `keynote_delete_slide` | スライドを削除 |
| `keynote_duplicate_slide` | スライドを複製 |
| `keynote_reorder_slide` | スライドを別の位置に移動 |
| `keynote_skip_slide` | スライドをスキップまたはスキップ解除 |

### テキストとコンテンツ

| ツール | 説明 |
|------|-------------|
| `keynote_set_title` | スライドのタイトルテキストを設定 |
| `keynote_set_body` | スライドの本文テキストを設定 |
| `keynote_set_text_style` | 任意のスライドアイテムのテキストのスタイルを設定（フォント、サイズ、色） |
| `keynote_get_presenter_notes` | スライドからプレゼンターノートを読み取る |
| `keynote_set_presenter_notes` | スライドにプレゼンターノートを設定 |
| `keynote_extract_all_notes` | すべてのスライドからプレゼンターノートとタイトルを抽出 |

### トランジション

| ツール | 説明 |
|------|-------------|
| `keynote_set_transition` | スライドトランジションを設定する（43種類のsdefエフェクトとタイミング） |
| `keynote_plan_magic_move` | Magic Moveトランジションのための2つのスライドを準備 |

### アイテム：画像、図形、線、表、グラフ

| ツール | 説明 |
|------|-------------|
| `keynote_list_items` | スライドにあるすべてのiWorkアイテムを一覧表示 |
| `keynote_position_item` | スライドアイテムの位置と/またはサイズを変更 |
| `keynote_format_item` | スライドアイテムの不透明度、回転、および反射を設定 |
| `keynote_get_item_info` | アイテムの位置、サイズ、不透明度、および回転を読み取る |
| `keynote_insert_image` | ファイルパスから画像を挿入 |
| `keynote_set_voiceover_description` | スライドの画像にVoiceOverアクセシビリティの説明を設定 |
| `keynote_insert_shape` | 長方形の図形を挿入 |
| `keynote_insert_line` | 線分を挿入 |
| `keynote_insert_table` | 表を挿入 |
| `keynote_read_table` | セル値を2次元配列として読み取る |
| `keynote_write_table` | 2次元配列からセル値を書き込む |
| `keynote_make_chart` | 行名、列名、およびデータを含むグラフを追加 |
| `keynote_make_image_slides` | ファイルリストから、1つの画像を1つのスライドとして一括追加 |

### MLエフェクト（Creator Studioのみ）

| ツール | 説明 |
|------|-------------|
| `keynote_clean_up_slide` | Keynoteに組み込まれたレイアウト最適化を使用して、スライドを整理 |
| `keynote_super_resolution` | スライド画像の機械学習による超解像度アップスケーリングを適用 |
| `keynote_remove_background` | 機械学習を使用して、スライド画像から背景を削除 |

### スライドショー

| ツール | 説明 |
|------|-------------|
| `keynote_start` | プレゼンテーションを開始する（オプションで特定のスライドから開始） |
| `keynote_stop` | アクティブなスライドショーを停止 |

### エクスポート
```

| ツール | 説明 |
|------|-------------|
| `keynote_export_pdf` | PDFへのエクスポート |
| `keynote_export_pdf_advanced` | 配布資料形式、注釈、パスワード、および画像品質のオプションを指定してPDFにエクスポート |
| `keynote_export_images` | 各スライドをPNG、JPEG、またはTIFF形式でエクスポート |
| `keynote_export_movie` | QuickTimeムービーとしてエクスポート |
| `keynote_export_movie_advanced` | コーデック（H.264、HEVC、ProResの各種）、解像度、およびフレームレートを指定してムービーとしてエクスポート |
| `keynote_export_pptx` | Microsoft PowerPoint形式でエクスポート |
| `keynote_export_html` | 静的なHTMLサイトとしてエクスポート |

### パイプライン連携

| ツール | 説明 |
|------|-------------|
| `keynote_from_markdown` | Markdownドキュメントからプレゼンテーションを作成（見出しをスライドに変換） |
| `keynote_to_storyboard_fcp` | KeynoteのプレゼンテーションをFinal Cut Proのストーリーボード形式（FCPXML）に変換 |
| `keynote_to_compressor_gif` | Compressorを使用して、スライドショーをアニメーションGIFとしてエクスポート |

## 例

Markdownからプレゼンテーションを作成し、PPTX形式でエクスポート：

```json
// Tool: keynote_from_markdown
{
  "markdownPath": "/projects/brief.md",
  "masterMap": {
    "h1": "Title",
    "h2": "Section Header",
    "bullets": "Bullets"
  }
}

// Tool: keynote_export_pptx
{
  "documentName": "brief.key",
  "outputPath": "/projects/brief.pptx"
}
```

スライドをProResムービーとしてエクスポート：

```json
// Tool: keynote_export_movie_advanced
{
  "documentName": "csos-showcase.key",
  "outputPath": "/projects/csos-showcase/out/slideshow.mov",
  "codec": "ProRes 4444",
  "width": 1920,
  "height": 1080,
  "frameRate": "29.97"
}
```

## 復旧プロファイル

```typescript
import { recovery } from "@creator-studio-os/keynote";
// recovery.app === "keynote"
```

## macOSの要件

`@creator-studio-os/keynote`はmacOSのみで動作します（`"os": ["darwin"]`）。機械学習ツールは、Creator Studioのサブスクリプションに含まれるKeynoteが必要です。標準ツールは、Mac App Storeから入手できる無償のスタンドアロン版Keynoteで動作します。

---

[メインのREADME](../../README.md) · [変更履歴](../../CHANGELOG.md) · [セキュリティ](../../SECURITY.md)
