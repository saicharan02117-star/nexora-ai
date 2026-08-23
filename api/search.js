import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';

const YEAR = new Date().getFullYear();
const DEFAULT_OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5.6';

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
  { id: 'shopping', rx: /\b(buy|price|under|budget|product|shoe|slipper|sandal|towel|chair|table|tv|earbud|headphone|watch|bag|tool|appliance|shirt|jeans|bottle|bucket|rack|mixer|fan|toy|cycle|bicycle|underwear|innerwear|mobile|laptop|camera)\b/i, authority: ['amazon.in','flipkart.com','croma.com','reliancedigital.in','vijaysales.com','meesho.com','indiamart.com'], extra: 'best options live price India review compare buy online local market direct seller page' },
];

const TOOL_DEFINITIONS = [
  { id: 'gmail', rx: /\b(gmail|inbox|email inbox|read (my )?email|check (my )?email|send (an )?email|reply to (an )?email|mail from)\b/i, n8n: true },
  { id: 'calendar', rx: /\b(google calendar|calendar|my schedule|availability|free time|meeting|appointment|schedule a meeting|book a meeting)\b/i, n8n: true },
  { id: 'weather', rx: /\b(weather|forecast|temperature|rain|raining|humidity|wind speed)\b/i, n8n: true },
  { id: 'maps', rx: /\b(near me|nearby|directions|route to|map of|closest|nearest|restaurant|hotel|hospital|shop near)\b/i, n8n: true },
  { id: 'documents', rx: /\b(pdf|document|docx|file|spreadsheet|sheet|resume|attachment)\b/i, n8n: true },
  { id: 'youtube', rx: /\b(youtube|video tutorial|watch a video|videos about)\b/i, n8n: true },
  { id: 'database', rx: /\b(database|sql|query my data|company data|customer data|inventory database)\b/i, n8n: true },
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
  const recent = Array.isArray(history) ? history.slice(-12) : [];
  const lastUser = [...recent].reverse().find(m => m?.role === 'user' && String(m?.content || '').trim());
  if (!lastUser) return raw;

  const words = raw.split(/\s+/).filter(Boolean);
  const looksLikeConstraint = words.length <= 10 && (
    /(?:₹|rs\.?|rupees?|lakh|lakhs|crore|under|below|budget|automatic|manual|petrol|diesel|electric|ev|hybrid|camera|battery|black|white|blue|red|indian|foreign|premium|cheap|cheaper|best|family|seater|seat|plastic|steel|metal|wood|soft|hard|size|delivery|brand|rating|ram|storage)/i.test(raw)
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
  const recommendationIntent = /\b(best|top|suggest|recommend|choose|compare|buy|price|good|affordable|budget)\b/i.test(message);

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

function detectRoute(message, history, location) {
  const effective = resolveFollowup(message, history);
  const vertical = detectVertical(effective);
  const selectedTools = [];
  let route = 'general_chat';

  for (const tool of TOOL_DEFINITIONS) {
    if (tool.rx.test(effective)) selectedTools.push(tool.id);
  }

  if (vertical || /\b(buy|shopping|price|cost|budget|compare products|recommend.*product|best .* under|local market)\b/i.test(effective)) {
    route = 'shopping_search';
    selectedTools.unshift('shopping_search');
    selectedTools.push('web_search');
  } else if (/\b(latest|today|current|news|recent|search the web|look up|find online|current price|current status|who is|what happened)\b/i.test(effective)) {
    route = 'web_search';
    selectedTools.unshift('web_search');
  } else if (selectedTools.length) {
    route = selectedTools[0];
  }

  if (/\b(image|photo|picture|photos|images)\b/i.test(effective)) selectedTools.push('image_search');
  if (/\b(calculate|calculator|convert|percentage|how much is|\d+\s*[+*\/%-]\s*\d+)\b/i.test(effective)) selectedTools.push('calculator');

  return {
    route,
    selected_tools: [...new Set(selectedTools)],
    effective_message: effective,
    location: location || 'India',
    requires_web: route === 'shopping_search' || route === 'web_search' || selectedTools.includes('image_search'),
    requires_n8n: selectedTools.some(id => TOOL_DEFINITIONS.find(t => t.id === id)?.n8n),
  };
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
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NexoraAI/2.0)', 'Accept-Language': 'en-IN,en;q=0.9' },
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
    headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NexoraAI/2.0)', 'Accept-Language': 'en-IN,en;q=0.9' },
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
    const response = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`, { headers: { 'User-Agent': 'NexoraAI/2.0' } });
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
      lines.push(`I searched current sources for **${plan.cleaned}** and ranked the strongest matches.`);
      lines.push('**Current matches**');
    } else {
      lines.push('I searched the live web and ranked the most relevant current results:');
    }

    results.slice(0,6).forEach((item, index) => {
      const detail = item.snippet ? ` — ${item.snippet}` : '';
      lines.push(`${index + 1}. **${item.title}**${detail}`);
    });

    if (plan.recommendationIntent) {
      lines.push('I will preserve this product and update the same search when you add a new budget, size, material, use case, brand or other preference.');
    } else {
      lines.push('Use the source cards below for the exact current pages.');
    }
  } else if (!instant?.text) {
    lines.push(`I understood “${message}”, but I could not retrieve a reliable current result yet.`);
  }

  return lines.join('\n\n');
}

async function noCardFallback(message, location, history, router = null) {
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
    route: router?.route || 'web_search',
    selected_tools: router?.selected_tools || ['web_search'],
  };
}

function extractOpenAIText(data) {
  if (typeof data?.output_text === 'string' && data.output_text.trim()) return data.output_text.trim();
  const chunks = [];
  for (const item of data?.output || []) {
    for (const part of item?.content || []) {
      if (typeof part?.text === 'string' && part.text.trim()) chunks.push(part.text.trim());
    }
  }
  return chunks.join('\n').trim();
}

function extractOpenAISources(data) {
  const seen = new Set();
  const sources = [];
  for (const item of data?.output || []) {
    for (const part of item?.content || []) {
      for (const annotation of part?.annotations || []) {
        const url = annotation?.url || annotation?.url_citation?.url || '';
        const title = annotation?.title || annotation?.url_citation?.title || url;
        if (!url || seen.has(url)) continue;
        seen.add(url);
        sources.push({ title: title || 'Source', url });
      }
    }
  }
  return sources.slice(0,10);
}

async function openAIAnswer({ system, prompt, useWeb }) {
  const apiKey = String(process.env.OPENAI_API_KEY || '').trim();
  if (!apiKey) return null;

  const payload = {
    model: DEFAULT_OPENAI_MODEL,
    instructions: system,
    input: prompt,
    max_output_tokens: 2600,
  };
  if (useWeb) payload.tools = [{ type: 'web_search' }];

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => '');
    throw new Error(`OpenAI Responses API ${response.status}: ${detail.slice(0,300)}`);
  }

  const data = await response.json();
  return {
    text: extractOpenAIText(data),
    sources: extractOpenAISources(data),
    model: data?.model || DEFAULT_OPENAI_MODEL,
  };
}

async function n8nAnswer({ router, message, location, mode, history }) {
  const webhook = String(process.env.N8N_WEBHOOK_URL || '').trim();
  if (!webhook || !router.requires_n8n) return null;

  const secret = String(process.env.N8N_WEBHOOK_SECRET || '').trim();
  const response = await fetch(webhook, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { 'Authorization': `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify({
      source: 'nexora-ai',
      route: router.route,
      tools: router.selected_tools,
      message: router.effective_message || message,
      location,
      mode,
      history: Array.isArray(history) ? history.slice(-10) : [],
    }),
  });

  if (!response.ok) throw new Error(`n8n returned ${response.status}`);
  const data = await response.json().catch(() => ({}));
  const answer = data.answer || data.output || data.text || data.response;
  if (!answer) return null;

  return {
    answer: String(answer),
    sources: Array.isArray(data.sources) ? data.sources : [],
    metadata: data.metadata || {},
  };
}

