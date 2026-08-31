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
  return { text: data?.output_text || text.join("\n\n"), citations: [...new Map(citations.map(x => [x.url, x])).values()] };
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const openaiKey = process.env.OPENAI_API_KEY;
  const perplexityKey = process.env.PERPLEXITY_API_KEY;
  if (!openaiKey || !perplexityKey) return res.status(503).json({ error: "Both OPENAI_API_KEY and PERPLEXITY_API_KEY must be configured on the server." });

  const { message, language = "English", context = {} } = req.body || {};
  if (!message || typeof message !== "string") return res.status(400).json({ error: "A message is required." });

  try {
    const researchResp = await fetch("https://api.perplexity.ai/v1/agent", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${perplexityKey}` },
      body: JSON.stringify({
        preset: "pro-search",
        instructions: `Research fresh public information relevant to NEXUS-Ω resilience questions. Prefer authoritative sources. Never fabricate live outages, closures, hospital capacity, flood levels, evacuation orders, or official alerts. Answer in ${language}.`,
        input: `QUESTION:\n${message}\n\nLOCAL APP CONTEXT:\n${JSON.stringify(context)}`
      })
    });
    const researchData = await researchResp.json();
    if (!researchResp.ok) return res.status(researchResp.status).json({ error: researchData?.error?.message || "Perplexity request failed." });
    const parsed = extractPerplexity(researchData);

    const synthesisResp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || "gpt-5.6",
        store: false,
        instructions: `You are Ω-CORE Verified, the NEXUS-Ω synthesis layer. Combine the user's local app context with Perplexity's fresh research. Keep live facts, local app facts, uncertainty, and recommendations clearly separated. Never promote an unverified web claim to an official emergency fact. For high-consequence situations, direct the user to official authorities and emergency services when appropriate. Answer in ${language}. Structure important answers as: What this means; What may happen next; What you should do; Evidence and limits.`,
        input: `USER QUESTION:\n${message}\n\nLOCAL APP CONTEXT:\n${JSON.stringify(context)}\n\nPERPLEXITY RESEARCH:\n${parsed.text}\n\nCITATIONS:\n${JSON.stringify(parsed.citations)}`
      })
    });
    const synthesisData = await synthesisResp.json();
    if (!synthesisResp.ok) return res.status(synthesisResp.status).json({ error: synthesisData?.error?.message || "OpenAI synthesis failed." });
    const text = synthesisData.output_text || synthesisData.output?.flatMap(x => x.content || []).find(x => x.type === "output_text")?.text || parsed.text;
    return res.status(200).json({ text, citations: parsed.citations, engine: "verified", researchModel: researchData.model || "perplexity-agent-pro-search", synthesisModel: synthesisData.model || process.env.OPENAI_MODEL || "gpt-5.6" });
  } catch (e) {
    return res.status(500).json({ error: "Verified AI pipeline failed." });
  }
};