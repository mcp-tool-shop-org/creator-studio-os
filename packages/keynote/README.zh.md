<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.md">English</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/keynote

> Keynote 工具，专为 Creator Studio OS 设计 — 56 个工具，用于幻灯片自动化、Markdown 导入、将故事板导出为 FCPXML 格式，以及支持多种格式的导出。

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-99%25-brightgreen.svg" alt="Coverage 99%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

它是 [Creator Studio OS](../../README.md) MCP 控制平面的一部分，用于 Apple Creator Studio 应用程序。

---

## 安装

```bash
npm install @creator-studio-os/keynote
```

需要 Keynote（Creator Studio 版本或独立版本）以及 macOS 13 或更高版本。

## 此软件包的功能

这是任何 Apple 应用程序中 AppleScript 接口最丰富的工具之一 — Keynote 提供了丰富的 sdef 字典，用于创建、编辑和导出幻灯片。 `@creator-studio-os/keynote` 包含了完整的接口：56 个工具，涵盖幻灯片生命周期、文本、表格、图表、图像、过渡效果、机器学习效果、导出功能，以及两个流水线接口（Markdown 导入 + FCPXML 故事板导出）。

## 工具 (56 个)

### 应用程序生命周期

| 工具 | 描述 |
|------|-------------|
| `keynote_app_open` | 激活 Keynote |
| `keynote_app_running` | 检查 Keynote 是否正在运行 |

### 文档生命周期

| 工具 | 描述 |
|------|-------------|
| `keynote_open` | 打开一个 `.key` 文件；返回其名称（所有其他工具都使用此名称） |
| `keynote_close` | 关闭一个文档（可以选择保存） |
| `keynote_save` | 保存一个文档，可以选择保存到不同的路径 |
| `keynote_list_presentations` | 列出所有打开的文档 |
| `keynote_create_presentation` | 创建新的空白演示文稿 |
| `keynote_set_doc_size` | 设置幻灯片尺寸（例如，1920×1080 用于 16:9 比例） |
| `keynote_set_kiosk_mode` | 配置用于信息亭显示器的自动播放、自动循环和空闲超时 |

### 主题和母版

| 工具 | 描述 |
|------|-------------|
| `keynote_list_themes` | 列出所有可用主题 |
| `keynote_apply_theme` | 将主题应用于文档 |
| `keynote_list_masters` | 列出当前主题中的幻灯片母版布局 |
| `keynote_set_slide_master` | 设置幻灯片的母版布局 |

### 幻灯片管理

| 工具 | 描述 |
|------|-------------|
| `keynote_list_slides` | 列出所有幻灯片，包括索引、标题和跳过状态 |
| `keynote_get_slide` | 读取幻灯片的标题、正文、备注和过渡效果 |
| `keynote_make_slide` | 添加新的幻灯片 |
| `keynote_delete_slide` | 删除幻灯片 |
| `keynote_duplicate_slide` | 复制幻灯片 |
| `keynote_reorder_slide` | 将幻灯片移动到不同的位置 |
| `keynote_skip_slide` | 将幻灯片标记为已跳过或取消跳过 |

### 文本和内容

| 工具 | 描述 |
|------|-------------|
| `keynote_set_title` | 设置幻灯片的标题文本 |
| `keynote_set_body` | 设置幻灯片的正文文本 |
| `keynote_set_text_style` | 设置任何幻灯片元素的文本样式（字体、大小、颜色） |
| `keynote_get_presenter_notes` | 从幻灯片读取演讲者备注 |
| `keynote_set_presenter_notes` | 设置幻灯片的演讲者备注 |
| `keynote_extract_all_notes` | 从每个幻灯片提取演讲者备注和标题 |

### 过渡效果

| 工具 | 描述 |
|------|-------------|
| `keynote_set_transition` | 设置幻灯片过渡效果（所有 43 种 sdef 效果 + 计时） |
| `keynote_plan_magic_move` | 准备两个幻灯片以进行 Magic Move 过渡效果 |

### 元素：图像、形状、线条、表格、图表

