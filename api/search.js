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

const BLOCKED_HOSTS = [
  'merriam-webster.com','dictionary.cambridge.org','dictionary.com','vocabulary.com',
  'thesaurus.com','collinsdictionary.com','wordnik.com','yourdictionary.com',
];

const NON_INDIA_RETAILERS = [
  'walmart.com','dickssportinggoods.com','bestbuy.com','target.com','costco.com',
  'homedepot.com','lowes.com','macys.com','kohls.com','newegg.com',
];

const VERTICALS = [
  { id:'motorcycle', rx:/\b(motorcycle|motorcycles|motorbike|motorbikes|bike|bikes)\b/i, authority:['bikewale.com','bikedekho.com','zigwheels.com','autocarindia.com','carandbike.com','91wheels.com'], extra:'price mileage engine safety service reliability ownership review' },
  { id:'bicycle', rx:/\b(bicycle|bicycles|cycle|cycles|mountain bike|road bike|mtb)\b/i, authority:['decathlon.in','choosemybicycle.com','bumsonthesaddle.com','amazon.in','flipkart.com'], extra:'price frame size gears brakes review buy India' },
  { id:'car', rx:/\b(car|cars|suv|sedan|hatchback|mpv|vehicle)\b/i, authority:['carwale.com','cardekho.com','autocarindia.com','carandbike.com','zigwheels.com','team-bhp.com'], extra:'price mileage safety features service reliability resale ownership review' },
  { id:'camera', rx:/\b(camera|dslr|mirrorless|photography camera|vlogging camera)\b/i, authority:['dpreview.com','sony.co.in','canon.co.in','nikon.co.in','fujifilm-x.com','croma.com'], extra:'price review image quality autofocus video battery lens' },
  { id:'phone', rx:/\b(phone|mobile|smartphone)\b/i, authority:['91mobiles.com','gadgets360.com','smartprix.com','croma.com','reliancedigital.in','flipkart.com','amazon.in'], extra:'price specifications camera battery performance review' },
  { id:'laptop', rx:/\b(laptop|notebook computer|macbook)\b/i, authority:['digit.in','gadgets360.com','croma.com','reliancedigital.in','flipkart.com','amazon.in'], extra:'price processor RAM GPU battery performance review' },
  { id:'tv', rx:/\b(tv|television|smart tv)\b/i, authority:['croma.com','reliancedigital.in','vijaysales.com','amazon.in','flipkart.com'], extra:'price display panel sound warranty review' },
  { id:'appliance', rx:/\b(fridge|refrigerator|washing machine|air conditioner|\bac\b|fan|mixer|grinder|geyser|microwave|oven|induction|vacuum)\b/i, authority:['croma.com','reliancedigital.in','vijaysales.com','amazon.in','flipkart.com'], extra:'price energy rating warranty service review India' },
  { id:'fashion', rx:/\b(shoe|shoes|slipper|slippers|sandal|shirt|tshirt|t-shirt|jeans|jacket|dress|saree|kurta|underwear|innerwear|towel|bag|backpack)\b/i, authority:['myntra.com','ajio.com','amazon.in','flipkart.com','meesho.com','tatacliq.com'], extra:'price material size reviews buy India' },
  { id:'home', rx:/\b(chair|table|desk|sofa|bed|rack|bucket|bottle|container|cookware|cooker|pan|tool|drill|hammer|steel|plastic|wooden|furniture)\b/i, authority:['amazon.in','flipkart.com','pepperfry.com','urbanladder.com','indiamart.com','ikea.com'], extra:'price material dimensions quality review India' },
];

function normalizeSubject(subject, location='India') {
  let q = String(subject || '').trim();
  if (/\bindia\b/i.test(location)) {
    if (/^bikes?$/i.test(q) || /\bbikes?\b/i.test(q) && !/\b(cycle|bicycle|mtb|mountain|road bike)\b/i.test(q)) {
      q = q.replace(/\bbikes?\b/gi, 'motorcycles');
    }
    q = q.replace(/\bmobiles?\b/gi, 'smartphones');
  }
  return q.replace(/\s+/g,' ').trim();
}

function cleanNaturalQuery(message, location='India') {
  let q = String(message || '').trim()
    .replace(/^(please\s+)?(can you\s+|could you\s+|would you\s+|will you\s+)?/i,'')
    .replace(/^(suggest|recommend)\s+(me\s+)?/i,'')
    .replace(/^(give|show|find|get)\s+(me\s+)?/i,'')
    .replace(/^(tell\s+me\s+|help\s+me\s+(find|choose|understand)\s+)/i,'')
    .replace(/^i\s+(want|need)\s+/i,'')
    .replace(/\ba\s+best\b/gi,'best')
    .replace(/\s+/g,' ')
    .trim();
  return normalizeSubject(q || String(message || '').trim(), location);
}

