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

  ns.ui = ns.ui || {};
  ns.ui.showProgress = showProgress;
  ns.ui.clearProgress = clearProgress;
  ns.ui.clipNotify = clipNotify;

  ns.modules['ui'] = { name: 'ui', showProgress: showProgress, clearProgress: clearProgress, clipNotify: clipNotify };
})();
