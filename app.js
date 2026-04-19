// =============================================
// JACSAW NEXUS — app.js  (módulo ES)
// =============================================
// NOTA: al ser type="module", las funciones NO son globales
// automáticamente. Las que usan onclick en HTML se exponen
// explícitamente en window al final del archivo.

import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getFirestore, collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ── Firebase (reutiliza la instancia de _nx.js si ya existe) ──
const _fbCfg = {
    apiKey:    'AIzaSyDIkK8fuOIvbAZ362AG_-FSvbPXOpTR5Bc',
    authDomain:'jacsaw-nexus.firebaseapp.com',
    projectId: 'jacsaw-nexus',
};
const _fbApp = getApps().length ? getApps()[0] : initializeApp(_fbCfg);
const db     = getFirestore(_fbApp);

// ── STATE ─────────────────────────────────────────────────────
const STATE = {
    categories:  new Set(['ALL']),
    sort:        'DEFAULT',
    view:        'grid',
    trustFilter: 'ALL',
    search:      '',
    statsOpen:   false,
};

// ── POPULARITY (async desde Firestore) ────────────────────────
let _popularityMap = {};

// ── DATOS (cargados exclusivamente desde Firestore) ───────────
let NEXUS_DATA_DEFAULT = [];

let DOM = {};

// ── PERSISTENCIA LOCAL ─────────────────────────────────────────
let favorites       = loadJSON('nexus_favorites', []);
let searchHistory   = loadJSON('nexus_history',   []);
let customResources = loadJSON('nexus_custom',     []);
let hiddenIds       = loadJSON('nexus_hidden',     []);
let overrides       = loadJSON('nexus_overrides',  {});
let theme           = localStorage.getItem('nexus_theme') || 'dark';

function loadJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
}
function saveJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
}

// ── CARGAR DATOS DE FIRESTORE ──────────────────────────────────
async function loadNexusData() {
    try {
        const snap  = await getDocs(collection(db, '_games'));
        const games = [];
        snap.forEach(d => {
            const id = parseInt(d.id, 10);
            if (!Number.isFinite(id)) return;
            games.push({ id, ...d.data() });
        });
        // Ordenar por nombre
        games.sort((a, b) => a.name.localeCompare(b.name, 'es'));
        NEXUS_DATA_DEFAULT = games;
        return games;
    } catch (err) {
        console.error('[app] Error cargando datos de Firestore:', err.message);
        NEXUS_DATA_DEFAULT = [];
        return [];
    }
}

// ── COMPUTED DATA ──────────────────────────────────────────────
function getAllResources() {
    const hiddenSet = new Set(hiddenIds);
    const defaults  = NEXUS_DATA_DEFAULT
        .filter(r => !hiddenSet.has(r.id))
        .map(r => overrides[r.id] ? { ...r, ...overrides[r.id] } : r);
    return [...defaults, ...customResources];
}

// ============================================================
// THEME
// ============================================================
function initTheme() {
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('btn-theme');
    if (btn) btn.textContent = theme === 'dark' ? '☀' : '☾';
}
function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('nexus_theme', theme);
    initTheme();
}

// ============================================================
// VIEW
// ============================================================
function toggleView() {
    STATE.view = STATE.view === 'grid' ? 'list' : 'grid';
    document.getElementById('btn-view').textContent = STATE.view === 'grid' ? '▤' : '⊞';
    render();
}

// ============================================================
// HELPERS
// ============================================================
function getTrustColor(score) {
    if (score >= 4) return 'var(--success)';
    if (score === 3) return 'var(--warning)';
    return 'var(--danger)';
}
function getTrustLabel(score) {
    return ['', 'Peligroso', 'Dudoso', 'Aceptable', 'Confiable', 'Verificado'][score] || '?';
}
function esc(text) {
    return String(text)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function highlight(text, term) {
    if (!term) return esc(text);
    const escaped  = esc(text);
    const safeTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return escaped.replace(new RegExp(`(${safeTerm})`, 'gi'), '<mark class="hl">$1</mark>');
}
function fmtCount(n) {
    if (!n || n === 0) return null;
    if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
    return String(n);
}

// ============================================================
// FAVORITES
// ============================================================
function saveFavorites() {
    saveJSON('nexus_favorites', favorites);
    if (window._nx && _nx.user()) _nx.saveFavs(favorites).catch(() => {});
}
function updateFavCount() {
    const el = document.getElementById('sidebar-fav-count');
    if (el) el.textContent = favorites.length > 0 ? favorites.length : '';
}
async function toggleFavorite(id) {
    const u = window._nx ? _nx.user() : null;
    if (!u) {
        const want = await showConfirm(
            'Inicia sesión para guardar favoritos en la nube.\n\n¿Iniciar sesión con Google?'
        );
        if (want && window._nx) { _nx.login(); return; }
    }
    if (favorites.includes(id)) {
        favorites = favorites.filter(f => f !== id);
    } else {
        favorites.push(id);
    }
    saveFavorites();
    updateFavCount();
    document.querySelectorAll(`.btn-fav[data-id="${id}"]`).forEach(btn => {
        const isFav = favorites.includes(id);
        btn.classList.toggle('is-fav', isFav);
        btn.textContent = isFav ? '★' : '☆';
        btn.title = isFav ? 'Quitar de favoritos' : 'Añadir a favoritos';
    });
    if (STATE.categories.has('FAVORITES')) render();
}

// ============================================================
// COPY URL
// ============================================================
function copyUrl(url, btn) {
    navigator.clipboard.writeText(url).then(() => {
        const orig = btn.textContent;
        btn.textContent = '✓';
        btn.classList.add('copied');
        setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 1500);
        showToast('URL copiada al portapapeles', 'success');
    }).catch(() => showToast('No se pudo copiar la URL', 'error'));
}

