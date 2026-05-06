<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.md">English</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="400">
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/creator-studio-os/actions/workflows/ci.yml"><img src="https://github.com/mcp-tool-shop-org/creator-studio-os/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://codecov.io/gh/mcp-tool-shop-org/creator-studio-os"><img src="https://codecov.io/gh/mcp-tool-shop-org/creator-studio-os/branch/main/graph/badge.svg" alt="Coverage"></a>
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <a href="https://mcp-tool-shop-org.github.io/creator-studio-os/"><img src="https://img.shields.io/badge/docs-handbook-informational" alt="Handbook"></a>
</p>

MCP控制平面，用于Apple Creator Studio应用程序。驱动**Final Cut Pro**、**Compressor**、**Motion**、**Pixelmator Pro**、**Logic Pro**、**Keynote**、**Pages**和**Numbers**，通过Claude或任何MCP客户端——从JSON规范创建视频输出，在无界面模式下渲染Motion的片头，通过Compressor进行编码，并在一套跨应用程序的流水线中生成品牌资产。

**v1.7.10** — 涵盖所有8个Apple Creator Studio应用程序的78个工具。跨应用程序的合成协议已启用：Pixelmator品牌卡片 + Motion ProRes 4444片头 + Compressor最终编码。9个阶段全部通过。仅适用于macOS。

---

## 为什么需要它

Final Cut Pro的AppleScript词典是**只读**的——您可以列出库并读取元数据，但您无法通过AppleScript创建时间线。支持的创作路径是**FCPXML导入**：编写一个符合FCPXML 1.14规范的文档，将其传递给FCP，然后FCP创建项目。

`creator-studio-os`是桥梁：Claude以JSON规范编写时间线，服务器构建+验证FCPXML，触发FCP导入，通过Compressor在无界面模式下渲染Motion片头模板，并使用Pixelmator Pro生成品牌资产——所有这些都位于单个跨应用程序的流水线中。

## 安全性

`creator-studio-os`完全在本地运行。它：

- 启动`osascript`，目标是根据应用程序的bundle ID（而不是文件名）
- 仅在`CREATOR_STUDIO_DATA_DIR`目录下写入文件——不涉及任何系统文件，也不涉及FCP库的内部文件
- **不进行任何网络调用**——没有遥测数据，没有分析数据，没有远程验证
- **不存储任何凭证、令牌或用户数据**
- 在AppleScript插值之前，对所有用户提供的字符串进行转义（`escapeAppleScriptString`）

完整的威胁模型：[`docs/threat-model.md`](./docs/threat-model.md) · [`SECURITY.md`](./SECURITY.md)

## 安装

```bash
npm install -g @mcptoolshop/creator-studio-os
```

MCP客户端配置（`claude_desktop_config.json`或等效文件）：

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

或者，通过npx：

```json
{ "command": "npx", "args": ["-y", "@mcptoolshop/creator-studio-os", "serve"] }
```

## 验证您的配置

```bash
creator-studio-os verify
```

检查平台、`osascript`、`xmllint`、Final Cut Pro安装、FCPXML 1.14 DTD、数据目录，并运行一个FCPXML的完整流程，通过捆绑的DTD进行验证。

## 数据目录

默认值：`/Volumes/T9-Shared/AI/creator-studio`（可以通过`CREATOR_STUDIO_DATA_DIR`进行覆盖）。

```
creator-studio/
├── projects/
│   └── <name>/
│       ├── project.json     # ProjectV2 spec (scenes, deliverables, brand, scoreMap)
│       ├── footage/         # raw video
│       ├── audio/           # stems, voiceover, music
│       ├── images/          # stills, thumbnails, key art
│       ├── brand/           # logos, type, color tokens
│       ├── refs/            # mood, scripts, canon excerpts
│       ├── fcp/             # FCPXML output
│       └── out/             # rendered deliverables
└── shared/
    ├── brand/               # studio-wide assets
    └── presets/             # Compressor settings
```

## 跨应用程序协议：`brand-deck-minimal`

旗舰流水线——从`project.json`规范到ProRes MOV，共有13个步骤：

```bash
creator-studio-os protocol run brand-deck-minimal --project demo/csos-showcase/project.json
```

```
1  validate-project       — assert ProjectV2 schema + scene count
2  compose-brand-cards    — Pixelmator Pro: hue-rotated identity cards per scene
3  render-scene-clips     — Motion: clone template → patch title/subhead → Compressor ProRes 4444 render
4  edit-motion-title      — set project-level Motion template title
5  resolve-fcp-params     — compute timeline geometry
6  build-fcpxml           — write FCPXML 1.14 to out/fcp/
7  safety-preflight       — assert brand card files exist
8  dtd-validate           — xmllint against bundled FCP DTD
9  fcp-import             — open .fcpxml in Final Cut Pro
10 compressor-encode      — ffmpeg overlay (brand card + ProRes 4444 alpha clip) → Compressor final encode
11 monitor-encode         — poll encode until done
12 verify-output          — assert MOV exists and has bytes
13 write-replay-manifest  — finalise manifest with completedAt
```

