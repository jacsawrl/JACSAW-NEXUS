// =============================================
// FORUM LOGIC — forum.js v2
// =============================================

let forumPosts     = [];
let filteredPosts  = [];
let currentUser    = null;
let activeTag      = null;
let activeAuthorFilter = null; // { uid, name } when viewing a specific user's posts
let currentPostId  = null;    // post currently open in detail modal

// ────────────────────────────────────────────
// DATE FORMAT
// ────────────────────────────────────────────
function formatDate(timestamp) {
    if (!timestamp) return 'Hace poco';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now   = new Date();
    const diff  = Math.floor((now - date) / 1000);
    if (diff < 60)      return 'Hace segundos';
    if (diff < 3600)    return `Hace ${Math.floor(diff / 60)}m`;
    if (diff < 86400)   return `Hace ${Math.floor(diff / 3600)}h`;
    if (diff < 2592000) return `Hace ${Math.floor(diff / 86400)}d`;
    return date.toLocaleDateString('es-ES');
}

// ────────────────────────────────────────────
// AUTH
// ────────────────────────────────────────────
window._nxAuthChange = async function (user) {
    currentUser = user;
    updateAuthUI(user);
    updateForumUI();
};

if (window._nx) {
    _nx.init().then(() => {
        currentUser = _nx.user();
        updateAuthUI(currentUser);
        updateForumUI();
        loadForumPosts();
    });
}

function updateForumUI() {
    const btn = document.getElementById('btn-new-post-forum');
    if (!btn) return;
    btn.disabled = !currentUser;
    btn.title    = currentUser ? 'Crear nuevo tema' : 'Debes iniciar sesión';
}

// ────────────────────────────────────────────
// LOAD & RENDER POSTS
// ────────────────────────────────────────────
async function loadForumPosts() {
    const container = document.getElementById('forum-posts');
    container.innerHTML = '<div class="loading-posts"><span class="loading-spinner"></span> Cargando temas…</div>';
    forumPosts    = await _nx.getForumPosts(150);
    filteredPosts = [...forumPosts];
    applyFilters();
}

function applyFilters() {
    const query  = (document.getElementById('forum-search')?.value || '').toLowerCase().trim();
    const tagVal = activeTag;

    let posts = activeAuthorFilter
        ? forumPosts.filter(p => p.uid === activeAuthorFilter.uid)
        : [...forumPosts];

    if (tagVal && tagVal !== 'all') {
        posts = posts.filter(p => (p.tags || []).includes(tagVal));
    }

    if (query) {
        posts = posts.filter(p =>
            p.title.toLowerCase().includes(query) ||
            p.content.toLowerCase().includes(query) ||
            p.author.toLowerCase().includes(query) ||
            (p.tags || []).some(t => t.toLowerCase().includes(query))
        );
    }

    filteredPosts = posts;
    renderForumPosts(filteredPosts);
    updateSearchInfo(filteredPosts.length, forumPosts.length);
    buildTagCloud();
}

function updateSearchInfo(shown, total) {
    const el = document.getElementById('search-result-info');
    if (!el) return;
    if (activeAuthorFilter) {
        el.textContent = `Mostrando ${shown} publicaciones de "${activeAuthorFilter.name}"`;
        el.style.display = 'block';
    } else if (shown < total) {
        el.textContent = `${shown} de ${total} temas`;
        el.style.display = 'block';
    } else {
        el.textContent = `${total} temas en el foro`;
        el.style.display = 'block';
    }
}

function buildTagCloud() {
    const container = document.getElementById('tag-cloud');
    if (!container) return;
    const tagCount = {};
    forumPosts.forEach(p => (p.tags || []).forEach(t => {
        tagCount[t] = (tagCount[t] || 0) + 1;
    }));
    const tags = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).slice(0, 10);
    container.innerHTML = `
        <button class="tag-chip ${!activeTag || activeTag === 'all' ? 'active' : ''}" onclick="setTag('all')">Todos</button>
        ${tags.map(([t, c]) => `
            <button class="tag-chip ${activeTag === t ? 'active' : ''}" onclick="setTag('${escapeHtml(t)}')">${escapeHtml(t)} <span class="tag-count">${c}</span></button>
        `).join('')}
    `;
}

function setTag(tag) {
    activeTag = tag === 'all' ? null : tag;
    applyFilters();
}

