<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.md">English</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# ```hindi
@creator-studio-os/fcp

> क्रिएटर स्टूडियो ओएस के लिए फाइनल कट प्रो टूल — FCPXML 1.14 का निर्माण, DTD सत्यापन, फाइनल कट प्रो में आयात, और एप्पलस्क्रिप्ट लाइब्रेरी का निरीक्षण।

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-97%25-brightgreen.svg" alt="Coverage 97%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

यह [क्रिएटर स्टूडियो ओएस](../../README.md) के एमसीपी नियंत्रण प्रणाली का हिस्सा है, जो एप्पल क्रिएटर स्टूडियो ऐप्स के लिए है।

---

## इंस्टॉल करें

```bash
npm install @creator-studio-os/fcp
```

इसके लिए फाइनल कट प्रो (क्रिएटर स्टूडियो या स्टैंडअलोन) और macOS 13 या उससे ऊपर की आवश्यकता है।

## यह पैकेज क्या करता है

फाइनल कट प्रो का एप्पलस्क्रिप्ट इंटरफ़ेस केवल **रीड-ओनली** है — आप लाइब्रेरी और मेटाडेटा का निरीक्षण कर सकते हैं, लेकिन आप एप्पलस्क्रिप्ट के माध्यम से टाइमलाइन नहीं बना सकते। समर्थित निर्माण पथ FCPXML आयात है।

`@creator-studio-os/fcp` एक पुल का काम करता है: JSON विनिर्देशों के रूप में टाइमलाइन बनाएं, FCPXML 1.14 (या 1.13) बनाएं और सत्यापित करें, डिस्क पर लिखें, और फाइनल कट प्रो में आयात को ट्रिगर करें — यह सब एक ही कमांड में।

## उपकरण (22)

| उपकरण | विवरण |
|------|-------------|
| `fcp_project_list` | डेटा निर्देशिका में परियोजनाओं की सूची बनाएं |
| `fcp_project_create` | मानक सबडायरेक्टरी लेआउट के साथ एक परियोजना निर्देशिका बनाएं |
| `fcp_project_info` | परियोजना मेटाडेटा और हल किए गए पथ पढ़ें |
| `fcp_fcpxml_build` | JSON विनिर्देश से टाइमलाइन बनाएं — क्लिप, शीर्षक, ट्रांज़िशन, ऑडियो |
| `fcp_fcpxml_validate` | बंडल किए गए DTD (`xmllint`) के विरुद्ध FCPXML को सत्यापित करें |
| `fcp_fcpxml_write` | एक FCPXML दस्तावेज़ को एक परियोजना की `fcp/` निर्देशिका में लिखें |
| `fcp_fcpxml_import` | फाइनल कट प्रो में एक FCPXML फ़ाइल खोलें |
| `fcp_fcpxml_build_write_import` | एक ही कमांड में बनाएं, सत्यापित करें, लिखें और आयात करें |
| `fcp_library_list` | फाइनल कट प्रो में खुली लाइब्रेरी की सूची बनाएं |
| `fcp_library_events` | एक खुली लाइब्रेरी के अंदर मौजूद इवेंट की सूची बनाएं |
| `fcp_event_projects` | एक इवेंट के अंदर मौजूद परियोजनाओं की सूची बनाएं |
| `fcp_project_metadata` | सीक्वेंस मेटाडेटा (अवधि, फ्रेम दर, टाइमकोड प्रारूप) पढ़ें |
| `fcp_safety_compound` | उन प्राथमिक-स्पाइन क्लिप ओवरलैप की जांच करें जो अंतर्निहित कंपाउंड क्लिप का कारण बनते हैं |
| `fcp_safety_captions` | फाइनल कट प्रो के लिए आवश्यक प्रारूप में कैप्शन भूमिका असाइनमेंट की जांच करें |
| `fcp_safety_anchors` | लेनों में शीर्षक एंकर टकराव का पता लगाएं |
| `fcp_app_open` | फाइनल कट प्रो खोलें |
| `fcp_app_activate` | फाइनल कट प्रो को सामने लाएं |
| `fcp_app_running` | जांच करें कि क्या फाइनल कट प्रो वर्तमान में चल रहा है |
| `fcp_bind_motion_param` | एक मोशन टेम्पलेट से प्रकाशित पैरामीटर पढ़ें |
| `fcp_effects_catalog` | मोशन टेम्पलेट्स निर्देशिकाओं में घूमें और सभी प्रभावों की एक सूची प्राप्त करें |
| `fcp_round_trip_diff` | दो FCPXML दस्तावेज़ों की तुलना करें; फाइनल कट प्रो के 12 ज्ञात राउंड-ट्रिप ट्रांसफ़ॉर्म का पता लगाएं |
| `fcp_round_trip_capture` | एक FCP लाइब्रेरी बंडल के अंदर से FCPXML निकालें |

## उदाहरण

एक टाइमलाइन बनाएं और एक ही कमांड में आयात करें:

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

## FCPXML बिल्डर

```typescript
import { buildFCPXML, validateFCPXML } from "@creator-studio-os/fcp";

const xml = buildFCPXML(spec);           // returns FCPXML string
const { valid, output } = validateFCPXML(xml);  // runs xmllint against bundled DTD
```

## macOS आवश्यकता

`@creator-studio-os/fcp` केवल macOS के लिए है (`"os": ["darwin"]`)। DTD सत्यापन Xcode कमांड लाइन टूल से `xmllint` का उपयोग करता है। बंडल किया गया DTD फाइनल कट प्रो ऐप बंडल से `FCPXMLv1_14.dtd` है।

---

[मुख्य README](../../README.md) · [परिवर्तन लॉग](../../CHANGELOG.md) · [FCPXML संदर्भ](../../docs/reference/fcpxml.md)
```
