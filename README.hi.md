<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.md">English</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="550">
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/creator-studio-os/actions/workflows/ci.yml"><img src="https://github.com/mcp-tool-shop-org/creator-studio-os/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <a href="https://mcp-tool-shop-org.github.io/creator-studio-os/"><img src="https://img.shields.io/badge/docs-handbook-informational" alt="Handbook"></a>
</p>

MCP नियंत्रण प्रणाली (कंट्रोल प्लेन) एप्पल क्रिएटर स्टूडियो ऐप्स के लिए। **फाइनल कट प्रो**, **कंप्रेसर**, **मोशन**, **पिक्सेलमेटर प्रो**, **लॉजिक प्रो**, **कीनोट**, **पेजेस**, और **नंबर्स** को क्लाउड या किसी भी MCP क्लाइंट से चलाएं - JSON विनिर्देशों से वीडियो सामग्री बनाएं, मोशन के लोअर-थर्ड को हेडलेस तरीके से रेंडर करें, कंप्रेसर के माध्यम से एन्कोड करें, और एक क्रॉस-ऐप पाइपलाइन में ब्रांड एसेट्स उत्पन्न करें।

**v1.7.10** — सभी 8 एप्पल क्रिएटर स्टूडियो ऐप्स में 78 उपकरण। क्रॉस-ऐप कंपोजिट प्रोटोकॉल लाइव: पिक्सेलमेटर ब्रांड कार्ड + मोशन प्रोरेस 4444 लोअर-थर्ड + कंप्रेसर फाइनल एन्कोडिंग। 9/9 स्मोक चरण हरे। केवल macOS।

---

## यह क्यों मौजूद है

फाइनल कट प्रो की AppleScript डिक्शनरी **केवल पढ़ने के लिए** है - आप लाइब्रेरी की सूची बना सकते हैं और मेटाडेटा पढ़ सकते हैं, लेकिन आप AppleScript के माध्यम से टाइमलाइन नहीं बना सकते। समर्थित निर्माण पथ **FCPXML आयात** है: एक अच्छी तरह से संरचित FCPXML 1.14 दस्तावेज़ लिखें, इसे फाइनल कट प्रो को दें, और फाइनल कट प्रो प्रोजेक्ट बनाएगा।

`creator-studio-os` एक पुल है: क्लाउड टाइमलाइन को JSON विनिर्देशों के रूप में बनाता है, सर्वर FCPXML बनाता और मान्य करता है, FCP आयात को ट्रिगर करता है, कंप्रेसर के माध्यम से मोशन लोअर-थर्ड टेम्पलेट्स को हेडलेस तरीके से रेंडर करता है, और ब्रांड एसेट्स के लिए पिक्सेलमेटर प्रो को व्यवस्थित करता है - यह सब एक ही क्रॉस-ऐप पाइपलाइन में।

## सुरक्षा

`creator-studio-os` पूरी तरह से डिवाइस पर चलता है। यह:

- बंडल आईडी (फ़ाइल नाम के बजाय) द्वारा ऐप्स को लक्षित करते हुए `osascript` को चलाता है।
- केवल `CREATOR_STUDIO_DATA_DIR` के अंदर लिखता है - कोई सिस्टम फ़ाइलें नहीं, फाइनल कट प्रो लाइब्रेरी के आंतरिक भाग नहीं।
- **कोई नेटवर्क कॉल नहीं** करता - कोई टेलीमेट्री नहीं, कोई एनालिटिक्स नहीं, कोई रिमोट वैलिडेशन नहीं।
- **कोई क्रेडेंशियल, टोकन या उपयोगकर्ता डेटा नहीं** संग्रहीत करता।
- AppleScript इंटरपोलेशन से पहले सभी उपयोगकर्ता-प्रदान किए गए स्ट्रिंग को एस्केप करता है (`escapeAppleScriptString`)।

पूर्ण खतरे का मॉडल: [`docs/threat-model.md`](./docs/threat-model.md) · [`SECURITY.md`](./SECURITY.md)

## इंस्टॉल करें

```bash
npm install -g @mcptoolshop/creator-studio-os
```

MCP क्लाइंट कॉन्फ़िगरेशन (`claude_desktop_config.json` या समकक्ष):

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

या npx के माध्यम से:

```json
{ "command": "npx", "args": ["-y", "@mcptoolshop/creator-studio-os", "serve"] }
```

## अपनी स्थापना सत्यापित करें

```bash
creator-studio-os verify
```

प्लेटफ़ॉर्म, `osascript`, `xmllint`, फाइनल कट प्रो इंस्टॉलेशन, FCPXML 1.14 DTD, डेटा निर्देशिका की जांच करता है, और बंडल DTD के माध्यम से FCPXML राउंड-ट्रिप चलाता है।

