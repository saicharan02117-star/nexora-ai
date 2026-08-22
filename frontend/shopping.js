(() => {
  function safe(value) {
    if (typeof escapeHtml === 'function') return escapeHtml(value);
    return String(value ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }

  function safeUrl(value) {
    try {
      const url = new URL(String(value));
      return ['http:', 'https:'].includes(url.protocol) ? url.href : '#';
    } catch { return '#'; }
  }

  window.optionCard = function(r, i) {
    const meta = Object.entries(r.metadata || {})
      .filter(([,v])=>v !== null && v !== undefined && v !== '')
      .filter(([k])=>!['Source Note'].includes(k))
      .map(([,v])=>`<span class="meta">${safe(String(v))}</span>`).join('');

    const buyLinks = Object.entries(r.buy_links || {}).slice(0,5)
      .map(([name,url], idx)=>`<a class="shop-link ${idx===0?'primary':''}" href="${safeUrl(url)}" target="_blank" rel="noopener noreferrer">${safe(name)} ↗</a>`).join('');
    const nearby = r.nearby_link ? `<a class="shop-link nearby" href="${safeUrl(r.nearby_link)}" target="_blank" rel="noopener noreferrer">Nearby shops ↗</a>` : '';
    const exactImageSearch = r.image_search_url ? `<a class="shop-link image-search" href="${safeUrl(r.image_search_url)}" target="_blank" rel="noopener noreferrer">View matching images ↗</a>` : '';

    const image = r.image_url
      ? `<div class="product-visual"><img loading="lazy" referrerpolicy="no-referrer" src="${safeUrl(r.image_url)}" alt="Product preview for ${safe(r.name)}" onerror="this.parentElement.style.display='none'"><span class="product-visual-badge">${safe(r.image_label || 'Verified product image')}</span></div>`
      : `<div class="image-unverified"><div class="image-placeholder-icon">▣</div><div><strong>Exact image not verified</strong><small>No random photo is shown for this demo suggestion.</small></div>${exactImageSearch}</div>`;

    const localRange = r.local_market_range ? `<div class="price-context"><span class="market-label">India local-market estimate</span><span class="market-range">${safe(r.local_market_range)}</span></div>` : '';
    const priceNote = r.price_note ? `<div class="price-note">${safe(r.price_note)}</div>` : '';
    const sourceNote = r.metadata?.['Source Note'] ? `<div class="shopping-disclaimer">${safe(r.metadata['Source Note'])}</div>` : '';

    return `<article class="option-card ${i===0?'best':''}">
      ${i===0?'<span class="best-ribbon">BEST MATCH</span>':''}
      ${image}
      <div class="option-head"><div><div class="option-name">${safe(r.name)}</div><div class="option-merchant">${safe(r.merchant)}</div></div><div class="option-price">${typeof money==='function'?money(r.price):`₹${Number(r.price||0).toLocaleString('en-IN')}`}</div></div>
      ${localRange}${priceNote}
      <span class="match-chip">Match ${Math.round(r.score)}%</span>
      ${r.reasons?.length?`<ul class="reason-list">${r.reasons.map(x=>`<li>${safe(x)}</li>`).join('')}</ul>`:''}
      <div class="meta-row">${meta}</div>
      ${(buyLinks||nearby)?`<div class="shopping-actions">${buyLinks}${nearby}</div>`:''}
      ${sourceNote}
    </article>`;
  };
})();
