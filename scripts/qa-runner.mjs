#!/usr/bin/env node
/**
 * qa-runner.mjs — CFA Sprint 一键 QA 检查
 *
 * 用法：
 *   node scripts/qa-runner.mjs          # 本地（跳过需要服务器的检查）
 *   node scripts/qa-runner.mjs --e2e    # 含 E2E（需先启动 dev server）
 *   node scripts/qa-runner.mjs --all    # 全量（build + lint + unit + e2e）
 *   BASE_URL=https://cfasprint.com node scripts/qa-runner.mjs --e2e  # 对生产跑 E2E
 *
 * 每项检查：
 *   ✅ PASS  绿色
 *   ❌ FAIL  红色 + 简短错误摘要
 *   ⚠️  SKIP  黄色（条件跳过）
 */

import { execSync, spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dir = dirname(fileURLToPath(import.meta.url))
const ROOT   = resolve(__dir, '..')          // cfa-l1-global-app/
const BASE_URL = process.env.BASE_URL || 'http://localhost:8787'

const args    = process.argv.slice(2)
const RUN_E2E = args.includes('--e2e') || args.includes('--all')
const RUN_BUILD = args.includes('--all')   // build 较慢，默认跳过，--all 时运行

// ── ANSI 颜色 ─────────────────────────────────────────────────────────────
const GREEN  = '\x1b[32m'
const RED    = '\x1b[31m'
const YELLOW = '\x1b[33m'
const CYAN   = '\x1b[36m'
const BOLD   = '\x1b[1m'
const RESET  = '\x1b[0m'

// ── 结果收集 ──────────────────────────────────────────────────────────────
const results = []   // { label, status: 'pass'|'fail'|'skip', detail? }

function pass(label) {
  results.push({ label, status: 'pass' })
  console.log(`  ${GREEN}✅ PASS${RESET}  ${label}`)
}
function fail(label, detail = '') {
  results.push({ label, status: 'fail', detail })
  console.log(`  ${RED}❌ FAIL${RESET}  ${label}`)
  if (detail) {
    const lines = detail.trim().split('\n').slice(-8)   // 最后8行
    lines.forEach(l => console.log(`         ${RED}${l}${RESET}`))
  }
}
function skip(label, reason = '') {
  results.push({ label, status: 'skip' })
  console.log(`  ${YELLOW}⚠️  SKIP${RESET}  ${label}${reason ? `  (${reason})` : ''}`)
}

// ── 运行命令工具 ──────────────────────────────────────────────────────────
function run(cmd, opts = {}) {
  const result = spawnSync(cmd, {
    shell: true,
    cwd: ROOT,
    env: { ...process.env, FORCE_COLOR: '0' },
    timeout: opts.timeout || 120_000,
    ...opts,
  })
  return {
    ok:     result.status === 0,
    stdout: (result.stdout || '').toString(),
    stderr: (result.stderr || '').toString(),
    status: result.status,
  }
}

// ── 服务器可达性检测 ──────────────────────────────────────────────────────
async function serverReachable() {
  try {
    const res = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(4000) })
    const body = await res.json().catch(() => null)
    return res.ok && body?.status === 'ok'
  } catch {
    return false
  }
}

// ══════════════════════════════════════════════════════════════════════════
// 主流程
// ══════════════════════════════════════════════════════════════════════════
console.log(`\n${BOLD}${CYAN}CFA Sprint QA Runner${RESET}`)
console.log(`${'─'.repeat(52)}`)
console.log(`  Target : ${BASE_URL}`)
console.log(`  Mode   : ${RUN_BUILD ? 'full (build+lint+unit+e2e)' : RUN_E2E ? 'unit + e2e' : 'unit only'}`)
console.log(`${'─'.repeat(52)}\n`)

// ── 1. TypeScript + Vite build ────────────────────────────────────────────
if (RUN_BUILD) {
  console.log(`${BOLD}[1/9] Build${RESET}`)
  const r = run('npm run build', { timeout: 180_000 })
  r.ok ? pass('TypeScript + Vite build') : fail('TypeScript + Vite build', r.stderr || r.stdout)
} else {
  skip('TypeScript + Vite build', 'use --all to enable')
}

// ── 2. TypeScript type-check（快速，不产出 dist）────────────────────────
console.log(`\n${BOLD}[2/9] Type check${RESET}`)
const tc = run('npx tsc --noEmit')
tc.ok ? pass('TypeScript type check') : fail('TypeScript type check', tc.stderr || tc.stdout)

// ── 3. AI Tutor unit tests ─────────────────────────────────────────────
console.log(`\n${BOLD}[3/9] AI Tutor tests${RESET}`)
const ai = run('node --test server/aiTutor.test.mjs')
ai.ok ? pass('AI Tutor regression (aiTutor.test.mjs)') : fail('AI Tutor regression', ai.stderr || ai.stdout)