## डेटा निर्देशिका

डिफ़ॉल्ट: `/Volumes/T9-Shared/AI/creator-studio` (override with `CREATOR_STUDIO_DATA_DIR`)।

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

## क्रॉस-ऐप प्रोटोकॉल: `brand-deck-minimal`

मुख्य पाइपलाइन - `project.json` विनिर्देश से लेकर ProRes MOV तक 13 चरण:

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

`project.json` का प्रारूप: [`src/projects/types.ts`](./src/projects/types.ts) · डेमो: [`demo/csos-showcase/project.json`](./demo/csos-showcase/project.json)

## उपकरण

### फाइनल कट प्रो (22 उपकरण)

| उपकरण | उद्देश्य |
|------|---------|
| `fcp_project_list` | डेटा निर्देशिका में परियोजनाओं की सूची बनाएं |
| `fcp_project_create` | एक प्रोजेक्ट निर्देशिका + `project.json` बनाएं |
| `fcp_project_info` | प्रोजेक्ट मेटाडेटा + हल किए गए पथ पढ़ें |
| `fcp_fcpxml_build` | JSON विनिर्देश से FCPXML 1.14 बनाएं |
| `fcp_fcpxml_validate` | बंडल DTD के विरुद्ध FCPXML को मान्य करें |
| `fcp_fcpxml_write` | FCPXML को `projects/<name>/fcp/` में लिखें |
| `fcp_fcpxml_import` | फाइनल कट प्रो में एक FCPXML फ़ाइल खोलें |
| `fcp_fcpxml_build_write_import` | एंड-टू-एंड: बनाएं → मान्य करें → लिखें → आयात करें |
| `fcp_library_list` | FCP में खुले लाइब्रेरी की सूची बनाएं |
| `fcp_library_events` | एक लाइब्रेरी में इवेंट की सूची बनाएं |
| `fcp_event_projects` | एक इवेंट में परियोजनाओं की सूची बनाएं |
| `fcp_project_metadata` | सीक्वेंस अवधि, फ्रेम दर, टाइमकोड प्रारूप पढ़ें |
| `fcp_app_open` / `fcp_app_running` / `fcp_app_activate` | जीवनचक्र |
| `fcp_round_trip_diff` | दो FCPXML फ़ाइलों की तुलना करें, संरचित अंतर उत्पन्न करें |
| `fcp_fcpxml_add_title` | एक स्पाइन में एक टाइटल प्रभाव क्लिप जोड़ें |
| `fcp_fcpxml_add_transition` | क्लिप के बीच एक संक्रमण जोड़ें |
| `fcp_fcpxml_add_marker` | एक चैप्टर/टू-डू/कम्प्लीशन मार्कर जोड़ें |
| `fcp_safety_preflight` | आयात करने से पहले सभी FCPXML स्रोत फ़ाइल मौजूद हैं, यह जांचें |
| `fcp_multicam_build` | एंगल विनिर्देशों से एक मल्टीकैम क्लिप बनाएं |
| `fcp_caption_build` | एक ट्रांसक्रिप्ट से कैप्शन ट्रैक बनाएं। |
| `fcp_compound_clip_build` | नेस्टेड स्पाइन स्पेसिफिकेशन्स से एक कंपाउंड क्लिप बनाएं। |

### कंप्रेसर (15 उपकरण)

कंप्रेसर में कोई AppleScript डिक्शनरी नहीं है - इंटरफ़ेस CLI (कमांड लाइन इंटरफ़ेस) और `.compressorbatch` फ़ाइलें हैं। प्रत्येक सत्र में पहली बार चलाने पर ऐप स्टोर प्रमाणीकरण सत्यापन (अपेक्षित) होता है।

| उपकरण | उद्देश्य |
|------|---------|
| `compressor_app_open` / `compressor_app_running` | जीवनचक्र |
| `compressor_settings_list` | `.compressorsetting` प्रीसेट की सूची बनाएं। |
| `compressor_locations_list` | `.compressorlocation` फ़ाइलों की सूची बनाएं। |
| `compressor_encode` | एक सिंगल एन्कोडिंग कार्य सबमिट करें। |
| `compressor_encode_project` | किसी प्रोजेक्ट की डायरेक्टरी के सापेक्ष एन्कोडिंग करें। |
| `compressor_monitor_stream` | एन्कोडिंग प्रगति फ्रेम स्ट्रीम करें। |
| `compressor_job_status` | एक सिंगल कार्य की स्थिति की जांच करें। |
| `compressor_batch_status` | सभी सक्रिय बैच कार्यों की स्थिति की जांच करें। |
| `compressor_cancel_job` | एक सक्रिय कार्य को रद्द करें। |
| `compressor_settings_inspect` | एक `.compressorsetting` फ़ाइल का निरीक्षण करें। |
| `compressor_batch_build` | एक `.compressorbatch` XML दस्तावेज़ बनाएं। |
| `compressor_await_output` | तब तक प्रतीक्षा करें जब तक कि आउटपुट फ़ाइल खाली न हो जाए। |
| `compressor_daemon_recover` | एक अटक गए कंप्रेसर डेमॉन को पुनर्प्राप्त करें। |

