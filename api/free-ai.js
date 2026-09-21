function localFallback(message, context = {}, language = "English") {
  const w = context.weather || {};
  const rain = Number(w.rainProbability ?? 0);
  const precip = Number(w.precipitation ?? 0);
  const wind = Number(w.wind ?? 0);
  const q = String(message || "").toLowerCase();

  let severity = "low";
  if (rain >= 70 || precip >= 8 || wind >= 45) severity = "high";
  else if (rain >= 35 || precip >= 2 || wind >= 30) severity = "moderate";

  const weatherLine = context.weather
    ? `Current app context: ${w.weather || "weather loaded"}, ${w.temperature ?? "—"}°C, rain probability ${rain}%, precipitation ${precip} mm, wind ${wind} km/h.`
    : "Live weather context is not loaded yet.";

  let action = "Continue normal activities, but check live weather and official alerts before important travel.";
  if (severity === "moderate") action = "Use extra caution, re-check weather before leaving, and avoid relying on unverified road or outage claims.";
  if (severity === "high") action = "Avoid unnecessary exposure, re-check your route, keep your phone charged, and follow official emergency or local-authority instructions if issued.";

  if (q.includes("family")) action += " Confirm a family check-in plan and keep essential contacts available.";
  if (q.includes("travel") || q.includes("route")) action += " Use your navigation app for actual traffic and closure information.";
  if (q.includes("emergency")) action += " If there is immediate danger, call emergency services.";

  return `What this means\n${weatherLine}\n\nWhat may happen next\nThe current weather context suggests a ${severity} weather-related disruption level. NEXUS-Ω cannot verify live road closures, utility outages, hospital capacity, flood depth, evacuation orders, or official alerts unless a verified source is connected.\n\nWhat you should do\n${action}\n\nWhy / evidence and limits\nThis answer uses only the app context supplied above plus general safety logic. It is a fallback mode, not an official emergency forecast.`;
}

async function pollinationsAnswer(message, language, context) {
  const system = `You are Ω-CORE Free, the NEXUS-Ω resilience assistant. Help ordinary people with weather-aware travel caution, preparedness, family safety and emergency planning. Use the supplied app context as evidence. Never invent live road closures, utility outages, hospital capacity, flood levels, evacuation orders, or official alerts. If information is missing, say so. For emergencies, advise following official local authorities and emergency services. Structure important answers as: What this means; What may happen next; What you should do; Why / evidence and limits. Answer in ${language}.`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);
  try {
    const response = await fetch("https://text.pollinations.ai/openai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
      body: JSON.stringify({
        messages: [
          { role: "system", content: system },
          { role: "user", content: `QUESTION:\n${message}\n\nNEXUS APP CONTEXT:\n${JSON.stringify(context)}` }
        ]
      })
    });

    if (!response.ok) throw new Error("Free model unavailable");
    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error("No free-model response");
    return { text, provider: "Pollinations community text API" };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { message, language = "English", context = {} } = req.body || {};
  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "A message is required." });
  }

  try {
    const result = await pollinationsAnswer(message, language, context);
    return res.status(200).json({
      text: result.text,
      engine: "free-ai",
      provider: result.provider,
      paidApiKeyRequired: false
    });
  } catch (e) {
    return res.status(200).json({
      text: localFallback(message, context, language),
      engine: "nexus-local-fallback",
      provider: "NEXUS local safety fallback",
      paidApiKeyRequired: false,
      degraded: true
    });
  }
};