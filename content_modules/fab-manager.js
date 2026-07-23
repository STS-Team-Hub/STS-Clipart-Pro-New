(function() {
  'use strict';

  if (window.__stsFabManager) return;

  var FAB_ID = 'sts-clip-fab';
  var POPUP_ID = 'sts-scan-mode-popup';
  var FAB_ICON_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false"><path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h5.879a2.5 2.5 0 0 1 1.768.732l3.121 3.121A2.5 2.5 0 0 1 18 10.621V16.5A2.5 2.5 0 0 1 15.5 19h-9A2.5 2.5 0 0 1 4 16.5v-9Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/><path d="M9 11.5h4.5M9 14.5h3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M17.5 4.5v3M16 6h3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

  var state = {
    started: false,
    hooksInstalled: false,
    observer: null,
    retryTimer: null,
    retryCount: 0,
    maxRetries: 12,
    panelHookInstalled: false
  };

  function inTopWindow() {
    try { return window.top === window; } catch (e) { return false; }
  }

  function clearRetry() {
    if (state.retryTimer) {
      clearTimeout(state.retryTimer);
      state.retryTimer = null;
    }
    state.retryCount = 0;
  }

  function isReadyForMount() {
    return !!(document.body || document.documentElement);
  }

  function getContainer() {
    return document.body || document.documentElement || null;
  }

  async function isAuthed() {
    if (typeof window.__stsIsClipartAuthenticated === 'function') {
      return !!(await window.__stsIsClipartAuthenticated());
    }
    return false;
  }

  function getFab() {
    return document.getElementById(FAB_ID);
  }

  function setFabDisplay(isVisible) {
    var fab = getFab();
    if (!fab) return;
    fab.style.setProperty('display', isVisible ? 'flex' : 'none', 'important');
  }

  function applyFabBaseStyle(fab) {
    fab.style.setProperty('position', 'fixed', 'important');
    fab.style.setProperty('bottom', '56px', 'important');
    fab.style.setProperty('left', '16px', 'important');
    fab.style.setProperty('z-index', '2147483646', 'important');
    fab.style.setProperty('width', '40px', 'important');
    fab.style.setProperty('height', '40px', 'important');
    fab.style.setProperty('border-radius', '12px', 'important');
    fab.style.setProperty('background', '#2563EB', 'important');
    fab.style.setProperty('display', 'flex', 'important');
    fab.style.setProperty('align-items', 'center', 'important');
    fab.style.setProperty('justify-content', 'center', 'important');
    fab.style.setProperty('color', '#ffffff', 'important');
    fab.style.setProperty('cursor', 'pointer', 'important');
    fab.style.setProperty('box-shadow', '0 8px 24px rgba(37, 99, 235, 0.35)', 'important');
    fab.style.setProperty('opacity', '0.92', 'important');
    fab.style.setProperty('transition', 'transform .18s ease, opacity .18s ease, background .18s ease', 'important');
    fab.style.setProperty('font-size', '0', 'important');
    fab.style.setProperty('line-height', '0', 'important');
    fab.style.setProperty('user-select', 'none', 'important');
  }

  function attachFabEvents(fab) {
    if (fab.dataset.stsFabBound === '1') return;
    fab.onmouseover = function() {
      fab.style.setProperty('opacity', '1', 'important');
      fab.style.setProperty('transform', 'scale(1.06)', 'important');
      fab.style.setProperty('background', '#1D4ED8', 'important');
    };
    fab.onmouseout = function() {
      fab.style.setProperty('opacity', '0.92', 'important');
      fab.style.setProperty('transform', 'scale(1)', 'important');
      fab.style.setProperty('background', '#2563EB', 'important');
    };
    fab.onclick = async function() {
      if (typeof window.__stsOpenClipartPanelFromFab !== 'function') return;
      await window.__stsOpenClipartPanelFromFab();
    };
    fab.dataset.stsFabBound = '1';
  }

  function mountFab() {
    var existing = getFab();
    if (existing) {
      applyFabBaseStyle(existing);
      attachFabEvents(existing);
      return true;
    }
    var container = getContainer();
    if (!container) return false;
    var fab = document.createElement('div');
    fab.id = FAB_ID;
    fab.setAttribute('role', 'button');
    fab.setAttribute('tabindex', '0');
    fab.title = 'STS Clipart Pro 8.3 - Scan Clipart (Alt+C = Auto, Alt+M = Manual)';
    fab.innerHTML = FAB_ICON_SVG;
    applyFabBaseStyle(fab);
    attachFabEvents(fab);
    container.appendChild(fab);
    return true;
  }

  function unmountFab() {
    var fab = getFab();
    if (fab) fab.remove();
    var popup = document.getElementById(POPUP_ID);
    if (popup) popup.remove();
  }

  async function syncFabVisibility() {
    if (!inTopWindow()) return;
    if (!isReadyForMount()) {
      scheduleRetry();
      return;
    }
    if (await isAuthed()) {
      var ok = mountFab();
      if (ok) clearRetry();
      else scheduleRetry();
      if (typeof window.__stsIsClipartPanelOpen === 'function' && window.__stsIsClipartPanelOpen()) setFabDisplay(false);
      return;
    }
    clearRetry();
    unmountFab();
  }

  function scheduleRetry() {
    if (state.retryTimer || state.retryCount >= state.maxRetries) return;
    state.retryCount += 1;
    state.retryTimer = setTimeout(function() {
      state.retryTimer = null;
      syncFabVisibility();
    }, 200);
  }

  function installHistoryHooks() {
    if (window.__stsFabHistoryHooked) return;
    window.__stsFabHistoryHooked = true;
    var originalPush = history.pushState;
    var originalReplace = history.replaceState;
    history.pushState = function() {
      var ret = originalPush.apply(this, arguments);
      syncFabVisibility();
      return ret;
    };
    history.replaceState = function() {
      var ret = originalReplace.apply(this, arguments);
      syncFabVisibility();
      return ret;
    };
    window.addEventListener('popstate', syncFabVisibility, true);
  }

  function installObserver() {
    if (state.observer || !window.MutationObserver) return;
    var root = document.documentElement;
    if (!root) return;
    state.observer = new MutationObserver(function() {
      var fabExists = !!getFab();
      if (!fabExists) syncFabVisibility();
    });
    state.observer.observe(root, { childList: true, subtree: true });
  }

  function installHooks() {
    if (state.hooksInstalled) return;
    state.hooksInstalled = true;
    document.addEventListener('visibilitychange', function() {
      if (document.visibilityState === 'visible') syncFabVisibility();
    }, true);
    document.addEventListener('DOMContentLoaded', syncFabVisibility, true);
    window.addEventListener('load', syncFabVisibility, true);
    installHistoryHooks();
    installObserver();
    if (!state.panelHookInstalled && typeof window.__stsOnClipartPanelVisibilityChange === 'function') {
      state.panelHookInstalled = true;
      window.__stsOnClipartPanelVisibilityChange(function(isVisible) {
        if (isVisible) {
          setFabDisplay(false);
          return;
        }
        syncFabVisibility();
      });
    }
    if (chrome && chrome.storage && chrome.storage.onChanged) {
      chrome.storage.onChanged.addListener(function(changes, area) {
        if (area !== 'local') return;
        if (changes.stsClipartProUser || changes.stsAuthUser || changes.stsAuthToken) syncFabVisibility();
      });
    }
  }

  function init() {
    if (state.started) return;
    state.started = true;
    if (!inTopWindow()) return;
    installHooks();
    syncFabVisibility();
  }

  window.__stsFabManager = {
    init: init,
    ensureMounted: syncFabVisibility,
    unmount: unmountFab
  };
})();
