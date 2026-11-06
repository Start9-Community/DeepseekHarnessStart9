<p align="center">
  <img src="icon.svg" alt="DeepSeek Harness Logo" width="21%">
</p>

# DeepSeek Harness on StartOS

> Everything not listed in this document should behave the same as upstream
> DeepSeek Harness. If a feature, setting, or behavior is not mentioned here,
> the upstream documentation is accurate and fully applicable — see the
> Documentation section of `instructions.md` for links.

DeepSeek Harness is DeepSeek's own coding agent: a chat interface over a model that can read, write and execute code in a workspace directory. This package runs its browser interface (`dsh web`, from the `@deepseek-ai/dsh` npm package) as a StartOS service, with the workspace and the conversation history on the server's own volume. Upstream's own sign-in assumes the browser runs on the same machine, so the package puts the interface behind the OS reverse proxy's basic-auth gate and signs the browser in to `dsh` behind it. That also makes the in-app **Settings → Models** page usable, which is where any model provider is added: DeepSeek, a catalog provider such as OpenAI or Anthropic, or any self-hosted OpenAI-compatible server. Model servers packaged for StartOS on the same box (llama.cpp, vLLM, Ollama) are wired in by the **Connect Model Servers** action instead, with no address or key to type, and become optional dependencies while connected.

- **Upstream repo:** <https://github.com/deepseek-ai/deepseek-harness>
- **Wrapper repo:** <https://github.com/Start9-Community/DeepseekHarnessStart9>

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

One image, built from this repository's `Dockerfile` — upstream publishes to npm, not to a container registry, so there is no image to pull.

| Property      | Value                                                    |
| ------------- | -------------------------------------------------------- |
| Image         | Built here, on a Debian-based Node base image            |
| Architectures | x86_64, aarch64                                          |
| Contents      | `@deepseek-ai/dsh` installed globally, plus `bubblewrap` |

| Subcontainer | Purpose                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------- |
| `webui`      | `dsh web` plus the relay in front of it — the only subcontainer, and the one to `attach` to |

Two facts about the image are easy to break. `dsh`'s native pieces arrive as platform `optionalDependencies` — `@deepseek-ai/node-addon-system` (the shell sandbox's Landlock launcher), ripgrep for the agent's search tools, and sharp for image input — and the build fails unless each one loads, so a bump that loses one is caught at build time rather than at first use. And `dsh` is published only as prereleases whose own dependencies are caret ranges on prereleases, so pinning it does not pin the agent's internals: two builds of the same pin can differ.

## Volume and Data Layout

`main` holds everything that persists. `startos` holds only mount points.

| Volume    | Mount Point                         | Purpose                                                                         |
| --------- | ----------------------------------- | ------------------------------------------------------------------------------- |
| `main`    | `/data`                             | All persistent state                                                            |
| `startos` | none (package side, not the daemon) | Read-only mounts of connected servers' `public` volumes, to read their API keys |

| Path               | Written by       | Contents                                                          |
| ------------------ | ---------------- | ----------------------------------------------------------------- |
| `/data/projects`   | the agent, users | Workspace root — project folders and every file the agent writes  |
| `/data/dsh`        | `dsh`            | Its profile home: sessions, settings, and its own credential file |
| `/data/store.json` | this package     | The web interface password and the connected model servers        |

