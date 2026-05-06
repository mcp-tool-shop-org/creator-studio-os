<p align="center">
  <a href="README.md">English</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/motion

> Creator Studio OS向けのモーションツール。OZMLテンプレートの変更、ヘッドレスコンプレッサーによるレンダリング、テンプレートカタログを提供します。

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-92%25-brightgreen.svg" alt="Coverage 92%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

Apple Creator Studioアプリ向けの[Creator Studio OS](../../README.md) MCPコントロールプレーンの一部です。

---

## インストール

```bash
npm install @creator-studio-os/motion
```

Motion (Creator Studio) と macOS 13.0 以降が必要です。ヘッドレスレンダリングにはCompressorが必要です。

## このパッケージの機能

Motionは**AppleScriptインターフェースを提供しません**。`@creator-studio-os/motion`はファイル形式レベルで動作し、MotionのOZMLテンプレート形式（`.motn` / `.moti`）を直接読み込み、変更します。Motionアプリケーションを起動する必要はありません。

- **テンプレートの検査**: OZMLを解析し、公開されているすべてのパラメータをリスト表示します。
- **パラメータの変更**: 任意のパラメータの値をアトミックに設定します（テキスト、色、数値）。
- **テキストの編集**: 表示されているテキストコンテンツ（グリフリストとスタイルを含む）を置換します。
- **構造の検証**: 記述を行う前に、31個のOZMLの不変条件を検証します。
- **ヘッドレスレンダリング**: `.motn`テンプレートを`-jobpath`オプションを介してCompressorに送信します。GUIは不要です。
- **FCPへの公開**: 任意のパラメータの「FCPへ公開」フラグを切り替えます。

> **重要**: バンドルされているAppleのテンプレートを変更しないでください。必ず最初に`motion_template_clone`を使用してコピーを作成してください。

## ツール (10)

| ツール | 説明 |
|------|-------------|
| `motion_app_open` | Motionを開く（ファイルを開くのみ。AppleScriptインターフェースはありません） |
| `motion_app_running` | Motionが実行中かどうかを確認します。 |
| `motion_open` | Motionで`.motn`テンプレートまたはプロジェクトを開きます。 |
| `motion_template_inspect` | テンプレートを解析し、OZMLの概要とパラメータリストを返します。 |
| `motion_template_set_param` | Motionテンプレート内の単一のパラメータ値を変更します。 |
| `motion_template_edit_text` | 表示されているテキストコンテンツ（CDATA、グリフリスト、スタイル）を編集します。 |
| `motion_template_validate` | 31個のOZMLの構造的不変条件に対する検証を行います。 |
| `motion_template_clone` | 変更を行う前に、テンプレートを新しいパスにコピーします。 |
| `motion_render_via_compressor` | Compressorの`-jobpath`オプションを使用して、`.motn`テンプレートをヘッドレスでレンダリングします。 |
| `motion_publish_to_fcp` | テンプレートパラメータの「FCPへ公開」フラグを切り替えます。 |

## 例

バンドルされているテンプレートをコピーし、テキストパラメータを設定し、検証し、ヘッドレスでレンダリングします。

```json
// Tool: motion_template_clone
{
  "sourcePath": "/Applications/Motion Creator Studio.app/Contents/Resources/Templates.localized/Compositions.localized/Atmospheric.localized/Atmospheric-Lower Third.localized/Atmospheric-Lower Third.motn",
  "destPath": "/projects/csos-showcase/motion/lower-third.motn"
}

// Tool: motion_template_edit_text
{
  "templatePath": "/projects/csos-showcase/motion/lower-third.motn",
  "paramId": "Text.0",
  "newText": "Creator Studio OS"
}

// Tool: motion_template_validate
{ "templatePath": "/projects/csos-showcase/motion/lower-third.motn" }

// Tool: motion_render_via_compressor
{
  "templatePath": "/projects/csos-showcase/motion/lower-third.motn",
  "outputPath": "/projects/csos-showcase/out/lower-third.mov",
  "settingName": "Apple ProRes 4444"
}
```

## `@creator-studio-os/fcp`と連携します

```json
// Tool: fcp_bind_motion_param — discover parameters for FCP binding
{ "templatePath": "/projects/csos-showcase/motion/lower-third.motn" }

// Tool: motion_publish_to_fcp — expose a parameter in FCP's inspector
{
  "templatePath": "/projects/csos-showcase/motion/lower-third.motn",
  "paramId": "Text.0",
  "publish": true
}
```

## 復旧プロファイル

```typescript
import { recovery } from "@creator-studio-os/motion";
// recovery.app === "motion"
```

## macOSの要件

`@creator-studio-os/motion`はmacOS専用です（`"os": ["darwin"]`）。テンプレートの検査と変更には、実行中のアプリケーションは不要です。ヘッドレスレンダリングには、Creator Studioのサブスクリプションに含まれるCompressorが必要です。

---

[メインREADME](../../README.md) · [変更履歴](../../CHANGELOG.md) · [セキュリティ](../../SECURITY.md)
