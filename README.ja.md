<p align="center">
  <a href="README.md">English</a> | <a href="README.zh.md">中文</a> | <a href="README.fr.md">Français</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="400">
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/creator-studio-os/actions/workflows/ci.yml"><img src="https://github.com/mcp-tool-shop-org/creator-studio-os/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <a href="https://mcp-tool-shop-org.github.io/creator-studio-os/"><img src="https://img.shields.io/badge/docs-handbook-informational" alt="Handbook"></a>
</p>

MCPコントロールプレーンは、Apple Creator Studioアプリ向けです。**Final Cut Pro**、**Compressor**、**Motion**、**Pixelmator Pro**、**Logic Pro**、**Keynote**、**Pages**、および**Numbers**をClaudeまたはその他のMCPクライアントから操作できます。JSON仕様に基づいてビデオの成果物を生成したり、Motionのローワーサードをヘッドレスでレンダリングしたり、Compressorでエンコードしたり、クロスアプリのパイプラインでブランドアセットを生成したりできます。

**v1.7.10** — 全ての8つのApple Creator Studioアプリで、78種類のツールを提供。クロスアプリの複合プロトコルが稼働中：Pixelmatorのブランドカード + MotionのProRes 4444ローワーサード + Compressorによる最終エンコード。9つのすべてのフェーズが正常に完了。macOSのみ。

---

## この機能の目的

Final Cut ProのAppleScript辞書は**読み取り専用**です。ライブラリをリストしたり、メタデータを読み取ったりすることはできますが、AppleScriptを使用してタイムラインを作成することはできません。サポートされている制作パスは**FCPXMLインポート**です。適切にフォーマットされたFCPXML 1.14ドキュメントを作成し、Final Cut Proに渡すと、Final Cut Proがプロジェクトを作成します。

`creator-studio-os`は、その橋渡し役です。Claudeは、JSON仕様としてタイムラインを作成し、サーバーがFCPXMLをビルドおよび検証し、FCPのインポートをトリガーし、Compressorを使用してMotionのローワーサードテンプレートをヘッドレスでレンダリングし、Pixelmator Proを使用してブランドアセットを生成します。これらはすべて、単一のクロスアプリのパイプラインで行われます。

## セキュリティ

`creator-studio-os`は、完全にデバイス上で動作します。

- アプリをバンドルID（ファイル名ではなく）に基づいて起動します。
- `CREATOR_STUDIO_DATA_DIR`内のみに書き込みます。システムファイルやFinal Cut Proのライブラリの内部構造にはアクセスしません。
- **ネットワーク接続は一切行いません**。テレメトリー、分析、リモート検証は行いません。
- **認証情報、トークン、またはユーザーデータは一切保存しません**。
- AppleScriptの補間を行う前に、ユーザーが提供したすべての文字列をエスケープします (`escapeAppleScriptString`)。

詳細な脅威モデル：[`docs/threat-model.md`](./docs/threat-model.md) · [`SECURITY.md`](./SECURITY.md)

## インストール

```bash
npm install -g @mcptoolshop/creator-studio-os
```

MCPクライアントの設定ファイル (`claude_desktop_config.json`または同等):

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

または、npxを使用:

```json
{ "command": "npx", "args": ["-y", "@mcptoolshop/creator-studio-os", "serve"] }
```

## セットアップの確認

```bash
creator-studio-os verify
```

プラットフォーム、`osascript`、`xmllint`、Final Cut Proのインストール状況、FCPXML 1.14のDTD、データディレクトリを確認し、バンドルされたDTDを使用したFCPXMLのラウンドトリップを実行します。

## データディレクトリ

デフォルト：`/Volumes/T9-Shared/AI/creator-studio` ( `CREATOR_STUDIO_DATA_DIR`で上書き可能)。

