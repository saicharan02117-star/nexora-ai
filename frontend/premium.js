(() => {
  const shoppingCss = document.createElement('link');
  shoppingCss.rel = 'stylesheet';
  shoppingCss.href = '/static/shopping.css';
  document.head.appendChild(shoppingCss);

  const shoppingScript = document.createElement('script');
  shoppingScript.src = '/static/shopping.js';
  document.head.appendChild(shoppingScript);

  let attachedImage = null;
  const $ = (id) => document.getElementById(id);

  function formatBytes(bytes) {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    return kb < 1024 ? `${kb.toFixed(kb < 100 ? 1 : 0)} KB` : `${(kb / 1024).toFixed(1)} MB`;
  }

  function clearAttachment() {
    if (attachedImage?.url) URL.revokeObjectURL(attachedImage.url);
    attachedImage = null;
    const tray = $('attachmentTray');
    if (tray) {
      tray.innerHTML = '';
      tray.classList.add('hidden');
    }
    if ($('fileInput')) $('fileInput').value = '';
  }

  function openPreview(url, caption = '') {
    $('lightboxImage').src = url;
    $('lightboxCaption').textContent = caption;
    $('imageLightbox').classList.remove('hidden');
  }

  function closePreview() {
    $('imageLightbox').classList.add('hidden');
    $('lightboxImage').src = '';
  }

  function renderAttachment(file) {
    clearAttachment();
    const url = URL.createObjectURL(file);
    attachedImage = { file, url, name: file.name, size: file.size };
    const tray = $('attachmentTray');
    tray.classList.remove('hidden');
    tray.innerHTML = `<div class="attachment-card" id="attachmentCard" role="button" tabindex="0"><img src="${url}" alt="${file.name.replace(/["<>]/g,'')}"/><button class="attachment-remove" id="removeAttachment" aria-label="Remove image">×</button><span class="attachment-badge">Preview</span></div>`;
    $('attachmentCard').addEventListener('click', (e) => {
      if (e.target.id === 'removeAttachment') return;
      openPreview(url, `${file.name} · ${formatBytes(file.size)}`);
    });
    $('removeAttachment').addEventListener('click', (e) => {
      e.stopPropagation();
      clearAttachment();
    });
  }

  function appendUserImageToLatestMessage() {
    if (!attachedImage) return;
    const rows = [...document.querySelectorAll('.message-row.user')];
    const row = rows[rows.length - 1];
    if (!row) return;
    const content = row.querySelector('.message-content');
    if (!content) return;
    const preview = document.createElement('div');
    preview.className = 'user-image-preview';
    preview.innerHTML = `<img src="${attachedImage.url}" alt="Attached product image"><div class="user-image-meta"><span>${attachedImage.name}</span><span>${formatBytes(attachedImage.size)}</span></div>`;
    preview.addEventListener('click', () => openPreview(attachedImage.url, `${attachedImage.name} · ${formatBytes(attachedImage.size)}`));
    const actions = content.querySelector('.message-actions');
    if (actions) content.insertBefore(preview, actions); else content.appendChild(preview);
  }

  function addImageContextHint() {
    if (!attachedImage) return;
    const input = $('missionInput');
    if (!input.value.trim()) input.value = 'Use this image as visual context for my commerce request.';
  }

  document.addEventListener('DOMContentLoaded', () => {
    if ($('fileInput')) {
      $('fileInput').setAttribute('accept', 'image/png,image/jpeg,image/webp,image/gif');
      $('fileInput').addEventListener('change', () => {
        const file = $('fileInput').files?.[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) return;
        if (file.size > 10 * 1024 * 1024) {
          if (typeof showToast === 'function') showToast('Please choose an image under 10 MB');
          clearAttachment();
          return;
        }
        renderAttachment(file);
        addImageContextHint();
      });
    }

    $('imagePreviewButton')?.addEventListener('click', () => $('fileInput')?.click());
    $('visualSearchCard')?.addEventListener('click', () => $('fileInput')?.click());
    $('closeLightbox')?.addEventListener('click', closePreview);
    $('imageLightbox')?.addEventListener('click', (e) => { if (e.target === $('imageLightbox')) closePreview(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('imageLightbox')?.classList.contains('hidden')) closePreview(); });

    $('runMission')?.addEventListener('click', () => {
      if (attachedImage) setTimeout(() => appendUserImageToLatestMessage(), 0);
    }, true);
    $('missionInput')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey && attachedImage) setTimeout(() => appendUserImageToLatestMessage(), 0);
    }, true);

    const observer = new MutationObserver(() => {
      if (attachedImage && document.querySelector('.message-row.user .user-image-preview')) {
        const tray = $('attachmentTray');
        if (tray) { tray.innerHTML = ''; tray.classList.add('hidden'); }
        if ($('fileInput')) $('fileInput').value = '';
        attachedImage = null;
      }
    });
    if ($('messageList')) observer.observe($('messageList'), { childList: true, subtree: true });
  });
})();
