/**
 * Minimal `.env.local` loader for CLI scripts (`tsx scripts/*.ts`).
 *
 * Next.js loads `.env.local` on its own; scripts don't. Importing this module
 * for its side effect before anything reads `process.env` keeps both paths
 * working. Existing variables always win, so it is a no-op inside Next.js.
 */
import fs from 'node:fs'
import path from 'node:path'

function load(file = '.env.local'): void {
  if (typeof window !== 'undefined') return
  try {
    const filePath = path.join(process.cwd(), file)
    if (!fs.existsSync(filePath)) return

    for (const line of fs.readFileSync(filePath, 'utf8').split('\n')) {
      const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/)
      if (!match) continue

      const [, key, rawValue] = match
      if (process.env[key] !== undefined) continue

      let value = rawValue.trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      process.env[key] = value
    }
  } catch {
    // Never let env loading break the app.
  }
}

load()
