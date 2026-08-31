module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const key = process.env.OPENAI_API_KEY;
  if (!key) return res.status(503).json({ error: "OPENAI_API_KEY is not configured on the server." });

  const { message, language = "English", context = {} } = req.body || {};
  if (!message || typeof message !== "string") return res.status(400).json({ error: "A message is required." });

  const instructions = `You are Ω-CORE, the NEXUS-Ω personal resilience assistant.
Help ordinary people understand daily disruption risk, weather-aware travel caution, preparedness, family check-ins, and emergency planning.
Use the supplied app context only as evidence. Never invent live road closures, utility outages, hospital capacity, flood levels, evacuation orders, or official alerts.
When data is missing, say exactly what is missing.
For emergency or high-consequence situations, advise following official local authorities and calling emergency services when appropriate.
Keep answers practical, concise and action-oriented. Structure important answers as:
- What this means
- What may happen next
- What you should do
- Why / evidence
Answer in ${language}.`;

  const input = `USER QUESTION:\n${message}\n\nNEXUS APP CONTEXT:\n${JSON.stringify(context)}`;

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        model: "gpt-5.6",
        instructions,
        input,
        store: false
      })
    });
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || "OpenAI request failed." });
    const text = data.output_text || data.output?.flatMap(x => x.content || []).find(x => x.type === "output_text")?.text || "I could not produce a text response.";
    return res.status(200).json({ text, engine: "openai", model: data.model || "gpt-5.6" });
  } catch (e) {
    return res.status(500).json({ error: "OpenAI service request failed." });
  }
};