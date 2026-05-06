<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.md">English</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/core

> Creator Studio OS 的共享运行时环境，包括 AppleScript 运行器、项目结构、日志记录、错误类型以及 iWork 共享自动化功能。

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-89%25-brightgreen.svg" alt="Coverage 89%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

它是 [Creator Studio OS](../../README.md) MCP 控制平面的一部分，用于 Apple Creator Studio 应用程序。

---

## 安装

```bash
npm install @creator-studio-os/core
```

## 此包的作用

`@creator-studio-os/core` 是所有其他 `@creator-studio-os/*` 包共享的运行时基础。它提供以下功能：

- **AppleScript 运行器** — `runAppleScript`, `runApp`, `awaitOutput`, `openApp`, `withDaemonRecovery`
- **项目结构** — `ProjectV2` Zod 模式、解析器以及类型化路径映射
- **错误系统** — `CreatorStudioError`，具有结构化的 `{ code, message, hint }` 格式
- **配置** — `loadConfig()` 函数读取 `CREATOR_STUDIO_DATA_DIR` 以及所有应用程序的 Bundle ID
- **日志记录** — 结构化的编码/项目历史记录，存储在 `<dataDir>/.csos/ledger.jsonl` 文件中
- **iWork 共享** — `openDocumentInApp`, `closeDocumentInApp`, `exportDocumentInApp`, `activateApp`, `isAppRunning`

## 工具 (1)

| 工具 | 描述 |
|------|-------------|
| `csos_app_status` | 检查是否有 Creator Studio 应用程序正在运行且状态良好。 传递 `app="all"` 以一次性查询所有 8 个应用程序。 |

## 示例

```typescript
import {
  runAppleScript,
  CreatorStudioError,
  loadConfig,
  registerStatusTool,
} from "@creator-studio-os/core";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "csos", version: "2.0.0" });
registerStatusTool(server);

// Escape user input before interpolation — always
const name = escapeAppleScriptString(userInput);
const result = await runAppleScript(`tell app "Keynote" to get name of document "${name}"`);
```

## 错误处理

所有运行时错误都是 `CreatorStudioError` 类型：

```typescript
import { CreatorStudioError } from "@creator-studio-os/core";

try {
  await runAppleScript(`...`);
} catch (err) {
  if (err instanceof CreatorStudioError) {
    console.error(err.code);   // "E_OSASCRIPT_FAILED", "E_AUTOMATION_DENIED", …
    console.error(err.hint);   // actionable suggestion
  }
}
```

## macOS 需求

`@creator-studio-os/core` 仅适用于 macOS (`"os": ["darwin"]`)。 AppleScript 运行器调用 `osascript`；`openApp` 使用 `open -b <bundleId>` 命令。

---

[主 README](../../README.md) · [更新日志](../../CHANGELOG.md) · [安全说明](../../SECURITY.md)
