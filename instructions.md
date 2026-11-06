# DeepSeek Harness

The agent this service runs can execute shell commands in its own workspace on your server. Anyone
who can open its web interface and get past the password can make it do that — so decide where you
want the interface reachable before you start using it.

## Documentation

- [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) — the upstream project's README,
  covering the agent, its tools, and its configuration.
- [DeepSeek API documentation](https://api-docs.deepseek.com/) — models, pricing, and how to create
  an API key.
- [Configure models](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/user/guide/providers.md)
  — adding other providers and custom model APIs on the Models page.

## What you get on StartOS

- **The DeepSeek Harness web interface**, where you chat with the agent and watch it work.
- **A password on the front door.** The agent has no login of its own, so StartOS asks for one before
  any request reaches it.
- **A workspace on your server** at `/data/projects` — every project folder you create, plus the files
  the agent writes, kept on your own disk and included in your backups.
- **Your chat history**, also kept on the server and backed up.
- **Your choice of model.** DeepSeek or another provider such as OpenAI or Anthropic, set up in the
  app's **Settings → Models**. Or a model you run yourself on this server with **llama.cpp**,
  **vLLM**, or **Ollama**, connected with one action.

Model requests go from your server straight to the provider you chose. Nothing sits in between.

## Getting set up

1. Run **Set Web Interface Password**. The service will not start until you do. Save what it gives
   you — the password is not shown again, and the username is always `admin`.
2. Open the **Web Interface** and enter `admin` and your password when the browser asks.
3. Choose your model:
   - **DeepSeek:** create an API key at [platform.deepseek.com](https://platform.deepseek.com/) and add
     credit (the API is paid). Paste the key when the app asks, or in **Settings → Models**.
   - **A model on this server:** see [Using a local model](#using-a-local-model).
4. Pick a workspace folder and start a conversation.

## Using DeepSeek Harness

### Web interface

Each conversation works in a workspace folder you choose. The folder picker opens on
`/data/projects` on your server — that is where your project folders live, and what your StartOS
backup captures. Keep your work there, in a folder you create with **New folder**; anything the agent
writes elsewhere in the container is lost when the service is rebuilt.

Conversations are saved too, so you can leave one and come back to it.

### Using a local model

**llama.cpp, vLLM, or Ollama on this server:**

1. Start the model server and wait until its model has loaded.
2. Run **Connect Model Servers**, tick the server, and submit. DeepSeek Harness restarts.
3. In a conversation, open the model menu and pick a model under the server's name, for example
   **llama.cpp (StartOS)**.

The server now also shows as a dependency of DeepSeek Harness, so StartOS tells you when it is
stopped. If you change the server's model later, run **Connect Model Servers** again to update the
list. Don't use the server's address from its Interfaces page in **Settings → Models**. Those
addresses can't be reached from inside DeepSeek Harness, so you get a "could not reach" error.

**A model server on another machine:**

1. In the web interface, open **Settings → Models → Add model provider → Custom model API**.
2. Fill in:
   - **Provider ID** — any short lowercase name, such as `lab`. It can't be changed later.
   - **Base URL** — the server's normal LAN address, ending in `/v1`.
   - **API protocol** — **OpenAI Chat Completions**.
   - **API key** — the server's key if it has one, otherwise anything (for example `none`). The field
     can't be left empty for this protocol.
3. Click **Fetch available models**, tick the model, click **Add selected**, then **Create provider**.
4. Pick the model from the model menu in a conversation.

### Actions

- **Set Web Interface Password** — generates a new password for the interface. Run it to rotate;
  the old one stops working straight away, and the new one takes effect without a restart.
- **Connect Model Servers** — adds the models of llama.cpp, vLLM, or Ollama on this server to
  the model menu, or removes them when you untick a server. Run it again after changing a server's
  model.

Other model providers and their keys are managed in the app, under **Settings → Models**. The
providers named "(StartOS)" belong to **Connect Model Servers**: changes you make to them in the app
are undone the next time the service starts. Leave their API key field blank. StartOS supplies the
key, and a key typed there is removed on the next start.

Session logs are not uploaded to DeepSeek unless you turn on **Upload Session Log when using the
official model API** in **Settings → General**. The setting only applies to DeepSeek's own API.

## Limitations

- **Choose the HTTPS address.** StartOS checks the password on both HTTP and HTTPS addresses, but
  plain `http://` exposes the password, conversations and workspace traffic to anyone able to
  observe the connection.
- **Hosted providers charge per request.** The agent can use a lot of tokens on a single task, so
  keep an eye on your balance with the provider.
- **Small local models struggle as agents.** The agent leans on tool calling and long context. A small
  model may answer chat but fumble file edits and commands, so pick the largest model your hardware
  runs comfortably.
