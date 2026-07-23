// STS Clipart Pro 8.3 — Shared sanitization helpers loaded before runtime modules.
(function () {
  'use strict';

  function html(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function attr(value) {
    return html(value).replace(/`/g, '&#096;');
  }

  function url(value) {
    var raw = String(value == null ? '' : value).trim();
    if (!raw) return '';
    try {
      var parsed = new URL(raw, window.location.href);
      var protocol = parsed.protocol.toLowerCase();
      if (protocol === 'http:' || protocol === 'https:' || protocol === 'data:' || protocol === 'blob:') {
        return attr(parsed.href);
      }
    } catch (_) {}
    return '';
  }

  function textNode(parent, value) {
    if (!parent) return null;
    var node = document.createTextNode(String(value == null ? '' : value));
    parent.appendChild(node);
    return node;
  }

  window.STSSanitize = {
    html: html,
    attr: attr,
    url: url,
    textNode: textNode
  };
})();
