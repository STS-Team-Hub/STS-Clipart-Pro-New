
const statusEl = document.getElementById('status');
const autoBtn = document.getElementById('auto-scan');
const manualBtn = document.getElementById('manual-scan');
const refreshBtn = document.getElementById('refresh-status');
const helpBtn = document.getElementById('open-help');
const logoutBtn = document.getElementById('logout-btn');
const debugToggle = document.getElementById('debug-toggle');

const setupForm = document.getElementById('setup-form');
const loginForm = document.getElementById('login-form');
const sessionBox = document.getElementById('session-box');
const actionsBox = document.getElementById('actions');

const webappInput = document.getElementById('webapp-url');
const saveWebappBtn = document.getElementById('save-webapp');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('login-btn');
const changeWebappBtn = document.getElementById('change-webapp');

const STORAGE_KEYS = {
  webappUrl: 'stsWebAppUrl',
  authUser: 'stsAuthUser',
  authToken: 'stsAuthToken',
  clipartUser: 'stsClipartProUser',
  debugEnabled: 'stsDebugEnabled'
};


function popupIcon(name, size, color) {
  var s = size || 16;
  var c = color || 'currentColor';
  var common = 'fill="none" stroke="' + c + '" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"';
  var body = '';
  switch (name) {
    case 'scan':
      body = '<path d="M8 5H6.8A1.8 1.8 0 0 0 5 6.8V8"/><path d="M16 5h1.2A1.8 1.8 0 0 1 19 6.8V8"/><path d="M8 19H6.8A1.8 1.8 0 0 1 5 17.2V16"/><path d="M16 19h1.2a1.8 1.8 0 0 0 1.8-1.8V16"/><rect x="8.3" y="8.3" width="7.4" height="7.4" rx="1.8"/><path d="M18.1 5.1v1.6"/><path d="M17.3 5.9h1.6"/>';
      break;
    case 'manual':
      body = '<path d="M12 21V10"/><path d="M8.5 12V7.8a1.4 1.4 0 1 1 2.8 0V11"/><path d="M14.7 11V7.4a1.4 1.4 0 1 1 2.8 0v6.3"/><path d="M12 11V6.8a1.4 1.4 0 1 1 2.8 0V11"/><path d="M8.4 12.2 7 10.8a1.5 1.5 0 0 0-2.1 2.1l2.9 2.9A4 4 0 0 0 10.7 17H16"/>';
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
        '<path d="M6 9V6.8C6 6.36 6.36 6 6.8 6H9" fill="none" stroke="#38BDF8" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M15 6H17.2C17.64 6 18 6.36 18 6.8V9" fill="none" stroke="#38BDF8" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M9 18H6.8C6.36 18 6 17.64 6 17.2V15" fill="none" stroke="#2563EB" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<path d="M18 15V17.2C18 17.64 17.64 18 17.2 18H15" fill="none" stroke="#2563EB" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<rect x="8" y="7.5" width="6.6" height="6.6" rx="1.6" fill="#FFFFFF" stroke="#2563EB" stroke-width="1.6"/>' +
        '<rect x="10.4" y="9.9" width="6.6" height="6.6" rx="1.6" fill="#FFFFFF" stroke="#2563EB" stroke-width="1.6"/>' +
        '<path d="M18.4 4.8v1.6M17.6 5.6h1.6" stroke="#38BDF8" stroke-width="1.4" stroke-linecap="round"/>' +
        '</svg>';
    default:
      body = '<circle cx="12" cy="12" r="8"/>';
  }
  return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" aria-hidden="true" ' + common + '>' + body + '</svg>';
}

function setBtnIcon(el, iconName, label, iconColor) {
  if (!el) return;
  el.innerHTML = '<span class="btn-inner"><span class="btn-icon">' + popupIcon(iconName, 16, iconColor) + '</span><span>' + label + '</span></span>';
}

function applyPopupIcons() {
  var brand = document.getElementById('popup-brand-icon');
  if (brand) brand.innerHTML = popupIcon('logo', 20);
  setBtnIcon(autoBtn, 'scan', 'Auto Scan', '#166534');
  setBtnIcon(manualBtn, 'manual', 'Manual Scan', '#D97706');
  setBtnIcon(refreshBtn, 'refresh', 'Refresh', '#2563EB');
  setBtnIcon(helpBtn, 'help', 'Hướng dẫn', '#5F766B');
  setBtnIcon(logoutBtn, 'logout', 'Đăng xuất', '#B91C1C');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function setStatus(html) {
  statusEl.innerHTML = html;
}

function setVisible(el, visible) {
  if (!el) return;
  el.classList.toggle('hidden', !visible);
}

async function getStorage(keys) {
  return chrome.storage.local.get(keys);
}

async function setStorage(values) {
  return chrome.storage.local.set(values);
}

async function removeStorage(keys) {
  return chrome.storage.local.remove(keys);
}

async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs && tabs[0] ? tabs[0] : null;
}