// ── 4. Practice Notes backend tests ───────────────────────────────────
console.log(`\n${BOLD}[4/9] Practice Notes backend${RESET}`)
const pnFile = resolve(ROOT, 'server/practiceNotes.test.mjs')
if (existsSync(pnFile)) {
  const r = run('node --test server/practiceNotes.test.mjs')
  r.ok ? pass('Practice Notes backend (practiceNotes.test.mjs)') : fail('Practice Notes backend', r.stderr || r.stdout)
} else {
  skip('Practice Notes backend', 'server/practiceNotes.test.mjs not found')
}

// ── 5. Founder Funnel backend tests ───────────────────────────────────
console.log(`\n${BOLD}[5/9] Founder Funnel backend${RESET}`)
const ffFile = resolve(ROOT, 'server/founderFunnel.test.mjs')
if (existsSync(ffFile)) {
  const r = run('node --test server/founderFunnel.test.mjs')
  r.ok ? pass('Founder Funnel backend (founderFunnel.test.mjs)') : fail('Founder Funnel backend', r.stderr || r.stdout)
} else {
  skip('Founder Funnel backend', 'server/founderFunnel.test.mjs not found')
}

// ── 6. Demo user seed guard ────────────────────────────────────────────
console.log(`\n${BOLD}[6/9] Demo user seed guard${RESET}`)
const dsFile = resolve(ROOT, 'server/demoUserSeed.test.mjs')
if (existsSync(dsFile)) {
  const r = run('node --test server/demoUserSeed.test.mjs')
  r.ok ? pass('Demo user seed guard') : fail('Demo user seed guard', r.stderr || r.stdout)
} else {
  skip('Demo user seed guard', 'server/demoUserSeed.test.mjs not found')
}

// ── 7. Lint ────────────────────────────────────────────────────────────
if (RUN_BUILD || args.includes('--lint')) {
  console.log(`\n${BOLD}[7/9] Lint${RESET}`)
  const lint = run('npm run lint', { timeout: 60_000 })
  lint.ok ? pass('ESLint') : fail('ESLint', lint.stdout.split('\n').slice(-20).join('\n'))
} else {
  skip('ESLint', 'use --all or --lint to enable')
}

// ── 8. Preflight (local server health check) ──────────────────────────
console.log(`\n${BOLD}[8/9] Preflight${RESET}`)
const pfReachable = await serverReachable()
if (pfReachable) {
  const pf = run(`BASE_URL=${BASE_URL} npm run preflight`)
  pf.ok ? pass(`Preflight (${BASE_URL})`) : fail(`Preflight (${BASE_URL})`, pf.stdout + pf.stderr)
} else {
  skip('Preflight', `server not reachable at ${BASE_URL} — start with: npm run dev:server`)
}

// ── 9. E2E API smoke tests ─────────────────────────────────────────────
console.log(`\n${BOLD}[9/9] E2E API smoke${RESET}`)
if (!RUN_E2E) {
  skip('E2E smoke tests', 'use --e2e or --all to enable')
} else if (!pfReachable) {
  fail('E2E smoke tests', `server not reachable at ${BASE_URL}`)
} else {
  const e2e = run(`BASE_URL=${BASE_URL} node scripts/e2e-smoke.mjs`, { timeout: 90_000 })
  e2e.ok ? pass(`E2E smoke (${BASE_URL})`) : fail('E2E smoke', e2e.stdout + e2e.stderr)
}

// ── 汇总 ──────────────────────────────────────────────────────────────────
const passed  = results.filter(r => r.status === 'pass').length
const failed  = results.filter(r => r.status === 'fail').length
const skipped = results.filter(r => r.status === 'skip').length

console.log(`\n${'═'.repeat(52)}`)
console.log(`${BOLD}  Summary${RESET}`)
console.log(`${'─'.repeat(52)}`)
console.log(`  ${GREEN}✅ PASS${RESET}  ${passed}`)
console.log(`  ${RED}❌ FAIL${RESET}  ${failed}`)
console.log(`  ${YELLOW}⚠️  SKIP${RESET}  ${skipped}`)
console.log(`${'─'.repeat(52)}`)

if (failed === 0) {
  console.log(`\n  ${GREEN}${BOLD}All checks passed — safe to ship! 🚀${RESET}\n`)
  process.exit(0)
} else {
  console.log(`\n  ${RED}${BOLD}${failed} check(s) failed — do NOT ship.${RESET}\n`)
  console.log(`  Failed items:`)
  results.filter(r => r.status === 'fail').forEach(r => {
    console.log(`    ${RED}• ${r.label}${RESET}`)
  })
  console.log()
  process.exit(1)
}
