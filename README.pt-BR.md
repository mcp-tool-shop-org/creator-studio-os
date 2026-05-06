<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.hi.md">हिन्दी</a> | <a href="README.it.md">Italiano</a> | <a href="README.md">English</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="550">
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/creator-studio-os/actions/workflows/ci.yml"><img src="https://github.com/mcp-tool-shop-org/creator-studio-os/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <a href="https://mcp-tool-shop-org.github.io/creator-studio-os/"><img src="https://img.shields.io/badge/docs-handbook-informational" alt="Handbook"></a>
</p>

MCP (Media Content Protocol) para aplicativos Apple Creator Studio. Utilize **Final Cut Pro**, **Compressor**, **Motion**, **Pixelmator Pro**, **Logic Pro**, **Keynote**, **Pages** e **Numbers** a partir do Claude ou de qualquer cliente MCP. Crie materiais de vídeo a partir de uma especificação JSON, renderize elementos gráficos do Motion sem interface, codifique usando o Compressor e gere recursos de marca em um único fluxo de trabalho entre aplicativos.

> **v1.7.10** — 78 ferramentas em todos os 8 aplicativos Apple Creator Studio. Protocolo de composição entre aplicativos em funcionamento: cartões de marca do Pixelmator + elementos gráficos ProRes 4444 do Motion + codificação final do Compressor. 9 fases de "smoke" concluídas com sucesso. Apenas para macOS.

---

## Por que isso existe

O dicionário AppleScript do Final Cut Pro é **somente leitura** — você pode listar bibliotecas e ler metadados, mas não pode criar linhas do tempo usando AppleScript. O caminho de criação suportado é a **importação de FCPXML**: escreva um documento FCPXML 1.14 bem formatado, entregue-o ao FCP e o FCP cria o projeto.

O `creator-studio-os` é a ponte: o Claude cria linhas do tempo como especificações JSON, o servidor constrói + valida o FCPXML, aciona a importação do FCP, renderiza modelos de elementos gráficos do Motion sem interface usando o Compressor e gerencia o Pixelmator Pro para recursos de marca — tudo em um único fluxo de trabalho entre aplicativos.

## Segurança

O `creator-studio-os` é executado inteiramente no dispositivo. Ele:

- Executa comandos `osascript` direcionados a aplicativos por ID de pacote (nunca por nome de arquivo)
- Escreve apenas dentro do diretório `CREATOR_STUDIO_DATA_DIR` — sem arquivos do sistema, sem informações internas da biblioteca do FCP
- Não faz **chamadas de rede** — sem telemetria, sem análise, sem validação remota
- Não persiste **credenciais, tokens ou dados do usuário**
- Escapa todas as strings fornecidas pelo usuário antes da interpolação do AppleScript (`escapeAppleScriptString`)

Modelo de ameaças completo: [`docs/threat-model.md`](./docs/threat-model.md) · [`SECURITY.md`](./SECURITY.md)

## Instalação

```bash
npm install -g @mcptoolshop/creator-studio-os
```

Configuração do cliente MCP (`claude_desktop_config.json` ou equivalente):

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

Ou via npx:

```json
{ "command": "npx", "args": ["-y", "@mcptoolshop/creator-studio-os", "serve"] }
```

## Verifique sua configuração

```bash
creator-studio-os verify
```

Verifica a plataforma, o `osascript`, o `xmllint`, a instalação do Final Cut Pro, o DTD FCPXML 1.14, o diretório de dados e executa uma operação de ida e volta de FCPXML usando o DTD incluído.

## Diretório de dados

Padrão: `/Volumes/T9-Shared/AI/creator-studio` (substitua com `CREATOR_STUDIO_DATA_DIR`).

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

## Protocolo entre aplicativos: `brand-deck-minimal`

O fluxo de trabalho principal — 13 etapas de uma especificação `project.json` para um arquivo ProRes MOV:

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

O formato `project.json`: [`src/projects/types.ts`](./src/projects/types.ts) · demonstração: [`demo/csos-showcase/project.json`](./demo/csos-showcase/project.json)

## Ferramentas

### Final Cut Pro (22 ferramentas)

