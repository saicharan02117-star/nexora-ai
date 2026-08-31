module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) return res.status(503).json({ error: "PERPLEXITY_API_KEY is not configured on the server." });

  const { message, language = "English", context = {} } = req.body || {};
  if (!message || typeof message !== "string") return res.status(400).json({ error: "A message is required." });

  const system = `You are the web-research layer for NEXUS-Ω, a personal resilience and infrastructure continuity assistant.
Use fresh web information when relevant. Distinguish verified public information from the app's local context. Do not invent outages, closures, hospital capacity, flood levels, evacuation orders, or official alerts.
Prefer authoritative/public-safety sources for high-consequence claims. Keep the answer practical and in ${language}.`;

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          { role: "system", content: system },
          { role: "user", content: `QUESTION:\n${message}\n\nNEXUS APP CONTEXT:\n${JSON.stringify(context)}` }
        ],
        return_citations: true
      })
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || "Perplexity request failed." });
    const text = data?.choices?.[0]?.message?.content || "I could not produce a research response.";
    return res.status(200).json({ text, citations: data.citations || [], engine: "perplexity", model: data.model || "sonar" });
  } catch (e) {
    return res.status(500).json({ error: "Perplexity service request failed." });
  }
};