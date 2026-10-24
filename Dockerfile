FROM node:22-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates bubblewrap \
    && rm -rf /var/lib/apt/lists/*

# dsh's native pieces arrive as platform optionalDependencies: the shell
# sandbox's landlock launcher (node-addon-system), ripgrep for the search
# tools, and sharp for image input. Fail the build if any is missing rather
# than ship an agent whose tools break at first use.
RUN set -eux; \
    npm install -g @deepseek-ai/dsh@0.2.1-rc.3; \
    cd "$(npm root -g)/@deepseek-ai/dsh/node_modules"; \
    node --input-type=module -e "await import('@deepseek-ai/node-addon-system/landlock-run'); await import('@deepseek-ai/node-addon-system/flock')"; \
    node -e "require('sharp')"; \
    test -x "$(node -p "require('@vscode/ripgrep').rgPath")"

WORKDIR /app

# startos-providers.mjs edits dsh's profile patch with the same YAML library
# dsh's config editor uses, so comments and `!!js` expressions survive.
RUN npm install --no-audit --no-fund --omit=dev yaml@2.9.1 \
    && node -e "require('yaml')"

COPY agent/web-proxy.js /app/web-proxy.js
COPY agent/startos-providers.mjs /app/startos-providers.mjs
COPY agent/webui-entrypoint.sh /app/webui-entrypoint.sh
RUN chmod +x /app/webui-entrypoint.sh

CMD ["/app/webui-entrypoint.sh"]
