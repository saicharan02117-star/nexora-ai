import searchHandler from './search.js';

const PRIVATE_TOOLS = [
  { id: 'gmail', rx: /\b(gmail|inbox|email inbox|read (my )?email|check (my )?email|send (an )?email|reply to (an )?email|mail from)\b/i },
  { id: 'calendar', rx: /\b(google calendar|calendar|my schedule|availability|free time|meeting|appointment|schedule a meeting|book a meeting)\b/i },
  { id: 'documents', rx: /\b(my pdf|my document|my file|my spreadsheet|my sheet|attachment|drive file)\b/i },
  { id: 'database', rx: /\b(my database|query my data|company data|customer data|inventory database|sql database)\b/i },
];

function resolveFollowup(message, history) {
  const raw = String(message || '').trim();
  const recent = Array.isArray(history) ? history.slice(-12) : [];
  const lastUser = [...recent].reverse().find(m => m?.role === 'user' && String(m?.content || '').trim());
  if (!lastUser) return raw;
  const words = raw.split(/\s+/).filter(Boolean);
  const refinement = words.length <= 10 && /(?:₹|rs\.?|rupees?|lakh|under|below|budget|indian|foreign|premium|cheap|cheaper|plastic|steel|metal|wood|soft|hard|size|delivery|rating|another|more|better|same)/i.test(raw);
  return refinement ? `${String(lastUser.content).trim()} — refine with: ${raw}` : raw;
}

function detectPrivateTools(message, history) {
  const effective = resolveFollowup(message, history);
  const tools = PRIVATE_TOOLS.filter(t => t.rx.test(effective)).map(t => t.id);
  return { effective, tools };
}

async function callN8n({ message, location, mode, history, tools }) {
  const webhook = String(process.env.N8N_WEBHOOK_URL || '').trim();
  if (!webhook) return null;
  const secret = String(process.env.N8N_WEBHOOK_SECRET || '').trim();
  const response = await fetch(webhook, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(secret ? { Authorization: `Bearer ${secret}` } : {}),
    },
    body: JSON.stringify({
      source: 'nexora-ai',
      message,
      location,
      mode,
      tools,
      history: Array.isArray(history) ? history.slice(-10) : [],
      sessionId: (Array.isArray(history) && history[0]?.sessionId) || 'nexora-web',
    }),
  });
  if (!response.ok) throw new Error(`n8n returned ${response.status}`);
  const data = await response.json().catch(() => ({}));
  const answer = data.answer || data.output || data.text || data.response;
  if (!answer) throw new Error('n8n returned no answer');
  return {
    answer: String(answer),
    sources: Array.isArray(data.sources) ? data.sources : [],
    searched_web: false,
    search_mode: 'n8n-tool-bridge',
    route: tools[0] || 'agent',
    selected_tools: tools,
    tool_metadata: data.metadata || {},
  };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const { message, location = 'India', mode = 'auto', history = [] } = req.body || {};
  if (!message || typeof message !== 'string') return res.status(400).json({ error: 'message is required' });

  const { effective, tools } = detectPrivateTools(message, history);
  if (!tools.length) return searchHandler(req, res);

  if (!process.env.N8N_WEBHOOK_URL) {
    return res.status(200).json({
      answer: `Nexora understood that this request needs ${tools.join(' + ')}, but the private n8n tool bridge is not connected on this deployment yet. The normal Nexora search and chat system is still available.`,
      sources: [],
      searched_web: false,
      search_mode: 'integration-required',
      route: tools[0],
      selected_tools: tools,
    });
  }

  try {
    const result = await callN8n({ message: effective, location, mode, history, tools });
    return res.status(200).json(result);
  } catch (error) {
    console.error('Nexora n8n tool bridge error', error);
    return res.status(502).json({
      error: 'The connected private tool workflow is temporarily unavailable.',
      searched_web: false,
      route: tools[0],
      selected_tools: tools,
    });
  }
}