```
creator-studio/
├── projects/
│   └── <name>/
│       ├── project.json     # ProjectV2 spec (scenes, deliverables, brand, scoreMap)
│       ├── footage/         # raw video
│       ├── audio/           # stems, voiceover, music
│       ├── images/          # stills, thumbnails, key art
│       ├── brand/           # logos, type, color tokens
│       ├── refs/            # mood, scripts, canon excerpts
│       ├── fcp/             # FCPXML output
│       └── out/             # rendered deliverables
└── shared/
    ├── brand/               # studio-wide assets
    └── presets/             # Compressor settings
```

## クロスアプリプロトコル：`brand-deck-minimal`

主要なパイプライン：`project.json`仕様からProRes MOVまでの13の手順。

```bash
creator-studio-os protocol run brand-deck-minimal --project demo/csos-showcase/project.json
```

```
1  validate-project       — assert ProjectV2 schema + scene count
2  compose-brand-cards    — Pixelmator Pro: hue-rotated identity cards per scene
3  render-scene-clips     — Motion: clone template → patch title/subhead → Compressor ProRes 4444 render
4  edit-motion-title      — set project-level Motion template title
5  resolve-fcp-params     — compute timeline geometry
6  build-fcpxml           — write FCPXML 1.14 to out/fcp/
7  safety-preflight       — assert brand card files exist
8  dtd-validate           — xmllint against bundled FCP DTD
9  fcp-import             — open .fcpxml in Final Cut Pro
10 compressor-encode      — ffmpeg overlay (brand card + ProRes 4444 alpha clip) → Compressor final encode
11 monitor-encode         — poll encode until done
12 verify-output          — assert MOV exists and has bytes
13 write-replay-manifest  — finalise manifest with completedAt
```

`project.json`の形式：[`src/projects/types.ts`](./src/projects/types.ts) · デモ：[`demo/csos-showcase/project.json`](./demo/csos-showcase/project.json)

## ツール

### Final Cut Pro (22ツール)

| ツール | 目的 |
|------|---------|
| `fcp_project_list` | データディレクトリ内のプロジェクトをリスト |
| `fcp_project_create` | プロジェクトディレクトリと`project.json`を作成 |
| `fcp_project_info` | プロジェクトのメタデータと解決されたパスを読み取り |
| `fcp_fcpxml_build` | JSON仕様からFCPXML 1.14をビルド |
| `fcp_fcpxml_validate` | バンドルされたDTDに対してFCPXMLを検証 |
| `fcp_fcpxml_write` | FCPXMLを`projects/<name>/fcp/`に書き込み |
| `fcp_fcpxml_import` | Final Cut ProでFCPXMLファイルを開く |
| `fcp_fcpxml_build_write_import` | エンドツーエンド：ビルド → 検証 → 書き込み → インポート |
| `fcp_library_list` | Final Cut Proで開いているライブラリをリスト |
| `fcp_library_events` | ライブラリ内のイベントをリスト |
| `fcp_event_projects` | イベント内のプロジェクトをリスト |
| `fcp_project_metadata` | シーケンスの持続時間、フレームレート、タイムコード形式を読み取り |
| `fcp_app_open` / `fcp_app_running` / `fcp_app_activate` | ライフサイクル |
| `fcp_round_trip_diff` | 2つのFCPXMLファイルを比較し、構造化された差分を出力 |
| `fcp_fcpxml_add_title` | スプラインにタイトルエフェクトクリップを追加 |
| `fcp_fcpxml_add_transition` | クリップ間にトランジションを追加 |
| `fcp_fcpxml_add_marker` | チャプター/ToDo/完了マーカーを追加 |
| `fcp_safety_preflight` | インポート前に、すべてのFCPXMLソースファイルが存在することを確認 |
| `fcp_multicam_build` | 複数のアングル仕様からマルチカムクリップをビルド |
| `fcp_caption_build` | トランスクリプトからキャプショントラックを作成します。 |
| `fcp_compound_clip_build` | ネストされたスパイン仕様から複合クリップを作成します。 |

### コンプレッサー (15ツール)

コンプレッサーにはAppleScriptの辞書がありません。インターフェースはCLIと`.compressorbatch`ファイルです。セッションごとの初回起動時に、App Storeの認証検証が実行されます（期待通り）。

