const $ = (id) => document.getElementById(id);
const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
let currentMission = null;
let history = [];
let selectedMode = 'auto';
let deepPlan = false;
let recognition = null;

async function api(path, options = {}) {
  const response = await fetch(path, {headers: {'Content-Type': 'application/json'}, ...options});
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'Request failed');
  return data;
}

function switchView(view) {
  document.querySelectorAll('.view').forEach(x => x.classList.remove('active'));
  $(`${view}View`).classList.add('active');
  closeSidebar();
}

function openSidebar() {
  $('sidebar').classList.add('open');
  $('sidebarScrim').classList.add('show');
}

function closeSidebar() {
  $('sidebar').classList.remove('open');
  $('sidebarScrim').classList.remove('show');
}

function showToast(message) {
  $('toast').textContent = message;
  $('toast').classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => $('toast').classList.remove('show'), 1900);
}

function autoResize() {
  const box = $('missionInput');
  box.style.height = 'auto';
  box.style.height = `${Math.min(box.scrollHeight, 190)}px`;
}

function scrollConversation(smooth = true) {
  requestAnimationFrame(() => {
    $('conversation').scrollTo({top: $('conversation').scrollHeight, behavior: smooth ? 'smooth' : 'auto'});
  });
}

function updateScrollButton() {
  const c = $('conversation');
  const nearBottom = c.scrollHeight - c.scrollTop - c.clientHeight < 160;
  $('scrollBottom').classList.toggle('hidden', nearBottom || !$('messageList').children.length);
}

function addUserMessage(message) {
  $('emptyState').classList.add('hidden');
  const row = document.createElement('div');
  row.className = 'message-row user';
  row.innerHTML = `<div class="message-content"><div class="message-text">${escapeHtml(message)}</div><div class="message-actions"><button class="message-action copy-user" title="Copy">⧉</button></div></div>`;
  row.querySelector('.copy-user').addEventListener('click', () => copyText(message));
  $('messageList').appendChild(row);
  scrollConversation();
}

function addLoadingMessage() {
  const row = document.createElement('div');
  row.className = 'message-row assistant';
  row.id = 'loadingMessage';
  row.innerHTML = `<div class="message-avatar">N</div><div class="message-content"><div class="message-title">Nexora</div><div class="message-text"><span class="loading-dots"><span></span><span></span><span></span></span></div></div>`;
  $('messageList').appendChild(row);
  scrollConversation();
}

function removeLoadingMessage() {
  const el = $('loadingMessage');
  if (el) el.remove();
}

function addHistoryItem(label) {
  history.unshift(label);
  history = [...new Set(history)].slice(0, 10);
  renderHistory();
}

function renderHistory(filter = '') {
  const q = filter.trim().toLowerCase();
  const filtered = history.filter(x => x.toLowerCase().includes(q));
  $('chatHistory').innerHTML = filtered.length
    ? filtered.map((x, i) => `<button class="history-item ${i===0 && !q ? 'active' : ''}" data-history="${escapeAttr(x)}"><span class="history-icon">◇</span><span class="history-label">${escapeHtml(x)}</span><span class="history-more">•••</span></button>`).join('')
    : `<div class="sidebar-label">No matching chats</div>`;
  document.querySelectorAll('[data-history]').forEach(btn => btn.addEventListener('click', () => {
    switchView('mission');
    $('missionInput').value = btn.dataset.history;
    autoResize();
    $('missionInput').focus();
  }));
}

async function init() {
  const savedTheme = localStorage.getItem('nexora-theme');
  if (savedTheme === 'light') document.body.classList.add('light');
  updateThemeLabel();
  try {
    const health = await api('/api/health');
    $('systemStatus').textContent = 'Nexora is online';
    $('modeText').textContent = health.demo_mode ? 'Demo transaction mode' : 'Razorpay sandbox connected';
  } catch {
    $('systemStatus').textContent = 'System offline';
    $('modeText').textContent = 'Check deployment status';
  }
  loadMerchant();
  loadWallet();
  initVoice();
}

function newChat() {
  currentMission = null;
  $('messageList').innerHTML = '';
  $('emptyState').classList.remove('hidden');
  $('missionInput').value = '';
  autoResize();
  switchView('mission');
  $('missionInput').focus();
}

document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.view)));
document.querySelectorAll('[data-prompt]').forEach(btn => btn.addEventListener('click', () => {
  switchView('mission');
  $('missionInput').value = btn.dataset.prompt;
  autoResize();
  $('missionInput').focus();
}));

