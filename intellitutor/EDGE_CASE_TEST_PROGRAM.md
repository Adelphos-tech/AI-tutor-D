# 🧪 IntelliTutor Edge-Case Test Program

This program packages the most failure-prone scenarios into a single checklist so a QA engineer (or developer-on-call) can validate IntelliTutor quickly but thoroughly. It complements `QUICK_TEST_GUIDE.md` (smoke coverage) and `COMPREHENSIVE_TEST_SUITE.md` (full audit) by drilling into edge cases that historically slip through.

---

## 1. Test Environment & Tools

| Item | Requirement |
| --- | --- |
| App runtime | `npm run dev` (Next.js 16) with valid `.env` |
| Database | Postgres seeded with ≥3 materials (1 READY, 1 PROCESSING, 1 ERROR) |
| Vector + AI | Pinecone index + Gemini API key; mock responses allowed for offline runs |
| Browsers | Latest Chrome + Safari (speech APIs differ) |
| Audio | Working mic + speakers for the Voice Teacher flow |
| Automation Hooks | `npm run lint` (currently failing) and optional Playwright regression suite |

---

## 2. Required Fixtures

1. **Files**: 
   - Tiny PDF (1 page), large PDF (~180 MB), DOCX with embedded images, TXT with unusual encodings.
2. **User Accounts**: Demo account with at least 5 historical conversations and starred materials.
3. **Vector Data**: One material intentionally missing embeddings to trigger fallback behavior.
4. **Network Tools**: Browser DevTools throttling & offline toggle for resilience tests.

---

## 3. Modular Edge-Case Matrix

### A. Library Experience (`src/app/library/page.tsx`)

| ID | Scenario | Steps | Expected |
| --- | --- | --- | --- |
| LIB-EC-01 | Category overflow | Seed a material with 15 categories | Buttons wrap w/out clipping; scrolling works |
| LIB-EC-02 | Empty + offline | Disconnect network before landing | Error banner or retry UI instead of silent fail |
| LIB-EC-03 | Status mismatch | Feed item with `processingStatus="READY"` | Badge reflects READY (current code uses `material.status`, causing blank badge) |
| LIB-EC-04 | Search diacritics | Query `médecine` when data uses ASCII | Search uses case-insensitive + accent-insensitive matching |
| LIB-EC-05 | Favorite toggle spam | Rapidly click favorite in dropdown | Debounced mutation; optimistic UI rolls back on failure |

### B. Upload Pipeline (`src/app/library/upload/page.tsx`, `/api/materials/upload`)

| ID | Scenario | Steps | Expected |
| --- | --- | --- | --- |
| UP-EC-01 | 0-byte file | Upload empty file | Validation stops before network call |
| UP-EC-02 | Duplicate titles | Upload file with existing title | Either append suffix or prompt user; no DB constraint error |
| UP-EC-03 | Long processing (>5 min) | Simulate slow Pinecone upserts | Progress UI keeps updating; no memory leaks |
| UP-EC-04 | Cancel midway | Click Cancel while uploading | Abort controller halts request; temp files cleaned |
| UP-EC-05 | Hash collision | Two files with same hash but different content | Secondary size check prevents skipping processing |

### C. Material Intelligence (`src/app/material/[id]/page.tsx`)

| ID | Scenario | Steps | Expected |
| --- | --- | --- | --- |
| MAT-EC-01 | Missing chapter summaries | Remove `summaryDetailed` for chapter 3 | UI shows placeholder message, not blank space |
| MAT-EC-02 | Practice question schema drift | Seed malformed `practiceQuestions` JSON | Graceful fallback + logging without breaking render |
| MAT-EC-03 | Chapter count mismatch | `chapters.length = 0` but `pageCount > 0` | Tabs still render; user prompted to reprocess |
| MAT-EC-04 | Concepts without categories | `category = null` | Bucketed under “Uncategorized” |
| MAT-EC-05 | Massive summary text (>20k chars) | Load long summary | Text container scrolls; no layout shift |

### D. Conversational Flows (`ChatInterface.tsx`, `/api/chat/route.ts`)

