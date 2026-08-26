# Changelog

All notable changes to the **DeepSeek Harness** StartOS package are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/); versions follow
[ExVer](https://github.com/Start9Labs/start-os/blob/master/shared-libs/crates/start-core/src/s9pk/v2/manifest.rs)
(`X.Y.Z:N` — package version : spec version).

## [0.0.5.2] — 2026-08-26

### Fixed
- **Web UI crash loop ("corrupt session log")** — definitive fix. dsh
  validates that each transcript's on-disk location matches its own header
  (`id` + `cwd`), and the 0.0.5 / 0.0.5.1 migrations moved transcripts
  without rewriting headers, so dsh refused to boot. A new startup repair
  (`heal-sessions.js`, Node) now:
  - reads each session's header with `JSON.parse` (decompressing `.zstd`
    transcripts via the bundled `zstd` binary)
  - derives the correct project key from `header.cwd` using the exact
    algorithm of `@deepseek-ai/dsh-session-persistence-jsonl`
  - realigns every session directory to `<projectKey>/<sessionId>/`,
    undoing any previous migration (verified locally against a replica of
    the failing layout)
  - quarantines unreadable transcripts so a corrupt file can never block
    boot again
- The shell-based repair from 0.0.5.1 (which mis-derived session ids) is
  removed in favor of the Node script.

## [0.0.5.1] — 2026-08-25

### Fixed
- **Web UI crash loop** introduced by the 0.0.5 session migration: that
  migration moved legacy session groups but landed artifacts *flat* inside the
  project group (`sessions/--data-projects--/session.jsonl[.zstd]` without a
  per-session directory), which dsh refuses to load ("unsupported flat-file
  layout") — the webui daemon crashed on every boot, each restart also hitting
  `EADDRINUSE` on :4201 while the old proxy lingered. The startup repair now:
  - extracts each flat artifact's session id from its transcript header and
    moves it into `<projectKey>/<sessionId>/` (the layout dsh expects)
  - quarantines unreadable artifacts to `$DSH_HOME/quarantine` so a corrupt
    file can never block the boot again
  - `zstd` added to the image to decompress compressed transcripts

## [0.0.5] — 2026-08-22

### Fixed
- **"Failed to load history: Failed to fetch (internal)"** when opening older
  chat sessions. dsh groups stored sessions by an encoded project key derived
  from the workspace root they were created in (`--data-projects--`,
  `--root--`, …). Sessions saved before the workspace moved to `/data/projects`
  sat under their old group and their history reads failed with an opaque
  internal error. The web UI supervisor now migrates every legacy session
  group into the current workspace's group at startup (verified locally), so
  old conversations load again.

## [0.0.4] — 2026-08-22

### Added
- **System Administration action** (Settings panel): sign in to your own
  StartOS server with the master password (`start-cli auth login`) and
  administer the whole server — install/update packages, change system
  settings, manage hosts, SSH, backups — from this service. The password is
  passed only to that single command invocation (never written to disk,
  config files, or logs); the derived session key persists under
  `/data/startos-cli` on the service volume.

### Changed
- Author metadata: **Pau Font Martínez**, contact `contacte@pau.fm`,
  support site now points to the contact address; PayPal donation link
  updated to the account associated with `paufont@gmail.com`.
- *(0.0.4.1 correction)* Contact email corrected to **contacte@paufont.cat**
  (site paufont.cat).

## [0.0.3] — 2026-08-22

### Fixed
- **Agent tools (bash / glob / grep) all failed inside the web UI**:
  `spawn .../landlock-run ENOENT` and "ripgrep launch failed". Root cause:
  `npm install -g` silently omits `optionalDependencies`, which is where dsh
  ships its platform binaries (`@deepseek-ai/node-addon-landlock-run-*` for
  the bash sandbox, `@vscode/ripgrep-*` for search). The image now unpacks
  both prebuilt binaries (x64 + arm64) directly into dsh's module tree at
  the exact paths its runtime resolver expects, verified at build time.
- Added `bubblewrap` — the first rung of dsh's Linux sandbox provider chain,
  preferred over landlock when present.

### Changed
- CI: `start-cli` fetched as a pinned release asset with the workflow token
  (the public installer hit GitHub API rate limits, HTTP 403).

## [0.0.2] — 2026-08-22

### Fixed
- **Realtime chat**: messages now stream live. The reverse proxy's WebSocket
  upgrade used raw-buffer surgery that broke silently; upgrades now replay
  Node's parsed headers, and Node's default `requestTimeout` (300 s) no longer
  kills long-lived streams (`requestTimeout = 0`, SSE flushed with
  `flushHeaders()`).
- **HTTP 403 on `/api/host.listDirectory`** ("Select Workspace Directory" was
  empty): `dsh web`'s browser-trust fence rejects hostname `Host:` headers,
  and StartOS exposes the service on a random external port, so port-based
  whitelisting could never match. The proxy now rewrites `Host`, `Origin` and
  `Referer` to `127.0.0.1:4200`, which dsh natively trusts; bare-hostname
  `--trusted-host` entries remain as defense in depth.

### Added
- Projects workspace: the web UI is rooted at `/data/projects` on the
  persistent volume (`mkdir -p`, mode 775) so project folders created from the
  UI survive updates and are included in backups.
- Package logo: flat whale mark in DeepSeek blue over a deep-navy gradient,
  verified legible down to ~32 px (1.6 KB SVG).
- Author credit and PayPal donation link in the manifest.

### Changed
- Release hygiene: repository history squashed to a single commit; all
  pre-release tags removed; this is the first tagged release line.

## [0.0.1] — 2026-08-21

### Added
- Initial public release.
- Native DeepSeek API agent (`agent/harness.py`) calling
  `https://api.deepseek.com/chat/completions` directly — unmodified upstream
  API, no proxies or gateways for model traffic. Health endpoint on :8080
  verifies the configured key with real completions every cycle.
- Official DeepSeek Harness web UI (`@deepseek-ai/dsh`) served on loopback and
  exposed through a TCP/HTTP forwarder on :4201, because upstream refuses to
  bind `0.0.0.0` by design (its API can execute agent tools).
- StartOS integration: two daemons (`harness`, `webui`), exported `ui`
  interface, "Configure" action (API key + model stored server-side),
  "Open Web UI" action resolving the interface URL via `sdk.host.getOwn`,
  reactive restarts on config change, health-check cooldown, i18n ×5.
- CI (GitHub Actions): universal `.s9pk` builds (x86_64 + aarch64) on push and
  tag releases using buildx docker-container driver per Start9's own recipe.

[0.0.5.2]: https://github.com/bytedevil/DeepseekHarnessStart9/releases/tag/v0.0.5.2_0
[0.0.5.1]: https://github.com/bytedevil/DeepseekHarnessStart9/releases/tag/v0.0.5.1_0
[0.0.5]: https://github.com/bytedevil/DeepseekHarnessStart9/releases/tag/v0.0.5_0
[0.0.4]: https://github.com/bytedevil/DeepseekHarnessStart9/releases/tag/v0.0.4_0
[0.0.3]: https://github.com/bytedevil/DeepseekHarnessStart9/releases/tag/v0.0.3
[0.0.2]: https://github.com/bytedevil/DeepseekHarnessStart9/releases/tag/v0.0.2
[0.0.1]: https://github.com/bytedevil/DeepseekHarnessStart9/releases/tag/v0.0.1
