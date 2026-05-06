<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.md">English</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# ```hindi
@creator-studio-os/logic

> क्रिएटर स्टूडियो ओएस के लिए लॉजिक प्रो टूल — लाइफसाइकिल प्रबंधन और `.logicx` प्रोजेक्ट फ़ाइल खोलने की सुविधा।

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-100%25-brightgreen.svg" alt="Coverage 100%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

यह [क्रिएटर स्टूडियो ओएस](../../README.md) के एमसीपी कंट्रोल प्लेन का हिस्सा है, जो एप्पल क्रिएटर स्टूडियो ऐप्स के लिए है।

---

## इंस्टॉल करें

```bash
npm install @creator-studio-os/logic
```

इसके लिए लॉजिक प्रो (क्रिएटर स्टूडियो) और macOS 13 या उससे ऊपर का संस्करण आवश्यक है।

## यह पैकेज क्या करता है

लॉजिक प्रो **कोई एप्पलस्क्रिप्ट इंटरफ़ेस** प्रदान नहीं करता है — कोई sdef डिक्शनरी नहीं है। `@creator-studio-os/logic` उन कार्यों को संभालता है जो संभव हैं: लॉजिक को लॉन्च करना, यह जांचना कि यह चल रहा है या नहीं, और `open -b com.apple.logic10` के माध्यम से `.logicx` प्रोजेक्ट फ़ाइलों को खोलना। लॉजिक जीयूआई में खुलने के बाद आगे की स्वचालन प्रक्रिया उपयोगकर्ता पर निर्भर है।

## उपकरण (3)

| उपकरण | विवरण |
|------|-------------|
| `logic_app_open` | लॉजिक प्रो खोलें (यदि पहले से चल रहा है तो कोई प्रभाव नहीं)। |
| `logic_app_running` | जांचें कि लॉजिक प्रो चल रहा है या नहीं। |
| `logic_open` | एक `.logicx` प्रोजेक्ट फ़ाइल खोलें — लॉजिक लॉन्च होगा और इसे खोलेगा। |

## उदाहरण

```typescript
import { registerLogicTools } from "@creator-studio-os/logic";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "csos", version: "2.0.0" });
registerLogicTools(server);
```

एक लॉजिक प्रोजेक्ट खोलें:

```json
// Tool: logic_open
{ "path": "/projects/csos-showcase/audio/session.logicx" }
```

## रिकवरी प्रोफाइल

```typescript
import { recovery } from "@creator-studio-os/logic";
// recovery.app === "logic"
// recovery.badStatePattern === null  (no bad-state detection for Logic)
```

## macOS आवश्यकता

`@creator-studio-os/logic` केवल macOS के लिए है (`"os": ["darwin"]`)। लॉजिक प्रो आवश्यक है; यह एप्पल क्रिएटर स्टूडियो सदस्यता के हिस्से के रूप में उपलब्ध है।

---

[मुख्य README](../../README.md) · [परिवर्तन लॉग](../../CHANGELOG.md) · [सुरक्षा](../../SECURITY.md)
```