| ツール | 目的 |
|------|---------|
| `compressor_app_open` / `compressor_app_running` | ライフサイクル |
| `compressor_settings_list` | `.compressorsetting`プリセットを列挙します。 |
| `compressor_locations_list` | `.compressorlocation`ファイルを列挙します。 |
| `compressor_encode` | 単一のエンコードジョブを送信します。 |
| `compressor_encode_project` | プロジェクトのディレクトリを基準にエンコードします。 |
| `compressor_monitor_stream` | エンコードの進行状況をストリームで取得します。 |
| `compressor_job_status` | 単一のジョブのステータスを確認します。 |
| `compressor_batch_status` | すべての実行中のバッチジョブのステータスを確認します。 |
| `compressor_cancel_job` | 実行中のジョブをキャンセルします。 |
| `compressor_settings_inspect` | `.compressorsetting`ファイルの内容を確認します。 |
| `compressor_batch_build` | `.compressorbatch` XMLドキュメントを作成します。 |
| `compressor_await_output` | 出力ファイルが空でなくなるまで待機します。 |
| `compressor_daemon_recover` | 停止したコンプレッサーデーモンを復旧します。 |

[`docs/reference/compressor-cli.md`](./docs/reference/compressor-cli.md)を参照してください。

### モーション (10ツール)

| ツール | 目的 |
|------|---------|
| `motion_app_open` / `motion_app_running` | ライフサイクル |
| `motion_open` | `.motn`テンプレートを開きます。 |
| `motion_template_clone` | `.motn`テンプレートを新しいパスに複製します。 |
| `motion_template_set_param` | 公開パラメータの値を設定します（OZML編集）。 |
| `motion_template_get_params` | テンプレート内のすべての公開パラメータをリストします。 |
| `motion_template_validate` | `.motn`ファイルのOZML構造を検証します。 |
| `motion_template_publish_catalog` | モーションの公開カタログ内のすべてのテンプレートをリストします。 |
| `motion_publish_to_fcp` | モーションテンプレートをFinal Cut Proのタイトルブラウザに公開します。 |
| `motion_render_via_compressor` | コンプレッサー経由で`.motn`ファイルをビデオにレンダリングします（ヘッドレス）。 |

注：`motion_template_set_param`と`motion_render_via_compressor`は、どのMCP環境においても先行事例がありません。ヘッドレスモーションのOZMLの変更とレンダリングは、csosによってのみ実現可能です。

### Pixelmator Pro (33ツール)

| ツール | 目的 |
|------|---------|
| `pixelmator_app_open` / `pixelmator_app_running` | ライフサイクル |
| `pixelmator_open` / `pixelmator_close` | ドキュメントを開く/閉じる |
| `pixelmator_export` | PNG / JPEG / TIFF / HEIC / GIF / WebP / PDF / SVG形式でエクスポート |
| `pixelmator_resize` / `pixelmator_crop` / `pixelmator_rotate` / `pixelmator_flip` | 変換 |
| `pixelmator_batch_export_project_images` | `projects/<name>/images/`ディレクトリ内のファイルを一括変換 |
| `pixelmator_layer_list` / `pixelmator_layer_create` / `pixelmator_layer_delete` | レイヤーの管理 |
| `pixelmator_layer_set_text` / `pixelmator_layer_set_fill` / `pixelmator_layer_move` | レイヤーの編集 |
| `pixelmator_effects_apply` / `pixelmator_effects_catalog` | MLエフェクトパイプライン |
| `pixelmator_compose_brand_card` | タイトルテキスト付きの、色相回転されたブランドカードを作成します。 |
| `pixelmator_hdr_export` | HDRトーンマッピングでエクスポートします。 |
| `pixelmator_text_card` | フォントと色の制御付きのテキストのみのカードをレンダリングします。 |

### Logic Pro (3ツール)

LogicにはAppleScriptの辞書がありません。インターフェース：ライフサイクルと、`.logicx`プロジェクトのファイルを開く機能。

| ツール | 目的 |
|------|---------|
| `logic_app_open` / `logic_app_running` | ライフサイクル |
| `logic_open` | `.logicx`プロジェクトを開きます。 |