[`docs/reference/compressor-cli.md`](./docs/reference/compressor-cli.md) देखें।

### मोशन (10 उपकरण)

| उपकरण | उद्देश्य |
|------|---------|
| `motion_app_open` / `motion_app_running` | जीवनचक्र |
| `motion_open` | एक `.motn` टेम्पलेट खोलें। |
| `motion_template_clone` | एक `.motn` टेम्पलेट को एक नए पथ पर क्लोन करें। |
| `motion_template_set_param` | एक प्रकाशित पैरामीटर मान सेट करें (OZML संपादन)। |
| `motion_template_get_params` | एक टेम्पलेट में सभी प्रकाशित पैरामीटर की सूची बनाएं। |
| `motion_template_validate` | एक `.motn` फ़ाइल की OZML संरचना को मान्य करें। |
| `motion_template_publish_catalog` | मोशन के प्रकाशन कैटलॉग में सभी टेम्पलेट्स की सूची बनाएं। |
| `motion_publish_to_fcp` | एक मोशन टेम्पलेट को FCP के टाइटल ब्राउज़र में प्रकाशित करें। |
| `motion_render_via_compressor` | कंप्रेसर के माध्यम से एक `.motn` को वीडियो में हेडलेस रूप से रेंडर करें। |

ध्यान दें: `motion_template_set_param` और `motion_render_via_compressor` में किसी भी MCP (मैकिओएस कमांड-लाइन टूल) में कोई पूर्व उदाहरण नहीं है - हेडलेस मोशन OZML परिवर्तन और रेंडरिंग केवल csos द्वारा सक्षम है।

### पिक्सेलमेटर प्रो (33 उपकरण)

| उपकरण | उद्देश्य |
|------|---------|
| `pixelmator_app_open` / `pixelmator_app_running` | जीवनचक्र |
| `pixelmator_open` / `pixelmator_close` | दस्तावेज़ खोलें/बंद करें। |
| `pixelmator_export` | PNG / JPEG / TIFF / HEIC / GIF / WebP / PDF / SVG में निर्यात करें। |
| `pixelmator_resize` / `pixelmator_crop` / `pixelmator_rotate` / `pixelmator_flip` | परिवर्तन। |
| `pixelmator_batch_export_project_images` | बैच रूपांतरण `projects/<name>/images/` |
| `pixelmator_layer_list` / `pixelmator_layer_create` / `pixelmator_layer_delete` | लेयर प्रबंधन। |
| `pixelmator_layer_set_text` / `pixelmator_layer_set_fill` / `pixelmator_layer_move` | लेयर संपादन। |
| `pixelmator_effects_apply` / `pixelmator_effects_catalog` | ML प्रभाव पाइपलाइन। |
| `pixelmator_compose_brand_card` | शीर्षक पाठ के साथ एक रंग-घूर्णित ब्रांड कार्ड बनाएं। |
| `pixelmator_hdr_export` | HDR टोन मैपिंग के साथ निर्यात करें। |
| `pixelmator_text_card` | फ़ॉन्ट + रंग नियंत्रण के साथ केवल टेक्स्ट वाला कार्ड रेंडर करें। |

### लॉजिक प्रो (3 उपकरण)

लॉजिक में कोई AppleScript डिक्शनरी नहीं है। इंटरफ़ेस: जीवनचक्र + `.logicx` परियोजनाओं के लिए फ़ाइल-ओपन हैंडऑफ़।

| उपकरण | उद्देश्य |
|------|---------|
| `logic_app_open` / `logic_app_running` | जीवनचक्र |
| `logic_open` | एक `.logicx` प्रोजेक्ट खोलें। |

### कीनोट / पेज / नंबर (18 उपकरण संयुक्त)

तीनों में लगभग समान AppleScript संरचना है। पूर्ण निर्यात प्रारूप कैटलॉग: [`docs/reference/iwork-automation.md`](./docs/reference/iwork-automation.md)।

**कीनोट (8 उपकरण):** खोलें, बंद करें, PDF / छवियों / मूवी / PPTX में निर्यात करें, जीवनचक्र
**पेज (5 उपकरण):** खोलें, बंद करें, PDF / Word / RTF / EPUB में निर्यात करें, जीवनचक्र
**नंबर (5 उपकरण):** खोलें, बंद करें, PDF / Excel / CSV में निर्यात करें, जीवनचक्र

