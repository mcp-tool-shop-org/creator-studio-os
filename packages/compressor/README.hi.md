<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.md">English</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/compressor

> क्रिएटर स्टूडियो ओएस के लिए कंप्रेसर उपकरण — हेडलेस एन्कोडिंग, बैच जॉब, लाइव प्रगति स्ट्रीमिंग और डेमॉन रिकवरी।

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-95%25-brightgreen.svg" alt="Coverage 95%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

यह [क्रिएटर स्टूडियो ओएस](../../README.md) एमसीपी कंट्रोल प्लेन का हिस्सा है, जो ऐप्पल क्रिएटर स्टूडियो ऐप्स के लिए है।

---

## इंस्टॉल करें

```bash
npm install @creator-studio-os/compressor
```

इसके लिए कंप्रेसर (जो ऐप्पल क्रिएटर स्टूडियो का हिस्सा है) और macOS 13 या उससे ऊपर की आवश्यकता है।

## यह पैकेज क्या करता है

यह ऐप्पल कंप्रेसर को इसके कमांड-लाइन इंटरफेस (सीएलआई) के माध्यम से चलाता है (`-jobpath`, `-monitor`) — किसी भी ग्राफिकल यूजर इंटरफेस (जीयूआई) स्क्रिप्टिंग की आवश्यकता नहीं है। एन्कोडिंग जॉब सबमिट करें, लाइव प्रगति स्ट्रीम करें, `.compressorsetting` फ़ाइलों की जांच करें और डेमॉन के रुकने की स्थिति से उबरें।

## उपकरण (15)

| उपकरण | विवरण |
|------|-------------|
| `compressor_app_open` | कंप्रेसर खोलें (आइडेंटिकल; पहली बार चलाने पर खरीद अनुमति को सक्रिय करता है) |
| `compressor_app_running` | जांच करें कि क्या कंप्रेसर वर्तमान में चल रहा है |
| `compressor_encode` | सीएलआई के माध्यम से कंप्रेसर के कतार में एक सिंगल एन्कोडिंग जॉब सबमिट करें |
| `compressor_encode_project` | सीएसओएस प्रोजेक्ट-स्कोप वाले वर्कफ़्लो के लिए एन्कोडिंग-जॉब रैपर |
| `compressor_status` | किसी जॉब या बैच की स्थिति की एक बार जांच (percentComplete, timeRemaining, ...) |
| `compressor_monitor_stream` | `-monitor -format json` के माध्यम से एन्कोडिंग प्रगति स्ट्रीम करें; यह आवधिक स्टेटसफ्रेम उत्सर्जित करता है। |
| `compressor_pause` | किसी जॉब या बैच को रोकें |
| `compressor_resume` | किसी रुके हुए जॉब या बैच को फिर से शुरू करें |
| `compressor_kill` | किसी जॉब या बैच को रद्द करें |
| `compressor_wait_for` | तब तक जांच करते रहें जब तक कि कोई जॉब एक अंतिम स्थिति (पूर्ण/विफल/रद्द) तक नहीं पहुंच जाती। |
| `compressor_settings_list` | उपलब्ध एन्कोडिंग सेटिंग्स को उपलब्धता झंडों के साथ सूचीबद्ध करें |
| `compressor_settings_inspect` | एक `.compressorsetting` फ़ाइल को पार्स करें — कोडेक, बिटरेट, आयाम, एचडीआर मेटाडेटा |
| `compressor_settings_resolve` | डिस्प्ले नाम के आधार पर एक `.compressorsetting` पथ की रिवर्स-लुकअप करें |
| `compressor_locations_list` | उपलब्ध कंप्रेसर आउटपुट स्थानों की सूची बनाएं |
| `compressor_codec_availability` | रिपोर्ट करें कि इस होस्ट पर कौन से कोडेक उपलब्ध हैं |

## उदाहरण

```typescript
import { registerCompressorTools } from "@creator-studio-os/compressor";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "csos", version: "2.0.0" });
registerCompressorTools(server);
```

एक एन्कोडिंग जॉब सबमिट करें और प्रगति स्ट्रीम करें:

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

## रिकवरी

```typescript
import { recovery } from "@creator-studio-os/compressor";

// recovery.app === "compressor"
// recovery.recover() restarts the Compressor daemon if it hangs
```

`recovery` प्रोफाइल, `@creator-studio-os/core` से `withDaemonRecovery` के साथ एकीकृत है, जो डेमॉन के विफल होने पर स्वचालित रूप से पुनः आरंभ करने के लिए है।

## macOS आवश्यकता

`@creator-studio-os/compressor` केवल macOS के लिए है (`"os": ["darwin"]` `package.json` में)। कंप्रेसर सीएलआई पथ को इंस्टॉल्ड ऐप बंडल से रनटाइम पर हल किया जाता है।

---

[मुख्य README](../../README.md) · [परिवर्तन लॉग](../../CHANGELOG.md) · [सुरक्षा](../../SECURITY.md)
