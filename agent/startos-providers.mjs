// Writes the model servers StartOS connected (STARTOS_PROVIDERS, built by
// main.ts) into the llm-pi-ai entry of dsh's profile patch, before dsh starts.
// Routes named startos-* belong to StartOS: they are rewritten on every start
// and dropped once their server is disconnected. Every other provider is the
// user's, saved by the Models page, and is left untouched — as are comments
// and `!!js` expressions, the way dsh's own config editor keeps them.
//
// It also deletes STARTOS_*_API_KEY refs from dsh's credentials file. A key
// typed into a "(StartOS)" provider card in Settings → Models is saved there
// under the route's apiKeyEnv, and dsh resolves that file before the process
// environment, so a stale copy would shadow the key main.ts injects forever.
//
// dsh uploads session logs with official DeepSeek API requests unless told not
// to. A profile with no explicit choice gets `enabled: false`; the Settings
// switch writes `enabled` to the same row, so a user's choice is kept.
//
// Usage: node startos-providers.mjs <path to cordis.patch.yml> [<path to .credentials.yaml>]
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { isMap, isScalar, isSeq, parseDocument } from 'yaml'

const ENTRY_ID = 'llm-pi-ai'
const ENTRY_NAME = '@deepseek-ai/dsh-llm-pi-ai'
const SESSION_LOG_ID = 'session-log-deepseek'
const SESSION_LOG_NAME = '@deepseek-ai/dsh-session-log-deepseek'
const PREFIX = 'startos-'

const path = process.argv[2]
const credentialsPath = process.argv[3]
const wanted = JSON.parse(process.env.STARTOS_PROVIDERS || '{}')

// The env names main.ts injects (backends.ts apiKeyEnv).
const STARTOS_KEY_REF = /^STARTOS_[A-Z0-9_]+_API_KEY$/

function dropStartosKeyRefs(file) {
  if (!existsSync(file)) return []
  const text = readFileSync(file, 'utf8')
  const creds = parseDocument(text, { intAsBigInt: true })
  // Never quote the parser's message: it embeds the offending line, a secret.
  if (creds.errors.length) throw new Error(`${file} is not valid YAML`)
  if (!isMap(creds.contents)) return []
  // dsh's layout nests refs under `refs:`; the pre-release flat layout (no
  // `version`) keeps them at the top, and dsh migrates it on its next boot.
  const section = creds.contents.has('version')
    ? creds.get('refs', true)
    : creds.contents
  if (!isMap(section)) return []
  const dropped = section.items
    .map((pair) => (isScalar(pair.key) ? pair.key.value : undefined))
    .filter((key) => typeof key === 'string' && STARTOS_KEY_REF.test(key))
  if (!dropped.length) return []
  // As dsh's own delete does: a comment above the first entry belongs to it.
  if (
    isScalar(section.items[0].key) &&
    dropped.includes(section.items[0].key.value)
  ) {
    section.commentBefore = null
  }
  for (const key of dropped) section.delete(key)
  // dsh refuses a credentials file other users can read: keep it at 0600.
  writeFileSync(`${file}.startos-tmp`, String(creds), { mode: 0o600 })
  renameSync(`${file}.startos-tmp`, file)
  return dropped
}

if (credentialsPath) {
  try {
    const dropped = dropStartosKeyRefs(credentialsPath)
    if (dropped.length) {
      console.log(
        `[startos-providers] removed keys saved in the app for StartOS model servers (StartOS supplies them): ${dropped.join(', ')}`,
      )
    }
  } catch (error) {
    console.warn(
      `[startos-providers] could not clear StartOS model-server keys from ${credentialsPath}: ${error.message}`,
    )
  }
}

const before = readFileSync(path, 'utf8')
const doc = parseDocument(before, {
  customTags: [{ tag: 'tag:yaml.org,2002:js', resolve: (value) => value }],
})
if (doc.errors.length) throw doc.errors[0]
if (!isSeq(doc.contents)) throw new Error(`${path} is not a YAML sequence`)
// dsh seeds the file as `[]`; write rows in block style, as dsh's editor does.
doc.contents.flow = false

// The row dsh's config editor writes an entry's config to.
const configRow = (id, name) =>
  doc.contents.items.findLastIndex(
    (item, i) =>
      isMap(item) &&
      doc.getIn([i, 'id']) === id &&
      !item.has('insert') &&
      (!item.has('name') || doc.getIn([i, 'name']) === name),
  )

const sessionLogRow = configRow(SESSION_LOG_ID, SESSION_LOG_NAME)
if (sessionLogRow < 0) {
  doc.add(
    doc.createNode({
      id: SESSION_LOG_ID,
      name: SESSION_LOG_NAME,
      config: { enabled: false },
    }),
  )
} else if (!doc.hasIn([sessionLogRow, 'config', 'enabled'])) {
  doc.setIn([sessionLogRow, 'config', 'enabled'], false)
}

const index = configRow(ENTRY_ID, ENTRY_NAME)

if (index < 0) {
  if (Object.keys(wanted).length) {
    doc.add(
      doc.createNode({
        id: ENTRY_ID,
        name: ENTRY_NAME,
        config: { providers: wanted },
      }),
    )
  }
} else {
  const providers = doc.getIn([index, 'config', 'providers'], true)
  if (providers !== undefined && !isMap(providers)) {
    console.warn(
      `[startos-providers] ${ENTRY_ID} providers is not a plain mapping; leaving it as it is`,
    )
  } else {
    for (const pair of providers?.items ?? []) {
      const name = String(pair.key?.value ?? pair.key)
      if (name.startsWith(PREFIX) && !(name in wanted)) {
        doc.deleteIn([index, 'config', 'providers', name])
      }
    }
    for (const [name, route] of Object.entries(wanted)) {
      doc.setIn([index, 'config', 'providers', name], doc.createNode(route))
    }
  }
}

const after = String(doc)
if (after !== before) {
  writeFileSync(`${path}.startos-tmp`, after, { mode: 0o600 })
  renameSync(`${path}.startos-tmp`, path)
}
const names = Object.keys(wanted)
console.log(
  `[startos-providers] model servers from StartOS: ${names.length ? names.join(', ') : 'none'}`,
)
