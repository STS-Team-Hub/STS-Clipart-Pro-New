// Matrixty Extension v9.2.0 — Auto-Fill Listing Module (Main World Paste + React Fiber Click)
// v9.2: Fix paste not actually filling — inject paste into main world so React picks up state change
// v9: Fix tag auto-fill — use execCommand('insertText') + React fiber onClick via main world injection
// Previous bug: ClipboardEvent('paste') always fails (isTrusted:false), but false success check skipped all fallbacks
console.log('[Matrixty v9.2.0] Listing module LOADED on:', window.location.href);

(function() {
  'use strict';

  const SUPABASE_URL = 'https://qhejotdjehgneusqjvhz.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoZWpvdGRqZWhnbmV1c3Fqdmh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2NzcyNTEsImV4cCI6MjA4NDI1MzI1MX0.5sbhhZ3VUrRQuRuLo3-o6CDzjbotPLzDGsn3oIjPM_U';

  // ========== CONSTANTS ==========
  const COLORS = {
    primary: '#4A7C59',
    secondary: '#1565C0',
    listing: '#7B1FA2',
    danger: '#E8453C',
    bg: '#F5F5F5',
    border: '#E0E0E0',
    text: '#333333',
    textLight: '#666666',
    white: '#FFFFFF',
    success: '#2E7D32',
    warning: '#F57F17',
  };

  // Không dùng delay cố định — humanDelay() tạo delay ngẫu nhiên giống người thật

  // ========== ETSY SELECTORS ==========
  // v7.0.4: Etsy đã đổi Title từ INPUT → TEXTAREA (id="listing-title-input", name="title")
  // Tags: id="listing-tags-input", không còn name="tags"
  const ETSY_SELECTORS = {
    title: [
      '#listing-title-input',                    // v7.0.4: Etsy dùng textarea#listing-title-input
      'textarea[name="title"]',                   // v7.0.4: Title giờ là TEXTAREA, không phải INPUT
      'input[name="title"]',                      // fallback cho phiên bản Etsy cũ
      'input[placeholder*="title" i]',
      'textarea[placeholder*="title" i]',
      'input[aria-label*="title" i]',
      'textarea[aria-label*="title" i]',
      '#listing-edit-title input',
      '#listing-edit-title textarea',
      'input[data-testid="title-input"]',
      'textarea[data-testid="title-input"]',
      // v1.2.3: New Etsy listing-editor selectors
      'input[id*="title" i]',
      'textarea[id*="title" i]',
      'input[data-testid*="title" i]',
      'textarea[data-testid*="title" i]',
    ],
    description: [
      '#listing-description-textarea',            // v7.0.4: Etsy dùng textarea#listing-description-textarea
      'textarea[name="description"]',
      'textarea[placeholder*="description" i]',
      'div[contenteditable="true"][aria-label*="description" i]',
      '#listing-edit-description textarea',
      'div[data-testid="description-input"] textarea',
      '.wt-text-input-textarea-container textarea',
      'div[role="textbox"][contenteditable="true"]',
    ],
    tags: [
      '#listing-tags-input',                      // v7.0.4: Etsy dùng input#listing-tags-input
      'div[data-testid="tags-input"]',
      'input[name="tags"]',
      'input[placeholder*="tags" i]',
      'input[placeholder*="tag" i]',
      'input[placeholder*="Shape, color" i]',     // v7.0.5: Etsy actual placeholder
      'input[placeholder*="shape, color" i]',
      '#listing-edit-tags input',
      'input[aria-label*="tag" i]',
      // v1.2.3: New Etsy listing-editor selectors
      'input[id*="tag" i]',
      'input[data-testid*="tag" i]',
      'input[placeholder*="Add a tag" i]',
    ],
    sku: [
      'input[name="sku"]',                         // v9.3: SKU field
      'input[name*="sku" i]',
      'input[aria-label*="SKU" i]',
      'input[placeholder*="SKU" i]',
      'input[data-testid*="sku" i]',
      '#listing-sku-input',
      '#sku-input',
    ],
  };

  // ========== AMAZON SELECTORS ==========
  const AMAZON_SELECTORS = {
    title: [
      'textarea[name*="item_name" i]', 'textarea[name*="title" i]',
      'textarea[aria-label*="Item Name" i]', 'textarea[aria-label*="Product Title" i]',
      'input[name*="item_name" i]', 'input[name*="title" i]',
      'input[aria-label*="Item Name" i]', 'input[placeholder*="Item Name" i]',
      // v10: Contenteditable divs — Amazon may use these instead of textarea
      '[contenteditable="true"][aria-label*="Item Name" i]',
      '[contenteditable="true"][aria-label*="title" i]',
      '[role="textbox"][aria-label*="Item Name" i]',
    ],
    description: [
      'textarea[name*="product_description" i]', 'textarea[name*="description" i]',
      'textarea[aria-label*="Product Description" i]', 'textarea[aria-label*="Description" i]',
      'div[contenteditable="true"][aria-label*="description" i]',
      '[role="textbox"][aria-label*="description" i]',
    ],
    search_terms: [
      'textarea[name*="generic_keyword" i]', 'textarea[name*="search_terms" i]',
      'input[name*="generic_keyword" i]', 'input[name*="search_terms" i]',
      'textarea[aria-label*="Search Terms" i]', 'input[aria-label*="Search Terms" i]',
      '[contenteditable="true"][aria-label*="Search Terms" i]',
    ],
    bullet_points: [
      'textarea[name*="bullet_point" i]', 'textarea[aria-label*="Bullet Point" i]',
      'textarea[name*="key_product_features" i]',
      'input[name*="bullet_point" i]', 'input[aria-label*="Bullet Point" i]',
    ],
    sku: [
      'input[name*="sku" i]', 'input[name*="merchant_sku" i]',
      'input[aria-label*="SKU" i]', 'input[aria-label*="Seller SKU" i]',
      'input[placeholder*="ABC123" i]', 'input[placeholder*="SKU" i]',
      'input[id*="sku" i]', 'input[data-testid*="sku" i]',
    ],
  };

  // ========== STATE ==========
  const LISTING = {
    platform: null,
    ideaData: null,
    generatedData: null,
    detectedFields: {},
    sidebarOpen: false,
    auth: null,
    lastFill: null,
    isPasting: false,
    cdpAvailable: null, // null=unknown, true/false after first check
  };

  // ========== UTILITY ==========
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Random delay giống người thật — không ai paste đúng 500ms mỗi lần
  function humanDelay(minMs, maxMs) {
    const delay = minMs + Math.random() * (maxMs - minMs);
    return sleep(Math.round(delay));
  }

  /**
   * React-compatible click — Etsy React 17+ delegates events via pointer/mouse sequence.
   * Simple .click() often fails because React doesn't catch it.
   */
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

  /**
   * v9.3: CDP Paste — Chrome Debugger Protocol for REAL keyboard input
   * This uses chrome.debugger API to send Input.insertText CDP command.
   * This is IDENTICAL to a real user typing — React CANNOT miss it.
   * The element must be focused BEFORE calling this.
   */
  /**
   * v9.3: Build a unique CSS selector for an element so CDP can find it via Runtime.evaluate
   * Tries: #id → data-matrixty-uid → tag+name → tag+placeholder → fallback data attr
   */
  function getUniqueSelector(element) {
    if (!element) return null;
    // 1. ID-based
    if (element.id) return '#' + CSS.escape(element.id);
    // 2. name attribute
    if (element.name) {
      const sel = `${element.tagName.toLowerCase()}[name="${element.name}"]`;
      if (document.querySelectorAll(sel).length === 1) return sel;
    }
    // 3. placeholder
    if (element.placeholder) {
      const sel = `${element.tagName.toLowerCase()}[placeholder="${element.placeholder.replace(/"/g, '\\"')}"]`;
      if (document.querySelectorAll(sel).length === 1) return sel;
    }
    // 4. Assign a unique data attribute
    const uid = 'mtx-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
    element.setAttribute('data-matrixty-uid', uid);
    return `[data-matrixty-uid="${uid}"]`;
  }

  function cdpPaste(text, selector) {
    // v9.5: Skip CDP entirely if we already know it's unavailable
    if (LISTING.cdpAvailable === false) {
      console.log('[Matrixty v9.5] CDP skipped — previously failed');
      return Promise.resolve(false);
    }
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        console.warn('[Matrixty v9.5] CDP_PASTE timeout (3s)');
        LISTING.cdpAvailable = false;
        resolve(false);
      }, 3000);
      chrome.runtime.sendMessage({ type: 'CDP_PASTE', text, selector: selector || null }, (response) => {
        clearTimeout(timer);
        if (chrome.runtime.lastError) {
          console.warn('[Matrixty v9.3] CDP_PASTE error:', chrome.runtime.lastError.message);
          LISTING.cdpAvailable = false;
          resolve(false);
          return;
        }
        const ok = response?.ok || false;
        if (ok) LISTING.cdpAvailable = true;
        console.log('[Matrixty v9.3] CDP_PASTE response:', response);
        resolve(ok);
      });
    });
  }

  /**
   * v9.3: CDP Tag Paste — paste tags one-by-one via CDP
   * Each tag: Input.insertText → comma → Enter
   * Accepts optional selector so CDP can self-focus the tag input.
   */
  function cdpTagPaste(tags, selector) {
    // v9.5: Skip CDP entirely if we already know it's unavailable
    if (LISTING.cdpAvailable === false) {
      console.log('[Matrixty v9.5] CDP tag paste skipped — previously failed');
      return Promise.resolve(0);
    }
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        console.warn('[Matrixty v9.5] CDP_TAG_PASTE timeout (5s)');
        LISTING.cdpAvailable = false;
        resolve(0);
      }, 5000);
      chrome.runtime.sendMessage({ type: 'CDP_TAG_PASTE', tags, selector: selector || null }, (response) => {
        clearTimeout(timer);
        if (chrome.runtime.lastError) {
          console.warn('[Matrixty v9.3] CDP_TAG_PASTE error:', chrome.runtime.lastError.message);
          LISTING.cdpAvailable = false;
          resolve(0);
          return;
        }
        const added = response?.added || 0;
        if (added > 0) LISTING.cdpAvailable = true;
        console.log('[Matrixty v9.3] CDP_TAG_PASTE response:', response);
        resolve(added);
      });
    });
  }

  /**
   * v9.2: Main World Paste via chrome.scripting.executeScript(world:'MAIN')
   * Content scripts run in ISOLATED world. Etsy's CSP blocks <script> injection.
   * chrome.scripting.executeScript with world:'MAIN' BYPASSES CSP and runs code
   * in the SAME JS context as React — ensuring _valueTracker + InputEvent work.
   *
   * Flow: content script → chrome.runtime.sendMessage → background service worker
   *       → chrome.scripting.executeScript({ world: 'MAIN' })
   */
  function mainWorldPaste(element, text) {
    return new Promise((resolve) => {
      // Create unique selector for the element so background can find it
      const uid = 'mtx-mw-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      element.setAttribute('data-matrixty-mw-paste', uid);
      const selector = `[data-matrixty-mw-paste="${uid}"]`;

      chrome.runtime.sendMessage({
        type: 'MAIN_WORLD_PASTE',
        selector,
        text
      }, (response) => {
        // Clean up attribute
        try { element.removeAttribute('data-matrixty-mw-paste'); } catch(e) {}

        if (chrome.runtime.lastError) {
          console.warn('[Matrixty v9.2] MW-PASTE sendMessage error:', chrome.runtime.lastError.message);
          resolve(false);
          return;
        }
        console.log('[Matrixty v9.2] MW-PASTE response:', response);
        resolve(response?.ok || false);
      });

      // Timeout fallback — clean up attribute if no response after 8s
      setTimeout(() => {
        try { element.removeAttribute('data-matrixty-mw-paste'); } catch(e) {}
      }, 8000);
    });
  }

  /**
   * v9.2: Main World Tag Paste via chrome.scripting.executeScript(world:'MAIN')
   * Adds tags one-by-one in main world context (nativeSetter + comma/Enter).
   */
  function mainWorldTagPaste(tagInput, tags) {
    return new Promise((resolve) => {
      const uid = 'mtx-mwtag-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      tagInput.setAttribute('data-matrixty-mw-tag', uid);
      const selector = `[data-matrixty-mw-tag="${uid}"]`;

      chrome.runtime.sendMessage({
        type: 'MAIN_WORLD_TAG_PASTE',
        selector,
        tags
      }, (response) => {
        try { tagInput.removeAttribute('data-matrixty-mw-tag'); } catch(e) {}

        if (chrome.runtime.lastError) {
          console.warn('[Matrixty v9.2] MW-TAG sendMessage error:', chrome.runtime.lastError.message);
          resolve(0);
          return;
        }
        console.log('[Matrixty v9.2] MW-TAG response:', response);
        resolve(response?.added || 0);
      });

      // Timeout fallback
      setTimeout(() => {
        try { tagInput.removeAttribute('data-matrixty-mw-tag'); } catch(e) {}
      }, tags.length * 2000 + 15000);
    });
  }

  // ========== PLATFORM DETECTION ==========
  function detectListingPlatform() {
    const url = window.location.href;
    // v1.2.3: Etsy listing pages — including new /listing-editor/ URL pattern
    if (url.includes('etsy.com') && (
      url.includes('/listing/') || url.includes('/listings/') ||
      url.includes('/listing-editor/') ||
      url.includes('/edit') || url.includes('item-details') ||
      (url.includes('/your/') && url.includes('/tools/'))
    )) {
      LISTING.platform = 'etsy';
      return 'etsy';
    }
    if (url.includes('sellercentral.amazon.com') || url.includes('sellercentral')) {
      LISTING.platform = 'amazon';
      return 'amazon';
    }
    LISTING.platform = null;
    return null;
  }

  // ========== FIELD DETECTION ==========

  // v1.2.2: Helper to query elements including inside shadow DOM (for Amazon Katal components)
  function querySelectorAllDeep(root, selector) {
    const results = Array.from(root.querySelectorAll(selector));
    // Also search inside shadow roots of custom elements
    root.querySelectorAll('*').forEach(el => {
      if (el.shadowRoot) {
        results.push(...el.shadowRoot.querySelectorAll(selector));
        // One level deeper
        el.shadowRoot.querySelectorAll('*').forEach(inner => {
          if (inner.shadowRoot) {
            results.push(...inner.shadowRoot.querySelectorAll(selector));
          }
        });
      }
    });
    return results;
  }

  function detectFieldElement(selectors) {
    for (const selector of selectors) {
      // v1.2.2: Search including shadow DOM (Amazon Katal)
      const elements = querySelectorAllDeep(document, selector);
      for (const element of elements) {
        const rect = element.getBoundingClientRect();
        if (rect.width <= 0 && rect.height <= 0) {
          console.warn(`[Matrixty v9.7] Element matched "${selector}" but is HIDDEN (${rect.width}x${rect.height}) — trying next match`);
          continue;
        }
        return { element, selector };
      }
    }
    return null;
  }

  /**
   * Brute-force: tìm input/textarea gần label chứa text nhất định
   * Etsy listing editor thay đổi HTML thường xuyên nên selector cụ thể hay fail
   * Approach này quét DOM tìm input theo context (label gần nhất)
   */
  function findInputNearLabel(labelText) {
    const ltLower = labelText.toLowerCase();
    // v10: Editable element selector — includes contenteditable divs for Amazon
    const EDITABLE_SEL = 'input[type="text"], input:not([type]), textarea, [contenteditable="true"], [role="textbox"]';

    // Strategy 1: Tìm ANY element chứa text → lấy editable gần nhất
    // v10: Search ALL element types (not just label/h2) — Amazon uses span, p, div for labels
    const allElements = document.querySelectorAll('label, h2, h3, h4, h5, legend, span, p, div, [class*="label" i]');
    for (const lbl of allElements) {
      const ownText = lbl.childNodes.length <= 3 ? (lbl.textContent || '').trim() : '';
      if (!ownText || ownText.length > 80) continue; // Skip containers with too much text
      if (!ownText.toLowerCase().includes(ltLower)) continue;

      // v10: Walk UP from label to find container with editable element
      let container = lbl.parentElement;
      for (let depth = 0; depth < 12 && container; depth++) {
        // v1.2.2: Search including shadow DOM (Amazon Katal wraps inputs in shadow roots)
        const editables = querySelectorAllDeep(container, EDITABLE_SEL);
        for (const input of editables) {
          const rect = input.getBoundingClientRect();
          if (rect.width > 50 && rect.height > 5) {
            console.log(`[Matrixty v10] Found "${labelText}" via label proximity (depth ${depth}):`, input.tagName, input.name || input.id || input.getAttribute('contenteditable') || '(anon)', `${Math.round(rect.width)}x${Math.round(rect.height)}`);
            return { element: input, selector: `label:"${labelText}"→${input.tagName}` };
          }
        }
        container = container.parentElement;
      }
    }

    // Strategy 2: Tìm editable element có aria-label hoặc placeholder chứa text
    // v1.2.2: Including shadow DOM
    const allInputs = querySelectorAllDeep(document, EDITABLE_SEL);
    for (const inp of allInputs) {
      const ariaLabel = (inp.getAttribute('aria-label') || '').toLowerCase();
      const placeholder = (inp.getAttribute('placeholder') || '').toLowerCase();
      const name = (inp.getAttribute('name') || '').toLowerCase();
      const id = (inp.getAttribute('id') || '').toLowerCase();
      if (ariaLabel.includes(ltLower) || placeholder.includes(ltLower) ||
          name.includes(ltLower) || id.includes(ltLower)) {
        const rect = inp.getBoundingClientRect();
        if (rect.width > 50) {
          console.log(`[Matrixty v10] Found "${labelText}" via attribute:`, inp.tagName, inp.name || inp.id);
          return { element: inp, selector: `attr:"${labelText}"` };
        }
      }
    }

    return null;
  }

  /**
   * Brute-force tìm tag input container (div chứa nhiều tag chips + input)
   */
  function findTagInputBruteForce() {
    // Strategy 1: Tìm container có nhiều "chip" con (tag chips) + 1 input
    const containers = document.querySelectorAll('div, ul, fieldset');
    for (const c of containers) {
      const chips = c.querySelectorAll('[class*="tag" i], [class*="chip" i], [class*="token" i], [role="option"], [role="listitem"]');
      const input = c.querySelector('input');
      if (chips.length >= 1 && input) {
        const rect = c.getBoundingClientRect();
        if (rect.width > 100 && rect.height > 20) {
          console.log(`[Matrixty v7.0.0] Found tag container via brute-force: ${chips.length} chips + input`);
          return { element: c, selector: 'bruteforce:tag-container' };
        }
      }
    }

    // Strategy 2: Tìm container có nhiều × buttons (tag remove) + 1 input
    for (const c of containers) {
      const input = c.querySelector('input');
      if (!input) continue;
      const xBtns = c.querySelectorAll('button, [role="button"]');
      const removeCount = Array.from(xBtns).filter(b => {
        const txt = (b.textContent || '').trim();
        const r = b.getBoundingClientRect();
        return r.width > 0 && r.width < 50 && (txt === '×' || txt === '✕' || txt === '' || b.querySelector('svg') || (b.getAttribute('aria-label') || '').toLowerCase().includes('remove'));
      }).length;
      if (removeCount >= 2) {
        console.log(`[Matrixty v7.0.0] Found tag container via × count: ${removeCount} remove buttons + input`);
        return { element: c, selector: 'bruteforce:x-buttons-container' };
      }
    }

    // Strategy 3: Tìm input có placeholder "Shape, color" (Etsy specific)
    const etsyInput = document.querySelector('input[placeholder*="Shape" i]') ||
                      document.querySelector('input[placeholder*="function, etc" i]');
    if (etsyInput) {
      console.log(`[Matrixty v7.0.0] Found tag input via Etsy placeholder:`, etsyInput.placeholder);
      return { element: etsyInput, selector: 'bruteforce:etsy-placeholder' };
    }

    return null;
  }

  function detectEtsyFields() {
    const fields = {};

    // Step 1: Try specific selectors first
    for (const [fieldName, selectors] of Object.entries(ETSY_SELECTORS)) {
      const found = detectFieldElement(selectors);
      if (found) fields[fieldName] = found;
    }

    // Step 2: Brute-force fallback for missing fields
    if (!fields.title) {
      console.log('[Matrixty v7.0.0] Title not found by selectors, trying brute-force...');
      const found = findInputNearLabel('Title');
      if (found) fields.title = found;
    }

    if (!fields.tags) {
      console.log('[Matrixty v7.0.0] Tags not found by selectors, trying brute-force...');
      // First try label-based search
      let found = findInputNearLabel('Tags');
      if (!found) found = findInputNearLabel('Tag');
      if (!found) found = findTagInputBruteForce();
      if (found) fields.tags = found;
    }

    if (!fields.description) {
      console.log('[Matrixty v7.0.0] Description not found by selectors, trying brute-force...');
      const found = findInputNearLabel('Description');
      if (found) fields.description = found;
    }

    // Step 2b: SKU field — may need to click "+ Add SKU" button first
    if (!fields.sku) {
      console.log('[Matrixty v9.3] SKU not found by selectors, trying brute-force...');
      const found = findInputNearLabel('SKU');
      if (found) fields.sku = found;
    }

    // Step 3: Last resort — tìm input lớn nhất trên page (likely title)
    if (!fields.title) {
      console.log('[Matrixty v7.0.0] Title still not found, trying largest input fallback...');
      const allInputs = document.querySelectorAll('input[type="text"], input:not([type])');
      let bestInput = null;
      let bestWidth = 0;
      for (const inp of allInputs) {
        const rect = inp.getBoundingClientRect();
        // Skip inputs inside tag containers, search bars, etc
        if (inp.closest('[data-testid*="tag" i]') || inp.type === 'search' || inp.type === 'hidden') continue;
        if (rect.width > bestWidth && rect.width > 200 && rect.height > 15) {
          bestWidth = rect.width;
          bestInput = inp;
        }
      }
      if (bestInput) {
        console.log(`[Matrixty v7.0.0] Using largest input as title: ${bestInput.tagName} w=${bestWidth}`, bestInput.name || bestInput.id);
        fields.title = { element: bestInput, selector: 'bruteforce:largest-input' };
      }
    }

    LISTING.detectedFields = fields;
    console.log(`[Matrixty v7.0.0] Etsy: detected ${Object.keys(fields).length} fields:`, Object.keys(fields));
    // Log ALL inputs on page for debugging
    const allInputs = document.querySelectorAll('input, textarea');
    console.log(`[Matrixty v7.0.0] DEBUG: All inputs on page (${allInputs.length}):`,
      Array.from(allInputs).map(el => ({
        tag: el.tagName, type: el.type, name: el.name, id: el.id,
        'aria-label': el.getAttribute('aria-label'),
        placeholder: el.placeholder,
        w: Math.round(el.getBoundingClientRect().width),
      }))
    );
    return fields;
  }

  function detectAmazonFields() {
    const fields = {};
    for (const [fieldName, selectors] of Object.entries(AMAZON_SELECTORS)) {
      if (fieldName === 'bullet_points') {
        fields[fieldName] = [];
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          elements.forEach(el => {
            // v10: Only include VISIBLE bullet points
            const r = el.getBoundingClientRect();
            if (fields[fieldName].length < 5 && r.width > 0 && r.height > 0) {
              fields[fieldName].push({ element: el, selector });
            }
          });
          if (fields[fieldName].length >= 5) break;
        }
      } else {
        const found = detectFieldElement(selectors);
        if (found) fields[fieldName] = found;
      }
    }

    // ═══ v10: LABEL-BASED FALLBACK for missing Amazon fields ═══
    // Amazon Seller Central has hidden form duplicates — selectors may miss visible fields
    const labelMap = {
      title: ['Item Name', 'Product Title', 'Title'],
      description: ['Product Description', 'Description'],
      search_terms: ['Search Terms', 'Generic Keywords'],
    };
    for (const [fieldName, labels] of Object.entries(labelMap)) {
      if (fields[fieldName]) continue; // already found
      for (const label of labels) {
        const found = findInputNearLabel(label);
        if (found) {
          console.log(`[Matrixty v10] Amazon "${fieldName}" found via label "${label}":`, found.element.tagName, found.selector);
          fields[fieldName] = found;
          break;
        }
      }
    }

    // ═══ v10: LAST RESORT for title — find largest visible editable element ═══
    if (!fields.title) {
      const allEditable = document.querySelectorAll('textarea, input[type="text"], input:not([type]), [contenteditable="true"], [role="textbox"]');
      let bestEl = null, bestW = 0;
      for (const el of allEditable) {
        if (el.type === 'search' || el.type === 'hidden') continue;
        const r = el.getBoundingClientRect();
        if (r.width > bestW && r.width > 100 && r.height > 15) {
          bestW = r.width; bestEl = el;
        }
      }
      if (bestEl) {
        console.log(`[Matrixty v10] Amazon title via largest visible editable (${bestEl.tagName}, ${Math.round(bestW)}px)`);
        fields.title = { element: bestEl, selector: 'bruteforce:largest-editable' };
      }
    }

    // ═══ v10: DEBUG — log all visible editable elements to diagnose detection issues ═══
    if (!fields.title) {
      const debugEditables = document.querySelectorAll('textarea, input, [contenteditable="true"], [role="textbox"]');
      const debugList = [];
      for (const el of debugEditables) {
        const r = el.getBoundingClientRect();
        if (r.width > 0) {
          debugList.push({
            tag: el.tagName, type: el.type, name: el.name, id: el.id,
            contenteditable: el.getAttribute('contenteditable'),
            role: el.getAttribute('role'),
            w: Math.round(r.width), h: Math.round(r.height),
          });
        }
        if (debugList.length >= 20) break;
      }
      console.warn('[Matrixty v10] ⚠️ Amazon title NOT FOUND. Visible editable elements:', debugList);
    }

    // ═══ v9.6: STRICT VALIDATION — verify search_terms is actually a search terms field ═══
    if (fields.search_terms?.element) {
      const stEl = fields.search_terms.element;
      const stName = (stEl.name || '').toLowerCase();
      const stLabel = (stEl.getAttribute('aria-label') || '').toLowerCase();
      const isValid = stName.includes('generic_keyword') || stName.includes('search_term')
        || stLabel.includes('search term') || stLabel.includes('generic keyword');
      if (!isValid) {
        console.warn(`[Matrixty v9.6] ⚠️ search_terms field INVALID — name="${stEl.name}" aria="${stEl.getAttribute('aria-label')}" — removing`);
        delete fields.search_terms;
      }
    }

    // ═══ v9.5: DEDUP — ensure no two fields point to the same DOM element ═══
    const seenElements = new Map(); // element → fieldName
    for (const [fieldName, fieldData] of Object.entries(fields)) {
      if (fieldName === 'bullet_points' || !fieldData?.element) continue;
      const existingField = seenElements.get(fieldData.element);
      if (existingField) {
        console.warn(`[Matrixty v9.5] ⚠️ DUPLICATE element: "${fieldName}" same as "${existingField}" — removing "${fieldName}"`);
        delete fields[fieldName];
      } else {
        seenElements.set(fieldData.element, fieldName);
      }
    }

    LISTING.detectedFields = fields;
    const count = Object.keys(fields).filter(k => k === 'bullet_points' ? fields[k].length > 0 : !!fields[k]).length;
    // v9.5: Enhanced debug logging — show element details for each detected field
    const fieldDebug = {};
    for (const [k, v] of Object.entries(fields)) {
      if (k === 'bullet_points') { fieldDebug[k] = v.length + ' items'; continue; }
      if (!v?.element) continue;
      fieldDebug[k] = `<${v.element.tagName}> name="${v.element.name || ''}" aria-label="${v.element.getAttribute('aria-label') || ''}" selector="${v.selector}"`;
    }
    console.log(`[Matrixty v9.5] Amazon: detected ${count} fields:`, fieldDebug);
    return fields;
  }

  function detectListingFields() {
    const platform = detectListingPlatform();
    if (platform === 'etsy') return detectEtsyFields();
    if (platform === 'amazon') return detectAmazonFields();
    return {};
  }

  // ==========================================================
  //  PASTE ENGINE — v9.2.0 (Main World Injection + Fallback)
  //  Problem: Content scripts run in ISOLATED WORLD, but React's
  //  state, _valueTracker, and event delegation live in MAIN WORLD.
  //  v9.3: CDP (Chrome Debugger Protocol) as PRIMARY paste method.
  //  chrome.debugger + Input.insertText simulates REAL keyboard input
  //  that is indistinguishable from actual user typing.
  //  React MUST process these events correctly.
  //
  //  Fallback chain: CDP → Main World (chrome.scripting) → execCommand → nativeSetter
  // ==========================================================

  /** Deselect text and blur an input/textarea after filling */
  function deselectInput(el) {
    try {
      if (el.setSelectionRange) {
        try { el.setSelectionRange(el.value.length, el.value.length); } catch(e) {}
      }
      window.getSelection()?.removeAllRanges();
      el.dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
      el.dispatchEvent(new FocusEvent('blur', { bubbles: false }));
      el.blur();
      // Click body to move focus away (Amazon re-selects on internal React events)
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, clientX: 10, clientY: 10 }));
      // Final safety
      if (document.activeElement === el) el.blur();
      window.getSelection()?.removeAllRanges();
    } catch(e) { console.warn('[Matrixty] deselectInput error:', e.message); }
  }

  async function clipboardPaste(element, text) {
    if (!element || !text) {
      console.warn('[Matrixty v9.3] clipboardPaste: missing element or text', { element: !!element, text: !!text });
      return false;
    }

    try {
      const isInputOrTextarea = element.tagName === 'INPUT' || element.tagName === 'TEXTAREA';

      if (isInputOrTextarea) {
        // === PRIMARY METHOD (v9.3): CDP — Chrome Debugger Protocol ===
        // Uses chrome.debugger + Input.insertText to simulate REAL keyboard input.
        // CDP self-focuses via Runtime.evaluate, clears old text, then types new text.
        const elSelector = getUniqueSelector(element);
        console.log(`[Matrixty v9.3] Attempting CDP paste for ${element.tagName} (${element.id || element.name || 'anon'}), selector=${elSelector}`);

        // Pre-focus from content script as well (belt and suspenders)
        // v9.5: Scroll element into view first — off-screen elements can't receive focus
        try { element.scrollIntoView({ behavior: 'instant', block: 'center' }); } catch(e) {}
        await humanDelay(30, 80);
        element.focus();
        reactClick(element);
        await humanDelay(50, 150);

        // v9.5: Try CDP only if available (skip if previously failed — saves ~3s)
        let cdpOk = false;
        if (LISTING.cdpAvailable !== false) {
          const cdpOk_ = await cdpPaste(text, elSelector);
          await humanDelay(150, 350);
          cdpOk = cdpOk_;

          if (cdpOk && element.value === text) {
            console.log(`[Matrixty v9.5] ✅ CDP paste SUCCESS — ${text.length} chars in ${element.tagName}`);
            deselectInput(element);
            return true;
          }

          // Quick re-check (React async re-render)
          if (cdpOk) {
            await humanDelay(200, 500);
            if (element.value === text) {
              console.log(`[Matrixty v9.5] ✅ CDP paste SUCCESS (after re-check)`);
              deselectInput(element);
              return true;
            }
          }
          console.warn(`[Matrixty v9.5] CDP paste ${cdpOk ? 'value mismatch' : 'failed'}, trying main world...`);
        } else {
          console.log('[Matrixty v9.5] CDP unavailable, skipping to main world paste');
        }

        // === FALLBACK 1: Main World Paste via chrome.scripting(world:'MAIN') ===
        // Main world paste runs in the page's JS context (same as React).
        // IMPORTANT: element.value from isolated world may NOT reflect main world changes
        // because React's _valueTracker is in main world only. Trust mwResult directly.
        element.focus();
        reactClick(element);
        await humanDelay(40, 100);
        const mwResult = await mainWorldPaste(element, text);
        await humanDelay(150, 350);

        if (mwResult) {
          // v9.6: Trust main world result — don't verify from isolated world
          // React's internal state is updated in main world, element.value here may be stale
          console.log(`[Matrixty v9.6] ✅ Main world paste succeeded (trusted result)`);
          deselectInput(element);
          return true;
        }

        // === FALLBACK 2: execCommand from isolated world ===
        console.warn(`[Matrixty v9.6] Main world paste failed, trying execCommand...`);
        element.focus();
        element.select();
        await humanDelay(20, 60);
        document.execCommand('selectAll');
        document.execCommand('delete');
        await humanDelay(20, 60);
        const execOk = document.execCommand('insertText', false, text);
        await humanDelay(50, 150);

        // v9.6: Check both element.value AND execCommand return value
        if (execOk || element.value === text) {
          console.log(`[Matrixty v9.6] ✅ execCommand fallback succeeded (execOk=${execOk}, valueMatch=${element.value === text})`);
          element.dispatchEvent(new Event('change', { bubbles: true }));
          deselectInput(element);
          return true;
        }

        // === FALLBACK 3: nativeSetter from isolated world ===
        console.warn(`[Matrixty v9.6] execCommand also failed (got "${(element.value || '').substring(0, 30)}"), trying nativeSetter...`);
        const proto = (element.tagName === 'INPUT') ? HTMLInputElement.prototype : HTMLTextAreaElement.prototype;
        const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (nativeSetter) {
          const tracker = element._valueTracker;
          if (tracker) tracker.setValue(element.value || '');
          nativeSetter.call(element, text);
          element.dispatchEvent(new InputEvent('input', { bubbles: true, data: text, inputType: 'insertText' }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
          element.dispatchEvent(new Event('blur', { bubbles: true }));
        } else {
          element.value = text;
          element.dispatchEvent(new Event('input', { bubbles: true }));
          element.dispatchEvent(new Event('change', { bubbles: true }));
        }

        const finalMatch = element.value === text;
        console.log(`[Matrixty v9.3] Final result: value match=${finalMatch} (${element.value.length} chars)`);
        deselectInput(element);
        return finalMatch;

      } else if (element.contentEditable === 'true') {
        // ContentEditable — set textContent directly
        const range = document.createRange();
        range.selectNodeContents(element);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        document.execCommand('delete');
        await humanDelay(50, 80);

        element.focus();
        const execOk = document.execCommand('insertText', false, text);
        if (!execOk || element.textContent !== text) {
          element.textContent = text;
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));
        element.dispatchEvent(new Event('change', { bubbles: true }));
        console.log(`[Matrixty v9.3] ✅ Pasted ${text.length} chars into contentEditable`);
        return true;
      }

      // === FALLBACK: Clipboard paste for unknown element types ===
      try {
        await navigator.clipboard.writeText(text);
        let pasted = document.execCommand('paste');
        if (!pasted) pasted = document.execCommand('insertText', false, text);
        if (pasted) {
          console.log(`[Matrixty v9.3] ✅ Pasted via clipboard/execCommand fallback`);
          return true;
        }
      } catch (clipErr) {
        console.warn('[Matrixty v9.3] Clipboard fallback failed:', clipErr.message);
      }

      console.warn('[Matrixty v9.2] All paste methods failed for', element.tagName);
      return false;
    } catch (error) {
      console.error('[Matrixty v9.2] clipboardPaste error:', error);
      return false;
    }
  }

  /**
   * Tìm Tags SECTION rộng nhất trên Etsy page
   * Etsy layout: section chứa heading "Tags" + input + tag chips (ở dưới input)
   * Tag chips nằm TÁCH BIỆT khỏi input container → phải tìm section cha rộng
   */
  function findTagsSection(container) {
    // Approach 1: Từ container, đi lên tìm section/div cha chứa cả input VÀ × buttons
    let el = container;
    let bestCandidate = null;
    for (let depth = 0; depth < 12 && el; depth++) {
      const hasInput = el.querySelector('input');
      const closeBtns = el.querySelectorAll('button, [role="button"]');
      // Count actual × / remove buttons (not all buttons)
      const xCount = Array.from(closeBtns).filter(b => {
        const txt = (b.textContent || '').trim();
        const r = b.getBoundingClientRect();
        if (r.width <= 0 || r.width > 50) return false;
        return txt === '×' || txt === '✕' || txt === '' || b.querySelector('svg') || (b.getAttribute('aria-label') || '').toLowerCase().includes('remove');
      }).length;

      if (hasInput && xCount >= 2) {
        console.log(`[Matrixty] findTagsSection: found at depth ${depth}, tag=${el.tagName}, children=${el.children.length}, xBtns=${xCount}`);
        return el;
      }
      // Keep track of first candidate with input + any close btn
      if (hasInput && closeBtns.length > 0 && el.children.length >= 2 && !bestCandidate) {
        bestCandidate = el;
      }
      el = el.parentElement;
    }
    if (bestCandidate) {
      console.log(`[Matrixty] findTagsSection: using bestCandidate:`, bestCandidate.tagName, bestCandidate.children.length);
      return bestCandidate;
    }

    // Approach 2: Tìm heading "Tags" trên page → lấy section cha
    const allHeadings = document.querySelectorAll('h1, h2, h3, h4, h5, label, legend, [class*="label" i]');
    for (const h of allHeadings) {
      const txt = (h.textContent || '').trim();
      if (txt === 'Tags' || txt === 'Tags *' || txt.match(/^Tags\s*$/)) {
        // Tìm container cha chứa heading này + các siblings
        const section = h.closest('section, fieldset, [class*="section" i], [class*="field" i]')
                     || h.parentElement?.parentElement
                     || h.parentElement;
        if (section) {
          console.log(`[Matrixty] findTagsSection: found via "Tags" heading, tag=${section.tagName}`);
          return section;
        }
      }
    }

    // Approach 3: Fallback — đi lên 8 cấp từ container
    el = container;
    for (let depth = 0; depth < 8 && el; depth++) {
      el = el.parentElement;
    }
    return el || container;
  }

  /**
   * Xóa tất cả tag chips hiện có trên Etsy trước khi thêm mới
   * Screenshot cho thấy: tag chips có nút × rõ ràng, ví dụ "Wood Sign ×"
   * Nút × là clickable element bên trong mỗi tag chip
   */
  async function clearExistingEtsyTags(container) {
    if (!container) return 0;

    // Tìm Tags section RỘNG — ưu tiên tìm bằng heading "Tags" để phân biệt với Materials
    const tagsSection = findTagsSectionByHeading() || findTagsSection(container);

    // Debug: log cấu trúc
    console.log('[Matrixty] clearExistingEtsyTags — section:', tagsSection.tagName,
      'class:', (tagsSection.className || '').substring(0, 60),
      'children:', tagsSection.children.length);

    let removedCount = 0;

    // Helper: re-query fresh × buttons in the section (DOM changes after each removal)
    function findXButtons(scope) {
      const allClickables = scope.querySelectorAll('button, [role="button"], span[tabindex], span[class], span[role="img"]');
      return Array.from(allClickables).filter(el => {
        const rect = el.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) return false;
        if (rect.width > 50 || rect.height > 50) return false;
        const text = (el.textContent || '').trim();
        const hasSvg = el.querySelector('svg') !== null;
        const isSmall = rect.width < 45 && rect.height < 45;
        const hasCloseChar = text === '×' || text === '✕' || text === 'x' || text === 'X' || text === '✖' || text === '';
        const ariaLabel = (el.getAttribute('aria-label') || '').toLowerCase();
        const isRemoveBtn = ariaLabel.includes('remove') || ariaLabel.includes('delete') || ariaLabel.includes('close');
        return isSmall && (hasCloseChar || hasSvg || isRemoveBtn);
      });
    }

    // ═══ STRATEGY A: Tìm tất cả nút × visible trên toàn Tags section ═══
    let xButtons = findXButtons(tagsSection);

    // If not found in tagsSection, try searching entire page for tag remove buttons
    if (xButtons.length === 0) {
      console.log('[Matrixty] No × in tagsSection, searching globally for tag remove buttons...');
      xButtons = findXButtons(document.body);
    }

    if (xButtons.length > 0) {
      console.log(`[Matrixty] ✅ Found ${xButtons.length} × buttons`);
      // Click one by one using reactClick (React 17+ needs full pointer event sequence)
      const maxIterations = xButtons.length + 5; // safety limit
      for (let iter = 0; iter < maxIterations; iter++) {
        let freshBtns = findXButtons(tagsSection);
        if (freshBtns.length === 0) freshBtns = findXButtons(document.body);
        if (freshBtns.length === 0) break;
        const btnToClick = freshBtns[freshBtns.length - 1];
        btnToClick.click(); // Native .click() creates trusted event
        reactClick(btnToClick); // Also fire React-compatible event sequence
        removedCount++;
        await humanDelay(250, 400); // longer delay for React to process
      }
      await humanDelay(300, 500);
      console.log(`[Matrixty] ✅ Removed ${removedCount} tags via × buttons (reactClick)`);
      return removedCount;
    }

    // ═══ STRATEGY B: Tìm tag chips có nút con bất kỳ ═══
    const allElements = tagsSection.querySelectorAll('div, span, li');
    const tagChips = Array.from(allElements).filter(el => {
      const rect = el.getBoundingClientRect();
      if (rect.width < 50 || rect.width > 300 || rect.height < 20 || rect.height > 50) return false;
      const hasText = (el.textContent || '').trim().length > 1;
      const hasBtn = el.querySelector('button, svg, [role="button"]') !== null;
      if (el.querySelector('input')) return false;
      return hasText && hasBtn;
    });

    if (tagChips.length >= 2) {
      console.log(`[Matrixty] Found ${tagChips.length} tag chips with close buttons`);
      // Click one by one with re-query
      const maxIter = tagChips.length + 5;
      for (let iter = 0; iter < maxIter; iter++) {
        const freshChips = Array.from(tagsSection.querySelectorAll('div, span, li')).filter(el => {
          const rect = el.getBoundingClientRect();
          if (rect.width < 50 || rect.width > 300 || rect.height < 20 || rect.height > 50) return false;
          if (el.querySelector('input')) return false;
          return (el.textContent || '').trim().length > 1 && el.querySelector('button, svg, [role="button"]');
        });
        if (freshChips.length === 0) break;
        const btn = freshChips[freshChips.length - 1].querySelector('button, svg, [role="button"]');
        if (btn) { reactClick(btn); removedCount++; }
        await humanDelay(250, 400);
      }
      if (removedCount > 0) {
        await humanDelay(300, 500);
        console.log(`[Matrixty] ✅ Removed ${removedCount} tags via chip buttons`);
        return removedCount;
      }
    }

    // ═══ STRATEGY C: Aria-label based search trên TOÀN PAGE ═══
    const globalRemoveBtns = document.querySelectorAll(
      'button[aria-label*="remove tag" i], button[aria-label*="Remove tag" i], ' +
      'button[aria-label*="remove" i][class*="tag" i], ' +
      '[data-testid*="tag-remove" i], [data-testid*="remove-tag" i]'
    );
    if (globalRemoveBtns.length > 0) {
      console.log(`[Matrixty] Found ${globalRemoveBtns.length} tag remove buttons globally`);
      const maxIter = globalRemoveBtns.length + 5;
      for (let iter = 0; iter < maxIter; iter++) {
        const fresh = document.querySelectorAll(
          'button[aria-label*="remove tag" i], button[aria-label*="Remove tag" i], ' +
          'button[aria-label*="remove" i][class*="tag" i], ' +
          '[data-testid*="tag-remove" i], [data-testid*="remove-tag" i]'
        );
        if (fresh.length === 0) break;
        reactClick(fresh[fresh.length - 1]);
        removedCount++;
        await humanDelay(250, 400);
      }
      await humanDelay(300, 500);
      return removedCount;
    }

    // ═══ STRATEGY D: Focus input → Backspace ═══
    const tagInput = tagsSection.querySelector('input') || (container.tagName === 'INPUT' ? container : null);
    if (tagInput) {
      console.log('[Matrixty] Trying Backspace method to clear tags...');
      tagInput.focus();
      reactClick(tagInput);
      await humanDelay(100, 200);

      const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      if (nativeSetter) nativeSetter.call(tagInput, '');
      else tagInput.value = '';
      tagInput.dispatchEvent(new Event('input', { bubbles: true }));
      await humanDelay(100, 150);

      // 30 Backspaces (13 tags × 2 + buffer) — with periodic delays
      for (let i = 0; i < 30; i++) {
        ['keydown', 'keypress', 'keyup'].forEach(evtType => {
          tagInput.dispatchEvent(new KeyboardEvent(evtType, {
            key: 'Backspace', code: 'Backspace', keyCode: 8, which: 8,
            bubbles: true, cancelable: true,
          }));
        });
        removedCount++;
        await humanDelay(100, 180); // slightly longer per Backspace for React
      }
      await humanDelay(300, 500);
      return removedCount;
    }

    console.warn('[Matrixty] Could not find way to clear existing tags');
    return 0;
  }

  /**
   * Paste Etsy tags — v9.3: CDP as PRIMARY, main world as fallback
   * Flow: xóa tags cũ → focus tag input → CDP types each tag + comma/Enter
   * CDP simulates REAL keyboard input — React MUST process it correctly.
   */
  async function pasteEtsyTags(container, tags) {
    if (!container || !tags || tags.length === 0) {
      console.warn('[Matrixty v1.2.6] pasteEtsyTags: missing container or tags');
      return false;
    }

    try {
      // ═══ Find tag input ═══
      let tagInput = null;
      const tagsSection = findTagsSectionByHeading();

      if (tagsSection) {
        tagInput = tagsSection.querySelector('input[type="text"], input:not([type])');
      }
      if (!tagInput) {
        tagInput = container.querySelector('input[placeholder*="Shape" i]')
          || container.querySelector('input[placeholder*="tag" i]')
          || container.querySelector('input[placeholder*="Add a tag" i]')
          || container.querySelector('input')
          || (container.tagName === 'INPUT' ? container : null)
          || container;
      }

      console.log('[Matrixty v1.2.6] Tag input found:', tagInput.tagName, tagInput.placeholder || tagInput.id || tagInput.name);

      const validTags = tags.map(t => t.trim()).filter(Boolean).slice(0, 13);
      const tagString = validTags.join(', ');
      console.log(`[Matrixty v1.2.6] Pasting ${validTags.length} tags: "${tagString.substring(0, 60)}..."`);
      showNotification(`Adding ${validTags.length} tags...`, 'info');

      // ═══════════════════════════════════════════════════════════════════
      // v1.2.6: Use CDP (Chrome Debugger Protocol) to type the comma string
      // into the tag input. CDP simulates REAL keyboard typing which React
      // processes correctly. nativeSetter sets DOM but React state is stale.
      // Then click Add button via CDP too.
      // ═══════════════════════════════════════════════════════════════════

      // Build unique selector for CDP to focus the correct element
      const uid = 'mtx-tag-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
      tagInput.setAttribute('data-mtx-cdp', uid);
      const cdpSelector = `[data-mtx-cdp="${uid}"]`;

      // Find Add button and mark it too
      const addBtn = findAddButton(tagInput);
      let addBtnSelector = null;
      if (addBtn) {
        const addUid = 'mtx-add-' + Date.now();
        addBtn.setAttribute('data-mtx-cdp-add', addUid);
        addBtnSelector = `[data-mtx-cdp-add="${addUid}"]`;
        console.log('[Matrixty v1.2.6] Add button found, marked with selector');
      }

      // Send CDP_TAGS_SIMPLE to background — does everything via debugger
      const result = await new Promise((resolve) => {
        chrome.runtime.sendMessage({
          type: 'CDP_TAGS_SIMPLE',
          inputSelector: cdpSelector,
          addBtnSelector: addBtnSelector,
          tagString: tagString,
        }, (response) => {
          // Cleanup markers
          try { tagInput.removeAttribute('data-mtx-cdp'); } catch(e) {}
          try { if (addBtn) addBtn.removeAttribute('data-mtx-cdp-add'); } catch(e) {}

          if (chrome.runtime.lastError) {
            console.warn('[Matrixty v1.2.6] CDP_TAGS_SIMPLE error:', chrome.runtime.lastError.message);
            resolve({ ok: false });
            return;
          }
          resolve(response || { ok: false });
        });
        // Timeout
        setTimeout(() => {
          try { tagInput.removeAttribute('data-mtx-cdp'); } catch(e) {}
          try { if (addBtn) addBtn.removeAttribute('data-mtx-cdp-add'); } catch(e) {}
          resolve({ ok: false });
        }, 15000);
      });

      console.log('[Matrixty v1.2.6] CDP_TAGS_SIMPLE result:', result);

      if (result?.ok) {
        showNotification('Added tags', 'success');
        return true;
      }

      // Fallback: return false so DIRECT_FILL can try
      console.warn('[Matrixty v1.2.6] CDP_TAGS_SIMPLE failed, will fall back to DIRECT_FILL');
      return false;
    } catch (error) {
      console.error('[Matrixty v1.2.6] Tag paste error:', error);
      return false;
    }
  }

  /**
   * Đếm số tag chips hiện có trong 1 scope (để verify tag có được add hay không)
   */
  function findTagChipsCount(scope) {
    if (!scope) return 0;
    // Count elements that look like tag chips (have × button or remove role)
    const chips = scope.querySelectorAll('div, span, li');
    let count = 0;
    for (const chip of chips) {
      const rect = chip.getBoundingClientRect();
      if (rect.width < 50 || rect.width > 350 || rect.height < 18 || rect.height > 50) continue;
      // Must have text content AND a close button/icon
      const text = (chip.textContent || '').trim();
      if (text.length < 2 || text.length > 60) continue;
      // Has × or remove button inside?
      const hasClose = text.includes('×') || text.includes('✕') ||
                       chip.querySelector('svg') ||
                       chip.querySelector('button') ||
                       chip.querySelector('[role="button"]');
      if (hasClose) count++;
    }
    // Also check: "X left" text — parse the number to infer tag count
    const leftText = scope.textContent || '';
    const leftMatch = leftText.match(/(\d+)\s*left/i);
    if (leftMatch) {
      const leftCount = parseInt(leftMatch[1]);
      const inferredTags = 13 - leftCount;
      console.log(`[Matrixty v7.0.7] Tag count: chips=${count}, inferred from "${leftMatch[0]}"=${inferredTags}`);
      return Math.max(count, inferredTags);
    }
    return count;
  }

  /**
   * Tìm nút "Add" gần tag input (Etsy có nút Add bên cạnh input)
   */
  function findAddButton(tagInput) {
    if (!tagInput) return null;

    // 1. Tìm trong cùng parent
    let parent = tagInput.parentElement;
    for (let d = 0; d < 5 && parent; d++) {
      // Look for button/span/div with text "Add" immediately near the input
      const candidates = parent.querySelectorAll('button, [role="button"], span, div');
      for (const el of candidates) {
        const txt = (el.textContent || '').trim();
        if (txt === 'Add' && el !== tagInput) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 10 && rect.width < 200 && rect.height > 10) {
            return el;
          }
        }
      }
      parent = parent.parentElement;
    }

    // 2. Tìm sibling gần input
    let sibling = tagInput.nextElementSibling;
    while (sibling) {
      const txt = (sibling.textContent || '').trim();
      if (txt === 'Add') return sibling;
      sibling = sibling.nextElementSibling;
    }

    return null;
  }

  /**
   * Tìm Tags section bằng heading "Tags" — phân biệt với Materials/Categories
   */
  function findTagsSectionByHeading() {
    const allHeadings = document.querySelectorAll('h1, h2, h3, h4, h5, label, legend, p, span, div');
    for (const h of allHeadings) {
      const txt = (h.textContent || '').trim();
      // Must be exactly "Tags" or "Tags *" — not "Materials", not "Search Tags"
      if (!/^Tags\s*\*?$/.test(txt)) continue;
      // Verify this heading is about tags (should have sibling/child text about "13 tags")
      const parent = h.parentElement;
      if (!parent) continue;
      const parentText = parent.textContent || '';
      if (parentText.includes('13 tags') || parentText.includes('tag') || parentText.includes('Shape, color')) {
        // Go up to find a section containing both this heading AND an input
        let section = parent;
        for (let d = 0; d < 6 && section; d++) {
          const hasInput = section.querySelector('input[type="text"], input:not([type])');
          if (hasInput && section.children.length >= 2) {
            console.log(`[Matrixty v7.0.5] findTagsSectionByHeading: found at depth ${d}, ${section.tagName}`);
            return section;
          }
          section = section.parentElement;
        }
      }
    }
    return null;
  }

  /**
   * Paste Amazon search terms (semicolon-separated in one field, matching Idea Lab format)
   */
  async function pasteAmazonSearchTerms(element, tags) {
    if (!element || !tags) return false;
    const text = Array.isArray(tags) ? tags.join('; ') : tags;
    return await clipboardPaste(element, text);
  }

  // ========== SIDEBAR UI ==========

  function createSidebar(payload) {
    if (document.getElementById('mtx-listing-panel')) removeSidebar();

    LISTING.ideaData = payload;
    LISTING.platform = payload.platform || detectListingPlatform() || 'unknown';
    LISTING.auth = payload.auth || LISTING.auth;
    LISTING.generatedData = payload.generatedData || null;

    detectListingFields();

    const sidebar = document.createElement('div');
    sidebar.id = 'mtx-listing-panel';
    sidebar.style.cssText = `
      position: fixed !important;
      top: 0 !important; right: 0 !important;
      width: 400px !important; height: 100vh !important;
      background: ${COLORS.white} !important;
      border-left: 2px solid ${COLORS.listing} !important;
      box-shadow: -4px 0 20px rgba(123,31,162,0.15) !important;
      z-index: 999999 !important;
      animation: mtxSlideIn 0.3s ease-out !important;
      display: flex !important; flex-direction: column !important;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
    `;

    // === HEADER ===
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 14px 16px !important;
      background: linear-gradient(135deg, ${COLORS.listing} 0%, #9C27B0 100%) !important;
      display: flex !important; justify-content: space-between !important; align-items: center !important;
      flex-shrink: 0 !important;
    `;

    const headerLeft = document.createElement('div');
    headerLeft.style.cssText = `flex: 1 !important;`;

    const headerTitle = document.createElement('div');
    headerTitle.style.cssText = `color: white !important; font-size: 13px !important; font-weight: 700 !important;`;
    headerTitle.textContent = 'Matrixty Auto-Fill v7.0.0';

    const headerSub = document.createElement('div');
    headerSub.style.cssText = `color: rgba(255,255,255,0.7) !important; font-size: 11px !important; margin-top: 2px !important;`;
    const ideaName = payload.product_name || payload.assignment_title || 'Idea';
    headerSub.textContent = ideaName.length > 40 ? ideaName.substring(0, 40) + '...' : ideaName;

    headerLeft.appendChild(headerTitle);
    headerLeft.appendChild(headerSub);

    const platformBadge = document.createElement('span');
    platformBadge.style.cssText = `
      padding: 3px 10px !important; border-radius: 12px !important;
      font-size: 10px !important; font-weight: 700 !important;
      background: rgba(255,255,255,0.2) !important; color: white !important;
      margin-right: 8px !important;
    `;
    platformBadge.textContent = LISTING.platform === 'etsy' ? 'Etsy' : LISTING.platform === 'amazon' ? 'Amazon' : '--';

    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = `
      background: rgba(255,255,255,0.2) !important; border: none !important;
      color: white !important; font-size: 16px !important; cursor: pointer !important;
      width: 28px !important; height: 28px !important; border-radius: 50% !important;
      display: flex !important; align-items: center !important; justify-content: center !important;
    `;
    closeBtn.innerHTML = '&times;';
    closeBtn.onclick = removeSidebar;

    header.appendChild(headerLeft);
    header.appendChild(platformBadge);
    header.appendChild(closeBtn);

    // === PROGRESS BAR ===
    const progressBar = document.createElement('div');
    progressBar.id = 'mtx-progress-bar';
    progressBar.style.cssText = `
      padding: 8px 16px !important; background: #FFF3E0 !important;
      border-bottom: 1px solid #FFE0B2 !important;
      font-size: 11px !important; color: #E65100 !important; font-weight: 500 !important;
      display: none !important; flex-shrink: 0 !important;
    `;

    // === CONTENT ===
    const content = document.createElement('div');
    content.id = 'mtx-content';
    content.style.cssText = `flex: 1 !important; overflow-y: auto !important; padding: 12px 16px !important;`;

    // Detected fields info
    const fieldsInfo = document.createElement('div');
    fieldsInfo.style.cssText = `
      padding: 8px 12px !important; background: #E8F5E9 !important;
      border-radius: 6px !important; margin-bottom: 12px !important;
      font-size: 11px !important; color: ${COLORS.success} !important;
    `;
    const detectedCount = Object.keys(LISTING.detectedFields).filter(k =>
      k === 'bullet_points' ? LISTING.detectedFields[k]?.length > 0 : !!LISTING.detectedFields[k]
    ).length;
    fieldsInfo.textContent = `Detected ${detectedCount} form field(s) on this page`;
    content.appendChild(fieldsInfo);

    // Field cards
    const data = LISTING.generatedData || {};
    const fieldConfigs = getFieldConfigs(data);
    fieldConfigs.forEach(config => content.appendChild(createFieldCard(config)));

    // === ACTION BAR ===
    const actionBar = document.createElement('div');
    actionBar.style.cssText = `
      padding: 12px 16px !important;
      border-top: 2px solid ${COLORS.border} !important;
      display: flex !important; gap: 8px !important;
      background: ${COLORS.white} !important; flex-shrink: 0 !important;
    `;

    const pasteAllBtn = document.createElement('button');
    pasteAllBtn.id = 'mtx-paste-all-btn';
    pasteAllBtn.style.cssText = `
      flex: 2 !important; padding: 12px !important;
      background: ${COLORS.listing} !important; color: ${COLORS.white} !important;
      border: none !important; border-radius: 8px !important;
      font-size: 13px !important; font-weight: 700 !important;
      cursor: pointer !important; transition: all 0.2s !important;
    `;
    pasteAllBtn.textContent = 'Paste All';
    pasteAllBtn.onclick = () => pasteAllFields();

    const rescanBtn = document.createElement('button');
    rescanBtn.style.cssText = `
      flex: 1 !important; padding: 12px !important;
      background: ${COLORS.bg} !important; color: ${COLORS.text} !important;
      border: 1px solid ${COLORS.border} !important; border-radius: 8px !important;
      font-size: 12px !important; font-weight: 600 !important; cursor: pointer !important;
    `;
    rescanBtn.textContent = 'Re-scan';
    rescanBtn.onclick = () => {
      detectListingFields();
      showNotification('Re-scanned form fields', 'info');
    };

    actionBar.appendChild(pasteAllBtn);
    actionBar.appendChild(rescanBtn);

    sidebar.appendChild(header);
    sidebar.appendChild(progressBar);
    sidebar.appendChild(content);
    sidebar.appendChild(actionBar);

    injectStyles();
    document.body.appendChild(sidebar);
    LISTING.sidebarOpen = true;
  }

  function getFieldConfigs(data) {
    const platform = LISTING.platform;
    const configs = [];

    configs.push({ key: 'title', label: 'Title', value: data.title || '', icon: 'T', large: false });

    if (platform === 'etsy') {
      configs.push({
        key: 'tags',
        label: `Tags (${Array.isArray(data.tags) ? data.tags.length : 0}/13)`,
        value: Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || ''),
        icon: '#', large: false,
      });
    } else if (platform === 'amazon') {
      configs.push({
        key: 'search_terms',
        label: 'Search Terms',
        value: Array.isArray(data.tags) ? data.tags.join(', ') : (data.tags || ''),
        icon: '#', large: false,
      });
    }

    configs.push({ key: 'description', label: 'Description', value: data.description || '', icon: 'D', large: true });

    if (platform === 'amazon' && data.bullet_points && data.bullet_points.length > 0) {
      data.bullet_points.forEach((bp, idx) => {
        configs.push({ key: `bullet_point_${idx}`, label: `Bullet Point ${idx + 1}`, value: bp || '', icon: `${idx + 1}`, large: false });
      });
    }

    return configs;
  }

  function createFieldCard(config) {
    const card = document.createElement('div');
    card.style.cssText = `
      background: ${COLORS.bg} !important; border: 1px solid ${COLORS.border} !important;
      border-radius: 8px !important; padding: 10px 12px !important; margin-bottom: 10px !important;
    `;

    const headerRow = document.createElement('div');
    headerRow.style.cssText = `
      display: flex !important; align-items: center !important;
      justify-content: space-between !important; margin-bottom: 6px !important;
    `;

    const labelDiv = document.createElement('div');
    labelDiv.style.cssText = `display: flex !important; align-items: center !important; gap: 6px !important;`;

    const icon = document.createElement('span');
    icon.style.cssText = `
      width: 20px !important; height: 20px !important;
      background: ${COLORS.listing} !important; color: white !important;
      border-radius: 4px !important; font-size: 10px !important; font-weight: 700 !important;
      display: flex !important; align-items: center !important; justify-content: center !important;
    `;
    icon.textContent = config.icon;

    const label = document.createElement('span');
    label.style.cssText = `
      font-size: 11px !important; font-weight: 700 !important;
      color: ${COLORS.text} !important; text-transform: uppercase !important; letter-spacing: 0.5px !important;
    `;
    label.textContent = config.label;

    labelDiv.appendChild(icon);
    labelDiv.appendChild(label);

    const pasteBtn = document.createElement('button');
    pasteBtn.style.cssText = `
      padding: 4px 10px !important; background: ${COLORS.listing} !important; color: white !important;
      border: none !important; border-radius: 4px !important;
      font-size: 10px !important; font-weight: 600 !important; cursor: pointer !important;
    `;
    pasteBtn.textContent = 'Paste';
    pasteBtn.onclick = () => pasteSingleField(config.key, getFieldTextareaValue(config.key));

    headerRow.appendChild(labelDiv);
    headerRow.appendChild(pasteBtn);

    const textarea = document.createElement('textarea');
    textarea.id = `mtx-field-${config.key}`;
    textarea.value = config.value;
    textarea.style.cssText = `
      width: 100% !important; padding: 8px 10px !important;
      border: 1px solid ${COLORS.border} !important; border-radius: 6px !important;
      font-size: 12px !important; font-family: -apple-system, monospace !important;
      resize: vertical !important;
      min-height: ${config.large ? '120px' : '50px'} !important;
      max-height: 200px !important;
      background: ${COLORS.white} !important; color: ${COLORS.text} !important;
      line-height: 1.5 !important;
    `;
    if (!config.value) {
      textarea.placeholder = config.key === 'description' ? 'AI will generate...' : 'No data yet';
    }

    card.appendChild(headerRow);
    card.appendChild(textarea);
    return card;
  }

  function getFieldTextareaValue(key) {
    const textarea = document.getElementById(`mtx-field-${key}`);
    return textarea ? textarea.value : '';
  }

  // ========== PASTE ACTIONS ==========

  async function pasteSingleField(fieldKey, value) {
    if (!value || value.trim() === '') {
      showNotification(`No data for ${fieldKey}`, 'error');
      return;
    }
    if (LISTING.isPasting) {
      showNotification('Paste in progress...', 'warning');
      return;
    }

    LISTING.isPasting = true;
    updateProgress(`Pasting ${fieldKey}...`);

    try {
      if (fieldKey === 'tags' && LISTING.platform === 'etsy') {
        const tagContainer = LISTING.detectedFields.tags?.element;
        if (!tagContainer) { showNotification('Cannot find tags input', 'error'); return; }
        const tags = value.split(',').map(t => t.trim()).filter(Boolean);
        await pasteEtsyTags(tagContainer, tags);
      } else if (fieldKey === 'search_terms' && LISTING.platform === 'amazon') {
        const field = LISTING.detectedFields.search_terms?.element;
        if (!field) { showNotification('Cannot find search terms field', 'error'); return; }
        await pasteAmazonSearchTerms(field, value);
      } else if (fieldKey.startsWith('bullet_point_')) {
        const idx = parseInt(fieldKey.replace('bullet_point_', ''));
        const bulletFields = LISTING.detectedFields.bullet_points;
        if (!bulletFields || !bulletFields[idx]) { showNotification(`Cannot find bullet point ${idx + 1}`, 'error'); return; }
        await clipboardPaste(bulletFields[idx].element, value);
      } else {
        const field = LISTING.detectedFields[fieldKey]?.element;
        if (!field) { showNotification(`Cannot find ${fieldKey} field. Try Re-scan.`, 'error'); return; }
        await clipboardPaste(field, value);
      }
      showNotification(`Pasted ${fieldKey}`, 'success');
    } catch (err) {
      console.error(`[Matrixty v7.0.0] Error pasting ${fieldKey}:`, err);
      showNotification(`Error pasting ${fieldKey}`, 'error');
    } finally {
      LISTING.isPasting = false;
      hideProgress();
    }
  }

  async function pasteAllFields() {
    if (LISTING.isPasting) { showNotification('Paste already in progress', 'warning'); return; }

    const pasteAllBtn = document.getElementById('mtx-paste-all-btn');
    if (pasteAllBtn) { pasteAllBtn.disabled = true; pasteAllBtn.textContent = 'Pasting...'; }

    LISTING.isPasting = true;
    const filledFields = [];
    const platform = LISTING.platform;

    try {
      // 1. Title
      const titleValue = getFieldTextareaValue('title');
      if (titleValue && LISTING.detectedFields.title) {
        updateProgress('Pasting title...');
        await clipboardPaste(LISTING.detectedFields.title.element, titleValue);
        filledFields.push('title');
        await humanDelay(300, 700);
      }

      // 2. Tags / Search terms
      if (platform === 'etsy' && LISTING.detectedFields.tags) {
        const tagsValue = getFieldTextareaValue('tags');
        if (tagsValue) {
          updateProgress('Pasting tags...');
          const tags = tagsValue.split(',').map(t => t.trim()).filter(Boolean);
          await pasteEtsyTags(LISTING.detectedFields.tags.element, tags);
          filledFields.push('tags');
          await humanDelay(300, 700);
        }
      } else if (platform === 'amazon' && LISTING.detectedFields.search_terms) {
        const searchValue = getFieldTextareaValue('search_terms');
        if (searchValue) {
          updateProgress('Pasting search terms...');
          await pasteAmazonSearchTerms(LISTING.detectedFields.search_terms.element, searchValue);
          filledFields.push('search_terms');
          await humanDelay(300, 700);
        }
      }

      // 3. Description
      const descValue = getFieldTextareaValue('description');
      if (descValue && LISTING.detectedFields.description) {
        updateProgress('Pasting description...');
        await clipboardPaste(LISTING.detectedFields.description.element, descValue);
        filledFields.push('description');
        await humanDelay(300, 700);
      }

      // 4. Bullet points (Amazon)
      if (platform === 'amazon' && LISTING.detectedFields.bullet_points) {
        for (let i = 0; i < LISTING.detectedFields.bullet_points.length; i++) {
          const bpValue = getFieldTextareaValue(`bullet_point_${i}`);
          if (bpValue) {
            updateProgress(`Pasting bullet point ${i + 1}...`);
            await clipboardPaste(LISTING.detectedFields.bullet_points[i].element, bpValue);
            filledFields.push(`bullet_point_${i}`);
            await humanDelay(300, 700);
          }
        }
      }

      // 5. SKU (Etsy) — v9.3: Navigate to Price & Inventory tab if needed
      const skuVal = LISTING.ideaData?.sku || '';
      if (skuVal && platform === 'etsy') {
        updateProgress('Filling SKU...');
        const currentHash = window.location.hash;
        const skuField = await revealAndDetectSkuField();
        if (skuField) {
          await clipboardPaste(skuField.element, skuVal);
          filledFields.push('sku');
          await humanDelay(180, 450);
          // Stay on current tab — navigating back triggers "Discard changes?" dialog
        }
      }

      // Log
      LISTING.lastFill = {
        timestamp: new Date().toISOString(),
        platform, filledFields,
        ideaId: LISTING.ideaData?.idea_id,
      };
      logFillToDatabase(filledFields);

      updateProgress(`Done! Pasted ${filledFields.length} field(s)`);
      showNotification(`Pasted ${filledFields.length} field(s) successfully!`, 'success');
      setTimeout(() => hideProgress(), 3000);
    } catch (err) {
      console.error('[Matrixty v7.0.0] Paste all error:', err);
      showNotification(`Error: ${err.message}`, 'error');
    } finally {
      LISTING.isPasting = false;
      if (pasteAllBtn) { pasteAllBtn.disabled = false; pasteAllBtn.textContent = 'Paste All'; }
    }
  }

  // ========== PROGRESS & NOTIFICATIONS ==========

  function updateProgress(text) {
    const bar = document.getElementById('mtx-progress-bar');
    if (bar) { bar.style.display = 'block'; bar.textContent = text; }
  }

  function hideProgress() {
    const bar = document.getElementById('mtx-progress-bar');
    if (bar) bar.style.display = 'none';
  }

  function showNotification(text, type = 'info') {
    const colors = { success: COLORS.success, error: COLORS.danger, warning: COLORS.warning, info: COLORS.secondary };
    const n = document.createElement('div');
    n.style.cssText = `
      position: fixed !important; bottom: 20px !important; right: 420px !important;
      padding: 12px 18px !important; background: ${colors[type] || COLORS.secondary} !important;
      color: white !important; border-radius: 8px !important;
      font-size: 13px !important; font-weight: 600 !important;
      z-index: 999998 !important; animation: mtxNotification 3s ease !important;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25) !important;
      font-family: -apple-system, BlinkMacSystemFont, sans-serif !important;
    `;
    n.textContent = text;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3000);
  }

  function removeSidebar() {
    const panel = document.getElementById('mtx-listing-panel');
    if (panel) {
      panel.style.animation = 'mtxSlideIn 0.3s ease-out reverse';
      setTimeout(() => { panel.remove(); LISTING.sidebarOpen = false; }, 300);
    }
  }

  function injectStyles() {
    if (document.getElementById('mtx-listing-styles-v6')) return;
    const style = document.createElement('style');
    style.id = 'mtx-listing-styles-v6';
    style.textContent = `
      @keyframes mtxSlideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes mtxNotification {
        0% { transform: translateY(-20px); opacity: 0; }
        10% { transform: translateY(0); opacity: 1; }
        85% { transform: translateY(0); opacity: 1; }
        100% { transform: translateY(-20px); opacity: 0; }
      }
    `;
    document.head.appendChild(style);
  }

  // ========== v7.0.0: EXTRACT ASIN / LINK FROM PAGE ==========

  function extractAsinFromPage() {
    const url = window.location.href;
    // Method 1: URL parameter ?asin=B0XXXXXXXX
    const urlMatch = url.match(/[?&]asin=([A-Z0-9]{10})/i);
    if (urlMatch) return urlMatch[1].toUpperCase();

    // Method 2: URL path /dp/B0XXXXXXXX or /product/B0XXXXXXXX
    const pathMatch = url.match(/\/(?:dp|product|offer-listing)\/([A-Z0-9]{10})/i);
    if (pathMatch) return pathMatch[1].toUpperCase();

    // Method 3: Page content — look for ASIN in the DOM
    // Amazon Seller Central often has ASIN in breadcrumb, title, or data attributes
    const bodyText = document.body?.innerText || '';
    const asinInPage = bodyText.match(/\bASIN[:\s]*([A-Z0-9]{10})\b/i);
    if (asinInPage) return asinInPage[1].toUpperCase();

    // Method 4: Meta tags or data attributes
    const metaAsin = document.querySelector('[data-asin]')?.getAttribute('data-asin');
    if (metaAsin && /^[A-Z0-9]{10}$/i.test(metaAsin)) return metaAsin.toUpperCase();

    // Method 5: Input fields with ASIN value
    const inputs = document.querySelectorAll('input[name*="asin" i], input[id*="asin" i]');
    for (const inp of inputs) {
      if (inp.value && /^[A-Z0-9]{10}$/i.test(inp.value.trim())) return inp.value.trim().toUpperCase();
    }

    // Method 6: Seller Central — ASIN in header/breadcrumb/spans (B0XXXXXXXX pattern)
    const candidates = document.querySelectorAll('span, div, td, th, a, h1, h2, h3');
    for (const el of candidates) {
      const t = (el.textContent || '').trim();
      if (/^B0[A-Z0-9]{8}$/i.test(t)) return t.toUpperCase();
    }

    // Method 7: SKU / ASIN mapping in Seller Central tables
    const allTds = document.querySelectorAll('td, dd, span[class*="asin" i]');
    for (const td of allTds) {
      const t = (td.textContent || '').trim();
      if (/^[A-Z0-9]{10}$/.test(t) && t.startsWith('B0')) return t;
    }

    return '';
  }

  function extractEtsyListingLink() {
    const url = window.location.href;
    // Etsy listing URL: https://www.etsy.com/listing/XXXXXXXX/...
    const match = url.match(/(https?:\/\/[^/]*etsy\.com\/listing\/\d+)/i);
    if (match) return match[1];
    // Etsy manage listing: /your/shops/.../tools/listings/XXXX
    const manageMatch = url.match(/\/your\/shops\/[^/]+\/tools\/listings\/(\d+)/i);
    if (manageMatch) return `https://www.etsy.com/listing/${manageMatch[1]}`;
    return '';
  }

  // ========== DATABASE LOGGING ==========

  function logFillToDatabase(filledFields) {
    const userId = LISTING.auth?.userId || LISTING.ideaData?.auth?.userId;
    const ideaId = LISTING.ideaData?.idea_id;
    if (!userId || !ideaId) return;

    try {
      chrome.runtime.sendMessage({
        type: 'LOG_LISTING_FILL',
        payload: {
          user_id: userId,
          idea_id: ideaId,
          assignment_id: LISTING.ideaData?.assignment_id || null,
          platform: LISTING.platform,
          generated_data: LISTING.generatedData || {},
          filled_fields: filledFields,
          page_url: window.location.href,
        }
      }, (r) => { if (chrome.runtime.lastError) console.warn('[Matrixty] LOG_LISTING_FILL error:', chrome.runtime.lastError.message); else console.log('[Matrixty v7.0.0] Logged fill:', r); });
    } catch(e) { /* extension context invalidated */ }
  }

  // ========== v9.3: REVEAL + DETECT SKU FIELD (Etsy) ==========
  // On Etsy, SKU field may be hidden behind "+ Add SKU" button.
  // This function clicks that button to reveal the input, then detects it.
  async function revealAndDetectSkuField() {
    // Already detected and still in DOM?
    if (LISTING.detectedFields.sku) {
      const el = LISTING.detectedFields.sku.element;
      if (el && el.isConnected && el.getBoundingClientRect().width > 0) {
        return LISTING.detectedFields.sku;
      }
      LISTING.detectedFields.sku = null;
    }

    // v1.2.5: Helper to check if an input is a Tag/Title/Description field (should NOT be used for SKU)
    const isTagOrOtherField = (inp) => {
      const ph = (inp.placeholder || '').toLowerCase();
      const name = (inp.name || '').toLowerCase();
      const id = (inp.id || '').toLowerCase();
      const ariaLabel = (inp.getAttribute('aria-label') || '').toLowerCase();
      // Exclude tag inputs
      if (ph.includes('shape') || ph.includes('tag') || ph.includes('color') || ph.includes('function')) return true;
      if (name.includes('tag') || id.includes('tag') || ariaLabel.includes('tag')) return true;
      // Exclude title inputs
      if (name.includes('title') || id.includes('title') || ariaLabel.includes('title')) return true;
      // Exclude inputs inside Matrixty sidebar
      if (inp.closest('#mtx-listing-panel') || inp.closest('[id^="mtx-"]')) return true;
      // Exclude inputs inside Tags section (has "13 tags" or "left" text)
      const section = inp.closest('div, section');
      if (section) {
        const sText = section.textContent || '';
        if (sText.includes('13 tags') || sText.includes('Add up to 13') || /\d+\s*left/.test(sText)) return true;
      }
      return false;
    };

    // Helper: try to find SKU input on current view
    const tryDetectSku = () => {
      // Try specific selectors first
      let found = detectFieldElement(ETSY_SELECTORS.sku);
      if (found && !isTagOrOtherField(found.element)) return found;
      // Try label-based search
      found = findInputNearLabel('SKU');
      if (found && !isTagOrOtherField(found.element)) return found;
      // Brute force: look for any visible input near "SKU" text
      // CRITICAL: Exclude tag/title inputs and Matrixty sidebar
      const allInputs = document.querySelectorAll('input[type="text"], input:not([type])');
      for (const inp of allInputs) {
        if (isTagOrOtherField(inp)) continue;
        const rect = inp.getBoundingClientRect();
        if (rect.width < 50 || rect.height < 5) continue;
        // Check if this input is near SKU text (but NOT inside Matrixty sidebar)
        const parent = inp.closest('div, section, fieldset, li');
        if (parent && (parent.textContent || '').toLowerCase().includes('sku') && !parent.closest('#mtx-listing-panel')) {
          // Extra check: the parent should NOT contain tag-related text
          const pText = (parent.textContent || '').toLowerCase();
          if (pText.includes('13 tags') || pText.includes('add up to 13') || /\d+\s*left/.test(pText)) continue;
          console.log('[Matrixty v1.2.5] Found input near SKU text:', inp.tagName, inp.name, inp.id, 'maxLength=', inp.maxLength);
          return { element: inp, selector: 'bruteforce:sku-near-text' };
        }
      }
      return null;
    };

    // Helper: find and click "+ Add SKU" button
    // CRITICAL: Prefer <BUTTON> over <DIV> — DIV container has extra text like "Add SKUSKU0/32"
    const clickAddSkuButton = async () => {
      // v1.2.5: Helper to click button AND trigger React fiber onClick
      const clickWithReact = async (el) => {
        el.click();
        reactClick(el);
        // Try React fiber onClick (works from content script because we access the DOM element's properties)
        try {
          const pk = Object.keys(el).find(k => k.startsWith('__reactProps$') || k.startsWith('__reactEvents$'));
          if (pk && el[pk]?.onClick) {
            console.log('[Matrixty v1.2.5] Triggering React fiber onClick on Add SKU');
            el[pk].onClick(new MouseEvent('click', { bubbles: true }));
          }
        } catch(e) {}
        await humanDelay(600, 1200); // Extra wait for React to re-render
      };

      // Strategy 1: Find actual <button> with "Add SKU" text (flexible matching)
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        const text = (btn.textContent || '').trim().toLowerCase().replace(/\s+/g, ' ');
        if (text === 'add sku' || text === '+ add sku' || text.match(/^\+?\s*add\s+sku$/)) {
          const rect = btn.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            console.log(`[Matrixty v1.2.5] Clicking BUTTON "Add SKU": "${btn.textContent.trim()}"`);
            await clickWithReact(btn);
            return true;
          }
        }
      }

      // Strategy 2: Find button/a with short text containing "add sku" (<20 chars)
      const clickable = document.querySelectorAll('button, a, [role="button"]');
      for (const el of clickable) {
        const text = (el.textContent || '').trim();
        if (text.length < 20 && text.toLowerCase().includes('add sku')) {
          const rect = el.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            console.log(`[Matrixty v1.2.5] Clicking <${el.tagName}> "${text}"`);
            await clickWithReact(el);
            return true;
          }
        }
      }

      // Strategy 3: Find SMALLEST element containing "add sku" text
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
      if (bestEl && bestLen < 25) {
        console.log(`[Matrixty v1.2.5] Clicking smallest match: <${bestEl.tagName}> "${bestEl.textContent.trim()}" (len=${bestLen})`);
        await clickWithReact(bestEl);
        return true;
      }

      // Strategy 4: aria-label
      const ariaBtn = document.querySelector('[aria-label*="SKU" i], [aria-label*="sku" i]');
      if (ariaBtn) {
        const rect = ariaBtn.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          console.log('[Matrixty v1.2.5] Found Add SKU via aria-label');
          await clickWithReact(ariaBtn);
          return true;
        }
      }

      return false;
    };

    // Helper: navigate to a specific Etsy listing editor tab
    const navigateToTab = async (tabText) => {
      // Strategy 1: Look for tab links by text
      const allLinks = document.querySelectorAll('a, button, [role="tab"]');
      for (const link of allLinks) {
        const text = (link.textContent || '').trim().toLowerCase();
        if (text.includes(tabText.toLowerCase())) {
          const rect = link.getBoundingClientRect();
          if (rect.width > 0) {
            console.log(`[Matrixty v9.3] Clicking tab: "${link.textContent.trim()}" (${link.tagName}, href=${link.href || 'none'})`);
            link.click();
            reactClick(link);
            await humanDelay(600, 1200);
            return true;
          }
        }
      }

      // Strategy 2: URL hash navigation
      const hashTargets = ['#price-inventory', '#price_inventory', '#pricing'];
      for (const hash of hashTargets) {
        const hashLink = document.querySelector(`a[href*="${hash}"]`);
        if (hashLink) {
          console.log(`[Matrixty v9.3] Clicking tab via href: ${hashLink.href}`);
          hashLink.click();
          await humanDelay(600, 1200);
          return true;
        }
      }

      // Strategy 3: Direct URL hash change
      const currentUrl = window.location.href;
      if (currentUrl.includes('etsy.com')) {
        const baseUrl = currentUrl.split('#')[0];
        console.log('[Matrixty v9.3] Direct navigation to #price-inventory');
        window.location.href = baseUrl + '#price-inventory';
        await humanDelay(800, 1500);
        return true;
      }

      return false;
    };

    console.log('[Matrixty v9.3] === Starting SKU field detection ===');

    // Step 1: Check if SKU is already visible on current view
    let found = tryDetectSku();
    if (found) {
      LISTING.detectedFields.sku = found;
      console.log('[Matrixty v9.3] Step 1: SKU input found on current view');
      return found;
    }

    // Step 2: Try clicking "+ Add SKU" on current view
    console.log('[Matrixty v9.3] Step 2: Looking for Add SKU button on current view...');
    let addClicked = await clickAddSkuButton();
    if (addClicked) {
      found = tryDetectSku();
      if (found) {
        LISTING.detectedFields.sku = found;
        console.log('[Matrixty v9.3] Step 2: SKU input revealed after clicking Add SKU');
        return found;
      }
    }

    // Step 3: Navigate to "Price & Inventory" tab
    console.log('[Matrixty v9.3] Step 3: Navigating to Price & Inventory tab...');
    let navigated = await navigateToTab('Price');
    if (!navigated) {
      navigated = await navigateToTab('Inventory');
    }

    if (navigated) {
      // Wait a bit more for tab content to render
      await humanDelay(200, 500);

      // Debug: log all visible buttons/links on page
      const visibleBtns = document.querySelectorAll('button, [role="button"], a');
      const btnTexts = Array.from(visibleBtns)
        .filter(b => b.getBoundingClientRect().width > 0)
        .map(b => `<${b.tagName}> "${b.textContent.trim().substring(0, 40)}"`)
        .slice(0, 20);
      console.log('[Matrixty v9.3] Visible clickable elements after navigation:', btnTexts);

      // Try to find SKU input directly
      found = tryDetectSku();
      if (found) {
        LISTING.detectedFields.sku = found;
        console.log('[Matrixty v9.3] Step 3: SKU input found on Price & Inventory tab');
        return found;
      }

      // Try clicking "+ Add SKU" on this tab
      console.log('[Matrixty v9.3] Step 3b: Looking for Add SKU button on Price & Inventory tab...');
      addClicked = await clickAddSkuButton();
      if (addClicked) {
        found = tryDetectSku();
        if (found) {
          LISTING.detectedFields.sku = found;
          console.log('[Matrixty v9.3] Step 3b: SKU input revealed on Price & Inventory tab');
          return found;
        }
      }

      // No scrolling — avoid moving the viewport to not disrupt user
    }

    console.warn('[Matrixty v9.3] === SKU field NOT FOUND after all attempts ===');
    return null;
  }

  // ========== DIRECT PASTE (No sidebar — paste immediately into form) ==========

  async function directPasteAll(payload) {
    LISTING.ideaData = payload;
    LISTING.platform = payload.platform || detectListingPlatform() || 'unknown';
    LISTING.auth = payload.auth || LISTING.auth;
    LISTING.generatedData = payload.generatedData || null;

    // Detect form fields on the page
    detectListingFields();
    const fields = LISTING.detectedFields;
    const data = LISTING.generatedData || {};
    const platform = LISTING.platform;

    // Debug logging — help identify what's happening
    console.log('[Matrixty v9.3] directPasteAll debug:', {
      platform,
      fieldsDetected: Object.keys(fields),
      hasTitle: !!fields.title,
      titleSelector: fields.title?.selector,
      hasTags: !!fields.tags,
      tagsSelector: fields.tags?.selector,
      hasSku: !!fields.sku,
      skuSelector: fields.sku?.selector,
      dataTitle: data.title ? data.title.substring(0, 50) + '...' : '(empty)',
      dataTags: data.tags ? (Array.isArray(data.tags) ? data.tags.length + ' tags' : data.tags.substring(0, 50)) : '(empty)',
      ideaSku: LISTING.ideaData?.sku || '(none)',
    });

    if (Object.keys(fields).length === 0) {
      showNotification('No form fields detected. Is this a listing page?', 'error');
      return { ok: false, error: 'No fields detected' };
    }

    LISTING.isPasting = true;
    const filledFields = [];
    injectStyles();

    try {
      // Show floating progress indicator
      showNotification('Auto-Fill starting...', 'info');

      // 1. Title
      if (data.title && fields.title) {
        showNotification('Pasting title...', 'info');
        console.log('[Matrixty v7.0.0] Pasting title into:', fields.title.element.tagName, fields.title.selector);
        const ok = await clipboardPaste(fields.title.element, data.title);
        console.log('[Matrixty v7.0.0] Title paste result:', ok);
        if (ok) filledFields.push('title');
        // v1.2.7: Random delay giữa title → tags (giống người thật)
        await humanDelay(800, 2500);
      } else {
        console.warn('[Matrixty v7.0.0] Skipping title:', { hasDataTitle: !!data.title, hasFieldTitle: !!fields.title });
      }

      // 2. Tags (Etsy) or Search Terms (Amazon)
      if (platform === 'etsy' && data.tags) {
        const tags = Array.isArray(data.tags) ? data.tags : data.tags.split(',').map(t => t.trim()).filter(Boolean);
        if (tags.length > 0) {
          // v1.2.3: If tags field not found, navigate to Item Details tab
          if (!fields.tags) {
            console.log('[Matrixty v1.2.3] Tags field not on current view, navigating to Item Details...');
            const allLinks = document.querySelectorAll('a, button, [role="tab"], nav a, li a');
            for (const link of allLinks) {
              const text = (link.textContent || '').trim().toLowerCase();
              if (text.includes('item details') || text === 'item details') {
                const rect = link.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                  console.log(`[Matrixty v1.2.3] Clicking tab: "${link.textContent.trim()}"`);
                  link.click();
                  reactClick(link);
                  await humanDelay(1200, 2200);
                  // Re-detect fields after navigation
                  detectListingFields();
                  break;
                }
              }
            }
          }
          if (fields.tags || LISTING.detectedFields.tags) {
            const tagField = fields.tags || LISTING.detectedFields.tags;
            showNotification(`Pasting ${tags.length} tags...`, 'info');
            const ok = await pasteEtsyTags(tagField.element, tags);
            if (ok) filledFields.push('tags');
            // v1.2.7: Random delay giữa tags → SKU
            await humanDelay(1000, 3000);
          } else {
            console.warn('[Matrixty v1.2.3] Tags field not found even after navigation');
          }
        }
      } else if (platform === 'amazon' && fields.search_terms && data.tags) {
        // ═══ v9.6: STRICT VALIDATION for Amazon search_terms ═══
        // Problem: CDP/paste can target the title textarea instead of search_terms
        // because Amazon React may re-focus the title after blur.
        const stEl = fields.search_terms.element;
        const stName = (stEl.name || '').toLowerCase();
        const stLabel = (stEl.getAttribute('aria-label') || '').toLowerCase();
        const isSameAsTitle = fields.title && stEl === fields.title.element;
        const isActuallySearchTerms = stName.includes('generic_keyword') || stName.includes('search_term')
          || stLabel.includes('search term') || stLabel.includes('generic keyword');

        console.log('[Matrixty v9.6] Search terms validation:', {
          selector: fields.search_terms.selector,
          name: stEl.name, ariaLabel: stEl.getAttribute('aria-label'),
          isSameAsTitle, isActuallySearchTerms,
        });

        if (isSameAsTitle) {
          console.warn('[Matrixty v9.6] ⚠️ SKIPPING search_terms — same element as title!');
        } else if (!isActuallySearchTerms) {
          console.warn('[Matrixty v9.6] ⚠️ SKIPPING search_terms — element name/label does NOT match generic_keyword/search_terms, likely wrong field');
        } else {
          const tags = Array.isArray(data.tags) ? data.tags : data.tags.split(',').map(t => t.trim()).filter(Boolean);
          if (tags.length > 0) {
            // Save title value BEFORE search terms paste (to detect corruption)
            const titleValueBefore = fields.title?.element?.value || '';

            showNotification('Pasting search terms...', 'info');
            const ok = await pasteAmazonSearchTerms(stEl, tags);

            // v9.6: POST-PASTE VALIDATION — check if title got corrupted
            if (fields.title?.element) {
              const titleValueAfter = fields.title.element.value || '';
              if (titleValueAfter !== titleValueBefore && data.title && titleValueAfter !== data.title) {
                console.error('[Matrixty v9.6] ❌ Title got CORRUPTED during search_terms paste! Re-filling title...');
                console.error('[Matrixty v9.6] Before:', titleValueBefore.substring(0, 50), '→ After:', titleValueAfter.substring(0, 50));
                showNotification('⚠️ Re-filling title (was overwritten)...', 'warning');
                await clipboardPaste(fields.title.element, data.title);
                await humanDelay(150, 350);
              }
            }

            if (ok) filledFields.push('search_terms');
            // v1.2.7: Random delay giữa search terms → SKU (Amazon)
            await humanDelay(800, 2500);
          }
        }
      }

      // 3. Description (if available)
      if (data.description && fields.description) {
        showNotification('Pasting description...', 'info');
        const ok = await clipboardPaste(fields.description.element, data.description);
        if (ok) filledFields.push('description');
        // v1.2.7: Random delay
        await humanDelay(600, 2000);
      }

      // 4. Bullet points (Amazon)
      if (platform === 'amazon' && data.bullet_points && fields.bullet_points) {
        for (let i = 0; i < Math.min(data.bullet_points.length, fields.bullet_points.length); i++) {
          if (data.bullet_points[i]) {
            showNotification(`Pasting bullet point ${i + 1}...`, 'info');
            const ok = await clipboardPaste(fields.bullet_points[i].element, data.bullet_points[i]);
            if (ok) filledFields.push(`bullet_point_${i}`);
            // v1.2.7: Random delay giữa các bullet points
            await humanDelay(500, 1800);
          }
        }
      }

      // 5. SKU (Etsy) — v1.2.5: Fill SKU from idea data
      // SKU is on the "Price & Inventory" tab — revealAndDetectSkuField handles navigation
      const skuValue = LISTING.ideaData?.sku || '';
      console.log(`[Matrixty v1.2.5] SKU check: skuValue="${skuValue}", platform="${platform}", ideaData keys:`, Object.keys(LISTING.ideaData || {}));
      if (skuValue && platform === 'etsy') {
        showNotification('Filling SKU...', 'info');
        console.log(`[Matrixty v1.2.6] SKU value from idea: "${skuValue}"`);

        // v1.2.6: SIMPLE SKU FILL — send to background which uses CDP
        // 1. Navigate to Pricing tab if needed
        // 2. Click "+ Add SKU" button
        // 3. Find revealed SKU input
        // 4. Type SKU via CDP Input.insertText
        const skuResult = await new Promise((resolve) => {
          chrome.runtime.sendMessage({
            type: 'CDP_SKU_FILL',
            skuValue: skuValue,
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.warn('[Matrixty v1.2.6] CDP_SKU_FILL error:', chrome.runtime.lastError.message);
              resolve({ ok: false });
              return;
            }
            resolve(response || { ok: false });
          });
          setTimeout(() => resolve({ ok: false }), 20000);
        });

        console.log('[Matrixty v1.2.6] CDP_SKU_FILL result:', skuResult);
        if (skuResult?.ok) filledFields.push('sku');
      }

      // 5b. SKU (Amazon) — v9.4: Navigate to Offer tab and fill SKU
      if (skuValue && platform === 'amazon') {
        showNotification('Filling SKU...', 'info');
        console.log(`[Matrixty v9.4] Amazon SKU fill: "${skuValue}"`);

        // Helper: find Amazon SKU input
        const findAmazonSkuInput = () => {
          for (const sel of AMAZON_SELECTORS.sku) {
            const el = document.querySelector(sel);
            if (el && el.getBoundingClientRect().width > 0) return el;
          }
          // Brute force: find input near SKU label
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

        // Helper: click Amazon tab by text
        const clickAmzTab = (tabText) => {
          const tabs = document.querySelectorAll('a, button, [role="tab"], [class*="tab" i], li[class*="nav" i]');
          for (const tab of tabs) {
            const text = (tab.textContent || '').trim().toLowerCase();
            if (text === tabText.toLowerCase() || (text.length < 30 && text.includes(tabText.toLowerCase()))) {
              const rect = tab.getBoundingClientRect();
              if (rect.width > 0 && rect.height > 0) {
                console.log(`[Matrixty v9.4] Clicking Amazon tab: "${tab.textContent.trim()}"`);
                tab.click();
                return true;
              }
            }
          }
          return false;
        };

        let skuEl = findAmazonSkuInput();

        // If not on current view, navigate to "Offer" tab
        if (!skuEl) {
          console.log('[Matrixty v9.4] SKU not on current view, navigating to Offer tab...');
          if (clickAmzTab('offer')) {
            await humanDelay(600, 1200);
            skuEl = findAmazonSkuInput();
          }
        }

        if (skuEl) {
          const ok = await clipboardPaste(skuEl, skuValue);
          console.log('[Matrixty v9.4] Amazon SKU paste result:', ok);
          if (ok) filledFields.push('sku');
          await humanDelay(180, 450);
          // Stay on Offer tab — don't navigate back
        } else {
          console.warn('[Matrixty v9.4] Amazon SKU input NOT FOUND');
        }
      }

      // ═══ v7.0.0: Extract ASIN from Amazon Seller Central page ═══
      let extractedAsin = '';
      if (platform === 'amazon') {
        extractedAsin = extractAsinFromPage();
        if (extractedAsin) {
          console.log('[Matrixty v7.0.0] Extracted ASIN from page:', extractedAsin);
        }
      }

      // ═══ v7.0.0: Extract Etsy listing link from page ═══
      let extractedLink = '';
      if (platform === 'etsy') {
        extractedLink = extractEtsyListingLink();
        if (extractedLink) {
          console.log('[Matrixty v7.0.0] Extracted Etsy link:', extractedLink);
        }
      }

      // Log to database
      LISTING.lastFill = {
        timestamp: new Date().toISOString(),
        platform, filledFields,
        ideaId: LISTING.ideaData?.idea_id,
      };
      logFillToDatabase(filledFields);

      showNotification(`✅ Auto-Fill done! Pasted ${filledFields.length} field(s)`, 'success');
      return { ok: true, filledFields, extractedAsin, extractedLink, platform };

    } catch (err) {
      console.error('[Matrixty v7.0.0] directPasteAll error:', err);
      showNotification(`Error: ${err.message}`, 'error');
      return { ok: false, error: err.message };
    } finally {
      LISTING.isPasting = false;
    }
  }

  // ========== MESSAGE HANDLER ==========

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[Matrixty v7.0.0 Listing] Message:', message.type);

    // v1.2.2: Skip about:blank and non-http frames — they have no form fields
    if (window.location.href === 'about:blank' || !window.location.href.startsWith('http')) {
      return false; // don't handle, let main frame handle
    }

    if (message.type === 'LISTING_PASTE') {
      // Direct paste: fill fields immediately without sidebar
      directPasteAll(message.payload).then(result => {
        sendResponse(result);
      }).catch(err => {
        sendResponse({ ok: false, error: err.message });
      });
      return true; // keep channel open for async
    }

    if (message.type === 'LISTING_FILL') {
      try {
        createSidebar(message.payload);
        sendResponse({ ok: true, success: true });
      } catch (err) {
        sendResponse({ ok: false, error: err.message });
      }
      return true;
    }

    if (message.type === 'GET_LISTING_STATUS') {
      sendResponse({
        ok: true,
        platform: LISTING.platform || detectListingPlatform(),
        isListingPage: !!detectListingPlatform(),
        sidebarOpen: LISTING.sidebarOpen,
        fieldsDetected: Object.keys(LISTING.detectedFields).length,
        isPasting: LISTING.isPasting,
        lastFill: LISTING.lastFill,
      });
      return true;
    }

    if (message.type === 'LISTING_CLOSE') {
      removeSidebar();
      sendResponse({ ok: true });
      return true;
    }

    if (message.type === 'AUTH_UPDATED') {
      LISTING.auth = message.config || message.auth;
      return;
    }

    if (message.type === 'AUTH_LOGOUT') {
      LISTING.auth = null;
      removeSidebar();
      return;
    }
  });

  // ========== INIT ==========

  function init() {
    setTimeout(() => {
      const platform = detectListingPlatform();
      if (platform) {
        detectListingFields();
        console.log(`[Matrixty v7.0.0] Initialized for ${platform}, fields:`, Object.keys(LISTING.detectedFields));
      }
    }, 1500);
  }

  window.__matrixtyListing = {
    state: LISTING,
    paste: (payload) => createSidebar(payload),
    pasteField: pasteSingleField,
    pasteAll: pasteAllFields,
    getStatus: () => ({
      platform: LISTING.platform,
      sidebarOpen: LISTING.sidebarOpen,
      fieldsDetected: Object.keys(LISTING.detectedFields).length,
      isPasting: LISTING.isPasting,
      lastFill: LISTING.lastFill,
    }),
    close: removeSidebar,
    _detectPlatform: detectListingPlatform,
    _detectFields: detectListingFields,
    _getFields: () => LISTING.detectedFields,
    _clipboardPaste: clipboardPaste,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
