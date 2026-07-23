// Matrixty Extension v9.6.4 — Matrixty Design System + Triple Zone (Crawl Idea / Crawl Clipart / Auto-Fill Listing)
// v9.6.4 (ship 1.3.6): Fix clipart sync hang at "⏳ Syncing..." — compressImage now sets
//         crossOrigin='anonymous', wraps toDataURL in try/catch (canvas-taint no longer
//         leaves the Promise pending), and has an 8s hard timeout. fetchAsDataUrl gets a
//         10s timeout. Cross-origin imageUrl is now always routed through the background
//         (not only when zoom>1×), so default-zoom sync no longer freezes on tainted swatches.
// v9.6.3: Strict cross-shop duplicate detection. CK1/CK2/CK3 all match by handle alone,
//         regardless of which shop. If the product is anywhere in MATRIXTY (scraped_products
//         any status, or ideas with is_deleted=false), block re-crawl.
// v9.6.2: Replace visible auto-scroll with SILENT force-load (data-src→src, loading=eager) — UX no longer interrupted on Crawl click
// v9.6.1: Idea crawl thumbnails — auto-scroll for lazy-load, post-crawl image refresh, placeholder validation, .json fallback hardened, CDN guess last-resort
// v9.6.0: "Tạo ảnh 1500×1500" honors per-group _thumbScales — each group renders at baseTh × scale
// v9.5.4: Subtle resize handle (6px gray pill, expands+labels on hover) + title font scales with zoom
// v9.5.3: ALWAYS replace mtx-clip-style on every panel open (old extension's stale CSS was cached), bump handle 18→22px, all !important
// v9.5.2: Drag-resize handle — 6px→18px with green gradient + "⇕ KÉO ĐỂ PHÓNG TO ⇕" text label
// v9.5.1: Zoom buttons — bigger, color-coded (green +, amber −), event delegation (capture-phase), step 0.25→0.5
// v9.5.0: Visible zoom +/− buttons per group, sync output scaled by per-group zoom (CDN fetch bypass for crisp 1000px)
// v9.4.2: Bump output resolution — capture 300→600px, sync 200→500px, no-upscale safeguard
// v9.4.1: Fix Manual/Auto Scan from popup — robust sendMessage + inject-retry pipeline (popup.js)
// v9.4.0: Square clipart capture + sync (1:1 white-padded), bump captured maxDim 200→300, force squareify all synced images
// v9.3.1: Fix CSS.escape on label[for=...] (Shopify ids with quotes), dedup swatch-groups by element + auto-rename duplicate labels (1)/(2)
// v9.3.0: Add scanSwatchContainerTheme() — homacus.com et al. (.swatch-container + .option_name)
// v8.0.9: Deep scanner for unknown frameworks (pawfecthouse etc), iframe support, aggressive label+image detection
// v8.0.8: Highlight titles in Manual Pick, fix notification z-index, fix scroll blocking, auto-name screenshot
// v8.0.7: Smart Manual Pick — find smallest container with label+swatches, avoid grabbing entire form
// v8.0.3: Fix Wanderprints chicken-and-egg: wait for DOM after Customily clicks, re-scroll, multi-round expand
// v8.0.2: Fix scanDOM() to combine Customily + Wanderprints on mixed pages (no early return)
// v8.0.1: Fix Wanderprints auto-expand clipart sections, generic collapse handling
// v8.0.0: Mockup picker on clipart sync, UPSERT for duplicate URLs, fixed grid layout
// Note: Listing messages (LISTING_FILL, GET_LISTING_STATUS, LISTING_CLOSE) are handled by listing.js
console.log('[Matrixty v8.0.9] Content script LOADED on:', window.location.href);

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
    console.log(`[Matrixty v3.0] ${platform}: ${products.length} products`);
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

    console.log(`[Matrixty v3.0] Shopify detect: ${products.length} products (seen: ${seen.size}), mainContent: ${!!mainContent}, foundProducts: ${foundProducts}`);
  }

  async function detectShopifyApi() {
    const collMatch = window.location.pathname.match(/\/collections\/([^/?#]+)/);
    if (!collMatch) { console.log(`[Matrixty v3.0] API skip: not a collection page`); return; }
    const seen = new Set(products.map(p => p.handle));
    let page = 1;
    let apiAdded = 0;
    console.log(`[Matrixty v3.0] API fetching: /collections/${collMatch[1]}/products.json`);
    while (page <= 10) {
      try {
        const apiUrl = `${window.location.origin}/collections/${collMatch[1]}/products.json?limit=250&page=${page}`;
        const resp = await fetch(apiUrl);
        console.log(`[Matrixty v3.0] API page ${page}: status ${resp.status}`);
        if (!resp.ok) break;
        const data = await resp.json();
        if (!data.products || !data.products.length) { console.log(`[Matrixty v3.0] API page ${page}: 0 products, stopping`); break; }
        console.log(`[Matrixty v3.0] API page ${page}: ${data.products.length} products returned`);
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
                  console.log(`[Matrixty v9.2] Fixed title for ${p.handle}: "${curTitle}" → "${p.title}"`);
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
      } catch (e) { console.log(`[Matrixty v3.0] API error:`, e.message); break; }
    }
    if (apiAdded > 0) matchApiProductsToDom();
    console.log(`[Matrixty v3.0] Shopify API total: +${apiAdded} new, ${products.length} total (${products.filter(p => p.card).length} with DOM cards)`);
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

    console.log(`[Matrixty v3.0] DOM match: ${products.filter(p => p.card).length}/${products.length} matched`);
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
    let best = '', sz = 0, bestImgEl = null;
    card.querySelectorAll('img').forEach(i => {
      // v1.2-fix: read all common lazyload attrs; prefer largest srcset descriptor first
      const cand = pickBestImgSrc(i);
      const s = cand.url;
      if (!s || s.includes('svg+xml') || s.includes('placeholder') || /\/icon[s]?\//i.test(s)) return;
      const isShopify = s.includes('cdn.shopify') || s.includes('/cdn/shop/');
      const dim = (i.naturalWidth || i.width || 0) * (i.naturalHeight || i.height || 0);
      // Score = max(srcset width², natural pixel area) + Shopify bonus
      const score = Math.max(cand.score * cand.score, dim) + (isShopify ? 100000 : 0);
      if (score > sz || !best) { sz = score; best = s; bestImgEl = i; }
    });
    // Fallback to <source srcset> if no <img> winner
    if (!best) {
      const source = card.querySelector('source[srcset], img[srcset]');
      if (source) {
        const srcset = source.getAttribute('srcset') || '';
        let maxW = 0, maxSrc = '';
        srcset.split(',').forEach(entry => {
          const parts = entry.trim().split(/\s+/);
          const url = parts[0];
          const wMatch = (parts[1] || '').match(/(\d+)w/);
          const w = wMatch ? parseInt(wMatch[1]) : 1;
          if (w > maxW && url) { maxW = w; maxSrc = url; }
        });
        if (maxSrc) best = maxSrc;
      }
    }
    let result = best.startsWith('//') ? 'https:' + best : best;
    return upgradeImageUrl(result);
  }

  /**
   * v1.2-fix: Pick highest-resolution URL from one <img>.
   * Order: srcset (largest "Nw") → currentSrc → data-* lazy attrs → src.
   * Returns { url, score } where score = srcset width descriptor (or 0).
   */
  function pickBestImgSrc(img) {
    if (!img) return { url: '', score: 0 };
    const ss = img.getAttribute('srcset') || img.getAttribute('data-srcset') || '';
    if (ss) {
      let bestUrl = '', bestScore = 0;
      ss.split(',').forEach(part => {
        const tokens = part.trim().split(/\s+/);
        const u = tokens[0];
        if (!u || u.startsWith('data:')) return;
        const desc = tokens[1] || '';
        let score = 0;
        const wMatch = desc.match(/^(\d+)w$/);
        const xMatch = desc.match(/^([\d.]+)x$/);
        if (wMatch) score = parseInt(wMatch[1], 10);
        else if (xMatch) score = Math.round(parseFloat(xMatch[1]) * 1000);
        else score = 1;
        if (score > bestScore) { bestScore = score; bestUrl = u; }
      });
      if (bestUrl) return { url: bestUrl.startsWith('//') ? 'https:' + bestUrl : bestUrl, score: bestScore };
    }
    if (img.currentSrc && !img.currentSrc.includes('svg+xml') && !img.currentSrc.startsWith('data:')) {
      return { url: img.currentSrc, score: 0 };
    }
    const dataAttrs = ['data-original', 'data-src', 'data-lazy-src', 'data-image', 'data-large_image', 'data-zoom-image'];
    for (const a of dataAttrs) {
      const v = img.getAttribute(a);
      if (v && !v.includes('svg+xml') && !v.startsWith('data:')) {
        return { url: v.startsWith('//') ? 'https:' + v : v, score: 0 };
      }
    }
    const s = img.src || '';
    if (s && !s.includes('svg+xml') && !s.startsWith('data:')) {
      return { url: s.startsWith('//') ? 'https:' + s : s, score: 0 };
    }
    return { url: '', score: 0 };
  }

  /**
   * v1.2-fix: Upgrade product image URL to its highest-resolution master.
   * Strips size suffix entirely (master image), not "_1024x1024" — masters
   * are usually 2000px+. Handles Shopify, Etsy, Amazon, WordPress, generic CDN.
   * Idempotent — safe to call on already-upgraded URLs.
   */
  function upgradeImageUrl(url) {
    if (!url) return url;
    if (url.startsWith('//')) url = 'https:' + url;
    let out = url;
    try {
      const u = new URL(out);
      const host = u.hostname.toLowerCase();
      const isShopify = host.includes('shopify') || host.includes('myshopify') || /\/cdn\/shop\//.test(u.pathname);

      // ── Shopify CDN: cdn.shopify.com, *.myshopify.com, custom domain /cdn/shop/ ──
      // Strip suffixes:
      //   _100x100, _300x, _x300, _500x500_crop_center, _grande@2x, _pico, _icon, _thumb,
      //   _small, _compact, _medium, _large, _grande, _master, _original
      if (isShopify) {
        u.pathname = u.pathname.replace(
          /_(\d+x\d+|\d+x|x\d+|pico|icon|thumb|small|compact|medium|large|grande|original|master)(_crop_[a-z]+)?(@\dx)?(\.(jpg|jpeg|png|webp|gif|avif))/i,
          '$4'
        );
        u.searchParams.delete('width');
        u.searchParams.delete('height');
        u.searchParams.delete('crop');
        out = u.toString();
      }
      // ── Etsy: i.etsystatic.com — il_75x75 / il_300xN → il_fullxfull ──
      else if (host.includes('etsystatic') || host.includes('etsy.com')) {
        u.pathname = u.pathname.replace(/\/il_(\d+x\d+|\d+xN|\d+x[a-z]+)\./i, '/il_fullxfull.');
        out = u.toString();
      }
      // ── Amazon: m.media-amazon.com, ssl-images-amazon — strip _AC_SX300_, _UL320_, etc. ──
      else if (host.includes('amazon') || host.includes('ssl-images-amazon') || host.includes('media-amazon')) {
        u.pathname = u.pathname.replace(/\._[A-Z0-9_,]+_\.(jpg|jpeg|png|webp|gif)/i, '.$1');
        out = u.toString();
      }
      // ── WordPress / generic: image-300x300.jpg → image.jpg + strip size query ──
      else {
        const replaced = u.pathname.replace(/-(\d+x\d+)(\.(jpg|jpeg|png|webp|gif|avif))/i, '$2');
        if (replaced !== u.pathname) u.pathname = replaced;
        ['w', 'h', 'width', 'height', 'size', 'resize'].forEach(p => {
          if (u.searchParams.has(p)) u.searchParams.delete(p);
        });
        out = u.toString();
      }
    } catch {
      // Non-URL fallback — apply Shopify regex to bare string
      out = out.replace(
        /_(\d+x\d+|\d+x|x\d+|pico|icon|thumb|small|compact|medium|large|grande|original|master)(_crop_[a-z]+)?(@\dx)?(\.(jpg|jpeg|png|webp|gif|avif))/i,
        '$4'
      );
      out = out.replace(/il_\d+x\w+/g, 'il_fullxfull');
    }
    return out;
  }

  function fullUrl(href) { return href?.startsWith('http') ? href.split('?')[0] : window.location.origin + (href?.startsWith('/') ? '' : '/') + (href || '').split('?')[0]; }
  function humanize(h) { return h.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).substring(0, 80); }

  // ============================================================
  // ACTIVATION (mode-aware)
  // ============================================================
  // v9.2: Track last activated URL to detect if page changed
  let _lastActivatedUrl = '';

  /**
   * v1.3.1: SILENT force-load — promote lazy attrs to real src/srcset without scrolling.
   *   Replaces the visible auto-scroll (which interrupted the user's view).
   *   - Sets loading="eager" on all imgs (overrides native loading="lazy")
   *   - Promotes data-src / data-original / data-lazy-src / data-image-src → img.src
   *   - Promotes data-srcset → img.srcset (also on <picture> <source> elements)
   *   - Returns immediately; caller awaits a short delay (~400ms) for browser to fetch.
   */
  function forceLoadAllImages() {
    let promoted = 0, eagered = 0;
    const dataAttrs = ['data-src', 'data-original', 'data-lazy-src', 'data-lazy', 'data-image-src', 'data-large-src', 'data-image'];
    document.querySelectorAll('img').forEach(img => {
      // Native lazy → eager (forces immediate fetch)
      if (img.loading === 'lazy') { img.loading = 'eager'; eagered++; }
      // Promote data-srcset → srcset (largest descriptor will then win via browser logic)
      const dataSrcset = img.getAttribute('data-srcset');
      if (dataSrcset && img.getAttribute('srcset') !== dataSrcset) {
        img.srcset = dataSrcset;
        promoted++;
      }
      // Promote data-src → src if no real src yet (or src is data:/placeholder)
      const cur = img.getAttribute('src') || '';
      const isPlaceholder = !cur || cur.startsWith('data:') || cur.length < 12 || /\b1x1\b|placeholder|blank|spacer|transparent/i.test(cur);
      if (isPlaceholder) {
        for (const attr of dataAttrs) {
          const v = img.getAttribute(attr);
          if (v && !v.startsWith('data:') && v.length > 12) {
            img.src = v;
            promoted++;
            break;
          }
        }
      }
    });
    // <picture> <source> tags also lazy-load via data-srcset
    document.querySelectorAll('picture source[data-srcset]').forEach(s => {
      const ds = s.getAttribute('data-srcset');
      if (ds && s.getAttribute('srcset') !== ds) { s.srcset = ds; promoted++; }
    });
    console.log(`[Matrixty v1.3.1] Force-load images: promoted ${promoted}, eagered ${eagered} (no scroll)`);
  }

  async function activate(mode, forceReload = false) {
    try {
      // v9.2: Skip full re-crawl if already active with same mode, same page, and products exist
      const sameUrl = _lastActivatedUrl === window.location.href;
      if (!forceReload && isActive && currentMode === mode && sameUrl && products.length > 0) {
        console.log(`[Matrixty v9.2] Resume mode=${mode}, ${products.length} products cached — skip re-crawl`);
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

      console.log(`[Matrixty v9.2] Activate mode: ${mode}, URL: ${window.location.href}`);

      // ═══ v7.0.0: Show toolbar IMMEDIATELY — don't wait for product detection ═══
      // Detect platform first so toolbar shows correct platform name
      platform = detectPlatform();
      renderToolbar();
      showToolbar();

      // v1.3.1: SILENT force-load (replaces visible auto-scroll) — works on collection pages.
      //   Promotes all data-src / data-srcset to real src/srcset and sets loading="eager"
      //   so the browser fetches images immediately, even for cards below the fold.
      //   No scrolling = user can interact with the page right away.
      const isCollectionPage = /\/collections\/[^/?#]+/.test(window.location.pathname);
      if (isCollectionPage) {
        try {
          forceLoadAllImages();
          // Brief wait for browser to start fetching — keeps detectProducts mostly synchronous
          await new Promise(r => setTimeout(r, 400));
        } catch(e) { console.warn('[Matrixty v1.3.1] force-load failed:', e); }
      }

      try {
        detectProducts();
      } catch(err) {
        console.error(`[Matrixty v7.0.0] detectProducts CRASHED:`, err);
      }
      console.log(`[Matrixty v7.0.0] Initial detect: ${products.length} products, platform: ${platform}`);
      // v1.3: Refresh empty images from DOM cards after the auto-scroll
      const beforeRefresh = products.filter(p => !p.image).length;
      products.forEach(p => { if (!p.image && p.card) p.image = getImage(p.card); });
      const afterRefresh = products.filter(p => !p.image).length;
      if (beforeRefresh > afterRefresh) {
        console.log(`[Matrixty v1.3] Image refresh: recovered ${beforeRefresh - afterRefresh} thumbs (${afterRefresh} still missing)`);
      }

      // ═══ v7.0.0: Update toolbar after initial detect ═══
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
          console.error(`[Matrixty v7.0.0] detectProducts retry CRASHED:`, err);
        }
        console.log(`[Matrixty v7.0.0] Retry after ${delay}ms: ${products.length} products`);
        // ═══ v7.0.0: Update toolbar status after each retry ═══
        renderToolbar();
        if (products.length) {
          tryShopifyApiSupplement();
          initMode();
          return;
        }
      }

      // Last resort: Shopify API fallback for collection pages
      const isCollection = window.location.pathname.match(/\/collections\/[^/?#]+/);
      console.log(`[Matrixty v7.0.0] All retries exhausted. isCollection: ${!!isCollection}, platform: ${platform}`);

      if (platform === 'shopify' || isCollection) {
        platform = 'shopify';
        console.log(`[Matrixty v7.0.0] Trying Shopify API fallback...`);
        const beforeApi = products.length;
        await detectShopifyApi();
        console.log(`[Matrixty v7.0.0] After API: ${products.length} products (was ${beforeApi})`);
        if (products.length > beforeApi && products.some(p => !p.card)) {
          await new Promise(r => setTimeout(r, 1500));
          matchApiProductsToDom();
        }
      }

      initMode();
    } catch(err) {
      console.error(`[Matrixty v7.0.0] ACTIVATE FATAL ERROR:`, err);
      // ═══ v7.0.0: Even on fatal error, ensure toolbar is visible ═══
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
        console.log(`[Matrixty v3.0] API supplement: +${products.length - beforeApi} products`);
        // Re-render if we got more products
        highlightByMode();
        renderToolbar();
        updateProductPanel();
      }
    } catch(e) { console.log(`[Matrixty v3.0] API supplement failed:`, e); }
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
      console.log(`[Matrixty v3.0] 0 overlays for ${products.length} products — showing product list panel`);
      showProductPanel();
    }
  }

  // ============================================================
  // HIGHLIGHTING — Direct appendChild into .card elements (NO Shadow DOM)
  // Card has position:relative + overflow:visible → overlay with position:absolute works
  // ============================================================

  function clearHL() {
    // v3.0: Restore pointer-events on links that were disabled
    document.querySelectorAll('a[data-mtx-orig-pointer-events]').forEach(a => {
      a.style.pointerEvents = a.dataset.mtxOrigPointerEvents || '';
      delete a.dataset.mtxOrigPointerEvents;
    });
    document.querySelectorAll('.mtx-ov').forEach(el => el.remove());
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
    if (refreshed > 0) console.log(`[Matrixty v3.1.1] Refreshed ${refreshed} stale card references`);
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
      ov.className = 'mtx-ov';
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
        a.dataset.mtxOrigPointerEvents = a.style.pointerEvents || '';
        a.style.pointerEvents = 'none';
      });

      card.appendChild(ov);
      _overlayCount++;
    });
    console.log(`[Matrixty v3.0] Overlays: ${_overlayCount}/${products.length} (noCard: ${noCardCount})`);
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
        badge = `<span style="position:absolute !important;top:4px !important;left:4px !important;background:#E65100 !important;color:#fff !important;padding:2px 6px !important;border-radius:4px !important;font-size:11px !important;font-weight:bold !important;pointer-events:none !important;z-index:10000 !important;">\u{1F516}</span>`;
      } else if (bookmarkIndex >= 0 && i < bookmarkIndex) {
        border = '3px solid #4A7C59'; bg = 'rgba(74,124,89,0.08)'; shadow = '0 0 0 2px #4A7C59';
        badge = `<span style="position:absolute !important;top:4px !important;right:4px !important;background:#4A7C59 !important;color:#fff !important;padding:2px 6px !important;border-radius:4px !important;font-size:11px !important;pointer-events:none !important;z-index:10000 !important;">\u2728</span>`;
      } else {
        border = '3px solid #1565C0'; bg = 'rgba(21,101,192,0.05)'; shadow = '0 0 0 1px #1565C0';
      }
    } else {
      if (selectedIndexes.has(i)) {
        border = '3px solid #4A7C59'; bg = 'rgba(74,124,89,0.1)'; shadow = '0 0 0 2px #4A7C59';
        badge = `<span style="position:absolute !important;top:4px !important;right:4px !important;background:#4A7C59 !important;color:#fff !important;padding:2px 6px !important;border-radius:4px !important;font-size:11px !important;font-weight:bold !important;pointer-events:none !important;z-index:10000 !important;">\u2705</span>`;
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
    const ov = document.querySelector(`.mtx-ov[data-idx="${idx}"]`);
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
    const allOverlays = document.querySelectorAll('.mtx-ov[data-idx]');
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

    console.log(`[Matrixty v3.1.1] toggleSelect(${i}): was ${selectedIndexes.has(i) ? 'selected' : 'unselected'}`);
    if (selectedIndexes.has(i)) selectedIndexes.delete(i);
    else selectedIndexes.add(i);
    console.log(`[Matrixty v3.1.1] toggleSelect(${i}): now ${selectedIndexes.has(i) ? 'selected' : 'unselected'}, total: ${selectedIndexes.size}`);

    // v3.1.1: Only update the clicked overlay, don't destroy/recreate ALL overlays
    const updated = updateSingleOverlay(i);
    if (!updated) {
      // Overlay not found — fallback to full re-render
      console.log(`[Matrixty v3.1.1] Overlay not found for idx=${i}, doing full re-render`);
      highlightByMode();
    }
    renderToolbar();
    updateProductPanel();
  }

  // ============================================================
  // PRODUCT LIST PANEL — fallback UI when overlays can't be created
  // ============================================================
  let _panelVisible = false;

  function showProductPanel() {
    _panelVisible = true;
    renderProductPanel();
  }

  function hideProductPanel() {
    _panelVisible = false;
    const panel = document.getElementById('mtx-product-panel');
    if (panel) panel.style.display = 'none';
  }

  function toggleProductPanel() {
    if (_panelVisible) hideProductPanel();
    else showProductPanel();
  }

  function renderProductPanel() {
    let panel = document.getElementById('mtx-product-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'mtx-product-panel';
      document.body.appendChild(panel);
    }

    panel.style.cssText = [
      'position:fixed !important',
      'bottom:100px !important',
      'right:16px !important',
      'width:320px !important',
      'max-height:60vh !important',
      'z-index:999997 !important',
      'background:#FFFFFF !important',
      'border:1px solid #EEEDEA !important',
      'border-radius:12px !important',
      'box-shadow:0 4px 20px rgba(0,0,0,0.12) !important',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif !important',
      'display:block !important',
      'overflow:hidden !important',
    ].join(';');

    const modeLabel = currentMode === 'bookmark' ? 'Click \u0111\u1EC3 \u0111\u1EB7t bookmark' : currentMode === 'manual' ? 'Click \u0111\u1EC3 ch\u1ECDn/b\u1ECF' : 'Click \u0111\u1EC3 b\u1ECF ch\u1ECDn';

    let html = `<div style="padding:10px 12px !important;border-bottom:1px solid #EEEDEA !important;display:flex !important;align-items:center !important;justify-content:space-between !important;">
      <span style="color:#666 !important;font-size:11px !important;">${products.length} SP \u2014 ${modeLabel}</span>
      <span id="mtx-panel-close" style="color:#6B7280 !important;cursor:pointer !important;font-size:14px !important;padding:0 4px !important;">\u2715</span>
    </div>`;

    html += `<div id="mtx-panel-list" style="max-height:calc(60vh - 40px) !important;overflow-y:auto !important;padding:4px !important;">`;

    products.forEach((p, i) => {
      const isSelected = currentMode === 'bookmark'
        ? (bookmarkIndex >= 0 && i === bookmarkIndex)
        : selectedIndexes.has(i);
      const isNew = currentMode === 'bookmark' && bookmarkIndex >= 0 && i < bookmarkIndex;

      let itemBg = 'transparent';
      let itemBorder = '1px solid #EEEDEA';
      let badge = '';

      if (isSelected && currentMode === 'bookmark') {
        itemBg = 'rgba(230,81,0,0.06)'; itemBorder = '1px solid #E65100';
        badge = `<span style="background:#E65100 !important;color:#fff !important;padding:1px 5px !important;border-radius:3px !important;font-size:9px !important;font-weight:bold !important;">\u{1F516}</span>`;
      } else if (isNew) {
        itemBg = 'rgba(74,124,89,0.06)'; itemBorder = '1px solid rgba(74,124,89,0.3)';
        badge = `<span style="background:#4A7C59 !important;color:#fff !important;padding:1px 5px !important;border-radius:3px !important;font-size:9px !important;">\u2728</span>`;
      } else if (isSelected) {
        itemBg = 'rgba(74,124,89,0.08)'; itemBorder = '1px solid #4A7C59';
        badge = `<span style="background:#4A7C59 !important;color:#fff !important;padding:1px 5px !important;border-radius:3px !important;font-size:9px !important;">\u2705</span>`;
      }

      const imgSrc = p.image || '';
      const title = (p.title || p.handle || '').substring(0, 60);

      html += `<div class="mtx-pitem" data-idx="${i}" style="display:flex !important;align-items:center !important;gap:8px !important;padding:6px 8px !important;border-radius:6px !important;cursor:pointer !important;background:${itemBg} !important;border:${itemBorder} !important;margin-bottom:2px !important;transition:background 0.1s !important;">
        <span style="color:#6B7280 !important;font-size:10px !important;min-width:20px !important;text-align:right !important;">${i + 1}</span>
        ${imgSrc ? `<img src="${imgSrc}" style="width:36px !important;height:36px !important;object-fit:contain !important;border-radius:4px !important;flex-shrink:0 !important;">` : `<div style="width:36px !important;height:36px !important;background:rgba(0,0,0,0.03) !important;border-radius:4px !important;flex-shrink:0 !important;"></div>`}
        <span style="flex:1 !important;font-size:11px !important;color:#1A1A1A !important;overflow:hidden !important;text-overflow:ellipsis !important;white-space:nowrap !important;">${title}</span>
        ${badge}
      </div>`;
    });

    html += '</div>';
    panel.innerHTML = html;

    // Bind events
    panel.querySelector('#mtx-panel-close')?.addEventListener('click', hideProductPanel);
    panel.querySelectorAll('.mtx-pitem').forEach(item => {
      item.addEventListener('click', () => {
        const idx = parseInt(item.dataset.idx);
        if (currentMode === 'bookmark') setBookmark(idx);
        else toggleSelect(idx);
      });
      item.addEventListener('mouseenter', () => { item.style.background = 'rgba(21,101,192,0.08)'; });
      item.addEventListener('mouseleave', () => {
        const idx = parseInt(item.dataset.idx);
        const sel = currentMode === 'bookmark' ? (bookmarkIndex >= 0 && idx === bookmarkIndex) : selectedIndexes.has(idx);
        const isNew = currentMode === 'bookmark' && bookmarkIndex >= 0 && idx < bookmarkIndex;
        if (sel && currentMode === 'bookmark') item.style.background = 'rgba(230,81,0,0.06)';
        else if (isNew) item.style.background = 'rgba(74,124,89,0.06)';
        else if (sel) item.style.background = 'rgba(74,124,89,0.08)';
        else item.style.background = 'transparent';
      });
    });
  }

  function updateProductPanel() {
    if (_panelVisible) renderProductPanel();
  }

  // ============================================================
  // TOOLBAR
  // ============================================================
  function createUI() {
    if (!document.getElementById('matrixty-fab')) {
      const fab = document.createElement('div');
      fab.id = 'matrixty-fab'; fab.textContent = 'M';
      fab.title = 'Matrixty Extension (Alt+M)';
      fab.addEventListener('click', toggleToolbar);
      document.body.appendChild(fab);
    }
    let tb = document.getElementById('matrixty-toolbar');
    if (tb) tb.remove();
    tb = document.createElement('div');
    tb.id = 'matrixty-toolbar';
    renderToolbar(tb);
    document.body.appendChild(tb);
  }

  function toggleToolbar() {
    const tb = document.getElementById('matrixty-toolbar');
    if (!tb) return;
    tb.classList.toggle('mtx-show');
  }
  function showToolbar() {
    const tb = document.getElementById('matrixty-toolbar');
    if (tb) tb.classList.add('mtx-show');
  }

  function renderToolbar(tb) {
    if (!tb) tb = document.getElementById('matrixty-toolbar');
    if (!tb) return;

    const ok = !!auth;
    const icon = MODE_ICONS[currentMode] || 'M';
    let syncCount = 0;
    let st = '';

    if (!ok) {
      st = '\u26A0\uFE0F Ch\u01B0a \u0111\u0103ng nh\u1EADp';
    } else if (!currentMode || !isActive) {
      st = 'Ch\u1ECDn ch\u1EBF \u0111\u1ED9 t\u1EEB popup';
    } else if (!products.length) {
      st = `0 s\u1EA3n ph\u1EA9m (${platform})`;
    } else if (currentMode === 'bookmark') {
      syncCount = bookmarkIndex >= 0 ? bookmarkIndex : 0;
      if (bookmarkIndex < 0) st = `<b>${products.length}</b> SP \u2014 click \u0111\u1EC3 bookmark`;
      else st = `<span class="mtx-count">${syncCount} m\u1EDBi</span>`;
    } else {
      // manual or fullpage
      syncCount = selectedIndexes.size;
      st = `<span class="mtx-count">${syncCount}/${products.length}</span> \u0111\u00E3 ch\u1ECDn`;
    }

    // Show product list button when products exist
    const showListBtn = ok && isActive && products.length > 0
      ? `<button class="mtx-btn mtx-btn-ghost" id="mtx-show-list" title="Danh s\u00E1ch SP" style="font-size:13px !important;">\u2630</button>`
      : '';

    tb.innerHTML = `<div class="mtx-bar">
      <span class="mtx-mode-icon">${icon}</span>
      <div class="mtx-status">${st}</div>
      ${ok && isActive && syncCount > 0 ? `<button class="mtx-btn mtx-btn-success" id="mtx-sync">Sync ${syncCount}</button>` : ''}
      ${ok && isActive ? '<button class="mtx-btn mtx-btn-primary" id="mtx-rescan" title="Rescan">\u21BB</button>' : ''}
      ${showListBtn}
      ${ok && isActive && currentMode !== 'bookmark' ? `<button class="mtx-btn mtx-btn-ghost" id="mtx-toggle-all" title="${currentMode === 'fullpage' ? 'B\u1ECF ch\u1ECDn t\u1EA5t c\u1EA3' : 'Ch\u1ECDn t\u1EA5t c\u1EA3'}">${currentMode === 'fullpage' && selectedIndexes.size === products.length ? '\u2610' : '\u2611'}</button>` : ''}
      ${currentMode === 'bookmark' && bookmarkIndex >= 0 ? '<button class="mtx-btn mtx-btn-danger" id="mtx-clear">\u2715</button>' : ''}
      ${ok && isActive ? '<button class="mtx-btn mtx-btn-danger" id="mtx-cancel" title="H\u1EE7y crawl" style="font-size:12px !important;">\u2716</button>' : ''}
      <button class="mtx-btn mtx-btn-ghost" id="mtx-close">\u25BE</button>
    </div>`;

    tb.querySelector('#mtx-sync')?.addEventListener('click', syncProducts);
    tb.querySelector('#mtx-rescan')?.addEventListener('click', () => { hideProductPanel(); activate(currentMode); });
    tb.querySelector('#mtx-clear')?.addEventListener('click', () => { bookmarkIndex = -1; highlightByMode(); renderToolbar(); updateProductPanel(); });
    tb.querySelector('#mtx-cancel')?.addEventListener('click', () => {
      // v3.1.1: Cancel crawl — reset everything
      clearHL();
      hideProductPanel();
      isActive = false;
      currentMode = null;
      products = [];
      bookmarkIndex = -1;
      selectedIndexes.clear();
      _overlayCount = 0;
      renderToolbar();
      notify('H\u1EE7y crawl th\u00E0nh c\u00F4ng', 'info');
    });
    tb.querySelector('#mtx-close')?.addEventListener('click', () => tb.classList.remove('mtx-show'));
    tb.querySelector('#mtx-show-list')?.addEventListener('click', toggleProductPanel);
    tb.querySelector('#mtx-toggle-all')?.addEventListener('click', () => {
      if (selectedIndexes.size === products.length) {
        selectedIndexes.clear(); // Deselect all
      } else {
        products.forEach((_, i) => selectedIndexes.add(i)); // Select all
      }
      // v7.0.4-fix: Batch update overlays instead of destroy/recreate all
      // This avoids O(n) reflows that freeze the UI with many products
      batchUpdateAllOverlays();
      renderToolbar();
      updateProductPanel();
    });
  }

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

    const btn = document.querySelector('#mtx-sync');
    if (btn) { btn.disabled = true; btn.textContent = '...'; }

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

      // v9.3: Pre-fetch existing idea handles (link_spy) for cross-check duplicate.
      // Stored as bare handle (lowercase) so the match is cross-shop — same handle
      // anywhere in Idea Pool counts as duplicate, regardless of which shop hosted it.
      let existingIdeaHandles = new Set();
      try {
        const ideaData = await (await fetch(`${SUPABASE_URL}/rest/v1/ideas?is_deleted=eq.false&select=link_spy`, { headers: hdr })).json();
        if (Array.isArray(ideaData)) {
          ideaData.forEach(i => {
            if (i.link_spy) {
              try {
                const u = new URL(i.link_spy.trim());
                const path = u.pathname.replace(/\/collections\/[^/]+\/products\//, '/products/');
                const m = path.match(/\/products\/([^/?#]+)/);
                if (m && m[1]) existingIdeaHandles.add(m[1].toLowerCase());
              } catch {}
            }
          });
        }
      } catch {}

      // v9.1: Normalize Shopify URL — strip /collections/xxx/ prefix to get canonical product URL
      function normalizeShopifyUrl(url) {
        try {
          const u = new URL(url.trim());
          // Shopify: /collections/xxx/products/yyy → /products/yyy
          u.pathname = u.pathname.replace(/\/collections\/[^/]+\/products\//, '/products/');
          u.search = ''; u.hash = '';
          return u.href.replace(/\/+$/, '');
        } catch { return url; }
      }

      let ins = 0, skippedDup = 0, skippedExact = 0, skippedNorm = 0;
      for (const p of toSync) {
        const normUrl = normalizeShopifyUrl(p.url);

        // v9.3: Check 1 — exact URL match in scraped_products (any status, any website).
        // Intent: if the product is already anywhere in MATRIXTY, block re-crawl regardless of which shop.
        const ck1 = await (await fetch(`${SUPABASE_URL}/rest/v1/scraped_products?product_url=eq.${encodeURIComponent(p.url)}&select=id&limit=1`, { headers: hdr })).json();
        if (ck1?.length) { skippedExact++; console.log(`[Matrixty Sync] SKIP-CK1 (exact URL, anywhere): ${p.url} → matched id: ${ck1[0].id}`); continue; }

        // v9.3: Check 2 — normalized Shopify handle (any status, any website).
        // Catches same handle even if reached via a different /collections/xxx/ path or a different shop.
        if (normUrl !== p.url) {
          const handleMatch = normUrl.match(/\/products\/([^/?#]+)/);
          if (handleMatch && handleMatch[1]) {
            const exactPattern = `/products/${handleMatch[1]}`;
            const ck2 = await (await fetch(`${SUPABASE_URL}/rest/v1/scraped_products?product_url=like.*${encodeURIComponent(exactPattern)}&select=id&limit=1`, { headers: hdr })).json();
            if (ck2?.length) { skippedNorm++; console.log(`[Matrixty Sync] SKIP-CK2 (normalized match, anywhere): ${p.url} → pattern: *${exactPattern} → matched id: ${ck2[0].id}`); continue; }
          }
        }

        // v9.3: Check 3 — already in Idea Pool (by handle, cross-shop)
        try {
          const u = new URL(p.url.trim());
          const idPath = u.pathname.replace(/\/collections\/[^/]+\/products\//, '/products/');
          const m = idPath.match(/\/products\/([^/?#]+)/);
          const handle = m && m[1] ? m[1].toLowerCase() : null;
          if (handle && existingIdeaHandles.has(handle)) { skippedDup++; console.log(`[Matrixty Sync] SKIP-CK3 (handle in Idea Pool, anywhere): ${p.url} → handle: ${handle}`); continue; }
        } catch {}

        // v1.3: Helper — detect placeholders / invalid image URLs that shouldn't reach Supabase
        function isInvalidImage(u) {
          if (!u) return true;
          if (u.startsWith('data:')) return true;                     // base64 placeholder
          if (u.length < 12) return true;                              // bogus
          if (/\b1x1\b|transparent|placeholder|blank|spacer|loading/i.test(u)) return true;
          if (/\.(svg)(\?|$)/i.test(u)) return true;                   // SVG icons (not product photos)
          return false;
        }

        // v3.0.3: Ensure image URL has protocol
        let imgUrl = p.image || '';
        if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;

        // v1.3: Treat placeholder URLs as missing — forces .json fallback below
        if (isInvalidImage(imgUrl)) imgUrl = '';

        // v3.0.3 + v1.3: If no/invalid image, try product .json (works on every Shopify store)
        if (!imgUrl && p.url) {
          try {
            const productJsonUrl = p.url.split('?')[0].replace(/\/$/, '') + '.json';
            const pRes = await fetch(productJsonUrl, { credentials: 'omit' });
            if (pRes.ok) {
              const pData = await pRes.json();
              const candidates = [
                pData.product?.image?.src,
                ...(Array.isArray(pData.product?.images) ? pData.product.images.map(im => im?.src) : []),
              ].filter(Boolean);
              for (const c of candidates) {
                if (!isInvalidImage(c)) { imgUrl = c; break; }
              }
            } else {
              console.log('[Matrixty v1.3] .json fetch non-OK', pRes.status, productJsonUrl);
            }
          } catch(e) { console.log('[Matrixty v1.3] .json fetch failed:', e.message); }
        }

        // v3.0.3: If still no image, try DOM card (might have loaded since)
        if (!imgUrl && p.card) {
          const img = p.card.querySelector('img');
          if (img) imgUrl = img.src || img.dataset.src || '';
          if (imgUrl.startsWith('//')) imgUrl = 'https:' + imgUrl;
          if (isInvalidImage(imgUrl)) imgUrl = '';
        }

        // v1.3: Last-ditch — try Shopify's CDN guess from handle (works on most stores)
        if (!imgUrl && p.handle) {
          try {
            const cdnGuess = `${window.location.origin}/cdn/shop/products/${p.handle}.jpg`;
            const headRes = await fetch(cdnGuess, { method: 'HEAD' });
            if (headRes.ok) imgUrl = cdnGuess;
          } catch(e) { /* ignore */ }
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
      const exactMsg = skippedExact > 0 ? ` (${skippedExact} trùng URL)` : '';
      const normMsg = skippedNorm > 0 ? ` (${skippedNorm} trùng handle)` : '';
      console.log(`[Matrixty Sync] Result: ${ins} inserted, ${skippedExact} exact-URL, ${skippedNorm} norm-handle, ${skippedDup} in Idea Pool`);
      notify(`\u2705 \u0110\u00E3 sync ${ins} s\u1EA3n ph\u1EA9m!${exactMsg}${normMsg}${dupMsg}`, 'success');
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
    const old = document.getElementById('mtx-notif'); if (old) old.remove();
    const c = { success: '#4A7C59', error: '#E8453C', warning: '#E65100', info: '#1565C0' };
    const tc = '#FFF';
    const n = document.createElement('div'); n.id = 'mtx-notif';
    n.style.cssText = `position:fixed;top:16px;right:16px;z-index:9999999;background:${c[type]};color:${tc};padding:10px 16px;border-radius:8px;font-family:-apple-system,sans-serif;font-size:13px;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,0.3);max-width:300px;animation:mtxSlide .3s ease;`;
    n.textContent = msg; document.body.appendChild(n);
    setTimeout(() => n.remove(), 3500);
  }

  // ============================================================
  // AUTH & MESSAGING
  // ============================================================
  function loadAuth() {
    try {
      chrome.storage.local.get(['matrixtyUser'], (d) => {
        if (chrome.runtime.lastError) return;
        if (d.matrixtyUser?.id) auth = { userId: d.matrixtyUser.id, userEmail: d.matrixtyUser.email, userName: d.matrixtyUser.name };
      });
    } catch (e) {}
  }

  try {
    chrome.runtime.onMessage.addListener((msg, sender, res) => {
      if (msg.type === 'AUTH_UPDATED') { auth = msg.config; renderToolbar(); res({ ok: true }); }
      if (msg.type === 'AUTH_LOGOUT') { auth = null; clearHL(); hideProductPanel(); isActive = false; currentMode = null; products = []; bookmarkIndex = -1; selectedIndexes.clear(); renderToolbar(); res({ ok: true }); }
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
        if (window.__matrixtyClipart) {
          window.__matrixtyClipart.scan().then(data => res({ ok: true, data }));
        } else {
          res({ ok: false, error: 'Clipart scanner not loaded' });
        }
        return true;
      }
      if (msg.type === 'CLIPART_MANUAL_SCAN') {
        if (window.__matrixtyClipart) {
          window.__matrixtyClipart.manualScan();
          res({ ok: true });
        } else {
          res({ ok: false, error: 'Clipart scanner not loaded' });
        }
        return true;
      }
      if (msg.type === 'GET_CLIPART_STATUS') {
        if (window.__matrixtyClipart) {
          res(window.__matrixtyClipart.getState());
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
    const ov = e.target.closest('.mtx-ov');
    if (!ov || !isActive || !currentMode) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    const idx = parseInt(ov.dataset.idx);
    if (isNaN(idx)) return;
    console.log(`[Matrixty v3.1] Global mousedown on overlay idx=${idx}, mode=${currentMode}`);
    if (currentMode === 'bookmark') setBookmark(idx);
    else toggleSelect(idx);
  }, true);

  // Also block click to prevent page navigation
  document.addEventListener('click', (e) => {
    const ov = e.target.closest('.mtx-ov');
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
    loadAuth(); createUI();
    if (!document.getElementById('mtx-anim')) {
      const s = document.createElement('style'); s.id = 'mtx-anim';
      s.textContent = '@keyframes mtxSlide{from{transform:translateX(100px);opacity:0}to{transform:translateX(0);opacity:1}}';
      document.head.appendChild(s);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();


// ============================================================
// CLIPART SCANNER MODULE — Matrixty Extension v2.0
// Quét DOM trang sản phẩm, detect clipart options,
// capture screenshot, đánh label, sync về Matrixty
// ============================================================
(function() {
  'use strict';
  try {

  const CLIPART = {
    isScanning: false,
    categories: [],
    capturedData: null,
  };

  // ---- Label mapping ----
  const LABEL_MAP = {
    'age': 'I', 'age range': 'I',
    'skin': 'J', 'skin tone': 'J', 'skin color': 'J',
    'eye': 'K', 'eyes': 'K', 'eye color': 'K', 'eyes color': 'K',
    'hair color': 'L',
    'hair style': 'M', 'hair': 'M', 'hairstyle': 'M',
    'beard color': 'N',
    'beard style': 'O', 'beard': 'O',
    'outfit': 'P', 'shirt': 'P', 'top': 'P', 'clothing': 'P',
    'outfit style': 'PS',
    'pants': 'Q', 'bottom': 'Q',
    'glasses': 'R', 'eyewear': 'R',
    'shoes': 'S', 'footwear': 'S',
    'accessory': 'T', 'accessories': 'T',
    'hat': 'U', 'headwear': 'U',
    't-shirt': 'P', 'tshirt': 'P',
    'background color': 'BG', 'title': 'TT',
    'color': 'C', 'background': 'BG', 'frame': 'FR',
    'pet': 'PT', 'dog': 'DG', 'cat': 'CT',
  };

  function autoPrefix(label) {
    // v3.0.4: Use single letters A, B, C... Z, AA, AB... instead of abbreviations
    // This is just a fallback — actual prefix is assigned sequentially in scan
    return 'A';
  }

  // v3.0.4: Generate sequential prefix letter(s): A, B, C... Z, AA, AB...
  function sequentialPrefix(index) {
    if (index < 26) return String.fromCharCode(65 + index); // A-Z
    const first = String.fromCharCode(65 + Math.floor(index / 26) - 1);
    const second = String.fromCharCode(65 + (index % 26));
    return first + second; // AA, AB... AZ, BA...
  }

  // ---- DOM scanning ----
  // Strategy 1: Customily / Ant Design (wrappiness, macorner, etc.)
  // Strategy 2: Standard Shopify (product-form__input, swatch)
  // Strategy 3: Generic (fieldset, radio groups)

  function scanDOM() {
    let allGroups = [];

    // v8.0.9: Enhanced debug logging
    console.log('[Matrixty Clipart] scanDOM() — Detecting frameworks:',
      'Customily:', !!document.querySelector('.customall-grid, .ant-form-item'),
      'Teeinblue:', !!document.querySelector('.tib-field, [class*="tib-"]'),
      'by-form:', !!document.querySelector('.by-customization-form__element'),
      'Shopify form:', !!document.querySelector('.product-form__input, fieldset'),
      'All forms:', document.querySelectorAll('form').length,
      'All imgs:', document.querySelectorAll('img').length,
      'Iframes:', document.querySelectorAll('iframe').length
    );

    // Strategy 1: Customily / Ant Design
    const customily = scanCustomily();
    if (customily.length) {
      console.log('[Matrixty Clipart] Customily detected:', customily.length, 'groups');
      allGroups.push(...customily);
    }

    // Strategy 2: Standard Shopify
    const shopify = scanShopifyStandard();
    if (shopify.length) {
      console.log('[Matrixty Clipart] Shopify standard:', shopify.length, 'groups');
      // Only add groups whose labels don't overlap with already-found groups
      const existingLabels = new Set(allGroups.map(g => g.label.toLowerCase().trim()));
      shopify.forEach(g => {
        if (!existingLabels.has(g.label.toLowerCase().trim())) {
          allGroups.push(g);
          existingLabels.add(g.label.toLowerCase().trim());
        }
      });
    }

    // v8.0.2 Strategy 3: Wanderprints / by-customization-form — ALWAYS check (mixed pages!)
    const wpGroups = scanPersonalizationForm();
    if (wpGroups.length) {
      console.log('[Matrixty Clipart] Personalization-form detected:', wpGroups.length, 'groups');
      // Dedup: only add groups not already found by Customily/Shopify
      const existingLabels = new Set(allGroups.map(g => g.label.toLowerCase().replace(/\s+/g, ' ').trim()));
      wpGroups.forEach(g => {
        const key = g.label.toLowerCase().replace(/\s+/g, ' ').trim();
        if (!existingLabels.has(key)) {
          allGroups.push(g);
          existingLabels.add(key);
        }
      });
    }

    // v9.3 Strategy 7: Generic swatch-container theme (homacus.com etc.)
    //   Pattern: <... .option_name>Label</...>  + <... .swatch-container>...</...>
    //   Also handles .cl-accordion .cl-option-content wrappers
    // v9.3.1: Dedup by ELEMENT identity, not label — pages can have multiple sections
    //   with same label (e.g., "Choose A Character" for #1 Kid and #2 Kid)
    const swatchGroups = scanSwatchContainerTheme();
    if (swatchGroups.length) {
      console.log('[Matrixty Clipart] Swatch-container theme:', swatchGroups.length, 'groups');
      const existingElements = new Set(allGroups.map(g => g.element));
      swatchGroups.forEach(g => {
        if (existingElements.has(g.element)) return;
        // Skip if our element is contained in another existing group's element (true duplicate)
        var isContained = allGroups.some(eg => eg.element && eg.element !== g.element && (eg.element.contains(g.element) || g.element.contains(eg.element)));
        if (isContained) return;
        allGroups.push(g);
        existingElements.add(g.element);
      });
    }

    // Strategy 6: <select> dropdowns — always scan and merge (dedup by label)
    const selectGroups = scanSelectDropdowns();
    if (selectGroups.length) {
      console.log('[Matrixty Clipart] Select dropdowns:', selectGroups.length, 'groups');
      const existingLabels2 = new Set(allGroups.map(g => g.label.toLowerCase().replace(/\s+/g, ' ').trim()));
      selectGroups.forEach(function(sg) {
        var key = sg.label.toLowerCase().replace(/\s+/g, ' ').trim();
        if (!existingLabels2.has(key)) {
          allGroups.push(sg);
          existingLabels2.add(key);
        }
      });
    }

    if (allGroups.length) {
      // v9.3.1: Auto-rename duplicate labels with counter (e.g., "Choose A Character (1)", "(2)")
      const labelCounts = {};
      allGroups.forEach(g => {
        const k = (g.label || '').toLowerCase().trim();
        labelCounts[k] = (labelCounts[k] || 0) + 1;
      });
      const labelSeen = {};
      allGroups.forEach(g => {
        const k = (g.label || '').toLowerCase().trim();
        if (labelCounts[k] > 1) {
          labelSeen[k] = (labelSeen[k] || 0) + 1;
          g.label = g.label + ' (' + labelSeen[k] + ')';
        }
      });
      console.log('[Matrixty Clipart] Combined scan result:', allGroups.length, 'groups total');
      return allGroups;
    }

    // Strategy 4: Generic (fallback only if nothing found above)
    const generic = scanGeneric();
    if (generic.length) {
      console.log('[Matrixty Clipart] Generic scan:', generic.length, 'groups');
      // Also add select dropdowns to generic results
      if (selectGroups.length) {
        const genLabels = new Set(generic.map(g => g.label.toLowerCase().trim()));
        selectGroups.forEach(sg => { if (!genLabels.has(sg.label.toLowerCase().trim())) generic.push(sg); });
      }
      return generic;
    }

    // If only select dropdowns found, return them
    if (selectGroups.length) return selectGroups;

    // Strategy 5: v8.0.9 Deep scan (aggressive fallback for unknown frameworks like pawfecthouse)
    const deep = scanDeep();
    console.log('[Matrixty Clipart] Deep scan:', deep.length, 'groups');
    return deep;
  }

  // ---- Select dropdown scanner ----
  function scanSelectDropdowns() {
    var groups = [];
    document.querySelectorAll('select').forEach(function(sel) {
      var r = sel.getBoundingClientRect();
      if (r.width < 30 && r.height < 10) return;

      var label = '';
      if (sel.id) {
        // v9.3.1: CSS.escape() id — Shopify ids can contain quotes/special chars
        try {
          var escSelId = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(sel.id) : sel.id.replace(/(["\\])/g, '\\$1');
          var labelFor = document.querySelector('label[for="' + escSelId + '"]');
          if (labelFor) label = labelFor.textContent.trim().replace(/\s*\*\s*$/, '').replace(/\s+/g, ' ');
        } catch(e) {}
      }
      if (!label) {
        var parentLabel = sel.closest('label');
        if (parentLabel) {
          var clone = parentLabel.cloneNode(true);
          var selectInClone = clone.querySelector('select');
          if (selectInClone) selectInClone.remove();
          label = clone.textContent.trim().replace(/\s*\*\s*$/, '').replace(/\s+/g, ' ');
        }
      }
      if (!label) {
        var prev = sel.previousElementSibling;
        if (prev && ['LABEL','SPAN','STRONG','H4','H5'].indexOf(prev.tagName) >= 0) {
          label = prev.textContent.trim().replace(/\s*\*\s*$/, '').replace(/\s+/g, ' ');
        }
      }
      if (!label) {
        var formItem = sel.closest('.ant-form-item, .form-group, .product-form__input, fieldset, .by-customization-form__element, .by-customization-form_element');
        if (formItem) {
          var lEl = formItem.querySelector('.ant-form-item-label label, .by-customization-form__label, label, legend, strong, h4, h5');
          if (lEl && !lEl.contains(sel)) label = lEl.textContent.trim().replace(/\s*\*\s*$/, '').replace(/\s+/g, ' ');
        }
      }
      if (!label) label = sel.getAttribute('aria-label') || sel.name || '';
      if (!label || label.length > 80) return;

      var opts = [];
      sel.querySelectorAll('option').forEach(function(optEl) {
        var val = optEl.value;
        var text = optEl.textContent.trim();
        if (!text || val === '' || text.toLowerCase().startsWith('select') || text.toLowerCase().startsWith('choose') || text.toLowerCase().startsWith('--- ') || text.toLowerCase().startsWith('-- ')) return;
        opts.push({
          element: optEl, rect: r, imageUrl: null, bgColor: null,
          textContent: text, isSelected: optEl.selected, capturedImage: null,
        });
      });

      if (opts.length < 2) return;
      groups.push({ element: sel, label: label, options: opts, rect: r, isDropdown: true });
    });
    return groups;
  }

  // ---- v9.3: Swatch-container theme scanner ----
  // Pattern (homacus.com, similar Shopify themes):
  //   <wrapper>
  //     <... class="option_name">Label *</...>
  //     <... class="swatch-container">
  //       <button|label|a><img/></button>
  //       ...
  //     </...>
  //   </wrapper>
  // The label .option_name is a SIBLING (or sibling's descendant) of .swatch-container,
  // not inside it — so we walk up to find a common ancestor that has both.
  function scanSwatchContainerTheme() {
    var groups = [];
    // Both .swatch-container and .cl-option-content can hold the same options (cl-accordion wraps swatch-container in some themes).
    // Prefer .swatch-container (the inner, more specific container).
    var containers = document.querySelectorAll('.swatch-container, [class~="swatch-container"]');
    var seenContainers = new Set();

    containers.forEach(function(c) {
      if (seenContainers.has(c)) return;
      // Skip if a parent .swatch-container already in queue (prevents nested duplicates)
      var hasParentSwatch = false;
      var p = c.parentElement;
      while (p) { if (p.classList && p.classList.contains('swatch-container')) { hasParentSwatch = true; break; } p = p.parentElement; }
      if (hasParentSwatch) return;
      seenContainers.add(c);

      // Find label by walking up: ancestor that contains a sibling .option_name
      var label = '';
      var cur = c.parentElement;
      var depth = 0;
      while (cur && depth < 8 && !label) {
        // Look for .option_name within current ancestor BUT not inside another swatch-container (would belong to sibling group)
        var labelCandidates = cur.querySelectorAll('.option_name, [class*="option_name"], [class*="option-name"]');
        for (var i = 0; i < labelCandidates.length; i++) {
          var le = labelCandidates[i];
          // Reject if this label is inside another .swatch-container that's not ours
          var leSwatch = le.closest('.swatch-container');
          if (leSwatch && leSwatch !== c) continue;
          // Reject if our container is not a descendant of label's parent chain (label belongs to sibling)
          if (!cur.contains(c)) continue;
          // Geometric check: label should be ABOVE container or close to it
          var leRect = le.getBoundingClientRect();
          var cRect = c.getBoundingClientRect();
          if (leRect.bottom > cRect.bottom + 50) continue; // label is below — skip
          var t = le.textContent.trim()
            .replace(/\s*\*+\s*$/, '')
            .replace(/\s*Required\s*$/i, '')
            .replace(/\s+/g, ' ')
            .trim();
          if (t.length >= 2 && t.length < 80) { label = t; break; }
        }
        if (label) break;
        cur = cur.parentElement;
        depth++;
      }

      // Fallback: try .cl-accordion ancestor with header text
      if (!label) {
        var accordion = c.closest('.cl-accordion');
        if (accordion) {
          var hdr = accordion.querySelector('.cl-accordion-header, .cl-accordion-title, [class*="header"], [class*="title"]');
          if (hdr) {
            var t2 = hdr.textContent.trim().replace(/\s*\*+\s*$/, '').replace(/\s+/g, ' ').trim();
            if (t2.length >= 2 && t2.length < 80) label = t2;
          }
        }
      }

      if (!label) return;

      // Collect option items inside container
      var opts = [];
      var seenItem = new Set();
      // Prefer interactive wrappers
      var items = c.querySelectorAll('button, label, a, [role="button"], [class*="swatch-item"], [class*="swatch__option"], [class*="option-item"]');
      var candidates = items.length >= 2 ? Array.from(items) : Array.from(c.children);
      // If items are too many (nested), prefer direct interactive children
      if (items.length > 0 && items.length < 30) candidates = Array.from(items);

      candidates.forEach(function(item) {
        if (seenItem.has(item)) return;
        // Skip nested items (a button inside another candidate)
        for (var s of seenItem) { if (s.contains && s.contains(item)) return; }
        seenItem.add(item);
        var r = item.getBoundingClientRect();
        if (r.width < 18 || r.height < 18 || r.width > 300) return;
        var img = item.querySelector('img');
        var bgc = '';
        try { bgc = getComputedStyle(item).backgroundColor; } catch(e) {}
        var imgUrl = null;
        if (img && img.src && !img.src.startsWith('data:image/svg')) imgUrl = img.src;
        opts.push({
          element: item,
          rect: { x: r.x, y: r.y, w: r.width, h: r.height },
          imageUrl: imgUrl,
          bgColor: (bgc && bgc !== 'rgba(0, 0, 0, 0)' && bgc !== 'transparent') ? bgc : null,
          textContent: ((img && img.alt) || item.getAttribute('aria-label') || item.textContent || '').trim().substring(0, 40),
          isSelected: item.classList.contains('selected') || item.classList.contains('active') || item.getAttribute('aria-selected') === 'true' || item.getAttribute('aria-checked') === 'true',
        });
      });

      if (opts.length >= 2) {
        groups.push({ element: c, label: label, options: opts, rect: c.getBoundingClientRect() });
      }
    });

    return groups;
  }

  // ---- Customily / Ant Design scanner ----
  // Scan ALL .customall-grid elements in DOM order (preserves website layout order)
  // Labeled grids get their label, unlabeled grids infer from previous labeled grid
  function scanCustomily() {
    var groups = [];
    
    // Strategy: iterate ALL .customall-grid in DOM order
    var allGrids = document.querySelectorAll('.customall-grid');
    if (allGrids.length === 0) {
      // Fallback: try .ant-form-item approach
      return scanCustomilyFallback();
    }
    
    var lastLabel = '';
    var lastLabelFormItem = null;
    allGrids.forEach(function(grid) {
      // Find parent .ant-form-item and its label
      var parent = grid.closest('.ant-form-item');
      var labelEl = parent ? parent.querySelector('.ant-form-item-label label') : null;
      var label = labelEl ? labelEl.textContent.trim().replace(/\s*\*\s*$/, '').replace(/\s+/g, ' ') : '';
      
      // Collect options from this grid (images OR color swatches)
      var opts = [];
      
      // Strategy 1: Images
      grid.querySelectorAll('img').forEach(function(img) {
        if (!img.src || img.src.startsWith('data:image/svg')) return;
        var r = img.getBoundingClientRect();
        if (r.width < 10 || r.height < 10 || r.width > 300) return;
        var wrapper = img.parentElement;
        var wr = wrapper ? wrapper.getBoundingClientRect() : r;
        opts.push({
          element: wrapper || img,
          rect: { x: wr.x, y: wr.y, w: wr.width, h: wr.height },
          imageUrl: img.src,
          bgColor: null,
          textContent: img.alt || '',
          isSelected: false,
        });
      });
      
      // Strategy 2: Color swatch divs (Skin Tone uses background-color divs, no imgs)
      if (opts.length < 2) {
        var swatchDivs = grid.querySelectorAll('[class*="image-item"], [style*="background-color"], [style*="background"]');
        if (swatchDivs.length < 2) swatchDivs = grid.children;
        for (var ci = 0; ci < swatchDivs.length; ci++) {
          var child = swatchDivs[ci];
          var r = child.getBoundingClientRect();
          if (r.width < 15 || r.height < 15 || r.width > 200) continue;
          
          // Find element with background-color
          var bgEl = child.querySelector('[style*="background"]') || child;
          var bgStyle = bgEl.style.backgroundColor || '';
          if (!bgStyle) {
            try { bgStyle = getComputedStyle(bgEl).backgroundColor; } catch(e) {}
          }
          
          if (bgStyle && bgStyle !== 'transparent' && bgStyle !== 'rgba(0, 0, 0, 0)') {
            opts.push({
              element: child,
              rect: { x: r.x, y: r.y, w: r.width, h: r.height },
              imageUrl: null,
              bgColor: bgStyle,
              textContent: '',
              isSelected: child.classList.contains('active') || child.classList.contains('selected'),
            });
          }
        }
      }
      
      // If no imgs, check for COLOR SWATCHES (divs with background-color)
      if (opts.length < 2) {
        var directKids = grid.children;
        for (var dk = 0; dk < directKids.length; dk++) {
          var kid = directKids[dk];
          var r = kid.getBoundingClientRect();
          if (r.width < 15 || r.height < 15 || r.width > 300) continue;
          var colorEl = kid.querySelector('[style*="background"]') || kid;
          var bgColor = '';
          var inlineStyle = colorEl.getAttribute('style') || '';
          var bgMatch = inlineStyle.match(/background-color:\s*([^;]+)/);
          if (bgMatch) bgColor = bgMatch[1].trim();
          if (!bgColor) {
            try {
              var comp = window.getComputedStyle(colorEl);
              bgColor = comp.backgroundColor || '';
              if (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') bgColor = '';
            } catch(e) {}
          }
          var kidImg = kid.querySelector('img');
          if (kidImg && kidImg.src && !kidImg.src.startsWith('data:image/svg')) {
            opts.push({ element: kid, rect: { x: r.x, y: r.y, w: r.width, h: r.height },
              imageUrl: kidImg.src, bgColor: null, textContent: kidImg.alt || '', isSelected: false });
          } else if (bgColor) {
            opts.push({ element: kid, rect: { x: r.x, y: r.y, w: r.width, h: r.height },
              imageUrl: null, bgColor: bgColor, textContent: '', isSelected: false });
          }
        }
      }
      
      if (opts.length < 2) return;
      
      if (label) {
        // Labeled grid — use as-is
        lastLabel = label;
        lastLabelFormItem = parent;
        
        // Skip text input groups
        if (label.toLowerCase().includes('type ') || label.toLowerCase().includes('name initial')) return;
        
        groups.push({ element: parent || grid, label: label, options: opts, rect: grid.getBoundingClientRect() });
      } else {
        // Unlabeled grid — infer name from previous labeled grid
        // Also check which option is currently SELECTED in the parent trigger group
        var inferredLabel = '';
        var ll = lastLabel.toLowerCase();
        
        // Get the last clicked option text for naming
        var selectedText = '';
        var lastClick = window.__mtxLastClick;
        if (lastClick && lastClick.groupName === lastLabel) {
          selectedText = lastClick.optionText || '';
        }
        // Fallback: check DOM for selected state
        if (!selectedText && lastLabelFormItem) {
          var allOpts = lastLabelFormItem.querySelectorAll('.ant-form-item-children img');
          allOpts.forEach(function(si) {
            var w = si.parentElement;
            if (w && (w.classList.contains('selected') || w.classList.contains('active'))) {
              selectedText = si.alt || si.title || w.textContent.trim() || '';
            }
          });
        }
        
        if (ll.includes('hair color')) {
          inferredLabel = lastLabel.replace(/Hair Color/i, 'Hair Style');
        } else if (ll.includes('beard color')) {
          inferredLabel = lastLabel.replace(/Beard Color/i, 'Beard Style');
        } else if (ll.includes('outfit') || ll.includes('t-shirt') || ll.includes('tshirt')) {
          if (selectedText && selectedText.length < 20) {
            // "Dad's Outfit" + "SWEATSHIRT" → "Dad's Sweatshirt"
            var personPrefix = lastLabel.match(/^[\w']+(?:'s)?\s*/);
            var cleanText = selectedText.replace(/[^a-zA-Z\s]/g, '').trim();
            inferredLabel = (personPrefix ? personPrefix[0] : '') + cleanText.charAt(0).toUpperCase() + cleanText.slice(1).toLowerCase();
          } else {
            inferredLabel = lastLabel.replace(/Outfit|T-Shirt|Tshirt/i, 'Outfit Style');
            if (!inferredLabel.includes('Style')) inferredLabel = lastLabel + ' Style';
          }
        } else if (ll.includes('drink')) {
          inferredLabel = lastLabel + ' Detail';
        } else {
          inferredLabel = lastLabel + ' Detail';
        }
        
        groups.push({ element: grid, label: inferredLabel, options: opts, rect: grid.getBoundingClientRect() });
      }
    });
    
    // Also scan .ant-form-item that DON'T have .customall-grid (text-based options like Age Range with text)
    document.querySelectorAll('.ant-form-item').forEach(function(formItem) {
      var labelEl = formItem.querySelector('.ant-form-item-label label');
      if (!labelEl) return;
      var label = labelEl.textContent.trim().replace(/\s*\*\s*$/, '').replace(/\s+/g, ' ');
      if (!label || label.length > 60) return;
      
      // Skip if already captured via grid scan (by checking label match)
      var alreadyCaptured = false;
      for (var gc = 0; gc < groups.length; gc++) {
        if (groups[gc].label === label) { alreadyCaptured = true; break; }
      }
      if (alreadyCaptured) return;
      
      // Skip text inputs
      var hasTextInput = formItem.querySelector('input[type="text"], textarea, .ant-input');
      if (hasTextInput && !formItem.querySelector('img')) return;
      
      var children = formItem.querySelector('.ant-form-item-children, .ant-form-item-control-input-content, .ant-form-item-control');
      if (!children) return;
      
      var opts = [];
      
      // Images
      children.querySelectorAll('img').forEach(function(img) {
        if (!img.src || img.src.startsWith('data:image/svg')) return;
        var r = img.getBoundingClientRect();
        if (r.width < 10 || r.height < 10 || r.width > 300) return;
        var wrapper = img.parentElement;
        var wr = wrapper ? wrapper.getBoundingClientRect() : r;
        opts.push({
          element: wrapper || img,
          rect: { x: wr.x, y: wr.y, w: wr.width, h: wr.height },
          imageUrl: img.src, bgColor: null, textContent: img.alt || '', isSelected: false,
        });
      });
      
      // Text-based options (WIFE, YOUNG MAN, etc.)
      if (opts.length === 0) {
        var directChildren = children.querySelector('div')?.children;
        if (directChildren) {
          Array.from(directChildren).forEach(function(el) {
            var r = el.getBoundingClientRect();
            if (r.width < 20 || r.height < 20 || r.width > 200) return;
            var text = el.textContent.trim();
            if (!text || text.length > 30) return;
            opts.push({ element: el, rect: { x: r.x, y: r.y, w: r.width, h: r.height },
              imageUrl: null, bgColor: null, textContent: text, isSelected: false });
          });
        }
      }
      
      if (opts.length >= 2) {
        // Insert in correct DOM order based on vertical position
        var y = formItem.getBoundingClientRect().top;
        var insertIdx = groups.length;
        for (var gi = 0; gi < groups.length; gi++) {
          if (groups[gi].rect.top > y) { insertIdx = gi; break; }
        }
        groups.splice(insertIdx, 0, { element: formItem, label: label, options: opts, rect: formItem.getBoundingClientRect() });
      }
    });
    
    // Dedup: remove groups with same BASE label (strip #N, trailing numbers, etc.)
    // "Choose An Option #1" and "Choose An Option #2" → same base → keep only first
    // "Girl's Skin Tone #1" and "Girl's Skin Tone #2" → same base → keep only first  
    // BUT "Dad's Sweatshirt" vs "Dad's Pajamas" → different base → keep both
    var seenBaseLabels = {};
    groups = groups.filter(function(g) {
      // Strip trailing: #N, #N suffix, numbered suffix patterns
      var base = g.label
        .replace(/\s*#\d+\s*$/i, '')           // "Choose An Option #1" → "Choose An Option"
        .replace(/\s*\(\d+\)\s*$/i, '')         // "Skin Tone (2)" → "Skin Tone"
        .replace(/\s+\d+\s*$/i, '')             // "Woman's Hair Color 2" → "Woman's Hair Color"
        .replace(/\s*#\d+\s*/g, ' ')            // "Girl's Skin Tone #1" → "Girl's Skin Tone"
        .replace(/\s+/g, ' ').trim();
      
      var key = base + '|' + g.options.length;
      if (seenBaseLabels[key]) return false;
      seenBaseLabels[key] = true;
      return true;
    });
    
    return groups;
  }
  function scanCustomilyFallback() {
    var groups = [];
    document.querySelectorAll('.ant-row.ant-form-item, .ant-form-item').forEach(function(formItem) {
      var labelEl = formItem.querySelector('.ant-form-item-label label, .ant-form-item-label span');
      if (!labelEl) return;
      var label = labelEl.textContent.trim().replace(/\s*\*\s*$/, '').replace(/\s+/g, ' ');
      if (!label || label.length > 60) return;
      var hasTextInput = formItem.querySelector('input[type="text"], textarea, .ant-input');
      if (hasTextInput && !formItem.querySelector('img')) return;
      var children = formItem.querySelector('.ant-form-item-children, .ant-form-item-control-input-content, .ant-form-item-control');
      if (!children) return;
      var opts = [];
      children.querySelectorAll('img').forEach(function(img) {
        if (!img.src || img.src.startsWith('data:image/svg')) return;
        var r = img.getBoundingClientRect();
        if (r.width < 10 || r.height < 10 || r.width > 300) return;
        var wrapper = img.parentElement;
        var wr = wrapper ? wrapper.getBoundingClientRect() : r;
        opts.push({ element: wrapper || img, rect: { x: wr.x, y: wr.y, w: wr.width, h: wr.height },
          imageUrl: img.src, bgColor: null, textContent: img.alt || '', isSelected: false });
      });
      if (opts.length === 0) {
        var directChildren = children.querySelector('div')?.children;
        if (directChildren) {
          Array.from(directChildren).forEach(function(el) {
            var r = el.getBoundingClientRect();
            if (r.width < 20 || r.height < 20 || r.width > 200) return;
            var text = el.textContent.trim();
            if (!text || text.length > 30) return;
            opts.push({ element: el, rect: { x: r.x, y: r.y, w: r.width, h: r.height },
              imageUrl: null, bgColor: null, textContent: text, isSelected: false });
          });
        }
      }
      if (opts.length >= 2) {
        groups.push({ element: formItem, label: label, options: opts, rect: formItem.getBoundingClientRect() });
      }
    });
    return groups;
  }

  // ---- Standard Shopify scanner ----
  function scanShopifyStandard() {
    const groups = [];
    // v8.0.8: Extended selectors for macorner.co, wrappiness.com, pawfecthouse.com, etc.
    const GROUP_SELS = [
      '.product-form__input', '.swatch', 'fieldset', '[data-option-index]',
      '.product__option', '.variant-wrapper',
      // Teeinblue / other personalizers
      '.tib-field', '.tib-option', '[class*="tib-"]',
      // Generic personalization wrappers
      '.personalization-option', '[class*="personalization"]',
      '.option-selector', '.option-group', '.form-field',
      '[class*="option-wrap"]', '[class*="customizer"]',
      // Macorner / Pawfecthouse patterns
      '.product-single__option', '[class*="product-option"]',
    ];
    const LABEL_SELS = [
      'label', 'legend', '.product-form__input-label', '.swatch__label',
      '.option-name', '.form__label', 'h5', 'h4',
      '.tib-label', '[class*="field-label"]', '[class*="option-label"]',
      'strong', '.label',
    ];
    const ITEM_SELS = [
      'label:has(input[type="radio"])', '.swatch__value', '.color-swatch',
      '[data-value]', '.option-value', '.product-form__radio-label',
      // Extended: image-based options
      '[class*="swatch-item"]', '[class*="option-item"]',
      '[class*="color-option"]', '[class*="image-option"]',
      '.tib-item', '[class*="tib-option-item"]',
    ];
    const tried = new Set();

    for (const gSel of GROUP_SELS) {
      try {
        document.querySelectorAll(gSel).forEach(el => {
          if (tried.has(el)) return;
          tried.add(el);
          let label = '';
          for (const lSel of LABEL_SELS) {
            const lEl = el.querySelector(lSel);
            if (lEl) { label = lEl.textContent.trim().replace(/\s*\*\s*$/, '').replace(/\s+/g, ' '); if (label.length > 0 && label.length < 60) break; label = ''; }
          }
          if (!label) return;
          const opts = [];
          const optTried = new Set();
          for (const iSel of ITEM_SELS) {
            try {
              el.querySelectorAll(iSel).forEach(item => {
                if (optTried.has(item)) return; optTried.add(item);
                const r = item.getBoundingClientRect();
                if (r.width < 15 || r.height < 15 || r.width > 300) return;
                const img = item.querySelector('img');
                const bgc = getComputedStyle(item).backgroundColor;
                opts.push({
                  element: item, rect: { x: r.x, y: r.y, w: r.width, h: r.height },
                  imageUrl: img?.src || null, bgColor: (bgc && bgc !== 'rgba(0, 0, 0, 0)') ? bgc : null,
                  textContent: item.textContent.trim().substring(0, 30), isSelected: false,
                });
              });
            } catch(e) {}
          }
          if (opts.length >= 2) groups.push({ element: el, label, options: opts, rect: el.getBoundingClientRect() });
        });
      } catch(e) {}
    }
    return groups.filter((g, i) => !groups.some((o, j) => i !== j && o.element.contains(g.element) && o.options.length >= g.options.length));
  }

  // ---- v3.0.4: Wanderprints / by-customization-form scanner ----
  // Structure: .by-customization-form__label (SPAN) inside .by-customization-form_element (DIV)
  // Swatches: .by-image-swatch__swatch inside same parent DIV
  function scanPersonalizationForm() {
    const groups = [];
    
    // Find all labels with this specific class
    const labels = document.querySelectorAll('.by-customization-form__label');
    if (!labels.length) {
      // Fallback: try form.personalization-form approach
      const form = document.querySelector('form.personalization-form, .personalization-form');
      if (!form) return groups;
      // Look for any labeled sections with swatches
      form.querySelectorAll('[class*="customization-form_element"], [class*="form_element"]').forEach(el => {
        const labelEl = el.querySelector('[class*="form__label"], label, strong, h4, h5');
        if (!labelEl) return;
        const swatches = el.querySelectorAll('[class*="swatch__swatch"], [class*="image-swatch"]');
        if (swatches.length < 2) return;
        const label = labelEl.textContent.trim().replace(/\s*\*\s*$/, '');
        const options = [];
        swatches.forEach((sw, i) => {
          const img = sw.querySelector('img');
          options.push({
            element: sw,
            textContent: sw.textContent?.trim()?.replace(/\s+/g, ' ') || `Option ${i+1}`,
            imageUrl: img?.src || img?.dataset?.src || '',
            bgColor: '',
            rect: sw.getBoundingClientRect(),
          });
        });
        groups.push({ label, element: el, options, rect: el.getBoundingClientRect() });
      });
      return groups;
    }
    
    console.log('[Matrixty Clipart] Found', labels.length, 'by-customization-form__label elements');
    
    labels.forEach((labelEl, idx) => {
      const label = labelEl.textContent.trim().replace(/\s*\*\s*$/, '').replace(/\s+/g, ' ');
      if (!label || label.length > 80 || label.length < 2) return;
      
      // v3.0.6: Parent is .by-customization-form_element or __element — handle both patterns
      const parent = labelEl.closest('.by-customization-form__element, .by-customization-form_element, [class*="customization-form_element"], [class*="customization-form__element"]') || labelEl.parentElement;
      if (!parent) return;
      
      // v3.0.5: Find swatches — search ALL descendants, not just direct children
      const swatches = parent.querySelectorAll('.by-image-swatch__swatch, [class*="swatch__swatch"], [class*="image-swatch__swatch"]');
      if (swatches.length < 2) return; // Skip text inputs (0 swatches) and single options
      
      const options = [];
      swatches.forEach((sw, i) => {
        const img = sw.querySelector('img');
        const text = sw.textContent?.trim()?.replace(/\s+/g, ' ') || '';
        
        // v3.0.7: Capture background-color from .by-image-swatch__color span (Skin Tone, Hair Color, etc.)
        let bgColor = '';
        if (!img) {
          const colorSpan = sw.querySelector('.by-image-swatch__color, [class*="swatch__color"], [style*="background-color"]');
          if (colorSpan) {
            bgColor = colorSpan.style.backgroundColor || window.getComputedStyle(colorSpan).backgroundColor || '';
          }
          // Fallback: check swatch element itself
          if (!bgColor) {
            const swBg = sw.style.backgroundColor || window.getComputedStyle(sw).backgroundColor;
            if (swBg && swBg !== 'rgba(0, 0, 0, 0)' && swBg !== 'transparent') bgColor = swBg;
          }
        }
        
        // v8.0.5: Skip empty placeholder swatches — stricter check
        const imgSrc = img?.src || img?.dataset?.src || '';
        const isEmptyImg = !img || !imgSrc || imgSrc === '' || imgSrc === 'about:blank' || imgSrc.includes('data:image/gif') || imgSrc.includes('data:image/svg+xml') || imgSrc.endsWith('undefined') || imgSrc.endsWith('null');
        const hasVisibleImg = !isEmptyImg && img.complete && img.naturalWidth > 5 && img.naturalHeight > 5;
        const hasContent = text.length > 0;
        // Also check: is the swatch visually empty? (no visible bg, no img, no text)
        const swBg = window.getComputedStyle(sw).backgroundColor;
        const hasSwatchBg = swBg && swBg !== 'rgba(0, 0, 0, 0)' && swBg !== 'transparent' && swBg !== 'rgb(255, 255, 255)';
        if (!hasVisibleImg && !bgColor && !hasContent && !hasSwatchBg) return; // Skip empty placeholder

        options.push({
          element: sw,
          textContent: text || `Option ${i+1}`,
          imageUrl: imgSrc,
          bgColor: bgColor,
          rect: sw.getBoundingClientRect(),
        });
      });

      // v8.0.4: Only add group if it has at least 2 non-empty options
      if (options.length < 2) return;

      groups.push({
        label: label,
        element: parent,
        options: options,
        rect: parent.getBoundingClientRect(),
      });
    });

    console.log('[Matrixty Clipart] personalization-form groups:', groups.map(g => `"${g.label}" (${g.options.length})`).join(', '));
    return groups;
  }

  // ---- Generic scanner ----
  // v8.0.8: Enhanced for broader compatibility (macorner.co, wrappiness.com, pawfecthouse.com, etc.)
  function scanGeneric() {
    const groups = [];
    const seen = new Set();
    // Extended container selectors for maximum coverage
    const CONTAINER_SELS = [
      'fieldset', '.form-group', '.product-option',
      '[class*="option-group"]', '[class*="option-wrap"]',
      '[class*="personalization"]', '[class*="customizer"]',
      '[class*="product-option"]', '[class*="form-field"]',
      '.tib-field', '[class*="tib-"]',
    ];
    // Also try: any div with a label AND multiple images/swatches
    for (const sel of CONTAINER_SELS) {
      try {
        document.querySelectorAll(sel).forEach(el => {
          if (seen.has(el)) return;
          seen.add(el);
          const labelEl = el.querySelector('label, legend, h4, h5, strong, [class*="label"]');
          if (!labelEl) return;
          const label = labelEl.textContent.trim().replace(/\s*\*\s*$/, '').replace(/\s+/g, ' ');
          if (!label || label.length > 60 || label.length < 2) return;
          // Collect images
          const imgs = el.querySelectorAll('img');
          const opts = [];
          const imgSeen = new Set();
          imgs.forEach(img => {
            if (!img.src || img.src.startsWith('data:image/svg') || imgSeen.has(img.src)) return;
            imgSeen.add(img.src);
            const r = img.getBoundingClientRect();
            if (r.width < 15 || r.height < 15 || r.width > 300) return;
            const w = img.parentElement;
            opts.push({
              element: w || img, rect: { x: r.x, y: r.y, w: r.width, h: r.height },
              imageUrl: img.src, bgColor: null, textContent: img.alt || '', isSelected: false,
            });
          });
          // Also check for color swatches (divs with background-color)
          if (opts.length < 2) {
            el.querySelectorAll('[style*="background-color"], [class*="swatch"], [class*="color"]').forEach(sw => {
              const r = sw.getBoundingClientRect();
              if (r.width < 15 || r.height < 15 || r.width > 100) return;
              const bg = sw.style.backgroundColor || getComputedStyle(sw).backgroundColor;
              if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent' || bg === 'rgb(255, 255, 255)') return;
              opts.push({
                element: sw, rect: { x: r.x, y: r.y, w: r.width, h: r.height },
                imageUrl: null, bgColor: bg, textContent: sw.textContent?.trim() || '', isSelected: false,
              });
            });
          }
          if (opts.length >= 2) groups.push({ element: el, label, options: opts, rect: el.getBoundingClientRect() });
        });
      } catch(e) {}
    }

    // v8.0.8: Fallback — scan for ANY section that has label + grid of images (catches unknown personalization apps)
    if (groups.length === 0) {
      var allLabels = document.querySelectorAll('label, legend, h4, h5, strong, [class*="label"]');
      allLabels.forEach(function(labelEl) {
        var text = labelEl.textContent.trim().replace(/\s*\*\s*$/, '').replace(/\s+/g, ' ');
        if (!text || text.length > 60 || text.length < 3) return;
        // Look at next sibling or parent for images
        var container = labelEl.parentElement;
        if (!container || seen.has(container)) return;
        var imgs = container.querySelectorAll('img');
        if (imgs.length < 2 || imgs.length > 100) return;
        seen.add(container);
        var opts = [];
        imgs.forEach(function(img) {
          if (!img.src || img.src.startsWith('data:image/svg')) return;
          var r = img.getBoundingClientRect();
          if (r.width < 15 || r.height < 15 || r.width > 300) return;
          opts.push({
            element: img.parentElement || img,
            rect: { x: r.x, y: r.y, w: r.width, h: r.height },
            imageUrl: img.src, bgColor: null, textContent: img.alt || '', isSelected: false,
          });
        });
        if (opts.length >= 2) groups.push({ element: container, label: text, options: opts, rect: container.getBoundingClientRect() });
      });
    }

    // Remove nested duplicates
    return groups.filter((g, i) => !groups.some((o, j) => i !== j && o.element.contains(g.element) && o.options.length >= g.options.length));
  }

  // ---- v8.0.9: Deep scanner for unknown personalization frameworks ----
  // Uses SIBLING-based approach: for each label, look at next siblings for image/swatch grids
  // This correctly handles multiple groups in the same page section (e.g. pawfecthouse.com)
  function scanDeep() {
    const groups = [];
    const usedImages = new Set(); // Track images already assigned to a group

    console.log('[Matrixty Clipart] Deep scan starting...');

    var LABEL_KEYWORDS = /^(choose|select|pick|chọn)\s/i;
    var LABEL_KEYWORDS_2 = /(background\s*color|clothes\s*color|skin\s*tone|hair\s*(color|style)|eye|number\s*of|gender|pet\s*(breed|type)|font|text\s*color|design|style|pattern|theme|variant|option)/i;

    // Collect ALL potential label elements (broad search)
    var allEls = document.querySelectorAll('label, legend, h1, h2, h3, h4, h5, h6, strong, b, p, span, div, td, th, dt, [class*="label"], [class*="title"], [class*="heading"], [class*="name"]');
    var labelCandidates = [];

    for (var i = 0; i < allEls.length; i++) {
      var el = allEls[i];
      var directText = '';
      for (var cn = 0; cn < el.childNodes.length; cn++) {
        if (el.childNodes[cn].nodeType === 3) directText += el.childNodes[cn].textContent;
      }
      directText = directText.trim().replace(/\s+/g, ' ');
      var fullText = el.textContent.trim().replace(/\s+/g, ' ');
      var text = directText.length >= 3 ? directText : (fullText.length <= 80 ? fullText : '');
      if (!text || text.length < 3 || text.length > 80) continue;
      if (LABEL_KEYWORDS.test(text) || LABEL_KEYWORDS_2.test(text)) {
        labelCandidates.push({ el: el, text: text.replace(/\s*[*:]\s*$/, '').trim() });
      }
    }

    // Dedup labels that share the same text (keep first/outermost only)
    var dedupLabels = [];
    var seenTexts = new Set();
    for (var di = 0; di < labelCandidates.length; di++) {
      var key = labelCandidates[di].text.toLowerCase();
      if (seenTexts.has(key)) continue;
      seenTexts.add(key);
      dedupLabels.push(labelCandidates[di]);
    }
    labelCandidates = dedupLabels;

    console.log('[Matrixty Clipart] Deep scan: found', labelCandidates.length, 'label candidates');

    // Helper: collect valid images from an element, excluding already-used ones
    function collectImages(container) {
      var imgs = container.querySelectorAll('img');
      var valid = [];
      for (var ii = 0; ii < imgs.length; ii++) {
        var img = imgs[ii];
        if (!img.src || img.src.startsWith('data:image/svg') || img.src.startsWith('data:image/gif')) continue;
        if (usedImages.has(img)) continue;
        var r = img.getBoundingClientRect();
        if (r.width < 15 || r.height < 15 || r.width > 300) continue;
        if (r.width > 200 && r.height > 200) continue; // Skip main product image
        valid.push(img);
      }
      return valid;
    }

    // Helper: collect color swatches from an element
    function collectSwatches(container) {
      var swatches = container.querySelectorAll('[style*="background-color"], [class*="swatch"], [class*="color"]');
      var valid = [];
      for (var si = 0; si < swatches.length; si++) {
        var sw = swatches[si];
        var sr = sw.getBoundingClientRect();
        if (sr.width < 15 || sr.height < 15 || sr.width > 100) continue;
        var bg = sw.style.backgroundColor || '';
        try { if (!bg) bg = getComputedStyle(sw).backgroundColor; } catch(e) {}
        if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent' || bg === 'rgb(255, 255, 255)') continue;
        valid.push({ el: sw, bg: bg });
      }
      return valid;
    }

    // Helper: build option array from images
    function buildImageOpts(imgs) {
      var opts = [];
      var seen = new Set();
      for (var fi = 0; fi < imgs.length; fi++) {
        var fimg = imgs[fi];
        if (seen.has(fimg.src)) continue;
        seen.add(fimg.src);
        usedImages.add(fimg);
        var fr = fimg.getBoundingClientRect();
        opts.push({
          element: fimg.parentElement || fimg,
          rect: { x: fr.x, y: fr.y, w: fr.width, h: fr.height },
          imageUrl: fimg.src, bgColor: null, textContent: fimg.alt || '', isSelected: false,
        });
      }
      return opts;
    }

    // Helper: build option array from swatches
    function buildSwatchOpts(swatches) {
      var opts = [];
      for (var ski = 0; ski < swatches.length; ski++) {
        var swo = swatches[ski];
        var swr = swo.el.getBoundingClientRect();
        opts.push({
          element: swo.el, rect: { x: swr.x, y: swr.y, w: swr.width, h: swr.height },
          imageUrl: null, bgColor: swo.bg, textContent: swo.el.textContent?.trim() || '', isSelected: false,
        });
      }
      return opts;
    }

    // Strategy 1: SIBLING-BASED — for each label, check next siblings for images/swatches
    for (var li = 0; li < labelCandidates.length; li++) {
      var lc = labelCandidates[li];
      var found = false;

      // Strategy 1a: Check label's next siblings
      var sibling = lc.el.nextElementSibling;
      for (var sCount = 0; sCount < 5 && sibling && !found; sCount++) {
        var sImgs = collectImages(sibling);
        if (sImgs.length >= 2) {
          var opts = buildImageOpts(sImgs);
          if (opts.length >= 2) {
            groups.push({ element: sibling, label: lc.text, options: opts, rect: sibling.getBoundingClientRect() });
            console.log('[Matrixty Clipart] Deep scan ✅ SIBLING-IMG: "' + lc.text + '" (' + opts.length + ' images)');
            found = true;
          }
        }
        if (!found) {
          var sSw = collectSwatches(sibling);
          if (sSw.length >= 2) {
            var swOpts = buildSwatchOpts(sSw);
            if (swOpts.length >= 2) {
              groups.push({ element: sibling, label: lc.text, options: swOpts, rect: sibling.getBoundingClientRect() });
              console.log('[Matrixty Clipart] Deep scan ✅ SIBLING-SW: "' + lc.text + '" (' + swOpts.length + ' swatches)');
              found = true;
            }
          }
        }
        sibling = sibling.nextElementSibling;
      }

      // Strategy 1b: Check parent's next siblings (label might be wrapped in a div)
      if (!found) {
        var parentSib = lc.el.parentElement?.nextElementSibling;
        for (var psCount = 0; psCount < 3 && parentSib && !found; psCount++) {
          var pImgs = collectImages(parentSib);
          if (pImgs.length >= 2) {
            var pOpts = buildImageOpts(pImgs);
            if (pOpts.length >= 2) {
              groups.push({ element: parentSib, label: lc.text, options: pOpts, rect: parentSib.getBoundingClientRect() });
              console.log('[Matrixty Clipart] Deep scan ✅ PARENT-SIB: "' + lc.text + '" (' + pOpts.length + ' images)');
              found = true;
            }
          }
          parentSib = parentSib.nextElementSibling;
        }
      }

      // Strategy 1c: Check parent itself (label + images in same container)
      if (!found) {
        var parent = lc.el.parentElement;
        if (parent) {
          // Only use parent if it doesn't contain OTHER label candidates
          var othersInParent = 0;
          for (var lj = 0; lj < labelCandidates.length; lj++) {
            if (lj !== li && parent.contains(labelCandidates[lj].el)) othersInParent++;
          }
          if (othersInParent === 0) {
            var parImgs = collectImages(parent);
            if (parImgs.length >= 2) {
              var parOpts = buildImageOpts(parImgs);
              if (parOpts.length >= 2) {
                groups.push({ element: parent, label: lc.text, options: parOpts, rect: parent.getBoundingClientRect() });
                console.log('[Matrixty Clipart] Deep scan ✅ PARENT: "' + lc.text + '" (' + parOpts.length + ' images)');
                found = true;
              }
            }
            if (!found) {
              var parSw = collectSwatches(parent);
              if (parSw.length >= 2) {
                var parSwOpts = buildSwatchOpts(parSw);
                if (parSwOpts.length >= 2) {
                  groups.push({ element: parent, label: lc.text, options: parSwOpts, rect: parent.getBoundingClientRect() });
                  console.log('[Matrixty Clipart] Deep scan ✅ PARENT-SW: "' + lc.text + '" (' + parSwOpts.length + ' swatches)');
                  found = true;
                }
              }
            }
          }
        }
      }

      // Strategy 1d: Walk up 2-4 levels (grandparent) but ONLY if no other labels inside
      if (!found) {
        var ancestor = lc.el.parentElement?.parentElement;
        for (var lev = 0; lev < 3 && ancestor && ancestor !== document.body && !found; lev++) {
          var othersInAncestor = 0;
          for (var lk = 0; lk < labelCandidates.length; lk++) {
            if (lk !== li && ancestor.contains(labelCandidates[lk].el)) othersInAncestor++;
          }
          if (othersInAncestor === 0) {
            var ancImgs = collectImages(ancestor);
            if (ancImgs.length >= 2) {
              var ancOpts = buildImageOpts(ancImgs);
              if (ancOpts.length >= 2) {
                groups.push({ element: ancestor, label: lc.text, options: ancOpts, rect: ancestor.getBoundingClientRect() });
                console.log('[Matrixty Clipart] Deep scan ✅ ANCESTOR: "' + lc.text + '" (' + ancOpts.length + ' images)');
                found = true;
              }
            }
          }
          ancestor = ancestor.parentElement;
        }
      }
    }

    // Strategy 2: Scan same-origin iframes
    try {
      var iframes = document.querySelectorAll('iframe');
      for (var ifi = 0; ifi < iframes.length; ifi++) {
        try {
          var iframeDoc = iframes[ifi].contentDocument || iframes[ifi].contentWindow?.document;
          if (!iframeDoc) continue;
          console.log('[Matrixty Clipart] Deep scan: checking iframe', ifi, iframes[ifi].src?.substring(0, 80));
          var iLabels = iframeDoc.querySelectorAll('label, legend, h4, h5, strong, [class*="label"]');
          for (var ili = 0; ili < iLabels.length; ili++) {
            var iLabel = iLabels[ili];
            var iText = iLabel.textContent.trim().replace(/\s+/g, ' ');
            if (!iText || iText.length < 3 || iText.length > 80) continue;
            if (!LABEL_KEYWORDS.test(iText) && !LABEL_KEYWORDS_2.test(iText)) continue;
            var iSib = iLabel.nextElementSibling;
            while (iSib) {
              var iImgs = iSib.querySelectorAll('img');
              var iValid = [];
              for (var iii = 0; iii < iImgs.length; iii++) {
                var iir = iImgs[iii].getBoundingClientRect();
                if (iImgs[iii].src && !iImgs[iii].src.startsWith('data:image/svg') && iir.width >= 15 && iir.width <= 300 && iir.height >= 15) iValid.push(iImgs[iii]);
              }
              if (iValid.length >= 2) {
                var iOpts = []; var iSeen = new Set();
                for (var iv = 0; iv < iValid.length; iv++) {
                  if (iSeen.has(iValid[iv].src)) continue; iSeen.add(iValid[iv].src);
                  var ivr = iValid[iv].getBoundingClientRect();
                  iOpts.push({ element: iValid[iv].parentElement || iValid[iv], rect: { x: ivr.x, y: ivr.y, w: ivr.width, h: ivr.height }, imageUrl: iValid[iv].src, bgColor: null, textContent: iValid[iv].alt || '', isSelected: false });
                }
                if (iOpts.length >= 2) {
                  groups.push({ element: iSib, label: iText, options: iOpts, rect: iSib.getBoundingClientRect() });
                  console.log('[Matrixty Clipart] Deep scan ✅ IFRAME: "' + iText + '" (' + iOpts.length + ' images)');
                }
                break;
              }
              iSib = iSib.nextElementSibling;
            }
          }
        } catch(e) {
          console.log('[Matrixty Clipart] Deep scan: iframe', ifi, 'cross-origin, skipped');
        }
      }
    } catch(e) {}

    console.log('[Matrixty Clipart] Deep scan result:', groups.length, 'groups');
    return groups;
  }

  // ---- Capture screenshot for a single category ----
  async function captureSingleGroup(cat) {
    // Scroll first option into view
    if (cat.options[0]?.element) {
      cat.options[0].element.scrollIntoView({ block: 'center', behavior: 'instant' });
      await sleep(400);
    }

    // Update rects after scroll
    for (const opt of cat.options) {
      if (opt.element) {
        const r = opt.element.getBoundingClientRect();
        opt.rect = { x: r.x, y: r.y, w: r.width, h: r.height };
      }
    }

    // Capture tab screenshot
    const screenshot = await captureTab();
    if (!screenshot) return;

    const img = await loadImage(screenshot);
    if (!img) return;

    const dpr = window.devicePixelRatio || 1;

    // v9.4.2: Crop each option as a SQUARE (1:1) — center element on white-padded canvas.
    //   Source: page element rect (w × h, may be non-square)
    //   Output: side × side (square), element centered, padding = white
    //   Final resize cap at maxDim (600px) — supports clear display at panel zoom up to 6×.
    const maxDim = 600;
    for (const opt of cat.options) {
      // Skip text-only options (no image, no bgColor) — keep them as text, don't screenshot
      if (!opt.imageUrl && !opt.bgColor && opt.textContent && opt.textContent.trim().length > 0) continue;
      const { x, y, w, h } = opt.rect;
      if (w <= 0 || h <= 0) continue;
      try {
        const cellW = Math.ceil(w * dpr);
        const cellH = Math.ceil(h * dpr);
        const side = Math.max(cellW, cellH);

        // Square canvas — white background → padding becomes seamless on light themes
        const cropCanvas = document.createElement('canvas');
        cropCanvas.width = side; cropCanvas.height = side;
        const cropCtx = cropCanvas.getContext('2d');
        cropCtx.fillStyle = '#FFFFFF';
        cropCtx.fillRect(0, 0, side, side);

        // Center the rectangular element inside the square canvas
        const dstX = Math.round((side - cellW) / 2);
        const dstY = Math.round((side - cellH) / 2);
        cropCtx.drawImage(img, x * dpr, y * dpr, cellW, cellH, dstX, dstY, cellW, cellH);

        // Resize to maxDim if too large — output stays square
        if (side > maxDim) {
          const resizeCanvas = document.createElement('canvas');
          resizeCanvas.width = maxDim; resizeCanvas.height = maxDim;
          const resizeCtx = resizeCanvas.getContext('2d');
          resizeCtx.imageSmoothingEnabled = true;
          resizeCtx.imageSmoothingQuality = 'high';
          resizeCtx.drawImage(cropCanvas, 0, 0, maxDim, maxDim);
          opt.capturedImage = resizeCanvas.toDataURL('image/jpeg', 0.85);
        } else {
          opt.capturedImage = cropCanvas.toDataURL('image/jpeg', 0.85);
        }
      } catch(e) {}
    }
  }

  function captureTab() {
    return new Promise(resolve => {
      try {
        chrome.runtime.sendMessage({ type: 'CAPTURE_VISIBLE_TAB' }, res => {
          if (chrome.runtime.lastError || !res?.dataUrl) resolve(null);
          else resolve(res.dataUrl);
        });
      } catch(e) { resolve(null); }
    });
  }

  function loadImage(src) {
    return new Promise(resolve => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => resolve(null);
      i.src = src;
    });
  }

  function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ---- Progress indicator ----
  function showProgress(percent, text) {
    let bar = document.getElementById('mtx-clip-progress');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'mtx-clip-progress';
      bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999999;height:36px;background:#FFFFFF;border-bottom:1px solid #E5E7EB;display:flex;align-items:center;padding:0 16px;gap:10px;font-family:-apple-system,sans-serif;font-size:12px;color:#333;';
      document.body.appendChild(bar);
    }
    bar.innerHTML = `
      <span style="font-weight:700;color:#4A7C59;">🏷️</span>
      <div style="flex:1;height:6px;background:#E5E7EB;border-radius:3px;overflow:hidden;">
        <div style="width:${percent}%;height:100%;background:linear-gradient(90deg,#1565C0,#4A7C59);border-radius:3px;transition:width 0.3s;"></div>
      </div>
      <span style="min-width:36px;text-align:right;font-weight:700;color:#4A7C59;">${percent}%</span>
      <span style="color:#6B7280;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${text}</span>
    `;
    if (percent >= 100) {
      setTimeout(() => bar.remove(), 2000);
    }
  }

  // v3.0.7: Clear stale progress bar
  function clearProgress() {
    const bar = document.getElementById('mtx-clip-progress');
    if (bar) bar.remove();
  }

  // ---- Notification ----
  function clipNotify(msg, type) {
    const old = document.getElementById('mtx-clip-notif');
    if (old) old.remove();
    const colors = { success: '#4A7C59', error: '#E8453C', warning: '#E65100', info: '#1565C0' };
    const n = document.createElement('div');
    n.id = 'mtx-clip-notif';
    // v8.0.8: top:52px to sit below blue banner, z-index max to always show on top
    var pickActive = !!document.getElementById('mtx-pick-wrapper');
    var topPos = pickActive ? '52px' : '16px';
    n.style.cssText = `position:fixed;top:${topPos};left:50%;transform:translateX(-50%);z-index:2147483647;background:${colors[type]||colors.info};color:#fff;padding:10px 20px;border-radius:8px;font-family:-apple-system,sans-serif;font-size:13px;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,0.3);pointer-events:none;animation:mtxSlide .3s ease;`;
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 3500);
  }

  // ---- Auto-expand: click options to trigger Customily rendering ----
  async function autoExpandSections() {
    let expanded = 0;
    let prevCount = 0;
    let retries = 0;
    const maxRetries = 5;

    // Customily renders sub-options ONLY after clicking a parent option (img)
    // Strategy: find all groups with imgs, click first img in each, wait for new groups
    var clickedLabels = {};
    while (retries < maxRetries) {
      var groups = document.querySelectorAll('.ant-form-item');
      var currentCount = groups.length;

      if (currentCount === prevCount && retries > 0) {
        // No new groups appeared — we're done
        break;
      }
      prevCount = currentCount;

      // Find groups that have imgs and haven't been clicked yet
      var clicked = 0;
      groups.forEach(function(el) {
        var label = el.querySelector('.ant-form-item-label label');
        if (!label) return;
        var name = label.textContent.trim();

        // Skip text inputs and already-clicked groups
        if (name.toLowerCase().includes('type ') || name.toLowerCase().includes('name initial')) return;
        if (clickedLabels[name]) return;

        var children = el.querySelector('.ant-form-item-children, .ant-form-item-control-input-content, .ant-form-item-control');
        if (!children) return;

        var imgs = children.querySelectorAll('img');
        if (imgs.length < 2) return;

        // Click first img to trigger sub-options rendering
        var firstImg = imgs[0];
        if (firstImg && firstImg.offsetParent !== null) {
          console.log('[Matrixty Clipart] Auto-clicking: ' + name + ' (first of ' + imgs.length + ' imgs)');
          firstImg.click();
          clickedLabels[name] = true;
          clicked++;
          expanded++;
        }
      });

      if (clicked === 0) break;

      // Wait for Customily to render new options
      showProgress(5 + retries * 3, 'Đang mở options... (' + (retries + 1) + ')');
      await sleep(2500);
      retries++;
    }

    // Also handle standard collapse/accordion (non-Customily)
    var collapseSelectors = [
      'details:not([open])',
      '[aria-expanded="false"]',
      '.collapsed:not(.show)',
      '.accordion-button.collapsed',
    ];
    for (var si = 0; si < collapseSelectors.length; si++) {
      try {
        document.querySelectorAll(collapseSelectors[si]).forEach(function(el) {
          var parent = el.closest('.product-form, .product__info, [class*="product"], [class*="personalized"], main');
          if (!parent) return;
          if (el.tagName === 'DETAILS') el.setAttribute('open', '');
          else el.click();
          expanded++;
        });
      } catch(e) {}
    }

    if (expanded > 0) {
      console.log('[Matrixty Clipart] Auto-expanded ' + expanded + ' sections');
      // Scroll through form to trigger lazy loading
      var form = document.querySelector('.ctm-artwork-personalized-form, .ant-form, .product-form');
      if (form) {
        var formRect = form.getBoundingClientRect();
        var formTop = formRect.top + window.scrollY;
        var formBottom = formRect.bottom + window.scrollY;
        var scrollPos = formTop;
        while (scrollPos < formBottom) {
          window.scrollTo({ top: scrollPos, behavior: 'instant' });
          await sleep(200);
          scrollPos += window.innerHeight * 0.6;
        }
        window.scrollTo({ top: formTop - 100, behavior: 'instant' });
        await sleep(300);
      }
    }
  }

  // ---- HYBRID SCAN: Auto-snapshot + Manual continue ----
  async function expandAndSnapshot() {
    var allGroups = [];
    var clickedKeys = new Set();
    var totalClicks = 0;
    
    // Helper: normalize label for dedup (strip #N, trailing numbers)
    function baseLabel(label) {
      return label
        .replace(/\s*#\d+\s*$/i, '')
        .replace(/\s*\(\d+\)\s*$/i, '')
        .replace(/\s+\d+\s*$/i, '')
        .replace(/\s*#\d+\s*/g, ' ')
        .replace(/\s+/g, ' ').trim();
    }
    
    function snapshotNow() {
      var groups = scanDOM();
      var added = 0;
      for (var g = 0; g < groups.length; g++) {
        var grp = groups[g];
        
        // Dedup: same base label + similar count = duplicate
        var grpBase = baseLabel(grp.label);
        var isDuplicate = false;
        for (var eg = 0; eg < allGroups.length; eg++) {
          var existBase = baseLabel(allGroups[eg].label);
          if (existBase === grpBase && Math.abs(allGroups[eg].options.length - grp.options.length) <= 2) {
            isDuplicate = true;
            break;
          }
        }
        if (isDuplicate) continue;
        
        var savedOpts = grp.options.map(function(o) {
          return {
            element: o.element,
            rect: { x: o.rect.x, y: o.rect.y, w: o.rect.w, h: o.rect.h },
            imageUrl: o.imageUrl || null,
            bgColor: o.bgColor || null,
            textContent: o.textContent || '',
            isSelected: o.isSelected || false,
            capturedImage: o.imageUrl || null,
          };
        });
        var grpRect = grp.rect || (grp.element ? grp.element.getBoundingClientRect() : {top:0});
        allGroups.push({ element: grp.element, label: grp.label, options: savedOpts, 
          rect: {top: grpRect.top||0, left: grpRect.left||0, x: grpRect.x||0, y: grpRect.y||0} });
        added++;
        console.log('[Matrixty Clipart] ✅ NEW: "' + grp.label + '" (' + grp.options.length + ' opts)');
      }
      return added;
    }
    
    // ---- PHASE 1: Auto-scan ----
    // Scroll entire form to trigger lazy loading
    showProgress(5, 'Scanning...');
    // v8.0.8: Extended form selectors for macorner.co, wrappiness.com, pawfecthouse.com, etc.
    var FORM_SELS = '.ctm-artwork-personalized-form, .ant-form, .product-form, form.personalization-form, .personalization-form, .by-customization-form, [class*="customizer-form"], [class*="personalization"], .tib-container, [class*="tib-personalization"], [class*="product-customizer"], .product__info-container form, .product-single__form';
    var form = document.querySelector(FORM_SELS);
    // Fallback: find the biggest form or section that contains images
    if (!form) {
      var candidates = document.querySelectorAll('form, [class*="product"] section, .product__info, main');
      var maxImgs = 0;
      candidates.forEach(function(c) {
        var ic = c.querySelectorAll('img').length;
        if (ic > maxImgs) { maxImgs = ic; form = c; }
      });
    }
    if (form) {
      var fRect = form.getBoundingClientRect();
      var pos = fRect.top + window.scrollY;
      var fBottom = fRect.bottom + window.scrollY;
      while (pos < fBottom) {
        window.scrollTo({ top: pos, behavior: 'instant' });
        await sleep(300);
        pos += window.innerHeight * 0.7;
      }
      window.scrollTo({ top: (fRect.top + window.scrollY) - 50, behavior: 'instant' });
      await sleep(500);
    }

    // Scroll to empty grids to force lazy load
    var emptyGrids = document.querySelectorAll('.customall-grid');
    for (var eg = 0; eg < emptyGrids.length; eg++) {
      if (emptyGrids[eg].querySelectorAll('img').length === 0) {
        emptyGrids[eg].scrollIntoView({ behavior: 'instant', block: 'center' });
        await sleep(1000);
      }
    }
    
    // Initial snapshot
    snapshotNow();
    showProgress(8, allGroups.length + ' groups found');
    
    // Auto-click: only click FIRST occurrence of each base label trigger
    // This avoids clicking "Choose An Option #1", #2, #3... (all same)
    var clickedBaseLabels = new Set();
    var round = 0;
    var maxRounds = 40;
    
    while (round < maxRounds) {
      round++;
      var target = null;
      var items = document.querySelectorAll('.ant-form-item');
      
      for (var i = 0; i < items.length && !target; i++) {
        var el = items[i];
        var labelEl = el.querySelector('.ant-form-item-label label');
        if (!labelEl) continue;
        var name = labelEl.textContent.trim();
        var nameLower = name.toLowerCase();
        if (nameLower.includes('type ') || nameLower.includes('name initial') || nameLower.includes('add-on') || nameLower.includes('combo') || nameLower.includes('gift box')) continue;
        
        // Skip if we already clicked a group with same base label
        var nameBase = baseLabel(name);
        if (clickedBaseLabels.has(nameBase)) continue;
        
        var children = el.querySelector('.ant-form-item-children, .ant-form-item-control-input-content, .ant-form-item-control');
        if (!children) continue;
        var imgs = children.querySelectorAll('img');

        // v8.0.8: Also detect TEXT-based clickable options (e.g. "1","2","3" or "BOY","GIRL")
        // These are common on pawfecthouse.com, macorner.co for "Choose Number Of Kids", "Choose Gender", etc.
        var clickableItems = [];
        if (imgs.length >= 2) {
          // Image-based options
          for (var ci2 = 0; ci2 < imgs.length; ci2++) clickableItems.push(imgs[ci2]);
        } else {
          // Look for text-based clickable options (divs/spans inside the control area)
          var textOpts = children.querySelectorAll('[class*="image-item"], [class*="option"], .customall-grid > div, [role="button"], [style*="cursor"]');
          if (textOpts.length < 2) {
            // Broader: any direct children of a grid-like container
            var grid = children.querySelector('.customall-grid, [class*="grid"], [style*="grid"], [style*="flex"]');
            if (grid) textOpts = grid.children;
          }
          // Filter: must be visible, clickable-sized items
          for (var ti = 0; ti < textOpts.length; ti++) {
            var topt = textOpts[ti];
            var tr = topt.getBoundingClientRect();
            if (tr.width >= 20 && tr.height >= 20 && tr.width <= 200 && topt.offsetParent) {
              clickableItems.push(topt);
            }
          }
        }

        if (clickableItems.length < 2) continue;

        var isTrigger = clickableItems.length <= 8;
        var maxClick = isTrigger ? clickableItems.length : 1;

        for (var j = 0; j < maxClick; j++) {
          var clickEl = clickableItems[j];
          if (!clickEl || !clickEl.offsetParent) continue;
          var clickKey = name + '|' + j;
          if (clickedKeys.has(clickKey)) continue;

          target = { name: name, nameBase: nameBase, img: clickEl, clickKey: clickKey, imgIdx: j, totalImgs: clickableItems.length, isTrigger: isTrigger };
          break;
        }

        // If all clicks for this label are done, mark base as done
        if (!target) {
          var allDone = true;
          for (var k = 0; k < maxClick; k++) {
            if (!clickedKeys.has(name + '|' + k)) { allDone = false; break; }
          }
          if (allDone) clickedBaseLabels.add(nameBase);
        }
      }
      
      if (!target) break;
      
      // Get clicked option text for naming
      var clickedText = target.img.alt || target.img.title || '';
      if (!clickedText) {
        var wrapper = target.img.parentElement;
        if (wrapper) {
          clickedText = wrapper.textContent.trim();
          if (!clickedText || clickedText.length > 30) {
            var gp = wrapper.parentElement;
            if (gp) { var t = gp.textContent.trim(); if (t && t.length <= 30) clickedText = t; }
          }
        }
      }
      clickedText = clickedText.replace(/^[A-Z]\d+\s*/, '').replace(/\s*[A-Z]\d+$/, '').trim();
      window.__mtxLastClick = { groupName: target.name, optionText: clickedText, imgIdx: target.imgIdx };
      
      console.log('[Matrixty Clipart] Click: "' + target.name + '" [' + target.imgIdx + '] text="' + clickedText + '"');
      target.img.click();
      clickedKeys.add(target.clickKey);
      
      // Mark base label as having been clicked (for dedup of #1, #2, #3...)
      if (target.isTrigger) {
        // After ALL options of this trigger are clicked, mark base
        var allClicksDone = true;
        for (var ac = 0; ac < target.totalImgs; ac++) {
          if (!clickedKeys.has(target.name + '|' + ac)) { allClicksDone = false; break; }
        }
        if (allClicksDone) clickedBaseLabels.add(target.nameBase);
      } else {
        clickedBaseLabels.add(target.nameBase);
      }
      
      totalClicks++;
      showProgress(8 + Math.min(15, Math.round(totalClicks * 0.5)), 
        'Click ' + totalClicks + ': ' + target.name);
      
      if (target.isTrigger) {
        await sleep(3000);
        // Scroll to empty grids
        var egs = document.querySelectorAll('.customall-grid');
        for (var egi = 0; egi < egs.length; egi++) {
          if (egs[egi].querySelectorAll('img').length === 0) {
            egs[egi].scrollIntoView({ behavior: 'instant', block: 'center' });
            await sleep(800);
          }
        }
        await sleep(1000);
        snapshotNow();
        await sleep(1000);
      } else {
        await sleep(1500);
      }
      snapshotNow();
    }

    // ---- PHASE 1b: Wanderprints / personalization-form auto-expand ----
    // v8.0.3: CRITICAL FIX — Wanderprints sections (Skin Tone, Eyes Color, Hair, etc.)
    // only render AFTER Customily clicks (e.g. Gender=WOMAN). Must wait for DOM to settle,
    // then re-query, scroll to trigger lazy-load, and repeat until no new sections appear.

    // Wait for any pending DOM rendering after Phase 1 Customily clicks
    await sleep(1500);

    // Scroll through ENTIRE page to trigger lazy-load of all Wanderprints sections
    var wpForm = document.querySelector('form.personalization-form, .personalization-form, .by-customization-form') || form;
    if (wpForm) {
      var wpfRect = wpForm.getBoundingClientRect();
      var wpPos = wpfRect.top + window.scrollY;
      var wpBottom = wpfRect.bottom + window.scrollY;
      while (wpPos < wpBottom) {
        window.scrollTo({ top: wpPos, behavior: 'instant' });
        await sleep(300);
        wpPos += window.innerHeight * 0.6;
      }
      window.scrollTo({ top: (wpfRect.top + window.scrollY) - 50, behavior: 'instant' });
      await sleep(500);
    }

    // Re-snapshot after scroll (picks up newly visible Wanderprints sections)
    snapshotNow();

    // Now query Wanderprints elements — they should be in DOM after Customily clicks + scroll
    var wpRound = 0;
    var wpMaxRounds = 3;
    while (wpRound < wpMaxRounds) {
      wpRound++;
      var wpElements = document.querySelectorAll('.by-customization-form__element, .by-customization-form_element, [class*="customization-form__element"], [class*="customization-form_element"]');
      if (wpElements.length === 0) {
        console.log('[Matrixty Clipart] Wanderprints: no form elements found (round ' + wpRound + ')');
        break;
      }
      console.log('[Matrixty Clipart] Wanderprints round ' + wpRound + ': found ' + wpElements.length + ' form elements');
      showProgress(20 + wpRound, 'Wanderprints: scanning ' + wpElements.length + ' sections (round ' + wpRound + ')...');

      var wpClickedThisRound = 0;

      // Scroll through each element to trigger lazy loading + click first swatch
      for (var wi = 0; wi < wpElements.length; wi++) {
        var wpEl = wpElements[wi];
        wpEl.scrollIntoView({ behavior: 'instant', block: 'center' });
        await sleep(500);

        // Check if this section has swatches
        var wpSwatches = wpEl.querySelectorAll('.by-image-swatch__swatch, [class*="swatch__swatch"], [class*="image-swatch__swatch"]');
        var wpLabel = wpEl.querySelector('.by-customization-form__label, [class*="form__label"]');
        var wpLabelText = wpLabel ? wpLabel.textContent.trim() : 'Section ' + (wi + 1);

        if (wpSwatches.length >= 2) {
          // Click first swatch to trigger sub-option rendering
          var firstSwatch = wpSwatches[0];
          var wpClickKey = 'wp|' + wpLabelText;
          if (firstSwatch && firstSwatch.offsetParent !== null && !clickedKeys.has(wpClickKey)) {
            console.log('[Matrixty Clipart] Wanderprints auto-click: "' + wpLabelText + '" (first of ' + wpSwatches.length + ' swatches)');
            firstSwatch.click();
            clickedKeys.add(wpClickKey);
            totalClicks++;
            wpClickedThisRound++;
            await sleep(1500);
          }
        }

        // Snapshot after each section to capture any newly rendered content
        snapshotNow();
      }

      // Wait for DOM to settle after all clicks in this round
      await sleep(1000);

      // Final snapshot for this round
      var wpNewGroups = snapshotNow();
      console.log('[Matrixty Clipart] Wanderprints round ' + wpRound + ': ' + wpClickedThisRound + ' clicks, ' + wpNewGroups + ' new groups');

      // If no new clicks were made, we're done
      if (wpClickedThisRound === 0) break;
    }

    // Scroll back to top of form
    if (wpForm) {
      var wpFormRect2 = wpForm.getBoundingClientRect();
      window.scrollTo({ top: wpFormRect2.top + window.scrollY - 50, behavior: 'instant' });
      await sleep(300);
    }
    snapshotNow();

    // ---- PHASE 1c: Generic collapse/accordion expand ----
    var collapseSelectors = [
      'details:not([open])',
      '[aria-expanded="false"]',
      '.collapsed:not(.show)',
      '.accordion-button.collapsed',
    ];
    var genericExpanded = 0;
    for (var csi = 0; csi < collapseSelectors.length; csi++) {
      try {
        document.querySelectorAll(collapseSelectors[csi]).forEach(function(cel) {
          var cParent = cel.closest('.product-form, .product__info, [class*="product"], [class*="personalized"], [class*="customization"], main, form.personalization-form, .personalization-form');
          if (!cParent) return;
          if (cel.tagName === 'DETAILS') cel.setAttribute('open', '');
          else cel.click();
          genericExpanded++;
        });
      } catch(e) {}
    }
    if (genericExpanded > 0) {
      console.log('[Matrixty Clipart] Generic expanded ' + genericExpanded + ' collapsed sections');
      await sleep(1000);
      snapshotNow();
    }

    // ---- PHASE 1d: v8.0.9 Unknown framework auto-expand ----
    // Run when NO known framework was detected (Customily/Shopify/Wanderprints all found 0)
    // Even if deep scanner found some groups, there may be more behind trigger clicks
    var knownFrameworkFound = !!document.querySelector('.customall-grid, .ant-form-item, .by-customization-form__element, .product-form__input, .tib-field');
    if (!knownFrameworkFound) {
      console.log('[Matrixty Clipart] Phase 1d: No known framework, trying auto-expand triggers...');

      // Find text labels matching "Choose X" pattern, then look for clickable siblings
      var LABEL_KW = /^(choose|select|pick|chọn)\s/i;
      var allTextEls = document.querySelectorAll('label, legend, h1, h2, h3, h4, h5, h6, strong, b, p, span, div, [class*="label"], [class*="title"]');
      var triggerLabels = [];

      for (var tli = 0; tli < allTextEls.length; tli++) {
        var tlEl = allTextEls[tli];
        var tlText = '';
        for (var tcn = 0; tcn < tlEl.childNodes.length; tcn++) {
          if (tlEl.childNodes[tcn].nodeType === 3) tlText += tlEl.childNodes[tcn].textContent;
        }
        tlText = tlText.trim().replace(/\s+/g, ' ');
        if (!tlText) tlText = tlEl.textContent.trim().replace(/\s+/g, ' ');
        if (tlText.length < 5 || tlText.length > 80) continue;
        if (!LABEL_KW.test(tlText)) continue;
        triggerLabels.push({ el: tlEl, text: tlText });
      }

      console.log('[Matrixty Clipart] Phase 1d: found', triggerLabels.length, 'trigger labels');

      for (var tgi = 0; tgi < triggerLabels.length; tgi++) {
        var tg = triggerLabels[tgi];
        // Look for clickable items near this label (siblings, parent's children)
        var searchArea = tg.el.parentElement;
        if (!searchArea) continue;

        // Walk up to find area with clickable items
        for (var tLev = 0; tLev < 4 && searchArea; tLev++) {
          var clickables = searchArea.querySelectorAll('img, [role="button"], [class*="option"], [class*="item"], [class*="swatch"], button:not([type="submit"]), [style*="cursor: pointer"], [style*="cursor:pointer"]');
          // Filter to small, uniform clickable items (not navigation buttons)
          var triggerItems = [];
          for (var tci = 0; tci < clickables.length; tci++) {
            var tc = clickables[tci];
            var tcr = tc.getBoundingClientRect();
            if (tcr.width >= 20 && tcr.width <= 150 && tcr.height >= 20 && tcr.height <= 150 && tc.offsetParent) {
              triggerItems.push(tc);
            }
          }

          if (triggerItems.length >= 2 && triggerItems.length <= 12) {
            // Click each trigger item to expand sub-options
            console.log('[Matrixty Clipart] Phase 1d: clicking', triggerItems.length, 'triggers for "' + tg.text + '"');
            for (var tti = 0; tti < Math.min(triggerItems.length, 8); tti++) {
              var trigItem = triggerItems[tti];
              var trigKey = 'deep|' + tg.text + '|' + tti;
              if (clickedKeys.has(trigKey)) continue;

              console.log('[Matrixty Clipart] Phase 1d click: "' + tg.text + '" [' + tti + ']');
              trigItem.click();
              clickedKeys.add(trigKey);
              totalClicks++;

              await sleep(2500);

              // Scroll down to reveal any newly rendered content
              var trigRect = searchArea.getBoundingClientRect();
              window.scrollTo({ top: trigRect.bottom + window.scrollY, behavior: 'instant' });
              await sleep(500);
              window.scrollTo({ top: trigRect.top + window.scrollY - 50, behavior: 'instant' });
              await sleep(500);

              snapshotNow();
              showProgress(20 + Math.round(tti * 2), 'Expanding "' + tg.text + '" [' + (tti + 1) + '/' + triggerItems.length + ']...');
            }
            break; // Found triggers for this label, move to next label
          }
          searchArea = searchArea.parentElement;
        }
      }

      // Final snapshot after all Phase 1d clicks
      if (totalClicks > 0) {
        await sleep(1500);
        snapshotNow();
      }
    }

    // Final empty grid check
    for (var retry = 0; retry < 2; retry++) {
      var empties = [];
      document.querySelectorAll('.customall-grid').forEach(function(g) {
        if (g.querySelectorAll('img').length === 0) empties.push(g);
      });
      if (empties.length === 0) break;
      for (var ei = 0; ei < empties.length; ei++) {
        empties[ei].scrollIntoView({ behavior: 'instant', block: 'center' });
        await sleep(1200);
      }
      await sleep(1500);
      snapshotNow();
    }
    
    // ---- PHASE 2: Manual continue (watch for DOM changes) ----
    showProgress(25, allGroups.length + ' groups. Click options trên trang để thêm...');
    
    // Set up MutationObserver to detect when user clicks options
    var manualDone = false;
    var manualPromise = new Promise(function(resolve) {
      // Add "Done" button to progress area
      var progressEl = document.getElementById('mtx-scan-progress');
      if (progressEl) {
        var doneBtn = document.createElement('button');
        doneBtn.textContent = '✓ Đã đủ — Tiếp tục';
        doneBtn.style.cssText = 'margin-top:8px;padding:8px 16px;background:#4A7C59;color:white;border:none;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;width:100%;font-family:inherit;';
        doneBtn.onclick = function() { manualDone = true; resolve(); };
        progressEl.appendChild(doneBtn);
      }
      
      // Watch DOM for changes (user clicking options)
      // v8.0.9: Debounce to prevent infinite loop when observing body
      var _observerTimer = null;
      var _observerBusy = false;
      var observer = new MutationObserver(function() {
        if (manualDone || _observerBusy) return;
        clearTimeout(_observerTimer);
        _observerTimer = setTimeout(function() {
          if (manualDone) return;
          _observerBusy = true;
          try {
            var newAdded = snapshotNow();
            if (newAdded > 0) {
              showProgress(25, allGroups.length + ' groups. Click thêm hoặc bấm "Đã đủ"...');
            }
          } finally {
            // Release guard after a short delay to ignore mutations caused by our own scan
            setTimeout(function() { _observerBusy = false; }, 500);
          }
        }, 800);
      });
      
      var formEl = document.querySelector('.ctm-artwork-personalized-form, .ant-form, .product-form, form.personalization-form, .personalization-form, .by-customization-form, [class*="customizer-form"], [class*="personalization"], .tib-container, [class*="tib-personalization"], [class*="product-customizer"], .product-single__form');
      if (formEl) {
        observer.observe(formEl, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'style', 'class'] });
      }
      // Also observe Wanderprints form if separate from main form
      if (!formEl || !formEl.querySelector('.by-customization-form__element')) {
        var wpForm = document.querySelector('.by-customization-form, form.personalization-form, .personalization-form');
        if (wpForm && wpForm !== formEl) {
          observer.observe(wpForm, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'style', 'class'] });
        }
      }
      // v8.0.9: Fallback — if no known form found, observe main product area or body
      if (!formEl) {
        var productArea = document.querySelector('main, [role="main"], .product, [class*="product"], #MainContent');
        if (productArea) {
          observer.observe(productArea, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'style', 'class'] });
        } else {
          observer.observe(document.body, { childList: true, subtree: true });
        }
      }
      
      // Auto-timeout after 60s
      setTimeout(function() {
        if (!manualDone) {
          manualDone = true;
          observer.disconnect();
          resolve();
        }
      }, 60000);
      
      // Also resolve when done button clicked
      window.__mtxManualDone = function() { manualDone = true; observer.disconnect(); resolve(); };
    });
    
    await manualPromise;
    
    // ---- SORT ----
    var bodyOrder = ['choose', 'title', 'number', 'gender', 'age', 'option', 'skin', 'eyes', 'hair color', 'hair style', 
      'beard color', 'beard style', 'outfit', 'sweatshirt', 'pajama', 'tank', 't-shirt', 'outfit style',
      'pants', 'glasses', 'accessory', 'drink', 'background'];
    
    var personOrder = [];
    allGroups.forEach(function(g) {
      var prefix = (g.label.match(/^([\w\']+(?:\'s)?)\s/i) || ['', ''])[1].toLowerCase();
      if (!prefix) prefix = g.label.toLowerCase().split(' ')[0];
      if (personOrder.indexOf(prefix) === -1) personOrder.push(prefix);
    });
    
    allGroups.sort(function(a, b) {
      var aL = a.label.toLowerCase();
      var bL = b.label.toLowerCase();
      var aPrefix = (aL.match(/^([\w\']+(?:\'s)?)\s/i) || ['', ''])[1];
      var bPrefix = (bL.match(/^([\w\']+(?:\'s)?)\s/i) || ['', ''])[1];
      if (!aPrefix) aPrefix = aL.split(' ')[0];
      if (!bPrefix) bPrefix = bL.split(' ')[0];
      
      var aPersonIdx = personOrder.indexOf(aPrefix);
      var bPersonIdx = personOrder.indexOf(bPrefix);
      if (aPersonIdx !== bPersonIdx) return aPersonIdx - bPersonIdx;
      
      var aOrder = bodyOrder.length;
      var bOrder = bodyOrder.length;
      for (var i = 0; i < bodyOrder.length; i++) {
        if (aOrder === bodyOrder.length && aL.includes(bodyOrder[i])) aOrder = i;
        if (bOrder === bodyOrder.length && bL.includes(bodyOrder[i])) bOrder = i;
      }
      return aOrder - bOrder;
    });
    
    console.log('[Matrixty Clipart] ===== RESULT: ' + allGroups.length + ' groups, ' + totalClicks + ' auto-clicks =====');
    allGroups.forEach(function(g, i) { console.log('  ' + (i+1) + '. "' + g.label + '" → ' + g.options.length + ' opts'); });
    
    return allGroups;
  }

  // ---- Main scan function ----
  async function scanCliparts() {
    if (CLIPART.isScanning) return null;
    CLIPART.isScanning = true;
    clearProgress(); // v3.0.7: Clear any stale progress bar from previous scan
    showProgress(5, 'Đang expand tất cả options...');

    try {
      // Expand all + snapshot after each click (captures groups even if Customily removes them later)
      var groups = await expandAndSnapshot();
      
      if (!groups || !groups.length) {
        showProgress(100, 'Không tìm thấy options');
        clipNotify('Không tìm thấy clipart options trên trang này', 'warning');
        CLIPART.isScanning = false;
        return null;
      }
      showProgress(28, groups.length + ' nhóm phát hiện');

      // Assign prefixes — v3.0.4: Use A, B, C... sequential letters
      const cats = groups.map((g, idx) => {
        const pfx = sequentialPrefix(idx);
        return {
          name: g.label,
          prefix: pfx,
          options: g.options.map((o, i) => ({ ...o, label: `${pfx}${i + 1}` })),
          optionCount: g.options.length,
          rect: g.rect,
        };
      });
      showProgress(30, 'Đang capture ảnh...');

      // Capture screenshots (30→90%)
      const totalCats = cats.length;
      for (let ci = 0; ci < totalCats; ci++) {
        const cat = cats[ci];
        const pct = 30 + Math.round(((ci + 1) / totalCats) * 60);
        showProgress(pct, 'Capture: ' + cat.name + ' (' + (ci + 1) + '/' + totalCats + ')');
        
        // Check if elements are still in DOM & visible
        if (cat.options[0]?.element?.offsetParent) {
          await captureSingleGroup(cat);
        } else {
          // Not visible — use imageUrl fallback
          for (var oi = 0; oi < cat.options.length; oi++) {
            if (cat.options[oi].imageUrl && !cat.options[oi].capturedImage) {
              cat.options[oi].capturedImage = cat.options[oi].imageUrl;
            }
          }
        }
      }

      showProgress(92, 'Đang xử lý kết quả...');

      // Build result
      const result = {
        url: window.location.href,
        title: document.title,
        platform: (window.Shopify || document.querySelector('[data-shopify]')) ? 'shopify' : window.location.hostname.includes('etsy') ? 'etsy' : 'custom',
        scannedAt: new Date().toISOString(),
        categories: cats.map(c => ({
          name: c.name,
          prefix: c.prefix,
          optionCount: c.optionCount,
          options: c.options.map(o => ({
            label: o.label,
            imageUrl: o.imageUrl,
            capturedImage: o.capturedImage || null,
            bgColor: o.bgColor,
            textContent: o.textContent,
            width: o.rect.w,
            height: o.rect.h,
          })),
        })),
      };

      CLIPART.categories = cats;
      CLIPART.capturedData = result;
      CLIPART.isScanning = false;

      const totalOpts = cats.reduce((s, c) => s + c.optionCount, 0);
      showProgress(100, `Xong! ${cats.length} nhóm · ${totalOpts} options`);
      clipNotify(`Quét xong! ${cats.length} nhóm, ${totalOpts} options`, 'success');

      // v8.0.4: Removed page overlay labels (đè lên clipart trên trang)
      // Show panel
      showClipartPanel(result);

      return result;
    } catch(err) {
      console.error('[Matrixty Clipart]', err);
      showProgress(100, 'Lỗi: ' + err.message);
      clipNotify('Lỗi: ' + err.message, 'error');
      CLIPART.isScanning = false;
      return null;
    }
  }

  // ---- Show labels on page ----
  function showLabelsOnPage(cats) {
    document.querySelectorAll('.mtx-clip-label').forEach(e => e.remove());
    const colors = ['#1B5E20','#B71C1C','#0D47A1','#4A148C','#E65100','#006064','#880E4F','#33691E','#1A237E','#3E2723'];
    cats.forEach((cat, ci) => {
      const color = colors[ci % colors.length];
      cat.options.forEach(opt => {
        if (!opt.element) return;
        const r = opt.element.getBoundingClientRect();
        const lbl = document.createElement('div');
        lbl.className = 'mtx-clip-label';
        lbl.style.cssText = `position:fixed;left:${r.right-28}px;top:${r.bottom-16}px;background:${color};color:#fff;font-size:9px;font-weight:700;font-family:-apple-system,sans-serif;padding:1px 4px;border-radius:3px;z-index:99999;pointer-events:none;box-shadow:0 1px 3px rgba(0,0,0,0.4);line-height:13px;`;
        lbl.textContent = opt.label;
        document.body.appendChild(lbl);
      });
    });
  }

  // ---- Preview panel ----
  window.__mtxPickActive = false;

  // ---- v8.0.6: Screenshot Pick Mode ----
  // Full-screen overlay with highest z-index captures drag → scan elements beneath
  function activateScreenshotPick(data, onRefresh) {
    cleanupAllPickModes();
    var ZMAX = 2147483647;

    // v8.0.8: Highlight group titles (same as manual mode)
    highlightGroupTitles();

    var wrapper = document.createElement('div');
    wrapper.id = 'mtx-pick-wrapper';

    // Banner
    var banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:' + ZMAX + ';height:44px;background:#D97706;color:#fff;display:flex;align-items:center;justify-content:center;gap:10px;font-family:-apple-system,sans-serif;font-size:14px;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,0.2);';
    banner.innerHTML = '📸 SCREENSHOT — Kéo chuột chọn vùng clipart &nbsp;<button id="mtx-pick-cancel-btn" style="padding:5px 14px;background:#fff;border:none;border-radius:5px;cursor:pointer;font-size:12px;font-weight:600;color:#D97706;">Hủy</button>';
    wrapper.appendChild(banner);

    // v8.0.8+: Full-screen capture overlay — use !important + high z-index to beat page's own elements
    var capture = document.createElement('div');
    capture.id = 'mtx-screenshot-capture';
    wrapper.appendChild(capture);

    // Selection box
    var selBox = document.createElement('div');
    selBox.id = 'mtx-screenshot-selbox';
    wrapper.appendChild(selBox);

    // v8.0.8+: Inject styles via <style> tag with !important to prevent page CSS override
    var pickStyle = document.createElement('style');
    pickStyle.id = 'mtx-pick-capture-style';
    pickStyle.textContent = [
      '#mtx-screenshot-capture { position:fixed !important; top:44px !important; left:0 !important; right:0 !important; bottom:0 !important; z-index:' + (ZMAX - 1) + ' !important; cursor:crosshair !important; background:rgba(0,0,0,0.05) !important; pointer-events:auto !important; user-select:none !important; -webkit-user-select:none !important; touch-action:none !important; }',
      '#mtx-screenshot-selbox { position:fixed !important; border:3px dashed #D97706 !important; background:rgba(217,119,6,0.15) !important; z-index:' + ZMAX + ' !important; pointer-events:none !important; display:none; border-radius:4px !important; }',
    ].join('\n');
    document.head.appendChild(pickStyle);

    document.body.appendChild(wrapper);

    var startX = 0, startY = 0, isDragging = false;

    wrapper.querySelector('#mtx-pick-cancel-btn').onclick = function(e) { e.stopPropagation(); cleanupAllPickModes(); };

    // v8.0.8+: Use addEventListener with CAPTURE phase to beat page's event handlers
    // NOTE: e.target is the REAL page element (not our overlay), so we check coordinates instead
    function isInCaptureZone(e) {
      // Above banner (44px) = not ours. On cancel button = not ours. Everything else = ours.
      if (e.clientY < 44) return false;
      if (e.target && e.target.id === 'mtx-pick-cancel-btn') return false;
      // Don't capture on the left panel
      var panel = document.getElementById('mtx-clip-panel');
      if (panel) {
        var pr = panel.getBoundingClientRect();
        if (e.clientX >= pr.left && e.clientX <= pr.right && e.clientY >= pr.top && e.clientY <= pr.bottom) return false;
      }
      return true;
    }
    function onCaptureMouseDown(e) {
      if (!isInCaptureZone(e)) return;
      e.preventDefault(); e.stopImmediatePropagation();
      startX = e.clientX; startY = e.clientY;
      isDragging = true;
      selBox.style.display = 'block';
      selBox.style.left = startX + 'px'; selBox.style.top = startY + 'px';
      selBox.style.width = '0'; selBox.style.height = '0';
      console.log('[Matrixty Screenshot] Drag start:', startX, startY);
    }
    function onCaptureMouseMove(e) {
      if (!isDragging) return;
      e.preventDefault(); e.stopImmediatePropagation();
      var x = Math.min(startX, e.clientX), y = Math.min(startY, e.clientY);
      selBox.style.left = x + 'px'; selBox.style.top = y + 'px';
      selBox.style.width = Math.abs(e.clientX - startX) + 'px';
      selBox.style.height = Math.abs(e.clientY - startY) + 'px';
    }
    function onCaptureMouseUp(e) {
      if (!isDragging) return;
      e.preventDefault(); e.stopImmediatePropagation();
      isDragging = false;
      var x1 = Math.min(startX, e.clientX), y1 = Math.min(startY, e.clientY);
      var w = Math.abs(e.clientX - startX), h = Math.abs(e.clientY - startY);
      selBox.style.display = 'none';
      console.log('[Matrixty Screenshot] Drag end:', {x1, y1, w, h});
      if (w < 30 || h < 30) { clipNotify('Kéo rộng hơn', 'warning'); return; }

      var region = { left: x1, top: y1, right: x1 + w, bottom: y1 + h };
      // Hide entire wrapper momentarily to scan elements beneath (not just capture div)
      wrapper.style.display = 'none';

      // v8.0.8: Auto-detect group name — check ABOVE region too (title is usually just above cliparts)
      var autoName = '';
      var titleSels = '.by-customization-form__label, .ant-form-item-label label, [class*="form__label"], label, legend, h4, h5, strong';
      document.querySelectorAll(titleSels).forEach(function(lbl) {
        if (autoName) return;
        var r = lbl.getBoundingClientRect();
        var t = lbl.textContent.trim().replace(/\s*\*\s*$/, '').replace(/\s+/g, ' ');
        if (t.length < 2 || t.length > 60) return;
        // Inside region
        if (r.left >= region.left - 20 && r.right <= region.right + 20 && r.top >= region.top - 10 && r.bottom <= region.bottom + 10) {
          autoName = t; return;
        }
        // Just ABOVE region (within 80px)
        if (r.bottom <= region.top && r.bottom >= region.top - 80 && r.left >= region.left - 50 && r.right <= region.right + 50) {
          autoName = t;
        }
      });

      // v8.0.8: Use auto-detected name by default; only prompt if empty
      var groupName = autoName || prompt('Tên nhóm clipart:', 'New Group');
      if (!groupName) { wrapper.style.display = ''; return; }

      var opts = collectOptionsInRegion(region);
      // Restore wrapper
      wrapper.style.display = '';
      if (opts.length < 1) { clipNotify('Không tìm thấy clipart trong vùng', 'warning'); return; }

      // v8.0.8: Always add at bottom + scroll panel to new group
      var newIdx = data.categories.length;
      var pfx = sequentialPrefix(newIdx);
      data.categories.push({ name: groupName, prefix: pfx, options: opts.map(function(o, i) { return Object.assign({}, o, { label: pfx + (i + 1) }); }), optionCount: opts.length });

      // v8.0.8: Mark the title in the region as "picked" (green + ✓)
      document.querySelectorAll('.mtx-highlight-title').forEach(function(ht) {
        var t = ht.textContent.trim().replace(/\s*\*\s*$/, '').replace(/\s+/g, ' ');
        if (t === groupName) {
          ht.classList.add('mtx-picked');
          ht.style.background = '#22C55E';
          ht.style.color = '#fff';
          ht.style.border = '2px solid #22C55E';
        }
      });

      // Stay in screenshot mode — show overlay again for more picks
      capture.style.display = 'block';

      if (onRefresh) onRefresh();

      // v8.0.8: Scroll panel to bottom + highlight new group
      setTimeout(function() {
        var panel = document.getElementById('mtx-clip-panel');
        if (panel) {
          var scrollArea = panel.querySelector('div[style*="overflow-y"]');
          if (scrollArea) scrollArea.scrollTop = scrollArea.scrollHeight;
          var newCard = panel.querySelector('.mtx-clip-cat[data-cat-idx="' + newIdx + '"]');
          if (newCard) {
            newCard.style.background = '#ECFDF5';
            newCard.style.border = '2px solid #22C55E';
            newCard.style.transition = 'all 0.3s ease';
            setTimeout(function() {
              newCard.style.background = '#F9FAFB';
              newCard.style.border = '1px solid #E5E7EB';
            }, 3000);
          }
        }
      }, 100);

      clipNotify('✅ "' + groupName + '" (' + opts.length + ' opts) đã thêm ở cuối', 'success');
    }

    // v8.0.8+: Register events on DOCUMENT with capture phase — this beats any page event handlers
    document.addEventListener('mousedown', onCaptureMouseDown, true);
    document.addEventListener('mousemove', onCaptureMouseMove, true);
    document.addEventListener('mouseup', onCaptureMouseUp, true);

    // Store references for cleanup
    wrapper.__screenshotHandlers = {
      mousedown: onCaptureMouseDown,
      mousemove: onCaptureMouseMove,
      mouseup: onCaptureMouseUp,
    };
  }

  // ---- v8.0.6: Manual Click Pick Mode ----
  // Full-screen transparent overlay, click → elementFromPoint beneath → detect group
  function activateManualPick(data, onRefresh) {
    cleanupAllPickModes();
    var ZMAX = 2147483647;

    // v8.0.8: Highlight all available group titles on the page
    highlightGroupTitles();

    var wrapper = document.createElement('div');
    wrapper.id = 'mtx-pick-wrapper';

    var banner = document.createElement('div');
    banner.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:' + ZMAX + ';height:44px;background:#2563EB;color:#fff;display:flex;align-items:center;justify-content:center;gap:10px;font-family:-apple-system,sans-serif;font-size:14px;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,0.2);';
    banner.innerHTML = '👆 MANUAL — Click vào title được highlight &nbsp;<button id="mtx-pick-cancel-btn" style="padding:5px 14px;background:#fff;border:none;border-radius:5px;cursor:pointer;font-size:12px;font-weight:600;color:#2563EB;">Hủy</button>';
    wrapper.appendChild(banner);

    // v8.0.8: NO full-screen overlay — let user scroll naturally
    // Instead, use delegated click handler on document
    document.body.appendChild(wrapper);

    wrapper.querySelector('#mtx-pick-cancel-btn').onclick = function(e) { e.stopPropagation(); cleanupAllPickModes(); };

    // v8.0.8: Click handler on highlighted titles directly (no overlay blocking scroll)
    function handleManualClick(e) {
      var target = e.target;
      // Only respond to clicks on highlighted titles or their children
      var highlightedTitle = target.closest('.mtx-highlight-title');
      if (!highlightedTitle) return;

      e.preventDefault();
      e.stopPropagation();

      // Find the group container that this title belongs to
      // v8.0.8: Extended selectors for all supported platforms
      var formItem = highlightedTitle.closest('.by-customization-form__element, .by-customization-form_element, [class*="customization-form__element"], [class*="customization-form_element"], .ant-form-item, .product-form__input, fieldset, .tib-field, [class*="tib-option"], [class*="option-group"], [class*="option-wrap"], [class*="personalization-option"], .form-group, .product-option, [class*="product-option"]');

      if (!formItem) {
        // Walk up from title to find container with swatches/images/selects
        var el = highlightedTitle.parentElement;
        for (var d = 0; d < 10 && el && el !== document.body; d++) {
          var swc = el.querySelectorAll('.by-image-swatch__swatch, [class*="swatch__swatch"], [class*="swatch-item"], [class*="option-item"]').length;
          var imc = el.querySelectorAll('img').length;
          if (swc >= 2 && swc <= 80) { formItem = el; break; }
          if (imc >= 2 && imc <= 80) { formItem = el; break; }
          // v1.2: Also detect <select> dropdowns with 2+ valid options
          var sels = el.querySelectorAll('select');
          for (var si = 0; si < sels.length; si++) {
            var validOpts = 0;
            sels[si].querySelectorAll('option').forEach(function(opt) {
              var t = opt.textContent.trim();
              if (t && opt.value !== '' && !t.toLowerCase().startsWith('select') && !t.toLowerCase().startsWith('choose') && !t.toLowerCase().startsWith('---')) validOpts++;
            });
            if (validOpts >= 2) { formItem = el; break; }
          }
          if (formItem) break;
          // v1.2: Detect Customily dropdown, ARIA listbox
          var ddOpts = el.querySelectorAll('.by-common-dropdown__option, [role="option"], [class*="dropdown__option"]').length;
          var hasDDTrigger = el.querySelector('.by-common-dropdown, .by-common-dropdown__trigger, [role="combobox"]');
          if (ddOpts >= 2 || hasDDTrigger) { formItem = el; break; }
          el = el.parentElement;
        }
      }

      if (!formItem) { clipNotify('Không tìm thấy nhóm options', 'warning'); return; }

      // Get label from the highlighted title
      var label = highlightedTitle.textContent.trim().replace(/\s*\*\s*$/, '').replace(/\s+/g, ' ');
      if (label.length > 60) label = label.substring(0, 60);
      if (!label) label = 'Unknown Group';

      console.log('[Matrixty Manual Pick] Title click:', label, 'Container:', formItem.tagName);

      var opts = collectOptionsInContainer(formItem);
      if (opts.length < 1) { clipNotify('Không tìm thấy options trong "' + label + '"', 'warning'); return; }

      // v8.0.8: Flash the title green + mark as "picked"
      highlightedTitle.style.background = '#22C55E';
      highlightedTitle.style.color = '#fff';
      highlightedTitle.classList.add('mtx-picked');
      highlightedTitle.style.border = '2px solid #22C55E';
      // Don't revert to yellow — keep green to show it's been picked

      // v8.0.8: ALWAYS add at bottom (never replace existing) so user can see it
      var pfx = sequentialPrefix(data.categories.length);
      var newIdx = data.categories.length;
      data.categories.push({ name: label, prefix: pfx, options: opts.map(function(o, i) { return Object.assign({}, o, { label: pfx + (i + 1) }); }), optionCount: opts.length });
      if (onRefresh) onRefresh();

      // v8.0.8: Scroll panel to bottom + highlight the new group
      setTimeout(function() {
        var panel = document.getElementById('mtx-clip-panel');
        if (panel) {
          var scrollArea = panel.querySelector('div[style*="overflow-y"]');
          if (scrollArea) {
            scrollArea.scrollTop = scrollArea.scrollHeight; // scroll to bottom
          }
          // Highlight the new category card
          var newCard = panel.querySelector('.mtx-clip-cat[data-cat-idx="' + newIdx + '"]');
          if (newCard) {
            newCard.style.background = '#ECFDF5';
            newCard.style.border = '2px solid #22C55E';
            newCard.style.transition = 'all 0.3s ease';
            setTimeout(function() {
              newCard.style.background = '#F9FAFB';
              newCard.style.border = '1px solid #E5E7EB';
            }, 3000);
          }
        }
      }, 100);

      clipNotify('✅ "' + label + '" (' + opts.length + ' opts) đã thêm ở cuối', 'success');
    }

    document.addEventListener('click', handleManualClick, true);
    // Store reference for cleanup
    wrapper.__manualClickHandler = handleManualClick;
  }

  // v8.0.8: Highlight all detectable group titles on the page
  function highlightGroupTitles() {
    removeHighlights(); // Clear any old ones

    // v8.0.8: Extended selectors for all platforms (macorner, wrappiness, wanderprints, pawfecthouse, etc.)
    var GROUP_SELS = [
      '.by-customization-form__element',
      '.by-customization-form_element',
      '[class*="customization-form__element"]',
      '[class*="customization-form_element"]',
      '.ant-form-item',
      '.product-form__input',
      'fieldset',
      '.tib-field', '[class*="tib-option"]',
      '[class*="option-group"]', '[class*="option-wrap"]',
      '[class*="personalization-option"]', '[class*="personalization"]',
      '.form-group', '.product-option', '[class*="product-option"]',
      '[class*="customizer"]',
    ];

    var allContainers = [];
    var seen = new Set();
    for (var si = 0; si < GROUP_SELS.length; si++) {
      document.querySelectorAll(GROUP_SELS[si]).forEach(function(el) {
        if (seen.has(el)) return;
        // Must have >=2 swatches, images, OR a <select> with >=2 options (real group)
        var swc = el.querySelectorAll('.by-image-swatch__swatch, [class*="swatch__swatch"]').length;
        var imc = el.querySelectorAll('img').length;
        // v1.2: Detect <select>, Customily dropdown (.by-common-dropdown), ARIA listbox
        var selCount = 0;
        el.querySelectorAll('select').forEach(function(sel) {
          var validOpts = 0;
          sel.querySelectorAll('option').forEach(function(opt) {
            var t = opt.textContent.trim();
            if (t && opt.value !== '' && !t.toLowerCase().startsWith('select') && !t.toLowerCase().startsWith('choose') && !t.toLowerCase().startsWith('---') && !t.toLowerCase().startsWith('--')) validOpts++;
          });
          if (validOpts >= 2) selCount++;
        });
        // Customily by-common-dropdown
        var ddCount = el.querySelectorAll('.by-common-dropdown__option, [role="option"], [class*="dropdown__option"], [class*="dropdown-option"]').length;
        // ARIA listbox
        var lbCount = el.querySelectorAll('[role="listbox"] > *, .by-common-dropdown__panel > *').length;
        // Also count if there's a .by-common-dropdown trigger (closed dropdown)
        var hasDDTrigger = el.querySelector('.by-common-dropdown__trigger, .by-common-dropdown, [role="combobox"]') ? 1 : 0;
        if (swc >= 2 || (imc >= 2 && imc <= 100) || selCount >= 1 || ddCount >= 2 || lbCount >= 2 || hasDDTrigger >= 1) {
          seen.add(el);
          allContainers.push(el);
        }
      });
    }

    // v8.0.8: Extended label selectors for all platforms
    var LABEL_SELS = '.ant-form-item-label label, .by-customization-form__label, [class*="form__label"], [class*="option-label"], [class*="field-label"], .tib-label';
    allContainers.forEach(function(container) {
      var labelEl = container.querySelector(LABEL_SELS);
      if (!labelEl) labelEl = container.querySelector('label, legend, strong, h4, h5, [class*="label"]');
      if (!labelEl) return;
      // Skip if label text is too short or too long
      var labelText = labelEl.textContent.trim();
      if (labelText.length < 2 || labelText.length > 60) return;
      // Add highlight class + style
      labelEl.classList.add('mtx-highlight-title');
      labelEl.style.cssText += ';background:#FEF3C7 !important;color:#92400E !important;padding:4px 10px !important;border-radius:6px !important;border:2px dashed #F59E0B !important;cursor:pointer !important;display:inline-block !important;transition:all 0.2s !important;';
    });

    // Add hover effect + picked state via style tag
    var style = document.createElement('style');
    style.id = 'mtx-highlight-style';
    style.textContent = '.mtx-highlight-title:hover { background:#FDE68A !important; border-color:#D97706 !important; transform:scale(1.03); box-shadow:0 2px 8px rgba(245,158,11,0.3) !important; } .mtx-highlight-title.mtx-picked { background:#DCFCE7 !important; color:#166534 !important; border-color:#22C55E !important; } .mtx-highlight-title.mtx-picked::after { content:" ✓"; font-weight:bold; }';
    document.head.appendChild(style);
  }

  function removeHighlights() {
    document.querySelectorAll('.mtx-highlight-title').forEach(function(el) {
      el.classList.remove('mtx-highlight-title');
      // Remove our inline styles (approximate cleanup)
      el.style.background = '';
      el.style.color = '';
      el.style.padding = '';
      el.style.borderRadius = '';
      el.style.border = '';
      el.style.cursor = '';
      el.style.display = '';
      el.style.transition = '';
      el.style.transform = '';
      el.style.boxShadow = '';
    });
    var hs = document.getElementById('mtx-highlight-style');
    if (hs) hs.remove();
  }

  // ---- v8.0.6: Shared helpers ----
  function cleanupAllPickModes() {
    var w = document.getElementById('mtx-pick-wrapper');
    if (w) {
      // v8.0.8: Remove manual click handler if exists
      if (w.__manualClickHandler) {
        document.removeEventListener('click', w.__manualClickHandler, true);
      }
      // v8.0.8+: Remove screenshot drag handlers if exists
      if (w.__screenshotHandlers) {
        document.removeEventListener('mousedown', w.__screenshotHandlers.mousedown, true);
        document.removeEventListener('mousemove', w.__screenshotHandlers.mousemove, true);
        document.removeEventListener('mouseup', w.__screenshotHandlers.mouseup, true);
      }
      w.remove();
    }
    // v8.0.8: Remove title highlights
    removeHighlights();
    // v8.0.8+: Remove capture style tag
    var cs = document.getElementById('mtx-pick-capture-style');
    if (cs) cs.remove();
    var pickBtn = document.querySelector('#mtx-clip-pick');
    if (pickBtn) { pickBtn.style.background = '#FFFBEB'; pickBtn.style.color = '#D97706'; pickBtn.textContent = '🎯 Pick'; }
    window.__mtxPickActive = false;
  }

  function collectOptionsInRegion(region) {
    var opts = [];

    // v1.2 HIGH PRIORITY: Detect dropdown text options via CONTAINER-FIRST approach
    // Step 1: Find dropdown PANELS (containers) that overlap with drawn region
    // Step 2: Extract LEAF option text from each panel's children
    if (opts.length < 2) {
      var panelSels = '[role="listbox"], .by-common-dropdown__panel, [id*="dropdown-listbox"]';
      var bestPanelOpts = [];
      document.querySelectorAll(panelSels).forEach(function(panel) {
        var pr = panel.getBoundingClientRect();
        if (pr.width < 20 || pr.height < 10) return;
        if (pr.right < region.left || pr.left > region.right || pr.bottom < region.top || pr.top > region.bottom) return;
        var panelOpts = [];
        var panelSeen = new Set();
        // Get option items: direct LI children, or elements with specific option classes
        var items = panel.querySelectorAll(':scope > li, .by-common-dropdown__option, [role="option"]');
        items.forEach(function(item) {
          // Get LEAF text: prefer the deepest label span
          var labelEl = item.querySelector('.by-common-dropdown__option-label, [class*="option-label"]');
          if (!labelEl) {
            // Fallback: find deepest span/text node with short text
            var spans = item.querySelectorAll('span');
            for (var si = 0; si < spans.length; si++) {
              var st = spans[si].textContent.trim();
              if (st && st.length > 0 && st.length < 60 && spans[si].children.length === 0) { labelEl = spans[si]; break; }
            }
          }
          var text = labelEl ? labelEl.textContent.trim() : '';
          // Last fallback: direct textContent only if element has 0-1 child elements
          if (!text && item.childElementCount <= 1) text = item.textContent.trim();
          if (!text || text.length < 1 || text.length > 80 || panelSeen.has(text)) return;
          if (text.toLowerCase().startsWith('select') || text.toLowerCase().startsWith('choose') || text.toLowerCase().startsWith('---')) return;
          panelSeen.add(text);
          var ir = item.getBoundingClientRect();
          panelOpts.push({ element: item, rect: ir, imageUrl: null, bgColor: null, textContent: text,
            isSelected: item.classList.contains('by-common-dropdown__option--selected') || item.getAttribute('aria-selected') === 'true', capturedImage: null });
        });
        if (panelOpts.length > bestPanelOpts.length) bestPanelOpts = panelOpts;
      });
      if (bestPanelOpts.length >= 2) {
        console.log('[Matrixty Screenshot] Found dropdown panel with', bestPanelOpts.length, 'options:', bestPanelOpts.map(function(o) { return o.textContent; }).join(', '));
        bestPanelOpts.forEach(function(o) { opts.push(o); });
      }
    }

    // v1.2: Fallback — find [role="option"] elements directly in region (for body-level portals)
    if (opts.length < 2) {
      var roleOpts = [];
      var roleSeen = new Set();
      document.querySelectorAll('[role="option"]').forEach(function(el) {
        var r = el.getBoundingClientRect();
        if (r.width < 20 || r.height < 5) return;
        var cy = r.top + r.height / 2;
        if (cy < region.top - 10 || cy > region.bottom + 10) return;
        var labelEl = el.querySelector('.by-common-dropdown__option-label, span');
        var text = labelEl ? labelEl.textContent.trim() : el.textContent.trim();
        if (!text || text.length < 1 || text.length > 80 || roleSeen.has(text)) return;
        if (text.toLowerCase().startsWith('select') || text.toLowerCase().startsWith('choose')) return;
        roleSeen.add(text);
        roleOpts.push({ element: el, rect: r, imageUrl: null, bgColor: null, textContent: text,
          isSelected: el.getAttribute('aria-selected') === 'true', capturedImage: null });
      });
      if (roleOpts.length >= 2) {
        console.log('[Matrixty Screenshot] Found', roleOpts.length, '[role=option] in region');
        roleOpts.forEach(function(o) { opts.push(o); });
      }
    }

    // v8.2.0: Extended swatch selectors — skip if dropdown options already found
    if (opts.length < 2) {
    var SWATCH_SELS = '.by-image-swatch__swatch, [class*="swatch__swatch"], [class*="image-swatch__swatch"], [class*="swatch-item"], [class*="option-item"]:not(.by-common-dropdown__option):not([role="option"]), [class*="tib-item"], [class*="color-swatch"], [class*="color-option"]';
    document.querySelectorAll(SWATCH_SELS).forEach(function(sw) {
      var r = sw.getBoundingClientRect();
      if (r.width < 10 || r.height < 10) return;
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (cx < region.left || cx > region.right || cy < region.top || cy > region.bottom) return;
      var o = makeOptionFromSwatch(sw);
      if (o) opts.push(o);
    });
    } // end swatch guard

    // v8.2.0: Fallback — Customily .customall-grid children in region
    if (opts.length < 2) {
      document.querySelectorAll('.customall-grid').forEach(function(grid) {
        for (var k = 0; k < grid.children.length; k++) {
          var kid = grid.children[k];
          var r = kid.getBoundingClientRect();
          if (r.width < 15 || r.height < 15) continue;
          var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          if (cx < region.left || cx > region.right || cy < region.top || cy > region.bottom) continue;
          // Check for img inside
          var kidImg = kid.querySelector('img');
          var imgUrl = kidImg ? (kidImg.src || kidImg.dataset.src || '') : '';
          // Check for background-color
          var bgEl = kid.querySelector('[style*="background"]') || kid;
          var st = bgEl.getAttribute('style') || '';
          var bgColor = '';
          var mColor = st.match(/background-color:\s*([^;]+)/);
          if (mColor) bgColor = mColor[1].trim();
          // Check for background-image (glitter/texture swatches)
          var bgImage = '';
          var mImg = st.match(/background-image:\s*url\(['"]?([^'")\s]+)['"]?\)/);
          if (mImg) bgImage = mImg[1];
          if (!mImg && kidImg) bgImage = '';
          // Also check computed style for background-image
          if (!bgImage && !imgUrl && !bgColor) {
            try {
              var cs = window.getComputedStyle(bgEl);
              var csBg = cs.backgroundImage;
              if (csBg && csBg !== 'none') {
                var mCsBg = csBg.match(/url\(['"]?([^'")\s]+)['"]?\)/);
                if (mCsBg) bgImage = mCsBg[1];
              }
            } catch(e) {}
          }
          if (imgUrl || bgColor || bgImage) {
            opts.push({ element: kid, rect: { x: r.x, y: r.y, w: r.width, h: r.height }, imageUrl: imgUrl || bgImage || null, bgColor: bgColor || null, textContent: (kid.textContent || '').trim(), isSelected: false, capturedImage: imgUrl || bgImage || null });
          }
        }
      });
    }

    // v8.2.0: Fallback — radio/checkbox input labels with images or background colors in region
    if (opts.length < 2) {
      document.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(function(input) {
        // v9.3.1: CSS.escape() id — Shopify ids can contain quotes/special chars (e.g. swatch-2-12"-8579...)
        var label = input.closest('label');
        if (!label && input.id) {
          try {
            var escId = (typeof CSS !== 'undefined' && CSS.escape) ? CSS.escape(input.id) : input.id.replace(/(["\\])/g, '\\$1');
            label = document.querySelector('label[for="' + escId + '"]');
          } catch(e) { label = null; }
        }
        var target = label || input.parentElement;
        if (!target) return;
        var r = target.getBoundingClientRect();
        if (r.width < 15 || r.height < 15) return;
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        if (cx < region.left || cx > region.right || cy < region.top || cy > region.bottom) return;
        // Already captured?
        if (opts.some(function(o) { return o.element === target; })) return;
        var img = target.querySelector('img');
        var imgUrl = img ? (img.src || '') : '';
        var bgColor = '';
        var text = (target.textContent || '').trim().replace(/\s+/g, ' ');
        // Check background-image on label or child
        var bgImage = '';
        var bgTarget = target.querySelector('[style*="background"]') || target;
        var stBg = bgTarget.getAttribute('style') || '';
        var mBgImg = stBg.match(/background-image:\s*url\(['"]?([^'")\s]+)['"]?\)/);
        if (mBgImg) bgImage = mBgImg[1];
        if (!bgImage) {
          try {
            var cs = window.getComputedStyle(bgTarget);
            var csBgI = cs.backgroundImage;
            if (csBgI && csBgI !== 'none') { var m2 = csBgI.match(/url\(['"]?([^'")\s]+)['"]?\)/); if (m2) bgImage = m2[1]; }
            if (!bgColor) { var csBgC = cs.backgroundColor; if (csBgC && csBgC !== 'rgba(0, 0, 0, 0)' && csBgC !== 'transparent') bgColor = csBgC; }
          } catch(e) {}
        }
        if (imgUrl || bgColor || bgImage || text) {
          opts.push({ element: target, rect: { x: r.x, y: r.y, w: r.width, h: r.height }, imageUrl: imgUrl || bgImage || null, bgColor: bgColor || null, textContent: text || '', isSelected: input.checked, capturedImage: imgUrl || bgImage || null });
        }
      });
    }

    // Fallback: images in region — with smart filtering to exclude mockup/product images
    if (opts.length < 2) {
      var imgSeen = new Set();
      var candidateImgs = [];
      // Selectors for product/mockup galleries — images inside these are NOT clipart
      var MOCKUP_ANCESTORS = '.product-gallery, .product-media, .product-images, .product-single__photos, .product__images, .product-image-container, [class*="product-gallery"], [class*="product-media"], [class*="ProductImageSlider"], [class*="slick-slide"], [class*="carousel"], [class*="swiper-slide"], .media-gallery, [data-product-media], [data-media-id]';

      document.querySelectorAll('img').forEach(function(img) {
        if (!img.src || img.naturalWidth < 10 || img.src.startsWith('data:image/svg')) return;
        if (imgSeen.has(img.src)) return;
        var r = img.getBoundingClientRect();
        if (r.width < 15 || r.height < 15 || r.width > 300) return;
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        if (cx < region.left || cx > region.right || cy < region.top || cy > region.bottom) return;
        imgSeen.add(img.src);
        if (opts.some(function(o) { return o.imageUrl === img.src; })) return;

        // Skip images inside product/mockup gallery containers
        if (img.closest(MOCKUP_ANCESTORS)) return;

        // Skip images with product/mockup-like URLs
        var srcLower = img.src.toLowerCase();
        if (/\/products\/|\/mockup|\/product-image|\/hero[_-]|lifestyle/i.test(srcLower)) return;

        candidateImgs.push({ img: img, r: r, area: r.width * r.height });
      });

      // Smart size filtering: if there are many images, remove size outliers
      // (mockup thumbnails tend to be much larger than clipart options)
      if (candidateImgs.length > 3) {
        var areas = candidateImgs.map(function(c) { return c.area; }).sort(function(a, b) { return a - b; });
        var medianArea = areas[Math.floor(areas.length / 2)];
        // Remove images more than 4x the median area (likely mockups/product photos)
        candidateImgs = candidateImgs.filter(function(c) {
          return c.area <= medianArea * 4;
        });
      }

      candidateImgs.forEach(function(c) {
        var wr = c.img.parentElement ? c.img.parentElement.getBoundingClientRect() : c.r;
        opts.push({ element: c.img.parentElement || c.img, rect: { x: wr.x, y: wr.y, w: wr.width, h: wr.height }, imageUrl: c.img.src, bgColor: null, textContent: c.img.alt || '', isSelected: false, capturedImage: c.img.src });
      });
    }

    // v8.2.0: Fallback — elements with background-color in region (solid color swatches)
    if (opts.length < 2) {
      document.querySelectorAll('[style*="background-color"], [class*="color-swatch"], [class*="color-option"]').forEach(function(sw) {
        var r = sw.getBoundingClientRect();
        if (r.width < 15 || r.height < 15 || r.width > 100) return;
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        if (cx < region.left || cx > region.right || cy < region.top || cy > region.bottom) return;
        if (opts.some(function(o) { return o.element === sw; })) return;
        var bg = sw.style.backgroundColor || getComputedStyle(sw).backgroundColor;
        if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent' || bg === 'rgb(255, 255, 255)') return;
        opts.push({ element: sw, rect: { x: r.x, y: r.y, w: r.width, h: r.height }, imageUrl: null, bgColor: bg, textContent: sw.textContent?.trim() || '', isSelected: false, capturedImage: null });
      });
    }

    // v8.2.0: Fallback — elements with background-image in region (glitter/texture swatches)
    if (opts.length < 2) {
      document.querySelectorAll('[style*="background-image"]').forEach(function(el) {
        var r = el.getBoundingClientRect();
        if (r.width < 15 || r.height < 15 || r.width > 150) return;
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        if (cx < region.left || cx > region.right || cy < region.top || cy > region.bottom) return;
        if (opts.some(function(o) { return o.element === el; })) return;
        var st = el.getAttribute('style') || '';
        var mBg = st.match(/background-image:\s*url\(['"]?([^'")\s]+)['"]?\)/);
        if (!mBg) return;
        opts.push({ element: el, rect: { x: r.x, y: r.y, w: r.width, h: r.height }, imageUrl: mBg[1], bgColor: null, textContent: (el.textContent || '').trim(), isSelected: false, capturedImage: mBg[1] });
      });
    }

    // v8.2.0: Fallback — small square-ish div/span elements with computed background-image (no inline style)
    if (opts.length < 2) {
      document.querySelectorAll('div, span, li, a').forEach(function(el) {
        var r = el.getBoundingClientRect();
        // Only consider small square-ish elements (typical swatch size)
        if (r.width < 20 || r.height < 20 || r.width > 150 || r.height > 150) return;
        var ratio = r.width / r.height;
        if (ratio < 0.5 || ratio > 2) return; // roughly square
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        if (cx < region.left || cx > region.right || cy < region.top || cy > region.bottom) return;
        if (opts.some(function(o) { return o.element === el; })) return;
        // Check computed background-image
        try {
          var cs = window.getComputedStyle(el);
          var bgImg = cs.backgroundImage;
          if (!bgImg || bgImg === 'none') return;
          var mBg2 = bgImg.match(/url\(['"]?([^'")\s]+)['"]?\)/);
          if (!mBg2) return;
          // Skip data:image/svg placeholders
          if (mBg2[1].startsWith('data:image/svg')) return;
          opts.push({ element: el, rect: { x: r.x, y: r.y, w: r.width, h: r.height }, imageUrl: mBg2[1], bgColor: null, textContent: (el.textContent || '').trim(), isSelected: false, capturedImage: mBg2[1] });
        } catch(e) {}
      });
    }

    // v1.2: Detect visible <select> dropdowns in region (only visible ones with real dimensions)
    document.querySelectorAll('select').forEach(function(sel) {
      var r = sel.getBoundingClientRect();
      if (r.width < 20 || r.height < 10) return; // Skip hidden selects
      if (r.right < region.left || r.left > region.right || r.bottom < region.top || r.top > region.bottom) return;
      var selOpts = [];
      sel.querySelectorAll('option').forEach(function(optEl) {
        var text = optEl.textContent.trim();
        var val = optEl.value;
        if (!text || val === '' || text.toLowerCase().startsWith('select') || text.toLowerCase().startsWith('choose') || text.toLowerCase().startsWith('--- ') || text.toLowerCase().startsWith('-- ')) return;
        selOpts.push({ element: optEl, rect: r, imageUrl: null, bgColor: null, textContent: text, isSelected: optEl.selected, capturedImage: null });
      });
      if (selOpts.length >= 2) {
        console.log('[Matrixty Screenshot] Found visible <select> with', selOpts.length, 'text options');
        selOpts.forEach(function(o) { opts.push(o); });
      }
    });

    // v1.2: ALWAYS detect Ant Design Select (.ant-select) in region (overlap check)
    document.querySelectorAll('.ant-select').forEach(function(antSel) {
      var r = antSel.getBoundingClientRect();
      if (r.width < 30) return;
      // Use overlap check instead of center point
      if (r.right < region.left || r.left > region.right || r.bottom < region.top || r.top > region.bottom) return;
      // Method 1: hidden native <select> inside Ant Design wrapper
      var nativeSel = antSel.querySelector('select');
      if (nativeSel) {
        var antOpts = [];
        nativeSel.querySelectorAll('option').forEach(function(optEl) {
          var text = optEl.textContent.trim();
          var val = optEl.value;
          if (!text || val === '' || text.toLowerCase().startsWith('select') || text.toLowerCase().startsWith('choose') || text.toLowerCase().startsWith('---') || text.toLowerCase().startsWith('--')) return;
          antOpts.push({ element: optEl, rect: r, imageUrl: null, bgColor: null, textContent: text, isSelected: optEl.selected, capturedImage: null });
        });
        if (antOpts.length >= 2) {
          console.log('[Matrixty Screenshot] Found Ant Design <select> with', antOpts.length, 'options');
          antOpts.forEach(function(o) { opts.push(o); });
        }
      }
      // Method 2: Click to open dropdown portal and read items
      if (opts.length < 2) {
        try {
          var selector = antSel.querySelector('.ant-select-selector');
          if (selector) {
            selector.click();
            var portalOpts = [];
            setTimeout(function() {}, 0); // yield
            var dropdowns = document.querySelectorAll('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
            dropdowns.forEach(function(dd) {
              dd.querySelectorAll('.ant-select-item-option-content').forEach(function(item) {
                var t = item.textContent.trim();
                if (t && !t.toLowerCase().startsWith('select') && !t.toLowerCase().startsWith('choose')) {
                  portalOpts.push({ element: item, rect: r, imageUrl: null, bgColor: null, textContent: t, isSelected: false, capturedImage: null });
                }
              });
            });
            if (portalOpts.length >= 2) {
              console.log('[Matrixty Screenshot] Found Ant Design portal dropdown with', portalOpts.length, 'options');
              portalOpts.forEach(function(o) { opts.push(o); });
            }
            // Close dropdown
            document.body.click();
          }
        } catch(e) { console.log('[Matrixty Screenshot] Ant Design portal error:', e); }
      }
    });

    // v1.2: Detect VISIBLE dropdown/listbox option items directly in the region
    // Strategy 1: Find dropdown panel containers (absolute/fixed positioned, or listbox role)
    if (opts.length < 2) {
      var dropdownPanels = [];
      // Look for containers that look like open dropdown menus in/overlapping region
      document.querySelectorAll('ul, ol, div, [role="listbox"], [role="menu"]').forEach(function(container) {
        if (container.closest('#mtx-clip-panel, [id^="mtx-"]')) return;
        var cr = container.getBoundingClientRect();
        if (cr.width < 50 || cr.height < 40) return;
        // Must overlap with region
        if (cr.right < region.left || cr.left > region.right || cr.bottom < region.top || cr.top > region.bottom) return;
        // Check if it looks like a dropdown panel
        var cs = window.getComputedStyle(container);
        var isPositioned = cs.position === 'absolute' || cs.position === 'fixed';
        var hasRole = container.getAttribute('role') === 'listbox' || container.getAttribute('role') === 'menu';
        var hasBorder = cs.borderWidth && cs.borderWidth !== '0px';
        var hasShadow = cs.boxShadow && cs.boxShadow !== 'none';
        var hasOverflow = cs.overflowY === 'auto' || cs.overflowY === 'scroll';
        // Count direct children that are similar-sized text items
        var textChildren = [];
        for (var i = 0; i < container.children.length; i++) {
          var child = container.children[i];
          var childR = child.getBoundingClientRect();
          if (childR.height < 10 || childR.width < 30) continue;
          var childText = child.textContent.trim();
          if (childText && childText.length > 0 && childText.length < 80) {
            textChildren.push({ el: child, text: childText, rect: childR });
          }
        }
        // A dropdown panel should have 2+ similar text children
        if (textChildren.length >= 2) {
          var score = textChildren.length;
          if (isPositioned) score += 5;
          if (hasRole) score += 5;
          if (hasBorder) score += 1;
          if (hasShadow) score += 2;
          if (hasOverflow) score += 2;
          dropdownPanels.push({ container: container, children: textChildren, score: score, rect: cr });
        }
      });
      // Sort by score (best match first)
      dropdownPanels.sort(function(a, b) { return b.score - a.score; });
      console.log('[Matrixty Screenshot] Dropdown panel candidates:', dropdownPanels.length, dropdownPanels.map(function(p) { return '{score:' + p.score + ',children:' + p.children.length + ',tag:' + p.container.tagName + ',class:' + (p.container.className || '').substring(0, 40) + '}'; }).join(', '));
      // Use the best scoring panel
      if (dropdownPanels.length > 0) {
        var best = dropdownPanels[0];
        // Filter children that are actually inside the region
        var inRegion = best.children.filter(function(c) {
          var cy = c.rect.top + c.rect.height / 2;
          return cy >= region.top && cy <= region.bottom;
        });
        if (inRegion.length >= 2) {
          console.log('[Matrixty Screenshot] Using dropdown panel (score:' + best.score + '):', inRegion.map(function(c) { return c.text; }).join(', '));
          inRegion.forEach(function(c) {
            opts.push({ element: c.el, rect: c.rect, imageUrl: null, bgColor: null, textContent: c.text, isSelected: false, capturedImage: null });
          });
        }
      }
    }

    // v1.2: Strategy 2 — find sibling text elements that share the same parent and are vertically stacked in region
    if (opts.length < 2) {
      var parentMap = new Map(); // parent -> [children in region]
      document.querySelectorAll('div, li, span, a, [role="option"]').forEach(function(el) {
        if (el.closest('#mtx-clip-panel, [id^="mtx-"]')) return;
        var r = el.getBoundingClientRect();
        if (r.width < 40 || r.height < 15 || r.height > 60 || r.width > 500) return;
        var cy = r.top + r.height / 2;
        if (cy < region.top || cy > region.bottom) return;
        var cx = r.left + r.width / 2;
        if (cx < region.left || cx > region.right) return;
        var text = el.textContent.trim();
        if (!text || text.length < 1 || text.length > 60) return;
        // Only leaf-ish elements (text equals own text, not sum of many children)
        if (el.children.length > 3) return;
        var parent = el.parentElement;
        if (!parent) return;
        if (!parentMap.has(parent)) parentMap.set(parent, []);
        parentMap.get(parent).push({ element: el, rect: r, text: text });
      });
      // Find parent with most children in region
      var bestParent = null, bestCount = 0;
      parentMap.forEach(function(children, parent) {
        // Deduplicate by text
        var seen = {};
        var unique = children.filter(function(c) { if (seen[c.text]) return false; seen[c.text] = true; return true; });
        if (unique.length > bestCount) { bestCount = unique.length; bestParent = { parent: parent, children: unique }; }
      });
      if (bestParent && bestCount >= 2) {
        console.log('[Matrixty Screenshot] Found sibling group (' + bestCount + ' items) in parent:', bestParent.parent.tagName, (bestParent.parent.className || '').substring(0, 40), ':', bestParent.children.map(function(c) { return c.text; }).join(', '));
        bestParent.children.forEach(function(c) {
          opts.push({ element: c.element, rect: c.rect, imageUrl: null, bgColor: null, textContent: c.text, isSelected: false, capturedImage: null });
        });
      }
    }

    // v1.2: Debug logging when no options found
    if (opts.length < 1) {
      var allSelects = document.querySelectorAll('select');
      var allAntSelects = document.querySelectorAll('.ant-select');
      console.log('[Matrixty Screenshot] No options found! Debug: selects on page:', allSelects.length, ', .ant-select:', allAntSelects.length, ', region:', JSON.stringify(region));
      allSelects.forEach(function(sel, i) {
        var sr = sel.getBoundingClientRect();
        console.log('[Matrixty Screenshot] select[' + i + ']:', sel.name || sel.id || '(no name)', 'rect:', JSON.stringify({l:Math.round(sr.left),t:Math.round(sr.top),r:Math.round(sr.right),b:Math.round(sr.bottom),w:Math.round(sr.width),h:Math.round(sr.height)}), 'options:', sel.options.length);
      });
      allAntSelects.forEach(function(as, i) {
        var ar = as.getBoundingClientRect();
        console.log('[Matrixty Screenshot] .ant-select[' + i + ']:', 'rect:', JSON.stringify({l:Math.round(ar.left),t:Math.round(ar.top),r:Math.round(ar.right),b:Math.round(ar.bottom)}));
      });
    }
    console.log('[Matrixty Screenshot] Region:', JSON.stringify(region), 'Found:', opts.length, 'options');
    return opts;
  }

  function collectOptionsInContainer(container) {
    var opts = [];

    // v1.2 HIGH PRIORITY: Detect dropdown options via CONTAINER-FIRST in container
    var panelSels = '[role="listbox"], .by-common-dropdown__panel, [id*="dropdown-listbox"]';
    container.querySelectorAll(panelSels).forEach(function(panel) {
      if (opts.length >= 2) return;
      var items = panel.querySelectorAll(':scope > li, .by-common-dropdown__option, [role="option"]');
      var panelSeen = new Set();
      items.forEach(function(item) {
        var labelEl = item.querySelector('.by-common-dropdown__option-label, [class*="option-label"]');
        if (!labelEl) {
          var spans = item.querySelectorAll('span');
          for (var si = 0; si < spans.length; si++) {
            var st = spans[si].textContent.trim();
            if (st && st.length < 60 && spans[si].children.length === 0) { labelEl = spans[si]; break; }
          }
        }
        var text = labelEl ? labelEl.textContent.trim() : '';
        if (!text && item.childElementCount <= 1) text = item.textContent.trim();
        if (!text || text.length < 1 || text.length > 80 || panelSeen.has(text)) return;
        if (text.toLowerCase().startsWith('select') || text.toLowerCase().startsWith('choose') || text.toLowerCase().startsWith('---')) return;
        panelSeen.add(text);
        var r = item.getBoundingClientRect();
        opts.push({ rect: r, imageUrl: null, bgColor: null, textContent: text,
          isSelected: item.classList.contains('by-common-dropdown__option--selected') || item.getAttribute('aria-selected') === 'true', capturedImage: null });
      });
    });
    // v1.2: If container has a dropdown trigger but no visible options, click to open it
    if (opts.length < 2) {
      var ddTrigger = container.querySelector('.by-common-dropdown__trigger, [role="combobox"], [class*="dropdown__trigger"], [class*="dropdown-trigger"]');
      if (ddTrigger) {
        console.log('[Matrixty Clipart] Found dropdown trigger, clicking to open...');
        ddTrigger.click();
        // Re-scan after click (options should now be in DOM)
        var retryOpts = [];
        var retrySeen = new Set();
        // Search in container AND in body-level portals
        var searchRoots = [container, document.body];
        searchRoots.forEach(function(root) {
          var retrySel = '.by-common-dropdown__option-label, .by-common-dropdown__option, [role="option"], [class*="dropdown__option"]';
          root.querySelectorAll(retrySel).forEach(function(el) {
            if (el.querySelector(retrySel)) return; // Skip containers
            var labelEl = el.querySelector('.by-common-dropdown__option-label, [class*="option-label"]');
            var text = labelEl ? labelEl.textContent.trim() : el.textContent.trim();
            if (!text || text.length < 1 || text.length > 80 || retrySeen.has(text)) return;
            if (text.toLowerCase().startsWith('select') || text.toLowerCase().startsWith('choose') || text.toLowerCase().startsWith('---')) return;
            retrySeen.add(text);
            var r = el.getBoundingClientRect();
            retryOpts.push({ rect: r, imageUrl: null, bgColor: null, textContent: text, isSelected: el.classList.contains('by-common-dropdown__option--selected') || el.getAttribute('aria-selected') === 'true', capturedImage: null });
          });
        });
        if (retryOpts.length >= 2) {
          console.log('[Matrixty Clipart] After click, found', retryOpts.length, 'dropdown options:', retryOpts.map(function(o) { return o.textContent; }).join(', '));
          opts = retryOpts;
        }
        // Close dropdown after reading
        ddTrigger.click();
      }
    }

    if (opts.length >= 2) {
      console.log('[Matrixty Clipart] Found', opts.length, 'dropdown text options in container');
      return opts;
    }

    // v8.0.8: Extended swatch selectors for all platforms
    container.querySelectorAll('.by-image-swatch__swatch, [class*="swatch__swatch"], [class*="swatch-item"], [class*="option-item"]:not(.by-common-dropdown__option):not([role="option"]), [class*="tib-item"]').forEach(function(sw) {
      var o = makeOptionFromSwatch(sw);
      if (o) opts.push(o);
    });
    if (opts.length < 2) {
      var imgSeen = new Set();
      container.querySelectorAll('img').forEach(function(img) {
        if (!img.src || img.src.startsWith('data:image/svg') || img.naturalWidth < 2) return;
        if (imgSeen.has(img.src)) return;
        imgSeen.add(img.src);
        var r = img.getBoundingClientRect();
        if (r.width < 10 || r.height < 10 || r.width > 300) return;
        if (opts.some(function(o) { return o.imageUrl === img.src; })) return;
        var wr = img.parentElement ? img.parentElement.getBoundingClientRect() : r;
        opts.push({ rect: { x: wr.x, y: wr.y, w: wr.width, h: wr.height }, imageUrl: img.src, bgColor: null, textContent: img.alt || '', isSelected: false, capturedImage: img.src });
      });
    }
    if (opts.length < 2) {
      var grid = container.querySelector('.customall-grid');
      if (grid) {
        for (var k = 0; k < grid.children.length; k++) {
          var kid = grid.children[k]; var r = kid.getBoundingClientRect();
          if (r.width < 15 || r.height < 15) continue;
          var bgEl = kid.querySelector('[style*="background"]') || kid;
          var st = bgEl.getAttribute('style') || '';
          var m = st.match(/background-color:\s*([^;]+)/);
          if (m) opts.push({ rect: { x: r.x, y: r.y, w: r.width, h: r.height }, imageUrl: null, bgColor: m[1].trim(), textContent: '', isSelected: false, capturedImage: null });
        }
      }
    }
    // v8.0.8: Also check color swatches as last resort
    if (opts.length < 2) {
      container.querySelectorAll('[style*="background-color"], [class*="color-swatch"], [class*="color-option"]').forEach(function(sw) {
        var r = sw.getBoundingClientRect();
        if (r.width < 15 || r.height < 15 || r.width > 100) return;
        var bg = sw.style.backgroundColor || getComputedStyle(sw).backgroundColor;
        if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent' || bg === 'rgb(255, 255, 255)') return;
        opts.push({ rect: { x: r.x, y: r.y, w: r.width, h: r.height }, imageUrl: null, bgColor: bg, textContent: sw.textContent?.trim() || '', isSelected: false, capturedImage: null });
      });
    }
    // v1.2: ALWAYS check <select> dropdown options (not just as fallback)
    container.querySelectorAll('select').forEach(function(sel) {
      var r = sel.getBoundingClientRect();
      var selOpts = [];
      sel.querySelectorAll('option').forEach(function(optEl) {
        var text = optEl.textContent.trim();
        var val = optEl.value;
        if (!text || val === '' || text.toLowerCase().startsWith('select') || text.toLowerCase().startsWith('choose') || text.toLowerCase().startsWith('--- ') || text.toLowerCase().startsWith('-- ')) return;
        selOpts.push({ rect: r, imageUrl: null, bgColor: null, textContent: text, isSelected: optEl.selected, capturedImage: null });
      });
      if (selOpts.length >= 2) {
        console.log('[Matrixty Clipart] Found <select> with', selOpts.length, 'text options in container');
        selOpts.forEach(function(o) { opts.push(o); });
      }
    });
    // v1.2: ALWAYS check Ant Design Select components (.ant-select) — Customily uses these instead of native <select>
    if (opts.length < 2) { // Only if <select> didn't already find options
      container.querySelectorAll('.ant-select').forEach(function(antSel) {
        var r = antSel.getBoundingClientRect();
        if (r.width < 30) return;
        // Method 1: Check if there's a hidden native <select> inside
        var nativeSel = antSel.querySelector('select');
        if (nativeSel) {
          nativeSel.querySelectorAll('option').forEach(function(optEl) {
            var text = optEl.textContent.trim();
            var val = optEl.value;
            if (!text || val === '' || text.toLowerCase().startsWith('select') || text.toLowerCase().startsWith('choose') || text.toLowerCase().startsWith('---')) return;
            opts.push({ rect: r, imageUrl: null, bgColor: null, textContent: text, isSelected: optEl.selected, capturedImage: null });
          });
        }
        // Method 2: Try to read the currently selected value + click to reveal dropdown options
        if (opts.length < 2) {
          var selectedText = antSel.querySelector('.ant-select-selection-item, .ant-select-selection-selected-value');
          if (selectedText) {
            var currentVal = selectedText.textContent.trim();
            if (currentVal) {
              // Click to open dropdown, then read options from the body-level portal
              antSel.querySelector('.ant-select-selector')?.click();
              // Small delay not possible in sync — try to find already-rendered dropdown
              var dropdowns = document.querySelectorAll('.ant-select-dropdown:not(.ant-select-dropdown-hidden)');
              for (var di = 0; di < dropdowns.length; di++) {
                var dd = dropdowns[di];
                dd.querySelectorAll('.ant-select-item-option-content, .ant-select-item').forEach(function(optDiv) {
                  var text = optDiv.textContent.trim();
                  if (!text || text.toLowerCase().startsWith('select') || text.toLowerCase().startsWith('choose')) return;
                  opts.push({ rect: r, imageUrl: null, bgColor: null, textContent: text, isSelected: text === currentVal, capturedImage: null });
                });
              }
            }
          }
        }
      });
    }
    return opts;
  }

  function makeOptionFromSwatch(sw) {
    var r = sw.getBoundingClientRect();
    if (r.width < 10 || r.height < 10) return null;
    var img = sw.querySelector('img');
    var imgSrc = img ? (img.src || img.dataset?.src || '') : '';
    var bgColor = '';
    if (!img) {
      var cs = sw.querySelector('.by-image-swatch__color, [class*="swatch__color"], [style*="background-color"]');
      if (cs) bgColor = cs.style.backgroundColor || '';
      if (!bgColor) { var sb = window.getComputedStyle(sw).backgroundColor; if (sb && sb !== 'rgba(0, 0, 0, 0)' && sb !== 'transparent') bgColor = sb; }
    }
    var text = (sw.textContent || '').trim().replace(/\s+/g, ' ');
    var hasImg = imgSrc && img && img.complete && img.naturalWidth > 5;
    if (!hasImg && !bgColor && !text) return null; // empty placeholder
    return { element: sw, rect: { x: r.x, y: r.y, w: r.width, h: r.height }, imageUrl: imgSrc || null, bgColor: bgColor || null, textContent: text || '', isSelected: false, capturedImage: imgSrc || null };
  }

  function deactivateManualPick() { cleanupAllPickModes(); }

  function showClipartPanel(data) {
    const old = document.getElementById('mtx-clip-panel');
    if (old) old.remove();

    // v9.5.3: ALWAYS replace style — old extension version may have left an outdated <style> in head
    var oldStyle = document.getElementById('mtx-clip-style');
    if (oldStyle) oldStyle.remove();
    {
      const s = document.createElement('style');
      s.id = 'mtx-clip-style';
      s.setAttribute('data-mtx-version', 'v9.5.3');
      // v9.5.4: Resize handle — minimal default (6px gray pill), expands+labels on hover
      s.textContent = `
@keyframes mtxPanelSlide{from{transform:translateX(-420px)}to{transform:translateX(0)}}
.mtx-clip-cat:hover{background:rgba(0,0,0,0.03)!important}
#mtx-clip-panel > div:first-child:hover{background:rgba(74,124,89,0.08)!important}

/* Resize handle — minimal default, expands on hover */
.mtx-resize-handle{
  height:6px !important;
  cursor:ns-resize !important;
  background:transparent !important;
  border:none !important;
  display:flex !important;
  align-items:center !important;
  justify-content:center !important;
  margin-top:4px !important;
  border-radius:4px !important;
  transition:all .18s ease !important;
  font-size:0 !important;
  color:transparent !important;
  user-select:none !important;
  position:relative !important;
}
.mtx-resize-handle::before{
  content:"" !important;
  display:block !important;
  width:32px !important;
  height:3px !important;
  border-radius:2px !important;
  background:#D1D5DB !important;
  transition:all .18s ease !important;
}
.mtx-resize-handle:hover{
  height:18px !important;
  background:linear-gradient(180deg,#ECFDF5 0%,#D1FAE5 100%) !important;
  border:1px solid #6EE7B7 !important;
  font-size:10px !important;
  color:#047857 !important;
  letter-spacing:.3px !important;
  font-weight:700 !important;
}
.mtx-resize-handle:hover::before{
  content:"⇕  Kéo để phóng to" !important;
  width:auto !important;
  height:auto !important;
  background:transparent !important;
  color:#047857 !important;
}
.mtx-resize-handle:active{
  background:#10B981 !important;
  color:#fff !important;
  border-color:#059669 !important;
}
.mtx-resize-handle:active::before{
  color:#fff !important;
}

.mtx-ht-row{display:none;padding:6px 8px;background:#F0F0FF;border-radius:4px;margin-bottom:6px;gap:6px;align-items:center;}
.mtx-ht-row.active{display:flex;}
.mtx-screenshot-overlay{position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999999;cursor:crosshair;background:rgba(0,0,0,0.15);}
.mtx-screenshot-sel{position:absolute;border:2px dashed #4A7C59;background:rgba(74,124,89,0.08);}
.mtx-opt-label:hover{border-bottom-color:#4A7C59!important;}
.mtx-opt-row:hover{background:#F0F4F1!important;}
`;
      document.head.appendChild(s);
      console.log('[Matrixty] CSS v9.5.3 injected (resize handle visible green bar)');
    }

    const panel = document.createElement('div');
    panel.id = 'mtx-clip-panel';
    // v3.0.7: Panel on LEFT side (clipart options usually on left of product page)
    panel.style.cssText = 'position:fixed;top:0;left:0;bottom:0;width:520px;background:#FFFFFF;color:#333;z-index:9999999;font-family:-apple-system,BlinkMacSystemFont,sans-serif;box-shadow:4px 0 24px rgba(0,0,0,0.15);display:flex;flex-direction:column;overflow:visible;';

    // v3.0.7: Drag handle on RIGHT edge of panel (kéo phải = thu nhỏ, kéo trái = mở rộng)
    const dragHandle = document.createElement('div');
    dragHandle.style.cssText = 'position:absolute;right:-8px;top:0;bottom:0;width:16px;cursor:ew-resize;z-index:99999999;background:transparent;display:flex;align-items:center;justify-content:center;';
    const gripDots = document.createElement('div');
    gripDots.style.cssText = 'width:4px;height:48px;border-radius:3px;background:rgba(74,124,89,0.3);transition:background .2s,height .2s;box-shadow:0 0 4px rgba(74,124,89,0.1);';
    dragHandle.appendChild(gripDots);
    dragHandle.addEventListener('mouseenter', function() { gripDots.style.background = 'rgba(74,124,89,0.7)'; gripDots.style.height = '70px'; });
    dragHandle.addEventListener('mouseleave', function() { gripDots.style.background = 'rgba(74,124,89,0.3)'; gripDots.style.height = '48px'; });
    dragHandle.addEventListener('mousedown', function(e) {
      e.preventDefault();
      e.stopPropagation();
      var startX = e.clientX;
      var startW = panel.offsetWidth;
      gripDots.style.background = 'rgba(74,124,89,1)';
      // Overlay prevents iframe/content stealing mouse events during drag
      var overlay = document.createElement('div');
      overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999998;cursor:ew-resize;';
      document.body.appendChild(overlay);
      function onMove(ev) {
        // v3.0.7: LEFT panel — drag right = wider, drag left = narrower
        var delta = ev.clientX - startX;
        var newW = Math.max(280, Math.min(window.innerWidth - 50, startW + delta));
        panel.style.width = newW + 'px';
      }
      function onUp() {
        gripDots.style.background = 'rgba(74,124,89,0.3)';
        gripDots.style.height = '48px';
        overlay.remove();
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
    panel.appendChild(dragHandle);

    const colors = ['#1B5E20','#B71C1C','#0D47A1','#4A148C','#E65100','#006064','#880E4F','#33691E','#1A237E','#3E2723'];
    const totalOpts = data.categories.reduce((s, c) => s + c.optionCount, 0);

    let html = `
      <div style="padding:14px 18px;border-bottom:1px solid #E5E7EB;display:flex;justify-content:space-between;align-items:center;">
        <div>
          <div style="font-size:15px;font-weight:700;color:#1a1a1a;">🏷️ Clipart Scanner</div>
          <div id="mtx-clip-header-count" style="font-size:11px;color:#6B7280;margin-top:2px;">${data.categories.length} nhóm · ${totalOpts} options</div>
        </div>
        <span id="mtx-clip-close" style="color:#6B7280;font-size:18px;cursor:pointer;padding:4px 8px;">✕</span>
      </div>
      <div style="flex:1;overflow-y:auto;padding:14px 18px;">
    `;

    // Track per-category thumb scale (default 1.0)
    if (!data._thumbScales) data._thumbScales = {};

    data.categories.forEach((cat, ci) => {
      const color = colors[ci % colors.length];
      const scale = data._thumbScales[ci] || 1.0;
      const hasHT = !!(cat.headerText && cat.headerText.trim());

      // ── Header text ABOVE the variant block (outside the card) ──
      if (hasHT) {
        var htStyle = cat.headerTextStyle || {};
        html += `<div class="mtx-clip-ht-display" data-idx="${ci}" style="text-align:center;padding:6px 10px;margin-bottom:2px;cursor:pointer;border-radius:6px 6px 0 0;background:#FAFAFF;" title="Click để chỉnh sửa">
          <span style="font-size:${Math.round((htStyle.fontSize||28)*0.45)}px;font-weight:700;color:${htStyle.color||'#1a1a2e'};font-family:${htStyle.fontFamily||'sans-serif'};">${cat.headerText}</span>
        </div>`;
      }

      // Header text editor row (above card, hidden by default)
      html += `<div class="mtx-ht-row" data-idx="${ci}" id="mtx-ht-row-${ci}">
        <input class="mtx-ht-input" data-idx="${ci}" value="${(cat.headerText||'').replace(/"/g,'&quot;')}" placeholder="Nhập text..." style="flex:1;min-width:0;padding:4px 8px;font-size:12px;border:1px solid #C7D2FE;border-radius:4px;outline:none;font-family:inherit;">
        <input class="mtx-ht-size" data-idx="${ci}" type="number" value="${(cat.headerTextStyle?.fontSize)||28}" min="10" max="80" step="2" style="width:44px;padding:4px;font-size:11px;border:1px solid #D1D5DB;border-radius:4px;text-align:center;outline:none;" title="Font size">
        <input class="mtx-ht-color" data-idx="${ci}" type="color" value="${(cat.headerTextStyle?.color)||'#1a1a2e'}" style="width:28px;height:28px;padding:0;border:1px solid #D1D5DB;border-radius:4px;cursor:pointer;" title="Màu chữ">
        <button class="mtx-ht-save" data-idx="${ci}" style="background:#4338CA;color:#fff;border:none;border-radius:4px;padding:4px 10px;font-size:11px;font-weight:600;cursor:pointer;">✓</button>
        <button class="mtx-ht-cancel" data-idx="${ci}" style="background:#F3F4F6;color:#6B7280;border:1px solid #D1D5DB;border-radius:4px;padding:4px 8px;font-size:11px;cursor:pointer;">✕</button>
      </div>`;

      // ── Category card ──
      html += `<div class="mtx-clip-cat" data-cat-idx="${ci}" draggable="true" style="margin-bottom:14px;padding:10px;border-radius:${hasHT ? '0 0 8px 8px' : '8px'};background:#F9FAFB;border:1px solid #E5E7EB;cursor:grab;">
        <div class="mtx-clip-toolbar" style="display:flex;align-items:center;gap:6px;margin-bottom:4px;">
          <div class="mtx-clip-arrows" style="display:flex;flex-direction:column;gap:1px;">
            <button class="mtx-clip-up" data-idx="${ci}" style="background:none;border:none;color:#9CA3AF;cursor:pointer;font-size:10px;padding:0 4px;line-height:1;" title="Di chuyển lên">▲</button>
            <button class="mtx-clip-down" data-idx="${ci}" style="background:none;border:none;color:#9CA3AF;cursor:pointer;font-size:10px;padding:0 4px;line-height:1;" title="Di chuyển xuống">▼</button>
          </div>
          <div style="width:10px;height:10px;border-radius:2px;background:${color};flex-shrink:0;"></div>
          <span class="mtx-clip-name" data-idx="${ci}" style="font-weight:700;font-size:${Math.round(13 * scale)}px;color:#1a1a1a;cursor:text;border-bottom:1px dashed #D1D5DB;padding-bottom:1px;transition:font-size .15s;" title="Click để sửa tên">${cat.name}</span>
          <button class="mtx-clip-ht-btn" data-idx="${ci}" style="background:${hasHT ? '#EEF2FF' : 'none'};border:1px solid ${hasHT ? '#C7D2FE' : '#D1D5DB'};color:${hasHT ? '#4338CA' : '#9CA3AF'};cursor:pointer;font-size:10px;font-weight:800;padding:1px 5px;border-radius:3px;font-family:serif;line-height:1.2;flex-shrink:0;" title="Chèn text phía trên">T</button>
          <span style="font-size:10px;color:#9CA3AF;margin-left:auto;flex-shrink:0;">${cat.prefix}1→${cat.prefix}${cat.optionCount}</span>
          <!-- v9.5.1: Visible zoom controls per group — bigger buttons, +0.5 step for visible jumps -->
          <button class="mtx-clip-zoom-out" data-idx="${ci}" type="button" draggable="false" style="background:#FEF3C7;border:1px solid #FCD34D;color:#92400E;cursor:pointer;font-size:14px;font-weight:900;padding:2px 9px;border-radius:4px;flex-shrink:0;line-height:1.2;min-width:24px;" title="Thu nhỏ thumbnail (−0.5×)">−</button>
          <span class="mtx-clip-zoom-val" data-idx="${ci}" style="font-size:11px;color:#374151;min-width:34px;text-align:center;font-variant-numeric:tabular-nums;flex-shrink:0;font-weight:600;background:#F3F4F6;padding:2px 4px;border-radius:3px;cursor:pointer;" title="Click reset về 1.0×">${(scale).toFixed(1)}×</span>
          <button class="mtx-clip-zoom-in" data-idx="${ci}" type="button" draggable="false" style="background:#D1FAE5;border:1px solid #6EE7B7;color:#065F46;cursor:pointer;font-size:14px;font-weight:900;padding:2px 9px;border-radius:4px;flex-shrink:0;line-height:1.2;min-width:24px;" title="Phóng to thumbnail (+0.5×)">+</button>
          <button class="mtx-clip-del" data-idx="${ci}" style="background:none;border:none;color:#9CA3AF;cursor:pointer;font-size:14px;padding:2px 6px;border-radius:4px;flex-shrink:0;" title="Xóa nhóm này">✕</button>
        </div>
        `;

      // Detect text-only categories (dropdown/select — no images, no bgColors)
      var isTextOnly = cat.options.every(function(o) { return !o.imageUrl && !o.bgColor && o.textContent && o.textContent.trim().length > 0; });

      if (isTextOnly) {
        html += `<div style="display:flex;flex-direction:column;gap:2px;">`;
        cat.options.forEach((opt, oi) => {
          html += `<div class="mtx-opt-row" data-cat="${ci}" data-opt="${oi}" style="display:flex;align-items:center;gap:6px;padding:3px 8px;border-radius:4px;background:#F9FAFB;border:1px solid #E5E7EB;position:relative;">
            <span class="mtx-opt-label" data-cat="${ci}" data-opt="${oi}" style="font-size:9px;font-weight:700;color:${color};min-width:22px;cursor:pointer;border-bottom:1px dashed transparent;" title="Click để sửa label">${opt.label}</span>
            <span style="font-size:10px;color:#374151;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;">${(opt.textContent||'?')}</span>
            <button class="mtx-opt-del" data-cat="${ci}" data-opt="${oi}" style="background:none;border:none;color:#D1D5DB;cursor:pointer;font-size:11px;padding:0 3px;line-height:1;flex-shrink:0;transition:color .15s;" title="Xóa option này">✕</button>
          </div>`;
        });
        html += '</div>';
      } else {
        var baseThumb = cat.optionCount > 15 ? 32 : 42;
        var thumbSize = Math.round(baseThumb * scale);
        var gridMin = Math.round((cat.optionCount > 15 ? 38 : 48) * scale);
        var gridGap = cat.optionCount > 15 ? 3 : 5;
        html += `<div class="mtx-clip-grid" data-idx="${ci}" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(${gridMin}px,1fr));gap:${gridGap}px;">`;
        cat.options.forEach((opt, oi) => {
          const thumb = opt.capturedImage
            ? `<img src="${opt.capturedImage}" style="width:100%;height:100%;object-fit:contain;">`
            : opt.bgColor
              ? ''
              : `<span style="font-size:8px;color:#9CA3AF;">${(opt.textContent||'?').substring(0,6)}</span>`;
          const bg = opt.bgColor || (opt.capturedImage ? '' : '#F3F4F6');

          html += `<div class="mtx-opt-cell" data-cat="${ci}" data-opt="${oi}" style="text-align:center;position:relative;">
            <div style="width:${thumbSize}px;height:${thumbSize}px;border-radius:4px;margin:0 auto 1px;border:1px solid #D1D5DB;overflow:hidden;display:flex;align-items:center;justify-content:center;background:${bg};position:relative;">${thumb}
              <button class="mtx-opt-del" data-cat="${ci}" data-opt="${oi}" style="position:absolute;top:-1px;right:-1px;background:rgba(220,38,38,0.85);color:#fff;border:none;cursor:pointer;font-size:8px;width:14px;height:14px;border-radius:0 4px 0 4px;line-height:1;display:none;z-index:1;" title="Xóa">✕</button>
            </div>
            <div class="mtx-opt-label" data-cat="${ci}" data-opt="${oi}" style="font-size:${Math.max(6, Math.round(8 * scale))}px;font-weight:700;color:${color};cursor:pointer;" title="Click để sửa label">${opt.label}</div>
          </div>`;
        });
        html += '</div>';
      }

      // Resize handle at bottom of each category
      html += `<div class="mtx-resize-handle" data-idx="${ci}" title="Kéo để thay đổi kích thước"></div>`;
      html += '</div>';
    });

    html += `</div>
      <div id="mtx-clip-footer" style="padding:14px 18px;border-top:1px solid #E5E7EB;display:flex;gap:8px;flex-wrap:wrap;">
      </div>`;

    panel.innerHTML = html;
    document.body.appendChild(panel);

    // v1.2: Hover to show delete button on image grid cells
    panel.querySelectorAll('.mtx-opt-cell').forEach(function(cell) {
      var delBtn = cell.querySelector('.mtx-opt-del');
      if (delBtn) {
        cell.addEventListener('mouseenter', function() { delBtn.style.display = 'block'; });
        cell.addEventListener('mouseleave', function() { delBtn.style.display = 'none'; });
      }
    });
    // v1.2: Hover on text rows — highlight delete button
    panel.querySelectorAll('.mtx-opt-row .mtx-opt-del').forEach(function(btn) {
      var row = btn.closest('.mtx-opt-row');
      if (row) {
        row.addEventListener('mouseenter', function() { btn.style.color = '#EF4444'; });
        row.addEventListener('mouseleave', function() { btn.style.color = '#D1D5DB'; });
      }
    });

    // v1.2: Delete individual option — DOM-only removal (no re-render, preserves scroll + labels)
    panel.addEventListener('click', function(e) {
      var delBtn = e.target.closest('.mtx-opt-del');
      if (!delBtn) return;
      e.stopPropagation();
      var catIdx = parseInt(delBtn.dataset.cat);
      var optIdx = parseInt(delBtn.dataset.opt);
      if (isNaN(catIdx) || isNaN(optIdx)) return;
      var cat = data.categories[catIdx];
      if (!cat || !cat.options[optIdx]) return;

      // Remove from data (don't re-label — preserve user edits)
      cat.options.splice(optIdx, 1);
      cat.optionCount = cat.options.length;

      // Remove DOM element directly
      var row = delBtn.closest('.mtx-opt-row, .mtx-opt-cell');
      if (row) {
        row.style.transition = 'opacity 0.15s, max-height 0.2s';
        row.style.opacity = '0';
        row.style.maxHeight = row.offsetHeight + 'px';
        row.style.overflow = 'hidden';
        setTimeout(function() {
          row.style.maxHeight = '0';
          row.style.padding = '0';
          row.style.margin = '0';
          row.style.border = 'none';
          setTimeout(function() { row.remove(); }, 200);
        }, 150);
      }

      // Update data-opt indices for remaining siblings
      var container = row ? row.parentElement : null;
      if (container) {
        setTimeout(function() {
          var items = container.querySelectorAll('.mtx-opt-row, .mtx-opt-cell');
          items.forEach(function(item, i) {
            item.querySelectorAll('[data-opt]').forEach(function(el) { el.dataset.opt = i; });
            item.dataset.opt = i;
          });
        }, 400);
      }

      // Update header count + range display
      var card = delBtn.closest('.mtx-clip-cat');
      if (card) {
        var rangeSpan = card.querySelector('.mtx-clip-toolbar span[style*="margin-left:auto"]');
        if (rangeSpan && cat.options.length > 0) {
          rangeSpan.textContent = cat.options[0].label + '→' + cat.options[cat.options.length - 1].label;
        }
      }
      // Update total count in header
      var totalOpts = data.categories.reduce(function(s, c) { return s + c.optionCount; }, 0);
      var headerCount = document.getElementById('mtx-clip-header-count');
      if (headerCount) headerCount.textContent = data.categories.length + ' nhóm · ' + totalOpts + ' options';

      // Remove empty category card
      if (cat.options.length === 0) {
        data.categories.splice(catIdx, 1);
        if (card) {
          card.style.transition = 'opacity 0.2s';
          card.style.opacity = '0';
          setTimeout(function() { card.remove(); }, 200);
        }
        // Update category indices
        setTimeout(function() {
          panel.querySelectorAll('.mtx-clip-cat').forEach(function(c, i) {
            c.dataset.catIdx = i;
            c.querySelectorAll('[data-cat]').forEach(function(el) { el.dataset.cat = i; });
            c.querySelectorAll('[data-idx]').forEach(function(el) { el.dataset.idx = i; });
          });
        }, 250);
      }
    });

    // v1.2: Edit individual option label (click to edit)
    panel.addEventListener('click', function(e) {
      var labelEl = e.target.closest('.mtx-opt-label');
      if (!labelEl) return;
      e.stopPropagation();
      var catIdx = parseInt(labelEl.dataset.cat);
      var optIdx = parseInt(labelEl.dataset.opt);
      if (isNaN(catIdx) || isNaN(optIdx)) return;
      var cat = data.categories[catIdx];
      if (!cat || !cat.options[optIdx]) return;
      var opt = cat.options[optIdx];
      // Create inline input
      var currentLabel = opt.label;
      var input = document.createElement('input');
      input.type = 'text';
      input.value = currentLabel;
      input.style.cssText = 'width:36px;font-size:' + getComputedStyle(labelEl).fontSize + ';font-weight:700;color:' + getComputedStyle(labelEl).color + ';border:1px solid #4A7C59;border-radius:3px;padding:0 2px;outline:none;background:#fff;text-align:center;';
      input.maxLength = 10;
      labelEl.textContent = '';
      labelEl.appendChild(input);
      input.focus();
      input.select();
      function saveLabel() {
        var newLabel = input.value.trim();
        if (newLabel && newLabel !== currentLabel) {
          opt.label = newLabel;
          labelEl.textContent = newLabel;
          // Update prefix range display
          var card = labelEl.closest('.mtx-clip-cat');
          if (card) {
            var rangeSpan = card.querySelector('.mtx-clip-toolbar span[style*="margin-left:auto"]');
            if (rangeSpan) {
              var first = cat.options[0].label;
              var last = cat.options[cat.options.length - 1].label;
              rangeSpan.textContent = first + '→' + last;
            }
          }
        } else {
          labelEl.textContent = currentLabel;
        }
      }
      input.addEventListener('blur', saveLabel);
      input.addEventListener('keydown', function(ev) {
        if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
        if (ev.key === 'Escape') { input.value = currentLabel; input.blur(); }
      });
    });

    // v3.0.9: Create footer buttons via DOM API (not innerHTML) to guarantee event binding
    var footer = panel.querySelector('#mtx-clip-footer');
    if (footer) {
      var btnDefs = [
        { id: 'mtx-clip-sync', text: '⬆️ Sync về Matrixty', style: 'flex:1;padding:9px;background:#4A7C59;color:#fff;border:none;border-radius:7px;font-weight:700;font-size:12px;cursor:pointer;font-family:inherit;' },
        { id: 'mtx-clip-screenshot', text: '📷', style: 'padding:9px 14px;background:#F3F4F6;color:#555;border:1px solid #D1D5DB;border-radius:7px;font-size:12px;cursor:pointer;font-family:inherit;', title: 'Chụp ảnh vùng panel' },
        { id: 'mtx-clip-capture', text: '+ All', style: 'padding:9px 14px;background:#F0FFF4;color:#16A34A;border:1px solid #BBF7D0;border-radius:7px;font-size:12px;cursor:pointer;font-family:inherit;', title: 'Thêm nhóm mới từ trang' },
        { id: 'mtx-clip-pick', text: '🎯 Pick', style: 'padding:9px 14px;background:#FFFBEB;color:#D97706;border:1px solid #FDE68A;border-radius:7px;font-size:12px;cursor:pointer;font-family:inherit;', title: 'Chọn từng nhóm trên trang' },
        { id: 'mtx-clip-renumber', text: '🔢', style: 'padding:9px 14px;background:#EFF6FF;color:#2563EB;border:1px solid #BFDBFE;border-radius:7px;font-size:12px;cursor:pointer;font-family:inherit;', title: 'Đánh lại số' },
      ];
      btnDefs.forEach(function(def) {
        var b = document.createElement('button');
        b.id = def.id;
        b.textContent = def.text;
        b.style.cssText = def.style;
        if (def.title) b.title = def.title;
        footer.appendChild(b);
      });
    }

    // Events — v3.0.9: Use direct DOM references (not querySelector) for footer buttons
    panel.querySelector('#mtx-clip-close').onclick = () => {
      panel.remove();
      document.querySelectorAll('.mtx-clip-label').forEach(e => e.remove());
      document.querySelectorAll('.mtx-pick-btn').forEach(e => e.remove());
      // v8.0.6: Clean up any active pick mode
      cleanupAllPickModes();
    };
    
    var syncBtn = document.getElementById('mtx-clip-sync');
    var screenshotBtn = document.getElementById('mtx-clip-screenshot');
    var captureBtn = document.getElementById('mtx-clip-capture');
    var pickBtnEl = document.getElementById('mtx-clip-pick');
    var renumberBtn = document.getElementById('mtx-clip-renumber');

    console.log('[Matrixty Clipart] Footer buttons found:', !!syncBtn, !!screenshotBtn, !!captureBtn, !!pickBtnEl, !!renumberBtn);

    if (syncBtn) syncBtn.onclick = () => syncClipartData(data);

    // ── 📷 Screenshot: show selection dialog → render chosen variants to canvas ──
    if (screenshotBtn) screenshotBtn.onclick = () => {
      var cats = data.categories;
      if (!cats || !cats.length) { clipNotify('Không có dữ liệu', 'error'); return; }
      var colorPalette = ['#1B5E20','#B71C1C','#0D47A1','#4A148C','#E65100','#006064','#880E4F','#33691E','#1A237E','#3E2723'];

      // ── Step 1: Show selection dialog ──
      var dlg = document.createElement('div');
      dlg.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;';
      var box = document.createElement('div');
      box.style.cssText = 'background:#fff;border-radius:12px;padding:20px;width:380px;max-height:80vh;display:flex;flex-direction:column;box-shadow:0 8px 32px rgba(0,0,0,0.25);font-family:-apple-system,BlinkMacSystemFont,sans-serif;';

      // Header
      var hdr = document.createElement('div');
      hdr.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;';
      hdr.innerHTML = '<div style="font-size:15px;font-weight:700;color:#1a1a1a;">📷 Chọn variant để tạo ảnh</div>';
      var closeBtn = document.createElement('span');
      closeBtn.textContent = '✕'; closeBtn.style.cssText = 'cursor:pointer;color:#9CA3AF;font-size:18px;padding:4px 8px;';
      closeBtn.onclick = function() { dlg.remove(); };
      hdr.appendChild(closeBtn);
      box.appendChild(hdr);

      // Select all / none row
      var actRow = document.createElement('div');
      actRow.style.cssText = 'display:flex;gap:8px;margin-bottom:10px;';
      var selAllBtn = document.createElement('button');
      selAllBtn.textContent = 'Chọn tất cả';
      selAllBtn.style.cssText = 'flex:1;padding:6px;background:#EEF2FF;color:#4338CA;border:1px solid #C7D2FE;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;';
      var selNoneBtn = document.createElement('button');
      selNoneBtn.textContent = 'Bỏ chọn';
      selNoneBtn.style.cssText = 'flex:1;padding:6px;background:#FEF2F2;color:#DC2626;border:1px solid #FECACA;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;';
      actRow.appendChild(selAllBtn); actRow.appendChild(selNoneBtn);
      box.appendChild(actRow);

      // Category toggle list (custom toggle — NOT native checkbox to avoid page CSS override)
      var listWrap = document.createElement('div');
      listWrap.style.cssText = 'flex:1;overflow-y:auto;border:1px solid #E5E7EB;border-radius:8px;padding:4px;margin-bottom:14px;';
      var toggleStates = []; // { selected: bool, idx: int }
      cats.forEach(function(cat, ci) {
        var state = { selected: true, idx: ci };
        toggleStates.push(state);

        var row = document.createElement('div');
        row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:7px 10px;border-radius:6px;cursor:pointer;font-size:13px;color:#1a1a1a;user-select:none;border:2px solid #4A7C59;margin-bottom:3px;background:#F0FFF4;';

        var tick = document.createElement('span');
        tick.style.cssText = 'width:20px;height:20px;border-radius:4px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:13px;font-weight:700;background:#4A7C59;color:#fff;';
        tick.textContent = '✓';

        var dot = document.createElement('span');
        dot.style.cssText = 'width:8px;height:8px;border-radius:2px;background:' + colorPalette[ci % colorPalette.length] + ';flex-shrink:0;';
        var lbl = document.createElement('span');
        lbl.style.cssText = 'font-weight:600;flex:1;';
        lbl.textContent = cat.name;
        var cnt = document.createElement('span');
        cnt.style.cssText = 'font-size:11px;color:#9CA3AF;';
        cnt.textContent = cat.optionCount + ' opts';

        row.appendChild(tick); row.appendChild(dot); row.appendChild(lbl); row.appendChild(cnt);
        listWrap.appendChild(row);

        function updateRowVisual() {
          if (state.selected) {
            row.style.borderColor = '#4A7C59'; row.style.background = '#F0FFF4';
            tick.style.background = '#4A7C59'; tick.style.color = '#fff'; tick.textContent = '✓';
          } else {
            row.style.borderColor = '#E5E7EB'; row.style.background = '#fff';
            tick.style.background = '#F3F4F6'; tick.style.color = '#D1D5DB'; tick.textContent = '';
          }
        }

        row.onclick = function(e) {
          e.stopPropagation();
          state.selected = !state.selected;
          updateRowVisual();
        };
      });
      box.appendChild(listWrap);

      selAllBtn.onclick = function() { toggleStates.forEach(function(s) { s.selected = true; }); listWrap.querySelectorAll('div[style*="cursor:pointer"]').forEach(function(r, i) { toggleStates[i].selected = true; }); refreshToggles(); };
      selNoneBtn.onclick = function() { toggleStates.forEach(function(s) { s.selected = false; }); refreshToggles(); };
      function refreshToggles() {
        var rows = listWrap.children;
        for (var i = 0; i < toggleStates.length; i++) {
          var s = toggleStates[i];
          var r = rows[i]; if (!r) continue;
          var t = r.querySelector('span');
          if (s.selected) {
            r.style.borderColor = '#4A7C59'; r.style.background = '#F0FFF4';
            t.style.background = '#4A7C59'; t.style.color = '#fff'; t.textContent = '✓';
          } else {
            r.style.borderColor = '#E5E7EB'; r.style.background = '#fff';
            t.style.background = '#F3F4F6'; t.style.color = '#D1D5DB'; t.textContent = '';
          }
        }
      }

      // Generate button
      var genBtn = document.createElement('button');
      genBtn.textContent = '🖼️ Tạo ảnh 1500×1500';
      genBtn.style.cssText = 'width:100%;padding:10px;background:#4A7C59;color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;';
      box.appendChild(genBtn);
      dlg.appendChild(box);
      document.body.appendChild(dlg);

      // Click outside to close
      dlg.onclick = function(e) { if (e.target === dlg) dlg.remove(); };

      // ── Step 2: Generate image on click ──
      genBtn.onclick = function() {
        var selectedIdxs = [];
        toggleStates.forEach(function(s) { if (s.selected) selectedIdxs.push(s.idx); });
        if (!selectedIdxs.length) { clipNotify('Chưa chọn variant nào', 'error'); return; }

        genBtn.disabled = true;
        genBtn.textContent = '⏳ Đang tải ảnh...';
        genBtn.style.opacity = '0.6';

        var selCats = selectedIdxs.map(function(i) { return cats[i]; });

        // Helper: ensure image src is a usable data URL (bypass CORS for http URLs)
        function ensureDataUrl(src) {
          return new Promise(function(resolve) {
            if (!src) { resolve(null); return; }
            if (src.startsWith('data:')) { resolve(src); return; }
            // Cross-origin URL → fetch via background script (no CORS restriction)
            chrome.runtime.sendMessage({ type: 'FETCH_AS_DATAURL', url: src }, function(resp) {
              resolve(resp && resp.dataUrl ? resp.dataUrl : null);
            });
          });
        }

        // Pre-load all option images: first convert URLs to data URLs, then load as Image
        var loadPromises = [];
        selCats.forEach(function(cat, sci) {
          cat.options.forEach(function(opt, oi) {
            if (opt.capturedImage) {
              loadPromises.push(
                ensureDataUrl(opt.capturedImage).then(function(safeUrl) {
                  if (!safeUrl) return { sci: sci, oi: oi, img: null };
                  return new Promise(function(resolve) {
                    var img = new Image();
                    img.onload = function() { resolve({ sci: sci, oi: oi, img: img }); };
                    img.onerror = function() { resolve({ sci: sci, oi: oi, img: null }); };
                    img.src = safeUrl;
                  });
                })
              );
            }
          });
        });

        Promise.all(loadPromises).then(function(loaded) {
          genBtn.textContent = '⏳ Đang vẽ ảnh...';
          try {
            var imgMap = {};
            loaded.forEach(function(e) {
              if (!imgMap[e.sci]) imgMap[e.sci] = {};
              if (e.img) imgMap[e.sci][e.oi] = e.img;
            });

            var FINAL = 1500;
            var PAD = 28;
            var usableW = FINAL - 2 * PAD;

            // All spacing/font sizes scale with thumbnail size (ratio to base 60px)
            function makeMetrics(th) {
              var r = th / 60; // scale ratio (base: 60px thumb)
              return {
                thumbSz: th,
                cellGap: Math.max(4, Math.round(6 * r)),
                catGap: Math.max(10, Math.round(18 * r)),
                headerH: Math.max(18, Math.round(32 * r)),
                labelH: Math.max(12, Math.round(18 * r)),
                htTextH: Math.max(16, Math.round(28 * r)),
                catNameFs: Math.max(10, Math.round(14 * r)),
                rangeFs: Math.max(8, Math.round(11 * r)),
                labelFs: Math.max(7, Math.round(11 * r)),
                textRowH: Math.max(14, Math.round(22 * r)),
                textLabelFs: Math.max(7, Math.round(10 * r)),
                textContentFs: Math.max(8, Math.round(11 * r)),
                dotR: Math.max(3, Math.round(6 * r)),
              };
            }

            // v9.6: Per-group thumb size based on user's zoom (_thumbScales)
            //   selCats[i] originally came from data.categories[selectedIdxs[i]]
            //   so we read scale via that index back into data._thumbScales.
            function getGroupScale(sci) {
              var origIdx = (typeof selectedIdxs !== 'undefined' && selectedIdxs[sci] != null) ? selectedIdxs[sci] : sci;
              return (data._thumbScales && data._thumbScales[origIdx]) || 1.0;
            }

            // ── Auto-layout: each group has own thumb based on baseTh × scale ──
            function calcHeight(baseTh) {
              var totalH = PAD;
              selCats.forEach(function(cat, sci) {
                var scale = getGroupScale(sci);
                var th = Math.max(20, Math.round(baseTh * scale));
                var m = makeMetrics(th);
                // Cols for THIS group (may differ from others)
                var cols = Math.max(1, Math.floor((usableW + m.cellGap) / (th + m.cellGap)));
                var bPad = Math.max(6, Math.round(10 * th / 60));
                if (cat.headerText && cat.headerText.trim()) totalH += m.htTextH;
                totalH += m.headerH + bPad * 1.5;
                var isText = cat.options.every(function(o) { return !o.imageUrl && !o.bgColor && o.textContent && o.textContent.trim().length > 0; });
                if (isText) { totalH += cat.options.length * m.textRowH + 4; }
                else { totalH += Math.ceil(cat.optionCount / cols) * (th + m.labelH + m.cellGap); }
                totalH += m.catGap;
              });
              return totalH + PAD;
            }

            // v9.6: Find optimal BASE thumb — biggest baseTh where calcHeight(baseTh) ≤ FINAL.
            //   Each group renders at baseTh × scale (per-group zoom honored).
            var bestBaseTh = 30;
            for (var tryTh = 30; tryTh <= 200; tryTh += 5) {
              var hh = calcHeight(tryTh);
              if (hh <= FINAL) bestBaseTh = tryTh;
            }
            // If even minimum overflows, use 30 (will scale down later via scaleRatio)
            var baseThumb = bestBaseTh;
            var M = makeMetrics(baseThumb);  // metrics at base scale, used as default
            var layoutH = calcHeight(baseThumb);
            // bestCols for legacy refs — represents cols at scale 1.0
            var bestCols = Math.max(1, Math.floor((usableW + M.cellGap) / (baseThumb + M.cellGap)));
            var thumbSz = baseThumb;

            // ── Create canvas ──
            var canvas = document.createElement('canvas');
            canvas.width = FINAL; canvas.height = FINAL;
            var ctx = canvas.getContext('2d');
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, FINAL, FINAL);

            // Scale to fit if content taller than canvas
            var scaleRatio = 1;
            if (layoutH > FINAL) {
              scaleRatio = FINAL / layoutH;
              ctx.save();
              ctx.scale(scaleRatio, scaleRatio);
            }

            // roundRect polyfill for older Chrome
            if (!ctx.roundRect) {
              ctx.roundRect = function(x, y, w, h, radii) {
                var r = typeof radii === 'number' ? radii : (Array.isArray(radii) ? radii[0] : 4);
                ctx.moveTo(x + r, y);
                ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
                ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
                ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
                ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y);
                ctx.closePath();
              };
            }

            var curY = PAD;
            var blockPad = Math.max(6, Math.round(10 * thumbSz / 60)); // inner padding of block
            var borderR = Math.max(4, Math.round(8 * thumbSz / 60)); // border radius

            // Subtle overall canvas background
            ctx.fillStyle = '#F8F9FA';
            var canvasW = layoutH > FINAL ? FINAL / scaleRatio : FINAL;
            var canvasH = layoutH > FINAL ? layoutH : FINAL;
            ctx.fillRect(0, 0, canvasW, canvasH);

            selCats.forEach(function(cat, sci) {
              var color = colorPalette[selectedIdxs[sci] % colorPalette.length];
              var isText = cat.options.every(function(o) { return !o.imageUrl && !o.bgColor && o.textContent && o.textContent.trim().length > 0; });

              // v9.6: Per-group thumb size based on user's zoom level
              var gScale = getGroupScale(sci);
              var gThumb = Math.max(20, Math.round(baseThumb * gScale));
              var gM = makeMetrics(gThumb);
              var gCols = Math.max(1, Math.floor((usableW + gM.cellGap) / (gThumb + gM.cellGap)));
              var gCellW = gThumb + gM.cellGap;
              var gCellH = gThumb + gM.labelH + gM.cellGap;

              // ── Pre-calculate this block's total height ──
              var blockContentH = gM.headerH;
              if (isText) { blockContentH += cat.options.length * gM.textRowH + 4; }
              else { blockContentH += Math.ceil(cat.optionCount / gCols) * gCellH; }

              var htH = 0;
              if (cat.headerText && cat.headerText.trim()) htH = gM.htTextH;

              // ── Draw header text (above block) ──
              if (htH > 0) {
                var htStyle = cat.headerTextStyle || {};
                var htFs = Math.max(gM.catNameFs, Math.round((htStyle.fontSize || 28) * (gThumb / 60) * 0.4));
                ctx.font = '700 ' + htFs + 'px sans-serif';
                ctx.fillStyle = htStyle.color || '#1a1a2e';
                ctx.textAlign = 'center';
                ctx.fillText(cat.headerText, canvasW / 2, curY + htH * 0.65);
                ctx.textAlign = 'left';
                curY += htH;
              }

              // ── Draw block background + border ──
              var gBlockPad = Math.max(6, Math.round(10 * gThumb / 60));
              var gBorderR = Math.max(4, Math.round(8 * gThumb / 60));
              var blockX = PAD - gBlockPad;
              var blockY = curY - gBlockPad / 2;
              var blockW = usableW + gBlockPad * 2;
              var blockH = blockContentH + gBlockPad * 1.5;

              // Block background (white card)
              ctx.fillStyle = '#FFFFFF';
              ctx.beginPath();
              ctx.roundRect(blockX, blockY, blockW, blockH, gBorderR);
              ctx.fill();
              // Block border
              ctx.strokeStyle = '#E2E5EA';
              ctx.lineWidth = Math.max(1, Math.round(1.5 * gThumb / 60));
              ctx.beginPath();
              ctx.roundRect(blockX, blockY, blockW, blockH, gBorderR);
              ctx.stroke();

              // ── Category name row (uses per-group metrics) ──
              ctx.fillStyle = color;
              ctx.beginPath();
              ctx.arc(PAD + gM.dotR + 2, curY + gM.headerH / 2, gM.dotR, 0, Math.PI * 2);
              ctx.fill();
              ctx.font = '700 ' + gM.catNameFs + 'px sans-serif';
              ctx.fillStyle = '#1a1a1a';
              ctx.fillText(cat.name, PAD + gM.dotR * 2 + 10, curY + gM.headerH / 2 + gM.catNameFs * 0.35);
              ctx.font = '400 ' + gM.rangeFs + 'px sans-serif';
              ctx.fillStyle = '#9CA3AF';
              var rangeText = cat.prefix + '1→' + cat.prefix + cat.optionCount;
              ctx.fillText(rangeText, PAD + usableW - ctx.measureText(rangeText).width, curY + gM.headerH / 2 + gM.rangeFs * 0.35);
              curY += gM.headerH;

              // ── Options ──
              if (isText) {
                ctx.font = '700 ' + gM.textLabelFs + 'px sans-serif';
                var maxLblW = 0;
                cat.options.forEach(function(opt) {
                  var lw = ctx.measureText(opt.label).width;
                  if (lw > maxLblW) maxLblW = lw;
                });
                var textOffset = PAD + maxLblW + Math.max(8, Math.round(14 * gThumb / 60));
                var rowGap = Math.max(2, Math.round(3 * gThumb / 60));

                cat.options.forEach(function(opt) {
                  ctx.fillStyle = '#F9FAFB';
                  ctx.fillRect(PAD, curY, usableW, gM.textRowH - rowGap);
                  ctx.strokeStyle = '#E5E7EB'; ctx.lineWidth = Math.max(0.5, Math.round(gThumb / 80));
                  ctx.strokeRect(PAD, curY, usableW, gM.textRowH - rowGap);
                  ctx.font = '700 ' + gM.textLabelFs + 'px sans-serif'; ctx.fillStyle = color;
                  ctx.fillText(opt.label, PAD + 6, curY + (gM.textRowH - rowGap) * 0.65);
                  ctx.font = '400 ' + gM.textContentFs + 'px sans-serif'; ctx.fillStyle = '#374151';
                  ctx.fillText((opt.textContent || '?').substring(0, 60), textOffset, curY + (gM.textRowH - rowGap) * 0.65);
                  curY += gM.textRowH;
                });
                curY += 4;
              } else {
                cat.options.forEach(function(opt, oi) {
                  var col = oi % gCols;
                  var row = Math.floor(oi / gCols);
                  var cx = PAD + col * gCellW;
                  var cy = curY + row * gCellH;

                  ctx.fillStyle = opt.bgColor || '#F3F4F6';
                  ctx.fillRect(cx, cy, gThumb, gThumb);
                  ctx.strokeStyle = '#D1D5DB'; ctx.lineWidth = Math.max(0.5, Math.round(gThumb / 80));
                  ctx.strokeRect(cx, cy, gThumb, gThumb);

                  var imgObj = imgMap[sci] && imgMap[sci][oi];
                  if (imgObj) {
                    var iw = imgObj.width, ih = imgObj.height;
                    var sc = Math.min(gThumb / iw, gThumb / ih);
                    var dw = Math.round(iw * sc), dh = Math.round(ih * sc);
                    ctx.drawImage(imgObj, cx + Math.round((gThumb - dw) / 2), cy + Math.round((gThumb - dh) / 2), dw, dh);
                  } else if (!opt.bgColor && !opt.capturedImage) {
                    var txt = (opt.textContent || '?').substring(0, 10);
                    ctx.font = '700 ' + Math.max(8, Math.floor(gThumb / 4)) + 'px sans-serif';
                    ctx.fillStyle = '#374151'; ctx.textAlign = 'center';
                    ctx.fillText(txt, cx + gThumb / 2, cy + gThumb / 2 + 4);
                    ctx.textAlign = 'left';
                  }

                  ctx.font = '700 ' + gM.labelFs + 'px sans-serif';
                  ctx.fillStyle = color; ctx.textAlign = 'center';
                  ctx.fillText(opt.label, cx + gThumb / 2, cy + gThumb + gM.labelH - Math.round(gM.labelH * 0.2));
                  ctx.textAlign = 'left';
                });
                curY += Math.ceil(cat.optionCount / gCols) * gCellH;
              }
              curY += gM.catGap;
            });

            if (layoutH > FINAL) ctx.restore();

            // ── Download ──
            canvas.toBlob(function(blob) {
              dlg.remove();
              if (!blob) { clipNotify('Lỗi tạo ảnh', 'error'); return; }
              var url = URL.createObjectURL(blob);
              var a = document.createElement('a');
              a.href = url;
              a.download = 'clipart-' + selCats.length + 'cats-' + Date.now() + '.png';
              document.body.appendChild(a);
              a.click();
              setTimeout(function() { a.remove(); URL.revokeObjectURL(url); }, 1000);
              clipNotify('Đã tải ảnh 1500×1500 — ' + selCats.length + ' nhóm!', 'success');
            }, 'image/png');

          } catch (err) {
            console.error('Clipart screenshot error:', err);
            dlg.remove();
            clipNotify('Lỗi: ' + err.message, 'error');
          }
        }).catch(function(err) {
          console.error('Image load error:', err);
          dlg.remove();
          clipNotify('Lỗi tải ảnh: ' + err.message, 'error');
        });
      };
    };
    
    // Helper: re-render panel preserving data
    function refreshPanel() {
      // Preserve scroll position
      var scrollArea = panel.querySelector('div[style*="overflow-y"]');
      var scrollTop = scrollArea ? scrollArea.scrollTop : 0;
      panel.remove();
      document.querySelectorAll('.mtx-clip-label').forEach(e => e.remove());
      showClipartPanel(data);
      // Restore scroll
      var newPanel = document.getElementById('mtx-clip-panel');
      if (newPanel) {
        var newScroll = newPanel.querySelector('div[style*="overflow-y"]');
        if (newScroll) newScroll.scrollTop = scrollTop;
      }
    }
    
    // ── Header text: T button toggle editor ──
    panel.querySelectorAll('.mtx-clip-ht-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        var idx = btn.getAttribute('data-idx');
        var row = document.getElementById('mtx-ht-row-' + idx);
        if (row) {
          var isActive = row.classList.contains('active');
          // Close all first
          panel.querySelectorAll('.mtx-ht-row').forEach(r => r.classList.remove('active'));
          if (!isActive) {
            row.classList.add('active');
            var inp = row.querySelector('.mtx-ht-input');
            if (inp) { inp.focus(); inp.select(); }
          }
        }
      };
    });

    // Header text display: click to edit
    panel.querySelectorAll('.mtx-clip-ht-display').forEach(el => {
      el.onclick = (e) => {
        e.stopPropagation();
        var idx = el.getAttribute('data-idx');
        var row = document.getElementById('mtx-ht-row-' + idx);
        if (row) { row.classList.add('active'); var inp = row.querySelector('.mtx-ht-input'); if (inp) { inp.focus(); inp.select(); } }
      };
    });

    // Header text: save
    panel.querySelectorAll('.mtx-ht-save').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        var idx = parseInt(btn.getAttribute('data-idx'));
        var row = document.getElementById('mtx-ht-row-' + idx);
        if (!row) return;
        var text = row.querySelector('.mtx-ht-input').value.trim();
        var fontSize = parseInt(row.querySelector('.mtx-ht-size').value) || 28;
        var color = row.querySelector('.mtx-ht-color').value || '#1a1a2e';
        data.categories[idx].headerText = text || '';
        data.categories[idx].headerTextStyle = { fontSize: fontSize, color: color, fontFamily: 'sans-serif' };
        refreshPanel();
        clipNotify(text ? 'Đã lưu text!' : 'Đã xóa text', 'success');
      };
    });

    // Header text: cancel
    panel.querySelectorAll('.mtx-ht-cancel').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        var idx = btn.getAttribute('data-idx');
        var row = document.getElementById('mtx-ht-row-' + idx);
        if (row) row.classList.remove('active');
      };
    });

    // Header text: Enter to save
    panel.querySelectorAll('.mtx-ht-input').forEach(inp => {
      inp.onkeydown = (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          var idx = inp.getAttribute('data-idx');
          var saveBtn = panel.querySelector('.mtx-ht-save[data-idx="' + idx + '"]');
          if (saveBtn) saveBtn.click();
        }
        if (e.key === 'Escape') {
          var idx2 = inp.getAttribute('data-idx');
          var row = document.getElementById('mtx-ht-row-' + idx2);
          if (row) row.classList.remove('active');
        }
      };
    });

    // ── Resize handles: drag to scale variant thumbnails ──
    panel.querySelectorAll('.mtx-resize-handle').forEach(handle => {
      handle.onmousedown = (e) => {
        e.preventDefault();
        e.stopPropagation();
        var idx = parseInt(handle.getAttribute('data-idx'));
        var startY = e.clientY;
        var startScale = data._thumbScales[idx] || 1.0;
        handle.style.background = 'rgba(74,124,89,0.2)';

        var resizeOverlay = document.createElement('div');
        resizeOverlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999998;cursor:ns-resize;';
        document.body.appendChild(resizeOverlay);

        function onMove(ev) {
          var dy = ev.clientY - startY;
          var delta = dy / 150; // 150px drag = 1.0 scale
          var newScale = Math.max(0.4, Math.min(3.0, startScale + delta));
          data._thumbScales[idx] = newScale;
          // Live update: resize grid items without full re-render
          var cat = data.categories[idx];
          var grid = panel.querySelector('.mtx-clip-grid[data-idx="' + idx + '"]');
          if (grid && cat) {
            var baseThumb = cat.optionCount > 15 ? 32 : 42;
            var thumbSize = Math.round(baseThumb * newScale);
            var gridMin = Math.round((cat.optionCount > 15 ? 38 : 48) * newScale);
            grid.style.gridTemplateColumns = 'repeat(auto-fill,minmax(' + gridMin + 'px,1fr))';
            grid.querySelectorAll(':scope > div > div:first-child').forEach(function(cell) {
              cell.style.width = thumbSize + 'px';
              cell.style.height = thumbSize + 'px';
            });
            grid.querySelectorAll(':scope > div > div:last-child').forEach(function(lbl) {
              lbl.style.fontSize = Math.max(6, Math.round(8 * newScale)) + 'px';
            });
          }
        }
        function onUp() {
          handle.style.background = '';
          resizeOverlay.remove();
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
        }
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      };
    });

    // v9.5.4: Zoom +/− via EVENT DELEGATION + scales TITLE too (not just thumbs)
    function applyZoom(idx, newScale) {
      newScale = Math.max(0.4, Math.min(3.0, newScale));
      data._thumbScales[idx] = newScale;
      var cat = data.categories[idx];
      // Scale TITLE (group name) — base 13px
      var nameEl = panel.querySelector('.mtx-clip-name[data-idx="' + idx + '"]');
      if (nameEl) nameEl.style.fontSize = Math.round(13 * newScale) + 'px';
      // Scale thumbnails grid
      var grid = panel.querySelector('.mtx-clip-grid[data-idx="' + idx + '"]');
      if (grid && cat) {
        var baseThumb = cat.optionCount > 15 ? 32 : 42;
        var thumbSize = Math.round(baseThumb * newScale);
        var gridMin = Math.round((cat.optionCount > 15 ? 38 : 48) * newScale);
        grid.style.gridTemplateColumns = 'repeat(auto-fill,minmax(' + gridMin + 'px,1fr))';
        grid.querySelectorAll(':scope > div > div:first-child').forEach(function(cell) {
          cell.style.width = thumbSize + 'px';
          cell.style.height = thumbSize + 'px';
        });
        grid.querySelectorAll(':scope > div > div:last-child').forEach(function(lbl) {
          lbl.style.fontSize = Math.max(6, Math.round(8 * newScale)) + 'px';
        });
        console.log('[Matrixty zoom] Group', idx, 'scale =', newScale.toFixed(2), '→ thumb', thumbSize + 'px, title', Math.round(13 * newScale) + 'px');
      } else {
        console.log('[Matrixty zoom] Group', idx, 'text-only — title scaled to', Math.round(13 * newScale) + 'px');
      }
      var lbl = panel.querySelector('.mtx-clip-zoom-val[data-idx="' + idx + '"]');
      if (lbl) lbl.textContent = newScale.toFixed(1) + '×';
    }
    // Single click handler for the entire panel — handles + / − / reset robustly
    panel.addEventListener('click', function(e) {
      var t = e.target;
      // Walk up to find a zoom control (covers click on inner text node)
      var zoomIn = t.closest && t.closest('.mtx-clip-zoom-in');
      if (zoomIn) {
        e.preventDefault(); e.stopPropagation();
        var i = parseInt(zoomIn.getAttribute('data-idx'));
        var cur = data._thumbScales[i] || 1.0;
        applyZoom(i, cur + 0.5);  // +0.5× per click for visible jumps
        return;
      }
      var zoomOut = t.closest && t.closest('.mtx-clip-zoom-out');
      if (zoomOut) {
        e.preventDefault(); e.stopPropagation();
        var i = parseInt(zoomOut.getAttribute('data-idx'));
        var cur = data._thumbScales[i] || 1.0;
        applyZoom(i, cur - 0.5);
        return;
      }
      var zoomVal = t.closest && t.closest('.mtx-clip-zoom-val');
      if (zoomVal) {
        e.preventDefault(); e.stopPropagation();
        var i = parseInt(zoomVal.getAttribute('data-idx'));
        applyZoom(i, 1.0);
        return;
      }
    }, true);  // capture phase — fires BEFORE any inner handler that might stop it
    // Stop dragstart on zoom controls (parent .mtx-clip-cat is draggable=true)
    panel.addEventListener('dragstart', function(e) {
      if (e.target.classList && (e.target.classList.contains('mtx-clip-zoom-in') || e.target.classList.contains('mtx-clip-zoom-out') || e.target.classList.contains('mtx-clip-zoom-val'))) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);

    // Delete individual groups
    panel.querySelectorAll('.mtx-clip-del').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-idx'));
        data.categories.splice(idx, 1);
        refreshPanel();
      };
    });
    
    // Move up/down
    panel.querySelectorAll('.mtx-clip-up').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-idx'));
        if (idx <= 0) return;
        const item = data.categories.splice(idx, 1)[0];
        data.categories.splice(idx - 1, 0, item);
        refreshPanel();
      };
    });
    panel.querySelectorAll('.mtx-clip-down').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-idx'));
        if (idx >= data.categories.length - 1) return;
        const item = data.categories.splice(idx, 1)[0];
        data.categories.splice(idx + 1, 0, item);
        refreshPanel();
      };
    });
    
    // Renumber: reassign prefixes and labels based on current order
    if (renumberBtn) renumberBtn.onclick = () => {
      // v3.0.4: Use sequential A, B, C... letters
      data.categories.forEach((cat, idx) => {
        cat.prefix = sequentialPrefix(idx);
        cat.options.forEach((o, i) => { o.label = cat.prefix + (i + 1); });
      });
      refreshPanel();
      clipNotify('Đã đánh lại số!', 'success');
    };
    
    // + All: capture ALL groups from current page — v3.0.9: DEDUP by group name
    if (captureBtn) captureBtn.onclick = async () => {
      captureBtn.textContent = '⏳ Scanning...';
      captureBtn.disabled = true;
      
      // Scroll through form to trigger lazy-loaded options
      var form = document.querySelector('.ctm-artwork-personalized-form, .ant-form, .product-form, .personalization-form');
      if (form) {
        var fRect = form.getBoundingClientRect();
        var pos = fRect.top + window.scrollY;
        while (pos < fRect.bottom + window.scrollY) {
          window.scrollTo({ top: pos, behavior: 'instant' });
          await sleep(200);
          pos += window.innerHeight * 0.7;
        }
      }
      await sleep(500);
      
      var newGroups = scanDOM();
      var addedCount = 0;
      var existingNames = new Set(data.categories.map(function(c) { return c.name.toLowerCase().trim(); }));
      
      newGroups.forEach(function(grp) {
        var nameKey = grp.label.toLowerCase().trim();
        if (existingNames.has(nameKey)) return;
        existingNames.add(nameKey);
        var pfx = sequentialPrefix(data.categories.length);
        data.categories.push({
          name: grp.label, prefix: pfx,
          options: grp.options.map(function(o, i) { return { ...o, label: pfx + (i+1), capturedImage: o.imageUrl || null, bgColor: o.bgColor || '' }; }),
          optionCount: grp.options.length,
        });
        addedCount++;
      });
      
      if (addedCount > 0) {
        refreshPanel();
        clipNotify('+' + addedCount + ' nhóm mới (bỏ qua ' + (newGroups.length - addedCount) + ' trùng)', 'success');
      } else {
        captureBtn.disabled = false;
        captureBtn.textContent = 'Không có nhóm mới';
        setTimeout(function() { captureBtn.textContent = '+ All'; }, 2000);
      }
    };
    
    // 🎯 Pick: v8.0.4 — Dropdown with 2 modes: Screenshot + Manual click
    if (pickBtnEl) pickBtnEl.onclick = (e) => {
      e.stopPropagation();
      // Toggle dropdown menu
      var existingMenu = document.getElementById('mtx-pick-menu');
      if (existingMenu) { existingMenu.remove(); return; }

      var menu = document.createElement('div');
      menu.id = 'mtx-pick-menu';
      menu.style.cssText = 'position:absolute;bottom:100%;left:0;margin-bottom:6px;background:#fff;border:1px solid #D1D5DB;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.15);z-index:999999999;width:240px;overflow:hidden;font-family:-apple-system,sans-serif;';

      var opt1 = document.createElement('div');
      opt1.style.cssText = 'padding:10px 14px;cursor:pointer;border-bottom:1px solid #F3F4F6;transition:background .15s;';
      opt1.innerHTML = '<div style="font-size:12px;font-weight:700;color:#D97706;">📸 Screenshot Mode</div><div style="font-size:10px;color:#6B7280;margin-top:2px;">Chụp vùng clipart trên trang → tự nhận diện & thêm</div>';
      opt1.onmouseenter = function() { opt1.style.background = '#FFFBEB'; };
      opt1.onmouseleave = function() { opt1.style.background = '#fff'; };
      opt1.onclick = function(ev) {
        ev.stopPropagation();
        menu.remove();
        activateScreenshotPick(data, refreshPanel);
      };

      var opt2 = document.createElement('div');
      opt2.style.cssText = 'padding:10px 14px;cursor:pointer;transition:background .15s;';
      opt2.innerHTML = '<div style="font-size:12px;font-weight:700;color:#2563EB;">👆 Manual Click Mode</div><div style="font-size:10px;color:#6B7280;margin-top:2px;">Click chọn từng nhóm clipart trực tiếp trên trang</div>';
      opt2.onmouseenter = function() { opt2.style.background = '#EFF6FF'; };
      opt2.onmouseleave = function() { opt2.style.background = '#fff'; };
      opt2.onclick = function(ev) {
        ev.stopPropagation();
        menu.remove();
        activateManualPick(data, refreshPanel);
      };

      menu.appendChild(opt1);
      menu.appendChild(opt2);
      pickBtnEl.parentElement.style.position = 'relative';
      pickBtnEl.parentElement.appendChild(menu);

      // Close on click outside
      var closeMenu = function(ev) {
        if (!menu.contains(ev.target) && ev.target !== pickBtnEl) {
          menu.remove();
          document.removeEventListener('click', closeMenu, true);
        }
      };
      setTimeout(function() { document.addEventListener('click', closeMenu, true); }, 100);
    };
    
    // Editable group names — click to edit
    panel.querySelectorAll('.mtx-clip-name').forEach(nameEl => {
      nameEl.onclick = (e) => {
        e.stopPropagation();
        const idx = parseInt(nameEl.getAttribute('data-idx'));
        const current = data.categories[idx].name;
        const input = document.createElement('input');
        input.type = 'text';
        input.value = current;
        input.style.cssText = 'background:#FFFFFF;color:#1a1a1a;border:1px solid #1565C0;border-radius:4px;padding:2px 6px;font-size:13px;font-weight:700;font-family:inherit;width:160px;outline:none;';
        nameEl.replaceWith(input);
        input.focus();
        input.select();
        
        const save = () => {
          const newName = input.value.trim() || current;
          data.categories[idx].name = newName;
          refreshPanel();
        };
        input.onblur = save;
        input.onkeydown = (ev) => { if (ev.key === 'Enter') save(); if (ev.key === 'Escape') { input.value = current; save(); } };
      };
    });
    
    // Drag and drop reorder
    let dragIdx = null;
    panel.querySelectorAll('.mtx-clip-cat').forEach(card => {
      card.ondragstart = (e) => {
        dragIdx = parseInt(card.getAttribute('data-cat-idx'));
        card.style.opacity = '0.4';
        e.dataTransfer.effectAllowed = 'move';
      };
      card.ondragend = () => {
        card.style.opacity = '1';
        dragIdx = null;
        panel.querySelectorAll('.mtx-clip-cat').forEach(c => {
          c.style.borderTop = '';
          c.style.borderBottom = '';
        });
      };
      card.ondragover = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const overIdx = parseInt(card.getAttribute('data-cat-idx'));
        // Visual feedback
        panel.querySelectorAll('.mtx-clip-cat').forEach(c => {
          c.style.borderTop = '';
          c.style.borderBottom = '';
        });
        if (dragIdx !== null && overIdx !== dragIdx) {
          if (overIdx < dragIdx) {
            card.style.borderTop = '2px solid #4ADE80';
          } else {
            card.style.borderBottom = '2px solid #4ADE80';
          }
        }
      };
      card.ondrop = (e) => {
        e.preventDefault();
        const dropIdx = parseInt(card.getAttribute('data-cat-idx'));
        if (dragIdx !== null && dragIdx !== dropIdx) {
          const item = data.categories.splice(dragIdx, 1)[0];
          data.categories.splice(dropIdx, 0, item);
          refreshPanel();
        }
      };
    });
  }

  // ---- Auto-detect product mockup image ----
  function detectProductMockup() {
    // Strategy 1: Open Graph image (most reliable for product pages)
    const ogImg = document.querySelector('meta[property="og:image"]');
    if (ogImg && ogImg.content) return ogImg.content;

    // Strategy 2: Twitter card image
    const twImg = document.querySelector('meta[name="twitter:image"]');
    if (twImg && twImg.content) return twImg.content;

    // Strategy 3: First large product image (common selectors)
    const selectors = [
      '.product-featured-img img',
      '.product__media img',
      '.product-single__photo img',
      '.product-gallery img',
      '[data-product-featured-image]',
      '.product-image-main img',
      '.product__main-photos img',
      '.wt-max-width-full img', // Etsy
      '#imgTagWrapperId img', // Amazon
      '#landingImage', // Amazon
      '.image-viewer-container img',
      '.product-gallery__image img',
      '.product-page__image img',
    ];
    for (const sel of selectors) {
      const img = document.querySelector(sel);
      if (img && (img.naturalWidth >= 200 || img.width >= 200)) {
        return img.src || img.currentSrc;
      }
    }

    // Strategy 4: Largest image on page (fallback)
    const allImgs = [...document.querySelectorAll('img')].filter(img => {
      const w = img.naturalWidth || img.width;
      const h = img.naturalHeight || img.height;
      const src = (img.src || '').toLowerCase();
      return w >= 250 && h >= 250 && !src.includes('icon') && !src.includes('logo') && !src.includes('badge') && !src.includes('svg');
    });
    allImgs.sort((a, b) => (b.naturalWidth * b.naturalHeight) - (a.naturalWidth * a.naturalHeight));
    if (allImgs.length > 0) return allImgs[0].src || allImgs[0].currentSrc;

    return null;
  }

  // ---- Mockup Picker Modal for Sync ----
  function showMockupPicker(data) {
    return new Promise((resolve) => {
      const detectedUrl = detectProductMockup();

      const overlay = document.createElement('div');
      overlay.id = 'mtx-mockup-picker-overlay';
      overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;z-index:99999999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,sans-serif;';

      const modal = document.createElement('div');
      modal.style.cssText = 'background:#fff;border-radius:12px;padding:0;width:480px;max-height:80vh;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.3);display:flex;flex-direction:column;';

      // Header
      const header = document.createElement('div');
      header.style.cssText = 'padding:16px 20px;border-bottom:1px solid #E5E7EB;display:flex;align-items:center;justify-content:space-between;';
      header.innerHTML = '<div><div style="font-size:15px;font-weight:700;color:#1a1a1a;">🖼️ Chọn Mockup sản phẩm</div><div style="font-size:11px;color:#6B7280;margin-top:2px;">Chọn ảnh mockup để phân biệt sản phẩm trong Clipart Lab</div></div><span id="mtx-mp-close" style="color:#6B7280;font-size:18px;cursor:pointer;padding:4px 8px;">✕</span>';
      modal.appendChild(header);

      // Body
      const body = document.createElement('div');
      body.style.cssText = 'padding:16px 20px;overflow-y:auto;flex:1;';

      let selectedUrl = detectedUrl;
      const previewSection = document.createElement('div');
      previewSection.style.cssText = 'margin-bottom:16px;text-align:center;';

      function updatePreview() {
        if (selectedUrl) {
          previewSection.innerHTML = '<div style="font-size:11px;font-weight:600;color:#4A7C59;margin-bottom:8px;">✅ Mockup đã chọn</div><div style="position:relative;display:inline-block;"><img src="' + selectedUrl + '" style="max-width:200px;max-height:200px;border-radius:8px;border:2px solid #4A7C59;object-fit:contain;background:#F9FAFB;"><button id="mtx-mp-clear" style="position:absolute;top:-8px;right:-8px;width:22px;height:22px;border-radius:50%;background:#E8453C;color:#fff;border:none;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.2);">✕</button></div>';
          var clearBtn = previewSection.querySelector('#mtx-mp-clear');
          if (clearBtn) clearBtn.onclick = function() { selectedUrl = null; updatePreview(); };
        } else {
          previewSection.innerHTML = '<div style="padding:24px;border:2px dashed #D1D5DB;border-radius:8px;color:#9CA3AF;font-size:12px;">Chưa chọn mockup — click vào ảnh bên dưới hoặc chọn trên trang</div>';
        }
      }
      updatePreview();
      body.appendChild(previewSection);

      // Collect product images from page
      var pageImages = [];
      var seen = new Set();
      var imgEls = document.querySelectorAll('img');
      imgEls.forEach(function(img) {
        var src = img.src || img.currentSrc;
        if (!src || src.startsWith('data:') || seen.has(src)) return;
        var w = img.naturalWidth || img.width;
        var h = img.naturalHeight || img.height;
        if (w < 100 || h < 100) return;
        var srcLow = src.toLowerCase();
        if (srcLow.includes('icon') || srcLow.includes('logo') || srcLow.includes('badge') || srcLow.includes('tracking') || srcLow.includes('pixel')) return;
        seen.add(src);
        pageImages.push({ src: src, w: w, h: h });
      });
      pageImages.sort(function(a, b) { return (b.w * b.h) - (a.w * a.h); });

      // Image grid
      if (pageImages.length > 0) {
        var gridLabel = document.createElement('div');
        gridLabel.style.cssText = 'font-size:11px;font-weight:600;color:#6B7280;margin-bottom:8px;';
        gridLabel.textContent = '📷 Ảnh trên trang (' + pageImages.length + ')';
        body.appendChild(gridLabel);

        var grid = document.createElement('div');
        grid.style.cssText = 'display:grid;grid-template-columns:repeat(4, 100px);gap:8px;max-height:260px;overflow-y:auto;padding:4px;';

        pageImages.slice(0, 20).forEach(function(imgData) {
          var item = document.createElement('div');
          item.className = 'mtx-mp-grid-item';
          item.style.cssText = 'position:relative;width:100px;height:100px;border:2px solid ' + (imgData.src === selectedUrl ? '#4A7C59' : '#E5E7EB') + ';border-radius:6px;overflow:hidden;cursor:pointer;transition:border-color .15s;box-sizing:border-box;';
          item.innerHTML = '<img src="' + imgData.src + '" style="width:100%;height:100%;object-fit:contain;display:block;"><div style="position:absolute;bottom:0;left:0;right:0;background:rgba(0,0,0,0.6);color:#fff;font-size:8px;text-align:center;padding:2px;pointer-events:none;">' + imgData.w + '×' + imgData.h + '</div>';
          item.onmouseover = function() { if (imgData.src !== selectedUrl) item.style.borderColor = '#7B1FA2'; };
          item.onmouseout = function() { item.style.borderColor = imgData.src === selectedUrl ? '#4A7C59' : '#E5E7EB'; };
          item.onclick = function() {
            selectedUrl = imgData.src;
            updatePreview();
            grid.querySelectorAll('.mtx-mp-grid-item').forEach(function(d) { d.style.borderColor = '#E5E7EB'; });
            item.style.borderColor = '#4A7C59';
          };
          grid.appendChild(item);
        });
        body.appendChild(grid);
      }

      // Pick from page button
      var pickFromPage = document.createElement('button');
      pickFromPage.style.cssText = 'width:100%;margin-top:12px;padding:10px;background:#FFFBEB;color:#D97706;border:1px solid #FDE68A;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;';
      pickFromPage.textContent = '🎯 Click chọn ảnh trực tiếp trên trang';
      pickFromPage.onclick = function() {
        overlay.style.display = 'none';
        clipNotify('🎯 Click vào ảnh mockup trên trang... (ESC để hủy)', 'info');

        var pickOverlays = [];
        document.querySelectorAll('img').forEach(function(img) {
          var src = img.src || img.currentSrc;
          if (!src || src.startsWith('data:')) return;
          var w = img.naturalWidth || img.width;
          var h = img.naturalHeight || img.height;
          if (w < 80 || h < 80) return;
          var rect = img.getBoundingClientRect();
          if (rect.width < 50 || rect.height < 50) return;

          var ov = document.createElement('div');
          ov.style.cssText = 'position:fixed;left:' + rect.left + 'px;top:' + rect.top + 'px;width:' + rect.width + 'px;height:' + rect.height + 'px;z-index:99999998;border:3px solid transparent;border-radius:4px;cursor:pointer;transition:all .15s;box-sizing:border-box;';
          ov.onmouseover = function() { ov.style.borderColor = '#7B1FA2'; ov.style.background = 'rgba(123,31,162,0.1)'; };
          ov.onmouseout = function() { ov.style.borderColor = 'transparent'; ov.style.background = 'none'; };
          ov.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            selectedUrl = src;
            pickOverlays.forEach(function(o) { o.remove(); });
            overlay.style.display = 'flex';
            updatePreview();
            grid && grid.querySelectorAll('.mtx-mp-grid-item').forEach(function(d) {
              var dImg = d.querySelector('img');
              d.style.borderColor = (dImg && dImg.src === src) ? '#4A7C59' : '#E5E7EB';
            });
          };
          document.body.appendChild(ov);
          pickOverlays.push(ov);
        });

        var cancelPick = function(e) {
          if (e.key === 'Escape') {
            pickOverlays.forEach(function(o) { o.remove(); });
            overlay.style.display = 'flex';
            document.removeEventListener('keydown', cancelPick);
          }
        };
        document.addEventListener('keydown', cancelPick);
      };
      body.appendChild(pickFromPage);

      modal.appendChild(body);

      // Footer buttons
      var footer = document.createElement('div');
      footer.style.cssText = 'padding:14px 20px;border-top:1px solid #E5E7EB;display:flex;gap:10px;justify-content:flex-end;';

      var skipBtn = document.createElement('button');
      skipBtn.style.cssText = 'padding:9px 18px;background:#F3F4F6;color:#555;border:1px solid #D1D5DB;border-radius:7px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;';
      skipBtn.textContent = 'Bỏ qua mockup';
      skipBtn.onclick = function() { overlay.remove(); resolve(null); };

      var confirmBtn = document.createElement('button');
      confirmBtn.style.cssText = 'padding:9px 24px;background:#4A7C59;color:#fff;border:none;border-radius:7px;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;';
      confirmBtn.textContent = '✅ Xác nhận & Sync';
      confirmBtn.onclick = function() { overlay.remove(); resolve(selectedUrl); };

      footer.appendChild(skipBtn);
      footer.appendChild(confirmBtn);
      modal.appendChild(footer);

      overlay.appendChild(modal);

      // Close events
      overlay.querySelector('#mtx-mp-close').onclick = function() { overlay.remove(); resolve(undefined); };
      overlay.onclick = function(e) { if (e.target === overlay) { overlay.remove(); resolve(undefined); } };

      document.body.appendChild(overlay);
    });
  }

  // ---- Sync to Supabase ----
  async function syncClipartData(data) {
    const btn = document.querySelector('#mtx-clip-sync');

    // Step 1: Show mockup picker before syncing
    const mockupUrl = await showMockupPicker(data);
    // undefined = user closed modal (cancel), null = skip mockup, string = selected mockup
    if (mockupUrl === undefined) return;

    if (btn) { btn.disabled = true; btn.textContent = '⏳ Syncing...'; }

    try {
      // Get auth from storage
      const stored = await new Promise(r => chrome.storage.local.get(['matrixtyUser'], r));
      if (!stored.matrixtyUser?.id) throw new Error('Chưa đăng nhập');

      const SUPA_URL = 'https://qhejotdjehgneusqjvhz.supabase.co';
      const SUPA_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoZWpvdGRqZWhnbmV1c3Fqdmh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2NzcyNTEsImV4cCI6MjA4NDI1MzI1MX0.5sbhhZ3VUrRQuRuLo3-o6CDzjbotPLzDGsn3oIjPM_U';
      const hdr = {
        'apikey': SUPA_KEY,
        'Authorization': `Bearer ${SUPA_KEY}`,
        'Content-Type': 'application/json',
        // UPSERT: if same url+scanned_by exists, merge/update instead of failing
        'Prefer': 'return=representation,resolution=merge-duplicates',
      };

      // v9.4.2: Compress + square — fit input image into square canvas, padding = white.
      // Default cap at 500px, JPEG q=0.78. Never upscales (small sources stay small)
      // → output side = min(max-source-dim, maxSide). Matrixty receives crisp images
      // suitable for 2-3× zoom; payload stays under ~1MB for typical 25-option pages.
      // v1.3.6: hardened — crossOrigin, try/catch toDataURL, hard timeout (prevents sync hang
      //   when source is a cross-origin CDN URL that taints the canvas).
      const compressImage = (dataUrl, maxSide = 500, quality = 0.78) => {
        return new Promise(resolve => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          let settled = false;
          const finish = (val) => { if (!settled) { settled = true; resolve(val); } };
          const timer = setTimeout(() => finish(null), 8000);
          img.onload = () => {
            try {
              // Output side = source's bigger side, capped at maxSide (no upscaling)
              const sourceMax = Math.max(img.width, img.height);
              const side = Math.max(1, Math.min(sourceMax, maxSide));
              // Fit image inside side×side preserving aspect, center
              const ratio = Math.min(side / img.width, side / img.height, 1);
              const drawW = Math.max(1, Math.round(img.width * ratio));
              const drawH = Math.max(1, Math.round(img.height * ratio));
              const drawX = Math.round((side - drawW) / 2);
              const drawY = Math.round((side - drawH) / 2);
              const c = document.createElement('canvas');
              c.width = side; c.height = side;
              const ctx = c.getContext('2d');
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, side, side);
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(img, drawX, drawY, drawW, drawH);
              clearTimeout(timer);
              finish(c.toDataURL('image/jpeg', quality));
            } catch (e) {
              clearTimeout(timer);
              finish(null);
            }
          };
          img.onerror = () => { clearTimeout(timer); finish(null); };
          img.src = dataUrl;
        });
      };

      // v9.5: Helper — fetch CDN image via background (bypasses CORS) so canvas isn't tainted
      // v1.3.6: hard timeout 10s so a slow/dead background never freezes the sync.
      const fetchAsDataUrl = (url) => new Promise(resolve => {
        let settled = false;
        const finish = (val) => { if (!settled) { settled = true; resolve(val); } };
        const timer = setTimeout(() => finish(null), 10000);
        try {
          chrome.runtime.sendMessage({ type: 'FETCH_AS_DATAURL', url }, resp => {
            clearTimeout(timer);
            if (chrome.runtime.lastError) { finish(null); return; }
            finish(resp && resp.dataUrl ? resp.dataUrl : null);
          });
        } catch(e) { clearTimeout(timer); finish(null); }
      });

      const cleanCats = [];
      for (let ci = 0; ci < data.categories.length; ci++) {
        const cat = data.categories[ci];
        // v9.5: Output resolution scales with user's per-group zoom level.
        //   1.0× → 500px, 2.0× → 800px, 3.0× → 1000px (capped to keep payload reasonable)
        const groupScale = (data._thumbScales && data._thumbScales[ci]) || 1.0;
        const targetSide = Math.min(1000, Math.round(500 * Math.max(0.5, groupScale)));
        // For zoom > 1×, prefer the original CDN URL (often 500-1500px) over the
        // rendered screenshot (limited by element's display size on page, typically 50-100px).
        const useCdn = groupScale > 1.0;
        const cleanOpts = [];
        for (const opt of cat.options) {
          const clean = { ...opt };
          let source = null;
          // v1.3.6: prefer capturedImage (already a safe data URL). When only a
          // remote imageUrl is available, always go through background to dodge
          // CORS — previously this only ran when useCdn=true (zoom>1×), so at
          // default zoom a cross-origin URL tainted the canvas and stalled sync.
          if (useCdn && clean.imageUrl) {
            source = await fetchAsDataUrl(clean.imageUrl);
          }
          if (!source && clean.capturedImage) source = clean.capturedImage;
          if (!source && clean.imageUrl) source = await fetchAsDataUrl(clean.imageUrl);
          if (!source) source = clean.imageUrl || null;
          if (source) {
            try {
              const compressed = await compressImage(source, targetSide);
              if (compressed) clean.capturedImage = compressed;
            } catch { /* keep original on error */ }
          }
          cleanOpts.push(clean);
        }
        cleanCats.push({ ...cat, options: cleanOpts, _syncScale: groupScale, _syncSide: targetSide });
      }

      // ── Check if URL already scanned → merge variant mới vào bản cũ ──
      const normalSlug = data.url.split('?')[0].split('/').pop();
      const checkRes = await fetch(
        `${SUPA_URL}/rest/v1/clipart_scans?url=like.*${encodeURIComponent(normalSlug)}*&order=scanned_at.desc&limit=1`,
        { headers: { 'apikey': SUPA_KEY, 'Authorization': `Bearer ${SUPA_KEY}` } }
      );
      const existing = checkRes.ok ? await checkRes.json() : [];

      // Link to Clipart Studio task if available
      const taskStorage = await new Promise(r => chrome.storage.local.get(['studioActiveTaskId'], r));

      if (existing.length > 0) {
        // ── v8.2.0: FULL REPLACE — panel data is source of truth ──
        // Previous "smart merge" logic caused issues:
        //   1. Duplicate category names → one gets overwritten → missing groups
        //   2. Panel order changes (drag/drop) not reflected in DB (old order preserved)
        //   3. Deleted groups from panel not removed from DB (old groups lingered)
        // Since the panel contains ALL categories (user edits panel → syncs),
        // we replace categories entirely with cleanCats.
        const old = existing[0];
        const oldCatCount = (old.categories || []).length;

        const patchPayload = {
          categories: cleanCats,
          scanned_at: data.scannedAt,
          updated_at: new Date().toISOString(),
        };
        if (mockupUrl) patchPayload.mockup_image_url = mockupUrl;
        if (taskStorage.studioActiveTaskId) patchPayload.studio_task_id = taskStorage.studioActiveTaskId;

        const patchRes = await fetch(`${SUPA_URL}/rest/v1/clipart_scans?id=eq.${old.id}`, {
          method: 'PATCH',
          headers: hdr,
          body: JSON.stringify(patchPayload),
        });
        if (!patchRes.ok) throw new Error('Sync failed: ' + await patchRes.text());

        const newCount = cleanCats.length;
        clipNotify(`✅ Đã sync! ${newCount} nhóm`, 'success');
        if (btn) { btn.textContent = '✅ Sync +' + newCount; btn.style.background = '#2563EB'; }
      } else {
        // ── NEW: tạo bản mới ──
        const payload = {
          url: data.url,
          title: data.title,
          platform: data.platform,
          scanned_at: data.scannedAt,
          scanned_by: stored.matrixtyUser.id,
          categories: cleanCats,
          status: 'pending',
        };
        if (mockupUrl) payload.mockup_image_url = mockupUrl;
        if (taskStorage.studioActiveTaskId) payload.studio_task_id = taskStorage.studioActiveTaskId;

        const res = await fetch(`${SUPA_URL}/rest/v1/clipart_scans?on_conflict=url,scanned_by`, {
          method: 'POST',
          headers: hdr,
          body: JSON.stringify(payload),
        });
        if (!res.ok) throw new Error('Sync failed: ' + await res.text());

        clipNotify('✅ Đã sync về Matrixty!' + (mockupUrl ? ' (kèm mockup)' : ''), 'success');
        if (btn) { btn.textContent = '✅ Đã sync'; btn.style.background = '#4A7C59'; }
      }
    } catch(err) {
      clipNotify('❌ ' + err.message, 'error');
      if (btn) { btn.disabled = false; btn.textContent = '⬆️ Sync về Matrixty'; }
    }
  }

  // ---- v8.0.9: Manual Scan — open empty panel immediately, user adds clipart via Pick ----
  function startManualScan() {
    // Create empty result data
    var emptyData = {
      url: window.location.href,
      title: document.title,
      platform: (window.Shopify || document.querySelector('[data-shopify]')) ? 'shopify' : window.location.hostname.includes('etsy') ? 'etsy' : 'custom',
      scannedAt: new Date().toISOString(),
      categories: [],
    };
    CLIPART.categories = [];
    CLIPART.capturedData = emptyData;
    CLIPART.isScanning = false;

    // Show panel immediately (empty, with Pick buttons ready)
    showClipartPanel(emptyData);
    clipNotify('Manual mode — dùng Pick hoặc Screenshot để thêm clipart', 'info');
  }

  // ---- v8.0.9: Scan mode selector popup ----
  function showScanModePopup() {
    // Remove existing popup
    var old = document.getElementById('mtx-scan-mode-popup');
    if (old) { old.remove(); return; }

    var popup = document.createElement('div');
    popup.id = 'mtx-scan-mode-popup';
    popup.style.cssText = 'position:fixed;bottom:98px;left:16px;z-index:999999;background:#fff;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.18);padding:8px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;min-width:200px;animation:mtxPopUp .2s ease;';

    // Add animation
    if (!document.getElementById('mtx-popup-anim')) {
      var animStyle = document.createElement('style');
      animStyle.id = 'mtx-popup-anim';
      animStyle.textContent = '@keyframes mtxPopUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}';
      document.head.appendChild(animStyle);
    }

    var btnStyle = 'display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;border:none;background:none;border-radius:8px;cursor:pointer;font-family:inherit;font-size:13px;text-align:left;color:#333;transition:background .15s;';

    // Auto Scan button
    var autoBtn = document.createElement('button');
    autoBtn.style.cssText = btnStyle;
    autoBtn.innerHTML = '<span style="font-size:20px;">🔍</span><div><div style="font-weight:700;">Auto Scan</div><div style="font-size:11px;color:#6B7280;margin-top:1px;">Tự quét toàn bộ clipart</div></div>';
    autoBtn.onmouseover = function() { autoBtn.style.background = '#F0FDF4'; };
    autoBtn.onmouseout = function() { autoBtn.style.background = 'none'; };
    autoBtn.onclick = function() { popup.remove(); scanCliparts(); };

    // Manual Scan button
    var manualBtn = document.createElement('button');
    manualBtn.style.cssText = btnStyle;
    manualBtn.innerHTML = '<span style="font-size:20px;">✋</span><div><div style="font-weight:700;">Manual Scan</div><div style="font-size:11px;color:#6B7280;margin-top:1px;">Mở panel trống, tự pick clipart</div></div>';
    manualBtn.onmouseover = function() { manualBtn.style.background = '#FFFBEB'; };
    manualBtn.onmouseout = function() { manualBtn.style.background = 'none'; };
    manualBtn.onclick = function() { popup.remove(); startManualScan(); };

    // Divider
    var divider = document.createElement('div');
    divider.style.cssText = 'height:1px;background:#E5E7EB;margin:4px 0;';

    popup.appendChild(autoBtn);
    popup.appendChild(divider);
    popup.appendChild(manualBtn);
    document.body.appendChild(popup);

    // Close popup when clicking outside
    setTimeout(function() {
      function closePopup(e) {
        if (!popup.contains(e.target) && e.target.id !== 'mtx-clip-fab') {
          popup.remove();
          document.removeEventListener('click', closePopup, true);
        }
      }
      document.addEventListener('click', closePopup, true);
    }, 100);
  }

  // ---- Add clipart button to page ----
  function addClipartFAB() {
    if (document.getElementById('mtx-clip-fab')) return;
    const fab = document.createElement('div');
    fab.id = 'mtx-clip-fab';
    fab.innerHTML = '🏷️';
    fab.title = 'Matrixty - Scan Clipart (Alt+C = Auto, Alt+M = Manual)';
    fab.style.cssText = 'position:fixed;bottom:56px;left:16px;z-index:999998;width:36px;height:36px;border-radius:8px;background:#4A7C59;display:flex;align-items:center;justify-content:center;font-size:18px;cursor:pointer;box-shadow:0 2px 8px rgba(74,124,89,0.4);transition:all .2s;opacity:0.7;';
    fab.onmouseover = () => { fab.style.opacity = '1'; fab.style.transform = 'scale(1.1)'; };
    fab.onmouseout = () => { fab.style.opacity = '0.7'; fab.style.transform = 'scale(1)'; };
    fab.onclick = () => showScanModePopup();
    document.body.appendChild(fab);
  }

  // Hotkey Alt+C for auto scan, Alt+Shift+C for manual scan
  document.addEventListener('keydown', (e) => {
    if (e.altKey && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      if (e.shiftKey) startManualScan();
      else scanCliparts();
    }
  });

  // Export
  window.__matrixtyClipart = {
    scan: scanCliparts,
    manualScan: startManualScan,
    getState: () => ({
      isScanning: CLIPART.isScanning,
      hasScan: !!CLIPART.capturedData,
      categoryCount: CLIPART.categories.length,
    }),
  };

  // Init: show FAB on product pages
  function initClipart() {
    // Show FAB if page has customization options (Customily, Shopify standard, or generic)
    // v9.3: Added .swatch-container, .option_name (homacus.com et al.)
    const hasOptions = document.querySelector(
      '.ant-form-item, .product-form__input, .swatch, fieldset:has(input[type="radio"]), [data-option-index], .personalized-options-header, [class*="customily"], .personalization-form, .by-image-swatch__container, .by-customization-form__label, [class*="customization-form_element"], [class*="customization-form__element"], .swatch-container, .option_name, [class*="option_name"], .cl-accordion'
    );
    // v8.0.9: Also detect unknown-framework product pages (pawfecthouse etc.)
    // Check if page is a product page with "Choose"/"Select" labels
    var isProductPage = window.location.pathname.includes('/products/') || document.querySelector('[class*="product"]');
    var hasChooseLabels = false;
    if (!hasOptions && isProductPage) {
      var bodyText = document.body?.innerText || '';
      hasChooseLabels = /choose\s+(number|background|color|gender|clothes|style|design)/i.test(bodyText);
    }
    if (hasOptions || hasChooseLabels) {
      addClipartFAB();
      console.log('[Matrixty Clipart] Scanner ready (Alt+C)', hasOptions ? '(known framework)' : '(unknown framework, deep scan)');
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initClipart);
  else setTimeout(initClipart, 1000); // Delay for JS-rendered pages

  } catch(e) { console.error('[Matrixty Clipart] FATAL INIT ERROR:', e); }
})();
