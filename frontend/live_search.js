(() => {
  const liveHistory = [];
  let liveBusy = false;

  const escape = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  function formatAnswer(text) {
    return escape(text)
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
  }

  function renderToolBadges(data) {
    const tools = Array.isArray(data.selected_tools) ? data.selected_tools : [];
    if (!tools.length && !data.route) return '';
    const normalized = [...new Set([data.route, ...tools].filter(Boolean))];
    return `<div class="live-tool-row">${normalized.map(tool => `<span class="live-tool-badge">${escape(String(tool).replaceAll('_', ' '))}</span>`).join('')}</div>`;
  }

  function addLiveAssistant(data) {
    const list = document.getElementById('messageList');
    if (!list) return;
    const row = document.createElement('div');
    row.className = 'message-row assistant live-search-response';

    const sources = Array.isArray(data.sources) && data.sources.length
      ? `<div class="live-sources"><div class="live-sources-title">Sources</div><div class="live-source-grid">${data.sources.slice(0,8).map((s, i) => {
          let host = '';
          try { host = new URL(s.url).hostname.replace(/^www\./,''); } catch {}
          return `<a class="live-source" href="${escape(s.url)}" target="_blank" rel="noopener noreferrer"><span>${i + 1}</span><div><strong>${escape(s.title || 'Source')}</strong><small>${escape(host)}</small></div></a>`;
        }).join('')}</div></div>`
      : '';

    const liveLabel = data.searched_web ? '<span class="live-search-badge">Live web</span>' : '<span class="live-search-badge">Agent</span>';
    const toolBadges = renderToolBadges(data);

    row.innerHTML = `<div class="message-avatar">N</div><div class="message-content"><div class="message-title">Nexora ${liveLabel}</div>${toolBadges}<div class="message-text live-answer"><p>${formatAnswer(data.answer || 'I could not produce an answer.')}</p></div>${sources}<div class="message-actions"><button class="message-action live-copy" title="Copy">⧉</button><button class="message-action" title="Helpful">♡</button></div></div>`;
    list.appendChild(row);
    row.querySelector('.live-copy')?.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(data.answer || ''); } catch {}
    });
    requestAnimationFrame(() => {
      const c = document.getElementById('conversation');
      c?.scrollTo({ top: c.scrollHeight, behavior: 'smooth' });
    });
  }

  function addLiveError(message) {
    const list = document.getElementById('messageList');
    if (!list) return;
    const row = document.createElement('div');
    row.className = 'message-row assistant';
    row.innerHTML = `<div class="message-avatar">N</div><div class="message-content"><div class="message-title">Nexora</div><div class="message-text">${escape(message)}</div></div>`;
    list.appendChild(row);
  }

  async function liveRun() {
    if (liveBusy) return;
    const input = document.getElementById('missionInput');
    const raw = input?.value.trim();
    if (!raw) return;

    liveBusy = true;
    const send = document.getElementById('runMission');
    if (send) send.disabled = true;

    try {
      if (typeof addUserMessage === 'function') addUserMessage(raw);
      else document.getElementById('emptyState')?.classList.add('hidden');
      if (typeof addHistoryItem === 'function') addHistoryItem(raw.length > 42 ? `${raw.slice(0,42)}…` : raw);
      input.value = '';
      if (typeof autoResize === 'function') autoResize();
      if (typeof addLoadingMessage === 'function') addLoadingMessage();

      const body = {
        message: raw,
        location: 'India',
        mode: window.selectedMode || 'auto',
        history: liveHistory.slice(-10),
      };

      const response = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json().catch(() => ({}));
      if (typeof removeLoadingMessage === 'function') removeLoadingMessage();

      if (!response.ok || !data.answer) throw new Error(data.error || 'Nexora could not complete this request right now.');

      liveHistory.push({ role: 'user', content: raw });
      liveHistory.push({ role: 'assistant', content: data.answer });
      while (liveHistory.length > 20) liveHistory.shift();
      addLiveAssistant(data);
    } catch (error) {
      if (typeof removeLoadingMessage === 'function') removeLoadingMessage();
      addLiveError(`${error.message} Nexora will not invent products, prices, private data or current facts when the required tool is unavailable.`);
    } finally {
      liveBusy = false;
      if (send) send.disabled = false;
    }
  }

  // The primary chat always enters the universal agent router. The backend
  // chooses search, shopping or an n8n integration without a manual tool picker.
  document.addEventListener('click', (event) => {
    const button = event.target.closest?.('#runMission');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    liveRun();
  }, true);

  document.addEventListener('keydown', (event) => {
    if (event.target?.id !== 'missionInput') return;
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.stopImmediatePropagation();
      liveRun();
    }
  }, true);

  document.addEventListener('click', (event) => {
    if (event.target.closest?.('#newChat')) liveHistory.length = 0;
  }, true);
})();
