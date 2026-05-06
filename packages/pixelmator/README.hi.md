<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.md">English</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# ```hindi
@creator-studio-os/pixelmator

> क्रिएटर स्टूडियो ओएस के लिए पिक्सेलमेटर प्रो टूल — लेयर एडिटिंग, एमएल इफेक्ट्स, ब्रांड कार्ड कंपोजिशन और मल्टी-फॉर्मेट एक्सपोर्ट।

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-99%25-brightgreen.svg" alt="Coverage 99%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

एप्पल क्रिएटर स्टूडियो ऐप्स के लिए [क्रिएटर स्टूडियो ओएस](../../README.md) एमसीपी कंट्रोल प्लेन का हिस्सा।

---

## इंस्टॉल करें

```bash
npm install @creator-studio-os/pixelmator
```

इसके लिए पिक्सेलमेटर प्रो (क्रिएटर स्टूडियो या स्टैंडअलोन) और macOS 13+ की आवश्यकता है।

## यह पैकेज क्या करता है

`@creator-studio-os/pixelmator` ऐप्पलस्क्रिप्ट इंटरफेस के माध्यम से पिक्सेलमेटर प्रो को चलाता है — यह macOS पर उपलब्ध सबसे उन्नत एमएल-संवर्धित इमेज एडिटिंग एपीआई है। 33 टूल जो पूरे दस्तावेज़ जीवनचक्र, लेयर स्टैक मैनिपुलेशन, एमएल एल्गोरिदम, रंग समायोजन, प्रभाव और एक मल्टी-साइज़ ब्रांड कार्ड कंपोजिटर को कवर करते हैं।

## टूल (33)

### ऐप और दस्तावेज़ जीवनचक्र

| टूल | विवरण |
|------|-------------|
| `pixelmator_app_open` | पिक्सेलमेटर प्रो को सक्रिय करें |
| `pixelmator_app_running` | जांचें कि क्या पिक्सेलमेटर प्रो चल रहा है |
| `pixelmator_open` | एक दस्तावेज़ खोलें; दस्तावेज़ का नाम लौटाता है (अन्य सभी टूल द्वारा उपयोग किया जाता है) |
| `pixelmator_close` | एक दस्तावेज़ बंद करें (कोई सेव नहीं) |
| `pixelmator_export` | पीएनजी, जेपीईजी, टीआईएफएफ, पीएसडी, वेबपी, एचईआईसी, एवीआईएफ में एक्सपोर्ट करें |
| `pixelmator_export_hdr` | एचडीआर जेपीईजी, एचडीआर एचईआईसी, एचडीआर एवीआईएफ या एचडीआर पीएनजी के रूप में एक्सपोर्ट करें |
| `pixelmator_export_video` | वीडियो लेयर्स को एमपी4 या क्विकटाइम में एक्सपोर्ट करें |
| `pixelmator_export_animated` | एनिमेटेड जीआईएफ या एनिमेटेड पीएनजी के रूप में एक्सपोर्ट करें |
| `pixelmator_export_for_web` | वेब-अनुकूलित पीएनजी, जेपीईजी, वेबपी, जीआईएफ या एसवीजी |
| `pixelmator_batch_export_project_images` | किसी प्रोजेक्ट की `images/` निर्देशिका में सभी छवियों को बैच में एक्सपोर्ट करें |
| `pixelmator_batch_export_project_images_dryrun` | ड्राई-रन: सूचीबद्ध करें कि बैच एक्सपोर्ट क्या प्रोसेस करेगा |

### दस्तावेज़ परिवर्तन

| टूल | विवरण |
|------|-------------|
| `pixelmator_resize` | दस्तावेज़ आयाम और/या रिज़ॉल्यूशन बदलें |
| `pixelmator_crop` | `{x, y, width, height}` पर क्रॉप करें |
| `pixelmator_rotate` | 180 डिग्री घुमाएं, दाएं (90 डिग्री दक्षिणावर्त), या बाएं (90 डिग्री वामावर्त) |
| `pixelmator_flip` | क्षैतिज या लंबवत रूप से फ़्लिप करें |

