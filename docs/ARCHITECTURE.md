# NEXUS-Ω Architecture

## High-Level Architecture

```text
                         USER
                          |
                          v
                NEXUS-Ω WEB INTERFACE
                          |
        +-----------------+-----------------+
        |                 |                 |
        v                 v                 v
 Personal Guardian    Ω-CORE Assistant   Cascade Lab
        |                 |                 |
        |                 |                 v
        |                 |          Dependency Model
        |                 |                 |
        |                 |                 v
        |                 |         Intervention Simulator
        |                 |                 |
        +-----------------+-----------------+
                          |
                          v
                 EXPLAINABLE OUTPUT
    Status -> Meaning -> Consequence -> Action -> Why
                          |
                          v
                 HUMAN DECISION / ACTION
```

## Data Layers

### Live
Open-Meteo weather values used only for weather-aware guidance.

### Local
Browser localStorage:
- saved trips,
- family names/check-in status,
- saved location coordinates.

### Simulated
Cascade Lab:
- rain intensity,
- road-access risk,
- substation risk,
- pump risk,
- hospital continuity risk.

### Unverified / Not Connected
The prototype does not claim:
- live road closures,
- utility-provider outages,
- hospital capacity,
- real flood depth,
- official evacuation orders,
- municipal emergency feeds.

## Ω-CORE Logic

```text
SENSE
  ↓
UNDERSTAND
  ↓
PREDICT
  ↓
TRACE DEPENDENCIES
  ↓
SIMULATE COUNTERFACTUALS
  ↓
BREAK THE CHAIN
  ↓
VERIFY DATA TYPE + LIMITS
  ↓
RECOVER
  ↓
LEARN
```

## Agent Roles

**Climate Agent**  
Interprets the initiating weather hazard.

**Power Agent**  
Tracks how access/rain stress could propagate to power continuity.

**Water Agent**  
Tracks dependency of pumping on electricity.

**Health Agent**  
Represents downstream continuity impact on healthcare.

**Verification Agent**  
Checks that simulated data is never presented as live operational data.

## Cascade Demonstration

```text
Extreme Rain
    ↓
Road Access
    ↓
Substation 4
    ↓
Pump 2
    ↓
Hospital A
```

Each intervention changes the simplified dependency equations. The prototype compares modeled downstream risk reduction per intervention. This demonstrates causal and counterfactual reasoning rather than a production infrastructure forecast.

## Human-in-the-Loop

NEXUS-Ω is decision support.

```text
AI/Model recommends
        ↓
Evidence + limits displayed
        ↓
Human reviews
        ↓
Human acts / follows official instructions
```
