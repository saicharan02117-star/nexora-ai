# NEXUS-Ω - Universal Resilience Operating System

**1M1B AI for Sustainability Virtual Internship - Final Project**

**Student:** Thodupunuri Sai Charan  
**College:** CMR College of Engineering and Technology  
**Primary SDG:** SDG 11 - Sustainable Cities and Communities

> One intelligence layer for people, families and infrastructure when the systems they depend on are under stress.

## Problem

People usually receive isolated information: weather in one app, maps in another, emergency contacts elsewhere, and infrastructure information in separate systems. During disruption, the real question is not only "what is happening?" but:

- What can affect me?
- What could fail next?
- Who or what depends on it?
- What is the safest next action?
- Where can the failure chain be interrupted?

## Problem Statement

**How might we use multimodal, causal and agentic AI to understand dependencies between climate, electricity, water, transport, communication and essential services so that cascading infrastructure failures can be predicted, interrupted and recovered from before they cause severe social and environmental disruption?**

## Solution

NEXUS-Ω is a resilience decision-support prototype with two connected views:

1. **Personal Resilience OS** - live weather brief, Ask NEXUS, Route Guardian, Family Guardian and Emergency Copilot.
2. **Cascade Lab** - a synthetic digital-twin demonstration showing how one disruption can propagate across transport, power, water and healthcare, and how a high-leverage intervention can "break the chain."

### Ω-CORE workflow

`SENSE → UNDERSTAND → PREDICT → TRACE → SIMULATE → BREAK → VERIFY → RECOVER → LEARN`

## Working Prototype Features

- **Live Weather Brief** using the free Open-Meteo API.
- **Transparent Weather Risk Indicator** with an explanation of what is and is not known.
- **Ask NEXUS** using a free community text model when available, with a deterministic local safety fallback that requires no paid key.
- **Route Guardian** with weather-aware pre-trip caution and real map handoff.
- **Family Guardian** with local-only check-ins.
- **Emergency Copilot** with 112, location sharing, nearby hospital search, speech and offline checklist.
- **Cascade Lab** with synthetic causal dependency logic:
  `Extreme Rain → Road Access → Substation 4 → Pump 2 → Hospital A`
- **Break-the-Chain Recommendation** that compares simple intervention scenarios and explains the result.
- **Multi-Agent Explanation Layer**: Climate, Power, Water, Health and Verification agents.
- **Responsible AI panel**: fairness, transparency, ethics and privacy.
- **PWA/offline support** for cached static assets.

## Important Truth Labels

NEXUS-Ω separates:

- **LIVE** - weather retrieved from Open-Meteo.
- **LOCAL** - family check-ins and saved trips stored in the browser.
- **SIMULATED** - Cascade Lab values used for the educational demo.
- **UNVERIFIED** - road closures, utility outages, hospital capacity, flood depth, evacuation orders and official alerts unless a verified source is connected.

The prototype never claims synthetic infrastructure values are live.

## Why AI Is Used

The project uses AI/agent concepts for:

- conversational decision support,
- context interpretation,
- causal dependency reasoning,
- intervention comparison,
- explainable multi-agent outputs,
- human-readable recommendations.

The internship guideline allows prompt workflows, IBM BOB, agentic AI, RAG and multimodal components. This prototype demonstrates prompt/agent logic and an explainable decision-support workflow without requiring paid cloud AI credentials.

## Responsible AI Considerations

### Fairness
Avoid decisions that disadvantage people by identity, language, income or neighborhood. Vulnerability may guide support priority but not discriminatory treatment.

### Transparency
Important outputs show evidence, missing information, uncertainty and the data category (live/local/simulated/unverified).

### Ethics
The system does not fabricate emergencies or automatically execute consequential safety actions. Human judgment and official instructions remain primary.

### Privacy
Family data remains local in the prototype. Exact coordinates are not sent to the optional external free AI; only minimized weather context is shared.

## Demo Scenario

Default synthetic scenario:

`Extreme Rain → Road Access Risk → Substation 4 Risk → Pump 2 Risk → Hospital A Continuity Risk`

The **Break the Chain** logic compares interventions such as:
- road access/drainage support,
- substation backup,
- Pump 2 backup power,
- hospital emergency water storage.

The recommendation is based on modeled downstream risk reduction. It is a demonstration of causal decision-support logic, not a real-world engineering instruction.

## Run Locally - No Vercel Required

This final branch is intentionally static and does **not** require Vercel.

### Option 1: Python

```bash
git clone https://github.com/saicharan02117-star/nexora-ai.git
cd nexora-ai
git checkout 1m1b-final-nexus-omega
python -m http.server 8000
```

Open:

`http://localhost:8000`

### Option 2: VS Code Live Server

Open this branch/folder in VS Code and run **Live Server** on `index.html`.

## IBM Bob Requirement - Must Be Genuine

The internship team separately instructed that IBM Bob must be used at least once and that the **.bob** folder should be **automatically generated by IBM Bob**.

For academic integrity, this repository does **not** fabricate a `.bob` folder.

Before final submission:

1. Open this final project folder in IBM Bob.
2. Use Bob for a short project review / improvement conversation.
3. Allow IBM Bob to generate `.bob` automatically.
4. Keep the genuine `.bob` folder in the project root.
5. Commit that generated folder to this branch.
6. Keep one screenshot of the Bob conversation as evidence.

See: `docs/IBM_BOB_REQUIRED_STEP.md`.

## Final Submission Files

The official guideline requires a PPT or PDF covering:
- title,
- name and college,
- SDG alignment,
- problem statement,
- AI solution,
- target users,
- responsible AI,
- expected impact,
- prototype/demo evidence,
- impact statement.

The internship offer letter also states the final project should include a **concept note, video and code repository**.

Prepared documentation is in `docs/`.

## Repository Structure

```text
.
├── index.html
├── styles.css
├── app.js
├── manifest.webmanifest
├── sw.js
├── README.md
├── docs/
│   ├── CONCEPT_NOTE.md
│   ├── ARCHITECTURE.md
│   ├── RESPONSIBLE_AI.md
│   ├── DEMO_SCRIPT.md
│   ├── IBM_BOB_REQUIRED_STEP.md
│   ├── TEST_EVIDENCE.md
│   └── SUBMISSION_CHECKLIST.md
└── LICENSE
```

## Scope and Limitations

This is a student prototype. It does not have direct access to municipal control systems, live utility SCADA, hospital capacity systems, verified flood depth feeds, road-closure authority feeds or official evacuation systems. The Cascade Lab is synthetic and intentionally labeled.

## Expected Impact

If implemented with verified public and infrastructure data, NEXUS-Ω could improve preparedness, reduce fragmented decision-making, help users understand cross-system dependencies and support earlier intervention during disruptions.

The project prioritizes clarity, feasibility, responsible AI and explainable impact over pretending to be a production city command system.
