// =============================================
// TUTORIALES LOGIC — tutoriales.js
// =============================================

// ============================================================
// THEME MANAGEMENT
// ============================================================
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

// ============================================================
// AUTH UI
// ============================================================
function updateAuthUI(user) {
    const btn    = document.getElementById('btn-auth');
    const avatar = document.getElementById('auth-avatar');
    const profileBtn = document.getElementById('btn-profile');
    if (!btn) return;
    if (user) {
        btn.textContent = 'Salir';
        btn.title = user.displayName || user.email || '';
        if (avatar) {
            avatar.src = user.photoURL || '';
            avatar.style.display = user.photoURL ? 'inline-block' : 'none';
            avatar.onclick = openProfileModal;
            avatar.style.cursor = 'pointer';
        }
        if (profileBtn) profileBtn.style.display = 'inline-flex';
    } else {
        btn.textContent = '⊙ Login';
        btn.title = 'Iniciar sesión';
        if (avatar) { avatar.style.display = 'none'; avatar.onclick = null; }
        if (profileBtn) profileBtn.style.display = 'none';
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
    if (!window._nx || !_nx.user()) {
        showToast('Inicia sesión primero', 'info'); return;
    }
    const overlay = document.getElementById('profile-modal-overlay');
    if (!overlay) return;
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    // load profile data
    document.getElementById('profile-save-btn').disabled = true;
    document.getElementById('profile-save-btn').textContent = 'Cargando…';
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

    document.getElementById('profile-save-btn').disabled = false;
    document.getElementById('profile-save-btn').textContent = 'Guardar';
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

    btn.disabled = true;
    btn.textContent = 'Guardando…';
    const ok = await _nx.saveProfile(name, bio);
    btn.disabled = false;
    btn.textContent = 'Guardar';

    if (ok) {
        showToast('Perfil actualizado', 'success');
        closeProfileModal();
        updateAuthUI(_nx.user());
    } else {
        showToast('Error al guardar el perfil', 'error');
    }
}

// ============================================================
// UI HELPERS
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

// ============================================================
// INIT & EVENT LISTENERS
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme
    initTheme();
    
    // Theme button
    const btnTheme = document.getElementById('btn-theme');
    if (btnTheme) btnTheme.addEventListener('click', toggleTheme);
    
    // Auth button
    const btnAuth = document.getElementById('btn-auth');
    if (btnAuth) btnAuth.addEventListener('click', handleAuthBtn);
    
    // Profile button
    const btnProfile = document.getElementById('btn-profile');
    if (btnProfile) btnProfile.addEventListener('click', openProfileModal);
    
    // Avatar click
    const avatar = document.getElementById('auth-avatar');
    if (avatar) avatar.addEventListener('click', openProfileModal);
    
    // Profile save button
    const profileSaveBtn = document.getElementById('profile-save-btn');
    if (profileSaveBtn) profileSaveBtn.addEventListener('click', saveProfile);
    
    // Profile logout button
    const profileLogoutBtn = document.getElementById('profile-logout-btn');
    if (profileLogoutBtn) profileLogoutBtn.addEventListener('click', () => {
        if (window._nx) _nx.logout();
        closeProfileModal();
    });
    
    // Profile close button
    const profileCloseBtn = document.getElementById('profile-modal-close');
    if (profileCloseBtn) profileCloseBtn.addEventListener('click', closeProfileModal);
    
    // Profile modal overlay click
    const profileOverlay = document.getElementById('profile-modal-overlay');
    if (profileOverlay) {
        profileOverlay.addEventListener('click', e => {
            if (e.target === profileOverlay) closeProfileModal();
        });
    }
    
    // Alert modal overlay click
    const alertOverlay = document.getElementById('alert-modal-overlay');
    if (alertOverlay) {
        alertOverlay.addEventListener('click', e => {
            if (e.target === alertOverlay) {
                alertOverlay.classList.remove('active');
            }
        });
    }
    
    // Keyboard shortcuts
    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            closeProfileModal();
        }
        if (e.key === 't' || e.key === 'T') toggleTheme();
    });
    
    // Initialize Firebase auth if available
    if (window._nx) {
        _nx.init().then(() => {
            const user = _nx.user();
            updateAuthUI(user);
        });
        
        // Listen for auth changes
        window._nxAuthChange = function (user) {
            updateAuthUI(user);
        };
    }
});