// ============================================================
// SHARE FILTER
// ============================================================
function shareFilter() {
    const params = new URLSearchParams();
    if (STATE.search) params.set('q', STATE.search);
    const cats = [...STATE.categories].filter(c => c !== 'ALL');
    if (cats.length) params.set('cats', cats.join(','));
    if (STATE.sort !== 'DEFAULT') params.set('sort', STATE.sort);
    if (STATE.trustFilter !== 'ALL') params.set('trust', STATE.trustFilter);
    const url = `${location.origin}${location.pathname}${params.size ? '?' + params : ''}`;
    navigator.clipboard.writeText(url)
        .then(() => showToast('¡Enlace copiado!', 'success'))
        .catch(() => showToast('No se pudo copiar el enlace', 'error'));
    history.pushState(null, '', url);
}

// ============================================================
// URL PARAMS
// ============================================================
function readUrlParams() {
    const p = new URLSearchParams(location.search);
    if (p.has('q')) {
        STATE.search = p.get('q');
        const el = document.getElementById('main-search');
        if (el) { el.value = STATE.search; document.getElementById('clear-search').style.display = 'flex'; }
    }
    if (p.has('cats')) STATE.categories = new Set(p.get('cats').split(',').filter(Boolean));
    if (p.has('sort')) {
        STATE.sort = p.get('sort');
        const sel = document.getElementById('sort-select');
        if (sel) sel.value = STATE.sort;
    }
    if (p.has('trust')) {
        STATE.trustFilter = p.get('trust');
        document.querySelectorAll('.trust-filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.trust === STATE.trustFilter);
        });
    }
}

// ============================================================
// SEARCH HISTORY
// ============================================================
function addToHistory(term) {
    if (!term || term.length < 2) return;
    searchHistory = [term, ...searchHistory.filter(h => h !== term)].slice(0, 8);
    saveJSON('nexus_history', searchHistory);
}
function showHistory(inputEl) {
    const container = document.getElementById('search-history');
    const query = inputEl.value.toLowerCase();
    const items = query
        ? searchHistory.filter(h => h.toLowerCase().includes(query))
        : searchHistory;
    if (!items.length) { hideHistory(); return; }
    container.innerHTML =
        `<div class="history-label">HISTORIAL</div>` +
        items.map(h =>
            `<div class="history-item" onmousedown="window._appSelectHistory(${JSON.stringify(h)})">${highlight(h, query)}</div>`
        ).join('');
    container.classList.add('visible');
}
function hideHistory() {
    document.getElementById('search-history').classList.remove('visible');
}
function selectHistory(term) {
    const el = document.getElementById('main-search');
    el.value = term;
    STATE.search = term;
    document.getElementById('clear-search').style.display = 'flex';
    hideHistory();
    render();
}

// ============================================================
// FILTERING
// ============================================================
function filterByCategory(cat) {
    if (cat === 'ALL' || cat === 'FAVORITES') {
        STATE.categories = new Set([cat]);
    } else {
        STATE.categories.delete('ALL');
        STATE.categories.delete('FAVORITES');
        if (STATE.categories.has(cat)) {
            STATE.categories.delete(cat);
            if (STATE.categories.size === 0) STATE.categories.add('ALL');
        } else {
            STATE.categories.add(cat);
        }
    }
    updateCategoryChips();
    closeSidebar();
    render();
}
function updateCategoryChips() {
    document.querySelectorAll('.category-chip').forEach(el => {
        const cat = el.dataset.cat;
        const active =
            cat === 'ALL'       ? STATE.categories.has('ALL') :
            cat === 'FAVORITES' ? STATE.categories.has('FAVORITES') :
                                  STATE.categories.has(cat);
        el.classList.toggle('active', active);
    });
}
function setTrustFilter(level) {
    STATE.trustFilter = level;
    document.querySelectorAll('.trust-filter-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.trust === level);
    });
    render();
}

