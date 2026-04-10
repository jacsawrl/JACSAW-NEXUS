// =============================================
// NEXUS HUB — app.js
// =============================================

// --- STATE ---
const STATE = {
    categories: new Set(['ALL']),
    sort: 'DEFAULT',
    view: 'grid',
    trustFilter: 'ALL',
    search: '',
    statsOpen: false,
    adminAuth: false,
};

// --- PERSISTENT DATA ---
let favorites     = loadJSON('nexus_favorites', []);
let searchHistory = loadJSON('nexus_history', []);
let customResources = loadJSON('nexus_custom', []);
let hiddenIds     = loadJSON('nexus_hidden', []);
let overrides     = loadJSON('nexus_overrides', {});
let theme         = localStorage.getItem('nexus_theme') || 'dark';

function loadJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
    catch { return fallback; }
}
function saveJSON(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (_) {}
}

// --- COMPUTED DATA ---
function getAllResources() {
    const defaults = NEXUS_DATA_DEFAULT
        .filter(r => !hiddenIds.includes(r.id))
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
// VIEW (grid / list)
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
    const escaped = esc(text);
    const safeTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return escaped.replace(new RegExp(`(${safeTerm})`, 'gi'), '<mark class="hl">$1</mark>');
}

// ============================================================
// FAVORITES
// ============================================================
function saveFavorites() { saveJSON('nexus_favorites', favorites); }
function updateFavCount() {
    const el = document.getElementById('sidebar-fav-count');
    if (el) el.textContent = favorites.length > 0 ? favorites.length : '';
}
function toggleFavorite(id) {
    if (favorites.includes(id)) {
        favorites = favorites.filter(f => f !== id);
    } else {
        favorites.push(id);
    }
    saveFavorites();
    updateFavCount();
    // Update all fav buttons in DOM without full re-render
    document.querySelectorAll(`.btn-fav[data-id="${id}"]`).forEach(btn => {
        const isFav = favorites.includes(id);
        btn.classList.toggle('is-fav', isFav);
        btn.textContent = isFav ? '★' : '☆';
        btn.title = isFav ? 'Quitar de favoritos' : 'Añadir a favoritos';
    });
    // Full re-render only if we're in favorites view
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
// SHARE FILTER  (feature 10)
// ============================================================
function shareFilter() {
    const params = new URLSearchParams();
    if (STATE.search) params.set('q', STATE.search);
    const cats = [...STATE.categories].filter(c => c !== 'ALL');
    if (cats.length) params.set('cats', cats.join(','));
    if (STATE.sort !== 'DEFAULT') params.set('sort', STATE.sort);
    if (STATE.trustFilter !== 'ALL') params.set('trust', STATE.trustFilter);

    const url = `${location.origin}${location.pathname}${params.size ? '?' + params : ''}`;
    navigator.clipboard.writeText(url).then(() => {
        showToast('¡Enlace copiado! Compártelo con quien quieras.', 'success');
    }).catch(() => showToast('No se pudo copiar el enlace', 'error'));
    history.pushState(null, '', url);
}

// ============================================================
// URL PARAMS  (feature 10 — on load)
// ============================================================
function readUrlParams() {
    const p = new URLSearchParams(location.search);
    if (p.has('q')) {
        STATE.search = p.get('q');
        const el = document.getElementById('main-search');
        if (el) {
            el.value = STATE.search;
            document.getElementById('clear-search').style.display = 'flex';
        }
    }
    if (p.has('cats')) {
        STATE.categories = new Set(p.get('cats').split(',').filter(Boolean));
    }
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
// SEARCH HISTORY  (feature 6)
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
            `<div class="history-item" onmousedown="selectHistory(${JSON.stringify(h)})">${highlight(h, query)}</div>`
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
// FILTERING  (feature 7 — multi-category)
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
        let active = false;
        if (cat === 'ALL') active = STATE.categories.has('ALL');
        else if (cat === 'FAVORITES') active = STATE.categories.has('FAVORITES');
        else active = STATE.categories.has(cat);
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
    const all = getAllResources();
    const term = STATE.search.toLowerCase().trim();
    return all.filter(item => {
        const matchSearch = !term ||
            item.name.toLowerCase().includes(term) ||
            item.category.toLowerCase().includes(term) ||
            item.tags.some(t => t.toLowerCase().includes(term)) ||
            item.desc.toLowerCase().includes(term) ||
            (item.notes && item.notes.toLowerCase().includes(term));

        let matchCat;
        if (STATE.categories.has('ALL'))       matchCat = true;
        else if (STATE.categories.has('FAVORITES')) matchCat = favorites.includes(item.id);
        else matchCat = STATE.categories.has(item.category);

        const matchTrust =
            STATE.trustFilter === 'VERIFIED' ? item.trust >= 4 :
            STATE.trustFilter === 'SAFE'     ? item.trust >= 3 : true;

        return matchSearch && matchCat && matchTrust;
    });
}
function sortData(data) {
    const sorted = [...data];
    if (STATE.sort === 'TRUST_DESC') sorted.sort((a,b) => b.trust - a.trust);
    else if (STATE.sort === 'TRUST_ASC')  sorted.sort((a,b) => a.trust - b.trust);
    else if (STATE.sort === 'NAME_ASC')   sorted.sort((a,b) => a.name.localeCompare(b.name,'es'));
    else if (STATE.sort === 'NAME_DESC')  sorted.sort((a,b) => b.name.localeCompare(a.name,'es'));
    return sorted;
}

// ============================================================
// RENDER
// ============================================================
function render() {
    const grid = document.getElementById('resource-grid');
    const filtered = sortData(getFilteredData());
    const term = STATE.search.trim();

    // Result count
    const info = document.getElementById('result-info');
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
                    : `No hay recursos que coincidan.<br>Prueba a ajustar los filtros o la búsqueda.`
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
// CREATE CARD  (features 3, 9, 12, 13)
// ============================================================
function createCard(item, index, term = '') {
    const tc = getTrustColor(item.trust);
    const isFav = favorites.includes(item.id);
    const delay = Math.min(index * 35, 400);
    const hasNotes = item.notes && item.notes.trim();

    return `
<div class="card" style="animation-delay:${delay}ms">
    ${item.warn  ? `<div class="warning-strip">${esc(item.warn)}</div>` : ''}
    ${item.isNew ? `<div class="new-badge">NUEVO</div>` : ''}

    <div class="card-header">
        <span class="cat-badge" style="border-color:${item.color};color:${item.color}">${esc(item.category)}</span>
        <div class="online-indicator"><span class="status-pulse"></span>ONLINE</div>
    </div>

    <h3 class="card-title" onclick="openDetailModal(${item.id})">${highlight(item.name, term)}</h3>
    <p class="card-desc">${highlight(item.desc, term)}</p>

    <div class="trust-section">
        <div class="trust-label">
            <span>CONFIANZA</span>
            <span style="color:${tc}">${item.trust}/5 — ${getTrustLabel(item.trust)}</span>
        </div>
        <div class="trust-bar-bg">
            <div class="trust-bar-fill" style="width:${item.trust*20}%;background:${tc}"></div>
        </div>
    </div>

    <div class="tag-container">
        ${item.tags.map(t => `<span class="tag">${highlight(t, term)}</span>`).join('')}
    </div>

    ${hasNotes ? `
    <div class="notes-section">
        <button class="notes-toggle" onclick="toggleNotes(${item.id}, this)">
            <span class="notes-toggle-icon">›</span> Notas
        </button>
        <div class="notes-content" id="notes-content-${item.id}">
            <p class="notes-text">${esc(item.notes)}</p>
        </div>
    </div>` : ''}

    <div class="card-actions">
        <a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer"
           class="btn-visit" onclick="return securityCheck(${item.trust})">VISITAR</a>
        <button class="btn-copy" onclick="copyUrl('${esc(item.url)}', this)" title="Copiar URL">⎘</button>
        <button class="btn-fav ${isFav ? 'is-fav' : ''}" data-id="${item.id}"
                onclick="toggleFavorite(${item.id})"
                title="${isFav ? 'Quitar de favoritos' : 'Añadir a favoritos'}">
            ${isFav ? '★' : '☆'}
        </button>
        <button class="btn-info" onclick="openDetailModal(${item.id})" title="Ver detalles">→</button>
    </div>
</div>`;
}

// ============================================================
// CREATE LIST ROW  (feature 2)
// ============================================================
function createListRow(item, term = '') {
    const tc = getTrustColor(item.trust);
    const isFav = favorites.includes(item.id);
    const dots = '■'.repeat(item.trust) + '□'.repeat(5 - item.trust);
    return `
<div class="list-row ${item.warn ? 'list-row--warn' : ''}">
    <div class="list-name" onclick="openDetailModal(${item.id})">
        ${item.isNew ? '<span class="new-badge new-badge--sm">N</span>' : ''}
        ${highlight(item.name, term)}
    </div>
    <div><span class="cat-badge" style="border-color:${item.color};color:${item.color}">${esc(item.category)}</span></div>
    <div class="list-trust" style="color:${tc}">
        <span style="letter-spacing:2px">${dots}</span>
        <span style="font-size:0.68rem;color:var(--text-tertiary)">${getTrustLabel(item.trust)}</span>
    </div>
    <div class="list-tags">${item.tags.slice(0,3).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
    <div class="list-actions">
        <a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer"
           class="btn-visit btn-visit--sm" onclick="return securityCheck(${item.trust})">Visitar</a>
        <button class="btn-copy" onclick="copyUrl('${esc(item.url)}', this)" title="Copiar URL">⎘</button>
        <button class="btn-fav ${isFav ? 'is-fav' : ''}" data-id="${item.id}"
                onclick="toggleFavorite(${item.id})">
            ${isFav ? '★' : '☆'}
        </button>
    </div>
</div>`;
}

// ============================================================
// NOTES TOGGLE  (feature 13)
// ============================================================
function toggleNotes(id, btn) {
    const content = document.getElementById(`notes-content-${id}`);
    const icon = btn.querySelector('.notes-toggle-icon');
    const isOpen = content.classList.toggle('open');
    icon.style.transform = isOpen ? 'rotate(90deg)' : '';
}

// ============================================================
// SECURITY CHECK
// ============================================================
function securityCheck(score) {
    if (score <= 2) {
        return confirm(
            'AVISO DE SEGURIDAD\n\n' +
            'Este sitio tiene baja reputación. Asegúrate de tener uBlock Origin activo ' +
            'y de saber identificar falsos positivos en VirusTotal.\n\n¿Deseas continuar?'
        );
    }
    return true;
}

// ============================================================
// DETAIL MODAL  (feature 14)
// ============================================================
function openDetailModal(id) {
    const item = getAllResources().find(r => r.id === id);
    if (!item) return;
    const tc = getTrustColor(item.trust);
    const isFav = favorites.includes(id);
    const dots = '■'.repeat(item.trust) + '□'.repeat(5 - item.trust);

    document.getElementById('detail-modal-content').innerHTML = `
        <div class="detail-header">
            <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:0.6rem">
                <span class="cat-badge" style="border-color:${item.color};color:${item.color}">${esc(item.category)}</span>
                ${item.isNew ? '<span class="new-badge" style="position:relative;top:0;left:0;border-radius:3px">NUEVO</span>' : ''}
                ${item.warn  ? `<span class="warning-strip" style="position:relative;top:0;right:0;border-radius:3px">${esc(item.warn)}</span>` : ''}
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
                ${item.tags.map(t => `<span class="tag">${esc(t)}</span>`).join('')}
            </div>
        </div>
        ${item.added ? `
        <div class="detail-section">
            <h4 class="detail-section-title">Añadido al índice</h4>
            <span style="font-family:var(--font-mono);font-size:0.75rem;color:var(--text-tertiary)">${esc(item.added)}</span>
        </div>` : ''}
        <div class="detail-actions">
            <a href="${esc(item.url)}" target="_blank" rel="noopener noreferrer"
               class="btn-visit" onclick="return securityCheck(${item.trust})" style="flex:1;text-align:center">
               VISITAR RECURSO
            </a>
            <button class="detail-copy" onclick="copyUrl('${esc(item.url)}', this)">⎘ Copiar URL</button>
            <button class="btn-fav ${isFav ? 'is-fav' : ''}" data-id="${id}"
                    onclick="toggleFavInModal(${id}, this)" style="width:42px">
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
// STATS PANEL  (feature 11)
// ============================================================
function toggleStats() {
    STATE.statsOpen = !STATE.statsOpen;
    document.getElementById('stats-panel').classList.toggle('open', STATE.statsOpen);
    document.getElementById('btn-stats').classList.toggle('active', STATE.statsOpen);
    if (STATE.statsOpen) renderStats();
}
function renderStats() {
    const all = getAllResources();
    const avg = all.reduce((s, r) => s + r.trust, 0) / all.length;
    const newCount = all.filter(r => r.isNew).length;
    const catCounts = {};
    all.forEach(r => { catCounts[r.category] = (catCounts[r.category] || 0) + 1; });
    const catKeys = Object.keys(catCounts).sort((a,b) => catCounts[b] - catCounts[a]);
    const maxCat = Math.max(...Object.values(catCounts));

    animCount('stat-total', all.length);
    animCount('stat-avg', avg.toFixed(1), true);
    animCount('stat-cats', catKeys.length);
    animCount('stat-new', newCount);

    document.getElementById('stats-by-cat').innerHTML = catKeys.map(cat => `
        <div class="stats-bar-row">
            <span class="stats-label" title="${cat}">${cat}</span>
            <div class="stats-bar-track">
                <div class="stats-bar-fill" style="width:${((catCounts[cat]/maxCat)*100).toFixed(0)}%"></div>
            </div>
            <span class="stats-count">${catCounts[cat]}</span>
        </div>`).join('');

    const trustCounts = {1:0,2:0,3:0,4:0,5:0};
    all.forEach(r => { if (trustCounts[r.trust] !== undefined) trustCounts[r.trust]++; });
    const trustColors = {1:'var(--danger)',2:'var(--danger)',3:'var(--warning)',4:'var(--success)',5:'var(--success)'};
    const trustLabels = {1:'Peligroso',2:'Dudoso',3:'Aceptable',4:'Confiable',5:'Verificado'};
    const maxTrust = Math.max(...Object.values(trustCounts)) || 1;
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
    const el = document.getElementById(elId);
    if (!el) return;
    const num = parseFloat(target);
    const start = performance.now();
    const dur = 700;
    function step(now) {
        const p = Math.min((now - start) / dur, 1);
        const e = 1 - Math.pow(1 - p, 3);
        el.textContent = isFloat ? (num * e).toFixed(1) : Math.round(num * e);
        if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
}

// ============================================================
// NAV COUNT ANIMATION  (feature 5)
// ============================================================
function animateNavCount() {
    const total = getAllResources().length;
    const el = document.getElementById('nav-count');
    let count = 0;
    const step = Math.max(1, Math.ceil(total / 25));
    const iv = setInterval(() => {
        count = Math.min(count + step, total);
        el.textContent = `INDEX_ONLINE: ${count}_RESOURCES`;
        if (count >= total) clearInterval(iv);
    }, 35);
}

// ============================================================
// EXPORT FAVORITES  (feature 16)
// ============================================================
function exportFavorites() {
    const all = getAllResources();
    const favItems = all.filter(r => favorites.includes(r.id));
    if (!favItems.length) { showToast('No tienes favoritos que exportar', 'warning'); return; }
    const blob = new Blob([JSON.stringify(favItems, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'nexus-favoritos.json'; a.click();
    URL.revokeObjectURL(url);
    showToast(`${favItems.length} favorito${favItems.length!==1?'s':''} exportado${favItems.length!==1?'s':''}`, 'success');
}

// ============================================================
// IMPORT RESOURCES  (feature 17)
// ============================================================
function openImportModal() {
    document.getElementById('import-modal-overlay').classList.add('active');
    document.body.style.overflow = 'hidden';
}
function closeImportModal() {
    document.getElementById('import-modal-overlay').classList.remove('active');
    document.body.style.overflow = '';
    document.getElementById('import-textarea').value = '';
}
function showImportExample() {
    document.getElementById('import-textarea').value = JSON.stringify([{
        name: 'Mi Recurso', category: 'DDL', url: 'https://ejemplo.com',
        trust: 4, tags: ['PC', 'Direct'], desc: 'Descripción breve del recurso.',
        notes: 'Notas adicionales opcionales. Consejos, advertencias...', color: '#00D4FF', isNew: false
    }], null, 2);
}
function importResources() {
    const text = document.getElementById('import-textarea').value.trim();
    try {
        const parsed = JSON.parse(text);
        if (!Array.isArray(parsed)) throw new Error('Debe ser un array JSON');
        const valid = parsed.filter(r => r.name && r.url && r.category);
        if (!valid.length) throw new Error('Ningún recurso válido (requieren name, url y category)');
        const maxId = Math.max(...customResources.map(r => r.id), 999);
        valid.forEach((r, i) => {
            r.id    = maxId + 1 + i;
            r.trust = Math.min(5, Math.max(1, parseInt(r.trust) || 3));
            r.tags  = Array.isArray(r.tags) ? r.tags : [];
            r.color = r.color || '#00D4FF';
            r.added = r.added || new Date().toISOString().slice(0,10);
        });
        customResources.push(...valid);
        saveJSON('nexus_custom', customResources);
        closeImportModal();
        render();
        updateFavCount();
        showToast(`${valid.length} recurso${valid.length!==1?'s':''} importado${valid.length!==1?'s':''}`, 'success');
    } catch (e) {
        showToast(`Error: ${e.message}`, 'error');
    }
}

// ============================================================
// ADMIN  (feature 15)
// ============================================================
const ADMIN_PASSWORD = 'nexus2025';

function openAdmin() {
    document.getElementById('admin-modal-overlay').classList.add('active');
    document.body.style.overflow = 'hidden';
    document.getElementById('admin-login').style.display    = STATE.adminAuth ? 'none' : 'block';
    document.getElementById('admin-content').style.display  = STATE.adminAuth ? 'block' : 'none';
    if (STATE.adminAuth) renderAdminList();
}
function closeAdmin() {
    document.getElementById('admin-modal-overlay').classList.remove('active');
    document.body.style.overflow = '';
    document.getElementById('resource-form-container').style.display = 'none';
    document.getElementById('admin-password-input').value = '';
}
function checkAdminPassword() {
    const input = document.getElementById('admin-password-input');
    if (input.value === ADMIN_PASSWORD) {
        STATE.adminAuth = true;
        document.getElementById('admin-login').style.display = 'none';
        document.getElementById('admin-content').style.display = 'block';
        renderAdminList();
    } else {
        input.style.borderColor = 'var(--danger)';
        showToast('Contraseña incorrecta', 'error');
        setTimeout(() => { input.style.borderColor = ''; }, 1500);
    }
}
function renderAdminList() {
    const all = getAllResources();
    const cats = [...new Set(all.map(r => r.category))];
    document.getElementById('cat-suggestions').innerHTML = cats.map(c => `<option value="${c}">`).join('');

    const hiddenList = NEXUS_DATA_DEFAULT.filter(r => hiddenIds.includes(r.id));
    document.getElementById('admin-resource-list').innerHTML = `
        <table class="admin-table">
            <thead><tr>
                <th>ID</th><th>Nombre</th><th>Categoría</th><th>Trust</th><th>Tipo</th><th>Acciones</th>
            </tr></thead>
            <tbody>${all.map(r => `
                <tr>
                    <td style="font-family:var(--font-mono);color:var(--text-tertiary)">#${r.id}</td>
                    <td><strong>${esc(r.name)}</strong></td>
                    <td><span class="cat-badge" style="border-color:${r.color};color:${r.color}">${esc(r.category)}</span></td>
                    <td style="color:${getTrustColor(r.trust)};font-family:var(--font-mono)">${r.trust}/5</td>
                    <td style="font-size:0.68rem;color:var(--text-tertiary);font-family:var(--font-mono)">${r.id>=1000?'CUSTOM':'DEFAULT'}</td>
                    <td>
                        <button class="admin-action-btn" onclick="openResourceForm(${r.id})">Editar</button>
                        <button class="admin-action-btn admin-action-btn--danger" onclick="deleteResource(${r.id})">
                            ${r.id>=1000?'Eliminar':'Ocultar'}
                        </button>
                    </td>
                </tr>`).join('')}
            </tbody>
        </table>
        ${hiddenList.length ? `
            <div style="margin-top:0.75rem;padding:0.6rem 0.9rem;background:var(--bg-tertiary);border-radius:8px;font-size:0.75rem;color:var(--text-tertiary);font-family:var(--font-mono)">
                ${hiddenList.length} oculto${hiddenList.length!==1?'s':''}: ${hiddenList.map(r=>esc(r.name)).join(', ')}
            </div>` : ''}
    `;
}
function openResourceForm(id = null) {
    document.getElementById('f-editing-id').value = id || '';
    document.getElementById('form-title').textContent = id ? 'Editar Recurso' : 'Añadir Recurso';
    if (id) {
        const item = getAllResources().find(r => r.id === id);
        if (!item) return;
        document.getElementById('f-name').value     = item.name;
        document.getElementById('f-category').value = item.category;
        document.getElementById('f-url').value      = item.url;
        document.getElementById('f-desc').value     = item.desc;
        document.getElementById('f-notes').value    = item.notes || '';
        document.getElementById('f-tags').value     = item.tags.join(', ');
        document.getElementById('f-trust').value    = item.trust;
        document.getElementById('f-color').value    = item.color || '#00D4FF';
        document.getElementById('f-warn').value     = item.warn || '';
        document.getElementById('f-isnew').checked  = !!item.isNew;
    } else {
        ['f-name','f-category','f-url','f-desc','f-notes','f-warn'].forEach(i => {
            document.getElementById(i).value = '';
        });
        document.getElementById('f-tags').value    = '';
        document.getElementById('f-trust').value   = 3;
        document.getElementById('f-color').value   = '#00D4FF';
        document.getElementById('f-isnew').checked = false;
    }
    const container = document.getElementById('resource-form-container');
    container.style.display = 'block';
    setTimeout(() => container.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
}
function cancelResourceForm() {
    document.getElementById('resource-form-container').style.display = 'none';
    document.getElementById('f-editing-id').value = '';
}
function saveResource() {
    const name     = document.getElementById('f-name').value.trim();
    const category = document.getElementById('f-category').value.trim();
    const url      = document.getElementById('f-url').value.trim();
    const desc     = document.getElementById('f-desc').value.trim();
    if (!name || !category || !url || !desc) {
        showToast('Rellena los campos obligatorios (*)', 'error'); return;
    }
    const data = {
        name, category, url, desc,
        notes: document.getElementById('f-notes').value.trim(),
        tags:  document.getElementById('f-tags').value.split(',').map(t => t.trim()).filter(Boolean),
        trust: Math.min(5, Math.max(1, parseInt(document.getElementById('f-trust').value) || 3)),
        color: document.getElementById('f-color').value,
        warn:  document.getElementById('f-warn').value.trim() || undefined,
        isNew: document.getElementById('f-isnew').checked,
        added: new Date().toISOString().slice(0,10),
    };
    const editId = parseInt(document.getElementById('f-editing-id').value) || null;
    if (editId) {
        if (editId >= 1000) {
            const idx = customResources.findIndex(r => r.id === editId);
            if (idx >= 0) customResources[idx] = { ...customResources[idx], ...data };
            saveJSON('nexus_custom', customResources);
        } else {
            overrides[editId] = data;
            saveJSON('nexus_overrides', overrides);
        }
        showToast('Recurso actualizado', 'success');
    } else {
        const maxId = Math.max(...customResources.map(r => r.id), 999);
        customResources.push({ id: maxId + 1, ...data });
        saveJSON('nexus_custom', customResources);
        showToast('Recurso añadido', 'success');
    }
    cancelResourceForm();
    renderAdminList();
    render();
}
function deleteResource(id) {
    const label = id >= 1000 ? 'eliminar' : 'ocultar';
    if (!confirm(`¿Seguro que quieres ${label} este recurso?`)) return;
    if (id >= 1000) {
        customResources = customResources.filter(r => r.id !== id);
        saveJSON('nexus_custom', customResources);
    } else {
        hiddenIds.push(id);
        saveJSON('nexus_hidden', hiddenIds);
    }
    renderAdminList();
    render();
    showToast('Recurso eliminado', 'success');
}
function resetHidden() {
    if (!hiddenIds.length) { showToast('No hay recursos ocultos', 'info'); return; }
    hiddenIds = [];
    saveJSON('nexus_hidden', hiddenIds);
    render();
    showToast('Recursos restaurados', 'success');
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
// SIDEBAR MOBILE
// ============================================================
function closeSidebar() {
    document.getElementById('sidebar').classList.remove('open');
    document.getElementById('sidebar-overlay').classList.remove('active');
}

// ============================================================
// INIT
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    readUrlParams();

    // Build category chips
    const all = getAllResources();
    const cats = [...new Set(all.map(r => r.category))];
    const fc = document.getElementById('filter-container');
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

    // Search
    const searchEl = document.getElementById('main-search');
    const clearBtn = document.getElementById('clear-search');

    searchEl.addEventListener('input', () => {
        STATE.search = searchEl.value;
        clearBtn.style.display = searchEl.value ? 'flex' : 'none';
        showHistory(searchEl);
        render();
    });
    searchEl.addEventListener('focus', () => showHistory(searchEl));
    searchEl.addEventListener('blur',  () => setTimeout(hideHistory, 160));
    searchEl.addEventListener('keydown', e => {
        if (e.key === 'Enter' && STATE.search.trim()) { addToHistory(STATE.search.trim()); hideHistory(); }
        if (e.key === 'Escape') { searchEl.blur(); hideHistory(); }
    });

    clearBtn.addEventListener('click', () => {
        searchEl.value = ''; STATE.search = '';
        clearBtn.style.display = 'none';
        searchEl.focus(); hideHistory(); render();
    });

    // Sort
    const sortEl = document.getElementById('sort-select');
    sortEl.value = STATE.sort;
    sortEl.addEventListener('change', () => { STATE.sort = sortEl.value; render(); });

    // Trust filter
    document.getElementById('trust-filter-group').addEventListener('click', e => {
        const btn = e.target.closest('.trust-filter-btn');
        if (btn) setTrustFilter(btn.dataset.trust);
    });

    // Navbar buttons
    document.getElementById('btn-stats').addEventListener('click', toggleStats);
    document.getElementById('btn-theme').addEventListener('click', toggleTheme);
    document.getElementById('btn-view').addEventListener('click',  toggleView);
    document.getElementById('btn-share').addEventListener('click', shareFilter);

    // Sidebar mobile
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
        const s = document.getElementById('sidebar');
        const o = document.getElementById('sidebar-overlay');
        const isOpen = s.classList.toggle('open');
        o.classList.toggle('active', isOpen);
    });
    document.getElementById('sidebar-overlay').addEventListener('click', closeSidebar);

    // Export / Import
    document.getElementById('btn-export-fav').addEventListener('click', exportFavorites);
    document.getElementById('btn-open-import').addEventListener('click', openImportModal);
    document.getElementById('btn-import-example').addEventListener('click', e => { e.preventDefault(); showImportExample(); });
    document.getElementById('import-confirm-btn').addEventListener('click', importResources);
    document.getElementById('import-cancel-btn').addEventListener('click', closeImportModal);
    document.getElementById('import-modal-close').addEventListener('click', closeImportModal);
    document.getElementById('import-modal-overlay').addEventListener('click', e => {
        if (e.target === document.getElementById('import-modal-overlay')) closeImportModal();
    });

    // Detail modal
    document.getElementById('detail-modal-close').addEventListener('click', closeDetailModal);
    document.getElementById('detail-modal-overlay').addEventListener('click', e => {
        if (e.target === document.getElementById('detail-modal-overlay')) closeDetailModal();
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
        const active = document.activeElement;
        const inInput = active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.tagName === 'SELECT';
        if (!inInput) {
            if (e.key === '/') { e.preventDefault(); searchEl.focus(); }
            if (e.key === 's' || e.key === 'S') toggleStats();
            if (e.key === 'v' || e.key === 'V') toggleView();
            if (e.key === 't' || e.key === 'T') toggleTheme();
        }
        if (e.key === 'Escape') {
            closeDetailModal(); closeImportModal(); closeSidebar(); hideHistory();
        }
        if (e.ctrlKey && e.shiftKey && e.key === 'A') { e.preventDefault();  }
    });

    // Animate nav count and render
    animateNavCount();
    render();
});