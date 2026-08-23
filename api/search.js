import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

const YEAR = new Date().getFullYear();

const decodeHtml = (value = '') => String(value)
  .replace(/<[^>]+>/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>')
  .replace(/\s+/g, ' ')
  .trim();

const BLOCKED_DICTIONARY_HOSTS = [
  'merriam-webster.com', 'dictionary.cambridge.org', 'dictionary.com',
  'vocabulary.com', 'thesaurus.com', 'collinsdictionary.com', 'wordnik.com',
];

const VERTICALS = [
  { id: 'car', rx: /\b(car|cars|suv|sedan|hatchback|vehicle)\b/i, authority: ['carwale.com','cardekho.com','autocarindia.com','carandbike.com','zigwheels.com','team-bhp.com'], extra: 'best options price mileage safety features service reliability resale value ownership review' },
  { id: 'camera', rx: /\b(camera|dslr|mirrorless|photography camera|vlogging camera)\b/i, authority: ['dpreview.com','imaging-resource.com','sony.co.in','canon.co.in','nikon.co.in','fujifilm-x.com'], extra: 'best options price review image quality autofocus video battery' },
  { id: 'phone', rx: /\b(phone|mobile|smartphone)\b/i, authority: ['91mobiles.com','gadgets360.com','smartprix.com','croma.com','reliancedigital.in','flipkart.com','amazon.in'], extra: 'best options price specifications camera battery performance review' },
  { id: 'laptop', rx: /\b(laptop|notebook computer)\b/i, authority: ['digit.in','gadgets360.com','croma.com','reliancedigital.in','flipkart.com','amazon.in'], extra: 'best options price processor RAM performance battery review' },
  { id: 'shopping', rx: /\b(buy|price|under|budget|product|shoe|slipper|towel|chair|table|tv|earbud|headphone|watch|bag|tool|appliance|shirt|jeans|bottle|bucket|rack|mixer|fan|toy|cycle|bicycle)\b/i, authority: ['amazon.in','flipkart.com','croma.com','reliancedigital.in','vijaysales.com','meesho.com','indiamart.com'], extra: 'best options price India review compare buy online local market' },
];

function detectVertical(text) {
  return VERTICALS.find(v => v.rx.test(text)) || null;
}

function cleanNaturalQuery(message) {
  let q = String(message || '').trim();
  q = q
    .replace(/^(please\s+)?(can you\s+|could you\s+|will you\s+)?/i, '')
    .replace(/^(suggest|recommend)\s+(me\s+)?/i, '')
    .replace(/^(give|show|find|get)\s+(me\s+)?/i, '')
    .replace(/^(tell\s+me\s+|help\s+me\s+(find|choose)\s+)/i, '')
    .replace(/^what('?s| is)\s+the\s+/i, '')
    .replace(/\ba\s+best\b/gi, 'best')
    .replace(/\s+/g, ' ')
    .trim();
  return q || String(message || '').trim();
}

function resolveFollowup(message, history) {
  const raw = String(message || '').trim();
  const recent = Array.isArray(history) ? history.slice(-10) : [];
  const lastUser = [...recent].reverse().find(m => m?.role === 'user' && String(m?.content || '').trim());
  if (!lastUser) return raw;

  const words = raw.split(/\s+/).filter(Boolean);
  const looksLikeConstraint = words.length <= 9 && (
    /(?:₹|rs\.?|rupees?|lakh|lakhs|crore|under|below|budget|automatic|manual|petrol|diesel|electric|ev|hybrid|camera|battery|black|white|blue|red|indian|foreign|premium|cheap|cheaper|best|family|seater|seat|plastic|steel|metal|wood|soft|hard|size|delivery)/i.test(raw)
    || /^\d[\d,.]*\s*(?:k|l|lakh|lakhs|crore)?$/i.test(raw)
  );
  if (!looksLikeConstraint) return raw;
  return `${String(lastUser.content).trim()} — follow-up preference/constraint: ${raw}`;
}

function buildQueries(message, location, history) {
  const effective = resolveFollowup(message, history);
  const cleaned = cleanNaturalQuery(effective);
  const vertical = detectVertical(cleaned);
  const region = location && !cleaned.toLowerCase().includes(String(location).toLowerCase()) ? String(location) : '';
  const recommendationIntent = /\b(best|top|suggest|recommend|choose|compare|buy|price|good)\b/i.test(message);

  const base = [cleaned, region, YEAR].filter(Boolean).join(' ');
  const variants = [base];

  if (vertical) {
    variants.push(`${cleaned} ${vertical.extra} ${region} ${YEAR}`.replace(/\s+/g, ' ').trim());
    if (vertical.authority.length) {
      variants.push(`${cleaned} ${region} ${YEAR} ${vertical.authority.slice(0,3).join(' ')}`.replace(/\s+/g, ' ').trim());
    }
  } else if (recommendationIntent) {
    variants.push(`best ${cleaned} ${region} ${YEAR} price review comparison buying guide`.replace(/\s+/g, ' ').trim());
    variants.push(`${cleaned} ${region} ${YEAR} best value premium budget options review`.replace(/\s+/g, ' ').trim());
  } else {
    variants.push(`${cleaned} ${region} ${YEAR}`.replace(/\s+/g, ' ').trim());
  }

  return { effective, cleaned, vertical, recommendationIntent, queries: [...new Set(variants)].slice(0,3) };
}

function unwrapDuckUrl(href = '') {
  try {
    const absolute = href.startsWith('//') ? `https:${href}` : href;
    const url = new URL(absolute);
    const redirected = url.searchParams.get('uddg');
    return redirected ? decodeURIComponent(redirected) : absolute;
  } catch { return href; }
}

async function duckSearch(query) {
  const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NexoraAI/1.0)', 'Accept-Language': 'en-IN,en;q=0.9' },
  });
  if (!response.ok) return [];
  const html = await response.text();
  const results = [];
  const anchor = /<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchor.exec(html)) && results.length < 10) {
    const href = unwrapDuckUrl(match[1]);
    const title = decodeHtml(match[2]);
    if (!href || !/^https?:\/\//i.test(href) || !title) continue;
    const following = html.slice(anchor.lastIndex, anchor.lastIndex + 2600);
    const snippetMatch = following.match(/<(?:a|div)[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(?:a|div)>/i);
    results.push({ title, url: href, snippet: decodeHtml(snippetMatch?.[1] || ''), engine: 'DuckDuckGo' });
  }
  return results;
}

async function bingSearch(query) {
  const response = await fetch(`https://www.bing.com/search?format=rss&q=${encodeURIComponent(query)}`, {
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NexoraAI/1.0)', 'Accept-Language': 'en-IN,en;q=0.9' },
  });
  if (!response.ok) return [];
  const xml = await response.text();
  const items = [];
  const itemRx = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRx.exec(xml)) && items.length < 10) {
    const block = match[1];
    const title = decodeHtml(block.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || '');
    const link = decodeHtml(block.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || '');
    const snippet = decodeHtml(block.match(/<description>([\s\S]*?)<\/description>/i)?.[1] || '');
    if (title && /^https?:\/\//i.test(link)) items.push({ title, url: link, snippet, engine: 'Bing' });
  }
  return items;
}

