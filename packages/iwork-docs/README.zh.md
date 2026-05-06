<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.md">English</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/iwork-docs

> Pages 和 Numbers 工具，用于 Creator Studio OS — 文档和电子表格的生命周期管理，支持多种格式导出（PDF、Word、EPUB、Excel、CSV）。

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-100%25-brightgreen.svg" alt="Coverage 100%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

它是 Apple Creator Studio 应用的 MCP 控制平面的一部分，位于 [Creator Studio OS](../../README.md)。

---

## 安装

```bash
npm install @creator-studio-os/iwork-docs
```

需要 Pages 和/或 Numbers（Apple iWork 的一部分，可在 Mac App Store 免费获取），以及 macOS 13 或更高版本。

## 此软件包的功能

通过 AppleScript 驱动 Apple Pages 和 Numbers，可以在不直接操作图形界面（GUI）的情况下，打开、关闭和导出多种格式的文档。

## 工具 (10)

### Pages (5)

| 工具 | 描述 |
|------|-------------|
| `pages_app_open` | 激活 Pages |
| `pages_app_running` | 检查 Pages 是否正在运行 |
| `pages_open` | 打开 Pages 文档；返回文档名称 |
| `pages_close` | 关闭 Pages 文档（可选择保存） |
| `pages_export` | 导出为 PDF、Word、RTF、纯文本或 EPUB |

### Numbers (5)

| 工具 | 描述 |
|------|-------------|
| `numbers_app_open` | 激活 Numbers |
| `numbers_app_running` | 检查 Numbers 是否正在运行 |
| `numbers_open` | 打开 Numbers 文档；返回文档名称 |
| `numbers_close` | 关闭 Numbers 文档（可选择保存） |
| `numbers_export` | 导出为 PDF、Microsoft Excel 或 CSV |

## 示例

```typescript
import { registerPagesTools, registerNumbersTools } from "@creator-studio-os/iwork-docs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "csos", version: "2.0.0" });
registerPagesTools(server);
registerNumbersTools(server);
```

将 Pages 文档导出为 Word 格式：

```json
// Tool: pages_export
{
  "documentName": "Creative Brief.pages",
  "outputPath": "/projects/brief.docx",
  "format": "Word"
}
```

将 Numbers 电子表格导出为 CSV 格式：

```json
// Tool: numbers_export
{
  "documentName": "Production Log.numbers",
  "outputPath": "/projects/log.csv",
  "format": "CSV"
}
```

## 恢复配置文件

```typescript
import { pagesRecovery, numbersRecovery } from "@creator-studio-os/iwork-docs";

// pagesRecovery.app   === "pages"
// numbersRecovery.app === "numbers"
```

## macOS 需求

`@creator-studio-os/iwork-docs` 仅适用于 macOS (`"os": ["darwin"]`)。首次运行需要安装 Pages 和 Numbers，并授予其辅助功能/自动化权限。

---

[主 README](../../README.md) · [更新日志](../../CHANGELOG.md) · [安全说明](../../SECURITY.md)
