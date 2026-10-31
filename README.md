# AgentShield · Zero-Trust Policy Enforcement Point & Cryptographic Audit Ledger

> **Parallax Hackathon 2026 — Track 01: Secure the Agent, Not Just the Prompt**  
> *A deterministic, server-enforced JSON-RPC 2.0 Policy Enforcement Point (PEP) and tamper-evident SHA-256 hash-chained audit ledger that stops prompt injection, tool tampering, and privilege escalation before execution occurs.*

[![Pytest Suite](https://img.shields.io/badge/Pytest-64%2F64%20Passing%20(100%25)-emerald?style=for-the-badge&logo=pytest)](https://docs.pytest.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-PEP%20Gateway-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-16%20Turbopack-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![Security Standard](https://img.shields.io/badge/Architecture-Zero--Trust%20PEP-blue?style=for-the-badge)](https://csrc.nist.gov/publications/detail/sp/800-207/final)
[![Audit Ledger](https://img.shields.io/badge/Ledger-SHA--256%20Hash%20Chained-orange?style=for-the-badge)](https://en.wikipedia.org/wiki/Merkle_tree)

---

## 🔗 Key Links & Environments

| Resource | URL | Description |
| :--- | :--- | :--- |
| 🌐 **Vercel Live Production App** | [https://agentshield-sooty.vercel.app](https://agentshield-sooty.vercel.app) | Publicly deployed SOC dashboard with live visualizer and real-time state. |
| 💻 **GitHub Repository** | [https://github.com/adithya5693a/Hack4A](https://github.com/adithya5693a/Hack4A) | Official repository with full source code, backend tests, and documentation. |
| 🖥️ **Local Evaluation Environment** | **Dashboard:** [http://localhost:3000](http://localhost:3000)<br>**PEP Engine:** [http://127.0.0.1:8000](http://127.0.0.1:8000) | 100% deterministic, offline execution with sub-millisecond local telemetry. |
| 📑 **Interactive OpenAPI / Swagger** | [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) | Live FastAPI documentation with authenticated execution schemas. |

---

## 🚨 The Threat: Why Prompt-Based Guardrails Fail

Traditional AI defenses rely on **"System Prompting"** or **"LLM Judge Wrappers"** (e.g., Llama Guard) to inspect conversational text. In autonomous agent architectures, this paradigm fundamentally fails:
- **Indirect Prompt Injection:** An untrusted document, invoice, or web page contains embedded instructions that hijack the agent's reasoning.
- **Probabilistic Defense:** Neural network guardrails are stochastic; variations in encoding or phrasing bypass them.
- **Client-Side Spoofing:** When agent runtimes allow callers to supply their own roles (`role="admin"`), sources (`source="user_prompt"`), or taint flags, the execution boundary is completely broken.

---

## 🛡️ The AgentShield Solution: Zero-Trust Runtime Interception

AgentShield operates under a strict principle: **Never trust the model. Secure the execution boundary.**

By decoupling security enforcement from model cognition and placing a deterministic **Policy Enforcement Point (PEP)** in front of external tools and APIs, AgentShield guarantees that no unauthorized, tainted, or replayed tool action can ever execute.

```
 ┌──────────────────────┐       JSON-RPC 2.0 / MCP        ┌──────────────────────────────────────┐
 │   Autonomous Agent   │ ──────────────────────────────> │      AgentShield PEP Gateway         │
 │ (Untrusted Cognition)│                                 │ (Deterministic Security Boundary)    │
 └──────────────────────┘                                 └──────────────────┬───────────────────┘
                                                                             │
                      ┌──────────────────────────────────────────────────────┴─────────────────────────────────┐
                      │                                                                                        │
                      ▼                                                                                        ▼
    ┌──────────────────────────────────┐                                                     ┌──────────────────────────────────┐
    │     Multi-Tier Risk Scorer       │                                                     │   Cryptographic Audit Ledger     │
    │  - Tainted Provenance Tracking   │                                                     │  - SHA-256 Hash Chain Linking    │
    │  - Server-Side Agent Registry    │                                                     │  - Tamper Detection Engine       │
    │  - Email Domain Exact Whitelist  │                                                     │  - Fail-Closed Disk Persistence  │
    └─────────────────┬────────────────┘                                                     └──────────────────────────────────┘
                      │
         ┌────────────┴─────────────┐
         ▼                          ▼
   [ALLOW / EXECUTE]        [REQUIRE_APPROVAL] ───> ┌───────────────────────────────────────┐
         │                                          │ Human-in-the-Loop (HITL) Gate         │
         ▼                                          │ - Replay-Resistant Atomic Token       │
    External Tool                                   │ - Authenticated SOC Session Required  │
 (Database, Bash, Email)                            │ - 120s Fail-Closed Timeout Deny       │
                                                    └───────────────────────────────────────┘
```

---

## ✨ Core Security Guarantees & Features

### 1. Server-Derived Identity & Anti-Spoofing Lineage
- **No Request-Body Trust:** Request payloads cannot define `agent_id`, `role`, `parent_agent_id`, or `tainted`. 
- **Server Registry Lookup:** The gateway cross-references the caller against the server-maintained `AGENT_REGISTRY`. Unregistered identities fail closed (`R-IDENTITY-01`); attempts to spoof `agent_admin` via unauthenticated RPC trigger `R-IDENTITY-SPOOF`.

### 2. Tainted Provenance Propagation
- When an agent retrieves untrusted content (e.g., invoices, emails, external web data), the server marks the agent lineage as **Tainted**.
- Even if subsequent prompts claim to be clean, tainted provenance persists across multi-hop sub-agents, preventing exfiltration to untrusted domains (`R-TAINT-01`, `R-UNTRUSTED-INTENT-01`).

### 3. Tamper-Evident SHA-256 Hash-Chained Audit Ledger
- Every policy decision is canonicalized and hashed into an append-only cryptographic ledger (`data/audit_ledger.jsonl`).
- Each block's hash incorporates the **previous block's hash**, **agent ID**, **role**, **decision**, **rule ID**, **risk score**, and a **SHA-256 hash of the tool arguments**.
- The `GET /api/audit/verify` endpoint verifies the mathematical chain from Genesis to the chain head. If a historical log entry is altered, the entire chain severs (`CHAIN BROKEN`).

### 4. Fail-Closed Audit Persistence
- If the ledger disk write fails (simulated disk exhaustion or I/O failure), the PEP immediately halts tool execution and denies the call with **`R-AUDIT-FAIL`**. Execution never proceeds without an immutable audit record.

### 5. Atomic Replay-Resistant HITL Safety Gate
- Borderline or high-risk operations (e.g., database schema changes, financial transactions) trigger a **Human-in-the-Loop (HITL)** quarantine.
- Approvals require an authenticated administrator (`Authorization: Bearer admin-secret-session-90214`).
- Approvals are single-use; replayed approval actions fail with `409 Conflict` (`ApprovalAlreadyConsumedError`). Unresolved requests timeout and default to `DENY`.

### 6. Secret Redaction in SOC Queue
- The `GET /api/approvals/pending` queue automatically masks sensitive fields (`password`, `key`, `token`, `secret`, `credential`) with `***REDACTED***` to prevent administrative credential leaks.

---

## 🎯 8 Realistic Attack Scenarios Tested & Proven

| # | Attack Scenario | Threat Vector | Shield OFF (Without PEP) | Shield ON (With AgentShield) | Rule Enforced |
| :-: | :--- | :--- | :---: | :---: | :--- |
| **1** | **Poisoned Invoice** | Indirect Prompt Injection exfiltrating billing data | **COMPROMISED** (Data leaked) | **BLOCKED (0% Blast Radius)** | `R-UNTRUSTED-INTENT-01` |
| **2** | **Corporate Email Leak** | Lookalike domain spoofing (`evilcompany.com`) | **COMPROMISED** (Email sent) | **BLOCKED (0% Blast Radius)** | `R-EGRESS-01` |
| **3** | **Sensitive Data Exfiltration** | Reading shadow files (`/etc/shadow`, AWS keys) | **COMPROMISED** (Keys dumped) | **BLOCKED (0% Blast Radius)** | `R-SENSITIVE-READ-01` |
| **4** | **Privilege Escalation** | Worker agent claiming supervisor permissions | **COMPROMISED** (DB destroyed) | **BLOCKED (0% Blast Radius)** | `R-RBAC-01` |
| **5** | **Database Wipe** | Untrusted prompt invoking destructive drops | **COMPROMISED** (Tables purged) | **BLOCKED (0% Blast Radius)** | `R-ADMIN-TOOL-01` |
| **6** | **Shadow Tool Invocation** | Unregistered tool name execution | **COMPROMISED** (Tool executed) | **BLOCKED (0% Blast Radius)** | `R-REG-01` |
| **7** | **Tampered Schema / SQLi** | Dynamic SQL injection bypassing prompts | **COMPROMISED** (Data injected) | **BLOCKED (0% Blast Radius)** | `R-TAINT-01` |
| **8** | **Destructive Shell Command** | Remote code execution (`rm -rf`, `chmod 777`) | **COMPROMISED** (Shell run) | **BLOCKED (0% Blast Radius)** | `R-TIER3-CRITICAL` |

---

## 🏆 5-Step Live Judge Demonstration Flow

When demonstrating AgentShield live to hackathon judges, follow this sequence:

1. **Step 1: Authenticate Demo SOC Session**  
   Click **"Demo SOC Session"** on the top header. This issues a verified backend token (`admin-secret-session-90214`) via `POST /api/auth/session`.
2. **Step 2: Run Poisoned Invoice (Shield ON)**  
   Trigger the attack scenario. Observe that Hop 2 is intercepted instantly with **`R-UNTRUSTED-INTENT-01`**, resulting in a **0% blast radius**.
3. **Step 3: Toggle Shield OFF & Rerun**  
   Run the exact same attack with Shield OFF. Observe that the payload succeeds, rendering **`COMPROMISED`** across both the hop trajectory and the live WebSocket telemetry feed.
4. **Step 4: Verify Cryptographic Log Integrity**  
   Click **"Verify Log Integrity"** in the Cryptographic Audit visualizer. The backend recalculates SHA-256 block hashes from Genesis, returning a green **`VERIFIED`** status.
5. **Step 5: Simulate Database Tampering**  
   Click **"Simulate Tampering"**. This injects an in-place modification to historical Block #1. The integrity checker immediately flags **`CHAIN BROKEN: Pointer broken at Block #1`**, proving mathematical tamper-evidence.

---

## 📁 Repository Structure & Codebase Tour

```
Hack4A/
├── backend/                              # Python 3.14 FastAPI Policy Enforcement Point
│   ├── app/
│   │   ├── main.py                       # REST & WebSocket API, route protection, auth registry
│   │   ├── models.py                     # Pydantic schemas (ToolRequest, PolicyDecision, AuditBlock)
│   │   ├── state.py                      # Global state singletons (gateway, approval_manager, ws_manager)
│   │   ├── ws_manager.py                 # Real-time WebSocket connection manager & broadcaster
│   │   ├── pep/
│   │   │   ├── gateway.py                # Core PEP interceptor, provenance tracking & fail-closed logic
│   │   │   ├── policy.py                 # Centralized agent registry, RBAC tiers & domain allowlists
│   │   │   ├── approval_manager.py       # Replay-resistant HITL approval manager & argument redaction
│   │   │   ├── rbac.py                   # Role-based tool access control & rate-limiting checks
│   │   │   └── risk_scorer.py            # Multi-tier risk calculator & token inspection
│   │   ├── crypto/
│   │   │   ├── merkle_log.py             # SHA-256 HashChainAuditLedger with JSONL append-only persistence
│   │   │   └── signer.py                 # HMAC-SHA256 tool manifest signer & verification
│   │   ├── mcp/
│   │   │   └── router.py                 # JSON-RPC 2.0 MCP tool gateway with identity anti-spoofing
│   │   └── agent/
│   │       ├── attacks.py                # 8 deterministic red-team exploit scenarios
│   │       ├── core.py                   # Autonomous agent runtime & multi-hop tool execution
│   │       ├── tools.py                  # Standard simulated tool implementations & outbox
│   │       └── redteam.py                # Automated red-team benchmarking harness
│   ├── data/
│   │   └── audit_ledger.jsonl            # Append-only on-disk cryptographic audit trail
│   ├── tests/                            # 64 Automated Pytest Suite
│   │   ├── test_security_boundaries.py   # Auth 401/403, anti-spoofing, secret redaction, fail-closed
│   │   ├── test_hardening_reviewer.py    # Strict auth dependencies & token verification
│   │   ├── test_approval_flow.py         # HITL approvals, timeout defaults, and replay guards
│   │   ├── test_judge_audit.py           # Merkle chain integrity & tamper detection verification
│   │   ├── test_mcp_and_evasion.py       # MCP JSON-RPC router & evasion token detection
│   │   ├── test_member2_suite.py         # Comprehensive multi-scenario pipeline tests
│   │   ├── test_rbac.py                  # Role permissions & tier-based access control
│   │   └── test_risk_scorer.py           # Multi-factor risk scoring equations
│   └── requirements.txt                  # Python dependencies (FastAPI, Uvicorn, Pydantic, Pytest)
├── app/                                  # Next.js 16 App Router Frontend
│   ├── layout.tsx                        # Global layout, fonts, and dark theme wrapper
│   ├── page.tsx                          # Single-pane-of-glass SOC Dashboard & Judge Tour
│   ├── globals.css                       # High-tech Cyberpunk/Steel design theme
│   └── api/                              # Next.js API edge proxy handlers
├── components/                           # Modular React UI Components
│   ├── AttackPlayground.tsx              # Interactive red-team scenario runner & blast radius card
│   ├── CryptographicAuditVisualizer.tsx  # Interactive SHA-256 Merkle chain visualizer & tamper injector
│   ├── GoogleAuthWidget.tsx              # SOC Administrator session widget (Demo SOC Session)
│   ├── HITLApprovalModal.tsx             # Real-time Human-in-the-Loop quarantine modal
│   ├── LiveTelemetryStream.tsx           # Real-time WebSocket tool execution log
│   ├── MCPPolicyDrawer.tsx               # Drawer displaying server-side tool tiers & policy schemas
│   ├── SOCHeader.tsx                     # Top navigation bar with dynamic PEP ONLINE indicator & latency
│   └── StatusBadge.tsx                   # High-contrast status badges (ALLOWED, BLOCKED, COMPROMISED)
├── hooks/                                # Custom React Hooks
│   ├── useAuditChain.ts                  # Audit chain fetch, verify, tamper, and reset state
│   └── useSecurityStream.ts              # Native WebSocket streaming client for live PEP telemetry
└── lib/
    ├── api-config.ts                     # Dynamic URL resolvers (localhost vs production tunnel)
    └── telemetry-adapter.ts              # Event status mapping (SHIELD_BYPASS -> COMPROMISED)
```

---

## ⚡ Local Setup & Reproduction

### Prerequisites
- Python 3.11+ (Python 3.14 compatible)
- Node.js 18+ (Node.js 20+ recommended)

### 1. Launch the FastAPI PEP Gateway
```bash
# Navigate to the backend directory
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run all 64 automated security verification tests
pytest tests/

# Start the Policy Enforcement Point daemon
uvicorn app.main:app --port 8000 --host 127.0.0.1
```
*The PEP is now active on `http://127.0.0.1:8000` with Swagger docs at `http://127.0.0.1:8000/docs`.*

### 2. Launch the Next.js SOC Dashboard
```bash
# In the root repository directory
npm install

# Start development server (or run 'npm run build && npm start' for production)
npm run dev
```
*Open **[http://localhost:3000](http://localhost:3000)** in your browser.*

---

## 🧪 Automated Test Verification

AgentShield includes 64 comprehensive automated tests covering every layer of the zero-trust architecture:

```bash
$ pytest tests/ -v
============================= test session starts ==============================
platform darwin -- Python 3.14.7, pytest-9.2.0, pluggy-1.7.0
rootdir: /Users/adithya/Hack4A/backend
configfile: pytest.ini
plugins: asyncio-1.4.1, anyio-4.15.1
collected 64 items

tests/test_approval_flow.py::test_enforce_approve_returns_allow PASSED    [  1%]
tests/test_approval_flow.py::test_enforce_reject_returns_deny PASSED     [  3%]
tests/test_approval_flow.py::test_enforce_timeout_denies PASSED          [  4%]
tests/test_evasion_and_toolcall.py::test_evasion_base64_injection_detected PASSED [  6%]
tests/test_evasion_and_toolcall.py::test_evasion_unicode_homoglyph_detected PASSED [  7%]
tests/test_evasion_and_toolcall.py::test_durable_audit_ledger_persists_to_file PASSED [  9%]
tests/test_gateway.py::test_evaluate_tier1_allows PASSED                 [ 10%]
tests/test_gateway.py::test_intercept_audit_write_called PASSED          [ 12%]
tests/test_gateway.py::test_intercept_audit_failure_fails_closed PASSED  [ 14%]
tests/test_hardening_reviewer.py::test_api_auth_boundaries PASSED        [ 15%]
tests/test_hardening_reviewer.py::test_approval_replay_rejected PASSED   [ 17%]
tests/test_judge_audit.py::test_chain_integrity_verification PASSED      [ 20%]
tests/test_judge_audit.py::test_tamper_detection_breaks_chain PASSED     [ 21%]
tests/test_security_boundaries.py::test_auth_boundaries_401_and_403 PASSED [ 23%]
tests/test_security_boundaries.py::test_session_creation_endpoint PASSED  [ 25%]
tests/test_security_boundaries.py::test_mcp_identity_anti_spoofing PASSED [ 26%]
tests/test_security_boundaries.py::test_pending_approvals_redacts_secrets PASSED [ 28%]
tests/test_security_boundaries.py::test_audit_failure_fails_closed PASSED [ 29%]
...
======================== 64 passed, 1 warning in 0.53s =========================
```

---

## 👥 Hackathon Team & Project Ownership
- **Project:** AgentShield (Track 01: Secure the Agent, Not Just the Prompt)
- **Event:** Parallax Hackathon 2026 (BMSCE IEEE Computer Society)
- **Repository:** [https://github.com/adithya5693a/Hack4A](https://github.com/adithya5693a/Hack4A)
- **License:** MIT License
