// =============================================
// JACSAW NEXUS — admin.js v2
// Panel de administración seguro
// =============================================
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
    getFirestore,
    collection,
    doc,
    getDocs,
    getDoc,
    setDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    where,
    serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ── Config Firebase ───────────────────────────────────────────
const _cfg = {
    apiKey:    'AIzaSyDIkK8fuOIvbAZ362AG_-FSvbPXOpTR5Bc',
    authDomain:'jacsaw-nexus.firebaseapp.com',
    projectId: 'jacsaw-nexus',
};
const _fbApp = getApps().length ? getApps()[0] : initializeApp(_cfg);
const auth   = getAuth(_fbApp);
const db     = getFirestore(_fbApp);

// ── Autorización (UID) ────────────────────────────────────────
const _ADMIN_UID = 'Cai9jYdqNLY5efwpmqJFWVnTvvg1';
function isAdminUser(user) { return user && user.uid === _ADMIN_UID; }

// ── Rate limiting ─────────────────────────────────────────────
const _RL = { count: 0, windowStart: Date.now(), max: 20, window: 60_000 };
function checkRateLimit() {
    const now = Date.now();
    if (now - _RL.windowStart > _RL.window) { _RL.count = 0; _RL.windowStart = now; }
    if (_RL.count >= _RL.max) { showMessage('Demasiadas peticiones. Espera un momento.', 'error'); return false; }
    _RL.count++;
    return true;
}

// ── DOM refs ──────────────────────────────────────────────────
const loginContainer  = document.getElementById('login-container');
const adminContainer  = document.getElementById('admin-container');
const loginBtn        = document.getElementById('login-btn');
const logoutBtn       = document.getElementById('logout-btn');
const loginMessage    = document.getElementById('login-message');
const adminEmailEl    = document.getElementById('admin-email');
const gamesContainer  = document.getElementById('games-container');
const addGameBtn      = document.getElementById('add-game-btn');
const gameModal       = document.getElementById('game-modal');
const gameForm        = document.getElementById('game-form');
const cancelBtn       = document.getElementById('cancel-btn');
const modalTitle      = document.getElementById('modal-title');
const auditEntries    = document.getElementById('audit-entries');
const totalGamesEl    = document.getElementById('total-games');
const totalCatsEl     = document.getElementById('total-categories');
const avgTrustEl      = document.getElementById('avg-trust');
const lastUpdatedEl   = document.getElementById('last-updated');

// Tab refs
const tabBtns = document.querySelectorAll('.admin-tab-btn');
const tabPanels = document.querySelectorAll('.admin-tab-panel');

// ── Utilidades ────────────────────────────────────────────────
function sanitize(input) {
    if (typeof input !== 'string') return input;
    return input.replace(/[<>]/g, '').trim();
}
function isValidUrl(str) {
    try { new URL(str); return true; } catch { return false; }
}
function formatDate(ts) {
    if (!ts) return '—';
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return d.toLocaleDateString('es-ES') + ' ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
}

// ── Audit log ─────────────────────────────────────────────────
function logAudit(action, details = {}) {
    const entry = document.createElement('div');
    entry.className = 'audit-entry';
    entry.innerHTML = `<strong>${sanitize(action)}</strong> · ${new Date().toLocaleString('es-ES')} · <code>${sanitize(JSON.stringify(details))}</code>`;
    auditEntries.insertBefore(entry, auditEntries.firstChild);
    while (auditEntries.children.length > 50) auditEntries.removeChild(auditEntries.lastChild);
}

// ── Tabs ──────────────────────────────────────────────────────
function switchTab(tabId) {
    tabBtns.forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    tabPanels.forEach(panel => {
        panel.classList.toggle('active', panel.id === `tab-${tabId}`);
    });
    if (tabId === 'reports')     loadReports();
    if (tabId === 'suggestions') loadSuggestions();
    if (tabId === 'games')       loadGames();
}

tabBtns.forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
});

