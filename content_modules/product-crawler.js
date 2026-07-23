// STS Clipart Pro 8.3 v8.3.0 — STS Clipart Pro 8.3 + Triple Zone (Crawl Idea / Crawl Clipart / Auto-Fill Listing)
// v8.3.0: Deep scanner for unknown frameworks (pawfecthouse etc), iframe support, aggressive label+image detection
// v8.0.8: Highlight titles in Manual Pick, fix notification z-index, fix scroll blocking, auto-name screenshot
// v8.0.7: Smart Manual Pick — find smallest container with label+swatches, avoid grabbing entire form
// v8.0.3: Fix Wanderprints chicken-and-egg: wait for DOM after Customily clicks, re-scroll, multi-round expand
// v8.0.2: Fix scanDOM() to combine Customily + Wanderprints on mixed pages (no early return)
// v8.0.1: Fix Wanderprints auto-expand clipart sections, generic collapse handling
// v8.3.0: Mockup picker on clipart sync, UPSERT for duplicate URLs, fixed grid layout
// Note: Listing messages (LISTING_FILL, GET_LISTING_STATUS, LISTING_CLOSE) are handled by listing.js
console.log('[STS Clipart Pro 8.3 v8.3.0] Content script LOADED on:', window.location.href);

(function () {
  'use strict';

  const SUPABASE_URL = 'https://qhejotdjehgneusqjvhz.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoZWpvdGRqZWhnbmV1c3Fqdmh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2NzcyNTEsImV4cCI6MjA4NDI1MzI1MX0.5sbhhZ3VUrRQuRuLo3-o6CDzjbotPLzDGsn3oIjPM_U';

  // State
  let products = [];
  let bookmarkIndex = -1;
  let selectedIndexes = new Set();
  let isActive = false;
  let currentMode = null; // 'bookmark' | 'manual' | 'fullpage'
  let auth = null;
  let platform = 'unknown';
  let _overlayCount = 0; // Track how many overlays were created


  const MODE_ICONS = { bookmark: '\u{1F516}', manual: '\u270B', fullpage: '\u{1F4C4}' };

  const STS_UI_IDS = {
    host: 'sts-clipart-ui-host',
    anchor: 'sts-clipart-ui-anchor',
    frame: 'sts-clipart-ui-frame'
  };
  const STS_UI_ORIGIN = chrome.runtime.getURL('').replace(/\/$/, '');
  let _toolbarVisible = false;
  let _panelVisible = false;
  let _uiReady = false;
  let _uiFrame = null;
  let _uiHost = null;
  let _uiAnchor = null;
  let _uiSyncInFlight = false;
  let _uiResizeRaf = 0;
  let _uiHostRaf = 0;
  let _uiHostObserverBound = false;



  function stsEscAttr(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  function stsUiIcon(name, size, color) {
    var s = size || 16;
    var c = color || 'currentColor';
    var common = 'fill="none" stroke="' + c + '" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"';
    var body = '';
    switch (name) {
      case 'sync':
        body = '<path d="M20 7a7 7 0 0 0-12-2"/><path d="M4 7V3h4"/><path d="M4 17a7 7 0 0 0 12 2"/><path d="M20 17v4h-4"/>';
        break;
      case 'render':
        body = '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><path d="M7 15l2.6-2.6a1.5 1.5 0 0 1 2.1 0l1.3 1.3"/><path d="M12.8 14.1l1.5-1.5a1.5 1.5 0 0 1 2.1 0L19 15.2"/><circle cx="9" cy="9" r="1.2"/>';
        break;
      case 'all':
        body = '<rect x="4" y="4" width="5" height="5" rx="1.2"/><rect x="4" y="15" width="5" height="5" rx="1.2"/><rect x="15" y="4" width="5" height="5" rx="1.2"/><path d="M17.5 13v8"/><path d="M13.5 17h8"/>';
        break;
      case 'reset':
        body = '<path d="M8 7H4v4"/><path d="M4.5 10A8 8 0 1 0 8 6"/>';
        break;
      case 'pick':
        body = '<path d="M7 4l9 9"/><path d="M7 4l2.3 11.1 2.6-5.7 5.7-2.6z"/><circle cx="18" cy="18" r="2.5"/>';
        break;
      case 'number':
        body = '<path d="M9 4L7 20"/><path d="M16 4l-2 16"/><path d="M5 9h14"/><path d="M4 15h14"/>';
        break;
      case 'camera':
        body = '<path d="M5 8h3l1.4-2h5.2L16 8h3a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="3.2"/>';
        break;
      case 'manual':
        body = '<path d="M12 21V10"/><path d="M8.5 12V7.8a1.4 1.4 0 1 1 2.8 0V11"/><path d="M14.7 11V7.4a1.4 1.4 0 1 1 2.8 0v6.3"/><path d="M12 11V6.8a1.4 1.4 0 1 1 2.8 0V11"/><path d="M8.4 12.2 7 10.8a1.5 1.5 0 0 0-2.1 2.1l2.9 2.9A4 4 0 0 0 10.7 17H16"/>';
        break;
      case 'append':
        body = '<rect x="4" y="5" width="11" height="11" rx="2"/><path d="M9 10h10"/><path d="M14 5v10"/><path d="M8 19h7"/>';
        break;
      case 'scan':
        body = '<path d="M8 5H6.8A1.8 1.8 0 0 0 5 6.8V8"/><path d="M16 5h1.2A1.8 1.8 0 0 1 19 6.8V8"/><path d="M8 19H6.8A1.8 1.8 0 0 1 5 17.2V16"/><path d="M16 19h1.2a1.8 1.8 0 0 0 1.8-1.8V16"/><rect x="8.3" y="8.3" width="7.4" height="7.4" rx="1.8"/><path d="M18.1 5.1v1.6"/><path d="M17.3 5.9h1.6"/>';
        break;
      case 'refresh':
        body = '<path d="M20 11a8 8 0 0 0-14.4-4.7"/><path d="M4 4v5h5"/><path d="M4 13a8 8 0 0 0 14.4 4.7"/><path d="M20 20v-5h-5"/>';
        break;
      case 'help':
        body = '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.3a2.7 2.7 0 1 1 4.8 1.7c-.8 1-1.8 1.4-1.8 2.7"/><circle cx="12" cy="17.2" r="0.7" fill="' + c + '" stroke="none"/>';
        break;
      case 'logout':
        body = '<path d="M15 7V5.8A1.8 1.8 0 0 0 13.2 4H7.8A1.8 1.8 0 0 0 6 5.8v12.4A1.8 1.8 0 0 0 7.8 20h5.4A1.8 1.8 0 0 0 15 18.2V17"/><path d="M11 12h10"/><path d="M18 9l3 3-3 3"/>';
        break;
      case 'logo':
        return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" aria-hidden="true">' +
          '<rect x="2" y="2" width="20" height="20" rx="5.25" fill="#EFF6FF" stroke="#BFDBFE" stroke-width="1"/>' +
          '<path d="M6 9V6.8C6 6.36 6.36 6 6.8 6H9" fill="none" stroke="#60A5FA" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>' +
          '<path d="M15 6H17.2C17.64 6 18 6.36 18 6.8V9" fill="none" stroke="#60A5FA" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>' +
          '<path d="M9 18H6.8C6.36 18 6 17.64 6 17.2V15" fill="none" stroke="#2563EB" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>' +
          '<path d="M18 15V17.2C18 17.64 17.64 18 17.2 18H15" fill="none" stroke="#2563EB" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>' +
          '<rect x="8" y="7.5" width="6.6" height="6.6" rx="1.6" fill="#FFFFFF" stroke="#2563EB" stroke-width="1.6"/>' +
          '<rect x="10.4" y="9.9" width="6.6" height="6.6" rx="1.6" fill="#FFFFFF" stroke="#2563EB" stroke-width="1.6"/>' +
          '<path d="M18.4 4.8v1.6M17.6 5.6h1.6" stroke="#60A5FA" stroke-width="1.4" stroke-linecap="round"/>' +
          '</svg>';
      default:
        body = '<circle cx="12" cy="12" r="8"/>';
    }
    return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" aria-hidden="true" ' + common + '>' + body + '</svg>';
  }

  function stsButtonHtml(iconName, label, iconColor) {
    return '<span style="display:inline-flex;align-items:center;justify-content:center;gap:8px;width:100%;white-space:nowrap;">' +
      '<span style="display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;flex:0 0 18px;">' +
      stsUiIcon(iconName, 16, iconColor || 'currentColor') +
      '</span><span>' + stsEscAttr(label) + '</span></span>';
  }


  // ============================================================
  // PLATFORM DETECTION
  // ============================================================
  function detectPlatform() {
    const h = window.location.hostname;
    if (h.includes('etsy.com')) return 'etsy';
    if (h.includes('amazon.com') || h.includes('amazon.co')) return 'amazon';
    // Shopify detection — multiple signals for JS-rendered stores
    if (window.Shopify) return 'shopify';
    if (document.querySelector('meta[name*="shopify"],meta[property*="shopify"]')) return 'shopify';
    if (document.querySelector('script[src*="shopify"],link[href*="shopify"],script[src*="cdn.shopify"]')) return 'shopify';
    const html = document.documentElement.innerHTML.substring(0, 80000);
    if (html.includes('Shopify') || html.includes('myshopify') || html.includes('cdn.shopify')) return 'shopify';
    return 'custom';
  }

  // ============================================================
  // PRODUCT DETECTION (same for all modes)
  // ============================================================
  function detectProducts() {
    products = [];
    platform = detectPlatform();
    if (platform === 'shopify') detectShopify();
    else if (platform === 'etsy') detectEtsy();
    else if (platform === 'amazon') detectAmazon();
    else detectGeneric();
    console.log(`[STS Clipart Pro 8.3 v3.0] ${platform}: ${products.length} products`);
  }

  function detectShopify() {
    const seen = new Set();

    // v3.0: Find the MAIN CONTENT area to avoid picking up nav/carousel/footer links
    const mainContent = document.getElementById('MainContent')
      || document.getElementById('main')
      || document.querySelector('main')
      || document.querySelector('[role="main"]')
      || document.querySelector('.collection-products,.collection,.product-grid,[class*="collection"],[class*="ProductGrid"]');

    // v3.0.2: Find the product GRID specifically (skip carousels/sliders inside main)
    const productGrid = mainContent?.querySelector('ul.grid, .product-grid, .collection-product-list, [class*="product-list"], [class*="ProductList"]')
      || mainContent?.querySelector('ul:not([class*="slider"]):not([class*="swiper"]):not([class*="carousel"]):not([class*="flickity"])')
      || null;

    // Strategy 1: Standard /products/ links
    // v3.0.2: Search order: productGrid → mainContent → document
    const searchRoots = [productGrid, mainContent, document].filter(Boolean);
    // Remove duplicates (if productGrid === mainContent)
    const uniqueRoots = [];
    for (const r of searchRoots) { if (!uniqueRoots.includes(r)) uniqueRoots.push(r); }

    let foundProducts = false;

    for (const root of uniqueRoots) {
      if (foundProducts && root === document) break;

      root.querySelectorAll('a[href*="/products/"]').forEach(a => {
        const m = (a.getAttribute('href') || '').match(/\/products\/([^/?#]+)/);
        if (!m || seen.has(m[1]) || m[1].length < 3 || ['json','js','css','xml','atom'].includes(m[1])) return;

        // v3.0: Skip links inside nav, header, footer
        const skipAncestor = a.closest('nav, header, footer, .header, .footer, .nav, .announcement-bar, .site-header, .site-footer');
        if (skipAncestor) return;

        // v3.0.2: Skip links inside carousel/slider/swiper/flickity containers
        const sliderAncestor = a.closest('[class*="slider"], [class*="swiper"], [class*="carousel"], [class*="flickity"], [class*="Slider"], [class*="Carousel"], [class*="slick"], [data-slick], .splide, .glide, .owl-carousel');
        if (sliderAncestor) return;

        const card = findCard(a); if (!card) return;
        const r = card.getBoundingClientRect();

        // Skip truly invisible elements
        if (r.width === 0 && r.height === 0) return;
        const s = window.getComputedStyle(card);
        if (s.display === 'none' || s.visibility === 'hidden') return;

        // v3.0.2: Skip cards in overflow:hidden containers (carousel clipping)
        let ancestor = card.parentElement;
        for (let depth = 0; depth < 5 && ancestor && ancestor !== document.body; depth++) {
          const as = window.getComputedStyle(ancestor);
          const ar = ancestor.getBoundingClientRect();
          if ((as.overflow === 'hidden' || as.overflowX === 'hidden') && ar.width > 0) {
            if (r.right < ar.left - 10 || r.left > ar.right + 10) return; // clipped out horizontally
          }
          ancestor = ancestor.parentElement;
        }

        seen.add(m[1]);
        products.push({ handle: m[1], card, title: getTitle(card, a) || humanize(m[1]), image: getImage(card), url: fullUrl(a.getAttribute('href')) });
      });

      if (products.length > 0) foundProducts = true;
      // v3.0.2: If found in grid, don't search wider (avoids carousel dupes)
      if (root === productGrid && products.length > 0) break;
    }

    // Strategy 2: Shopify JSON product data in page (for lazy-loaded pages)
    // v3.0: Always run this as supplement, not just when products.length === 0
    try {
      const scripts = document.querySelectorAll('script[type="application/json"],script[type="application/ld+json"]');
      scripts.forEach(script => {
        try {
          const data = JSON.parse(script.textContent);
          if (Array.isArray(data)) {
            data.forEach(item => {
              if (item['@type'] === 'Product' && item.url) {
                const handle = item.url.split('/products/')[1]?.split('?')[0];
                if (handle && !seen.has(handle)) {
                  seen.add(handle);
                  products.push({ handle, card: null, title: item.name || '', image: item.image || '', url: fullUrl(item.url) });
                }
              }
            });
          }
          if (data.itemListElement) {
            data.itemListElement.forEach(item => {
              const url = item.url || item.item?.url;
              const handle = url?.split('/products/')[1]?.split('?')[0];
              if (handle && !seen.has(handle)) {
                seen.add(handle);
                products.push({ handle, card: null, title: item.name || item.item?.name || '', image: item.image || '', url: fullUrl(url) });
              }
            });
          }
        } catch(e) {}
      });
    } catch(e) {}

    // Strategy 3: Shopify product-card components (modern themes)
    if (!products.length) {
      document.querySelectorAll('.product-card,.product-item,.product,.grid__item,.collection-product-card,product-card,[class*="ProductCard"],[class*="product-card"]').forEach(card => {
        const link = card.querySelector('a[href*="/products/"]');
        if (!link) return;
        const m = (link.getAttribute('href') || '').match(/\/products\/([^/?#]+)/);
        if (!m || seen.has(m[1])) return;
        seen.add(m[1]);
        products.push({ handle: m[1], card, title: getTitle(card, link) || humanize(m[1]), image: getImage(card), url: fullUrl(link.getAttribute('href')) });
      });
    }

    // v3.0 Strategy 4: <li> items containing /products/ links (almagems-style themes)
    // Some Shopify themes render products as plain <li> without product/card classes
    if (!products.length) {
      const allLi = document.querySelectorAll('li');
      allLi.forEach(li => {
        const link = li.querySelector('a[href*="/products/"]');
        if (!link) return;
        const m = (link.getAttribute('href') || '').match(/\/products\/([^/?#]+)/);
        if (!m || seen.has(m[1]) || m[1].length < 3) return;
        // Must have an image to be a product card (not a nav link)
        const img = li.querySelector('img');
        if (!img) return;
        // Must have price text
        const text = li.textContent || '';
        if (!text.includes('$') && !text.includes('price') && !text.match(/\d+\.\d{2}/)) return;
        const r = li.getBoundingClientRect();
        if (r.width === 0 && r.height === 0) return;
        const s = window.getComputedStyle(li);
        if (s.display === 'none' || s.visibility === 'hidden') return;
        seen.add(m[1]);
        products.push({ handle: m[1], card: li, title: getTitle(li, link) || humanize(m[1]), image: getImage(li), url: fullUrl(link.getAttribute('href')) });
      });
    }

    console.log(`[STS Clipart Pro 8.3 v3.0] Shopify detect: ${products.length} products (seen: ${seen.size}), mainContent: ${!!mainContent}, foundProducts: ${foundProducts}`);
  }

  async function detectShopifyApi() {
    const collMatch = window.location.pathname.match(/\/collections\/([^/?#]+)/);
    if (!collMatch) { console.log(`[STS Clipart Pro 8.3 v3.0] API skip: not a collection page`); return; }
    const seen = new Set(products.map(p => p.handle));
    let page = 1;
    let apiAdded = 0;
    console.log(`[STS Clipart Pro 8.3 v3.0] API fetching: /collections/${collMatch[1]}/products.json`);
    while (page <= 10) {
      try {
        const apiUrl = `${window.location.origin}/collections/${collMatch[1]}/products.json?limit=250&page=${page}`;
        const resp = await fetch(apiUrl);
        console.log(`[STS Clipart Pro 8.3 v3.0] API page ${page}: status ${resp.status}`);
        if (!resp.ok) break;
        const data = await resp.json();
        if (!data.products || !data.products.length) { console.log(`[STS Clipart Pro 8.3 v3.0] API page ${page}: 0 products, stopping`); break; }
        console.log(`[STS Clipart Pro 8.3 v3.0] API page ${page}: ${data.products.length} products returned`);
        for (const p of data.products) {
          if (seen.has(p.handle)) {
            // v9.2: Fix titles for products already found via DOM but with bad/missing titles
            if (p.title) {
              const existing = products.find(ep => ep.handle === p.handle);
              if (existing) {
                const curTitle = existing.title || '';
                const isHumanized = curTitle === humanize(p.handle);
                const isBadTitle = !curTitle || isHumanized ||
                  /^(add to wishlist|add to cart|quick view|quick shop|quick add|wishlist|compare|notify me)/i.test(curTitle);
                if (isBadTitle) {
                  existing.title = p.title;
                  console.log(`[STS Clipart Pro 8.3 v9.2] Fixed title for ${p.handle}: "${curTitle}" → "${p.title}"`);
                }
              }
            }
            continue;
          }
          seen.add(p.handle);
          products.push({
            handle: p.handle,
            card: null,
            title: p.title || '',
            image: upgradeImageUrl(p.images?.[0]?.src || ''),
            url: `${window.location.origin}/products/${p.handle}`,
          });
          apiAdded++;
        }
        if (data.products.length < 250) break;
        page++;
      } catch (e) { console.log(`[STS Clipart Pro 8.3 v3.0] API error:`, e.message); break; }
    }
    if (apiAdded > 0) matchApiProductsToDom();
    console.log(`[STS Clipart Pro 8.3 v3.0] Shopify API total: +${apiAdded} new, ${products.length} total (${products.filter(p => p.card).length} with DOM cards)`);
  }

  function matchApiProductsToDom() {
    const unmatched = products.filter(p => !p.card);
    if (!unmatched.length) return;

    // Strategy 1: Match by href /products/{handle}
    for (const p of unmatched) {
      const link = document.querySelector(`a[href*="/products/${p.handle}"]`);
      if (link) {
        p.card = findCard(link);
        if (!p.title || p.title === humanize(p.handle)) p.title = getTitle(p.card, link) || p.title;
        if (!p.image) p.image = getImage(p.card);
      }
    }

    // Strategy 2: Find all large visible images -> build position-ordered card list -> match to API products
    const stillUnmatched = products.filter(p => !p.card);
    if (!stillUnmatched.length) return;

    const matchedCards = new Set(products.filter(p => p.card).map(p => p.card));
    const cardEntries = [];
    const seenCards = new Set();

    document.querySelectorAll('img').forEach(img => {
      const r = img.getBoundingClientRect();
      if (r.width < 120 || r.height < 120) return;
      const src = img.src || img.dataset.src || '';
      if (!src || src.startsWith('data:')) return;
      const card = findCard(img.closest('a') || img);
      if (!card || seenCards.has(card) || matchedCards.has(card)) return;
      seenCards.add(card);
      cardEntries.push({ card, top: r.top, left: r.left });
    });

    // Sort by position: top-to-bottom, left-to-right
    cardEntries.sort((a, b) => Math.abs(a.top - b.top) < 50 ? a.left - b.left : a.top - b.top);

    // Match positionally — API products and page cards share same collection order
    let idx = 0;
    for (const p of stillUnmatched) {
      if (idx >= cardEntries.length) break;
      p.card = cardEntries[idx].card;
      idx++;
    }

    console.log(`[STS Clipart Pro 8.3 v3.0] DOM match: ${products.filter(p => p.card).length}/${products.length} matched`);
  }

  function detectEtsy() {
    const seen = new Set();
    document.querySelectorAll('[data-listing-id]').forEach(card => {
      const id = card.getAttribute('data-listing-id');
      if (!id || seen.has(id)) return; seen.add(id);
      const link = card.querySelector('a[href*="/listing/"]');
      products.push({ handle: id, card, title: card.querySelector('[class*="title"] span,h3')?.textContent?.trim() || '', image: card.querySelector('img')?.src || '', url: (link?.href || `https://www.etsy.com/listing/${id}`).split('?')[0] });
    });
  }

  function detectAmazon() {
    const seen = new Set();
    document.querySelectorAll('[data-asin]').forEach(card => {
      const asin = card.getAttribute('data-asin');
      if (!asin || asin.length < 5 || seen.has(asin)) return;
      const t = card.querySelector('h2 a span,.a-text-normal')?.textContent?.trim();
      if (!t) return; seen.add(asin);
      const link = card.querySelector('h2 a,a[href*="/dp/"]');
      products.push({ handle: asin, card, title: t, image: card.querySelector('img.s-image')?.src || '', url: link ? link.href.split('?')[0].split('/ref=')[0] : `https://www.amazon.com/dp/${asin}` });
    });
  }

  function detectGeneric() {
    const seen = new Set();

    // Strategy 1: URL patterns
    const urlPatterns = [
      /\/products?\/([^/?#]+)/,
      /\/items?\/([^/?#]+)/,
      /\/shop\/([^/?#]+)/,
      /\/dp\/([^/?#]+)/,
      /\/listing\/([^/?#]+)/,
      /\/p\/([^/?#]+)/,
    ];

    document.querySelectorAll('a').forEach(a => {
      const href = a.getAttribute('href') || '';
      if (!href || href === '/' || href === '#') return;

      for (const pat of urlPatterns) {
        const m = href.match(pat);
        if (m && !seen.has(m[1]) && m[1].length >= 3) {
          const card = findCard(a);
          if (!card) continue;
          const r = card.getBoundingClientRect();
          if (r.width < 60 || r.height < 60) continue;
          const s = window.getComputedStyle(card);
          if (s.display === 'none' || s.visibility === 'hidden') continue;
          seen.add(m[1]);
          products.push({ handle: m[1], card, title: getTitle(card, a) || humanize(m[1]), image: getImage(card), url: fullUrl(href) });
          break;
        }
      }
    });

    // Strategy 2: Cards with images + links (for homepages and custom sites)
    if (!products.length) {
      document.querySelectorAll('.product,.product-card,.product-item,[class*="product"],[class*="Product"],[class*="card"],[data-product]').forEach(card => {
        const link = card.querySelector('a[href]');
        const img = card.querySelector('img');
        if (!link || !img) return;
        const href = link.getAttribute('href') || '';
        if (!href || href === '/' || href === '#' || href.includes('javascript:') || seen.has(href)) return;
        // Must be a product-like link (not nav/footer)
        const r = card.getBoundingClientRect();
        if (r.width < 100 || r.height < 100) return;
        if (r.top > window.innerHeight * 3) return; // Too far below fold
        seen.add(href);
        const handle = href.split('/').filter(s => s).pop() || href;
        products.push({ handle, card, title: getTitle(card, link) || img.alt || '', image: img.src || img.dataset.src || '', url: fullUrl(href) });
      });
    }

    // Strategy 3: LD+JSON structured data
    if (!products.length) {
      try {
        document.querySelectorAll('script[type="application/ld+json"]').forEach(script => {
          try {
            const data = JSON.parse(script.textContent);
            const items = data.itemListElement || (Array.isArray(data) ? data : [data]);
            items.forEach(item => {
              if (item['@type'] === 'Product' && item.url && !seen.has(item.url)) {
                seen.add(item.url);
                products.push({ handle: item.url.split('/').pop() || item.name, card: null, title: item.name || '', image: (typeof item.image === 'string' ? item.image : item.image?.[0]) || '', url: fullUrl(item.url) });
              }
            });
          } catch(e) {}
        });
      } catch(e) {}
    }
  }

  // ============================================================
  // DOM HELPERS
  // ============================================================
  function findCard(link) {
    let el = link;
    for (let i = 0; i < 12; i++) {
      el = el.parentElement;
      if (!el || el === document.body) return link.parentElement || link;
      const c = (el.className || '').toString().toLowerCase();
      // v3.0: Added h3 parent check — some themes wrap product info in h3 > a
      if (c.includes('product') || c.includes('card') || c.includes('grid__item') || c.includes('grid-item') || c.includes('listing') ||
          // v3.0: <li> with siblings = likely product grid item
          (el.tagName === 'LI' && el.parentElement?.children.length > 2) ||
          // v3.0: <li> containing both img and price = product card
          (el.tagName === 'LI' && el.querySelector('img') && (el.textContent || '').includes('$')) ||
          (el.tagName === 'DIV' && el.parentElement?.children.length > 2 && el.getBoundingClientRect().height > 150) ||
          // v3.0: article tags often used as product containers
          el.tagName === 'ARTICLE') return el;
    }
    return link.parentElement || link;
  }

  function getTitle(card, link) {
    if (!card) return '';

    // v9.0: Validate title — reject HTML tags, URLs, pure numbers, price-only strings
    function isValidTitle(t) {
      if (!t || t.length < 3 || t.length > 300) return false;
      // Reject if looks like HTML tag or img src
      if (t.startsWith('<') || t.includes('<img') || t.includes('<a ') || t.includes('src=')) return false;
      // Reject if looks like a URL
      if (/^https?:\/\//i.test(t) || /^\/\/[a-z]/i.test(t)) return false;
      // Reject generic section headers and action buttons
      if (/^(customers are in love|new arrivals|best sellers|shop collection|filter|add to cart|add to wishlist|remove from wishlist|wishlist|buy now|sold out|view all|see more|quick view|quick shop|quick add|compare|notify me|out of stock|coming soon|pre-order|choose options|select options|save|share|log in|sign up)/i.test(t)) return false;
      // Reject price-only strings
      if (/^\$?\d+[\.,]\d{2}$/.test(t.trim())) return false;
      return true;
    }

    // v9.0: Extended selector list for more Shopify themes
    const TITLE_SELECTORS = [
      '.card__heading a', '.card__heading',
      '.product-title a', '.product-title',
      '.product-card__title a', '.product-card__title',
      '.product-item__title a', '.product-item__title',
      '.product-card-title a', '.product-card-title',
      '.product__title a', '.product__title',
      '[class*="product-card__title"] a', '[class*="product-card__title"]',
      '[class*="product-item__title"] a', '[class*="product-item__title"]',
      '[class*="ProductTitle"] a', '[class*="ProductTitle"]',
      '[class*="product_title"] a', '[class*="product_title"]',
      'h3 a', 'h2 a', 'h3', 'h2', 'h4',
      '[class*="title"] a', '[class*="title"]',
      '[class*="name"] a', '[class*="name"]',
      '[class*="heading"] a', '[class*="heading"]',
      'a[href*="/products/"]',  // v9.0: last resort — link itself
    ];

    for (const s of TITLE_SELECTORS) {
      try {
        const e = card.querySelector(s);
        if (e) {
          const t = e.textContent.trim().replace(/\s+/g, ' ');
          if (isValidTitle(t)) return t;
        }
      } catch(e) {}
    }

    // v9.0: Try link text directly
    if (link) {
      const lt = link.textContent?.trim()?.replace(/\s+/g, ' ');
      if (isValidTitle(lt)) return lt;
      // Also try link's title attribute
      const linkTitle = link.getAttribute('title')?.trim();
      if (isValidTitle(linkTitle)) return linkTitle;
    }

    // v9.0: Try img alt — validate it
    const img = card.querySelector('img');
    if (img) {
      const alt = (img.alt || '').trim();
      if (isValidTitle(alt)) return alt;
      // Also try img title attribute
      const imgTitle = (img.getAttribute('title') || '').trim();
      if (isValidTitle(imgTitle)) return imgTitle;
    }

    // v9.0: Try aria-label on card or links
    const ariaLabel = card.getAttribute('aria-label') || card.querySelector('[aria-label]')?.getAttribute('aria-label') || '';
    if (isValidTitle(ariaLabel.trim())) return ariaLabel.trim();

    return '';
  }

  function getImage(card) {
    if (!card) return '';
    let best = '', sz = 0;
    card.querySelectorAll('img').forEach(i => {
      const s = i.src || i.dataset.src || i.dataset.srcset?.split(' ')[0] || '';
      if (!s || s.includes('svg+xml') || s.includes('placeholder') || s.includes('icon')) return;
      // v3.0.2: Prefer cdn.shopify images
      const isShopify = s.includes('cdn.shopify') || s.includes('/cdn/shop/');
      const n = (i.naturalWidth || i.width || 0) * (i.naturalHeight || i.height || 0);
      const score = n + (isShopify ? 100000 : 0);
      if (score > sz || !best) { sz = score; best = s; }
    });
    // v3.0.2: Also check srcset — prefer LARGEST entry, not just first
    if (!best) {
      const source = card.querySelector('source[srcset], img[srcset]');
      if (source) {
        const srcset = source.getAttribute('srcset') || '';
        const firstSrc = srcset.split(',')[0]?.trim()?.split(' ')[0];
        if (firstSrc) best = firstSrc;
      }
    }
    // v9.0: Also try srcset on existing images for higher-res version
    if (best) {
      const imgEl = card.querySelector(`img[src="${best}"], img[data-src="${best}"]`);
      if (imgEl) {
        const srcset = imgEl.getAttribute('srcset') || imgEl.dataset.srcset || '';
        if (srcset) {
          // Parse srcset entries and pick the largest
          let maxW = 0, maxSrc = '';
          srcset.split(',').forEach(entry => {
            const parts = entry.trim().split(/\s+/);
            const url = parts[0];
            const wMatch = (parts[1] || '').match(/(\d+)w/);
            const w = wMatch ? parseInt(wMatch[1]) : 0;
            if (w > maxW && url) { maxW = w; maxSrc = url; }
          });
          if (maxSrc && maxW > 300) best = maxSrc;
        }
      }
    }
    let result = best.startsWith('//') ? 'https:' + best : best;
    // v9.0: Upgrade Shopify CDN thumbnail URLs to larger versions
    return upgradeImageUrl(result);
  }

  // v9.0: Upgrade image URL to highest available resolution
  function upgradeImageUrl(url) {
    if (!url) return url;
    // Shopify CDN: upgrade size suffix from _NNNxNNN to _1024x1024
    // Pattern: filename_200x200.jpg → filename_1024x1024.jpg
    if (url.includes('/cdn/shop/') || url.includes('cdn.shopify.com')) {
      // Replace _NNNxNNN size suffix with _1024x1024
      url = url.replace(/_(\d{1,4})x(\d{1,4})(\.(?:jpg|jpeg|png|webp|gif|avif))/i, '_1024x1024$3');
      // Replace ?width=NNN or &width=NNN with width=1024
      url = url.replace(/([?&])width=\d+/g, '$1width=1024');
      // Remove crop and v params that force small sizes
      url = url.replace(/&?crop=\w+/g, '');
    }
    // Etsy: upgrade to full size
    if (url.includes('etsystatic.com') || url.includes('etsy.com')) {
      url = url.replace(/il_\d+x\w+/g, 'il_fullxfull');
    }
    return url;
  }

  function fullUrl(href) { return href?.startsWith('http') ? href.split('?')[0] : window.location.origin + (href?.startsWith('/') ? '' : '/') + (href || '').split('?')[0]; }
  function humanize(h) { return h.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).substring(0, 80); }

  // ============================================================
  // ACTIVATION (mode-aware)
  // ============================================================
  // v9.2: Track last activated URL to detect if page changed
  let _lastActivatedUrl = '';

  async function activate(mode, forceReload = false) {
    try {
      // v9.2: Skip full re-crawl if already active with same mode, same page, and products exist
      const sameUrl = _lastActivatedUrl === window.location.href;
      if (!forceReload && isActive && currentMode === mode && sameUrl && products.length > 0) {
        console.log(`[STS Clipart Pro 8.3 v9.2] Resume mode=${mode}, ${products.length} products cached — skip re-crawl`);
        renderToolbar();
        showToolbar();
        highlightByMode();
        return;
      }

      currentMode = mode;
      isActive = true;
      bookmarkIndex = -1;
      selectedIndexes.clear();
      _overlayCount = 0;
      clearHL();
      _lastActivatedUrl = window.location.href;

      console.log(`[STS Clipart Pro 8.3 v9.2] Activate mode: ${mode}, URL: ${window.location.href}`);

      // ═══ v8.3.0: Show toolbar IMMEDIATELY — don't wait for product detection ═══
      // Detect platform first so toolbar shows correct platform name
      platform = detectPlatform();
      renderToolbar();
      showToolbar();

      try {
        detectProducts();
      } catch(err) {
        console.error(`[STS Clipart Pro 8.3 v8.3.0] detectProducts CRASHED:`, err);
      }
      console.log(`[STS Clipart Pro 8.3 v8.3.0] Initial detect: ${products.length} products, platform: ${platform}`);

      // ═══ v8.3.0: Update toolbar after initial detect ═══
      renderToolbar();

      if (products.length) {
        tryShopifyApiSupplement(); // fire and forget
        initMode();
        return;
      }

      // Progressive retry for JS-rendered pages (1s, 2.5s, 5s)
      const retries = [1000, 2500, 5000];
      for (const delay of retries) {
        await new Promise(r => setTimeout(r, delay));
        try {
          detectProducts();
        } catch(err) {
          console.error(`[STS Clipart Pro 8.3 v8.3.0] detectProducts retry CRASHED:`, err);
        }
        console.log(`[STS Clipart Pro 8.3 v8.3.0] Retry after ${delay}ms: ${products.length} products`);
        // ═══ v8.3.0: Update toolbar status after each retry ═══
        renderToolbar();
        if (products.length) {
          tryShopifyApiSupplement();
          initMode();
          return;
        }
      }

      // Last resort: Shopify API fallback for collection pages
      const isCollection = window.location.pathname.match(/\/collections\/[^/?#]+/);
      console.log(`[STS Clipart Pro 8.3 v8.3.0] All retries exhausted. isCollection: ${!!isCollection}, platform: ${platform}`);

      if (platform === 'shopify' || isCollection) {
        platform = 'shopify';
        console.log(`[STS Clipart Pro 8.3 v8.3.0] Trying Shopify API fallback...`);
        const beforeApi = products.length;
        await detectShopifyApi();
        console.log(`[STS Clipart Pro 8.3 v8.3.0] After API: ${products.length} products (was ${beforeApi})`);
        if (products.length > beforeApi && products.some(p => !p.card)) {
          await new Promise(r => setTimeout(r, 1500));
          matchApiProductsToDom();
        }
      }

      initMode();
    } catch(err) {
      console.error(`[STS Clipart Pro 8.3 v8.3.0] ACTIVATE FATAL ERROR:`, err);
      // ═══ v8.3.0: Even on fatal error, ensure toolbar is visible ═══
      renderToolbar();
      showToolbar();
    }
  }

  // v3.0: Try API in background to supplement DOM-detected products
  async function tryShopifyApiSupplement() {
    const isCollection = window.location.pathname.match(/\/collections\/[^/?#]+/);
    if (!isCollection || platform !== 'shopify') return;
    try {
      const beforeApi = products.length;
      await detectShopifyApi();
      if (products.length > beforeApi) {
        matchApiProductsToDom();
        console.log(`[STS Clipart Pro 8.3 v3.0] API supplement: +${products.length - beforeApi} products`);
        // Re-render if we got more products
        highlightByMode();
        renderToolbar();
        updateProductPanel();
      }
    } catch(e) { console.log(`[STS Clipart Pro 8.3 v3.0] API supplement failed:`, e); }
  }

  function initMode() {
    const noCardCount = products.filter(p => !p.card).length;
    const apiOnly = products.length > 0 && noCardCount > products.length / 2;

    if (currentMode === 'fullpage' || apiOnly) {
      // Auto-select all — either fullpage mode or API-only products (can't click individual cards)
      products.forEach((_, i) => selectedIndexes.add(i));
      if (apiOnly && currentMode !== 'fullpage') {
        notify(`\u26A1 ${products.length} SP t\u1EEB API \u2014 \u0111\u00E3 ch\u1ECDn t\u1EA5t c\u1EA3, nh\u1EA5n Sync \u0111\u1EC3 \u0111\u1ED3ng b\u1ED9`, 'info');
      }
    }
    highlightByMode();
    renderToolbar();
    showToolbar();

    // If no overlays were created but products exist, show product list panel
    if (_overlayCount === 0 && products.length > 0) {
      console.log(`[STS Clipart Pro 8.3 v3.0] 0 overlays for ${products.length} products — showing product list panel`);
      showProductPanel();
    }
  }

  // ============================================================
  // HIGHLIGHTING — Direct appendChild into .card elements (NO Shadow DOM)
  // Card has position:relative + overflow:visible → overlay with position:absolute works
  // ============================================================

  function clearHL() {
    // v3.0: Restore pointer-events on links that were disabled
    document.querySelectorAll('a[data-sts-orig-pointer-events]').forEach(a => {
      a.style.pointerEvents = a.dataset.stsOrigPointerEvents || '';
      delete a.dataset.stsOrigPointerEvents;
    });
    document.querySelectorAll('.sts-ov').forEach(el => el.remove());
  }

  // v3.1.1: Refresh stale card DOM references (theme may replace DOM on scroll/lazy-load)
  function refreshCardRefs() {
    let refreshed = 0;
    products.forEach(p => {
      // Check if card is still in the document
      if (p.card && p.card.isConnected) return;
      // Card is detached — try to re-find by handle
      const handle = p.handle || (p.url && p.url.match(/\/products\/([^/?#]+)/)?.[1]);
      if (!handle) return;
      const link = document.querySelector(`a[href*="/products/${handle}"]`);
      if (link) {
        const skipAncestor = link.closest('nav, header, footer, .header, .footer, .nav');
        if (skipAncestor) return;
        const newCard = findCard(link);
        if (newCard && newCard.isConnected) { p.card = newCard; refreshed++; }
      }
    });
    if (refreshed > 0) console.log(`[STS Clipart Pro 8.3 v3.1.1] Refreshed ${refreshed} stale card references`);
  }

  // Find the .card element for a product (walk up from p.card or find by handle)
  function findCardElement(p) {
    if (p.card) {
      // p.card might already be a .card, or a parent/child of one
      if (p.card.classList && p.card.classList.contains('card')) return p.card;
      const closest = p.card.closest('.card');
      if (closest) return closest;
      return p.card; // fallback: use whatever card we have
    }
    // Try to find by product handle link
    if (p.handle) {
      const link = document.querySelector(`a[href*="/products/${p.handle}"],a[href*="${p.handle}"]`);
      if (link) {
        const closest = link.closest('.card');
        if (closest) return closest;
        return findCard(link);
      }
    }
    return null;
  }

  function highlightByMode() {
    refreshCardRefs(); // v3.1.1: fix stale DOM references before re-rendering
    clearHL();
    _overlayCount = 0;
    let noCardCount = 0;

    // v7.0.4-fix: Separate DOM reads (getComputedStyle) from DOM writes to avoid layout thrashing
    // Phase 1: Read all card positions first (batch reads)
    const cardData = [];
    products.forEach((p, i) => {
      const card = findCardElement(p);
      if (!card) { noCardCount++; return; }
      const pos = window.getComputedStyle(card).position;
      cardData.push({ card, i, needsPosition: pos === 'static' });
    });

    // Phase 2: Write all DOM changes (batch writes — no interleaved reads)
    cardData.forEach(({ card, i, needsPosition }) => {
      if (needsPosition) card.style.position = 'relative';

      const ov = document.createElement('div');
      ov.className = 'sts-ov';
      ov.dataset.idx = String(i);

      const { border, bg, shadow, badge } = getOverlayVisual(i);

      ov.style.cssText = [
        'position:absolute !important',
        'top:0 !important',
        'left:0 !important',
        'width:100% !important',
        'height:100% !important',
        `border:${border} !important`,
        `background:${bg || 'transparent'} !important`,
        `box-shadow:${shadow || 'none'} !important`,
        'pointer-events:auto !important',
        'cursor:pointer !important',
        'z-index:2147483647 !important',
        'box-sizing:border-box !important',
        'display:block !important',
        'border-radius:inherit !important',
      ].join(';');

      ov.innerHTML = badge;

      // v3.0: Disable all links inside the card so clicks don't go to product page
      card.querySelectorAll('a').forEach(a => {
        a.dataset.stsOrigPointerEvents = a.style.pointerEvents || '';
        a.style.pointerEvents = 'none';
      });

      card.appendChild(ov);
      _overlayCount++;
    });
    console.log(`[STS Clipart Pro 8.3 v3.0] Overlays: ${_overlayCount}/${products.length} (noCard: ${noCardCount})`);
  }

  function setBookmark(i) {
    bookmarkIndex = i;
    highlightByMode();
    renderToolbar();
    updateProductPanel();
    notify(`\u{1F516} ${products[i].title.substring(0, 40)}...`, 'info');
  }

  // v3.1.1: Compute overlay visual for a single product index
  function getOverlayVisual(i) {
    let border = '', bg = '', shadow = '', badge = '';
    if (currentMode === 'bookmark') {
      if (i === bookmarkIndex) {
        border = '4px solid #E65100'; shadow = '0 0 0 2px #E65100, inset 0 0 0 2px #E65100';
        badge = `<span style="position:absolute !important;top:4px !important;left:4px !important;background:#E65100 !important;color:#fff !important;padding:2px 6px !important;border-radius:4px !important;font-size:11px !important;font-weight:700 !important;pointer-events:none !important;z-index:10000 !important;">\u{1F516}</span>`;
      } else if (bookmarkIndex >= 0 && i < bookmarkIndex) {
        border = '3px solid #2F7D57'; bg = 'rgba(74,124,89,0.08)'; shadow = '0 0 0 2px #2F7D57';
        badge = `<span style="position:absolute !important;top:4px !important;right:4px !important;background:#2F7D57 !important;color:#fff !important;padding:2px 6px !important;border-radius:4px !important;font-size:11px !important;pointer-events:none !important;z-index:10000 !important;">\u2728</span>`;
      } else {
        border = '3px solid #1565C0'; bg = 'rgba(21,101,192,0.05)'; shadow = '0 0 0 1px #1565C0';
      }
    } else {
      if (selectedIndexes.has(i)) {
        border = '3px solid #2F7D57'; bg = 'rgba(74,124,89,0.1)'; shadow = '0 0 0 2px #2F7D57';
        badge = `<span style="position:absolute !important;top:4px !important;right:4px !important;background:#2F7D57 !important;color:#fff !important;padding:2px 6px !important;border-radius:4px !important;font-size:11px !important;font-weight:700 !important;pointer-events:none !important;z-index:10000 !important;">\u2705</span>`;
      } else {
        border = '2px dashed rgba(21,101,192,0.5)'; bg = 'rgba(21,101,192,0.03)'; shadow = '0 0 0 1px rgba(21,101,192,0.2)';
      }
    }
    return { border, bg, shadow, badge };
  }

  // v3.1.1: Update a single overlay visual WITHOUT destroying/recreating
  // v7.0.4-fix: Use setProperty() to properly override !important styles
  // Chrome ignores !important when using style.property = "value !important"
  function updateSingleOverlay(idx) {
    const ov = document.querySelector(`.sts-ov[data-idx="${idx}"]`);
    if (!ov) return false;
    const v = getOverlayVisual(idx);
    ov.style.setProperty('border', v.border, 'important');
    ov.style.setProperty('background', v.bg || 'transparent', 'important');
    ov.style.setProperty('box-shadow', v.shadow || 'none', 'important');
    ov.innerHTML = v.badge;
    return true;
  }

  // v7.0.4-fix: Batch update ALL overlays' visuals without destroying/recreating DOM
  // Uses requestAnimationFrame to batch DOM reads/writes and avoid layout thrashing
  function batchUpdateAllOverlays() {
    const allOverlays = document.querySelectorAll('.sts-ov[data-idx]');
    if (allOverlays.length === 0) {
      // No overlays exist yet — need full render
      highlightByMode();
      return;
    }
    // Batch all style updates in a single rAF to minimize reflows
    requestAnimationFrame(() => {
      allOverlays.forEach(ov => {
        const idx = parseInt(ov.dataset.idx, 10);
        if (isNaN(idx)) return;
        const v = getOverlayVisual(idx);
        // Must use setProperty() to override existing !important styles from cssText
        ov.style.setProperty('border', v.border, 'important');
        ov.style.setProperty('background', v.bg || 'transparent', 'important');
        ov.style.setProperty('box-shadow', v.shadow || 'none', 'important');
        ov.innerHTML = v.badge;
      });
    });
  }

  // v3.1.1: Debounce flag to prevent double-toggle from mousedown+click
  let _toggleLock = false;
  function toggleSelect(i) {
    if (_toggleLock) return;
    _toggleLock = true;
    setTimeout(() => { _toggleLock = false; }, 100); // v7.0.4-fix: 300ms → 100ms, less blocking for rapid clicks

    console.log(`[STS Clipart Pro 8.3 v3.1.1] toggleSelect(${i}): was ${selectedIndexes.has(i) ? 'selected' : 'unselected'}`);
    if (selectedIndexes.has(i)) selectedIndexes.delete(i);
    else selectedIndexes.add(i);
    console.log(`[STS Clipart Pro 8.3 v3.1.1] toggleSelect(${i}): now ${selectedIndexes.has(i) ? 'selected' : 'unselected'}, total: ${selectedIndexes.size}`);

    // v3.1.1: Only update the clicked overlay, don't destroy/recreate ALL overlays
    const updated = updateSingleOverlay(i);
    if (!updated) {
      // Overlay not found — fallback to full re-render
      console.log(`[STS Clipart Pro 8.3 v3.1.1] Overlay not found for idx=${i}, doing full re-render`);
      highlightByMode();
    }
    renderToolbar();
    updateProductPanel();
  }

  // ============================================================
  // UI BRIDGE — extension iframe shell
  // Content script owns state and DOM side effects.
  // The iframe is a pure view that sends intent messages only.
  // ============================================================

  function isTopWindow() {
    try { return window.top === window; } catch (e) { return true; }
  }

  function getUiFrame() {
    if (!isTopWindow()) return null;
    if (_uiFrame && _uiFrame.isConnected) return _uiFrame;
    _uiFrame = document.getElementById(STS_UI_IDS.frame);
    return _uiFrame && _uiFrame.isConnected ? _uiFrame : null;
  }

  function getUiHost() {
    if (!isTopWindow()) return null;
    if (_uiHost && _uiHost.isConnected) return _uiHost;
    _uiHost = document.getElementById(STS_UI_IDS.host);
    return _uiHost && _uiHost.isConnected ? _uiHost : null;
  }

  function getUiAnchor() {
    if (!isTopWindow()) return null;
    if (_uiAnchor && _uiAnchor.isConnected) return _uiAnchor;
    _uiAnchor = document.getElementById(STS_UI_IDS.anchor);
    return _uiAnchor && _uiAnchor.isConnected ? _uiAnchor : null;
  }

  function getVisualViewportBox() {
    const vv = window.visualViewport;
    if (!vv) {
      return {
        left: 0,
        top: 0,
        width: Math.max(document.documentElement?.clientWidth || 0, window.innerWidth || 0),
        height: Math.max(document.documentElement?.clientHeight || 0, window.innerHeight || 0)
      };
    }
    return {
      left: Math.max(0, Math.round(vv.offsetLeft || 0)),
      top: Math.max(0, Math.round(vv.offsetTop || 0)),
      width: Math.max(0, Math.round(vv.width || window.innerWidth || 0)),
      height: Math.max(0, Math.round(vv.height || window.innerHeight || 0))
    };
  }

  function applyUiHostLayout() {
    const host = getUiHost();
    const anchor = getUiAnchor();
    if (!host || !anchor) return;

    const box = getVisualViewportBox();
    host.style.left = `${box.left}px`;
    host.style.top = `${box.top}px`;
    host.style.width = `${box.width}px`;
    host.style.height = `${box.height}px`;

    anchor.style.left = '0';
    anchor.style.top = '0';
    anchor.style.width = `${box.width}px`;
    anchor.style.height = `${box.height}px`;
  }

  function scheduleUiHostLayout() {
    if (!isTopWindow()) return;
    cancelAnimationFrame(_uiHostRaf);
    _uiHostRaf = requestAnimationFrame(applyUiHostLayout);
  }

  function bindUiHostGuards() {
    if (!isTopWindow() || _uiHostObserverBound) return;
    _uiHostObserverBound = true;

    const sync = () => {
      ensureUiFrame();
      scheduleUiHostLayout();
    };

    window.addEventListener('resize', sync, { passive: true });
    window.addEventListener('scroll', scheduleUiHostLayout, { passive: true, capture: true });
    window.addEventListener('orientationchange', sync, { passive: true });

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', scheduleUiHostLayout, { passive: true });
      window.visualViewport.addEventListener('scroll', scheduleUiHostLayout, { passive: true });
    }

    const mo = new MutationObserver(() => {
      const host = getUiHost();
      if (!host || !host.isConnected || host.parentNode !== document.documentElement) {
        _uiHost = null;
        _uiAnchor = null;
        _uiFrame = null;
        ensureUiFrame();
      } else if (document.documentElement.lastElementChild !== host) {
        document.documentElement.appendChild(host);
      }
    });

    const root = document.documentElement || document.body;
    if (root) mo.observe(root, { childList: true });

    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) sync();
    });
  }

  function sanitizeUiProduct(p, i) {
    const isSelected = currentMode === 'bookmark'
      ? (bookmarkIndex >= 0 && i === bookmarkIndex)
      : selectedIndexes.has(i);
    const isNew = currentMode === 'bookmark' && bookmarkIndex >= 0 && i < bookmarkIndex;
    return {
      index: i,
      title: String(p?.title || p?.handle || `Product ${i + 1}`),
      handle: String(p?.handle || ''),
      image: String(p?.image || ''),
      url: String(p?.url || ''),
      selected: isSelected,
      isNew
    };
  }

  function buildUiSnapshot() {
    const ok = !!auth;
    const syncCount = currentMode === 'bookmark'
      ? (bookmarkIndex >= 0 ? bookmarkIndex : 0)
      : selectedIndexes.size;

    let statusHtml = '';
    if (!ok) {
      statusHtml = '⚠️ Chưa đăng nhập';
    } else if (!currentMode || !isActive) {
      statusHtml = 'Chọn chế độ từ popup';
    } else if (!products.length) {
      statusHtml = `0 sản phẩm (${platform})`;
    } else if (currentMode === 'bookmark') {
      statusHtml = bookmarkIndex < 0
        ? `<b>${products.length}</b> SP — click để bookmark`
        : `<span class="sts-count">${syncCount} mới</span>`;
    } else {
      statusHtml = `<span class="sts-count">${syncCount}/${products.length}</span> đã chọn`;
    }

    return {
      toolbarVisible: _toolbarVisible,
      panelVisible: _panelVisible,
      syncInFlight: _uiSyncInFlight,
      isActive,
      mode: currentMode,
      modeIcon: MODE_ICONS[currentMode] || 'M',
      platform,
      hasAuth: ok,
      productCount: products.length,
      syncCount,
      bookmarkIndex,
      selectedCount: selectedIndexes.size,
      canShowList: ok && isActive && products.length > 0,
      canToggleAll: ok && isActive && currentMode !== 'bookmark',
      canClearBookmark: currentMode === 'bookmark' && bookmarkIndex >= 0,
      canSync: ok && isActive && syncCount > 0,
      canRescan: ok && isActive,
      canCancel: ok && isActive,
      toggleAllLabel: currentMode === 'fullpage' && selectedIndexes.size === products.length ? '☐' : '☑',
      modeLabel: currentMode === 'bookmark'
        ? 'Click để đặt bookmark'
        : currentMode === 'manual'
          ? 'Click để chọn/bỏ'
          : 'Click để bỏ chọn',
      statusHtml,
      products: products.map(sanitizeUiProduct)
    };
  }

  function postUiMessage(type, payload) {
    const frame = getUiFrame();
    if (!frame || !frame.contentWindow) return;
    frame.contentWindow.postMessage({
      source: 'sts-content',
      type,
      payload
    }, STS_UI_ORIGIN);
  }

  function syncUiState() {
    if (!isTopWindow()) return;
    const frame = getUiFrame();
    if (!frame || !_uiReady) return;
    postUiMessage('STS_UI_STATE', buildUiSnapshot());
  }

  function scheduleUiSync() {
    if (!isTopWindow()) return;
    requestAnimationFrame(syncUiState);
  }

  function applyUiFrameSize(width, height) {
    const frame = getUiFrame();
    const anchor = getUiAnchor();
    if (!frame || !anchor) return;

    const hostBox = getVisualViewportBox();
    const gutter = 16;
    const safeWidth = Math.max(72, Math.min(Math.round(width || 72), Math.max(hostBox.width - gutter, 72)));
    const safeHeight = Math.max(72, Math.min(Math.round(height || 72), Math.max(hostBox.height - gutter, 72)));

    frame.style.width = `${safeWidth}px`;
    frame.style.height = `${safeHeight}px`;
    frame.style.maxWidth = `${Math.max(hostBox.width - gutter, 72)}px`;
    frame.style.maxHeight = `${Math.max(hostBox.height - gutter, 72)}px`;
    anchor.style.padding = '16px';
  }

  function ensureUiFrame() {
    if (!isTopWindow()) return null;

    let host = document.getElementById(STS_UI_IDS.host);
    if (!host) {
      host = document.createElement('div');
      host.id = STS_UI_IDS.host;
      host.setAttribute('data-sts-ui-root', '1');
      host.style.cssText = [
        'all:initial',
        'position:fixed',
        'inset:0 auto auto 0',
        'z-index:2147483647',
        'pointer-events:none',
        'margin:0',
        'padding:0',
        'border:0',
        'background:transparent',
        'opacity:1',
        'visibility:visible',
        'display:block',
        'overflow:visible',
        'contain:layout style paint',
        'isolation:isolate',
        'transform:none',
        'filter:none',
        'clip-path:none'
      ].join(';');
      (document.documentElement || document.body || document.head).appendChild(host);
    }

    let anchor = document.getElementById(STS_UI_IDS.anchor);
    if (!anchor) {
      anchor = document.createElement('div');
      anchor.id = STS_UI_IDS.anchor;
      anchor.style.cssText = [
        'position:absolute',
        'inset:0',
        'display:flex',
        'align-items:flex-end',
        'justify-content:flex-end',
        'pointer-events:none',
        'box-sizing:border-box'
      ].join(';');
      host.appendChild(anchor);
    }

    let frame = document.getElementById(STS_UI_IDS.frame);
    if (!frame) {
      frame = document.createElement('iframe');
      frame.id = STS_UI_IDS.frame;
      frame.src = chrome.runtime.getURL('panel.html');
      frame.title = 'STS Clipart Pro 8.3 Panel';
      frame.setAttribute('scrolling', 'no');
      frame.setAttribute('allowtransparency', 'true');
      frame.setAttribute('aria-live', 'polite');
      frame.style.cssText = [
        'display:block',
        'width:72px',
        'height:72px',
        'border:none',
        'outline:none',
        'border-radius:0',
        'background:transparent',
        'overflow:hidden',
        'pointer-events:auto',
        'box-sizing:border-box',
        'position:relative',
        'margin:0',
        'padding:0',
        'max-width:calc(100vw - 16px)',
        'max-height:calc(100vh - 16px)',
        'transform:translate3d(0,0,0)',
        'transform-origin:bottom right'
      ].join(';');
      frame.addEventListener('load', () => {
        _uiReady = false;
        scheduleUiHostLayout();
        scheduleUiSync();
      });
      anchor.appendChild(frame);
    }

    _uiHost = host;
    _uiAnchor = anchor;
    _uiFrame = frame;
    applyUiHostLayout();
    bindUiHostGuards();
    return frame;
  }

  function createUI() {
    ensureUiFrame();
    scheduleUiHostLayout();
    scheduleUiSync();
  }

  function toggleToolbar() {
    _toolbarVisible = !_toolbarVisible;
    if (!_toolbarVisible) _panelVisible = false;
    scheduleUiSync();
  }

  function showToolbar() {
    _toolbarVisible = true;
    scheduleUiSync();
  }

  function renderToolbar() {
    scheduleUiSync();
  }

  function showProductPanel() {
    _panelVisible = true;
    _toolbarVisible = true;
    scheduleUiSync();
  }

  function hideProductPanel() {
    _panelVisible = false;
    scheduleUiSync();
  }

  function toggleProductPanel() {
    _panelVisible = !_panelVisible;
    if (_panelVisible) _toolbarVisible = true;
    scheduleUiSync();
  }

  function renderProductPanel() {
    _panelVisible = true;
    _toolbarVisible = true;
    scheduleUiSync();
  }

  function updateProductPanel() {
    scheduleUiSync();
  }

  function cancelCrawl() {
    clearHL();
    hideProductPanel();
    isActive = false;
    currentMode = null;
    products = [];
    bookmarkIndex = -1;
    selectedIndexes.clear();
    _overlayCount = 0;
    renderToolbar();
    notify('Hủy crawl thành công', 'info');
  }

  function handleUiAction(action, payload) {
    if (!action) return;

    switch (action) {
      case 'toggle-toolbar':
        toggleToolbar();
        return;
      case 'close-toolbar':
        _toolbarVisible = false;
        _panelVisible = false;
        renderToolbar();
        return;
      case 'toggle-panel':
        toggleProductPanel();
        return;
      case 'hide-panel':
        hideProductPanel();
        return;
      case 'sync':
        syncProducts();
        return;
      case 'rescan':
        hideProductPanel();
        activate(currentMode);
        return;
      case 'clear-bookmark':
        bookmarkIndex = -1;
        highlightByMode();
        renderToolbar();
        updateProductPanel();
        return;
      case 'cancel':
        cancelCrawl();
        return;
      case 'toggle-all':
        if (selectedIndexes.size === products.length) selectedIndexes.clear();
        else products.forEach((_, i) => selectedIndexes.add(i));
        batchUpdateAllOverlays();
        renderToolbar();
        updateProductPanel();
        return;
      case 'select-product': {
        const idx = Number(payload?.index);
        if (!Number.isInteger(idx) || idx < 0 || idx >= products.length) return;
        if (currentMode === 'bookmark') setBookmark(idx);
        else toggleSelect(idx);
        return;
      }
      default:
        return;
    }
  }

  function bindUiBridge() {
    if (!isTopWindow()) return;

    window.addEventListener('message', (event) => {
      if (event.origin !== STS_UI_ORIGIN) return;
      if (event.source !== getUiFrame()?.contentWindow) return;
      const data = event.data || {};
      if (data.source !== 'sts-panel') return;

      if (data.type === 'STS_UI_READY') {
        _uiReady = true;
        ensureUiFrame();
        scheduleUiHostLayout();
        syncUiState();
        return;
      }

      if (data.type === 'STS_UI_RESIZE') {
        cancelAnimationFrame(_uiResizeRaf);
        _uiResizeRaf = requestAnimationFrame(() => {
          ensureUiFrame();
          scheduleUiHostLayout();
          applyUiFrameSize(data.payload?.width, data.payload?.height);
        });
        return;
      }

      if (data.type === 'STS_UI_ACTION') {
        handleUiAction(data.payload?.action, data.payload);
      }
    }, false);
  }

  // ============================================================
  // SYNC (mode-aware)
  // ============================================================
  // SYNC (mode-aware)
  // ============================================================
  function getProductsToSync() {
    if (currentMode === 'bookmark') {
      return bookmarkIndex > 0 ? products.slice(0, bookmarkIndex) : [];
    }
    // manual & fullpage
    return products.filter((_, i) => selectedIndexes.has(i));
  }

  async function syncProducts() {
    const toSync = getProductsToSync();
    if (!toSync.length || !auth) return;

    _uiSyncInFlight = true;
    syncUiState();

    try {
      const hdr = { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' };
      const pageUrl = window.location.origin + window.location.pathname;

      // Find/create website
      let wId;
      const sr = await (await fetch(`${SUPABASE_URL}/rest/v1/competitor_websites?url=eq.${encodeURIComponent(pageUrl)}&select=id`, { headers: hdr })).json();
      if (sr?.length) wId = sr[0].id;
      else {
        const cr = await (await fetch(`${SUPABASE_URL}/rest/v1/competitor_websites`, { method: 'POST', headers: { ...hdr, 'Prefer': 'return=representation' }, body: JSON.stringify({ name: new URL(pageUrl).hostname.replace('www.', ''), url: pageUrl }) })).json();
        wId = cr[0]?.id;
      }

      // v8.3.0: Pre-fetch existing idea URLs (link_spy) for cross-check duplicate
      let existingIdeaUrls = new Set();
      try {
        const ideaData = await (await fetch(`${SUPABASE_URL}/rest/v1/ideas?is_deleted=eq.false&select=link_spy`, { headers: hdr })).json();
        if (Array.isArray(ideaData)) {
          ideaData.forEach(i => {
            if (i.link_spy) {
              try {
                const u = new URL(i.link_spy.trim());
                existingIdeaUrls.add(u.hostname.toLowerCase().replace(/^www\./, '') + (u.pathname.replace(/\/+$/, '') || ''));
              } catch {}
            }
          });
        }
      } catch {}

      let ins = 0, skippedDup = 0;
      for (const p of toSync) {
        // v8.3.0: Check duplicate GLOBALLY by product_url (ignore website_id) to prevent cross-page duplicates
        const ck = await (await fetch(`${SUPABASE_URL}/rest/v1/scraped_products?product_url=eq.${encodeURIComponent(p.url)}&select=id`, { headers: hdr })).json();
        if (ck?.length) continue;

        // v8.3.0: Check if already approved in Idea Pool (by normalized URL)
        try {
          const u = new URL(p.url.trim());
          const norm = u.hostname.toLowerCase().replace(/^www\./, '') + (u.pathname.replace(/\/+$/, '') || '');
          if (existingIdeaUrls.has(norm)) { skippedDup++; continue; }
        } catch {}

        // v3.0.3: Ensure image URL has protocol
        let imgUrl = p.image || '';
        if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;

        // v3.0.3: If no image, try to get from product page JSON
        if (!imgUrl && p.url) {
          try {
            const productJsonUrl = p.url.split('?')[0] + '.json';
            const pRes = await fetch(productJsonUrl);
            if (pRes.ok) {
              const pData = await pRes.json();
              imgUrl = pData.product?.images?.[0]?.src || pData.product?.image?.src || '';
            }
          } catch(e) { /* ignore */ }
        }

        // v3.0.3: If still no image, try DOM card
        if (!imgUrl && p.card) {
          const img = p.card.querySelector('img');
          if (img) imgUrl = img.src || img.dataset.src || '';
          if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;
        }

        // v9.0: Upgrade image URL to high-res version (Shopify CDN, Etsy, etc.)
        imgUrl = upgradeImageUrl(imgUrl);

        // v9.0: Ensure title is valid — fallback to humanized handle
        let syncTitle = p.title || '';
        if (!syncTitle || syncTitle.startsWith('<') || syncTitle.includes('src=') || /^https?:\/\//i.test(syncTitle) || /^\/\//i.test(syncTitle)) {
          syncTitle = humanize(p.handle || '');
        }

        const r = await fetch(`${SUPABASE_URL}/rest/v1/scraped_products`, { method: 'POST', headers: { ...hdr, 'Prefer': 'return=minimal' }, body: JSON.stringify({ website_id: wId, product_url: p.url, product_title: syncTitle, product_image: imgUrl, trademark_status: 'pending', status: 'new' }) });
        if (r.ok) ins++;
      }

      // Update bookmark if bookmark mode
      if (currentMode === 'bookmark' && bookmarkIndex > 0) {
        await fetch(`${SUPABASE_URL}/rest/v1/competitor_websites?id=eq.${wId}`, {
          method: 'PATCH', headers: hdr,
          body: JSON.stringify({ last_scraped_product_url: products[bookmarkIndex].url, last_scraped_at: new Date().toISOString() }),
        });
      }

      const dupMsg = skippedDup > 0 ? ` (${skippedDup} trùng IP)` : '';
      notify(`\u2705 \u0110\u00E3 sync ${ins} s\u1EA3n ph\u1EA9m!${dupMsg}`, 'success');
      if (btn) btn.textContent = `\u2713 ${ins}`;
    } catch (err) {
      notify(`\u274C ${err.message}`, 'error');
      if (btn) { btn.disabled = false; btn.textContent = `Sync`; }
    }
  }

  // ============================================================
  // NOTIFICATIONS
  // ============================================================
  function notify(msg, type) {
    const old = document.getElementById('sts-notif'); if (old) old.remove();
    const c = { success: '#2F7D57', error: '#E8453C', warning: '#E65100', info: '#1565C0' };
    const tc = '#FFF';
    const n = document.createElement('div'); n.id = 'sts-notif';
    n.style.cssText = `position:fixed;top:16px;right:16px;z-index:9999999;background:${c[type]};color:${tc};padding:10px 16px;border-radius:8px;--sts-font:Inter,"Segoe UI",sans-serif;font-family:var(--sts-font);font-size:13px;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,0.3);max-width:300px;animation:stsSlide .3s ease;`;
    n.textContent = msg; document.body.appendChild(n);
    setTimeout(() => n.remove(), 3500);
  }

  // ============================================================
  // AUTH & MESSAGING
  // ============================================================
  function loadAuth() {
    try {
      chrome.storage.local.get(['stsClipartProUser'], (d) => {
        if (chrome.runtime.lastError) return;
        if (d.stsClipartProUser?.id) auth = { userId: d.stsClipartProUser.id, userEmail: d.stsClipartProUser.email, userName: d.stsClipartProUser.name };
      });
    } catch (e) {}
  }

  async function isClipartAuthenticated() {
    try {
      var data = await chrome.storage.local.get(['stsClipartProUser', 'stsAuthUser', 'stsAuthToken']);
      var clipartUser = data && data.stsClipartProUser;
      var authUser = data && data.stsAuthUser;
      function hasIdentity(user) {
        return !!(user && (user.username || user.name || user.email || user.id || typeof user === 'string'));
      }
      return hasIdentity(clipartUser) || hasIdentity(authUser);
    } catch (e) {
      return false;
    }
  }

  try {
    chrome.runtime.onMessage.addListener((msg, sender, res) => {
      if (msg.type === 'AUTH_UPDATED') { auth = msg.config; renderToolbar(); res({ ok: true }); }
      if (msg.type === 'AUTH_LOGOUT' || msg.type === 'STS_AUTH_LOGOUT') { auth = null; cleanupInjectedClipartUi(); products = []; bookmarkIndex = -1; selectedIndexes.clear(); res({ ok: true }); }
      if (msg.type === 'GET_STATUS') {
        res({
          isActive, platform, mode: currentMode,
          productCount: products.length,
          bookmarkIndex,
          selectedCount: currentMode === 'bookmark' ? (bookmarkIndex >= 0 ? bookmarkIndex : 0) : selectedIndexes.size,
          newCount: bookmarkIndex >= 0 ? bookmarkIndex : 0,
          hasAuth: !!auth,
        });
      }
      if (msg.type === 'ACTIVATE') {
        activate(msg.mode || 'bookmark', !!msg.forceReload);
        res({ ok: true });
      }
      // v9.2: Resume existing crawl state without re-crawling
      if (msg.type === 'RESUME_CRAWL') {
        if (isActive && products.length > 0) {
          // Just re-show overlays and toolbar — no re-crawl
          renderToolbar();
          showToolbar();
          highlightByMode();
          res({ ok: true, resumed: true, productCount: products.length, mode: currentMode });
        } else {
          res({ ok: false, resumed: false, productCount: 0 });
        }
      }
      if (msg.type === 'CLIPART_SCAN') {
        if (window.__stsClipartPro) {
          isClipartAuthenticated().then(function(ok) {
            if (!ok) {
              cleanupInjectedClipartUi();
              res({ ok: false, error: 'Vui lòng đăng nhập trước khi scan' });
              return;
            }
            window.__stsClipartPro.scan(msg && msg.entrypointId ? msg.entrypointId : 'product-crawler').then(data => res({ ok: true, data }));
          });
        } else {
          res({ ok: false, error: 'Clipart scanner not loaded' });
        }
        return true;
      }
      if (msg.type === 'CLIPART_MANUAL_SCAN') {
        if (window.__stsClipartPro) {
          isClipartAuthenticated().then(function(ok) {
            if (!ok) {
              cleanupInjectedClipartUi();
              res({ ok: false, error: 'Vui lòng đăng nhập trước khi scan' });
              return;
            }
            window.__stsClipartPro.manualScan();
            res({ ok: true });
          });
        } else {
          res({ ok: false, error: 'Clipart scanner not loaded' });
        }
        return true;
      }
      if (msg.type === 'GET_CLIPART_STATUS') {
        if (window.__stsClipartPro) {
          res(window.__stsClipartPro.getState());
        } else {
          res({ isScanning: false, hasScan: false, categoryCount: 0 });
        }
      }
      return true;
    });
  } catch (e) {}

  // v3.1.1: Global click handler for overlays (more reliable than per-overlay listeners)
  // Uses capture phase at document level — fires FIRST before any theme JS can intercept
  document.addEventListener('mousedown', (e) => {
    const ov = e.target.closest('.sts-ov');
    if (!ov || !isActive || !currentMode) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    const idx = parseInt(ov.dataset.idx);
    if (isNaN(idx)) return;
    console.log(`[STS Clipart Pro 8.3 v3.1] Global mousedown on overlay idx=${idx}, mode=${currentMode}`);
    if (currentMode === 'bookmark') setBookmark(idx);
    else toggleSelect(idx);
  }, true);

  // Also block click to prevent page navigation
  document.addEventListener('click', (e) => {
    const ov = e.target.closest('.sts-ov');
    if (!ov || !isActive || !currentMode) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }, true);

  // Hotkey Alt+M
  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.key.toLowerCase() === 'm') { e.preventDefault(); toggleToolbar(); }
  });

  // ============================================================
  // INIT
  // ============================================================
  function init() {
    bindUiBridge(); loadAuth(); createUI();
    if (!document.getElementById('sts-anim')) {
      const s = document.createElement('style'); s.id = 'sts-anim';
      s.textContent = '@keyframes stsSlide{from{transform:translateX(100px);opacity:0}to{transform:translateX(0);opacity:1}}';
      document.head.appendChild(s);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