function resolveFollowup(message, history) {
  const raw = String(message || '').trim();
  const recent = Array.isArray(history) ? history.slice(-12) : [];
  const lastUser = [...recent].reverse().find(m => m?.role === 'user' && String(m?.content || '').trim());
  if (!lastUser) return raw;
  const words = raw.split(/\s+/).filter(Boolean);
  const shortRefinement = words.length <= 10 && /(?:₹|rs\.?|rupees?|lakh|lakhs|crore|under|below|budget|automatic|manual|petrol|diesel|electric|ev|hybrid|camera|battery|black|white|blue|red|indian|foreign|premium|cheap|cheaper|family|seater|seat|plastic|steel|metal|wood|soft|hard|size|delivery|rating|another|more|better|same)/i.test(raw);
  if (!shortRefinement) return raw;
  return `${String(lastUser.content).trim()} — refine with: ${raw}`;
}

function classifyIntent(message, history, location='India') {
  const effective = resolveFollowup(message, history);
  const subject = cleanNaturalQuery(effective, location);
  const lower = String(message).toLowerCase();
  const vertical = VERTICALS.find(v => v.rx.test(subject)) || null;

  if (/^(hi|hello|hey|good morning|good afternoon|good evening|thanks|thank you)[.! ]*$/i.test(message.trim())) return { type:'conversation', effective, subject, vertical };
  if (/\b(compare|vs\.?|versus|difference between)\b/i.test(lower)) return { type:'comparison', effective, subject, vertical };
  if (/\b(latest|today|current|now|news|recent|update|price today|available now|stock)\b/i.test(lower)) return { type:'current', effective, subject, vertical };
  if (/\b(near me|nearby|closest|in my area|local shop|local market|where can i)\b/i.test(lower)) return { type:'local', effective, subject, vertical };
  if (/\b(how to|how do|steps|guide|tutorial|process|procedure)\b/i.test(lower)) return { type:'howto', effective, subject, vertical };
  if (/^(what|why|who|when|where|which|explain|define|tell me about)\b/i.test(lower)) return { type:'factual', effective, subject, vertical };
  if (/\b(best|top|suggest|recommend|choose|worth buying|which should i|good one)\b/i.test(lower)) return { type:'recommendation', effective, subject, vertical };
  if (vertical || /\b(buy|price|budget|under|below|shop|product|item|deal|offer)\b/i.test(lower)) return { type:'shopping', effective, subject, vertical };
  return { type:'general', effective, subject, vertical };
}

function buildQueries(intent, location='India') {
  const { type, subject, vertical } = intent;
  const region = /\bindia\b/i.test(location) ? 'India' : String(location || '');
  const queries = [];
  const add = q => { q = q.replace(/\s+/g,' ').trim(); if (q && !queries.includes(q)) queries.push(q); };

  if (type === 'recommendation') {
    add(`best ${subject} ${region} ${YEAR} ${vertical?.extra || 'review comparison value'}`);
    add(`${subject} ${region} ${YEAR} top options price review`);
  } else if (type === 'shopping') {
    add(`${subject} price ${region} buy online ${YEAR}`);
    add(`${subject} ${region} review specifications price`);
  } else if (type === 'comparison') {
    add(`${subject} comparison ${YEAR}`);
    add(`${subject} review differences pros cons ${region}`);
  } else if (type === 'current') {
    add(`${subject} latest ${region} ${YEAR}`);
    add(`${subject} current update ${YEAR}`);
  } else if (type === 'local') {
    add(`${subject} near me ${region}`);
    add(`${subject} local ${region}`);
  } else if (type === 'howto') {
    add(subject);
    add(`${subject} step by step guide`);
  } else if (type === 'factual') {
    add(subject);
    add(`${subject} explanation`);
  } else {
    add(subject);
    add(`${subject} ${YEAR}`);
  }

  if (vertical?.authority?.length) {
    add(`${subject} ${region} ${YEAR} ${vertical.authority.slice(0,3).map(d => `site:${d}`).join(' ')}`);
  }
  return queries.slice(0,3);
}

function unwrapDuckUrl(href='') {
  try {
    const absolute = href.startsWith('//') ? `https:${href}` : href;
    const u = new URL(absolute);
    const redirected = u.searchParams.get('uddg');
    return redirected ? decodeURIComponent(redirected) : absolute;
  } catch { return href; }
}

