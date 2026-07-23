(function() {
  'use strict';
  var ns = window.STSClipartScanner = window.STSClipartScanner || {};

  function normalizeCollectorText(v) {
    var schema = ns.schema;
    if (schema && typeof schema.normalizeText === 'function') return schema.normalizeText(v);
    if (schema && typeof schema.normScanText === 'function') return schema.normScanText(v);
    return String(v || '').replace(/\s+/g, ' ').replace(/\s*\*\s*$/, '').trim();
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
    if (!hasImg && !bgColor && !text) return null;
    return { element: sw, rect: { x: r.x, y: r.y, w: r.width, h: r.height }, imageUrl: imgSrc || null, bgColor: bgColor || null, textContent: text || '', isSelected: false, capturedImage: imgSrc || null };
  }

  function collectOptionsInRegion(region) {
    var opts = [];
    var SWATCH_SELS = '.by-image-swatch__swatch, [class*="swatch__swatch"], [class*="image-swatch__swatch"], [class*="swatch-item"], [class*="option-item"], [class*="tib-item"], [class*="color-swatch"], [class*="color-option"]';
    document.querySelectorAll(SWATCH_SELS).forEach(function(sw) {
      var r = sw.getBoundingClientRect();
      if (r.width < 10 || r.height < 10) return;
      var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
      if (cx < region.left || cx > region.right || cy < region.top || cy > region.bottom) return;
      var o = makeOptionFromSwatch(sw);
      if (o) opts.push(o);
    });

    if (opts.length < 2) {
      document.querySelectorAll('.customall-grid').forEach(function(grid) {
        for (var k = 0; k < grid.children.length; k++) {
          var kid = grid.children[k];
          var r = kid.getBoundingClientRect();
          if (r.width < 15 || r.height < 15) continue;
          var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          if (cx < region.left || cx > region.right || cy < region.top || cy > region.bottom) continue;
          var kidImg = kid.querySelector('img');
          var imgUrl = kidImg ? (kidImg.src || kidImg.dataset.src || '') : '';
          var bgEl = kid.querySelector('[style*="background"]') || kid;
          var st = bgEl.getAttribute('style') || '';
          var bgColor = '';
          var mColor = st.match(/background-color:\s*([^;]+)/);
          if (mColor) bgColor = mColor[1].trim();
          var bgImage = '';
          var mImg = st.match(/background-image:\s*url\(['"]?([^'")\s]+)['"]?\)/);
          if (mImg) bgImage = mImg[1];
          if (!mImg && kidImg) bgImage = '';
          if (!bgImage && !imgUrl && !bgColor) {
            var cs = window.getComputedStyle(bgEl);
            var csBg = cs.backgroundImage;
            if (csBg && csBg !== 'none') {
              var mCsBg = csBg.match(/url\(['"]?([^'")\s]+)['"]?\)/);
              if (mCsBg) bgImage = mCsBg[1];
            }
          }
          if (imgUrl || bgColor || bgImage) {
            opts.push({ element: kid, rect: { x: r.x, y: r.y, w: r.width, h: r.height }, imageUrl: imgUrl || bgImage || null, bgColor: bgColor || null, textContent: (kid.textContent || '').trim(), isSelected: false, capturedImage: imgUrl || bgImage || null });
          }
        }
      });
    }

    if (opts.length < 2) {
      document.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(function(input) {
        var label = input.closest('label') || (input.id ? document.querySelector('label[for="' + input.id + '"]') : null);
        var target = label || input.parentElement;
        if (!target) return;
        var r = target.getBoundingClientRect();
        if (r.width < 15 || r.height < 15) return;
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        if (cx < region.left || cx > region.right || cy < region.top || cy > region.bottom) return;
        if (opts.some(function(o) { return o.element === target; })) return;
        var img = target.querySelector('img');
        var imgUrl = img ? (img.src || '') : '';
        var bgColor = '';
        var text = (target.textContent || '').trim().replace(/\s+/g, ' ');
        var bgImage = '';
        var bgTarget = target.querySelector('[style*="background"]') || target;
        var stBg = bgTarget.getAttribute('style') || '';
        var mBgImg = stBg.match(/background-image:\s*url\(['"]?([^'")\s]+)['"]?\)/);
        if (mBgImg) bgImage = mBgImg[1];
        if (!bgImage) {
          var cs = window.getComputedStyle(bgTarget);
          var csBgI = cs.backgroundImage;
          if (csBgI && csBgI !== 'none') { var m2 = csBgI.match(/url\(['"]?([^'")\s]+)['"]?\)/); if (m2) bgImage = m2[1]; }
          if (!bgColor) { var csBgC = cs.backgroundColor; if (csBgC && csBgC !== 'rgba(0, 0, 0, 0)' && csBgC !== 'transparent') bgColor = csBgC; }
        }
        if (imgUrl || bgColor || bgImage || text) {
          opts.push({ element: target, rect: { x: r.x, y: r.y, w: r.width, h: r.height }, imageUrl: imgUrl || bgImage || null, bgColor: bgColor || null, textContent: text || '', isSelected: input.checked, capturedImage: imgUrl || bgImage || null });
        }
      });
    }

    if (opts.length < 2) {
      var imgSeen = new Set();
      var candidateImgs = [];
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
        if (img.closest(MOCKUP_ANCESTORS)) return;
        var srcLower = img.src.toLowerCase();
        if (/\/products\/|\/mockup|\/product-image|\/hero[_-]|lifestyle/i.test(srcLower)) return;
        candidateImgs.push({ img: img, r: r, area: r.width * r.height });
      });

      if (candidateImgs.length > 3) {
        var areas = candidateImgs.map(function(c) { return c.area; }).sort(function(a, b) { return a - b; });
        var medianArea = areas[Math.floor(areas.length / 2)];
        candidateImgs = candidateImgs.filter(function(c) {
          return c.area <= medianArea * 4;
        });
      }

      candidateImgs.forEach(function(c) {
        var wr = c.img.parentElement ? c.img.parentElement.getBoundingClientRect() : c.r;
        opts.push({ element: c.img.parentElement || c.img, rect: { x: wr.x, y: wr.y, w: wr.width, h: wr.height }, imageUrl: c.img.src, bgColor: null, textContent: c.img.alt || '', isSelected: false, capturedImage: c.img.src });
      });
    }

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

    if (opts.length < 2) {
      document.querySelectorAll('div, span, li, a').forEach(function(el) {
        var r = el.getBoundingClientRect();
        if (r.width < 20 || r.height < 20 || r.width > 150 || r.height > 150) return;
        var ratio = r.width / r.height;
        if (ratio < 0.5 || ratio > 2) return;
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        if (cx < region.left || cx > region.right || cy < region.top || cy > region.bottom) return;
        if (opts.some(function(o) { return o.element === el; })) return;
        var cs = window.getComputedStyle(el);
        var bgImg = cs.backgroundImage;
        if (!bgImg || bgImg === 'none') return;
        var mBg2 = bgImg.match(/url\(['"]?([^'")\s]+)['"]?\)/);
        if (!mBg2) return;
        if (mBg2[1].startsWith('data:image/svg')) return;
        opts.push({ element: el, rect: { x: r.x, y: r.y, w: r.width, h: r.height }, imageUrl: mBg2[1], bgColor: null, textContent: (el.textContent || '').trim(), isSelected: false, capturedImage: mBg2[1] });
      });
    }

    if (opts.length < 2) {
      document.querySelectorAll('select').forEach(function(sel) {
        var r = sel.getBoundingClientRect();
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        if (cx < region.left || cx > region.right || cy < region.top || cy > region.bottom) return;
        sel.querySelectorAll('option').forEach(function(optEl) {
          var text = optEl.textContent.trim();
          var val = optEl.value;
          if (!text || val === '' || text.toLowerCase().startsWith('select') || text.toLowerCase().startsWith('choose') || text.toLowerCase().startsWith('--- ') || text.toLowerCase().startsWith('-- ')) return;
          opts.push({ element: optEl, rect: r, imageUrl: null, bgColor: null, textContent: text, isSelected: optEl.selected, capturedImage: null });
        });
      });
    }

    console.log('[STS Clipart Pro 8.3 Screenshot] Region:', JSON.stringify(region), 'Found:', opts.length, 'options');
    return opts;
  }

  function collectOptionsInContainer(container) {
    var opts = [];
    var seen = new Set();
    var junkTextPattern = /^(select|choose|add|submit|continue|preview|image|thumbnail)$/i;
    var junkClassPattern = /(container|wrapper|layout|panel|form|group|section|row|col)/i;
    var controlSelector = [
      'button:not([type="submit"])',
      '[role="button"]',
      '[role="radio"]',
      '[role="option"]',
      '[data-value]',
      '[data-label]',
      '[data-title]',
      '[class*="option-value"]',
      '[class*="option-btn"]',
      '.ant-radio-button-wrapper',
      '.ant-radio-wrapper',
      '.ant-segmented-item',
      '.ant-segmented-item-label',
      '[class*="radio-button"]',
      '[class*="radio-wrapper"]',
      '[class*="choice"]',
      '[class*="variant"]',
      '[class*="value"]',
      '[style*="cursor: pointer"]',
      '[style*="cursor:pointer"]'
    ].join(',');

    function pushOpt(opt) {
      if (!opt) return;
      var text = (opt.textContent || '').trim();
      if (text && junkTextPattern.test(text)) return;
      var key = [text, opt.imageUrl || '', opt.bgColor || '', (opt.value || ''), (opt.name || '')].join('|');
      if (seen.has(key)) return;
      seen.add(key);
      opts.push(opt);
    }

    function evaluateControlCandidate(el) {
      if (!el) return false;
      if (el.tagName === 'BUTTON' && String(el.type || '').toLowerCase() === 'submit') return false;
      var className = String(el.className || '');
      if (junkClassPattern.test(className) && !/(radio|choice|variant|value|option|segmented|swatch)/i.test(className)) return false;
      var text = normalizeCollectorText(
        el.getAttribute && (
          el.getAttribute('data-label') ||
          el.getAttribute('data-title') ||
          el.getAttribute('aria-label') ||
          el.getAttribute('title') ||
          el.getAttribute('data-value')
        ) ||
        el.textContent || ''
      );
      if (text && junkTextPattern.test(text)) return false;
      var value = normalizeCollectorText((el.getAttribute && (el.getAttribute('data-value') || el.getAttribute('value'))) || text || '');
      var name = normalizeCollectorText((el.getAttribute && el.getAttribute('name')) || value || text || '');
      var img = el.querySelector && el.querySelector('img');
      var imageUrl = img && img.src ? img.src : null;
      var cs = getComputedStyle(el);
      var bg = el.style && el.style.backgroundColor ? el.style.backgroundColor : (cs.backgroundColor || '');
      var bgImage = (cs && cs.backgroundImage && cs.backgroundImage !== 'none') ? cs.backgroundImage : '';
      if (bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent') bg = '';
      if (!bg && bgImage) bg = bgImage;
      if (!(text || value || name || imageUrl || bg)) return false;
      var r = el.getBoundingClientRect();
      if (r.width > 1200 || r.height > 500) return false;
      pushOpt({ element: el, rect: { x: r.x, y: r.y, w: r.width, h: r.height }, imageUrl: imageUrl, bgColor: bg || null, textContent: text, value: value, name: name, isSelected: false, capturedImage: imageUrl });
      return true;
    }

    container.querySelectorAll('.by-image-swatch__swatch, [class*="swatch__swatch"], [class*="swatch-item"], [class*="option-item"], [class*="tib-item"]').forEach(function(sw) {
      var o = makeOptionFromSwatch(sw);
      if (o) pushOpt(o);
    });
    var rootMatched = false;
    if (container.matches && container.matches(controlSelector)) {
      rootMatched = evaluateControlCandidate(container);
    }
    if (typeof window !== 'undefined' && window.__STS_CLIPART_DEBUG_MANUAL_PICK) {
      console.log('[STS ManualPick Debug] collectOptionsInContainer root candidate match:', !!rootMatched);
    }
    container.querySelectorAll(controlSelector).forEach(function(el) {
      evaluateControlCandidate(el);
    });

    container.querySelectorAll('label[for]').forEach(function(lb) {
      var text = normalizeCollectorText(lb.textContent || lb.getAttribute('data-label') || '');
      if (!text) return;
      var r = lb.getBoundingClientRect();
      pushOpt({ rect: { x: r.x, y: r.y, w: r.width, h: r.height }, imageUrl: null, bgColor: null, textContent: text, value: text, name: text, isSelected: false, capturedImage: null });
    });

    container.querySelectorAll('input[type="radio"], input[type="checkbox"]').forEach(function(input) {
      var next = input.nextElementSibling;
      if (!next || next.tagName !== 'LABEL') return;
      var text = normalizeCollectorText(next.textContent || '');
      if (!text) return;
      var r = next.getBoundingClientRect();
      pushOpt({ rect: { x: r.x, y: r.y, w: r.width, h: r.height }, imageUrl: null, bgColor: null, textContent: text, value: input.value || text, name: input.name || text, isSelected: !!input.checked, capturedImage: null });
    });

    if (opts.length < 1) {
      var imgSeen = new Set();
      container.querySelectorAll('img').forEach(function(img) {
        if (!img.src || img.src.startsWith('data:image/svg') || img.naturalWidth < 2) return;
        if (imgSeen.has(img.src)) return;
        imgSeen.add(img.src);
        var r = img.getBoundingClientRect();
        if (r.width < 10 || r.height < 10 || r.width > 300) return;
        var wr = img.parentElement ? img.parentElement.getBoundingClientRect() : r;
        pushOpt({ rect: { x: wr.x, y: wr.y, w: wr.width, h: wr.height }, imageUrl: img.src, bgColor: null, textContent: img.alt || '', isSelected: false, capturedImage: img.src });
      });
    }
    if (opts.length < 1) {
      var grid = container.querySelector('.customall-grid');
      if (grid) {
        for (var k = 0; k < grid.children.length; k++) {
          var kid = grid.children[k]; var r = kid.getBoundingClientRect();
          if (r.width < 15 || r.height < 15) continue;
          var bgEl = kid.querySelector('[style*="background"]') || kid;
          var st = bgEl.getAttribute('style') || '';
          var m = st.match(/background-color:\s*([^;]+)/);
          if (m) pushOpt({ rect: { x: r.x, y: r.y, w: r.width, h: r.height }, imageUrl: null, bgColor: m[1].trim(), textContent: '', isSelected: false, capturedImage: null });
        }
      }
    }
    if (opts.length < 1) {
      container.querySelectorAll('[style*="background-color"], [class*="color-swatch"], [class*="color-option"]').forEach(function(sw) {
        var r = sw.getBoundingClientRect();
        if (r.width < 15 || r.height < 15 || r.width > 100) return;
        var bg = sw.style.backgroundColor || getComputedStyle(sw).backgroundColor;
        if (!bg || bg === 'rgba(0, 0, 0, 0)' || bg === 'transparent' || bg === 'rgb(255, 255, 255)') return;
        pushOpt({ rect: { x: r.x, y: r.y, w: r.width, h: r.height }, imageUrl: null, bgColor: bg, textContent: sw.textContent?.trim() || '', isSelected: false, capturedImage: null });
      });
    }
    if (opts.length < 1) {
      container.querySelectorAll('select').forEach(function(sel) {
        var r = sel.getBoundingClientRect();
        sel.querySelectorAll('option').forEach(function(optEl) {
          var text = optEl.textContent.trim();
          var val = optEl.value;
          if (!text || val === '' || text.toLowerCase().startsWith('select') || text.toLowerCase().startsWith('choose') || text.toLowerCase().startsWith('--- ') || text.toLowerCase().startsWith('-- ')) return;
          pushOpt({ rect: r, imageUrl: null, bgColor: null, textContent: text, value: val, name: sel.name || text, isSelected: optEl.selected, capturedImage: null });
        });
      });
    }
    return opts;
  }


  function detectNearestGroupTitleFromOption(optionEl) {
    if (!optionEl || !optionEl.closest) return '';
    var container = optionEl.closest('.by-customization-form__element, .by-customization-form_element, [class*="customization-form__element"], [class*="customization-form_element"], .ant-form-item, .product-form__input, fieldset, .tib-field, [class*="tib-option"], [class*="option-group"], [class*="option-wrap"], [class*="personalization-option"], .form-group, .product-option, [class*="product-option"]');
    if (!container) return '';
    var titleEl = container.querySelector('.ant-form-item-label label, .by-customization-form__label, [class*="form__label"], [class*="option-label"], [class*="field-label"], .tib-label, label, legend, h3, h4, h5, strong');
    var title = normalizeCollectorText(titleEl ? (titleEl.getAttribute('title') || titleEl.textContent) : '');
    if (!title || /^(option|select|choose|group|item|title)$/i.test(title)) return '';
    return title;
  }

  ns.collectors = Object.assign({}, ns.collectors || {}, {
    collectOptionsInContainer: collectOptionsInContainer,
    collectOptionsInRegion: collectOptionsInRegion,
    detectNearestGroupTitleFromOption: detectNearestGroupTitleFromOption
  });
})();
