const $ = (id) => document.getElementById(id);
const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
let currentMission = null;
let history = [];

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
  setTimeout(() => $('toast').classList.remove('show'), 1800);
}

function autoResize() {
  const box = $('missionInput');
  box.style.height = 'auto';
  box.style.height = `${Math.min(box.scrollHeight, 180)}px`;
}

function addUserMessage(message) {
  $('emptyState').classList.add('hidden');
  const row = document.createElement('div');
  row.className = 'message-row user';
  row.innerHTML = `<div class="message-content"><div class="message-text">${escapeHtml(message)}</div></div>`;
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

function scrollConversation() {
  requestAnimationFrame(() => {
    $('conversation').scrollTo({top: $('conversation').scrollHeight, behavior: 'smooth'});
  });
}

function addHistoryItem(label) {
  history.unshift(label);
  history = history.slice(0, 6);
  $('chatHistory').innerHTML = history.map((x, i) => `<button class="history-item ${i===0?'active':''}"><span class="history-dot"></span><span>${escapeHtml(x)}</span></button>`).join('');
}

async function init() {
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
$('newChat').addEventListener('click', () => {
  currentMission = null;
  $('messageList').innerHTML = '';
  $('emptyState').classList.remove('hidden');
  $('missionInput').value = '';
  autoResize();
  switchView('mission');
});
$('openSidebar').addEventListener('click', openSidebar);
$('closeSidebar').addEventListener('click', closeSidebar);
$('sidebarScrim').addEventListener('click', closeSidebar);
$('refreshMetrics').addEventListener('click', loadMerchant);
$('saveWallet').addEventListener('click', saveWallet);
$('shareButton').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(location.href);
    showToast('Link copied');
  } catch { showToast('Share link ready'); }
});

async function runMission() {
  const message = $('missionInput').value.trim();
  if (!message) return;
  addUserMessage(message);
  addHistoryItem(message.length > 34 ? `${message.slice(0,34)}…` : message);
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
  row.innerHTML = `<div class="message-avatar">N</div><div class="message-content"><div class="message-title">Nexora</div><div class="message-text">I couldn't complete that mission. ${escapeHtml(message)}</div></div>`;
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
    return `I built a multi-merchant event plan for you${total ? ` with an estimated total of ${money(total)}` : ''}. Review the selected vendors below before approving any transaction.`;
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
  const options = data.recommendations?.length ? `<div class="assistant-section"><h3>Top options</h3><div class="option-list">${data.recommendations.map((r,i)=>optionCard(r,i)).join('')}</div></div>` : '';
  const chips = [];
  if (data.intent?.budget_max) chips.push(`Budget ${money(data.intent.budget_max)}`);
  if (data.intent?.people) chips.push(`${data.intent.people} people`);
  if (data.intent?.category && data.intent.category !== 'general') chips.push(data.intent.category);
  const trace = data.steps?.length ? `<details class="trace-details"><summary>View agent execution path</summary><div class="trace-list">${data.steps.map((s,i)=>`<div class="trace-item"><span class="trace-num">${i+1}</span><span><strong>${escapeHtml(s.agent)}</strong> — ${escapeHtml(s.summary)}</span></div>`).join('')}</div></details>` : '';
  const checkout = data.mission_type === 'product_purchase' && data.recommendations?.length ? `<div class="checkout-card"><div class="checkout-row"><div class="checkout-info"><strong>Ready to prepare checkout</strong><small>${escapeHtml(data.recommendations[0].name)} · ${money(data.recommendations[0].price)}</small></div><button class="approve-button" data-checkout="true">Approve</button></div><div class="payment-result hidden"></div></div>` : '';
  row.innerHTML = `<div class="message-avatar">N</div><div class="message-content"><div class="message-title">Nexora</div><div class="message-text">${escapeHtml(buildSummary(data))}</div>${chips.length?`<div class="mission-meta">${chips.map(x=>`<span class="mission-chip">${escapeHtml(x)}</span>`).join('')}</div>`:''}${options}<div class="next-action">${escapeHtml(data.next_action || '')}</div>${trace}${checkout}</div>`;
  $('messageList').appendChild(row);
  const approve = row.querySelector('[data-checkout="true"]');
  if (approve) approve.addEventListener('click', () => createOrder(row, approve));
  scrollConversation();
}

function optionCard(r, i) {
  const meta = Object.entries(r.metadata || {}).filter(([,v])=>v !== null && v !== undefined && v !== '').map(([,v])=>`<span class="meta">${escapeHtml(String(v))}</span>`).join('');
  return `<article class="option-card ${i===0?'best':''}"><div class="option-head"><div><div class="option-name">${escapeHtml(r.name)}</div><div class="option-merchant">${escapeHtml(r.merchant)}</div></div><div class="option-price">${money(r.price)}</div></div><span class="match-chip">${i===0?'Best match · ':''}${Math.round(r.score)}%</span>${r.reasons?.length?`<ul class="reason-list">${r.reasons.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul>`:''}<div class="meta-row">${meta}</div></article>`;
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
    result.innerHTML = `<strong>Order prepared.</strong><br>Order ID: ${escapeHtml(order.id)}<br>Mode: ${escapeHtml(order.mode)}${order.mode === 'demo' ? '<br>Demo mode is active; add Razorpay test credentials for sandbox checkout.' : ''}`;
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

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

init();
autoResize();
