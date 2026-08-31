module.exports = async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  return res.status(200).json({
    openaiConfigured: Boolean(process.env.OPENAI_API_KEY),
    perplexityConfigured: Boolean(process.env.PERPLEXITY_API_KEY),
    openaiModel: process.env.OPENAI_MODEL || "gpt-5.6",
    perplexityMode: "agent-pro-search",
    verifiedPipelineReady: Boolean(process.env.OPENAI_API_KEY && process.env.PERPLEXITY_API_KEY)
  });
};