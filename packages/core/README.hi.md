<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.md">English</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="420">
</p>

# ```hindi
@creator-studio-os/core

> क्रिएटर स्टूडियो ओएस के लिए साझा रनटाइम — AppleScript रनर, प्रोजेक्ट स्कीमा, लेजर, त्रुटि प्रकार, iWork साझा ऑटोमेशन।

<p align="center">
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/coverage-89%25-brightgreen.svg" alt="Coverage 89%">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

यह [क्रिएटर स्टूडियो ओएस](../../README.md) एमसीपी कंट्रोल प्लेन का हिस्सा है, जो Apple क्रिएटर स्टूडियो ऐप्स के लिए है।

---

## इंस्टॉल करें

```bash
npm install @creator-studio-os/core
```

## यह पैकेज क्या करता है

`@creator-studio-os/core` वह रनटाइम आधार है जिसे अन्य सभी `@creator-studio-os/*` पैकेजों द्वारा साझा किया जाता है। यह निम्नलिखित प्रदान करता है:

- **AppleScript रनर** — `runAppleScript`, `runApp`, `awaitOutput`, `openApp`, `withDaemonRecovery`
- **प्रोजेक्ट स्कीमा** — `ProjectV2` ज़ोड स्कीमा, रिज़ॉल्वर और टाइप किए गए पाथ मैप
- **त्रुटि प्रणाली** — `CreatorStudioError` जिसमें संरचित `{ कोड, संदेश, संकेत }` शामिल है
- **कॉन्फ़िगरेशन** — `loadConfig()` `CREATOR_STUDIO_DATA_DIR` और सभी ऐप बंडल आईडी पढ़ता है
- **लेजर** — `<dataDir>/.csos/ledger.jsonl` पर संरचित एन्कोडिंग/प्रोजेक्ट इतिहास
- **iWork साझा** — `openDocumentInApp`, `closeDocumentInApp`, `exportDocumentInApp`, `activateApp`, `isAppRunning`

## उपकरण (1)

| उपकरण | विवरण |
|------|-------------|
| `csos_app_status` | जांच करें कि क्या कोई क्रिएटर स्टूडियो ऐप चल रहा है और ठीक से काम कर रहा है। सभी 8 ऐप्स को एक साथ जांचने के लिए `app="all"` पास करें। |

## उदाहरण

```typescript
import {
  runAppleScript,
  CreatorStudioError,
  loadConfig,
  registerStatusTool,
} from "@creator-studio-os/core";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "csos", version: "2.0.0" });
registerStatusTool(server);

// Escape user input before interpolation — always
const name = escapeAppleScriptString(userInput);
const result = await runAppleScript(`tell app "Keynote" to get name of document "${name}"`);
```

## त्रुटि प्रबंधन

सभी रनटाइम त्रुटियां `CreatorStudioError` हैं:

```typescript
import { CreatorStudioError } from "@creator-studio-os/core";

try {
  await runAppleScript(`...`);
} catch (err) {
  if (err instanceof CreatorStudioError) {
    console.error(err.code);   // "E_OSASCRIPT_FAILED", "E_AUTOMATION_DENIED", …
    console.error(err.hint);   // actionable suggestion
  }
}
```

## macOS आवश्यकता

`@creator-studio-os/core` केवल macOS के लिए है (`"os": ["darwin"]`)। AppleScript रनर `osascript` को कॉल करते हैं; `openApp` `open -b <bundleId>` का उपयोग करता है।

---

[मुख्य README](../../README.md) · [परिवर्तन लॉग](../../CHANGELOG.md) · [सुरक्षा](../../SECURITY.md)
```
