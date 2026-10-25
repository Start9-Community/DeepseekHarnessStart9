# Updating the upstream version

Upstream is [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness), released
to npm as [`@deepseek-ai/dsh`](https://www.npmjs.com/package/@deepseek-ai/dsh). This package builds its
own image and installs that CLI globally into it, so "upstream" means the npm version, not a Docker tag.

## Determining the upstream version

```sh
npm view @deepseek-ai/dsh version
```

The current pin lives in `Dockerfile`, in the `npm install -g @deepseek-ai/dsh@<version>` line.

`dsh` publishes prereleases only, and `npm view` reports the `latest` tag, so the pin is normally a
release-candidate tag. A newer candidate can sit on `next` instead: check
`npm view @deepseek-ai/dsh dist-tags` as well (0.2.1-rc.3 was on `next` while `latest` was still
0.2.1-rc.2).

## Applying the bump

- Edit the version in the `npm install -g @deepseek-ai/dsh@<version>` line in `Dockerfile`.
- Bump `version` in `startos/versions/current.ts` (it tracks the `dsh` version, e.g. `0.2.0-rc.2:0`)
  and write its `releaseNotes` for all five locales.
- Rebuild. The build fails if a native addon (`node-addon-system`, sharp, ripgrep) does not load;
  still exercise the agent's bash and grep tools before releasing.
- Re-check the two `dsh` internals the relay depends on, because neither is a public contract:
  - `dsh web` still prints `dsh web: http://…/?token=…` on startup, which the entrypoint parses.
    The `webui` log should show that line with `<redacted>`, and opening the interface should not
    stop at "dsh web authentication required".
  - The browser still honours `globalThis.__DSH_TRANSPORT__.ownsHost`
    (`packages/client/connection/src/client/index.ts`). Check that **Settings → Models → Add model
    provider** saves a provider and that it is still there after a reload.
- Check the workspace picker still opens on `/data/projects` (`HOME` in the entrypoint).
