#!/usr/bin/env node
import Database from 'better-sqlite3'
import { config } from '../server/config.js'

function stripHtml(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function normalizeOptionMarkers(value) {
  return value
    .replace(/\b([ABC])\s+is\s+(Correct|Incorrect)\b/gi, '$1.$2')
    .replace(/\b([ABC])\s*[.，、,]\s*(Correct|Incorrect)\b/gi, '$1.$2')
}

function parseOptionExplanations(explanation) {
  const clean = normalizeOptionMarkers(stripHtml(explanation))
  const markers = [...clean.matchAll(/\b([ABC])\.(?:\s*(Correct|Incorrect))?\s*/gi)]
  if (markers.length < 2) return {}
  const result = {}
  for (let i = 0; i < markers.length; i += 1) {
    const letter = markers[i][1].toUpperCase()
    const start = (markers[i].index ?? 0) + markers[i][0].length
    const end = i + 1 < markers.length ? (markers[i + 1].index ?? clean.length) : clean.length
    result[letter] = clean.slice(start, end).trim()
  }
  return result
}

const db = new Database(config.dbPath)
const rows = db
  .prepare(
    `SELECT sort_order, explanation FROM questions
     WHERE topic = 'Quantitative Methods' AND tags LIKE '%pack:2026-practice%'
     ORDER BY sort_order ASC`,
  )
  .all()

let full = 0
const missing = []
for (const row of rows) {
  const parsed = parseOptionExplanations(row.explanation)
  if (parsed.A && parsed.B && parsed.C) full += 1
  else missing.push(row.sort_order)
}

console.log('QM count:', rows.length)
console.log('Sort order:', rows[0]?.sort_order, '-', rows[rows.length - 1]?.sort_order)
console.log('Full A/B/C explanations:', full, '/', rows.length)
if (missing.length) console.log('Incomplete at Lanren source (Q#' + missing.join(', Q#') + ')')
