<p align="center">
  <a href="README.ja.md">日本語</a> | <a href="README.zh.md">中文</a> | <a href="README.es.md">Español</a> | <a href="README.fr.md">Français</a> | <a href="README.md">English</a> | <a href="README.it.md">Italiano</a> | <a href="README.pt-BR.md">Português (BR)</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/mcp-tool-shop-org/brand/main/logos/creator-studio-os/readme.png" alt="Creator Studio OS" width="550">
</p>

<p align="center">
  <a href="https://github.com/mcp-tool-shop-org/creator-studio-os/actions/workflows/ci.yml"><img src="https://github.com/mcp-tool-shop-org/creator-studio-os/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://codecov.io/gh/mcp-tool-shop-org/creator-studio-os"><img src="https://codecov.io/gh/mcp-tool-shop-org/creator-studio-os/branch/main/graph/badge.svg" alt="Coverage"></a>
  <img src="https://img.shields.io/badge/version-2.0.0-blue.svg" alt="Version 2.0.0">
  <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="MIT License">
  <img src="https://img.shields.io/badge/platform-macOS-lightgrey.svg" alt="macOS">
</p>

# @creator-studio-os/creator-studio-os

एप्पल क्रिएटर स्टूडियो ऐप्स के लिए MCP नियंत्रण प्रणाली। क्लाउड या किसी भी MCP क्लाइंट से **फाइनल कट प्रो**, **कंप्रेसर**, **मोशन**, **पिक्सेलमेटर प्रो**, **लॉजिक प्रो**, **कीनोट**, **पेजेस** और **नंबर्स** को चलाएं।

यह पैकेज एक **मुख्य कमांड-लाइन इंटरफेस (CLI)** है - यह सभी 9 `@creator-studio-os/*` पैकेजों को एक साथ जोड़ता है और उन्हें एक ही `creator-studio-os serve` कमांड के रूप में उपलब्ध कराता है।

## इंस्टॉल करें

```bash
npm install -g @creator-studio-os/creator-studio-os
```

या npx के माध्यम से (इंस्टॉल किए बिना):

```bash
npx @creator-studio-os/creator-studio-os serve
```

## MCP क्लाइंट कॉन्फ़िगरेशन

`claude_desktop_config.json` (या समकक्ष) में जोड़ें:

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

## इसमें क्या शामिल है

| पैकेज | उपकरण | यह क्या चलाता है |
|---------|-------|----------------|
| `@creator-studio-os/core` | 1 | साझा रनटाइम, AppleScript रनर, प्रोजेक्ट स्कीमा |
| `@creator-studio-os/compressor` | 15 | हेडलेस एन्कोडिंग, बैच जॉब, लाइव प्रगति |
| `@creator-studio-os/fcp` | 22 | FCPXML 1.14 निर्माण, DTD सत्यापन, FCP इम्पोर्ट |
| `@creator-studio-os/iwork-docs` | 10 | पेजेस + नंबर्स दस्तावेज़ जीवनचक्र + निर्यात |
| `@creator-studio-os/keynote` | 56 | पूर्ण कीनोट ऑटोमेशन - स्लाइड, एमएल, निर्यात, पाइपलाइन ब्रिज |
| `@creator-studio-os/logic` | 3 | लॉजिक प्रो लॉन्च और `.logicx` प्रोजेक्ट खोलना |
| `@creator-studio-os/motion` | 10 | OZML टेम्पलेट परिवर्तन, हेडलेस रेंडर |
| `@creator-studio-os/pixelmator` | 33 | लेयर एडिटिंग, एमएल प्रभाव, ब्रांड कार्ड कंपोजिटर |
| `@creator-studio-os/protocols` | 3 | क्रॉस-ऐप ऑर्केस्ट्रेशन पाइपलाइन |

**कुल: 9 पैकेजों में 153 उपकरण।**

## क्रॉस-ऐप पाइपलाइन

मुख्य उपयोग: `csos_protocol_run` एक ही कमांड में सभी 8 ऐप्स को व्यवस्थित करता है -

1. पिक्सेलमेटर प्रो प्रत्येक दृश्य के लिए ब्रांड कार्ड बनाता है।
2. मोशन, कंप्रेसर के माध्यम से, हेडलेस रूप से लोअर-थर्ड ओवरले रेंडर करता है।
3. FCPXML 1.14 टाइमलाइन बनाई जाती है और फाइनल कट प्रो में इम्पोर्ट की जाती है।
4. कंप्रेसर अंतिम आउटपुट (ProRes मुख्य + H.264 सोशल) को एन्कोड करता है।

## कमांड-लाइन इंटरफेस (CLI)

```bash
creator-studio-os serve          # start MCP server
creator-studio-os verify         # verify xmllint + DTD round-trip
creator-studio-os smoke          # run 9-phase smoke test against live apps
creator-studio-os smoke --dry-run  # smoke test without live app calls
```

## अलग-अलग पैकेजों का उपयोग करना

प्रत्येक ऐप पैकेज अलग से प्रकाशित किया जाता है। केवल वही इंस्टॉल करें जिसकी आपको आवश्यकता है:

```bash
npm install @creator-studio-os/fcp       # Final Cut Pro only
npm install @creator-studio-os/keynote   # Keynote only
npm install @creator-studio-os/pixelmator  # Pixelmator Pro only
```

## सुरक्षा

यह पूरी तरह से डिवाइस पर चलता है - कोई नेटवर्क कॉल नहीं, कोई टेलीमेट्री नहीं, कोई क्रेडेंशियल संग्रहीत नहीं। पूर्ण खतरे का मॉडल [SECURITY.md](SECURITY.md) और [`docs/threat-model.md`](https://github.com/mcp-tool-shop-org/creator-studio-os/blob/main/docs/threat-model.md) पर उपलब्ध है।

## macOS आवश्यकता

macOS 13+ और एप्पल क्रिएटर स्टूडियो सदस्यता (या मैक ऐप स्टोर से व्यक्तिगत ऐप खरीद, जहां उपलब्ध हो)। प्रत्येक ऐप की आवश्यकताओं के लिए प्रत्येक पैकेज के README को देखें।

---

[पूर्ण दस्तावेज़](https://github.com/mcp-tool-shop-org/creator-studio-os) · [परिवर्तन लॉग](CHANGELOG.md) · [सुरक्षा](SECURITY.md)
