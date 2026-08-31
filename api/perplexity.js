function extractPerplexity(data) {
  const text = [];
  const citations = [];
  for (const item of data?.output || []) {
    for (const part of item?.content || []) {
      if (part?.text) text.push(part.text);
      for (const a of part?.annotations || []) {
        if (a?.url) citations.push({ title: a.title || a.url, url: a.url });
      }
    }
  }
  const unique = [...new Map(citations.map(x => [x.url, x])).values()];
  return { text: data?.output_text || text.join("\n\n"), citations: unique };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) return res.status(503).json({ error: "PERPLEXITY_API_KEY is not configured on the server." });

  const { message, language = "English", context = {} } = req.body || {};
  if (!message || typeof message !== "string") return res.status(400).json({ error: "A message is required." });

  const instructions = `You are the fresh web-research layer for NEXUS-Ω, a personal resilience and infrastructure continuity assistant. Prefer authoritative and official public-safety sources for consequential claims. Never fabricate live outages, road closures, hospital capacity, flood levels, evacuation orders, or official alerts. Clearly separate verified public information from the app's local context. Keep the result practical and answer in ${language}.`;

  try {
    const response = await fetch("https://api.perplexity.ai/v1/agent", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        preset: "pro-search",
        instructions,
        input: `QUESTION:\n${message}\n\nNEXUS APP CONTEXT:\n${JSON.stringify(context)}`
      })
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || "Perplexity request failed." });
    const parsed = extractPerplexity(data);
    return res.status(200).json({
      text: parsed.text || "I could not produce a research response.",
      citations: parsed.citations,
      engine: "perplexity",
      model: data.model || "perplexity-agent-pro-search"
    });
  } catch (e) {
    return res.status(500).json({ error: "Perplexity service request failed." });
  }
};