// ── Auth ──────────────────────────────────────────────────────
async function signInWithGoogle() {
    try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const result = await signInWithPopup(auth, provider);
        if (!isAdminUser(result.user)) {
            await signOut(auth);
            logAudit('LOGIN_DENIED', { reason: 'unauthorized' });
            showMessage('Acceso denegado.', 'error');
        }
    } catch (e) {
        if (e.code !== 'auth/popup-closed-by-user')
            showMessage('Error al iniciar sesión: ' + e.message, 'error');
    }
}

async function signOutAdmin() {
    await signOut(auth).catch(() => {});
    logAudit('LOGOUT');
}

// ── UI helpers ────────────────────────────────────────────────
function showMessage(msg, type = 'info') {
    if (!loginMessage) return;
    loginMessage.className = type === 'error' ? 'error-message' : type === 'success' ? 'success-message' : '';
    loginMessage.textContent = msg;
    if (type === 'success') setTimeout(() => { loginMessage.textContent = ''; }, 3000);
}

function showModal(show = true) { gameModal.style.display = show ? 'block' : 'none'; }

function resetForm() {
    gameForm.reset();
    document.getElementById('game-id').value    = '';
    document.getElementById('game-color').value = '#7C3AED';
    modalTitle.textContent = 'Add New Game';
}

function populateForm(game) {
    document.getElementById('game-id').value       = game.id || '';
    document.getElementById('game-name').value     = game.name || '';
    document.getElementById('game-category').value = game.category || '';
    document.getElementById('game-url').value      = game.url || '';
    document.getElementById('game-trust').value    = game.trust || 3;
    document.getElementById('game-color').value    = game.color || '#7C3AED';
    document.getElementById('game-tags').value     = (game.tags || []).join(', ');
    document.getElementById('game-desc').value     = game.desc || '';
    document.getElementById('game-notes').value    = game.notes || '';
    document.getElementById('game-warn').value     = game.warn || '';
    document.getElementById('game-isnew').checked  = game.isNew || false;
    modalTitle.textContent = 'Edit Game';
}

// ── Validación ────────────────────────────────────────────────
function validateGame(data) {
    const errors = [];
    if (!data.name || data.name.length < 2 || data.name.length > 100) errors.push('Nombre: 2-100 caracteres');
    if (!data.category) errors.push('Categoría requerida');
    if (!data.url || !isValidUrl(data.url)) errors.push('URL válida requerida');
    if (!data.trust || data.trust < 1 || data.trust > 5) errors.push('Confianza: 1-5');
    if (!data.desc || data.desc.length < 10) errors.push('Descripción: mínimo 10 caracteres');
    return errors;
}

// ── GAMES CRUD ────────────────────────────────────────────────
async function loadGames() {
    if (!checkRateLimit()) return;
    try {
        const snap  = await getDocs(collection(db, '_games'));
        const games = [];
        snap.forEach(d => games.push({ id: d.id, ...d.data() }));
        games.sort((a, b) => String(a.name).localeCompare(String(b.name)));
        displayGames(games);
        updateStats(games);
    } catch (e) {
        logAudit('LOAD_ERROR', { msg: e.message });
        showMessage('Error cargando juegos: ' + e.message, 'error');
    }
}

function displayGames(games) {
    gamesContainer.innerHTML = '';
    if (!games.length) { gamesContainer.innerHTML = '<p>No hay juegos.</p>'; return; }
    games.forEach(game => {
        const d = document.createElement('div');
        d.className = 'game-item';
        const stars = '★'.repeat(game.trust || 0) + '☆'.repeat(5 - (game.trust || 0));
        d.innerHTML = `
            <div>
                <strong>${sanitize(game.name)}</strong>
                <div style="color:#666;font-size:12px">
                    ${sanitize(game.category)} · ${stars}
                    ${game.isNew ? '<span style="color:#10B981">[NEW]</span>' : ''}
                    ${game.warn  ? `<span style="color:#DC2626">[${sanitize(game.warn)}]</span>` : ''}
                </div>
            </div>
            <div class="game-actions">
                <button class="btn btn-warning" data-id="${sanitize(game.id)}" data-action="edit">Edit</button>
                <button class="btn btn-danger"  data-id="${sanitize(game.id)}" data-name="${sanitize(game.name)}" data-action="delete">Delete</button>
            </div>`;
        gamesContainer.appendChild(d);
    });
    gamesContainer.onclick = async (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const { action, id, name } = btn.dataset;
        if (action === 'edit')   await editGame(id);
        if (action === 'delete') await deleteGame(id, name);
    };
}

