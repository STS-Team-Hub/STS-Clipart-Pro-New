// STS Clipart Pro 8.3 — Sync payload validation helpers.
(function () {
  'use strict';

  function validateSyncPayloadShape(data) {
    if (!data || typeof data !== 'object') return { ok: false, error: 'Payload rỗng hoặc không hợp lệ' };
    if (!data.url || typeof data.url !== 'string') return { ok: false, error: 'Thiếu url' };
    if (!data.title || typeof data.title !== 'string') return { ok: false, error: 'Thiếu title' };
    if (!data.platform || typeof data.platform !== 'string') return { ok: false, error: 'Thiếu platform' };
    if (!Array.isArray(data.categories)) return { ok: false, error: 'categories phải là mảng' };
    for (var i = 0; i < data.categories.length; i++) {
      var cat = data.categories[i];
      if (!cat || typeof cat !== 'object') return { ok: false, error: 'category không hợp lệ tại index ' + i };
      if (!Array.isArray(cat.options)) return { ok: false, error: 'category.options phải là mảng tại index ' + i };
    }
    return { ok: true };
  }

  window.STSSyncPayload = { validateSyncPayloadShape: validateSyncPayloadShape };
})();
