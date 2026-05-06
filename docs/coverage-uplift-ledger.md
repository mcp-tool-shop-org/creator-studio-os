# Coverage Uplift Ledger — v2.0.0 Bar #15

All 9 publishable packages must clear **75% line** and **75% branch** before v2.0.0 ships.

## Final results (post bar #15)

| Package       | Line%  | Branch% | Tests added | Floor  |
|---------------|--------|---------|-------------|--------|
| compressor    | 95.11  |  79.00  | 82          | ✅ pass |
| core          | 89.13  |  86.56  | 68          | ✅ pass |
| fcp           | 96.64  |  91.80  | 105         | ✅ pass |
| iwork-docs    | 100.00 | 100.00  | 30          | ✅ pass |
| keynote       | 99.10  |  90.37  | 156         | ✅ pass |
| logic         | 100.00 |  90.90  | 19          | ✅ pass |
| motion        | 91.55  |  86.24  | 41          | ✅ pass |
| pixelmator    | 98.71  |  85.53  | 159         | ✅ pass |
| protocols     | 85.10  |  81.21  | 89          | ✅ pass |

**Workspace total:** 1173 tests passing, 2 skipped, 0 failing.

## Baseline (pre bar #15)

| Package       | Line%  | Branch% |
|---------------|--------|---------|
| compressor    | 37.20  |  50.00  |
| core          | 42.49  |  57.14  |
| fcp           | 40.21  |  88.00  |
| iwork-docs    |  0.00  |   0.00  |
| keynote       | 16.46  |  81.81  |
| logic         |  0.00  |  50.00  |
| motion        | 64.23  |  83.26  |
| pixelmator    | 40.97  |  70.13  |
| protocols     | 48.68  |  79.31  |

## Test files added

| File | Package | Tests |
|------|---------|-------|
| tests/compressor-tools.test.ts | compressor | 37 |
| tests/compressor-app.test.ts | compressor | 8 |
| tests/compressor-locations.test.ts | compressor | 10 |
| tests/compressor-encode-full.test.ts | compressor | 6 |
| tests/compressor-monitor-full.test.ts | compressor | 16 |
| tests/compressor-inspect-branches.test.ts | compressor | 6 |
| tests/core-status.test.ts | core | 29 |
| tests/core-iwork-shared.test.ts | core | 25 |
| tests/core-open-app.test.ts | core | 14 |
| tests/fcp-tools.test.ts | fcp | 68 |
| tests/fcp-app.test.ts | fcp | 14 |
| tests/fcp-library.test.ts | fcp | 17 |
| tests/fcp-validate.test.ts | fcp | 6 |
| tests/iwork-docs-tools.test.ts | iwork-docs | 30 |
| tests/keynote-tools.test.ts | keynote | 156 |
| tests/logic-tools.test.ts | logic | 11 |
| tests/logic-app.test.ts | logic | 8 |
| tests/motion-tools.test.ts | motion | 39 |
| tests/motion-app.test.ts | motion | 16 |
| tests/pixelmator-tools.test.ts | pixelmator | 88 |
| tests/pixelmator-app.test.ts | pixelmator | 12 |
| tests/pixelmator-ml.test.ts | pixelmator | 28 |
| tests/pixelmator-document-more.test.ts | pixelmator | 31 |
| tests/protocol-index.test.ts | protocols | 28 |
| tests/protocol-brand-deck-steps.test.ts | protocols | 44 |
| tests/protocol-brand-deck-realmode.test.ts | protocols | 17 |

## Patterns established

**makeMockServer()** — captures `server.tool()` registrations for direct handler invocation without a live MCP server.

**Leaf-module mocking** — mock `../packages/<pkg>/src/sub.js` directly, not the package barrel (`@creator-studio-os/<pkg>`). Barrel mocks don't intercept relative imports inside the package (the pixelmator-brand-card lesson).

**Two-file pattern** — packages with non-trivial `app.ts` (spawn/AppleScript logic) get a separate `*-app.test.ts` that mocks at the OS-call level, while `*-tools.test.ts` mocks `app.js` to isolate tool dispatch.
