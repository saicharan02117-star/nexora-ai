module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const openaiKey = process.env.OPENAI_API_KEY;
  const perplexityKey = process.env.PERPLEXITY_API_KEY;
  if (!openaiKey) return res.status(503).json({ error: "OPENAI_API_KEY is not configured on the server." });

  const { message, language = "English", context = {} } = req.body || {};
  if (!message || typeof message !== "string") return res.status(400).json({ error: "A message is required." });

  const baseInstructions = `You are Ω-CORE, the NEXUS-Ω personal resilience assistant.
Help ordinary people understand daily disruption risk, weather-aware travel caution, preparedness, family check-ins, nearby services, and emergency planning.
Use the supplied app context as local evidence. Never invent live road closures, utility outages, hospital capacity, flood levels, evacuation orders, or official alerts.
When data is missing, say exactly what is missing.
For emergency or high-consequence situations, advise following official local authorities and calling emergency services when appropriate.
Keep answers practical, concise and action-oriented. Structure important answers as:
- What this means
- What may happen next
- What you should do
- Why / evidence and limits
Answer in ${language}.`;

  let researchText = "";
  let citations = [];
  let researchModel = null;

  try {
    if (perplexityKey) {
      const researchResp = await fetch("https://api.perplexity.ai/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${perplexityKey}`
        },
        body: JSON.stringify({
          model: "sonar",
          messages: [
            {
              role: "system",
              content: `You are the fresh web-research layer for NEXUS-Ω. Research the user's question when current public information would help. Prefer authoritative/public-safety sources for consequential claims. Never fabricate live outages, closures, hospital capacity, flood levels, evacuation orders, or official alerts. Clearly distinguish public web information from local app context. Answer research notes in ${language}.`
            },
            {
              role: "user",
              content: `QUESTION:\n${message}\n\nLOCAL NEXUS CONTEXT:\n${JSON.stringify(context)}`
            }
          ],
          return_citations: true
        })
      });
      const researchData = await researchResp.json();
      if (researchResp.ok) {
        researchText = researchData?.choices?.[0]?.message?.content || "";
        citations = researchData.citations || [];
        researchModel = researchData.model || "sonar";
      }
    }

    const input = `USER QUESTION:\n${message}\n\nNEXUS APP CONTEXT:\n${JSON.stringify(context)}\n\nFRESH WEB RESEARCH FROM PERPLEXITY (may be empty if unavailable):\n${researchText}\n\nPERPLEXITY SOURCE URLS:\n${JSON.stringify(citations)}`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${openaiKey}`
      },
      body: JSON.stringify({
        model: "gpt-5.6",
        store: false,
        instructions: baseInstructions + `\nIf Perplexity research is supplied, use it as supporting fresh research, but do not treat an unverified web claim as an official emergency fact. Mention uncertainty where necessary.`,
        input
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || "OpenAI request failed." });

    const text = data.output_text || data.output?.flatMap(x => x.content || []).find(x => x.type === "output_text")?.text || "I could not produce a text response.";

    return res.status(200).json({
      text,
      citations,
      engine: researchText ? "openai+perplexity" : "openai",
      synthesisModel: data.model || "gpt-5.6",
      researchModel
    });
  } catch (e) {
    return res.status(500).json({ error: "Ω-CORE AI service request failed." });
  }
};