<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.md">English</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="550">
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/creator-studio-os/actions/workflows/ci.yml"><img src="https://github.com/mcp-tool-shop-org/creator-studio-os/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://codecov.io/gh/mcp-tool-shop-org/creator-studio-os"><img src="https://codecov.io/gh/mcp-tool-shop-org/creator-studio-os/branch/main/graph/badge.svg" alt="Coverage"></a>
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

# @creator-studio-os/creator-studio-os

用于 Apple Creator Studio 应用的 MCP 控制平面。通过 Claude 或任何 MCP 客户端驱动 **Final Cut Pro**、**Compressor**、**Motion**、**Pixelmator Pro**、**Logic Pro**、**Keynote**、**Pages** 和 **Numbers**。

这个软件包是 **总的命令行工具**，它将所有 9 个 `@creator-studio-os/*` 软件包打包在一起，并将其暴露为单个 `creator-studio-os serve` 命令。

## 安装

```bash
npm install -g @creator-studio-os/creator-studio-os
```

或者通过 npx (无需安装)：

```bash
npx @creator-studio-os/creator-studio-os serve
```

## MCP 客户端配置

添加到 `claude_desktop_config.json` (或等效文件)：

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

## 包含内容

| 软件包 | 工具 | 驱动的应用 |
|---------|-------|----------------|
| `@creator-studio-os/core` | 1 | 共享运行时、AppleScript 运行器、项目模式 |
| `@creator-studio-os/compressor` | 15 | 无头编码、批量任务、实时进度 |
| `@creator-studio-os/fcp` | 22 | FCPXML 1.14 格式支持、DTD 验证、FCP 导入 |
| `@creator-studio-os/iwork-docs` | 10 | Pages 和 Numbers 文档生命周期 + 导出 |
| `@creator-studio-os/keynote` | 56 | 完整的 Keynote 自动化：幻灯片、机器学习、导出、流水线连接 |
| `@creator-studio-os/logic` | 3 | Logic Pro 启动和 `.logicx` 项目打开 |
| `@creator-studio-os/motion` | 10 | OZML 模板修改、无头渲染 |
| `@creator-studio-os/pixelmator` | 33 | 图层编辑、机器学习效果、品牌卡合成器 |
| `@creator-studio-os/protocols` | 3 | 跨应用流水线 |

**总计：9 个软件包，共 153 个工具。**

## 跨应用流水线

最典型的用例：`csos_protocol_run` 命令可以一次性驱动所有 8 个应用：

1. Pixelmator Pro 为每个场景生成品牌卡。
2. Motion 通过 Compressor 进行无头渲染，生成片头动画。
3. 构建 FCPXML 1.14 时间线，并导入到 Final Cut Pro 中。
4. Compressor 编码最终输出文件（ProRes 主文件 + H.264 社交媒体文件）。

## 命令行工具

```bash
creator-studio-os serve          # start MCP server
creator-studio-os verify         # verify xmllint + DTD round-trip
creator-studio-os smoke          # run 9-phase smoke test against live apps
creator-studio-os smoke --dry-run  # smoke test without live app calls
```

## 单独使用软件包

每个应用软件包都单独发布。仅安装您需要的软件包：

```bash
npm install @creator-studio-os/fcp       # Final Cut Pro only
npm install @creator-studio-os/keynote   # Keynote only
npm install @creator-studio-os/pixelmator  # Pixelmator Pro only
```

## 安全性

完全在本地设备上运行，不进行任何网络调用，不收集任何遥测数据，也不存储任何凭据。完整的安全威胁模型请参见 [SECURITY.md](SECURITY.md) 和 [`docs/threat-model.md`](https://github.com/mcp-tool-shop-org/creator-studio-os/blob/main/docs/threat-model.md)。

## macOS 系统要求

macOS 13+ 以及 Apple Creator Studio 订阅（或从 Mac App Store 购买单个应用，如果可用）。请参阅每个软件包的 README 文件，了解每个应用的具体要求。

---

[完整文档](https://github.com/mcp-tool-shop-org/creator-studio-os) · [更新日志](CHANGELOG.md) · [安全](SECURITY.md)
