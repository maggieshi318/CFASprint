#!/usr/bin/env node

import Database from 'better-sqlite3'
import { config } from '../server/config.js'

const db = new Database(config.dbPath)

function ensureColumn(tableName, columnName, columnSql) {
  const columns = db.prepare(`PRAGMA table_info(${tableName})`).all()
  if (!columns.some((col) => col.name === columnName)) {
    db.exec(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnSql}`)
    console.log(`Added column ${tableName}.${columnName}`)
  }
}

ensureColumn('mock_sessions', 'mock_bank_id', 'TEXT')
ensureColumn('mock_sessions', 'mock_bank_label', 'TEXT')
ensureColumn('mock_sessions', 'mock_session_label', 'TEXT')

const abandoned = db
  .prepare("UPDATE mock_sessions SET status = 'abandoned' WHERE status = 'active' AND (mock_bank_id IS NULL OR mock_bank_id = '')")
  .run()
console.log(`Abandoned ${abandoned.changes} legacy active mock session(s).`)

const remaining = db.prepare("SELECT COUNT(*) AS c FROM mock_sessions WHERE status='active'").get().c
console.log(`Active sessions remaining: ${remaining}`)
