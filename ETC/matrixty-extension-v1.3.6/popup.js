// Matrixty Extension v1.3.6 — Popup Controller
// v1.3.6: Fix clipart sync hang at 'Syncing...' — see content.js (canvas-taint hardening, fetchAsDataUrl timeout)
// v1.3.5: Searchable dropdown fixes — auto-close other widgets on open, flip panel anchor to avoid right-edge overflow
// v1.3.4: Searchable dropdown widget — generalized factory, applied to BOTH shop and member filters
// v1.3.3: Custom searchable shop dropdown — search box on top, click filter, optgroup-aware
// v1.3.2: Shop filter grouped by TEAM (was platform), Member filter grouped by team via <optgroup>,
//         cache hydration includes main_seller_id/sub_role/department_id so _shopTeamMap survives cache restore
// Event delegation, bi-directional realtime sync, Amazon ASIN auto-extract, role-based permissions
const SUPABASE_URL = 'https://qhejotdjehgneusqjvhz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoZWpvdGRqZWhnbmV1c3Fqdmh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg2NzcyNTEsImV4cCI6MjA4NDI1MzI1MX0.5sbhhZ3VUrRQuRuLo3-o6CDzjbotPLzDGsn3oIjPM_U';
const HDR = { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' };

const MODE_LABELS = { bookmark: 'Bookmark', manual: 'Manual', fullpage: 'Full page' };

// ═══════════════════════════════════════════════════════════════════
// v8.1.0 — TRADEMARK WARNING SYSTEM
// Fetches active trademark warnings from Supabase and blocks auto-fill
// if the title contains trademarked terms.
// ═══════════════════════════════════════════════════════════════════
let _trademarkWarnings = [];
let _trademarkLoaded = false;
let _trademarkLastFetch = 0;
const TRADEMARK_CACHE_TTL = 5 * 60 * 1000; // refresh every 5 min

async function fetchTrademarkWarnings(force = false) {
  if (!force && _trademarkLoaded && (Date.now() - _trademarkLastFetch < TRADEMARK_CACHE_TTL)) return _trademarkWarnings;
  try {
    // Try trademark_warnings table first (managed via Matrixty web app)
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/trademark_warnings?is_active=eq.true&select=content,severity,owner,platforms,match_type,pattern_config,notes`,
      { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        _trademarkWarnings = data;
        _trademarkLoaded = true;
        _trademarkLastFetch = Date.now();
        console.log(`[Matrixty TM] ✅ Loaded ${_trademarkWarnings.length} warnings from trademark_warnings`);
        return _trademarkWarnings;
      }
      console.log(`[Matrixty TM] trademark_warnings returned ${data.length} rows, trying fallback...`);
    } else {
      const errText = await res.text().catch(() => '');
      console.warn(`[Matrixty TM] trademark_warnings fetch failed: ${res.status} ${errText}`);
    }

    // Fallback: trademark_keywords table (seed data)
    const res2 = await fetch(
      `${SUPABASE_URL}/rest/v1/trademark_keywords?select=keyword,category,severity`,
      { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    if (res2.ok) {
      const keywords = await res2.json();
      if (Array.isArray(keywords) && keywords.length > 0) {
        // Convert trademark_keywords format → trademark_warnings format
        _trademarkWarnings = keywords.map(k => ({
          content: k.keyword,
          severity: k.severity === 'danger' ? 'block' : 'warn',
          owner: null,
          platforms: ['etsy', 'amazon', 'tiktok'], // applies to all platforms
          match_type: 'contains', // fuzzy match by default
          pattern_config: null,
          notes: `Category: ${k.category}`,
        }));
        _trademarkLoaded = true;
        _trademarkLastFetch = Date.now();
        console.log(`[Matrixty TM] ✅ Fallback: loaded ${_trademarkWarnings.length} keywords from trademark_keywords`);
      }
    } else {
      console.warn(`[Matrixty TM] trademark_keywords fallback also failed: ${res2.status}`);
    }
  } catch (e) { console.warn('[Matrixty TM] Fetch error:', e); }
  return _trademarkWarnings;
}

// ─── Match logic (ported from types.ts) ───
function _tmEscapeRegex(str) { return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function _tmNormalize(text) { return text.toLowerCase().replace(/['']/g, '').replace(/s\b/g, ''); }

function _tmCheckPattern(title, config) {
  if (!config || config.rule !== 'block_if_both_present') return { matched: false };
  const titleLower = title.toLowerCase();
  const foundA = (config.words_group_a || []).find(w => titleLower.includes(w.toLowerCase()));
  if (!foundA) return { matched: false };
  const foundB = (config.words_group_b || []).find(w => titleLower.includes(w.toLowerCase()));
  if (!foundB) return { matched: false };
  if (config.max_distance) {
    const words = titleLower.split(/\s+/);
    const aWords = foundA.toLowerCase().split(/\s+/);
    const bWords = foundB.toLowerCase().split(/\s+/);
    const aPos = [], bPos = [];
    for (let i = 0; i < words.length; i++) {
      if (aWords.some(aw => words[i].includes(aw))) aPos.push(i);
      if (bWords.some(bw => words[i].includes(bw))) bPos.push(i);
    }
    if (aPos.length && bPos.length) {
      const gap = Math.min(Math.abs(Math.min(...bPos) - Math.max(...aPos)), Math.abs(Math.min(...aPos) - Math.max(...bPos)));
      if (gap > config.max_distance) return { matched: false };
    }
  }
  return { matched: true, matchedA: foundA, matchedB: foundB };
}

function checkTrademarkTitle(title, platform) {
  const results = [];
  for (const w of _trademarkWarnings) {
    if (!w.platforms || !w.platforms.includes(platform)) continue;
    let matched = false;
    let matchedText = w.content;
    switch (w.match_type) {
      case 'exact': {
        const regex = new RegExp(`\\b${_tmEscapeRegex(w.content)}\\b`, 'i');
        matched = regex.test(title);
        break;
      }
      case 'contains': {
        matched = _tmNormalize(title).includes(_tmNormalize(w.content));
        break;
      }
      case 'pattern': {
        const r = _tmCheckPattern(title, w.pattern_config);
        matched = r.matched;
        if (matched && r.matchedA && r.matchedB) matchedText = `"${r.matchedA}" + "${r.matchedB}"`;
        break;
      }
    }
    if (matched) results.push({ content: w.content, severity: w.severity, owner: w.owner, matchedText, matchType: w.match_type, notes: w.notes });
  }
  return results;
}

// ─── Highlight trademark words in title text ───
function highlightTrademarkInTitle(title, matches) {
  let html = title.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  // Sort by content length descending to avoid partial replacements
  const sorted = [...matches].sort((a, b) => (b.matchedText || b.content).length - (a.matchedText || a.content).length);
  for (const m of sorted) {
    const text = m.matchedText || m.content;
    // For combo patterns like "word1" + "word2", highlight each word
    if (m.matchType === 'pattern' && text.includes('" + "')) {
      const parts = text.match(/"([^"]+)"/g);
      if (parts) {
        for (const p of parts) {
          const word = p.replace(/"/g, '');
          const re = new RegExp(`(${_tmEscapeRegex(word)})`, 'gi');
          html = html.replace(re, `<mark class="tm-highlight tm-${m.severity}">$1</mark>`);
        }
      }
    } else {
      const re = new RegExp(`(${_tmEscapeRegex(text)})`, 'gi');
      html = html.replace(re, `<mark class="tm-highlight tm-${m.severity}">$1</mark>`);
    }
  }
  return html;
}

document.addEventListener('DOMContentLoaded', () => {
  const loginView = document.getElementById('login-view');
  const mainView = document.getElementById('main-view');
  const loginBtn = document.getElementById('login-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const loginError = document.getElementById('login-error');

  // Tab elements
  const tabBar = document.getElementById('tab-bar');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const zoneCrawl = document.getElementById('zone-crawl');
  const zoneClipart = document.getElementById('zone-clipart');
  const zoneListing = document.getElementById('zone-listing');
  const zoneAnhphu = document.getElementById('zone-anhphu');
  const zonePic = document.getElementById('zone-pic');
  const noAccess = document.getElementById('no-access');

  // Listing elements
  const listingSearch = document.getElementById('listing-search');
  const listingShopFilter = document.getElementById('listing-shop-filter');
  const listingIdeas = document.getElementById('listing-ideas');
  const listingLoading = document.getElementById('listing-loading');
  const listingEmpty = document.getElementById('listing-empty');
  const listingPlatformBadge = document.getElementById('listing-platform-badge');

  // ═══ v7.0.4: EVENT DELEGATION for Amazon detail fields ═══
  // Attached ONCE on container — survives all DOM rebuilds
  // Handles SELECT (change) and INPUT (blur) events for assignment fields
  if (listingIdeas) {
    listingIdeas.addEventListener('change', async (e) => {
      const select = e.target.closest('.amz-detail-select');
      if (!select) return;
      if (select.dataset.wired === 'true') return; // v9.5: handled by direct handler
      const assignmentId = select.dataset.assignmentId;
      if (!assignmentId) { console.warn('[Matrixty Delegated] No assignment ID on select'); return; }

      // Determine field name from CSS class
      let fieldName = '';
      if (select.classList.contains('amz-style-select')) fieldName = 'custom_style';
      else if (select.classList.contains('amz-status-select')) fieldName = 'custom_status';
      if (!fieldName) return;

      const newValue = select.value;
      console.log(`[Matrixty Delegated] ${fieldName} changed to "${newValue}" (assignment: ${assignmentId})`);

      // Visual feedback: yellow = saving
      select.title = `Saving... ID: ${assignmentId}`;
      select.style.background = '#FEF9C3';
      select.style.outline = '2px solid orange';
      const fieldsToUpdate = { [fieldName]: newValue };
      // custom_status changes also track who made the change
      if (fieldName === 'custom_status' && currentUser?.name) {
        fieldsToUpdate.listed_by = currentUser.name;
        fieldsToUpdate.listed_at = new Date().toISOString();
      }

      try {
        const success = await updateAssignment(assignmentId, fieldsToUpdate);
        if (success) {
          select.style.background = '#D1FAE5'; // Green = saved
          select.style.outline = '2px solid #4CAF50';
          select.title = `✅ Saved: ${newValue}`;
          console.log(`[Matrixty Delegated] ✅ ${fieldName} saved: "${newValue}"`);
          // Update local data
          for (const idea of allIdeas) {
            const sa = idea._assignments?.find(a => String(a.id) === String(assignmentId));
            if (sa) {
              sa[fieldName] = newValue;
              if (fieldsToUpdate.listed_by) { sa.listed_by = fieldsToUpdate.listed_by; sa.listed_at = fieldsToUpdate.listed_at; }
              break;
            }
          }
          updateIdeasCache();
          // Suppress next poll re-render (self-echo prevention)
          window._lastLocalSaveTs = Date.now();
          setTimeout(() => { select.style.background = ''; select.style.outline = ''; select.title = ''; }, 2000);
        } else {
          const errDetail = window._lastPatchResult?.error || 'Unknown';
          select.style.background = '#FEE2E2';
          select.style.outline = '2px solid #EF4444';
          select.title = `❌ FAIL: ${errDetail}\nID: ${assignmentId}`;
          console.error(`[Matrixty Delegated] ❌ ${fieldName} FAILED:`, errDetail, 'id:', assignmentId);
          // Show visible error text near the dropdown
          const errEl = document.createElement('div');
          errEl.className = 'mtx-patch-error';
          errEl.style.cssText = 'color:#EF4444;font-size:9px;padding:2px 4px;background:#FEE2E2;border-radius:3px;margin-top:2px;word-break:break-all;';
          errEl.textContent = `❌ ${errDetail}`;
          select.parentElement?.appendChild(errEl);
          setTimeout(() => { select.style.background = ''; select.style.outline = ''; errEl.remove(); }, 8000);
        }
      } catch (err) {
        select.style.background = '#FEE2E2';
        select.style.outline = '2px solid #EF4444';
        select.title = `❌ Exception: ${err.message}`;
        console.error(`[Matrixty Delegated] ❌ Exception:`, err);
        const errEl = document.createElement('div');
        errEl.className = 'mtx-patch-error';
        errEl.style.cssText = 'color:#EF4444;font-size:9px;padding:2px 4px;background:#FEE2E2;border-radius:3px;margin-top:2px;';
        errEl.textContent = `❌ ${err.message}`;
        select.parentElement?.appendChild(errEl);
        setTimeout(() => { select.style.background = ''; select.style.outline = ''; errEl.remove(); }, 8000);
      }
    });

    // Delegated blur handler for text inputs (title, child_asin, tag)
    // v9.5: Skip inputs that have direct per-element handlers (data-wired="true")
    listingIdeas.addEventListener('blur', async (e) => {
      const input = e.target.closest('.amz-detail-input');
      if (!input) return;
      if (input.dataset.wired === 'true') return; // v9.5: handled by direct handler
      const assignmentId = input.dataset.assignmentId;
      if (!assignmentId) return;

      let fieldName = '';
      if (input.classList.contains('amz-title-input')) fieldName = 'title';
      else if (input.classList.contains('amz-child-asin-input')) fieldName = 'child_asin';
      else if (input.classList.contains('amz-tag-input')) fieldName = 'tag';
      if (!fieldName) return;

      // v8.1.0: Block save if title has BLOCK-severity trademark match
      if (fieldName === 'title' && input.getAttribute('data-tm-blocked') === 'true') {
        input.style.background = '#FEE2E2';
        input.title = '⛔ Title chứa từ trademark bị chặn — sửa trước khi lưu';
        return;
      }

      const newValue = (input.value || '').trim();
      // Check against data-prev attribute to avoid unnecessary saves
      const prev = input.dataset.prevValue || '';
      if (newValue === prev) return;

      console.log(`[Matrixty Delegated] ${fieldName} blur: "${newValue}" (prev: "${prev}")`);
      input.style.background = '#FEF9C3';
      const fieldsToUpdate = { [fieldName]: newValue };
      if (['title', 'child_asin'].includes(fieldName) && currentUser?.name) {
        fieldsToUpdate.listed_by = currentUser.name;
        fieldsToUpdate.listed_at = new Date().toISOString();
      }

      const success = await updateAssignment(assignmentId, fieldsToUpdate);
      if (success) {
        input.style.background = '#D1FAE5';
        input.dataset.prevValue = newValue;
        for (const idea of allIdeas) {
          const sa = idea._assignments?.find(a => String(a.id) === String(assignmentId));
          if (sa) {
            sa[fieldName] = newValue;
            if (fieldsToUpdate.listed_by) { sa.listed_by = fieldsToUpdate.listed_by; sa.listed_at = fieldsToUpdate.listed_at; }
            break;
          }
        }
        updateIdeasCache();
        window._lastLocalSaveTs = Date.now();
        setTimeout(() => { input.style.background = ''; }, 1500);
      } else {
        input.style.background = '#FEE2E2';
        input.title = `❌ Save failed! ID: ${assignmentId}`;
        setTimeout(() => { input.style.background = ''; input.title = ''; }, 3000);
      }
    }, true); // useCapture = true for blur (doesn't bubble normally)

    // ═══ v8.1.0: REAL-TIME TRADEMARK CHECK on manual title input (Amazon + Etsy) ═══
    let _tmInputDebounce = null;
    listingIdeas.addEventListener('input', (e) => {
      const input = e.target.closest('.amz-title-input, .etsy-title-input');
      if (!input) return;
      clearTimeout(_tmInputDebounce);
      _tmInputDebounce = setTimeout(() => _checkTitleTrademark(input), 300);
    });

    async function _checkTitleTrademark(input) {
      await fetchTrademarkWarnings();
      const title = (input.value || '').trim();
      // Remove old badge
      let badge = input.parentElement?.querySelector('.tm-inline-badge');
      if (badge) badge.remove();
      // Remove block state
      input.classList.remove('tm-input-blocked', 'tm-input-warned');
      input.removeAttribute('data-tm-blocked');

      if (!title || _trademarkWarnings.length === 0) return;

      // Detect platform from context
      const platform = input.closest('.variant-group')
        ? (input.closest('[data-platform]')?.dataset.platform || _detectInputPlatform(input))
        : _detectInputPlatform(input);

      const matches = checkTrademarkTitle(title, platform);
      if (matches.length === 0) return;

      const hasBlock = matches.some(m => m.severity === 'block');
      const terms = [...new Set(matches.map(m => m.matchedText || m.content))];

      // Create inline badge
      badge = document.createElement('div');
      badge.className = `tm-inline-badge ${hasBlock ? 'tm-badge-block' : 'tm-badge-warn'}`;
      badge.innerHTML = hasBlock
        ? `⛔ <strong>BLOCK:</strong> ${terms.map(t => `<span class="tm-term">${t}</span>`).join(', ')}`
        : `⚠️ <strong>Warning:</strong> ${terms.map(t => `<span class="tm-term">${t}</span>`).join(', ')}`;
      input.parentElement.appendChild(badge);

      if (hasBlock) {
        input.classList.add('tm-input-blocked');
        input.setAttribute('data-tm-blocked', 'true');
      } else {
        input.classList.add('tm-input-warned');
      }
    }

    function _detectInputPlatform(input) {
      // Check if inside an Amazon or Etsy section
      if (input.classList.contains('amz-title-input')) return 'amazon';
      if (input.classList.contains('etsy-title-input')) return 'etsy';
      // Check parent variant group or shop filter
      const shopHeader = input.closest('.variant-group')?.querySelector('.variant-group-name');
      if (shopHeader) {
        const name = shopHeader.textContent.toLowerCase();
        if (name.includes('amazon')) return 'amazon';
        if (name.includes('etsy')) return 'etsy';
        if (name.includes('tiktok')) return 'tiktok';
      }
      // Fallback to current shop filter
      if (selectedShopFilter && selectedShopFilter !== 'all') {
        const shop = allShops.find(s => s.name === selectedShopFilter);
        if (shop) return (shop.platform || 'etsy').toLowerCase();
      }
      return 'etsy';
    }
  }

  // Preview panel & action buttons
  const previewPanel = document.getElementById('preview-panel');
  const previewIdeaName = document.getElementById('preview-idea-name');
  const previewStatus = document.getElementById('preview-status');
  const previewTitle = document.getElementById('preview-title');
  const previewTags = document.getElementById('preview-tags');
  const previewDescription = document.getElementById('preview-description');
  const btnGenerate = document.getElementById('btn-generate');
  const btnAutofill = document.getElementById('btn-autofill');
  const generateStatus = document.getElementById('generate-status');

  // State
  let allIdeas = [];
  let allIdeasGrouped = {}; // { shopName: [ideas] }
  let allShops = []; // ALL active shops from idea_shops table (like web app)
  let allMembers = []; // ALL active members for Members filter
  let allTeams = []; // ALL teams for Team filter
  let myShopIds = null; // Set of shop IDs user has access to (null = admin, sees all)
  // v1.2-fix: shop_permissions source-of-truth (matches webapp filter exactly).
  // Populated from shop_permissions table for non-admin users — covers leader auto-grants
  // that may not be reflected in idea_shops.assigned_member_ids (e.g. shops created before sync trigger).
  let permittedShopIds = new Set();

  // ─────────────────────────────────────────────────────────────────
  // v1.2-fix: TEAM DERIVATION — mirrors webapp ShopManagementPage.tsx
  // shopTeamMap. A shop's team comes from its main_seller_id (then dept,
  // then assigned member roles). A user's team comes from her dept name,
  // role pattern, or sub_role. Leaders inherit visibility of all shops
  // whose derived team matches their own — this is the rule the webapp
  // shows in the team grouping but that shop_permissions may not have
  // back-filled for legacy shops.
  // ─────────────────────────────────────────────────────────────────
  function _getTeamFromRole(role) {
    if (!role) return null;
    const m = String(role).match(/^(?:Leader|Member|Manager)\s+(.+)$/);
    return m ? `Team ${m[1].trim()}` : null;
  }
  function _getTeamFromMember(member, deptMap, deptNameSet) {
    if (!member) return null;
    if (member.department_id != null && deptMap?.has?.(member.department_id)) {
      return deptMap.get(member.department_id);
    }
    if (member.sub_role) { const t = _getTeamFromRole(member.sub_role); if (t) return t; }
    const fromRole = _getTeamFromRole(member.role || '');
    if (fromRole) return fromRole;
    if (member.department && deptNameSet?.has?.(member.department)) return member.department;
    return null;
  }
  /**
   * Build a Map<shopId, teamName> using the same priority order as webapp:
   *   1. main_seller_id → derived team
   *   2. shop.department_id → dept name
   *   3. assigned_member_ids[*] → first derivable team
   */
  function _buildShopTeamMap(shops, members, departments) {
    const deptMap = new Map();
    const deptNameSet = new Set();
    (departments || []).forEach(d => { deptMap.set(d.id, d.name); deptNameSet.add(d.name); });
    const memberMap = new Map();
    (members || []).forEach(m => memberMap.set(m.id, m));
    const map = new Map();
    (shops || []).forEach(sh => {
      // 1. main_seller_id (preferred — webapp source of truth)
      if (sh.main_seller_id != null && memberMap.has(sh.main_seller_id)) {
        const t = _getTeamFromMember(memberMap.get(sh.main_seller_id), deptMap, deptNameSet);
        if (t) { map.set(sh.id, t); return; }
      }
      // 2. shop.department_id
      if (sh.department_id != null && deptMap.has(sh.department_id)) {
        map.set(sh.id, deptMap.get(sh.department_id));
        return;
      }
      // 3. assigned_member_ids — pick the first member that yields a team
      for (const mid of (sh.assigned_member_ids || [])) {
        const m = memberMap.get(mid);
        if (m) {
          const t = _getTeamFromMember(m, deptMap, deptNameSet);
          if (t) { map.set(sh.id, t); break; }
        }
      }
    });
    return map;
  }
  /** Derive the user's team using the same precedence rules. */
  function _getUserTeam(user, deptMap, deptNameSet) {
    return _getTeamFromMember(user, deptMap, deptNameSet);
  }
  /** True if user is a Leader (or Manager) — they inherit team-wide shop visibility. */
  function _isUserTeamLeader(user) {
    const role = String(user?.role || '');
    if (/^Leader\b/i.test(role)) return true;
    if (user?.is_leader === true) return true;
    if (/^Manager\b/i.test(role)) return true;
    return false;
  }
  // Cached — rebuilt whenever we refresh data
  let _shopTeamMap = new Map();
  let selectedIdea = null;
  let detectedPlatform = 'unknown';
  let generatedData = null;
  let isGenerating = false;
  let currentUser = null;
  let analyzedData = null;
  let activeTab = 'crawl';
  let _lastCrawlMode = null; // v9.2: Track last crawl mode for state persistence
  let selectedShopFilter = 'all';
  let selectedDateFilter = 'all_time'; // Default: show ALL ideas, user can filter if needed
  let statusFilter = 'all'; // 'all', 'not-listed', 'overdue', 'urgent', 'need-fix', 'done', 'scheduled'
  let variantFilter = 'all';
  let nicheFilter = 'all';
  let sourceFilter = 'all';
  let teamFilter = 'all';
  let memberFilter = 'all';
  let assignedFilter = 'all'; // 'all', 'assigned', 'unassigned'
  let advancedFiltersOpen = false;
  let currentPage = 1;
  const PAGE_SIZE = 20;
  let filteredIdeas = []; // current filtered set for pagination
  const CACHE_KEY = 'matrixty_ideas_cache';
  const CACHE_VERSION = 3; // v1.3.2 — bump to invalidate caches missing main_seller_id, sub_role, department_id fields
  const CACHE_TTL = 30 * 60 * 1000; // 30 minutes — show cache instantly, refresh in background if stale
  const STATE_KEY = 'matrixty_popup_state';
  const listingDateFilter = document.getElementById('listing-date-filter');
  const filterVariant = document.getElementById('filter-variant');
  const filterNiche = document.getElementById('filter-niche');
  const filterSource = document.getElementById('filter-source');
  const filterTeam = document.getElementById('filter-team');
  const filterMember = document.getElementById('filter-member');
  const filterAssigned = document.getElementById('filter-assigned');
  let isRestoring = true; // Flag: đang restore state, KHÔNG ghi đè state đã lưu

  // ═══ v7.0.4: Role-based permission helpers ═══
  function isAdminOrOwner() {
    const role = (currentUser?.role || '').toLowerCase();
    return role === 'admin' || role === 'owner';
  }
  function isLeaderRole() {
    return currentUser?.is_leader === true;
  }
  function canEditAmzListingFields() {
    // v7.5.0: ALL roles can edit title/tag/asin on Extension (data syncs to web app)
    // Web app Idea Pool will block member manual input — extension is the INPUT source
    return true;
  }

  // ═══ POPUP STATE PERSISTENCE ═══
  // Lưu trạng thái popup vào chrome.storage.local để khi đóng/mở lại popup
  // thì vẫn giữ đúng tab, shop filter, và idea đang xem
  function savePopupState() {
    // Không lưu state trong quá trình restore (tránh ghi đè selectedIdeaId = null)
    if (isRestoring) return;
    const state = {
      activeTab,
      selectedShopFilter,
      selectedDateFilter,
      statusFilter,
      variantFilter,
      nicheFilter,
      sourceFilter,
      teamFilter,
      memberFilter,
      assignedFilter,
      advancedFiltersOpen,
      currentPage,
      searchQuery: listingSearch?.value || '',
      selectedIdeaIdx: selectedIdea ? allIdeas.findIndex(i => i.idea_id === selectedIdea.idea_id) : -1,
      selectedIdeaId: selectedIdea?.idea_id || null,
      miniLabOpen: !!activeMiniLab,
      expandedDetails: Array.from(document.querySelectorAll('.etsy-summary.expanded')).map(el => el.dataset.expand).filter(Boolean),
      crawlMode: _lastCrawlMode || null, // v9.2: Remember crawl mode
      // v9.2: Save mini-lab generated data so it survives popup close
      miniLabData: activeMiniLab ? getMiniLabContent() : null,
      // v9.5: Save scroll position so popup restores to exact position
      scrollTop: listingIdeas?.scrollTop || 0,
      timestamp: Date.now(),
    };
    chrome.storage.local.set({ [STATE_KEY]: state });
  }

  // ═══ SAVE STATE AGGRESSIVELY ═══
  // Chrome extension popup is DESTROYED instantly when user clicks outside
  // No blur/unload/pagehide events are guaranteed to fire
  // Solution: save state very frequently + on every possible event
  window.addEventListener('pagehide', () => { try { savePopupState(); stopRealtimeSubscription(); } catch(e) {} });
  window.addEventListener('blur', () => { try { savePopupState(); } catch(e) {} });
  document.addEventListener('visibilitychange', () => { try { savePopupState(); } catch(e) {} });
  // Periodic save every 1 second as safety net
  setInterval(() => { try { if (!isRestoring) savePopupState(); } catch(e) {} }, 1000);

  // Restore state — gọi sau khi ideas đã load xong
  // ═══ v7.0.5: Cache state in memory to avoid repeated async storage reads ═══
  let _cachedPopupState = undefined; // undefined = not loaded yet, null = loaded but empty/expired
  function restorePopupState() {
    // If already loaded (from fast init or previous call), return immediately
    if (_cachedPopupState !== undefined) {
      return Promise.resolve(_cachedPopupState);
    }
    return new Promise(resolve => {
      chrome.storage.local.get([STATE_KEY], (d) => {
        const state = d[STATE_KEY];
        // Chỉ restore nếu state < 30 phút tuổi
        if (!state || (Date.now() - state.timestamp > 30 * 60 * 1000)) {
          _cachedPopupState = null;
          resolve(null);
          return;
        }
        console.log('[Matrixty v7.0.0] Restoring state:', state);
        _cachedPopupState = state;
        resolve(state);
      });
    });
  }

  // ═══ IDEA STATUS HELPER ═══
  // ═══ DATE FILTER UTILS — đồng bộ 100% với web app dateFilterUtils.ts ═══
  function fmtDate(d) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function getDateRange(preset) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    switch (preset) {
      case 'today': return { start: fmtDate(today), end: fmtDate(today) };
      case 'yesterday': {
        const y = new Date(today); y.setDate(y.getDate() - 1);
        return { start: fmtDate(y), end: fmtDate(y) };
      }
      case 'last_7_days': {
        const s = new Date(today); s.setDate(s.getDate() - 6);
        return { start: fmtDate(s), end: fmtDate(today) };
      }
      case 'this_month':
        return { start: fmtDate(new Date(now.getFullYear(), now.getMonth(), 1)), end: fmtDate(today) };
      case 'last_month': {
        const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const e = new Date(now.getFullYear(), now.getMonth(), 0);
        return { start: fmtDate(s), end: fmtDate(e) };
      }
      default: return { start: '', end: '' };
    }
  }

  function matchesDateFilter(dateStr, dateRange) {
    if (!dateRange.start && !dateRange.end) return true;
    if (!dateStr) return false;
    const d = fmtDate(new Date(dateStr));
    if (dateRange.start && d < dateRange.start) return false;
    if (dateRange.end && d > dateRange.end) return false;
    return true;
  }

  // ═══ OVERDUE: tính working hours (trừ CN) từ assignment date ═══
  // Đồng bộ 100% với web app: src/modules/idea-pool/utils/overdueLogic.ts
  function countSundaysBetween(start, end) {
    let count = 0;
    const current = new Date(start);
    current.setHours(0, 0, 0, 0);
    while (current <= end) {
      if (current.getDay() === 0) count++;
      current.setDate(current.getDate() + 1);
    }
    return count;
  }

  function getWorkingHours(fromDate, toDate) {
    const diffMs = toDate.getTime() - fromDate.getTime();
    if (diffMs <= 0) return 0;
    const diffHours = diffMs / (1000 * 60 * 60);
    const sundayCount = countSundaysBetween(fromDate, toDate);
    return diffHours - (sundayCount * 24);
  }

  function getWorkingHoursSince(dateStr) {
    const assignDate = new Date(dateStr);
    if (isNaN(assignDate.getTime())) return 0;
    return getWorkingHours(assignDate, new Date());
  }

  // ═══ DONE LOGIC — đồng bộ 100% với web app: src/utils/ideaStatus.ts ═══
  // Etsy: title + publish_link
  // Amazon: title + child_asin + custom_status !== 'chua_custom'
  // TikTok: title + publish_link
  // Need Fix items → NOT done

  // Helper: lấy platform từ shop_id (dùng shop_id thay vì name cho chính xác)
  function getShopPlatform(shopId) {
    if (!shopId) return 'etsy';
    const shop = (allShops || []).find(s => String(s.id) === String(shopId));
    return shop?.platform || 'etsy';
  }

  function isAssignmentDone(assignment, shopPlatform) {
    if (assignment.need_fix) return false;
    const hasTitle = !!(assignment.title || '').trim();
    const platform = shopPlatform || getShopPlatform(assignment.shop_id);
    if (platform === 'amazon') {
      const hasAsin = !!(assignment.child_asin || '').trim();
      const hasCustom = !!assignment.custom_status && assignment.custom_status !== 'chua_custom';
      return hasTitle && hasAsin && hasCustom;
    }
    if (platform === 'tiktok') {
      return hasTitle && !!(assignment.publish_link || '').trim();
    }
    // Etsy: title + link
    const hasLink = !!(assignment.publish_link || '').trim();
    return hasTitle && hasLink;
  }

  // Check if an idea is Done for a specific shop (by shop name filter)
  function isIdeaDoneForShop(idea, shopName) {
    if (!idea._assignments?.length) return false;
    const a = idea._assignments.find(x => x._shop_name === shopName);
    if (!a) return false;
    return isAssignmentDone(a, getShopPlatform(a.shop_id));
  }

  // Check if an idea is Done — web app uses .some() = BẤT KỲ assignment nào done
  function isIdeaDone(idea) {
    if (!idea._assignments?.length) return false;
    return idea._assignments.some(a => isAssignmentDone(a, getShopPlatform(a.shop_id)));
  }

  // Count done ASSIGNMENTS (not done ideas) — đồng bộ web app doneAssignmentCount
  function countDoneAssignments(ideas, shopFilter) {
    let count = 0;
    const hasShopFilter = shopFilter && shopFilter !== 'all';
    ideas.forEach(idea => {
      if (!idea._assignments?.length) return;
      if (hasShopFilter) {
        const a = idea._assignments.find(x => x._shop_name === shopFilter);
        if (a && isAssignmentDone(a, getShopPlatform(a.shop_id))) count++;
      } else {
        idea._assignments.forEach(a => {
          if (isAssignmentDone(a, getShopPlatform(a.shop_id))) count++;
        });
      }
    });
    return count;
  }

  // Check if an assignment is overdue (not done + > 24 working hours)
  function isAssignmentOverdue(assignment, now) {
    const platform = getShopPlatform(assignment.shop_id);
    if (isAssignmentDone(assignment, platform)) return false;
    if (!assignment.created_at) return false;
    const assignedAt = new Date(assignment.created_at);
    if (isNaN(assignedAt.getTime())) return false;
    return getWorkingHours(assignedAt, now) > 24;
  }

  // Check if ANY assignment of an idea is overdue
  function isIdeaOverdue(idea) {
    if (!idea._assignments?.length) return false;
    const now = window._cachedStatusNow || new Date();
    return idea._assignments.some(a => isAssignmentOverdue(a, now));
  }

  // Check if overdue for a specific shop
  function isOverdueForShop(idea, shopName) {
    if (!idea._assignments?.length) return false;
    const a = idea._assignments.find(x => x._shop_name === shopName);
    if (!a) return false;
    return isAssignmentOverdue(a, window._cachedStatusNow || new Date());
  }

  // Check if need_fix for a specific shop
  function isNeedFixForShop(idea, shopName) {
    if (!idea._assignments?.length) return false;
    const a = idea._assignments.find(x => x._shop_name === shopName);
    return a?.need_fix && !a?.fixed_at;
  }

  // Check if ANY assignment has need_fix
  function hasAnyNeedFix(idea) {
    if (idea.idea_need_fix && !idea.idea_fixed_at) return true;
    if (!idea._assignments?.length) return false;
    return idea._assignments.some(a => a.need_fix && !a.fixed_at);
  }

  // ═══ GET IDEA STATUS — đồng bộ 100% với web app IdeaPoolPage.tsx ═══
  // Thứ tự check giống web app: need-fix → done → urgent → scheduled → overdue → not-listed
  function getIdeaStatus(idea, shopFilter) {
    const hasShopFilter = shopFilter && shopFilter !== 'all';

    // 1. Need Fix check (tách riêng, không nằm trong chưa list)
    if (hasShopFilter) {
      if (isNeedFixForShop(idea, shopFilter)) return 'need-fix';
    } else {
      if (hasAnyNeedFix(idea)) return 'need-fix';
    }

    // 2. Done check — .some() = bất kỳ assignment done
    if (hasShopFilter) {
      if (isIdeaDoneForShop(idea, shopFilter)) return 'done';
    } else {
      if (isIdeaDone(idea)) return 'done';
    }

    // 3. Urgent (Gấp)
    if (idea.urgent) return 'urgent';

    // 4. Scheduled
    if (idea._assignments?.length > 0) {
      if (hasShopFilter) {
        const a = idea._assignments.find(x => x._shop_name === shopFilter);
        if (a?.scheduled_date) return 'scheduled';
      } else {
        if (idea._assignments.some(a => a.scheduled_date)) return 'scheduled';
      }
    }

    // 5. Overdue check
    if (hasShopFilter) {
      if (isOverdueForShop(idea, shopFilter)) return 'overdue';
    } else {
      if (isIdeaOverdue(idea)) return 'overdue';
    }

    // 6. Unassigned hoặc chưa list
    return 'not-listed';
  }

  // ═══ BUILD STATUS COUNTS — đồng bộ 100% với web app ═══
  // Counts logic giống IdeaPoolPage.tsx statusCounts:
  // "Chưa list" (nl) = ideas NOT done AND NOT need-fix (unassigned + overdue + urgent + not-listed)
  // "Overdue" (od) = ideas with ANY assignment overdue
  // "Gấp" (ug) = idea.urgent
  // "Need Fix" (nf) = ANY assignment need_fix
  // "Done" (dn) = COUNT of done ASSIGNMENTS (not ideas!) — matches web app doneAssignmentCount
  // "Scheduled" = has scheduled_date, not done
  function buildStatusCounts(ideasSubset, shopFilter) {
    const ideas = ideasSubset || allIdeas;
    const sf = shopFilter || 'all';
    const hasShopFilter = sf && sf !== 'all';

    // ═══ Count exactly like web app ═══
    const counts = {
      all: ideas.length,
      'not-listed': 0,  // = ideas: unassigned OR (not done AND not need-fix)
      overdue: 0,       // = ideas: any assignment overdue
      urgent: 0,        // = ideas: urgent flag
      'need-fix': 0,    // = ideas: any need_fix
      done: 0,          // = ASSIGNMENTS count (not ideas!)
      scheduled: 0,     // = ideas: has scheduled_date
    };

    // "Chưa list" = ideas not done and not need-fix (matches web app nl count)
    counts['not-listed'] = ideas.filter(i => {
      if (!i._assignments?.length) return true; // unassigned = chưa list
      if (hasShopFilter ? isNeedFixForShop(i, sf) : hasAnyNeedFix(i)) return false;
      return hasShopFilter ? !isIdeaDoneForShop(i, sf) : !isIdeaDone(i);
    }).length;

    // "Overdue" = ideas where ANY assignment overdue (matches web app od count)
    counts.overdue = ideas.filter(i => {
      if (hasShopFilter) return isOverdueForShop(i, sf);
      return isIdeaOverdue(i);
    }).length;

    // "Gấp" = urgent ideas
    counts.urgent = ideas.filter(i => i.urgent).length;

    // "Need Fix" = ideas with any need_fix
    counts['need-fix'] = ideas.filter(i => {
      return hasShopFilter ? isNeedFixForShop(i, sf) : hasAnyNeedFix(i);
    }).length;

    // "Done" = done ASSIGNMENT count (not idea count!) — matches web app doneAssignmentCount
    counts.done = countDoneAssignments(ideas, sf);

    // "Scheduled" = ideas with scheduled_date, not done
    counts.scheduled = ideas.filter(i => {
      const st = getIdeaStatus(i, sf);
      return st === 'scheduled';
    }).length;

    // Update chip count badges
    document.getElementById('cnt-all')  && (document.getElementById('cnt-all').textContent = counts.all);
    document.getElementById('cnt-notlisted') && (document.getElementById('cnt-notlisted').textContent = counts['not-listed']);
    document.getElementById('cnt-overdue') && (document.getElementById('cnt-overdue').textContent = counts.overdue);
    document.getElementById('cnt-urgent') && (document.getElementById('cnt-urgent').textContent = counts.urgent);
    document.getElementById('cnt-needfix') && (document.getElementById('cnt-needfix').textContent = counts['need-fix']);
    document.getElementById('cnt-done') && (document.getElementById('cnt-done').textContent = counts.done);
    document.getElementById('cnt-scheduled') && (document.getElementById('cnt-scheduled').textContent = counts.scheduled);
    return counts;
  }

  // ═══ BUILD ADVANCED FILTER OPTIONS ═══
  function buildAdvancedFilterOptions() {
    // Helper: populate a <select> with unique sorted values
    function populateSelect(selectEl, label, values) {
      if (!selectEl) return;
      const savedVal = selectEl.value;
      selectEl.innerHTML = `<option value="all">${label}</option>`;
      values.forEach(v => {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v.length > 20 ? v.substring(0, 20) + '...' : v;
        selectEl.appendChild(opt);
      });
      if (savedVal && savedVal !== 'all') selectEl.value = savedVal;
    }

    // Source dropdown (from idea.source / domain)
    const sources = [...new Set(allIdeas.map(i => i.source).filter(Boolean))].sort();
    populateSelect(filterSource, 'Source', sources);

    // Variant dropdown
    const variants = [...new Set(allIdeas.map(i => i.variant).filter(Boolean))].sort();
    populateSelect(filterVariant, 'Variant', variants);

    // ═══ Team dropdown — v1.3.2: use _shopTeamMap (multi-strategy, mirrors web app IdeaPoolPage.tsx) ═══
    // _shopTeamMap is built by _buildShopTeamMap() with priority:
    //   main_seller_id → shop.department_id → assigned_member_ids
    // and _getTeamFromMember supports: department_id → sub_role → role pattern → department string.
    if (filterTeam) {
      const savedVal = filterTeam.value;
      const availableTeams = [...new Set([..._shopTeamMap.values()])].sort();
      // Mirror as window._shopTeamMap (object) for legacy code paths that read it that way
      const stmObj = {};
      _shopTeamMap.forEach((v, k) => { stmObj[String(k)] = v; });
      window._shopTeamMap = stmObj;
      console.log('[Matrixty v1.3.2] Teams from _shopTeamMap:', availableTeams, '| entries:', _shopTeamMap.size);
      filterTeam.innerHTML = '<option value="all">All Teams</option>';
      availableTeams.forEach(t => {
        const opt = document.createElement('option');
        opt.value = t; opt.textContent = t;
        filterTeam.appendChild(opt);
      });
      if (savedVal && savedVal !== 'all') filterTeam.value = savedVal;
    }

    // ═══ Members dropdown — v1.3.2: grouped by team via <optgroup>, same logic as web app ═══
    // If teamFilter='all' → show all Seller members grouped by team
    // If teamFilter='Team X' → show only members of Team X (no grouping needed)
    if (filterMember) {
      const savedVal = filterMember.value;
      filterMember.innerHTML = '<option value="all">All Members</option>';
      // Build helpers — mirrors _buildShopTeamMap so same precedence
      const deptMap = new Map();
      const deptNameSet = new Set();
      (allTeams || []).forEach(d => { deptMap.set(d.id, d.name); deptNameSet.add(d.name); });

      let members = (allMembers || []).slice();
      if (teamFilter && teamFilter !== 'all') {
        // Single-team mode — flat list, only members of that team
        members = members.filter(m => _getTeamFromMember(m, deptMap, deptNameSet) === teamFilter);
        members.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        members.forEach(m => {
          const opt = document.createElement('option');
          opt.value = m.name; opt.textContent = m.name || m.email || 'Member';
          filterMember.appendChild(opt);
        });
      } else {
        // All-teams mode — only Seller members, grouped by team via <optgroup>
        members = members.filter(m => (m.role || '').includes('Seller'));
        const groupsMap = new Map(); // team → members[]
        const orphan = [];
        members.forEach(m => {
          const t = _getTeamFromMember(m, deptMap, deptNameSet);
          if (t) {
            if (!groupsMap.has(t)) groupsMap.set(t, []);
            groupsMap.get(t).push(m);
          } else {
            orphan.push(m);
          }
        });
        const sortedTeams = [...groupsMap.keys()].sort();
        sortedTeams.forEach(team => {
          const group = document.createElement('optgroup');
          const teamMembers = groupsMap.get(team).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          group.label = `${team} (${teamMembers.length})`;
          teamMembers.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.name; opt.textContent = m.name || m.email || 'Member';
            group.appendChild(opt);
          });
          filterMember.appendChild(group);
        });
        if (orphan.length > 0) {
          const og = document.createElement('optgroup');
          og.label = `Khác (${orphan.length})`;
          orphan.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
          orphan.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.name; opt.textContent = m.name || m.email || 'Member';
            og.appendChild(opt);
          });
          filterMember.appendChild(og);
        }
      }
      console.log('[Matrixty v1.3.2] Member dropdown rebuilt, teamFilter=', teamFilter);
      if (savedVal && savedVal !== 'all') filterMember.value = savedVal;
      // v1.3.4: mirror into searchable member dropdown widget (if available — defined later in file)
      try { if (typeof memberDd !== 'undefined' && memberDd) memberDd.sync(); } catch(e) {}
    }
  }

  // ═══ UPDATE FILTER BADGE COUNT ═══
  function updateFilterBadge() {
    let count = 0;
    if (sourceFilter !== 'all') count++;
    if (variantFilter !== 'all') count++;
    if (assignedFilter !== 'all') count++;
    if (teamFilter !== 'all') count++;
    if (selectedShopFilter !== 'all') count++;
    if (memberFilter !== 'all') count++;
    if (nicheFilter !== 'all') count++;
    if (selectedDateFilter !== 'all_time') count++;
    const badge = document.getElementById('cnt-filters');
    if (badge) badge.textContent = count;
    const toggleBtn = document.getElementById('toggle-adv-filters');
    if (toggleBtn) toggleBtn.classList.toggle('has-filters', count > 0);
  }

  // ===== AUTH =====

  // ═══ v7.0.5: FAST INIT — load user + cache + state in ONE storage call ═══
  // Before: 3 sequential async calls (user → state → cache) = ~300ms+ delay
  // After: 1 parallel call = ~100ms, then immediate render
  chrome.storage.local.get(['matrixtyUser', CACHE_KEY, STATE_KEY], (d) => {
    if (d.matrixtyUser?.id) {
      // Đã login → show main view NGAY (dùng cached user) → refresh access ở background
      currentUser = d.matrixtyUser;

      // ═══ PRE-LOAD: Populate ideas from cache BEFORE showMainView ═══
      // This ensures listing zone has data when switchTab('listing') is called
      const cached = d[CACHE_KEY];
      const savedState = d[STATE_KEY];
      let preloadedFromCache = false;
      // Cache stores pre-filtered ideas for the user who saved it
      // Verify: 1) cache version matches (invalidate old format), 2) belongs to current user
      const cacheVersionOk = cached?.version === CACHE_VERSION;
      const cacheUserMatch = !cached?.userId || cached.userId === d.matrixtyUser.id;
      console.log(`[Matrixty] FAST INIT cache check: exists=${!!cached}, version=${cached?.version}/${CACHE_VERSION}, versionOk=${cacheVersionOk}, userMatch=${cacheUserMatch}, ideas=${cached?.allIdeas?.length || 0}, shops=${cached?.allShops?.length || 0}`);
      if (cached && cacheVersionOk && cached.allIdeas?.length > 0 && cached.allShops?.length > 0 && cacheUserMatch) {
        allShops = cached.allShops;
        allMembers = cached.allMembers || [];
        allTeams = cached.allTeams || [];
        // v1.2-fix: rehydrate permittedShopIds from cache so first-render dropdown is correct
        permittedShopIds = new Set(cached.permittedShopIds || []);
        // v1.2-fix: rebuild shop→team map from cached data
        _shopTeamMap = _buildShopTeamMap(allShops, allMembers, allTeams);
        // Cache already contains permission-filtered ideas — NO re-filter needed
        allIdeas = cached.allIdeas;
        preloadedFromCache = true;
        console.log(`[Matrixty] FAST INIT: pre-loaded ${allIdeas.length} ideas from cache`);
      } else if (cached) {
        // Old or mismatched cache — clear it to avoid confusion
        console.warn(`[Matrixty] FAST INIT: cache REJECTED (version=${cached?.version}, expected=${CACHE_VERSION}, userOk=${cacheUserMatch}) — will fetch fresh`);
        chrome.storage.local.remove([CACHE_KEY]);
      }

      // ═══ PRE-INJECT saved state so showMainView can use it ═══
      // Also pre-populate _cachedPopupState so restorePopupState() returns instantly
      const stateAge = savedState ? (Date.now() - (savedState.timestamp || 0)) : Infinity;
      _cachedPopupState = (savedState && stateAge < 30 * 60 * 1000) ? savedState : null;

      window._matrixtyPreloadedState = _cachedPopupState;
      window._matrixtyPreloadedCache = preloadedFromCache;
      window._matrixtyCacheAge = cached ? (Date.now() - (cached.timestamp || 0)) : Infinity;

      showMainView(d.matrixtyUser);

      // Refresh access ở background (không block UI)
      checkAccess(d.matrixtyUser.email).then(r => {
        if (r?.allowed) {
          // v1.2-fix: snapshot prev permissions BEFORE overwriting so we can detect change
          const _prevAssignedShops = JSON.stringify(
            (d.matrixtyUser.assigned_shops || []).map(x => typeof x === 'object' ? (x?.id || x?.shop_id) : x).filter(Boolean).map(String).sort()
          );
          const _prevDept = d.matrixtyUser.department_id || null;
          const _prevRole = (d.matrixtyUser.role || '').toLowerCase();

          const user = {
            ...d.matrixtyUser,
            crawl_access: r.crawl_access === true,
            clipart_access: r.clipart_access === true,
            listing_access: r.listing_access === true,
            // v1.2-fix: prefer FRESH server value even when array is empty (admin may have revoked all shops)
            assigned_shops: Array.isArray(r.assigned_shops) ? r.assigned_shops : (d.matrixtyUser.assigned_shops || []),
            department_id: r.department_id !== undefined ? r.department_id : (d.matrixtyUser.department_id || null),
            is_leader: r.is_leader || d.matrixtyUser.is_leader || false,
            sub_role: r.sub_role || d.matrixtyUser.sub_role || '',
            role: r.role || d.matrixtyUser.role || '',
          };
          chrome.storage.local.set({ matrixtyUser: user });
          currentUser = user;
          // Không gọi lại showMainView — tránh reset UI

          // v1.2-fix: if user permissions actually changed, kick off a fresh data sync
          // so shop dropdown + idea list reflect the new permissions without manual refresh.
          const _newAssignedShops = JSON.stringify(
            (user.assigned_shops || []).map(x => typeof x === 'object' ? (x?.id || x?.shop_id) : x).filter(Boolean).map(String).sort()
          );
          const _newDept = user.department_id || null;
          const _newRole = (user.role || '').toLowerCase();
          const permsChanged = _prevAssignedShops !== _newAssignedShops || _prevDept !== _newDept || _prevRole !== _newRole;
          if (permsChanged) {
            console.log('[Matrixty v1.2-fix] User permissions changed since last sync → invalidating cache & reloading shops/ideas');
            chrome.storage.local.remove([CACHE_KEY]);
            // Force a fresh fetch — loadListingIdeas will rebuild shop dropdown via the sig check above.
            // Reset hasRestoredOnce so the next displayIdeas() actually re-renders.
            try {
              hasRestoredOnce = false;
              if (typeof loadListingIdeas === 'function') loadListingIdeas();
            } catch (e) { console.warn('[Matrixty v1.2-fix] reload after perm change failed:', e); }
          }
        } else {
          chrome.storage.local.remove(['matrixtyUser']);
          currentUser = null;
          mainView.classList.add('hidden');
          loginView.classList.remove('hidden');
          showError('Access revoked.');
        }
      }).catch(e => {
        console.warn('[Matrixty] checkAccess background refresh failed:', e);
        // Network error — vẫn giữ cached user, không làm gì
      });
    } else {
      // Chưa login → show login view
      loginView.classList.remove('hidden');
    }
  });

  loginBtn.addEventListener('click', async () => {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;
    if (!email || !password) { showError('Please enter email and password'); return; }
    loginBtn.disabled = true; loginBtn.textContent = 'Logging in...'; loginError.style.display = 'none';
    console.log('[Matrixty v9.5] Login attempt:', email);
    try {
      // v9.5: 3-step login: popup fetch → retry → background script fallback
      // Orbita/anti-detect browsers may route popup fetch differently than service worker
      const LOGIN_TIMEOUT = 20000;
      let result = null;

      // Step 1: Try popup fetch (fastest path for normal browsers)
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), LOGIN_TIMEOUT);
        console.log(`[Matrixty v9.5] Step 1: Popup fetch (timeout ${LOGIN_TIMEOUT/1000}s)`);
        const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/extension_login`, {
          method: 'POST', headers: HDR,
          body: JSON.stringify({ p_email: email, p_password: password }),
          signal: controller.signal,
        });
        clearTimeout(timeout);
        if (res.ok) {
          result = await res.json();
          console.log('[Matrixty v9.5] Step 1 OK:', result?.id ? 'login success' : 'login fail');
        } else {
          console.warn(`[Matrixty v9.5] Step 1 HTTP error: ${res.status}`);
        }
      } catch (e) {
        console.warn(`[Matrixty v9.5] Step 1 failed: ${e.name} ${e.message}`);
      }

      // Step 2: If popup fetch failed, try background script (different network context)
      if (!result) {
        loginBtn.textContent = 'Trying background...';
        console.log('[Matrixty v9.5] Step 2: Background script login');
        try {
          const bgResult = await new Promise((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('BG_LOGIN timeout')), 35000);
            chrome.runtime.sendMessage(
              { type: 'BG_LOGIN', payload: { email, password } },
              (response) => {
                clearTimeout(timer);
                if (chrome.runtime.lastError) {
                  reject(new Error(chrome.runtime.lastError.message));
                } else {
                  resolve(response);
                }
              }
            );
          });
          if (bgResult?.ok && bgResult.result) {
            result = bgResult.result;
            console.log('[Matrixty v9.5] Step 2 OK:', result?.id ? 'login success' : 'login fail');
          } else if (bgResult?.error) {
            throw new Error(bgResult.error);
          }
        } catch (bgErr) {
          console.warn(`[Matrixty v9.5] Step 2 failed: ${bgErr.message}`);
        }
      }

      // Step 3: Last resort — retry popup fetch once more
      if (!result) {
        loginBtn.textContent = 'Final retry...';
        console.log('[Matrixty v9.5] Step 3: Final popup fetch retry');
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), LOGIN_TIMEOUT);
          const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/extension_login`, {
            method: 'POST', headers: HDR,
            body: JSON.stringify({ p_email: email, p_password: password }),
            signal: controller.signal,
          });
          clearTimeout(timeout);
          if (res.ok) result = await res.json();
        } catch (e) {
          console.warn(`[Matrixty v9.5] Step 3 failed: ${e.name}`);
        }
      }

      if (!result) {
        throw new Error('Cannot connect to server. Check network/proxy settings on this browser.');
      }
      console.log('[Matrixty v9.5] Login result:', result?.id ? 'OK' : 'FAIL');
      if (result?.error) throw new Error(result.error);
      if (!result?.id) throw new Error('Wrong email or password');
      if (!result.extension_access) throw new Error('Account not authorized for Extension. Contact Admin.');

      const user = {
        id: result.id, email: result.email, name: result.name, role: result.role,
        crawl_access: result.crawl_access === true,
        clipart_access: result.clipart_access === true,
        listing_access: result.listing_access === true,
        assigned_shops: result.assigned_shops || [],
        department_id: result.department_id || null,
        is_leader: result.is_leader || false,
        sub_role: result.sub_role || '',
      };
      chrome.storage.local.set({ matrixtyUser: user });
      currentUser = user;
      pushAuth(user);
      showMainView(user);
    } catch (err) {
      console.error('[Matrixty v9.4] Login error:', err.name, err.message);
      showError(err.message);
    }
    finally { loginBtn.disabled = false; loginBtn.textContent = 'Login'; }
  });

  logoutBtn.addEventListener('click', () => {
    chrome.storage.local.remove(['matrixtyUser', STATE_KEY]);
    currentUser = null;
    send({ type: 'AUTH_LOGOUT' });
    loginView.classList.remove('hidden'); mainView.classList.add('hidden');
  });

  // ===== TAB SWITCHING =====

  function switchTab(tab) {
    activeTab = tab;
    savePopupState();
    // Update tab buttons
    tabBtns.forEach(btn => {
      btn.className = 'tab-btn'; // reset
      if (btn.dataset.tab === tab) {
        btn.classList.add('active-' + tab);
      }
    });
    // Show/hide content
    zoneCrawl.classList.toggle('active', tab === 'crawl');
    zoneClipart.classList.toggle('active', tab === 'clipart');
    zoneListing.classList.toggle('active', tab === 'listing');
    if (zoneAnhphu) zoneAnhphu.classList.toggle('active', tab === 'anhphu');
    if (zonePic) zonePic.classList.toggle('active', tab === 'pic');
    zoneCrawl.classList.remove('tab-content'); zoneCrawl.classList.add('tab-content');
    zoneClipart.classList.remove('tab-content'); zoneClipart.classList.add('tab-content');
    zoneListing.classList.remove('tab-content'); zoneListing.classList.add('tab-content');
    if (zoneAnhphu) { zoneAnhphu.classList.remove('tab-content'); zoneAnhphu.classList.add('tab-content'); }
    if (zonePic) { zonePic.classList.remove('tab-content'); zonePic.classList.add('tab-content'); }

    // Refresh status for active tab
    if (tab === 'crawl') { tryCrawlResume(); refreshStatus(); }
    if (tab === 'clipart') { refreshClipartStatus(); loadStudioTasks(); }
    if (tab === 'listing') refreshListingStatus();
    if (tab === 'anhphu') loadAnhPhuTemplates();
    if (tab === 'pic') loadPicImages();
  }

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      if (!btn.classList.contains('hidden')) {
        switchTab(btn.dataset.tab);
      }
    });
  });

  // ===== CRAWL MODE BUTTONS =====

  document.querySelectorAll('.mode-btn[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      _lastCrawlMode = mode; // v9.2: Track for state persistence
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { type: 'ACTIVATE', mode }, () => { if (chrome.runtime.lastError) {} setTimeout(refreshStatus, 500); });
      });
      document.querySelectorAll('.mode-btn[data-mode]').forEach(b => {
        b.style.borderColor = '#EEEDEA'; b.style.background = '#fff';
      });
      btn.style.borderColor = '#1565C0';
      btn.style.background = 'rgba(21,101,192,0.04)';
    });
  });

  // ===== CLIPART SCANNER =====

  // Auto Scan button — v9.4.1: same robust flow (sendMessage → inject fallback → final fallback)
  document.getElementById('clipart-btn')?.addEventListener('click', async () => {
    const status = document.getElementById('st-clipart');
    if (status) status.textContent = 'Scanning...';
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) { if (status) status.textContent = 'No active tab'; return; }

      // Try direct sendMessage first
      let r = null;
      try {
        r = await chrome.tabs.sendMessage(tab.id, { type: 'CLIPART_SCAN' });
      } catch (e) {
        // Inject content.js and retry once
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js', 'listing.js'],
          });
          await new Promise(rr => setTimeout(rr, 250));
          r = await chrome.tabs.sendMessage(tab.id, { type: 'CLIPART_SCAN' });
        } catch (e2) {
          console.warn('[Matrixty popup] auto-scan inject failed:', e2);
        }
      }

      if (r && r.ok) {
        if (status) status.textContent = `Done: ${r.data?.categories?.length || 0} groups`;
      } else {
        if (status) status.textContent = 'Failed — F5 trang rồi thử lại';
      }
    } catch (e) {
      console.error('[Matrixty popup] auto-scan error:', e);
      if (status) status.textContent = 'Error — xem console';
    }
  });

  // Manual Scan button — v9.4.1: robust with sendMessage + retry-after-inject + clear feedback
  // Previous bug: chrome.scripting.executeScript({func}) raced with window.close() → silent fail.
  // New flow: await sendMessage → if no listener, inject content.js → retry → alert on final failure.
  document.getElementById('clipart-manual-btn')?.addEventListener('click', async () => {
    const status = document.getElementById('st-clipart');
    if (status) status.textContent = 'Opening panel...';
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab) { if (status) status.textContent = 'No active tab'; return; }

      // Step 1: try direct message (fastest path if content script already loaded)
      let ok = false;
      try {
        const r = await chrome.tabs.sendMessage(tab.id, { type: 'CLIPART_MANUAL_SCAN' });
        ok = !!(r && r.ok);
      } catch (e) {
        // sendMessage rejects with "Could not establish connection" if no listener → fallthrough to inject
      }

      // Step 2: inject content.js + listing.js if not loaded, then retry
      if (!ok) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js', 'listing.js'],
          });
          // Give the IIFE a tick to register the listener and set window.__matrixtyClipart
          await new Promise(r => setTimeout(r, 250));
          const r2 = await chrome.tabs.sendMessage(tab.id, { type: 'CLIPART_MANUAL_SCAN' });
          ok = !!(r2 && r2.ok);
        } catch (e) {
          console.warn('[Matrixty popup] inject+retry failed:', e);
        }
      }

      // Step 3: last-resort direct execution (in case message handler didn't bind)
      if (!ok) {
        try {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              if (window.__matrixtyClipart && window.__matrixtyClipart.manualScan) {
                window.__matrixtyClipart.manualScan();
                return true;
              }
              return false;
            },
          });
          ok = true;  // assume success — no easy way to check from popup side
        } catch (e) {
          console.error('[Matrixty popup] final fallback failed:', e);
        }
      }

      if (!ok && status) status.textContent = 'Failed — F5 trang rồi thử lại';
    } finally {
      // Close popup AFTER all the awaits resolve so we don't kill in-flight script injection
      window.close();
    }
  });

  // ============================================================
  //  LISTING TAB — FILTER + IDEAS + GENERATE + AUTO-FILL
  // ============================================================

  function detectPlatformOnTab() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      const url = tabs[0].url || '';
      if (url.includes('etsy.com') && (url.includes('/listing/') || url.includes('/listings/') || url.includes('/listing-editor/') || url.includes('/edit'))) {
        detectedPlatform = 'etsy';
      } else if (url.includes('sellercentral') && url.includes('amazon')) {
        detectedPlatform = 'amazon';
      } else {
        detectedPlatform = 'unknown';
      }
      updatePlatformBadge();
    });
  }

  function updatePlatformBadge() {
    if (!listingPlatformBadge) return;
    listingPlatformBadge.className = 'listing-platform-badge ' + detectedPlatform;
    if (detectedPlatform === 'etsy') listingPlatformBadge.textContent = 'Etsy';
    else if (detectedPlatform === 'amazon') listingPlatformBadge.textContent = 'Amazon';
    else listingPlatformBadge.textContent = '--';
  }

  // ===== SHOP FILTER =====

  // Load ALL active shops from idea_shops table (same as web app)
  // loadAllShops is now handled inside loadListingIdeas (loaded in parallel with ideas + assignments)
  async function loadAllShops() { /* no-op — shops loaded in loadListingIdeas */ }

  function buildShopFilterOptions() {
    if (!listingShopFilter) return;

    // v1.2-fix: idempotent — clear existing options + remember current selection
    // so re-render after background sync (new shops added / permissions changed in webapp)
    // doesn't cause duplicate options or lose user's filter choice.
    const prevValue = listingShopFilter.value;
    listingShopFilter.innerHTML = '';

    // ═══ FILTER SHOPS BASED ON USER PERMISSIONS ═══
    const userRole = (currentUser?.role || '').toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'owner';
    let visibleShops = allShops;

    if (!isAdmin) {
      // Non-admin: chỉ show shops mà user được assign
      // Dùng cùng logic như mergeIdeasData: assigned_shops + assigned_member_ids
      const userId = currentUser?.id;
      const assignedShops = currentUser?.assigned_shops || [];
      const myShopIdsFromUser = new Set(
        assignedShops.map(s => typeof s === 'object' ? (s.id || s.shop_id) : s).filter(Boolean)
      );

      // Check assigned_member_ids trong shop data
      const userIdStr = userId ? String(userId) : '';
      const userDeptId = currentUser?.department_id;
      const myShopIdsFromTable = new Set();
      const myShopIdsFromDept = new Set();
      allShops.forEach(shop => {
        // Method 2: assigned_member_ids
        const memberIds = shop.assigned_member_ids || [];
        if (Array.isArray(memberIds) && userIdStr) {
          if (memberIds.some(mid => String(mid) === userIdStr)) {
            myShopIdsFromTable.add(shop.id);
          }
        }
        // Method 3: department_id matching
        if (userDeptId && shop.department_id && String(shop.department_id) === String(userDeptId)) {
          myShopIdsFromDept.add(shop.id);
        }
      });

      // v1.2-fix: METHOD 4 — shop_permissions (matches webapp source of truth)
      const myShopIdsFromPerms = permittedShopIds || new Set();

      // v1.2-fix: METHOD 5 — team-based visibility for Leaders/Managers (mirrors webapp shopTeamMap)
      const myShopIdsFromTeam = new Set();
      if (_isUserTeamLeader(currentUser)) {
        const _deptMap = new Map((allTeams || []).map(d => [d.id, d.name]));
        const _deptNameSet = new Set((allTeams || []).map(d => d.name));
        const userTeam = _getUserTeam(currentUser, _deptMap, _deptNameSet);
        if (userTeam) {
          for (const [shopId, shopTeam] of _shopTeamMap) {
            if (shopTeam === userTeam) myShopIdsFromTeam.add(shopId);
          }
        }
      }

      const allMyShopIds = new Set([
        ...myShopIdsFromUser,
        ...myShopIdsFromTable,
        ...myShopIdsFromDept,
        ...myShopIdsFromPerms,
        ...myShopIdsFromTeam,
      ]);
      console.log(`[Matrixty v1.2-fix] Shop filter debug: fromUser=${myShopIdsFromUser.size}, fromTable=${myShopIdsFromTable.size}, fromDept=${myShopIdsFromDept.size}, fromPerms=${myShopIdsFromPerms.size}, fromTeam=${myShopIdsFromTeam.size}, total=${allMyShopIds.size}`);

      if (allMyShopIds.size > 0) {
        visibleShops = allShops.filter(s => allMyShopIds.has(s.id));
      } else {
        // Fallback: chỉ show shops có trong allIdeasGrouped (đã filtered bởi mergeIdeasData)
        const shopNamesInIdeas = new Set(Object.keys(allIdeasGrouped).filter(n => n !== '(Unassigned)'));
        visibleShops = allShops.filter(s => shopNamesInIdeas.has(s.name));
      }
      console.log(`[Matrixty v1.2-fix] Shop filter: showing ${visibleShops.length}/${allShops.length} shops for non-admin`);
    }

    // "All" option — show count
    const allOpt = document.createElement('option');
    allOpt.value = 'all';
    allOpt.textContent = isAdmin ? `All Shops (${allIdeas.length})` : `My Shops (${allIdeas.length})`;
    listingShopFilter.appendChild(allOpt);

    if (visibleShops.length > 0) {
      // v1.3.2: Group shops by TEAM (mirrors web app IdeaPoolPage shopsByTeam).
      //   Falls back to platform grouping if team data unavailable (no _shopTeamMap entries).
      const stm = _shopTeamMap || new Map();
      const hasTeamData = stm.size > 0;

      const addGroup = (label, shops) => {
        if (shops.length === 0) return;
        const group = document.createElement('optgroup');
        group.label = `${label} (${shops.length})`;
        // Stable sort: highest idea-count first, then alpha
        shops
          .map(shop => ({ shop, count: window._shopIdeaCounts?.[shop.name] || allIdeasGrouped[shop.name]?.length || 0 }))
          .sort((a, b) => (b.count - a.count) || a.shop.name.localeCompare(b.shop.name))
          .forEach(({ shop, count }) => {
            const opt = document.createElement('option');
            opt.value = shop.name;
            opt.textContent = `${shop.name} (${count})`;
            group.appendChild(opt);
          });
        listingShopFilter.appendChild(group);
      };

      if (hasTeamData) {
        // Bucket shops by team using _shopTeamMap
        const byTeam = new Map();   // teamName → shops[]
        const orphan = [];
        visibleShops.forEach(s => {
          const t = stm.get(s.id);
          if (t) {
            if (!byTeam.has(t)) byTeam.set(t, []);
            byTeam.get(t).push(s);
          } else {
            orphan.push(s);
          }
        });
        // Render teams alphabetically (matches Idea Pool web app)
        [...byTeam.keys()].sort().forEach(team => addGroup(team, byTeam.get(team)));
        if (orphan.length > 0) addGroup('Khác', orphan);
      } else {
        // Fallback — group by platform (legacy behavior)
        const etsy = visibleShops.filter(s => (s.platform || '').toLowerCase() === 'etsy');
        const amazon = visibleShops.filter(s => (s.platform || '').toLowerCase() === 'amazon');
        const other = visibleShops.filter(s => !['etsy', 'amazon'].includes((s.platform || '').toLowerCase()));
        addGroup('🟢 Etsy', etsy);
        addGroup('🟠 Amazon', amazon);
        if (other.length > 0) addGroup('Other', other);
      }
    }

    // Add (Unassigned) if there are unassigned ideas
    if (allIdeasGrouped['(Unassigned)']?.length > 0) {
      const opt = document.createElement('option');
      opt.value = '(Unassigned)';
      opt.textContent = `(Unassigned) (${allIdeasGrouped['(Unassigned)'].length})`;
      listingShopFilter.appendChild(opt);
    }

    // v1.2-fix: restore previous selection if still present in the new list
    if (prevValue) {
      const stillExists = Array.from(listingShopFilter.options).some(o => o.value === prevValue);
      if (stillExists) listingShopFilter.value = prevValue;
    }
    // v1.3.3: Mirror native select into custom searchable dropdown widget
    try { syncShopDropdownWidget(); } catch(e) { console.warn('[Matrixty v1.3.3] shop widget sync failed:', e); }
  }

  // ═══ v1.3.4: Reusable searchable dropdown widget factory ═══
  // The native <select> stays as the authoritative state holder; this widget mirrors
  // its options into a div panel with a search box on top. Click an item → set
  // native select value + dispatch 'change' so existing listener picks it up.
  // v1.3.5: Registry to close other dropdowns when opening a new one
  const _searchDdRegistry = [];
  function createSearchableDropdown({ rootId, triggerId, panelId, listId, searchId, nativeSelectId, defaultLabel, emptyText }) {
    const root = document.getElementById(rootId);
    const trigger = document.getElementById(triggerId);
    const panel = document.getElementById(panelId);
    const list = document.getElementById(listId);
    const search = document.getElementById(searchId);
    const nativeSelect = document.getElementById(nativeSelectId);
    if (!root || !trigger || !panel || !list || !search || !nativeSelect) {
      console.warn('[Matrixty v1.3.4] searchable-dd missing element(s) for', rootId);
      return { sync: () => {}, setLabel: () => {} };
    }

    function setLabel() {
      const opt = nativeSelect.options[nativeSelect.selectedIndex];
      const text = opt ? opt.textContent : defaultLabel;
      trigger.textContent = text;
      trigger.title = text;
    }

    function appendItem(opt, currentVal) {
      const item = document.createElement('div');
      item.className = 'search-dd-item' + (opt.value === currentVal ? ' selected' : '');
      item.setAttribute('data-value', opt.value);
      item.setAttribute('role', 'option');
      const m = (opt.textContent || '').match(/^(.+?)\s*\((\d+)\)\s*$/);
      const label = m ? m[1] : opt.textContent;
      const count = m ? m[2] : '';
      item.innerHTML =
        '<span class="check">' + (opt.value === currentVal ? '✓' : '') + '</span>' +
        '<span class="label"></span>' +
        (count ? '<span class="count">(' + count + ')</span>' : '');
      item.querySelector('.label').textContent = label;
      item.addEventListener('click', () => {
        nativeSelect.value = opt.value;
        nativeSelect.dispatchEvent(new Event('change', { bubbles: true }));
        close();
      });
      list.appendChild(item);
    }

    function sync() {
      list.innerHTML = '';
      const currentVal = nativeSelect.value;
      Array.from(nativeSelect.children).forEach(child => {
        if (child.tagName === 'OPTGROUP') {
          const lbl = document.createElement('div');
          lbl.className = 'search-dd-group-label';
          lbl.textContent = child.label;
          list.appendChild(lbl);
          Array.from(child.children).forEach(opt => appendItem(opt, currentVal));
        } else if (child.tagName === 'OPTION') {
          appendItem(child, currentVal);
        }
      });
      setLabel();
    }

    function open() {
      // v1.3.5: Close any OTHER open searchable dropdown first
      _searchDdRegistry.forEach(dd => { if (dd && dd.close && dd.root !== root) dd.close(); });
      panel.hidden = false;
      root.classList.add('open');
      trigger.setAttribute('aria-expanded', 'true');
      // v1.3.5: Position panel so it doesn't overflow viewport right edge
      try {
        const tr = trigger.getBoundingClientRect();
        const panelW = 240;
        const margin = 8;
        if (tr.left + panelW > window.innerWidth - margin) {
          panel.style.left = 'auto';
          panel.style.right = '0';
        } else {
          panel.style.left = '0';
          panel.style.right = 'auto';
        }
      } catch (e) {}
      setTimeout(() => search.focus(), 30);
    }
    function close() {
      panel.hidden = true;
      root.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
      search.value = '';
      filter('');
    }
    function filter(q) {
      q = (q || '').toLowerCase().trim();
      let visibleCount = 0;
      const children = Array.from(list.children);
      let lastGroupLabel = null;
      let lastGroupHasVisible = false;
      children.forEach(el => {
        if (el.classList.contains('search-dd-group-label')) {
          if (lastGroupLabel) lastGroupLabel.style.display = lastGroupHasVisible ? '' : 'none';
          lastGroupLabel = el;
          lastGroupHasVisible = false;
        } else if (el.classList.contains('search-dd-item')) {
          const label = el.querySelector('.label')?.textContent.toLowerCase() || '';
          const match = !q || label.includes(q);
          el.style.display = match ? '' : 'none';
          if (match) { visibleCount++; lastGroupHasVisible = true; }
        }
      });
      if (lastGroupLabel) lastGroupLabel.style.display = lastGroupHasVisible ? '' : 'none';
      let emptyEl = list.querySelector('.search-dd-empty');
      if (visibleCount === 0) {
        if (!emptyEl) {
          emptyEl = document.createElement('div');
          emptyEl.className = 'search-dd-empty';
          emptyEl.textContent = emptyText || 'Không có kết quả';
          list.appendChild(emptyEl);
        }
        emptyEl.style.display = '';
      } else if (emptyEl) {
        emptyEl.style.display = 'none';
      }
    }

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      if (panel.hidden) open(); else close();
    });
    search.addEventListener('input', () => filter(search.value));
    search.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      if (e.key === 'Enter') {
        const first = list.querySelector('.search-dd-item:not([style*="display: none"])');
        if (first) first.click();
      }
    });
    document.addEventListener('click', (e) => {
      if (panel.hidden) return;
      if (!root.contains(e.target)) close();
    });
    nativeSelect.addEventListener('change', setLabel);

    // v1.3.5: register so open() can close other dropdowns
    const api = { sync, setLabel, open, close, root };
    _searchDdRegistry.push(api);
    return api;
  }

  // Instantiate widgets for shop and member dropdowns
  const shopDd = createSearchableDropdown({
    rootId: 'shop-dd', triggerId: 'shop-dd-trigger', panelId: 'shop-dd-panel',
    listId: 'shop-dd-list', searchId: 'shop-dd-search',
    nativeSelectId: 'listing-shop-filter',
    defaultLabel: 'All Shops', emptyText: 'Không có shop khớp',
  });
  const memberDd = createSearchableDropdown({
    rootId: 'member-dd', triggerId: 'member-dd-trigger', panelId: 'member-dd-panel',
    listId: 'member-dd-list', searchId: 'member-dd-search',
    nativeSelectId: 'filter-member',
    defaultLabel: 'All Members', emptyText: 'Không có member khớp',
  });

  // Legacy alias — buildShopFilterOptions() still calls syncShopDropdownWidget()
  function syncShopDropdownWidget() { shopDd.sync(); }

  /**
   * v1.2-fix: Build a stable signature of (shop list × user permissions) so we can
   * detect when admin adds/removes shops or changes seller assignments in the webapp.
   * Used after every background fetch to decide whether to rebuild the shop dropdown.
   */
  function _shopAccessSignature() {
    const shopFp = (allShops || [])
      .map(s => [
        s.id,
        s.active ? 1 : 0,
        s.name || '',
        (s.platform || '').toLowerCase(),
        Array.isArray(s.assigned_member_ids) ? [...s.assigned_member_ids].map(String).sort().join(',') : '',
        s.department_id || '',
      ].join(':'))
      .sort()
      .join('|');
    const userShops = (currentUser?.assigned_shops || [])
      .map(x => typeof x === 'object' ? (x?.id || x?.shop_id) : x)
      .filter(Boolean)
      .map(String)
      .sort()
      .join(',');
    const userDept = currentUser?.department_id || '';
    const userRole = (currentUser?.role || '').toLowerCase();
    // v1.2-fix: include shop_permissions in sig so live re-render detects leader auto-grants too
    const permIds = [...(permittedShopIds || [])].map(String).sort().join(',');
    return `${shopFp}::${userShops}::${userDept}::${userRole}::${permIds}`;
  }

  listingShopFilter?.addEventListener('change', () => {
    selectedShopFilter = listingShopFilter.value;
    applyFilters();
    savePopupState();
  });

  listingDateFilter?.addEventListener('change', () => {
    selectedDateFilter = listingDateFilter.value;
    applyFilters();
    savePopupState();
  });

  // Refresh button — force clear cache and reload from network
  document.getElementById('listing-refresh-btn')?.addEventListener('click', () => {
    const btn = document.getElementById('listing-refresh-btn');
    if (btn?.disabled) return; // prevent double-click
    // Visual feedback: spinning + disable
    if (btn) { btn.disabled = true; btn.style.animation = 'spin 1s linear infinite'; btn.title = 'Đang sync...'; }
    // Show loading indicator
    if (listingLoading) listingLoading.classList.remove('hidden');
    if (listingEmpty) listingEmpty.classList.add('hidden');
    // Clear cache to force fresh network fetch
    chrome.storage.local.remove([CACHE_KEY]);
    // Reset hasRestoredOnce so displayIdeas will properly re-apply current filters
    hasRestoredOnce = false;
    // Force fresh load
    loadListingIdeas().finally(() => {
      if (btn) { btn.disabled = false; btn.style.animation = ''; btn.title = 'Refresh ideas'; }
    });
  });

  listingSearch?.addEventListener('input', () => {
    // Auto-reset status filter to "all" when searching (so results aren't hidden by status filter)
    if ((listingSearch.value || '').trim() && statusFilter !== 'all') {
      statusFilter = 'all';
      document.querySelectorAll('.st-chip[data-status]').forEach(c => c.classList.remove('active'));
      document.querySelector('.st-chip[data-status="all"]')?.classList.add('active');
    }
    applyFilters();
  });

  // ═══ SEARCH BY CURRENT TAB URL ═══
  document.getElementById('search-by-url-btn')?.addEventListener('click', async () => {
    const btn = document.getElementById('search-by-url-btn');
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.url) return;
      let url = tab.url;
      // Strip protocol and www for flexible matching
      url = url.replace(/^https?:\/\/(www\.)?/, '').replace(/[?#].*$/, '').replace(/\/$/, '');
      if (listingSearch) {
        listingSearch.value = url;
        listingSearch.dispatchEvent(new Event('input'));
      }
      btn?.classList.add('active');
      setTimeout(() => btn?.classList.remove('active'), 1500);
    } catch (e) {
      console.error('[Matrixty] Search by URL error:', e);
    }
  });

  // ═══ STATUS CHIPS ═══
  document.querySelectorAll('.st-chip[data-status]').forEach(chip => {
    chip.addEventListener('click', () => {
      const newStatus = chip.dataset.status;
      // Toggle: click lại chip đang active → reset về 'all'
      if (statusFilter === newStatus && newStatus !== 'all') {
        statusFilter = 'all';
      } else {
        statusFilter = newStatus;
      }
      // Update active state UI
      document.querySelectorAll('.st-chip[data-status]').forEach(c => c.classList.remove('active'));
      if (statusFilter !== 'all') {
        document.querySelector(`.st-chip[data-status="${statusFilter}"]`)?.classList.add('active');
      } else {
        document.querySelector('.st-chip[data-status="all"]')?.classList.add('active');
      }
      applyFilters();
      savePopupState();
    });
  });

  // ═══ SKU COPY (delegated) ═══
  listingIdeas?.addEventListener('click', (e) => {
    const skuEl = e.target.closest('.sku-badge');
    if (skuEl) {
      e.stopPropagation();
      const sku = skuEl.textContent.trim();
      navigator.clipboard.writeText(sku).then(() => {
        skuEl.style.background = '#C8E6C9'; skuEl.style.color = '#2E7D32';
        setTimeout(() => { skuEl.style.background = ''; skuEl.style.color = ''; }, 1000);
      }).catch(() => {});
    }
  });

  // ═══ TOGGLE ADVANCED FILTERS ═══
  document.getElementById('toggle-adv-filters')?.addEventListener('click', (e) => {
    advancedFiltersOpen = !advancedFiltersOpen;
    const panel = document.getElementById('adv-filters-panel');
    if (panel) panel.classList.toggle('hidden', !advancedFiltersOpen);
    e.currentTarget.classList.toggle('active', advancedFiltersOpen);
    savePopupState();
  });

  // ═══ VARIANT FILTER ═══
  filterVariant?.addEventListener('change', () => {
    variantFilter = filterVariant.value;
    applyFilters();
    savePopupState();
  });

  // ═══ NICHE FILTER ═══ (removed from UI but keep handler for backward compat)
  filterNiche?.addEventListener('change', () => {
    nicheFilter = filterNiche.value;
    applyFilters();
    savePopupState();
  });

  // ═══ SOURCE FILTER ═══
  filterSource?.addEventListener('change', () => {
    sourceFilter = filterSource.value;
    applyFilters();
    savePopupState();
  });

  // ═══ TEAM FILTER ═══
  filterTeam?.addEventListener('change', () => {
    teamFilter = filterTeam.value;
    // v1.3.2: Re-populate member dropdown so members are filtered by team
    // (or grouped by team via optgroup when "All Teams" is selected)
    try { buildAdvancedFilterOptions(); } catch(e) { console.warn('[Matrixty v1.3.2] member repop after team change failed:', e); }
    // Reset member filter if previously selected member is no longer in scope
    if (memberFilter !== 'all' && filterMember) {
      const opts = Array.from(filterMember.options).map(o => o.value);
      if (!opts.includes(memberFilter)) {
        memberFilter = 'all';
        filterMember.value = 'all';
      }
    }
    applyFilters();
    savePopupState();
  });

  // ═══ MEMBER FILTER ═══
  filterMember?.addEventListener('change', () => {
    memberFilter = filterMember.value;
    applyFilters();
    savePopupState();
  });

  // ═══ ASSIGNED FILTER ═══
  filterAssigned?.addEventListener('change', () => {
    assignedFilter = filterAssigned.value;
    applyFilters();
    savePopupState();
  });

  // ═══ CLEAR ALL FILTERS ═══
  document.getElementById('clear-all-filters')?.addEventListener('click', () => {
    statusFilter = 'all';
    selectedShopFilter = 'all';
    variantFilter = 'all';
    nicheFilter = 'all';
    sourceFilter = 'all';
    teamFilter = 'all';
    memberFilter = 'all';
    assignedFilter = 'all';
    selectedDateFilter = 'all_time';
    if (listingShopFilter) listingShopFilter.value = 'all';
    if (filterVariant) filterVariant.value = 'all';
    if (filterNiche) filterNiche.value = 'all';
    if (filterSource) filterSource.value = 'all';
    if (filterTeam) filterTeam.value = 'all';
    if (filterMember) filterMember.value = 'all';
    if (filterAssigned) filterAssigned.value = 'all';
    if (listingDateFilter) listingDateFilter.value = 'all_time';
    if (listingSearch) listingSearch.value = '';
    document.querySelectorAll('.st-chip[data-status]').forEach(c => c.classList.remove('active'));
    document.querySelector('.st-chip[data-status="all"]')?.classList.add('active');
    applyFilters();
    savePopupState();
  });

  function applyFilters() {
    const q = (listingSearch?.value || '').toLowerCase().trim();
    let ideas = allIdeas;

    // ═══════════════════════════════════════════════════════════════
    // SEARCH = GLOBAL: When search is active, search ALL ideas first
    // then apply shop/other filters on search results
    // This matches Idea Pool behavior where search overrides filters
    // ═══════════════════════════════════════════════════════════════
    // ═══════════════════════════════════════════════════════════════
    // ALL FILTERS (including search) in normal pipeline
    // Search = AND condition with other filters (same as Idea Pool)
    // ═══════════════════════════════════════════════════════════════

    // ═══ Step 1: Filter by SOURCE ═══
    if (sourceFilter !== 'all') {
      ideas = ideas.filter(i => i.source === sourceFilter);
    }

    // ═══ Step 2: Filter by VARIANT ═══
    if (variantFilter !== 'all') {
      ideas = ideas.filter(i => i.variant === variantFilter);
    }

    // ═══ Step 3: Filter by ASSIGNED ═══
    if (assignedFilter !== 'all') {
      if (assignedFilter === 'assigned') {
        ideas = ideas.filter(i => (i._assignedShopCount || 0) > 0);
      } else if (assignedFilter === 'unassigned') {
        ideas = ideas.filter(i => (i._assignedShopCount || 0) === 0);
      }
    }

    // ═══ Step 4: Filter by TEAM — dùng shopTeamMap (same as web app) ═══
    if (teamFilter !== 'all') {
      const stm = window._shopTeamMap || {};
      const teamShopIds = new Set(Object.entries(stm).filter(([, t]) => t === teamFilter).map(([id]) => id));
      ideas = ideas.filter(i => {
        if (i._assignments?.length > 0) {
          return i._assignments.some(a => teamShopIds.has(String(a.shop_id)));
        }
        return teamShopIds.has(String(i.shop_id));
      });
    }

    // ═══ Step 5: Filter by SHOP ═══
    if (selectedShopFilter !== 'all') {
      ideas = ideas.filter(i => {
        if ((i.shop_name || '(Unassigned)') === selectedShopFilter) return true;
        if (i._assignedShopNames?.includes(selectedShopFilter)) return true;
        return false;
      });
    }

    // ═══ Step 6: Filter by MEMBER (Listed by) ═══
    if (memberFilter !== 'all') {
      ideas = ideas.filter(i => {
        if (i._assignments?.length > 0) {
          return i._assignments.some(a => a.listed_by === memberFilter || a.published_by === memberFilter || a.assigned_by === memberFilter);
        }
        return i.listed_by === memberFilter;
      });
    }

    // ═══ Step 7: Filter by NICHE ═══
    if (nicheFilter !== 'all') {
      ideas = ideas.filter(i => i.niche === nicheFilter);
    }

    // ═══ Step 8: Filter by DATE — đồng bộ 100% với web app IdeaPoolPage.tsx ═══
    // Web app logic: filter by approved_date for unlisted ideas, by assignment.created_at for shop-filtered
    if (selectedDateFilter !== 'all_time') {
      const dateRange = getDateRange(selectedDateFilter);
      if (dateRange.start || dateRange.end) {
        ideas = ideas.filter(idea => {
          // Khi filter shop cụ thể → dùng assignment.created_at
          if (selectedShopFilter && selectedShopFilter !== 'all' && idea._assignments?.length > 0) {
            const matchA = idea._assignments.find(a => a._shop_name === selectedShopFilter);
            if (matchA?.created_at) return matchesDateFilter(matchA.created_at, dateRange);
          }
          // Default: approved_date for date filter (giống web app)
          const dateToUse = idea.approved_date || idea.created_at;
          if (!dateToUse) return true;
          return matchesDateFilter(dateToUse, dateRange);
        });
      }
    }

    // ═══ Step 9: Filter by SEARCH text — v1.2-fix: full-text across all idea + assignment + lab fields ═══
    // Multi-word AND search: "personalized mom mug" matches ideas where ALL three words
    // appear anywhere in (title × keywords × tags × ASIN × link × seller note × shop × etc.)
    // Single ASIN/SKU/link still works because each token is matched as substring.
    if (q) {
      const tokens = q.split(/\s+/).filter(Boolean);
      ideas = ideas.filter(idea => {
        // Build searchable haystack — includes idea-level, assignment top-level,
        // listing-lab data, and per-assignment fields. Empty values filtered out.
        const parts = [
          // Idea
          idea.product_name, idea.variant, idea.link_spy, idea.source, idea.domain,
          idea.niche, idea.sku, idea.idea_note, idea.note,
          // Assignment top-level (first/primary)
          idea.assignment_title, idea.assignment_tag, idea.publish_link,
          idea.parent_asin, idea.child_asin, idea.asin,
          idea.seller_note, idea.custom_style, idea.custom_status,
          idea.listed_by, idea.published_by, idea.assigned_by,
          idea.shop_name, idea.shop_platform,
          // Listing Lab data
          idea.etsy_title, idea.amazon_title, idea.tiktok_title,
          idea.lab_tags, idea.title_keywords, idea.tm_clean_title,
        ];
        // Per-assignment (so match works across ALL shops, not just primary)
        if (idea._assignments?.length > 0) {
          for (const a of idea._assignments) {
            parts.push(
              a.title, a.tag, a.publish_link,
              a.parent_asin, a.child_asin, a.asin,
              a.seller_note, a.custom_style, a.custom_status,
              a.listed_by, a.published_by, a.assigned_by,
              a._shop_name,
            );
          }
        }
        // Also include other shop-name aliases the idea was assigned to
        if (Array.isArray(idea._assignedShopNames)) parts.push(idea._assignedShopNames.join(' '));
        const haystack = parts.filter(Boolean).join(' \n ').toLowerCase();
        // AND match: every whitespace-separated token must appear somewhere
        return tokens.every(t => haystack.includes(t));
      });

      // ═══ v7.0.2: PARENT ASIN EXPANSION — only for parent_asin matches ═══
      // Check if the ASIN search matched via parent_asin (not child_asin)
      // Only expand variant group for PARENT ASIN searches
      if (/^B0[A-Z0-9]{8,}$/i.test(q.trim()) && ideas.length > 0) {
        const searchedAsin = q.trim().toUpperCase();

        // Determine if this ASIN matched as parent_asin in any result
        let isParentAsinMatch = false;
        let targetShop = selectedShopFilter !== 'all' ? selectedShopFilter : '';
        for (const idea of ideas) {
          for (const a of (idea._assignments || [])) {
            if (a.parent_asin && a.parent_asin.toUpperCase() === searchedAsin) {
              isParentAsinMatch = true;
              if (!targetShop) {
                const shop = allShops.find(s => s.name === a._shop_name);
                if (shop?.platform === 'amazon') targetShop = a._shop_name;
              }
              break;
            }
          }
          if (isParentAsinMatch && targetShop) break;
        }

        // Auto-navigate to Amazon shop (for both parent and child ASIN searches)
        if (!targetShop && selectedShopFilter === 'all') {
          // For child ASIN: find shop from child_asin match
          for (const idea of ideas) {
            for (const a of (idea._assignments || [])) {
              if (a.child_asin && a.child_asin.toUpperCase() === searchedAsin) {
                const shop = allShops.find(s => s.name === a._shop_name);
                if (shop?.platform === 'amazon') { targetShop = a._shop_name; break; }
              }
            }
            if (targetShop) break;
          }
        }
        if (targetShop && selectedShopFilter === 'all' && listingShopFilter) {
          const opt = Array.from(listingShopFilter.options).find(o => o.textContent.includes(targetShop) || o.value === targetShop);
          if (opt) {
            listingShopFilter.value = opt.value;
            selectedShopFilter = listingShopFilter.value;
            // Re-apply shop filter
            ideas = ideas.filter(i =>
              (i.shop_name || '(Unassigned)') === selectedShopFilter || i._assignedShopNames?.includes(selectedShopFilter)
            );
          }
        }

        // ═══ EXPANSION: Only for PARENT ASIN matches ═══
        // Child ASIN = unique per idea, no expansion needed
        // Parent ASIN = shared by group, expand to include ideas without parent_asin set
        if (isParentAsinMatch && targetShop) {
          const matchedVariants = new Set(ideas.map(i => i.variant).filter(Boolean));
          if (matchedVariants.size > 0) {
            const matchedIds = new Set(ideas.map(i => i.idea_id));
            let pool = allIdeas.filter(i =>
              (i.shop_name || '(Unassigned)') === targetShop || (i._assignedShopNames || []).includes(targetShop)
            );

            const expanded = pool.filter(i => {
              if (matchedIds.has(i.idea_id)) return true;
              if (!matchedVariants.has(i.variant)) return false;

              let ideaParentAsin = '';
              if (i._assignments?.length > 0) {
                const sa = i._assignments.find(a => a._shop_name === targetShop);
                if (sa) ideaParentAsin = (sa.parent_asin || '').toUpperCase();
              }

              if (!ideaParentAsin) return true; // No parent ASIN → same group, just not set yet
              return ideaParentAsin === searchedAsin; // Same parent ASIN
            });
            if (expanded.length > ideas.length) {
              console.log(`[Matrixty v7.0.2] Parent ASIN expansion: ${ideas.length} → ${expanded.length}`);
              ideas = expanded;
            }
          }
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // PHASE 2: Build status counts on the NON-STATUS filtered result
    // Cache: only recompute if the base ideas changed (not just status chip click)
    // ═══════════════════════════════════════════════════════════════
    const baseHash = ideas.length + '|' + selectedShopFilter + '|' + selectedDateFilter + '|' + teamFilter + '|' + memberFilter + '|' + sourceFilter + '|' + variantFilter;
    if (baseHash !== window._lastBaseHash) {
      window._lastBaseHash = baseHash;
      window._cachedStatusNow = new Date(); // Freeze "now" for consistent overdue checks
      buildStatusCounts(ideas, selectedShopFilter);
    }

    // ═══════════════════════════════════════════════════════════════
    // PHASE 3: Apply STATUS filter last
    // Đồng bộ 100% với web app IdeaPoolPage.tsx filter logic:
    // "not-listed" (Chưa list) = NOT done AND NOT need-fix (same as count)
    // "done" = idea has any done assignment
    // "overdue" = any assignment overdue
    // other chips = exact match via getIdeaStatus
    // ═══════════════════════════════════════════════════════════════
    const hasShopF = selectedShopFilter && selectedShopFilter !== 'all';
    if (statusFilter !== 'all') {
      ideas = ideas.filter(i => {
        if (statusFilter === 'not-listed') {
          // Web app logic: unassigned OR (not need-fix AND not done)
          if (!i._assignments?.length) return true;
          if (hasShopF ? isNeedFixForShop(i, selectedShopFilter) : hasAnyNeedFix(i)) return false;
          return hasShopF ? !isIdeaDoneForShop(i, selectedShopFilter) : !isIdeaDone(i);
        }
        if (statusFilter === 'overdue') {
          if (hasShopF) return isOverdueForShop(i, selectedShopFilter);
          return isIdeaOverdue(i);
        }
        if (statusFilter === 'need-fix') {
          return hasShopF ? isNeedFixForShop(i, selectedShopFilter) : hasAnyNeedFix(i);
        }
        if (statusFilter === 'done') {
          if (hasShopF) return isIdeaDoneForShop(i, selectedShopFilter);
          return isIdeaDone(i);
        }
        // urgent, scheduled — use getIdeaStatus
        const st = getIdeaStatus(i, selectedShopFilter);
        return st === statusFilter;
      });
    }

    filteredIdeas = ideas;
    currentPage = 1;
    updateFilterBadge();
    renderCurrentPage();

    // Auto-expand variant groups when searching ASIN (so user sees ideas inside)
    if (q && /^B0[A-Z0-9]{8,}$/i.test(q.trim())) {
      setTimeout(() => {
        document.querySelectorAll('.variant-group').forEach(g => g.classList.add('expanded'));
      }, 50);
    }
    savePopupState();
  }

  function renderCurrentPage() {
    // Amazon shop view: use larger page size so all variant groups show (collapsed headers are lightweight)
    const isAmazonView = selectedShopFilter && selectedShopFilter !== 'all' &&
      (allShops.find(s => s.name === selectedShopFilter)?.platform || '').toLowerCase() === 'amazon';
    const effectivePageSize = isAmazonView ? 500 : PAGE_SIZE; // Amazon: show all groups, Etsy/default: 20 per page

    // v8.0.1: Capture UI state BEFORE re-render so we can restore it after
    const _prevExpandedGroupNames = new Set();
    const _prevExpandedDetailIdxs = new Set();
    let _prevSelectedIdx = null;
    let _prevScrollTop = 0;
    if (listingIdeas) {
      listingIdeas.querySelectorAll('.variant-group.expanded').forEach(g => {
        const nameEl = g.querySelector('.variant-group-name');
        if (nameEl) _prevExpandedGroupNames.add(nameEl.textContent.trim());
      });
      listingIdeas.querySelectorAll('.listing-idea-item .etsy-summary.expanded').forEach(s => {
        const item = s.closest('.listing-idea-item');
        if (item?.dataset?.idx) _prevExpandedDetailIdxs.add(item.dataset.idx);
      });
      const selItem = listingIdeas.querySelector('.listing-idea-item.selected');
      if (selItem?.dataset?.idx) _prevSelectedIdx = selItem.dataset.idx;
      _prevScrollTop = listingIdeas.parentElement?.scrollTop || listingIdeas.scrollTop || 0;
    }
    const _hadPrevState = _prevExpandedGroupNames.size > 0 || _prevSelectedIdx !== null;

    const totalPages = Math.max(1, Math.ceil(filteredIdeas.length / effectivePageSize));
    if (currentPage > totalPages) currentPage = totalPages;
    const start = (currentPage - 1) * effectivePageSize;
    const pageIdeas = filteredIdeas.slice(start, start + effectivePageSize);
    renderIdeaList(pageIdeas, filteredIdeas.length);
    renderPagination(totalPages);

    // v8.0.1: Restore UI state AFTER re-render (expanded groups, selected idea, details, scroll)
    if (_hadPrevState && listingIdeas) {
      // Restore expanded variant groups by name
      if (_prevExpandedGroupNames.size > 0) {
        listingIdeas.querySelectorAll('.variant-group').forEach(g => {
          const nameEl = g.querySelector('.variant-group-name');
          if (nameEl && _prevExpandedGroupNames.has(nameEl.textContent.trim())) {
            g.classList.add('expanded');
          }
        });
      }
      // Restore selected idea
      if (_prevSelectedIdx !== null) {
        const selItem = listingIdeas.querySelector(`.listing-idea-item[data-idx="${_prevSelectedIdx}"]`);
        if (selItem) selItem.classList.add('selected');
      }
      // Restore expanded detail panels
      if (_prevExpandedDetailIdxs.size > 0) {
        _prevExpandedDetailIdxs.forEach(idx => {
          const item = listingIdeas.querySelector(`.listing-idea-item[data-idx="${idx}"]`);
          if (item) {
            const summary = item.querySelector('.etsy-summary');
            if (summary) summary.classList.add('expanded');
          }
        });
      }
      // Restore scroll position
      if (_prevScrollTop > 0) {
        const scrollParent = listingIdeas.parentElement || listingIdeas;
        scrollParent.scrollTop = _prevScrollTop;
      }
      console.log('[Matrixty v8.0.1] renderCurrentPage: restored state —',
        _prevExpandedGroupNames.size, 'groups,',
        _prevSelectedIdx ? 'selected #' + _prevSelectedIdx : 'no selection',
        _prevExpandedDetailIdxs.size, 'details expanded');
    }
  }

  function renderPagination(totalPages) {
    // Remove existing pagination
    const existing = document.querySelector('.listing-pagination');
    if (existing) existing.remove();

    if (filteredIdeas.length <= PAGE_SIZE) return; // no pagination needed

    const pag = document.createElement('div');
    pag.className = 'listing-pagination';

    // Prev button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'listing-page-btn';
    prevBtn.textContent = '‹';
    prevBtn.disabled = currentPage <= 1;
    prevBtn.addEventListener('click', () => { currentPage--; renderCurrentPage(); });
    pag.appendChild(prevBtn);

    // Page numbers (show max 5 pages around current)
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);
    for (let p = startPage; p <= endPage; p++) {
      const btn = document.createElement('button');
      btn.className = 'listing-page-btn' + (p === currentPage ? ' active' : '');
      btn.textContent = p;
      btn.addEventListener('click', () => { currentPage = p; renderCurrentPage(); });
      pag.appendChild(btn);
    }

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'listing-page-btn';
    nextBtn.textContent = '›';
    nextBtn.disabled = currentPage >= totalPages;
    nextBtn.addEventListener('click', () => { currentPage++; renderCurrentPage(); });
    pag.appendChild(nextBtn);

    // Info
    const info = document.createElement('span');
    info.className = 'listing-page-info';
    info.textContent = `${filteredIdeas.length} ideas`;
    pag.appendChild(info);

    listingIdeas.after(pag);
  }

  // ===== LOAD IDEAS FROM SUPABASE =====
  // Strategy: Cache in chrome.storage → show cached instantly → refresh in background

  // Paginated fetch — Supabase PostgREST supports up to 10000 rows
  async function fetchAllRows(tablePath) {
    const PAGE_SIZE = 1000;
    let allRows = [];
    let offset = 0;
    const table = tablePath.split('?')[0];
    while (true) {
      const url = `${SUPABASE_URL}/rest/v1/${tablePath}&limit=${PAGE_SIZE}&offset=${offset}`;
      const res = await fetch(url, { headers: { ...HDR, 'Prefer': 'count=exact' } });
      // Get total count from response header
      const contentRange = res.headers.get('content-range');
      const rows = await res.json();
      if (!Array.isArray(rows)) { console.warn(`[Matrixty] fetchAllRows ${table}: non-array response at offset ${offset}`); break; }
      allRows = allRows.concat(rows);
      console.log(`[Matrixty] fetchAllRows ${table}: page ${offset/PAGE_SIZE + 1}, got ${rows.length} rows (total so far: ${allRows.length})${contentRange ? `, range: ${contentRange}` : ''}`);
      if (rows.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
    return allRows;
  }

  // Merge raw data into flat allIdeas list
  function mergeIdeasData(shopsRaw, ideasRaw, assignmentsRaw, labDataRaw, isAdmin) {
    const shopMap = {};
    (shopsRaw || []).forEach(s => { shopMap[s.id] = s; });

    const labByIdeaId = {};
    (labDataRaw || []).forEach(lab => {
      if (lab.idea_id) labByIdeaId[lab.idea_id] = lab;
    });

    const assignmentsByIdeaId = {};
    (assignmentsRaw || []).forEach(a => {
      if (!assignmentsByIdeaId[a.idea_id]) assignmentsByIdeaId[a.idea_id] = [];
      assignmentsByIdeaId[a.idea_id].push(a);
    });

    const merged = [];

    (ideasRaw || []).forEach(idea => {
      const assignments = assignmentsByIdeaId[idea.id] || [];
      const lab = labByIdeaId[idea.id] || {};
      const labFields = {
        etsy_title: lab.etsy_title || '', amazon_title: lab.amazon_title || '',
        tiktok_title: lab.tiktok_title || '', lab_tags: lab.tags || '',
        title_keywords: lab.title_keywords || '', tm_clean_title: lab.tm_clean_title || '',
        lab_status: lab.status || '',
      };
      // Derive source from domain or link_spy hostname
      let source = idea.domain || '';
      if (!source && idea.link_spy) {
        try { source = new URL(idea.link_spy).hostname.replace('www.', ''); } catch(e) {}
      }

      const ideaFields = {
        idea_id: idea.id, sku: idea.sku || '', product_name: idea.product_name || '', variant: idea.variant || '',
        niche: idea.niche || '', thumbnail: idea.thumbnail || '',
        link_spy: idea.link_spy || '', idea_note: idea.note || '',
        created_at: idea.created_at || '', // actual DB timestamp (for sorting — matches Idea Pool)
        approved_date: idea.approved_date || '', // DATE for date filter display
        source: source,
        urgent: idea.urgent || false,
        idea_need_fix: idea.need_fix || false,
        idea_need_fix_at: idea.need_fix_at || '',
        idea_fixed_at: idea.fixed_at || '',
      };

      if (assignments.length === 0) {
        merged.push({
          ...ideaFields, ...labFields,
          assignment_id: null, shop_id: null,
          assignment_title: '', assignment_tag: '', publish_link: '',
          parent_asin: '', child_asin: '', asin: '', seller_note: '', custom_style: '',
          custom_status: '', listed_by: '', listed_at: '', scheduled_date: '',
          published_date: '', published_by: '', assigned_by: '',
          shop_name: '(Unassigned)', shop_platform: '', shop_department_id: null,
          _assignedShopCount: 0, _assignedShopNames: [],
        });
      } else {
        const shopNames = [];
        const shopPlatforms = [];
        assignments.forEach(a => {
          const shop = shopMap[a.shop_id];
          if (shop) {
            a._shop_name = shop.name;
            a._shop_department_id = shop.department_id || null;
            shopNames.push(shop.name);
            shopPlatforms.push(shop.platform || '');
          }
        });
        const fa = assignments[0];
        const firstShop = shopMap[fa.shop_id] || {};
        merged.push({
          ...ideaFields, ...labFields,
          assignment_id: fa.id, shop_id: fa.shop_id,
          assignment_title: fa.title || '', assignment_tag: fa.tag || '',
          publish_link: fa.publish_link || '',
          parent_asin: fa.parent_asin || '', child_asin: fa.child_asin || '',
          asin: fa.asin || '', seller_note: fa.seller_note || '', custom_style: fa.custom_style || '',
          custom_status: fa.custom_status || '', listed_by: fa.listed_by || '',
          listed_at: fa.listed_at || '', scheduled_date: fa.scheduled_date || '',
          published_date: fa.published_date || '', published_by: fa.published_by || '',
          assigned_by: fa.assigned_by || '',
          shop_name: shopNames[0] || '(Unassigned)', shop_platform: shopPlatforms[0] || '',
          shop_department_id: firstShop.department_id || null,
          _assignedShopCount: assignments.length, _assignedShopNames: shopNames,
          _assignments: assignments,
        });
      }
    });

    // Permission filtering for non-admin
    if (!isAdmin) {
      const userId = currentUser?.id;
      const assignedShops = currentUser?.assigned_shops || [];

      // ═══ METHOD 1: user.assigned_shops (từ login API) ═══
      const myShopIdsFromUser = new Set(
        assignedShops.map(s => typeof s === 'object' ? (s.id || s.shop_id) : s).filter(Boolean)
      );

      // ═══ METHOD 2: shop.assigned_member_ids (từ idea_shops table) ═══
      const myShopIdsFromTable = new Set();
      const userIdStr = userId ? String(userId) : '';
      const userDeptId = currentUser?.department_id;
      const myShopIdsFromDept = new Set();
      (shopsRaw || []).forEach(shop => {
        // Method 2: assigned_member_ids
        const memberIds = shop.assigned_member_ids || [];
        if (Array.isArray(memberIds) && userIdStr) {
          if (memberIds.some(mid => String(mid) === userIdStr)) {
            myShopIdsFromTable.add(shop.id);
          }
        }
        // ═══ METHOD 3: department_id matching ═══
        if (userDeptId && shop.department_id && String(shop.department_id) === String(userDeptId)) {
          myShopIdsFromDept.add(shop.id);
        }
      });

      // v1.2-fix: METHOD 4 — shop_permissions (webapp source-of-truth, covers leader auto-grants
      // for shops where the user is NOT in assigned_member_ids and NOT same-department)
      const myShopIdsFromPerms = permittedShopIds || new Set();

      // v1.2-fix: METHOD 5 — TEAM-BASED visibility for Leaders/Managers
      // Mirrors webapp ShopManagementPage shopTeamMap: a shop's team is derived from
      // main_seller_id → that member's dept/sub_role/role. A leader sees all shops
      // whose derived team matches her own team. Catches legacy shops that never got
      // a shop_permissions row auto-added when leader-grant trigger was added.
      const myShopIdsFromTeam = new Set();
      if (_isUserTeamLeader(currentUser)) {
        const _deptMap = new Map((teamsRaw || []).map(d => [d.id, d.name]));
        const _deptNameSet = new Set((teamsRaw || []).map(d => d.name));
        const userTeam = _getUserTeam(currentUser, _deptMap, _deptNameSet);
        if (userTeam) {
          for (const [shopId, shopTeam] of _shopTeamMap) {
            if (shopTeam === userTeam) myShopIdsFromTeam.add(shopId);
          }
        }
      }

      // Merge ALL 5 methods (union — most permissive; matches webapp behavior + safe fallback)
      const allMyShopIds = new Set([
        ...myShopIdsFromUser,
        ...myShopIdsFromTable,
        ...myShopIdsFromDept,
        ...myShopIdsFromPerms,
        ...myShopIdsFromTeam,
      ]);

      // v1.2-fix: detailed breakdown so missing-shop bugs are diagnosable from console
      const _shopName = (id) => (shopsRaw || []).find(s => s.id === id)?.name || `#${id}`;
      const _deptMapForLog = new Map((teamsRaw || []).map(d => [d.id, d.name]));
      const _deptNameSetForLog = new Set((teamsRaw || []).map(d => d.name));
      console.log('[Matrixty v1.2-fix] Permission filter breakdown:', {
        userId, userDeptId, role: currentUser?.role, sub_role: currentUser?.sub_role,
        userTeam: _getUserTeam(currentUser, _deptMapForLog, _deptNameSetForLog),
        isTeamLeader: _isUserTeamLeader(currentUser),
        fromUser: { count: myShopIdsFromUser.size, shops: [...myShopIdsFromUser].map(_shopName) },
        fromTable_assigned_member_ids: { count: myShopIdsFromTable.size, shops: [...myShopIdsFromTable].map(_shopName) },
        fromDept_department_id: { count: myShopIdsFromDept.size, shops: [...myShopIdsFromDept].map(_shopName) },
        fromPerms_shop_permissions: { count: myShopIdsFromPerms.size, shops: [...myShopIdsFromPerms].map(_shopName) },
        fromTeam_main_seller: { count: myShopIdsFromTeam.size, shops: [...myShopIdsFromTeam].map(_shopName) },
        totalMyShops: allMyShopIds.size,
        totalActiveShopsInDb: (shopsRaw || []).length,
        unionShopNames: [...allMyShopIds].map(_shopName).sort(),
        totalMergedIdeas: merged.length,
      });
      // If any single source returned 0 — flag it loudly so user can report the right symptom
      if (myShopIdsFromPerms.size === 0) console.warn('[Matrixty v1.2-fix] shop_permissions returned 0 rows — possible RLS block on anon key. Trusting RPC + assigned_member_ids + dept fallback.');
      if (myShopIdsFromUser.size === 0) console.warn('[Matrixty v1.2-fix] currentUser.assigned_shops is empty — RPC may have failed or returned no shops for this member.');

      if (allMyShopIds.size > 0) {
        // Store globally for shop panel filtering
        myShopIds = allMyShopIds;
        // Filter ideas: chỉ giữ ideas có assignment trong shops được gán
        const filtered = merged.filter(idea => {
          if (!idea._assignments || idea._assignments.length === 0) return false;
          return idea._assignments.some(a => allMyShopIds.has(a.shop_id));
        });
        console.log(`[Matrixty v7.0.0] Filtered: ${filtered.length}/${merged.length} ideas for non-admin`);
        return filtered;
      } else {
        // Non-admin không được gán shop nào → không thấy ideas nào
        console.warn('[Matrixty v7.0.0] Non-admin has NO assigned shops → showing 0 ideas');
        return [];
      }
    }
    return merged;
  }

  // ═══ STANDALONE PERMISSION FILTER ═══
  // Dùng cho CẢ cached ideas lẫn network-fetched ideas
  // Vì cached ideas không qua mergeIdeasData nên cần filter riêng
  function filterIdeasByPermission(ideas) {
    const userRole = (currentUser?.role || '').toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'owner';
    if (isAdmin) return ideas;

    const userId = currentUser?.id;
    const assignedShops = currentUser?.assigned_shops || [];

    // Method 1: user.assigned_shops
    const myShopIdsFromUser = new Set(
      assignedShops.map(s => typeof s === 'object' ? (s.id || s.shop_id) : s).filter(Boolean)
    );

    // Method 2: shop.assigned_member_ids + Method 3: department_id
    const myShopIdsFromTable = new Set();
    const myShopIdsFromDept = new Set();
    const userIdStr = userId ? String(userId) : '';
    const userDeptId = currentUser?.department_id;
    (allShops || []).forEach(shop => {
      const memberIds = shop.assigned_member_ids || [];
      if (Array.isArray(memberIds) && userIdStr) {
        if (memberIds.some(mid => String(mid) === userIdStr)) {
          myShopIdsFromTable.add(shop.id);
        }
      }
      if (userDeptId && shop.department_id && String(shop.department_id) === String(userDeptId)) {
        myShopIdsFromDept.add(shop.id);
      }
    });

    // v1.2-fix: METHOD 4 — shop_permissions (matches webapp filter)
    const myShopIdsFromPerms = permittedShopIds || new Set();

    // v1.2-fix: METHOD 5 — team-based visibility for Leaders/Managers (mirrors webapp shopTeamMap)
    const myShopIdsFromTeam = new Set();
    if (_isUserTeamLeader(currentUser)) {
      const _deptMap = new Map((allTeams || []).map(d => [d.id, d.name]));
      const _deptNameSet = new Set((allTeams || []).map(d => d.name));
      const userTeam = _getUserTeam(currentUser, _deptMap, _deptNameSet);
      if (userTeam) {
        for (const [shopId, shopTeam] of _shopTeamMap) {
          if (shopTeam === userTeam) myShopIdsFromTeam.add(shopId);
        }
      }
    }

    const allMyShopIds = new Set([
      ...myShopIdsFromUser,
      ...myShopIdsFromTable,
      ...myShopIdsFromDept,
      ...myShopIdsFromPerms,
      ...myShopIdsFromTeam,
    ]);
    // Cũng lưu danh sách shop names được phép (cho cache filter vì cache không có _assignments)
    const myShopNames = new Set();
    allShops.forEach(shop => {
      if (allMyShopIds.has(shop.id)) myShopNames.add(shop.name);
    });

    console.log('[Matrixty v1.2-fix] filterIdeasByPermission:', {
      userId, fromPerms: myShopIdsFromPerms.size,
      myShopIds: [...allMyShopIds], myShopNames: [...myShopNames],
      totalIdeas: ideas.length,
    });

    if (allMyShopIds.size === 0 && myShopNames.size === 0) {
      console.warn('[Matrixty v7.0.0] Non-admin has NO assigned shops → 0 ideas');
      return [];
    }

    return ideas.filter(idea => {
      // Nếu có _assignments (từ network merge) → dùng shop_id
      if (idea._assignments && idea._assignments.length > 0) {
        return idea._assignments.some(a => allMyShopIds.has(a.shop_id));
      }
      // Nếu không có _assignments (từ cache, đã strip) → dùng shop_name
      if (idea.shop_name && idea.shop_name !== '(Unassigned)') {
        return myShopNames.has(idea.shop_name);
      }
      // Nếu có shop_id trực tiếp
      if (idea.shop_id) {
        return allMyShopIds.has(idea.shop_id);
      }
      return false;
    });
  }

  // Display ideas (used by both cache and fresh load)
  let hasRestoredOnce = false; // Chỉ restore 1 lần (lần đầu từ cache)
  async function displayIdeas() {
    if (listingLoading) listingLoading.classList.add('hidden');
    allIdeasGrouped = {};
    // shopIdeaCounts: đếm ideas per shop ĐÚNG (bao gồm cả secondary assignments)
    // Không chỉ dùng shop_name (primary) mà dùng _assignedShopNames (ALL shops)
    window._shopIdeaCounts = {};
    allIdeas.forEach(idea => {
      const shopKey = idea.shop_name || '(Unassigned)';
      if (!allIdeasGrouped[shopKey]) allIdeasGrouped[shopKey] = [];
      allIdeasGrouped[shopKey].push(idea);
      // Count cho TẤT CẢ shops mà idea được gán (bao gồm secondary)
      const assignedNames = idea._assignedShopNames?.length > 0 ? idea._assignedShopNames : [shopKey];
      assignedNames.forEach(sn => {
        window._shopIdeaCounts[sn] = (window._shopIdeaCounts[sn] || 0) + 1;
      });
    });
    buildShopFilterOptions();
    buildStatusCounts(allIdeas, 'all'); // Lần đầu: counts cho ALL shops
    buildAdvancedFilterOptions();
    filteredIdeas = allIdeas;
    currentPage = 1;

    // ═══ RESTORE POPUP STATE ═══ (chỉ lần đầu từ chrome.storage, sau đó dùng in-memory)
    const savedState = hasRestoredOnce ? null : await restorePopupState();
    const isFirstRestore = !hasRestoredOnce;
    hasRestoredOnce = true;
    // Remember currently selected idea for re-render (network refresh)
    const currentSelectedIdeaId = selectedIdea?.idea_id || savedState?.selectedIdeaId || null;

    if (savedState) {
      // FIRST TIME: Restore filter variables from saved state
      if (savedState.statusFilter && savedState.statusFilter !== 'all') {
        statusFilter = savedState.statusFilter;
      }
      if (savedState.selectedShopFilter && savedState.selectedShopFilter !== 'all') {
        selectedShopFilter = savedState.selectedShopFilter;
      }
      if (savedState.variantFilter && savedState.variantFilter !== 'all') {
        variantFilter = savedState.variantFilter;
      }
      if (savedState.nicheFilter && savedState.nicheFilter !== 'all') {
        nicheFilter = savedState.nicheFilter;
      }
      if (savedState.sourceFilter && savedState.sourceFilter !== 'all') {
        sourceFilter = savedState.sourceFilter;
      }
      if (savedState.teamFilter && savedState.teamFilter !== 'all') {
        teamFilter = savedState.teamFilter;
      }
      if (savedState.memberFilter && savedState.memberFilter !== 'all') {
        memberFilter = savedState.memberFilter;
      }
      if (savedState.assignedFilter && savedState.assignedFilter !== 'all') {
        assignedFilter = savedState.assignedFilter;
      }
      if (savedState.selectedDateFilter && savedState.selectedDateFilter !== 'all_time' && savedState.selectedDateFilter !== 'all') {
        selectedDateFilter = savedState.selectedDateFilter;
      }
      if (savedState.searchQuery && listingSearch) {
        listingSearch.value = savedState.searchQuery;
      }
      if (savedState.advancedFiltersOpen) {
        advancedFiltersOpen = true;
      }
    }

    // ═══ ALWAYS sync UI elements with current filter state ═══
    // (works for both first restore AND background refresh re-render)
    document.querySelectorAll('.st-chip[data-status]').forEach(c => {
      c.classList.toggle('active', c.dataset.status === statusFilter);
    });
    if (listingShopFilter && selectedShopFilter !== 'all') listingShopFilter.value = selectedShopFilter;
    const fv = document.getElementById('filter-variant');
    if (fv && variantFilter !== 'all') fv.value = variantFilter;
    if (filterNiche && nicheFilter !== 'all') filterNiche.value = nicheFilter;
    if (filterSource && sourceFilter !== 'all') filterSource.value = sourceFilter;
    if (filterTeam && teamFilter !== 'all') filterTeam.value = teamFilter;
    if (filterMember && memberFilter !== 'all') filterMember.value = memberFilter;
    if (filterAssigned && assignedFilter !== 'all') filterAssigned.value = assignedFilter;
    if (listingDateFilter && selectedDateFilter !== 'all_time' && selectedDateFilter !== 'all') listingDateFilter.value = selectedDateFilter;
    if (advancedFiltersOpen) {
      const advPanel = document.getElementById('adv-filters-panel');
      if (advPanel) advPanel.classList.remove('hidden');
      const toggleBtn = document.getElementById('toggle-adv-filters');
      if (toggleBtn) toggleBtn.classList.add('active');
    }

    // ═══ ALWAYS apply filters if any filter is active ═══
    const hasAnyFilter = selectedShopFilter !== 'all' || statusFilter !== 'all'
      || variantFilter !== 'all' || nicheFilter !== 'all' || sourceFilter !== 'all'
      || teamFilter !== 'all' || memberFilter !== 'all' || assignedFilter !== 'all'
      || (selectedDateFilter !== 'all_time' && selectedDateFilter !== 'all')
      || (listingSearch?.value || '').trim();
    if (hasAnyFilter) {
      applyFilters();
    }
    // Restore page AFTER applyFilters (which resets currentPage to 1)
    if (savedState?.currentPage > 1) {
      currentPage = savedState.currentPage;
    } else if (!isFirstRestore && currentPage > 1) {
      // Background refresh: keep current page
      const maxPage = Math.max(1, Math.ceil(filteredIdeas.length / PAGE_SIZE));
      if (currentPage > maxPage) currentPage = maxPage;
    }

    renderCurrentPage();

    // Restore selected idea + view state AFTER render
    console.log('[Matrixty] Restore: selectedIdeaId=', currentSelectedIdeaId, 'miniLabOpen=', savedState?.miniLabOpen, 'expandedDetails=', savedState?.expandedDetails);
    if (currentSelectedIdeaId) {
      const restoredIdx = allIdeas.findIndex(i => i.idea_id === currentSelectedIdeaId);
      if (restoredIdx >= 0) {
        const filteredIdx = filteredIdeas.findIndex(i => i.idea_id === currentSelectedIdeaId);
        if (filteredIdx >= 0) {
          const ideaPage = Math.floor(filteredIdx / PAGE_SIZE) + 1;
          if (ideaPage !== currentPage) {
            currentPage = ideaPage;
            renderCurrentPage();
          }
        }
        isRestoring = false;

        const wasMiniLabOpen = savedState?.miniLabOpen === true;
        if (wasMiniLabOpen) {
          // Mini-lab was actually open (gen title view) — restore it
          setTimeout(() => quickFillIdea(restoredIdx, savedState?.miniLabData || null), 150);
          console.log('[Matrixty] Restoring mini-lab for idea idx:', restoredIdx);
        } else {
          // Detail view or just browsing — highlight idea + expand panels
          setTimeout(() => {
            const ideaItem = listingIdeas.querySelector(`.listing-idea-item[data-idx="${restoredIdx}"]`);
            if (ideaItem) {
              ideaItem.classList.add('selected');
              ideaItem.scrollIntoView({ block: 'center', behavior: 'instant' });
            }
            // Restore expanded detail panels
            if (savedState?.expandedDetails?.length) {
              savedState.expandedDetails.forEach(id => {
                const summary = document.querySelector(`[data-expand="${id}"]`);
                if (summary) {
                  summary.classList.add('expanded');
                  console.log('[Matrixty] Restored expanded panel:', id);
                }
              });
            }
          }, 150);
          console.log('[Matrixty] Restoring list view, highlight idea idx:', restoredIdx);
        }
        console.log('[Matrixty v7.0.0] Restored idea:', currentSelectedIdeaId, 'at allIdx:', restoredIdx, 'filteredIdx:', filteredIdx, savedState ? '(from storage)' : '(re-render)');
      } else {
        // Idea không tìm thấy — bật save state
        isRestoring = false;
        console.log('[Matrixty v7.0.0] Saved idea not found:', currentSelectedIdeaId);
      }
    } else {
      // Không có saved idea — still restore expanded panels + scroll position
      isRestoring = false;
      setTimeout(() => {
        if (savedState?.expandedDetails?.length) {
          savedState.expandedDetails.forEach(id => {
            const summary = document.querySelector(`[data-expand="${id}"]`);
            if (summary) summary.classList.add('expanded');
          });
        }
        // v9.5: Restore scroll position when no idea was selected
        if (savedState?.scrollTop > 0 && listingIdeas) {
          listingIdeas.scrollTop = savedState.scrollTop;
        }
      }, 150);
    }
  }

  async function loadListingIdeas() {
    if (listingEmpty) listingEmpty.classList.add('hidden');

    const userRole = (currentUser?.role || '').toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'owner';

    // ═══ STEP 1: Check if already rendered by INSTANT RESTORE, or load from cache ═══
    let usedCache = false;
    let cacheAge = window._matrixtyCacheAge || Infinity;
    delete window._matrixtyCacheAge;

    // If already rendered by instant restore (hasRestoredOnce=true, allIdeas populated)
    if (hasRestoredOnce && allIdeas.length > 0 && allShops.length > 0) {
      usedCache = true;
      console.log(`[Matrixty] loadListingIdeas: already rendered by instant restore, proceeding to background fetch`);
    }
    // If pre-loaded but not yet rendered (shouldn't happen with new flow, but safety)
    else if (allIdeas.length > 0 && allShops.length > 0) {
      if (listingLoading) listingLoading.classList.add('hidden');
      displayIdeas();
      usedCache = true;
      console.log(`[Matrixty] FAST: Using pre-loaded ${allIdeas.length} ideas (cacheAge: ${Math.round(cacheAge / 1000)}s)`);
    } else {
      // Fallback: read cache from storage (e.g. first load after login)
      try {
        const cached = await new Promise(resolve => {
          chrome.storage.local.get([CACHE_KEY], (d) => resolve(d[CACHE_KEY]));
        });
        const cacheVersionOk2 = cached?.version === CACHE_VERSION;
        const cacheUserOk = !cached?.userId || cached.userId === currentUser?.id;
        if (cached && cacheVersionOk2 && cached.allIdeas?.length > 0 && cached.allShops?.length > 0 && cacheUserOk) {
          cacheAge = Date.now() - (cached.timestamp || 0);
          allShops = cached.allShops;
          allMembers = cached.allMembers || [];
          allTeams = cached.allTeams || [];
          // v1.2-fix: rehydrate permittedShopIds from cache so first-render dropdown is correct
          permittedShopIds = new Set(cached.permittedShopIds || []);
          // v1.2-fix: rebuild shop→team map from cached data
          _shopTeamMap = _buildShopTeamMap(allShops, allMembers, allTeams);
          // Cache already contains permission-filtered ideas — NO re-filter needed
          allIdeas = cached.allIdeas;
          if (listingLoading) listingLoading.classList.add('hidden');
          displayIdeas();
          usedCache = true;
          console.log(`[Matrixty] Cache loaded: ${allIdeas.length} ideas (age: ${Math.round(cacheAge / 1000)}s)`);
        }
      } catch (e) { /* cache miss — continue to network */ }
    }

    // ═══ STEP 2: Fetch from network ═══
    // Only show spinner if we have NO cached data
    if (!usedCache && listingLoading) listingLoading.classList.remove('hidden');

    // v1.2-fix: capture pre-fetch shop/permission signature so we can detect
    // shop additions / seller-permission changes that admin made in webapp.
    const _prevShopSig = _shopAccessSignature();

    try {
      // ═══ FETCH ALL DATA IN PARALLEL (no progressive render — it broke state restoration) ═══
      const fetchStart = Date.now();
      // v1.2-fix: fetch shop_permissions in parallel for non-admin users so we match the
      // webapp's source-of-truth filter (handles leader auto-grants that idea_shops.assigned_member_ids
      // may not reflect for legacy shops). Admin users skip — they see all shops anyway.
      const _userIdForPerms = currentUser?.id;
      const _userEmailForPerms = currentUser?.email;
      const _isAdminForPerms = (() => { const r = (currentUser?.role || '').toLowerCase(); return r === 'admin' || r === 'owner'; })();
      const shopPermsPromise = (!_isAdminForPerms && _userIdForPerms)
        ? fetchAllRows(`shop_permissions?select=shop_id&member_id=eq.${_userIdForPerms}&can_view=eq.true`).catch(e => {
            console.warn('[Matrixty v1.2-fix] shop_permissions fetch failed (will fall back to assigned_member_ids):', e?.message || e);
            return [];
          })
        : Promise.resolve([]);

      // v1.2-fix: ALSO call check_extension_access RPC server-side. This RPC has SECURITY DEFINER
      // so it bypasses RLS, AND its `assigned_shops` is computed via UNION of (assigned_member_ids
      // OR shop_permissions OR same-department) — the webapp source of truth. We trust this over
      // the cached value in currentUser, which may be stale (last login or last popup open).
      const accessRpcPromise = (!_isAdminForPerms && _userEmailForPerms)
        ? fetch(`${SUPABASE_URL}/rest/v1/rpc/check_extension_access`, {
            method: 'POST', headers: HDR, body: JSON.stringify({ member_email: _userEmailForPerms })
          }).then(r => r.json()).catch(e => {
            console.warn('[Matrixty v1.2-fix] check_extension_access fresh fetch failed:', e?.message || e);
            return null;
          })
        : Promise.resolve(null);

      const [shopsRaw, ideasRaw, membersRaw, teamsRaw, assignmentsRaw, labDataRaw, shopPermsRaw, accessRpcRaw] = await Promise.all([
        fetchAllRows('idea_shops?select=id,name,platform,active,assigned_member_ids,department_id,main_seller_id,seller,brand_name&active=eq.true&order=id'),
        fetchAllRows('ideas?select=id,sku,product_name,variant,niche,thumbnail,link_spy,domain,note,approved_date,created_at,urgent,need_fix,need_fix_at,fixed_at&is_deleted=eq.false&order=approved_date.desc.nullslast'),
        fetchAllRows('members?select=id,name,email,role,status,department_id,department,is_leader,sub_role&status=eq.Active'),
        fetchAllRows('departments?select=id,name&order=name'),
        fetchAllRows('idea_shop_assignments?select=id,idea_id,shop_id,title,tag,publish_link,parent_asin,child_asin,seller_note,custom_style,custom_status,created_at,listed_by,listed_at,need_fix,fixed_at,scheduled_date,assigned_by'),
        fetchAllRows(`listing_lab_data?select=idea_id,etsy_title,amazon_title,tags,status`),
        shopPermsPromise,
        accessRpcPromise,
      ]);
      console.log(`[Matrixty] Fetch ALL took ${Date.now() - fetchStart}ms: ${ideasRaw?.length || 0} ideas, ${shopsRaw?.length || 0} shops, ${assignmentsRaw?.length || 0} assignments, ${shopPermsRaw?.length || 0} shop_permissions, RPC.assigned_shops=${accessRpcRaw?.assigned_shops?.length ?? 'n/a'}`);

      allShops = shopsRaw || [];
      allMembers = membersRaw || [];
      allTeams = teamsRaw || [];
      // v1.2-fix: hydrate permittedShopIds from shop_permissions response
      permittedShopIds = new Set((shopPermsRaw || []).map(r => r.shop_id).filter(Boolean));
      // v1.2-fix: build shop→team map for client-side team-based visibility (Method 5)
      _shopTeamMap = _buildShopTeamMap(allShops, allMembers, allTeams);

      // v1.2-fix: fold the FRESH server-computed assigned_shops back into currentUser so Method 1
      // (myShopIdsFromUser) reflects latest server state — overrides whatever was cached at login.
      // The RPC's assigned_shops is the authoritative source: server-side UNION of all visibility paths.
      if (accessRpcRaw && accessRpcRaw.allowed && Array.isArray(accessRpcRaw.assigned_shops)) {
        const freshAssigned = accessRpcRaw.assigned_shops;
        const prevCount = (currentUser?.assigned_shops || []).length;
        if (currentUser) currentUser.assigned_shops = freshAssigned;
        // Persist for next popup open so cached state isn't stale
        try {
          chrome.storage.local.get(['matrixtyUser'], (d) => {
            if (d?.matrixtyUser) {
              chrome.storage.local.set({ matrixtyUser: { ...d.matrixtyUser, assigned_shops: freshAssigned, department_id: accessRpcRaw.department_id ?? d.matrixtyUser.department_id, is_leader: accessRpcRaw.is_leader ?? d.matrixtyUser.is_leader, sub_role: accessRpcRaw.sub_role ?? d.matrixtyUser.sub_role } });
            }
          });
        } catch (e) { /* non-critical */ }
        console.log(`[Matrixty v1.2-fix] Refreshed currentUser.assigned_shops from RPC: ${prevCount} → ${freshAssigned.length} shops`);
      }
      console.log(`[Matrixty v7.0.0] Network: ${allShops.length} shops, ${ideasRaw.length} ideas, ${assignmentsRaw.length} assignments, ${labDataRaw.length} lab, ${allMembers.length} members, ${allTeams.length} teams`);

      // Merge (tạo danh sách đầy đủ, chưa filter quyền)
      const allMerged = mergeIdeasData(shopsRaw, ideasRaw, assignmentsRaw, labDataRaw, true); // pass isAdmin=true to get ALL
      console.log(`[Matrixty v7.0.0] Merged total: ${allMerged.length} ideas`);

      // Apply permission filter cho user hiện tại TRƯỚC khi cache
      const freshIdeas = filterIdeasByPermission(allMerged);
      console.log(`[Matrixty v7.0.0] After permission filter: ${freshIdeas.length}/${allMerged.length} ideas (isAdmin: ${isAdmin})`);

      // v9.6: Preserve local-only assignment changes that haven't synced to DB yet
      // When PATCH fails, local data has values the DB doesn't — don't overwrite them
      const pendingChanges = window._pendingLocalChanges || new Map();
      if (pendingChanges.size > 0) {
        let preserved = 0;
        for (const freshIdea of freshIdeas) {
          if (!freshIdea._assignments) continue;
          for (const freshSa of freshIdea._assignments) {
            const pending = pendingChanges.get(String(freshSa.id));
            if (!pending) continue;
            // Apply pending local values that DB doesn't have
            const fieldsToPreserve = ['title', 'tag', 'child_asin', 'publish_link', 'seller_note', 'custom_style', 'custom_status', 'listed_by', 'listed_at'];
            for (const f of fieldsToPreserve) {
              if (pending[f] && !freshSa[f]) {
                freshSa[f] = pending[f];
                preserved++;
              }
            }
            // Also update convenience fields on the idea
            if (pending.title && !freshIdea.assignment_title) freshIdea.assignment_title = pending.title;
            if (pending.tag && !freshIdea.assignment_tag) freshIdea.assignment_tag = pending.tag;
            if (pending.child_asin && !freshIdea.child_asin) freshIdea.child_asin = pending.child_asin;
            if (pending.listed_by && !freshIdea.listed_by) freshIdea.listed_by = pending.listed_by;
            if (pending.listed_at && !freshIdea.listed_at) freshIdea.listed_at = pending.listed_at;
          }
        }
        if (preserved > 0) {
          console.log(`[Matrixty v9.6] ⚡ Preserved ${preserved} local-only field(s) during background refresh (${pendingChanges.size} pending assignment(s))`);
        }
      }

      allIdeas = freshIdeas;

      // Save FILTERED ideas to cache (already permission-filtered, no need to re-filter on load)
      try {
        const cacheData = {
          version: CACHE_VERSION, // Cache format version — old caches auto-invalidated
          timestamp: Date.now(),
          userId: currentUser?.id, // Track which user this cache belongs to
          allShops: allShops.map(s => ({ id: s.id, name: s.name, platform: s.platform, active: s.active, assigned_member_ids: s.assigned_member_ids, department_id: s.department_id, main_seller_id: s.main_seller_id })),
          allMembers: allMembers.map(m => ({ id: m.id, name: m.name, email: m.email, role: m.role, department_id: m.department_id, department: m.department, sub_role: m.sub_role, is_leader: m.is_leader })),
          allTeams,
          // v1.2-fix: persist shop_permissions so cached restore matches webapp filter
          permittedShopIds: [...permittedShopIds],
          allIdeas: allIdeas.map(i => {
            const { _assignments, ...rest } = i;
            if (_assignments?.length > 0) {
              rest._assignments = _assignments.map(a => ({
                id: a.id || '', // CRITICAL: needed for editable fields
                _shop_name: a._shop_name || '', shop_id: a.shop_id,
                publish_link: a.publish_link || '', created_at: a.created_at || '',
                seller_note: a.seller_note || '', title: a.title || '', tag: a.tag || '',
                parent_asin: a.parent_asin || '', child_asin: a.child_asin || '',
                asin: a.asin || '', custom_style: a.custom_style || '',
                listed_by: a.listed_by || '', listed_at: a.listed_at || '',
                need_fix: a.need_fix || false, need_fix_at: a.need_fix_at || '',
                fixed_at: a.fixed_at || '', scheduled_date: a.scheduled_date || '',
                custom_status: a.custom_status || '', published_date: a.published_date || '',
                published_by: a.published_by || '', assigned_by: a.assigned_by || '',
              }));
            }
            return rest;
          }),
        };
        // v9.2: Strip heavy text fields to reduce cache size
        cacheData.allIdeas = cacheData.allIdeas.map(idea => {
          const { note, ...slim } = idea;
          return slim;
        });

        // Check size and trim progressively until it fits
        let cacheStr = JSON.stringify(cacheData);
        let cacheSizeMB = (cacheStr.length / (1024 * 1024)).toFixed(2);
        console.log(`[Matrixty] Cache size: ${cacheSizeMB}MB (${cacheData.allIdeas.length} ideas)`);

        // Progressive trim: 70% → 50% → 30% until under 8MB
        const MAX_CACHE_MB = 8;
        let trimRound = 0;
        while (cacheStr.length > MAX_CACHE_MB * 1024 * 1024 && trimRound < 3) {
          trimRound++;
          const keepRatio = trimRound === 1 ? 0.7 : trimRound === 2 ? 0.5 : 0.3;
          cacheData.allIdeas = cacheData.allIdeas.slice(0, Math.floor(cacheData.allIdeas.length * keepRatio));
          cacheStr = JSON.stringify(cacheData);
          cacheSizeMB = (cacheStr.length / (1024 * 1024)).toFixed(2);
          console.warn(`[Matrixty] Cache trim round ${trimRound}: ${cacheSizeMB}MB (${cacheData.allIdeas.length} ideas)`);
        }

        chrome.storage.local.set({ [CACHE_KEY]: cacheData }, () => {
          if (chrome.runtime.lastError) {
            console.error('[Matrixty] Cache save FAILED:', chrome.runtime.lastError.message);
            // v9.2: Retry with minimal cache (just enough for instant restore)
            cacheData.allIdeas = cacheData.allIdeas.slice(0, 500);
            chrome.storage.local.set({ [CACHE_KEY]: cacheData }, () => {
              if (chrome.runtime.lastError) {
                console.error('[Matrixty] Cache RETRY also failed:', chrome.runtime.lastError.message);
              } else {
                console.log(`[Matrixty] Cache saved (minimal): 500 ideas`);
              }
            });
          } else {
            console.log(`[Matrixty] Cache saved OK: ${cacheSizeMB}MB`);
          }
        });
      } catch (e) { console.warn('[Matrixty] Cache save failed:', e); }

      // v7.0.4: Background refresh — update data in memory ONLY, do NOT rebuild DOM
      // DOM rebuild would destroy event listeners (dropdown, input) and reset scroll/expand state
      // Fresh data will be used naturally on next user navigation (filter change, page switch, etc.)
      if (usedCache) {
        console.log('[Matrixty] Background refresh: data updated in memory (no DOM rebuild)');
        // Rebuild grouped data for next filter/display operation
        allIdeasGrouped = {};
        window._shopIdeaCounts = {};
        allIdeas.forEach(idea => {
          const shopKey = idea.shop_name || '(Unassigned)';
          if (!allIdeasGrouped[shopKey]) allIdeasGrouped[shopKey] = [];
          allIdeasGrouped[shopKey].push(idea);
          const assignedNames = idea._assignedShopNames?.length > 0 ? idea._assignedShopNames : [shopKey];
          assignedNames.forEach(sn => { window._shopIdeaCounts[sn] = (window._shopIdeaCounts[sn] || 0) + 1; });
        });
        // Update selectedIdea reference so next interaction uses fresh data
        if (selectedIdea) {
          const freshIdea = allIdeas.find(i =>
            (i.idea_id || i.id) === (selectedIdea.idea_id || selectedIdea.id)
          );
          if (freshIdea) selectedIdea = freshIdea;
        }
        // Update filteredIdeas reference (same objects, no DOM change)
        filteredIdeas = filteredIdeas.map(fi => {
          const fresh = allIdeas.find(i => (i.idea_id || i.id) === (fi.idea_id || fi.id));
          return fresh || fi;
        });

        // v1.2-fix: if admin added/removed a shop or changed seller assignments while
        // user had popup open with cached data, rebuild the shop filter dropdown so
        // the new state is visible immediately. Idea list (with scroll/expand state)
        // is NOT touched — user sees fresh shop list, ideas update on next nav.
        const _newShopSig = _shopAccessSignature();
        if (_newShopSig !== _prevShopSig) {
          console.log('[Matrixty v1.2-fix] Shop/permission change detected during background refresh → rebuilding shop filter dropdown');
          buildShopFilterOptions();
          // If currently selected shop got revoked / removed, fall back to "all" and re-apply filters
          const stillVisible = listingShopFilter && Array.from(listingShopFilter.options).some(o => o.value === selectedShopFilter);
          if (selectedShopFilter && selectedShopFilter !== 'all' && !stillVisible) {
            console.log(`[Matrixty v1.2-fix] Selected shop "${selectedShopFilter}" no longer visible → reset to "all"`);
            selectedShopFilter = 'all';
            if (listingShopFilter) listingShopFilter.value = 'all';
            try { applyFilters(); } catch (e) { /* applyFilters not yet defined in some flows */ }
          }
        }
      } else {
        // First load (no cache) — full display with state restore
        displayIdeas();
      }

    } catch (err) {
      console.error('[Matrixty v7.0.0] loadListingIdeas error:', err);
      if (!usedCache) {
        allIdeas = [];
        if (listingLoading) listingLoading.classList.add('hidden');
        if (listingEmpty) {
          listingEmpty.classList.remove('hidden');
          listingEmpty.textContent = `Error: ${err.message || err}`;
          listingEmpty.style.color = '#c00';
        }
      }
    }
  }

  function renderIdeaList(ideas, totalFiltered) {
    // v7.0.4-fix: Use more efficient removal — collect and batch remove
    const oldItems = listingIdeas.querySelectorAll('.listing-idea-item, .listing-shop-header, .listing-idea-count, .variant-group, .mtx-asin-match-header');
    if (oldItems.length > 50) {
      // For large lists, replacing innerHTML is faster than removing one-by-one
      // But we need to preserve non-idea children, so use a fragment approach
      const fragment = document.createDocumentFragment();
      Array.from(listingIdeas.children).forEach(child => {
        if (!child.matches('.listing-idea-item, .listing-shop-header, .listing-idea-count, .variant-group, .mtx-asin-match-header')) {
          fragment.appendChild(child.cloneNode(true));
        }
      });
      listingIdeas.innerHTML = '';
      listingIdeas.appendChild(fragment);
    } else {
      oldItems.forEach(el => el.remove());
    }
    if (!ideas.length) { if (listingEmpty) listingEmpty.classList.remove('hidden'); return; }
    if (listingEmpty) listingEmpty.classList.add('hidden');

    const isShopFiltered = selectedShopFilter && selectedShopFilter !== 'all';

    // ═══ Detect if current shop is Amazon → variant grouping mode ═══
    let isAmazonShop = false;
    if (isShopFiltered) {
      const shopData = allShops.find(s => s.name === selectedShopFilter);
      isAmazonShop = (shopData?.platform || '').toLowerCase() === 'amazon';
    }

    if (isAmazonShop) {
      renderVariantGrouped(ideas, isShopFiltered);
    } else {
      renderShopGrouped(ideas, isShopFiltered);
    }
  }

  // ═══ AMAZON: Render ideas grouped by variant (like Idea Pool) ═══
  function renderVariantGrouped(ideas, isShopFiltered) {
    // ═══ Group by VARIANT NAME ONLY — matches Idea Pool exactly ═══
    // Idea Pool groups ALL ideas with same variant name together, regardless of parent ASIN
    const variantMap = {};
    ideas.forEach(idea => {
      const vKey = idea.variant || '(No Variant)';
      if (!variantMap[vKey]) variantMap[vKey] = [];
      variantMap[vKey].push({ idea, globalIdx: allIdeas.indexOf(idea) });
    });

    // Sort: created_at asc within each group (matches Idea Pool), alphabetical for group names
    const variantNames = Object.keys(variantMap).sort((a, b) => {
      if (a === '(No Variant)') return 1;
      if (b === '(No Variant)') return -1;
      return a.localeCompare(b);
    });

    // ═══ Split large variant groups into chunks of 15 (matches Idea Pool MAX_VARIANT_GROUP) ═══
    const MAX_VARIANT_GROUP = 15;
    const finalGroups = []; // { displayName, items, parentAsin }

    variantNames.forEach(variantName => {
      const allItems = variantMap[variantName];
      // Sort items by created_at ASC + idea_id ASC (exactly matches Idea Pool grouped sort)
      // Web app: (a.created_at || '').localeCompare(b.created_at || '') || a.id.localeCompare(b.id)
      // Note: ideas with null created_at sort FIRST ('' < any ISO date)
      allItems.sort((a, b) =>
        (a.idea.created_at || '').localeCompare(b.idea.created_at || '') ||
        (a.idea.idea_id || '').localeCompare(b.idea.idea_id || '')
      );

      if (allItems.length <= MAX_VARIANT_GROUP) {
        finalGroups.push({ displayName: variantName, items: allItems });
      } else {
        // Split into numbered sub-groups: "Family Coffee Mug 01", "Family Coffee Mug 02", etc.
        const totalChunks = Math.ceil(allItems.length / MAX_VARIANT_GROUP);
        for (let c = 0; c < totalChunks; c++) {
          const chunk = allItems.slice(c * MAX_VARIANT_GROUP, (c + 1) * MAX_VARIANT_GROUP);
          const num = String(c + 1).padStart(2, '0');
          finalGroups.push({ displayName: `${variantName} ${num}`, items: chunk });
        }
      }
    });

    // v7.0.4-fix: Use DocumentFragment to batch all DOM insertions
    const groupFragment = document.createDocumentFragment();

    finalGroups.forEach(({ displayName, items }) => {
      const variantName = displayName; // For compatibility with rest of code

      const group = document.createElement('div');
      group.className = 'variant-group';

      // Find parent ASIN from ANY idea in this group
      let parentAsin = '';
      for (const { idea } of items) {
        if (isShopFiltered && idea._assignments?.length > 0) {
          const sa = idea._assignments.find(a => a._shop_name === selectedShopFilter);
          if (sa?.parent_asin) { parentAsin = sa.parent_asin; break; }
        }
        if (idea.parent_asin) { parentAsin = idea.parent_asin; break; }
      }

      // ═══ Variant group header (collapsible) ═══
      const header = document.createElement('div');
      header.className = 'variant-group-header';
      const sq = (listingSearch?.value || '').trim();
      header.innerHTML = `
        <span class="variant-toggle-arrow">›</span>
        <span class="variant-group-name">${sq ? highlightSearch(variantName, sq) : escHtml(variantName)}</span>
        <span class="variant-group-count">(${items.length} variants)</span>
        ${parentAsin
          ? `<span class="variant-parent-asin">${sq ? highlightSearch(parentAsin, sq) : escHtml(parentAsin)}</span><button class="variant-asin-copy" title="Copy Parent ASIN">📋</button>`
          : '<span class="variant-parent-asin placeholder">Parent ASIN...</span>'
        }
      `;
      group.appendChild(header);

      // ═══ Variant group body (ideas inside, collapsed by default) ═══
      const body = document.createElement('div');
      body.className = 'variant-group-body';

      items.forEach(({ idea, globalIdx }, rowIdx) => {
        const div = document.createElement('div');
        div.className = 'listing-idea-item variant-child-item';
        div.style.display = 'block';
        div.dataset.idx = globalIdx;

        const name = idea.product_name || idea.assignment_title || 'Untitled';
        const thumb = idea.thumbnail || '';
        let source = '';
        try { if (idea.link_spy) source = new URL(idea.link_spy).hostname.replace('www.', ''); } catch(e) { source = ''; }
        const dateStr = idea.created_at ? new Date(idea.created_at).toLocaleDateString('vi-VN', { month: '2-digit', day: '2-digit' }) : '';

        // Per-shop assignment data
        let shopAssignment = null;
        if (isShopFiltered && idea._assignments?.length > 0) {
          shopAssignment = idea._assignments.find(a => a._shop_name === selectedShopFilter);
        }
        const childAsin = shopAssignment?.child_asin || idea.child_asin || '';
        const aTitle = shopAssignment?.title || '';
        const aTag = shopAssignment?.tag || '';
        const aCustomStyle = shopAssignment?.custom_style || '';
        const aCustomStatus = shopAssignment?.custom_status || '';
        const aNote = shopAssignment?.seller_note || '';
        const aListedBy = shopAssignment?.listed_by || '';

        const hasTitle = !!(idea.etsy_title || idea.amazon_title || aTitle);
        const hasTags = !!(idea.lab_tags || aTag);
        const hasLink = !!(shopAssignment ? shopAssignment.publish_link : idea.publish_link);
        const hasNote = !!aNote;

        const titleBadge = hasTitle ? '<span class="idea-badge badge-title">T</span>' : '';
        const tagsBadge = hasTags ? '<span class="idea-badge badge-tags">G</span>' : '';
        const linkBadge = hasLink ? '<span class="idea-badge badge-link">L</span>' : '';
        const noteBadge = hasNote ? '<span class="idea-badge badge-note">N</span>' : '';

        // Build summary row — same pattern as Etsy (top row + summary chips + detail grid)
        // Build summary chips for Amazon
        const amzChips = [];
        if (aTitle) amzChips.push(`<span class="etsy-chip chip-title" title="${escHtml(aTitle)}">${escHtml(aTitle.length > 16 ? aTitle.substring(0, 16) + '..' : aTitle)}</span>`);
        else amzChips.push('<span class="etsy-chip chip-title empty">No title</span>');
        if (childAsin) amzChips.push(`<span class="etsy-chip" style="background:#FFF3E0;color:#E65100;">${escHtml(childAsin)}</span>`);
        if (aCustomStatus && aCustomStatus !== 'chua_custom') {
          const statusLabels = { da_custom: 'Đã Custom', da_custom_danh_so: 'Custom ĐS', da_custom_clipart: 'Custom CA' };
          amzChips.push(`<span class="etsy-chip" style="background:#E8F5E9;color:#2E7D32;">${statusLabels[aCustomStatus] || aCustomStatus}</span>`);
        } else {
          amzChips.push('<span class="etsy-chip chip-link empty">Chưa Custom</span>');
        }
        if (aListedBy) amzChips.push(`<span class="etsy-chip chip-listed">${escHtml(aListedBy.length > 10 ? aListedBy.substring(0, 10) + '..' : aListedBy)}</span>`);

        div.innerHTML = `
          <div class="etsy-idea-row" style="padding:3px 8px;">
            <span class="variant-row-num">${rowIdx + 1}</span>
            <button class="quick-fill-btn" data-qf="${globalIdx}" title="Quick-fill">&#x26A1;</button>
            ${thumb ? `<img src="${thumb}" alt="" class="idea-thumb" data-thumb-src="${thumb}" style="cursor:zoom-in;width:28px;height:28px;border-radius:4px;object-fit:cover;flex-shrink:0;">` : '<div style="width:28px;height:28px;background:#F3E5F5;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;">?</div>'}
            <div style="flex:1;min-width:0;">
              <div class="idea-name">${escHtml(name)}</div>
              <div class="idea-meta">${idea.sku ? `<span class="sku-badge" title="SKU: ${escHtml(idea.sku)}">${escHtml(idea.sku)}</span>` : ''}${source ? `<span class="variant-source">${escHtml(source)}</span>` : ''}${dateStr ? `<span>${dateStr}</span>` : ''}</div>
            </div>
          </div>
          ${isShopFiltered && shopAssignment ? `
          <div class="etsy-summary" data-expand="amz-${globalIdx}" style="margin-left:52px;">
            <button class="etsy-toggle-btn" title="Mở rộng / Thu gọn" style="background:#FEF3C7;border-color:#FDE68A;color:#B45309;"><span class="etsy-toggle-icon">▸</span> Chi tiết</button>
            <div class="etsy-summary-chips">${amzChips.join('')}</div>
          </div>
          ` : `
          <div style="display:flex;gap:4px;margin-left:52px;padding:0 0 2px;">
            <span class="variant-badge-col">${escHtml(idea.variant || '')}</span>
            ${childAsin ? `<span class="variant-child-asin">${escHtml(childAsin)}<button class="variant-asin-copy small" title="Copy" data-copy-text="${escHtml(childAsin)}">📋</button></span>` : ''}
            <span class="variant-status-badges">${titleBadge}${tagsBadge}${linkBadge}${noteBadge}</span>
          </div>
          `}
          <div class="etsy-detail-grid" id="amz-detail-${globalIdx}" style="margin-left:52px;">
            <div class="etsy-detail-cell">
              <span class="etsy-detail-label">Variant</span>
              <span class="etsy-detail-value">${escHtml(idea.variant || '')}</span>
            </div>
            <div class="etsy-detail-cell">
              <span class="etsy-detail-label">Title ${!canEditAmzListingFields() ? '<span class="field-lock-badge">🔒</span>' : ''}</span>
              <input type="text" class="amz-detail-input amz-title-input ${!canEditAmzListingFields() ? 'field-readonly' : ''}" data-assignment-id="${shopAssignment?.id || ''}" data-prev-value="${escHtml(aTitle)}" value="${escHtml(aTitle)}" placeholder="Enter title" ${!canEditAmzListingFields() ? 'readonly' : ''}>
            </div>
            <div class="etsy-detail-cell">
              <span class="etsy-detail-label">Child ASIN ${!canEditAmzListingFields() ? '<span class="field-lock-badge">🔒</span>' : ''}</span>
              <input type="text" class="amz-detail-input amz-child-asin-input ${!canEditAmzListingFields() ? 'field-readonly' : ''}" data-assignment-id="${shopAssignment?.id || ''}" data-prev-value="${escHtml(childAsin)}" value="${escHtml(childAsin)}" placeholder="Enter child ASIN" ${!canEditAmzListingFields() ? 'readonly' : ''}>
            </div>
            <div class="etsy-detail-cell">
              <span class="etsy-detail-label">Tag ${!canEditAmzListingFields() ? '<span class="field-lock-badge">🔒</span>' : ''}</span>
              <input type="text" class="amz-detail-input amz-tag-input ${!canEditAmzListingFields() ? 'field-readonly' : ''}" data-assignment-id="${shopAssignment?.id || ''}" data-prev-value="${escHtml(aTag)}" value="${escHtml(aTag)}" placeholder="Enter tag" ${!canEditAmzListingFields() ? 'readonly' : ''}>
            </div>
            <div class="etsy-detail-cell">
              <span class="etsy-detail-label">Listed By</span>
              <span class="etsy-detail-value">${aListedBy ? escHtml(aListedBy) : '<span class="detail-empty">—</span>'}</span>
            </div>
            <div class="etsy-detail-cell">
              <span class="etsy-detail-label">Custom Style</span>
              <select class="amz-detail-select amz-style-select" data-assignment-id="${shopAssignment?.id || ''}">
                <option value="">— Chọn —</option>
                <option value="danh_so" ${aCustomStyle === 'danh_so' ? 'selected' : ''}>Đánh Số</option>
                <option value="clipart" ${aCustomStyle === 'clipart' ? 'selected' : ''}>Clipart</option>
              </select>
            </div>
            <div class="etsy-detail-cell etsy-detail-wide">
              <span class="etsy-detail-label">Custom Status</span>
              <select class="amz-detail-select amz-status-select" data-assignment-id="${shopAssignment?.id || ''}">
                <option value="chua_custom" ${aCustomStatus === 'chua_custom' ? 'selected' : ''}>Chưa Custom</option>
                <option value="da_custom" ${aCustomStatus === 'da_custom' ? 'selected' : ''}>Đã Custom</option>
                <option value="da_custom_danh_so" ${aCustomStatus === 'da_custom_danh_so' ? 'selected' : ''}>Đã Custom Đánh Số</option>
                <option value="da_custom_clipart" ${aCustomStatus === 'da_custom_clipart' ? 'selected' : ''}>Đã Custom Clipart</option>
              </select>
            </div>
          </div>
        `;

        // Toggle expand/collapse — same pattern as Etsy
        const amzToggleBtn = div.querySelector('.etsy-toggle-btn');
        const amzSummary = div.querySelector('.etsy-summary');
        const detailGrid = div.querySelector('.etsy-detail-grid');
        if (amzToggleBtn && amzSummary) {
          amzToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            amzSummary.classList.toggle('expanded');
          });
        }

        // Event listeners
        const thumbImg = div.querySelector('.idea-thumb');
        if (thumbImg) {
          thumbImg.addEventListener('click', (e) => { e.stopPropagation(); showThumbPreview(thumb); });
        }
        div.addEventListener('click', (e) => {
          if (e.target.closest('.quick-fill-btn') || e.target.closest('.idea-thumb') || e.target.closest('.variant-asin-copy') || e.target.closest('.etsy-toggle-btn') || e.target.closest('.etsy-summary') || e.target.closest('.etsy-detail-grid') || e.target.closest('.sku-badge')) return;
          quickFillIdea(globalIdx);
        });
        div.querySelector('.quick-fill-btn')?.addEventListener('click', (e) => {
          e.stopPropagation(); quickFillIdea(globalIdx);
        });

        // ═══ v9.5: Wire up Amazon fields with direct per-element handlers ═══
        // (Same pattern as Etsy wireEtsyField — more reliable than delegation for blur events)
        if (isShopFiltered && shopAssignment?.id) {
          const assignmentId = shopAssignment.id;
          const prevAmzValues = {
            title: aTitle, child_asin: childAsin, tag: aTag,
          };
          const wireAmzField = (inputEl, fieldName) => {
            if (!inputEl) return;
            inputEl.dataset.wired = 'true'; // v9.5: Mark as wired to skip delegated handler
            const saveHandler = async () => {
              // v8.1.0: Block save if title has BLOCK-severity trademark match
              if (fieldName === 'title' && inputEl.getAttribute('data-tm-blocked') === 'true') {
                inputEl.style.background = '#FEE2E2';
                inputEl.title = '⛔ Title chứa từ trademark bị chặn — sửa trước khi lưu';
                return;
              }
              const newValue = (inputEl.value || '').trim();
              if (newValue === prevAmzValues[fieldName]) return;

              console.log(`[Matrixty v9.5] Saving Amazon ${fieldName}: "${newValue}" → assignment: ${assignmentId}`);
              inputEl.style.background = '#FEF9C3'; // yellow = saving
              const fieldsToUpdate = { [fieldName]: newValue };
              if (['title', 'child_asin'].includes(fieldName) && currentUser?.name) {
                fieldsToUpdate.listed_by = currentUser.name;
                fieldsToUpdate.listed_at = new Date().toISOString();
              }

              const success = await updateAssignment(assignmentId, fieldsToUpdate);
              if (success) {
                inputEl.style.background = '#D1FAE5'; // green = saved
                prevAmzValues[fieldName] = newValue;
                inputEl.dataset.prevValue = newValue;
                // Update local data
                for (const idea of allIdeas) {
                  const sa = idea._assignments?.find(a => String(a.id) === String(assignmentId));
                  if (sa) {
                    sa[fieldName] = newValue;
                    if (fieldsToUpdate.listed_by) { sa.listed_by = fieldsToUpdate.listed_by; sa.listed_at = fieldsToUpdate.listed_at; }
                    break;
                  }
                }
                updateIdeasCache();
                window._lastLocalSaveTs = Date.now();
                console.log(`[Matrixty v9.5] ✅ Amazon ${fieldName} saved OK`);
                setTimeout(() => { inputEl.style.background = ''; }, 1500);
              } else {
                inputEl.style.background = '#FEE2E2'; // red = failed
                inputEl.title = `❌ Save failed! ID: ${assignmentId}`;
                console.error(`[Matrixty v9.5] ❌ Amazon ${fieldName} save FAILED`);
                setTimeout(() => { inputEl.style.background = ''; inputEl.title = ''; }, 3000);
              }
            };
            inputEl.addEventListener('blur', saveHandler);
            // Auto-save 2s after last keystroke (popup can close before blur fires)
            let amzDebounce;
            inputEl.addEventListener('input', () => {
              clearTimeout(amzDebounce);
              amzDebounce = setTimeout(saveHandler, 2000);
            });
          };
          wireAmzField(detailGrid.querySelector('.amz-title-input'), 'title');
          wireAmzField(detailGrid.querySelector('.amz-child-asin-input'), 'child_asin');
          wireAmzField(detailGrid.querySelector('.amz-tag-input'), 'tag');

          // Wire selects (custom_style, custom_status) with direct change handlers
          const wireAmzSelect = (selectEl, fieldName) => {
            if (!selectEl) return;
            selectEl.dataset.wired = 'true'; // v9.5: Mark as wired to skip delegated handler
            selectEl.addEventListener('change', async () => {
              const newValue = selectEl.value;
              console.log(`[Matrixty v9.5] Amazon ${fieldName} → "${newValue}" (assignment: ${assignmentId})`);
              selectEl.style.background = '#FEF9C3';
              const fieldsToUpdate = { [fieldName]: newValue };
              if (fieldName === 'custom_status' && currentUser?.name) {
                fieldsToUpdate.listed_by = currentUser.name;
                fieldsToUpdate.listed_at = new Date().toISOString();
              }
              const success = await updateAssignment(assignmentId, fieldsToUpdate);
              if (success) {
                selectEl.style.background = '#D1FAE5';
                for (const idea of allIdeas) {
                  const sa = idea._assignments?.find(a => String(a.id) === String(assignmentId));
                  if (sa) { sa[fieldName] = newValue; if (fieldsToUpdate.listed_by) { sa.listed_by = fieldsToUpdate.listed_by; sa.listed_at = fieldsToUpdate.listed_at; } break; }
                }
                updateIdeasCache();
                window._lastLocalSaveTs = Date.now();
                console.log(`[Matrixty v9.5] ✅ Amazon ${fieldName} saved OK`);
                setTimeout(() => { selectEl.style.background = ''; }, 1500);
              } else {
                selectEl.style.background = '#FEE2E2';
                console.error(`[Matrixty v9.5] ❌ Amazon ${fieldName} save FAILED`);
                setTimeout(() => { selectEl.style.background = ''; }, 3000);
              }
            });
          };
          wireAmzSelect(detailGrid.querySelector('.amz-style-select'), 'custom_style');
          wireAmzSelect(detailGrid.querySelector('.amz-status-select'), 'custom_status');

          console.log('[Matrixty v9.5] Amazon fields wired (direct handlers), assignmentId:', assignmentId);
        }

        body.appendChild(div);
      });

      group.appendChild(body);
      groupFragment.appendChild(group);

      // ═══ Toggle expand/collapse ═══
      header.addEventListener('click', (e) => {
        if (e.target.closest('.variant-asin-copy')) return;
        group.classList.toggle('expanded');
      });

      // ═══ Copy parent ASIN button ═══
      const copyBtn = header.querySelector('.variant-asin-copy');
      if (copyBtn && parentAsin) {
        copyBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          navigator.clipboard.writeText(parentAsin).then(() => {
            copyBtn.textContent = '✅';
            setTimeout(() => { copyBtn.textContent = '📋'; }, 1200);
          }).catch(() => {
            const ta = document.createElement('textarea');
            ta.value = parentAsin; ta.style.cssText = 'position:fixed;opacity:0';
            document.body.appendChild(ta); ta.select(); document.execCommand('copy');
            document.body.removeChild(ta);
            copyBtn.textContent = '✅';
            setTimeout(() => { copyBtn.textContent = '📋'; }, 1200);
          });
        });
      }

      // ═══ Copy child ASIN buttons ═══
      body.querySelectorAll('.variant-asin-copy.small').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const text = btn.dataset.copyText || '';
          navigator.clipboard.writeText(text).then(() => {
            btn.textContent = '✅';
            setTimeout(() => { btn.textContent = '📋'; }, 1200);
          }).catch(() => {
            const ta = document.createElement('textarea');
            ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
            document.body.appendChild(ta); ta.select(); document.execCommand('copy');
            document.body.removeChild(ta);
            btn.textContent = '✅';
            setTimeout(() => { btn.textContent = '📋'; }, 1200);
          });
        });
      });
    });

    // v7.0.4-fix: Append all groups at once (single DOM operation)
    listingIdeas.appendChild(groupFragment);

    // Shop header on top
    const shopHeader = document.createElement('div');
    shopHeader.className = 'listing-shop-header';
    const shopData = allShops.find(s => s.name === selectedShopFilter);
    const platform = shopData?.platform || '';
    const platformBadge = platform ? `<span class="shop-platform-badge ${platform.toLowerCase()}">${platform}</span>` : '';
    shopHeader.innerHTML = `<span class="shop-header-name">${selectedShopFilter}</span> ${platformBadge} <span class="shop-header-count">${ideas.length}</span>`;
    listingIdeas.insertBefore(shopHeader, listingIdeas.firstChild);
  }

  // ═══ DEFAULT: Render ideas grouped by shop (Etsy / other) ═══

  // Detect if search query is an ASIN (Amazon Standard Identification Number)
  // Pattern: starts with B0 and is 10 alphanumeric chars
  function isAsinQuery(q) {
    if (!q) return false;
    const upper = q.toUpperCase().trim();
    return /^B0[A-Z0-9]{8}$/.test(upper);
  }

  function renderShopGrouped(ideas, isShopFiltered) {
    const searchQuery = (listingSearch?.value || '').trim();
    const asinSearch = isAsinQuery(searchQuery);
    const asinUpper = asinSearch ? searchQuery.toUpperCase() : '';

    const grouped = {};
    ideas.forEach((idea) => {
      if (isShopFiltered) {
        // Single-shop view: all ideas go under the selected shop
        if (!grouped[selectedShopFilter]) grouped[selectedShopFilter] = [];
        grouped[selectedShopFilter].push({ idea, globalIdx: allIdeas.indexOf(idea) });
      } else {
        // All-shops view: idea appears in EVERY shop it's assigned to
        // BUT if searching by ASIN → only show in shops whose assignment contains that ASIN
        const assignments = idea._assignments || [];

        let relevantShopNames;
        if (asinSearch && assignments.length > 0) {
          // Only include shops where the ASIN appears in that shop's assignment
          relevantShopNames = assignments
            .filter(a => {
              const fields = [a.parent_asin, a.child_asin, a.custom_style].filter(Boolean);
              return fields.some(f => f.toUpperCase().includes(asinUpper));
            })
            .map(a => a._shop_name)
            .filter(Boolean);
          // If ASIN is at idea level (not assignment), fall back to Amazon shops only
          if (relevantShopNames.length === 0) {
            const ideaAsinFields = [idea.parent_asin, idea.child_asin, idea.custom_style].filter(Boolean);
            if (ideaAsinFields.some(f => f.toUpperCase().includes(asinUpper))) {
              relevantShopNames = assignments
                .filter(a => {
                  const shop = allShops.find(s => s.name === a._shop_name);
                  return shop && (shop.platform || '').toLowerCase() === 'amazon';
                })
                .map(a => a._shop_name)
                .filter(Boolean);
            }
          }
        }

        const shopNames = relevantShopNames?.length > 0
          ? relevantShopNames
          : (idea._assignedShopNames?.length > 0 ? idea._assignedShopNames : [idea.shop_name || '(Unassigned)']);

        // Permission filter: only show in shops user can see
        const visibleNames = myShopIds
          ? shopNames.filter(sn => {
              const shop = allShops.find(s => s.name === sn);
              return shop && myShopIds.has(shop.id);
            })
          : shopNames;
        const finalNames = visibleNames.length > 0 ? visibleNames : [idea.shop_name || '(Unassigned)'];
        finalNames.forEach(shopKey => {
          if (!grouped[shopKey]) grouped[shopKey] = [];
          grouped[shopKey].push({ idea, globalIdx: allIdeas.indexOf(idea) });
        });
      }
    });

    const shopNames = Object.keys(grouped).sort((a, b) => {
      if (a === '(Unassigned)') return 1;
      if (b === '(Unassigned)') return -1;
      return a.localeCompare(b);
    });

    const showHeaders = shopNames.length > 1;

    // v7.0.4-fix: Use DocumentFragment to batch all DOM insertions
    const shopFragment = document.createDocumentFragment();

    // ═══ ASIN SEARCH: Show ONE parent ASIN match header ═══
    const searchQ = (listingSearch?.value || '').trim().toUpperCase();
    const isAsinSearchResult = searchQ && /^B0[A-Z0-9]{8,}$/.test(searchQ) && ideas.length > 0;
    if (isAsinSearchResult && !listingIdeas.querySelector('.mtx-asin-match-header')) {
      let matchedParentAsin = '';
      let totalVariants = 0;
      for (const items of Object.values(grouped)) {
        for (const { idea } of items) {
          const pa = (idea._assignments || []).find(a => (a.parent_asin || '').toUpperCase() === searchQ);
          if (pa) { matchedParentAsin = pa.parent_asin; }
        }
        if (matchedParentAsin) {
          // Count total ideas across all shops with this parent ASIN or same variant
          totalVariants = Object.values(grouped).reduce((sum, arr) => sum + arr.length, 0);
          break;
        }
      }
      if (matchedParentAsin) {
        const asinHeader = document.createElement('div');
        asinHeader.className = 'mtx-asin-match-header';
        asinHeader.style.cssText = 'padding:6px 10px;background:#FFF3E0;border-radius:6px;margin-bottom:6px;display:flex;align-items:center;gap:8px;font-size:11px;';
        asinHeader.innerHTML = `
          <span style="background:#E65100;color:#fff;padding:2px 6px;border-radius:4px;font-size:9px;font-weight:700;">MATCH</span>
          <span style="font-family:monospace;font-weight:700;color:#E65100;">Parent ASIN: ${escHtml(matchedParentAsin)}</span>
          <span style="color:#78716C;">(${totalVariants} variants)</span>
        `;
        shopFragment.appendChild(asinHeader);
      }
    }

    shopNames.forEach(shopName => {
      if (showHeaders || isShopFiltered) {
        const header = document.createElement('div');
        header.className = 'listing-shop-header';
        // Get platform from allShops (authoritative), fallback to idea data
        const shopObj = allShops.find(s => s.name === shopName);
        const platform = shopObj?.platform || grouped[shopName][0]?.idea?.shop_platform || '';
        const platformBadge = platform ? `<span class="shop-platform-badge ${platform.toLowerCase()}">${platform}</span>` : '';
        header.innerHTML = `<span class="shop-header-name">${shopName}</span> ${platformBadge} <span class="shop-header-count">${grouped[shopName].length}</span>`;
        header.style.cursor = 'pointer';
        header.title = `Click để xem shop ${shopName}`;
        header.addEventListener('click', () => {
          if (listingShopFilter) {
            const opt = Array.from(listingShopFilter.options).find(o => o.textContent.includes(shopName) || o.value === shopName);
            if (opt) listingShopFilter.value = opt.value;
            else listingShopFilter.value = shopName;
            selectedShopFilter = listingShopFilter.value;
            // Keep search text — so only matching ideas show (matches Idea Pool behavior)
            applyFilters();
            savePopupState();
            // Auto-expand variant groups if search is active
            if ((listingSearch?.value || '').trim()) {
              setTimeout(() => {
                document.querySelectorAll('.variant-group').forEach(g => g.classList.add('expanded'));
              }, 150);
            }
          }
        });
        shopFragment.appendChild(header);
      }

      // Detect if current shop is Etsy for showing detail fields
      const currentShopObj = allShops.find(s => s.name === shopName);
      const isEtsyShop = isShopFiltered && (currentShopObj?.platform || '').toLowerCase() === 'etsy';

      grouped[shopName].forEach(({ idea, globalIdx }) => {
        const div = document.createElement('div');
        div.className = 'listing-idea-item';
        div.dataset.idx = globalIdx;
        const name = idea.product_name || idea.assignment_title || 'Untitled';
        const meta = [idea.niche, idea.variant].filter(Boolean).join(' | ') || idea.assignment_tag || '';
        const thumb = idea.thumbnail || '';
        const shopCount = idea._assignedShopCount || 0;
        const shopBadge = shopCount > 1 ? `<span class="idea-badge badge-shop">${shopCount} shops</span>` : '';

        let shopAssignment = null;
        if (isShopFiltered && idea._assignments?.length > 0) {
          shopAssignment = idea._assignments.find(a => a._shop_name === selectedShopFilter);
        }

        // ═══ ETSY SHOP: Collapsible detail row ═══
        if (isEtsyShop && shopAssignment) {
          const aTitle = shopAssignment.title || '';
          const aLink = shopAssignment.publish_link || '';
          const aTag = shopAssignment.tag || '';
          const aListedBy = shopAssignment.listed_by || '';
          const aNote = shopAssignment.seller_note || '';
          const aVariant = idea.variant || '';
          const aSample = shopAssignment.sample_id || '';

          // Build summary chips (collapsed view)
          const summaryChips = [];
          if (aTitle) summaryChips.push(`<span class="etsy-chip chip-title" title="${escHtml(aTitle)}">${escHtml(aTitle.length > 18 ? aTitle.substring(0, 18) + '..' : aTitle)}</span>`);
          else summaryChips.push('<span class="etsy-chip chip-title empty">No title</span>');
          if (aLink) summaryChips.push('<span class="etsy-chip chip-link">✅ Listed</span>');
          else summaryChips.push('<span class="etsy-chip chip-link empty">No link</span>');
          if (aTag) summaryChips.push(`<span class="etsy-chip chip-tag" title="${escHtml(aTag)}">${escHtml(aTag.length > 12 ? aTag.substring(0, 12) + '..' : aTag)}</span>`);
          if (aListedBy) summaryChips.push(`<span class="etsy-chip chip-listed">${escHtml(aListedBy.length > 10 ? aListedBy.substring(0, 10) + '..' : aListedBy)}</span>`);
          if (aNote) summaryChips.push('<span class="etsy-chip chip-note">Note</span>');

          div.innerHTML = `
            <div class="etsy-idea-row">
              <button class="quick-fill-btn" data-qf="${globalIdx}" title="Quick-fill">&#x26A1;</button>
              ${thumb ? `<img src="${thumb}" alt="" class="idea-thumb" data-thumb-src="${thumb}" style="cursor:zoom-in;">` : '<div style="width:32px;height:32px;background:#F3E5F5;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:11px;flex-shrink:0;">?</div>'}
              <div style="flex:1;min-width:0;">
                <div class="idea-name" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(name)}</div>
                <div class="idea-meta">${idea.sku ? `<span class="sku-badge" title="SKU: ${escHtml(idea.sku)}">${escHtml(idea.sku)}</span>` : ''}${escHtml(meta)} ${shopBadge}</div>
              </div>
            </div>
            <div class="etsy-summary" data-expand="etsy-${globalIdx}">
              <button class="etsy-toggle-btn" title="Mở rộng / Thu gọn"><span class="etsy-toggle-icon">▸</span> Chi tiết</button>
              <div class="etsy-summary-chips">${summaryChips.join('')}</div>
            </div>
            <div class="etsy-detail-grid" id="etsy-detail-${globalIdx}">
              <div class="etsy-detail-cell">
                <span class="etsy-detail-label">Variant</span>
                <span class="etsy-detail-value">${aVariant ? escHtml(aVariant) : '<span class="detail-empty">—</span>'}</span>
              </div>
              <div class="etsy-detail-cell">
                <span class="etsy-detail-label">Sample</span>
                <span class="etsy-detail-value">${aSample ? escHtml(aSample) : '<span class="detail-empty">—</span>'}</span>
              </div>
              <div class="etsy-detail-cell etsy-detail-wide">
                <span class="etsy-detail-label">Title</span>
                <input type="text" class="etsy-detail-input etsy-title-input" data-assignment-id="${shopAssignment?.id || ''}" value="${escHtml(aTitle)}" placeholder="Enter title">
              </div>
              <div class="etsy-detail-cell etsy-detail-wide">
                <span class="etsy-detail-label">Link</span>
                <input type="text" class="etsy-detail-input etsy-link-input" data-assignment-id="${shopAssignment?.id || ''}" value="${escHtml(aLink)}" placeholder="Enter link">
              </div>
              <div class="etsy-detail-cell">
                <span class="etsy-detail-label">Tag</span>
                <input type="text" class="etsy-detail-input etsy-tag-input" data-assignment-id="${shopAssignment?.id || ''}" value="${escHtml(aTag)}" placeholder="Enter tag">
              </div>
              <div class="etsy-detail-cell">
                <span class="etsy-detail-label">Listed By</span>
                <span class="etsy-detail-value">${aListedBy ? escHtml(aListedBy) : '<span class="detail-empty">—</span>'}</span>
              </div>
              <div class="etsy-detail-cell etsy-detail-wide">
                <span class="etsy-detail-label">Seller Note</span>
                <input type="text" class="etsy-detail-input etsy-note-input" data-assignment-id="${shopAssignment?.id || ''}" value="${escHtml(aNote)}" placeholder="Enter seller note">
              </div>
            </div>
          `;

          // Toggle expand/collapse — only on the toggle button
          const toggleBtn = div.querySelector('.etsy-toggle-btn');
          const summaryEl = div.querySelector('.etsy-summary');
          if (toggleBtn && summaryEl) {
            toggleBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              summaryEl.classList.toggle('expanded');
            });
          }

          // ═══ Wire up editable Etsy fields with auto-save on blur ═══
          const detailGrid = div.querySelector('.etsy-detail-grid');
          if (detailGrid && shopAssignment?.id) {
            const assignmentId = shopAssignment.id;
            const prevValues = {
              title: aTitle,
              link: aLink,
              tag: aTag,
              note: aNote,
            };

            const wireEtsyField = (inputEl, fieldName) => {
              if (!inputEl) return;
              const handler = async () => {
                // v8.1.0: Block save if title has BLOCK-severity trademark match
                if (fieldName === 'title' && inputEl.getAttribute('data-tm-blocked') === 'true') {
                  inputEl.style.background = '#FEE2E2';
                  inputEl.title = '⛔ Title chứa từ trademark bị chặn — sửa trước khi lưu';
                  return;
                }
                const newValue = inputEl.value.trim();
                if (newValue === prevValues[fieldName]) return;

                inputEl.classList.add('saving');
                const fieldsToUpdate = { [fieldName]: newValue };
                if (['title', 'publish_link', 'tag'].includes(fieldName) && currentUser?.name) {
                  fieldsToUpdate.listed_by = currentUser.name;
                  fieldsToUpdate.listed_at = new Date().toISOString();
                }
                console.log(`[Matrixty] Saving Etsy ${fieldName}:`, newValue, '→ assignment:', assignmentId);
                const success = await updateAssignment(assignmentId, fieldsToUpdate);

                if (success) {
                  inputEl.classList.remove('saving');
                  inputEl.classList.add('saved');
                  prevValues[fieldName] = newValue;
                  shopAssignment[fieldName] = newValue;
                  updateIdeasCache();
                  console.log(`[Matrixty] ✅ Etsy ${fieldName} saved & cached`);
                  setTimeout(() => inputEl.classList.remove('saved'), 1500);
                } else {
                  inputEl.classList.remove('saving');
                  inputEl.classList.add('error');
                  console.error(`[Matrixty] ❌ Etsy ${fieldName} save FAILED`);
                  setTimeout(() => inputEl.classList.remove('error'), 2000);
                }
              };
              inputEl.addEventListener('blur', handler);
              // Auto-save 2s after last keystroke (popup can close before blur fires)
              let debounceTimer;
              inputEl.addEventListener('input', () => {
                clearTimeout(debounceTimer);
                debounceTimer = setTimeout(handler, 2000);
              });
            };

            wireEtsyField(detailGrid.querySelector('.etsy-title-input'), 'title');
            wireEtsyField(detailGrid.querySelector('.etsy-link-input'), 'publish_link');
            wireEtsyField(detailGrid.querySelector('.etsy-tag-input'), 'tag');
            wireEtsyField(detailGrid.querySelector('.etsy-note-input'), 'seller_note');
          }
        } else {
          // ═══ DEFAULT VIEW: compact card (non-Etsy or all-shops view) ═══
          const hasTitle = !!(idea.etsy_title || idea.amazon_title);
          const hasTags = !!idea.lab_tags;
          const hasLink = !!(shopAssignment ? shopAssignment.publish_link : idea.publish_link);
          const hasNote = !!(shopAssignment ? shopAssignment.seller_note : idea.seller_note);

          const titleBadge = hasTitle ? '<span class="idea-badge badge-title">Title</span>' : '';
          const tagsBadge = hasTags ? '<span class="idea-badge badge-tags">Tags</span>' : '';
          const linkBadge = hasLink ? '<span class="idea-badge badge-link">Link</span>' : '';
          const noteBadge = hasNote ? '<span class="idea-badge badge-note">Note</span>' : '';

          // Get per-shop assignment data for this shop group
          const shopA = idea._assignments?.find(a => a._shop_name === shopName);
          const aTitle = shopA?.title || '';
          const aLink = shopA?.publish_link || '';
          const aParentAsin = shopA?.parent_asin || '';
          const aChildAsin = shopA?.child_asin || '';

          // Get current search query for highlighting
          const sq = (listingSearch?.value || '').trim();

          div.innerHTML = `
            <button class="quick-fill-btn" data-qf="${globalIdx}" title="Quick-fill hybrid format">&#x26A1;</button>
            ${thumb ? `<img src="${thumb}" alt="" class="idea-thumb" data-thumb-src="${thumb}" style="cursor:zoom-in;">` : '<div style="width:32px;height:32px;background:#F3E5F5;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0;">?</div>'}
            <div style="flex:1;min-width:0;">
              <div class="idea-name" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${sq ? highlightSearch(name, sq) : escHtml(name)}</div>
              <div class="idea-meta">${idea.sku ? `<span class="sku-badge" title="SKU: ${escHtml(idea.sku)}">${sq ? highlightSearch(idea.sku, sq) : escHtml(idea.sku)}</span>` : ''}${escHtml(meta)} ${shopBadge}</div>
              ${aTitle || aLink || aChildAsin ? `<div style="font-size:9px;color:#78716C;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                ${aTitle ? `<span style="color:#2E7D32;">${sq ? highlightSearch(aTitle.length > 30 ? aTitle.substring(0, 30) + '..' : aTitle, sq) : escHtml(aTitle.length > 30 ? aTitle.substring(0, 30) + '..' : aTitle)}</span>` : ''}
                ${aChildAsin ? `<span style="color:#E65100;margin-left:3px;font-family:monospace;font-weight:600;">${sq ? highlightSearch(aChildAsin, sq) : escHtml(aChildAsin)}</span>` : ''}
                ${aLink ? '<span style="color:#059669;margin-left:3px;">Link</span>' : ''}
              </div>` : ''}
            </div>
          `;
        }

        const thumbImg = div.querySelector('.idea-thumb');
        if (thumbImg) {
          thumbImg.addEventListener('click', (e) => { e.stopPropagation(); showThumbPreview(thumb); });
        }
        div.addEventListener('click', (e) => {
          if (e.target.closest('.quick-fill-btn') || e.target.closest('.idea-thumb') || e.target.closest('.detail-link') || e.target.closest('.etsy-summary') || e.target.closest('.etsy-detail-grid') || e.target.closest('.sku-badge')) return;

          if (!isShopFiltered) {
            // ═══ ALL SHOPS VIEW: Click → navigate to that shop + keep search if ASIN ═══
            if (listingShopFilter) {
              const shopOption = Array.from(listingShopFilter.options).find(o => o.textContent.includes(shopName) || o.value === shopName);
              if (shopOption) listingShopFilter.value = shopOption.value;
              else listingShopFilter.value = shopName;
              selectedShopFilter = listingShopFilter.value;

              // Always keep search text when navigating from search results
              // This ensures Extension matches Idea Pool: search active → only matching ideas show

              applyFilters();
              savePopupState();
              // After render: auto-expand variant group containing this idea + highlight
              setTimeout(() => {
                const ideaItem = listingIdeas.querySelector(`.listing-idea-item[data-idx="${globalIdx}"]`);
                if (ideaItem) {
                  const variantGroup = ideaItem.closest('.variant-group');
                  if (variantGroup && !variantGroup.classList.contains('expanded')) {
                    variantGroup.classList.add('expanded');
                  }
                  ideaItem.classList.add('selected');
                  ideaItem.scrollIntoView({ block: 'center', behavior: 'smooth' });
                } else if (isAsinSearch) {
                  // Expand all variant groups when coming from ASIN search
                  document.querySelectorAll('.variant-group').forEach(g => g.classList.add('expanded'));
                }
              }, 150);
            }
          } else {
            // ═══ SHOP FILTERED VIEW: Click → open mini-lab ═══
            quickFillIdea(globalIdx);
          }
        });
        const qfBtn = div.querySelector('.quick-fill-btn');
        if (qfBtn) {
          // ⚡ button always opens mini-lab regardless of view
          qfBtn.addEventListener('click', (e) => { e.stopPropagation(); quickFillIdea(globalIdx); });
        }

        shopFragment.appendChild(div);
      });
    });

    // v7.0.4-fix: Append all items at once (single DOM operation instead of N appends)
    listingIdeas.appendChild(shopFragment);
  }

  // ===== THUMBNAIL PREVIEW =====
  function showThumbPreview(src) {
    const overlay = document.createElement('div');
    overlay.className = 'thumb-preview-overlay';
    overlay.innerHTML = `<img src="${src}" alt="Preview">`;
    overlay.addEventListener('click', () => overlay.remove());
    document.body.appendChild(overlay);
  }

  function selectIdea(idx) {
    selectedIdea = allIdeas[idx];
    generatedData = null;
    analyzedData = null;

    listingIdeas.querySelectorAll('.listing-idea-item').forEach(el => {
      el.classList.toggle('selected', parseInt(el.dataset.idx) === idx);
    });

    // Show preview panel
    previewPanel.classList.remove('hidden');
    const name = selectedIdea.product_name || selectedIdea.assignment_title || 'Idea';
    previewIdeaName.textContent = name.length > 35 ? name.substring(0, 35) + '...' : name;

    // Resolve existing Lab data
    const resolvedTitle = resolveTitle(selectedIdea);
    const resolvedTags = resolveTags(selectedIdea);
    const hasLabData = !!(selectedIdea.etsy_title || selectedIdea.amazon_title || selectedIdea.lab_tags);

    previewTitle.value = resolvedTitle;
    previewTags.value = resolvedTags;
    previewDescription.value = '';

    if (hasLabData && resolvedTitle) {
      // Lab data exists — show "Lab Ready", enable Auto-Fill directly
      previewStatus.textContent = 'Lab Ready';
      previewStatus.className = 'preview-header-status ready';
      btnGenerate.textContent = 'Re-generate';
      btnAutofill.disabled = false;
    } else if (resolvedTitle || resolvedTags) {
      // Has some title/tags but not from Lab
      previewStatus.textContent = 'Ready';
      previewStatus.className = 'preview-header-status ready';
      btnGenerate.textContent = 'Re-generate';
      btnAutofill.disabled = false;
    } else {
      // No data — need to generate
      previewStatus.textContent = 'Need generate';
      previewStatus.className = 'preview-header-status empty';
      btnGenerate.textContent = 'Generate';
      btnAutofill.disabled = true;
    }

    btnGenerate.disabled = false;
    hideGenerateStatus();
  }

  // ===== DATA RESOLUTION =====

  function resolveTitle(idea) {
    if (detectedPlatform === 'etsy') {
      return idea.etsy_title || idea.tm_clean_title || idea.assignment_title || '';
    } else if (detectedPlatform === 'amazon') {
      return idea.amazon_title || idea.tm_clean_title || idea.assignment_title || '';
    }
    return idea.etsy_title || idea.amazon_title || idea.tm_clean_title || idea.assignment_title || '';
  }

  function resolveTags(idea) {
    let tags = idea.lab_tags || idea.title_keywords || idea.assignment_tag || '';
    if (Array.isArray(tags)) return tags.join(', ');
    if (typeof tags === 'string' && tags.startsWith('[')) {
      try {
        const parsed = JSON.parse(tags);
        if (Array.isArray(parsed)) return parsed.join(', ');
      } catch(e) {}
    }
    return tags;
  }

  // ===== HYBRID FORMAT =====
  // Parse title into slots a), b), c), d) based on platform separator
  // Etsy: comma separator, 4 slots (a,b,c,d)
  // Amazon: dash (–) separator, 5 slots (a,b,c,d,e)

  function formatHybridTitle(idea) {
    const title = resolveTitle(idea);
    if (!title) return '';

    const platform = detectIdeaPlatform(idea);
    let parts;
    if (platform === 'amazon') {
      // Amazon: split by – (en-dash) or - (hyphen with spaces)
      parts = title.split(/\s*[–—]\s*|\s+-\s+/).map(s => s.trim()).filter(Boolean);
    } else {
      // Etsy: split by comma
      parts = title.split(',').map(s => s.trim()).filter(Boolean);
    }

    const slots = ['a', 'b', 'c', 'd', 'e'];
    return parts.map((part, i) => {
      const slot = i < slots.length ? slots[i] : String.fromCharCode(97 + i);
      return `${slot}) ${part}`;
    }).join('\n');
  }

  function formatHybridTags(idea) {
    const tags = resolveTags(idea);
    if (!tags) return '';
    // Tags: split by comma, number them
    const tagList = tags.split(',').map(t => t.trim()).filter(Boolean);
    return tagList.map((tag, i) => `${i + 1}. ${tag}`).join('\n');
  }

  function detectIdeaPlatform(idea) {
    // Priority 1: If a specific shop is selected, use THAT shop's platform
    if (selectedShopFilter && selectedShopFilter !== 'all') {
      const shopData = allShops.find(s => s.name === selectedShopFilter);
      const filteredPlatform = (shopData?.platform || '').toLowerCase();
      if (filteredPlatform === 'etsy' || filteredPlatform === 'amazon' || filteredPlatform === 'tiktok') return filteredPlatform;
    }
    // Priority 2: Use idea's primary shop_platform
    const sp = (idea.shop_platform || '').toLowerCase();
    if (sp === 'etsy' || sp === 'amazon' || sp === 'tiktok') return sp;
    // Priority 3: Detected platform from current tab URL
    return detectedPlatform !== 'unknown' ? detectedPlatform : 'etsy';
  }

  // ===== QUICK-FILL: ⚡ BUTTON LOGIC =====
  // If Lab data exists → instant sync to preview (hybrid format)
  // If no Lab data → show inline mini-lab popup for quick generate
  let activeMiniLab = null; // reference to currently open mini-lab element

  // v9.2: Extract current mini-lab editable content for state persistence
  function getMiniLabContent() {
    if (!activeMiniLab) return null;
    try {
      const titleEl = activeMiniLab.querySelector('.mini-lab-result-title[contenteditable]');
      const tagsEl = activeMiniLab.querySelector('.mini-lab-result-tags');
      if (!titleEl) return null;
      const title = titleEl.textContent?.trim() || '';
      const tags = [];
      if (tagsEl) {
        tagsEl.querySelectorAll('.mini-lab-tag-chip').forEach(chip => {
          const t = chip.textContent?.replace(/×$/, '').trim();
          if (t) tags.push(t);
        });
      }
      return title ? { title, tags } : null;
    } catch { return null; }
  }

  function closeMiniLab() {
    if (activeMiniLab) {
      activeMiniLab.remove();
      activeMiniLab = null;
    }
    const container = document.querySelector('.mini-lab-container');
    if (container) { container.classList.remove('active'); container.innerHTML = ''; }
    document.body.classList.remove('mini-lab-open');
  }

  function quickFillIdea(idx, restoredMiniLabData) {
    const idea = allIdeas[idx];
    selectedIdea = idea;
    // v9.2: If restoring, pre-populate generatedData so mini-lab shows saved content
    if (restoredMiniLabData?.title) {
      generatedData = { title: restoredMiniLabData.title, tags: restoredMiniLabData.tags || [], description: '' };
    } else {
      generatedData = null;
    }
    analyzedData = null;
    closeMiniLab();
    savePopupState();

    // Highlight selected
    listingIdeas.querySelectorAll('.listing-idea-item').forEach(el => {
      el.classList.toggle('selected', parseInt(el.dataset.idx) === idx);
    });

    // Always use showMiniLab — it handles both cases:
    // - Has existing lab data → shows title/tags directly with Auto-Fill
    // - No lab data → shows generate form
    showMiniLab(idx, idea);
  }

  // ===== MINI-LAB POPUP (inline, like Listing Lab on web) =====

  const TONE_LIST = [
    { id: 'memorial', name: 'Memorial' },
    { id: 'sentimental', name: 'Tinh cam' },
    { id: 'funny', name: 'Funny' },
    { id: 'sarcastic', name: 'Sarcastic' },
    { id: 'inspirational', name: 'Cam hung' },
    { id: 'neutral', name: 'Trung tinh' },
  ];
  // Holiday: top 3 shown as chips, rest in dropdown "More..."
  const HOLIDAY_CHIPS = [
    { id: 'birthday', name: 'Birthday' },
    { id: 'mothers-day', name: "Mother's" },
    { id: 'fathers-day', name: "Father's" },
  ];
  const HOLIDAY_ALL = [
    { id: 'birthday', name: 'Birthday' },
    { id: 'mothers-day', name: "Mother's Day" },
    { id: 'fathers-day', name: "Father's Day" },
    { id: 'valentines', name: "Valentine's Day" },
    { id: 'christmas', name: 'Christmas' },
    { id: 'halloween', name: 'Halloween' },
    { id: 'graduation', name: 'Graduation' },
    { id: 'thanksgiving', name: 'Thanksgiving' },
    { id: 'easter', name: 'Easter' },
    { id: 'new-year', name: "New Year's" },
    { id: 'independence-day', name: 'Independence Day (4th July)' },
    { id: 'memorial-day', name: 'Memorial Day' },
    { id: 'veterans-day', name: "Veteran's Day" },
    { id: 'st-patricks', name: "St. Patrick's Day" },
    { id: 'back-to-school', name: 'Back to School' },
    { id: 'baby-shower', name: 'Baby Shower' },
    { id: 'wedding', name: 'Wedding / Anniversary' },
    { id: 'retirement', name: 'Retirement' },
    { id: 'housewarming', name: 'Housewarming' },
    { id: 'none', name: 'None (No Holiday)' },
  ];

  function showMiniLab(idx, idea) {
    const ideaItem = listingIdeas.querySelector(`.listing-idea-item[data-idx="${idx}"]`);
    if (!ideaItem) return;

    const platform = detectIdeaPlatform(idea);
    const productType = idea.variant || idea.product_name || '';
    const niche = idea.niche || '';

    // ═══ CHECK IF IDEA ALREADY HAS LAB TITLE & TAGS ═══
    const existingTitle = platform === 'amazon' ? idea.amazon_title : (platform === 'tiktok' ? (idea.tiktok_title || idea.etsy_title) : idea.etsy_title);
    const existingTagsStr = idea.lab_tags || '';
    let existingTags = [];
    if (existingTagsStr) {
      try { existingTags = typeof existingTagsStr === 'string' ? JSON.parse(existingTagsStr) : (Array.isArray(existingTagsStr) ? existingTagsStr : []); } catch { existingTags = existingTagsStr.split(',').map(t => t.trim()).filter(Boolean); }
    }
    const hasExistingData = !!(existingTitle && existingTags.length > 0);

    const lab = document.createElement('div');
    lab.className = 'mini-lab';
    lab.innerHTML = `
      <div class="mini-lab-header">
        <span class="mini-lab-title">⚡ ${hasExistingData ? 'Listing Lab' : 'Quick Generate'} (${platform.toUpperCase()})</span>
        <button class="mini-lab-close" data-action="close">✕</button>
      </div>
      <div class="mini-lab-generate-form" ${hasExistingData ? 'style="display:none;"' : ''}>
        <div class="mini-lab-row">
          <div class="mini-lab-field">
            <div class="mini-lab-label">Product Type</div>
            <input class="mini-lab-input" data-field="productType" value="${escHtml(productType)}" placeholder="e.g. Garden Flag">
          </div>
          <div class="mini-lab-field">
            <div class="mini-lab-label">Niche</div>
            <input class="mini-lab-input" data-field="niche" value="${escHtml(niche)}" placeholder="e.g. Patriotic Christian">
          </div>
        </div>
        <div class="mini-lab-label">Tone</div>
        <div class="mini-lab-chips" data-chip-group="tone">
          ${TONE_LIST.map(t => `<button class="mini-lab-chip${t.id === 'neutral' ? ' active' : ''}" data-chip-value="${t.id}">${t.name}</button>`).join('')}
        </div>
        <div class="mini-lab-label">Holiday</div>
        <div class="mini-lab-chips" data-chip-group="holiday" style="align-items:center;">
          ${HOLIDAY_CHIPS.map(h => `<button class="mini-lab-chip${h.id === 'birthday' ? ' active-green' : ''}" data-chip-value="${h.id}">${h.name}</button>`).join('')}
          <select class="mini-lab-holiday-select" data-chip-group-select="holiday" style="font-size:10px;padding:3px 6px;border:1px solid #E5E7EB;border-radius:6px;color:#555;cursor:pointer;background:#fff;">
            <option value="">More...</option>
            ${HOLIDAY_ALL.filter(h => !HOLIDAY_CHIPS.find(c => c.id === h.id)).map(h => `<option value="${h.id}">${h.name}</option>`).join('')}
          </select>
        </div>
        <div class="mini-lab-row">
          <div class="mini-lab-field">
            <div class="mini-lab-label">Quote</div>
            <input class="mini-lab-input" data-field="quote" value="" placeholder="e.g. BEST MOM EVER">
          </div>
          <div class="mini-lab-field">
            <div class="mini-lab-label">Features</div>
            <input class="mini-lab-input" data-field="features" value="" placeholder="e.g. yard sign, outdoor">
          </div>
        </div>
        <div class="mini-lab-row">
          <div class="mini-lab-field">
            <div class="mini-lab-label">Gift For</div>
            <input class="mini-lab-input" data-field="giftFor" value="" placeholder="e.g. Mom, Dad, Wife">
          </div>
          <div class="mini-lab-field">
            <div class="mini-lab-label">Gift From</div>
            <input class="mini-lab-input" data-field="giftFrom" value="" placeholder="e.g. Family, Friend">
          </div>
        </div>
        <button class="mini-lab-gen-btn" data-action="quick-generate">⚡ Quick Generate</button>
      </div>
      <div class="mini-lab-status" data-role="status"></div>
      <div class="mini-lab-result" data-role="result" style="display:none;"></div>
    `;

    // Show mini-lab as full overlay (replaces main content)
    let container = document.querySelector('.mini-lab-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'mini-lab-container';
      document.body.appendChild(container);
    }
    const ideaName = idea.product_name || idea.assignment_title || 'Idea';
    const thumb = idea.thumbnail || '';
    container.innerHTML = '';

    // Back bar with idea info
    const backBar = document.createElement('div');
    backBar.className = 'mini-lab-back-bar';
    const ideaLink = idea.link_spy || '';
    let linkHostname = '';
    try { if (ideaLink) linkHostname = new URL(ideaLink).hostname.replace('www.', ''); } catch(e) {}
    backBar.innerHTML = `
      <button class="mini-lab-back-btn">← Back</button>
      ${thumb ? `<img src="${thumb}" class="mini-lab-idea-thumb">` : ''}
      <div class="mini-lab-idea-info">
        <span class="mini-lab-idea-title">${escHtml(ideaName)}</span>
        <div style="display:flex;gap:6px;align-items:center;">
          ${ideaLink ? `<a href="${escHtml(ideaLink)}" target="_blank" class="mini-lab-idea-link">${escHtml(linkHostname)}</a>` : ''}
          <!-- [v1.2 REMOVED] mockup buttons removed -->
        </div>
      </div>
    `;
    backBar.querySelector('.mini-lab-back-btn').addEventListener('click', closeMiniLab);
    if (thumb) {
      backBar.querySelector('.mini-lab-idea-thumb')?.addEventListener('click', () => showThumbPreview(thumb));
    }

    // [v1.2] Keep currentIdeaId for auto-fill title/tags/SKU
    const currentIdeaId = idea.idea_id || idea.id;

    // [v1.2 REMOVED] Mockup auto-assign, get-mockups, show-mockup-panel all removed

    container.appendChild(backBar);

    // ═══ SHOP STATUS PANEL: per-shop breakdown (collapsed by default to save space) ═══
    // Filter assignments by user permission (myShopIds = null means admin, show all)
    const visibleAssignments = (idea._assignments || []).filter(a =>
      !myShopIds || myShopIds.has(a.shop_id)
    );
    const assignCount = visibleAssignments.length;
    if (assignCount > 0 && false) { // DISABLED: user requested removal to save space for analysis
      const shopPanel = document.createElement('div');
      shopPanel.className = 'shop-status-panel';

      const shopItems = visibleAssignments.map((a, aIdx) => {
        const sName = a._shop_name || `Shop ${a.shop_id}`;
        const hasTitle = !!a.title;
        const hasTag = !!a.tag;
        const hasLink = !!a.publish_link;
        const hasNote = !!a.seller_note;
        const hasParentAsin = !!a.parent_asin;
        const hasChildAsin = !!a.child_asin;
        const hasAny = hasTitle || hasTag || hasLink || hasNote || hasParentAsin || hasChildAsin;

        // Status icon: ✅ có link (done), 🟡 có title/tag (in progress), ⬜ chưa gì
        const statusIcon = hasLink ? '✅' : (hasTitle || hasTag ? '🟡' : '⬜');

        // Copy button helper
        const copyBtn = (field, label) => `<button class="shop-copy-btn" data-copy-idx="${aIdx}" data-copy-field="${field}" title="Copy ${label}">📋</button>`;

        // Content rows with copy buttons
        let contentHtml = '';
        if (hasTitle) {
          const titlePreview = a.title.length > 60 ? a.title.substring(0, 60) + '...' : a.title;
          contentHtml += `<div class="shop-detail-row"><span class="shop-detail-label">Title:</span> <span class="shop-detail-value">${escHtml(titlePreview)}</span>${copyBtn('title', 'Title')}</div>`;
        }
        if (hasTag) {
          const tagPreview = a.tag.length > 60 ? a.tag.substring(0, 60) + '...' : a.tag;
          contentHtml += `<div class="shop-detail-row"><span class="shop-detail-label">Tags:</span> <span class="shop-detail-value tag-value">${escHtml(tagPreview)}</span>${copyBtn('tag', 'Tags')}</div>`;
        }
        if (hasLink) {
          const shortLink = a.publish_link.length > 45 ? a.publish_link.substring(0, 45) + '...' : a.publish_link;
          contentHtml += `<div class="shop-detail-row"><span class="shop-detail-label">Link:</span> <a href="${escHtml(a.publish_link)}" target="_blank" class="shop-status-link">${escHtml(shortLink)}</a>${copyBtn('publish_link', 'Link')}</div>`;
        }
        if (hasParentAsin) {
          contentHtml += `<div class="shop-detail-row"><span class="shop-detail-label">P.ASIN:</span> <span class="shop-detail-value asin-value">${escHtml(a.parent_asin)}</span>${copyBtn('parent_asin', 'Parent ASIN')}</div>`;
        }
        if (hasChildAsin) {
          contentHtml += `<div class="shop-detail-row"><span class="shop-detail-label">C.ASIN:</span> <span class="shop-detail-value asin-value">${escHtml(a.child_asin)}</span>${copyBtn('child_asin', 'Child ASIN')}</div>`;
        }
        if (hasNote) {
          const notePreview = a.seller_note.length > 60 ? a.seller_note.substring(0, 60) + '...' : a.seller_note;
          contentHtml += `<div class="shop-detail-row"><span class="shop-detail-label">Note:</span> <span class="shop-detail-value note-value">${escHtml(notePreview)}</span>${copyBtn('seller_note', 'Note')}</div>`;
        }

        return `<div class="shop-status-item ${hasAny ? '' : 'shop-empty'}">
          <div class="shop-status-header">
            <span class="shop-status-icon">${statusIcon}</span>
            <span class="shop-status-name" title="${escHtml(sName)}">${escHtml(sName)}</span>
            ${!hasAny ? '<span class="shop-status-empty">Chưa có data</span>' : ''}
          </div>
          ${contentHtml ? `<div class="shop-detail-content">${contentHtml}</div>` : ''}
        </div>`;
      }).join('');

      // Lab data summary (shared across all shops)
      const hasLabTitle = !!(idea.etsy_title || idea.amazon_title);
      const hasLabTags = !!idea.lab_tags;
      const labBadges = [];
      if (hasLabTitle) labBadges.push('<span class="idea-badge badge-title">Lab Title</span>');
      if (hasLabTags) labBadges.push('<span class="idea-badge badge-tags">Lab Tags</span>');
      const doneCount = visibleAssignments.filter(a => !!a.publish_link).length;
      const hasDataCount = visibleAssignments.filter(a => a.title || a.tag || a.publish_link).length;

      shopPanel.innerHTML = `
        <div class="shop-status-toggle" data-action="toggle-shops">
          <span>📋 ${visibleAssignments.length} shops · ${doneCount} done · ${hasDataCount} có data ${labBadges.join(' ')}</span>
          <span class="shop-status-arrow open">▶</span>
        </div>
        <div class="shop-status-list open">${shopItems}</div>
      `;

      // Toggle open/close
      shopPanel.querySelector('[data-action="toggle-shops"]').addEventListener('click', () => {
        const list = shopPanel.querySelector('.shop-status-list');
        const arrow = shopPanel.querySelector('.shop-status-arrow');
        list.classList.toggle('open');
        arrow.classList.toggle('open');
      });

      // Copy buttons handler
      shopPanel.querySelectorAll('.shop-copy-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const aIdx = parseInt(btn.dataset.copyIdx);
          const field = btn.dataset.copyField;
          const assignment = idea._assignments[aIdx];
          if (!assignment) return;
          const text = assignment[field] || '';
          navigator.clipboard.writeText(text).then(() => {
            btn.textContent = '✅';
            btn.classList.add('copied');
            setTimeout(() => { btn.textContent = '📋'; btn.classList.remove('copied'); }, 1200);
          }).catch(() => {
            // Fallback for clipboard API failure
            const ta = document.createElement('textarea');
            ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
            document.body.appendChild(ta); ta.select(); document.execCommand('copy');
            document.body.removeChild(ta);
            btn.textContent = '✅';
            btn.classList.add('copied');
            setTimeout(() => { btn.textContent = '📋'; btn.classList.remove('copied'); }, 1200);
          });
        });
      });

      container.appendChild(shopPanel);
    }

    container.appendChild(lab);
    container.classList.add('active');
    document.body.classList.add('mini-lab-open');
    activeMiniLab = lab;

    // Save state ngay sau khi mở mini-lab (đảm bảo persist trước khi popup bị destroy)
    savePopupState();

    // Chip toggle logic
    lab.querySelectorAll('.mini-lab-chips').forEach(group => {
      const chipGroup = group.dataset.chipGroup;
      group.querySelectorAll('.mini-lab-chip').forEach(chip => {
        chip.addEventListener('click', () => {
          group.querySelectorAll('.mini-lab-chip').forEach(c => c.classList.remove('active', 'active-green'));
          chip.classList.add(chipGroup === 'holiday' ? 'active-green' : 'active');
          // Reset dropdown if a chip is clicked
          const dropdown = group.querySelector('.mini-lab-holiday-select');
          if (dropdown) dropdown.value = '';
        });
      });
    });

    // Holiday dropdown — selecting from dropdown acts like clicking a chip
    const holidaySelect = lab.querySelector('.mini-lab-holiday-select');
    if (holidaySelect) {
      holidaySelect.addEventListener('change', () => {
        const val = holidaySelect.value;
        if (!val) return;
        const holidayGroup = lab.querySelector('[data-chip-group="holiday"]');
        // Deactivate all chips
        holidayGroup.querySelectorAll('.mini-lab-chip').forEach(c => c.classList.remove('active', 'active-green'));
        // Check if the selected value matches an existing chip
        const matchChip = holidayGroup.querySelector(`.mini-lab-chip[data-chip-value="${val}"]`);
        if (matchChip) {
          matchChip.classList.add('active-green');
          holidaySelect.value = ''; // Reset dropdown
        } else {
          // Create a temp chip for the dropdown selection (or just store value)
          // Store selected holiday as a data attribute on the group
          holidayGroup.dataset.selectedHoliday = val;
          // Show selected holiday name on dropdown
          const selectedOption = holidaySelect.options[holidaySelect.selectedIndex];
          holidaySelect.style.background = '#E8F5E9';
          holidaySelect.style.fontWeight = '700';
          holidaySelect.style.color = '#2E7D32';
        }
      });
    }

    // Close button
    lab.querySelector('[data-action="close"]').addEventListener('click', closeMiniLab);

    // Quick Generate button — runs analyze + generate in one flow
    lab.querySelector('[data-action="quick-generate"]').addEventListener('click', () => {
      miniLabGenerate(lab, idea, platform);
    });

    // ═══ IF EXISTING LAB DATA: Show title/tags directly ═══
    if (hasExistingData) {
      showExistingLabResult(lab, idea, platform, existingTitle, existingTags);
    } else if (generatedData?.title) {
      // v9.2: Restored from popup state — show previously generated data
      showExistingLabResult(lab, idea, platform, generatedData.title, generatedData.tags || []);
    } else {
      // No existing data — show generate form, auto-analyze
      miniLabAutoAnalyze(lab, idea);
    }
  }

  // Show existing lab title/tags directly (no generation needed)
  function showExistingLabResult(lab, idea, platform, title, tags) {
    const resultEl = lab.querySelector('[data-role="result"]');
    const statusEl = lab.querySelector('[data-role="status"]');
    statusEl.style.display = 'none';
    resultEl.style.display = 'block';

    const p = platform === 'tiktok' ? 'etsy' : platform;
    const isAmazon = p === 'amazon';
    const maxLen = isAmazon ? 200 : 140;
    // Amazon: strip dashes + trim incomplete words from existing data
    if (isAmazon) title = stripAmazonDashes(title);
    title = trimIncompleteEnding(title, maxLen);
    const titleLen = title.length;
    const lenColor = titleLen >= maxLen - 10 ? '#2E7D32' : titleLen >= maxLen - 30 ? '#E65100' : '#C62828';

    // Amazon: tags as semicolon-separated string (max 255 chars)
    // Etsy: numbered tag pills
    let tagsHtml, tagsCountLabel;
    if (isAmazon) {
      const tagsStr = tags.join('; ');
      const tagsCharLen = tagsStr.length;
      const tagsLenColor = tagsCharLen <= 255 ? '#2E7D32' : '#C62828';
      tagsHtml = `<span style="font-size:9px;color:#333;line-height:1.5;">${escHtml(tagsStr)}</span>`;
      tagsCountLabel = `<span style="color:${tagsLenColor};font-weight:700;" data-role="tags-count">${tagsCharLen}/255c</span>`;
    } else {
      tagsHtml = tags.map((t, i) => `<span style="display:inline-block;background:#F3E8FF;padding:1px 5px;border-radius:3px;margin:1px 2px;font-size:9px;">${i + 1}. ${escHtml(t)}</span>`).join('');
      tagsCountLabel = `<span data-role="tags-count">${tags.length}/13</span>`;
    }

    resultEl.innerHTML = `
      <div class="mini-lab-label" style="color:#4A7C59;font-weight:600;">✅ FROM IDEA POOL</div>
      <div class="mini-lab-label">${isAmazon ? 'AMAZON' : 'ETSY'} TITLE <span style="color:${lenColor};font-weight:700;" data-role="title-len">${titleLen}/${maxLen}c</span></div>
      <div class="mini-lab-result-title" data-role="editable-title" title="Double-click to edit">${isAmazon ? buildAmazonSlotHtml(title) : buildEtsySlotHtml(title)}</div>
      <div class="mini-lab-label" style="margin-top:6px;">${isAmazon ? 'SEARCH TERMS' : 'ETSY TAGS'} (${tagsCountLabel})</div>
      <div class="mini-lab-result-tags" data-role="editable-tags" data-platform="${p}" title="Double-click to edit">${tagsHtml}</div>
      ${idea.sku ? `<div class="mini-lab-label" style="margin-top:6px;">SKU</div><div style="background:#FFF3E0;padding:4px 8px;border-radius:4px;font-size:11px;font-weight:600;color:#E65100;display:inline-block;margin-bottom:4px;" data-role="sku-display">${escHtml(idea.sku)}</div>` : ''}
      <div class="mini-lab-edit-hint">Double-click title or tags to edit</div>
      <div class="mini-lab-actions">
        <button class="mini-lab-action-btn mini-lab-copy-btn" data-action="copy-title">Copy Title</button>
        <button class="mini-lab-action-btn mini-lab-copy-btn" data-action="copy-tags">Copy ${isAmazon ? 'Search Terms' : 'Tags'}</button>
        ${idea.sku ? `<button class="mini-lab-action-btn mini-lab-copy-btn" data-action="copy-sku">Copy SKU</button>` : ''}
        <button class="mini-lab-action-btn mini-lab-fill-btn" data-action="fill-preview">Auto-Fill ↓</button>
      </div>
      <button class="mini-lab-gen-btn" data-action="show-generate" style="margin-top:6px;background:#666;font-size:9px;padding:4px 8px;">🔄 Re-generate new title</button>
    `;

    // Store data (mutable)
    generatedData = { title, tags: [...tags], description: '' };

    // Wire up editable title/tags (same logic as miniLabGenerate)
    wireEditableResult(resultEl, lab, idea, platform, title, tags, maxLen);

    // "Re-generate" button: show the generate form
    resultEl.querySelector('[data-action="show-generate"]')?.addEventListener('click', () => {
      const form = lab.querySelector('.mini-lab-generate-form');
      if (form) {
        form.style.display = '';
        resultEl.style.display = 'none';
      }
      miniLabAutoAnalyze(lab, idea);
    });
  }

  // Auto-analyze: call pod-lab-extract to fill form fields
  async function miniLabAutoAnalyze(lab, idea) {
    const statusEl = lab.querySelector('[data-role="status"]');
    statusEl.textContent = 'Analyzing...';
    statusEl.style.display = 'block';

    // Disable Quick Generate button while analyzing
    const genBtn = lab.querySelector('[data-action="quick-generate"]');
    if (genBtn) {
      genBtn.disabled = true;
      genBtn._origText = genBtn.textContent;
      genBtn.textContent = '⏳ Đang phân tích...';
    }

    try {
      const ideaTitle = idea.product_name || idea.assignment_title || '';
      const analyzeResult = await sendMessageAsync({
        type: 'ANALYZE_PRODUCT',
        payload: {
          title: ideaTitle,
          variant: idea.variant || '',
          tags: idea.lab_tags || idea.assignment_tag || '',
          imageUrl: idea.thumbnail || '',
        }
      });

      if (analyzeResult?.ok && analyzeResult.data) {
        const d = analyzeResult.data;
        // Fill fields with analyzed data
        if (d.productType) setLabInput(lab, 'productType', d.productType);
        if (d.niche) setLabInput(lab, 'niche', d.niche);
        if (d.quote) setLabInput(lab, 'quote', toTitleCase(d.quote));
        if (d.keyFeatures) setLabInput(lab, 'features', d.keyFeatures);

        // ═══ Gift For / Gift From — ALWAYS auto-detect from title/quote keywords ═══
        // API can return generic "Family" — override with specific matches from text
        const apiGiftFor = d.giftFor || [];
        const apiGiftFrom = d.giftFrom || [];
        // Search in title + quote + niche (NOT variant — variant like "Family Coffee Mug" causes false match)
        const ideaText = (ideaTitle + ' ' + (d.quote || '') + ' ' + (d.niche || '')).toLowerCase();

        // Detect specific recipients from keywords (ordered by specificity, most specific first)
        const forPatterns = [
          { re: /\b(grandma|grandmother|nana|nanny|granny)\b/i, val: 'Grandma' },
          { re: /\b(grandpa|grandfather|poppy|gramps)\b/i, val: 'Grandpa' },
          { re: /\b(mom|mommy|mama)\b/i, val: 'Mom' },
          { re: /\b(dad|daddy|papa)\b/i, val: 'Dad' },
          { re: /\b(mother)\b/i, val: 'Mom' },
          { re: /\b(father)\b/i, val: 'Dad' },
          { re: /\b(wife|wifey)\b/i, val: 'Wife' },
          { re: /\b(husband|hubby)\b/i, val: 'Husband' },
          { re: /\b(son)\b/i, val: 'Son' },
          { re: /\b(daughter)\b/i, val: 'Daughter' },
          { re: /\b(sister|sis)\b/i, val: 'Sister' },
          { re: /\b(brother|bro)\b/i, val: 'Brother' },
          { re: /\b(friend|bestie|bff|friendship)\b/i, val: 'Friend' },
          { re: /\b(teacher)\b/i, val: 'Teacher' },
          { re: /\b(nurse|nursing)\b/i, val: 'Nurse' },
          { re: /\b(veteran|military|army|navy|marine|soldier)\b/i, val: 'Veteran' },
          { re: /\b(couple|lover|soulmate|soul mate)\b/i, val: 'Couple' },
          { re: /\b(dog|cat|pet|puppy|kitten|fur baby|paw)\b/i, val: 'Pet Owner' },
          { re: /\b(kid|child|children|baby|toddler)\b/i, val: 'Kids' },
          { re: /\b(boss|manager|coworker|colleague)\b/i, val: 'Coworker' },
          { re: /\b(hairstylist|hairapist|barber|hair)\b/i, val: 'Hairstylist' },
        ];

        let giftFor = [];
        forPatterns.forEach(p => { if (p.re.test(ideaText) && !giftFor.includes(p.val)) giftFor.push(p.val); });

        // If no specific keyword found, use API result; if API also generic, use niche-based fallback
        if (!giftFor.length) {
          // Use API result if it's specific (not just "Family")
          const specificApi = apiGiftFor.filter(g => g !== 'Family');
          if (specificApi.length) {
            giftFor = specificApi;
          } else {
            giftFor = apiGiftFor.length ? apiGiftFor : ['Family'];
          }
        }

        // Infer Gift From based on Gift For
        const fromMap = {
          'Mom': 'Son, Daughter', 'Dad': 'Son, Daughter', 'Grandma': 'Grandkids',
          'Grandpa': 'Grandkids', 'Wife': 'Husband', 'Husband': 'Wife',
          'Son': 'Mom, Dad', 'Daughter': 'Mom, Dad', 'Sister': 'Sister, Brother',
          'Brother': 'Sister, Brother', 'Friend': 'Friend', 'Teacher': 'Student',
          'Nurse': 'Patient, Family', 'Veteran': 'Family', 'Couple': 'Partner',
          'Pet Owner': 'Pet Lover', 'Kids': 'Parents', 'Coworker': 'Coworker',
          'Hairstylist': 'Client, Friend',
        };
        let giftFrom = [];
        // Use API giftFrom if specific, otherwise infer
        const specificApiFrom = (apiGiftFrom || []).filter(g => g !== 'Family');
        if (specificApiFrom.length) {
          giftFrom = specificApiFrom;
        } else {
          giftFor.forEach(gf => {
            const from = fromMap[gf];
            if (from) from.split(', ').forEach(f => { if (!giftFrom.includes(f)) giftFrom.push(f); });
          });
          if (!giftFrom.length) giftFrom = ['Family'];
        }

        setLabInput(lab, 'giftFor', giftFor.join(', '));
        setLabInput(lab, 'giftFrom', giftFrom.join(', '));

        // Auto-select tone
        if (d.sentiment) {
          const toneGroup = lab.querySelector('[data-chip-group="tone"]');
          toneGroup.querySelectorAll('.mini-lab-chip').forEach(c => {
            c.classList.remove('active');
            if (c.dataset.chipValue === d.sentiment) c.classList.add('active');
          });
        }

        // Auto-detect holiday from giftFor/giftFrom/niche/quote/ideaTitle
        const allText = [
          ...(giftFor || []), ...(giftFrom || []),
          d.niche || '', d.quote || '', ideaTitle,
        ].join(' ').toLowerCase();
        let detectedHoliday = '';
        if (/\b(dad|daddy|father|papa|grandpa|grandfather)\b/i.test(allText)) detectedHoliday = 'fathers-day';
        else if (/\b(mom|mommy|mother|mama|grandma|grandmother)\b/i.test(allText)) detectedHoliday = 'mothers-day';
        else if (/\bvalentine/i.test(allText)) detectedHoliday = 'valentines';
        else if (/\bchristmas|xmas|noel/i.test(allText)) detectedHoliday = 'christmas';
        else if (/\bhalloween/i.test(allText)) detectedHoliday = 'halloween';
        else if (/\bgraduat/i.test(allText)) detectedHoliday = 'graduation';
        else if (/\bthanksgiving/i.test(allText)) detectedHoliday = 'thanksgiving';
        else if (/\beaster/i.test(allText)) detectedHoliday = 'easter';
        else if (/\b(4th.*july|independence|july.*4)/i.test(allText)) detectedHoliday = 'independence-day';
        else if (/\b(veteran|military|army|navy|marine)/i.test(allText)) detectedHoliday = 'veterans-day';
        else if (/\bst.*patrick/i.test(allText)) detectedHoliday = 'st-patricks';
        else if (/\b(wedding|anniversary|bride|groom)\b/i.test(allText)) detectedHoliday = 'wedding';
        else if (/\b(retire|retirement)\b/i.test(allText)) detectedHoliday = 'retirement';
        else if (/\b(baby.*shower|newborn|expecting)\b/i.test(allText)) detectedHoliday = 'baby-shower';
        else if (/\bbirthday/i.test(allText)) detectedHoliday = 'birthday';

        if (detectedHoliday) {
          const holidayGroup = lab.querySelector('[data-chip-group="holiday"]');
          // Deactivate all chips
          holidayGroup.querySelectorAll('.mini-lab-chip').forEach(c => c.classList.remove('active-green'));
          // Try to activate matching chip
          const matchChip = holidayGroup.querySelector(`.mini-lab-chip[data-chip-value="${detectedHoliday}"]`);
          if (matchChip) {
            matchChip.classList.add('active-green');
          } else {
            // Holiday is in dropdown — select it
            const holidayDropdown = lab.querySelector('.mini-lab-holiday-select');
            if (holidayDropdown) {
              holidayDropdown.value = detectedHoliday;
              holidayDropdown.style.background = '#E8F5E9';
              holidayDropdown.style.fontWeight = '700';
              holidayDropdown.style.color = '#2E7D32';
              holidayGroup.dataset.selectedHoliday = detectedHoliday;
            }
          }
        }

        statusEl.textContent = 'Auto-detected! Adjust & click Generate.';
        setTimeout(() => { statusEl.style.display = 'none'; }, 2000);
      } else {
        statusEl.textContent = 'Ready. Fill fields & Generate.';
        setTimeout(() => { statusEl.style.display = 'none'; }, 1500);
      }
    } catch (e) {
      statusEl.textContent = 'Ready. Fill fields & Generate.';
      setTimeout(() => { statusEl.style.display = 'none'; }, 1500);
    } finally {
      // Re-enable Quick Generate button after analysis completes
      if (genBtn) {
        genBtn.disabled = false;
        genBtn.textContent = '⚡ Quick Generate';
      }
    }
  }

  function setLabInput(lab, field, value) {
    const input = lab.querySelector(`[data-field="${field}"]`);
    if (input) input.value = value;
  }
  function getLabInput(lab, field) {
    return (lab.querySelector(`[data-field="${field}"]`)?.value || '').trim();
  }
  function getActiveChip(lab, group) {
    // First check active chip button
    const active = lab.querySelector(`[data-chip-group="${group}"] .mini-lab-chip.active, [data-chip-group="${group}"] .mini-lab-chip.active-green`);
    if (active?.dataset?.chipValue) return active.dataset.chipValue;
    // Then check dropdown (for holiday "More..." select)
    if (group === 'holiday') {
      const chipGroup = lab.querySelector(`[data-chip-group="holiday"]`);
      const dropdownVal = chipGroup?.dataset?.selectedHoliday;
      if (dropdownVal) return dropdownVal;
      const select = lab.querySelector('.mini-lab-holiday-select');
      if (select?.value) return select.value;
    }
    return '';
  }

  // ═══ UPDATE ASSIGNMENT: Save fields to idea_shop_assignments table ═══
  // Returns { ok: true/false, error: string } for detailed feedback
  window._lastPatchResult = null; // Global for debugging
  window._patchFailCount = 0; // Track consecutive failures
  // v9.6: Track assignments with pending (unsaved) local changes
  // Key = assignment ID, Value = { fields object with local values }
  window._pendingLocalChanges = window._pendingLocalChanges || new Map();

  // v9.6: Show visible error toast in extension popup (not just console)
  function showPatchErrorToast(msg, assignmentId) {
    window._patchFailCount++;
    // Create or reuse toast element
    let toast = document.getElementById('matrixty-patch-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'matrixty-patch-toast';
      toast.style.cssText = 'position:fixed;bottom:8px;left:8px;right:8px;z-index:99999;padding:8px 10px;border-radius:6px;font-size:11px;line-height:1.4;color:#fff;background:#DC2626;box-shadow:0 2px 8px rgba(0,0,0,.3);cursor:pointer;max-height:80px;overflow:auto;';
      toast.addEventListener('click', () => { toast.style.display = 'none'; });
      document.body.appendChild(toast);
    }
    const hint = msg.includes('0 rows')
      ? '⚠️ RLS policy issue — cần thêm UPDATE policy cho anon trong Supabase'
      : msg.includes('403')
        ? '⚠️ Forbidden — anon role không có quyền UPDATE'
        : '';
    toast.innerHTML = `❌ PATCH failed (ID: ${String(assignmentId).substring(0, 8)}…): ${msg}${hint ? '<br>' + hint : ''}<br><span style="opacity:.7">Fails: ${window._patchFailCount} — Click to dismiss</span>`;
    toast.style.display = 'block';
    // Auto-hide after 10s
    clearTimeout(toast._hideTimer);
    toast._hideTimer = setTimeout(() => { toast.style.display = 'none'; }, 10000);
  }

  async function updateAssignment(assignmentId, fields) {
    if (!assignmentId) {
      const msg = 'No assignmentId provided';
      console.warn('[Matrixty] updateAssignment:', msg);
      window._lastPatchResult = { ok: false, error: msg, assignmentId };
      return false;
    }
    try {
      const body = { ...fields, updated_at: new Date().toISOString() };
      const bodyStr = JSON.stringify(body);
      const url = `${SUPABASE_URL}/rest/v1/idea_shop_assignments?id=eq.${assignmentId}`;
      console.log(`[Matrixty PATCH] ID=${assignmentId} body=${bodyStr.substring(0, 200)}`);
      console.log(`[Matrixty PATCH] URL=${url}`);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { ...HDR, 'Prefer': 'return=representation' },
        body: bodyStr,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const resText = await res.text().catch(() => '');
      if (!res.ok) {
        const msg = `HTTP ${res.status}: ${resText.substring(0, 150)}`;
        console.error(`[Matrixty PATCH] ❌ FAILED:`, msg);
        window._lastPatchResult = { ok: false, error: msg, assignmentId, status: res.status };
        // v9.6: Track pending local changes so background refresh doesn't overwrite them
        window._pendingLocalChanges.set(String(assignmentId), { ...fields, _failedAt: Date.now() });
        showPatchErrorToast(msg, assignmentId);
        return false;
      }
      // Check if any rows were actually updated
      try {
        const updated = JSON.parse(resText);
        if (Array.isArray(updated) && updated.length === 0) {
          const msg = `0 rows matched — RLS policy may block UPDATE for anon role (ID: ${assignmentId})`;
          console.warn(`[Matrixty PATCH] ❌`, msg);
          console.warn(`[Matrixty PATCH] 💡 FIX: Run this SQL in Supabase SQL Editor:\n  CREATE POLICY "anon_update_assignments" ON idea_shop_assignments FOR UPDATE TO anon USING (true) WITH CHECK (true);`);
          window._lastPatchResult = { ok: false, error: msg, assignmentId, status: 200, likelyRLS: true };
          // v9.6: Track pending local changes
          window._pendingLocalChanges.set(String(assignmentId), { ...fields, _failedAt: Date.now() });
          showPatchErrorToast(msg, assignmentId);
          return false;
        }
        console.log(`[Matrixty PATCH] ✅ OK — ${Array.isArray(updated) ? updated.length : '?'} row(s) updated`);
        window._lastPatchResult = { ok: true, assignmentId, rows: updated.length };
        window._patchFailCount = 0; // Reset on success
        // v9.6: Clear pending local changes on success
        window._pendingLocalChanges.delete(String(assignmentId));
      } catch(e) {
        console.log(`[Matrixty PATCH] Response:`, resText.substring(0, 100));
        window._lastPatchResult = { ok: true, assignmentId, raw: resText.substring(0, 100) };
        window._patchFailCount = 0;
        window._pendingLocalChanges.delete(String(assignmentId));
      }
      return true;
    } catch(e) {
      const msg = e.name === 'AbortError' ? 'Timeout (10s)' : e.message;
      console.error('[Matrixty PATCH] ❌ Exception:', msg);
      window._lastPatchResult = { ok: false, error: msg, assignmentId, exception: true };
      showPatchErrorToast(msg, assignmentId);
      return false;
    }
  }

  // ═══ v7.0.4: REFRESH IDEA CARD + DETAIL PANEL IN EXTENSION UI AFTER SYNC ═══
  function refreshIdeaCardAfterSync(idea, fillPlatform, extractedAsin, extractedLink) {
    try {
      const ideaId = idea.idea_id || idea.id;
      const newTitle = idea.assignment_title || '';
      const newTag = idea.assignment_tag || '';
      const newAsin = extractedAsin || idea.child_asin || '';
      const newListedBy = idea.listed_by || '';

      // ═══ 1. Update idea card (summary row) ═══
      const cards = document.querySelectorAll('.listing-idea-item');
      for (const card of cards) {
        const idx = parseInt(card.dataset.idx);
        const matchIdea = allIdeas[idx];
        if (matchIdea && (matchIdea.idea_id === ideaId)) {
          // Update summary chips
          const titleEl = card.querySelector('.idea-assignment-title, .idea-title-text');
          if (titleEl && newTitle) {
            titleEl.textContent = newTitle.length > 40 ? newTitle.substring(0, 40) + '...' : newTitle;
            titleEl.style.color = '#2E7D32';
          }
          if (newAsin) {
            const asinEl = card.querySelector('.idea-child-asin, .variant-child-asin');
            if (asinEl) { asinEl.textContent = newAsin; asinEl.style.color = '#E65100'; }
          }
          const listedByEl = card.querySelector('.idea-listed-by');
          if (listedByEl && newListedBy) { listedByEl.textContent = newListedBy; listedByEl.style.color = '#4A7C59'; }

          // ═══ 2. Update Chi tiết (detail panel) input fields ═══
          const detailGrid = card.querySelector('.etsy-detail-grid');
          if (detailGrid) {
            const titleInput = detailGrid.querySelector('.amz-title-input');
            if (titleInput && newTitle) { titleInput.value = newTitle; titleInput.dataset.prevValue = newTitle; }
            const tagInput = detailGrid.querySelector('.amz-tag-input');
            if (tagInput && newTag) { tagInput.value = newTag; tagInput.dataset.prevValue = newTag; }
            const asinInput = detailGrid.querySelector('.amz-child-asin-input');
            if (asinInput && newAsin) { asinInput.value = newAsin; asinInput.dataset.prevValue = newAsin; }
            // Update listed-by text (not input, it's a span)
            const listedBySpan = detailGrid.querySelector('.etsy-detail-value');
            // Don't update - it could be any detail value, too risky
          }

          // ═══ 3. Update summary chips (outside detail panel) ═══
          const chips = card.querySelectorAll('.etsy-summary-chips span, .variant-status-badges span');
          chips.forEach(chip => {
            if (chip.textContent.includes('No title') && newTitle) {
              chip.textContent = newTitle.substring(0, 15) + '..';
              chip.style.background = '#E8F5E9'; chip.style.color = '#2E7D32';
            }
          });

          // Flash effect
          card.style.transition = 'background 0.3s';
          card.style.background = 'rgba(74, 124, 89, 0.08)';
          setTimeout(() => { card.style.background = ''; }, 2000);
          break;
        }
      }

      // Also update the Mini Lab panel if showing
      const activeLab = document.querySelector('.mini-lab-container');
      if (activeLab) {
        const existingBadge = activeLab.querySelector('.sync-confirm-badge');
        if (existingBadge) existingBadge.remove();

        const badge = document.createElement('div');
        badge.className = 'sync-confirm-badge';
        badge.style.cssText = 'background:#E8F5E9;border:1px solid #A5D6A7;border-radius:8px;padding:6px 10px;margin-top:6px;font-size:10px;color:#2E7D32;';
        let badgeHtml = '<b>Synced to Idea Pool:</b> ';
        const parts = [];
        if (idea.assignment_title) parts.push('Title');
        if (idea.assignment_tag) parts.push('Tags');
        if (extractedAsin) parts.push('ASIN: <span style="color:#E65100;font-weight:700">' + extractedAsin + '</span>');
        if (extractedLink) parts.push('Link');
        if (idea.listed_by) parts.push('Listed by: ' + idea.listed_by);
        badgeHtml += parts.join(' · ');
        badge.innerHTML = badgeHtml;

        const actionsEl = activeLab.querySelector('.mini-lab-actions');
        if (actionsEl) actionsEl.after(badge);
        else activeLab.appendChild(badge);
        setTimeout(() => badge.remove(), 10000);
      }
    } catch (err) {
      console.error('[Matrixty v7.0.0] refreshIdeaCardAfterSync error:', err);
    }
  }

  // ═══ SYNC LAB DATA: Save title/tags back to listing_lab_data in Supabase ═══
  async function syncLabData(idea, platform, title, tags) {
    const ideaId = idea.idea_id || idea.id;
    if (!ideaId) { console.warn('[Matrixty v7.0.0] syncLabData: no idea_id'); return; }

    const p = platform === 'tiktok' ? 'etsy' : platform;
    const titleField = p === 'amazon' ? 'amazon_title' : (p === 'tiktok' ? 'tiktok_title' : 'etsy_title');
    const tagsArr = Array.isArray(tags) ? tags : tags.split(',').map(t => t.trim()).filter(Boolean);

    try {
      // Check if record exists
      const checkRes = await fetch(`${SUPABASE_URL}/rest/v1/listing_lab_data?idea_id=eq.${ideaId}&select=id`, { headers: HDR });
      const existing = await checkRes.json();

      if (existing && existing.length > 0) {
        // UPDATE existing record
        const updateFields = { [titleField]: title, tags: tagsArr, updated_at: new Date().toISOString() };
        await fetch(`${SUPABASE_URL}/rest/v1/listing_lab_data?id=eq.${existing[0].id}`, {
          method: 'PATCH', headers: { ...HDR, 'Prefer': 'return=minimal' },
          body: JSON.stringify(updateFields),
        });
      } else {
        // INSERT new record
        const insertFields = { idea_id: ideaId, [titleField]: title, tags: tagsArr, status: 'draft' };
        await fetch(`${SUPABASE_URL}/rest/v1/listing_lab_data`, {
          method: 'POST', headers: { ...HDR, 'Prefer': 'return=minimal' },
          body: JSON.stringify(insertFields),
        });
      }

      // Update local idea cache so next open shows the saved data
      const localIdea = allIdeas.find(i => (i.idea_id || i.id) === ideaId);
      if (localIdea) {
        if (p === 'amazon') localIdea.amazon_title = title;
        else if (p === 'tiktok') localIdea.tiktok_title = title;
        else localIdea.etsy_title = title;
        localIdea.lab_tags = tagsArr;
      }

      console.log(`[Matrixty v7.0.0] syncLabData: saved ${titleField} + ${tagsArr.length} tags for idea ${ideaId}`);
    } catch (err) {
      console.error('[Matrixty v7.0.0] syncLabData error:', err);
    }
  }

  // ═══ UPDATE IDEAS CACHE — lưu allIdeas hiện tại vào chrome.storage.local ═══
  function updateIdeasCache() {
    try {
      // Lean _assignments to reduce cache size (keep only essential fields)
      const leanIdeas = allIdeas.map(i => {
        const { _assignments, ...rest } = i;
        if (_assignments?.length > 0) {
          rest._assignments = _assignments.map(a => ({
            id: a.id || '', _shop_name: a._shop_name || '', shop_id: a.shop_id,
            publish_link: a.publish_link || '', created_at: a.created_at || '',
            seller_note: a.seller_note || '', title: a.title || '', tag: a.tag || '',
            parent_asin: a.parent_asin || '', child_asin: a.child_asin || '',
            asin: a.asin || '', custom_style: a.custom_style || '',
            listed_by: a.listed_by || '', listed_at: a.listed_at || '',
            need_fix: a.need_fix || false, need_fix_at: a.need_fix_at || '',
            fixed_at: a.fixed_at || '', scheduled_date: a.scheduled_date || '',
            custom_status: a.custom_status || '', published_date: a.published_date || '',
            published_by: a.published_by || '', assigned_by: a.assigned_by || '',
          }));
        }
        return rest;
      });

      const cacheData = {
        version: CACHE_VERSION,
        timestamp: Date.now(),
        userId: currentUser?.id, // Track which user this cache belongs to
        // v1.3.2: include main_seller_id (highest-priority signal for shop→team mapping)
        allShops: allShops.map(s => ({ id: s.id, name: s.name, platform: s.platform, active: s.active, assigned_member_ids: s.assigned_member_ids, department_id: s.department_id, main_seller_id: s.main_seller_id })),
        // v1.3.2: include department_id, sub_role, department so _getTeamFromMember works after cache restore
        allMembers: (allMembers || []).map(m => ({ id: m.id, name: m.name, email: m.email, role: m.role, department_id: m.department_id, sub_role: m.sub_role, department: m.department })),
        allTeams: allTeams || [],
        allIdeas: leanIdeas,
      };

      const cacheStr = JSON.stringify(cacheData);
      const sizeMB = (cacheStr.length / (1024 * 1024)).toFixed(2);

      if (cacheStr.length > 9 * 1024 * 1024) {
        console.warn(`[Matrixty] Cache too large (${sizeMB}MB), trimming...`);
        cacheData.allIdeas = leanIdeas.slice(0, Math.floor(leanIdeas.length * 0.6));
      }

      chrome.storage.local.set({ [CACHE_KEY]: cacheData }, () => {
        if (chrome.runtime.lastError) {
          console.error('[Matrixty] ❌ Cache update FAILED:', chrome.runtime.lastError.message);
        } else {
          console.log(`[Matrixty] ✅ Cache updated (${sizeMB}MB, ${leanIdeas.length} ideas)`);
        }
      });
    } catch (e) { console.warn('[Matrixty] Cache update error:', e); }
  }

  // ═══ v7.0.4: POLLING SYNC — Bi-directional sync from Idea Pool ═══
  // Poll Supabase mỗi 10s để lấy thay đổi mới từ Idea Pool (leader/admin edit)
  // Đơn giản & ổn định hơn WebSocket cho Chrome extension popup

  let _pollTimer = null;
  let _lastPollTs = null; // ISO timestamp of last successful poll

  function startRealtimeSubscription() {
    stopRealtimeSubscription(); // Clear any existing timer

    // First poll: get server time as baseline (avoids client/server clock skew)
    (async () => {
      try {
        // Query server time via Supabase RPC or simple query
        const res = await fetch(`${SUPABASE_URL}/rest/v1/idea_shop_assignments?select=updated_at&order=updated_at.desc&limit=1`, { headers: HDR });
        if (res.ok) {
          const rows = await res.json();
          _lastPollTs = rows.length > 0 ? rows[0].updated_at : new Date().toISOString();
          console.log('[Matrixty Sync] ✅ Baseline from server:', _lastPollTs);
        } else {
          _lastPollTs = new Date().toISOString();
          console.log('[Matrixty Sync] ⚠️ Server time unavailable, using client time');
        }
      } catch (e) {
        _lastPollTs = new Date().toISOString();
        console.warn('[Matrixty Sync] ⚠️ Baseline fetch error:', e);
      }
    })();

    // Ensure _lastPollTs has a fallback (async IIFE above may not resolve yet)
    if (!_lastPollTs) _lastPollTs = new Date().toISOString();
    console.log('[Matrixty Sync] ✅ Polling started (every 10s)');

    _pollTimer = setInterval(async () => {
      try {
        await pollAssignmentChanges();
      } catch (err) {
        console.warn('[Matrixty Sync] Poll error:', err);
      }
    }, 10000); // Poll every 10 seconds
  }

  async function pollAssignmentChanges() {
    if (!_lastPollTs || !allIdeas.length) {
      console.log('[Matrixty Sync] Poll skipped — no baseline or no ideas loaded');
      return;
    }

    const since = _lastPollTs;
    const now = new Date().toISOString();
    // v9.2: URL-encode timestamp to prevent '+' being decoded as space
    const sinceEncoded = encodeURIComponent(since);
    console.log(`[Matrixty Sync] Polling for changes since ${since}...`);

    // Fetch assignments updated since last poll
    // Supabase REST: updated_at > since (using gt filter)
    const assignUrl = `${SUPABASE_URL}/rest/v1/idea_shop_assignments?select=id,idea_id,shop_id,title,tag,publish_link,parent_asin,child_asin,seller_note,custom_style,custom_status,listed_by,listed_at,need_fix,fixed_at,scheduled_date,assigned_by,updated_at&updated_at=gt.${sinceEncoded}&order=updated_at.desc&limit=200`;
    const ideasUrl = `${SUPABASE_URL}/rest/v1/ideas?select=id,variant,product_name,niche,thumbnail,sku,link_spy,domain,note,urgent,need_fix,need_fix_at,fixed_at,updated_at&updated_at=gt.${sinceEncoded}&is_deleted=eq.false&order=updated_at.desc&limit=100`;

    const [assignRes, ideasRes] = await Promise.all([
      fetch(assignUrl, { headers: HDR }).then(async r => {
        if (!r.ok) { console.error('[Matrixty Sync] Assignment poll FAILED:', r.status, await r.text().catch(() => '')); return []; }
        return r.json();
      }).catch(e => { console.error('[Matrixty Sync] Assignment poll error:', e); return []; }),
      fetch(ideasUrl, { headers: HDR }).then(async r => {
        if (!r.ok) { console.error('[Matrixty Sync] Ideas poll FAILED:', r.status, await r.text().catch(() => '')); return []; }
        return r.json();
      }).catch(e => { console.error('[Matrixty Sync] Ideas poll error:', e); return []; }),
    ]);

    // Use server's latest updated_at to avoid client/server clock skew
    // Fall back to client time if no results
    let latestServerTs = now;
    if (assignRes.length > 0 && assignRes[0].updated_at) {
      latestServerTs = assignRes[0].updated_at; // already ordered desc, first is latest
    }
    if (ideasRes.length > 0 && ideasRes[0].updated_at && ideasRes[0].updated_at > latestServerTs) {
      latestServerTs = ideasRes[0].updated_at;
    }
    _lastPollTs = latestServerTs;

    let anyChanged = false;

    // Process assignment changes
    if (assignRes.length > 0) {
      console.log(`[Matrixty Sync] ${assignRes.length} assignment(s) updated since ${since}`);
      for (const record of assignRes) {
        for (const idea of allIdeas) {
          if (!idea._assignments) continue;
          const sa = idea._assignments.find(a => String(a.id) === String(record.id));
          if (!sa) continue;

          // Update local assignment data
          // v9.6: Don't overwrite fields that have pending local changes (PATCH failed)
          const hasPending = window._pendingLocalChanges?.has(String(record.id));
          const pendingFields = hasPending ? window._pendingLocalChanges.get(String(record.id)) : null;
          const fieldsToSync = ['title', 'tag', 'child_asin', 'parent_asin', 'publish_link',
            'seller_note', 'custom_style', 'custom_status', 'listed_by', 'listed_at',
            'need_fix', 'fixed_at', 'scheduled_date', 'assigned_by'];
          for (const f of fieldsToSync) {
            if (record[f] !== undefined) {
              // Skip overwriting if we have a pending local value and DB value is empty
              if (pendingFields && pendingFields[f] && !record[f]) continue;
              sa[f] = record[f];
            }
          }
          // Update convenience fields on idea
          if (record.title !== undefined) idea.assignment_title = record.title;
          if (record.tag !== undefined) idea.assignment_tag = record.tag;
          if (record.child_asin !== undefined) idea.child_asin = record.child_asin;
          if (record.listed_by !== undefined) idea.listed_by = record.listed_by;
          if (record.listed_at !== undefined) idea.listed_at = record.listed_at;
          if (record.publish_link !== undefined) idea.publish_link = record.publish_link;
          anyChanged = true;
          break;
        }
      }
    }

    // Process idea changes (variant move, etc.)
    if (ideasRes.length > 0) {
      console.log(`[Matrixty Sync] ${ideasRes.length} idea(s) updated since ${since}`);
      for (const record of ideasRes) {
        const idea = allIdeas.find(i => String(i.idea_id || i.id) === String(record.id));
        if (!idea) continue;
        const fieldsToSync = ['variant', 'product_name', 'niche', 'thumbnail', 'sku',
          'link_spy', 'domain', 'note', 'urgent', 'need_fix', 'need_fix_at', 'fixed_at'];
        for (const f of fieldsToSync) {
          if (record[f] !== undefined && record[f] !== idea[f]) {
            idea[f] = record[f];
            anyChanged = true;
          }
        }
      }
    }

    if (anyChanged) {
      updateIdeasCache();
      // v7.0.4: Self-echo prevention — if we just saved locally, skip re-render
      // (the poll picks up our own change; re-rendering would reset dropdown state)
      const msSinceLocalSave = Date.now() - (window._lastLocalSaveTs || 0);
      if (msSinceLocalSave < 15000) {
        console.log(`[Matrixty Sync] ✅ Data updated (self-echo, ${Math.round(msSinceLocalSave / 1000)}s ago) — cache updated, skip re-render`);
        return;
      }
      console.log('[Matrixty Sync] ✅ Data updated from Idea Pool, re-rendering...');
      // v9.5: Save UI state before re-render (expanded panels, scroll position)
      const _savedExpanded = Array.from(document.querySelectorAll('.etsy-summary.expanded')).map(el => el.dataset.expand).filter(Boolean);
      const _savedScroll = listingIdeas?.scrollTop || 0;
      const _savedSelectedIdx = selectedIdea ? allIdeas.findIndex(i => (i.idea_id || i.id) === (selectedIdea.idea_id || selectedIdea.id)) : -1;

      // Re-apply current filters and re-render (filteredIdeas must be recalculated)
      if (selectedIdea) {
        renderCurrentPage();
      } else {
        // v9.5: Use applyFilters + renderCurrentPage instead of displayIdeas to preserve page/filter state
        applyFilters();
      }

      // v9.5: Restore UI state after re-render
      setTimeout(() => {
        // Restore expanded detail panels
        if (_savedExpanded.length > 0) {
          _savedExpanded.forEach(id => {
            const summary = document.querySelector(`[data-expand="${id}"]`);
            if (summary) summary.classList.add('expanded');
          });
        }
        // Restore scroll position
        if (listingIdeas && _savedScroll > 0) listingIdeas.scrollTop = _savedScroll;
        // Restore selected idea highlight
        if (_savedSelectedIdx >= 0) {
          const ideaItem = listingIdeas?.querySelector(`.listing-idea-item[data-idx="${_savedSelectedIdx}"]`);
          if (ideaItem) ideaItem.classList.add('selected');
        }
      }, 50);
    }
  }

  function stopRealtimeSubscription() {
    if (_pollTimer) {
      clearInterval(_pollTimer);
      _pollTimer = null;
      console.log('[Matrixty Sync] Polling stopped');
    }
  }

  // ═══ SHARED: Wire up editable title/tags + copy + auto-fill on result element ═══
  function wireEditableResult(resultEl, lab, idea, platform, title, tags, maxLen) {
    const p = platform === 'tiktok' ? 'etsy' : platform;

    // ═══ DOUBLE-CLICK TO EDIT TITLE ═══
    const titleEl = resultEl.querySelector('[data-role="editable-title"]');
    const titleLenEl = resultEl.querySelector('[data-role="title-len"]');
    titleEl.addEventListener('dblclick', () => {
      if (titleEl.classList.contains('editing')) return;
      titleEl.classList.add('editing');
      const currentTitle = generatedData.title || title;
      titleEl.textContent = currentTitle;
      titleEl.contentEditable = 'true';
      titleEl.focus();
      const range = document.createRange();
      range.selectNodeContents(titleEl);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });
    titleEl.addEventListener('input', () => {
      if (!titleEl.classList.contains('editing')) return;
      const newTitle = titleEl.textContent.trim();
      generatedData.title = newTitle;
      const len = newTitle.length;
      const col = len >= maxLen - 10 ? '#2E7D32' : len >= maxLen - 30 ? '#E65100' : '#C62828';
      titleLenEl.style.color = col;
      titleLenEl.textContent = `${len}/${maxLen}c`;
    });
    titleEl.addEventListener('blur', () => {
      titleEl.classList.remove('editing');
      titleEl.contentEditable = 'false';
      let editedTitle = titleEl.textContent.trim();
      if (p === 'amazon') editedTitle = stripAmazonDashes(editedTitle);
      editedTitle = trimIncompleteEnding(editedTitle, maxLen);
      generatedData.title = editedTitle;
      // Re-render slot HTML after editing
      if (p === 'amazon') {
        titleEl.innerHTML = buildAmazonSlotHtml(generatedData.title);
      } else {
        titleEl.innerHTML = buildEtsySlotHtml(generatedData.title);
      }
      // Auto-sync edited title to listing_lab_data (lab only, NOT assignment)
      syncLabData(idea, platform, generatedData.title, generatedData.tags || tags).then(() => updateIdeasCache()).catch(e => console.warn('[Matrixty] syncLabData error:', e));
      // v8.1.2: Assignment sync deferred to Auto-Fill (trademark check required first)
      console.log('[Matrixty v8.1.2] Title edited in lab — synced lab data only, assignment deferred to Auto-Fill');
    });
    titleEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); titleEl.blur(); }
      if (e.key === 'Escape') { titleEl.textContent = generatedData.title; titleEl.blur(); }
    });

    // ═══ DOUBLE-CLICK TO EDIT TAGS ═══
    const tagsEl = resultEl.querySelector('[data-role="editable-tags"]');
    const tagsCountEl = resultEl.querySelector('[data-role="tags-count"]');
    const isAmazonTags = p === 'amazon';
    const tagsSep = isAmazonTags ? ';' : ',';
    const tagsSepDisplay = isAmazonTags ? '; ' : ', ';

    function updateTagsCount(tagsArr) {
      if (isAmazonTags) {
        const charLen = tagsArr.join('; ').length;
        const col = charLen <= 255 ? '#2E7D32' : '#C62828';
        tagsCountEl.style.color = col;
        tagsCountEl.textContent = `${charLen}/255c`;
      } else {
        tagsCountEl.textContent = `${tagsArr.length}/13`;
      }
    }

    tagsEl.addEventListener('dblclick', () => {
      if (tagsEl.classList.contains('editing')) return;
      tagsEl.classList.add('editing');
      const currentTags = generatedData.tags || tags;
      tagsEl.textContent = currentTags.join(tagsSepDisplay);
      tagsEl.contentEditable = 'true';
      tagsEl.focus();
      const range = document.createRange();
      range.selectNodeContents(tagsEl);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });
    tagsEl.addEventListener('input', () => {
      if (!tagsEl.classList.contains('editing')) return;
      const newTagsArr = tagsEl.textContent.split(tagsSep).map(t => t.trim()).filter(Boolean);
      generatedData.tags = newTagsArr;
      updateTagsCount(newTagsArr);
    });
    tagsEl.addEventListener('blur', () => {
      tagsEl.classList.remove('editing');
      tagsEl.contentEditable = 'false';
      generatedData.tags = tagsEl.textContent.split(tagsSep).map(t => t.trim()).filter(Boolean);
      updateTagsCount(generatedData.tags);
      // Re-render tag pills for Etsy (Amazon stays as plain text)
      if (!isAmazonTags) {
        tagsEl.innerHTML = generatedData.tags.map((t, i) => `<span style="display:inline-block;background:#F3E8FF;padding:1px 5px;border-radius:3px;margin:1px 2px;font-size:9px;">${i + 1}. ${escHtml(t)}</span>`).join('');
      }
      // Auto-sync edited tags to listing_lab_data only (NOT assignment)
      syncLabData(idea, platform, generatedData.title || title, generatedData.tags).then(() => updateIdeasCache()).catch(e => console.warn('[Matrixty] syncLabData error:', e));
      // v8.1.2: Assignment sync deferred to Auto-Fill
      console.log('[Matrixty v8.1.2] Tags edited in lab — synced lab data only, assignment deferred to Auto-Fill');
    });
    tagsEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); tagsEl.blur(); }
      if (e.key === 'Escape') { tagsEl.textContent = (generatedData.tags || tags).join(tagsSepDisplay); tagsEl.blur(); }
    });

    // Copy title — Amazon: strip dashes; both: trim incomplete words
    resultEl.querySelector('[data-action="copy-title"]')?.addEventListener('click', () => {
      let copyTitle = generatedData.title || title;
      if (p === 'amazon') copyTitle = stripAmazonDashes(copyTitle);
      copyTitle = trimIncompleteEnding(copyTitle, maxLen);
      navigator.clipboard.writeText(copyTitle);
      const btn = resultEl.querySelector('[data-action="copy-title"]');
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy Title'; }, 1500);
    });

    // Copy tags — Amazon: semicolon separated (matching Idea Lab); Etsy: comma separated
    resultEl.querySelector('[data-action="copy-tags"]')?.addEventListener('click', () => {
      const currentTags = generatedData.tags || tags;
      const copyText = isAmazonTags ? currentTags.join('; ') : currentTags.join(', ');
      navigator.clipboard.writeText(copyText);
      const btn = resultEl.querySelector('[data-action="copy-tags"]');
      const label = isAmazonTags ? 'Copy Search Terms' : 'Copy Tags';
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = label; }, 1500);
    });

    // Copy SKU
    resultEl.querySelector('[data-action="copy-sku"]')?.addEventListener('click', () => {
      const skuVal = idea.sku || '';
      if (skuVal) {
        navigator.clipboard.writeText(skuVal);
        const btn = resultEl.querySelector('[data-action="copy-sku"]');
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = 'Copy SKU'; }, 1500);
      }
    });

    // ═══ AUTO-FILL + SYNC: sends to Etsy/Amazon page, then syncs to listing_lab_data ═══
    resultEl.querySelector('[data-action="fill-preview"]')?.addEventListener('click', async () => {
      const currentTitle = generatedData.title || title;
      const currentTags = generatedData.tags || tags;
      const fillBtn = resultEl.querySelector('[data-action="fill-preview"]');

      // ═══ v8.1.1: TRADEMARK CHECK before mini-lab auto-fill ═══
      const tmPlatform = platform || detectedPlatform || 'etsy';
      await fetchTrademarkWarnings();
      if (_trademarkWarnings.length > 0 && currentTitle) {
        let flatTitle = currentTitle;
        if (flatTitle.match(/^[a-e]\)\s/m)) {
          flatTitle = flatTitle.split('\n').map(l => l.replace(/^[a-e]\)\s*/, '').trim()).filter(Boolean).join(' ');
        }
        const tmMatches = checkTrademarkTitle(flatTitle, tmPlatform);
        if (tmMatches.length > 0) {
          const hasBlock = tmMatches.some(m => m.severity === 'block');
          showTrademarkWarningModal(flatTitle, tmMatches, hasBlock);
          if (hasBlock) {
            // BLOCK — do not proceed
            return;
          }
          // WARN — wait for user choice
          const userChoice = await waitTrademarkModalChoice();
          if (userChoice === 'cancel') return;
        }
      }

      fillBtn.disabled = true;
      fillBtn.textContent = 'Sending...';

      const payload = {
        ...idea,
        platform: detectedPlatform !== 'unknown' ? detectedPlatform : platform,
        auth: {
          supabaseUrl: SUPABASE_URL, supabaseKey: SUPABASE_ANON_KEY,
          userId: currentUser?.id || null,
          userEmail: currentUser?.email || null,
        },
        generatedData: {
          title: currentTitle,
          tags: currentTags,
          description: '',
          bullet_points: [],
        },
      };

      try {
        const activeTabs = await new Promise(resolve => {
          chrome.tabs.query({ active: true, currentWindow: true }, resolve);
        });
        if (!activeTabs[0]) throw new Error('No active tab');
        const tabId = activeTabs[0].id;
        const effectivePlatform = payload.platform || 'etsy';

        // Attempt 1: content script LISTING_PASTE
        let result = await sendTabMessageAsync(tabId, { type: 'LISTING_PASTE', payload });

        // If content script not loaded, inject and retry
        if (!result.ok && result.needInject) {
          const injectResult = await sendMessageAsync({ type: 'INJECT_LISTING_SCRIPT', payload: { tabId } });
          if (injectResult?.ok) {
            await new Promise(r => setTimeout(r, 1500));
            result = await sendTabMessageAsync(tabId, { type: 'LISTING_PASTE', payload });
          }
        }

        // Attempt 2: DIRECT_FILL via background (chrome.scripting.executeScript)
        // Dùng khi content script paste trả về 0 fields hoặc fail
        if (!result?.ok || (result.filledFields && result.filledFields.length === 0)) {
          console.log('[Matrixty v7.0.0] LISTING_PASTE returned 0 fields, trying DIRECT_FILL fallback...');
          fillBtn.textContent = 'Retrying...';
          result = await sendMessageAsync({
            type: 'DIRECT_FILL',
            payload: {
              tabId,
              title: currentTitle,
              tags: currentTags,
              sku: idea?.sku || '',
              platform: effectivePlatform,
            },
          });
        }

        if (result?.ok) {
          fillBtn.textContent = 'Sent! Syncing...';
          fillBtn.style.background = '#4A7C59';
          fillBtn.style.color = '#fff';

          // ═══ v7.5.0: Extract ASIN/link — try fill response first, fallback to tab URL ═══
          let extractedAsin = result.extractedAsin || '';
          const extractedLink = result.extractedLink || '';
          const fillPlatform = result.platform || effectivePlatform;

          // ═══ v7.5.0: FALLBACK — extract ASIN directly from the active tab's URL ═══
          // This is more reliable than relying on content script / DIRECT_FILL response
          if (!extractedAsin && fillPlatform === 'amazon') {
            try {
              const tabUrl = activeTabs[0]?.url || '';
              console.log('[Matrixty v7.5.0] Tab URL for ASIN extraction:', tabUrl);
              // Method 1: URL param ?asin=B0XXXXXXXX
              const m1 = tabUrl.match(/[?&]asin=([A-Z0-9]{10})/i);
              if (m1) extractedAsin = m1[1].toUpperCase();
              // Method 2: URL path /dp/B0XX or /product/B0XX
              if (!extractedAsin) { const m2 = tabUrl.match(/\/(?:dp|product|offer-listing)\/([A-Z0-9]{10})/i); if (m2) extractedAsin = m2[1].toUpperCase(); }
              // Method 3: sku param sometimes contains ASIN
              if (!extractedAsin) { const m3 = tabUrl.match(/[?&](?:child_asin|childAsin)=([A-Z0-9]{10})/i); if (m3) extractedAsin = m3[1].toUpperCase(); }
              if (extractedAsin) console.log(`[Matrixty v7.5.0] ✅ ASIN extracted from tab URL: ${extractedAsin}`);
              else console.log('[Matrixty v7.5.0] ⚠️ No ASIN found in tab URL');
            } catch (e) { console.warn('[Matrixty v7.5.0] ASIN URL extraction error:', e); }
          }

          // ═══ SYNC to listing_lab_data + ALL relevant assignments ═══
          syncLabData(idea, platform, currentTitle, currentTags).then(async () => {
            const tagStr = Array.isArray(currentTags) ? currentTags.join('; ') : currentTags;
            const memberName = currentUser?.name || '';
            const now = new Date().toISOString();

            // ═══ v7.0.0: Build assignment update payload based on platform ═══
            const assignmentUpdate = {
              title: currentTitle,
              tag: tagStr,
              listed_by: memberName,
              listed_at: now,
            };

            // Amazon: also sync child_asin extracted from the page
            if (fillPlatform === 'amazon' && extractedAsin) {
              assignmentUpdate.child_asin = extractedAsin;
              console.log(`[Matrixty v7.0.0] Syncing Amazon ASIN: ${extractedAsin}`);
            }

            // Etsy: also sync publish_link extracted from the page
            if (fillPlatform === 'etsy' && extractedLink) {
              assignmentUpdate.publish_link = extractedLink;
              console.log(`[Matrixty v7.0.0] Syncing Etsy link: ${extractedLink}`);
            }

            // ═══ v9.4: Sync to assignment — find target, update DB + local ═══
            let syncOk = false;
            let targetSa = null;

            // Find the correct assignment for this shop
            if (selectedShopFilter && selectedShopFilter !== 'all' && idea._assignments?.length) {
              targetSa = idea._assignments.find(a => a._shop_name === selectedShopFilter);
            }
            // Fallback: match by shop platform (using actual platform field, not name substring)
            if (!targetSa && idea._assignments?.length) {
              targetSa = idea._assignments.find(a => {
                const shopPlatform = getShopPlatform(a.shop_id);
                return shopPlatform === fillPlatform;
              }) || idea._assignments.find(a => {
                // Secondary fallback: match by shop name substring
                const shopName = (a._shop_name || '').toLowerCase();
                if (fillPlatform === 'amazon') return shopName.includes('amazon') || shopName.includes('amz');
                if (fillPlatform === 'etsy') return shopName.includes('etsy');
                return false;
              }) || idea._assignments[0];
            }

            if (targetSa?.id) {
              console.log(`[Matrixty v9.5] Syncing assignment ${targetSa.id} for shop: ${targetSa._shop_name || 'unknown'}`, assignmentUpdate);
              // v9.5: ALWAYS update local data first (so UI stays consistent even if DB sync fails)
              Object.assign(targetSa, { title: currentTitle, tag: tagStr, listed_by: memberName, listed_at: now });
              if (extractedAsin) targetSa.child_asin = extractedAsin;
              if (extractedLink) targetSa.publish_link = extractedLink;
              // Then sync to DB
              syncOk = await updateAssignment(targetSa.id, assignmentUpdate);
              if (syncOk) {
                console.log(`[Matrixty v9.5] ✅ Assignment synced OK:`, { title: currentTitle.substring(0, 30), asin: extractedAsin, link: extractedLink ? 'yes' : 'no' });
              } else {
                console.error(`[Matrixty v9.5] ❌ Assignment sync FAILED for ID ${targetSa.id}`, window._lastPatchResult);
              }
            } else {
              console.warn('[Matrixty v9.5] No assignment found to sync!', {
                shopFilter: selectedShopFilter, platform: fillPlatform,
                assignmentCount: idea._assignments?.length || 0,
                shopNames: idea._assignments?.map(a => a._shop_name) || [],
              });
            }

            // Update local idea data (always, even if DB sync failed — so UI shows latest)
            idea.assignment_title = currentTitle;
            idea.assignment_tag = tagStr;
            idea.listed_by = memberName;
            idea.listed_at = now;
            if (extractedAsin) idea.child_asin = extractedAsin;
            if (extractedLink) idea.publish_link = extractedLink;

            // Also update the allIdeas cache entry
            const ideaId = idea.idea_id || idea.id;
            const cachedIdea = allIdeas.find(i => (i.idea_id || i.id) === ideaId);
            if (cachedIdea && cachedIdea !== idea) {
              cachedIdea.assignment_title = currentTitle;
              cachedIdea.assignment_tag = tagStr;
              cachedIdea.listed_by = memberName;
              cachedIdea.listed_at = now;
              if (extractedAsin) cachedIdea.child_asin = extractedAsin;
              if (extractedLink) cachedIdea.publish_link = extractedLink;
            }

            // Persist to chrome.storage.local so data survives popup close/reopen
            if (typeof updateIdeasCache === 'function') {
              try { updateIdeasCache(); } catch(e) { console.warn('[Matrixty v9.4] updateIdeasCache error:', e); }
            }

            // Refresh the idea card in the extension UI
            refreshIdeaCardAfterSync(idea, fillPlatform, extractedAsin, extractedLink);

            // v9.5: Mark as local save to prevent poll re-render wiping DOM updates
            window._lastLocalSaveTs = Date.now();

            if (syncOk) {
              fillBtn.textContent = '✅ Synced!';
            } else {
              // v9.6: Show specific error info
              const patchErr = window._lastPatchResult;
              const errHint = patchErr?.likelyRLS ? ' (RLS)' : patchErr?.status ? ` (${patchErr.status})` : '';
              fillBtn.textContent = `⚠️ Sync failed${errHint}`;
              fillBtn.title = patchErr?.error || 'Unknown error — check console';
            }
          }).catch((err) => {
            console.error('[Matrixty v7.0.3] Sync after fill failed:', err);
            fillBtn.textContent = '⚠️ Sync failed';
            fillBtn.title = err.message || 'Exception during sync';
          }).finally(() => {
            setTimeout(() => {
              fillBtn.style.background = '#7B1FA2';
              fillBtn.style.color = '#fff';
              fillBtn.textContent = 'Auto-Fill ↓';
              fillBtn.title = '';
              fillBtn.disabled = false;
            }, 4000); // v9.6: extended from 2.5s to 4s so user can see/hover error
          });
        } else {
          fillBtn.textContent = 'Auto-Fill ↓';
          fillBtn.disabled = false;
        }
      } catch (err) {
        console.error('[Matrixty v7.0.0] Auto-Fill error:', err);
        fillBtn.textContent = 'Auto-Fill ↓';
        fillBtn.disabled = false;
      }
    });
  }

  // Quick Generate: analyze + generate-fast in one flow
  async function miniLabGenerate(lab, idea, platform) {
    const genBtn = lab.querySelector('[data-action="quick-generate"]');
    const statusEl = lab.querySelector('[data-role="status"]');
    const resultEl = lab.querySelector('[data-role="result"]');

    genBtn.disabled = true;
    genBtn.textContent = '⏳ Generating...';
    statusEl.textContent = 'Step 1/2: Generating title & tags...';
    statusEl.style.display = 'block';

    try {
      const productType = getLabInput(lab, 'productType');
      const niche = getLabInput(lab, 'niche');
      const quote = getLabInput(lab, 'quote');
      const features = getLabInput(lab, 'features');
      const giftForStr = getLabInput(lab, 'giftFor');
      const giftFromStr = getLabInput(lab, 'giftFrom');
      const sentiment = getActiveChip(lab, 'tone') || 'neutral';
      const holidayId = getActiveChip(lab, 'holiday') || 'birthday';

      const giftFor = giftForStr ? giftForStr.split(',').map(s => s.trim()).filter(Boolean) : [];
      const giftFrom = giftFromStr ? giftFromStr.split(',').map(s => s.trim()).filter(Boolean) : [];

      // ═══ VALIDATE: Gift For & Gift From are mandatory ═══
      const giftForInput = lab.querySelector('[data-field="giftFor"]');
      const giftFromInput = lab.querySelector('[data-field="giftFrom"]');
      if (!giftFor.length || !giftFrom.length) {
        if (!giftFor.length && giftForInput) { giftForInput.style.border = '2px solid #EF5350'; giftForInput.placeholder = '⚠️ Bắt buộc! e.g. Mom, Dad, Wife'; }
        if (!giftFrom.length && giftFromInput) { giftFromInput.style.border = '2px solid #EF5350'; giftFromInput.placeholder = '⚠️ Bắt buộc! e.g. Son, Daughter, Family'; }
        throw new Error('Gift For và Gift From bắt buộc phải có để gen title chính xác');
      }
      // Clear error styling
      if (giftForInput) giftForInput.style.border = '';
      if (giftFromInput) giftFromInput.style.border = '';

      const competitorTitle = idea.assignment_title || idea.product_name || idea.variant || productType;

      // Map holiday ID to name
      const holidayNames = {
        'birthday': '', 'none': '',
        'mothers-day': "Mother's Day", 'fathers-day': "Father's Day",
        'valentines': "Valentine's Day", 'christmas': 'Christmas',
        'halloween': 'Halloween', 'graduation': 'Graduation',
        'thanksgiving': 'Thanksgiving', 'easter': 'Easter',
        'new-year': "New Year's", 'independence-day': 'Independence Day',
        'memorial-day': 'Memorial Day', 'veterans-day': "Veteran's Day",
        'st-patricks': "St. Patrick's Day", 'back-to-school': 'Back to School',
        'baby-shower': 'Baby Shower', 'wedding': 'Wedding / Anniversary',
        'retirement': 'Retirement', 'housewarming': 'Housewarming',
      };
      const holidayName = holidayNames[holidayId] || '';

      const p = platform === 'tiktok' ? 'etsy' : platform;
      const generateResult = await sendMessageAsync({
        type: 'GENERATE_TITLE_TAGS',
        payload: {
          competitorTitle, productType, niche, sentiment, quote,
          giftFor, giftFrom, recipients: [...giftFor, ...giftFrom],
          keyFeatures: features, platform: p,
          holidayName, holidayPosition: '', isPeak: false,
        }
      });

      if (!generateResult?.ok || !generateResult.data) {
        throw new Error(generateResult?.error || 'Generate failed');
      }

      const gd = generateResult.data;
      let title = '';
      if (p === 'etsy') title = gd.etsy_title || gd.title || '';
      else if (p === 'amazon') title = gd.amazon_title || gd.title || '';
      else title = gd.etsy_title || gd.amazon_title || gd.title || '';

      // Title Case: viết hoa chữ cái đầu mỗi từ
      title = toTitleCase(title);

      // Amazon: strip dashes from stored title
      const maxLen = p === 'amazon' ? 200 : 140;
      if (p === 'amazon') title = stripAmazonDashes(title);
      // Trim incomplete word at end
      title = trimIncompleteEnding(title, maxLen);

      const tags = p === 'amazon'
        ? (gd.amazon_search_terms || gd.amazon_tags || gd.etsy_tags || gd.tags || [])
        : (gd.etsy_tags || gd.tags || []);
      const slots = p === 'amazon' ? (gd.amazon_slots || {}) : (gd.etsy_slots || {});

      // Show result with slot colors
      statusEl.style.display = 'none';
      resultEl.style.display = 'block';

      let slotHtml = '';
      if (p === 'amazon') {
        slotHtml = buildAmazonSlotHtml(title, slots);
      } else {
        slotHtml = buildEtsySlotHtml(title, slots);
      }

      const isAmazon = p === 'amazon';
      const titleLen = title.length;
      const lenColor = titleLen >= maxLen - 10 ? '#2E7D32' : titleLen >= maxLen - 30 ? '#E65100' : '#C62828';

      // Amazon: tags as semicolon-separated string (max 255 chars)
      // Etsy: numbered tag pills
      let tagsHtml, tagsCountLabel;
      if (isAmazon) {
        const tagsStr = tags.join('; ');
        const tagsCharLen = tagsStr.length;
        const tagsLenColor = tagsCharLen <= 255 ? '#2E7D32' : '#C62828';
        tagsHtml = `<span style="font-size:9px;color:#333;line-height:1.5;">${escHtml(tagsStr)}</span>`;
        tagsCountLabel = `<span style="color:${tagsLenColor};font-weight:700;" data-role="tags-count">${tagsCharLen}/255c</span>`;
      } else {
        tagsHtml = tags.map((t, i) => `<span style="display:inline-block;background:#F3E8FF;padding:1px 5px;border-radius:3px;margin:1px 2px;font-size:9px;">${i + 1}. ${escHtml(t)}</span>`).join('');
        tagsCountLabel = `<span data-role="tags-count">${tags.length}/13</span>`;
      }

      resultEl.innerHTML = `
        <div class="mini-lab-label">${isAmazon ? 'AMAZON' : 'ETSY'} TITLE <span style="color:${lenColor};font-weight:700;" data-role="title-len">${titleLen}/${maxLen}c</span></div>
        <div class="mini-lab-result-title" data-role="editable-title" title="Double-click to edit">${slotHtml}</div>
        <div class="mini-lab-label" style="margin-top:6px;">${isAmazon ? 'SEARCH TERMS' : 'ETSY TAGS'} (${tagsCountLabel})</div>
        <div class="mini-lab-result-tags" data-role="editable-tags" data-platform="${p}" title="Double-click to edit">${tagsHtml}</div>
        ${idea.sku ? `<div class="mini-lab-label" style="margin-top:6px;">SKU</div><div style="background:#FFF3E0;padding:4px 8px;border-radius:4px;font-size:11px;font-weight:600;color:#E65100;display:inline-block;margin-bottom:4px;" data-role="sku-display">${escHtml(idea.sku)}</div>` : ''}
        <div class="mini-lab-edit-hint">Double-click title or tags to edit</div>
        <div class="mini-lab-actions">
          <button class="mini-lab-action-btn mini-lab-copy-btn" data-action="copy-title">Copy Title</button>
          <button class="mini-lab-action-btn mini-lab-copy-btn" data-action="copy-tags">Copy ${isAmazon ? 'Search Terms' : 'Tags'}</button>
          ${idea.sku ? `<button class="mini-lab-action-btn mini-lab-copy-btn" data-action="copy-sku">Copy SKU</button>` : ''}
          <button class="mini-lab-action-btn mini-lab-fill-btn" data-action="fill-preview">Auto-Fill ↓</button>
        </div>
      `;

      // Store generated data (mutable — updated when user edits)
      generatedData = { title, tags: [...tags], description: '' };

      // ═══ v7.0.4 → v8.1.2: SYNC SAU KHI GENERATE ═══
      // 1. Lưu vào listing_lab_data (title/tags for Lab) — always sync
      // 2. idea_shop_assignments — CHỈ sync khi Auto-Fill (không sync ở đây nữa)
      //    Lý do: title chưa qua trademark check → không nên lưu vào assignment

      // Sync to listing_lab_data only (lab result, NOT assignment)
      syncLabData(idea, platform, title, tags).then(() => {
        updateIdeasCache();
        console.log('[Matrixty v8.1.2] Synced listing_lab_data after generate (assignment deferred to Auto-Fill)');
      }).catch(err => {
        console.warn('[Matrixty v8.1.2] listing_lab_data sync failed:', err);
      });

      // Wire up shared editable/copy/autofill handlers
      wireEditableResult(resultEl, lab, idea, platform, title, tags, maxLen);

      // Show generate form for re-generate
      const generateForm = lab.querySelector('.mini-lab-generate-form');
      if (generateForm) generateForm.style.display = 'none';

      genBtn.textContent = '⚡ Re-generate';
      genBtn.disabled = false;

    } catch (err) {
      statusEl.textContent = 'Error: ' + err.message;
      statusEl.style.color = '#EF4444';
      statusEl.style.display = 'block';
      genBtn.textContent = '⚡ Retry Generate';
      genBtn.disabled = false;
      console.error('[Matrixty v1.2] Quick Generate error:', err.message);
    }
  }

  // ═══ HELPER: Build Amazon title HTML with A-B-C-D-E slot badges ═══
  // Splits title by " – " separator and wraps each segment with a colored badge
  const SLOT_LABELS = ['A', 'B', 'C', 'D', 'E', 'F'];
  function buildAmazonSlotHtml(title, slotsObj) {
    // If slots object provided from API, use it directly (NO dash separators)
    if (slotsObj && Object.keys(slotsObj).length > 0) {
      const slotKeys = Object.keys(slotsObj).sort();
      return slotKeys.map((s, i) => {
        const cls = s.toLowerCase();
        return `<span class="mini-lab-slot slot-${cls}"><span class="mini-lab-slot-badge ${cls}">${s}</span>${escHtml(slotsObj[s])}</span>`;
      }).join(' ');
    }
    // Otherwise, parse title by " – " separator (NO dash in output)
    const parts = title.split(/\s*[–—]\s*/);
    if (parts.length <= 1) return escHtml(title);
    return parts.map((part, i) => {
      const label = SLOT_LABELS[i] || String.fromCharCode(65 + i);
      const cls = label.toLowerCase();
      return `<span class="mini-lab-slot slot-${cls}"><span class="mini-lab-slot-badge ${cls}">${label}</span>${escHtml(part.trim())}</span>`;
    }).join(' ');
  }

  // ═══ HELPER: Build Etsy title HTML with A-B-C-D slot badges (comma separator) ═══
  function buildEtsySlotHtml(title, slotsObj) {
    if (slotsObj && Object.keys(slotsObj).length > 0) {
      const slotKeys = Object.keys(slotsObj).sort();
      return slotKeys.map((s, i) => {
        const cls = s.toLowerCase();
        return `${i > 0 ? '<span class="mini-lab-sep">,</span>' : ''}<span class="mini-lab-slot slot-${cls}"><span class="mini-lab-slot-badge ${cls}">${s}</span>${escHtml(slotsObj[s])}</span>`;
      }).join('');
    }
    // Parse title by comma separator
    const parts = title.split(/\s*,\s*/);
    if (parts.length <= 1) return escHtml(title);
    return parts.map((part, i) => {
      const label = SLOT_LABELS[i] || String.fromCharCode(65 + i);
      const cls = label.toLowerCase();
      return `${i > 0 ? '<span class="mini-lab-sep">,</span>' : ''}<span class="mini-lab-slot slot-${cls}"><span class="mini-lab-slot-badge ${cls}">${label}</span>${escHtml(part.trim())}</span>`;
    }).join('');
  }

  // ═══ HELPER: Strip Amazon dashes from raw title text ═══
  // "Part A – Part B – Part C" → "Part A Part B Part C"
  function stripAmazonDashes(title) {
    return title.replace(/\s*[–—-]\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
  }

  // ═══ HELPER: Trim incomplete words at end of title ═══
  // If title ends mid-phrase (e.g. "Handmade" without "Gift"), trim to last complete word
  // that doesn't leave a dangling single short word
  function trimIncompleteEnding(title, maxLen) {
    if (!title || title.length <= maxLen) return title;
    // Cut to max length
    let trimmed = title.substring(0, maxLen);
    // If we cut in the middle of a word, trim back to last space
    if (title.length > maxLen && title[maxLen] !== ' ') {
      const lastSpace = trimmed.lastIndexOf(' ');
      if (lastSpace > 0) trimmed = trimmed.substring(0, lastSpace);
    }
    return trimmed.trim();
  }

  // Title Case: viết hoa chữ cái đầu mỗi từ (dùng cho quote, title)
  // "thank you for being" → "Thank You For Being"
  function toTitleCase(str) {
    if (!str) return '';
    return str.replace(/\w\S*/g, w => w.charAt(0).toUpperCase() + w.substr(1).toLowerCase());
  }

  function escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Highlight search term with yellow background
  function highlightSearch(str, q) {
    if (!str || !q) return escHtml(str);
    const escaped = escHtml(str);
    const qEscaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return escaped.replace(new RegExp(`(${qEscaped})`, 'gi'), '<mark style="background:#FFF176;padding:0 1px;border-radius:2px;">$1</mark>');
  }

  // ===== GENERATE — pod-lab-extract → generate-fast =====

  btnGenerate?.addEventListener('click', async () => {
    if (!selectedIdea || isGenerating) return;
    isGenerating = true;
    btnGenerate.disabled = true;
    btnGenerate.textContent = 'Generating...';

    try {
      // STEP 1: Analyze Product
      showGenerateStatus('Step 1/3: Analyzing product...');
      const ideaTitle = selectedIdea.product_name || selectedIdea.assignment_title || '';
      const analyzeResult = await sendMessageAsync({
        type: 'ANALYZE_PRODUCT',
        payload: {
          title: ideaTitle,
          variant: selectedIdea.variant || '',
          tags: selectedIdea.lab_tags || selectedIdea.assignment_tag || '',
          imageUrl: selectedIdea.thumbnail || '',
        }
      });

      if (analyzeResult?.ok && analyzeResult.data) {
        analyzedData = analyzeResult.data;
      } else {
        analyzedData = {
          productType: ideaTitle, niche: selectedIdea.niche || '',
          sentiment: 'neutral', giftFor: [], giftFrom: [], quote: '', keyFeatures: '',
        };
      }

      // STEP 2: Generate Title + Tags
      showGenerateStatus('Step 2/3: Generating title & tags...');
      const platform = detectedPlatform !== 'unknown' ? detectedPlatform : 'etsy';
      const generateResult = await sendMessageAsync({
        type: 'GENERATE_TITLE_TAGS',
        payload: {
          competitorTitle: ideaTitle,
          productType: analyzedData.productType || ideaTitle,
          niche: analyzedData.niche || selectedIdea.niche || '',
          sentiment: analyzedData.sentiment || 'neutral',
          quote: toTitleCase(analyzedData.quote || ''),
          giftFor: analyzedData.gift_for || analyzedData.giftFor || [],
          giftFrom: analyzedData.gift_from || analyzedData.giftFrom || [],
          recipients: analyzedData.recipients || [],
          keyFeatures: analyzedData.keyFeatures || '',
          platform: platform,
          holidayName: '', holidayPosition: '', isPeak: false,
        }
      });

      let title = '';
      let tags = '';
      let tagsArray = [];

      if (generateResult?.ok && generateResult.data) {
        const gd = generateResult.data;
        if (platform === 'etsy') title = gd.etsy_title || gd.title || '';
        else if (platform === 'amazon') title = gd.amazon_title || gd.title || '';
        else title = gd.etsy_title || gd.amazon_title || gd.title || '';

        // Title Case: viết hoa chữ cái đầu mỗi từ
        title = toTitleCase(title);

        tagsArray = gd.etsy_tags || gd.tags || [];
        if (Array.isArray(tagsArray)) tags = tagsArray.join(', ');

        if (gd.validation_warnings?.length > 0) {
          console.log('[Matrixty v7.0.0] Validation warnings:', gd.validation_warnings);
        }
      } else {
        showGenerateStatus('Generate failed: ' + (generateResult?.error || 'Unknown error'));
        title = previewTitle.value;
        tags = previewTags.value;
      }

      if (!title) title = resolveTitle(selectedIdea);
      if (!tags) tags = resolveTags(selectedIdea);

      // STEP 3: Generate Description
      let description = '';
      if (title) {
        showGenerateStatus('Step 3/3: Generating description...');
        const descResult = await sendMessageAsync({
          type: 'GENERATE_LISTING_DESC',
          payload: {
            idea: {
              idea_id: selectedIdea.idea_id,
              product_name: selectedIdea.product_name || selectedIdea.assignment_title || '',
              niche: analyzedData?.niche || selectedIdea.niche || '',
              variant: selectedIdea.variant || '',
              assignment_title: selectedIdea.assignment_title || '',
              lab_tags: selectedIdea.lab_tags || '',
              tags: tags,
            },
            platform: platform,
            auth: { supabaseUrl: SUPABASE_URL, supabaseKey: SUPABASE_ANON_KEY },
          }
        });
        description = descResult?.data?.description || '';
      }

      // Update preview
      previewTitle.value = title;
      previewTags.value = tags;
      previewDescription.value = description;

      generatedData = { title, tags: tagsArray.length > 0 ? tagsArray : tags.split(',').map(t => t.trim()).filter(Boolean), description };
      if (generateResult?.data?.bullet_points) generatedData.bullet_points = generateResult.data.bullet_points;

      previewStatus.textContent = 'Ready';
      previewStatus.className = 'preview-header-status ready';
      btnAutofill.disabled = !title;

      showGenerateStatus('Done! Review and click Auto-Fill.');
      setTimeout(() => hideGenerateStatus(), 3000);
    } catch (err) {
      console.error('[Matrixty v7.0.0] Generate error:', err);
      showGenerateStatus('Error: ' + err.message);
    } finally {
      isGenerating = false;
      btnGenerate.disabled = false;
      btnGenerate.textContent = 'Generate';
    }
  });

  // Promise wrapper for chrome.runtime.sendMessage
  function sendMessageAsync(msg) {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage(msg, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message });
        } else {
          resolve(response || { ok: false, error: 'No response' });
        }
      });
    });
  }

  // Promise wrapper for chrome.tabs.sendMessage (with retry + inject)
  function sendTabMessageAsync(tabId, msg) {
    return new Promise((resolve) => {
      chrome.tabs.sendMessage(tabId, msg, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message, needInject: true });
        } else {
          resolve(response || { ok: false, error: 'No response' });
        }
      });
    });
  }

  // ===== AUTO-FILL =====

  btnAutofill?.addEventListener('click', async () => {
    if (!selectedIdea) return;

    let title = previewTitle.value.trim();
    let tags = previewTags.value.trim();
    const description = previewDescription.value.trim();

    if (!title && !tags && !description) {
      showGenerateStatus('Nothing to paste. Generate first!');
      return;
    }

    // ═══ v8.1.0: TRADEMARK CHECK before auto-fill ═══
    const tmPlatform = detectedPlatform || detectIdeaPlatform(selectedIdea) || 'etsy';
    await fetchTrademarkWarnings(); // ensure loaded (uses cache if fresh)
    if (_trademarkWarnings.length > 0 && title) {
      // Build flat title for check (handle slot format)
      let flatTitle = title;
      if (flatTitle.match(/^[a-e]\)\s/m)) {
        flatTitle = flatTitle.split('\n').map(l => l.replace(/^[a-e]\)\s*/, '').trim()).filter(Boolean).join(' ');
      }
      const tmMatches = checkTrademarkTitle(flatTitle, tmPlatform);
      if (tmMatches.length > 0) {
        const blockMatches = tmMatches.filter(m => m.severity === 'block');
        const warnMatches = tmMatches.filter(m => m.severity !== 'block');
        // Show trademark warning modal
        showTrademarkWarningModal(flatTitle, tmMatches, blockMatches.length > 0);
        // Highlight in the title preview
        const highlightHtml = highlightTrademarkInTitle(flatTitle, tmMatches);
        let overlay = document.getElementById('tm-title-highlight-overlay');
        if (!overlay) {
          overlay = document.createElement('div');
          overlay.id = 'tm-title-highlight-overlay';
          overlay.className = 'tm-title-highlight-overlay';
          previewTitle.parentElement.style.position = 'relative';
          previewTitle.parentElement.appendChild(overlay);
        }
        overlay.innerHTML = highlightHtml;
        overlay.style.display = 'block';
        // Hide overlay when user edits title
        const hideOverlay = () => { overlay.style.display = 'none'; previewTitle.removeEventListener('input', hideOverlay); };
        previewTitle.addEventListener('input', hideOverlay);
        if (blockMatches.length > 0) {
          // BLOCK — do not proceed
          btnAutofill.disabled = false;
          btnAutofill.textContent = '🚀 Auto Fill';
          return;
        }
        // WARN only — let user decide (modal has confirm button)
        // We'll wait for the modal to resolve
        const userChoice = await waitTrademarkModalChoice();
        if (userChoice === 'cancel') {
          btnAutofill.disabled = false;
          btnAutofill.textContent = '🚀 Auto Fill';
          return;
        }
        // userChoice === 'continue' — proceed with auto-fill
      }
    }

    btnAutofill.disabled = true;
    btnAutofill.textContent = 'Sending...';
    showGenerateStatus('Sending data to page...');

    // Convert hybrid format back to flat title for paste
    // If title has slot markers like "a) ...\nb) ..." → join with platform separator
    if (title.match(/^[a-e]\)\s/m)) {
      const platform = selectedIdea ? detectIdeaPlatform(selectedIdea) : detectedPlatform;
      const sep = platform === 'amazon' ? ' – ' : ', ';
      title = title.split('\n')
        .map(line => line.replace(/^[a-e]\)\s*/, '').trim())
        .filter(Boolean)
        .join(sep);
    }

    // Convert numbered tags back to comma-separated
    if (tags.match(/^\d+\.\s/m)) {
      tags = tags.split('\n')
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(Boolean)
        .join(', ');
    }

    let tagsArray = [];
    if (tags) tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean);

    const payload = {
      ...selectedIdea,
      platform: detectedPlatform,
      auth: {
        supabaseUrl: SUPABASE_URL, supabaseKey: SUPABASE_ANON_KEY,
        userId: currentUser?.id || null,
        userEmail: currentUser?.email || null,
      },
      generatedData: {
        title, tags: tagsArray, description,
        bullet_points: generatedData?.bullet_points || [],
      },
    };

    try {
      const tabs = await new Promise(resolve => {
        chrome.tabs.query({ active: true, currentWindow: true }, resolve);
      });
      if (!tabs[0]) {
        showGenerateStatus('Error: No active tab found');
        return;
      }
      const tabId = tabs[0].id;

      // Attempt 1: content script
      let result = await sendTabMessageAsync(tabId, { type: 'LISTING_PASTE', payload });

      // If content script not loaded, inject and retry
      if (!result.ok && result.needInject) {
        showGenerateStatus('Injecting content script...');
        const injectResult = await sendMessageAsync({ type: 'INJECT_LISTING_SCRIPT', payload: { tabId } });
        if (injectResult?.ok) {
          await new Promise(r => setTimeout(r, 1500));
          result = await sendTabMessageAsync(tabId, { type: 'LISTING_PASTE', payload });
        }
      }

      // Attempt 2: DIRECT_FILL fallback via background script
      // v9.7: Trigger DIRECT_FILL if ANY key field is missing (not just when 0 fields)
      const filled = result?.filledFields || [];
      const needsTagsFill = tagsArray.length > 0 && !filled.includes('tags') && !filled.includes('search_terms');
      const needsSkuFill = (idea?.sku || selectedIdea?.sku) && !filled.includes('sku');
      const needsTitleFill = title && !filled.includes('title');

      if (!result?.ok || filled.length === 0 || needsTitleFill || needsTagsFill || needsSkuFill) {
        const missingFields = [];
        if (needsTitleFill) missingFields.push('title');
        if (needsTagsFill) missingFields.push('tags');
        if (needsSkuFill) missingFields.push('sku');
        console.log(`[Matrixty v9.7] LISTING_PASTE filled [${filled.join(',')}], missing [${missingFields.join(',')}] — trying DIRECT_FILL...`);
        showGenerateStatus('Retrying with direct fill...');

        // v9.7: Only pass fields that LISTING_PASTE didn't fill
        const dfPayload = {
          tabId,
          title: needsTitleFill ? title : '', // Skip title if already filled
          tags: needsTagsFill ? tagsArray : [],
          sku: needsSkuFill ? (idea?.sku || selectedIdea?.sku || '') : '',
          platform: detectedPlatform || 'etsy',
        };
        const dfResult = await sendMessageAsync({ type: 'DIRECT_FILL', payload: dfPayload });

        // Merge results
        if (dfResult?.ok) {
          const dfFilled = dfResult.filledFields || [];
          result = {
            ...result,
            ok: true,
            filledFields: [...new Set([...filled, ...dfFilled])],
            extractedAsin: dfResult.extractedAsin || result?.extractedAsin,
            extractedLink: dfResult.extractedLink || result?.extractedLink,
            platform: dfResult.platform || result?.platform,
          };
        }
      }

      if (result?.ok) {
        btnAutofill.textContent = 'Syncing...';
        btnAutofill.style.background = '#4A7C59';
        showGenerateStatus('Filled! Syncing to Idea Pool...');

        // ═══ v9.4: SYNC TO IDEA POOL after Auto-Fill ═══
        let extractedAsin = result.extractedAsin || '';
        const extractedLink = result.extractedLink || '';
        const fillPlatform = result.platform || detectedPlatform || 'etsy';
        const idea = selectedIdea;
        const ideaPlatform = detectIdeaPlatform(idea) || fillPlatform;

        // ASIN URL fallback — same as main flow
        if (!extractedAsin && fillPlatform === 'amazon') {
          try {
            const tabUrl = activeTabs[0]?.url || '';
            const m1 = tabUrl.match(/[?&]asin=([A-Z0-9]{10})/i);
            if (m1) extractedAsin = m1[1].toUpperCase();
            if (!extractedAsin) { const m2 = tabUrl.match(/\/(?:dp|product|offer-listing)\/([A-Z0-9]{10})/i); if (m2) extractedAsin = m2[1].toUpperCase(); }
            if (!extractedAsin) { const m3 = tabUrl.match(/[?&](?:child_asin|childAsin)=([A-Z0-9]{10})/i); if (m3) extractedAsin = m3[1].toUpperCase(); }
            if (extractedAsin) console.log(`[Matrixty v9.4] ✅ Preview ASIN from URL: ${extractedAsin}`);
          } catch(e) {}
        }

        try {
          // 1. Sync to listing_lab_data
          await syncLabData(idea, ideaPlatform, title, tagsArray);

          // 2. Sync to idea_shop_assignments
          const tagStr = tagsArray.join('; ');
          const memberName = currentUser?.name || '';
          const now = new Date().toISOString();

          const assignmentUpdate = {
            title: title,
            tag: tagStr,
            listed_by: memberName,
            listed_at: now,
          };

          // Amazon: sync child_asin extracted from page
          if (fillPlatform === 'amazon' && extractedAsin) {
            assignmentUpdate.child_asin = extractedAsin;
            console.log(`[Matrixty v7.0.0] Preview Auto-Fill: syncing ASIN ${extractedAsin}`);
          }

          // Etsy: sync publish_link
          if (fillPlatform === 'etsy' && extractedLink) {
            assignmentUpdate.publish_link = extractedLink;
          }

          // ═══ v9.4: Sync to assignment — find target, update DB + local ═══
          let syncOk = false;
          let targetSa = null;

          if (selectedShopFilter && selectedShopFilter !== 'all' && idea._assignments?.length) {
            targetSa = idea._assignments.find(a => a._shop_name === selectedShopFilter);
          }
          // Fallback: match by shop platform (using actual platform field, not name substring)
          if (!targetSa && idea._assignments?.length) {
            targetSa = idea._assignments.find(a => {
              const shopPlatform = getShopPlatform(a.shop_id);
              return shopPlatform === fillPlatform;
            }) || idea._assignments.find(a => {
              // Secondary fallback: match by shop name substring
              const shopName = (a._shop_name || '').toLowerCase();
              if (fillPlatform === 'amazon') return shopName.includes('amazon') || shopName.includes('amz');
              if (fillPlatform === 'etsy') return shopName.includes('etsy');
              return false;
            }) || idea._assignments[0];
          }

          if (targetSa?.id) {
            console.log(`[Matrixty v9.5] Preview sync: assignment ${targetSa.id}, shop: ${targetSa._shop_name || 'unknown'}`, assignmentUpdate);
            // v9.5: ALWAYS update local data first (so UI stays consistent even if DB sync fails)
            Object.assign(targetSa, { title, tag: tagStr, listed_by: memberName, listed_at: now });
            if (extractedAsin) targetSa.child_asin = extractedAsin;
            if (extractedLink) targetSa.publish_link = extractedLink;
            // Then sync to DB
            syncOk = await updateAssignment(targetSa.id, assignmentUpdate);
            if (syncOk) {
              console.log(`[Matrixty v9.5] ✅ Preview assignment synced OK`);
            } else {
              console.error(`[Matrixty v9.5] ❌ Preview assignment sync FAILED for ID ${targetSa.id}`, window._lastPatchResult);
            }
          } else {
            console.warn('[Matrixty v9.5] Preview: No assignment found!', {
              shopFilter: selectedShopFilter, platform: fillPlatform,
              assignmentCount: idea._assignments?.length || 0,
              shopNames: idea._assignments?.map(a => a._shop_name) || [],
            });
          }

          // Update local idea data (always — so UI shows latest)
          idea.assignment_title = title;
          idea.assignment_tag = tagStr;
          idea.listed_by = memberName;
          idea.listed_at = now;
          if (extractedAsin) idea.child_asin = extractedAsin;
          if (extractedLink) idea.publish_link = extractedLink;

          // Also update allIdeas cache entry
          const ideaIdSync = idea.idea_id || idea.id;
          const cachedIdeaSync = allIdeas.find(i => (i.idea_id || i.id) === ideaIdSync);
          if (cachedIdeaSync && cachedIdeaSync !== idea) {
            cachedIdeaSync.assignment_title = title;
            cachedIdeaSync.assignment_tag = tagStr;
            cachedIdeaSync.listed_by = memberName;
            cachedIdeaSync.listed_at = now;
            if (extractedAsin) cachedIdeaSync.child_asin = extractedAsin;
            if (extractedLink) cachedIdeaSync.publish_link = extractedLink;
          }

          // Persist to chrome.storage.local
          if (typeof updateIdeasCache === 'function') {
            try { updateIdeasCache(); } catch(e) { console.warn('[Matrixty v9.4] updateIdeasCache error:', e); }
          }

          refreshIdeaCardAfterSync(idea, fillPlatform, extractedAsin, extractedLink);

          // v9.5: Mark as local save to prevent poll re-render wiping DOM updates
          window._lastLocalSaveTs = Date.now();

          if (syncOk) {
            btnAutofill.textContent = '✅ Synced!';
            showGenerateStatus('✅ Synced!' + (extractedAsin ? ` ASIN: ${extractedAsin}` : ''));
          } else if (!targetSa) {
            btnAutofill.textContent = '⚠ No assignment';
            showGenerateStatus('Filled but no shop assignment found to sync');
          } else {
            const patchErr = window._lastPatchResult;
            const errHint = patchErr?.likelyRLS ? ' (RLS)' : patchErr?.status ? ` (${patchErr.status})` : '';
            btnAutofill.textContent = `⚠ Sync failed${errHint}`;
            btnAutofill.title = patchErr?.error || 'Unknown error';
            showGenerateStatus(`Filled but sync failed${errHint} — data saved locally`);
          }
        } catch (syncErr) {
          console.error('[Matrixty v7.0.0] Sync after preview Auto-Fill failed:', syncErr);
          btnAutofill.textContent = 'Sent! (sync failed)';
          showGenerateStatus('Filled but sync failed: ' + syncErr.message);
        }

        setTimeout(() => {
          btnAutofill.style.background = '#7B1FA2';
          btnAutofill.textContent = 'Auto-Fill';
          hideGenerateStatus();
        }, 3000);
      } else {
        const errMsg = result?.error || 'Failed to communicate with page';
        showGenerateStatus('Error: ' + errMsg + '. Try reloading the page.');
      }
    } catch (err) {
      showGenerateStatus('Error: ' + err.message);
    } finally {
      btnAutofill.disabled = false;
      if (btnAutofill.textContent === 'Sending...') btnAutofill.textContent = 'Auto-Fill';
    }
  });

  // ===== HELPERS =====

  function showGenerateStatus(msg) { generateStatus.textContent = msg; generateStatus.style.display = 'block'; }
  function hideGenerateStatus() { generateStatus.style.display = 'none'; }

  // ═══ v8.1.0: TRADEMARK WARNING MODAL ═══
  let _tmModalResolve = null;

  function showTrademarkWarningModal(title, matches, isBlock) {
    // Remove old modal if any
    let existing = document.getElementById('tm-warning-modal');
    if (existing) existing.remove();

    const blockMatches = matches.filter(m => m.severity === 'block');
    const warnMatches = matches.filter(m => m.severity !== 'block');

    const modal = document.createElement('div');
    modal.id = 'tm-warning-modal';
    modal.className = 'tm-modal-overlay';

    const highlightedTitle = highlightTrademarkInTitle(title, matches);

    let matchList = '';
    for (const m of matches) {
      const icon = m.severity === 'block' ? '⛔' : '⚠️';
      const cls = m.severity === 'block' ? 'tm-match-block' : 'tm-match-warn';
      const ownerText = m.owner ? ` — ${m.owner}` : '';
      const notesText = m.notes ? `<div class="tm-match-notes">${m.notes}</div>` : '';
      matchList += `<div class="tm-match-item ${cls}">${icon} <strong>${m.matchedText || m.content}</strong>${ownerText} <span class="tm-match-type">[${m.matchType}]</span>${notesText}</div>`;
    }

    modal.innerHTML = `
      <div class="tm-modal-box">
        <div class="tm-modal-header ${isBlock ? 'tm-header-block' : 'tm-header-warn'}">
          <span class="tm-modal-icon">${isBlock ? '⛔' : '⚠️'}</span>
          <span>${isBlock ? 'Trademark Bị Chặn!' : 'Cảnh Báo Trademark'}</span>
        </div>
        <div class="tm-modal-body">
          <div class="tm-title-preview">${highlightedTitle}</div>
          <div class="tm-match-list">${matchList}</div>
          <div class="tm-modal-instruction">
            ${isBlock
              ? '<p>❌ Title chứa từ <strong>bị chặn (BLOCK)</strong>. Bạn phải chỉnh sửa title và xóa các từ vi phạm trước khi Auto Fill.</p>'
              : '<p>⚠️ Title chứa từ có <strong>cảnh báo trademark</strong>. Bạn nên chỉnh sửa nhưng có thể tiếp tục nếu chắc chắn.</p>'
            }
          </div>
        </div>
        <div class="tm-modal-footer">
          ${isBlock
            ? '<button class="tm-btn tm-btn-edit" id="tm-btn-close">✏️ Sửa Title</button>'
            : '<button class="tm-btn tm-btn-edit" id="tm-btn-cancel">✏️ Sửa Title</button><button class="tm-btn tm-btn-continue" id="tm-btn-continue">⚡ Tiếp tục Auto Fill</button>'
          }
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // Event handlers
    const btnClose = modal.querySelector('#tm-btn-close');
    const btnCancel = modal.querySelector('#tm-btn-cancel');
    const btnContinue = modal.querySelector('#tm-btn-continue');

    if (btnClose) btnClose.addEventListener('click', () => { modal.remove(); if (_tmModalResolve) { _tmModalResolve('cancel'); _tmModalResolve = null; } });
    if (btnCancel) btnCancel.addEventListener('click', () => { modal.remove(); if (_tmModalResolve) { _tmModalResolve('cancel'); _tmModalResolve = null; } });
    if (btnContinue) btnContinue.addEventListener('click', () => { modal.remove(); if (_tmModalResolve) { _tmModalResolve('continue'); _tmModalResolve = null; } });

    // Click backdrop to close
    modal.addEventListener('click', (e) => {
      if (e.target === modal) { modal.remove(); if (_tmModalResolve) { _tmModalResolve('cancel'); _tmModalResolve = null; } }
    });

    // Show status
    if (isBlock) {
      showGenerateStatus('⛔ Trademark bị chặn — sửa title rồi nhấn Auto Fill lại');
    } else {
      showGenerateStatus('⚠️ Cảnh báo trademark — kiểm tra trước khi Auto Fill');
    }
  }

  function waitTrademarkModalChoice() {
    return new Promise(resolve => { _tmModalResolve = resolve; });
  }

  async function checkAccess(email) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/check_extension_access`, { method: 'POST', headers: HDR, body: JSON.stringify({ member_email: email }) });
      return await res.json();
    } catch (e) {
      console.warn('[Matrixty] checkAccess fetch error:', e);
      return null;
    }
  }

  // v9.2: Try to resume existing crawl session without re-crawling
  function tryCrawlResume() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (!tabs[0]) return;
      chrome.tabs.sendMessage(tabs[0].id, { type: 'RESUME_CRAWL' }, (r) => {
        if (chrome.runtime.lastError || !r) return;
        if (r.ok && r.resumed && r.productCount > 0) {
          console.log(`[Matrixty v9.2] Crawl resumed: ${r.productCount} products, mode=${r.mode}`);
          _lastCrawlMode = r.mode;
          // Highlight the active mode button
          document.querySelectorAll('.mode-btn[data-mode]').forEach(b => {
            if (b.dataset.mode === r.mode) {
              b.style.borderColor = '#1565C0'; b.style.background = 'rgba(21,101,192,0.04)';
            } else {
              b.style.borderColor = '#EEEDEA'; b.style.background = '#fff';
            }
          });
          refreshStatus();
        }
      });
    });
  }

  function refreshStatus() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_STATUS' }, (r) => {
        if (chrome.runtime.lastError || !r) return;
        document.getElementById('st-platform').textContent = r.platform || '--';
        document.getElementById('st-products').textContent = r.productCount || '0';
        document.getElementById('st-selected').textContent = r.selectedCount ?? r.newCount ?? '0';
        document.getElementById('st-mode').textContent = MODE_LABELS[r.mode] || '--';
        document.querySelectorAll('.mode-btn[data-mode]').forEach(b => {
          if (b.dataset.mode === r.mode) {
            b.style.borderColor = '#1565C0'; b.style.background = 'rgba(21,101,192,0.04)';
          } else {
            b.style.borderColor = '#EEEDEA'; b.style.background = '#fff';
          }
        });
      });
    });
  }

  function refreshListingStatus() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_LISTING_STATUS' }, (r) => {
        if (chrome.runtime.lastError || !r) return;
        const el = document.getElementById('st-listing');
        if (!el) return;
        if (r.isPasting) el.textContent = 'Pasting...';
        else if (r.sidebarOpen) el.textContent = `Sidebar (${r.fieldsDetected || 0} fields)`;
        else if (r.platform && r.platform !== 'unknown') el.textContent = r.platform;
        else el.textContent = '--';
      });
    });
  }

  function refreshClipartStatus() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_CLIPART_STATUS' }, (r) => {
        if (chrome.runtime.lastError || !r) return;
        const el = document.getElementById('st-clipart');
        if (!el) return;
        if (r.isScanning) el.textContent = 'Scanning...';
        else if (r.hasScan) el.textContent = `Done: ${r.categoryCount} groups`;
        else el.textContent = 'Not scanned';
      });
    });
  }

  // ===== STUDIO TASKS — Show assigned tasks from Clipart Studio =====
  let _studioActiveTaskId = null; // Currently selected task for sync linking

  async function loadStudioTasks() {
    if (!currentUser?.id) return;
    const listEl = document.getElementById('studio-tasks-list');
    const countEl = document.getElementById('studio-tasks-count');
    if (!listEl) return;

    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/clipart_studio_tasks?assigned_to=eq.${currentUser.id}&status=in.(assigned,in_progress,revision)&order=created_at.desc&limit=20`,
        { headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } }
      );
      if (!res.ok) { listEl.innerHTML = '<div style="text-align:center;padding:8px;color:#EF4444;font-size:11px;">Lỗi tải tasks</div>'; return; }

      const tasks = await res.json();
      if (!tasks || tasks.length === 0) {
        listEl.innerHTML = '<div style="text-align:center;padding:12px 0;color:#9CA3AF;font-size:11px;">Chưa có task nào được giao</div>';
        if (countEl) countEl.style.display = 'none';
        return;
      }

      if (countEl) { countEl.textContent = tasks.length; countEl.style.display = 'inline'; }

      const STATUS_MAP = {
        assigned: { label: 'Chờ làm', color: '#6366F1', bg: '#EEF2FF' },
        in_progress: { label: 'Đang làm', color: '#D97706', bg: '#FFF7ED' },
        revision: { label: 'Cần sửa', color: '#DC2626', bg: '#FEF2F2' },
      };

      listEl.innerHTML = tasks.map(task => {
        const st = STATUS_MAP[task.status] || { label: task.status, color: '#6B7280', bg: '#F3F4F6' };
        const isActive = task.id === _studioActiveTaskId;
        let domain = '';
        try { domain = new URL(task.source_url).hostname.replace(/^www\./, ''); } catch {}
        return `
          <div class="studio-task-card" data-task-id="${task.id}" data-source-url="${task.source_url || ''}"
            style="padding:10px 12px;border-radius:8px;cursor:pointer;border:1.5px solid ${isActive ? '#6366F1' : '#E5E7EB'};
            background:${isActive ? '#F5F3FF' : '#fff'};transition:all 0.15s;">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
              <span style="font-size:12px;font-weight:600;color:#1a1a1a;">${task.title || 'Untitled'}</span>
              <span style="font-size:9px;padding:2px 6px;border-radius:6px;font-weight:600;background:${st.bg};color:${st.color};">${st.label}</span>
            </div>
            <div style="display:flex;gap:8px;font-size:10px;color:#6B7280;">
              ${task.niche ? '<span>' + task.niche + '</span>' : ''}
              ${task.clipart_type ? '<span>· ' + task.clipart_type + '</span>' : ''}
              ${domain ? '<span>· ' + domain + '</span>' : ''}
            </div>
            ${task.status === 'revision' && task.reject_reason ? '<div style="font-size:10px;color:#DC2626;margin-top:4px;">❌ ' + (task.reject_reason.length > 50 ? task.reject_reason.substring(0, 50) + '...' : task.reject_reason) + '</div>' : ''}
          </div>
        `;
      }).join('');

      // Click handlers for task cards
      listEl.querySelectorAll('.studio-task-card').forEach(card => {
        card.addEventListener('click', () => {
          const taskId = card.dataset.taskId;
          const sourceUrl = card.dataset.sourceUrl;

          // Set as active task for sync linking
          _studioActiveTaskId = taskId;
          // Save to chrome storage so content script can access
          chrome.storage.local.set({ studioActiveTaskId: taskId, studioActiveSourceUrl: sourceUrl });

          // Highlight active card
          listEl.querySelectorAll('.studio-task-card').forEach(c => {
            c.style.border = '1.5px solid #E5E7EB';
            c.style.background = '#fff';
          });
          card.style.border = '1.5px solid #6366F1';
          card.style.background = '#F5F3FF';

          // Open source URL in current tab
          if (sourceUrl) {
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
              if (tabs[0]) {
                chrome.tabs.update(tabs[0].id, { url: sourceUrl });
              }
            });
          }
        });
      });

      // Auto-select first in_progress or assigned task
      if (!_studioActiveTaskId && tasks.length > 0) {
        const inProgress = tasks.find(t => t.status === 'in_progress');
        const first = inProgress || tasks[0];
        _studioActiveTaskId = first.id;
        chrome.storage.local.set({ studioActiveTaskId: first.id, studioActiveSourceUrl: first.source_url || '' });
        const firstCard = listEl.querySelector(`[data-task-id="${first.id}"]`);
        if (firstCard) { firstCard.style.border = '1.5px solid #6366F1'; firstCard.style.background = '#F5F3FF'; }
      }

    } catch (err) {
      console.error('[Matrixty] loadStudioTasks error:', err);
      listEl.innerHTML = '<div style="text-align:center;padding:8px;color:#EF4444;font-size:11px;">Lỗi: ' + err.message + '</div>';
    }
  }

  // ===== SHOW MAIN VIEW (Tab-based) =====

  function showMainView(user) {
    if (loginView) loginView.classList.add('hidden');
    if (mainView) mainView.classList.remove('hidden');
    // v8.1.0: Pre-fetch trademark warnings on login
    fetchTrademarkWarnings().catch(() => {});
    const n = user.name || user.email || '?';
    const elName = document.getElementById('user-name');
    const elEmail = document.getElementById('user-email');
    const elRole = document.getElementById('user-role');
    const elAvatar = document.getElementById('user-avatar');
    if (elName) elName.textContent = n;
    if (elEmail) elEmail.textContent = user.email || '';
    if (elRole) elRole.textContent = user.role || '';
    if (elAvatar) elAvatar.textContent = n.charAt(0).toUpperCase();

    const hasCrawl = user.crawl_access === true;
    const hasClipart = user.clipart_access === true;
    const hasListing = user.listing_access === true;
    const userRole = (user.role || '').toLowerCase();
    const isAdmin = userRole === 'admin' || userRole === 'owner';

    console.log('[Matrixty v7.0.0] showMainView permissions:', {
      hasCrawl, hasClipart, hasListing, isAdmin, role: user.role,
      assigned_shops: user.assigned_shops?.length || 0,
    });

    // Show/hide tab buttons based on access
    const tabCrawl = document.getElementById('tab-crawl');
    const tabClipart = document.getElementById('tab-clipart');
    const tabListing = document.getElementById('tab-listing');

    if (tabCrawl) tabCrawl.classList.toggle('hidden', !(hasCrawl || isAdmin));
    if (tabClipart) tabClipart.classList.toggle('hidden', !(hasClipart || isAdmin));
    if (tabListing) tabListing.classList.toggle('hidden', !(hasListing || isAdmin));

    const visibleTabs = [hasCrawl || isAdmin, hasClipart || isAdmin, hasListing || isAdmin].filter(Boolean);

    // If only 1 tab visible, hide tab bar entirely
    if (visibleTabs.length <= 1) {
      if (tabBar) tabBar.classList.add('hidden');
    } else {
      if (tabBar) tabBar.classList.remove('hidden');
    }

    // If no access at all
    if (visibleTabs.length === 0) {
      if (noAccess) noAccess.classList.remove('hidden');
      if (tabBar) tabBar.classList.add('hidden');
      return;
    }
    if (noAccess) noAccess.classList.add('hidden');

    // Auto-select default tab based on user permissions
    // Build allowed tabs map for permission check
    const allowedTabs = {
      crawl: hasCrawl || isAdmin,
      clipart: hasClipart || isAdmin,
      listing: hasListing || isAdmin,
    };

    let defaultTab = 'crawl';
    if (allowedTabs.listing) defaultTab = 'listing';
    else if (allowedTabs.crawl) defaultTab = 'crawl';
    else if (allowedTabs.clipart) defaultTab = 'clipart';

    // ═══ v7.0.5: Use PRE-LOADED state (already read in single storage call) ═══
    const state = window._matrixtyPreloadedState || null;
    const preloadedFromCache = window._matrixtyPreloadedCache || false;
    const cacheAge = window._matrixtyCacheAge || Infinity;
    // Clean up temp globals
    delete window._matrixtyPreloadedState;
    delete window._matrixtyPreloadedCache;
    // Keep _matrixtyCacheAge for loadListingIdeas to use

    // Validate state age (< 30 min)
    const stateValid = state && (Date.now() - (state.timestamp || 0) < 30 * 60 * 1000);

    const savedTab = stateValid ? state.activeTab : null;
    const restoredTab = (savedTab && (['crawl', 'clipart', 'listing'].includes(savedTab) && allowedTabs[savedTab]))
      ? savedTab : defaultTab;

    // ═══ FAST RESTORE: If cache is fresh + listing tab, render BEFORE switchTab ═══
    // This ensures listing zone already has content when it becomes visible
    const QUICK_REOPEN_TTL = 30 * 60 * 1000; // v9.2: Match cache TTL — instant restore for full 30 min
    if (preloadedFromCache && allIdeas.length > 0 && cacheAge < QUICK_REOPEN_TTL) {
      // Pre-render ideas synchronously (displayIdeas is async, but we need it NOW)
      if (listingLoading) listingLoading.classList.add('hidden');
      // Build groups + filters synchronously
      allIdeasGrouped = {};
      window._shopIdeaCounts = {};
      allIdeas.forEach(idea => {
        const shopKey = idea.shop_name || '(Unassigned)';
        if (!allIdeasGrouped[shopKey]) allIdeasGrouped[shopKey] = [];
        allIdeasGrouped[shopKey].push(idea);
        const assignedNames = idea._assignedShopNames?.length > 0 ? idea._assignedShopNames : [shopKey];
        assignedNames.forEach(sn => { window._shopIdeaCounts[sn] = (window._shopIdeaCounts[sn] || 0) + 1; });
      });
      buildShopFilterOptions();
      buildStatusCounts(allIdeas, 'all');
      buildAdvancedFilterOptions();
      filteredIdeas = allIdeas;
      currentPage = 1;

      // Restore state SYNCHRONOUSLY (no await)
      if (stateValid && state) {
        if (state.statusFilter && state.statusFilter !== 'all') {
          statusFilter = state.statusFilter;
          document.querySelectorAll('.st-chip[data-status]').forEach(c => {
            c.classList.toggle('active', c.dataset.status === statusFilter);
          });
        }
        if (state.selectedShopFilter && state.selectedShopFilter !== 'all') {
          selectedShopFilter = state.selectedShopFilter;
          if (listingShopFilter) listingShopFilter.value = state.selectedShopFilter;
        }
        if (state.variantFilter && state.variantFilter !== 'all') {
          variantFilter = state.variantFilter;
          const fv = document.getElementById('filter-variant');
          if (fv) fv.value = state.variantFilter;
        }
        if (state.nicheFilter && state.nicheFilter !== 'all') {
          nicheFilter = state.nicheFilter;
          if (filterNiche) filterNiche.value = state.nicheFilter;
        }
        if (state.sourceFilter && state.sourceFilter !== 'all') {
          sourceFilter = state.sourceFilter;
          if (filterSource) filterSource.value = state.sourceFilter;
        }
        if (state.teamFilter && state.teamFilter !== 'all') {
          teamFilter = state.teamFilter;
          if (filterTeam) filterTeam.value = state.teamFilter;
        }
        if (state.memberFilter && state.memberFilter !== 'all') {
          memberFilter = state.memberFilter;
          if (filterMember) filterMember.value = state.memberFilter;
        }
        if (state.assignedFilter && state.assignedFilter !== 'all') {
          assignedFilter = state.assignedFilter;
          if (filterAssigned) filterAssigned.value = state.assignedFilter;
        }
        if (state.selectedDateFilter && state.selectedDateFilter !== 'all_time' && state.selectedDateFilter !== 'all') {
          selectedDateFilter = state.selectedDateFilter;
          if (listingDateFilter) listingDateFilter.value = state.selectedDateFilter;
        }
        if (state.searchQuery && listingSearch) {
          listingSearch.value = state.searchQuery;
        }
        if (state.advancedFiltersOpen) {
          advancedFiltersOpen = true;
          const advPanel = document.getElementById('adv-filters-panel');
          if (advPanel) advPanel.classList.remove('hidden');
          const toggleBtn2 = document.getElementById('toggle-adv-filters');
          if (toggleBtn2) toggleBtn2.classList.add('active');
        }
        // Apply all filters
        applyFilters();
        if (state.currentPage > 1) currentPage = state.currentPage;
      }

      // Render page
      renderCurrentPage();

      // Restore selected idea
      const restoredIdeaId = stateValid ? state?.selectedIdeaId : null;
      if (restoredIdeaId) {
        const restoredIdx = allIdeas.findIndex(i => i.idea_id === restoredIdeaId);
        if (restoredIdx >= 0) {
          const filteredIdx = filteredIdeas.findIndex(i => i.idea_id === restoredIdeaId);
          if (filteredIdx >= 0) {
            const ideaPage = Math.floor(filteredIdx / PAGE_SIZE) + 1;
            if (ideaPage !== currentPage) { currentPage = ideaPage; renderCurrentPage(); }
          }
          const wasMiniLabOpen = state?.miniLabOpen === true;
          if (wasMiniLabOpen) {
            setTimeout(() => quickFillIdea(restoredIdx, state?.miniLabData || null), 100);
          } else {
            setTimeout(() => {
              const ideaItem = listingIdeas.querySelector(`.listing-idea-item[data-idx="${restoredIdx}"]`);
              if (ideaItem) { ideaItem.classList.add('selected'); ideaItem.scrollIntoView({ block: 'center', behavior: 'instant' }); }
              if (state?.expandedDetails?.length) {
                state.expandedDetails.forEach(id => {
                  const summary = document.querySelector(`[data-expand="${id}"]`);
                  if (summary) summary.classList.add('expanded');
                });
              }
            }, 50);
          }
        }
      } else {
        // v9.5: No selected idea — restore expanded panels + scroll position
        setTimeout(() => {
          if (stateValid && state?.expandedDetails?.length) {
            state.expandedDetails.forEach(id => {
              const summary = document.querySelector(`[data-expand="${id}"]`);
              if (summary) summary.classList.add('expanded');
            });
          }
          if (stateValid && state?.scrollTop > 0 && listingIdeas) {
            listingIdeas.scrollTop = state.scrollTop;
          }
        }, 50);
      }

      // Mark restore as done
      hasRestoredOnce = true;
      isRestoring = false;

      // v9.2: Restore crawl mode
      if (stateValid && state?.crawlMode) _lastCrawlMode = state.crawlMode;

      console.log(`[Matrixty] ⚡ INSTANT RESTORE: ${allIdeas.length} ideas, page ${currentPage}, tab ${restoredTab} (${Math.round(cacheAge/1000)}s old)`);

      // Now switch tab (listing zone already has content)
      switchTab(restoredTab);

      // Skip heavy loadListingIdeas — just start background sync
      if (hasListing || isAdmin) {
        detectPlatformOnTab();
        startRealtimeSubscription();
        // SAFETY: Only force fresh fetch if TOTAL data is empty (not just filtered results)
        // v9.2: filteredIdeas can be 0 due to user's active filters — don't nuke cache for that
        if (allIdeas.length === 0) {
          console.warn('[Matrixty] ⚠️ Instant restore has 0 total ideas — forcing fresh fetch');
          hasRestoredOnce = false;
          chrome.storage.local.remove([CACHE_KEY]);
          loadListingIdeas();
        } else if (cacheAge > 2 * 60 * 1000) {
          // Background refresh if cache > 2 min
          console.log('[Matrixty] Background refresh for stale cache...');
          loadListingIdeas(); // Will skip displayIdeas since hasRestoredOnce=true
        }
      }
    } else {
      // No cache or stale cache — use normal flow
      console.log(`[Matrixty] No valid cache (preloaded=${preloadedFromCache}, ideas=${allIdeas.length}, cacheAge=${Math.round(cacheAge/1000)}s) — normal flow`);
      console.log(`[Matrixty DEBUG] hasListing=${hasListing}, isAdmin=${isAdmin}, user.role="${user.role}", listing_access=${user.listing_access}`);
      // v9.2: Restore crawl mode even without cache
      if (stateValid && state?.crawlMode) _lastCrawlMode = state.crawlMode;
      switchTab(restoredTab);
      if (hasListing || isAdmin) {
        detectPlatformOnTab();
        loadListingIdeas();
      } else {
        console.warn('[Matrixty DEBUG] loadListingIdeas NOT called — no listing access');
      }
    }

    pushAuth(user);
    refreshStatus();
    setInterval(refreshStatus, 3000);
    setInterval(refreshClipartStatus, 5000);
    if (hasListing || isAdmin) setInterval(refreshListingStatus, 5000);

    // v7.0.4: Start Supabase Realtime subscription for bi-directional sync
    // (instant restore path already started it above, startRealtimeSubscription handles dedup)
    if ((hasListing || isAdmin) && !_pollTimer) {
      startRealtimeSubscription();
    }
  }

  function pushAuth(user) {
    send({
      type: 'AUTH_UPDATED',
      config: {
        supabaseUrl: SUPABASE_URL, supabaseKey: SUPABASE_ANON_KEY,
        userId: user.id, userEmail: user.email, userName: user.name,
        crawlAccess: user.crawl_access === true,
        clipartAccess: user.clipart_access === true,
        listingAccess: user.listing_access === true,
      }
    });
  }

  function showError(msg) { loginError.textContent = msg; loginError.style.display = 'block'; }
  function send(msg) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) chrome.tabs.sendMessage(tabs[0].id, msg, () => { if (chrome.runtime.lastError) {} });
    });
  }

  document.getElementById('login-password').addEventListener('keydown', (e) => { if (e.key === 'Enter') loginBtn.click(); });

  // ===== ẢNH PHỤ (SECONDARY IMAGES) MODULE =====

  let _apTemplates = [];
  let _apFiltered = [];
  let _apSelected = []; // { templateId, imageIndex, imageUrl, fileName, base64 }
  let _apLoaded = false;
  const _apThumbCache = {}; // url → base64 data URL cache

  function apParseImages(thumbnailUrl) {
    if (!thumbnailUrl) return [];
    if (typeof thumbnailUrl === 'string') {
      try {
        const parsed = JSON.parse(thumbnailUrl);
        if (Array.isArray(parsed)) return parsed.filter(u => typeof u === 'string' && u.trim());
      } catch (e) {}
      if (thumbnailUrl.startsWith('http')) return [thumbnailUrl];
    }
    if (Array.isArray(thumbnailUrl)) return thumbnailUrl.filter(u => typeof u === 'string' && u.trim());
    return [];
  }

  // [v1.2 REMOVED] ===== ANHPHU + PIC MODULES DISABLED =====
  // All image crawl/fill/ảnh phụ/pic features removed in v1.2.
  // Functions below are dead code — kept as stubs to prevent JS errors from DOM references.

  function apLoadImageViaProxy(url) { return Promise.resolve(null); }
  function apFetch() { return Promise.resolve([]); }
  function apFilter() {}
  function apRender() {}
  function apToggleSelect() {}
  function apUpdateActions() {}
  async function apAutoFill() {}
  async function loadAnhPhuTemplates() {}
  function loadPicImages() {}
  function updatePicBadge() {}
  function startPicRealtime() {}

  // [v1.2 REMOVED] All AnhPhu + Pic implementations removed.
  // Stubs above prevent JS errors. No further code needed.

  // [v1.2] Dead code fully removed — function declarations inside if(false)
  // still get hoisted in non-strict JS, overriding stubs above and causing errors.

  void 0; // ===== ~680 lines of AnhPhu + Pic code deleted in v1.2 =====

});
// ===== END OF popup.js =====
