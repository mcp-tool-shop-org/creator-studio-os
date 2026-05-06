<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.md">English</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/compressor

> 用于 Creator Studio OS 的压缩工具，支持无界面编码、批量任务、实时进度流以及守护进程恢复。

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-95%25-brightgreen.svg" alt="Coverage 95%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

它是 Apple Creator Studio 应用的 MCP 控制平面的一部分。

---

## 安装

```bash
npm install @creator-studio-os/compressor
```

需要 Compressor（Apple Creator Studio 的一部分）以及 macOS 13 或更高版本。

## 此软件包的功能

通过其命令行界面（CLI）控制 Apple Compressor（使用 `-jobpath` 和 `-monitor` 参数），无需 GUI 脚本。可以提交编码任务、实时流式传输进度、检查 `.compressorsetting` 文件，并在守护进程崩溃时进行恢复。

## 工具（15个）

| 工具 | 描述 |
|------|-------------|
| `compressor_app_open` | 打开 Compressor（幂等操作；首次运行会激活购买授权）。 |
| `compressor_app_running` | 检查 Compressor 是否正在运行。 |
| `compressor_encode` | 通过 CLI 将单个编码任务提交到 Compressor 的队列。 |
| `compressor_encode_project` | 用于 csos 项目范围工作流的编码任务包装器。 |
| `compressor_status` | 对单个任务或批处理进行一次状态检查（percentComplete、timeRemaining 等）。 |
| `compressor_monitor_stream` | 通过 `-monitor -format json` 实时流式传输编码进度；会周期性地输出 StatusFrames。 |
| `compressor_pause` | 暂停一个任务或批处理。 |
| `compressor_resume` | 恢复一个已暂停的任务或批处理。 |
| `compressor_kill` | 取消一个任务或批处理。 |
| `compressor_wait_for` | 持续轮询，直到任务达到终端状态（完成/失败/已取消）。 |
| `compressor_settings_list` | 列出可用的编码设置，并显示可用性标志。 |
| `compressor_settings_inspect` | 解析 `.compressorsetting` 文件，包括编解码器、码率、尺寸和 HDR 元数据。 |
| `compressor_settings_resolve` | 通过显示名称反向查找 `.compressorsetting` 文件的路径。 |
| `compressor_locations_list` | 列出可用的 Compressor 输出位置。 |
| `compressor_codec_availability` | 报告此主机上可用的编解码器。 |

## 示例

```typescript
import { registerCompressorTools } from "@creator-studio-os/compressor";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "csos", version: "2.0.0" });
registerCompressorTools(server);
```

提交编码任务并实时流式传输进度：

```json
// Tool: compressor_encode
{
  "inputPath": "/projects/csos-showcase/out/timeline.mov",
  "settingName": "Apple ProRes 422",
  "outputPath": "/projects/csos-showcase/out/final.mov"
}

// Tool: compressor_monitor_stream
{ "jobId": "<returned jobId>" }
```

## 恢复

```typescript
import { recovery } from "@creator-studio-os/compressor";

// recovery.app === "compressor"
// recovery.recover() restarts the Compressor daemon if it hangs
```

`recovery` 配置文件与 `@creator-studio-os/core` 中的 `withDaemonRecovery` 集成，可在守护进程发生故障时自动重启。

## macOS 需求

`@creator-studio-os/compressor` 仅适用于 macOS (`package.json` 中 `"os": ["darwin"]`)。Compressor CLI 路径在运行时从已安装的应用程序包中解析。

---

[主 README](../../README.md) · [更新日志](../../CHANGELOG.md) · [安全信息](../../SECURITY.md)