$('runMission').addEventListener('click', runMission);
$('missionInput').addEventListener('input', autoResize);
$('missionInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    runMission();
  }
});
$('newChat').addEventListener('click', newChat);
$('openSidebar').addEventListener('click', openSidebar);
$('closeSidebar').addEventListener('click', closeSidebar);
$('sidebarScrim').addEventListener('click', closeSidebar);
$('collapseSidebar').addEventListener('click', () => document.querySelector('.app-shell').classList.toggle('sidebar-collapsed'));
$('historySearch').addEventListener('input', (e) => renderHistory(e.target.value));
$('refreshMetrics').addEventListener('click', loadMerchant);
$('saveWallet').addEventListener('click', saveWallet);
$('scrollBottom').addEventListener('click', () => scrollConversation());
$('conversation').addEventListener('scroll', updateScrollButton);
$('attachButton').addEventListener('click', () => $('fileInput').click());
$('fileInput').addEventListener('change', () => {
  const file = $('fileInput').files?.[0];
  if (file) showToast(`${file.name} attached for demo`);
});
$('deepReasonButton').addEventListener('click', () => {
  deepPlan = !deepPlan;
  $('deepReasonButton').classList.toggle('active', deepPlan);
  showToast(deepPlan ? 'Deep plan enabled' : 'Deep plan disabled');
});
$('commerceMode').addEventListener('click', () => showToast('Commerce tools active'));
$('shareButton').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    showToast('Link copied');
  } catch { showToast('Share link ready'); }
});
$('themeToggle').addEventListener('click', () => {
  document.body.classList.toggle('light');
  localStorage.setItem('nexora-theme', document.body.classList.contains('light') ? 'light' : 'dark');
  updateThemeLabel();
});
$('modeButton').addEventListener('click', (e) => {
  e.stopPropagation();
  $('modeMenu').classList.toggle('hidden');
});
document.querySelectorAll('.mode-option').forEach(btn => btn.addEventListener('click', () => {
  selectedMode = btn.dataset.mode;
  document.querySelectorAll('.mode-option').forEach(x => {
    x.classList.toggle('active', x === btn);
    x.querySelector('.mode-check').textContent = x === btn ? '✓' : '';
  });
  const label = btn.querySelector('strong').textContent;
  $('modeButton').innerHTML = `Nexora ${label === 'Auto' ? 'AI' : label} <span class="chevron">⌄</span>`;
  $('modeMenu').classList.add('hidden');
  showToast(`${label} mode selected`);
}));
document.addEventListener('click', (e) => {
  if (!$('modeMenu').contains(e.target) && !$('modeButton').contains(e.target)) $('modeMenu').classList.add('hidden');
});
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    newChat();
  }
  if (e.key === 'Escape') {
    $('modeMenu').classList.add('hidden');
    closeSidebar();
  }
});

function updateThemeLabel() {
  const light = document.body.classList.contains('light');
  $('themeIcon').textContent = light ? '☀' : '☾';
  $('themeLabel').textContent = light ? 'Dark mode' : 'Light mode';
}

function initVoice() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    $('micButton').addEventListener('click', () => showToast('Voice input is not supported in this browser'));
    return;
  }
  recognition = new SpeechRecognition();
  recognition.lang = 'en-IN';
  recognition.interimResults = true;
  recognition.continuous = false;
  recognition.onstart = () => $('micButton').classList.add('recording');
  recognition.onend = () => $('micButton').classList.remove('recording');
  recognition.onresult = (event) => {
    let transcript = '';
    for (let i = event.resultIndex; i < event.results.length; i++) transcript += event.results[i][0].transcript;
    $('missionInput').value = transcript;
    autoResize();
  };
  $('micButton').addEventListener('click', () => {
    try { recognition.start(); } catch {}
  });
}

async function runMission() {
  let message = $('missionInput').value.trim();
  if (!message) return;
  if (selectedMode === 'shop' && !/find|buy|shop|product|shoe|laptop|phone|earbud|backpack/i.test(message)) message = `Shop request: ${message}`;
  if (selectedMode === 'plan' && !/plan|arrange|event|birthday|party/i.test(message)) message = `Plan this goal: ${message}`;
  if (selectedMode === 'analyze' && !/revenue|merchant|sales|leak|conversion/i.test(message)) message = `Analyze merchant performance: ${message}`;
  if (deepPlan) message = `${message} Provide a deeper multi-step plan.`;

  addUserMessage($('missionInput').value.trim());
  addHistoryItem($('missionInput').value.trim().length > 42 ? `${$('missionInput').value.trim().slice(0,42)}…` : $('missionInput').value.trim());
  $('missionInput').value = '';
  autoResize();
  $('runMission').disabled = true;
  addLoadingMessage();
  try {
    const data = await api('/api/missions', {method:'POST', body:JSON.stringify({message})});
    currentMission = data;
    removeLoadingMessage();
    renderAssistantResponse(data);
  } catch (e) {
    removeLoadingMessage();
    addErrorMessage(e.message);
  } finally {
    $('runMission').disabled = false;
  }
}

