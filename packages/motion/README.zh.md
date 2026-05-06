<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.md">English</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/motion

> Creator Studio OS 的运动工具，包括 OZML 模板修改、无界面渲染以及模板目录。

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-92%25-brightgreen.svg" alt="Coverage 92%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

它是 Apple Creator Studio 应用的 MCP 控制平面的一部分，详见 [Creator Studio OS](../../README.md)。

---

## 安装

```bash
npm install @creator-studio-os/motion
```

需要 Motion (Creator Studio) 和 macOS 13 或更高版本。 无界面渲染需要 Compressor。

## 此软件包的功能

Motion **不提供 AppleScript 接口**。 `@creator-studio-os/motion` 在文件格式级别工作，它直接读取和修改 Motion 的 OZML 模板格式 (`.motn` / `.moti`)，而无需启动 Motion：

- **模板检查** — 解析 OZML，列出所有已发布的参数。
- **参数修改** — 原子地设置任何参数的值（文本、颜色、数字）。
- **文本编辑** — 替换可见的文本内容，包括字形列表和样式。
- **结构验证** — 在进行任何写入操作之前，会进行 31 项 OZML 结构性验证。
- **无界面渲染** — 通过 `-jobpath` 将 `.motn` 模板提交给 Compressor 进行渲染，无需图形界面。
- **FCP 发布** — 切换任何参数上的“发布到 FCP”标记。

> **重要提示：** 永远不要修改捆绑的 Apple 模板。 始终先使用 `motion_template_clone` 进行克隆。

## 工具 (10)

| 工具 | 描述 |
|------|-------------|
| `motion_app_open` | 打开 Motion（仅用于文件打开，不提供 AppleScript 接口） |
| `motion_app_running` | 检查 Motion 是否正在运行 |
| `motion_open` | 在 Motion 中打开 `.motn` 模板或项目 |
| `motion_template_inspect` | 解析模板，并返回其 OZML 摘要和参数列表 |
| `motion_template_set_param` | 修改 Motion 模板中单个参数的值 |
| `motion_template_edit_text` | 编辑可见的文本内容（CDATA + 字形列表 + 样式） |
| `motion_template_validate` | 根据 31 项 OZML 结构性规范进行验证 |
| `motion_template_clone` | 在修改之前，将模板复制到新路径 |
| `motion_render_via_compressor` | 通过 Compressor 的 `-jobpath` 进行无界面渲染 `.motn` 模板 |
| `motion_publish_to_fcp` | 切换模板参数上的“发布到 FCP”标记 |

## 示例

克隆一个捆绑的模板，设置一个文本参数，进行验证，然后进行无界面渲染：

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

## 与 `@creator-studio-os/fcp` 配合使用

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

## 恢复配置文件

```typescript
import { recovery } from "@creator-studio-os/motion";
// recovery.app === "motion"
```

## macOS 需求

`@creator-studio-os/motion` 仅适用于 macOS (`"os": ["darwin"]`)。 模板检查和修改不需要正在运行的应用程序。 无界面渲染需要 Creator Studio 订阅中的 Compressor。

---

[主 README](../../README.md) · [更新日志](../../CHANGELOG.md) · [安全信息](../../SECURITY.md)
