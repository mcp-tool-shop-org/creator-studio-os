<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.md">English</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# @creator-studio-os/protocols

क्रिएटर स्टूडियो ओएस के लिए क्रॉस-ऐप कंपोज़िशन प्रोटोकॉल — ब्रांड-डेक-मिनिमल और स्टीम-ट्रेलर-मिनिमल ऑर्केस्ट्रेशन पाइपलाइन।

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-85%25-brightgreen.svg" alt="Coverage 85%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

यह [क्रिएटर स्टूडियो ओएस](../../README.md) एमसीपी कंट्रोल प्लेन का हिस्सा है, जो एप्पल क्रिएटर स्टूडियो ऐप्स के लिए है।

---

## इंस्टॉल करें

```bash
npm install @creator-studio-os/protocols
```

इसके लिए सभी आठ क्रिएटर स्टूडियो ऐप्स और macOS 13 या उससे ऊपर का संस्करण आवश्यक है।

## यह पैकेज क्या करता है

`@creator-studio-os/protocols` पूरे क्रॉस-ऐप पाइपलाइन को व्यवस्थित करता है — पिक्सेलमेटर ब्रांड कार्ड → मोशन लोअर-थर्ड रेंडर → FCPXML बिल्ड → FCP इम्पोर्ट → कंप्रेसर एन्कोड — एक ही बार में, जिसे फिर से शुरू किया जा सकता है।

प्रोटोकॉल **चरण-दर-चरण जनरेटर** हैं: प्रत्येक चरण स्वतंत्र है और `--resume <taskId>` का उपयोग करके किसी भी पूर्ण चरण से रन को फिर से शुरू किया जा सकता है।

## उपकरण (3)

| उपकरण | विवरण |
|------|-------------|
| `csos_protocol_run` | एक `ProjectV2` प्रोजेक्ट.json के खिलाफ एक क्रॉस-ऐप प्रोटोकॉल को शुरू से अंत तक चलाएं। तुरंत एक `taskId` लौटाता है; स्थिति और अंतिम चरण का सारांश देखने के लिए जांच करें। पहले से पूरे किए गए चरणों को छोड़ने के लिए `--resume <taskId>` का समर्थन करता है। |
| `csos_protocol_list` | सभी पंजीकृत प्रोटोकॉल को उनके नाम, विवरण और चरणों की संख्या के साथ सूचीबद्ध करें। |
| `csos_protocol_describe` | एक विशिष्ट प्रोटोकॉल का वर्णन करें — उद्देश्य, चरण के नाम और उपयोग के नोट्स। |

## प्रोटोकॉल

### `brand-deck-minimal` (13 चरण)

यह प्रमुख क्रॉस-ऐप पाइपलाइन है। यह एक `ProjectV2` प्रोजेक्ट.json लेता है जिसमें दृश्य परिभाषित हैं:

1. इनपुट और प्रोजेक्ट स्कीमा को मान्य करें।
2. प्रत्येक दृश्य के लिए पिक्सेलमेटर ब्रांड कार्ड बनाएं (`{{HEADLINE}}`, `{{SUBHEAD}}` टोकन)।
3. *(वैकल्पिक)* कंप्रेसर के माध्यम से प्रत्येक दृश्य के लिए हेडरलेस मोशन लोअर-थर्ड ओवरले रेंडर करें।
4. दृश्यों की सूची से FCPXML 1.14 टाइमलाइन बनाएं।
5. बंडल किए गए DTD के खिलाफ FCPXML को मान्य करें।
6. FCPXML को `<project>/fcp/` में लिखें।
7. फाइनल कट प्रो में इम्पोर्ट करें।
8. कंप्रेसर को मुख्य एन्कोडिंग जॉब सबमिट करें।
9. कंप्रेसर को सोशल एन्कोडिंग जॉब सबमिट करें।
10. टर्मिनल स्थिति तक एन्कोडिंग की प्रगति को ट्रैक करें।
11. सत्यापित करें कि आउटपुट फाइलें मौजूद हैं।
12. एक लॉग एंट्री लिखें।
13. अंतिम चरण का सारांश लौटाएं।

### `steam-trailer-minimal`

`brand-deck-minimal` (v1.7.7+) के लिए एक उपनाम। समान चरण अनुक्रम।

## उदाहरण

```typescript
import { registerProtocolTools } from "@creator-studio-os/protocols";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "csos", version: "2.0.0" });
registerProtocolTools(server);
```

पूरे पाइपलाइन को चलाएं:

```json
// Tool: csos_protocol_run
{
  "protocol": "brand-deck-minimal",
  "projectPath": "/projects/csos-showcase/project.json"
}
// → { "taskId": "task_abc123", "status": "running" }

// Poll for completion:
// Tool: csos_protocol_describe — for step names
// Tool: csos_protocol_run with --resume <taskId> — to resume after interruption
```

## फिर से शुरू करने की क्षमता

प्रत्येक चरण अपने आउटपुट को प्रोजेक्ट लॉग में रिकॉर्ड करता है। यदि कोई रन बाधित होता है (कंप्रेसर क्रैश, FCP इम्पोर्ट में रुकावट), तो अंतिम पूर्ण चरण से फिर से शुरू करें:

```json
// Tool: csos_protocol_run
{
  "protocol": "brand-deck-minimal",
  "projectPath": "/projects/csos-showcase/project.json",
  "resume": "task_abc123"
}
```

## प्रोग्रामेटिक उपयोग

```typescript
import { runProtocol, listProtocols, STEP_NAMES } from "@creator-studio-os/protocols";

for await (const step of runProtocol({ protocol: "brand-deck-minimal", projectPath: "..." })) {
  console.log(step.name, step.status);
}
```

## macOS आवश्यकता

`@creator-studio-os/protocols` केवल macOS के लिए है (`"os": ["darwin"]`)। सभी आठ क्रिएटर स्टूडियो ऐप्स इंस्टॉल होने चाहिए और उन्हें ऑटोमेशन अनुमति दी जानी चाहिए।

---

[मुख्य README](../../README.md) · [परिवर्तन लॉग](../../CHANGELOG.md) · [सुरक्षा](../../SECURITY.md)
