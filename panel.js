(() => {
  'use strict';

  const EXTENSION_ORIGIN = new URL(location.href).origin;
  const state = {
    toolbarVisible: false,
    panelVisible: false,
    syncInFlight: false,
    isActive: false,
    mode: null,
    modeIcon: 'M',
    platform: 'unknown',
    hasAuth: false,
    productCount: 0,
    syncCount: 0,
    bookmarkIndex: -1,
    selectedCount: 0,
    canShowList: false,
    canToggleAll: false,
    canClearBookmark: false,
    canSync: false,
    canRescan: false,
    canCancel: false,
    toggleAllLabel: '☑',
    modeLabel: '',
    statusHtml: 'Đang khởi tạo...',
    products: []
  };

  const app = document.getElementById('app');

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function postToParent(type, payload) {
    window.parent.postMessage({
      source: 'sts-panel',
      type,
      payload
    }, '*');
  }

  let resizeRaf = 0;

  function requestResize() {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      const rect = app.getBoundingClientRect();
      postToParent('STS_UI_RESIZE', {
        width: Math.ceil(rect.width),
        height: Math.ceil(rect.height)
      });
    });
  }

  function setState(nextState) {
    Object.assign(state, nextState || {});
    render();
  }

  function sendAction(action, extra) {
    postToParent('STS_UI_ACTION', Object.assign({ action }, extra || {}));
  }

  function getBadge(product) {
    if (state.mode === 'bookmark' && product.selected) {
      return '<span class="sts-badge sts-badge--bookmark">🔖</span>';
    }
    if (product.isNew) {
      return '<span class="sts-badge sts-badge--new">✨</span>';
    }
    if (product.selected) {
      return '<span class="sts-badge sts-badge--selected">✅</span>';
    }
    return '';
  }

  function getItemClass(product) {
    const classes = ['sts-item'];
    if (state.mode === 'bookmark' && product.selected) classes.push('sts-item--bookmark');
    else if (product.isNew) classes.push('sts-item--new');
    else if (product.selected) classes.push('sts-item--selected');
    return classes.join(' ');
  }

  function renderProducts() {
    if (!state.panelVisible) return '';
    return `
      <section class="sts-panel" aria-label="Danh sách sản phẩm">
        <div class="sts-panel__header">
          <span class="sts-panel__meta">${escapeHtml(state.productCount)} SP — ${escapeHtml(state.modeLabel || '')}</span>
          <button class="sts-btn sts-btn--ghost" data-action="hide-panel" title="Đóng danh sách">✕</button>
        </div>
        <div class="sts-panel__list">
          ${state.products.map((product) => `
            <button
              class="${getItemClass(product)}"
              data-action="select-product"
              data-index="${product.index}"
              title="${escapeHtml(product.title)}"
            >
              <span class="sts-item__index">${product.index + 1}</span>
              <span class="sts-item__thumb">
                ${product.image ? `<img src="${escapeHtml(product.image)}" alt="">` : ''}
              </span>
              <span class="sts-item__title">${escapeHtml(product.title)}</span>
              ${getBadge(product)}
            </button>
          `).join('')}
        </div>
      </section>
    `;
  }

  function renderToolbar() {
    if (!state.toolbarVisible) {
      return ``;
    }

    return `
      ${renderProducts()}
      <div class="sts-toolbar" role="toolbar" aria-label="STS Clipart Pro 8.3 Toolbar">
        <span class="sts-toolbar__mode">${escapeHtml(state.modeIcon || 'M')}</span>
        <div class="sts-toolbar__status">${state.statusHtml || ''}</div>
        <div class="sts-actions">
          ${state.canSync ? `<button class="sts-btn sts-btn--success" data-action="sync" ${state.syncInFlight ? 'disabled' : ''}>${state.syncInFlight ? '...' : `Sync ${state.syncCount}`}</button>` : ''}
          ${state.canRescan ? `<button class="sts-btn sts-btn--primary" data-action="rescan" title="Rescan">↻</button>` : ''}
          ${state.canShowList ? `<button class="sts-btn sts-btn--ghost" data-action="toggle-panel" title="Danh sách SP">☰</button>` : ''}
          ${state.canToggleAll ? `<button class="sts-btn sts-btn--ghost" data-action="toggle-all" title="Chọn tất cả">${escapeHtml(state.toggleAllLabel)}</button>` : ''}
          ${state.canClearBookmark ? `<button class="sts-btn sts-btn--danger" data-action="clear-bookmark" title="Xóa bookmark">✕</button>` : ''}
          ${state.canCancel ? `<button class="sts-btn sts-btn--danger" data-action="cancel" title="Hủy crawl">✖</button>` : ''}
          <button class="sts-btn sts-btn--ghost" data-action="close-toolbar" title="Thu gọn">▾</button>
        </div>
      </div>
    `;
  }

  function render() {
    app.innerHTML = `<div class="sts-shell">${renderToolbar()}</div>`;
    requestResize();
  }

  app.addEventListener('click', (event) => {
    const target = event.target.closest('[data-action]');
    if (!target) return;
    const action = target.getAttribute('data-action');
    const indexValue = target.getAttribute('data-index');

    if (action === 'select-product') {
      const index = Number(indexValue);
      if (Number.isInteger(index)) sendAction(action, { index });
      return;
    }

    sendAction(action);
  });

  window.addEventListener('message', (event) => {
    if (event.source !== window.parent) return;
    const data = event.data || {};
    if (data.source !== 'sts-content') return;
    if (data.type !== 'STS_UI_STATE') return;
    setState(data.payload || {});
  });

  window.addEventListener('resize', requestResize, { passive: true });

  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', requestResize, { passive: true });
    window.visualViewport.addEventListener('scroll', requestResize, { passive: true });
  }

  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(() => requestResize());
    ro.observe(app);
  }

  render();
  postToParent('STS_UI_READY');
  requestResize();
})();