| 工具 | 描述 |
|------|-------------|
| `keynote_list_items` | 列出幻灯片上的所有 iWork 元素 |
| `keynote_position_item` | 重新定位和/或调整幻灯片元素的大小 |
| `keynote_format_item` | 设置幻灯片元素的透明度、旋转和反射 |
| `keynote_get_item_info` | 读取元素的 position、size、opacity 和 rotation |
| `keynote_insert_image` | 从文件路径插入图像 |
| `keynote_set_voiceover_description` | 设置幻灯片图像的 VoiceOver 可访问性描述 |
| `keynote_insert_shape` | 插入矩形形状 |
| `keynote_insert_line` | 插入线条元素 |
| `keynote_insert_table` | 插入表格 |
| `keynote_read_table` | 将单元格值读取为二维数组 |
| `keynote_write_table` | 从二维数组写入单元格值 |
| `keynote_make_chart` | 添加带有行名、列名和数据的图表 |
| `keynote_make_image_slides` | 批量添加来自文件列表的每个图像一个幻灯片 |

### 机器学习效果（仅限 Creator Studio）

| 工具 | 描述 |
|------|-------------|
| `keynote_clean_up_slide` | 使用 Keynote 内置的布局优化功能清理幻灯片 |
| `keynote_super_resolution` | 使用机器学习超分辨率技术放大幻灯片图像 |
| `keynote_remove_background` | 使用机器学习从幻灯片图像中移除背景 |

### 幻灯片演示

| 工具 | 描述 |
|------|-------------|
| `keynote_start` | 开始演示，可以选择从特定幻灯片开始 |
| `keynote_stop` | 停止正在进行的幻灯片演示 |

### 导出
```

| 工具 | 描述 |
|------|-------------|
| `keynote_export_pdf` | 导出为 PDF |
| `keynote_export_pdf_advanced` | 以讲义布局导出为 PDF，并可设置备注、密码和图像质量选项。 |
| `keynote_export_images` | 将每个幻灯片导出为 PNG / JPEG / TIFF 格式。 |
| `keynote_export_movie` | 导出为 QuickTime 视频。 |
| `keynote_export_movie_advanced` | 导出为视频，可设置编码器（H.264、HEVC、完整的 ProRes 格式）、分辨率和帧率。 |
| `keynote_export_pptx` | 导出为 Microsoft PowerPoint 格式。 |
| `keynote_export_html` | 导出为静态 HTML 网站。 |

### 流水线连接

| 工具 | 描述 |
|------|-------------|
| `keynote_from_markdown` | 从 Markdown 文档构建演示文稿（标题 → 幻灯片）。 |
| `keynote_to_storyboard_fcp` | 将 Keynote 演示文稿转换为 Final Cut Pro 故事板 FCPXML 文件。 |
| `keynote_to_compressor_gif` | 通过 Compressor 将幻灯片演示导出为动画 GIF。 |

## 示例

从 Markdown 构建演示文稿并导出为 PPTX 格式：

```json
// Tool: keynote_from_markdown
{
  "markdownPath": "/projects/brief.md",
  "masterMap": {
    "h1": "Title",
    "h2": "Section Header",
    "bullets": "Bullets"
  }
}

// Tool: keynote_export_pptx
{
  "documentName": "brief.key",
  "outputPath": "/projects/brief.pptx"
}
```

将幻灯片导出为 ProRes 视频：

```json
// Tool: keynote_export_movie_advanced
{
  "documentName": "csos-showcase.key",
  "outputPath": "/projects/csos-showcase/out/slideshow.mov",
  "codec": "ProRes 4444",
  "width": 1920,
  "height": 1080,
  "frameRate": "29.97"
}
```

## 恢复配置文件

```typescript
import { recovery } from "@creator-studio-os/keynote";
// recovery.app === "keynote"
```

## macOS 系统要求

`@creator-studio-os/keynote` 仅适用于 macOS 系统（`"os": ["darwin"]`）。 机器学习工具需要订阅 Creator Studio 版本的 Keynote。 标准工具可以使用来自 Mac App Store 的免费独立 Keynote 版本。

---

[主 README](../../README.md) · [更新日志](../../CHANGELOG.md) · [安全信息](../../SECURITY.md)