function clearAuthorFilter() {
    activeAuthorFilter = null;
    document.getElementById('author-filter-bar')?.remove();
    applyFilters();
}

function renderForumPosts(posts) {
    const container = document.getElementById('forum-posts');

    if (!posts || posts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">💭</div>
                <h3>No hay temas${activeAuthorFilter ? ' de este usuario' : ''}</h3>
                <p>${activeAuthorFilter ? 'Este usuario no ha publicado nada aún.' : 'Sé el primero en iniciar una conversación'}</p>
                ${activeAuthorFilter ? `<button class="btn-clear-filter" onclick="clearAuthorFilter()">← Ver todos los temas</button>` : ''}
            </div>
        `;
        return;
    }

    container.innerHTML = posts.map(post => {
        const isOwner = currentUser && currentUser.uid === post.uid;
        const tagsHtml = (post.tags || []).length
            ? `<div class="post-tags">${post.tags.map(t => `<span class="post-tag" onclick="event.stopPropagation();setTag('${escapeHtml(t)}')">${escapeHtml(t)}</span>`).join('')}</div>`
            : '';
        return `
        <div class="post-item" onclick="viewPost('${post.postId}')">
            <div class="post-item-top">
                <div class="post-title">${escapeHtml(post.title)}</div>
                ${isOwner ? `
                <button class="btn-delete-post" title="Eliminar mi publicación"
                    onclick="event.stopPropagation(); confirmDeletePost('${post.postId}', '${escapeHtml(post.title).replace(/'/g, "\\'")}')">
                    🗑
                </button>` : ''}
            </div>
            <div class="post-meta">
                <span class="post-meta-item">👤 <span class="post-author-link" onclick="event.stopPropagation(); viewUserProfile('${post.uid}')">${escapeHtml(post.author)}</span></span>
                <span class="post-meta-item">📅 ${formatDate(post.created)}</span>
            </div>
            ${tagsHtml}
            <div class="post-content">${escapeHtml(post.content.substring(0, 150))}${post.content.length > 150 ? '…' : ''}</div>
            <div class="post-stats">
                <span>💬 ${post.commentCount || 0} respuestas</span>
                <span>👍 ${post.votes || 0} votos</span>
            </div>
        </div>`;
    }).join('');
}

// ────────────────────────────────────────────
// NEW POST MODAL
// ────────────────────────────────────────────
function openNewPostModal() {
    if (!currentUser) { showAlert('Debes iniciar sesión para crear temas'); return; }
    document.getElementById('new-post-modal-overlay').classList.add('active');
    document.body.style.overflow = 'hidden';
    document.getElementById('post-title-input').focus();
}

function closeNewPostModal() {
    document.getElementById('new-post-modal-overlay').classList.remove('active');
    document.body.style.overflow = '';
    document.getElementById('post-title-input').value   = '';
    document.getElementById('post-content-input').value = '';
    document.getElementById('post-tags-input').value    = '';
}

async function submitNewPost() {
    const title   = document.getElementById('post-title-input').value.trim();
    const content = document.getElementById('post-content-input').value.trim();
    const tagsRaw = document.getElementById('post-tags-input').value.trim();
    const tags    = tagsRaw ? tagsRaw.split(',').map(t => t.trim()).filter(Boolean).slice(0, 5) : [];

    if (!title)   { showAlert('El título es obligatorio'); return; }
    if (!content) { showAlert('El contenido es obligatorio'); return; }
    if (title.length > 200) { showAlert('El título debe tener máximo 200 caracteres'); return; }
    if (content.length > 3000) { showAlert('El contenido debe tener máximo 3000 caracteres'); return; }

    const btn = document.getElementById('btn-submit-post');
    btn.disabled    = true;
    btn.textContent = 'Publicando...';

    const post = await _nx.createPost(title, content, tags);

    btn.disabled    = false;
    btn.textContent = 'Publicar';

    if (post) {
        showToast('¡Tema creado exitosamente!', 'success');
        closeNewPostModal();
        await loadForumPosts();
    } else {
        showAlert('Error al crear el tema. Intenta de nuevo.');
    }
}

// ────────────────────────────────────────────
// DELETE OWN POST
// ────────────────────────────────────────────
async function confirmDeletePost(postId, title) {
    const confirmed = await showConfirm(`¿Eliminar el tema "${title}"? Esta acción no se puede deshacer.`);
    if (!confirmed) return;

    const ok = await _nx.deletePost(postId);
    if (ok) {
        showToast('Tema eliminado', 'success');
        await loadForumPosts();
        // Si el modal de detalle estaba abierto con este post, cerrarlo
        if (currentPostId === postId) closePostDetail();
    } else {
        showAlert('No se pudo eliminar el tema. Solo puedes eliminar tus propias publicaciones.');
    }
}

// ────────────────────────────────────────────
// POST DETAIL
// ────────────────────────────────────────────
async function viewPost(postId) {
    const post = forumPosts.find(p => p.postId === postId)
              || filteredPosts.find(p => p.postId === postId);
    if (!post) return;

    currentPostId = postId;
    const overlay   = document.getElementById('post-detail-modal-overlay');
    const container = document.getElementById('post-detail-content');
    container.innerHTML = '<div class="loading-posts"><span class="loading-spinner"></span> Cargando…</div>';
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    const comments = await _nx.getComments(postId);

    // Check votes for current user
    const likedMap = {};
    if (currentUser) {
        await Promise.all(comments.map(async c => {
            likedMap[c.commentId] = await _nx.hasVotedComment(postId, c.commentId);
        }));
    }

    const isOwner = currentUser && currentUser.uid === post.uid;
    const tagsHtml = (post.tags || []).length
        ? `<div class="post-tags" style="margin-bottom:1rem">${post.tags.map(t => `<span class="post-tag">${escapeHtml(t)}</span>`).join('')}</div>`
        : '';

    let commentHtml = '';
    if (comments.length > 0) {
        commentHtml = `
            <div class="comments-section">
                <div class="comments-title">💬 Respuestas (${comments.length})</div>
                ${comments.map(c => {
                    const isCommentOwner = currentUser && currentUser.uid === c.uid;
                    return `
                    <div class="comment-item" id="comment-${c.commentId}">
                        <div class="comment-header">
                            <span class="comment-author" onclick="viewUserProfile('${c.uid}')">${escapeHtml(c.author)}</span>
                            <span class="comment-time">${formatDate(c.created)}</span>
                        </div>
                        <div class="comment-content">${escapeHtml(c.content)}</div>
                        <div class="comment-actions">
                            <span class="btn-like ${likedMap[c.commentId] ? 'liked' : ''}"
                                  onclick="toggleLike('${postId}', '${c.commentId}', this)"
                                  title="${likedMap[c.commentId] ? 'Ya votado' : 'Me gusta'}">
                                👍 <span class="vote-count">${c.votes || 0}</span>
                            </span>
                            <span class="btn-report-comment"
                                  onclick="openReportModal('comment','${c.commentId}','${postId}')"
                                  title="Reportar comentario">
                                ⚑ Reportar
                            </span>
                            ${isCommentOwner ? `
                            <span class="btn-delete-comment"
                                  onclick="confirmDeleteComment('${postId}','${c.commentId}')"
                                  title="Eliminar mi respuesta">
                                🗑 Eliminar
                            </span>` : ''}
                        </div>
                    </div>`;
                }).join('')}
            </div>
        `;
    }

    const replyFormHtml = currentUser ? `
        <div class="reply-form">
            <div class="reply-form-title">Escribe tu respuesta…</div>
            <textarea class="reply-textarea" id="reply-textarea-${postId}" placeholder="Tu respuesta aquí…" maxlength="1000"></textarea>
            <div style="text-align:right;font-size:0.75rem;color:var(--text-tertiary);margin-bottom:0.5rem" id="reply-char-count-${postId}">0/1000</div>
            <div class="reply-actions">
                <button class="btn-reply-submit" onclick="submitComment('${postId}')">Responder</button>
            </div>
        </div>
    ` : `
        <div style="text-align:center;padding:1.5rem;color:var(--text-tertiary)">
            <p>Debes <strong style="color:var(--accent);cursor:pointer" onclick="handleAuthBtn()">iniciar sesión</strong> para responder</p>
        </div>
    `;

    container.innerHTML = `
        <div class="post-detail">
            <div class="post-detail-header">
                <div class="post-detail-title">${escapeHtml(post.title)}</div>
                <div class="post-detail-actions">
                    ${isOwner ? `<button class="btn-post-delete" onclick="confirmDeletePost('${postId}', '${escapeHtml(post.title).replace(/'/g, "\\'")}')">🗑 Eliminar</button>` : ''}
                    <button class="btn-post-report" onclick="openReportModal('post','${postId}',null)">⚑ Reportar</button>
                </div>
            </div>
            <div class="post-detail-meta">
                <span>👤 <span class="post-detail-author" onclick="viewUserProfile('${post.uid}')">${escapeHtml(post.author)}</span></span>
                <span>📅 ${formatDate(post.created)}</span>
                <span>👍 ${post.votes || 0} votos</span>
            </div>
            ${tagsHtml}
            <div class="post-detail-content">${escapeHtml(post.content)}</div>
        </div>
        ${commentHtml}
        ${replyFormHtml}
    `;

    // Character counter for reply
    const textarea = document.getElementById(`reply-textarea-${postId}`);
    const counter  = document.getElementById(`reply-char-count-${postId}`);
    if (textarea && counter) {
        textarea.addEventListener('input', () => {
            counter.textContent = `${textarea.value.length}/1000`;
        });
    }
}

function closePostDetail() {
    document.getElementById('post-detail-modal-overlay').classList.remove('active');
    document.body.style.overflow = '';
    currentPostId = null;
}

// ────────────────────────────────────────────
// COMMENTS
// ────────────────────────────────────────────
async function submitComment(postId) {
    const textarea = document.getElementById(`reply-textarea-${postId}`);
    if (!textarea) return;
    const content = textarea.value.trim();
    if (!content) { showAlert('La respuesta no puede estar vacía'); return; }
    if (content.length > 1000) { showAlert('Máximo 1000 caracteres'); return; }

    const btn = document.querySelector('.btn-reply-submit');
    if (btn) { btn.disabled = true; btn.textContent = 'Enviando…'; }

    const comment = await _nx.createComment(postId, content);

    if (btn) { btn.disabled = false; btn.textContent = 'Responder'; }

    if (comment) {
        showToast('¡Respuesta publicada!', 'success');
        // Update local commentCount
        const post = forumPosts.find(p => p.postId === postId);
        if (post) post.commentCount = (post.commentCount || 0) + 1;
        await viewPost(postId); // re-render detail
    } else {
        showAlert('Error al publicar respuesta');
    }
}

async function confirmDeleteComment(postId, commentId) {
    const confirmed = await showConfirm('¿Eliminar tu respuesta? Esta acción no se puede deshacer.');
    if (!confirmed) return;
    const ok = await _nx.deleteComment(postId, commentId);
    if (ok) {
        showToast('Respuesta eliminada', 'success');
        const post = forumPosts.find(p => p.postId === postId);
        if (post) post.commentCount = Math.max((post.commentCount || 1) - 1, 0);
        await viewPost(postId);
    } else {
        showAlert('No se pudo eliminar. Solo puedes eliminar tus propias respuestas.');
    }
}

async function toggleLike(postId, commentId, el) {
    if (!currentUser) { showAlert('Debes iniciar sesión para votar'); return; }
    if (el.classList.contains('liked')) {
        showToast('Ya has votado este comentario', 'info');
        return;
    }
    const result = await _nx.voteComment(postId, commentId);
    if (result.alreadyVoted) {
        showToast('Ya has votado este comentario', 'info');
        el.classList.add('liked');
    } else if (result.voted) {
        showToast('¡Voto registrado!', 'success');
        el.classList.add('liked');
        const countEl = el.querySelector('.vote-count');
        if (countEl) countEl.textContent = parseInt(countEl.textContent || '0') + 1;
    } else {
        showToast('Error al votar', 'error');
    }
}

// ────────────────────────────────────────────
// USER PROFILE MODAL
// ────────────────────────────────────────────
async function viewUserProfile(uid) {
    const container = document.getElementById('user-profile-content');
    const overlay   = document.getElementById('user-profile-modal-overlay');

    container.innerHTML = '<div class="loading-posts"><span class="loading-spinner"></span></div>';
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    const [stats, authorStats, userPosts] = await Promise.all([
        _nx.getUserStats(uid),
        _nx.getAuthorStats(uid),
        _nx.getUserPosts(uid, 5),
    ]);

    const isOwnProfile = currentUser && currentUser.uid === uid;

    const recentPostsHtml = userPosts.length > 0 ? `
        <div class="user-posts-section">
            <div class="user-posts-title">Publicaciones recientes</div>
            ${userPosts.map(p => `
                <div class="user-post-item" onclick="closeUserProfileModal(); setTimeout(() => viewPost('${p.postId}'), 300)">
                    <span class="user-post-item-title">${escapeHtml(p.title)}</span>
                    <span class="user-post-item-date">${formatDate(p.created)}</span>
                </div>
            `).join('')}
        </div>
    ` : '';

    container.innerHTML = `
        <div class="user-profile-inner">
            <h2 class="modal-title">${escapeHtml(stats.displayName)}</h2>
            ${stats.bio ? `<p style="color:var(--text-secondary);margin-bottom:1.5rem;line-height:1.6">${escapeHtml(stats.bio)}</p>` : ''}

            <div class="user-stats-grid">
                <div class="user-stat-card">
                    <div class="user-stat-num">${authorStats.posts}</div>
                    <div class="user-stat-label">Temas creados</div>
                </div>
                <div class="user-stat-card">
                    <div class="user-stat-num">${authorStats.comments}</div>
                    <div class="user-stat-label">Respuestas</div>
                </div>
                <div class="user-stat-card">
                    <div class="user-stat-num">⭐ ${authorStats.avgRating}</div>
                    <div class="user-stat-label">Rating medio</div>
                </div>
            </div>

            ${recentPostsHtml}

            <div class="user-profile-actions">
                <button class="btn-view-all-posts" onclick="filterByAuthor('${uid}', '${escapeHtml(stats.displayName).replace(/'/g, "\\'")}')">
                    Ver todas sus publicaciones
                </button>
                ${isOwnProfile ? '' : `
                <button class="btn-report-user" onclick="openReportModal('post','${uid}',null)">
                    ⚑ Reportar usuario
                </button>`}
            </div>
        </div>
    `;
}

function closeUserProfileModal() {
    document.getElementById('user-profile-modal-overlay').classList.remove('active');
    document.body.style.overflow = '';
}

function filterByAuthor(uid, name) {
    activeAuthorFilter = { uid, name };
    closeUserProfileModal();

    // Show author filter bar
    let bar = document.getElementById('author-filter-bar');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'author-filter-bar';
        bar.className = 'author-filter-bar';
        const forumHeader = document.querySelector('.forum-header');
        forumHeader.insertAdjacentElement('afterend', bar);
    }
    bar.innerHTML = `
        <span>📌 Filtrando por: <strong>${escapeHtml(name)}</strong></span>
        <button onclick="clearAuthorFilter()">✕ Quitar filtro</button>
    `;
    applyFilters();
}

// ────────────────────────────────────────────
// REPORT MODAL
// ────────────────────────────────────────────
function openReportModal(type, targetId, parentId) {
    if (!currentUser) { showAlert('Debes iniciar sesión para reportar contenido'); return; }
    const overlay = document.getElementById('report-modal-overlay');
    overlay.dataset.type     = type;
    overlay.dataset.targetId = targetId;
    overlay.dataset.parentId = parentId || '';
    overlay.classList.add('active');
    document.getElementById('report-reason').value  = '';
    document.getElementById('report-details').value = '';
    document.body.style.overflow = 'hidden';
}

function closeReportModal() {
    document.getElementById('report-modal-overlay').classList.remove('active');
    document.body.style.overflow = '';
}

async function submitReport() {
    const overlay  = document.getElementById('report-modal-overlay');
    const reason   = document.getElementById('report-reason').value;
    const details  = document.getElementById('report-details').value.trim();
    const type     = overlay.dataset.type;
    const targetId = overlay.dataset.targetId;

    if (!reason) { showAlert('Selecciona un motivo de reporte'); return; }

    const btn = document.getElementById('btn-submit-report');
    btn.disabled    = true;
    btn.textContent = 'Enviando…';

    const result = await _nx.reportContent(type, targetId, reason, details);

    btn.disabled    = false;
    btn.textContent = 'Enviar reporte';

    if (result === 'rate_limited') {
        showAlert('Has enviado demasiados reportes recientemente. Espera unos minutos.');
    } else if (result === true) {
        showToast('Reporte enviado. El equipo lo revisará pronto.', 'success');
        closeReportModal();
    } else {
        showAlert('Error al enviar el reporte. Intenta de nuevo.');
    }
}

// ────────────────────────────────────────────
// SUGGESTION MODAL
// ────────────────────────────────────────────
function openSuggestionModal() {
    if (!currentUser) { showAlert('Debes iniciar sesión para enviar sugerencias'); return; }
    document.getElementById('suggestion-modal-overlay').classList.add('active');
    document.body.style.overflow = 'hidden';
    document.getElementById('suggestion-title').value       = '';
    document.getElementById('suggestion-description').value = '';
    document.getElementById('suggestion-category').value   = '';
}

function closeSuggestionModal() {
    document.getElementById('suggestion-modal-overlay').classList.remove('active');
    document.body.style.overflow = '';
}

async function submitSuggestion() {
    const title    = document.getElementById('suggestion-title').value.trim();
    const desc     = document.getElementById('suggestion-description').value.trim();
    const category = document.getElementById('suggestion-category').value;

    if (!title)    { showAlert('El título es obligatorio'); return; }
    if (!desc)     { showAlert('La descripción es obligatoria'); return; }
    if (!category) { showAlert('Selecciona una categoría'); return; }
    if (title.length > 100) { showAlert('El título debe tener máximo 100 caracteres'); return; }

    const btn = document.getElementById('btn-submit-suggestion');
    btn.disabled    = true;
    btn.textContent = 'Enviando…';

    const result = await _nx.createSuggestion(title, desc, category);

    btn.disabled    = false;
    btn.textContent = 'Enviar sugerencia';

    if (result === 'rate_limited') {
        showAlert('Has enviado demasiadas sugerencias recientemente.');
    } else if (result === true) {
        showToast('¡Sugerencia enviada! Gracias por tu aportación.', 'success');
        closeSuggestionModal();
    } else {
        showAlert('Error al enviar la sugerencia. Intenta de nuevo.');
    }
}

// ────────────────────────────────────────────
// UI HELPERS
// ────────────────────────────────────────────
function escapeHtml(text) {
    const map = { '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;' };
    return String(text || '').replace(/[&<>"']/g, m => map[m]);
}

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
    const cancelBtn = document.getElementById('alert-cancel-btn');
    cancelBtn.style.display = 'inline-block';
    document.getElementById('alert-modal-overlay').classList.add('active');
    return new Promise(resolve => {
        document.getElementById('alert-ok-btn').onclick = () => {
            document.getElementById('alert-modal-overlay').classList.remove('active');
            cancelBtn.style.display = 'none';
            resolve(true);
        };
        cancelBtn.onclick = () => {
            document.getElementById('alert-modal-overlay').classList.remove('active');
            cancelBtn.style.display = 'none';
            resolve(false);
        };
    });
}

// ────────────────────────────────────────────
// THEME
// ────────────────────────────────────────────
let theme = localStorage.getItem('nexus_theme') || 'dark';

function initTheme() {
    theme = localStorage.getItem('nexus_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    const btn = document.getElementById('btn-theme');
    if (btn) btn.textContent = theme === 'dark' ? '☀' : '☾';
}

function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('nexus_theme', theme);
    initTheme();
}

// ────────────────────────────────────────────
// AUTH UI
// ────────────────────────────────────────────
function updateAuthUI(user) {
    const btn        = document.getElementById('btn-auth');
    const avatar     = document.getElementById('auth-avatar');
    const profileBtn = document.getElementById('btn-profile');
    if (!btn) return;
    if (user) {
        btn.textContent = 'Salir';
        btn.title = user.displayName || user.email || '';
        if (avatar) {
            avatar.src = user.photoURL || '';
            avatar.style.display = user.photoURL ? 'inline-block' : 'none';
        }
        if (profileBtn) profileBtn.style.display = 'inline-flex';
    } else {
        btn.textContent = '⊙ Login';
        btn.title = 'Iniciar sesión';
        if (avatar) avatar.style.display = 'none';
        if (profileBtn) profileBtn.style.display = 'none';
    }
}

function handleAuthBtn() {
    if (!window._nx) return;
    if (_nx.user()) { _nx.logout(); } else { _nx.login(); }
}

// ────────────────────────────────────────────
// PROFILE MODAL (own profile)
// ────────────────────────────────────────────
async function openProfileModal() {
    if (!window._nx || !_nx.user()) { showToast('Inicia sesión primero', 'info'); return; }
    const overlay = document.getElementById('profile-modal-overlay');
    if (!overlay) return;
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    const saveBtn = document.getElementById('profile-save-btn');
    saveBtn.disabled    = true;
    saveBtn.textContent = 'Cargando…';

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

    saveBtn.disabled    = false;
    saveBtn.textContent = 'Guardar';
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

    btn.disabled    = true;
    btn.textContent = 'Guardando…';
    const ok = await _nx.saveProfile(name, bio);
    btn.disabled    = false;
    btn.textContent = 'Guardar';

    if (ok) {
        showToast('Perfil actualizado', 'success');
        closeProfileModal();
        updateAuthUI(_nx.user());
    } else {
        showToast('Error al guardar el perfil', 'error');
    }
}

// ────────────────────────────────────────────
// EVENT LISTENERS
// ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    initTheme();

    // Forum search
    const searchInput = document.getElementById('forum-search');
    if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', () => {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(applyFilters, 300);
        });
        searchInput.addEventListener('keydown', e => {
            if (e.key === 'Escape') { searchInput.value = ''; applyFilters(); }
        });
    }

    // New post button
    document.getElementById('btn-new-post-forum')?.addEventListener('click', openNewPostModal);

    // Suggestion button
    document.getElementById('btn-new-suggestion')?.addEventListener('click', openSuggestionModal);

    // Modal close buttons
    document.getElementById('new-post-close')?.addEventListener('click', closeNewPostModal);
    document.getElementById('post-detail-close')?.addEventListener('click', closePostDetail);
    document.getElementById('user-profile-close')?.addEventListener('click', closeUserProfileModal);
    document.getElementById('report-modal-close')?.addEventListener('click', closeReportModal);
    document.getElementById('suggestion-modal-close')?.addEventListener('click', closeSuggestionModal);
    document.getElementById('profile-modal-close')?.addEventListener('click', closeProfileModal);

    // Submit buttons
    document.getElementById('btn-submit-post')?.addEventListener('click', submitNewPost);
    document.getElementById('btn-submit-report')?.addEventListener('click', submitReport);
    document.getElementById('btn-submit-suggestion')?.addEventListener('click', submitSuggestion);

    // Overlay clicks
    const overlayIds = [
        ['new-post-modal-overlay',      closeNewPostModal],
        ['post-detail-modal-overlay',   closePostDetail],
        ['user-profile-modal-overlay',  closeUserProfileModal],
        ['report-modal-overlay',        closeReportModal],
        ['suggestion-modal-overlay',    closeSuggestionModal],
        ['profile-modal-overlay',       closeProfileModal],
    ];
    overlayIds.forEach(([id, fn]) => {
        document.getElementById(id)?.addEventListener('click', e => {
            if (e.target.id === id) fn();
        });
    });

    // Auth
    document.getElementById('btn-auth')?.addEventListener('click', handleAuthBtn);
    document.getElementById('btn-theme')?.addEventListener('click', toggleTheme);
    document.getElementById('btn-profile')?.addEventListener('click', openProfileModal);
    document.getElementById('auth-avatar')?.addEventListener('click', openProfileModal);
    document.getElementById('profile-save-btn')?.addEventListener('click', saveProfile);
    document.getElementById('profile-logout-btn')?.addEventListener('click', () => {
        if (window._nx) _nx.logout();
        closeProfileModal();
    });

    // Alert modal
    document.getElementById('alert-modal-overlay')?.addEventListener('click', e => {
        if (e.target.id === 'alert-modal-overlay')
            document.getElementById('alert-modal-overlay').classList.remove('active');
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            closeNewPostModal();
            closePostDetail();
            closeUserProfileModal();
            closeReportModal();
            closeSuggestionModal();
            closeProfileModal();
        }
        if ((e.key === 't' || e.key === 'T') && !['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) {
            toggleTheme();
        }
        if ((e.key === '/') && !['INPUT','TEXTAREA'].includes(document.activeElement?.tagName)) {
            e.preventDefault();
            document.getElementById('forum-search')?.focus();
        }
    });
});