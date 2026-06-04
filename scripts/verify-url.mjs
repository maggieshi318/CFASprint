#!/usr/bin/env node
const login = await fetch('http://127.0.0.1:8787/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'candidate@example.com', password: 'password123' }),
})
const { token } = await login.json()
const url = 'http://127.0.0.1:8787/api/questions?pack=2026-practice&topic=Quantitative%20Methods'
const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
const questions = await res.json()
console.log('URL:', url)
console.log('Count:', questions.length)
if (questions[0]) {
  console.log('Q1:', questions[0].los)
  console.log('Stem:', questions[0].stem.slice(0, 75))
}
