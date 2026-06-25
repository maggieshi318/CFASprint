# CFA Sprint QA / Release Checklist

Last updated: 2026-06-23

Owner: QA / Release Agent

Scope: release gates for CFA Sprint product iterations before seed-user exposure. This checklist is focused on the critical paths most likely to affect 2026 Aug / Nov CFA Level I candidates.

## Release Principles

- Do not ship if login, registration, question access, practice submission, notes persistence, AI Tutor, AI Study Report, founder funnel, admin analytics, or pricing checkout is broken.
- Do not expose real secrets, JWTs, cookies, API keys, phone numbers, WhatsApp links, or private candidate data in logs, screenshots, docs, or bug reports.
- Treat `paid_user` as an explicit internal funnel signal unless a real payment record has been verified separately.
- Keep public pricing unchanged unless the founder explicitly approves a public pricing change.
- Prefer evidence over assumptions: every release note should include commands run, manual paths checked, failures found, and owner/module suggestions.

## Automated Verification Gate

Run from `D:\新建文件夹\Project 2\cfa-l1-global-app`.

| Check | Command | Pass criteria | Notes |
|---|---|---|---|
| Build | `npm run build` | TypeScript and Vite build exit 0 | Required before release |
| AI Tutor regression | `npm run test:ai` | Node test runner exits 0 | Covers AI question explanation and notes summary request shape |
| Practice notes backend | `node --test server/practiceNotes.test.mjs` | exits 0 | Covers persistence, deletion, and legacy migration |
| Founder funnel backend | `node --test server/founderFunnel.test.mjs` | exits 0 | Covers qualification, value signals, offer state, and explicit `paid_user` |
| Demo user seed guard | `node --test server/demoUserSeed.test.mjs` | exits 0 | Protects `candidate@example.com` from being reset to free on startup |
| Notes UI guard | `node --test src/pages/PracticePage.notes.test.mjs src/pages/MyNotesPage.print.test.mjs` | exits 0 | Covers save-feedback rendering and printable report affordance |
| Preflight standard | `npm run preflight` | exits 0 when local server is reachable | Dev-friendly config and `/api/health` check |
| E2E API smoke | `npm run test:e2e` | exits 0 with local server running | Covers auth, question bank, practice submit, billing dev checkout, mock exam, admin analytics, email flows, courses, messages, push |
| Lint | `npm run lint` | exits 0 or known unrelated failures are documented | Existing lint debt must be separated from current iteration risk |

## Manual Critical Path Checklist

Record evidence for each item: browser, viewport, account used, timestamp, screenshot path if visual, and any sanitized console/network errors.

### 1. Login, Registration, Invite Code

- Login works for `candidate@example.com` with the documented demo password.
- Login works for `admin@example.com` with the documented demo password.
- Invalid login shows a clear error without leaking backend details.
- Registration requires a valid invite code when invite gating is enabled.
- Valid invite code creates the intended trial or access state.
- Used invite code updates admin-side usage count and linked candidate metadata.
- Session persists after refresh and does not persist after logout.

Pass criteria: candidate reaches the study app, admin reaches analytics, and failed auth paths are clear and non-sensitive.

### 2. Question Bank Permission

- Free/trial candidate can access allowed question bank content.
- Free-tier limit behavior is clear when limits are reached.
- Full-access or upgraded candidate can access the full question bank.
- Admin-only question management endpoints and screens are blocked for non-admin users.

Pass criteria: access matches plan state, with no blank screens or accidental admin exposure.

### 3. Practice Session

- Candidate can load questions by topic and LOS filters.
- Candidate can select an answer, submit it, and see correctness plus explanation.
- Correct and incorrect submissions update stats as expected.
- Wrong questions appear in review flow.
- Favorites can be toggled and persist after refresh.
- Practice completion records founder activation where applicable.

Pass criteria: question flow works end to end and user progress is not lost.

### 4. My Notes

- Candidate can type and save a note for a practice question.
- Save success message is visible and separate from character count.
- Saved note appears on My Notes.
- Saved note survives navigation away, browser refresh, and re-login.
- Emptying a note removes it intentionally.
- Legacy local notes migrate once without duplicates.
- My Notes list handles zero notes, many notes, and topic grouping.

Pass criteria: notes are durable, visible, and do not silently disappear.