### Keynote / Pages / Numbers (合計18ツール)

これら3つは、ほぼ同一のAppleScript構造を持っています。完全なエクスポート形式カタログ：[`docs/reference/iwork-automation.md`](./docs/reference/iwork-automation.md)。

**Keynote (8ツール):** 開く、閉じる、PDF / 画像 / ムービー / PPTX形式でエクスポート、ライフサイクル
**Pages (5ツール):** 開く、閉じる、PDF / Word / RTF / EPUB形式でエクスポート、ライフサイクル
**Numbers (5ツール):** 開く、閉じる、PDF / Excel / CSV形式でエクスポート、ライフサイクル

### インフラストラクチャ

| ツール | 目的 |
|------|---------|
| `csos_app_status` | すべての8つのアプリのヘルスチェック（実行中、バージョン、キューの深さ） |
| `csos_protocol_run` | クロスアプリのプロトコルをエンドツーエンドで実行（非同期、ステップをストリームで実行） |
| `csos_protocol_list` | 登録されているすべてのプロトコルをリストします。 |
| `csos_protocol_describe` | プロトコルの手順と目的を説明します。 |

## tool-compassを使用した推奨設定

[tool-compass](https://github.com/mcp-tool-shop-org/tool-compass) は、自然言語による意図から適切なツールを見つけるためのセマンティックHNSWゲートウェイです。 8つのアプリケーションに78のツールが分散しているため、これは非常に重要です。

```bash
pip install tool-compass
```

スモークテストでは、フェーズ7で12種類の代表的なクエリを検証します。 説明の変更によって、特定のクエリがスコア0.4を超えるトップ3から外れる場合、スモークテストは失敗となります。

## 権限

サーバーがアプリケーションに対してAppleScriptを初めて使用する場合、macOSはシステム設定 → プライバシーとセキュリティ → 自動化で、**自動化の許可**を求めるプロンプトを表示します。 読み取り専用のAppleScriptでも、この許可が必要です。

## CI / 検証

| 確認 | 何 |
|-------|------|
| **A. Security** | [`SECURITY.md`](./SECURITY.md)、[`docs/threat-model.md`](./docs/threat-model.md)、機密情報は含まれていません、テレメトリー機能はありません、ネットワーク接続もありません。 |
| **B. Errors** | `CreatorStudioError { code, message, hint }`、CLIのエラーコード、生のスタックトレースは表示されません。 |
| **C. Docs** | このREADME、[`CHANGELOG.md`](./CHANGELOG.md)、[`LICENSE`](./LICENSE)、`--help` の内容は正確です。 |
| **D. Hygiene** | `npm test`、`npm run typecheck`、バージョンはタグと一致、`npm audit`、クリーンなパッケージング。 |

CIは`ubuntu-latest`上で実行されます（型チェック + ビルド + ユニットテスト + 監査）。 実際のアプリケーションに対する統合テストは、`npm run smoke:ci` を使用して実行されます。 macOS環境は、意図的にCIには含まれていません（コスト：macOSは約Linuxの10倍）。

## ロードマップ

- **v1.7.x** — 複数のアプリケーションを組み合わせたプロトコル (`brand-deck-minimal`): Pixelmatorのブランドカード + Motionのローワーサード + Compressorによるエンコード → ProRes MOV — **v1.7.10でリリース**
- **v1.8.x** — `patchSiblingText` のテキスト範囲検証: 入力テキストが固定されたMotionテンプレートのレンダリング範囲からはみ出す可能性がある場合、警告を表示します。
- **v2.0** — フェーズ3: プロトコルの機能拡張（Steamのトレーラー、開発ログ、ソーシャルカードのパイプライン）

アプリケーションのロードマップ: [`docs/roadmap-fcp.md`](./docs/roadmap-fcp.md)、[`docs/roadmap-compressor.md`](./docs/roadmap-compressor.md)、[`docs/roadmap.md`](./docs/roadmap.md)。

## ライセンス

MIT — [LICENSE](./LICENSE) を参照してください。

---

<p align="center">Built by <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a></p>
