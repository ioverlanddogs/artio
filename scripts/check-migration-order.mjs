import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const migrationsDir = 'prisma/migrations'
const migrationFolders = readdirSync(migrationsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()

const createdTablesInRepository = new Set()
for (const folder of migrationFolders) {
  const sqlPath = join(migrationsDir, folder, 'migration.sql')
  const sql = readFileSync(sqlPath, 'utf8')
  const createMatches = [...sql.matchAll(/CREATE TABLE\s+"([^"]+)"/gi)]
  for (const match of createMatches) {
    createdTablesInRepository.add(match[1])
  }
}

const createdTables = new Set()
const errors = []

const baselineMigration = migrationFolders.find((folder) => folder.endsWith('_baseline'))
if (baselineMigration) {
  const baselineSql = readFileSync(join(migrationsDir, baselineMigration, 'migration.sql'), 'utf8')
  const baselineCreateMatches = [...baselineSql.matchAll(/CREATE TABLE\s+"([^"]+)"/gi)]
  for (const match of baselineCreateMatches) {
    createdTables.add(match[1])
  }
}

const extractReferencedTables = (line) => {
  const tableNames = []

  const referencesMatches = [...line.matchAll(/REFERENCES\s+"([^"]+)"\s*\(/gi)]
  for (const match of referencesMatches) {
    tableNames.push(match[1])
  }

  const owningTablePatterns = [
    /ALTER TABLE\s+"([^"]+)"/i,
    /UPDATE\s+"([^"]+)"/i,
    /INSERT INTO\s+"([^"]+)"/i,
    /DELETE FROM\s+"([^"]+)"/i,
    /CREATE(?: UNIQUE)? INDEX\s+"[^"]+"\s+ON\s+"([^"]+)"/i,
  ]

  for (const pattern of owningTablePatterns) {
    const match = line.match(pattern)
    if (match) {
      tableNames.push(match[1])
    }
  }

  return tableNames
}

for (const folder of migrationFolders) {
  const sqlPath = join(migrationsDir, folder, 'migration.sql')
  const sql = readFileSync(sqlPath, 'utf8')
  const lines = sql.split(/\r?\n/)

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]

    const createMatch = line.match(/CREATE TABLE\s+"([^"]+)"/i)
    if (createMatch) {
      createdTables.add(createMatch[1])
    }

    const referencedTables = extractReferencedTables(line)
    for (const referencedTable of referencedTables) {
      if (!createdTablesInRepository.has(referencedTable)) {
        continue
      }

      if (!createdTables.has(referencedTable)) {
        errors.push(`${folder}/migration.sql:${i + 1} references table "${referencedTable}" before it is created in migration order`)
      }
    }
  }
}

if (errors.length > 0) {
  console.error('Migration ordering check failed:\n')
  for (const error of errors) {
    console.error(`- ${error}`)
  }
  process.exit(1)
}

console.log(`Migration ordering check passed for ${migrationFolders.length} migration(s).`)
