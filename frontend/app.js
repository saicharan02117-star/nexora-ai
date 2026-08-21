const $ = (id) => document.getElementById(id);
const money = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
let currentMission = null;

async function api(path, options = {}) {
  const response = await fetch(path, {headers: {'Content-Type': 'application/json'}, ...options});
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail || 'Request failed');
  return data;
}

async function init() {
  try {
    const health = await api('/api/health');
    $('systemStatus').textContent = 'Online';
    $('modeText').textContent = health.demo_mode ? 'Demo transaction mode • add test credentials for sandbox checkout' : 'Razorpay sandbox connected';
  } catch { $('systemStatus').textContent = 'Offline'; }
  loadMerchant();
  loadWallet();
}

document.querySelectorAll('.nav-item').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('.nav-item').forEach(x => x.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.view').forEach(x => x.classList.remove('active'));
  $(`${btn.dataset.view}View`).classList.add('active');
}));

document.querySelectorAll('[data-prompt]').forEach(btn => btn.addEventListener('click', () => $('missionInput').value = btn.dataset.prompt));
$('runMission').addEventListener('click', runMission);
$('refreshMetrics').addEventListener('click', loadMerchant);
$('saveWallet').addEventListener('click', saveWallet);
$('approveCheckout').addEventListener('click', createOrder);

async function runMission() {
  const message = $('missionInput').value.trim();
  if (!message) return;
  $('runMission').textContent = 'Running…';
  $('missionView').classList.add('loading');
  try {
    const data = await api('/api/missions', {method: 'POST', body: JSON.stringify({message})});
    currentMission = data;
    renderMission(data);
  } catch (e) { alert(e.message); }
  finally { $('runMission').textContent = 'Run Mission →'; $('missionView').classList.remove('loading'); }
}

function renderMission(data) {
  $('missionResult').classList.remove('hidden');
  $('missionId').textContent = data.mission_id;
  $('missionTitle').textContent = data.mission_type.replaceAll('_',' ').replace(/\b\w/g, c => c.toUpperCase());
  $('nextAction').textContent = data.next_action;

  const chips = [];
  if (data.intent.budget_max) chips.push(`Budget ${money(data.intent.budget_max)}`);
  if (data.intent.people) chips.push(`${data.intent.people} people`);
  (data.intent.preferences || []).forEach(p => chips.push(p.toUpperCase()));
  chips.push('Payment confirmation required');
  $('intentChips').innerHTML = chips.map(x => `<span class="chip">${escapeHtml(x)}</span>`).join('');

  $('agentSteps').innerHTML = data.steps.map((s,i) => `<div class="step ${s.status === 'needs_confirmation' ? 'needs':''}"><div class="step-dot">${i+1}</div><div><div class="step-title">${escapeHtml(s.agent)}</div><div class="step-summary">${escapeHtml(s.summary)}</div></div></div>`).join('');
  $('missionPlan').innerHTML = data.plan.map(x => `<li>${escapeHtml(x)}</li>`).join('');

  if (data.recommendations.length) {
    $('recommendationsPanel').classList.remove('hidden');
    $('recommendations').innerHTML = data.recommendations.map((r,i) => recommendationCard(r,i)).join('');
    const b = data.budget_summary || {};
    $('budgetStatus').textContent = b.status ? b.status.replaceAll('_',' ') : `${data.recommendations.length} options`;
    if (data.mission_type === 'product_purchase') {
      $('checkoutPanel').classList.remove('hidden');
      $('checkoutPrice').textContent = money(data.recommendations[0].price);
      $('checkoutLabel').textContent = `${data.recommendations[0].name} • ${data.recommendations[0].merchant}`;
    } else {
      $('checkoutPanel').classList.add('hidden');
    }
  } else {
    $('recommendationsPanel').classList.add('hidden');
    $('checkoutPanel').classList.add('hidden');
  }
}

