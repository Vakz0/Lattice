# Activity tracker

[English](activity.md) · [Français](../fr/activity.md)

Local time-tracking for Lattice with **structured software context** (browser domain, IDE file/project).

## What it does

- **Foreground-only** poll (~2 s): only the focused window is timed (a background app is not counted)
- Process + title + structured context
- **Browser**: domain (or full URL) via UI Automation (`active-url.exe`)
- **IDE**: parse Cursor / VS Code → file + project
- Classification: domain → title rules → app → Other
- Manual corrections → `feedback.jsonl` + rules (apps, titles, **domains**)
- Widget: summary, top apps / **sites** / **projects** / **Notion tasks**, now, **day-by-day history**
- Options: pause, **manual AFK** toggle, Web, titles, IDE parse, AFK auto threshold (default **60 s**), focus interrupt delay
- Categories: work, **studies**, entertainment, communication, system, other, afk — plus **custom categories** (e.g. Finance) from Options
- Manual corrections → `feedback.jsonl` + rules (apps, titles, **domains**); day segments are reclassified so the UI updates immediately
- Widget: summary with **category ring**, top apps / **sites** / **projects** / **Notion tasks**, now, **day-by-day history**
- **Notion focus sessions**: attribute time to a task + allowlist guard (see below)
- **Optional browser extension**: media playback → no auto-AFK + **watch time** per site (`extensions/lattice-media`)
- Enriched CSV / JSON export (segments + focus journal)
- **Clear…** button: deletes history (`days/`), feedback and focus journal; keeps `rules.json` / settings

## AFK

| Mode | Behavior |
| --- | --- |
| **Auto** | `powerMonitor` idle ≥ `idleThresholdSec` (default 60 s), unless the media extension reports playback |
| **Manual** | Options → **AFK** toggle (`manualAfk` in settings) — forces AFK until toggled off, ignoring mouse/keyboard and media keep-awake |

Badge **AFK manuel** in the widget header when forced.

## Custom categories

Built-in categories cannot be renamed or deleted. From **Options → Catégories** you can:

1. **Add** a category (label + color) — id is a slug of the label (`Finance` → `finance`), uniquified if needed
2. **Rename / recolor** a custom category (id stays stable so existing rules keep working)
3. **Delete** a custom category — any rule pointing at it is remapped to `other`, and today’s segments are reclassified

Stored in `rules.json` as `customCategories: [{ id, label, color }]`. Custom ids are valid anywhere an `ActivityCategory` is expected (corrections, overrides, title patterns).

## What is not counted

- **Background apps** — collector uses `GetForegroundWindow` only
- **Lattice widgets** — focus on Lattice → `ignored` segment (out of active time and tops); UI hint “Widgets Lattice — non comptés”
- **Focus under 3 s** — an app switch is committed only after **3 s** of stable focus (ignores Alt-Tab / tray flashes); AFK still switches immediately
- Extensible `ignoredApps` in `rules.json` (default: `lattice`, `lattice-desk`)

### Two dwell timers

Both use the same Options setting **Stabilité focus** (`focusOffProjectDwellSec`, default **8 s**, presets 3 / 5 / 8 / 12 / 20):

| Timer | Role |
| --- | --- |
| **Segment dwell** | Debounce normal app switches before writing a segment / updating « Maintenant » |
| **Focus off-project dwell** | During a Notion focus session: how long off-allowlist before the interrupt window |

AFK still switches immediately. Floor: 3 s (`FOCUS_OFF_PROJECT_DWELL_MIN_SEC`).

## Privacy

