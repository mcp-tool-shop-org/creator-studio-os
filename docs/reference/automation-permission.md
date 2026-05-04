# macOS Automation permission

## The dialog

The first time a process sends an Apple Event to FCP (or any other app) via `osascript`, macOS shows:

> "&lt;parent process&gt; wants to control 'Final Cut Pro Creator Studio'. Allowing control will provide access to documents and data in 'Final Cut Pro Creator Studio', and to perform actions within that app."

The user must click **OK**. The grant is recorded under:

`System Settings → Privacy & Security → Automation → <parent process> → Final Cut Pro Creator Studio`

## What does NOT trigger the dialog

- `open <path>` — uses LaunchServices, not Apple Events. No prompt.
- `open -a <app> <file>` — same; no prompt.
- `open -b <bundle-id> <file>` — same; no prompt.

This is why our `fcp.fcpxml.import` tool (which uses `open -b com.apple.FinalCutApp file.fcpxml`) does **not** trigger the prompt. Importing FCPXML happens entirely via the macOS file-open path.

## What DOES trigger the dialog

Any AppleScript that sends an Apple Event:

- `tell application id "com.apple.FinalCutApp" to activate`
- `tell application id "com.apple.FinalCutApp" ... get name of libraries ...`
- All `osascript -e 'tell application id "..." ...'` invocations

Our read-side tools (`fcp_library_list`, `fcp_library_events`, `fcp_event_projects`, `fcp_project_metadata`, `fcp_app_open`, `fcp_app_activate`, `fcp_app_running`) all trigger this prompt on first call.

## Parent process

The grant is recorded against the **parent process** that launched `osascript`, NOT against `osascript` itself. So:

- If you run from Terminal.app, Terminal gets the grant.
- If you run from iTerm2, iTerm2 gets the grant.
- If you run from Claude Code (the CLI), Claude Code gets the grant.
- If you run from Claude Desktop's MCP server, Claude Desktop gets the grant.

If you switch parent processes, you'll see the prompt again.

## Denied or revoked

If denied, AppleScript returns:

> "Not authorized to send Apple events to Final Cut Pro Creator Studio."

Our error path classifies this as `E_AUTOMATION_DENIED` and includes a hint pointing at the System Settings path.

## Resetting

To clear all Automation grants for a process:

```bash
tccutil reset AppleEvents <bundle-id-of-parent>
```

To clear FCP grants specifically, use the System Settings UI; there's no per-target `tccutil` form.

Last reviewed: 2026-05-04 (macOS 15.x / Darwin 25.4).
