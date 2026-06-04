#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import Database from 'better-sqlite3'
import { config } from '../server/config.js'
import { importQuestionsFromCsv } from '../server/csvImport.js'

const args = process.argv.slice(2)
const files = args.length ? args : ['data/sample-commercial-bank.csv']

function summarizeRow(row) {
  return { id: row.id, topic: row.topic, los: row.los }
}

function importFile(db, filePath) {
  const absolute = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath)
  if (!fs.existsSync(absolute)) {
    throw new Error(`File not found: ${absolute}`)
  }
  const csvText = fs.readFileSync(absolute, 'utf8')
  return importQuestionsFromCsv(db, csvText, summarizeRow)
}

const db = new Database(config.dbPath)
let totalImported = 0
let totalErrors = 0

console.log(`Importing into ${config.dbPath}`)

for (const file of files) {
  try {
    const result = importFile(db, file)
    totalImported += result.imported
    totalErrors += result.errors.length
    console.log(`✓ ${file} — imported ${result.imported}, errors ${result.errors.length}`)
    if (result.errors.length) {
      result.errors.slice(0, 5).forEach((err) => {
        console.log(`  line ${err.line}: ${err.reason}`)
      })
    }
  } catch (error) {
    console.error(`✗ ${file} — ${error.message || error}`)
    process.exitCode = 1
  }
}

const count = db.prepare('SELECT COUNT(*) AS count FROM questions').get().count
console.log(`Done. Total questions in bank: ${count}`)
console.log(`Batch summary: imported ${totalImported}, errors ${totalErrors}`)

if (totalErrors > 0) process.exitCode = 1