### बुनियादी ढांचा

| उपकरण | उद्देश्य |
|------|---------|
| `csos_app_status` | सभी 8 ऐप्स के लिए स्वास्थ्य जांच (चल रहा है, संस्करण, कतार गहराई)। |
| `csos_protocol_run` | एक क्रॉस-ऐप प्रोटोकॉल का एंड-टू-एंड परीक्षण करें (असिंक्रोनस, चरण स्ट्रीम करें)। |
| `csos_protocol_list` | सभी पंजीकृत प्रोटोकॉल की सूची बनाएं। |
| `csos_protocol_describe` | किसी प्रोटोकॉल के चरणों और उद्देश्य का वर्णन करें। |

## टूल-कंपास के साथ अनुशंसित सेटअप।

[टूल-कंपास](https://github.com/mcp-tool-shop-org/tool-compass) एक सिमेंटिक एचएनएसडब्ल्यू गेटवे है जो प्राकृतिक भाषा के आधार पर सही टूल ढूंढता है - यह महत्वपूर्ण है जब 78 टूल 8 अलग-अलग एप्लिकेशन में फैले हों।

```bash
pip install tool-compass
```

स्मोक हार्नेस, चरण 7 में 12 प्रतिनिधि प्रश्नों को मान्य करता है। यदि किसी विवरण में कोई बदलाव होता है जिसके कारण कोई लक्ष्य शीर्ष 3 में से बाहर हो जाता है और उसका स्कोर 0.4 से अधिक नहीं है, तो स्मोक टेस्ट विफल हो जाता है।

## अनुमतियाँ।

पहली बार जब सर्वर किसी एप्लिकेशन के खिलाफ AppleScript का उपयोग करता है, तो macOS सिस्टम सेटिंग्स → गोपनीयता और सुरक्षा → ऑटोमेशन में **ऑटोमेशन अनुमति** देने के लिए संकेत देता है। केवल-पढ़ने के लिए AppleScript के लिए भी इस अनुमति की आवश्यकता होती है।

## CI / सत्यापन।

| जांच करें। | क्या। |
|-------|------|
| **A. Security** | [`SECURITY.md`](./SECURITY.md), [`docs/threat-model.md`](./docs/threat-model.md), कोई गुप्त जानकारी नहीं, कोई टेलीमेट्री नहीं, कोई नेटवर्क कनेक्शन नहीं। |
| **B. Errors** | `CreatorStudioError { code, message, hint }`, CLI एग्जिट कोड, कोई रॉ स्टैक नहीं। |
| **C. Docs** | यह README, [`CHANGELOG.md`](./CHANGELOG.md), [`LICENSE`](./LICENSE), `--help` सटीक। |
| **D. Hygiene** | `npm test`, `npm run typecheck`, संस्करण टैग से मेल खाता है, `npm audit`, स्वच्छ पैकेजिंग। |

CI `ubuntu-latest` पर चलता है (टाइपचेक + बिल्ड + यूनिट टेस्ट + ऑडिट)। वास्तविक एप्लिकेशन के खिलाफ एकीकरण परीक्षण `npm run smoke:ci` के माध्यम से चलाए जाते हैं - macOS रनर जानबूझकर CI में शामिल नहीं हैं (लागत: macOS ≈ Linux की तुलना में प्रति मिनट 10 गुना अधिक)।

## रोडमैप।

- **v1.7.x** — क्रॉस-एप्लिकेशन कंपोजिट प्रोटोकॉल (`brand-deck-minimal`): Pixelmator ब्रांड कार्ड + मोशन लोअर-थर्ड + कंप्रेसर एन्कोड → ProRes MOV — **v1.7.10 पर लाइव**।
- **v1.8.x** — `patchSiblingText` टेक्स्ट-बाउंड्स सत्यापन: जब आने वाला टेक्स्ट निश्चित मोशन टेम्पलेट रेंडर बाउंड्स को काट सकता है, तो एक चेतावनी प्रदर्शित होती है।
- **v2.0** — चरण 3: विस्तारित प्रोटोकॉल सतह (स्टीम ट्रेलर, डेवलॉग, सोशल कार्ड पाइपलाइन)।

एप्लिकेशन रोडमैप: [`docs/roadmap-fcp.md`](./docs/roadmap-fcp.md), [`docs/roadmap-compressor.md`](./docs/roadmap-compressor.md), [`docs/roadmap.md`](./docs/roadmap.md)।

## लाइसेंस।

MIT — [LICENSE](./LICENSE) देखें।

---

<p align="center">Built by <a href="https://mcp-tool-shop.github.io/">MCP Tool Shop</a></p>