### लेयर स्टैक

| टूल | विवरण |
|------|-------------|
| `pixelmator_make_layer` | एक छवि, टेक्स्ट या शेप लेयर जोड़ें |
| `pixelmator_set_layer_properties` | दृश्यता, अपारदर्शिता, ब्लेंड मोड, स्थिति या आकार बदलें |
| `pixelmator_layer_order` | एक लेयर को पुन: व्यवस्थित करें (सामने/पीछे/पहले/बाद में) |
| `pixelmator_group_layers` | लेयर्स को एक नए समूह में ले जाएं |
| `pixelmator_ungroup` | एक समूह लेयर को अनग्रुप करें |
| `pixelmator_set_layer_text` | एक टेक्स्ट लेयर पर टेक्स्ट सामग्री और स्टाइलिंग को संपादित करें |
| `pixelmator_make_shape` | एक भरा हुआ आयत, अंडाकार, गोल-कोण वाला आयत या रेखा बनाएं |
| `pixelmator_set_blend_mode` | कंपोजिटिंग ब्लेंड मोड सेट करें (सभी 28 पिक्सेलमेटर प्रो मोड) |
| `pixelmator_set_layer_shadow` | एक ड्रॉप शैडो जोड़ें या संपादित करें |
| `pixelmator_set_layer_stroke` | एक आउटलाइन स्ट्रोक जोड़ें या संपादित करें |

### प्रभाव और रंग समायोजन

| टूल | विवरण |
|------|-------------|
| `pixelmator_apply_effect` | 23 गैर-विनाशकारी प्रभाव वर्गों में से किसी एक को लागू करें |
| `pixelmator_apply_color_adjustment` | 24 रंग-समायोजन गुणों में से किसी एक को सेट करें (शामिल हैं: एलयूटी पथ, विग्नेट) |

### एमएल

| टूल | विवरण |
|------|-------------|
| `pixelmator_apply_ml` | `super_resolution`, `enhance`, `denoise`, `deband`, `match_colors`, `remove_background`, `select_subject` या `auto-adjust` चलाएं |
| `pixelmator_run_shortcut` | `shortcuts run` के माध्यम से पिक्सेलमेटर शॉर्टकट कार्रवाई को नाम से चलाएं |

### डिटेक्शन और रिप्लेस

| टूल | विवरण |
|------|-------------|
| `pixelmator_detect` | चेहरे या क्यूआर कोड का पता लगाएं (बाउंडिंग बॉक्स; क्यूआर में डिकोड किया गया पेलोड शामिल है) |
| `pixelmator_replace_text` | सभी टेक्स्ट लेयर्स में टेक्स्ट खोजें और बदलें |
| `pixelmator_replace_layer` | एक छवि लेयर की पिक्सेल सामग्री को एक नई फ़ाइल से बदलें |

### ब्रांड कार्ड कंपोजिटर

| टूल | विवरण |
|------|-------------|
| `pixelmator_compose_brand_card` | एक `.pxd` टेम्पलेट खोलें, `{{HEADLINE}}` / `{{SUBHEAD}}` / `{{LOGO}}` टोकन को बदलें, और कई आकारों में एक्सपोर्ट करें |

## उदाहरण

एक टेम्पलेट से तीन आकारों में ब्रांड कार्ड जेनरेट करें:

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

एमएल सुपर-रिज़ॉल्यूशन लागू करें और फिर से एक्सपोर्ट करें:

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

## रिकवरी प्रोफाइल

```typescript
import { recovery } from "@creator-studio-os/pixelmator";
// recovery.app === "pixelmator"
```

## macOS आवश्यकता

`@creator-studio-os/pixelmator` केवल macOS के लिए है (`"os": ["darwin"]`)। एमएल टूल के लिए क्रिएटर स्टूडियो सदस्यता या मैक ऐप स्टोर से पिक्सेलमेटर प्रो की आवश्यकता होती है।

---

[मुख्य README](../../README.md) · [परिवर्तन लॉग](../../CHANGELOG.md) · [सुरक्षा](../../SECURITY.md)
```
