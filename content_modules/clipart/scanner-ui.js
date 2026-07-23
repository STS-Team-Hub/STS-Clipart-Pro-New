(function(){
  window.STSClipartScanner = window.STSClipartScanner || {};
  var ns = window.STSClipartScanner;
  ns.modules = ns.modules || {};

  function showProgress(percent, text) {
    var bar = document.getElementById('sts-clip-progress');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'sts-clip-progress';
      bar.style.cssText = 'position:fixed;top:0;left:0;right:0;z-index:99999999;height:36px;background:#FFFFFF;border-bottom:1px solid #E5E7EB;display:flex;align-items:center;padding:0 16px;gap:10px;--sts-font:Inter,"Segoe UI",sans-serif;font-family:var(--sts-font);font-size:12px;color:#333;';
      document.body.appendChild(bar);
    }
    bar.innerHTML = '<span style="font-weight:700;color:#2563EB;">🏷️</span><div style="flex:1;height:6px;background:#E5E7EB;border-radius:3px;overflow:hidden;"><div style="width:' + percent + '%;height:100%;background:linear-gradient(90deg,#1565C0,#2F7D57);border-radius:3px;transition:width 0.3s;"></div></div><span style="min-width:36px;text-align:right;font-weight:700;color:#2563EB;">' + percent + '%</span><span style="color:#64748B;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + text + '</span>';
    if (percent >= 100) setTimeout(function(){ bar.remove(); }, 2000);
  }

  function clearProgress() {
    var bar = document.getElementById('sts-clip-progress');
    if (bar) bar.remove();
  }

  function clipNotify(msg, type) {
    var old = document.getElementById('sts-clip-notif');
    if (old) old.remove();
    var colors = { success: '#2F7D57', error: '#E8453C', warning: '#E65100', info: '#1565C0' };
    var n = document.createElement('div');
    n.id = 'sts-clip-notif';
    var pickActive = !!document.getElementById('sts-pick-wrapper');
    var topPos = pickActive ? '52px' : '16px';
    n.style.cssText = 'position:fixed;top:' + topPos + ';left:50%;transform:translateX(-50%);z-index:2147483647;background:' + (colors[type] || colors.info) + ';color:#fff;padding:10px 20px;border-radius:8px;--sts-font:Inter,"Segoe UI",sans-serif;font-family:var(--sts-font);font-size:13px;font-weight:600;box-shadow:0 4px 16px rgba(0,0,0,0.3);pointer-events:none;animation:stsSlide .3s ease;';
    n.textContent = msg;
    document.body.appendChild(n);
    setTimeout(function(){ n.remove(); }, 3500);
  }


  function showScanModePopup(actions) {
    actions = actions || {};
    var old = document.getElementById('sts-scan-mode-popup');
    if (old) { old.remove(); return; }

    var popup = document.createElement('div');
    popup.id = 'sts-scan-mode-popup';
    popup.style.cssText = 'position:fixed;bottom:98px;left:16px;z-index:999999;background:#fff;border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,0.18);padding:8px;--sts-font:Inter,"Segoe UI",sans-serif;font-family:var(--sts-font);min-width:200px;animation:stsPopUp .2s ease;';

    if (!document.getElementById('sts-popup-anim')) {
      var animStyle = document.createElement('style');
      animStyle.id = 'sts-popup-anim';
      animStyle.textContent = '@keyframes stsPopUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}';
      document.head.appendChild(animStyle);
    }

    var btnStyle = 'display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;border:none;background:none;border-radius:8px;cursor:pointer;font-family:var(--sts-font);font-size:13px;text-align:left;color:#333;transition:background .15s;';

    var autoBtn = document.createElement('button');
    autoBtn.style.cssText = btnStyle;
    autoBtn.innerHTML = '<span style="font-size:20px;">🔍</span><div><div style="font-weight:700;">Auto Scan</div><div style="font-size:11px;color:#64748B;margin-top:1px;">Tự quét toàn bộ clipart</div></div>';
    autoBtn.onmouseover = function() { autoBtn.style.background = '#F0FDF4'; };
    autoBtn.onmouseout = function() { autoBtn.style.background = 'none'; };
    autoBtn.onclick = async function() {
      popup.remove();
      if (typeof actions.ensureClipartLoggedIn === 'function' && !(await actions.ensureClipartLoggedIn())) return;
      if (typeof actions.scanCliparts === 'function') actions.scanCliparts();
    };

    var manualBtn = document.createElement('button');
    manualBtn.style.cssText = btnStyle;
    manualBtn.innerHTML = '<span style="font-size:20px;">✋</span><div><div style="font-weight:700;">Manual Scan</div><div style="font-size:11px;color:#64748B;margin-top:1px;">Mở panel trống, tự pick clipart</div></div>';
    manualBtn.onmouseover = function() { manualBtn.style.background = '#FFFBEB'; };
    manualBtn.onmouseout = function() { manualBtn.style.background = 'none'; };
    manualBtn.onclick = async function() {
      popup.remove();
      if (typeof actions.ensureClipartLoggedIn === 'function' && !(await actions.ensureClipartLoggedIn())) return;
      if (typeof actions.startManualScan === 'function') actions.startManualScan();
    };

    var divider = document.createElement('div');
    divider.style.cssText = 'height:1px;background:#E5E7EB;margin:4px 0;';

    popup.appendChild(autoBtn);
    popup.appendChild(divider);
    popup.appendChild(manualBtn);
    document.body.appendChild(popup);

    setTimeout(function() {
      function closePopup(e) {
        if (!popup.contains(e.target) && e.target.id !== 'sts-clip-fab') {
          popup.remove();
          document.removeEventListener('click', closePopup, true);
        }
      }
      document.addEventListener('click', closePopup, true);
    }, 100);
  }

  ns.ui = ns.ui || {};
  ns.ui.showProgress = showProgress;
  ns.ui.clearProgress = clearProgress;
  ns.ui.clipNotify = clipNotify;
  ns.ui.showScanModePopup = showScanModePopup;

  ns.modules['ui'] = { name: 'ui', showProgress: showProgress, clearProgress: clearProgress, clipNotify: clipNotify, showScanModePopup: showScanModePopup };
})();
