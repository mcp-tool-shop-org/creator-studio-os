<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.md">English</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/pixelmator

> Pixelmator Pro 工具，适用于 Creator Studio OS，包括图层编辑、机器学习效果、品牌卡片合成以及多格式导出。

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
npm install @creator-studio-os/pixelmator
```

需要 Pixelmator Pro（Creator Studio 版本或独立版本）以及 macOS 13 或更高版本。

## 此包的功能

`@creator-studio-os/pixelmator` 通过 AppleScript 接口驱动 Pixelmator Pro，该接口提供了 macOS 上最强大的机器学习增强图像编辑 API。它包含 33 个工具，涵盖了整个文档生命周期、图层堆栈操作、机器学习算法、颜色调整、效果以及多尺寸品牌卡片合成。

## 工具 (33)

### 应用程序和文档生命周期

| 工具 | 描述 |
|------|-------------|
| `pixelmator_app_open` | 激活 Pixelmator Pro |
| `pixelmator_app_running` | 检查 Pixelmator Pro 是否正在运行 |
| `pixelmator_open` | 打开一个文档；返回文档名称（所有其他工具都使用此名称） |
| `pixelmator_close` | 关闭一个文档（不保存） |
| `pixelmator_export` | 导出为 PNG、JPEG、TIFF、PSD、WebP、HEIC、AVIF |
| `pixelmator_export_hdr` | 导出为 HDR JPEG、HDR HEIC、HDR AVIF 或 HDR PNG |
| `pixelmator_export_video` | 导出视频图层为 MP4 或 QuickTime 格式 |
| `pixelmator_export_animated` | 导出为动画 GIF 或动画 PNG |
| `pixelmator_export_for_web` | Web 优化 PNG、JPEG、WebP、GIF 或 SVG |
| `pixelmator_batch_export_project_images` | 批量导出项目 `images/` 目录中的所有图像 |
| `pixelmator_batch_export_project_images_dryrun` | 模拟运行：列出批量导出将处理的内容 |

### 文档变换

| 工具 | 描述 |
|------|-------------|
| `pixelmator_resize` | 更改文档的尺寸和/或分辨率 |
| `pixelmator_crop` | 裁剪到边界 `{x, y, width, height}` |
| `pixelmator_rotate` | 旋转 180 度，顺时针旋转 90 度，或逆时针旋转 90 度 |
| `pixelmator_flip` | 水平或垂直翻转 |

### 图层堆栈

| 工具 | 描述 |
|------|-------------|
| `pixelmator_make_layer` | 添加图像、文本或形状图层 |
| `pixelmator_set_layer_properties` | 更改可见性、不透明度、混合模式、位置或大小 |
| `pixelmator_layer_order` | 重新排列图层（置于最前/最后/前面/后面） |
| `pixelmator_group_layers` | 将图层移动到新的组中 |
| `pixelmator_ungroup` | 取消分组 |
| `pixelmator_set_layer_text` | 编辑文本图层上的文本内容和样式 |
| `pixelmator_make_shape` | 创建填充的矩形、椭圆、圆角矩形或线条 |
| `pixelmator_set_blend_mode` | 设置合成混合模式（所有 28 个 Pixelmator Pro 模式） |
| `pixelmator_set_layer_shadow` | 添加或编辑阴影 |
| `pixelmator_set_layer_stroke` | 添加或编辑轮廓 |

### 效果和颜色调整

| 工具 | 描述 |
|------|-------------|
| `pixelmator_apply_effect` | 应用 23 种非破坏性效果 |
| `pixelmator_apply_color_adjustment` | 设置 24 种颜色调整属性（包括 LUT 路径、晕影） |

### 机器学习

| 工具 | 描述 |
|------|-------------|
| `pixelmator_apply_ml` | 运行超分辨率、增强、降噪、去噪、色彩匹配、移除背景、选择主体或自动调整 |
| `pixelmator_run_shortcut` | 通过 `shortcuts run` 运行 Pixelmator Shortcuts 操作 |

### 检测和替换

| 工具 | 描述 |
|------|-------------|
| `pixelmator_detect` | 检测人脸或二维码（边界框；二维码包含解码后的数据） |
| `pixelmator_replace_text` | 在所有文本图层中查找和替换文本 |
| `pixelmator_replace_layer` | 从新文件替换图像图层的像素内容 |

### 品牌卡片合成器

| 工具 | 描述 |
|------|-------------|
| `pixelmator_compose_brand_card` | 打开 `.pxd` 模板，替换 `{{HEADLINE}}` / `{{SUBHEAD}}` / `{{LOGO}}` 令牌，并以多种尺寸导出。 |

## 示例

从模板生成三种尺寸的品牌卡片：

```json
// Tool: pixelmator_compose_brand_card
{
  "templatePath": "/projects/csos-showcase/brand/card-template.pxd",
  "brand": {
    "headline": "Creator Studio OS",
    "subhead": "Eight apps. One pipeline.",
    "logoPath": "/projects/csos-showcase/brand/csos-logo.png"
  },
  "sizes": [
    { "width": 1920, "height": 1080, "label": "16x9" },
    { "width": 1080, "height": 1080, "label": "square" },
    { "width": 1080, "height": 1920, "label": "story" }
  ],
  "outputDir": "/projects/csos-showcase/out/brand-cards"
}
```

应用机器学习超分辨率并重新导出：

```json
// Tool: pixelmator_apply_ml
{
  "documentName": "hero.pxd",
  "algorithm": "super_resolution"
}

// Tool: pixelmator_export
{
  "documentName": "hero.pxd",
  "outputPath": "/projects/csos-showcase/out/hero-4k.png",
  "format": "PNG"
}
```

## 恢复配置文件

```typescript
import { recovery } from "@creator-studio-os/pixelmator";
// recovery.app === "pixelmator"
```

## macOS 要求

`@creator-studio-os/pixelmator` 仅适用于 macOS (`"os": ["darwin"]`)。机器学习工具需要来自 Creator Studio 订阅或 Mac App Store 的 Pixelmator Pro。

---

[主 README](../../README.md) · [更新日志](../../CHANGELOG.md) · [安全信息](../../SECURITY.md)
```
