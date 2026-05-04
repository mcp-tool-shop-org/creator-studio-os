# Motion automation

## TL;DR

Motion has **NO `.sdef`** in its bundle (verified via `find` across `Motion Creator Studio.app/`). Same posture as Compressor and Logic.

**HOWEVER**: Motion's file format (OZML) **is** documented by Apple. This is the lever. See "OZML — the load-bearing fact" below.

Bundle ID `com.apple.motionappApp` (post-rename — note the doubled `App`), v6.2 in Creator Studio.

## What you CAN do

- `open -b com.apple.motionappApp /path/to/Project.motn` — Motion launches and opens the .motn template / project
- System Events `is running` / `activate` for app lifecycle
- That's it for external automation

## OZML — the load-bearing fact

Motion's `.motn` and `.moti` files are **plain-text XML in the OZML format** (currently `<ozml version="4.0">`), and Apple ships an archived but explicit reference:

- [Motion XML Programming Guide — Customizing](https://developer.apple.com/library/archive/documentation/AppleApplications/Conceptual/motion_XML_guide/Examples/Examples.html)
- [Motion XML Overview](https://developer.apple.com/library/archive/documentation/AppleApplications/Conceptual/motion_XML_guide/Overview/Overview.html)

Apple-documented external use cases include text replacement, camera-keyframe import, and media swap. The doc explicitly says the examples are "a starting point to develop your own routines or tools to automate Motion offline editing or management tasks."

Parameter shape:

```xml
<parameter name="Frame Rate" id="107" flags="64" value="29.976" />
<parameter name="Position" id="1" flags="16">
  <curve>
    <keypoint frame="0" value="..." interpolation="..."/>
  </curve>
</parameter>
```

**No public open-source `.motn` parser/generator exists on GitHub as of 2026-05-04** — OZML mutation is a genuinely novel automation lever. A `motion_template_set_param` tool (open `.motn`, mutate parameter values, save back) is feasible *today* with `xmllint` / `fast-xml-parser` and would be the first MCP-shaped offering of this capability anywhere.

## What you still CANNOT do (without UI scripting)

- Render / export a Motion composition (no `motion -render` CLI exists, confirmed across [Apple Community thread 1278096](https://discussions.apple.com/thread/1278096) and [thread 748333](https://discussions.apple.com/thread/748333) from 2008 to 2026)
- Drive Motion's UI from outside (no sdef, no AppleScript)
- Modify objects / behaviors / publishers via the running app
- Trigger render queue programmatically — the path is `cmd-E` Send to Compressor (UI scripting) or human-mediated

## Realistic v1.4 scope

`motion_*` ships only:

- `motion_app_open` — launch / activate
- `motion_app_running` — is running check
- `motion_open` — `.motn` file-open handoff

That's the entire Motion surface until Apple ships a sdef or until the .motn format gets reverse-engineered well enough to author against.

## Where Motion fits in cross-app composition

Motion's value is the **published parameters** feature: a Motion-built title or effect can expose user-editable parameters that FCP picks up automatically. So the pattern is:

1. Human builds a Motion title template with published parameters (font color, headline text, accent shape).
2. Motion saves it to `~/Movies/Motion Templates.localized/Titles/<Category>/<Name>/<Name>.motn`.
3. FCP imports the title, exposing the same parameters in its inspector.
4. **`fcp_*`** authors FCPXML that uses this title with specific parameter values via `<param>` children inside the `<title>` element.

So Motion is "human authors the template once; FCP-XML authors uses of it forever." The `motion_*` wing is a stub that lets us *open* a Motion template for human work; the real composition happens in FCP.

## Out of scope (until Apple ships render-from-CLI)

- Motion → Compressor render handoff via a single CLI call (no scripted render command)
- Real-time parameter manipulation while Motion is rendering
- Driving the Motion UI as a primary path

In scope (and prioritized for next Motion release): **OZML parameter mutation** via direct XML manipulation. See the swarm-research doc at `docs/research/2026-05-04-swarm.md`.

## Watch list

Re-check these on every Motion release:

- `find "/Applications/Motion Creator Studio.app" -name "*.sdef"` — does an sdef appear?
- Apple developer docs for Motion — does a CLI or scripting interface get announced?

Last reviewed: 2026-05-04 against Motion 6.2 (Creator Studio).
