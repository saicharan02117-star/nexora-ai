(() => {
  const nativeFetch = window.fetch.bind(window);
  let previousIntent = null;

  window.fetch = async function(input, init = {}) {
    const url = typeof input === 'string' ? input : (input?.url || '');
    let nextInit = init;

    if (url.includes('/api/missions') && String(init.method || 'GET').toUpperCase() === 'POST') {
      try {
        const payload = JSON.parse(init.body || '{}');
        payload.previous_intent = previousIntent;
        nextInit = {...init, body: JSON.stringify(payload)};
      } catch {}
    }

    const response = await nativeFetch(input, nextInit);

    if (url.includes('/api/missions') && response.ok) {
      try {
        const data = await response.clone().json();
        if (data?.intent) previousIntent = data.intent;
      } catch {}
    }

    return response;
  };

  document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('newChat')?.addEventListener('click', () => {
      previousIntent = null;
    }, true);
  });
})();
