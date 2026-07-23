(function(){
  window.STSClipartScanner = window.STSClipartScanner || {};
  var ns = window.STSClipartScanner;
  ns.modules = ns.modules || {};

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
        body = '<path d="M20 11a8 8 0 0 0-14.4-4.7"/><path d="M4 4v5h5"/><path d="M4 13a8 8 0 0 0 14.4 4.7"/><path d="M20 20v-5h-5"/>';
        break;
      case 'render':
        body = '<rect x="3.5" y="4.5" width="17" height="15" rx="3"/><path d="M7 15l2.6-2.6a1.5 1.5 0 0 1 2.1 0l1.3 1.3"/><path d="M12.8 14.1l1.5-1.5a1.5 1.5 0 0 1 2.1 0L19 15.2"/><circle cx="9" cy="9" r="1.2"/>';
        break;
      case 'all':
        body = '<rect x="4" y="4" width="5" height="5" rx="1.2"/><rect x="4" y="15" width="5" height="5" rx="1.2"/><rect x="15" y="4" width="5" height="5" rx="1.2"/><path d="M17.5 13v8"/><path d="M13.5 17h8"/>';
        break;
      case 'reset':
        body = '<path d="M9 7 5 11l4 4"/><path d="M5 11h9a5 5 0 1 1 0 10h-1"/>';
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
    return '<span style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;width:100%;min-width:0;white-space:nowrap;line-height:1.1;">' +
      '<span style="display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;flex:0 0 20px;line-height:1;">' +
      stsUiIcon(iconName, 18, iconColor || 'currentColor') +
      '</span><span style="display:block;max-width:100%;font-size:10px;line-height:1.1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + stsEscAttr(label) + '</span></span>';
  }

  ns.render = ns.render || {};
  ns.render.stsEscAttr = stsEscAttr;
  ns.render.stsUiIcon = stsUiIcon;
  ns.render.stsButtonHtml = stsButtonHtml;

  ns.modules['render'] = {
    name: 'render',
    stsEscAttr: stsEscAttr,
    stsUiIcon: stsUiIcon,
    stsButtonHtml: stsButtonHtml
  };
})();
