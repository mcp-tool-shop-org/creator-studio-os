# AppleScript surface

## TL;DR

**Final Cut Pro's AppleScript dictionary is read-only.** You cannot create, modify, or delete libraries, events, projects, sequences, clips, or anything else via AppleScript. Anyone telling you otherwise is wrong, has stale info, or is using UI scripting (System Events keystrokes), which is fragile and out of scope.

## Evidence

Source of truth: `/Applications/Final Cut Pro Creator Studio.app/Contents/Resources/ProEditor.sdef` (FCP 12.2, observed 2026-05-04).

The `.sdef` declares one access group:

```xml
<access-group identifier="com.apple.FinalCut.library.inspection" access="r"/>
```

`access="r"` = read-only. Every property in every class declares `access="r"`. The only command is `get`:

```xml
<command name="get" code="coregetd" description="Get data.">
  <direct-parameter requires-access="r" .../>
</command>
```

There is no `make`, `set`, `delete`, `duplicate`, or `move` command.

## What you CAN do

Read these properties on `library`, `event`, `project`, `sequence`:

- name, id, persistent ID
- container, properties, essential properties
- on `library`: file (URL)
- on `sequence`: start time, duration, frame duration, timecode format
- on `event`: contained sequences, contained projects

That is the entire automation surface. Library/event/project enumeration and sequence metadata extraction.

## What you CANNOT do (try AppleScript-only)

- Create a library, event, or project
- Add a clip, title, marker, or any spine item to a sequence
- Modify a clip's in/out, position, or properties
- Trigger a render, share, or export (no `share` command exists)
- Switch sequences, change selection, navigate the UI
- Toggle FCP preferences

For all of those, the path is **FCPXML import** (`open -b com.apple.FinalCutApp file.fcpxml`). FCP's import flow is the authoring API.

## Bundle ID vs. app name

Use `tell application id "com.apple.FinalCutApp"` — never `tell application "Final Cut Pro"`. Reasons:

- The Creator Studio bundle renames the app to `Final Cut Pro Creator Studio.app`. The bundle ID stays `com.apple.FinalCutApp`. By bundle ID, AppleScript finds it regardless of file naming.
- App-name lookup is locale-dependent.

## Automation permission

The first time `osascript` sends an Apple Event to FCP, macOS prompts: *"&lt;your terminal/Claude&gt; wants to control 'Final Cut Pro Creator Studio'. Allowing control will provide access to documents and data in 'Final Cut Pro Creator Studio'..."* — see [`automation-permission.md`](./automation-permission.md).

## When AppleScript hangs

If `osascript` hangs against FCP, FCP is waiting on a modal dialog (e.g. an unanswered "save library" prompt). Our runner kills `osascript` after 30 seconds. Bring FCP to the front and dismiss the dialog manually.

Last reviewed: 2026-05-04 against FCP 12.2.