| ID | Scenario | Steps | Expected |
| --- | --- | --- | --- |
| CHAT-EC-01 | Citation miss | Vector search returns empty list | Model replies with “insufficient material” message |
| CHAT-EC-02 | Rapid-fire questions | Submit 5 prompts within 10 s | Rate limiter responds gracefully (429) and UI retries |
| CHAT-EC-03 | Corrupted conversation | Delete parent conversation while UI open | Hook refetches list; editor disabled |
| CHAT-EC-04 | Markdown injection | Prompt includes tables/code fences | Renderer sanitizes HTML, preserves formatting |
| CHAT-EC-05 | Streaming drop | Abort SSE mid-stream | UI shows partial answer + “resume” CTA |

### E. Voice Teacher & STT/TTS (`VoiceTeacher.tsx`, `useVoiceAssistant.ts`, `/api/stt`, `/api/tts`)

| ID | Scenario | Steps | Expected |
| --- | --- | --- | --- |
| VOICE-EC-01 | Microphone denied | Reject permissions | App surfaces unblock instructions; no hang |
| VOICE-EC-02 | Silence timeout | Stay silent for 30 s | Session times out with retry option |
| VOICE-EC-03 | STT partials spike | Send rapid interim transcripts | Hook debounces updates; UI doesn’t flicker |
| VOICE-EC-04 | TTS network loss | Drop network mid audio fetch | Playback aborts; cached segments flushed |
| VOICE-EC-05 | Session handoff | Start voice, navigate away | Cleanup stops media streams + workers |

### F. Background Scripts (`scripts/*.ts`)

| ID | Scenario | Steps | Expected |
| --- | --- | --- | --- |
| SCRIPT-EC-01 | Headless env vars | Run `vectorize-material.ts` w/out Pinecone key | Script exits with instruction, not stack trace |
| SCRIPT-EC-02 | Batch oversize | `upload-vectors-batch` > Pinecone limit | Script auto-chunks & logs progress |
| SCRIPT-EC-03 | Prisma disconnect | Kill DB mid-run | Retry logic + clear error message |

### G. Security & Resilience

- **SEC-EC-01**: XSS injection via material title → ensure escaping in `MaterialCard`.
- **SEC-EC-02**: SSRF via upload URL metadata (if feature added) → validate host allowlist.
- **SEC-EC-03**: Unauthorized material access by ID enumeration → expect 403.
- **RES-EC-01**: API rate limiting of `/api/materials/upload`.
- **RES-EC-02**: Back-pressure when Pinecone is unavailable → queue job, keep UI responsive.

### H. Performance Baselines

- **PERF-EC-01**: Library page with 200 materials loads < 2 s (use mocked fetch).
- **PERF-EC-02**: Chat round-trip < 3 s with 10k-chunk namespace.
- **PERF-EC-03**: Voice session memory stable after 15 min continuous conversation.

---

## 4. Execution Cadence

1. **Per PR / Feature**: Run related module cases + `npm run lint` (currently fails with 69 errors; see console log).  
2. **Weekly Regression**: Execute sections A–E end-to-end; capture Loom demo for Voice + Chat flows.  
3. **Pre-Release**: Full matrix including security + performance; require sign-off documented in `PRODUCTION_READY_STATUS.md`.

---

## 5. Reporting Template

```
Test Cycle: 2025-02-XX
Environment: Local / Staging
Sections Covered: LIB, UP, VOICE

Findings:
- [LIB-EC-03] ❌ Status badge blank because `material.status` is undefined (see src/app/library/page.tsx).
- [VOICE-EC-02] ⚠️ Timeout message never appears; spinner persists.

Follow-Up:
- File tickets with reproduction videos.
- Link logs (Pinecone, Gemini) where relevant.
```

---

### Immediate Action Items

1. **Fix LIB-EC-03** (`src/app/library/page.tsx` uses `material.status` instead of `material.processingStatus`; badge never shows READY/PROCESSING).  
2. **Stabilize lint suite** – `npm run lint` currently fails (require/any violations across scripts and APIs) preventing automation gating.  
3. **Instrument upload cancellation + retry** to support UP-EC-04/05 validation.

This document should live close to engineering workflows—treat it as the authoritative “edge-case playbook” when triaging QA or preparing for release readiness reviews.
