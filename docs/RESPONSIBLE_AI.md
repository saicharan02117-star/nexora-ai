# Responsible AI Considerations

## Fairness
NEXUS-Ω must not make safety decisions based on protected identity or assumptions about a community. In a future deployment, risk models should be audited for geographic, economic and language bias. Vulnerability information may support equitable resource prioritization, but should not become discriminatory treatment.

## Transparency
The interface labels information as:
- LIVE,
- LOCAL,
- SIMULATED,
- UNVERIFIED.

Important outputs are structured as:
**status → meaning → consequence → action → why / limits**

The user is told when a value is synthetic or when a required live source is unavailable.

## Ethics
The system does not:
- invent road closures,
- invent utility outages,
- invent hospital capacity,
- invent flood depth,
- invent evacuation orders,
- claim to replace emergency authorities.

Consequential infrastructure actions remain human-approved.

## Privacy
The prototype minimizes personal data:
- family names/check-ins remain in browser local storage,
- saved routes remain local,
- exact coordinates are not sent to the optional external free AI,
- the external model only receives minimized weather context and the user's question.

## Safety Limitations
NEXUS-Ω is a student prototype and cannot be used as an official emergency warning system. Users should follow verified government alerts, emergency services and local authorities for consequential decisions.

## Verification Principle
**Evidence before certainty.**

If data is missing, the correct output is “unknown” or a limited recommendation - not invented certainty.
