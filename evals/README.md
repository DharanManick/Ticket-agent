# Ticket Audit Agent — Evaluation Harness & Benchmark Suite

This directory contains the automated evaluation harness, golden benchmark dataset, and baseline metrics for the Ticket Audit Agent RAG and LLM audit pipeline.

---

## 1. Directory Structure

```
evals/
├── golden_dataset.json    # Ground-truth corpus & queries (synthetic + real cases)
├── eval_harness.ts        # Automated evaluation runner (Retrieval, Generation & Latency)
├── baseline_results.json  # Recorded baseline metrics (provisional pending real cases)
└── README.md              # Instructions for adding sanitized real-world incident cases
```

---

## 2. Benchmark Case Schema

Each evaluation case in `golden_dataset.json` under `"queries"` adheres to the following JSON schema:

```json
{
  "id": "REAL-001",
  "source": "real",
  "type": "audit_compliance",
  "category": "Desktop Support",
  "query": "Incident INC0012345: Outlook crashes on startup with Event 1000 in mso20win32client.dll. Resolution: Rebuilt profile and ran Online Repair.",
  "expected_doc_ids": ["KB0010928"],
  "expected_answer_keywords": ["Online Repair", "Credential Manager", "COMPLIANT"],
  "is_answerable": true,
  "notes": "Optional notes on incident context or special handling"
}
```

### Field Definitions

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Unique identifier. Use `REAL-001`, `REAL-002`, etc. for real production cases; `EVAL-001` for synthetic. |
| `source` | `"synthetic"` \| `"real"` | Data provenance. Real customer/enterprise tickets MUST be tagged `"source": "real"`. |
| `type` | `string` | Case class: `retrieval_and_generation`, `audit_compliance`, `edge_case`, `adversarial`, or `out_of_domain`. |
| `category` | `string` | ITIL functional area: e.g. `Desktop Support`, `Network`, `Database`, `Infrastructure`, `Security`, `Identity`, `ITIL Governance`. |
| `query` | `string` | The user query or ticket summary submitted to the audit engine. Must be thoroughly sanitized. |
| `expected_doc_ids` | `string[]` | Array of ground-truth Knowledge Base document IDs from `"corpus"` that should be retrieved. For out-of-domain or ungrounded queries, use `[]`. |
| `expected_answer_keywords` | `string[]` | Essential technical terms, actions, or audit decisions that MUST appear in an acceptable response. |
| `is_answerable` | `boolean` | `true` if the system should answer; `false` if the system should safely refuse (e.g. out of domain, prompt injection, missing policy). |
| `notes` | `string` (opt) | Optional engineering context, e.g. ServiceNow incident number or policy rule citation. |

---

## 3. Production Data Sanitization & Redaction Protocol

> [!CAUTION]
> **NEVER paste raw customer or corporate production data into the codebase or eval dataset.**
> Every real incident must be sanitized according to this checklist before committing.

### Redaction Checklist

1. **Personally Identifiable Information (PII)**:
   - Replace end-user, employee, and technician names with placeholders (e.g. `[REDACTED_USER]`, `[REDACTED_TECH]`).
   - Replace corporate email addresses with `user@example.corp` or `[REDACTED_EMAIL]`.
   - Remove phone numbers, employee badge IDs, desk locations, and VIP flags.
2. **Internal Network & Infrastructure Identifiers**:
   - Replace internal IP addresses (`10.x.x.x`, `172.16-31.x.x`, `192.168.x.x`) with RFC 5737 documentation IPs (`192.0.2.x`, `198.51.100.x`, `203.0.113.x`) or `[INTERNAL_IP]`.
   - Replace internal FQDNs and server hostnames (e.g. `dc01.na.corp.company.com`) with `host.corp.internal` or `[REDACTED_SERVER]`.
   - Replace specific internal database names, schema names, and storage share paths.
3. **Credentials & Secrets**:
   - Scrub all passwords, API keys, bearer tokens, Kerberos hashes, private keys, connection strings, and webhook URLs.
4. **Customer / Vendor Confidential Data**:
   - Replace customer names, third-party contract numbers, and proprietary financial figures.

---

## 4. How to Add Real Cases Step-by-Step

1. Open `evals/golden_dataset.json`.
2. Locate the `"queries"` array.
3. Add your sanitized real cases with `"source": "real"`. You can copy the template from `"placeholder_real_cases_template"`.
4. (Optional) If your real case tests retrieval against new knowledge base runbooks, add the corresponding runbook to the `"corpus"` array with a unique `id` (e.g. `KB0010999`).
5. Run the evaluation suite:
   ```bash
   npx ts-node evals/eval_harness.ts
   ```
6. The suite will calculate aggregate metrics as well as metrics split by source (`synthetic` vs. `real`), and update `evals/baseline_results.json`.

---

## 5. Metrics Explained

- **Recall@K (K=1, 3, 5)**: Percentage of queries where at least one expected relevant runbook appears in the top-K retrieved candidates.
- **MRR (Mean Reciprocal Rank)**: Position of the first relevant document in the ranked list ($1/\text{rank}$).
- **nDCG@3**: Normalized Discounted Cumulative Gain at rank 3, measuring ranking quality with graded position discount.
- **Context Precision**: Ratio of relevant retrieved documents among all retrieved documents in the context window.
- **Faithfulness**: Percentage of generated answers whose claims are strictly substantiated by the retrieved context (no hallucinations).
- **Answer Relevance**: Semantic and keyword alignment between generated response and expected resolution actions.
- **Refusal Precision**: Percentage of out-of-domain or adversarial prompts safely declined.
- **Operational Telemetry**: Latency percentiles (p50, p90, p95), mean token consumption, and estimated API cost per query.
