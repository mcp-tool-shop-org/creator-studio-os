<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.md">English</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# ```hindi
@creator-studio-os/iwork-docs

> क्रिएटर स्टूडियो ओएस के लिए पेजेज और नंबर्स टूल — दस्तावेज़ और स्प्रेडशीट का जीवनचक्र, बहु-प्रारूप निर्यात (पीडीएफ, वर्ड, ईपीयूबी, एक्सेल, सीएसवी)।

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-100%25-brightgreen.svg" alt="Coverage 100%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

एप्पल क्रिएटर स्टूडियो ऐप्स के लिए एमसीपी नियंत्रण परत का हिस्सा [Creator Studio OS](../../README.md)।

---

## इंस्टॉल करें

```bash
npm install @creator-studio-os/iwork-docs
```

आवश्यक: पेजेज और/या नंबर्स (एप्पल आईवर्क का हिस्सा, मैक ऐप स्टोर से मुफ्त में उपलब्ध) और macOS 13 या उच्चतर।

## यह पैकेज क्या करता है

एप्पल स्क्रिप्ट के माध्यम से एप्पल पेजेज और नंबर्स को नियंत्रित करता है — बिना ग्राफिकल यूजर इंटरफेस (जीयूआई) को छुए, विभिन्न प्रारूपों में दस्तावेज़ खोलें, बंद करें और निर्यात करें।

## उपकरण (10)

### पेजेज (5)

| उपकरण | विवरण |
|------|-------------|
| `pages_app_open` | पेजेज को सक्रिय करें |
| `pages_app_running` | जांचें कि क्या पेजेज चल रहा है |
| `pages_open` | एक पेजेज दस्तावेज़ खोलें; दस्तावेज़ का नाम वापस करें |
| `pages_close` | एक पेजेज दस्तावेज़ बंद करें (वैकल्पिक रूप से सहेजें) |
| `pages_export` | पीडीएफ, वर्ड, आरटीएफ, सादे पाठ या ईपीयूबी में निर्यात करें |

### नंबर्स (5)

| उपकरण | विवरण |
|------|-------------|
| `numbers_app_open` | नंबर्स को सक्रिय करें |
| `numbers_app_running` | जांचें कि क्या नंबर्स चल रहा है |
| `numbers_open` | एक नंबर्स दस्तावेज़ खोलें; दस्तावेज़ का नाम वापस करें |
| `numbers_close` | एक नंबर्स दस्तावेज़ बंद करें (वैकल्पिक रूप से सहेजें) |
| `numbers_export` | पीडीएफ, माइक्रोसॉफ्ट एक्सेल या सीएसवी में निर्यात करें |

## उदाहरण

```typescript
import { registerPagesTools, registerNumbersTools } from "@creator-studio-os/iwork-docs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "csos", version: "2.0.0" });
registerPagesTools(server);
registerNumbersTools(server);
```

एक पेजेज दस्तावेज़ को वर्ड में निर्यात करें:

```json
// Tool: pages_export
{
  "documentName": "Creative Brief.pages",
  "outputPath": "/projects/brief.docx",
  "format": "Word"
}
```

एक नंबर्स स्प्रेडशीट को सीएसवी में निर्यात करें:

```json
// Tool: numbers_export
{
  "documentName": "Production Log.numbers",
  "outputPath": "/projects/log.csv",
  "format": "CSV"
}
```

## पुनर्प्राप्ति प्रोफाइल

```typescript
import { pagesRecovery, numbersRecovery } from "@creator-studio-os/iwork-docs";

// pagesRecovery.app   === "pages"
// numbersRecovery.app === "numbers"
```

## macOS आवश्यकता

`@creator-studio-os/iwork-docs` केवल macOS के लिए है (`"os": ["darwin"]`)। पेजेज और नंबर्स को स्थापित किया जाना चाहिए और पहली बार चलाने पर एक्सेसिबिलिटी/ऑटोमेशन अनुमति दी जानी चाहिए।

---

[मुख्य README](../../README.md) · [परिवर्तन लॉग](../../CHANGELOG.md) · [सुरक्षा](../../SECURITY.md)
```
