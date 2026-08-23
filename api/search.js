import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

const decodeHtml = (value = '') => String(value)
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/\s+/g, ' ')
  .trim();

function unwrapDuckUrl(href = '') {
  try {
    const absolute = href.startsWith('//') ? `https:${href}` : href;
    const url = new URL(absolute);
    const redirected = url.searchParams.get('uddg');
    return redirected ? decodeURIComponent(redirected) : absolute;
  } catch {
    return href;
  }
}

async function duckSearch(query) {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; NexoraAI/1.0; +https://nexora-ai-app-blue.vercel.app)',
      'Accept-Language': 'en-IN,en;q=0.9',
    },
  });
  if (!response.ok) return [];
  const html = await response.text();
  const results = [];
  const anchor = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchor.exec(html)) && results.length < 8) {
    const href = unwrapDuckUrl(match[1]);
    const title = decodeHtml(match[2]);
    if (!href || !/^https?:\/\//i.test(href) || !title) continue;
    const following = html.slice(anchor.lastIndex, anchor.lastIndex + 2400);
    const snippetMatch = following.match(/<(?:a|div)[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(?:a|div)>/i);
    results.push({ title, url: href, snippet: decodeHtml(snippetMatch?.[1] || '') });
  }
  return results;
}

async function bingSearch(query) {
  const url = `https://www.bing.com/search?format=rss&q=${encodeURIComponent(query)}`;
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; NexoraAI/1.0; +https://nexora-ai-app-blue.vercel.app)',
      'Accept-Language': 'en-IN,en;q=0.9',
    },
  });
  if (!response.ok) return [];
  const xml = await response.text();
  const items = [];
  const itemRx = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRx.exec(xml)) && items.length < 8) {
    const block = match[1];
    const title = decodeHtml(block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '');
    const link = decodeHtml(block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || '');
    const snippet = decodeHtml(block.match(/<description>([\s\S]*?)<\/description>/i)?.[1] || '');
    if (title && /^https?:\/\//i.test(link)) items.push({ title, url: link, snippet });
  }
  return items;
}

async function instantAnswer(query) {
  try {
    const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`, {
      headers: { 'User-Agent': 'NexoraAI/1.0' },
    });
    if (!response.ok) return null;
    const data = await response.json();
    if (data?.AbstractText) {
      return {
        text: String(data.AbstractText).trim(),
        source: data.AbstractURL ? { title: data.Heading || 'Reference', url: data.AbstractURL } : null,
      };
    }
  } catch {}
  return null;
}

function mergeResults(...groups) {
  const seen = new Set();
  const merged = [];
  for (const group of groups) {
    for (const item of group || []) {
      try {
        const key = new URL(item.url).hostname.replace(/^www\./, '') + new URL(item.url).pathname.replace(/\/$/, '');
        if (seen.has(key)) continue;
        seen.add(key);
        merged.push(item);
      } catch {}
      if (merged.length >= 10) return merged;
    }
  }
  return merged;
}

function fallbackAnswer(message, instant, results) {
  const lines = [];
  if (instant?.text) lines.push(instant.text);

  if (results.length) {
    lines.push('I searched the live web and found these current results:');
    results.slice(0, 6).forEach((item, index) => {
      const detail = item.snippet ? ` — ${item.snippet}` : '';
      lines.push(`${index + 1}. **${item.title}**${detail}`);
    });
    lines.push('Open the source cards below for the exact pages. For prices, stock, seller offers and specifications, use the linked source as the verified reference.');
  } else if (!instant?.text) {
    lines.push(`I could not retrieve reliable live results for “${message}” right now. Try a more specific query such as a product name, budget, location, or model.`);
  }

  return lines.join('\n\n');
}

async function noCardFallback(message, location) {
  const locationQuery = location && !message.toLowerCase().includes(String(location).toLowerCase())
    ? `${message} ${location}`
    : message;
  const [instant, duck, bing] = await Promise.all([
    instantAnswer(locationQuery),
    duckSearch(locationQuery).catch(() => []),
    bingSearch(locationQuery).catch(() => []),
  ]);
  const results = mergeResults(duck, bing);
  const sources = [];
  if (instant?.source) sources.push(instant.source);
  for (const r of results) sources.push({ title: r.title, url: r.url });
  return {
    answer: fallbackAnswer(message, instant, results),
    sources: sources.slice(0, 10),
    searched_web: true,
    search_mode: 'multi-engine-fallback',
  };
}

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
      search_mode: 'ai-gateway',
    });
  } catch (error) {
    console.error('Nexora AI Gateway error', error);
    try {
      const fallback = await noCardFallback(message, location);
      return res.status(200).json(fallback);
    } catch (fallbackError) {
      console.error('Nexora fallback search error', fallbackError);
      return res.status(503).json({
        error: 'Live search is temporarily unavailable',
        searched_web: false,
      });
    }
  }
}
