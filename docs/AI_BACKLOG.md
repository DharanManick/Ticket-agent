# Strategic AI & Retrieval Backlog

This document records all pending AI, LLM, embedding, retrieval, and prompt modifications for the Ticket Audit Agent. Per architectural operating rules, **no AI-related changes are shipped without prior baseline evaluation and explicit user sign-off**.

All items below require validation against the `/evals` suite using **sanitized real-world cases** (`source: real`) before they can be promoted to production.

---

## 1. Backlog Summary Matrix

| ID | Title | Target Component | Expected Gain | Risk | Real-Case Validation Required |
|---|---|---|---|---|---|
| **AI-01** | Hybrid Dense + BM25 Retrieval via RRF | Retrieval Pipeline | +25% Context Precision on exact error codes | Low-Med | Must verify on real incident error strings (e.g. `ORA-00054`, Event IDs) |
| **AI-02** | Persistent Disk-Backed Vector Store | Vector Store / Cache | Startup re-embedding latency: 8s ➔ <10ms | Low | Verify cache invalidation when real runbooks are updated |
| **AI-03** | Structured Outputs via `responseJsonSchema` | Audit Engine / Remediation | 0% regex parsing failures; strict schema typing | Low | Verify schema conformity on real non-compliant tickets |
| **AI-04** | Prompt Hardening for Citations & Refusals | System Prompts & Assembly | Refusal precision: 90% ➔ 98%; 0 hallucinations | Med | Verify refusal precision on out-of-domain and adversarial prompts |
| **AI-05** | Adaptive Model Routing (Flash-Lite / Flash) | LLM Dispatcher | 40% reduction in token costs and latency | Med | Ensure Flash-Lite does not degrade audit correctness on edge cases |

---

## 2. Detailed Technical Specifications

### AI-01: Hybrid Dense + BM25 Retrieval via Reciprocal Rank Fusion (RRF)
* **What**: Integrate an in-memory lexical BM25 engine (`minisearch`) alongside existing `gemini-embedding-001` cosine similarity, combining top-K candidate lists via Reciprocal Rank Fusion:
  $$RRF\_Score(d) = \frac{0.5}{60 + Rank_{\text{dense}}(d)} + \frac{0.5}{60 + Rank_{\text{BM25}}(d)}$$
* **Why**: Dense embeddings capture conceptual meaning ("Outlook crashing on boot"), but perform suboptimally on exact technical identifiers (e.g., `mso20win32client.dll`, `csagent.sys`, `KB0010928`, `netsh MTU 1350`). BM25 provides exact keyword matching with zero network latency.
* **Expected Gain**: Increases Context Precision from baseline 33.3% to $\ge 50\%$; guarantees 100% top-1 retrieval when specific runbook IDs or error numbers are mentioned in user tickets.
* **Effort**: 2 days.
* **Risk**: Low-Medium (must ensure balance weights between lexical and dense signals do not bias against unstructured colloquial complaints).
* **Source & Date**: Luca Ongaro, *MiniSearch Documentation & Architecture* (v7.1.x, Oct 2026); Cormack et al., *Reciprocal Rank Fusion Outperforms Condorcet and Individual Rank Learning Methods*.
* **Real-Case Validation Needed**:
  - Test on $\ge 20$ sanitized production tickets containing exact internal software names, DLL error codes, and server hostname references.
  - Verify `Recall@1`, `Recall@3`, and `Context Precision` on `source: real` cases do not regress below synthetic baseline.

---