Inside `/data/dsh`, model providers and other in-app settings live in `profiles/web/cordis.patch.yml` (what Settings → Models writes, and where the package keeps its `startos-*` provider routes — see [Dependencies](#dependencies)), and keys entered in the app live in `.credentials.yaml`, along with the secret that signs the browser's session cookie. Releases of `dsh` before 0.2 kept settings in `/data/dsh/settings.yaml`. `dsh` 0.2 imports that file into the profile on its first start and renames it to `settings.yaml.imported`.

Each conversation runs in a workspace folder the user picks. `dsh`'s folder picker opens on `$HOME`, so the entrypoint sets `HOME=/data/projects`. Otherwise it would open on `/root`, which isn't on the volume and is lost on every rebuild. The agent's own dotfiles (`.npm`, `.cache`, git config) land in `/data/projects` for the same reason.

## File Models

One model, `store.json`, holding only what StartOS itself needs to know.

| Model        | File               | Fields                   |
| ------------ | ------------------ | ------------------------ |
| `store.json` | `/data/store.json` | `uiPassword`, `backends` |

`uiPassword` is written only by **Set Web Interface Password**. It is read reactively by `setupInterfaces` and handed to the OS reverse proxy, never to the container. `backends` is written only by **Connect Model Servers**: one entry per connected server (keyed by package id) with the models it served when the action ran (`id`, `contextWindow` when the server reported one, `image`). `setupMain` reads it reactively, so a change restarts the daemon. Providers the user adds in Settings → Models, and their keys, belong to `dsh` alone; the package touches only routes named `startos-*`. Releases before `0.2.0-rc.2:0` also kept a DeepSeek key in `store.json` (`apiKey`, from the removed **Set DeepSeek API Key** action) and injected it as `DEEPSEEK_API_KEY`. Nothing reads it now, and the `0.2.0-rc.2:0` migration deletes it from `store.json`, so a user who relied on it re-enters the key in Settings → Models after updating.

## Dependencies

Three optional dependencies, each active only while **Connect Model Servers** has it connected (`enabled` reads `store.json` `backends`). They are model servers, not requirements: the service runs with none of them.

| Package     | Kind      | Health check | Version         | Dialed at (bridge)           | Key                                          |
| ----------- | --------- | ------------ | --------------- | ---------------------------- | -------------------------------------------- |
| `llama-cpp` | `running` | `primary`    | ≥11960:1        | host `api-key`, port 8080    | `llama-cpp:public/credentials.json` `apiKey` |
| `vllm`      | `running` | `primary`    | ≥0.23.1-rc.0:13 | host `api-multi`, port 8000  | `vllm:public/credentials.json` `apiKey`      |
| `ollama`    | `running` | `primary`    | ≥0.31.2:2       | host `api-multi`, port 11434 | none                                         |

Host ids and internal ports are imported from each package (`<id>-startos/startos/utils`), and `startos/backends.ts` is the one registry of them. Adding a server is one entry there plus its dependency description.

**How a connected server reaches `dsh`.**

1. `setupMain` resolves each server's bridge address with `sdk.host.getBridgeAddress(...).const()` (`http://10.0.3.1:<assigned port>/v1`). For a keyed server it bind-mounts that server's `public` volume read-only under the `startos` volume and reads `credentials.json` with `.const()`. So an install, an uninstall, a port change, or a key rotation restarts the daemon once, and it heals.
2. A server that is uninstalled, or has published no key yet, is left out entirely: no route and no env var.
3. Each remaining server becomes a `dsh` provider route, `startos-<id>` (for example `startos-llama-cpp`), with display name "`<Title>` (StartOS)". Its `apiKeyEnv` names `STARTOS_<ID>_API_KEY`, which carries the key. A keyless server gets `no-key-required`, because `pi-ai`'s OpenAI-compatible client refuses an empty key.
4. The routes travel to the container as JSON in `STARTOS_PROVIDERS`. Before `dsh` starts, the entrypoint runs `agent/startos-providers.mjs`, which writes them into the `llm-pi-ai` entry of `profiles/web/cordis.patch.yml`. It replaces every `startos-*` route and drops the ones no longer connected. It leaves the user's own providers, comments, and `!!js` expressions as they were, using the same YAML library and row lookup as `dsh`'s config editor. On a fresh install the profile does not exist yet, so the entrypoint first runs `dsh web --dump-config` to create it. The same script deletes every `STARTOS_*_API_KEY` ref from `/data/dsh/.credentials.yaml`, keeping comments and every other key, and leaving the file at mode 600. The Models page saves a key typed into a "(StartOS)" provider's card under that route's `apiKeyEnv`, and `dsh` resolves its credential file before the process environment. So a stale key typed there would override the injected one on every start, and chats would fail with "API key invalid" (`pi-ai` reports a 401 as an auth error). The log line `removed keys saved in the app for StartOS model servers` names the refs it deleted, never their values. A key typed while `dsh` runs takes effect immediately, because `dsh` watches the file, and it lasts until the next start.

Every route pins `compat` to `max_tokens`, a `system` role, and no `store` field, which all three servers accept. A model's context comes from the server (vLLM `max_model_len`, llama.cpp `/props` `n_ctx`), and its output cap is a quarter of that, at most 32K. Where none is reported (Ollama), the route falls back to 32K context and 8K output, not `pi-ai`'s 256K and 32K, which smaller servers refuse.

The managed routes cannot live anywhere other than the user's patch. A `--patch` overlay on `llm-pi-ai` replaces that entry's whole config. That hides the user's providers and makes the Models page refuse every save ("overridden by a home patch or command-line overlay"). A second `dsh-llm-pi-ai` entry fails to load, because each instance claims every catalog provider.

## Session Log Upload

`dsh` can attach session logs to requests it sends to the official DeepSeek API (the `dsh_session_log` field, from the `session-log-deepseek` plugin, on by default upstream). This package turns it off: before `dsh` starts, `agent/startos-providers.mjs` writes `enabled: false` to that plugin's row in `cordis.patch.yml` when the row has no `enabled` key. The **Upload Session Log when using the official model API** switch in **Settings → General** writes the same key, so a user's choice stays in place across restarts and updates. It has no effect on requests to other providers.

## Network Access and Interfaces

One interface, serving the agent's browser UI behind an authentication gate.

| Interface     | Id      | Type | Port | Description                      |
| ------------- | ------- | ---- | ---- | -------------------------------- |
| Web Interface | `webui` | ui   | 4201 | The DeepSeek Harness browser app |

The port is bound on the `webui` MultiHost and is not masked.

**Authentication is enforced by the OS reverse proxy, not by the service.** `dsh` has no login of its own — its webserver takes a host and a port and nothing else — so the binding sets `proxy.auth` to HTTP basic with username `admin` and the password from `store.json`. Requests that fail the check get `401` at the edge and never reach the container. The credential is read reactively in `setupInterfaces`, so **Set Web Interface Password** takes effect without a restart.

The gate covers both the plain-HTTP and HTTPS addresses. Prefer HTTPS: HTTP basic auth does not encrypt the credential, and a plaintext connection also exposes the conversation and workspace traffic to anyone able to observe it.

Port 4201 is a relay, not the application. `dsh web` accepts only `127.0.0.1` or `0.0.0.0` as a bind address and hard-refuses the latter, and the OS proxy dials the container's bridge address — so `agent/web-proxy.js` listens on 4201 and forwards to loopback, passing request headers through untouched apart from the sign-in and page handling below (WebSocket upgrades and SSE streams included, which is what makes replies render as they arrive).

Headers pass through because `dsh` fences its own `/api` routes on the `Host` header, and the daemon is launched with a `--trusted-host` for every authority this interface answers to, read from `sdk.host.getOwn` and refreshed when the user enables or disables an address. Rewriting `Host` to the loopback authority would also work and would need no such wiring — but it defeats the fence, which is the package's second line of defence against a hostile page in the user's browser reaching the agent.

An authority missing from that list shows up as HTTP `403` on `/api`, not as a connection error: the page loads and the app is inert. The `webui` subcontainer logs the trusted list at startup (`[webui] starting dsh web on … (trusted: …)`) — check it first.

**The relay also signs the browser in to `dsh`.** `dsh` 0.2 requires a session cookie on every request. It mints the cookie when the browser opens the token URL it prints at startup (`dsh web: http://127.0.0.1:4200/?token=…`), and the token changes on every start. The entrypoint saves that token to `/run/dsh-launch-token` (mode 600, never on `/data`) and logs the line with the token redacted. When a page navigation gets `dsh`'s `401`, the relay answers `303 → /?token=…`, `dsh` sets the cookie, and the user lands on the app. That includes a deep link, which lands on the home page: `dsh` accepts the token only on `/` and always redirects to `./` after it. A request that already carries `?token=` gets the `401` instead, so a stale token cannot loop. This happens only for a `Host` in the trusted list, because `dsh` serves its index to any `Host` and a DNS-rebinding page must not be able to read the token. The cookie lasts 30 days and survives restarts, because its signing secret is in `/data/dsh/.credentials.yaml`. The relay rewrites it from `SameSite=Strict` to `Lax`, because StartOS opens the interface from its dashboard (a cross-site navigation) and a Strict cookie set in that chain is withheld on the next hop, so the sign-in would loop.

**And it marks every page as owning the Host.** `dsh`'s browser code shows Settings, the Models page included, as memory-only and unsaveable whenever the page's hostname is not loopback. The relay inserts `<script>globalThis.__DSH_TRANSPORT__={ownsHost:true}</script>` after `<head>` in every HTML response, which is `dsh`'s own switch for "this page owns the Host". To do that it asks `dsh` for HTML uncompressed; everything else passes through, gzip included. Without this the Models page cannot add a provider. That was the reason the package used to work with DeepSeek only.

The package itself contacts only the model servers it connects: **Connect Model Servers** lists their models, and `dsh` then sends them its requests, all over the bridge. The agent is not so bounded: `dsh` ships a web-fetch tool and an MCP client, so a conversation can send it anywhere the container can reach.

## Installation and First-Run Flow

Set a password, open the interface, choose a model provider. There is no account to create.

Installing raises one task: **Set Web Interface Password**, `critical`, so the service will not start until it has run. Without a stored password the proxy would have no credential to enforce, and the agent's shell would be open to anyone who could reach the address. No model key is required by StartOS. On first open, `dsh`'s own onboarding asks for a DeepSeek key unless some provider can already serve requests, and Settings → Models adds any other provider instead.

### Local models

llama.cpp, vLLM, or Ollama on the same box: run **Connect Model Servers** while the server is running with a model loaded. Its models appear under "`<Title>` (StartOS)" in the model picker. See [Dependencies](#dependencies) for how.

Any other OpenAI-compatible server is added in Settings → Models → **Add a custom provider**, with protocol **OpenAI Chat Completions**. The base URL must be reachable from inside this service's container:

| Form                                            | Works                                                                      |
| ----------------------------------------------- | -------------------------------------------------------------------------- |
| A server elsewhere on the LAN, by its address   | Yes                                                                        |
| `http://10.0.3.1:<plain-HTTP port>/v1` (bridge) | Yes, but the port is assigned per box and not shown on Interfaces          |
| This box's own LAN IP or `.local` name          | No — refused from inside a container                                       |
| Another service's HTTPS address on this box     | No — the OS root CA is not trusted, and that port may be behind basic auth |

`<package-id>.startos` names may still resolve, but StartOS has deprecated them, so don't recommend them. `pi-ai`'s OpenAI-compatible client requires a key even when the server ignores it, so a keyless server needs any placeholder value in the key field. A "could not reach https://<LAN IP>:<port>/v1/models" error in the Models page is the LAN-address case above.

## Actions

Two. Providers other than StartOS model servers are configured in the app.

### Set Web Interface Password

Generates the credential the OS reverse proxy checks. Username is always `admin`.

- **When to run it** — at install, when the critical task demands it, and again to rotate.
- **What it changes** — `uiPassword` in `/data/store.json`.
- **Cost** — instant, and no restart: `setupInterfaces` re-reads the value and the proxy picks it up.
- **Repeat safety** — safe, but not idempotent. Each run mints a new password and the previous one stops working immediately.
- **Outputs** — the username and the password, the password masked and copyable. It is not recoverable afterwards; rotating is the only remedy for a lost one.

### Connect Model Servers

Connects installed StartOS model servers (llama.cpp, vLLM, Ollama) to `dsh` as provider routes. See [Dependencies](#dependencies).

- **Input** — a multiselect of the known servers that are installed, prefilled with the connected ones. It is disabled, with a message, when none is installed.
- **What it does** — for each checked server it resolves the bridge address and key and reads `GET /v1/models` (plus `/props` for the context size), with a 10 s timeout. Then it replaces `store.json` `backends` with the result. Unchecked servers are dropped.
- **Errors** — it writes nothing and names the server when a checked one isn't installed, hasn't published its key, doesn't answer (stopped or still starting), or lists no model.
- **Cost** — the daemon restarts, because `backends` changed.
- **When to re-run** — after changing a server's model. The model list is the one fetched at the last run, so a model added later doesn't appear until then. Address and key changes heal without it.
- **Outputs** — the connected servers and their model ids.

## Tasks

One.

| Task                         | Severity   | Raised by                       | Cleared by         |
| ---------------------------- | ---------- | ------------------------------- | ------------------ |
| `Set Web Interface Password` | `critical` | No `uiPassword` in `store.json` | Running the action |

The password task re-arms whenever the stored password is absent, so it also covers a restore from a backup taken before one was set; it blocks startup while it stands, which suspends the service's ordinary controls. Releases before `0.2.0-rc.2:0` also raised an `important` **Set DeepSeek API Key** task at install. That task and its action are gone, because DeepSeek is no longer the only provider and the app owns all model keys.

## Health Checks

One, on the daemon.

| Check   | Displayed       | Probes                                                 |
| ------- | --------------- | ------------------------------------------------------ |
| `webui` | "Web Interface" | The relay on 4201, treating its own `502` as not-ready |

Once `dsh` is up a bare request gets its sign-in `401`, which still counts as serving. Releases before `0.2.0-rc.2:0` also had a `deepseek-api` check against the key in `store.json`. It went with the action, because the package no longer holds any model key to probe.

**Web Interface** failing past its two-minute grace period means `dsh` did not come up — the relay answers on 4201 either way, which is why a bare port check would be green while the UI was broken. Read the `webui` subcontainer's logs.

## Backups and Restore

The `main` volume is copied wholesale — `sdk.Backups.ofVolumes('main')`. The `startos` volume is not backed up. It holds only mount points, so a connected server's API key never enters this service's backups. Nothing is excluded, so the backup contains the workspace, every stored conversation, and `dsh`'s own settings and credential file, which holds every model key entered in the app. Treat the backup as carrying those keys.

A restored instance is immediately usable: providers and keys come back with it. Connected model servers come back as `store.json` `backends`, and their routes are rebuilt on start from whichever of them are installed.

## Limitations and Differences

1. **Authentication is at the edge, on both HTTP and HTTPS addresses.** The OS reverse proxy checks the password before forwarding requests to the relay. Plain HTTP still exposes the credential and session traffic to network observers; use HTTPS.
2. **The agent's shell is confined to the container, not to the workspace.** `bubblewrap` and `landlock-run` are present and probe as fully functional, but the container is the boundary — all of `/data`, including the model keys and every stored conversation, is reachable from a command the agent runs.
3. **Pinning the image does not pin the agent.** Upstream ships prereleases whose own dependencies are caret ranges, so rebuilding this repository unchanged can produce an image with different agent internals.
4. **The `startos-*` routes are read-only in practice.** The Models page can edit or delete them, but the next start rewrites them from `store.json`. Their model lists are fixed at the last **Connect Model Servers** run.
5. **The working Models page leans on an upstream hook that isn't a public contract.** `__DSH_TRANSPORT__.ownsHost` exists for `dsh`'s own in-browser worker shell. If a future `dsh` moves it, Settings goes back to memory-only in the browser (providers can be "added" but vanish on reload) while everything else still works.

---

## Quick Reference for AI Consumers

```yaml
package_id: deepseek-harness
image: built from ./Dockerfile
architectures:
  - x86_64
  - aarch64
subcontainers:
  - webui # dsh web + agent/web-proxy.js
volumes:
  main: /data
  startos: package-side mount points for dependencies' public volumes (not backed up)
file_models:
  - /data/store.json
startos_managed_env_vars:
  - DSH_TRUSTED_HOSTS
  - STARTOS_PROVIDERS # JSON of startos-* routes; unset before dsh starts
  - STARTOS_<ID>_API_KEY # one per connected model server
dependencies: # all optional, enabled by connect-model-servers
  - llama-cpp
  - vllm
  - ollama
interfaces:
  webui: { type: ui, port: 4201 }
actions:
  - set-password
  - connect-model-servers
tasks:
  - { action: set-password, severity: critical }
model_providers: configured in-app (Settings → Models), stored in /data/dsh/profiles/web/cordis.patch.yml
startos_model_routes: startos-<package id> in that file, rewritten on every start from store.json backends
local_llm_base_url: bridge address only (http://10.0.3.1:<assigned port>/v1); never the LAN IP, .local, or <id>.startos
health_checks:
  - webui # displayed "Web Interface"
```
