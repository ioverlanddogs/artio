import { readdirSync } from 'node:fs'
import { join, relative } from 'node:path'
import { spawn } from 'node:child_process'

const root = process.cwd()
const testDir = join(root, 'test')

function collectTests(dir) {
  const entries = readdirSync(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...collectTests(fullPath))
      continue
    }

    if (entry.isFile() && (entry.name.endsWith('.test.ts') || entry.name.endsWith('.test.tsx'))) {
      files.push(relative(root, fullPath))
    }
  }

  return files
}

let files = []
try {
  files = collectTests(testDir).sort()
} catch {
  console.error('Failed to read test directory:', testDir)
  process.exit(1)
}

if (files.length === 0) {
  console.error('No Node test files found matching test/**/*.test.ts or test/**/*.test.tsx')
  process.exit(1)
}

const reporterArg = process.argv.slice(2).find((arg) => arg.startsWith('--reporter='))
const reporter = reporterArg ? reporterArg.slice('--reporter='.length) : undefined

const nodeArgs = ['--import', 'tsx', '--test', ...files]
if (reporter) {
  nodeArgs.push(`--test-reporter=${reporter}`)
}

const child = spawn(process.execPath, nodeArgs, { stdio: 'inherit' })
child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }
  process.exit(code ?? 1)
})