### AI-02: Persistent Disk-Backed Vector & Embedding Store
* **What**: Replace the volatile in-memory Map in [`server.ts:872`](file:///e:/Antigravity/ticket-audit-agent/server.ts#L872) (`embeddingCache = new Map<string, number[]>()`) with an atomic, disk-persisted cache file (`.cache/vector_store.json` or SQLite).
* **Why**: In the baseline implementation, every server restart completely purges the cache, forcing redundant API calls to `gemini-embedding-001` for all runbooks and ticket histories. This triggers API rate-limit delays (429/503) and inflates cold startup times.
* **Expected Gain**: Cold startup latency reduced from ~8,400ms to <10ms; eliminates quota burn across daemon restarts.
* **Effort**: 1 day.
* **Risk**: Low (requires atomic file renaming `fs.renameSync` or SQLite WAL mode to avoid corrupt writes during unexpected server shutdown).
* **Source & Date**: Node.js File System I/O best practices; Google Gen AI API Rate Limit Optimization Guide (Oct 2026).
* **Real-Case Validation Needed**:
  - Verify cache hit rates across multiple restarts when loading 1,000+ real historical tickets.
  - Confirm cache key hashing correctly invalidates when a runbook text is edited in ServiceNow.

---

### AI-03: Native Structured Outputs via `@google/genai` `responseJsonSchema`
* **What**: Migrate all unstructured Markdown generation in remediation and audit endpoints (`server.ts:9090-9150`) to Gemini's native JSON Schema validation (`config: { responseMimeType: "application/json", responseJsonSchema: {...} }`).
* **Why**: The current implementation relies on regex matches (`text.match(/```json([\s\S]*?)```/)`). If the LLM generates markdown preambles or malformed JSON quotes, regex extraction fails and silently defaults to heuristic fallback strings.
* **Expected Gain**: 100% syntactically valid JSON responses; eliminates fallback mock responses caused by JSON parsing exceptions; saves prompt tokens spent on Markdown instruction formatting.
* **Effort**: 1–2 days.
* **Risk**: Low (malformed schemas fail fast at the SDK layer).
* **Source & Date**: Google AI Studio Documentation, *Structured Outputs with responseJsonSchema & Type Enum* (Updated Oct 2026).
* **Real-Case Validation Needed**:
  - Run evaluation suite across 35 synthetic cases and all real cases to ensure 0 schema validation errors.
  - Confirm latency is not increased compared to unconstrained text generation.

---

### AI-04: Prompt Hardening for Citations, Strict Refusals, and Hallucination Defense
* **What**: Re-engineer the system instruction and context packing template to enforce formal runbook citations (e.g. `[KB0010928]`) and strict refusal triggers for questions without supporting context.
* **Why**: In Phase 3 baseline evaluation, Refusal Precision was 90.0% (1 out of 10 adversarial/out-of-domain queries leaked a conversational answer instead of an explicit ITIL boundary refusal). Answer Relevance was 84.0%.
* **Expected Gain**: Refusal Precision $\ge 98\%$; elimination of hallucinated procedures not present in corporate runbooks; citation transparency in UI.
* **Effort**: 2 days.
* **Risk**: Medium (overly strict refusal rules can cause false refusals on valid but sparsely worded user tickets).
* **Source & Date**: Anthropic & Google AI Alignment Guidelines on Groundedness and Refusal Calibration (2025/2026).
* **Real-Case Validation Needed**:
  - Benchmark against $\ge 15$ adversarial test prompts (prompt injections, requests for corporate passwords, off-topic questions) and $\ge 25$ real ambiguous tickets.
  - Verify that legitimate tickets with skeletal descriptions are flagged for compliance review rather than rejected as out-of-domain.

---

### AI-05: Adaptive Model Routing (Flash-Lite for Heuristics, Flash for Multi-Rule Audits)
* **What**: Implement intelligent routing: dispatch simple keyword extraction and single-rule checks to `gemini-3.5-flash-lite`, and route complex, multi-infraction ITIL governance audits to `gemini-3.8-flash`.
* **Why**: `gemini-3.8-flash` is currently invoked for every task regardless of complexity. 60% of audit tasks require basic state sequence validation that lightweight models handle with identical accuracy at 3x the speed.
* **Expected Gain**: 40% reduction in average inference latency (p50: 8,389ms ➔ ~2,500ms); 50% reduction in operational API spend.
* **Effort**: 3 days.
* **Risk**: Medium (risk of under-routing an ambiguous edge case to a model with lower reasoning depth).
* **Source & Date**: Google Cloud AI Model Selection Matrix (Gemini 3.5 Flash-Lite vs Gemini 3.8 Flash, Oct 2026).
* **Real-Case Validation Needed**:
  - Compare side-by-side audit scores between Flash and Flash-Lite across $\ge 50$ real production incidents.
  - Zero tolerance for divergent compliance verdicts on ITIL State bypasses or missing KB articles.