async function sendToActiveTab(message) {
  const tab = await getActiveTab();
  if (!tab || !tab.id) {
    throw new Error('Không tìm thấy tab đang mở.');
  }
  return chrome.tabs.sendMessage(tab.id, message);
}

async function notifyActiveTabAuthLogout() {
  try {
    const tab = await getActiveTab();
    if (!tab || !tab.id) return;
    await chrome.tabs.sendMessage(tab.id, { type: 'STS_AUTH_LOGOUT' });
  } catch (err) {
    // Ignore: popup logout/change webapp must still succeed even without content script
  }
}

async function refreshStatus() {
  try {
    const tab = await getActiveTab();
    if (!tab || !tab.id) {
      setStatus('Không tìm thấy tab hiện tại.');
      return;
    }

    const url = tab.url || '';
    const host = url ? new URL(url).hostname : 'unknown';
    let status = null;

    try {
      status = await chrome.tabs.sendMessage(tab.id, { type: 'GET_CLIPART_STATUS' });
    } catch (err) {
      setStatus(
        `<b>Tab:</b> ${escapeHtml(host)}<br>` +
        `Content script chưa phản hồi. Reload trang sản phẩm rồi mở popup lại.`
      );
      return;
    }

    const modeText = status?.isScanning ? 'Đang scan' : (status?.hasScan ? 'Đã có panel/scan' : 'Chưa scan');
    setStatus(
      `<b>Tab:</b> ${escapeHtml(host)}<br>` +
      `<b>Trạng thái:</b> ${escapeHtml(modeText)}<br>` +
      `<b>Số group:</b> ${Number(status?.categoryCount || 0)}`
    );
  } catch (err) {
    setStatus(`Lỗi: ${escapeHtml(err.message || String(err))}`);
  }
}

async function runAction(button, message, pendingText) {
  const original = button.innerHTML;
  button.disabled = true;
  button.textContent = pendingText;
  try {
    const response = await sendToActiveTab(message);
    if (response && response.ok === false) {
      throw new Error(response.error || 'Thao tác không thành công.');
    }
    window.close();
  } catch (err) {
    setStatus(`Lỗi: ${escapeHtml(err.message || String(err))}`);
    button.disabled = false;
    button.innerHTML = original;
  }
}

function normalizeWebAppUrl(url) {
  return String(url || '').trim();
}

function renderSession(authUser, webappUrl) {
  if (authUser) {
    sessionBox.innerHTML =
      `<b>Đã đăng nhập:</b> ${escapeHtml(authUser.username || 'unknown')}<br>` +
      `<b>Role:</b> ${escapeHtml(authUser.role || 'User')}<br>` +
      `<b>Web App:</b> Đã lưu`;
    setVisible(sessionBox, true);
    setVisible(actionsBox, true);
    setVisible(loginForm, false);
    setVisible(setupForm, false);
    refreshStatus();
    return;
  }

  setVisible(sessionBox, false);
  setVisible(actionsBox, false);

  if (!webappUrl) {
    setVisible(setupForm, true);
    setVisible(loginForm, false);
    setStatus('Nhập Web App lần đầu để bật đăng nhập.');
  } else {
    setVisible(setupForm, false);
    setVisible(loginForm, true);
    setStatus('Nhập User/Pass để đăng nhập.');
  }
}

async function initDebugToggle() {
  if (!debugToggle) return;
  try {
    const stored = await getStorage([STORAGE_KEYS.debugEnabled]);
    debugToggle.checked = !!stored[STORAGE_KEYS.debugEnabled];
  } catch (_) {
    debugToggle.checked = false;
  }

  debugToggle.addEventListener('change', async () => {
    try {
      await setStorage({ [STORAGE_KEYS.debugEnabled]: !!debugToggle.checked });
      setStatus(debugToggle.checked ? 'Debug logs enabled.' : 'Debug logs disabled.');
    } catch (err) {
      setStatus(`Debug toggle error: ${escapeHtml(err.message || String(err))}`);
    }
  });
}

async function fetchWebAppJson(webappUrl, payload) {
  return chrome.runtime.sendMessage({
    type: 'FETCH_JSON',
    url: webappUrl,
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain;charset=utf-8'
    },
    body: JSON.stringify(payload || {})
  });
}

function parseLoginResponse(response) {
  const body = response?.data;
  if (!response?.ok) {
    return {
      ok: false,
      message: response?.error || 'Không gọi được Web App'
    };
  }

  const accepted =
    body?.ok === true ||
    body?.success === true ||
    body?.authenticated === true ||
    body?.status === 'ok';

  const user = body?.user || {
    username: body?.username || body?.userName || body?.name || '',
    role: body?.role || body?.userRole || 'User'
  };

  return {
    ok: !!accepted,
    user,
    token: body?.token || '',
    message: body?.message || (accepted ? 'Đăng nhập thành công' : 'Sai tài khoản hoặc mật khẩu')
  };
}