function recommendationCard(r, i) {
  const meta = Object.entries(r.metadata || {}).map(([k,v]) => `<span class="meta">${escapeHtml(String(v))}</span>`).join('');
  return `<article class="rec-card ${i===0?'best':''}">${i===0?'<span class="best-label">BEST MATCH</span>':''}<div class="rec-name">${escapeHtml(r.name)}</div><div class="rec-merchant">${escapeHtml(r.merchant)}</div><div class="rec-price">${money(r.price)}</div><span class="score">Match ${r.score.toFixed(0)}%</span><ul class="rec-reasons">${r.reasons.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul><div class="meta-row">${meta}</div></article>`;
}

async function createOrder() {
  if (!currentMission || !currentMission.recommendations.length) return;
  const selected = currentMission.recommendations[0];
  $('approveCheckout').textContent = 'Creating order…';
  try {
    const order = await api('/api/payments/order', {method:'POST', body:JSON.stringify({mission_id:currentMission.mission_id, amount:selected.price, description:selected.name})});
    $('paymentResult').classList.remove('hidden');
    $('paymentResult').innerHTML = `<strong>Order created.</strong><br>Order ID: ${escapeHtml(order.id)}<br>Mode: ${escapeHtml(order.mode)}<br>${order.mode === 'demo' ? 'Add Razorpay test credentials in .env to open the real sandbox checkout.' : 'Sandbox order is ready for the checkout UI.'}`;
  } catch (e) { alert(e.message); }
  finally { $('approveCheckout').textContent = 'Approve & Create Test Order'; }
}

async function loadMerchant() {
  try {
    const m = await api('/api/merchant/metrics');
    $('merchantStats').innerHTML = [
      ['Revenue Today', money(m.revenue_today)], ['Potential Revenue', money(m.potential_revenue)], ['Revenue Leakage', money(m.leakage)], ['Payment Success', `${m.payment_success_rate}%`]
    ].map(([l,v]) => `<div class="stat"><div class="stat-label">${l}</div><div class="stat-value">${v}</div></div>`).join('');
    const max = Math.max(...m.leakage_breakdown.map(x=>x.value));
    $('leakageBars').innerHTML = m.leakage_breakdown.map(x => `<div class="leak-item"><div>${escapeHtml(x.cause)}</div><div class="bar-track"><div class="bar-fill" style="width:${(x.value/max*100).toFixed(1)}%"></div></div><div class="leak-value">${money(x.value)}</div><div class="leak-action">${escapeHtml(x.action)}</div></div>`).join('');
  } catch {}
}

async function loadWallet() {
  try { renderWallet(await api('/api/permissions')); } catch {}
}

function renderWallet(w) {
  const bools = [['search_products','Search products'],['compare_products','Compare products'],['negotiate_offer','Negotiate merchant-authorized offers'],['add_to_cart','Add to cart'],['execute_payment','Execute payment automatically'],['payment_requires_confirmation','Require payment confirmation']];
  $('walletControls').innerHTML = bools.map(([k,l]) => `<label class="wallet-item"><span>${l}</span><input type="checkbox" id="w_${k}" ${w[k]?'checked':''}></label>`).join('') + `<label class="wallet-item"><span>Maximum transaction</span><input type="number" id="w_maximum_transaction" value="${w.maximum_transaction}"></label>`;
}

async function saveWallet() {
  const payload = {
    search_products:$('w_search_products').checked, compare_products:$('w_compare_products').checked,
    negotiate_offer:$('w_negotiate_offer').checked, add_to_cart:$('w_add_to_cart').checked,
    execute_payment:$('w_execute_payment').checked, payment_requires_confirmation:$('w_payment_requires_confirmation').checked,
    maximum_transaction:Number($('w_maximum_transaction').value)
  };
  try { await api('/api/permissions',{method:'POST',body:JSON.stringify(payload)}); $('walletSaved').textContent='Permissions saved for this session.'; } catch(e){ alert(e.message); }
}

function escapeHtml(value) { return value.replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
init();
