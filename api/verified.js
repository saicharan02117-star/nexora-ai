module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const openaiKey = process.env.OPENAI_API_KEY;
  const perplexityKey = process.env.PERPLEXITY_API_KEY;
  if (!openaiKey || !perplexityKey) return res.status(503).json({ error: "Both OPENAI_API_KEY and PERPLEXITY_API_KEY must be configured on the server." });

  const { message, language = "English", context = {} } = req.body || {};
  if (!message || typeof message !== "string") return res.status(400).json({ error: "A message is required." });

  try {
    const researchResp = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${perplexityKey}` },
      body: JSON.stringify({
        model: "sonar",
        messages: [
          { role: "system", content: `Research fresh public information relevant to NEXUS-Ω resilience questions. Prefer authoritative sources. Never fabricate live outages, closures, hospital capacity, flood levels, evacuation orders, or official alerts. Answer in ${language}.` },
          { role: "user", content: `QUESTION:\n${message}\n\nLOCAL APP CONTEXT:\n${JSON.stringify(context)}` }
        ],
        return_citations: true
      })
    });
    const researchData = await researchResp.json();
    if (!researchResp.ok) return res.status(researchResp.status).json({ error: researchData?.error?.message || "Perplexity request failed." });
    const researchText = researchData?.choices?.[0]?.message?.content || "";
    const citations = researchData.citations || [];

    const synthesisResp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
      body: JSON.stringify({
        model: "gpt-5.6",
        store: false,
        instructions: `You are Ω-CORE Verified, the NEXUS-Ω synthesis layer. Combine the user's local app context with Perplexity's fresh research. Keep live facts, local app facts, uncertainty, and recommendations clearly separated. Never promote an unverified web claim to an official emergency fact. For high-consequence situations, direct the user to official authorities and emergency services when appropriate. Answer in ${language}. Structure important answers as: What this means; What may happen next; What you should do; Evidence and limits.`,
        input: `USER QUESTION:\n${message}\n\nLOCAL APP CONTEXT:\n${JSON.stringify(context)}\n\nPERPLEXITY RESEARCH:\n${researchText}\n\nCITATIONS:\n${JSON.stringify(citations)}`
      })
    });
    const synthesisData = await synthesisResp.json();
    if (!synthesisResp.ok) return res.status(synthesisResp.status).json({ error: synthesisData?.error?.message || "OpenAI synthesis failed." });
    const text = synthesisData.output_text || synthesisData.output?.flatMap(x => x.content || []).find(x => x.type === "output_text")?.text || researchText;
    return res.status(200).json({ text, citations, engine: "verified", researchModel: researchData.model || "sonar", synthesisModel: synthesisData.model || "gpt-5.6" });
  } catch (e) {
    return res.status(500).json({ error: "Verified AI pipeline failed." });
  }
};