async function saveWebApp() {
  const webappUrl = normalizeWebAppUrl(webappInput.value);
  if (!webappUrl) {
    setStatus('Vui lòng nhập Web App URL.');
    return;
  }

  await setStorage({ [STORAGE_KEYS.webappUrl]: webappUrl });
  webappInput.value = '';
  usernameInput.focus();
  renderSession(null, webappUrl);
}

async function login() {
  const { [STORAGE_KEYS.webappUrl]: webappUrl } = await getStorage([STORAGE_KEYS.webappUrl]);

  if (!webappUrl) {
    setStatus('Chưa có Web App. Hãy lưu Web App trước.');
    renderSession(null, '');
    return;
  }

  const username = String(usernameInput.value || '').trim();
  const password = String(passwordInput.value || '');

  if (!username || !password) {
    setStatus('Vui lòng nhập User và Pass.');
    return;
  }

  const original = loginBtn.textContent;
  loginBtn.disabled = true;
  loginBtn.textContent = 'Đang đăng nhập...';

  try {
    const resp = await fetchWebAppJson(webappUrl, {
      action: 'login',
      username,
      password,
      source: 'sts_clipart_pro'
    });

    const result = parseLoginResponse(resp);
    if (!result.ok) {
      setStatus(`Đăng nhập thất bại: ${escapeHtml(result.message || 'unknown error')}`);
      return;
    }

    const normalizedUser = {
      id: String(result.user?.id || result.user?.userId || result.user?.uid || result.user?.username || username),
      email: String(result.user?.email || ''),
      name: String(result.user?.name || result.user?.username || username),
      username: String(result.user?.username || username),
      role: String(result.user?.role || 'user'),
      token: String(result.user?.token || result.token || '')
    };

    await setStorage({
      stsClipartProUser: normalizedUser,
      [STORAGE_KEYS.authUser]: {
        username: normalizedUser.username,
        role: normalizedUser.role
      },
      [STORAGE_KEYS.authToken]: normalizedUser.token
    });

    passwordInput.value = '';
    renderSession({
      username: result.user?.username || username,
      role: result.user?.role || 'User'
    }, webappUrl);
    setStatus(`Đăng nhập thành công: ${escapeHtml(result.user?.username || username)}`);
  } catch (err) {
    setStatus(`Lỗi đăng nhập: ${escapeHtml(err.message || String(err))}`);
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = original;
  }
}

async function logout() {
  await removeStorage([STORAGE_KEYS.authUser, STORAGE_KEYS.authToken, STORAGE_KEYS.clipartUser]);
  await notifyActiveTabAuthLogout();
  passwordInput.value = '';
  const { [STORAGE_KEYS.webappUrl]: webappUrl } = await getStorage([STORAGE_KEYS.webappUrl]);
  renderSession(null, webappUrl || '');
}

async function changeWebApp() {
  await removeStorage([STORAGE_KEYS.webappUrl, STORAGE_KEYS.authUser, STORAGE_KEYS.authToken, STORAGE_KEYS.clipartUser]);
  await notifyActiveTabAuthLogout();
  webappInput.value = '';
  usernameInput.value = '';
  passwordInput.value = '';
  renderSession(null, '');
}

async function bootstrap() {
  const stored = await getStorage([
    STORAGE_KEYS.webappUrl,
    STORAGE_KEYS.authUser,
    STORAGE_KEYS.authToken
  ]);

  await initDebugToggle();
  renderSession(stored[STORAGE_KEYS.authUser] || null, stored[STORAGE_KEYS.webappUrl] || '');
}

autoBtn.addEventListener('click', () => runAction(autoBtn, { type: 'CLIPART_SCAN', entrypointId: 'popup' }, 'Đang scan...'));
manualBtn.addEventListener('click', () => runAction(manualBtn, { type: 'CLIPART_MANUAL_SCAN' }, 'Đang mở panel...'));
refreshBtn.addEventListener('click', refreshStatus);
helpBtn.addEventListener('click', () => {
  setStatus(
    `<b>Cách dùng:</b><br>` +
    `1. Lần đầu nhập <b>Web App</b> rồi lưu.<br>` +
    `2. Đăng nhập bằng <b>User/Pass</b>.<br>` +
    `3. Mở trang sản phẩm rồi bấm <b>Auto Scan</b> hoặc <b>Manual Scan</b>.<br>` +
    `4. Trong panel dùng <b>Screenshot</b>, <b>Pick</b>, <b>Append</b> để bổ sung.`
  );
});

saveWebappBtn.addEventListener('click', saveWebApp);
loginBtn.addEventListener('click', login);
logoutBtn.addEventListener('click', logout);
changeWebappBtn.addEventListener('click', changeWebApp);

webappInput.addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter') saveWebApp();
});
passwordInput.addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter') login();
});
usernameInput.addEventListener('keydown', (ev) => {
  if (ev.key === 'Enter') passwordInput.focus();
});

applyPopupIcons();

bootstrap();
