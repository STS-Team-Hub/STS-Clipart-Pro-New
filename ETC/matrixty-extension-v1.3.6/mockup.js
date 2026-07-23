// Matrixty Extension v7.0.0 — Mockup Image Manager
// Click-to-select images on any page → stores in background IndexedDB → uploads on listing pages

// Guard against double-injection (manifest + dynamic scripting.executeScript)
if (window.__matrixtyMockupLoaded) {
  console.log('[Matrixty Mockup] Already loaded, skipping re-init on:', window.location.href);
} else {
  window.__matrixtyMockupLoaded = true;
  console.log('[Matrixty Mockup] Module LOADED on:', window.location.href);

(function () {
  'use strict';

  // ========== CONFIG ==========
  const MAX_IMAGES_PER_IDEA = 10;
  const MIN_IMG_SIZE = 80; // Minimum px to show as selectable

  // ========== DB via Background (cross-origin) ==========
  // All DB operations go through background.js which has extension-origin IndexedDB

  function sendMsg(msg) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(msg, (resp) => {
          if (chrome.runtime.lastError) {
            console.error('[Matrixty Mockup] sendMsg error:', chrome.runtime.lastError.message, 'for', msg.type);
            resolve({ ok: false, error: chrome.runtime.lastError.message });
            return;
          }
          resolve(resp || {});
        });
      } catch (e) {
        console.error('[Matrixty Mockup] sendMsg exception:', e.message, 'for', msg.type);
        resolve({ ok: false, error: e.message });
      }
    });
  }

  // Convert Blob → base64 for message passing (Blob can't be sent via chrome messages)
  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result.split(',')[1]; // strip "data:...;base64,"
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Convert base64 → Blob (received from background)
  function base64ToBlob(base64, contentType) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: contentType || 'image/jpeg' });
  }

  async function saveMockup(ideaId, imageBlob, fileName, sourceUrl) {
    const base64Data = await blobToBase64(imageBlob);
    const contentType = imageBlob.type || 'image/jpeg';
    return sendMsg({ type: 'MK_SAVE', ideaId, base64Data, contentType, fileName, sourceUrl });
  }

  async function getMockups(ideaId) {
    const resp = await sendMsg({ type: 'MK_GET_ALL', ideaId });
    if (!resp.ok || !resp.mockups) return [];
    // Convert base64 back to blob for each mockup
    return resp.mockups.map(m => ({
      ...m,
      blob: base64ToBlob(m.base64Data, m.contentType),
    }));
  }

  async function deleteMockup(id) {
    return sendMsg({ type: 'MK_DELETE', mockupId: id });
  }

  async function assignMockupsToIdea(newIdeaId) {
    const resp = await sendMsg({ type: 'MK_ASSIGN', ideaId: newIdeaId });
    return resp.count || 0;
  }

  // ========== FETCH IMAGE AS BLOB ==========

  // Strategy 1: Canvas capture (fastest — image already loaded in DOM, no network)
  function captureFromCanvas(imgEl) {
    return new Promise((resolve, reject) => {
      try {
        if (!imgEl || !imgEl.naturalWidth) { reject(new Error('No image data')); return; }
        const canvas = document.createElement('canvas');
        canvas.width = imgEl.naturalWidth || imgEl.width;
        canvas.height = imgEl.naturalHeight || imgEl.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(imgEl, 0, 0);
        // Detect if source is PNG (keep transparency), otherwise use JPEG
        const src = (imgEl.src || '').toLowerCase();
        const isPng = src.includes('.png') || src.includes('image/png');
        const mimeType = isPng ? 'image/png' : 'image/jpeg';
        const quality = isPng ? undefined : 0.92;
        canvas.toBlob(blob => {
          if (blob && blob.size > 100) resolve(blob);
          else reject(new Error('Canvas blob empty'));
        }, mimeType, quality);
      } catch (e) {
        reject(e); // Tainted canvas = cross-origin image
      }
    });
  }

  // Strategy 2: CORS fetch with timeout
  function fetchWithTimeout(url, ms = 5000) {
    return new Promise((resolve, reject) => {
      const ctrl = new AbortController();
      const timer = setTimeout(() => { ctrl.abort(); reject(new Error('Timeout')); }, ms);
      fetch(url, { mode: 'cors', credentials: 'omit', signal: ctrl.signal })
        .then(resp => {
          clearTimeout(timer);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          return resp.blob();
        })
        .then(resolve)
        .catch(err => { clearTimeout(timer); reject(err); });
    });
  }

  // Strategy 3: Background proxy
  function fetchViaBackground(url) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('BG proxy timeout')), 10000);
      chrome.runtime.sendMessage({ type: 'FETCH_IMAGE_BLOB', url }, response => {
        clearTimeout(timer);
        if (response?.ok && response.data) {
          const binary = atob(response.data);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
          resolve(new Blob([bytes], { type: response.contentType || 'image/jpeg' }));
        } else {
          reject(new Error(response?.error || 'Background fetch failed'));
        }
      });
    });
  }

  // Main: try canvas → CORS fetch → background proxy
  async function fetchImageBlob(url, imgEl) {
    // 1) Canvas capture (instant, no network)
    if (imgEl) {
      try {
        const blob = await captureFromCanvas(imgEl);
        console.log('[Matrixty Mockup] Canvas capture OK:', url.substring(0, 60));
        return blob;
      } catch (e) {
        console.warn('[Matrixty Mockup] Canvas failed (cross-origin?):', e.message);
      }
    }
    // 2) Direct CORS fetch with 5s timeout
    try {
      const blob = await fetchWithTimeout(url, 5000);
      console.log('[Matrixty Mockup] CORS fetch OK:', url.substring(0, 60));
      return blob;
    } catch (e) {
      console.warn('[Matrixty Mockup] CORS fetch failed:', e.message);
    }
    // 3) Background proxy with 10s timeout
    console.log('[Matrixty Mockup] Trying background proxy:', url.substring(0, 60));
    return fetchViaBackground(url);
  }

  // ========== CLICK-TO-SELECT MODE ==========
  // Seller clicks images on any page to select them — like Crawl mode

  let selectMode = false;
  let selectedImages = new Map(); // url → { img element, overlay element }
  let processedImages = new WeakSet(); // Track which img elements already have overlays
  let selectModeObserver = null; // MutationObserver for dynamic image changes
  let _picMode = false; // When true, save ONLY to clipboard (Pic tab), skip __unassigned__

  function enterSelectMode(picOnly) {
    if (selectMode) return exitSelectMode(); // Toggle off
    selectMode = true;
    _picMode = !!picOnly;

    // Create toolbar
    const toolbar = document.createElement('div');
    toolbar.id = 'mtx-mockup-toolbar';
    const statusText = _picMode ? 'Click ảnh để lưu vào Pic (tối đa 15)' : 'Click ảnh để chọn mockup';
    const toolbarColor = _picMode ? 'background: linear-gradient(135deg, #D84315, #FF6D00) !important;' : '';
    toolbar.innerHTML = `
      <span class="mtx-mt-icon">📷</span>
      <span class="mtx-mt-status">${statusText}</span>
      <span class="mtx-mt-count">0 ảnh</span>
      <button class="mtx-mt-btn mtx-mt-save" disabled>💾 Lưu</button>
      <button class="mtx-mt-btn mtx-mt-cancel">✕ Hủy</button>
    `;
    if (toolbarColor) toolbar.style.cssText += toolbarColor;
    document.body.appendChild(toolbar);

    // Wire toolbar buttons
    const saveFn = _picMode ? savePicImages : saveSelectedImages;
    toolbar.querySelector('.mtx-mt-save').addEventListener('click', saveFn);
    toolbar.querySelector('.mtx-mt-cancel').addEventListener('click', exitSelectMode);

    // Scan and add overlays to all eligible images
    scanAndOverlayImages();

    // ═══ Watch for DOM changes (thumbnail click → main image swaps) ═══
    let rescanTimer = null;
    selectModeObserver = new MutationObserver((mutations) => {
      if (!selectMode) return;
      let needRescan = false;
      for (const m of mutations) {
        if (m.type === 'childList') {
          m.addedNodes.forEach(n => {
            if (n.nodeName === 'IMG' || (n.querySelectorAll && n.querySelectorAll('img').length > 0)) {
              needRescan = true;
            }
          });
        }
        // CRITICAL: When main image src changes, remove it from processedImages
        // so it gets a fresh overlay with the new src
        if (m.type === 'attributes' && m.target.nodeName === 'IMG' && m.attributeName === 'src') {
          processedImages.delete(m.target);
          // Remove old overlay from this image's parent
          const oldOverlay = m.target.parentElement?.querySelector('.mtx-img-overlay');
          if (oldOverlay) oldOverlay.remove();
          needRescan = true;
        }
      }
      if (needRescan) {
        clearTimeout(rescanTimer);
        rescanTimer = setTimeout(() => scanAndOverlayImages(), 400);
      }
    });
    selectModeObserver.observe(document.body, {
      childList: true, subtree: true,
      attributes: true, attributeFilter: ['src'],
    });
  }

  // ═══ v8.0: Minimum RENDERED size to show overlay ═══
  // Simple rule: only overlay images >= 250px (either dimension)
  // This naturally skips thumbnails (60-200px) and only shows on main/hero images
  // Exception: Google Drive pages use lower threshold (120px) since all images are thumbnails
  const MIN_SIZE_DEFAULT = 250;
  const MIN_SIZE_GDRIVE = 120;

  function getMinSize() {
    const h = window.location.hostname;
    if (h.includes('drive.google.com') || h.includes('docs.google.com') || h.includes('photos.google.com')) {
      return MIN_SIZE_GDRIVE;
    }
    return MIN_SIZE_DEFAULT;
  }

  function scanAndOverlayImages() {
    const minSize = getMinSize();

    // ═══ SCAN 1: Normal <img> elements ═══
    document.querySelectorAll('img').forEach(img => {
      if (processedImages.has(img)) return;

      const src = getBestImageSrc(img);
      if (!src || src.startsWith('data:')) return;
      if (/logo|icon|avatar|sprite|pixel|tracking|badge|rating|star|favicon/i.test(src)) return;

      const rect = img.getBoundingClientRect();
      if (rect.width < minSize && rect.height < minSize) return;
      if (rect.width === 0 || rect.height === 0) return;

      processedImages.add(img);

      const overlay = document.createElement('div');
      overlay.className = 'mtx-img-overlay';
      // Show image dimensions on overlay to help user identify
      const natW = img.naturalWidth || '?';
      const natH = img.naturalHeight || '?';
      overlay.innerHTML = `<div class="mtx-img-check">✓</div><div style="position:absolute;bottom:4px;left:4px;font-size:10px;color:#fff;background:rgba(0,0,0,0.6);padding:1px 4px;border-radius:3px;">${natW}×${natH}</div>`;

      img.style.position = img.style.position || 'relative';
      const wrapper = img.parentElement;
      if (wrapper) {
        const wStyle = getComputedStyle(wrapper);
        if (wStyle.position === 'static') wrapper.style.position = 'relative';
        wrapper.appendChild(overlay);
        const wrapRect = wrapper.getBoundingClientRect();
        overlay.style.top = (rect.top - wrapRect.top) + 'px';
        overlay.style.left = (rect.left - wrapRect.left) + 'px';
        overlay.style.width = rect.width + 'px';
        overlay.style.height = rect.height + 'px';
      }

      overlay.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        const freshSrc = getBestImageSrc(img);
        toggleImageSelection(freshSrc, img, overlay);
      }, true);
    });

    // ═══ SCAN 2: Elements with background-image (Google Drive, custom galleries) ═══
    // Google Drive uses div/span with background-image for thumbnails, not <img> tags
    const bgSelectors = [
      '[data-tooltip]', // Google Drive file items
      '[style*="background-image"]', // Any element with inline background-image
      '.drive-viewer-filmstrip-thumbnail', // Drive viewer thumbnails
      '[role="gridcell"]', // Drive grid items
      '.WYuW0e', // Drive thumbnail class
    ];
    document.querySelectorAll(bgSelectors.join(',')).forEach(el => {
      if (processedImages.has(el)) return;
      const style = getComputedStyle(el);
      const bgImg = style.backgroundImage;
      if (!bgImg || bgImg === 'none') return;

      const match = bgImg.match(/url\(["']?(https?:\/\/[^"')]+)["']?\)/);
      if (!match) return;
      let bgSrc = match[1];

      const rect = el.getBoundingClientRect();
      if (rect.width < minSize || rect.height < minSize) return;
      if (rect.width === 0 || rect.height === 0) return;

      processedImages.add(el);

      // Try to get full-size Google Drive image URL
      // Drive thumbnails: =s220 → =s2048 for full size
      if (bgSrc.includes('googleusercontent.com') || bgSrc.includes('drive.google.com')) {
        bgSrc = bgSrc.replace(/=s\d+(-[a-z]+)?$/, '=s2048').replace(/=w\d+-h\d+/, '=s2048');
      }

      const overlay = document.createElement('div');
      overlay.className = 'mtx-img-overlay';
      overlay.innerHTML = `<div class="mtx-img-check">✓</div><div style="position:absolute;bottom:4px;left:4px;font-size:9px;color:#fff;background:rgba(0,0,0,0.6);padding:1px 4px;border-radius:3px;">GDrive</div>`;

      if (style.position === 'static') el.style.position = 'relative';
      el.appendChild(overlay);
      overlay.style.top = '0';
      overlay.style.left = '0';
      overlay.style.width = '100%';
      overlay.style.height = '100%';

      overlay.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        toggleImageSelection(bgSrc, el, overlay);
      }, true);
    });

    // ═══ SCAN 3: Google Drive preview images (when viewing file) ═══
    document.querySelectorAll('[src*="googleusercontent.com"], [src*="drive.google.com"], [src*="lh3.google"]').forEach(img => {
      if (processedImages.has(img)) return;
      if (img.tagName !== 'IMG') return;

      let src = img.src || '';
      if (!src) return;

      const rect = img.getBoundingClientRect();
      if (rect.width < MIN_SIZE_GDRIVE || rect.height < MIN_SIZE_GDRIVE) return;

      processedImages.add(img);

      // Upgrade to full size
      src = src.replace(/=s\d+(-[a-z]+)?$/, '=s2048').replace(/=w\d+-h\d+/, '=s2048');

      const overlay = document.createElement('div');
      overlay.className = 'mtx-img-overlay';
      const natW = img.naturalWidth || '?';
      const natH = img.naturalHeight || '?';
      overlay.innerHTML = `<div class="mtx-img-check">✓</div><div style="position:absolute;bottom:4px;left:4px;font-size:10px;color:#fff;background:rgba(0,0,0,0.6);padding:1px 4px;border-radius:3px;">${natW}×${natH}</div>`;

      img.style.position = img.style.position || 'relative';
      const wrapper = img.parentElement;
      if (wrapper) {
        const wStyle = getComputedStyle(wrapper);
        if (wStyle.position === 'static') wrapper.style.position = 'relative';
        wrapper.appendChild(overlay);
        const wrapRect = wrapper.getBoundingClientRect();
        overlay.style.top = (rect.top - wrapRect.top) + 'px';
        overlay.style.left = (rect.left - wrapRect.left) + 'px';
        overlay.style.width = rect.width + 'px';
        overlay.style.height = rect.height + 'px';
      }

      overlay.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        toggleImageSelection(src, img, overlay);
      }, true);
    });
  }

  function getBestImageSrc(img) {
    // Try to get the highest resolution version of the image
    // Priority: data attributes → srcset largest → current src with size params removed

    // 1. Check data attributes for high-res versions
    const dataAttrs = ['zoom', 'src', 'largeSrc', 'large-src', 'highRes', 'high-res',
      'original', 'fullSrc', 'full-src', 'fullsize', 'full-size', 'big', 'hd'];
    for (const attr of dataAttrs) {
      const val = img.dataset[attr];
      if (val && val.startsWith('http')) return val;
    }

    // 2. Check srcset — pick the largest image
    if (img.srcset) {
      const candidates = img.srcset.split(',').map(s => {
        const parts = s.trim().split(/\s+/);
        const url = parts[0];
        const size = parseInt(parts[1]) || 0;
        return { url, size };
      }).filter(c => c.url);
      if (candidates.length > 0) {
        candidates.sort((a, b) => b.size - a.size);
        return candidates[0].url;
      }
    }

    // 3. Try to get larger version by modifying URL patterns (common ecommerce patterns)
    let src = img.src || '';
    if (src) {
      // Etsy: replace il_170x135 / il_340xN / il_570xN with il_fullxfull or il_1588xN
      if (/etsy\.com|etsystatic\.com/i.test(src)) {
        src = src.replace(/il_\d+x\w+/g, 'il_fullxfull');
      }
      // General: remove size suffixes like _300x300, _small, _thumb, ?w=300, &width=300
      else {
        const hiRes = src
          .replace(/[_-](small|thumb|thumbnail|medium|preview|low|sq|s|m)\b/gi, '')
          .replace(/[?&](w|width|h|height|size|resize|fit)=\d+/gi, '')
          .replace(/\/(\d+)x(\d+)\//g, '/2048x2048/');
        if (hiRes !== src) return hiRes;
      }
    }

    return src;
  }

  function toggleImageSelection(src, img, overlay) {
    if (selectedImages.has(src)) {
      selectedImages.delete(src);
      overlay.classList.remove('selected');
    } else {
      if (selectedImages.size >= MAX_IMAGES_PER_IDEA) {
        showMockupToast(`Tối đa ${MAX_IMAGES_PER_IDEA} ảnh`, 'warning');
        return;
      }
      selectedImages.set(src, { img, overlay });
      overlay.classList.add('selected');
    }
    updateToolbarCount();
  }

  function updateToolbarCount() {
    const toolbar = document.getElementById('mtx-mockup-toolbar');
    if (!toolbar) return;
    const count = selectedImages.size;
    toolbar.querySelector('.mtx-mt-count').textContent = `${count} ảnh`;
    toolbar.querySelector('.mtx-mt-save').disabled = count === 0;
    toolbar.querySelector('.mtx-mt-save').textContent = count > 0 ? `💾 Lưu ${count} ảnh` : '💾 Lưu';
  }

  async function saveSelectedImages() {
    const toolbar = document.getElementById('mtx-mockup-toolbar');
    const saveBtn = toolbar?.querySelector('.mtx-mt-save');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = '⏳ Đang lưu...';
    }

    // Get current idea ID — if none selected, save to temp pool ('__unassigned__')
    let ideaId = await getCurrentIdeaId();
    if (!ideaId) ideaId = '__unassigned__';

    let savedCount = 0;
    const total = selectedImages.size;
    const isUnassigned = (ideaId === '__unassigned__');

    for (const [src, { img, overlay }] of selectedImages) {
      try {
        if (saveBtn) saveBtn.textContent = `⏳ ${savedCount + 1}/${total}...`;
        const blob = await fetchImageBlob(src, img);
        const ext = src.match(/\.(jpg|jpeg|png|webp|gif)/i)?.[1] || 'jpg';
        const fileName = `mockup-${savedCount + 1}.${ext}`;
        await saveMockup(ideaId, blob, fileName, src);

        // Also save to clipboard (FIFO max 15) when no listing selected
        if (isUnassigned) {
          try {
            const base64Data = await blobToBase64(blob);
            await sendMsg({
              type: 'MK_CLIPBOARD_SAVE',
              base64Data,
              contentType: blob.type || 'image/jpeg',
              fileName,
              sourceUrl: src,
            });
          } catch (clipErr) {
            console.warn('[Matrixty Mockup] Clipboard save failed:', clipErr.message);
          }
        }

        savedCount++;
        overlay.classList.add('saved');
      } catch (e) {
        console.warn('[Matrixty Mockup] Failed to save:', src, e);
        overlay.classList.add('error');
      }
    }

    const assignMsg = isUnassigned ? ' (chưa gán idea — lưu vào "Ảnh đã lưu" trong popup)' : '';
    showMockupToast(`✅ Đã lưu ${savedCount}/${total} ảnh mockup${assignMsg}`, savedCount > 0 ? 'success' : 'error');
    try { chrome.runtime.sendMessage({ type: 'MOCKUPS_SAVED', ideaId, count: savedCount }, () => { if (chrome.runtime.lastError) console.warn('[Matrixty Mockup] sendMessage error:', chrome.runtime.lastError.message); }); } catch(e) { /* extension context invalidated */ }

    // Exit after short delay
    setTimeout(exitSelectMode, 1500);
  }

  // ═══ PIC MODE: Save ONLY to clipboard (no __unassigned__) ═══
  async function savePicImages() {
    const toolbar = document.getElementById('mtx-mockup-toolbar');
    const saveBtn = toolbar?.querySelector('.mtx-mt-save');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.textContent = '⏳ Đang lưu...';
    }

    // Get userId from chrome.storage.local (set by popup before SHOW_PIC_PICKER)
    let userId = null;
    try {
      const data = await new Promise(r => chrome.storage.local.get('picUserId', r));
      userId = data.picUserId || null;
    } catch(e) {}
    if (!userId) {
      // Fallback: try matrixtyUser
      try {
        const data = await new Promise(r => chrome.storage.local.get('matrixtyUser', r));
        userId = data.matrixtyUser?.id || null;
      } catch(e) {}
    }
    if (!userId) {
      showMockupToast('❌ Chưa đăng nhập — không thể lưu ảnh', 'error');
      setTimeout(exitSelectMode, 1500);
      return;
    }

    let savedCount = 0;
    const total = selectedImages.size;

    for (const [src, { img, overlay }] of selectedImages) {
      try {
        if (saveBtn) saveBtn.textContent = `⏳ ${savedCount + 1}/${total}...`;
        const blob = await fetchImageBlob(src, img);
        const ext = src.match(/\.(jpg|jpeg|png|webp|gif)/i)?.[1] || 'jpg';
        const fileName = `pic-${Date.now()}-${savedCount + 1}.${ext}`;
        const base64Data = await blobToBase64(blob);

        await sendMsg({
          type: 'MK_CLIPBOARD_SAVE',
          userId,
          base64Data,
          contentType: blob.type || 'image/jpeg',
          fileName,
          sourceUrl: src,
        });

        savedCount++;
        overlay.classList.add('saved');
      } catch (e) {
        console.warn('[Matrixty Pic] Failed to save:', src, e);
        overlay.classList.add('error');
      }
    }

    showMockupToast(`✅ Đã lưu ${savedCount}/${total} ảnh vào Pic`, savedCount > 0 ? 'success' : 'error');
    try { chrome.runtime.sendMessage({ type: 'PIC_IMAGES_SAVED', count: savedCount }, () => { if (chrome.runtime.lastError) {} }); } catch(e) {}

    setTimeout(exitSelectMode, 1500);
  }

  function exitSelectMode() {
    selectMode = false;
    _picMode = false;
    selectedImages.clear();
    processedImages = new WeakSet(); // Reset for next session

    // Stop watching DOM
    if (selectModeObserver) {
      selectModeObserver.disconnect();
      selectModeObserver = null;
    }

    // Remove all overlays
    document.querySelectorAll('.mtx-img-overlay').forEach(el => el.remove());

    // Remove toolbar
    document.getElementById('mtx-mockup-toolbar')?.remove();
  }

  async function getCurrentIdeaId() {
    return new Promise(resolve => {
      try {
        chrome.runtime.sendMessage({ type: 'GET_CURRENT_IDEA_ID' }, response => {
          if (chrome.runtime.lastError) { console.warn('[Matrixty Mockup] GET_CURRENT_IDEA_ID error:', chrome.runtime.lastError.message); resolve(null); return; }
          resolve(response?.ideaId || null);
        });
      } catch(e) { resolve(null); }
    });
  }

  // ========== LISTING PAGE: MOCKUP PANEL ==========

  // ========== PLATFORM-SPECIFIC UPLOAD HELPERS ==========

  function detectPlatform() {
    const host = window.location.hostname;
    if (host.includes('etsy.com')) return 'etsy';
    if (host.includes('amazon.com') || host.includes('amazon.co') || host.includes('sellercentral')) return 'amazon';
    return 'generic';
  }

  function findFileInputs() {
    // Return ALL file inputs that accept images, ordered by position on page
    const selectors = [
      'input[type="file"][accept*="image"]',
      'input[type="file"][accept*="jpeg"]',
      'input[type="file"][accept*="png"]',
      'input[type="file"]',
    ];
    const found = new Set();
    for (const sel of selectors) {
      document.querySelectorAll(sel).forEach(el => found.add(el));
    }
    return Array.from(found);
  }

  function findDropZone() {
    const platform = detectPlatform();
    if (platform === 'etsy') {
      // Etsy listing editor: the photo upload area
      return document.querySelector(
        '[class*="image-upload"], [class*="photo-upload"], ' +
        '[data-testid*="photo"], [data-testid*="image"], ' +
        '[class*="wt-card"] [class*="upload"], ' +
        'section[class*="photo"], div[class*="listing-photo"]'
      );
    }
    if (platform === 'amazon') {
      return document.querySelector(
        '#image-block, #image_block, [class*="image-upload"], ' +
        '[class*="drag-drop-zone"]'
      );
    }
    return null;
  }

  async function createMockupPanel(ideaId) {
    console.log('[Matrixty Mockup] createMockupPanel called, ideaId:', ideaId);
    document.getElementById('mtx-mockup-panel')?.remove();

    let mockups = await getMockups(ideaId);
    console.log('[Matrixty Mockup] getMockups result:', mockups.length, 'for ideaId:', ideaId);

    // If no mockups for this idea, check __unassigned__ and auto-assign
    if (mockups.length === 0 && ideaId && ideaId !== '__unassigned__') {
      const unassigned = await getMockups('__unassigned__');
      if (unassigned.length > 0) {
        console.log(`[Matrixty Mockup] Auto-assigning ${unassigned.length} unassigned mockups to idea ${ideaId}`);
        await assignMockupsToIdea(ideaId);
        mockups = await getMockups(ideaId);
        if (mockups.length > 0) {
          showMockupToast(`✅ Đã tự gán ${mockups.length} ảnh cho idea này`, 'success');
        }
      }
    }

    if (mockups.length === 0) {
      showMockupToast('Chưa có ảnh mockup nào. Hãy mở trang sản phẩm gốc → 📷 chọn ảnh trước.', 'warning');
      return;
    }

    const uploadArea = findDropZone();
    const panel = document.createElement('div');
    panel.id = 'mtx-mockup-panel';

    panel.innerHTML = `
      <div class="mtx-mk-header">
        <span>📷 Mockups (${mockups.length})</span>
        <div>
          <button class="mtx-mk-close" title="Đóng">✕</button>
        </div>
      </div>
      <div class="mtx-mk-hint">Ảnh đã lưu — kéo thủ công hoặc copy để dùng</div>
      <div class="mtx-mk-grid">
        ${mockups.map(m => {
          const thumbUrl = URL.createObjectURL(m.blob);
          return `
            <div class="mtx-mk-item" data-id="${m.id}">
              <img src="${thumbUrl}" alt="${m.fileName}" draggable="true" />
              <div class="mtx-mk-item-info">--</div>
              <div class="mtx-mk-item-actions">
                <button class="mtx-mk-rmbg-one" title="Tách nền trắng">🖼</button>
                <!-- upload button disabled in v1.2 -->
                <button class="mtx-mk-delete-one" title="Xóa">🗑</button>
              </div>
              <div class="mtx-mk-item-status"></div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Position near upload area if found
    if (uploadArea) {
      const rect = uploadArea.getBoundingClientRect();
      panel.style.top = Math.max(10, rect.top) + 'px';
      panel.style.left = Math.max(10, rect.left - 260) + 'px';
    }

    document.body.appendChild(panel);

    // === Show image dimensions on each thumbnail ===
    panel.querySelectorAll('.mtx-mk-item').forEach(item => {
      const imgEl = item.querySelector('img');
      const infoEl = item.querySelector('.mtx-mk-item-info');
      if (!imgEl || !infoEl) return;
      const showDims = () => {
        const mockupId = parseInt(item.dataset.id);
        const mockup = mockups.find(m => m.id === mockupId);
        // Read real dimensions from blob via temp Image
        const tmpImg = new Image();
        tmpImg.onload = () => {
          const w = tmpImg.naturalWidth;
          const h = tmpImg.naturalHeight;
          const willUpscale = w < TARGET_UPLOAD_PX || h < TARGET_UPLOAD_PX;
          let label = `${w}×${h}`;
          if (willUpscale) {
            const scale = Math.max(TARGET_UPLOAD_PX / w, TARGET_UPLOAD_PX / h);
            const uW = Math.round(w * scale);
            const uH = Math.round(h * scale);
            label = `${w}×${h} → ${uW}×${uH}`;
            infoEl.classList.add('mtx-dim-upscaled');
          } else {
            infoEl.classList.add('mtx-dim-ok');
          }
          infoEl.textContent = label;
          URL.revokeObjectURL(tmpImg.src);
        };
        if (mockup) {
          tmpImg.src = URL.createObjectURL(mockup.blob);
        }
      };
      if (imgEl.complete) showDims();
      else imgEl.addEventListener('load', showDims, { once: true });
    });

    // === Wire events ===

    // Remove background (white bg)
    panel.querySelectorAll('.mtx-mk-rmbg-one').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const item = btn.closest('.mtx-mk-item');
        const mockupId = parseInt(item.dataset.id);
        const mockup = mockups.find(m => m.id === mockupId);
        if (!mockup) return;
        const statusEl = item.querySelector('.mtx-mk-item-status');
        statusEl.textContent = '⏳';
        btn.disabled = true;
        btn.style.opacity = '0.5';
        try {
          const newBlob = await removeBackground(mockup.blob);
          // Update mockup blob in memory
          mockup.blob = newBlob;
          // Update thumbnail
          const imgEl = item.querySelector('img');
          if (imgEl) imgEl.src = URL.createObjectURL(newBlob);
          // Re-save to IndexedDB via background
          const base64Data = await blobToBase64(newBlob);
          await sendMsg({ type: 'MK_SAVE', ideaId: mockup.ideaId, base64Data, contentType: 'image/jpeg', fileName: mockup.fileName, sourceUrl: mockup.sourceUrl, replaceId: mockup.id });
          statusEl.textContent = '✅';
          showMockupToast('✅ Đã tách nền trắng', 'success');
        } catch (err) {
          console.error('[Matrixty Mockup] Remove BG failed:', err);
          statusEl.textContent = '❌';
          showMockupToast('❌ Lỗi tách nền: ' + err.message, 'error');
        }
        btn.disabled = false;
        btn.style.opacity = '';
        setTimeout(() => { statusEl.textContent = ''; }, 2000);
      });
    });

    // [v1.2 DISABLED] Upload single & upload all buttons removed — no auto-upload to listing

    // Delete single
    panel.querySelectorAll('.mtx-mk-delete-one').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const item = btn.closest('.mtx-mk-item');
        const mockupId = parseInt(item.dataset.id);
        await deleteMockup(mockupId);
        item.remove();
        const remaining = panel.querySelectorAll('.mtx-mk-item').length;
        panel.querySelector('.mtx-mk-header span').textContent = `📷 Mockups (${remaining})`;
        if (remaining === 0) panel.remove();
      });
    });

    // Close
    panel.querySelector('.mtx-mk-close').addEventListener('click', () => panel.remove());

    // Make panel draggable by header
    makeDraggable(panel, panel.querySelector('.mtx-mk-header'));

    // Make each thumbnail draggable as a File (for manual drag & drop into upload area)
    panel.querySelectorAll('.mtx-mk-item').forEach(item => {
      const mockupId = parseInt(item.dataset.id);
      const mockup = mockups.find(m => m.id === mockupId);
      const imgEl = item.querySelector('img');
      if (mockup && imgEl) {
        makeDraggableBlob(imgEl, mockup);
      }
    });
  }

  // ========== AUTO-UPLOAD TO FILE INPUT ==========

  // ========== REMOVE BACKGROUND via Gemini API ==========
  // Sends image to Gemini 2.0 Flash for AI-powered background removal → white bg.
  // API call goes through background.js (content scripts can't call external APIs).
  async function removeBackground(blob) {
    console.log('[Matrixty Mockup] Sending to Gemini for BG removal, size:', blob.size);
    const base64Data = await blobToBase64(blob);
    const resp = await sendMsg({
      type: 'GEMINI_REMOVE_BG',
      base64Data,
      contentType: blob.type || 'image/jpeg',
    });

    if (!resp.ok) {
      throw new Error(resp.error || 'Gemini BG removal failed');
    }

    // Convert returned base64 back to blob
    const newBlob = base64ToBlob(resp.base64Data, resp.contentType || 'image/png');
    console.log('[Matrixty Mockup] Gemini BG removal done, new size:', newBlob.size);
    return newBlob;
  }

  // Re-encode blob through canvas to guarantee valid image bytes (magic bytes/header).
  // Amazon Seller Central validates actual file bytes, not just MIME type.
  // Also upscales images below MIN_UPLOAD_PX to TARGET_UPLOAD_PX (Amazon/Etsy require ≥1000x1000).
  const MIN_UPLOAD_PX = 1000;    // Amazon & Etsy minimum
  const TARGET_UPLOAD_PX = 1500; // Upscale target for safety margin

  function reEncodeBlob(blob, targetType = 'image/jpeg') {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(blob);
      img.onload = () => {
        try {
          let srcW = img.naturalWidth || img.width;
          let srcH = img.naturalHeight || img.height;
          let destW = srcW;
          let destH = srcH;

          // Upscale if either dimension is below 1500px target
          if (srcW < TARGET_UPLOAD_PX || srcH < TARGET_UPLOAD_PX) {
            const scale = Math.max(TARGET_UPLOAD_PX / srcW, TARGET_UPLOAD_PX / srcH);
            destW = Math.round(srcW * scale);
            destH = Math.round(srcH * scale);
            console.log(`[Matrixty Mockup] Upscaling ${srcW}x${srcH} → ${destW}x${destH} (below ${TARGET_UPLOAD_PX}px target)`);
          }

          const canvas = document.createElement('canvas');
          canvas.width = destW;
          canvas.height = destH;
          const ctx = canvas.getContext('2d');

          // White background for JPEG (no alpha channel)
          if (targetType === 'image/jpeg') {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, destW, destH);
          }

          // Use high-quality bicubic interpolation for upscaling
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, destW, destH);
          URL.revokeObjectURL(url);

          const quality = targetType === 'image/jpeg' ? 0.95 : undefined;
          canvas.toBlob(newBlob => {
            if (newBlob && newBlob.size > 100) {
              console.log('[Matrixty Mockup] Re-encoded blob:', blob.size, '→', newBlob.size, 'type:', targetType, `dim: ${destW}x${destH}`);
              resolve(newBlob);
            } else {
              reject(new Error('Re-encode produced empty blob'));
            }
          }, targetType, quality);
        } catch (e) {
          URL.revokeObjectURL(url);
          reject(e);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Image load failed during re-encode'));
      };
      img.src = url;
    });
  }

  async function createFileFromMockup(mockup) {
    const blobType = mockup.blob.type || 'image/jpeg';

    // Normalize MIME type — Amazon/Etsy don't accept webp, avif etc.
    const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/tiff'];
    const finalType = supportedTypes.includes(blobType) ? blobType : 'image/jpeg';

    // Re-encode through canvas to ensure valid file bytes (fixes Amazon "not a valid file type")
    let finalBlob;
    try {
      finalBlob = await reEncodeBlob(mockup.blob, finalType);
    } catch (e) {
      console.warn('[Matrixty Mockup] Re-encode failed, using original blob:', e.message);
      finalBlob = mockup.blob;
    }

    // Ensure filename extension matches the MIME type
    const extMap = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/gif': '.gif', 'image/tiff': '.tif' };
    const ext = extMap[finalType] || '.jpg';

    let fileName = mockup.fileName || `mockup-${Date.now()}${ext}`;
    // Fix extension mismatch: strip old extension and use correct one
    fileName = fileName.replace(/\.(jpg|jpeg|png|webp|gif|tif|tiff|avif|bmp)$/i, '') + ext;

    return new File([finalBlob], fileName, {
      type: finalType,
      lastModified: Date.now(),
    });
  }

  // Try to set files on an input using React-compatible approach
  function setFilesOnInput(input, file) {
    const dt = new DataTransfer();
    dt.items.add(file);

    // Method 1: Native setter (bypasses React controlled component)
    const nativeSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'files')?.set;
    if (nativeSetter) {
      nativeSetter.call(input, dt.files);
    } else {
      input.files = dt.files;
    }

    // Dispatch events that React will pick up
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));

    // Also dispatch React synthetic-compatible event
    const reactEvent = new Event('change', { bubbles: true });
    Object.defineProperty(reactEvent, 'target', { writable: false, value: input });
    input.dispatchEvent(reactEvent);

    console.log('[Matrixty Mockup] Set files on input:', input.name || input.id || input.className.substring(0, 30));
  }

  // [v1.2 DISABLED] Auto-upload to listing page removed per user request.
  // Crawl/save/clipboard features are still active.
  async function uploadMockupToFileInput(mockup) {
    console.log('[Matrixty Mockup] Upload to listing DISABLED (v1.2)');
    return false;
  }

  // ========== DRAG & DROP via interception ==========
  // Browser security: dataTransfer.files is empty for in-page drags (only desktop files work).
  // So we intercept the drop on the page and use setFilesOnInput instead.

  let _dragMockup = null; // Currently dragged mockup data

  // [v1.2 DISABLED] Drag-to-upload disabled
  function makeDraggableBlob(imgEl, mockup) {
    // No-op: upload to listing disabled in v1.2
  }

  // Visual highlight for Etsy/Amazon upload areas during drag
  function highlightDropZones(show) {
    const zone = findDropZone();
    const inputs = findFileInputs();
    const targets = [];
    if (zone) targets.push(zone);
    // Also highlight parent of hidden file inputs
    inputs.forEach(inp => {
      const parent = inp.closest('[class*="upload"], [class*="photo"], [class*="image"], [class*="media"]');
      if (parent) targets.push(parent);
    });

    targets.forEach(el => {
      if (show) {
        el.style.outline = '3px dashed #F97316';
        el.style.outlineOffset = '-3px';
        el.style.background = 'rgba(249,115,22,0.08)';
        el.dataset.mtxHighlight = '1';
      } else if (el.dataset.mtxHighlight) {
        el.style.outline = '';
        el.style.outlineOffset = '';
        el.style.background = '';
        delete el.dataset.mtxHighlight;
      }
    });
  }

  // Global drop interceptor — catches our mockup drops on any part of the page
  function setupDropInterceptor() {
    let entered = false;

    document.addEventListener('dragover', (e) => {
      if (!_dragMockup) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
    }, true);

    document.addEventListener('dragenter', (e) => {
      if (!_dragMockup) return;
      e.preventDefault();
      entered = true;
    }, true);

    document.addEventListener('dragleave', (e) => {
      if (!_dragMockup) return;
      entered = false;
    }, true);

    document.addEventListener('drop', async (e) => {
      if (!_dragMockup) return; // Not our drag
      e.preventDefault();
      e.stopPropagation();

      const mockup = _dragMockup;
      _dragMockup = null;
      highlightDropZones(false);

      console.log('[Matrixty Mockup] Drop intercepted, uploading via file input...');
      const ok = await uploadMockupToFileInput(mockup);
      showMockupToast(
        ok ? '✅ Đã upload ảnh thành công' : '❌ Không tìm được ô upload. Hãy dùng nút 📤.',
        ok ? 'success' : 'error'
      );
    }, true);
  }

  // [v1.2 DISABLED] Drop interceptor disabled — no auto-upload to listing
  // setupDropInterceptor();

  // ========== DRAGGABLE HELPER ==========
  function makeDraggable(el, handle) {
    let isDragging = false, startX, startY, startLeft, startTop;
    handle.addEventListener('mousedown', (e) => {
      if (e.target.tagName === 'BUTTON') return;
      isDragging = true;
      startX = e.clientX; startY = e.clientY;
      const rect = el.getBoundingClientRect();
      startLeft = rect.left; startTop = rect.top;
      e.preventDefault();
    });
    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      el.style.left = (startLeft + e.clientX - startX) + 'px';
      el.style.top = (startTop + e.clientY - startY) + 'px';
    });
    document.addEventListener('mouseup', () => { isDragging = false; });
  }

  // ========== TOAST ==========
  function showMockupToast(message, type = 'info') {
    document.getElementById('mtx-mockup-toast')?.remove();
    const toast = document.createElement('div');
    toast.id = 'mtx-mockup-toast';
    const bg = { success: '#2E7D32', error: '#E8453C', warning: '#E65100', info: '#1565C0' }[type] || '#1565C0';
    toast.style.cssText = `
      position: fixed !important; bottom: 20px !important; left: 50% !important;
      transform: translateX(-50%) !important; z-index: 999999 !important;
      padding: 10px 20px !important; border-radius: 8px !important;
      background: ${bg} !important; color: white !important;
      font-size: 13px !important; font-weight: 600 !important;
      font-family: -apple-system, sans-serif !important;
      box-shadow: 0 4px 16px rgba(0,0,0,0.2) !important;
    `;
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3500);
  }

  // ========== FAB BUTTON ==========
  function createMockupFab() {
    if (document.getElementById('mtx-mockup-fab')) return;
    const fab = document.createElement('div');
    fab.id = 'mtx-mockup-fab';
    fab.title = 'Matrixty: Chọn ảnh mockup';
    fab.textContent = '📷';
    document.body.appendChild(fab);
    fab.addEventListener('click', enterSelectMode);
  }

  // ========== MESSAGE HANDLER ==========
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    console.log('[Matrixty Mockup] Message received:', msg.type, msg);

    if (msg.type === 'SHOW_MOCKUP_PICKER') {
      enterSelectMode(false);
      sendResponse({ ok: true });
      return false;
    }

    // ═══ PIC TAB: Enter select mode — save ONLY to clipboard ═══
    if (msg.type === 'SHOW_PIC_PICKER') {
      enterSelectMode(true); // picOnly = true
      sendResponse({ ok: true });
      return false;
    }

    if (msg.type === 'SHOW_MOCKUP_PANEL') {
      console.log('[Matrixty Mockup] SHOW_MOCKUP_PANEL handler, ideaId:', msg.ideaId);
      if (msg.ideaId) {
        createMockupPanel(msg.ideaId)
          .then(() => {
            console.log('[Matrixty Mockup] Panel created successfully');
            sendResponse({ ok: true });
          })
          .catch(e => {
            console.error('[Matrixty Mockup] Panel error:', e);
            showMockupToast('Lỗi hiển thị panel: ' + e.message, 'error');
            sendResponse({ ok: false, error: e.message });
          });
        return true; // Keep message channel open for async response
      }
      console.warn('[Matrixty Mockup] SHOW_MOCKUP_PANEL called with no ideaId');
      sendResponse({ ok: false, error: 'No ideaId' });
      return false;
    }

    // [v1.2 DISABLED] ANHPHU_AUTOFILL — upload to listing disabled
    if (msg.type === 'ANHPHU_AUTOFILL') {
      console.log('[Matrixty] ANHPHU_AUTOFILL disabled in v1.2');
      sendResponse({ ok: false, error: 'Upload to listing disabled in v1.2' });
      return false;
    }

    // [v1.2 DISABLED] PIC_AUTOFILL — upload to listing disabled
    if (msg.type === 'PIC_AUTOFILL') {
      console.log('[Matrixty] PIC_AUTOFILL disabled in v1.2');
      sendResponse({ ok: false, error: 'Upload to listing disabled in v1.2' });
      return false;
    }

    // [v1.2 DISABLED] PIC_AUTOFILL_URLS — upload to listing disabled
    if (msg.type === 'PIC_AUTOFILL_URLS') {
      console.log('[Matrixty] PIC_AUTOFILL_URLS disabled in v1.2');
      sendResponse({ ok: false, error: 'Upload to listing disabled in v1.2' });
      return false;
    }

    // Don't interfere with messages meant for other listeners
    return false;
  });

  // ========== AUTO-INIT ==========
  function init() {
    // Show FAB on any page (seller can pick images from anywhere)
    // Small delay to not interfere with page load
    setTimeout(createMockupFab, 2000);
  }

  // Expose for popup
  window.__matrixtyMockup = { getMockups, saveMockup, deleteMockup, assignMockupsToIdea, createMockupPanel, enterSelectMode };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 1000);
  }
})();
} // end guard __matrixtyMockupLoaded
