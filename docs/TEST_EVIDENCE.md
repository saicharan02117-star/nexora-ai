# Prototype Test Evidence

## Functional Checks

### Navigation
- Today view opens.
- Ask NEXUS opens.
- Route Guardian opens.
- Family Guardian opens.
- Cascade Lab opens.
- Responsible AI opens.
- Emergency Copilot opens.

### Weather
- Location permission requested only on user action or when a saved location exists.
- Weather source: Open-Meteo.
- Weather values are labeled as live.
- Failure to load weather does not create fake values.

### Ask NEXUS
- Free community AI is optional.
- Local deterministic safety fallback remains available if the external model fails.
- Exact user coordinates are omitted from the external AI prompt.
- The answer explicitly states limits for unverified safety facts.

### Route Guardian
- Adds weather-aware caution.
- Does not claim traffic or closures.
- Real navigation is handed to the user's mapping provider.

### Family Guardian
- Add member.
- Toggle check-in.
- Remove member.
- Browser localStorage only.

### Cascade Lab
- Rain slider updates scenario.
- Four intervention toggles update downstream modeled risk.
- Recommended-intervention button runs counterfactual comparison.
- All infrastructure outputs are labeled simulated.
- Verification Agent reminds users that no live infrastructure data is being claimed.

### Emergency
- 112 call link.
- Share location after user grants location.
- Nearby hospital map search.
- Spoken guidance when browser speech synthesis exists.
- Offline checklist.

## Known Limitations
- No municipal/utility SCADA integration.
- No verified road-closure feed.
- No hospital capacity feed.
- No official flood-depth or evacuation API.
- Free external text service availability is not guaranteed; local fallback handles this.
- Cascade equations are educational simplifications, not calibrated infrastructure models.