async function duckSearch(query) {
  const response = await fetch(`https://html.duckduckgo.com/html/?kl=in-en&q=${encodeURIComponent(query)}`, {
    headers:{'User-Agent':'Mozilla/5.0 (compatible; NexoraAI/1.0)','Accept-Language':'en-IN,en;q=0.9'}
  });
  if (!response.ok) return [];
  const html = await response.text();
  const results=[];
  const anchor=/<a[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m=anchor.exec(html)) && results.length<10) {
    const url=unwrapDuckUrl(m[1]); const title=decodeHtml(m[2]);
    if (!url || !/^https?:\/\//i.test(url) || !title) continue;
    const following=html.slice(anchor.lastIndex,anchor.lastIndex+2600);
    const sm=following.match(/<(?:a|div)[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/(?:a|div)>/i);
    results.push({title,url,snippet:decodeHtml(sm?.[1]||''),engine:'DuckDuckGo'});
  }
  return results;
}

async function bingSearch(query) {
  const url=`https://www.bing.com/search?format=rss&cc=IN&mkt=en-IN&setlang=en-IN&q=${encodeURIComponent(query)}`;
  const response=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 (compatible; NexoraAI/1.0)','Accept-Language':'en-IN,en;q=0.9'}});
  if (!response.ok) return [];
  const xml=await response.text(); const items=[]; const rx=/<item>([\s\S]*?)<\/item>/gi; let m;
  while ((m=rx.exec(xml)) && items.length<10) {
    const b=m[1]; const title=decodeHtml(b.match(/<title>([\s\S]*?)<\/title>/i)?.[1]||'');
    const link=decodeHtml(b.match(/<link>([\s\S]*?)<\/link>/i)?.[1]||'');
    const snippet=decodeHtml(b.match(/<description>([\s\S]*?)<\/description>/i)?.[1]||'');
    if (title && /^https?:\/\//i.test(link)) items.push({title,url:link,snippet,engine:'Bing'});
  }
  return items;
}

async function instantAnswer(query) {
  try {
    const r=await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`,{headers:{'User-Agent':'NexoraAI/1.0'}});
    if (!r.ok) return null; const d=await r.json();
    if (d?.AbstractText) return {text:String(d.AbstractText).trim(),source:d.AbstractURL?{title:d.Heading||'Reference',url:d.AbstractURL}:null};
  } catch {}
  return null;
}

function hostOf(url) { try { return new URL(url).hostname.replace(/^www\./,'').toLowerCase(); } catch { return ''; } }
function tokens(text) {
  const stop=new Set(['the','a','an','me','my','for','in','on','of','to','and','or','is','are','best','top','good','suggest','recommend','give','show','find','get','please','india',String(YEAR),'refine','with']);
  return (String(text).toLowerCase().match(/[a-z0-9]+/g)||[]).filter(t=>t.length>2&&!stop.has(t));
}

function rankResults(items,intent,location='India') {
  const wanted=tokens(intent.subject); const commercial=['recommendation','shopping'].includes(intent.type);
  return items.filter(item=>{
    const host=hostOf(item.url); if(!host) return false;
    if(BLOCKED_HOSTS.some(d=>host===d||host.endsWith(`.${d}`))) return false;
    if(commercial && /\bindia\b/i.test(location) && NON_INDIA_RETAILERS.some(d=>host===d||host.endsWith(`.${d}`))) return false;
    return true;
  }).map(item=>{
    const host=hostOf(item.url); const title=item.title.toLowerCase(); const hay=`${item.title} ${item.snippet}`.toLowerCase(); let score=0;
    wanted.forEach(t=>{ if(title.includes(t)) score+=6; else if(hay.includes(t)) score+=2; });
    if(intent.vertical?.authority.some(d=>host===d||host.endsWith(`.${d}`))) score+=12;
    if(/\.in$/.test(host)||host.endsWith('.co.in')) score+=4;
    if(/price|review|compare|specification|mileage|safety|buy|rating|features/i.test(hay)&&commercial) score+=3;
    if(hay.includes(String(YEAR))) score+=1;
    return {...item,score};
  }).filter(x=>x.score>0||wanted.length===0).sort((a,b)=>b.score-a.score);
}

function mergeResults(groups,intent,location) {
  const seen=new Set(); const merged=[];
  groups.flat().forEach(item=>{
    try { const u=new URL(item.url); const key=u.hostname.replace(/^www\./,'')+u.pathname.replace(/\/$/,''); if(seen.has(key)) return; seen.add(key); merged.push(item); } catch {}
  });
  return rankResults(merged,intent,location).slice(0,10);
}

function conversationalReply(intent,instant,results) {
  if(intent.type==='conversation') {
    if(/thank/i.test(intent.subject)) return 'You’re welcome. What would you like help with next?';
    return 'Hi! Ask me anything — products, comparisons, current information, explanations, planning, coding, studies, or general questions.';
  }

  const lines=[];
  if(intent.type==='factual' && instant?.text) lines.push(instant.text);

  if(results.length) {
    const subject=intent.subject || 'your request';
    const headers={
      recommendation:`Here are the strongest current options I found for **${subject}**:`,
      shopping:`I found current India-focused buying results for **${subject}**:`,
      comparison:`Here are the most relevant current comparison sources for **${subject}**:`,
      current:`Here are the latest relevant results for **${subject}**:`,
      local:`Here are the most relevant local results for **${subject}**:`,
      howto:`Here are useful step-by-step resources for **${subject}**:`,
      factual: instant?.text ? '**More useful sources**' : `Here’s what I found for **${subject}**:`,
      general:`Here are the most relevant results for **${subject}**:`,
    };
    lines.push(headers[intent.type]||headers.general);
    results.slice(0,6).forEach((r,i)=>{
      const snippet=r.snippet?` — ${r.snippet}`:'';
      lines.push(`${i+1}. **${r.title}**${snippet}`);
    });
    if(intent.vertical?.id==='motorcycle' && /\bbikes?\b/i.test(intent.effective) && !/\bcycle|bicycle\b/i.test(intent.effective)) {
      lines.push('I interpreted **“bikes” as motorcycles**, which is the common usage in India. If you meant bicycles, say “bicycles” and I’ll switch the results.');
    }
  } else if(!instant?.text) {
    lines.push(`I understood your request as **${intent.subject}**, but I couldn’t retrieve strong live results at this moment. I won’t replace it with unrelated pages.`);
  }
  return lines.join('\n\n');
}

async function fallbackSearch(message,location,history) {
  const intent=classifyIntent(message,history,location);
  if(intent.type==='conversation') return {answer:conversationalReply(intent,null,[]),sources:[],searched_web:false,search_mode:'conversation',intent:intent.type};
  const qs=buildQueries(intent,location); const calls=[];
  qs.slice(0,3).forEach(q=>{ calls.push(duckSearch(q).catch(()=>[])); calls.push(bingSearch(q).catch(()=>[])); });
  const [instant,...groups]=await Promise.all([instantAnswer(intent.subject).catch(()=>null),...calls]);
  const results=mergeResults(groups,intent,location);
  const sources=[]; if(instant?.source && intent.type==='factual') sources.push(instant.source);
  results.forEach(r=>sources.push({title:r.title,url:r.url}));
  return {answer:conversationalReply(intent,instant,results),sources:sources.slice(0,10),searched_web:true,search_mode:'intent-aware-india-search',intent:intent.type,normalized_query:intent.subject};
}

export default async function handler(req,res) {
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  const {message,location='India',mode='auto',history=[]}=req.body||{};
  if(!message||typeof message!=='string') return res.status(400).json({error:'message is required'});

  const intent=classifyIntent(message,history,location);
  if(intent.type==='conversation') return res.status(200).json(await fallbackSearch(message,location,history));
  const recent=Array.isArray(history)?history.slice(-10):[];
  const context=recent.map(m=>`${m.role==='assistant'?'Nexora':'User'}: ${String(m.content||'').slice(0,1200)}`).join('\n');

  const system=`You are Nexora AI, a general-purpose assistant with live web search and commerce tools.
- Understand the user's actual intent; do not give the same style of response to every question.
- Answer normal knowledge questions directly. Use web search only when freshness, products, prices, local information, news or verification is useful.
- For recommendations, give useful options immediately using reasonable defaults, then refine on follow-ups.
- In India-focused shopping, prioritize India-available products, Indian retailers and Indian context. Do not recommend US-only stores such as Walmart unless explicitly asked.
- In Indian usage, a bare “bike/bikes” normally means motorcycles; explain that assumption briefly. “Bicycle/cycle” means bicycles.
- Never invent products, prices, stock, ratings, images or links.
- Keep conversation context across follow-up messages.
- User region: ${location}. Mode: ${mode}.`;

  try {
    const result=await generateText({
      model:'anthropic/claude-sonnet-5',system,
      prompt:`${context?`Recent conversation:\n${context}\n\n`:''}User: ${intent.effective}`,
      tools:{web_search:anthropic.tools.webSearch_20250305({maxUses:6,userLocation:{type:'approximate',country:'IN',timezone:'Asia/Kolkata'}})},
      maxOutputTokens:2200,temperature:0.25,
    });
    const sources=(result.sources||[]).map(s=>({title:s.title||s.url||'Source',url:s.url||''})).filter(s=>s.url);
    return res.status(200).json({answer:result.text,sources,searched_web:sources.length>0,search_mode:'ai-gateway',intent:intent.type});
  } catch(error) {
    console.error('Nexora AI Gateway error',error);
    try { return res.status(200).json(await fallbackSearch(message,location,history)); }
    catch(fallbackError) {
      console.error('Nexora fallback search error',fallbackError);
      return res.status(503).json({error:'Live search is temporarily unavailable',searched_web:false});
    }
  }
}