function addErrorMessage(message) {
  const row = document.createElement('div');
  row.className = 'message-row assistant';
  row.innerHTML = `<div class="message-avatar">N</div><div class="message-content"><div class="message-title">Nexora</div><div class="message-text">I couldn't complete that request. ${escapeHtml(message)}</div><div class="message-actions"><button class="message-action retry-action" title="Retry">↻</button></div></div>`;
  row.querySelector('.retry-action').addEventListener('click', () => showToast('Edit your last prompt and resend'));
  $('messageList').appendChild(row);
  scrollConversation();
}

function buildSummary(data) {
  if (data.mission_type === 'product_purchase') {
    if (!data.recommendations.length) return 'I couldn’t find a matching product within those constraints. Try increasing the budget or changing the request.';
    const best = data.recommendations[0];
    return `I found ${data.recommendations.length} strong option${data.recommendations.length === 1 ? '' : 's'} for your request. My best match is ${best.name} from ${best.merchant} at ${money(best.price)}.`;
  }
  if (data.mission_type === 'multi_merchant_event') {
    const total = data.budget_summary?.total;
    return `I built a multi-merchant plan${total ? ` with an estimated total of ${money(total)}` : ''}. Review the selected vendors before approving any transaction.`;
  }
  if (data.mission_type === 'merchant_intelligence') {
    const leak = data.budget_summary?.leakage;
    return `I analyzed the merchant funnel${leak ? ` and found ${money(leak)} in estimated revenue leakage` : ''}. The highest-value recovery areas are shown below.`;
  }
  return data.next_action || 'I prepared a commerce mission from your request.';
}

function renderAssistantResponse(data) {
  const row = document.createElement('div');
  row.className = 'message-row assistant';
  const options = data.recommendations?.length
    ? `<div class="assistant-section"><div class="assistant-section-title"><h3>Top options</h3><span class="option-count">${data.recommendations.length} ranked</span></div><div class="option-list">${data.recommendations.map((r,i)=>optionCard(r,i)).join('')}</div></div>`
    : '';
  const chips = [];
  if (data.intent?.budget_max) chips.push(`Budget ${money(data.intent.budget_max)}`);
  if (data.intent?.people) chips.push(`${data.intent.people} people`);
  if (data.intent?.category && data.intent.category !== 'general') chips.push(data.intent.category);
  const trace = data.steps?.length ? `<details class="trace-details"><summary>View agent execution path</summary><div class="trace-list">${data.steps.map((s,i)=>`<div class="trace-item"><span class="trace-num">${i+1}</span><span><strong>${escapeHtml(s.agent)}</strong> — ${escapeHtml(s.summary)}</span></div>`).join('')}</div></details>` : '';
  const checkout = data.mission_type === 'product_purchase' && data.recommendations?.length ? `<div class="checkout-card"><div class="checkout-row"><div class="checkout-info"><strong>Ready to prepare checkout</strong><small>${escapeHtml(data.recommendations[0].name)} · ${money(data.recommendations[0].price)}</small></div><button class="approve-button" data-checkout="true">Approve</button></div><div class="payment-result hidden"></div></div>` : '';
  const summary = buildSummary(data);
  row.innerHTML = `<div class="message-avatar">N</div><div class="message-content"><div class="message-title">Nexora</div><div class="message-text">${escapeHtml(summary)}</div>${chips.length?`<div class="mission-meta">${chips.map(x=>`<span class="mission-chip">${escapeHtml(x)}</span>`).join('')}</div>`:''}${options}<div class="next-action">${escapeHtml(data.next_action || '')}</div>${trace}${checkout}<div class="message-actions"><button class="message-action copy-response" title="Copy">⧉</button><button class="message-action good-response" title="Helpful">♡</button><button class="message-action regenerate-response" title="Regenerate">↻</button></div></div>`;
  $('messageList').appendChild(row);
  const approve = row.querySelector('[data-checkout="true"]');
  if (approve) approve.addEventListener('click', () => createOrder(row, approve));
  row.querySelector('.copy-response').addEventListener('click', () => copyText(summary));
  row.querySelector('.good-response').addEventListener('click', () => showToast('Feedback saved'));
  row.querySelector('.regenerate-response').addEventListener('click', () => showToast('Regenerate is available after editing the prompt'));
  scrollConversation();
}

