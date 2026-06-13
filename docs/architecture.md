# Ground Truth — Architecture

## System diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│  Browser  (Next.js)                                                 │
│                                                                     │
│  VerdictMatrix                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ ProgressLog — SSE stream, real-time per-phase status         │   │
│  │  ✓ Connecting to Foundry IQ agent…                          │   │
│  │  ✓ Sending 8 audit controls to agent…                       │   │
│  │  ✓ Agent requested knowledge base access…                   │   │
│  │  › Approving MCP retrieval · round 1…                       │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  Verdict matrix (✅ / ❌ / ⚠️)  →  CitationPanel on click           │
└────────────────────────────┬────────────────────────────────────────┘
                             │ POST /api/audit  (SSE response)
┌────────────────────────────▼────────────────────────────────────────┐
│  Next.js API Route  (app/api/audit/route.ts)                        │
│                                                                     │
│  1. AIProjectClient(@azure/ai-projects v2.2.0)                      │
│     endpoint: {foundry}/api/projects/{project}                      │
│                                                                     │
│  2. getOpenAIClient({ azureConfig: { agentName, allowPreview } })   │
│     routes to: {endpoint}/agents/ground-agent/endpoint/protocols/openai │
│                                                                     │
│  3. responses.create({ model, input: auditPrompt })                 │
│     ┌──────────────────────────────────────────────────────────┐    │
│     │  MCP approval loop (up to 8 rounds)                      │    │
│     │  response.output contains mcp_approval_request items     │    │
│     │  → server sends mcp_approval_response with approve:true  │    │
│     │  → continues with previous_response_id                   │    │
│     └──────────────────────────────────────────────────────────┘    │
│                                                                     │
│  4. Parse output_text → AuditResult[] → emit SSE "done"             │
└────────────────────────────┬────────────────────────────────────────┘
                             │ Foundry Agent Service
┌────────────────────────────▼────────────────────────────────────────┐
│  ground-agent  (Azure AI Foundry Agent Service)                     │
│                                                                     │
│  Cite-or-abstain adjudication                                       │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  For each control:                                          │    │
│  │  1. Call knowledge_base_retrieve (MCP) → standard chunk     │    │
│  │  2. Call knowledge_base_retrieve (MCP) → evidence chunk     │    │
│  │  3. Compare:                                                │    │
│  │     both citations found + config matches → SATISFIED ✅    │    │
│  │     both citations found + config violates → VIOLATED ❌    │    │
│  │     evidence absent or indeterminate → UNKNOWN ⚠️ (abstain) │    │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  Output: raw JSON array — one AuditResult per control               │
└────────────────────────────┬────────────────────────────────────────┘
                             │ knowledge_base_retrieve (MCP)
┌────────────────────────────▼────────────────────────────────────────┐
│  Foundry IQ  (knowledge base: kb-ground-truth-corpus)               │
│                                                                     │
│  Corpus A — data/standard/cis-azure-excerpt.md                      │
│    CIS Azure Benchmark v2.0 §3 (Storage), §4 (DB), §6 (Network)    │
│    8 controls: CIS-3.1, CIS-3.7, CIS-4.1.1, CIS-4.3.1,            │
│                CIS-6.1, CIS-6.2                                     │
│                                                                     │
│  Corpus B — data/evidence/sample-config.md                          │
│    Terraform IaC with intentional posture variations:               │
│    • customer_data_storage: allow_blob_public_access = true ← ❌    │
│    • legacy_nsg: SSH source_address_prefix = * ← ❌                 │
│    • main MySQL: ssl_minimal_tls_version_enforced = NOT SET ← ⚠️    │
└─────────────────────────────────────────────────────────────────────┘
```

## Agent stages

| Stage | Implemented as | Input | Output |
|---|---|---|---|
| Control Extractor | Static `AUDIT_CONTROLS` list in route.ts | — | 8 CIS controls |
| Retriever | `knowledge_base_retrieve` MCP tool (Foundry IQ) | Control text | Cited chunks from both corpora |
| Adjudicator | Agent system prompt (cite-or-abstain rules) | Control + cited evidence | Verdict + dual citation |
| Remediator | Part of agent output schema | VIOLATED control | Cited remediation recommendation |

## AuditResult schema

```typescript
{
  control_id:        string           // e.g. "CIS-3.7"
  title:             string           // e.g. "Public blob access disabled"
  resource:          string           // e.g. "customer_data_storage"
  verdict:           "SATISFIED" | "VIOLATED" | "UNKNOWN"
  confidence:        "grounded" | "abstained"
  standard_citation: string | null    // e.g. "CIS Azure v2.0 §3.7 — allow_blob_public_access = false"
  evidence_citation: string | null    // e.g. "sample-config.md line 40 — allow_blob_public_access: true"
  reasoning:         string
  unknown_reason:    string | null    // populated only for UNKNOWN
  remediation:       string | null    // populated only for VIOLATED
}
```

## Microsoft services used

| Service | Role |
|---|---|
| Azure AI Foundry | Agent and project runtime |
| Foundry Agent Service | Multi-step agent execution (`ground-agent`) |
| **Foundry IQ** | Grounded, cited retrieval via `knowledge_base_retrieve` MCP — the core IQ layer |
| Azure OpenAI (GPT-4o) | Reasoning — adjudication and remediation |
| `@azure/ai-projects` SDK | `AIProjectClient` + `getOpenAIClient` wiring |
| GitHub Copilot | Development acceleration |

## Key design decisions

**Cite-or-abstain:** The agent prompt enforces that SATISFIED and VIOLATED verdicts require dual citations (one from the standard, one from the evidence). If either citation is absent, the verdict is UNKNOWN. This makes the abstain path structurally guaranteed, not a fallback.

**MCP approval loop in code:** The Foundry portal "Require approval" toggle is unreliable across agent versions. The server handles approvals programmatically — detecting `mcp_approval_request` items in the response and sending `mcp_approval_response` with `approve: true` via `previous_response_id` continuation. Up to 8 rounds.

**SSE streaming:** The audit route returns a `ReadableStream` (text/event-stream). Status events are emitted at each real inflection point (connecting → sending → MCP request → approving round N → parsing) so the UI shows the agent working rather than a frozen spinner.
