# AgentShield · Zero-Trust Policy Enforcement Point & Cryptographic Audit Ledger

> **Parallax Hackathon 2026 — Track 01: Secure the Agent, Not Just the Prompt**  
> *A deterministic, server-enforced JSON-RPC 2.0 Policy Enforcement Point (PEP) and tamper-evident SHA-256 hash-chained audit ledger that intercepts autonomous agent tool calls before execution.*

[![Pytest Suite](https://img.shields.io/badge/Pytest-64%2F64%20Passing%20(100%25)-emerald?style=for-the-badge&logo=pytest)](https://docs.pytest.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-PEP%20Gateway-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Next.js-16%20Turbopack-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![Audit Ledger](https://img.shields.io/badge/Audit%20Chain-SHA--256%20Hash%20Chained-orange?style=for-the-badge)](https://en.wikipedia.org/wiki/Cryptographic_hash_function)

---

## Key Links & Environments

| Resource | URL | Description |
| :--- | :--- | :--- |
| **Vercel Web App** | [https://agentshield-sooty.vercel.app](https://agentshield-sooty.vercel.app) | Public Next.js dashboard deployment. *(Connects to PEP via local tunnel or `NEXT_PUBLIC_BACKEND_URL`)* |
| **GitHub Repository** | [https://github.com/adithya5693a/Hack4A](https://github.com/adithya5693a/Hack4A) | Source code, automated tests, and implementation history. |
| **Local Evaluation** | **UI:** [http://localhost:3000](http://localhost:3000)<br>**PEP:** [http://127.0.0.1:8000](http://127.0.0.1:8000) | Local runtime for judging evaluation with live WebSocket telemetry. |
| **OpenAPI / Swagger** | [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs) | Interactive FastAPI documentation for JSON-RPC and REST endpoints. |

---

## Results at a Glance

The following numbers were produced by the automated test suite and live evaluation endpoints (`POST /api/demo/run-all`, `POST /api/redteam/run`):

| Metric | Measured Value | Verification Source |
| :--- | :---: | :--- |
| **Automated Unit & Integration Tests** | **64 passed, 0 failed** (0.54s) | `pytest tests/` in `backend/` |
| **Attacks Compromised (Shield OFF)** | **7 / 7 (100%)** | `POST /api/demo/run-all` |
| **Attacks Intercepted (Shield ON)** | **7 / 7 (100%)** | `POST /api/demo/run-all` |
| **Red-Team Attack Variants Tested** | **15 variants** | `POST /api/redteam/run` *(Self-written test harness)* |
| **Red-Team Bypasses (Shield ON)** | **0 / 15 (0.0% bypass rate)** | `POST /api/redteam/run` |
| **Legitimate Tasks Allowed** | **5 / 6 allowed** | `POST /api/demo/run-all` |
| **Legitimate Task Rejected** | **1 / 6 denied** *(by human admin)* | Task `LEGIT-06` explicitly rejected by operator |
| **False Positive Blocks on Safe Tasks** | **0** | `POST /api/demo/run-all` |
| **Cryptographic Hash Chain Status** | **100% verified** | `GET /api/audit/verify` |

---

## Threat Model

AgentShield models security boundaries strictly at the tool-execution interface:

- **Attacker Profile:** Any entity capable of supplying content that an autonomous agent ingests. This includes indirect prompt injection hidden inside billing invoices, inbound customer support emails, untrusted web scraping targets, or poisoned tool outputs.
- **Protected Assets:**
  - Production credentials, API tokens, and database connection strings.
  - Sensitive internal data stores (user records, financial ledgers).
  - Outbound communication channels (corporate email egress).
  - High-privilege administrative tools (database drop, shell execution, key rotation).
- **Trust Boundary:** The interface between the autonomous agent and the tool execution gateway. Within the modelled boundary—where all tool calls are routed through the PEP—caller claims (`agent_id`, `role`, `parent_agent_id`, `source`, `tainted`) are ignored. Identity, authorization tier, and tainted provenance are established server-side.
- **Out of Scope:**
  - Conversational jailbreaks that produce offensive or misleading text without invoking a tool.
  - Attacks originating from a compromised host machine running the PEP.
  - Malicious activity carried out by fully authenticated human administrators within their granted permissions.

---

## Architectural Workflow

AgentShield inserts a deterministic **Policy Enforcement Point (PEP)** between agent reasoning and external tool execution:

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
    │     Multi-Tier Risk Scorer       │                                                     │ Tamper-Evident SHA-256 Ledger    │
    │  - Tainted Provenance Tracking   │                                                     │  - Linear SHA-256 Hash Chain     │
    │  - Server-Side Agent Registry    │                                                     │  - Tamper Detection Engine       │
    │  - Email Domain Exact Whitelist  │                                                     │  - Fail-Closed Disk Persistence  │
    └─────────────────┬────────────────┘                                                     └──────────────────────────────────┘
                      │
         ┌────────────┴─────────────┐
         ▼                          ▼
   [ALLOW / EXECUTE]        [REQUIRE_APPROVAL] ───> ┌───────────────────────────────────────┐
         │                                          │ Human-in-the-Loop (HITL) Gate         │
         ▼                                          │ - Replay-Resistant Atomic Token       │
    Simulated Tool                                  │ - Authenticated SOC Session Required  │
 (Database, Shell, Email)                           │ - 120s Fail-Closed Timeout Deny       │
                                                    └───────────────────────────────────────┘
```

Within the modelled boundary (every tool call passes through the PEP), unauthorized, tainted, or replayed tool actions are denied.

---

## Core Security Features

### 1. Server-Derived Identity & Anti-Spoofing Lineage
- Request payloads cannot self-declare permissions. The PEP cross-references the caller's authenticated session against `AGENT_REGISTRY`.
- Unregistered identities are denied (`R-IDENTITY-01`). Unauthenticated callers attempting to claim administrative identities via MCP trigger `R-IDENTITY-SPOOF`.

### 2. Tainted Provenance Tracking
- Ingesting untrusted content (e.g., invoice data or external web pages) marks the agent's execution context as **Tainted**.
- Taint state propagates across sub-agent delegations, blocking subsequent exfiltration to external or lookalike destinations (`R-TAINT-01`, `R-UNTRUSTED-INTENT-01`).

### 3. Tamper-Evident SHA-256 Hash-Chained Audit Ledger
- Every policy decision is canonicalized and linked into an append-only hash chain (`data/audit_ledger.jsonl`).
- Each block hash covers: `index`, `timestamp`, `call_id`, `agent_id`, `agent_role`, `tool_name`, `arguments_hash`, `decision`, `rule_id`, `risk_score`, and `previous_hash`.
- The `GET /api/audit/verify` endpoint verifies the hash chain from Genesis ($O(N)$). If a stored record is modified, verification fails immediately with `CHAIN BROKEN`.
- *Note:* The ledger is **tamper-evident**, not tamper-proof: an adversary with full write access to the host disk could rewrite history by recomputing all hashes. Anchoring the chain head to an external immutable timestamp or remote log service is identified as future work. *(The file `merkle_log.py` is a historical module name and implements a linear hash chain rather than a Merkle tree).*

### 4. Fail-Closed Audit Handling
- In `backend/app/crypto/merkle_log.py`, disk persistence failures raise `AuditPersistenceError`.
- If an audit block cannot be durably written to disk, the PEP intercepts the exception and denies tool execution with **`R-AUDIT-FAIL`**. Execution never occurs without a confirmed audit record.

### 5. Replay-Resistant HITL Safety Gate
- Operations requiring human confirmation (Tier 2/3 tools or borderline risk scores) generate an in-memory event with a 120-second timeout.
- Approvals require a verified SOC session (`Authorization: Bearer admin-secret-session-90214` in demo mode).
- Approvals are single-use; subsequent resolution attempts fail with `409 Conflict` (`ApprovalAlreadyConsumedError`). Unresolved requests timeout and fail closed to `DENY` (`R-TIMEOUT`).
- Pending approval previews in `GET /api/approvals/pending` redact sensitive argument keys (`password`, `key`, `token`, `secret`) to prevent credential leakage.

---

## Verified Attack Scenarios & Active Rule IDs

The table below reflects the **actual rules fired** during live execution of the 8 demonstration scenarios:

| # | Attack Scenario | Threat Vector | Shield OFF (Without PEP) | Shield ON (With PEP) | Live Rule ID Enforced |
| :-: | :--- | :--- | :---: | :---: | :--- |
| **1** | **Poisoned Invoice** | Indirect Prompt Injection exfiltrating billing data | **COMPROMISED** | **DENIED** | `R-UNTRUSTED-INTENT-01` |
| **2** | **Corporate Email Leak** | Tainted context exfiltrating data via email | **COMPROMISED** | **DENIED** | `R-UNTRUSTED-INTENT-01` |
| **3** | **Sensitive Data Read** | Reading shadow files (`/etc/shadow`, AWS keys) | **COMPROMISED** | **DENIED** | `R-IDENTITY-01` |
| **4** | **Privilege Escalation** | Worker agent attempting admin key rotation | **COMPROMISED** | **DENIED** | `R-RBAC-01` |
| **5** | **Database Wipe** | Untrusted prompt invoking destructive drops | **COMPROMISED** | **DENIED** | `R-IDENTITY-01` |
| **6** | **Tampered Tool Schema** | Runtime modification of tool schema without signature | **COMPROMISED** | **DENIED** | `R-SIG-01` |
| **7** | **Destructive Shell Command** | Remote maintenance shell payload injection | **COMPROMISED** | **DENIED** | `R-IDENTITY-01` |
| **8** | **Shadow Tool Invocation** | Execution of unregistered debug tool | **COMPROMISED** | **DENIED** | `R-REG-01` *(Tested in Red-Team VAR-11)* |

---

## Brochure Requirements Mapping

| Track 01 Requirement | Status | Implementation Details |
| :--- | :---: | :--- |
| **Simulated Autonomous Agent** | **Implemented** | `backend/app/agent/core.py`: multi-hop agent executing tool chains. |
| **At Least Two Tools or Permissions** | **Implemented** | 7 tools across 3 risk tiers (`read_document`, `query_database`, `execute_bash`, `send_email`, etc.). |
| **Policy Enforcement Point (PEP)** | **Implemented** | `backend/app/pep/gateway.py`: authoritative interceptor for all tool requests. |
| **Audit Log of Agent Actions** | **Implemented** | `backend/app/crypto/merkle_log.py`: linear SHA-256 hash-chained ledger. |
| **Four Attack Scenarios** | **Implemented** | 8 implemented scenarios (exceeding minimum 4): prompt injection, email exfiltration, SQLi/wipe, privilege escalation. |
| **Allow / Deny / Require-Approval** | **Implemented** | `backend/app/models.py`: `DecisionStatus` with full tri-state enforcement. |
| **Human-in-the-Loop Confirmation** | **Implemented** | `backend/app/pep/approval_manager.py`: interactive approval queue with timeout. |
| **Fail-Closed Guarantees** | **Implemented** | Missing auth $\to$ 401; unhandled error $\to$ DENY; audit write error $\to$ `R-AUDIT-FAIL`. |
| **MCP Tool Gateway (Extension)** | **Implemented** | `backend/app/mcp/router.py`: JSON-RPC 2.0 `tools/call` and `tools/list` interceptor. |
| **Tool Permission Profiles (Extension)** | **Implemented** | `backend/app/pep/policy.py`: `ROLE_PERMISSIONS` mapping 6 roles to allowed tools. |
| **Signed Tool Manifests (Extension)** | **Implemented** | `backend/app/crypto/signer.py`: HMAC-SHA256 tool manifest signatures verified via `R-SIG-01`. |
| **Cross-Agent Lineage Tracking** | **Implemented** | Multi-hop lineage tracking with recursive parent taint checks (`R-TAINT-01`). |
| **Risk-Aware Approval Queue** | **Implemented** | Real-time queue displaying risk scores, rule IDs, and redacted argument previews. |
| **External Timestamp Anchoring** | *Not Implemented* | Planned future work; current hash chain is stored locally in `data/audit_ledger.jsonl`. |

---

## 5-Step Judge Demonstration Flow

Follow this exact sequence during live demonstration:

1. **Step 1: Authenticate SOC Session**  
   Click **"Demo SOC Session"** on the header. This acquires an authenticated admin session (`Authorization: Bearer admin-secret-session-90214`) via `POST /api/auth/session`.  
   *(Note: The bearer token is hardcoded for demo simplicity in `AUTH_REGISTRY`. A production deployment would load signed secrets from secure environment variables).*
2. **Step 2: Run Poisoned Invoice with Shield OFF**  
   Trigger the attack scenario with the shield disabled. The simulated attack succeeds, displaying **`COMPROMISED`** across both the hop trajectory and the live telemetry stream.
3. **Step 3: Run Poisoned Invoice with Shield ON**  
   Rerun the attack with the shield enabled. Hop 2 is intercepted by the PEP, displaying **`DENIED`** under rule **`R-UNTRUSTED-INTENT-01`** with a **0% blast radius**.
4. **Step 4: Run Legitimate Task with Live Approval**  
   Trigger the legitimate maintenance action. The system quarantines the tool and prompts the HITL modal. Click **"Allow"** to authorize execution once; verify the action executes and cannot be replayed.
5. **Step 5: Verify Log Integrity & Simulate Tampering**  
   - In the Cryptographic Audit visualizer, click **"Verify Log Integrity"** $\to$ returns **`Integrity Verified`** from `GET /api/audit/verify`.
   - Click **"Simulate Tampering"** to modify historical Block #1 $\to$ returns **`CHAIN BROKEN`**, proving mathematical tamper-detection.
6. **Step 6: Review Live Metrics**  
   Check the live benchmark panel showing attack interception rates and false-positive statistics computed directly from runtime state.

---

## Limitations

- **Scripted Agent Scenarios:** For deterministic, reproducible demonstrations, the agent tasks and red-team attacks follow structured execution scripts. The PEP gateway itself is model-agnostic and processes standard JSON-RPC / MCP tool calls.
- **Self-Authored Red-Team Suite:** The 15 adversarial variants in `redteam.py` were written by our team to evaluate specific policy boundaries; 0 bypasses on this suite demonstrates policy coverage against modelled vectors, not mathematical proof of security against all unknown attacks.
- **Tamper-Evident, Not Tamper-Proof:** The SHA-256 hash chain detects any modification to historical blocks. However, an attacker with write access to the host storage could rewrite the file and recompute all hashes. External anchoring of the chain head is required for tamper-resistance.
- **Synthetic Tool Execution:** All tool side effects (database queries, shell commands, email egress) are executed against in-memory synthetic state for safety.

---

## Safety and Responsible Engineering

All operations in AgentShield are 100% simulated and self-contained:
- **No Subprocess Invocations:** Verified `0` instances of `subprocess.Popen`, `os.system`, or `os.popen`.
- **No Arbitrary Code Execution:** Verified `0` instances of `eval()` or `exec()`.
- **No Real Network Egress:** Outbound email and database operations write to an in-memory `OUTBOX` and synthetic mock stores; no external network packets are emitted during attack scenarios.
- **Zero Real Credentials:** Fixture tokens and connection strings are synthetic test values (`sk-secret-live-key-9999`, `company.test`).

---

## Originality and Attribution

- **Hackathon Timeline:** Every commit in this repository was authored during the Parallax Hackathon window, starting from the initial commit (`f962a7c`) on **2026-10-30 at 18:55:25 IST** (the competition commenced Oct 30, 2026 at 16:00 IST).
- **Core Open-Source Libraries:**
  - **FastAPI & Starlette:** REST API, WebSocket transport, and dependency-injection authorization.
  - **Pydantic v2:** Strong schema validation and JSON serialization.
  - **Next.js 16 (Turbopack) & React 19:** Server components and single-page SOC dashboard.
  - **Tailwind CSS & Lucide Icons:** Styling and icon set.
- **Conceptual References:**
  - NIST SP 800-207 (*Zero Trust Architecture* — Policy Enforcement Point concepts).
  - Anthropic Model Context Protocol (MCP) (*JSON-RPC 2.0 tool invocation specifications*).
  - Linear cryptographic hash-chaining principles.

---

## Local Setup Instructions

### 1. Launch FastAPI PEP Gateway
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run all 64 automated tests
pytest tests/

# Start PEP daemon
uvicorn app.main:app --port 8000 --host 127.0.0.1
```

### 2. Launch Next.js SOC Dashboard
```bash
npm install
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## Team

- **[Adithya]** — *Systems Architecture, PEP Gateway, and Cryptographic Hash Chain*
- **[Team Member 2]** — *Red-Team Adversarial Harness & Autonomous Agent Runtime*
- **[Team Member 3]** — *SOC Frontend, Telemetry Stream, and Visualizers*