function updateStats(games) {
    totalGamesEl.textContent  = games.length;
    totalCatsEl.textContent   = new Set(games.map(g => g.category)).size;
    avgTrustEl.textContent    = games.length
        ? (games.reduce((s, g) => s + (g.trust || 0), 0) / games.length).toFixed(1) : 0;
    const timestamps = games.map(g => g.updated?.toDate?.() || 0).filter(Boolean);
    lastUpdatedEl.textContent = timestamps.length
        ? new Date(Math.max(...timestamps)).toLocaleDateString('es-ES') : '-';
}

async function saveGame(event) {
    event.preventDefault();
    if (!checkRateLimit()) return;
    const fd = new FormData(gameForm);
    const data = {
        id:       parseInt(fd.get('id')) || Date.now(),
        name:     sanitize(fd.get('name')),
        category: sanitize(fd.get('category')),
        url:      sanitize(fd.get('url')),
        trust:    parseInt(fd.get('trust')),
        color:    fd.get('color'),
        tags:     fd.get('tags') ? fd.get('tags').split(',').map(t => sanitize(t.trim())).filter(Boolean) : [],
        desc:     sanitize(fd.get('desc')),
        notes:    sanitize(fd.get('notes')) || '',
        warn:     sanitize(fd.get('warn'))  || '',
        isNew:    fd.get('isNew') === 'on',
        updated:  serverTimestamp(),
    };
    const errors = validateGame(data);
    if (errors.length) { showMessage('Errores: ' + errors.join(', '), 'error'); return; }
    try {
        const isNew  = !fd.get('id');
        const docRef = doc(db, '_games', String(data.id));
        if (isNew) {
            data.created = serverTimestamp();
            await setDoc(docRef, data);
            logAudit('CREATED', { id: data.id, name: data.name });
            showMessage('Juego creado.', 'success');
        } else {
            await updateDoc(docRef, data);
            logAudit('UPDATED', { id: data.id, name: data.name });
            showMessage('Juego actualizado.', 'success');
        }
        showModal(false); resetForm(); loadGames();
    } catch (e) {
        logAudit('SAVE_ERROR', { msg: e.message });
        showMessage('Error guardando: ' + e.message, 'error');
    }
}

async function editGame(gameId) {
    if (!checkRateLimit()) return;
    try {
        const snap = await getDoc(doc(db, '_games', gameId));
        if (snap.exists()) { populateForm({ id: snap.id, ...snap.data() }); showModal(true); }
        else showMessage('Juego no encontrado.', 'error');
    } catch (e) { showMessage('Error: ' + e.message, 'error'); }
}

async function deleteGame(gameId, gameName) {
    if (!confirm(`¿Eliminar "${gameName}"? Esta acción no se puede deshacer.`)) return;
    if (!checkRateLimit()) return;
    try {
        await deleteDoc(doc(db, '_games', gameId));
        logAudit('DELETED', { id: gameId, name: gameName });
        showMessage('Juego eliminado.', 'success');
        loadGames();
    } catch (e) { showMessage('Error eliminando: ' + e.message, 'error'); }
}

// ── REPORTS ───────────────────────────────────────────────────
let reportsFilter = 'all';

async function loadReports() {
    if (!checkRateLimit()) return;
    const container = document.getElementById('reports-container');
    container.innerHTML = '<div class="admin-loading">Cargando reportes…</div>';

    try {
        let q;
        if (reportsFilter !== 'all') {
            q = query(collection(db, '_reports'),
                where('status', '==', reportsFilter),
                orderBy('created', 'desc'));
        } else {
            q = query(collection(db, '_reports'), orderBy('created', 'desc'));
        }
        const snap = await getDocs(q);
        const reports = snap.docs.map(d => ({ ...d.data(), reportId: d.id }));
        displayReports(reports);
        document.getElementById('reports-count').textContent = reports.length;
    } catch (e) {
        container.innerHTML = `<p class="admin-error">Error cargando reportes: ${e.message}</p>`;
        logAudit('REPORTS_LOAD_ERROR', { msg: e.message });
    }
}