- **100 % local** under `%APPDATA%\lattice-desk\activity\`
- `browserDetail`: `domain` (default) | `url` | `off` — **Web:** button in the widget
- `parseIdeTitles`: parse IDE titles (default on)
- **Titles off**: no title text; `titleHash` kept
- No cloud sync, keylogging, or screenshots

## Focus sessions (Notion)

Goal: work **only** on a Notion task, time that work, and interrupt when activity leaves the allowlist.

1. Enable the **Activity** widget (`activity-tracker` service)
2. From **Tasks** / **Calendar**: context menu or detail → **Work on this**
3. The **Focus session** banner in Activity shows the task, status (active / paused / interrupted) and allowlist (apps, domains, IDE projects)
4. Off-allowlist for the configured delay (default **8 s**, `Focus: Ns` option) → interrupt window: explain what you are doing, then resume / allow for this session / **always for this task** / pause / stop
5. Notes go to `focus-journal.jsonl`; attributed time appears under **Time by task** and in exports

Initial allowlist: common work apps (`cursor`, `code`, `notion`…) + current focus context (IDE project / domain) + **saved authorizations for this task**. Lattice widgets and AFK never trigger an interrupt.

**Always for this task** stores the app / domain / video / project locally for that Notion task and reloads it on later sessions. **Allow for this session** lasts only until the session ends. Manual allowlist edits in Activity are also remembered for the task.

Attribution is **local** (Notion page id on segments). Ending a focus session also increments the mapped **Temps de travail** Number property when configured.

## Limits

- Focus only (not background apps)
- UIA URL may fail in fullscreen / if the address bar UI changes
- IDE title formats vary
- No URL without the `active-url` helper (.NET build)

## Files

| Path | Role |
| --- | --- |
| `activity/settings.json` | Pause, titles, AFK, `browserDetail`, `parseIdeTitles`, `focusOffProjectDwellSec` |
| `activity/rules.json` | Apps, title patterns, app/domain overrides, `ignoredApps`, **`customCategories`** |
| `activity/feedback.jsonl` | Corrections |
| `activity/focus-session.json` | Current focus session (restored on restart) |
| `activity/focus-journal.jsonl` | Interrupt notes (off-project explanations) |
| `activity/days/YYYY-MM-DD.jsonl` | Segments |
| `activity/days/YYYY-MM-DD.watch.json` | Extension watch time per domain |
| `activity/media-bridge.json` | Token + endpoint for the media extension (created on start) |

### Media extension (AFK + Watch)

To avoid AFK while a browser video/audio is playing **and** track watch time per site (YouTube, Netflix…):

1. Enable the Activity widget (bridge on `127.0.0.1:17384`)
2. Load `extensions/lattice-media` as an unpacked extension (Chrome / Edge / Brave)
3. Paste the `token` from `media-bridge.json` into the extension options

The widget shows a **Visionnage** (Watch) section from the extension (real playback), separate from **Top sites** (window focus).

Details: [`extensions/lattice-media/README.md`](../../extensions/lattice-media/README.md).

While `playing` is reported (heartbeat &lt; 20 s), keyboard/mouse idle **does not** trigger AFK. **Média** badge in the widget. A frame/tab that stops heartbeating (closed tab, killed page) is treated as not-playing after 20 s even if no explicit "stopped" message arrived — bounds how long a stale video can look "current".

### Useful segment fields

Base: `start`, `end`, `app`, `title`, `category`, source/confidence, idle, session, `ignored?`…

Context:

| Field | Example |
| --- | --- |
| `domain` | `github.com` |
| `urlPath` | `/org/repo` (when `browserDetail=url`) |
| `contextKind` | `browser` / `ide` / `chat` |
| `fileName` | `activity.ts` |
| `projectName` | `windows-widgets` |
| `focusSessionId` | Focus session UUID |
| `notionTaskId` | Notion page id |
| `notionTaskTitle` | Task title snapshot |

### Classification

1. idle → AFK  
2. **browser + domain** → domain rules (`userDomainOverrides` then built-in: `youtube.com` → entertainment, `github.com` → work, `khanacademy.org` → studies, `*.edu` → studies, …) — wins over a Brave/Chrome app override  
3. `userAppOverrides` (non-browser apps, or browsers with no domain)  
4. **domain** (non-browser contexts)  
5. title patterns  
6. app defaults  
7. `other`

When the media extension reports playback and the URL helper misses (e.g. fullscreen), the playing tab origin is used as `domain`.

Summaries apply **current rules** to segment categories (and corrections rewrite today’s JSONL) so Top apps / sites / the category ring update immediately after a change.

`ignored` segments and AFK are excluded from active totals and tops.
Browser segments with a known `domain` appear under **Top sites**, not **Top apps** (so “brave” is not the quota bucket).

If `active-url.exe` is missing, the domain is inferred from the window title (fallback).

## Enable

Systray → **Catalog** → **Activity**. Rebuild helpers: `npm run build:helpers`.

## Technical notes

- Service `activity-tracker`
- Win32 focus via `koffi`; URL via `tools/active-url` (WPF UI Automation)
- Lattice detection: `BrowserWindow` HWND + exe path / `ignoredApps`
- Focus dwell: `focusOffProjectDwellSec` (Options → Stabilité focus)
- Idle via `powerMonitor.getSystemIdleTime()`; optional `manualAfk`
