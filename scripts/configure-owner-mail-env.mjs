import { readFile } from 'node:fs/promises'
import { randomBytes } from 'node:crypto'
import { spawn } from 'node:child_process'

const config = JSON.parse(await readFile(new URL('../.local/google-owner.json', import.meta.url), 'utf8'))
for (const [key, value] of Object.entries({ ...config, CRON_SECRET: randomBytes(32).toString('hex') })) {
  if (!['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','GOOGLE_REFRESH_TOKEN','CRON_SECRET'].includes(key) || typeof value !== 'string' || !value) throw new Error('Unexpected credential configuration')
  await new Promise((resolve, reject) => {
    const child = spawn('npx', ['--yes', 'vercel@61.1.0', 'env', 'add', key, 'production', '--sensitive'], { cwd: new URL('../', import.meta.url), stdio: ['pipe', 'ignore', 'pipe'] })
    // Never echo provider output: CLI failures can include a submitted value.
    child.stderr.resume()
    child.stdin.end(value)
    child.on('error', reject)
    child.on('exit', code => code === 0 ? resolve() : reject(new Error(`Could not configure ${key}; inspect environment names, not secret values`)))
  })
  console.log(`Configured ${key} for production`)
}
