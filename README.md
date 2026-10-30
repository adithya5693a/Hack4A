# AgentShield · SOC Dashboard & PEP Gateway

> **Zero-Trust Runtime Policy Enforcement & Cryptographic SHA-256 Hash-Chained Audit Ledger for Autonomous AI Agents**

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel%20Production-crimson?style=for-the-badge&logo=vercel)](https://agentshield-sooty.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-16%20App%20Router-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend%20PEP-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)

---

## 🚀 Live Demo

- **Production Dashboard**: [https://agentshield-sooty.vercel.app](https://agentshield-sooty.vercel.app)

---

## 🛡️ Architecture Overview

AgentShield provides real-time tool traffic interception, permission classification, human-in-the-loop (HITL) approval gates, and a SHA-256 hash-chained audit log for autonomous AI agents.

### Strict 3-Color Cybernetic Design Palette
- **Cool Steel Grey** (`#929DA7`): Structural card borders, safe status indicators, telemetry metrics, and immutable audit connectors.
- **Midnight Charcoal** (`#17191C`): High-contrast dashboard surface, ambient command consoles, and drawer backdrops.
- **Vibrant Coral Orange** (`#FF4B32`): High-severity threat alerts, red-team exploit triggers, broken audit chain alerts, and glowing ambient flares.

---

## 📦 Project Structure

```
Hack4A/
├── app/                           # Next.js App Router
│   ├── api/                       # Edge Route Handlers
│   │   ├── agent/run/             # Red-team attack dispatcher
│   │   ├── approvals/[id]/action/ # HITL approval resolution
│   │   └── audit/verify/          # Cryptographic SHA-256 audit verification
│   ├── globals.css                # Tailwind v4 theme & automotive glow effects
│   ├── layout.tsx                 # Root layout & Google Fonts
│   └── page.tsx                   # Main SOC Dashboard view
├── components/                    # Modular React components
│   ├── AestheticHeroBanner.tsx    # "BUILT DIFFERENTLY" editorial hero
│   ├── AttackPlayground.tsx       # Judges' 1-Click Attack Playground
│   ├── CryptographicAuditVisualizer.tsx # SHA-256 Hash-Chained Ledger Visualizer
│   ├── HITLApprovalModal.tsx      # Risk-aware Human-in-the-Loop approval gate
│   ├── LiveTelemetryStream.tsx    # Real-time tool execution feed
│   ├── ManualTestToolbar.tsx      # Quick sandbox trigger bar
│   ├── RiskScoreBar.tsx           # Risk gauge component
│   ├── SOCHeader.tsx              # Top telemetry status & live UTC clock
│   ├── StatsPanel.tsx             # Blocked / Allowed / Pending metrics
│   └── StatusBadge.tsx            # High-tech status pills
├── hooks/                         # React state & streaming hooks
│   ├── useAuditChain.ts           # Audit chain state & tamper simulation
│   └── useSecurityStream.ts       # Live WebSocket & mock telemetry engine
├── backend/                       # Python FastAPI Backend
│   ├── app/                       # PEP gateway, RBAC, and risk scorers
│   ├── tests/                     # Pytest suite
│   └── requirements.txt           # Python dependencies
└── types/                         # TypeScript interfaces
    ├── audit.ts
    └── telemetry.ts
```

---

## ⚡ Getting Started

### 1. Frontend (Next.js)

```bash
# Install dependencies
npm install

# Run local development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the SOC dashboard.

### 2. Backend (FastAPI PEP Gateway)

```bash
cd backend
pip install -r requirements.txt
pytest
```
