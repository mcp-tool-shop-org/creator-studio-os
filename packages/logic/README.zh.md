<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.md">English</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/logic

> Logic Pro 工具，用于 Creator Studio OS，提供生命周期管理和 `.logicx` 项目文件的打开功能。

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-100%25-brightgreen.svg" alt="Coverage 100%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

它是 Apple Creator Studio 应用的 MCP 控制平面的一部分，详见 [Creator Studio OS](../../README.md)。

---

## 安装

```bash
npm install @creator-studio-os/logic
```

需要 Logic Pro (Creator Studio) 和 macOS 13 或更高版本。

## 此软件包的功能

Logic Pro **没有提供 AppleScript 接口**，因此没有 sdef 字典。 `@creator-studio-os/logic` 实现了以下功能：启动 Logic，检查其是否正在运行，以及通过 `open -b com.apple.logic10` 打开 `.logicx` 项目文件。 在 Logic 的图形界面中，用户可以进行进一步的自动化操作。

## 工具 (3)

| 工具 | 描述 |
|------|-------------|
| `logic_app_open` | 启动 Logic Pro（如果已运行，则不执行任何操作） |
| `logic_app_running` | 检查 Logic Pro 是否正在运行 |
| `logic_open` | 打开一个 `.logicx` 项目文件，Logic 将启动并打开该文件 |

## 示例

```typescript
import { registerLogicTools } from "@creator-studio-os/logic";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "csos", version: "2.0.0" });
registerLogicTools(server);
```

打开一个 Logic 项目：

```json
// Tool: logic_open
{ "path": "/projects/csos-showcase/audio/session.logicx" }
```

## 恢复配置

```typescript
import { recovery } from "@creator-studio-os/logic";
// recovery.app === "logic"
// recovery.badStatePattern === null  (no bad-state detection for Logic)
```

## macOS 需求

`@creator-studio-os/logic` 仅适用于 macOS (`"os": ["darwin"]`)。 需要 Logic Pro，它包含在 Apple Creator Studio 订阅中。

---

[主 README](../../README.md) · [更新日志](../../CHANGELOG.md) · [安全信息](../../SECURITY.md)