### 5. AI Tutor

- Candidate can ask AI Tutor for a question explanation after answer submission.
- Success response includes useful explanation, concept breakdown, and next-step guidance.
- AI Tutor usage records `ai_tutor_used` and contributes to `value_signal`.
- Missing provider key or upstream failure shows a clear user-facing error.
- No real provider key or prompt-sensitive payload appears in browser or server logs.

Pass criteria: helpful success path, clear failure path, no credential leakage.

### 6. AI Study Report

- Report generation requires at least one saved note.
- Report can be generated from saved notes.
- Generated report groups insights by CFA Level I topic where possible.
- Report includes overall review plan and preserves compliance disclaimers.
- Report can be printed from My Notes.
- Successful generation records `ai_study_report_generated` and `value_signal`.
- Upstream AI failure shows a clear error and does not erase notes.

Pass criteria: report is useful, notes remain intact, analytics signals update.

### 7. Founder Funnel

- Onboarding captures Aug/Nov 2026 exam window.
- Onboarding captures daily WhatsApp check-in willingness.
- Onboarding captures free-trial feedback willingness.
- Activation started is recorded once the candidate enters the intended flow.
- Practice completion, AI Tutor usage, and AI Study Report generation update funnel state.
- Admin can mark founder offer sent with USD 49 or AED 179 without changing public pricing.
- Admin can mark offer accepted, offer rejected with reason/feedback, and `paid_user`.
- `paid_user` is not inferred from AI value signal or offer accepted.

Pass criteria: funnel signals are explicit, reviewable, and do not imply real payment unless separately confirmed.

### 8. Admin Analytics

- Admin analytics loads for admin users.
- Non-admin users cannot access analytics.
- Core metrics are visible: registered candidates, practice activation, premium conversion, mock completion, founder qualified, AI Tutor used, AI Study Report generated, value signal, `paid_user`.
- Founder candidate table shows stage, exam window, qualification flags, value moments, offer state, and paid state.
- Invite code table can create and display invite codes.
- Admin actions show clear success/failure feedback.

Pass criteria: business signals needed by Ampere, Pasteur, Lorentz, and Popper are visible and permissioned.

### 9. Pricing and Checkout

- `/pricing` loads and displays current public offers.
- Checkout button calls the expected billing endpoint.
- Dev checkout behavior is clearly dev-mode only when Stripe is not configured.
- Stripe-configured checkout returns a checkout URL without exposing secret keys.
- Founder private offer is not accidentally displayed as public pricing.

Pass criteria: public pricing and payment entry are not accidentally changed by product iteration.

### 10. Mobile Basic Usability

- Login, dashboard, practice, My Notes, AI Study Report, pricing, and admin analytics are usable at 390px width.
- Navigation is reachable without horizontal scrolling.
- Text in buttons and cards does not overlap or clip.
- Practice answer controls, notes textarea, AI Tutor controls, and checkout buttons are tappable.
- AI Study Report and analytics tables remain readable or scroll intentionally.

Pass criteria: a seed user on a mobile browser can complete the core study loop.

## Bug Report Template

Use this format for every release-blocking or seed-user-impacting issue.

```text
Title:
Severity: P0 / P1 / P2 / P3
Owner module: auth / question-bank / practice / notes / ai-tutor / study-report / founder-funnel / admin-analytics / billing / mobile / infra
Environment:
Account used:
Viewport:

Steps to reproduce:
1.
2.
3.

Expected:

Actual:

Evidence:
- Screenshot:
- Sanitized logs:
- Command output:

Risk:

Suggested next action:
```

Severity guide:

- P0: blocks login, registration, payment, or all study access; data/security incident.
- P1: breaks a core seed-user path such as practice submit, notes persistence, AI Tutor, AI Study Report, or admin funnel visibility.
- P2: important but avoidable issue; confusing UX, partial analytics gap, mobile layout problem.
- P3: cosmetic or copy issue with no release-blocking impact.

## Release Decision Log Template

```text
Date:
Iteration under test:
Git status summary:

Automated checks:
- PASS/FAIL command:

Manual checks:
- PASS/FAIL path:

Known issues:
- Severity / owner / summary:

Release decision:
- Go / No-go / Conditional go

Lorentz follow-up required:
- 
```
