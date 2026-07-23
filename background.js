chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return false;

  if (msg.type === 'CAPTURE_VISIBLE_TAB') {
    chrome.tabs.captureVisibleTab(
      sender && sender.tab ? sender.tab.windowId : null,
      { format: 'png', quality: 95 },
      (dataUrl) => {
        if (chrome.runtime.lastError) {
          sendResponse({
            ok: false,
            dataUrl: null,
            error: chrome.runtime.lastError.message,
          });
          return;
        }
        sendResponse({ ok: true, dataUrl });
      }
    );
    return true;
  }


  if (msg.type === 'FETCH_JSON') {
    (async () => {
      try {
        const resp = await fetch(msg.url, {
          method: msg.method || 'GET',
          headers: msg.headers || {},
          body: msg.body,
          credentials: 'omit',
          cache: 'no-store'
        });

        const text = await resp.text();
        let data = null;

        try {
          data = text ? JSON.parse(text) : null;
        } catch (parseError) {
          sendResponse({
            ok: false,
            status: resp.status,
            data: null,
            error: 'invalid_json',
            rawText: text
          });
          return;
        }

        sendResponse({
          ok: resp.ok,
          status: resp.status,
          data
        });
      } catch (error) {
        sendResponse({
          ok: false,
          status: 0,
          data: null,
          error: error && error.message ? error.message : 'fetch_json_failed'
        });
      }
    })();
    return true;
  }

  if (msg.type === 'FETCH_AS_DATAURL') {
    (async () => {
      try {
        const resp = await fetch(msg.url, { mode: 'cors', credentials: 'omit' });
        if (!resp.ok) {
          sendResponse({ ok: false, dataUrl: null, error: `HTTP ${resp.status}` });
          return;
        }

        const blob = await resp.blob();
        const reader = new FileReader();
        reader.onloadend = () => sendResponse({ ok: true, dataUrl: reader.result });
        reader.onerror = () => sendResponse({ ok: false, dataUrl: null, error: 'read_failed' });
        reader.readAsDataURL(blob);
      } catch (error) {
        sendResponse({
          ok: false,
          dataUrl: null,
          error: error && error.message ? error.message : 'fetch_failed',
        });
      }
    })();
    return true;
  }

  return false;
});