async function instantAnswer(query) {
  try {
    const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`, { headers: { 'User-Agent': 'NexoraAI/1.0' } });
    if (!response.ok) return null;
    const data = await response.json();
    if (data?.AbstractText) return { text: String(data.AbstractText).trim(), source: data.AbstractURL ? { title: data.Heading || 'Reference', url: data.AbstractURL } : null };
  } catch {}
  return null;
}

function importantTokens(cleaned) {
  const stop = new Set(['the','a','an','me','my','for','in','on','of','to','and','or','is','are','best','top','good','suggest','recommend','give','show','find','india',String(YEAR)]);
  return cleaned.toLowerCase().match(/[a-z0-9]+/g)?.filter(t => t.length > 2 && !stop.has(t)) || [];
}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); } catch { return ''; }
}

function rankResults(results, cleaned, vertical) {
  const tokens = importantTokens(cleaned);
  return results
    .filter(item => {
      const host = hostOf(item.url);
      if (!host) return false;
      if (BLOCKED_DICTIONARY_HOSTS.some(d => host === d || host.endsWith(`.${d}`))) return false;
      return true;
    })
    .map(item => {
      const hay = `${item.title} ${item.snippet}`.toLowerCase();
      const host = hostOf(item.url);
      let score = 0;
      for (const token of tokens) {
        if (item.title.toLowerCase().includes(token)) score += 5;
        else if (hay.includes(token)) score += 2;
      }
      if (vertical?.authority.some(d => host === d || host.endsWith(`.${d}`))) score += 8;
      if (/price|review|best|top|compare|specification|mileage|safety|buy|rating/i.test(hay)) score += 2;
      if (hay.includes(String(YEAR))) score += 1;
      return { ...item, score };
    })
    .filter(item => item.score > 0 || tokens.length === 0)
    .sort((a,b) => b.score - a.score);
}

function mergeResults(groups, cleaned, vertical) {
  const seen = new Set();
  const merged = [];
  for (const group of groups) {
    for (const item of group || []) {
      let key;
      try { const u = new URL(item.url); key = u.hostname.replace(/^www\./, '') + u.pathname.replace(/\/$/, ''); } catch { continue; }
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(item);
    }
  }
  return rankResults(merged, cleaned, vertical).slice(0,10);
}

function fallbackAnswer(message, instant, results, plan) {
  const lines = [];
  if (instant?.text && !plan.vertical && !plan.recommendationIntent) lines.push(instant.text);

  if (results.length) {
    if (plan.recommendationIntent) {
      lines.push(`I understood the recommendation request and searched current sources for **${plan.cleaned}**. I’m giving you useful options immediately instead of forcing you to enter a budget or specifications first.`);
      lines.push('**Strong current matches**');
    } else {
      lines.push('I searched the live web and ranked the most relevant current results:');
    }

    results.slice(0,6).forEach((item, index) => {
      const detail = item.snippet ? ` — ${item.snippet}` : '';
      lines.push(`${index + 1}. **${item.title}**${detail}`);
    });

    if (plan.recommendationIntent) {
      lines.push('I’ll use sensible default assumptions when you give a broad request. If you later add a budget, size, material, use case, brand, colour or other preference, I’ll refine these same results instead of restarting the search.');
    } else {
      lines.push('Use the source cards below for the exact current pages.');
    }
  } else if (!instant?.text) {
    lines.push(`I understood “${message}”, but I could not retrieve a reliable current result yet. I will keep treating the full phrase as the subject instead of searching only one word from it.`);
  }

  return lines.join('\n\n');
}

async function noCardFallback(message, location, history) {
  const plan = buildQueries(message, location, history);
  const searchCalls = [];
  for (const q of plan.queries.slice(0,3)) {
    searchCalls.push(duckSearch(q).catch(() => []));
    searchCalls.push(bingSearch(q).catch(() => []));
  }
  const [instant, ...groups] = await Promise.all([
    instantAnswer(plan.cleaned).catch(() => null),
    ...searchCalls,
  ]);
  const results = mergeResults(groups, plan.cleaned, plan.vertical);
  const sources = [];
  if (instant?.source && !plan.vertical && !plan.recommendationIntent) sources.push(instant.source);
  for (const r of results) sources.push({ title: r.title, url: r.url });

  return {
    answer: fallbackAnswer(message, instant, results, plan),
    sources: sources.slice(0,10),
    searched_web: true,
    search_mode: 'automatic-all-items-search',
    normalized_query: plan.cleaned,
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, location = 'India', mode = 'auto', history = [] } = req.body || {};
  if (!message || typeof message !== 'string') return res.status(400).json({ error: 'message is required' });

  const effectiveMessage = resolveFollowup(message, history);
  const recentHistory = Array.isArray(history) ? history.slice(-8) : [];
  const context = recentHistory.map((m) => `${m.role === 'assistant' ? 'Nexora' : 'User'}: ${String(m.content || '').slice(0,1200)}`).join('\n');

  const system = `You are Nexora AI, a general-purpose assistant with live web search and a commerce copilot.
- Answer broad requests immediately using reasonable default assumptions. Do not force users to provide budget/specifications before giving useful recommendations.
- If the user later gives a budget, size, material, brand, colour, use case or other constraint, refine the existing recommendation using conversation context.
- Search whenever information is current, local, commercial, product-related, news-related, or otherwise changing.
- For India shopping, prioritize Indian brands/sellers when relevant, then international alternatives.
- Never invent products, sellers, stock, images, prices, discounts, ratings, or links.
- Prefer exact current model names and source links.
- Understand the whole sentence semantically; never search only a command word such as suggest, recommend, give, show or find.
- User region: ${location}. Current mode: ${mode}.`;

  try {
    const result = await generateText({
      model: 'anthropic/claude-sonnet-5',
      system,
      prompt: `${context ? `Recent conversation:\n${context}\n\n` : ''}User: ${effectiveMessage}`,
      tools: {
        web_search: anthropic.tools.webSearch_20250305({ maxUses: 6, userLocation: { type: 'approximate', country: 'IN', timezone: 'Asia/Kolkata' } }),
      },
      maxOutputTokens: 2200,
      temperature: 0.25,
    });
    const sources = (result.sources || []).map(s => ({ title: s.title || s.url || 'Source', url: s.url || '' })).filter(s => s.url);
    return res.status(200).json({ answer: result.text, sources, searched_web: true, search_mode: 'ai-gateway' });
  } catch (error) {
    console.error('Nexora AI Gateway error', error);
    try {
      return res.status(200).json(await noCardFallback(message, location, history));
    } catch (fallbackError) {
      console.error('Nexora fallback search error', fallbackError);
      return res.status(503).json({ error: 'Live search is temporarily unavailable', searched_web: false });
    }
  }
}
