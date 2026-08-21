# NEXORA AI

### Universal Transactional AI & Zero-App Commerce Operating System

**One AI. Every transaction. From intent to outcome.**

Nexora AI is an agentic commerce platform designed to remove the friction of fragmented digital journeys. Instead of making a user jump between search, marketplaces, merchant sites, checkout pages, payment flows, delivery tracking and support systems, Nexora keeps the experience in one intelligent interface and coordinates the required systems behind the scenes.

A user can state an outcome such as:

> Find me the best laptop below ₹70,000 for AI development and coding.

Nexora converts that request into structured constraints, discovers eligible options, compares them, optimizes the budget, checks merchant-authorized offers, applies transaction permissions, prepares a test payment order and maintains a trace of the decision path.

---

## Problem

Modern digital commerce is fragmented.

A typical journey can look like:

`AI assistant → search engine → marketplace → merchant website → checkout → payment → delivery tracking → customer support`

This creates repeated context, app switching, poor personalization, abandoned carts, checkout friction, payment failures and revenue leakage.

## Solution

Nexora changes the model from **Prompt → Advice** to:

`Intent → Understand → Plan → Discover → Compare → Optimize → Authorize → Transact → Verify → Track → Recover → Complete`

The user interacts with one Nexora interface while specialist agents operate internally.

## Core Differentiators

- **Zero-App Commerce** — one user-facing interface for the full commerce mission.
- **Goal-to-Outcome Engine** — users express outcomes instead of manually navigating applications.
- **Master Agent Orchestrator** — coordinates specialist agents behind one consistent interface.
- **Commerce World Model** — maintains shared mission, constraint and transaction state.
- **Action Wallet** — separates AI reasoning from transaction authority.
- **Agent Firewall** — validates identity, purpose, amount, merchant and user approval before sensitive actions.
- **Merchant Intelligence** — maps revenue leakage and ranks recoverable opportunities.
- **Autonomous Replanning Architecture** — preserves user constraints when an inventory, offer or transaction step fails.

## Architecture

```text
USER
 │
 ▼
NEXORA AI
 │
 ▼
Intent & Goal Engine
 │
 ▼
Commerce World Model
 │
 ▼
Master Agent Orchestrator
 │
 ├── Intent Agent
 ├── Planner Agent
 ├── Discovery Agent
 ├── Comparison Agent
 ├── Budget Agent
 ├── Negotiation Agent
 ├── Payment Layer
 ├── Recovery Agent
 └── Merchant Intelligence Agent
 │
 ▼
Zero-Trust Action Engine
 │
 ├── Agent Identity
 ├── Permission
 ├── Purpose
 ├── Spending Limit
 ├── Merchant Policy
 └── User Consent
 │
 ▼
Connector Layer
 │
 ├── Merchant Catalogue
 ├── Inventory
 └── Razorpay Sandbox
 │
 ▼
Transaction Verification
 │
 ▼
COMPLETED OUTCOME
```

## Current MVP

The repository contains a working prototype for:

- Universal Nexora mission interface
- Natural-language intent extraction
- Goal decomposition and mission planning
- Product discovery from a simulated merchant catalogue
- Product scoring and comparison
- Budget-aware ranking
- Merchant-policy-aware offers
- Action Wallet permissions
- Agent Firewall payment checks
- Razorpay test-order connector with demo fallback
- Payment signature verification logic
- Multi-merchant event planning scenario
- Merchant revenue leakage dashboard
- Agent execution trace
- Responsive Mission Control interface

## Demo Scenarios

### 1. Consumer Commerce

**Prompt:** `Find me the best laptop below ₹70,000 for AI development and coding.`

Flow:

`Intent → Discovery → Comparison → Budget Optimization → Merchant Offer → Permission Check → Test Order`

### 2. Multi-Merchant Mission

**Prompt:** `Arrange a birthday for 25 people under ₹20,000.`

Flow:

`Goal Decomposition → Vendor Discovery → Multi-Merchant Bundle → Budget Check → Approval`

### 3. Merchant Intelligence

**Prompt:** `Why is my merchant revenue leaking today?`

Flow:

`Funnel Metrics → Revenue Leak Radar → Ranked Causes → Recovery Actions`

## Security Model

Nexora follows a simple rule: **reasoning is not authority**.

A model or agent may recommend an action, but a sensitive tool call passes through a separate policy layer first.

Payment-related checks include:

1. Agent identity
2. Merchant identity
3. Transaction purpose
4. Maximum transaction amount
5. User permission
6. Confirmation requirement
7. Payment verification

No private keys are stored in the repository.

## Razorpay Sandbox Integration

Nexora supports two modes:

- **Demo mode** — works immediately without credentials and generates a local test order object.
- **Sandbox mode** — uses Razorpay test credentials from environment variables to create a real test order.

Create a `.env` file from `.env.example` and add only test credentials locally.

## Tech Stack

- **Backend:** Python, FastAPI
- **Validation:** Pydantic
- **HTTP integration:** HTTPX
- **Frontend:** HTML, CSS, JavaScript
- **Agent architecture:** modular Python specialist agents + Master Orchestrator
- **Payments:** Razorpay Sandbox-compatible order and verification service
- **Testing:** Pytest
- **Deployment target:** any Python web host; static UI is served by FastAPI

## Local Setup

### 1. Clone

```bash
git clone https://github.com/saicharan02117-star/nexora-ai.git
cd nexora-ai
```

### 2. Create environment

```bash
python -m venv .venv
```

Activate it, then install dependencies:

```bash
pip install -r requirements.txt
```

### 3. Environment variables

```bash
cp .env.example .env
```

The app works in demo mode without payment credentials.

### 4. Run

```bash
uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000`.

## API

- `GET /api/health`
- `POST /api/missions`
- `GET /api/merchant/metrics`
- `GET /api/permissions`
- `POST /api/permissions`
- `POST /api/payments/order`
- `POST /api/payments/verify`

Interactive API documentation is available at `/docs` while the server is running.

## Repository Structure

```text
nexora-ai/
├── app/
│   ├── agents/
│   ├── security/
│   ├── services/
│   ├── world_model/
│   ├── main.py
│   └── schemas.py
├── data/
├── frontend/
├── docs/
├── tests/
├── .github/workflows/
├── .env.example
├── requirements.txt
└── README.md
```

## Roadmap

### Phase 1 — Core Agentic Commerce
- Stateful mission memory
- More product/service connectors
- Full sandbox checkout UI
- Transaction event ledger

### Phase 2 — Merchant Intelligence
- Revenue Digital Twin
- Abandonment prediction
- Recovery workflows
- Growth experiment simulator

### Phase 3 — Zero-App Commerce
- Universal Intent Cart
- Multi-service orchestration
- Unified order center
- Returns and subscription management

### Phase 4 — Intent Marketplace
- Buyer-side intent agents
- Merchant-side offer agents
- B2B procurement
- Collective procurement

### Phase 5 — Multimodal Transactional AI
- Voice commerce
- Indian language support
- Image-based product discovery
- Hyperlocal commerce

## Limitations

- Demo catalogue data is fictional and intended for prototype evaluation.
- External merchant, logistics and marketplace integrations require official APIs and permissions.
- Automatic payment authority is disabled by default.
- The current world model is in-memory and should move to a persistent database for production use.
- Production deployments require authentication, rate limiting, secrets management, audit storage and compliance review.

## License

MIT License. See `LICENSE`.
