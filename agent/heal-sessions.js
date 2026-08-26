#!/usr/bin/env node
// heal-sessions.js — realign the dsh session store before boot.
//
// dsh requires: sessions/<projectKey>/<sessionId>/session.jsonl[.zst]
// and it validates that the path where a transcript lives MATCHES the
// transcript's own header (id + cwd). Previous migrations moved files
// around without rewriting headers, which produced "corrupt session log"
// errors and a webui crash loop. This script:
//   1. reads each session's header (JSON.parse of first line; zstd
//      decompressed via the zstd binary when needed)
//   2. derives the correct project key from header.cwd (same algorithm
//      as @deepseek-ai/dsh-session-persistence-jsonl)
//   3. renames/regroups the session directory to <key>/<id>/
//   4. quarantines anything unreadable so a bad file can never block boot

const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')

const home = process.env.DSH_HOME || '/data/dsh'
const root = path.join(home, 'sessions')
const quarantine = path.join(home, 'quarantine')

function projectKey(cwd) {
  if (cwd === undefined || cwd === null) return undefined
  if (cwd.length === 0) throw new Error('cannot encode an empty project path')
  let readable = ''
  let separatorRun = false
  for (const ch of cwd) {
    if (ch === '/' || ch === '\\' || ch === ':') {
      if (!separatorRun) readable += '-'
      separatorRun = true
    } else if (ch !== '~' && /^[A-Za-z0-9._-]$/.test(ch)) {
      readable += ch
      separatorRun = false
    } else {
      readable += '~' + ch.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')
      separatorRun = false
    }
  }
  return `--${(readable.replace(/^-+/, '') || 'root').slice(0, 251)}--`
}

function readHeader(file) {
  return new Promise((resolve, reject) => {
    if (!file.endsWith('.zst') && !file.endsWith('.zstd')) {
      try {
        const line = fs.readFileSync(file, 'utf8').split('\n', 1)[0].trim()
        resolve(JSON.parse(line))
      } catch (e) {
        reject(e)
      }
      return
    }
    const child = spawn('zstd', ['-dc', file])
    let buf = Buffer.alloc(0)
    let settled = false
    const finish = (fn, v) => {
      if (settled) return
      settled = true
      try { child.kill() } catch {}
      fn(v)
    }
    child.stdout.on('data', (chunk) => {
      buf = Buffer.concat([buf, chunk])
      const nl = buf.indexOf(0x0a)
      if (nl !== -1) {
        try { finish(resolve, JSON.parse(buf.slice(0, nl).toString('utf8').trim())) }
        catch (e) { finish(reject, e) }
      } else if (buf.length > 1 << 16) {
        finish(reject, new Error('transcript header too long'))
      }
    })
    child.on('error', (e) => finish(reject, e))
    child.on('exit', (code) => {
      if (settled) return
      if (code === 0 && buf.length) {
        try { resolve(JSON.parse(buf.toString('utf8').trim())) }
        catch (e) { reject(e) }
      } else {
        reject(new Error(`zstd exited ${code}`))
      }
    })
  })
}

async function main() {
  if (!fs.existsSync(root)) return
  fs.mkdirSync(quarantine, { recursive: true })

  const groups = fs.readdirSync(root)
  for (const group of groups) {
    const groupDir = path.join(root, group)
    let st
    try { st = fs.statSync(groupDir) } catch { continue }
    if (!st.isDirectory()) continue

    for (const entry of fs.readdirSync(groupDir)) {
      const here = path.join(groupDir, entry)
      let st2
      try { st2 = fs.statSync(here) } catch { continue }
      if (!st2.isDirectory()) continue

      const files = fs.readdirSync(here).filter((f) => f.startsWith('session.'))
      if (files.length === 0) continue

      let header
      try {
        header = await readHeader(path.join(here, files[0]))
      } catch (e) {
        const q = path.join(quarantine, `${group}__${entry}`)
        console.log(`[heal] quarantined unreadable session ${group}/${entry}: ${e.message}`)
        try { fs.renameSync(here, q) } catch { fs.mkdirSync(q, { recursive: true }); for (const f of fs.readdirSync(here)) fs.renameSync(path.join(here, f), path.join(q, f)); fs.rmdirSync(here) }
        continue
      }

      const id = typeof header.id === 'string' ? header.id : null
      if (!id) {
        console.log(`[heal] session ${group}/${entry} has no header id; leaving as-is`)
        continue
      }
      const key = projectKey(header.cwd)
      const expectedGroup = key === undefined ? '_no-cwd' : key
      const target = path.join(root, expectedGroup, id)
      if (path.resolve(target) === path.resolve(here)) continue

      console.log(`[heal] realigning ${group}/${entry} -> ${expectedGroup}/${id}`)
      fs.mkdirSync(path.dirname(target), { recursive: true })
      if (fs.existsSync(target)) {
        const dup = `${target}-dup-${Date.now()}`
        console.log(`[heal] target exists; moving to ${path.basename(dup)} instead`)
        fs.renameSync(here, dup)
      } else {
        fs.renameSync(here, target)
      }
    }
  }
}

main().then(() => process.exit(0), (e) => { console.error(`[heal] fatal: ${e.message}`); process.exit(0) })