| Ferramenta | Propósito |
|------|---------|
| `fcp_project_list` | Lista os projetos no diretório de dados |
| `fcp_project_create` | Cria um diretório de projeto + `project.json` |
| `fcp_project_info` | Lê os metadados do projeto + caminhos resolvidos |
| `fcp_fcpxml_build` | Cria um FCPXML 1.14 a partir de uma especificação JSON |
| `fcp_fcpxml_validate` | Valida o FCPXML em relação ao DTD incluído |
| `fcp_fcpxml_write` | Escreve o FCPXML em `projects/<nome>/fcp/` |
| `fcp_fcpxml_import` | Abre um arquivo FCPXML no Final Cut Pro |
| `fcp_fcpxml_build_write_import` | Geração completa: construir → validar → escrever → importar |
| `fcp_library_list` | Lista as bibliotecas abertas no FCP |
| `fcp_library_events` | Lista os eventos em uma biblioteca |
| `fcp_event_projects` | Lista os projetos em um evento |
| `fcp_project_metadata` | Lê a duração da sequência, a taxa de quadros, o formato de timecode |
| `fcp_app_open` / `fcp_app_running` / `fcp_app_activate` | Ciclo de vida |
| `fcp_round_trip_diff` | Compara dois arquivos FCPXML e gera uma diferença estruturada |
| `fcp_fcpxml_add_title` | Adiciona um efeito de título a uma sequência |
| `fcp_fcpxml_add_transition` | Adiciona uma transição entre clipes |
| `fcp_fcpxml_add_marker` | Adiciona um marcador de capítulo/tarefa/conclusão |
| `fcp_safety_preflight` | Verifica se todos os arquivos de origem FCPXML existem antes da importação |
| `fcp_multicam_build` | Cria um clipe multicâmera a partir de especificações de ângulo |
| `fcp_caption_build` | Construir uma faixa de legendas a partir de uma transcrição. |
| `fcp_compound_clip_build` | Construir um clipe composto a partir de especificações de estrutura aninhadas. |

### Compressor (15 ferramentas)

O Compressor não possui dicionário AppleScript — a interface é a linha de comando (CLI) e os arquivos `.compressorbatch`. A primeira execução por sessão aciona a validação de permissões da App Store (esperado).

| Ferramenta | Propósito |
|------|---------|
| `compressor_app_open` / `compressor_app_running` | Ciclo de vida |
| `compressor_settings_list` | Listar as configurações predefinidas de `.compressorsetting`. |
| `compressor_locations_list` | Listar os arquivos `.compressorlocation`. |
| `compressor_encode` | Enviar um único trabalho de codificação. |
| `compressor_encode_project` | Codificar em relação ao diretório de um projeto. |
| `compressor_monitor_stream` | Transmitir quadros de progresso da codificação. |
| `compressor_job_status` | Verificar o status de um único trabalho. |
| `compressor_batch_status` | Verificar o status de todos os trabalhos em lote ativos. |
| `compressor_cancel_job` | Cancelar um trabalho ativo. |
| `compressor_settings_inspect` | Inspecionar um arquivo `.compressorsetting`. |
| `compressor_batch_build` | Construir um documento XML `.compressorbatch`. |
| `compressor_await_output` | Aguardar até que um arquivo de saída não esteja vazio. |
| `compressor_daemon_recover` | Recuperar um daemon do Compressor que parou. |

Consulte a documentação em [`docs/reference/compressor-cli.md`](./docs/reference/compressor-cli.md).

### Motion (10 ferramentas)

| Ferramenta | Propósito |
|------|---------|
| `motion_app_open` / `motion_app_running` | Ciclo de vida |
| `motion_open` | Abrir um modelo `.motn`. |
| `motion_template_clone` | Clonar um modelo `.motn` para um novo caminho. |
| `motion_template_set_param` | Definir um valor de parâmetro publicado (edição OZML). |
| `motion_template_get_params` | Listar todos os parâmetros publicados em um modelo. |
| `motion_template_validate` | Validar a estrutura OZML de um arquivo `.motn`. |
| `motion_template_publish_catalog` | Listar todos os modelos no catálogo de publicação do Motion. |
| `motion_publish_to_fcp` | Publicar um modelo do Motion no navegador de títulos do FCP. |
| `motion_render_via_compressor` | Renderizar um arquivo `.motn` para vídeo via Compressor (sem interface gráfica). |

Observação: `motion_template_set_param` e `motion_render_via_compressor` não possuem precedentes em nenhum MCP globalmente — a mutação e renderização OZML do Motion sem interface gráfica são exclusivamente habilitadas pelo csos.

### Pixelmator Pro (33 ferramentas)

| Ferramenta | Propósito |
|------|---------|
| `pixelmator_app_open` / `pixelmator_app_running` | Ciclo de vida |
| `pixelmator_open` / `pixelmator_close` | Abrir/fechar documentos. |
| `pixelmator_export` | Exportar para PNG / JPEG / TIFF / HEIC / GIF / WebP / PDF / SVG. |
| `pixelmator_resize` / `pixelmator_crop` / `pixelmator_rotate` / `pixelmator_flip` | Transformar. |
| `pixelmator_batch_export_project_images` | Converter em lote os arquivos em `projects/<nome>/images/`. |
| `pixelmator_layer_list` / `pixelmator_layer_create` / `pixelmator_layer_delete` | Gerenciamento de camadas. |
| `pixelmator_layer_set_text` / `pixelmator_layer_set_fill` / `pixelmator_layer_move` | Edição de camadas. |
| `pixelmator_effects_apply` / `pixelmator_effects_catalog` | Pipeline de efeitos de aprendizado de máquina (ML). |
| `pixelmator_compose_brand_card` | Criar um cartão de marca com rotação de matiz e texto de título. |
| `pixelmator_hdr_export` | Exportar com mapeamento de tons HDR. |
| `pixelmator_text_card` | Renderizar um cartão com apenas texto, com controle de fonte e cor. |