// ============================================================
// DATA FILTERING + SORTING
// ============================================================
function getFilteredData() {
    const all    = getAllResources();
    const term   = STATE.search.toLowerCase().trim();
    const favSet = new Set(favorites);
    return all.filter(item => {
        const matchSearch = !term ||
            item.name.toLowerCase().includes(term) ||
            item.category.toLowerCase().includes(term) ||
            (item.tags || []).some(t => t.toLowerCase().includes(term)) ||
            item.desc.toLowerCase().includes(term) ||
            (item.notes || '').toLowerCase().includes(term);

        const matchCat =
            STATE.categories.has('ALL')        ? true :
            STATE.categories.has('FAVORITES')  ? favSet.has(item.id) :
                                                 STATE.categories.has(item.category);

        const matchTrust =
            STATE.trustFilter === 'VERIFIED' ? item.trust >= 4 :
            STATE.trustFilter === 'SAFE'     ? item.trust >= 3 : true;

        return matchSearch && matchCat && matchTrust;
    });
}
function sortData(data) {
    const sorted = [...data];
    if      (STATE.sort === 'TRUST_DESC') sorted.sort((a, b) => b.trust - a.trust);
    else if (STATE.sort === 'TRUST_ASC')  sorted.sort((a, b) => a.trust - b.trust);
    else if (STATE.sort === 'NAME_ASC')   sorted.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    else if (STATE.sort === 'NAME_DESC')  sorted.sort((a, b) => b.name.localeCompare(a.name, 'es'));
    else if (STATE.sort === 'POPULAR')    sorted.sort((a, b) => (_popularityMap[b.id] || 0) - (_popularityMap[a.id] || 0));
    return sorted;
}