function displayReports(reports) {
    const container = document.getElementById('reports-container');
    if (!reports.length) {
        container.innerHTML = '<div class="admin-empty">No hay reportes con este filtro.</div>';
        return;
    }

    const statusColors = { pending: '#F59E0B', resolved: '#10B981', dismissed: '#6B7280' };
    const statusLabels = { pending: 'Pendiente', resolved: 'Resuelto', dismissed: 'Descartado' };
    const reasonLabels = { spam: 'Spam', harassment: 'Acoso', misinformation: 'Info. falsa', inappropriate: 'Inapropiado', other: 'Otro' };

    container.innerHTML = reports.map(r => `
        <div class="admin-item" id="report-${sanitize(r.reportId)}">
            <div class="admin-item-header">
                <div>
                    <span class="admin-item-type">${r.type === 'post' ? '📝 Post' : '💬 Comentario'}</span>
                    <span class="admin-item-reason">${sanitize(reasonLabels[r.reason] || r.reason)}</span>
                    <span class="admin-status-badge" style="background:${statusColors[r.status] || '#888'}20;color:${statusColors[r.status] || '#888'};border:1px solid ${statusColors[r.status] || '#888'}">
                        ${sanitize(statusLabels[r.status] || r.status)}
                    </span>
                </div>
                <span class="admin-item-date">${formatDate(r.created)}</span>
            </div>
            <div class="admin-item-body">
                <div class="admin-item-field"><span class="admin-field-label">ID objetivo:</span> <code>${sanitize(r.targetId)}</code></div>
                ${r.details ? `<div class="admin-item-field"><span class="admin-field-label">Detalles:</span> ${sanitize(r.details)}</div>` : ''}
                <div class="admin-item-field"><span class="admin-field-label">Reportado por:</span> <code>${sanitize(r.reportedBy?.slice(0, 12) || '—')}…</code></div>
            </div>
            ${r.status === 'pending' ? `
            <div class="admin-item-actions">
                <button class="btn btn-primary" onclick="updateReport('${sanitize(r.reportId)}', 'resolved')">✓ Resolver</button>
                <button class="btn btn-warning" onclick="updateReport('${sanitize(r.reportId)}', 'dismissed')">✕ Descartar</button>
                <button class="btn btn-danger" onclick="adminDeletePost('${sanitize(r.targetId)}', '${sanitize(r.reportId)}')">🗑 Eliminar contenido</button>
            </div>` : `
            <div class="admin-item-actions">
                <button class="btn" style="background:#333;color:#888" onclick="updateReport('${sanitize(r.reportId)}', 'pending')">↩ Reabrir</button>
            </div>`}
        </div>
    `).join('');
}

async function updateReport(reportId, status) {
    if (!checkRateLimit()) return;
    try {
        await updateDoc(doc(db, '_reports', reportId), {
            status,
            resolvedAt: serverTimestamp(),
        });
        logAudit('REPORT_UPDATED', { reportId, status });
        showMessage(`Reporte marcado como "${status}"`, 'success');
        await loadReports();
    } catch (e) {
        showMessage('Error: ' + e.message, 'error');
    }
}

async function adminDeletePost(postId, reportId) {
    if (!confirm('¿Eliminar este contenido del foro? Esta acción no se puede deshacer.')) return;
    if (!checkRateLimit()) return;
    try {
        await updateDoc(doc(db, '_posts', postId), {
            deleted: true, deletedAt: serverTimestamp(), deletedBy: 'admin'
        });
        // Mark report as resolved
        await updateDoc(doc(db, '_reports', reportId), {
            status: 'resolved', resolvedAt: serverTimestamp()
        });
        logAudit('ADMIN_POST_DELETED', { postId, reportId });
        showMessage('Contenido eliminado y reporte resuelto.', 'success');
        await loadReports();
    } catch (e) {
        showMessage('Error eliminando contenido: ' + e.message, 'error');
    }
}