### Logic Pro (3 ferramentas)

O Logic não possui dicionário AppleScript. Interface: ciclo de vida + transferência de abertura de arquivo para projetos `.logicx`.

| Ferramenta | Propósito |
|------|---------|
| `logic_app_open` / `logic_app_running` | Ciclo de vida |
| `logic_open` | Abrir um projeto `.logicx`. |

### Keynote / Pages / Numbers (18 ferramentas combinadas)

Os três compartilham uma estrutura AppleScript quase idêntica. Catálogo completo de formatos de exportação: [`docs/reference/iwork-automation.md`](./docs/reference/iwork-automation.md).

**Keynote (8 ferramentas):** abrir, fechar, exportar PDF / imagens / filme / PPTX, ciclo de vida.
**Pages (5 ferramentas):** abrir, fechar, exportar PDF / Word / RTF / EPUB, ciclo de vida.
**Numbers (5 ferramentas):** abrir, fechar, exportar PDF / Excel / CSV, ciclo de vida.

### Infraestrutura

| Ferramenta | Propósito |
|------|---------|
| `csos_app_status` | Verificação de saúde de todos os 8 aplicativos (em execução, versão, profundidade da fila). |
| `csos_protocol_run` | Executar um protocolo entre aplicativos de ponta a ponta (assíncrono, transmissão de etapas). |
| `csos_protocol_list` | Listar todos os protocolos registrados. |
| `csos_protocol_describe` | Descreva os passos e o propósito de um protocolo. |

## Configuração recomendada com o "tool-compass"

O [tool-compass](https://github.com/mcp-tool-shop-org/tool-compass) é um gateway HNSW semântico que encontra a ferramenta certa com base na intenção expressa em linguagem natural — essencial quando 78 ferramentas abrangem 8 aplicativos.

```bash
pip install tool-compass
```

O "smoke harness" valida 12 consultas representativas na Fase 7. Qualquer alteração na descrição que faça com que um alvo saia do top-3 com uma pontuação > 0,4 faz com que o teste falhe.

## Permissões

Na primeira vez que o servidor usa AppleScript em um aplicativo, o macOS solicita a concessão da permissão de **automação** em Configurações do Sistema → Privacidade e Segurança → Automação. O AppleScript somente leitura ainda requer essa permissão.

## CI / verificação

| Verificar. | O que. |
|-------|------|
| **A. Security** | [`SECURITY.md`](./SECURITY.md), [`docs/threat-model.md`](./docs/threat-model.md), sem segredos, sem telemetria, sem rede. |
| **B. Errors** | `CreatorStudioError { code, message, hint }`, códigos de saída da CLI, sem rastreamentos brutos. |
| **C. Docs** | Este arquivo README, [`CHANGELOG.md`](./CHANGELOG.md), [`LICENSE`](./LICENSE), `--help` preciso. |
| **D. Hygiene** | `npm test`, `npm run typecheck`, versão correspondente à tag, `npm audit`, empacotamento limpo. |

O CI é executado em `ubuntu-latest` (verificação de tipo + compilação + testes unitários + auditoria). Testes de integração contra aplicativos reais são executados via `npm run smoke:ci` — os ambientes macOS não estão intencionalmente incluídos no CI (custo: macOS ≈ 10 vezes Linux por minuto).

## Roteiro

- **v1.7.x** — protocolo composto entre aplicativos (`brand-deck-minimal`): cartões de marca Pixelmator + legendas Motion + codificação Compressor → ProRes MOV — **disponível na v1.7.10**.
- **v1.8.x** — validação de limites de texto `patchSiblingText`: aviso do ledger quando o texto recebido pode cortar os limites de renderização fixos do modelo Motion.
- **v2.0** — Fase 3: superfície de protocolo expandida (pipelines de trailers do Steam, devlogs, cartões sociais).

Roteiros de aplicativos: [`docs/roadmap-fcp.md`](./docs/roadmap-fcp.md), [`docs/roadmap-compressor.md`](./docs/roadmap-compressor.md), [`docs/roadmap.md`](./docs/roadmap.md).

## Licença

MIT — veja [LICENSE](./LICENSE).

---

<p align="center">Built by <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a></p>
