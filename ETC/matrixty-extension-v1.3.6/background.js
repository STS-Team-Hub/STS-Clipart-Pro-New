// Matrixty Extension v7.0.0 — Background Service Worker
// Handles: Tab Capture, Analyze Product, Generate Title/Tags, AI Description,
//          Listing Fill, Content Script Injection, Mockup IndexedDB (cross-origin)

// ============================================================
//  MOCKUP IndexedDB — stored in extension origin (accessible from all tabs)
// ============================================================
const MK_DB_NAME = 'MatrixtyMockups';
const MK_DB_VERSION = 1;
const MK_STORE = 'mockups';

function mkOpenDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(MK_DB_NAME, MK_DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(MK_STORE)) {
        const store = db.createObjectStore(MK_STORE, { keyPath: 'id', autoIncrement: true });
        store.createIndex('ideaId', 'ideaId', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function mkSave(ideaId, base64Data, contentType, fileName, sourceUrl) {
  const db = await mkOpenDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MK_STORE, 'readwrite');
    tx.objectStore(MK_STORE).add({
      ideaId,
      base64Data,    // Store as base64 string (Blob can't cross message boundary)
      contentType: contentType || 'image/jpeg',
      fileName: fileName || `mockup-${Date.now()}.jpg`,
      sourceUrl: sourceUrl || '',
      savedAt: Date.now(),
    });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function mkGetAll(ideaId) {
  const db = await mkOpenDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MK_STORE, 'readonly');
    const req = tx.objectStore(MK_STORE).index('ideaId').getAll(ideaId);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function mkDelete(id) {
  const db = await mkOpenDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(MK_STORE, 'readwrite');
    tx.objectStore(MK_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function mkAssign(newIdeaId) {
  const unassigned = await mkGetAll('__unassigned__');
  if (unassigned.length === 0) return 0;
  const db = await mkOpenDB();
  const tx = db.transaction(MK_STORE, 'readwrite');
  const store = tx.objectStore(MK_STORE);
  for (const m of unassigned) {
    m.ideaId = newIdeaId;
    store.put(m);
  }
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(unassigned.length);
    tx.onerror = () => reject(tx.error);
  });
}

const SUPABASE_URL = 'https://qhejotdjehgneusqjvhz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoZWpvdGRqZWhnbmV1c3Fqdmh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2NzcyNTEsImV4cCI6MjA4NDI1MzI1MX0.5sbhhZ3VUrRQuRuLo3-o6CDzjbotPLzDGsn3oIjPM_U';
const HDR = { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' };

// v1.2.7: Random delay helper — mô phỏng thời gian phản ứng người thật
function humanRandom(minMs, maxMs) {
  return new Promise(r => setTimeout(r, Math.round(minMs + Math.random() * (maxMs - minMs))));
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {

  // === Capture visible tab (for Clipart Scanner) ===
  if (msg.type === 'CAPTURE_VISIBLE_TAB') {
    chrome.tabs.captureVisibleTab(null, { format: 'png', quality: 95 }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ dataUrl: null, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ dataUrl });
      }
    });
    return true;
  }

  // === Fetch any URL as data URL (bypass CORS for screenshot) ===
  if (msg.type === 'FETCH_AS_DATAURL') {
    (async () => {
      try {
        const resp = await fetch(msg.url, { mode: 'cors' });
        if (!resp.ok) { sendResponse({ dataUrl: null }); return; }
        const blob = await resp.blob();
        const reader = new FileReader();
        reader.onloadend = () => sendResponse({ dataUrl: reader.result });
        reader.readAsDataURL(blob);
      } catch(e) { sendResponse({ dataUrl: null }); }
    })();
    return true;
  }

  // [v1.2 DISABLED] ANHPHU_FETCH_IMAGE — image features removed
  if (msg.type === 'ANHPHU_FETCH_IMAGE') {
    sendResponse({ ok: false, error: 'Image features disabled in v1.2' });
    return false;
  }

  // ============================================================
  //  STEP 1: ANALYZE PRODUCT — gọi pod-lab-extract (y hệt Listing Lab)
  //  Input:  { title, variant, tags, imageUrl }
  //  Output: { productType, niche, sentiment, giftFor, giftFrom, quote, keyFeatures }
  // ============================================================
  if (msg.type === 'ANALYZE_PRODUCT') {
    const { title, variant, tags, imageUrl } = msg.payload || {};
    if (!title) {
      sendResponse({ ok: false, error: 'Missing title' });
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/pod-lab-extract`, {
          method: 'POST',
          headers: { ...HDR, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
          body: JSON.stringify({
            title: title,
            variant: variant || '',
            tags: Array.isArray(tags) ? tags : (tags ? [tags] : []),
            imageUrl: imageUrl || '',
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error('[Matrixty v7.0.0 BG] pod-lab-extract error:', res.status, errText);
          sendResponse({ ok: false, error: `Analyze failed: ${res.status}` });
          return;
        }

        const result = await res.json();
        if (result.success && result.data) {
          sendResponse({ ok: true, data: result.data });
        } else {
          sendResponse({ ok: false, error: result.error || 'Analyze returned no data' });
        }
      } catch (err) {
        console.error('[Matrixty v7.0.0 BG] ANALYZE_PRODUCT error:', err);
        sendResponse({ ok: false, error: err.message });
      }
    })();
    return true;
  }

  // ============================================================
  //  STEP 2: GENERATE TITLE + TAGS — gọi generate-fast (y hệt Listing Lab)
  //  Input:  { competitorTitle, productType, niche, sentiment, quote,
  //            giftFor, giftFrom, keyFeatures, platform, holidayName, ... }
  //  Output: { etsy_title, amazon_title, etsy_tags, etsy_slots, amazon_slots,
  //            validation_warnings, sentiment_applied }
  // ============================================================
  if (msg.type === 'GENERATE_TITLE_TAGS') {
    const payload = msg.payload || {};
    const { productType, platform } = payload;

    if (!productType) {
      sendResponse({ ok: false, error: 'Missing productType' });
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-fast`, {
          method: 'POST',
          headers: { ...HDR, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
          body: JSON.stringify({
            competitorTitle: payload.competitorTitle || payload.productType || '',
            productType: payload.productType || '',
            niche: payload.niche || '',
            sentiment: payload.sentiment || 'neutral',
            quote: payload.quote || '',
            giftFor: payload.giftFor || [],
            giftFrom: payload.giftFrom || [],
            recipients: payload.recipients || [],
            keyFeatures: payload.keyFeatures || '',
            platform: platform || 'etsy',
            holidayName: payload.holidayName || '',
            holidayPosition: payload.holidayPosition || '',
            isPeak: payload.isPeak || false,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error('[Matrixty v1.2 BG] generate-fast error:', res.status, errText);
          // v1.2: Include actual error text so popup can show useful info
          let errorDetail = `Generate failed: ${res.status}`;
          try {
            const errJson = JSON.parse(errText);
            if (errJson.error) errorDetail += ` — ${errJson.error}`;
          } catch(_) { if (errText) errorDetail += ` — ${errText.substring(0, 200)}`; }
          sendResponse({ ok: false, error: errorDetail });
          return;
        }

        const result = await res.json();
        if (result.success && result.data) {
          sendResponse({ ok: true, data: result.data });
        } else if (result.etsy_title || result.amazon_title) {
          // Some edge functions return data directly without wrapping
          sendResponse({ ok: true, data: result });
        } else {
          sendResponse({ ok: false, error: result.error || 'Generate returned no data' });
        }
      } catch (err) {
        console.error('[Matrixty v7.0.0 BG] GENERATE_TITLE_TAGS error:', err);
        sendResponse({ ok: false, error: err.message });
      }
    })();
    return true;
  }

  // === Generate listing description via Edge Function ===
  if (msg.type === 'GENERATE_LISTING_DESC') {
    const { idea, platform, auth } = msg.payload || {};
    if (!idea || !platform) {
      sendResponse({ ok: false, error: 'Missing idea or platform' });
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-listing`, {
          method: 'POST',
          headers: {
            ...HDR,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            idea_id: idea.idea_id || idea.id,
            platform: platform,
            title: idea.product_name || idea.assignment_title || idea.title || '',
            niche: idea.niche || '',
            product_name: idea.product_name || idea.assignment_title || '',
            variant: idea.variant || '',
            keywords: idea.lab_tags || idea.tags || '',
            user_id: auth?.userId,
            assignment_id: idea.assignment_id,
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          sendResponse({ ok: false, error: `Edge Function error: ${res.status} ${errText}` });
          return;
        }

        const data = await res.json();
        sendResponse({ ok: true, data });
      } catch (err) {
        sendResponse({ ok: false, error: err.message });
      }
    })();
    return true;
  }

  // === Log listing fill to database ===
  if (msg.type === 'LOG_LISTING_FILL') {
    const { user_id, idea_id, assignment_id, platform, generated_data, filled_fields, ai_model, page_url } = msg.payload || {};
    if (!user_id || !idea_id) {
      sendResponse({ ok: false, error: 'Missing user_id or idea_id' });
      return;
    }

    (async () => {
      try {
        const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/log_listing_generation`, {
          method: 'POST',
          headers: HDR,
          body: JSON.stringify({
            p_user_id: user_id,
            p_idea_id: idea_id,
            p_assignment_id: assignment_id || null,
            p_platform: platform,
            p_generated_data: generated_data || {},
            p_filled_fields: filled_fields || {},
            p_ai_model: ai_model || 'claude-haiku-4-5',
            p_page_url: page_url || null,
          }),
        });
        const data = await res.json();
        sendResponse({ ok: true, data });
      } catch (err) {
        sendResponse({ ok: false, error: err.message });
      }
    })();
    return true;
  }

  // ============================================================
  // v9.3: CDP PASTE — Chrome Debugger Protocol for REAL keyboard input
  // This is THE most reliable method. It uses Chrome's actual input pipeline
  // (Input.insertText) which is IDENTICAL to a real user typing.
  // React CANNOT distinguish this from real user input.
  // Trade-off: shows "debugging this tab" bar briefly.
  // ============================================================
  if (msg.type === 'CDP_PASTE') {
    const tabId = sender.tab?.id;
    const { text, selector } = msg;
    if (!tabId || !text) {
      sendResponse({ ok: false, error: 'Missing tabId or text' });
      return;
    }

    console.log(`[Matrixty CDP] Pasting ${text.length} chars into tab ${tabId}, selector=${selector || 'none'}`);

    (async () => {
      try {
        // Step 1: Attach debugger to the tab
        await new Promise((resolve, reject) => {
          chrome.debugger.attach({ tabId }, '1.3', () => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });

        // Step 2: Focus the target element via Runtime.evaluate (runs in page's main world)
        // This is CRITICAL — ensures CDP keyboard input goes to the RIGHT element
        // Also clears any existing value before typing
        if (selector) {
          const focusResult = await new Promise((resolve) => {
            chrome.debugger.sendCommand({ tabId }, 'Runtime.evaluate', {
              expression: `(() => {
                const el = document.querySelector(${JSON.stringify(selector)});
                if (!el) return 'NOT_FOUND';
                // v9.5: Scroll into view first — off-screen elements can't receive focus/input
                try { el.scrollIntoView({ behavior: 'instant', block: 'center' }); } catch(e) {}
                el.focus();
                el.click();
                // For input/textarea: select all existing text so insertText replaces it
                if (el.select) el.select();
                // Verify focus actually landed on the element
                const focused = document.activeElement === el;
                return 'FOCUSED:' + el.tagName + ':' + (el.value || '').length + 'chars:verified=' + focused;
              })()`,
              returnByValue: true
            }, (result) => {
              console.log('[Matrixty CDP] Focus result:', result?.result?.value);
              resolve(result?.result?.value || 'ERROR');
            });
          });

          // v9.5: ABORT if element not found — prevents typing into wrong field
          if (focusResult === 'NOT_FOUND') {
            console.error('[Matrixty CDP] ❌ Element NOT FOUND for selector:', selector, '— aborting paste to prevent data going to wrong field');
            try { chrome.debugger.detach({ tabId }, () => {}); } catch(e) {}
            sendResponse({ ok: false, error: 'Element not found: ' + selector });
            return;
          }
          await humanRandom(60, 180);
        }

        // Step 3: Select all (Ctrl+A) — ensure ALL existing text is selected
        await new Promise((resolve) => {
          chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
            type: 'keyDown',
            modifiers: 2, // Ctrl
            windowsVirtualKeyCode: 65, // A
            key: 'a',
            code: 'KeyA',
          }, resolve);
        });
        await humanRandom(30, 80);
        await new Promise((resolve) => {
          chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
            type: 'keyUp',
            modifiers: 2,
            windowsVirtualKeyCode: 65,
            key: 'a',
            code: 'KeyA',
          }, resolve);
        });
        await humanRandom(30, 80);

        // Step 4: Backspace — explicitly DELETE existing text first
        // This ensures React processes the deletion and clears internal state
        await new Promise((resolve) => {
          chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
            type: 'keyDown',
            windowsVirtualKeyCode: 8,
            key: 'Backspace',
            code: 'Backspace',
          }, resolve);
        });
        await humanRandom(20, 60);
        await new Promise((resolve) => {
          chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
            type: 'keyUp',
            windowsVirtualKeyCode: 8,
            key: 'Backspace',
            code: 'Backspace',
          }, resolve);
        });
        await humanRandom(60, 180);

        // Step 5: Verify field is actually empty now
        if (selector) {
          await new Promise((resolve) => {
            chrome.debugger.sendCommand({ tabId }, 'Runtime.evaluate', {
              expression: `(() => {
                const el = document.querySelector(${JSON.stringify(selector)});
                if (!el) return 'NOT_FOUND';
                const val = el.value || el.textContent || '';
                if (val.length > 0) {
                  // Still has text — force clear via nativeSetter + React tracker reset
                  const proto = el.tagName === 'INPUT' ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
                  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
                  if (setter) {
                    const tracker = el._valueTracker;
                    if (tracker) tracker.setValue(val);
                    setter.call(el, '');
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                    el.dispatchEvent(new Event('change', { bubbles: true }));
                  }
                  return 'FORCE_CLEARED:' + val.length;
                }
                return 'EMPTY';
              })()`,
              returnByValue: true
            }, (result) => {
              console.log('[Matrixty CDP] Clear check:', result?.result?.value);
              resolve();
            });
          });
          await humanRandom(60, 180);

          // Re-focus after clearing
          await new Promise((resolve) => {
            chrome.debugger.sendCommand({ tabId }, 'Runtime.evaluate', {
              expression: `(() => {
                const el = document.querySelector(${JSON.stringify(selector)});
                if (el) { el.focus(); if (el.select) el.select(); }
                return 'REFOCUSED';
              })()`,
              returnByValue: true
            }, resolve);
          });
          await humanRandom(30, 80);
        }

        // Step 6: Insert NEW text (into now-empty field)
        await new Promise((resolve) => {
          chrome.debugger.sendCommand({ tabId }, 'Input.insertText', {
            text: text
          }, resolve);
        });
        await humanRandom(100, 250);

        // Step 7: Verify the value was actually set
        let verified = false;
        if (selector) {
          const verifyResult = await new Promise((resolve) => {
            chrome.debugger.sendCommand({ tabId }, 'Runtime.evaluate', {
              expression: `(() => {
                const el = document.querySelector(${JSON.stringify(selector)});
                if (!el) return { found: false };
                return { found: true, value: (el.value || '').substring(0, 60), len: (el.value || '').length };
              })()`,
              returnByValue: true
            }, (result) => {
              resolve(result?.result?.value);
            });
          });
          console.log('[Matrixty CDP] Verify after insert:', JSON.stringify(verifyResult));
          verified = verifyResult && verifyResult.len === text.length;
        }

        // Step 8: Detach debugger (removes warning bar)
        await new Promise((resolve) => {
          chrome.debugger.detach({ tabId }, () => {
            if (chrome.runtime.lastError) {
              console.warn('[Matrixty CDP] Detach warning:', chrome.runtime.lastError.message);
            }
            resolve();
          });
        });

        console.log(`[Matrixty CDP] ✅ Paste completed, verified=${verified}`);
        sendResponse({ ok: true, method: 'cdp', verified });
      } catch (err) {
        console.error('[Matrixty CDP] Error:', err.message);
        try { chrome.debugger.detach({ tabId }, () => {}); } catch(e) {}
        sendResponse({ ok: false, error: err.message });
      }
    })();
    return true;
  }

  // === v1.2.6: CDP_TAGS_SIMPLE — paste comma string + click Add via CDP ===
  // This is the simplest, most reliable approach: type tags as comma-separated
  // string using real keyboard input (CDP Input.insertText), then click Add.
  if (msg.type === 'CDP_TAGS_SIMPLE') {
    const tabId = sender.tab?.id;
    const { inputSelector, addBtnSelector, tagString } = msg;
    if (!tabId || !inputSelector || !tagString) {
      sendResponse({ ok: false, error: 'Missing params' });
      return;
    }

    console.log(`[Matrixty CDP-TAGS-SIMPLE] tab=${tabId}, tags="${tagString.substring(0, 50)}..."`);

    (async () => {
      try {
        // Step 1: Attach debugger
        await new Promise((resolve, reject) => {
          chrome.debugger.attach({ tabId }, '1.3', () => {
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else resolve();
          });
        });

        // Step 2: Focus tag input + clear existing text
        await new Promise((resolve) => {
          chrome.debugger.sendCommand({ tabId }, 'Runtime.evaluate', {
            expression: `(() => {
              const el = document.querySelector(${JSON.stringify(inputSelector)});
              if (!el) return 'NOT_FOUND';
              el.scrollIntoView({ behavior: 'instant', block: 'center' });
              el.focus();
              el.click();
              if (el.select) el.select();
              return 'FOCUSED:' + el.tagName + ':' + (el.value || '').length;
            })()`,
            returnByValue: true
          }, (result) => {
            console.log('[Matrixty CDP-TAGS-SIMPLE] Focus result:', result?.result?.value);
            resolve();
          });
        });
        await humanRandom(120, 350);

        // Step 3: Select all + delete existing text
        await new Promise((resolve) => {
          chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
            type: 'keyDown', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65,
            modifiers: 2 // Ctrl
          }, resolve);
        });
        await new Promise((resolve) => {
          chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
            type: 'keyUp', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65
          }, resolve);
        });
        await humanRandom(30, 80);
        await new Promise((resolve) => {
          chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
            type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8
          }, resolve);
        });
        await new Promise((resolve) => {
          chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
            type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8
          }, resolve);
        });
        await humanRandom(80, 200);

        // Step 4: Type the comma-separated tag string (REAL keyboard input)
        await new Promise((resolve) => {
          chrome.debugger.sendCommand({ tabId }, 'Input.insertText', {
            text: tagString
          }, resolve);
        });
        await humanRandom(200, 600);

        console.log('[Matrixty CDP-TAGS-SIMPLE] Tag string typed');

        // Step 5: Click Add button
        if (addBtnSelector) {
          // Click via Runtime.evaluate (most reliable for React buttons)
          const clickResult = await new Promise((resolve) => {
            chrome.debugger.sendCommand({ tabId }, 'Runtime.evaluate', {
              expression: `(() => {
                const btn = document.querySelector(${JSON.stringify(addBtnSelector)});
                if (!btn) return 'BTN_NOT_FOUND';
                btn.click();
                // Also try React fiber onClick
                try {
                  const pk = Object.keys(btn).find(k => k.startsWith('__reactProps$'));
                  if (pk && btn[pk] && btn[pk].onClick) {
                    btn[pk].onClick(new MouseEvent('click', { bubbles: true }));
                    return 'CLICKED_REACT';
                  }
                } catch(e) {}
                return 'CLICKED_NATIVE';
              })()`,
              returnByValue: true
            }, (result) => {
              console.log('[Matrixty CDP-TAGS-SIMPLE] Click Add result:', result?.result?.value);
              resolve(result?.result?.value);
            });
          });
          await humanRandom(350, 800);

          // If native click didn't work, try CDP mouse click
          if (clickResult === 'CLICKED_NATIVE') {
            const btnPos = await new Promise((resolve) => {
              chrome.debugger.sendCommand({ tabId }, 'Runtime.evaluate', {
                expression: `(() => {
                  const btn = document.querySelector(${JSON.stringify(addBtnSelector)});
                  if (!btn) return null;
                  const r = btn.getBoundingClientRect();
                  return { x: r.left + r.width/2, y: r.top + r.height/2 };
                })()`,
                returnByValue: true
              }, (result) => resolve(result?.result?.value));
            });

            if (btnPos) {
              // CDP mouse click — this is a REAL browser click
              await new Promise((resolve) => {
                chrome.debugger.sendCommand({ tabId }, 'Input.dispatchMouseEvent', {
                  type: 'mousePressed', x: btnPos.x, y: btnPos.y, button: 'left', clickCount: 1
                }, resolve);
              });
              await new Promise((resolve) => {
                chrome.debugger.sendCommand({ tabId }, 'Input.dispatchMouseEvent', {
                  type: 'mouseReleased', x: btnPos.x, y: btnPos.y, button: 'left', clickCount: 1
                }, resolve);
              });
              console.log('[Matrixty CDP-TAGS-SIMPLE] CDP mouse click on Add at', btnPos);
              await humanRandom(350, 800);
            }
          }
        } else {
          // No Add button — press Enter
          await new Promise((resolve) => {
            chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
              type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, text: '\r'
            }, resolve);
          });
          await new Promise((resolve) => {
            chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
              type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13
            }, resolve);
          });
          await humanRandom(350, 800);
        }

        // Step 6: Detach debugger
        await new Promise((resolve) => {
          chrome.debugger.detach({ tabId }, () => {
            if (chrome.runtime.lastError) console.warn('[Matrixty CDP-TAGS-SIMPLE] Detach:', chrome.runtime.lastError.message);
            resolve();
          });
        });

        console.log('[Matrixty CDP-TAGS-SIMPLE] Done');
        sendResponse({ ok: true });
      } catch (err) {
        console.error('[Matrixty CDP-TAGS-SIMPLE] Error:', err.message);
        try { chrome.debugger.detach({ tabId }, () => {}); } catch(e) {}
        sendResponse({ ok: false, error: err.message });
      }
    })();
    return true;
  }

  // === v1.2.6: CDP_SKU_FILL — click Add SKU + type SKU via CDP ===
  if (msg.type === 'CDP_SKU_FILL') {
    const tabId = sender.tab?.id;
    const { skuValue } = msg;
    if (!tabId || !skuValue) {
      sendResponse({ ok: false, error: 'Missing params' });
      return;
    }

    console.log(`[Matrixty CDP-SKU] tab=${tabId}, sku="${skuValue}"`);

    (async () => {
      try {
        // Step 1: Attach debugger
        await new Promise((resolve, reject) => {
          chrome.debugger.attach({ tabId }, '1.3', () => {
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else resolve();
          });
        });

        // Step 2: Find + click "Pricing & Shipping" tab, then find + click "+ Add SKU"
        // All done via Runtime.evaluate (runs in main world)
        const setupResult = await new Promise((resolve) => {
          chrome.debugger.sendCommand({ tabId }, 'Runtime.evaluate', {
            expression: `(async () => {
              const delay = (min, max) => new Promise(r => setTimeout(r, max ? Math.round(min + Math.random() * (max - min)) : min));

              // Helper: find an input that is specifically for SKU
              const findSkuInput = () => {
                const sels = ['input[name="sku"]', 'input[name*="sku" i]', 'input[aria-label*="SKU" i]',
                  'input[placeholder*="SKU" i]', 'input[data-testid*="sku" i]', '#listing-sku-input', '#sku-input'];
                for (const sel of sels) {
                  const el = document.querySelector(sel);
                  if (el && el.getBoundingClientRect().width > 30) return el;
                }
                // Look for input near a REAL SKU label (not in Matrixty sidebar)
                const inputs = document.querySelectorAll('input[type="text"], input:not([type])');
                for (const inp of inputs) {
                  if (inp.closest('#mtx-listing-panel') || inp.closest('[id^="mtx-"]')) continue;
                  const ph = (inp.placeholder || '').toLowerCase();
                  if (ph.includes('tag') || ph.includes('shape') || ph.includes('color')) continue;
                  const parent = inp.closest('div, section, fieldset');
                  if (!parent) continue;
                  const pText = (parent.textContent || '').toLowerCase();
                  if (pText.includes('sku') && pText.length < 80 && !pText.includes('13 tags') && !pText.includes('left')) {
                    return inp;
                  }
                }
                return null;
              };

              // Check if SKU input already visible
              let skuInput = findSkuInput();
              if (skuInput) return { found: true };

              // Click "+ Add SKU" button on current view
              const clickAddSku = () => {
                const btns = document.querySelectorAll('button, a, [role="button"]');
                for (const btn of btns) {
                  const t = (btn.textContent || '').trim().replace(/\\s+/g, ' ');
                  if (t.length < 20 && /add\\s+sku/i.test(t) && btn.getBoundingClientRect().width > 0) {
                    btn.click();
                    // React fiber
                    try {
                      const pk = Object.keys(btn).find(k => k.startsWith('__reactProps$'));
                      if (pk && btn[pk]?.onClick) btn[pk].onClick(new MouseEvent('click', { bubbles: true }));
                    } catch(e) {}
                    return true;
                  }
                }
                return false;
              };

              if (clickAddSku()) {
                await delay(800, 1500);
                skuInput = findSkuInput();
                if (skuInput) return { found: true };
              }

              // Navigate to Pricing & Shipping tab
              const tabs = document.querySelectorAll('a, button, [role="tab"]');
              for (const tab of tabs) {
                const t = (tab.textContent || '').trim().toLowerCase();
                if (t.includes('pricing') || t.includes('price')) {
                  tab.click();
                  try {
                    const pk = Object.keys(tab).find(k => k.startsWith('__reactProps$'));
                    if (pk && tab[pk]?.onClick) tab[pk].onClick(new MouseEvent('click', { bubbles: true }));
                  } catch(e) {}
                  await delay(1200, 2200);
                  break;
                }
              }

              // Try finding SKU input after navigation
              skuInput = findSkuInput();
              if (skuInput) return { found: true };

              // Click + Add SKU on pricing tab
              if (clickAddSku()) {
                await delay(800, 1500);
                skuInput = findSkuInput();
                if (skuInput) return { found: true };
              }

              return { found: false };
            })()`,
            returnByValue: true,
            awaitPromise: true
          }, (result) => {
            console.log('[Matrixty CDP-SKU] Setup result:', result?.result?.value);
            resolve(result?.result?.value || { found: false });
          });
        });

        if (!setupResult?.found) {
          console.warn('[Matrixty CDP-SKU] SKU input not found after all attempts');
          await new Promise((resolve) => { chrome.debugger.detach({ tabId }, () => resolve()); });
          sendResponse({ ok: false, error: 'SKU input not found' });
          return;
        }

        // Step 3: Focus SKU input + clear + type SKU value via CDP
        await new Promise((resolve) => {
          chrome.debugger.sendCommand({ tabId }, 'Runtime.evaluate', {
            expression: `(() => {
              const sels = ['input[name="sku"]', 'input[name*="sku" i]', 'input[aria-label*="SKU" i]',
                'input[placeholder*="SKU" i]', 'input[data-testid*="sku" i]', '#listing-sku-input', '#sku-input'];
              let el = null;
              for (const sel of sels) {
                el = document.querySelector(sel);
                if (el && el.getBoundingClientRect().width > 30) break;
                el = null;
              }
              if (!el) {
                // Find input near SKU text (excluding tags/sidebar)
                const inputs = document.querySelectorAll('input[type="text"], input:not([type])');
                for (const inp of inputs) {
                  if (inp.closest('#mtx-listing-panel') || inp.closest('[id^="mtx-"]')) continue;
                  const ph = (inp.placeholder || '').toLowerCase();
                  if (ph.includes('tag') || ph.includes('shape') || ph.includes('color')) continue;
                  const parent = inp.closest('div, section, fieldset');
                  if (parent && (parent.textContent || '').toLowerCase().includes('sku') && !parent.textContent.includes('13 tags')) {
                    el = inp; break;
                  }
                }
              }
              if (!el) return 'NOT_FOUND';
              el.scrollIntoView({ behavior: 'instant', block: 'center' });
              el.focus();
              el.click();
              if (el.select) el.select();
              return 'FOCUSED:' + el.tagName + ':' + el.name + ':' + el.id;
            })()`,
            returnByValue: true
          }, (result) => {
            console.log('[Matrixty CDP-SKU] Focus SKU input:', result?.result?.value);
            resolve();
          });
        });
        await humanRandom(100, 300);

        // Clear existing text
        await new Promise((resolve) => {
          chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
            type: 'keyDown', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65, modifiers: 2
          }, resolve);
        });
        await new Promise((resolve) => {
          chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
            type: 'keyUp', key: 'a', code: 'KeyA', windowsVirtualKeyCode: 65
          }, resolve);
        });
        await humanRandom(30, 80);
        await new Promise((resolve) => {
          chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
            type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8
          }, resolve);
        });
        await new Promise((resolve) => {
          chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
            type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8
          }, resolve);
        });
        await humanRandom(80, 200);

        // Type SKU value
        await new Promise((resolve) => {
          chrome.debugger.sendCommand({ tabId }, 'Input.insertText', { text: skuValue }, resolve);
        });
        await humanRandom(150, 400);

        // Verify
        const verified = await new Promise((resolve) => {
          chrome.debugger.sendCommand({ tabId }, 'Runtime.evaluate', {
            expression: `document.activeElement?.value || ''`,
            returnByValue: true
          }, (result) => {
            resolve(result?.result?.value === skuValue);
          });
        });

        // Detach debugger
        await new Promise((resolve) => {
          chrome.debugger.detach({ tabId }, () => {
            if (chrome.runtime.lastError) console.warn('[Matrixty CDP-SKU] Detach:', chrome.runtime.lastError.message);
            resolve();
          });
        });

        console.log(`[Matrixty CDP-SKU] Done, verified=${verified}`);
        sendResponse({ ok: true, verified });
      } catch (err) {
        console.error('[Matrixty CDP-SKU] Error:', err.message);
        try { chrome.debugger.detach({ tabId }, () => {}); } catch(e) {}
        sendResponse({ ok: false, error: err.message });
      }
    })();
    return true;
  }

  // === v9.3: CDP TAG PASTE — paste tags one-by-one via CDP ===
  if (msg.type === 'CDP_TAG_PASTE') {
    const tabId = sender.tab?.id;
    const { tags, selector } = msg;
    if (!tabId || !tags || tags.length === 0) {
      sendResponse({ ok: false, error: 'Missing params', added: 0 });
      return;
    }

    console.log(`[Matrixty CDP-TAG] Pasting ${tags.length} tags into tab ${tabId}, selector=${selector || 'none'}`);

    (async () => {
      try {
        // Attach debugger
        await new Promise((resolve, reject) => {
          chrome.debugger.attach({ tabId }, '1.3', () => {
            if (chrome.runtime.lastError) reject(new Error(chrome.runtime.lastError.message));
            else resolve();
          });
        });

        // Focus the tag input via Runtime.evaluate — ensures CDP input goes to correct element
        if (selector) {
          await new Promise((resolve) => {
            chrome.debugger.sendCommand({ tabId }, 'Runtime.evaluate', {
              expression: `(() => {
                const el = document.querySelector(${JSON.stringify(selector)});
                if (!el) return 'NOT_FOUND';
                el.focus();
                el.click();
                // Clear any partial text in the tag input
                if (el.value && el.value.length > 0) {
                  const proto = HTMLInputElement.prototype;
                  const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
                  if (setter) {
                    const tracker = el._valueTracker;
                    if (tracker) tracker.setValue(el.value);
                    setter.call(el, '');
                    el.dispatchEvent(new Event('input', { bubbles: true }));
                  }
                }
                return 'FOCUSED:' + el.tagName;
              })()`,
              returnByValue: true
            }, (result) => {
              console.log('[Matrixty CDP-TAG] Focus result:', result?.result?.value);
              resolve();
            });
          });
          await humanRandom(100, 250);
        }

        let added = 0;
        for (let i = 0; i < tags.length; i++) {
          const tag = tags[i].trim();
          if (!tag) continue;

          // Type the tag text
          await new Promise((resolve) => {
            chrome.debugger.sendCommand({ tabId }, 'Input.insertText', { text: tag }, resolve);
          });
          await humanRandom(100, 250);

          // Press comma (Etsy adds tag on comma)
          await new Promise((resolve) => {
            chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
              type: 'keyDown', key: ',', code: 'Comma',
              windowsVirtualKeyCode: 188, text: ','
            }, resolve);
          });
          await new Promise((resolve) => {
            chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
              type: 'char', key: ',', code: 'Comma', text: ','
            }, resolve);
          });
          await new Promise((resolve) => {
            chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
              type: 'keyUp', key: ',', code: 'Comma',
              windowsVirtualKeyCode: 188
            }, resolve);
          });
          await humanRandom(150, 350);

          // Also press Enter as backup (some React tag inputs respond to Enter, not comma)
          await new Promise((resolve) => {
            chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
              type: 'keyDown', key: 'Enter', code: 'Enter',
              windowsVirtualKeyCode: 13, text: '\r'
            }, resolve);
          });
          await new Promise((resolve) => {
            chrome.debugger.sendCommand({ tabId }, 'Input.dispatchKeyEvent', {
              type: 'keyUp', key: 'Enter', code: 'Enter',
              windowsVirtualKeyCode: 13
            }, resolve);
          });
          await humanRandom(200, 500);

          added++;
          console.log(`[Matrixty CDP-TAG] Tag ${i}: "${tag}" done`);
        }

        // Detach debugger
        await new Promise((resolve) => {
          chrome.debugger.detach({ tabId }, () => {
            if (chrome.runtime.lastError) console.warn('[Matrixty CDP-TAG] Detach warning:', chrome.runtime.lastError.message);
            resolve();
          });
        });

        console.log(`[Matrixty CDP-TAG] ✅ ${added}/${tags.length} tags pasted`);
        sendResponse({ ok: true, added });
      } catch (err) {
        console.error('[Matrixty CDP-TAG] Error:', err.message);
        try { chrome.debugger.detach({ tabId }, () => {}); } catch(e) {}
        sendResponse({ ok: false, error: err.message, added: 0 });
      }
    })();
    return true;
  }

  // === v9.2: MAIN WORLD PASTE — use chrome.scripting.executeScript with world:'MAIN' ===
  // Content script <script> injection is blocked by Etsy's CSP.
  // chrome.scripting.executeScript with world:'MAIN' BYPASSES CSP.
  // This runs the paste logic in the SAME JS context as React.
  if (msg.type === 'MAIN_WORLD_PASTE') {
    const tabId = sender.tab?.id;
    const { selector, text } = msg;
    if (!tabId || !selector || !text) {
      sendResponse({ ok: false, error: 'Missing tabId/selector/text' });
      return;
    }

    chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: (selector, text) => {
        try {
          const el = document.querySelector(selector);
          if (!el) return { ok: false, error: 'Element not found: ' + selector };

          const isInput = el.tagName === 'INPUT';
          const isTextarea = el.tagName === 'TEXTAREA';
          const proto = isInput ? HTMLInputElement.prototype : (isTextarea ? HTMLTextAreaElement.prototype : null);
          const nativeSetter = proto ? Object.getOwnPropertyDescriptor(proto, 'value').set : null;

          console.log('[Matrixty MW-PASTE] Element:', el.tagName, el.id || el.name || '', 'current value:', (el.value || '').substring(0, 30));

          // === METHOD 1: execCommand in main world (fires TRUSTED InputEvent → React detects it) ===
          el.focus();
          if (el.select) el.select();
          document.execCommand('selectAll');
          document.execCommand('delete');
          var execOk = document.execCommand('insertText', false, text);

          if (execOk && el.value === text) {
            console.log('[Matrixty MW-PASTE] ✅ execCommand SUCCESS — ' + text.length + ' chars');
            el.dispatchEvent(new Event('change', { bubbles: true }));
            return { ok: true, method: 'execCommand' };
          }

          console.log('[Matrixty MW-PASTE] execCommand result: execOk=' + execOk + ', valueMatch=' + (el.value === text) + ', got="' + (el.value || '').substring(0, 40) + '"');

          // === METHOD 2: nativeSetter + _valueTracker reset (React state update trick) ===
          if (nativeSetter) {
            // Step A: Reset tracker to current value so React detects the CHANGE
            var tracker = el._valueTracker;
            if (tracker) {
              tracker.setValue(el.value || '');  // store old value
              console.log('[Matrixty MW-PASTE] _valueTracker found, resetting');
            } else {
              console.log('[Matrixty MW-PASTE] WARNING: _valueTracker NOT found on element');
            }

            // Step B: Set new value via native setter (bypasses React's property wrapper)
            nativeSetter.call(el, text);

            // Step C: Fire InputEvent — React 17+ delegates input events at root and processes them
            el.dispatchEvent(new InputEvent('input', {
              bubbles: true, cancelable: false,
              data: text, inputType: 'insertText', isComposing: false
            }));
            el.dispatchEvent(new Event('change', { bubbles: true }));

            // Step D: Also fire React-specific simulated event (React 16 compat)
            try {
              var simEvt = new Event('input', { bubbles: true });
              Object.defineProperty(simEvt, 'simulated', { value: true });
              el.dispatchEvent(simEvt);
            } catch(e) {}

            // Step E: Blur to trigger onBlur validation
            el.dispatchEvent(new Event('blur', { bubbles: true }));
          } else {
            el.value = text;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }

          var ok = el.value === text;
          console.log('[Matrixty MW-PASTE] ' + (ok ? '✅' : '❌') + ' nativeSetter result: valueMatch=' + ok + ' (' + el.value.length + ' chars)');
          return { ok, method: 'nativeSetter', value: el.value.substring(0, 50) };
        } catch(e) {
          console.error('[Matrixty MW-PASTE] Error:', e);
          return { ok: false, error: e.message };
        }
      },
      args: [selector, text],
    }, (results) => {
      if (chrome.runtime.lastError) {
        console.error('[Matrixty BG] MW-PASTE error:', chrome.runtime.lastError.message);
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
      } else {
        const result = results?.[0]?.result || { ok: false };
        console.log('[Matrixty BG] MW-PASTE result:', result);
        sendResponse(result);
      }
    });
    return true;
  }

  // === v9.2: MAIN WORLD CLICK — click a button via React fiber in main world ===
  if (msg.type === 'MAIN_WORLD_CLICK') {
    const tabId = sender.tab?.id;
    const { selector } = msg;
    if (!tabId || !selector) {
      sendResponse({ ok: false }); return;
    }
    chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: (selector) => {
        try {
          const btn = document.querySelector(selector);
          if (!btn) return { ok: false, error: 'Button not found' };
          // Native click
          btn.click();
          // React fiber onClick
          const propsKey = Object.keys(btn).find(k => k.startsWith('__reactProps$'));
          if (propsKey) {
            const rp = btn[propsKey];
            if (rp && typeof rp.onClick === 'function') {
              console.log('[Matrixty MW-CLICK] Calling React onClick');
              rp.onClick(new MouseEvent('click', { bubbles: true }));
            }
          }
          const fiberKey = Object.keys(btn).find(k => k.startsWith('__reactFiber$') || k.startsWith('__reactInternalInstance$'));
          if (fiberKey) {
            let fiber = btn[fiberKey];
            for (let i = 0; i < 30 && fiber; i++) {
              const props = fiber.memoizedProps || fiber.pendingProps;
              if (props && typeof props.onClick === 'function') {
                console.log('[Matrixty MW-CLICK] Calling fiber onClick at depth ' + i);
                props.onClick(new MouseEvent('click', { bubbles: true }));
                break;
              }
              fiber = fiber['return'];
            }
          }
          return { ok: true };
        } catch(e) { return { ok: false, error: e.message }; }
      },
      args: [selector],
    }, (results) => {
      sendResponse(results?.[0]?.result || { ok: false });
    });
    return true;
  }

  // === v9.2: MAIN WORLD TAG PASTE — add tags one-by-one in main world ===
  if (msg.type === 'MAIN_WORLD_TAG_PASTE') {
    const tabId = sender.tab?.id;
    const { selector, tags } = msg;
    if (!tabId || !selector || !tags) {
      sendResponse({ ok: false, error: 'Missing params' });
      return;
    }

    chrome.scripting.executeScript({
      target: { tabId },
      world: 'MAIN',
      func: async (selector, tags) => {
        try {
          const el = document.querySelector(selector);
          if (!el) return { ok: false, error: 'Tag input not found: ' + selector, added: 0 };

          // v1.2.5: SIMPLE — paste all tags as comma string + click Add
          const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
          const tagStr = tags.map(t => t.trim()).filter(Boolean).join(', ');

          console.log('[Matrixty MW-TAG v1.2.5] Pasting comma string: "' + tagStr.substring(0, 60) + '..."');

          // Focus + clear
          el.focus();
          el.click();
          await new Promise(r => setTimeout(r, Math.round(50 + Math.random() * 60)));

          let tracker = el._valueTracker;
          if (tracker) tracker.setValue(el.value || '');
          if (nativeSetter) nativeSetter.call(el, '');
          else el.value = '';
          el.dispatchEvent(new Event('input', { bubbles: true }));
          await new Promise(r => setTimeout(r, Math.round(30 + Math.random() * 50)));

          // Set comma-separated tags
          tracker = el._valueTracker;
          if (tracker) tracker.setValue('');
          if (nativeSetter) nativeSetter.call(el, tagStr);
          else el.value = tagStr;
          el.dispatchEvent(new InputEvent('input', {
            bubbles: true, data: tagStr, inputType: 'insertText'
          }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          await new Promise(r => setTimeout(r, Math.round(120 + Math.random() * 160)));

          console.log('[Matrixty MW-TAG v1.2.5] Value set, now=' + el.value.substring(0, 40));

          // Find and click Add button
          let addBtn = null;
          let parent = el.parentElement;
          for (let d = 0; d < 5 && parent; d++) {
            const candidates = parent.querySelectorAll('button, [role="button"], span, div');
            for (const c of candidates) {
              const txt = (c.textContent || '').trim();
              if (txt === 'Add' && c !== el) {
                const rect = c.getBoundingClientRect();
                if (rect.width > 10 && rect.width < 200 && rect.height > 10) { addBtn = c; break; }
              }
            }
            if (addBtn) break;
            parent = parent.parentElement;
          }

          if (addBtn) {
            console.log('[Matrixty MW-TAG v1.2.5] Clicking Add button');
            addBtn.click();
            await new Promise(r => setTimeout(r, Math.round(200 + Math.random() * 200)));

            // React fiber onClick
            const propsKey = Object.keys(addBtn).find(k => k.startsWith('__reactProps$'));
            if (propsKey) {
              const rp = addBtn[propsKey];
              if (rp && typeof rp.onClick === 'function') {
                console.log('[Matrixty MW-TAG v1.2.5] React fiber onClick');
                rp.onClick(new MouseEvent('click', { bubbles: true }));
              }
            }
            await new Promise(r => setTimeout(r, Math.round(350 + Math.random() * 300)));
          }

          // Also press Enter as backup
          const enterOpts = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true };
          el.dispatchEvent(new KeyboardEvent('keydown', enterOpts));
          el.dispatchEvent(new KeyboardEvent('keypress', enterOpts));
          el.dispatchEvent(new KeyboardEvent('keyup', enterOpts));
          await new Promise(r => setTimeout(r, Math.round(200 + Math.random() * 200)));

          // Check result — verify tags were actually added
          const scopeText = (el.closest('section') || el.closest('[class*="tag" i]') || el.parentElement?.parentElement?.parentElement || document.body).textContent || '';
          const allUsed = /All\s*13\s*used/i.test(scopeText);
          const leftMatch = scopeText.match(/(\d+)\s*left/i);
          // v1.2.5: Don't assume success — return 0 if can't verify
          let added = 0;
          if (allUsed) {
            added = tags.length;
          } else if (leftMatch) {
            added = 13 - parseInt(leftMatch[1]);
          } else {
            // Check if input was cleared (tags were processed)
            added = (el.value === '' || el.value.length < 3) ? tags.length : 0;
          }

          console.log('[Matrixty MW-TAG v1.2.5] Done: added=' + added + ', allUsed=' + allUsed + ', inputValue="' + (el.value || '').substring(0, 30) + '"');
          return { ok: added > 0, added };
        } catch(e) {
          return { ok: false, error: e.message, added: 0 };
        }
      },
      args: [selector, tags],
    }, (results) => {
      if (chrome.runtime.lastError) {
        console.error('[Matrixty BG] MW-TAG error:', chrome.runtime.lastError.message);
        sendResponse({ ok: false, error: chrome.runtime.lastError.message, added: 0 });
      } else {
        const result = results?.[0]?.result || { ok: false, added: 0 };
        console.log('[Matrixty BG] MW-TAG result:', result);
        sendResponse(result);
      }
    });
    return true;
  }

  // === BG_LOGIN: Login via service worker (fallback for browsers where popup fetch is blocked/slow) ===
  if (msg.type === 'BG_LOGIN') {
    const { email, password } = msg.payload || {};
    if (!email || !password) { sendResponse({ ok: false, error: 'Missing credentials' }); return; }
    (async () => {
      try {
        console.log('[Matrixty BG] BG_LOGIN attempt for:', email);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 30000);
        const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/extension_login`, {
          method: 'POST', headers: HDR,
          body: JSON.stringify({ p_email: email, p_password: password }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          sendResponse({ ok: false, error: `Server error (${res.status})` });
          return;
        }
        const result = await res.json();
        console.log('[Matrixty BG] BG_LOGIN result:', result?.id ? 'OK' : 'FAIL');
        if (result?.error) { sendResponse({ ok: false, error: result.error }); return; }
        if (!result?.id) { sendResponse({ ok: false, error: 'Wrong email or password' }); return; }
        if (!result.extension_access) { sendResponse({ ok: false, error: 'Account not authorized for Extension' }); return; }
        sendResponse({ ok: true, result });
      } catch (err) {
        console.error('[Matrixty BG] BG_LOGIN error:', err.name, err.message);
        sendResponse({ ok: false, error: err.name === 'AbortError' ? 'Background login timeout (30s)' : err.message });
      }
    })();
    return true;
  }

  // === Direct Fill: inject paste code into tab via chrome.scripting ===
  // Dùng khi content script LISTING_PASTE trả về 0 fields (fallback)
  if (msg.type === 'DIRECT_FILL') {
    const { tabId, title, tags, sku, platform } = msg.payload || {};
    if (!tabId) {
      sendResponse({ ok: false, error: 'Missing tabId' });
      return;
    }

    chrome.scripting.executeScript({
      target: { tabId },  // v1.2.2: Main frame only — allFrames caused about:blank failures
      world: 'MAIN',  // v9.2: Run in MAIN world so React detects value changes
      func: async (title, tags, sku, platform) => {
        // v1.2.7: Top-level random delay helper for transitions between fields
        const delay = (min, max) => new Promise(r => setTimeout(r, max ? Math.round(min + Math.random() * (max - min)) : min));

        // ======= HELPER FUNCTIONS =======
        // React 17+ compatible click — dispatches full pointer+mouse event sequence
        function reactClick(el) {
          const rect = el.getBoundingClientRect();
          const x = rect.left + rect.width / 2;
          const y = rect.top + rect.height / 2;
          const evtInit = { bubbles: true, cancelable: true, view: window, clientX: x, clientY: y };
          el.dispatchEvent(new PointerEvent('pointerdown', { ...evtInit, pointerId: 1, pointerType: 'mouse' }));
          el.dispatchEvent(new MouseEvent('mousedown', evtInit));
          el.dispatchEvent(new PointerEvent('pointerup', { ...evtInit, pointerId: 1, pointerType: 'mouse' }));
          el.dispatchEvent(new MouseEvent('mouseup', evtInit));
          el.dispatchEvent(new MouseEvent('click', evtInit));
        }

        function setNativeValue(el, value) {
          const proto = el.tagName === 'INPUT' ? HTMLInputElement.prototype :
                        el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : null;
          if (proto) {
            // CRITICAL: Reset React's _valueTracker so React detects the new value
            const tracker = el._valueTracker;
            if (tracker) { tracker.setValue(''); }
            const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
            if (setter) setter.call(el, value);
            else el.value = value;
          } else if (el.contentEditable === 'true') {
            el.textContent = value;
          } else {
            el.value = value;
          }
          // Fire InputEvent (React specifically listens for this)
          try { el.dispatchEvent(new InputEvent('input', { bubbles: true, data: value, inputType: 'insertText' })); }
          catch(e) { el.dispatchEvent(new Event('input', { bubbles: true })); }
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // v10: Brute-force: tìm editable element gần label chứa text
        // Includes contenteditable divs + role="textbox" for Amazon
        const EDITABLE_SEL_DF = 'input[type="text"], input:not([type]), textarea, [contenteditable="true"], [role="textbox"]';

        // v1.2.2: SHADOW DOM TRAVERSAL — Amazon Katal (KAT-*) uses shadow DOM for form inputs
        function findAllEditablesDeep(root) {
          const results = [];
          // Standard DOM query first
          root.querySelectorAll(EDITABLE_SEL_DF).forEach(el => results.push(el));
          // Traverse shadow roots of custom elements (kat-textarea, kat-input, etc.)
          root.querySelectorAll('*').forEach(el => {
            if (el.shadowRoot) {
              el.shadowRoot.querySelectorAll(EDITABLE_SEL_DF).forEach(inner => results.push(inner));
              // One more level deep
              el.shadowRoot.querySelectorAll('*').forEach(inner => {
                if (inner.shadowRoot) {
                  inner.shadowRoot.querySelectorAll(EDITABLE_SEL_DF).forEach(deep => results.push(deep));
                }
              });
            }
          });
          return results;
        }

        // v1.2.2: Find textarea/input near a label text, including inside shadow DOM
        function findEditableNearLabelDeep(labelText) {
          const ltLower = labelText.toLowerCase();
          // Find all elements containing the label text
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
          while (walker.nextNode()) {
            const txt = walker.currentNode.textContent.trim();
            if (!txt || txt.length > 50) continue;
            if (!txt.toLowerCase().includes(ltLower)) continue;
            // Found label text — walk UP to find a container with editable elements (including shadow DOM)
            let container = walker.currentNode.parentElement;
            for (let depth = 0; depth < 12 && container; depth++) {
              const editables = findAllEditablesDeep(container);
              for (const el of editables) {
                const r = el.getBoundingClientRect();
                if (r.width > 100 && r.height > 10) {
                  console.log(`[Matrixty DIRECT_FILL v1.2.2] Found "${labelText}" via deep search (depth ${depth}):`, el.tagName, el.name || el.id || '', `${Math.round(r.width)}x${Math.round(r.height)}`);
                  return el;
                }
              }
              container = container.parentElement;
            }
          }
          return null;
        }

        function findInputNearLabel(labelText) {
          const ltLower = labelText.toLowerCase();
          // v10: Search ALL element types — Amazon uses span/p/div for labels
          const labels = document.querySelectorAll('label, h2, h3, h4, h5, legend, span, p, div, [class*="label" i]');
          for (const lbl of labels) {
            const ownText = lbl.childNodes.length <= 3 ? (lbl.textContent || '').trim() : '';
            if (!ownText || ownText.length > 80) continue;
            if (!ownText.toLowerCase().includes(ltLower)) continue;
            // v10: Walk UP from label to find container with editable element
            let container = lbl.parentElement;
            for (let depth = 0; depth < 8 && container; depth++) {
              const editables = container.querySelectorAll(EDITABLE_SEL_DF);
              for (const input of editables) {
                const rect = input.getBoundingClientRect();
                if (rect.width > 50 && rect.height > 5) {
                  console.log(`[Matrixty DIRECT_FILL v10] Found "${labelText}" via label (depth ${depth}):`, input.tagName, input.name || input.id || '', `${Math.round(rect.width)}x${Math.round(rect.height)}`);
                  return input;
                }
              }
              container = container.parentElement;
            }
          }
          // Strategy 2: by attribute
          const inputs = document.querySelectorAll(EDITABLE_SEL_DF);
          for (const inp of inputs) {
            const attrs = [inp.name, inp.id, inp.getAttribute('aria-label'), inp.placeholder].join(' ').toLowerCase();
            if (attrs.includes(ltLower) && inp.getBoundingClientRect().width > 50) return inp;
          }
          return null;
        }

        function findLargestInput() {
          // v10: Include contenteditable divs + role="textbox"
          const inputs = document.querySelectorAll(EDITABLE_SEL_DF);
          let best = null, bestW = 0;
          for (const inp of inputs) {
            if (inp.type === 'search' || inp.type === 'hidden') continue;
            const w = inp.getBoundingClientRect().width;
            if (w > bestW && w > 100) { bestW = w; best = inp; }
          }
          return best;
        }

        // Log ALL inputs for debugging
        const allInputs = document.querySelectorAll('input, textarea');
        console.log(`[Matrixty DIRECT_FILL] Page: ${window.location.href}`);
        console.log(`[Matrixty DIRECT_FILL] All inputs (${allInputs.length}):`,
          Array.from(allInputs).slice(0, 30).map(el => ({
            tag: el.tagName, type: el.type, name: el.name, id: el.id,
            ariaLabel: el.getAttribute('aria-label'), placeholder: el.placeholder,
            w: Math.round(el.getBoundingClientRect().width),
          }))
        );

        const filled = [];

        // ======= FILL TITLE =======
        if (title) {
          const TITLE_SELS = [
            // === Etsy selectors ===
            '#listing-title-input',
            'textarea[name="title"]',
            'input[name="title"]',
            // === Amazon selectors (v10) ===
            'textarea[name*="item_name" i]',
            'input[name*="item_name" i]',
            'textarea[aria-label*="Item Name" i]',
            'input[aria-label*="Item Name" i]',
            'textarea[aria-label*="Product Title" i]',
            // === Generic selectors ===
            'input[placeholder*="title" i]', 'textarea[placeholder*="title" i]',
            'input[aria-label*="title" i]', 'textarea[aria-label*="title" i]',
            '#listing-edit-title input', '#listing-edit-title textarea',
            'input[data-testid="title-input"]', 'textarea[data-testid="title-input"]',
            'input[id*="title" i]', 'textarea[id*="title" i]',
            'div[data-testid="title"] input', 'div[data-testid="title"] textarea',
          ];
          let titleEl = null;
          for (const sel of TITLE_SELS) {
            // v10: Use querySelectorAll — Amazon has hidden duplicates; find first VISIBLE match
            const candidates = document.querySelectorAll(sel);
            for (const candidate of candidates) {
              const rect = candidate.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                titleEl = candidate;
                console.log('[Matrixty DIRECT_FILL] Title via selector:', sel, `(${Math.round(rect.width)}x${Math.round(rect.height)})`);
                break;
              }
            }
            if (titleEl) break;
          }
          // v10: Try Amazon-specific label "Item Name" before generic "Title"
          if (!titleEl) { titleEl = findInputNearLabel('Item Name'); if (titleEl) console.log('[Matrixty DIRECT_FILL] Title via label "Item Name"'); }
          if (!titleEl) { titleEl = findInputNearLabel('Title'); if (titleEl) console.log('[Matrixty DIRECT_FILL] Title via label "Title"'); }
          if (!titleEl) { titleEl = findLargestInput(); if (titleEl) console.log('[Matrixty DIRECT_FILL] Title via largest input'); }
          // v1.2.2: Shadow DOM deep search — Amazon Katal wraps inputs in shadow roots
          if (!titleEl) { titleEl = findEditableNearLabelDeep('Item Name'); if (titleEl) console.log('[Matrixty DIRECT_FILL v1.2.2] Title via shadow DOM deep search "Item Name"'); }
          if (!titleEl) { titleEl = findEditableNearLabelDeep('Title'); if (titleEl) console.log('[Matrixty DIRECT_FILL v1.2.2] Title via shadow DOM deep search "Title"'); }
          // v1.2.2: Find largest editable INCLUDING shadow DOM
          if (!titleEl) {
            const allDeepEditables = findAllEditablesDeep(document.body);
            let bestTA = null, bestW = 0;
            for (const ta of allDeepEditables) {
              if (ta.type === 'search' || ta.type === 'hidden') continue;
              const r = ta.getBoundingClientRect();
              // Prefer textareas over inputs for title
              const bonus = ta.tagName === 'TEXTAREA' ? 100 : 0;
              if ((r.width + bonus) > (bestW + (bestTA?.tagName === 'TEXTAREA' ? 100 : 0)) && r.width > 100 && r.height > 15) {
                bestW = r.width; bestTA = ta;
              }
            }
            if (bestTA) { titleEl = bestTA; console.log('[Matrixty DIRECT_FILL v1.2.2] Title via largest deep editable:', bestTA.tagName, `${Math.round(bestW)}px`); }
          }

          if (titleEl) {
            // v9.1: Step 1: Focus + click
            titleEl.focus();
            reactClick(titleEl);
            await delay(60, 180);

            // v9.1: Step 2: FORCE clear existing text before inserting new
            if (titleEl.tagName === 'INPUT' || titleEl.tagName === 'TEXTAREA') {
              titleEl.select();
              await delay(20, 60);
              document.execCommand('selectAll');
              document.execCommand('delete');
              await delay(20, 60);

              // If still not empty, use nativeSetter to force clear
              if (titleEl.value && titleEl.value.length > 0) {
                console.log('[Matrixty DIRECT_FILL v9.1] execCommand delete did not clear title, using setNativeValue');
                setNativeValue(titleEl, '');
                await delay(30, 80);
              }

              // Last resort: setSelectionRange + delete
              if (titleEl.value && titleEl.value.length > 0) {
                titleEl.setSelectionRange(0, titleEl.value.length);
                document.execCommand('delete');
                await delay(20, 60);
              }

              console.log(`[Matrixty DIRECT_FILL v9.1] After clear: value="${(titleEl.value || '').substring(0, 20)}" (len=${(titleEl.value || '').length})`);
            }
            await delay(30, 80);

            // Step 3: Use execCommand to insert new text (React-compatible!)
            document.execCommand('insertText', false, title);
            await delay(60, 180);

            // Step 4: Deselect text — move cursor to end, blur, then click outside
            titleEl.dispatchEvent(new Event('input', { bubbles: true }));
            titleEl.dispatchEvent(new Event('change', { bubbles: true }));
            await delay(30, 80);

            // 4a: Collapse selection to end
            if (titleEl.setSelectionRange) {
              try { titleEl.setSelectionRange(titleEl.value.length, titleEl.value.length); } catch(e) {}
            }
            window.getSelection()?.removeAllRanges();

            // 4b: Blur to remove focus
            titleEl.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
            titleEl.dispatchEvent(new FocusEvent('blur', { bubbles: false }));
            titleEl.blur();
            await delay(30, 80);

            // 4c: Click on document body to truly move focus away from the input
            // Amazon Seller Central re-selects text on certain internal React events
            const clickAway = new MouseEvent('click', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 });
            document.body.dispatchEvent(clickAway);
            await delay(30, 80);

            // 4d: Final deselection safety net
            if (titleEl.setSelectionRange) {
              try { titleEl.setSelectionRange(titleEl.value.length, titleEl.value.length); } catch(e) {}
            }
            window.getSelection()?.removeAllRanges();
            if (document.activeElement === titleEl) {
              titleEl.blur();
            }
            await delay(30, 80);

            // Step 5: Verify
            const actualValue = titleEl.value || titleEl.textContent || '';
            if (actualValue === title) {
              filled.push('title');
              console.log('[Matrixty DIRECT_FILL v9.1] Title filled + verified OK');
            } else {
              // Fallback: force clear + setNativeValue
              console.warn('[Matrixty DIRECT_FILL v9.1] execCommand failed for title, trying full clear + setNativeValue...');
              titleEl.select();
              document.execCommand('selectAll');
              document.execCommand('delete');
              await delay(30, 80);
              setNativeValue(titleEl, title);
              titleEl.dispatchEvent(new Event('input', { bubbles: true }));
              titleEl.dispatchEvent(new Event('change', { bubbles: true }));
              await delay(30, 80);

              // Deselect fallback path
              if (titleEl.setSelectionRange) {
                try { titleEl.setSelectionRange(titleEl.value.length, titleEl.value.length); } catch(e) {}
              }
              window.getSelection()?.removeAllRanges();
              titleEl.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
              titleEl.dispatchEvent(new FocusEvent('blur', { bubbles: false }));
              titleEl.blur();
              document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }));
              await delay(30, 80);
              if (document.activeElement === titleEl) titleEl.blur();
              window.getSelection()?.removeAllRanges();

              filled.push('title');
              console.log('[Matrixty DIRECT_FILL v9.1] Title filled (fallback):', titleEl.value?.substring(0, 30));
            }
          } else {
            // ═══ v10.1: NUCLEAR DEBUG + FALLBACK — walk DOM from "Item Name" label ═══
            console.error('[Matrixty DIRECT_FILL v10.1] Title NOT FOUND by all standard methods. Trying DOM walk...');

            // Strategy A: Find "Item Name" text on page → walk to nearest editable sibling/child
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ALL);
            let itemNameParent = null;
            while (walker.nextNode()) {
              const node = walker.currentNode;
              if (node.nodeType === 3) { // TEXT NODE
                const txt = node.textContent.trim();
                if (txt === 'Item Name' || txt === '* Item Name' || txt === 'Product Title') {
                  itemNameParent = node.parentElement;
                  console.log('[Matrixty DIRECT_FILL v10.1] Found label text "' + txt + '" in:', itemNameParent?.tagName, itemNameParent?.className?.substring(0, 60));
                  break;
                }
              }
            }

            if (itemNameParent) {
              // Walk UP to find a container, then look for ANY large visible element
              let container = itemNameParent;
              for (let depth = 0; depth < 12 && container; depth++) {
                const children = container.querySelectorAll('*');
                for (const child of children) {
                  const r = child.getBoundingClientRect();
                  if (r.width < 150 || r.height < 20) continue;
                  const isEditable = child.tagName === 'TEXTAREA' || child.tagName === 'INPUT' ||
                    child.contentEditable === 'true' || child.getAttribute('role') === 'textbox' ||
                    child.isContentEditable;
                  const hasValue = child.value || (child.textContent && child.textContent.length > 10);
                  if (isEditable || (hasValue && r.height > 30 && child.tagName !== 'DIV' && child.tagName !== 'SPAN')) {
                    console.log('[Matrixty DIRECT_FILL v10.1] ✅ FOUND editable near "Item Name" at depth ' + depth + ':',
                      child.tagName, 'class=' + (child.className || '').substring(0, 50),
                      'name=' + child.name, 'id=' + child.id,
                      'contentEditable=' + child.contentEditable,
                      'isContentEditable=' + child.isContentEditable,
                      `${Math.round(r.width)}x${Math.round(r.height)}`,
                      'value=' + (child.value || child.textContent || '').substring(0, 40));
                    titleEl = child;
                    break;
                  }
                }
                if (titleEl) break;

                // Log what we see at this depth
                if (depth <= 3) {
                  const largekids = Array.from(container.children).filter(c => {
                    const cr = c.getBoundingClientRect();
                    return cr.width > 50 && cr.height > 10;
                  }).map(c => ({
                    tag: c.tagName, class: (c.className || '').substring(0, 40), id: c.id || '',
                    ce: c.contentEditable, w: Math.round(c.getBoundingClientRect().width),
                    h: Math.round(c.getBoundingClientRect().height),
                  }));
                  console.log('[Matrixty DIRECT_FILL v10.1] Depth ' + depth + ' container:', container.tagName,
                    (container.className || '').substring(0, 40), '— visible children:', largekids);
                }

                container = container.parentElement;
              }
            }

            // Strategy B: Find ANY element containing the visible title text
            if (!titleEl && title) {
              const titleSnippet = title.substring(0, 30);
              const allElements = document.querySelectorAll('*');
              for (const el of allElements) {
                if (el.children.length > 3) continue; // Skip containers
                const val = el.value || '';
                const txt = el.textContent || '';
                if ((val && val.includes(titleSnippet)) || (txt.length < 500 && txt.includes(titleSnippet))) {
                  const r = el.getBoundingClientRect();
                  if (r.width > 100 && r.height > 20) {
                    console.log('[Matrixty DIRECT_FILL v10.1] ✅ Found element containing title text:',
                      el.tagName, 'class=' + (el.className || '').substring(0, 50),
                      'contentEditable=' + el.contentEditable,
                      `${Math.round(r.width)}x${Math.round(r.height)}`);
                    titleEl = el;
                    break;
                  }
                }
              }
            }

            if (!titleEl) {
              // Dump comprehensive debug
              const debugAll = document.querySelectorAll('textarea, input, [contenteditable], [role="textbox"]');
              const debugVisible = [];
              for (const el of debugAll) {
                const r = el.getBoundingClientRect();
                debugVisible.push({
                  tag: el.tagName, type: el.type || '', name: el.name || '', id: el.id || '',
                  ce: el.getAttribute('contenteditable'), isContentEditable: el.isContentEditable,
                  w: Math.round(r.width), h: Math.round(r.height),
                  val: (el.value || el.textContent || '').substring(0, 30),
                });
                if (debugVisible.length >= 30) break;
              }
              console.error('[Matrixty DIRECT_FILL v10.1] ❌ STILL NOT FOUND. All editable elements (incl hidden):', debugVisible);
            }
          }
        }

        // v1.2.7: Random delay giữa title → tags (giống người thật)
        if (filled.includes('title')) await delay(800, 2500);

        // ======= FILL TAGS (clear old → add new) =======
        if (tags && tags.length > 0 && platform === 'etsy') {
          const TAG_SELS = [
            '#listing-tags-input',                      // v7.0.4: Etsy input#listing-tags-input
            'div[data-testid="tags-input"]', 'input[name="tags"]',
            'input[placeholder*="tag" i]',
            'input[placeholder*="Shape, color" i]',     // v7.0.5: Etsy actual placeholder
            'input[placeholder*="shape, color" i]',
            '#listing-edit-tags input', 'input[aria-label*="tag" i]',
            // v1.2.3: New Etsy listing-editor
            'input[id*="tag" i]', 'input[data-testid*="tag" i]',
            'input[placeholder*="Add a tag" i]',
          ];
          let tagContainer = null;
          let tagInput = null;
          for (const sel of TAG_SELS) {
            const el = document.querySelector(sel);
            if (el) {
              if (el.tagName === 'INPUT') { tagInput = el; tagContainer = el.closest('div'); }
              else { tagContainer = el; tagInput = el.querySelector('input') || el; }
              console.log(`[Matrixty DIRECT_FILL] Tag input found via selector "${sel}":`, tagInput?.tagName);
              break;
            }
          }
          if (!tagInput) {
            const found = findInputNearLabel('Tags') || findInputNearLabel('Tag');
            if (found) { tagInput = found; tagContainer = found.closest('div'); }
          }
          if (!tagInput) {
            // Strategy 1: containers with chip-class elements + input
            for (const c of document.querySelectorAll('div, ul')) {
              const chips = c.querySelectorAll('[class*="tag" i], [class*="chip" i], [class*="token" i]');
              const inp = c.querySelector('input');
              if (chips.length >= 1 && inp && c.getBoundingClientRect().width > 100) {
                tagInput = inp; tagContainer = c; break;
              }
            }
          }
          if (!tagInput) {
            // Strategy 2: containers with many × remove buttons + input
            for (const c of document.querySelectorAll('div, ul')) {
              const inp = c.querySelector('input');
              if (!inp) continue;
              const xBtns = Array.from(c.querySelectorAll('button, [role="button"]')).filter(b => {
                const txt = (b.textContent || '').trim();
                const r = b.getBoundingClientRect();
                return r.width > 0 && r.width < 50 && (txt === '×' || txt === '✕' || txt === '' || b.querySelector('svg') || (b.getAttribute('aria-label') || '').toLowerCase().includes('remove'));
              });
              if (xBtns.length >= 2) {
                tagInput = inp; tagContainer = c;
                console.log(`[Matrixty DIRECT_FILL] Found tag input via × buttons count: ${xBtns.length}`);
                break;
              }
            }
          }
          if (!tagInput) {
            // Strategy 3: Etsy specific placeholder
            const etsyInput = document.querySelector('input[placeholder*="Shape" i]') ||
                              document.querySelector('input[placeholder*="function, etc" i]');
            if (etsyInput) {
              tagInput = etsyInput;
              tagContainer = etsyInput.closest('div');
              console.log(`[Matrixty DIRECT_FILL] Found tag input via Etsy placeholder:`, etsyInput.placeholder);
            }
          }

          if (tagInput) {
            // ═══ Find Tags section by heading to properly scope (avoid Materials) ═══
            function findTagsSectionByHeadingDF() {
              const allHeadings = document.querySelectorAll('h1, h2, h3, h4, h5, label, legend, p, span, div');
              for (const h of allHeadings) {
                const txt = (h.textContent || '').trim();
                if (!/^Tags\s*\*?$/.test(txt)) continue;
                const parent = h.parentElement;
                if (!parent) continue;
                const parentText = parent.textContent || '';
                if (parentText.includes('13 tags') || parentText.includes('tag') || parentText.includes('Shape, color')) {
                  let section = parent;
                  for (let d = 0; d < 6 && section; d++) {
                    const hasInput = section.querySelector('input[type="text"], input:not([type])');
                    if (hasInput && section.children.length >= 2) return section;
                    section = section.parentElement;
                  }
                }
              }
              return null;
            }

            // ═══ Find "Add" button near tag input ═══
            function findAddButtonDF(inp) {
              let parent = inp.parentElement;
              for (let d = 0; d < 5 && parent; d++) {
                const candidates = parent.querySelectorAll('button, [role="button"], span, div');
                for (const el of candidates) {
                  const txt = (el.textContent || '').trim();
                  if (txt === 'Add' && el !== inp) {
                    const rect = el.getBoundingClientRect();
                    if (rect.width > 10 && rect.width < 200 && rect.height > 10) return el;
                  }
                }
                parent = parent.parentElement;
              }
              let sibling = inp.nextElementSibling;
              while (sibling) {
                if ((sibling.textContent || '').trim() === 'Add') return sibling;
                sibling = sibling.nextElementSibling;
              }
              return null;
            }

            const tagsSectionDF = findTagsSectionByHeadingDF();
            let tagArea = tagsSectionDF || tagContainer || tagInput.parentElement;
            if (tagArea === tagInput || (tagArea && tagArea.children.length < 2)) {
              let p = tagArea?.parentElement;
              for (let d = 0; d < 8 && p; d++) {
                if (p.children.length >= 2) { tagArea = p; break; }
                p = p.parentElement;
              }
            }
            console.log('[Matrixty DIRECT_FILL] Tag area:', tagArea?.tagName, tagArea?.className?.substring?.(0, 60));

            const addBtn = findAddButtonDF(tagInput);
            console.log('[Matrixty DIRECT_FILL] Add button:', addBtn ? addBtn.textContent.trim() : 'NOT FOUND');

            // ═══ Step 1: Clear existing tags ═══
            // Only clear × buttons within Tags section (not Materials)
            function findRemoveBtnsInScope(scope) {
              return Array.from(scope.querySelectorAll('button, [role="button"], span[role="img"]')).filter(b => {
                const r = b.getBoundingClientRect();
                if (r.width <= 0 || r.height <= 0 || r.width > 40 || r.height > 40) return false;
                const txt = (b.textContent || '').trim();
                const hasSvg = b.querySelector('svg') !== null;
                const ariaL = (b.getAttribute('aria-label') || '').toLowerCase();
                return txt === '×' || txt === '✕' || txt === '' || hasSvg || ariaL.includes('remove') || ariaL.includes('delete');
              });
            }

            let xBtns = findRemoveBtnsInScope(tagArea);
            if (xBtns.length > 0) {
              console.log(`[Matrixty DIRECT_FILL] Clearing ${xBtns.length} tags via × buttons`);
              for (let iter = 0; iter < xBtns.length + 5; iter++) {
                const fresh = findRemoveBtnsInScope(tagArea);
                if (fresh.length === 0) break;
                const xBtn = fresh[fresh.length - 1];
                xBtn.click(); // Native trusted click
                reactClick(xBtn); // React-compatible event sequence
                await delay(200, 500);
              }
              await delay(300, 700);
              // Verification pass
              const remaining = findRemoveBtnsInScope(tagArea);
              if (remaining.length > 0) {
                console.log(`[Matrixty DIRECT_FILL] Verification: ${remaining.length} still remaining`);
                for (let i = 0; i < remaining.length + 3; i++) {
                  const fresh = findRemoveBtnsInScope(tagArea);
                  if (fresh.length === 0) break;
                  const xBtn2 = fresh[fresh.length - 1];
                  xBtn2.click();
                  reactClick(xBtn2);
                  await delay(200, 500);
                }
              }
            }

            await delay(300, 700);

            // ═══ v1.2.1: PER-TAG APPROACH — type each tag + comma/Enter ═══
            // Previous approach: paste comma string + click Add → FAILED
            // New: type each tag → press comma → Etsy converts to chip
            const validTags = tags.map(t => t.trim()).filter(Boolean).slice(0, 13);
            console.log(`[Matrixty DIRECT_FILL v1.2.1] Inserting ${validTags.length} tags one-by-one`);
            const delay = (min, max) => new Promise(r => setTimeout(r, max ? Math.round(min + Math.random() * (max - min)) : min));

            // Count chips helper
            function countChips() {
              const chips = tagArea.querySelectorAll('div, span, li');
              let cnt = 0;
              for (const c of chips) {
                const r = c.getBoundingClientRect();
                if (r.width < 50 || r.width > 350 || r.height < 18 || r.height > 50) continue;
                const t = (c.textContent || '').trim();
                if (t.length < 2 || t.length > 60) continue;
                if (t.includes('×') || t.includes('✕') || c.querySelector('svg, button, [role="button"]')) cnt++;
              }
              return cnt;
            }

            const chipsBefore = countChips();
            let tagsAdded = 0;

            // v1.2.5: SIMPLE — paste all tags as comma string + click Add
            const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
            const tagStr = validTags.join(', ');

            console.log(`[Matrixty DIRECT_FILL v1.2.5] Pasting comma string: "${tagStr.substring(0, 60)}..."`);

            // Focus + clear
            tagInput.focus();
            tagInput.click();
            await delay(60, 150);
            let tracker = tagInput._valueTracker;
            if (tracker) tracker.setValue(tagInput.value || '');
            if (nativeSetter) nativeSetter.call(tagInput, '');
            else tagInput.value = '';
            tagInput.dispatchEvent(new Event('input', { bubbles: true }));
            await delay(30, 100);

            // Set comma-separated tags
            tracker = tagInput._valueTracker;
            if (tracker) tracker.setValue('');
            if (nativeSetter) nativeSetter.call(tagInput, tagStr);
            else tagInput.value = tagStr;
            tagInput.dispatchEvent(new InputEvent('input', {
              bubbles: true, data: tagStr, inputType: 'insertText'
            }));
            tagInput.dispatchEvent(new Event('change', { bubbles: true }));
            await delay(150, 400);

            console.log(`[Matrixty DIRECT_FILL v1.2.5] Value set: "${tagInput.value.substring(0, 40)}"`);

            // Click Add button
            if (addBtn) {
              console.log('[Matrixty DIRECT_FILL v1.2.5] Clicking Add button');
              addBtn.click();
              reactClick(addBtn);
              // React fiber onClick
              try {
                const pk = Object.keys(addBtn).find(k => k.startsWith('__reactProps$'));
                if (pk && addBtn[pk]?.onClick) addBtn[pk].onClick(new MouseEvent('click', { bubbles: true }));
              } catch(e) {}
              await delay(350, 800);
            }

            // Also press Enter as backup
            const enterOpts = { key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true, cancelable: true };
            tagInput.dispatchEvent(new KeyboardEvent('keydown', enterOpts));
            tagInput.dispatchEvent(new KeyboardEvent('keypress', enterOpts));
            tagInput.dispatchEvent(new KeyboardEvent('keyup', enterOpts));
            await delay(200, 500);

            // Check result
            const chipsAfter = countChips();
            tagsAdded = Math.max(chipsAfter - chipsBefore, 0);
            console.log(`[Matrixty DIRECT_FILL v1.2.5] Chips: before=${chipsBefore}, after=${chipsAfter}, added=${tagsAdded}`);

            // Clear input
            tagInput.focus();
            tagInput.select();
            document.execCommand('selectAll');
            document.execCommand('delete');
            await delay(30, 80);
            tagInput.blur();

            const finalChips = countChips();
            console.log(`[Matrixty DIRECT_FILL v1.2.1] Tags: ${tagsAdded} added, ${finalChips} chips total`);
            if (finalChips > chipsBefore || tagsAdded > 0) {
              filled.push('tags');
            } else {
              console.warn('[Matrixty DIRECT_FILL v1.2.1] NO tags added as chips');
            }
          } else {
            console.error('[Matrixty DIRECT_FILL] Tag input NOT FOUND');
          }
        }

        // v1.2.7: Random delay giữa tags → SKU (giống người thật)
        if (filled.includes('tags') || filled.includes('search_terms')) await delay(1000, 3000);

        // ═══ v9.3: SKU FILL (Etsy) ═══
        if (sku && platform === 'etsy') {
          console.log(`[Matrixty DIRECT_FILL] Starting SKU fill: "${sku}"`);

          // v1.2.5: Helper to check if input is a tag/title field (NOT SKU)
          const isTagOrOtherField = (inp) => {
            const ph = (inp.placeholder || '').toLowerCase();
            const nm = (inp.name || '').toLowerCase();
            const id = (inp.id || '').toLowerCase();
            const al = (inp.getAttribute('aria-label') || '').toLowerCase();
            if (ph.includes('shape') || ph.includes('tag') || ph.includes('color') || ph.includes('function')) return true;
            if (nm.includes('tag') || id.includes('tag') || al.includes('tag')) return true;
            if (nm.includes('title') || id.includes('title') || al.includes('title')) return true;
            if (inp.closest('#mtx-listing-panel') || inp.closest('[id^="mtx-"]')) return true;
            const sec = inp.closest('div, section');
            if (sec) {
              const st = sec.textContent || '';
              if (st.includes('13 tags') || st.includes('Add up to 13') || /\d+\s*left/.test(st)) return true;
            }
            return false;
          };

          // Helper: find SKU input
          const findSkuInput = () => {
            // Try specific selectors (these are very targeted, unlikely to be wrong)
            const skuSelectors = [
              'input[name="sku"]', 'input[name*="sku" i]',
              'input[aria-label*="SKU" i]', 'input[placeholder*="SKU" i]',
              'input[data-testid*="sku" i]', '#listing-sku-input', '#sku-input',
            ];
            for (const sel of skuSelectors) {
              const el = document.querySelector(sel);
              if (el && el.getBoundingClientRect().width > 0 && !isTagOrOtherField(el)) return el;
            }
            // Brute force: find input near SKU label text
            const allLabels = document.querySelectorAll('label, h2, h3, h4, legend, [class*="label"], [class*="Label"]');
            for (const lbl of allLabels) {
              const txt = (lbl.textContent || '').trim().toLowerCase();
              if (!txt.includes('sku')) continue;
              // Skip labels inside Matrixty sidebar
              if (lbl.closest('#mtx-listing-panel') || lbl.closest('[id^="mtx-"]')) continue;
              const container = lbl.closest('div, section, fieldset, li');
              if (!container) continue;
              const inp = container.querySelector('input[type="text"], input:not([type])');
              if (inp && inp.getBoundingClientRect().width > 50 && !isTagOrOtherField(inp)) return inp;
            }
            // Brute force: find input in a container that mentions "SKU"
            // CRITICAL: Exclude tag inputs and Matrixty sidebar
            const allInputs = document.querySelectorAll('input[type="text"], input:not([type])');
            for (const inp of allInputs) {
              if (isTagOrOtherField(inp)) continue;
              const parent = inp.closest('div, section, li');
              if (!parent || parent.closest('#mtx-listing-panel') || parent.closest('[id^="mtx-"]')) continue;
              const pText = parent.textContent || '';
              if (pText.length < 100 && pText.toLowerCase().includes('sku')) {
                // Extra: skip if parent also contains tag-related text
                if (pText.includes('13 tags') || pText.includes('Add up to 13') || /\d+\s*left/.test(pText)) continue;
                if (inp.getBoundingClientRect().width > 30) return inp;
              }
            }
            return null;
          };

          // Helper: click "+ Add SKU" button
          // CRITICAL: Prefer <BUTTON> over <DIV> — DIV may be a container with extra text like "Add SKUSKU0/32"
          const clickAddSku = () => {
            // Strategy 1: Find actual <button> with "Add SKU" text (most reliable)
            const buttons = document.querySelectorAll('button');
            for (const btn of buttons) {
              const text = (btn.textContent || '').trim().toLowerCase();
              if (text === 'add sku' || text === '+ add sku' || text === '\u002b add sku') {
                const rect = btn.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                  console.log(`[Matrixty DIRECT_FILL] Clicking BUTTON "Add SKU"`);
                  btn.click();
                  reactClick(btn);
                  return true;
                }
              }
            }

            // Strategy 2: Find button/a containing "Add SKU" (short text only, <15 chars to avoid containers)
            const clickable = document.querySelectorAll('button, a, [role="button"]');
            for (const el of clickable) {
              const text = (el.textContent || '').trim();
              if (text.length < 15 && text.toLowerCase().includes('add sku')) {
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                  console.log(`[Matrixty DIRECT_FILL] Clicking <${el.tagName}> "${text}"`);
                  el.click();
                  reactClick(el);
                  return true;
                }
              }
            }

            // Strategy 3: Find the SMALLEST element containing "add sku" text (most specific = actual button)
            const allEl = document.querySelectorAll('button, [role="button"], a, span, div, label');
            let bestEl = null;
            let bestLen = Infinity;
            for (const el of allEl) {
              const text = (el.textContent || '').trim();
              if (text.toLowerCase().includes('add sku') && text.length < bestLen) {
                const rect = el.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                  bestLen = text.length;
                  bestEl = el;
                }
              }
            }
            if (bestEl && bestLen < 20) {
              console.log(`[Matrixty DIRECT_FILL] Clicking smallest match: <${bestEl.tagName}> "${bestEl.textContent.trim()}" (len=${bestLen})`);
              bestEl.click();
              reactClick(bestEl);
              return true;
            }

            return false;
          };

          // Helper: navigate to tab by text
          const clickTab = (tabText) => {
            const allTabs = document.querySelectorAll('a, button, [role="tab"]');
            for (const tab of allTabs) {
              const text = (tab.textContent || '').trim().toLowerCase();
              if (text.includes(tabText)) {
                const rect = tab.getBoundingClientRect();
                if (rect.width > 0) {
                  console.log(`[Matrixty DIRECT_FILL] Clicking tab: "${tab.textContent.trim()}"`);
                  tab.click();
                  reactClick(tab);
                  return true;
                }
              }
            }
            return false;
          };

          const delay = (min, max) => new Promise(r => setTimeout(r, max ? Math.round(min + Math.random() * (max - min)) : min));
          let skuInput = null;

          // Step 1: Try on current view
          skuInput = findSkuInput();
          if (!skuInput) {
            // Step 2: Click "+ Add SKU" on current view
            if (clickAddSku()) {
              await delay(800, 1500);
              skuInput = findSkuInput();
            }
          }

          // Step 3: Navigate to Price & Inventory tab
          if (!skuInput) {
            console.log('[Matrixty DIRECT_FILL] Navigating to Price & Inventory tab...');
            let navigated = clickTab('price');
            if (!navigated) {
              // Try direct URL hash
              const base = window.location.href.split('#')[0];
              window.location.href = base + '#price-inventory';
              navigated = true;
            }
            if (navigated) {
              await delay(1200, 2200);

              skuInput = findSkuInput();
              if (!skuInput) {
                // Click "+ Add SKU" on this tab
                console.log('[Matrixty DIRECT_FILL] Looking for Add SKU button...');
                const allVisible = document.querySelectorAll('button, [role="button"], a, span, div');
                const btnTexts = Array.from(allVisible)
                  .filter(b => b.getBoundingClientRect().width > 0)
                  .map(b => `<${b.tagName}> "${b.textContent.trim().substring(0, 40)}"`)
                  .filter(t => t.toLowerCase().includes('sku'))
                  .slice(0, 10);
                console.log('[Matrixty DIRECT_FILL] SKU-related elements:', btnTexts);

                if (clickAddSku()) {
                  await delay(900, 1800);
                  skuInput = findSkuInput();
                }
              }

              // No scrolling — avoid moving the viewport to not disrupt user
            }
          }

          // Step 4: Fill SKU
          if (skuInput) {
            console.log(`[Matrixty DIRECT_FILL] Found SKU input: <${skuInput.tagName}> name="${skuInput.name}" id="${skuInput.id}"`);
            skuInput.focus();
            reactClick(skuInput);
            await delay(120, 350);

            // Clear existing value
            skuInput.select();
            document.execCommand('selectAll');
            document.execCommand('delete');
            await delay(60, 180);

            // Set value
            setNativeValue(skuInput, sku);
            await delay(120, 350);

            // Verify
            if (skuInput.value === sku) {
              console.log(`[Matrixty DIRECT_FILL] ✅ SKU filled: "${sku}"`);
              filled.push('sku');
            } else {
              // Try execCommand
              skuInput.focus();
              skuInput.select();
              document.execCommand('selectAll');
              document.execCommand('delete');
              document.execCommand('insertText', false, sku);
              await delay(120, 350);
              if (skuInput.value === sku) {
                console.log(`[Matrixty DIRECT_FILL] ✅ SKU filled via execCommand: "${sku}"`);
                filled.push('sku');
              } else {
                console.warn(`[Matrixty DIRECT_FILL] SKU fill FAILED: expected "${sku}", got "${skuInput.value}"`);
              }
            }

            // Stay on Price & Inventory tab — navigating back triggers "Discard changes?" dialog
          } else {
            console.error('[Matrixty DIRECT_FILL] SKU input NOT FOUND after all attempts');
          }
        }

        // ═══ v9.4: SKU FILL (Amazon) — Navigate to Offer tab ═══
        if (sku && platform === 'amazon') {
          console.log(`[Matrixty DIRECT_FILL] Starting Amazon SKU fill: "${sku}"`);

          const findAmzSkuInput = () => {
            const selectors = [
              'input[name*="sku" i]', 'input[name*="merchant_sku" i]',
              'input[aria-label*="SKU" i]', 'input[aria-label*="Seller SKU" i]',
              'input[placeholder*="ABC123" i]', 'input[placeholder*="SKU" i]',
              'input[id*="sku" i]', 'input[data-testid*="sku" i]',
            ];
            for (const sel of selectors) {
              const el = document.querySelector(sel);
              if (el && el.getBoundingClientRect().width > 0) return el;
            }
            // Brute force: label proximity
            const labels = document.querySelectorAll('label, span, div, h2, h3, h4, legend');
            for (const lbl of labels) {
              const txt = (lbl.textContent || '').trim();
              if (txt.length > 50) continue;
              if (!/\bsku\b/i.test(txt) && !/\bseller sku\b/i.test(txt)) continue;
              const container = lbl.closest('div, section, fieldset, tr, li');
              if (!container) continue;
              const inp = container.querySelector('input[type="text"], input:not([type])');
              if (inp && inp.getBoundingClientRect().width > 30) return inp;
            }
            return null;
          };

          const clickAmzTab = (tabText) => {
            const tabs = document.querySelectorAll('a, button, [role="tab"], [class*="tab" i], li[class*="nav" i]');
            for (const tab of tabs) {
              const text = (tab.textContent || '').trim().toLowerCase();
              if (text === tabText.toLowerCase() || (text.length < 30 && text.includes(tabText.toLowerCase()))) {
                const rect = tab.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                  console.log(`[Matrixty DIRECT_FILL] Clicking Amazon tab: "${tab.textContent.trim()}"`);
                  tab.click();
                  reactClick(tab);
                  return true;
                }
              }
            }
            return false;
          };

          let skuInput = findAmzSkuInput();

          // v1.2.3: DO NOT click tabs — just skip SKU if not visible
          // Clicking Offer tab can change page layout and hide other fields
          if (!skuInput) {
            console.log('[Matrixty DIRECT_FILL v1.2.3] SKU not on current view — skipping (user can use Copy SKU button)');
          }

          if (skuInput) {
            console.log(`[Matrixty DIRECT_FILL] Found Amazon SKU input: <${skuInput.tagName}> name="${skuInput.name}" id="${skuInput.id}" placeholder="${skuInput.placeholder}"`);

            // React-compatible fill: focus → clear → insertText → dispatch full event chain
            const reactFill = async (input, value) => {
              // Focus and click like a real user
              input.focus();
              input.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
              input.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
              input.dispatchEvent(new MouseEvent('click', { bubbles: true }));
              input.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
              input.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
              await delay(100, 300);

              // Clear: select all + delete
              input.select();
              input.setSelectionRange(0, input.value.length);
              document.execCommand('selectAll');
              document.execCommand('delete');
              await delay(60, 180);

              // Force clear via native setter if needed
              if (input.value) {
                const proto = Object.getPrototypeOf(input);
                const desc = Object.getOwnPropertyDescriptor(proto, 'value') ||
                             Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
                if (desc && desc.set) {
                  desc.set.call(input, '');
                  input.dispatchEvent(new Event('input', { bubbles: true }));
                  input.dispatchEvent(new Event('change', { bubbles: true }));
                }
              }
              await delay(60, 180);

              // Method 1: execCommand insertText (best for React)
              input.focus();
              const inserted = document.execCommand('insertText', false, value);
              await delay(120, 350);

              if (input.value === value) {
                console.log(`[Matrixty DIRECT_FILL] ✅ Amazon SKU filled via insertText: "${value}"`);
                return true;
              }

              // Method 2: set native value + dispatch React-compatible events
              const nativeDesc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
              if (nativeDesc && nativeDesc.set) {
                nativeDesc.set.call(input, value);
              } else {
                input.value = value;
              }
              // Dispatch full event chain for React
              input.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
              input.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
              // React 16/17 synthetic event trigger
              const nativeInputEvent = new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertText', data: value });
              input.dispatchEvent(nativeInputEvent);
              await delay(150, 350);

              if (input.value === value) {
                console.log(`[Matrixty DIRECT_FILL] ✅ Amazon SKU filled via nativeSetter: "${value}"`);
                return true;
              }

              // Method 3: simulate typing char by char
              input.focus();
              input.value = '';
              input.dispatchEvent(new Event('input', { bubbles: true }));
              for (const ch of value) {
                input.dispatchEvent(new KeyboardEvent('keydown', { key: ch, code: `Key${ch.toUpperCase()}`, bubbles: true }));
                input.dispatchEvent(new KeyboardEvent('keypress', { key: ch, code: `Key${ch.toUpperCase()}`, bubbles: true }));
                const prevVal = input.value;
                document.execCommand('insertText', false, ch);
                if (input.value === prevVal) {
                  // execCommand didn't work, set manually
                  if (nativeDesc && nativeDesc.set) nativeDesc.set.call(input, prevVal + ch);
                  else input.value = prevVal + ch;
                  input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: ch }));
                }
                input.dispatchEvent(new KeyboardEvent('keyup', { key: ch, code: `Key${ch.toUpperCase()}`, bubbles: true }));
              }
              await delay(150, 350);

              if (input.value === value) {
                console.log(`[Matrixty DIRECT_FILL] ✅ Amazon SKU filled via char-by-char: "${value}"`);
                return true;
              }

              console.warn(`[Matrixty DIRECT_FILL] Amazon SKU fill attempts done: expected "${value}", got "${input.value}"`);
              return input.value === value;
            };

            const ok = await reactFill(skuInput, sku);
            if (ok) filled.push('sku');

            // Blur to commit value
            skuInput.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
            skuInput.dispatchEvent(new FocusEvent('blur', { bubbles: true }));

            // Stay on Offer tab — don't navigate back
          } else {
            console.error('[Matrixty DIRECT_FILL] Amazon SKU input NOT FOUND after all attempts');
          }
        }

        // v1.2.7: Random delay giữa SKU → search terms (Amazon)
        if (filled.includes('sku')) await delay(800, 2000);

        // ═══ v1.2.2: AMAZON SEARCH TERMS FILL ═══
        if (tags && tags.length > 0 && platform === 'amazon') {
          console.log(`[Matrixty DIRECT_FILL v1.2.2] Starting Amazon Search Terms fill: ${tags.length} tags`);
          const delay = (min, max) => new Promise(r => setTimeout(r, max ? Math.round(min + Math.random() * (max - min)) : min));

          // Convert tags array to semicolon-separated string (Amazon format)
          const searchTermsText = tags.join('; ');

          // Find search terms field
          const findSearchTermsInput = () => {
            // Strategy 1: Direct selectors
            const selectors = [
              'textarea[name*="generic_keyword" i]', 'textarea[name*="search_terms" i]',
              'input[name*="generic_keyword" i]', 'input[name*="search_terms" i]',
              'textarea[aria-label*="Search Terms" i]', 'textarea[aria-label*="Generic Keywords" i]',
              'input[aria-label*="Search Terms" i]', 'input[aria-label*="Generic Keywords" i]',
              'textarea[id*="generic_keyword" i]', 'input[id*="generic_keyword" i]',
              'textarea[id*="search_term" i]', 'input[id*="search_term" i]',
            ];
            for (const sel of selectors) {
              const els = document.querySelectorAll(sel);
              for (const el of els) {
                const r = el.getBoundingClientRect();
                if (r.width > 50 && r.height > 5) {
                  console.log(`[Matrixty DIRECT_FILL v1.2.2] Search Terms found via selector "${sel}": ${el.tagName} ${Math.round(r.width)}x${Math.round(r.height)}`);
                  return el;
                }
              }
            }
            // Strategy 2: Label-based search
            const found = findInputNearLabel('Search Terms') || findInputNearLabel('Generic Keywords');
            if (found) {
              console.log(`[Matrixty DIRECT_FILL v1.2.2] Search Terms found via label`);
              return found;
            }
            // Strategy 3: Shadow DOM deep search (Amazon Katal)
            const deepFound = findEditableNearLabelDeep('Search Terms') || findEditableNearLabelDeep('Generic Keywords');
            if (deepFound) {
              console.log(`[Matrixty DIRECT_FILL v1.2.2] Search Terms found via shadow DOM deep search`);
              return deepFound;
            }
            // Strategy 4: Find ALL deep textareas near bottom of page (Search Terms is usually below title)
            const allDeep = findAllEditablesDeep(document.body);
            for (const el of allDeep) {
              if (el.tagName !== 'TEXTAREA' && el.tagName !== 'INPUT') continue;
              const name = (el.name || '').toLowerCase();
              const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
              if (name.includes('generic_keyword') || name.includes('search_term') ||
                  ariaLabel.includes('search term') || ariaLabel.includes('generic keyword')) {
                const r = el.getBoundingClientRect();
                if (r.width > 50) {
                  console.log(`[Matrixty DIRECT_FILL v1.2.2] Search Terms found via deep attribute scan: ${el.tagName} name="${el.name}" ${Math.round(r.width)}x${Math.round(r.height)}`);
                  return el;
                }
              }
            }
            return null;
          };

          let stInput = findSearchTermsInput();

          // v1.2.3: If not found, scroll down GENTLY to check if it's just below viewport
          // DO NOT click any tabs/buttons — this can switch Amazon's Attributes view
          // (e.g. clicking "Recommended" hides the Generic Keyword field)
          if (!stInput) {
            console.log('[Matrixty DIRECT_FILL v1.2.3] Search Terms not found on current view, scrolling to bottom...');
            window.scrollTo(0, document.body.scrollHeight);
            await delay(600, 1200);
            stInput = findSearchTermsInput();
          }
          // Scroll back to top if we scrolled
          if (!stInput) {
            window.scrollTo(0, 0);
            console.warn('[Matrixty DIRECT_FILL v1.2.3] Search Terms not found. User may need to select "All attributes" in left panel.');
          }

          if (stInput) {
            // Validate: make sure this is NOT the same as title element
            const isSameAsTitle = (filled.includes('title')) && stInput === document.querySelector(
              'textarea[name*="item_name" i], input[name*="item_name" i], textarea[name="title"], input[name="title"]'
            );
            if (isSameAsTitle) {
              console.warn('[Matrixty DIRECT_FILL v1.2.2] ⚠️ Search Terms input is same as title — skipping');
            } else {
              // Fill using same approach as title
              stInput.focus();
              reactClick(stInput);
              await delay(80, 220);

              // Clear existing
              if (stInput.tagName === 'INPUT' || stInput.tagName === 'TEXTAREA') {
                stInput.select();
                await delay(20, 60);
                document.execCommand('selectAll');
                document.execCommand('delete');
                await delay(20, 60);
                if (stInput.value && stInput.value.length > 0) {
                  setNativeValue(stInput, '');
                  await delay(30, 80);
                }
              }

              // Insert text
              document.execCommand('insertText', false, searchTermsText);
              await delay(80, 220);

              // Fire events
              stInput.dispatchEvent(new Event('input', { bubbles: true }));
              stInput.dispatchEvent(new Event('change', { bubbles: true }));
              await delay(30, 80);

              // Verify
              const actualVal = stInput.value || stInput.textContent || '';
              if (actualVal === searchTermsText) {
                filled.push('search_terms');
                console.log('[Matrixty DIRECT_FILL v1.2.2] ✅ Search Terms filled + verified OK');
              } else {
                // Fallback: setNativeValue
                console.warn('[Matrixty DIRECT_FILL v1.2.2] execCommand failed, trying setNativeValue...');
                stInput.select();
                document.execCommand('selectAll');
                document.execCommand('delete');
                await delay(30, 80);
                setNativeValue(stInput, searchTermsText);
                stInput.dispatchEvent(new Event('input', { bubbles: true }));
                stInput.dispatchEvent(new Event('change', { bubbles: true }));
                await delay(30, 80);
                filled.push('search_terms');
                console.log('[Matrixty DIRECT_FILL v1.2.2] Search Terms filled (fallback):', stInput.value?.substring(0, 40));
              }

              // Blur
              stInput.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
              stInput.dispatchEvent(new FocusEvent('blur', { bubbles: false }));
              stInput.blur();
              await delay(30, 80);
            }
          } else {
            console.error('[Matrixty DIRECT_FILL v1.2.2] ❌ Amazon Search Terms input NOT FOUND');
            // Log all visible textareas/inputs for debug
            const debugEls = document.querySelectorAll('textarea, input[type="text"], input:not([type])');
            const debugList = Array.from(debugEls).slice(0, 20).map(el => ({
              tag: el.tagName, name: el.name, id: el.id,
              ariaLabel: el.getAttribute('aria-label'),
              w: Math.round(el.getBoundingClientRect().width),
              h: Math.round(el.getBoundingClientRect().height),
            }));
            console.log('[Matrixty DIRECT_FILL v1.2.2] All visible inputs:', debugList);
          }
        }

        // ═══ v7.5.0: Extract ASIN from Amazon page ═══
        let extractedAsin = '';
        if (platform === 'amazon') {
          const url = window.location.href;
          // URL ?asin=B0XX
          const m1 = url.match(/[?&]asin=([A-Z0-9]{10})/i);
          if (m1) extractedAsin = m1[1].toUpperCase();
          // URL /dp/B0XX or /product/B0XX
          if (!extractedAsin) { const m2 = url.match(/\/(?:dp|product|offer-listing)\/([A-Z0-9]{10})/i); if (m2) extractedAsin = m2[1].toUpperCase(); }
          // DOM: ASIN text on page
          if (!extractedAsin) { const bt = document.body?.innerText || ''; const m3 = bt.match(/\bASIN[:\s]*([A-Z0-9]{10})\b/i); if (m3) extractedAsin = m3[1].toUpperCase(); }
          // DOM: data-asin attribute
          if (!extractedAsin) { const da = document.querySelector('[data-asin]')?.getAttribute('data-asin'); if (da && /^[A-Z0-9]{10}$/i.test(da)) extractedAsin = da.toUpperCase(); }
          // DOM: input fields with asin
          if (!extractedAsin) { for (const inp of document.querySelectorAll('input[name*="asin" i], input[id*="asin" i]')) { if (inp.value && /^[A-Z0-9]{10}$/i.test(inp.value.trim())) { extractedAsin = inp.value.trim().toUpperCase(); break; } } }
          // Seller Central: ASIN in header/breadcrumb area
          if (!extractedAsin) { for (const el of document.querySelectorAll('span, div, td, th, a')) { const t = (el.textContent || '').trim(); if (/^B0[A-Z0-9]{8}$/i.test(t)) { extractedAsin = t.toUpperCase(); break; } } }
          if (extractedAsin) console.log('[Matrixty DIRECT_FILL] Extracted ASIN:', extractedAsin);
        }

        // Show notification on page
        const n = document.createElement('div');
        n.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:' + (filled.length > 0 ? '#4A7C59' : '#E8453C') + ';color:#fff;padding:12px 24px;border-radius:8px;z-index:999999;font-size:14px;box-shadow:0 4px 12px rgba(0,0,0,0.3)';
        n.textContent = filled.length > 0 ? `Matrixty filled: ${filled.join(', ')}${extractedAsin ? ' + ASIN' : ''}` : 'No fields found to fill';
        document.body.appendChild(n);
        setTimeout(() => n.remove(), 4000);

        return { ok: filled.length > 0, filled, filledFields: filled, extractedAsin, platform };
      },
      args: [title, tags, sku, platform],
    }, (results) => {
      if (chrome.runtime.lastError) {
        console.error('[Matrixty v1.2.2 BG] DIRECT_FILL error:', chrome.runtime.lastError.message);
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
      } else {
        // v1.2.2: Main frame only — single result
        const res = results?.[0]?.result || { ok: false, filled: [], filledFields: [], platform: '' };
        if (!res.filledFields) res.filledFields = res.filled || [];
        if (!res.filled) res.filled = res.filledFields || [];
        console.log('[Matrixty v1.2.2 BG] DIRECT_FILL result:', JSON.stringify(res.filledFields), 'ok:', res.ok);
        sendResponse(res);
      }
    });
    return true;
  }

  // === Inject listing.js content script programmatically ===
  if (msg.type === 'INJECT_LISTING_SCRIPT') {
    const { tabId } = msg.payload || {};
    if (!tabId) {
      sendResponse({ ok: false, error: 'Missing tabId' });
      return;
    }

    chrome.scripting.executeScript({
      target: { tabId },
      files: ['listing.js'],
    }, (results) => {
      if (chrome.runtime.lastError) {
        console.error('[Matrixty v7.0.0 BG] Script injection error:', chrome.runtime.lastError.message);
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
      } else {
        console.log('[Matrixty v7.0.0 BG] listing.js injected successfully');
        sendResponse({ ok: true });
      }
    });
    return true;
  }

  // [v1.2 DISABLED] All MOCKUP/image handlers below — image features removed
  if (msg.type === 'FETCH_IMAGE_BLOB' || msg.type === 'GET_CURRENT_IDEA_ID' ||
      msg.type === 'SET_CURRENT_IDEA_ID' || msg.type === 'MOCKUPS_SAVED' ||
      msg.type === 'MK_SAVE' || msg.type === 'MK_GET_ALL' ||
      msg.type === 'MK_DELETE' || msg.type === 'MK_ASSIGN') {
    sendResponse({ ok: false, error: 'Image features disabled in v1.2' });
    return false;
  }

  // [v1.2 DISABLED] GEMINI + PIC + MK_CLIPBOARD — all image features removed
  if (msg.type === 'GEMINI_REMOVE_BG' || msg.type === 'MK_GET_UNASSIGNED_COUNT' ||
      msg.type === 'MK_CLIPBOARD_SAVE' || msg.type === 'MK_CLIPBOARD_GET_ALL' ||
      msg.type === 'MK_CLIPBOARD_DELETE' || msg.type === 'MK_CLIPBOARD_COUNT' ||
      msg.type === 'MK_CLIPBOARD_CLEAR_ALL') {
    sendResponse({ ok: false, error: 'Image features disabled in v1.2', count: 0, pics: [] });
    return false;
  }

  // [v1.2 DISABLED] Original GEMINI_REMOVE_BG code below — dead code
  if (false && msg.type === 'GEMINI_REMOVE_BG') {
    const { base64Data, contentType } = msg;
    if (!base64Data) {
      sendResponse({ ok: false, error: 'No image data' });
      return;
    }

    const GEMINI_API_KEY = 'AIzaSyCPCy-RLhm6tIerBV3pMLqGpJNUbXL5lvA';
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GEMINI_API_KEY}`;

    (async () => {
      try {
        const mimeType = contentType || 'image/jpeg';
        const res = await fetch(GEMINI_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: base64Data,
                  }
                },
                {
                  text: 'Remove the background from this image completely and replace it with a pure white background (#FFFFFF). Keep the main product/subject exactly as it is with all details preserved. Return only the edited image with white background.'
                }
              ]
            }],
            generationConfig: {
              responseModalities: ['TEXT', 'IMAGE'],
            }
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          console.error('[Matrixty BG] Gemini API error:', res.status, errText);
          sendResponse({ ok: false, error: `Gemini API error: ${res.status}` });
          return;
        }

        const result = await res.json();
        console.log('[Matrixty BG] Gemini response received');

        // Extract image from response
        const candidates = result.candidates || [];
        for (const candidate of candidates) {
          const parts = candidate.content?.parts || [];
          for (const part of parts) {
            if (part.inlineData && part.inlineData.data) {
              console.log('[Matrixty BG] Gemini returned image, mimeType:', part.inlineData.mimeType);
              sendResponse({
                ok: true,
                base64Data: part.inlineData.data,
                contentType: part.inlineData.mimeType || 'image/png',
              });
              return;
            }
          }
        }

        // No image in response
        const textParts = candidates[0]?.content?.parts?.filter(p => p.text) || [];
        const textMsg = textParts.map(p => p.text).join(' ');
        console.error('[Matrixty BG] Gemini did not return image. Text:', textMsg);
        sendResponse({ ok: false, error: 'Gemini không trả về ảnh. ' + (textMsg || 'Unknown error') });
      } catch (err) {
        console.error('[Matrixty BG] Gemini REMOVE_BG error:', err);
        sendResponse({ ok: false, error: err.message });
      }
    })();
    return true;
  }

  if (msg.type === 'MK_GET_UNASSIGNED_COUNT') {
    mkGetAll('__unassigned__')
      .then(m => sendResponse({ count: m.length }))
      .catch(() => sendResponse({ count: 0 }));
    return true;
  }

  // ============================================================
  //  PIC: Cloud-synced image clipboard (Supabase Storage + pic_images table)
  //  FIFO max 15 per user. Realtime sync across devices.
  // ============================================================
  const PIC_MAX = 15;
  const PIC_BUCKET = 'images';
  const PIC_FOLDER = 'pic'; // Storage path: pic/{userId}/{timestamp}.ext

  // Helper: Upload base64 image to Supabase Storage → return public URL
  async function picUploadImage(userId, base64Data, contentType) {
    const ext = (contentType || '').includes('png') ? 'png' : 'jpg';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${ext}`;
    const storagePath = `${PIC_FOLDER}/${userId}/${fileName}`;

    // Decode base64 → binary
    const binary = atob(base64Data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    // Upload to Supabase Storage
    const uploadResp = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${PIC_BUCKET}/${storagePath}`,
      {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': contentType || 'image/jpeg',
          'x-upsert': 'true',
        },
        body: bytes,
      }
    );
    if (!uploadResp.ok) {
      const errText = await uploadResp.text();
      throw new Error(`Storage upload failed: ${uploadResp.status} ${errText}`);
    }

    // Get public URL
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${PIC_BUCKET}/${storagePath}`;
    return { publicUrl, storagePath };
  }

  // Helper: Delete image from Supabase Storage
  async function picDeleteStorage(imageUrl) {
    if (!imageUrl) return;
    // Extract storage path from public URL
    const prefix = `/storage/v1/object/public/${PIC_BUCKET}/`;
    const idx = imageUrl.indexOf(prefix);
    if (idx === -1) return;
    const storagePath = imageUrl.substring(idx + prefix.length);

    await fetch(
      `${SUPABASE_URL}/storage/v1/object/${PIC_BUCKET}/${storagePath}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );
  }

  // ═══ PIC SAVE: Upload to Storage + insert to DB + FIFO cleanup ═══
  if (msg.type === 'MK_CLIPBOARD_SAVE') {
    const { userId, base64Data, contentType, fileName, sourceUrl } = msg;
    if (!userId) { sendResponse({ ok: false, error: 'No userId' }); return true; }

    (async () => {
      try {
        // 1. Upload image to Supabase Storage
        const { publicUrl } = await picUploadImage(userId, base64Data, contentType);

        // 2. Insert record into pic_images table
        const insertResp = await fetch(`${SUPABASE_URL}/rest/v1/pic_images`, {
          method: 'POST',
          headers: { ...HDR, 'Prefer': 'return=representation' },
          body: JSON.stringify({
            user_id: userId,
            image_url: publicUrl,
            content_type: contentType || 'image/jpeg',
            file_name: fileName || 'pic.jpg',
            source_url: sourceUrl || '',
          }),
        });
        if (!insertResp.ok) {
          const errText = await insertResp.text();
          throw new Error(`DB insert failed: ${insertResp.status} ${errText}`);
        }

        // 3. FIFO: Check count, delete oldest if > PIC_MAX
        const countResp = await fetch(
          `${SUPABASE_URL}/rest/v1/pic_images?user_id=eq.${userId}&select=id,image_url&order=created_at.asc`,
          { headers: HDR }
        );
        const allPics = await countResp.json();
        if (allPics.length > PIC_MAX) {
          const toDelete = allPics.slice(0, allPics.length - PIC_MAX);
          for (const pic of toDelete) {
            // Delete from storage
            await picDeleteStorage(pic.image_url);
            // Delete from DB
            await fetch(`${SUPABASE_URL}/rest/v1/pic_images?id=eq.${pic.id}`, {
              method: 'DELETE', headers: HDR,
            });
          }
          console.log(`[Matrixty BG] Pic FIFO: deleted ${toDelete.length} oldest, kept ${PIC_MAX}`);
        }

        sendResponse({ ok: true, total: Math.min(allPics.length, PIC_MAX) });
      } catch (e) {
        console.error('[Matrixty BG] PIC SAVE error:', e);
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }

  // ═══ PIC GET ALL: Query from DB (returns URLs, not base64) ═══
  if (msg.type === 'MK_CLIPBOARD_GET_ALL') {
    const { userId } = msg;
    if (!userId) { sendResponse({ ok: true, pics: [] }); return true; }

    (async () => {
      try {
        const resp = await fetch(
          `${SUPABASE_URL}/rest/v1/pic_images?user_id=eq.${userId}&order=created_at.desc&limit=${PIC_MAX}`,
          { headers: HDR }
        );
        if (!resp.ok) throw new Error(`DB query failed: ${resp.status}`);
        const pics = await resp.json();
        sendResponse({ ok: true, pics });
      } catch (e) {
        console.error('[Matrixty BG] PIC GET_ALL error:', e);
        sendResponse({ ok: false, error: e.message, pics: [] });
      }
    })();
    return true;
  }

  // ═══ PIC DELETE: Remove from Storage + DB ═══
  if (msg.type === 'MK_CLIPBOARD_DELETE') {
    const { picId, imageUrl } = msg;
    if (!picId) { sendResponse({ ok: false, error: 'No picId' }); return true; }

    (async () => {
      try {
        // Delete from storage
        await picDeleteStorage(imageUrl);
        // Delete from DB
        const resp = await fetch(`${SUPABASE_URL}/rest/v1/pic_images?id=eq.${picId}`, {
          method: 'DELETE', headers: HDR,
        });
        sendResponse({ ok: true });
      } catch (e) {
        console.error('[Matrixty BG] PIC DELETE error:', e);
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }

  // ═══ PIC COUNT ═══
  if (msg.type === 'MK_CLIPBOARD_COUNT') {
    const { userId } = msg;
    if (!userId) { sendResponse({ count: 0 }); return true; }

    (async () => {
      try {
        const resp = await fetch(
          `${SUPABASE_URL}/rest/v1/pic_images?user_id=eq.${userId}&select=id`,
          { headers: { ...HDR, 'Prefer': 'count=exact' } }
        );
        // Supabase returns count in content-range header
        const contentRange = resp.headers.get('content-range');
        let count = 0;
        if (contentRange) {
          const match = contentRange.match(/\/(\d+)/);
          if (match) count = parseInt(match[1]);
        } else {
          const data = await resp.json();
          count = data.length;
        }
        sendResponse({ count });
      } catch (e) {
        sendResponse({ count: 0 });
      }
    })();
    return true;
  }

  // ═══ PIC CLEAR ALL: Delete all for a user ═══
  if (msg.type === 'MK_CLIPBOARD_CLEAR_ALL') {
    const { userId } = msg;
    if (!userId) { sendResponse({ ok: false }); return true; }

    (async () => {
      try {
        // Get all pics to delete from storage
        const listResp = await fetch(
          `${SUPABASE_URL}/rest/v1/pic_images?user_id=eq.${userId}&select=id,image_url`,
          { headers: HDR }
        );
        const pics = await listResp.json();
        for (const pic of pics) {
          await picDeleteStorage(pic.image_url);
        }
        // Delete all DB records
        await fetch(`${SUPABASE_URL}/rest/v1/pic_images?user_id=eq.${userId}`, {
          method: 'DELETE', headers: HDR,
        });
        sendResponse({ ok: true, deleted: pics.length });
      } catch (e) {
        console.error('[Matrixty BG] PIC CLEAR_ALL error:', e);
        sendResponse({ ok: false, error: e.message });
      }
    })();
    return true;
  }
});