function optionCard(r, i) {
  const meta = Object.entries(r.metadata || {}).filter(([,v])=>v !== null && v !== undefined && v !== '').map(([,v])=>`<span class="meta">${escapeHtml(String(v))}</span>`).join('');
  return `<article class="option-card ${i===0?'best':''}">${i===0?'<span class="best-ribbon">BEST MATCH</span>':''}<div class="option-head"><div><div class="option-name">${escapeHtml(r.name)}</div><div class="option-merchant">${escapeHtml(r.merchant)}</div></div><div class="option-price">${money(r.price)}</div></div><span class="match-chip">Match ${Math.round(r.score)}%</span>${r.reasons?.length?`<ul class="reason-list">${r.reasons.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul>`:''}<div class="meta-row">${meta}</div></article>`;
}

async function createOrder(row, button) {
  if (!currentMission || !currentMission.recommendations?.length) return;
  const selected = currentMission.recommendations[0];
  button.disabled = true;
  button.textContent = 'Preparing…';
  try {
    const order = await api('/api/payments/order',{method:'POST',body:JSON.stringify({mission_id:currentMission.mission_id,amount:selected.price,description:selected.name})});
    const result = row.querySelector('.payment-result');
    result.classList.remove('hidden');
    result.innerHTML = `<strong>Order prepared.</strong><br>Order ID: ${escapeHtml(order.id)}<br>Mode: ${escapeHtml(order.mode)}${order.mode === 'demo' ? '<br>Demo mode is active; connect Razorpay test credentials for sandbox checkout.' : ''}`;
    button.textContent = 'Prepared';
  } catch(e) {
    showToast(e.message);
    button.disabled = false;
    button.textContent = 'Approve';
  }
}

async function loadMerchant() {
  try {
    const m = await api('/api/merchant/metrics');
    $('merchantStats').innerHTML = [
      ['Revenue Today',money(m.revenue_today)],['Potential Revenue',money(m.potential_revenue)],['Revenue Leakage',money(m.leakage)],['Payment Success',`${m.payment_success_rate}%`]
    ].map(([l,v])=>`<div class="stat"><div class="stat-label">${l}</div><div class="stat-value">${v}</div></div>`).join('');
    const max = Math.max(...m.leakage_breakdown.map(x=>x.value));
    $('leakageBars').innerHTML = m.leakage_breakdown.map(x=>`<div class="leak-item"><div>${escapeHtml(x.cause)}</div><div class="bar-track"><div class="bar-fill" style="width:${(x.value/max*100).toFixed(1)}%"></div></div><div class="leak-value">${money(x.value)}</div><div class="leak-action">${escapeHtml(x.action)}</div></div>`).join('');
  } catch {}
}

async function loadWallet() {
  try { renderWallet(await api('/api/permissions')); } catch {}
}

function renderWallet(w) {
  const bools=[['search_products','Search products'],['compare_products','Compare products'],['negotiate_offer','Negotiate merchant-authorized offers'],['add_to_cart','Add to cart'],['execute_payment','Execute payment automatically'],['payment_requires_confirmation','Require payment confirmation']];
  $('walletControls').innerHTML=bools.map(([k,l])=>`<label class="wallet-item"><span>${l}</span><input type="checkbox" id="w_${k}" ${w[k]?'checked':''}></label>`).join('')+`<label class="wallet-item"><span>Maximum transaction</span><input type="number" id="w_maximum_transaction" value="${w.maximum_transaction}"></label>`;
}

async function saveWallet() {
  const payload={search_products:$('w_search_products').checked,compare_products:$('w_compare_products').checked,negotiate_offer:$('w_negotiate_offer').checked,add_to_cart:$('w_add_to_cart').checked,execute_payment:$('w_execute_payment').checked,payment_requires_confirmation:$('w_payment_requires_confirmation').checked,maximum_transaction:Number($('w_maximum_transaction').value)};
  try {
    await api('/api/permissions',{method:'POST',body:JSON.stringify(payload)});
    $('walletSaved').textContent='Permissions saved for this session.';
    showToast('Permissions saved');
  } catch(e){ showToast(e.message); }
}

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); showToast('Copied'); }
  catch { showToast('Copy unavailable'); }
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g,'&#96;');
}

init();
autoResize();
