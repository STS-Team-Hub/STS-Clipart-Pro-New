(function(){
  var reg = window.STSManualProfiles;
  if (!reg) return;

  function clean(v){
    return String(v || '')
      .replace(/\s*\*\s*/g, ' ')
      .replace(/\bRequired\b/gi, ' ')
      .replace(/\(\s*\d+\s*\|\s*\d+\s*\)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
  function propName(v){
    var m = String(v || '').match(/properties\[(.+?)\]/i);
    return clean(m ? m[1] : v);
  }
  function visible(el){
    if (!el) return false;
    if (el.hidden || (el.getAttribute && el.getAttribute('aria-hidden') === 'true')) return false;
    try {
      var s = getComputedStyle(el);
      if (s && (s.display === 'none' || s.visibility === 'hidden' || parseFloat(s.opacity || '1') <= 0)) return false;
    } catch(e) {}
    try {
      var r = el.getBoundingClientRect && el.getBoundingClientRect();
      if (r && r.width === 0 && r.height === 0) return false;
    } catch(e2) {}
    return true;
  }
  function imageFrom(item){
    var img = item && item.querySelector && item.querySelector('img');
    if (img) return img.currentSrc || img.src || img.getAttribute('data-src') || img.getAttribute('src') || '';
    var label = item && item.querySelector && item.querySelector('label');
    var style = String((label && label.getAttribute && label.getAttribute('style')) || (item && item.getAttribute && item.getAttribute('style')) || '');
    var m = style.match(/--sl-image:\s*url\(([^)]+)\)/i) || style.match(/background-image:\s*url\(([^)]+)\)/i);
    return m && m[1] ? m[1].replace(/^['"]|['"]$/g, '') : '';
  }

  var profile = {
    key: 'geckocustom',
    matchHost: function(host){
      host = String(host || '').toLowerCase();
      return host === 'geckocustom.com' || host.endsWith('.geckocustom.com');
    },
    getRoot: function(){
      return document.querySelector('#customily-options, #cl_optionsapp, .customily-options-wrapper, #global-option-set');
    },
    getGroups: function(){
      var root = this.getRoot();
      if (!root) return [];
      return Array.from(root.querySelectorAll('.sl-option-set-item, .customily_option')).filter(function(group){
        return visible(group) && !!(group.querySelector('.sl-option-set-item_label, .option_name')) && group.querySelectorAll('.sl-swatch-item, .customily-swatch, input[type="text"], textarea').length > 0;
      });
    },
    getTitle: function(group){
      return group && group.querySelector('.sl-option-set-item_label, .option_name');
    },
    getItems: function(group){
      return Array.from((group && group.querySelectorAll('.sl-swatch-item, .customily-swatch, input[type="text"], textarea')) || []).filter(visible);
    },
    extractValue: function(item){
      if (!item) return '';
      var input = item.matches && item.matches('input, textarea') ? item : item.querySelector && item.querySelector('input, textarea');
      var label = item.querySelector && item.querySelector('label');
      var img = item.querySelector && item.querySelector('img');
      return clean(
        (label && (label.getAttribute('data-title') || label.getAttribute('title') || label.textContent)) ||
        (img && img.getAttribute('alt')) ||
        (input && (input.value || input.getAttribute('value') || input.getAttribute('placeholder') || propName(input.getAttribute('name')))) ||
        imageFrom(item) ||
        item.textContent ||
        ''
      );
    },
    cleanupTitle: clean,
    cleanupValue: clean
  };

  reg.register(profile);
})();
