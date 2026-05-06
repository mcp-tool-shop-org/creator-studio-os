<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.md">English</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/fcp

> 针对 Creator Studio OS 的 Final Cut Pro 工具，包括 FCPXML 1.14 文档生成、DTD 验证、Final Cut Pro 导入以及 AppleScript 库检查功能。

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-97%25-brightgreen.svg" alt="Coverage 97%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

它是 [Creator Studio OS](../../README.md) MCP 控制平面的一部分，用于 Apple Creator Studio 应用程序。

---

## 安装

```bash
npm install @creator-studio-os/fcp
```

需要 Final Cut Pro（Creator Studio 版本或独立版本）以及 macOS 13 或更高版本。

## 此软件包的功能

Final Cut Pro 的 AppleScript 接口是**只读**的，您可以检查库和元数据，但不能通过 AppleScript 创建时间线。支持的文档生成方式是 FCPXML 导入。

`@creator-studio-os/fcp` 是一个桥梁：它允许您将时间线作为 JSON 规范进行定义，构建和验证 FCPXML 1.14（或 1.13），将其写入磁盘，并触发 Final Cut Pro 导入，所有这些都可以在一个调用中完成。

## 工具 (22)

| 工具 | 描述 |
|------|-------------|
| `fcp_project_list` | 列出数据目录中的项目 |
| `fcp_project_create` | 创建具有标准子目录结构的工程目录 |
| `fcp_project_info` | 读取工程元数据和解析后的路径 |
| `fcp_fcpxml_build` | 根据 JSON 规范生成时间线，包括片段、标题、转场和音频 |
| `fcp_fcpxml_validate` | 使用 `xmllint` 对 FCPXML 进行验证，与内置的 DTD 进行比较 |
| `fcp_fcpxml_write` | 将 FCPXML 文档写入工程的 `fcp/` 目录 |
| `fcp_fcpxml_import` | 在 Final Cut Pro 中打开 FCPXML 文件 |
| `fcp_fcpxml_build_write_import` | 在一个调用中完成构建、验证、写入和导入 |
| `fcp_library_list` | 列出在 Final Cut Pro 中打开的库 |
| `fcp_library_events` | 列出打开的库中的事件 |
| `fcp_event_projects` | 列出事件中的项目 |
| `fcp_project_metadata` | 读取序列元数据（持续时间、帧速率、时间码格式） |
| `fcp_safety_compound` | 检查是否存在导致隐式复合片段的主片段重叠 |
| `fcp_safety_captions` | 检查字幕角色分配是否符合 Final Cut Pro 的要求 |
| `fcp_safety_anchors` | 检测不同轨道之间的标题锚点冲突 |
| `fcp_app_open` | 打开 Final Cut Pro |
| `fcp_app_activate` | 将 Final Cut Pro 窗口置于前台 |
| `fcp_app_running` | 检查 Final Cut Pro 是否正在运行 |
| `fcp_bind_motion_param` | 从 Motion 模板中读取已发布的参数 |
| `fcp_effects_catalog` | 遍历 Motion 模板目录，并返回所有效果的目录 |
| `fcp_round_trip_diff` | 比较两个 FCPXML 文档，检测 Final Cut Pro 已知的 12 种往返转换 |
| `fcp_round_trip_capture` | 从 Final Cut Pro 库包中提取 FCPXML |

## 示例

在一个调用中构建和导入时间线：

```json
// Tool: fcp_fcpxml_build_write_import
{
  "projectName": "csos-showcase",
  "spec": {
    "format": { "frameDuration": "1001/30000s", "width": 1920, "height": 1080 },
    "primaryClips": [
      { "asset": "hook.mov", "offset": "0s", "duration": "5s" },
      { "asset": "fcp-demo.mov", "offset": "5s", "duration": "6s" }
    ],
    "titles": [
      { "lane": 1, "offset": "0s", "duration": "3s", "text": "Creator Studio OS" }
    ]
  }
}
```

## FCPXML 构建器

```typescript
import { buildFCPXML, validateFCPXML } from "@creator-studio-os/fcp";

const xml = buildFCPXML(spec);           // returns FCPXML string
const { valid, output } = validateFCPXML(xml);  // runs xmllint against bundled DTD
```

## macOS 要求

`@creator-studio-os/fcp` 仅适用于 macOS (`"os": ["darwin"]`)。 DTD 验证使用 Xcode Command Line Tools 中的 `xmllint`。 内置的 DTD 是 Final Cut Pro 应用程序包中的 `FCPXMLv1_14.dtd`。

---

[主 README](../../README.md) · [更新日志](../../CHANGELOG.md) · [FCPXML 参考](../../docs/reference/fcpxml.md)
