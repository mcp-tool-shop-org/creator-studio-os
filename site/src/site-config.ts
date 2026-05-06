import type { SiteConfig } from '@mcptoolshop/site-theme';

export const config: SiteConfig = {
  title: 'Creator Studio OS',
  description: 'MCP control plane for Apple Creator Studio apps. Drive Final Cut Pro, Compressor, Motion, Pixelmator Pro, Logic Pro, Keynote, Pages, and Numbers from Claude — compose video deliverables from a JSON spec.',
  logoBadge: 'CS',
  brandName: 'creator-studio-os',
  repoUrl: 'https://github.com/mcp-tool-shop-org/creator-studio-os',
  npmUrl: 'https://www.npmjs.com/org/creator-studio-os',
  footerText: 'MIT Licensed — built by <a href="https://mcp-tool-shop.github.io/" style="color:var(--color-muted);text-decoration:underline">MCP Tool Shop</a>',

  hero: {
    badge: 'v2.0.1 · 10 packages · macOS only',
    headline: 'Eight Apple apps.',
    headlineAccent: 'One control plane.',
    description: 'Drive Final Cut Pro, Compressor, Motion, Pixelmator Pro, Logic Pro, Keynote, Pages, and Numbers from Claude — 153 tools across 10 published packages, 1173 tests, ≥75% coverage on every package.',
    primaryCta: { href: 'handbook/', label: 'Read the Handbook' },
    secondaryCta: { href: 'https://www.npmjs.com/org/creator-studio-os', label: 'Browse npm packages' },
    previews: [
      { label: 'Install (full CLI)', code: 'npm install -g @creator-studio-os/creator-studio-os' },
      { label: 'Install (single app)', code: 'npm install @creator-studio-os/fcp' },
      { label: 'Run protocol', code: 'creator-studio-os protocol run brand-deck-minimal \\\n  --project demo/csos-showcase/project.json' },
    ],
  },

  sections: [
    {
      kind: 'features',
      id: 'features',
      title: 'What it does',
      subtitle: '153 tools across 8 Apple Creator Studio apps — wired into cross-app composition protocols.',
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
          desc: 'All 153 tool descriptions pass semantic retrieval — tool-compass finds the right tool from natural-language intent rather than scanning the full surface on every call.',
        },
        {
          title: 'No network calls',
          desc: 'Runs entirely on-device. No telemetry, no analytics, no remote validation. DTD validation reads the bundled DTD from the FCP app bundle. macOS Automation permission gated at OS level.',
        },
      ],
    },
    {
      kind: 'data-table',
      id: 'packages',
      title: 'The 10 packages on npm',
      subtitle: 'v2.0.0 decomposed the monolith into focused, independently-versioned packages. Install only what you need.',
      columns: ['Package', 'What it does', 'Tools'],
      rows: [
        ['@creator-studio-os/creator-studio-os', 'Umbrella CLI — `creator-studio-os` binary, MCP serve, verify, smoke', '—'],
        ['@creator-studio-os/core', 'Shared runtime — AppleScript runners, project schema, ledger, errors', '1'],
        ['@creator-studio-os/fcp', 'Final Cut Pro — FCPXML 1.14 authoring, DTD validation, library introspection', '22'],
        ['@creator-studio-os/compressor', 'Compressor — headless encode with monitor JSON progress, preset binding', '15'],
        ['@creator-studio-os/motion', 'Motion — clone .motn templates, OZML edit (incl. patchSiblingText), render', '10'],
        ['@creator-studio-os/pixelmator', 'Pixelmator Pro — full sdef coverage, brand cards, layers, blend modes, ML ops', '33'],
        ['@creator-studio-os/keynote', 'Keynote — slide composition, theme binding, export to MOV/PDF, ML ops', '56'],
        ['@creator-studio-os/logic', 'Logic Pro — project automation, bounce, MIDI lane operations', '3'],
        ['@creator-studio-os/iwork-docs', 'Pages + Numbers — document automation, table I/O, export', '10'],
        ['@creator-studio-os/protocols', 'Cross-app pipelines — brand-deck-minimal, steam-trailer-minimal', '3'],
      ],
    },
    {
      kind: 'code-cards',
      id: 'usage',
      title: 'Quick start',
      cards: [
        {
          title: 'Install the full CLI',
          code: 'npm install -g @creator-studio-os/creator-studio-os\ncreator-studio-os verify',
        },
        {
          title: 'Or install just one app',
          code: '# Single-app consumers can pull in only what they need\nnpm install @creator-studio-os/fcp\nnpm install @creator-studio-os/motion\nnpm install @creator-studio-os/pixelmator',
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