// ============================================================
// RENDER
// ============================================================
function render() {
    const grid     = DOM.resourceGrid || document.getElementById('resource-grid');
    const filtered = sortData(getFilteredData());
    const term     = STATE.search.trim();
    const info     = DOM.resultInfo  || document.getElementById('result-info');

    if (info) {
        const isFiltered = term || !STATE.categories.has('ALL') || STATE.trustFilter !== 'ALL';
        info.innerHTML = isFiltered
            ? `<strong>${filtered.length}</strong> recurso${filtered.length !== 1 ? 's' : ''} encontrado${filtered.length !== 1 ? 's' : ''}`
            : '';
    }

    grid.className = STATE.view === 'list' ? 'resource-list' : 'resource-grid';

    if (!filtered.length) {
        const isFav = STATE.categories.has('FAVORITES');
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">${isFav ? '★' : '⊘'}</div>
                <h3>${isFav ? 'Sin favoritos guardados' : 'Sin resultados'}</h3>
                <p>${isFav
                    ? 'Añade recursos a favoritos pulsando ☆ en cualquier card.'
                    : 'No hay recursos que coincidan.<br>Prueba a ajustar los filtros.'
                }</p>
            </div>`;
        return;
    }

    if (STATE.view === 'list') {
        grid.innerHTML =
            `<div class="list-header">
                <span>Recurso</span><span>Categoría</span>
                <span>Confianza</span><span>Tags</span><span>Acciones</span>
            </div>` +
            filtered.map(item => createListRow(item, term)).join('');
    } else {
        grid.innerHTML = filtered.map((item, i) => createCard(item, i, term)).join('');
    }
}

// ============================================================
// CREATE CARD
// ============================================================
function createCard(item, index, term = '') {
    const tc          = getTrustColor(item.trust);
    const isFav       = favorites.includes(item.id);
    const delay       = Math.min(index * 35, 400);
    const hasNotes    = item.notes && item.notes.trim();
    const clicks      = _popularityMap[item.id];
    const clicksLabel = fmtCount(clicks);
    const safeUrl     = esc(item.url);

    return `
<div class="card" style="animation-delay:${delay}ms">
    ${item.warn  ? `<div class="warning-strip">${esc(item.warn)}</div>` : ''}
    ${item.isNew ? `<div class="new-badge">NUEVO</div>` : ''}

    <div class="card-header">
        <span class="cat-badge" style="border-color:${item.color};color:${item.color}">${esc(item.category)}</span>
        <div style="display:flex;align-items:center;gap:8px">
            ${clicksLabel ? `<span class="visit-counter" data-rid="${item.id}" title="Visitas registradas">👁 ${clicksLabel}</span>` : ''}
            <div class="online-indicator"><span class="status-pulse"></span>ONLINE</div>
        </div>
    </div>

    <h3 class="card-title" onclick="_appOpenDetail(${item.id})">${highlight(item.name, term)}</h3>
    <p class="card-desc">${highlight(item.desc, term)}</p>

    <div class="trust-section">
        <div class="trust-label">
            <span>CONFIANZA</span>
            <span style="color:${tc}">${item.trust}/5 — ${getTrustLabel(item.trust)}</span>
        </div>
        <div class="trust-bar-bg">
            <div class="trust-bar-fill" style="width:${item.trust * 20}%;background:${tc}"></div>
        </div>
    </div>

    <div class="tag-container">
        ${(item.tags || []).map(t => `<span class="tag">${highlight(t, term)}</span>`).join('')}
    </div>

    ${hasNotes ? `
    <div class="notes-section">
        <button class="notes-toggle" onclick="_appToggleNotes(${item.id}, this)">
            <span class="notes-toggle-icon">›</span> Notas
        </button>
        <div class="notes-content" id="notes-content-${item.id}">
            <p class="notes-text">${esc(item.notes)}</p>
        </div>
    </div>` : ''}

    <div class="card-actions">
        <button class="btn-visit" onclick="_appTrackAndVisit(event,${item.id},${item.trust},'${safeUrl}')">VISITAR</button>
        <button class="btn-copy"  onclick="_appCopyUrl('${safeUrl}', this)" title="Copiar URL">⎘</button>
        <button class="btn-fav ${isFav ? 'is-fav' : ''}" data-id="${item.id}"
                onclick="_appToggleFav(${item.id})"
                title="${isFav ? 'Quitar de favoritos' : 'Añadir a favoritos'}">
            ${isFav ? '★' : '☆'}
        </button>
        <button class="btn-info" onclick="_appOpenDetail(${item.id})" title="Ver detalles">→</button>
    </div>
</div>`;
}

// ============================================================
// CREATE LIST ROW
// ============================================================
function createListRow(item, term = '') {
    const tc          = getTrustColor(item.trust);
    const isFav       = favorites.includes(item.id);
    const dots        = '■'.repeat(item.trust) + '□'.repeat(5 - item.trust);
    const clicks      = _popularityMap[item.id];
    const clicksLabel = fmtCount(clicks);
    const safeUrl     = esc(item.url);

    return `
<div class="list-row ${item.warn ? 'list-row--warn' : ''}">
    <div class="list-name" onclick="_appOpenDetail(${item.id})">
        ${item.isNew ? '<span class="new-badge new-badge--sm">N</span>' : ''}
        ${highlight(item.name, term)}
        ${clicksLabel ? `<span class="visit-counter visit-counter--sm" data-rid="${item.id}">👁 ${clicksLabel}</span>` : ''}
    </div>
    <div><span class="cat-badge" style="border-color:${item.color};color:${item.color}">${esc(item.category)}</span></div>
    <div class="list-trust" style="color:${tc}">
        <span style="letter-spacing:2px">${dots}</span>
        <span style="font-size:0.68rem;color:var(--text-tertiary)">${getTrustLabel(item.trust)}</span>
    </div>
    <div class="list-tags">${(item.tags || []).slice(0, 3).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
    <div class="list-actions">
        <button class="btn-visit btn-visit--sm" onclick="_appTrackAndVisit(event,${item.id},${item.trust},'${safeUrl}')">Visitar</button>
        <button class="btn-copy" onclick="_appCopyUrl('${safeUrl}', this)" title="Copiar URL">⎘</button>
        <button class="btn-fav ${isFav ? 'is-fav' : ''}" data-id="${item.id}"
                onclick="_appToggleFav(${item.id})">
            ${isFav ? '★' : '☆'}
        </button>
    </div>
</div>`;
}

// ============================================================
// NOTES TOGGLE
// ============================================================
function toggleNotes(id, btn) {
    const content = document.getElementById(`notes-content-${id}`);
    const icon    = btn.querySelector('.notes-toggle-icon');
    const isOpen  = content.classList.toggle('open');
    icon.style.transform = isOpen ? 'rotate(90deg)' : '';
}

// ============================================================
// SECURITY CHECK + VISIT TRACKING
// ============================================================
async function trackAndVisit(e, id, trust, url) {
    if (!await securityCheck(trust)) return;
    window.open(url, '_blank', 'noopener,noreferrer');
    if (window._nx) {
        _nx.updateUserPageVisit();
        _nx.trackVisit(id).then(() => {
            _popularityMap[id] = (_popularityMap[id] || 0) + 1;
            // Actualizar badges sin re-render completo
            document.querySelectorAll(`.visit-counter[data-rid="${id}"]`).forEach(el => {
                el.textContent = '👁 ' + fmtCount(_popularityMap[id]);
            });
        }).catch(() => {});
    }
}
async function securityCheck(score) {
    if (score <= 2) {
        return await showConfirm(
            'AVISO DE SEGURIDAD\n\n' +
            'Este sitio tiene baja reputación. Asegúrate de tener uBlock Origin activo ' +
            'y saber identificar falsos positivos en VirusTotal.\n\n¿Deseas continuar?'
        );
    }
    return true;
}

// ============================================================
// DETAIL MODAL
// ============================================================
function openDetailModal(id) {
    const item = getAllResources().find(r => r.id === id);
    if (!item) return;
    const tc          = getTrustColor(item.trust);
    const isFav       = favorites.includes(id);
    const dots        = '■'.repeat(item.trust) + '□'.repeat(5 - item.trust);
    const clicks      = _popularityMap[id];
    const clicksLabel = fmtCount(clicks);
    const safeUrl     = esc(item.url);

    document.getElementById('detail-modal-content').innerHTML = `
        <div class="detail-header">
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:0.6rem">
                <span class="cat-badge" style="border-color:${item.color};color:${item.color}">${esc(item.category)}</span>
                ${item.isNew ? '<span class="new-badge" style="position:relative;top:0;left:0;border-radius:3px">NUEVO</span>' : ''}
                ${item.warn  ? `<span class="warning-strip" style="position:relative;top:0;right:0;border-radius:3px">${esc(item.warn)}</span>` : ''}
                ${clicksLabel ? `<span class="visit-counter" data-rid="${id}" style="margin-left:auto">👁 ${clicksLabel} visitas</span>` : ''}
            </div>
            <h2 class="detail-title">${esc(item.name)}</h2>
            <div class="detail-trust" style="color:${tc}">
                <span style="letter-spacing:3px">${dots}</span>
                <span>${item.trust}/5 — ${getTrustLabel(item.trust)}</span>
            </div>
        </div>
        <p class="detail-desc">${esc(item.desc)}</p>
        ${item.notes ? `
        <div class="detail-section">
            <h4 class="detail-section-title">Notas</h4>
            <p class="detail-notes">${esc(item.notes)}</p>
        </div>` : ''}
        <div class="detail-section">
            <h4 class="detail-section-title">Tags</h4>
            <div class="tag-container">
                ${(item.tags || []).map(t => `<span class="tag">${esc(t)}</span>`).join('')}
            </div>
        </div>
        ${item.added ? `
        <div class="detail-section">
            <h4 class="detail-section-title">Añadido al índice</h4>
            <span style="font-family:var(--font-mono);font-size:0.75rem;color:var(--text-tertiary)">${esc(item.added)}</span>
        </div>` : ''}
        <div class="detail-actions">
            <button class="btn-visit" onclick="_appTrackAndVisit(event,${id},${item.trust},'${safeUrl}')" style="flex:1;text-align:center">
               VISITAR RECURSO
            </button>
            <button class="detail-copy" onclick="_appCopyUrl('${safeUrl}', this)">⎘ Copiar URL</button>
            <button class="btn-fav ${isFav ? 'is-fav' : ''}" data-id="${id}"
                    onclick="_appToggleFavModal(${id}, this)" style="width:42px">
                ${isFav ? '★' : '☆'}
            </button>
        </div>
    `;
    document.getElementById('detail-modal-overlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}
function toggleFavInModal(id, btn) {
    toggleFavorite(id);
    const isFav = favorites.includes(id);
    btn.classList.toggle('is-fav', isFav);
    btn.textContent = isFav ? '★' : '☆';
}
function closeDetailModal() {
    document.getElementById('detail-modal-overlay').classList.remove('active');
    document.body.style.overflow = '';
}

// ============================================================
// STATS PANEL
// ============================================================
function toggleStats() {
    STATE.statsOpen = !STATE.statsOpen;
    document.getElementById('stats-panel').classList.toggle('open', STATE.statsOpen);
    document.getElementById('btn-stats').classList.toggle('active', STATE.statsOpen);
    if (STATE.statsOpen) renderStats();
}
function renderStats() {
    const all      = getAllResources();
    const avg      = all.reduce((s, r) => s + r.trust, 0) / all.length;
    const newCount = all.filter(r => r.isNew).length;
    const catCounts = {};
    all.forEach(r => { catCounts[r.category] = (catCounts[r.category] || 0) + 1; });
    const catKeys = Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a]);
    const maxCat  = Math.max(...Object.values(catCounts));

    animCount('stat-total', all.length);
    animCount('stat-avg',   avg.toFixed(1), true);
    animCount('stat-cats',  catKeys.length);
    animCount('stat-new',   newCount);

    document.getElementById('stats-by-cat').innerHTML = catKeys.map(cat => `
        <div class="stats-bar-row">
            <span class="stats-label" title="${cat}">${cat}</span>
            <div class="stats-bar-track">
                <div class="stats-bar-fill" style="width:${((catCounts[cat] / maxCat) * 100).toFixed(0)}%"></div>
            </div>
            <span class="stats-count">${catCounts[cat]}</span>
        </div>`).join('');

    const trustCounts = { 1:0, 2:0, 3:0, 4:0, 5:0 };
    all.forEach(r => { if (trustCounts[r.trust] !== undefined) trustCounts[r.trust]++; });
    const trustColors = { 1:'var(--danger)', 2:'var(--danger)', 3:'var(--warning)', 4:'var(--success)', 5:'var(--success)' };
    const trustLabels = { 1:'Peligroso', 2:'Dudoso', 3:'Aceptable', 4:'Confiable', 5:'Verificado' };
    const maxTrust    = Math.max(...Object.values(trustCounts)) || 1;

    document.getElementById('stats-by-trust').innerHTML = [5,4,3,2,1].map(t => `
        <div class="stats-bar-row">
            <span class="stats-label" style="color:${trustColors[t]}">${t}★ ${trustLabels[t]}</span>
            <div class="stats-bar-track">
                <div class="stats-bar-fill" style="width:${((trustCounts[t]/maxTrust)*100).toFixed(0)}%;background:${trustColors[t]}"></div>
            </div>
            <span class="stats-count">${trustCounts[t]}</span>
        </div>`).join('');
}
function animCount(elId, target, isFloat = false) {
    const el  = document.getElementById(elId);
    if (!el) return;
    const num   = parseFloat(target);
    const start = performance.now();
    const dur   = 700;
    function step(now) {
        const p = Math.min((now - start) / dur, 1);
        const e = 1 - Math.pow(1 - p, 3);
        el.textContent = isFloat ? (num * e).toFixed(1) : Math.round(num * e);
        if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

// ============================================================
// NAV COUNT
// ============================================================
function animateNavCount() {
    const total = getAllResources().length;
    const el    = DOM.navCount || document.getElementById('nav-count');
    let count   = 0;
    const step  = Math.max(1, Math.ceil(total / 25));
    const iv    = setInterval(() => {
        count = Math.min(count + step, total);
        el.textContent = `INDEX_ONLINE: ${count}_RESOURCES`;
        if (count >= total) clearInterval(iv);
    }, 35);
}

// ============================================================
// AUTH UI
// ============================================================
function updateAuthUI(user) {
    const btn        = document.getElementById('btn-auth');
    const avatar     = document.getElementById('auth-avatar');
    const profileBtn = document.getElementById('btn-profile');
    if (!btn) return;
    if (user) {
        btn.textContent = 'Salir';
        btn.title = user.displayName || '';
        if (avatar) {
            avatar.src = user.photoURL || '';
            avatar.style.display = user.photoURL ? 'inline-block' : 'none';
            avatar.onclick = openProfileModal;
        }
        if (profileBtn) profileBtn.style.display = 'inline-flex';
        if (!sessionStorage.getItem('_nx_banner_shown')) {
            sessionStorage.setItem('_nx_banner_shown', '1');
            showShareBanner();
        }
    } else {
        btn.textContent = '⊙ Login';
        btn.title = 'Iniciar sesión';
        if (avatar) { avatar.style.display = 'none'; avatar.onclick = null; }
        if (profileBtn) profileBtn.style.display = 'none';
        if (!sessionStorage.getItem('_nx_banner_shown')) {
            sessionStorage.setItem('_nx_banner_shown', '1');
            setTimeout(showShareBanner, 3000);
        }
    }
}
function handleAuthBtn() {
    if (!window._nx) return;
    if (_nx.user()) { _nx.logout(); } else { _nx.login(); }
}

// ============================================================
// PROFILE MODAL
// ============================================================
async function openProfileModal() {
    if (!window._nx || !_nx.user()) { showToast('Inicia sesión primero', 'info'); return; }
    const overlay = document.getElementById('profile-modal-overlay');
    if (!overlay) return;
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    const btn = document.getElementById('profile-save-btn');
    btn.disabled = true; btn.textContent = 'Cargando…';
    const profile = await _nx.getProfile();
    if (profile) {
        document.getElementById('profile-name-input').value = profile.displayName || '';
        document.getElementById('profile-bio-input').value  = profile.bio || '';
    }
    const u = _nx.user();
    document.getElementById('profile-email').textContent = u.email || '';
    document.getElementById('profile-uid').textContent   = u.uid ? u.uid.slice(0, 8) + '…' : '';
    const img = document.getElementById('profile-avatar-img');
    if (img) { img.src = u.photoURL || ''; img.style.display = u.photoURL ? 'block' : 'none'; }
    btn.disabled = false; btn.textContent = 'Guardar';
}
function closeProfileModal() {
    const overlay = document.getElementById('profile-modal-overlay');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
}
async function saveProfile() {
    if (!window._nx || !_nx.user()) return;
    const nameEl = document.getElementById('profile-name-input');
    const bioEl  = document.getElementById('profile-bio-input');
    const btn    = document.getElementById('profile-save-btn');
    const name   = nameEl.value.trim();
    const bio    = bioEl.value.trim();
    if (!name) { showToast('El nombre no puede estar vacío', 'error'); nameEl.focus(); return; }
    btn.disabled = true; btn.textContent = 'Guardando…';
    const ok = await _nx.saveProfile(name, bio);
    btn.disabled = false; btn.textContent = 'Guardar';
    if (ok) { showToast('Perfil actualizado', 'success'); closeProfileModal(); }
    else    { showToast('Error al guardar el perfil', 'error'); }
}

// ============================================================
// SHARE BANNER
// ============================================================
function showShareBanner() {
    if (document.getElementById('share-banner')) return;
    const banner = document.createElement('div');
    banner.id = 'share-banner';
    banner.className = 'share-banner';
    banner.innerHTML = `
        <span class="share-banner-icon">⚡</span>
        <span class="share-banner-text">¿Te resulta útil Jacsaw Nexus? <strong>Compártelo</strong> con la comunidad.</span>
        <button class="share-banner-btn" onclick="window._appShareProject()">Compartir</button>
        <button class="share-banner-close" onclick="this.parentElement.remove()" title="Cerrar">✕</button>
    `;
    document.body.appendChild(banner);
    requestAnimationFrame(() => requestAnimationFrame(() => banner.classList.add('visible')));
}
function shareProject() {
    const url = location.origin + location.pathname;
    navigator.clipboard.writeText(url).then(() => showToast('¡Enlace copiado! 🙌', 'success'));
    document.getElementById('share-banner')?.remove();
}

// ============================================================
// TOAST
// ============================================================
function showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    requestAnimationFrame(() => { requestAnimationFrame(() => toast.classList.add('visible')); });
    setTimeout(() => {
        toast.classList.remove('visible');
        setTimeout(() => toast.remove(), 350);
    }, 2800);
}

// ============================================================
// DIALOGS
// ============================================================
function showAlert(message) {
    document.getElementById('alert-message').textContent = message;
    document.getElementById('alert-cancel-btn').style.display = 'none';
    document.getElementById('alert-modal-overlay').classList.add('active');
    return new Promise(resolve => {
        document.getElementById('alert-ok-btn').onclick = () => {
            document.getElementById('alert-modal-overlay').classList.remove('active');
            resolve();
        };
    });
}
function showConfirm(message) {
    document.getElementById('alert-message').textContent = message;
    document.getElementById('alert-cancel-btn').style.display = 'inline-block';
    document.getElementById('alert-modal-overlay').classList.add('active');
    return new Promise(resolve => {
        document.getElementById('alert-ok-btn').onclick = () => {
            document.getElementById('alert-modal-overlay').classList.remove('active');
            resolve(true);
        };
        document.getElementById('alert-cancel-btn').onclick = () => {
            document.getElementById('alert-modal-overlay').classList.remove('active');
            resolve(false);
        };
    });
}

// ============================================================
// SIDEBAR MOBILE
// ============================================================
function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('active');
}

// ============================================================
// ── EXPONER FUNCIONES GLOBALES (onclick en HTML) ─────────────
// Al ser type="module" las funciones no son globales por defecto.
// Usamos prefijo _app para evitar colisiones de nombres.
// ============================================================
window._appTrackAndVisit = (e, id, trust, url) => trackAndVisit(e, id, trust, url);
window._appOpenDetail    = (id) => openDetailModal(id);
window._appToggleFav     = (id) => toggleFavorite(id);
window._appToggleFavModal = (id, btn) => toggleFavInModal(id, btn);
window._appCopyUrl       = (url, btn) => copyUrl(url, btn);
window._appToggleNotes   = (id, btn) => toggleNotes(id, btn);
window._appSelectHistory = (term) => selectHistory(term);
window._appShareProject  = () => shareProject();
// Compatibilidad con código existente en otros archivos
window.filterByCategory  = (cat) => filterByCategory(cat);
window.openProfileModal  = () => openProfileModal();
window.closeProfileModal = () => closeProfileModal();

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', async () => {

    // Cargar datos de Firestore
    await loadNexusData();

    // Configurar callback de auth antes de init
    window._nxAuthChange = async function (user) {
        updateAuthUI(user);
        if (user) {
            const cloudFavs = await _nx.getFavs();
            if (cloudFavs !== null) {
                favorites = cloudFavs;
                saveJSON('nexus_favorites', favorites);
                updateFavCount();
                render();
            }
        }
    };

    if (window._nx) {
        _nx.init().then(async () => {
            _popularityMap = await _nx.getPopular(100);
            render();
        });
    }

    initTheme();
    readUrlParams();

    // Construir chips de categorías
    const all  = getAllResources();
    const cats = [...new Set(all.map(r => r.category))];
    const fc   = document.getElementById('filter-container');
    cats.forEach(cat => {
        const d = document.createElement('div');
        d.className = 'category-chip';
        d.dataset.cat = cat;
        d.textContent = cat;
        d.onclick = () => filterByCategory(cat);
        fc.appendChild(d);
    });
    updateCategoryChips();
    updateFavCount();

    // Cachear referencias DOM
    DOM = {
        resourceGrid:     document.getElementById('resource-grid'),
        resultInfo:       document.getElementById('result-info'),
        sidebarFavCount:  document.getElementById('sidebar-fav-count'),
        trustFilterGroup: document.getElementById('trust-filter-group'),
        btnStats:         document.getElementById('btn-stats'),
        btnTheme:         document.getElementById('btn-theme'),
        btnView:          document.getElementById('btn-view'),
        btnShare:         document.getElementById('btn-share'),
        sidebar:          document.getElementById('sidebar'),
        sidebarOverlay:   document.getElementById('sidebar-overlay'),
        sidebarToggle:    document.getElementById('sidebar-toggle'),
        detailModalOverlay: document.getElementById('detail-modal-overlay'),
        detailModalClose:   document.getElementById('detail-modal-close'),
        navCount:           document.getElementById('nav-count'),
    };

    // Búsqueda
    const searchEl = document.getElementById('main-search');
    const clearBtn = document.getElementById('clear-search');
    searchEl.addEventListener('input', () => {
        STATE.search = searchEl.value;
        clearBtn.style.display = searchEl.value ? 'flex' : 'none';
        showHistory(searchEl);
        render();
    });
    searchEl.addEventListener('focus',   () => showHistory(searchEl));
    searchEl.addEventListener('blur',    () => setTimeout(hideHistory, 160));
    searchEl.addEventListener('keydown', e => {
        if (e.key === 'Enter' && STATE.search.trim()) { addToHistory(STATE.search.trim()); hideHistory(); }
        if (e.key === 'Escape') { searchEl.blur(); hideHistory(); }
    });
    clearBtn.addEventListener('click', () => {
        searchEl.value = ''; STATE.search = '';
        clearBtn.style.display = 'none';
        searchEl.focus(); hideHistory(); render();
    });

    // Ordenar
    const sortEl = document.getElementById('sort-select');
    sortEl.value = STATE.sort;
    sortEl.addEventListener('change', () => { STATE.sort = sortEl.value; render(); });

    // Filtro de confianza
    DOM.trustFilterGroup.addEventListener('click', e => {
        const btn = e.target.closest('.trust-filter-btn');
        if (btn) setTrustFilter(btn.dataset.trust);
    });

    // Botones de navbar
    DOM.btnStats.addEventListener('click', toggleStats);
    DOM.btnTheme.addEventListener('click', toggleTheme);
    DOM.btnView.addEventListener('click', toggleView);
    DOM.btnShare.addEventListener('click', shareFilter);
    document.getElementById('btn-auth')?.addEventListener('click', handleAuthBtn);
    document.getElementById('btn-profile')?.addEventListener('click', openProfileModal);

    // Sidebar móvil
    DOM.sidebarToggle.addEventListener('click', () => {
        const isOpen = DOM.sidebar.classList.toggle('open');
        DOM.sidebarOverlay.classList.toggle('active', isOpen);
    });
    DOM.sidebarOverlay.addEventListener('click', closeSidebar);

    // Modal detalle
    DOM.detailModalClose.addEventListener('click', closeDetailModal);
    DOM.detailModalOverlay.addEventListener('click', e => {
        if (e.target === DOM.detailModalOverlay) closeDetailModal();
    });

    // Modal perfil
    document.getElementById('profile-modal-overlay')?.addEventListener('click', e => {
        if (e.target.id === 'profile-modal-overlay') closeProfileModal();
    });
    document.getElementById('profile-modal-close')?.addEventListener('click', closeProfileModal);
    document.getElementById('profile-save-btn')?.addEventListener('click', saveProfile);

    // Alert modal
    document.getElementById('alert-modal-overlay')?.addEventListener('click', e => {
        if (e.target.id === 'alert-modal-overlay')
            document.getElementById('alert-cancel-btn').click();
    });

    // Atajos de teclado
    document.addEventListener('keydown', e => {
        const active  = document.activeElement;
        const inInput = ['INPUT','TEXTAREA','SELECT'].includes(active.tagName);
        if (!inInput) {
            if (e.key === '/')                  { e.preventDefault(); searchEl.focus(); }
            if (e.key === 's' || e.key === 'S') toggleStats();
            if (e.key === 'v' || e.key === 'V') toggleView();
            if (e.key === 't' || e.key === 'T') toggleTheme();
        }
        if (e.key === 'Escape') {
            closeDetailModal(); closeSidebar(); hideHistory(); closeProfileModal();
        }
    });

    animateNavCount();
    render();
});