// ── SUGGESTIONS ───────────────────────────────────────────────
let suggestionsFilter = 'all';

async function loadSuggestions() {
    if (!checkRateLimit()) return;
    const container = document.getElementById('suggestions-container');
    container.innerHTML = '<div class="admin-loading">Cargando sugerencias…</div>';

    try {
        let q;
        if (suggestionsFilter !== 'all') {
            q = query(collection(db, '_suggestions'),
                where('status', '==', suggestionsFilter),
                orderBy('created', 'desc'));
        } else {
            q = query(collection(db, '_suggestions'), orderBy('created', 'desc'));
        }
        const snap = await getDocs(q);
        const suggestions = snap.docs.map(d => ({ ...d.data(), suggestionId: d.id }));
        displaySuggestions(suggestions);
        document.getElementById('suggestions-count').textContent = suggestions.length;
    } catch (e) {
        container.innerHTML = `<p class="admin-error">Error cargando sugerencias: ${e.message}</p>`;
        logAudit('SUGGESTIONS_LOAD_ERROR', { msg: e.message });
    }
}

function displaySuggestions(suggestions) {
    const container = document.getElementById('suggestions-container');
    if (!suggestions.length) {
        container.innerHTML = '<div class="admin-empty">No hay sugerencias con este filtro.</div>';
        return;
    }

    const statusColors = { pending: '#F59E0B', approved: '#7C3AED', rejected: '#DC2626', done: '#10B981' };
    const statusLabels = { pending: 'Pendiente', approved: 'Aprobada', rejected: 'Rechazada', done: '✓ Hecha' };
    const catLabels    = { feature: '✨ Funcionalidad', bug: '🐛 Error', content: '📦 Contenido', design: '🎨 Diseño', other: '💬 Otro' };

    container.innerHTML = suggestions.map(s => `
        <div class="admin-item" id="suggestion-${sanitize(s.suggestionId)}">
            <div class="admin-item-header">
                <div>
                    <span class="admin-item-type">${sanitize(catLabels[s.category] || s.category)}</span>
                    <span class="admin-status-badge" style="background:${statusColors[s.status] || '#888'}20;color:${statusColors[s.status] || '#888'};border:1px solid ${statusColors[s.status] || '#888'}">
                        ${sanitize(statusLabels[s.status] || s.status)}
                    </span>
                </div>
                <span class="admin-item-date">${formatDate(s.created)}</span>
            </div>
            <div class="admin-item-body">
                <div class="admin-item-title">${sanitize(s.title)}</div>
                <div class="admin-item-description">${sanitize(s.description)}</div>
                <div class="admin-item-field"><span class="admin-field-label">Autor:</span> ${sanitize(s.author)} <code style="font-size:0.75em">(${sanitize(s.uid?.slice(0,8) || '—')}…)</code></div>
                ${s.adminNote ? `<div class="admin-item-field admin-note"><span class="admin-field-label">Nota admin:</span> ${sanitize(s.adminNote)}</div>` : ''}
            </div>
            <div class="admin-item-actions">
                ${s.status === 'pending' ? `
                    <button class="btn btn-primary" onclick="updateSuggestion('${sanitize(s.suggestionId)}', 'approved')">✓ Aprobar</button>
                    <button class="btn btn-danger" onclick="updateSuggestion('${sanitize(s.suggestionId)}', 'rejected')">✕ Rechazar</button>
                ` : ''}
                ${s.status === 'approved' ? `
                    <button class="btn btn-primary" style="background:#10B981" onclick="updateSuggestion('${sanitize(s.suggestionId)}', 'done')">✓ Marcar como hecha</button>
                    <button class="btn btn-danger" onclick="updateSuggestion('${sanitize(s.suggestionId)}', 'rejected')">✕ Rechazar</button>
                ` : ''}
                ${['rejected','done'].includes(s.status) ? `
                    <button class="btn btn-warning" onclick="updateSuggestion('${sanitize(s.suggestionId)}', 'pending')">↩ Reabrir</button>
                ` : ''}
                <button class="btn btn-suggestion-note" onclick="promptAdminNote('${sanitize(s.suggestionId)}', '${sanitize((s.adminNote||'').replace(/'/g, "\\'"))}')">📝 Nota</button>
                <button class="btn btn-danger" onclick="deleteSuggestion('${sanitize(s.suggestionId)}')">🗑 Eliminar</button>
            </div>
        </div>
    `).join('');
}

