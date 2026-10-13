import {
  backendKey,
  detectInstalled,
  discoverModels,
  KNOWN_BACKENDS,
  resolveBaseUrl,
} from '../backends'
import { StoredModel, storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  servers: Value.dynamicMultiselect(async ({ effects }) => {
    const installed = await detectInstalled(effects)
    const connected = Object.keys(
      (await storeJson.read((s) => s.backends).once()) ?? {},
    )
    return {
      name: i18n('Model servers'),
      description: i18n(
        'Model servers installed on this server. Checking one adds its models to DeepSeek Harness; unchecking one removes them. A server must be running, with a model loaded, when you connect it.',
      ),
      values: Object.fromEntries(installed.map((b) => [b.id, b.title])),
      // Every default must be one of the values.
      default: connected.filter((id) => installed.some((b) => b.id === id)),
      disabled: installed.length
        ? false
        : i18n(
            'No supported model server is installed. Install llama.cpp, vLLM, or Ollama first.',
          ),
    }
  }),
})

export const connectModelServers = sdk.Action.withInput(
  'connect-model-servers',

  {
    name: i18n('Connect Model Servers'),
    description: i18n(
      "Give the agent the models served by llama.cpp, vLLM, or Ollama on this server, with no address or key to type. Run it again after changing a server's model.",
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  },

  inputSpec,

  async ({ effects }) => ({
    servers: Object.keys(
      (await storeJson.read((s) => s.backends).once()) ?? {},
    ),
  }),

  async ({ effects, input }) => {
    const backends: Record<string, { models: StoredModel[] }> = {}
    for (const b of KNOWN_BACKENDS.filter((k) =>
      input.servers.includes(k.id),
    )) {
      const title = b.title
      const baseUrl = await resolveBaseUrl(effects, b, 'once')
      if (!baseUrl) {
        throw new Error(i18n('${title} is not installed.', { title }))
      }
      const key = await backendKey(effects, b, 'once')
      if (!key) {
        throw new Error(
          i18n(
            '${title} has not published its API key yet. Start it once, then run this again.',
            { title },
          ),
        )
      }
      const models = await discoverModels(baseUrl, key).catch(() => {
        throw new Error(
          i18n(
            '${title} is not reachable. Start it, wait until it is ready, then run this again.',
            { title },
          ),
        )
      })
      if (!models.length) {
        throw new Error(
          i18n(
            '${title} is not serving a model yet. Set one up in ${title}, then run this again.',
            { title },
          ),
        )
      }
      backends[b.id] = { models }
    }

    await storeJson.update(effects, (s) => ({
      uiPassword: '',
      ...s,
      backends,
    }))

    const connected = KNOWN_BACKENDS.filter((b) => b.id in backends)
    if (!connected.length) {
      return {
        version: '1' as const,
        title: i18n('Model Servers Disconnected'),
        message: i18n(
          'DeepSeek Harness no longer uses a model server on this server.',
        ),
        result: null,
      }
    }
    return {
      version: '1' as const,
      title: i18n('Model Servers Connected'),
      message: i18n(
        "DeepSeek Harness restarts to apply this. Then pick a model under ${providers} in the model picker. Run this again after you change a server's model.",
        {
          providers: connected.map((b) => `${b.title} (StartOS)`).join(', '),
        },
      ),
      result: {
        type: 'group' as const,
        value: connected.map((b) => ({
          type: 'single' as const,
          name: b.title,
          description: null,
          value: backends[b.id].models.map((m) => m.id).join(', '),
          masked: false,
          copyable: false,
          qr: false,
          launchable: false,
        })),
      },
    }
  },
)