function integrationMessage(router) {
  const name = router.route === 'gmail' ? 'Gmail'
    : router.route === 'calendar' ? 'Google Calendar'
    : router.route === 'weather' ? 'weather'
    : router.route === 'maps' ? 'maps/local search'
    : router.route === 'documents' ? 'document tools'
    : router.route === 'youtube' ? 'YouTube tools'
    : router.route === 'database' ? 'database tools'
    : router.route;
  return `Nexora understood that this request needs **${name}**, but the n8n tool bridge is not configured on this deployment yet. Add N8N_WEBHOOK_URL (and optionally N8N_WEBHOOK_SECRET) to enable this action without changing the chat UI.`;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { message, location = 'India', mode = 'auto', history = [] } = req.body || {};
  if (!message || typeof message !== 'string') return res.status(400).json({ error: 'message is required' });

  const router = detectRoute(message, history, location);
  const effectiveMessage = router.effective_message;
  const recentHistory = Array.isArray(history) ? history.slice(-10) : [];
  const context = recentHistory
    .map((m) => `${m.role === 'assistant' ? 'Nexora' : 'User'}: ${String(m.content || '').slice(0,1400)}`)
    .join('\n');

  const system = `You are Nexora AI, a general-purpose, tool-using AI assistant and commerce copilot.
Core behavior:
- Understand the user's complete request first, then use the required tool automatically. Never ask the user to choose a tool.
- Preserve conversation context. A new budget or constraint overrides the old value while keeping the same product/topic unless the user clearly changes it.
- For current, local, commercial, product, travel, news or changing information, use live search rather than memory.
- For India shopping: obey the exact current budget; show Indian brands/sellers first when relevant, then international alternatives.
- Never invent products, seller pages, stock, images, prices, ratings, discounts, sources or buying links.
- Prefer exact current model/product names and direct source pages. Explain uncertainty when live information cannot be verified.
- If a request is broad, give useful results with reasonable defaults first; refine them when the user adds constraints.
- Keep n8n integrations separate from reasoning: Gmail, Calendar and other private tools must only be used through the configured tool bridge.
User region: ${location}. Router: ${router.route}. Selected tools: ${router.selected_tools.join(', ') || 'general_chat'}. Current mode: ${mode}.`;

  const prompt = `${context ? `Recent conversation:\n${context}\n\n` : ''}User: ${effectiveMessage}`;

  if (router.requires_n8n) {
    try {
      const n8n = await n8nAnswer({ router, message, location, mode, history });
      if (n8n) {
        return res.status(200).json({
          answer: n8n.answer,
          sources: n8n.sources,
          searched_web: false,
          search_mode: 'n8n-tool-bridge',
          route: router.route,
          selected_tools: router.selected_tools,
          tool_metadata: n8n.metadata,
        });
      }
    } catch (error) {
      console.error('Nexora n8n bridge error', error);
    }

    if (!process.env.N8N_WEBHOOK_URL && !router.requires_web) {
      return res.status(200).json({
        answer: integrationMessage(router),
        sources: [],
        searched_web: false,
        search_mode: 'integration-required',
        route: router.route,
        selected_tools: router.selected_tools,
      });
    }
  }

  try {
    const openai = await openAIAnswer({ system, prompt, useWeb: router.requires_web });
    if (openai?.text) {
      return res.status(200).json({
        answer: openai.text,
        sources: openai.sources,
        searched_web: router.requires_web,
        search_mode: router.requires_web ? 'openai-responses-web' : 'openai-responses',
        route: router.route,
        selected_tools: router.selected_tools,
        model: openai.model,
      });
    }
  } catch (error) {
    console.error('Nexora OpenAI Responses error', error);
  }

  try {
    const result = await generateText({
      model: 'anthropic/claude-sonnet-5',
      system,
      prompt,
      ...(router.requires_web ? {
        tools: {
          web_search: anthropic.tools.webSearch_20250305({ maxUses: 6, userLocation: { type: 'approximate', country: 'IN', timezone: 'Asia/Kolkata' } }),
        },
      } : {}),
      maxOutputTokens: 2400,
      temperature: 0.25,
    });
    const sources = (result.sources || [])
      .map(s => ({ title: s.title || s.url || 'Source', url: s.url || '' }))
      .filter(s => s.url);
    if (result.text) {
      return res.status(200).json({
        answer: result.text,
        sources,
        searched_web: router.requires_web,
        search_mode: router.requires_web ? 'ai-gateway-web' : 'ai-gateway',
        route: router.route,
        selected_tools: router.selected_tools,
      });
    }
  } catch (error) {
    console.error('Nexora AI Gateway error', error);
  }

  if (router.requires_web) {
    try {
      return res.status(200).json(await noCardFallback(message, location, history, router));
    } catch (fallbackError) {
      console.error('Nexora fallback search error', fallbackError);
    }
  }

  return res.status(503).json({
    error: 'No AI provider is configured for this deployment.',
    searched_web: false,
    route: router.route,
    selected_tools: router.selected_tools,
  });
}
