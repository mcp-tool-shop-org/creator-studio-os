<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.md">English</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/protocols

> 用于 Creator Studio OS 的跨应用编排协议，包括 brand-deck-minimal 和 steam-trailer-minimal 流水线。

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-85%25-brightgreen.svg" alt="Coverage 85%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

它是 [Creator Studio OS](../../README.md) MCP 控制平面的一部分，用于 Apple Creator Studio 应用。

---

## 安装

```bash
npm install @creator-studio-os/protocols
```

需要所有八个 Creator Studio 应用以及 macOS 13 或更高版本。

## 此包的作用

`@creator-studio-os/protocols` 编排完整的跨应用流水线：Pixelmator 品牌卡片 → Motion 片头渲染 → FCPXML 构建 → FCP 导入 → Compressor 编码，整个过程可暂停并恢复。

这些协议是**分步生成器**：每个步骤都是幂等的，并且可以使用 `--resume <taskId>` 从任何已完成的步骤恢复运行。

## 工具 (3)

| 工具 | 描述 |
|------|-------------|
| `csos_protocol_run` | 对 `ProjectV2` 项目的 project.json 文件运行完整的跨应用协议。立即返回一个 `taskId`；轮询以获取状态和最终步骤摘要。支持 `--resume <taskId>` 以跳过已完成的步骤。 |
| `csos_protocol_list` | 列出所有已注册的协议，包括名称、描述和步骤数。 |
| `csos_protocol_describe` | 描述单个协议，包括其目的、步骤名称和使用说明。 |

## 协议

### `brand-deck-minimal` (13 步)

这是主要的跨应用流水线。它需要一个包含场景定义的 `ProjectV2` 项目的 project.json 文件：

1. 验证输入和项目结构。
2. 根据场景生成 Pixelmator 品牌卡片（使用 `{{HEADLINE}}` 和 `{{SUBHEAD}}` 令牌）。
3. *(可选)* 通过 Compressor 在无界面模式下渲染每个场景的 Motion 片头叠加。
4. 从场景列表中构建 FCPXML 1.14 时间线。
5. 验证 FCPXML 是否符合捆绑的 DTD。
6. 将 FCPXML 写入 `<project>/fcp/` 目录。
7. 导入到 Final Cut Pro。
8. 将主编码任务提交给 Compressor。
9. 将社交媒体编码任务提交给 Compressor。
10. 直到达到终端状态，持续监控编码进度。
11. 验证输出文件是否存在。
12. 写入日志条目。
13. 返回最终步骤摘要。

### `steam-trailer-minimal`

`brand-deck-minimal` 的别名（v1.7.7+）。步骤顺序相同。

## 示例

```typescript
import { registerProtocolTools } from "@creator-studio-os/protocols";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "csos", version: "2.0.0" });
registerProtocolTools(server);
```

运行完整的流水线：

```json
// Tool: csos_protocol_run
{
  "protocol": "brand-deck-minimal",
  "projectPath": "/projects/csos-showcase/project.json"
}
// → { "taskId": "task_abc123", "status": "running" }

// Poll for completion:
// Tool: csos_protocol_describe — for step names
// Tool: csos_protocol_run with --resume <taskId> — to resume after interruption
```

## 可恢复性

每个步骤都会将输出记录到项目日志中。如果运行被中断（Compressor 崩溃、FCP 导入卡住），可以从上一个已完成的步骤恢复：

```json
// Tool: csos_protocol_run
{
  "protocol": "brand-deck-minimal",
  "projectPath": "/projects/csos-showcase/project.json",
  "resume": "task_abc123"
}
```

## 编程用法

```typescript
import { runProtocol, listProtocols, STEP_NAMES } from "@creator-studio-os/protocols";

for await (const step of runProtocol({ protocol: "brand-deck-minimal", projectPath: "..." })) {
  console.log(step.name, step.status);
}
```

## macOS 要求

`@creator-studio-os/protocols` 仅适用于 macOS (`"os": ["darwin"]`)。必须安装所有八个 Creator Studio 应用，并授予其自动化权限。

---

[主 README](../../README.md) · [更新日志](../../CHANGELOG.md) · [安全信息](../../SECURITY.md)
