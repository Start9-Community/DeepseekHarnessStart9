# DeepSeek Harness

An always-on AI agent service for **StartOS**, powered by the **native DeepSeek API** (`api.deepseek.com`) — unmodified, no proxies, no third-party gateways. Your API key never leaves your server.

Includes the official **DeepSeek Harness web interface** (`dsh web` from `@deepseek-ai/dsh`), a projects workspace, and full server administration from the service panel.

## Why this package exists

StartOS is the perfect home for an AI agent: always on, self-hosted, and private. This package wraps DeepSeek's official agent harness so that:

- Model traffic goes **directly from your server to `api.deepseek.com`** — no intermediary ever sees your prompts or key
- The API key lives in your service's encrypted volume, configured through StartOS's own UI
- The agent's workspace (`/data/projects`) is persistent and included in backups
- The browser interface is reachable only through your StartOS, with dsh's own browser-trust protections intact

## How it works

- **harness daemon**: Python client calling `POST https://api.deepseek.com/chat/completions` with zero middleware; health endpoint verifies your key with a real completion every cycle
- **webui daemon**: boots the official `dsh web` browser app; a small reverse proxy rewrites `Host` headers (dsh binds loopback-only by upstream design) and keeps WebSocket/SSE streams alive
- **Interface**: "DeepSeek Web UI" opens like any other StartOS service UI
- **Actions**:
  - *Configure* — set your API key (`sk-...`) and model
  - *Open Web UI* — clickable link to the interface
  - *System Administration* — sign in to your server with the StartOS master password to administer it fully from this panel

## Volumes & persistence

| Path | Purpose |
|------|---------|
| `/data/projects` | Agent workspace: project folders created from the web UI |
| `/data/dsh` | dsh profile home (sessions, settings, credentials) |
| `/data/startos-cli` | start-cli session for System Administration |
| `/data/state.json` | Agent health state |

Everything above lives in the single `main` volume and is captured by StartOS backups.

## Dependencies & limitations

- Requires a **DeepSeek API key with balance** ([platform.deepseek.com](https://platform.deepseek.com/)) — the DeepSeek API has no free tier; HTTP 402 means top up
- The bash tool runs inside dsh's sandbox (bubblewrap/landlock); model responses depend on the chosen DeepSeek model
- First boot of `dsh web` takes ~30–60 s while it initializes its profile

## Install

1. Download `deepseek-harness.s9pk` from [Releases](https://github.com/bytedevil/DeepseekHarnessStart9/releases)
2. In StartOS: **System → Sideload Service**
3. Open the service → **Actions → Configure** → paste your DeepSeek API key
4. Click **Open Web UI** (or open the **Interfaces** tab)

Full user guide: [MANUAL.md](./MANUAL.md).

## Building from source

Requires Docker with buildx (docker-container driver), Node 22+, make, git, jq, squashfs-tools-ng, and start-cli:

```bash
git clone https://github.com/bytedevil/DeepseekHarnessStart9.git
cd DeepseekHarnessStart9
# inside a StartOS packaging workspace (start-cli s9pk init-workspace):
make universal   # builds deepseek-harness.s9pk (x86_64 + aarch64)
```

CI builds every push to `main` and attaches the `.s9pk` to tag releases — see `.github/workflows/build.yml`.

## Architecture

```
agent/harness.py           # Python agent: native DeepSeek API client + health endpoint :8080
agent/webui-entrypoint.sh  # starts `dsh web` (loopback) + the HTTP/WS proxy
agent/web-proxy.js         # Host-rewriting reverse proxy exposing loopback to StartOS
Dockerfile                 # node:22-slim + python3 + @deepseek-ai/dsh + platform binaries
startos/main.ts            # two daemons: harness (python3) + webui (entrypoint)
startos/interfaces.ts      # exports the web UI as a StartOS interface
startos/actions/           # Configure, Open Web UI, System Administration
startos/fileModels/        # store.json persistence (API key lives on YOUR server)
```

The agent calls the official DeepSeek REST API with zero middleware. The web UI is the unmodified upstream `@deepseek-ai/dsh` package run as `dsh web`.

## License

MIT — see [LICENSE](./LICENSE).
