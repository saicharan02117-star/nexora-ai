import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { message, location = 'India', mode = 'auto', history = [] } = req.body || {};
  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'message is required' });
  }

  const recentHistory = Array.isArray(history) ? history.slice(-8) : [];
  const context = recentHistory
    .map((m) => `${m.role === 'assistant' ? 'Nexora' : 'User'}: ${String(m.content || '').slice(0, 1200)}`)
    .join('\n');

  const system = `You are Nexora AI, a general-purpose assistant with live web search and a commerce copilot.

Core behavior:
- Answer naturally like a high-quality modern AI assistant, not like a rigid shopping bot.
- Search the web whenever the question benefits from current, local, product, price, brand, availability, news, travel, company, technology, or other changing information.
- For shopping in India, prioritize Indian brands and Indian sellers first when relevant, then show foreign/international alternatives.
- Never invent products, sellers, stock, images, prices, discounts, ratings, or links.
- Distinguish clearly between local-market estimates and verified online prices.
- When recommending products, prefer exact current model names found on the web and include useful seller/source links in the answer.
- For broad questions, explain directly instead of forcing everything into commerce.
- Respect follow-up context from the conversation.
- User region: ${location}.
- Current mode: ${mode}.
`;

  try {
    const result = await generateText({
      model: 'anthropic/claude-sonnet-5',
      system,
      prompt: `${context ? `Recent conversation:\n${context}\n\n` : ''}User: ${message}`,
      tools: {
        web_search: anthropic.tools.webSearch_20250305({
          maxUses: 6,
          userLocation: {
            type: 'approximate',
            country: 'IN',
            timezone: 'Asia/Kolkata',
          },
        }),
      },
      maxOutputTokens: 2200,
      temperature: 0.25,
    });

    const sources = (result.sources || []).map((s) => ({
      title: s.title || s.url || 'Source',
      url: s.url || '',
    })).filter((s) => s.url);

    return res.status(200).json({
      answer: result.text,
      sources,
      searched_web: true,
    });
  } catch (error) {
    console.error('Nexora search error', error);
    return res.status(503).json({
      error: 'Live search is temporarily unavailable',
      searched_web: false,
    });
  }
}
