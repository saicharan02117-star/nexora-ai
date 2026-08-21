# Nexora AI Architecture

## Design Goal

The user should experience one AI while the system internally delegates work to specialist agents and deterministic transaction controls.

## Layers

### 1. Experience Layer
Text-first Mission Control interface. Voice, image and camera inputs are roadmap extensions.

### 2. Intent & Goal Layer
Converts natural-language goals into structured mission type, budget, preferences, people count and approval requirements.

### 3. Commerce World Model
Maintains shared state for intent, constraints, selected items, transaction state and auditable events.

### 4. Master Orchestrator
Determines which agents run and in what order. Agent results are structured rather than free-form.

### 5. Decision Agents
- Intent Agent
- Planner Agent
- Discovery Agent
- Comparison Agent
- Budget Agent
- Negotiation Agent
- Merchant Intelligence Agent
- Recovery Agent

### 6. Trust Layer
The Action Wallet controls what classes of action are permitted. Agent Firewall validates sensitive requests before execution.

### 7. Connector Layer
Merchant catalogue, inventory and payment services live outside the reasoning agents. This keeps integrations replaceable and easier to audit.

### 8. Transaction Layer
Payment order creation and signature verification are separated from recommendation logic.

## Important Principle

AI output is treated as a proposal. Sensitive execution is a separate system decision governed by explicit policy.