`project.json`格式：[`src/projects/types.ts`](./src/projects/types.ts) · 示例：[`demo/csos-showcase/project.json`](./demo/csos-showcase/project.json)

## 工具

### Final Cut Pro (22个工具)

| 工具 | 目的 |
|------|---------|
| `fcp_project_list` | 列出数据目录中的项目 |
| `fcp_project_create` | 创建项目目录 + `project.json` |
| `fcp_project_info` | 读取项目元数据 + 解析后的路径 |
| `fcp_fcpxml_build` | 从JSON规范构建FCPXML 1.14 |
| `fcp_fcpxml_validate` | 验证FCPXML是否符合捆绑的DTD |
| `fcp_fcpxml_write` | 将FCPXML写入`projects/<name>/fcp/` |
| `fcp_fcpxml_import` | 在Final Cut Pro中打开FCPXML文件 |
| `fcp_fcpxml_build_write_import` | 端到端：构建 → 验证 → 写入 → 导入 |
| `fcp_library_list` | 列出FCP中打开的库 |
| `fcp_library_events` | 列出库中的事件 |
| `fcp_event_projects` | 列出事件中的项目 |
| `fcp_project_metadata` | 读取序列时长、帧率、时间码格式 |
| `fcp_app_open` / `fcp_app_running` / `fcp_app_activate` | 生命周期 |
| `fcp_round_trip_diff` | 比较两个FCPXML文件，生成结构化差异 |
| `fcp_fcpxml_add_title` | 向序列添加标题效果片段 |
| `fcp_fcpxml_add_transition` | 在片段之间添加过渡 |
| `fcp_fcpxml_add_marker` | 添加章节/待办事项/完成标记 |
| `fcp_safety_preflight` | 在导入之前，检查所有FCPXML源文件是否存在 |
| `fcp_multicam_build` | 从角度规范构建多机位片段 |
| `fcp_caption_build` | 从转录文本创建字幕轨道 |
| `fcp_compound_clip_build` | 从嵌套的 Spine 规范构建复合剪辑 |

### 压缩工具 (15 个工具)

Compressor 没有 AppleScript 字典，其接口是命令行界面以及 `.compressorbatch` 文件。 首次启动时会触发 App Store 授权验证（预期）。

| 工具 | 目的 |
|------|---------|
| `compressor_app_open` / `compressor_app_running` | 生命周期 |
| `compressor_settings_list` | 枚举 `.compressorsetting` 预设 |
| `compressor_locations_list` | 枚举 `.compressorlocation` 文件 |
| `compressor_encode` | 提交单个编码任务 |
| `compressor_encode_project` | 相对于项目目录进行编码 |
| `compressor_monitor_stream` | 流式传输编码进度帧 |
| `compressor_job_status` | 查询单个任务的状态 |
| `compressor_batch_status` | 查询所有活动批处理任务的状态 |
| `compressor_cancel_job` | 取消一个活动任务 |
| `compressor_settings_inspect` | 检查 `.compressorsetting` 文件 |
| `compressor_batch_build` | 构建 `.compressorbatch` XML 文档 |
| `compressor_await_output` | 等待直到输出文件非空 |
| `compressor_daemon_recover` | 恢复卡住的 Compressor 守护进程 |

请参阅 [`docs/reference/compressor-cli.md`](./docs/reference/compressor-cli.md)。

### 运动 (10 个工具)

| 工具 | 目的 |
|------|---------|
| `motion_app_open` / `motion_app_running` | 生命周期 |
| `motion_open` | 打开 `.motn` 模板 |
| `motion_template_clone` | 将 `.motn` 模板克隆到新的路径 |
| `motion_template_set_param` | 设置已发布的参数值 (OZML 编辑) |
| `motion_template_get_params` | 列出模板中的所有已发布参数 |
| `motion_template_validate` | 验证 `.motn` 文件的 OZML 结构 |
| `motion_template_publish_catalog` | 列出 Motion 的发布目录中的所有模板 |
| `motion_publish_to_fcp` | 将 Motion 模板发布到 FCP 的标题浏览器 |
| `motion_render_via_compressor` | 通过 Compressor 以无头模式渲染 `.motn` 文件为视频 |

注意：`motion_template_set_param` 和 `motion_render_via_compressor` 在任何 MCP 全局范围内都没有先例——无头 Motion OZML 修改和渲染是由 csos 唯一实现的。

### Pixelmator Pro (33 个工具)

