# Motion automation

## TL;DR

Motion has **NO `.sdef`** in its bundle (verified via `find` across `Motion Creator Studio.app/`). Same posture as Compressor and Logic.

Bundle ID `com.apple.motionappApp` (post-rename — note the doubled `App`), v6.2 in Creator Studio.

## What you CAN do

- `open -b com.apple.motionappApp /path/to/Project.motn` — Motion launches and opens the .motn template / project
- System Events `is running` / `activate` for app lifecycle
- That's it for external automation

## What you CANNOT do (without UI scripting)

- Parameterize a `.motn` template programmatically (the template file format is undocumented)
- Render / export a Motion composition
- Modify objects / behaviors / publishers from outside Motion
- Read project metadata (frame size, duration, layer count)

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

## Out of scope (unless Apple changes things)

- `.motn` template authoring from JSON
- Motion → Compressor render handoff (no scripted render command)
- Real-time parameter manipulation

## Watch list

Re-check these on every Motion release:

- `find "/Applications/Motion Creator Studio.app" -name "*.sdef"` — does an sdef appear?
- Apple developer docs for Motion — does a CLI or scripting interface get announced?

Last reviewed: 2026-05-04 against Motion 6.2 (Creator Studio).
