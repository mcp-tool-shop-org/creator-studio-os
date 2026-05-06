<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.md">English</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/motion

> क्रिएटर स्टूडियो ओएस के लिए मोशन टूल — OZML टेम्पलेट परिवर्तन, हेडलेस कंप्रेसर रेंडर, और टेम्पलेट कैटलॉग।

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-92%25-brightgreen.svg" alt="Coverage 92%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

यह [क्रिएटर स्टूडियो ओएस](../../README.md) एमसीपी कंट्रोल प्लेन का हिस्सा है, जो ऐप्पल क्रिएटर स्टूडियो ऐप्स के लिए है।

---

## इंस्टॉल करें

```bash
npm install @creator-studio-os/motion
```

इसके लिए मोशन (क्रिएटर स्टूडियो) और macOS 13 या उससे ऊपर की आवश्यकता है। हेडलेस रेंडर के लिए कंप्रेसर की आवश्यकता होती है।

## यह पैकेज क्या करता है

मोशन **कोई ऐप्पलस्क्रिप्ट इंटरफेस नहीं** प्रदान करता है। `@creator-studio-os/motion` फ़ाइल प्रारूप स्तर पर काम करता है — यह सीधे मोशन के OZML टेम्पलेट प्रारूप (`.motn` / `.moti`) को पढ़ता और बदलता है, बिना मोशन को खोले:

- **टेम्पलेट निरीक्षण** — OZML को पार्स करें, सभी प्रकाशित पैरामीटरों की सूची बनाएं।
- **पैरामीटर परिवर्तन** — किसी भी पैरामीटर का मान (टेक्स्ट, रंग, संख्या) परमाणु रूप से सेट करें।
- **टेक्स्ट संपादन** — दिखाई देने वाले टेक्स्ट सामग्री को बदलें, जिसमें ग्लाइफ़ सूची और स्टाइल रन शामिल हैं।
- **संरचनात्मक सत्यापन** — किसी भी लिखने से पहले 31 OZML नियमों की जांच।
- **हेडलेस रेंडर** — `-jobpath` के माध्यम से कंप्रेसर को `.motn` टेम्पलेट सबमिट करें — किसी GUI की आवश्यकता नहीं है।
- **FCP प्रकाशन** — किसी भी पैरामीटर पर "FCP पर प्रकाशित करें" मार्कर को चालू/बंद करें।

> **महत्वपूर्ण**: कभी भी बंडल किए गए ऐप्पल टेम्पलेट्स को न बदलें। हमेशा पहले `motion_template_clone` का उपयोग करें।

## उपकरण (10)

| उपकरण | विवरण |
|------|-------------|
| `motion_app_open` | मोशन खोलें (केवल फ़ाइल-ओपन हैंडऑफ़; कोई ऐप्पलस्क्रिप्ट इंटरफेस नहीं) |
| `motion_app_running` | जांचें कि मोशन चल रहा है या नहीं। |
| `motion_open` | मोशन में एक `.motn` टेम्पलेट या प्रोजेक्ट खोलें। |
| `motion_template_inspect` | एक टेम्पलेट को पार्स करें और उसका OZML सारांश और पैरामीटर सूची लौटाएं। |
| `motion_template_set_param` | मोशन टेम्पलेट में एक पैरामीटर का मान बदलें। |
| `motion_template_edit_text` | दिखाई देने वाले टेक्स्ट सामग्री को संपादित करें (CDATA + ग्लाइफ़ सूची + स्टाइल रन)। |
| `motion_template_validate` | 31 OZML संरचनात्मक नियमों के विरुद्ध सत्यापन करें। |
| `motion_template_clone` | परिवर्तन करने से पहले एक टेम्पलेट को एक नए पथ पर कॉपी करें। |
| `motion_render_via_compressor` | कंप्रेसर `-jobpath` के माध्यम से एक `.motn` टेम्पलेट को हेडलेस रूप से रेंडर करें। |
| `motion_publish_to_fcp` | एक टेम्पलेट पैरामीटर पर "FCP पर प्रकाशित करें" मार्कर को चालू/बंद करें। |

## उदाहरण

एक बंडल किए गए टेम्पलेट को क्लोन करें, एक टेक्स्ट पैरामीटर सेट करें, सत्यापित करें और हेडलेस रूप से रेंडर करें:

```json
// Tool: motion_template_clone
{
  "sourcePath": "/Applications/Motion Creator Studio.app/Contents/Resources/Templates.localized/Compositions.localized/Atmospheric.localized/Atmospheric-Lower Third.localized/Atmospheric-Lower Third.motn",
  "destPath": "/projects/csos-showcase/motion/lower-third.motn"
}

// Tool: motion_template_edit_text
{
  "templatePath": "/projects/csos-showcase/motion/lower-third.motn",
  "paramId": "Text.0",
  "newText": "Creator Studio OS"
}

// Tool: motion_template_validate
{ "templatePath": "/projects/csos-showcase/motion/lower-third.motn" }

// Tool: motion_render_via_compressor
{
  "templatePath": "/projects/csos-showcase/motion/lower-third.motn",
  "outputPath": "/projects/csos-showcase/out/lower-third.mov",
  "settingName": "Apple ProRes 4444"
}
```

## `@creator-studio-os/fcp` के साथ संगत।

```json
// Tool: fcp_bind_motion_param — discover parameters for FCP binding
{ "templatePath": "/projects/csos-showcase/motion/lower-third.motn" }

// Tool: motion_publish_to_fcp — expose a parameter in FCP's inspector
{
  "templatePath": "/projects/csos-showcase/motion/lower-third.motn",
  "paramId": "Text.0",
  "publish": true
}
```

## रिकवरी प्रोफाइल

```typescript
import { recovery } from "@creator-studio-os/motion";
// recovery.app === "motion"
```

## macOS आवश्यकता

`@creator-studio-os/motion` केवल macOS के लिए है (`"os": ["darwin"]`)। टेम्पलेट निरीक्षण और परिवर्तन के लिए किसी चल रहे ऐप की आवश्यकता नहीं है। हेडलेस रेंडर के लिए क्रिएटर स्टूडियो सदस्यता से कंप्रेसर की आवश्यकता होती है।

---

[मुख्य README](../../README.md) · [परिवर्तन लॉग](../../CHANGELOG.md) · [सुरक्षा](../../SECURITY.md)