async function updateSuggestion(suggestionId, status) {
    if (!checkRateLimit()) return;
    try {
        await updateDoc(doc(db, '_suggestions', suggestionId), {
            status,
            resolvedAt: serverTimestamp(),
        });
        logAudit('SUGGESTION_UPDATED', { suggestionId, status });
        showMessage(`Sugerencia marcada como "${status}"`, 'success');
        await loadSuggestions();
    } catch (e) {
        showMessage('Error: ' + e.message, 'error');
    }
}

async function promptAdminNote(suggestionId, currentNote) {
    const note = prompt('Escribe una nota para esta sugerencia (máx. 300 caracteres):', currentNote || '');
    if (note === null) return; // cancelled
    if (!checkRateLimit()) return;
    try {
        await updateDoc(doc(db, '_suggestions', suggestionId), {
            adminNote: note.replace(/<[^>]*>/g, '').trim().slice(0, 300),
        });
        logAudit('SUGGESTION_NOTE', { suggestionId });
        showMessage('Nota guardada.', 'success');
        await loadSuggestions();
    } catch (e) {
        showMessage('Error guardando nota: ' + e.message, 'error');
    }
}

async function deleteSuggestion(suggestionId) {
    if (!confirm('¿Eliminar esta sugerencia permanentemente?')) return;
    if (!checkRateLimit()) return;
    try {
        await deleteDoc(doc(db, '_suggestions', suggestionId));
        logAudit('SUGGESTION_DELETED', { suggestionId });
        showMessage('Sugerencia eliminada.', 'success');
        await loadSuggestions();
    } catch (e) {
        showMessage('Error eliminando: ' + e.message, 'error');
    }
}

// ── Auth state listener ───────────────────────────────────────
onAuthStateChanged(auth, (user) => {
    if (isAdminUser(user)) {
        loginContainer.style.display  = 'none';
        adminContainer.style.display  = 'block';
        adminEmailEl.textContent = user.uid ? user.uid.slice(0, 8) + '…' : 'Admin';
        logAudit('SESSION_ACTIVE');
        loadGames();
    } else {
        loginContainer.style.display  = 'block';
        adminContainer.style.display  = 'none';
        adminEmailEl.textContent = '';
        if (user) {
            signOut(auth).catch(() => {});
            showMessage('Acceso denegado.', 'error');
        }
    }
});

// ── Eventos ───────────────────────────────────────────────────
loginBtn.addEventListener('click', signInWithGoogle);
logoutBtn.addEventListener('click', signOutAdmin);
addGameBtn.addEventListener('click', () => { resetForm(); showModal(true); });
cancelBtn.addEventListener('click', () => { showModal(false); resetForm(); });
gameForm.addEventListener('submit', saveGame);
window.addEventListener('click', e => { if (e.target === gameModal) { showModal(false); resetForm(); } });

// Reports filter buttons
document.querySelectorAll('.filter-btn[data-section="reports"]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn[data-section="reports"]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        reportsFilter = btn.dataset.filter;
        loadReports();
    });
});

// Suggestions filter buttons
document.querySelectorAll('.filter-btn[data-section="suggestions"]').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn[data-section="suggestions"]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        suggestionsFilter = btn.dataset.filter;
        loadSuggestions();
    });
});

// Expose functions needed by inline onclick (reports/suggestions buttons)
window.updateReport        = updateReport;
window.adminDeletePost     = adminDeletePost;
window.updateSuggestion    = updateSuggestion;
window.deleteSuggestion    = deleteSuggestion;
window.promptAdminNote     = promptAdminNote;

logAudit('PANEL_LOADED');