| 工具 | 目的 |
|------|---------|
| `pixelmator_app_open` / `pixelmator_app_running` | 生命周期 |
| `pixelmator_open` / `pixelmator_close` | 打开/关闭文档 |
| `pixelmator_export` | 导出为 PNG / JPEG / TIFF / HEIC / GIF / WebP / PDF / SVG |
| `pixelmator_resize` / `pixelmator_crop` / `pixelmator_rotate` / `pixelmator_flip` | 变换 |
| `pixelmator_batch_export_project_images` | 批量转换 `projects/<name>/images/` 目录中的文件 |
| `pixelmator_layer_list` / `pixelmator_layer_create` / `pixelmator_layer_delete` | 图层管理 |
| `pixelmator_layer_set_text` / `pixelmator_layer_set_fill` / `pixelmator_layer_move` | 图层编辑 |
| `pixelmator_effects_apply` / `pixelmator_effects_catalog` | ML 效果流水线 |
| `pixelmator_compose_brand_card` | 合成带有标题文本的色彩旋转品牌卡 |
| `pixelmator_hdr_export` | 使用 HDR 调色导出 |
| `pixelmator_text_card` | 渲染一个仅包含文本的卡片，带有字体和颜色控制 |

### Logic Pro (3 个工具)

Logic 没有 AppleScript 字典。 接口：生命周期 + 用于 `.logicx` 项目的文件打开。

| 工具 | 目的 |
|------|---------|
| `logic_app_open` / `logic_app_running` | 生命周期 |
| `logic_open` | 打开 `.logicx` 项目 |

### Keynote / Pages / Numbers (18 个工具，组合)

这三个应用程序具有几乎相同的 AppleScript 结构。 完整的导出格式目录：[`docs/reference/iwork-automation.md`](./docs/reference/iwork-automation.md)。

**Keynote (8 个工具):** 打开、关闭、导出 PDF / 图像 / 电影 / PPTX、生命周期
**Pages (5 个工具):** 打开、关闭、导出 PDF / Word / RTF / EPUB、生命周期
**Numbers (5 个工具):** 打开、关闭、导出 PDF / Excel / CSV、生命周期

### 基础设施

| 工具 | 目的 |
|------|---------|
| `csos_app_status` | 所有 8 个应用程序的健康检查（运行状态、版本、队列深度） |
| `csos_protocol_run` | 运行跨应用程序的端到端协议（异步，流式传输步骤） |
| `csos_protocol_list` | 列出所有已注册的协议 |
| `csos_protocol_describe` | 描述协议的步骤和目的。 |

## 推荐的配置，使用 tool-compass

[tool-compass](https://github.com/mcp-tool-shop-org/tool-compass) 是一个语义化的 HNSW 网关，它能够根据自然语言意图找到合适的工具——当 78 个工具应用于 8 个应用程序时，这一点至关重要。

```bash
pip install tool-compass
```

“烟雾测试”框架验证了第七阶段的 12 个典型查询。任何描述更改导致目标不在前 3 名，且得分 > 0.4，都会导致“烟雾测试”失败。

## 权限

当服务器首次使用 AppleScript 脚本操作某个应用程序时，macOS 会提示授予“自动化”权限，具体路径为：系统设置 → 隐私与安全性 → 自动化。 即使是只读的 AppleScript 脚本也需要此授权。

## CI / 验证

| 检查 | 什么 |
|-------|------|
| **A. Security** | [`SECURITY.md`](./SECURITY.md), [`docs/threat-model.md`](./docs/threat-model.md)，不包含任何密钥，不收集任何遥测数据，不使用任何网络连接。 |
| **B. Errors** | `CreatorStudioError { code, message, hint }`，CLI 退出码，不包含原始堆栈信息。 |
| **C. Docs** | 此 README 文件、[`CHANGELOG.md`](./CHANGELOG.md)、[`LICENSE`](./LICENSE) 以及 `--help` 命令的描述都是准确的。 |
| **D. Hygiene** | `npm test`，`npm run typecheck`，版本号与标签匹配，`npm audit`，干净的打包。 |

CI 在 `ubuntu-latest` 环境中运行（类型检查 + 构建 + 单元测试 + 审计）。 对真实应用程序的集成测试通过 `npm run smoke:ci` 命令运行——macOS 运行环境故意不在 CI 流程中（macOS 的成本约为 Linux 的 10 倍/分钟）。

## 路线图

- **v1.7.x** — 跨应用程序的组合协议 (`brand-deck-minimal`)：Pixelmator 品牌卡片 + Motion 动画片头 + Compressor 编码 → ProRes MOV — **已在 v1.7.10 版本中上线**
- **v1.8.x** — `patchSiblingText` 文本边界验证：当传入的文本可能超出固定 Motion 模板的渲染边界时，会显示 ledger 警告。
- **v2.0** — 第三阶段：扩展协议范围（Steam 预告片、开发日志、社交媒体卡片流水线）。

应用程序路线图：[`docs/roadmap-fcp.md`](./docs/roadmap-fcp.md), [`docs/roadmap-compressor.md`](./docs/roadmap-compressor.md), [`docs/roadmap.md`](./docs/roadmap.md)。

## 许可证

MIT 协议 — 参见 [LICENSE](./LICENSE)。

---

<p align="center">Built by <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a></p>
