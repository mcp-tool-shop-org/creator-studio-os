import type { SiteConfig } from '@mcptoolshop/site-theme';

export const config: SiteConfig = {
  title: 'Creator Studio OS',
  description: 'MCP control plane for Apple Creator Studio apps. Drive Final Cut Pro, Compressor, Motion, Pixelmator Pro, Logic Pro, Keynote, Pages, and Numbers from Claude — compose video deliverables from a JSON spec.',
  logoBadge: 'CS',
  brandName: 'creator-studio-os',
  repoUrl: 'https://github.com/mcp-tool-shop-org/creator-studio-os',
  npmUrl: 'https://www.npmjs.com/package/@mcptoolshop/creator-studio-os',
  footerText: 'MIT Licensed — built by <a href="https://mcp-tool-shop.github.io/" style="color:var(--color-muted);text-decoration:underline">MCP Tool Shop</a>',

  hero: {
    badge: 'v1.7.11 · macOS only',
    headline: 'Eight apps.',
    headlineAccent: 'One pipeline.',
    description: 'Drive Final Cut Pro, Compressor, Motion, Pixelmator Pro, Logic Pro, Keynote, Pages, and Numbers from Claude — compose video deliverables from a JSON spec.',
    primaryCta: { href: 'handbook/', label: 'Read the Handbook' },
    secondaryCta: { href: 'handbook/', label: 'Read the Handbook' },
    previews: [
      { label: 'Install', code: 'npm install -g @mcptoolshop/creator-studio-os' },
      { label: 'Verify', code: 'creator-studio-os verify' },
      { label: 'Run protocol', code: 'creator-studio-os protocol run brand-deck-minimal \\\n  --project demo/csos-showcase/project.json' },
    ],
  },

  sections: [
    {
      kind: 'features',
      id: 'features',
      title: 'What it does',
      subtitle: '78 tools across 8 Apple Creator Studio apps — wired into cross-app composition protocols.',
      features: [
        {
          title: 'FCPXML authoring',
          desc: 'Build FCPXML 1.14 timelines from JSON specs — assets, clips, titles, transitions, markers. Validate against the bundled DTD. Import into FCP in one command.',
        },
        {
          title: 'Headless Motion render',
          desc: 'Clone .motn templates, patch title and subhead text via OZML edit (patchSiblingText handles Apple Compositions sibling layout), render to ProRes 4444 via Compressor headlessly.',
        },
        {
          title: 'Cross-app composite',
          desc: 'brand-deck-minimal: Pixelmator brand cards + Motion ProRes 4444 lower-thirds composited via ffmpeg → Compressor final encode → ProRes MOV. 13-step idempotent pipeline with replay manifest.',
        },
        {
          title: '9/9 smoke harness',
          desc: 'Phase 0–8 smoke covers app health, Compressor encode, Motion clone+render, FCP round-trip diff, ledger, tool-compass discoverability (12 semantic queries), and protocol real-render with movEyeballGate.',
        },
        {
          title: 'Tool-compass ready',
          desc: 'All 78 tool descriptions pass semantic retrieval — tool-compass finds the right tool from natural-language intent rather than scanning all 78 on every call.',
        },
        {
          title: 'No network calls',
          desc: 'Runs entirely on-device. No telemetry, no analytics, no remote validation. DTD validation reads the bundled DTD from the FCP app bundle. macOS Automation permission gated at OS level.',
        },
      ],
    },
    {
      kind: 'code-cards',
      id: 'usage',
      title: 'Quick start',
      cards: [
        {
          title: 'Install',
          code: 'npm install -g @mcptoolshop/creator-studio-os\ncreator-studio-os verify',
        },
        {
          title: 'MCP client config',
          code: '{\n  "mcpServers": {\n    "creator-studio-os": {\n      "command": "creator-studio-os",\n      "args": ["serve"]\n    }\n  }\n}',
        },
        {
          title: 'Run the brand-deck-minimal protocol',
          code: 'creator-studio-os protocol run brand-deck-minimal \\\n  --project demo/csos-showcase/project.json\n\n# 13 steps: Pixelmator brand cards → Motion lower-thirds\n# → FCPXML → FCP import → Compressor encode → MOV',
        },
      ],
    },
  ],
};
