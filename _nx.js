// _nx.js — jacsaw nexus internal layer v5
// Las claves de Firebase son públicas por diseño — la seguridad la
// imponen las Firestore Rules en el servidor.
;(function (w) {
    'use strict';

    // ── config (pública por diseño — ver README) ─────────────────
    const _p = [
        'AIzaSyDIkK8fuOIvbAZ362AG_-FSvbPXOpTR5Bc',
        'jacsaw-nexus.firebaseapp.com',
        'jacsaw-nexus',
        'jacsaw-nexus.firebasestorage.app',
        '1095745131617',
        '1:1095745131617:web:3658813180c5b523860620',
        'G-4M9BE08NH2',
    ];
    const _cfg = {
        apiKey:            _p[0],
        authDomain:        _p[1],
        projectId:         _p[2],
        storageBucket:     _p[3],
        messagingSenderId: _p[4],
        appId:             _p[5],
        measurementId:     _p[6],
    };

    // ── alias de colecciones ─────────────────────────────────────
    const _C = Object.freeze({
        sessions:    '_s',
        users:       '_u',
        clicks:      '_r',
        posts:       '_posts',
        votes:       '_votes',
        reports:     '_reports',
        suggestions: '_suggestions',
    });

    // ── estado privado del módulo ─────────────────────────────────
    let _db = null, _auth = null, _ready = false;
    let _doc, _getDoc, _setDoc, _updateDoc, _deleteDoc, _increment,
        _collection, _query, _orderBy, _limit, _getDocs, _where,
        _serverTimestamp, _onAuthStateChanged,
        _GoogleAuthProvider, _signInWithPopup, _signOut;

    const NX = { _user: null };

    // ────────────────────────────────────────────────────────────
    // INIT
    // ────────────────────────────────────────────────────────────
    NX.init = async function () {
        if (_ready) return;
        try {
            const CDN = 'https://www.gstatic.com/firebasejs/10.12.2/';
            const [{ initializeApp, getApps }, fs, au] = await Promise.all([
                import(CDN + 'firebase-app.js'),
                import(CDN + 'firebase-firestore.js'),
                import(CDN + 'firebase-auth.js'),
            ]);

            const app = getApps().length ? getApps()[0] : initializeApp(_cfg);
            _db   = fs.getFirestore(app);
            _auth = au.getAuth(app);

            // Firestore API
            _doc = fs.doc; _getDoc = fs.getDoc; _setDoc = fs.setDoc;
            _updateDoc = fs.updateDoc; _increment = fs.increment;
            _deleteDoc = fs.deleteDoc;
            _collection = fs.collection; _query = fs.query;
            _orderBy = fs.orderBy; _limit = fs.limit; _where = fs.where;
            _getDocs = fs.getDocs; _serverTimestamp = fs.serverTimestamp;

            // Auth API
            _GoogleAuthProvider  = au.GoogleAuthProvider;
            _signInWithPopup     = au.signInWithPopup;
            _signOut             = au.signOut;
            _onAuthStateChanged  = au.onAuthStateChanged;

            _ready = true;

            // ── hit de sesión (una vez por pestaña) ─────────────
            if (!sessionStorage.getItem('_nx_hit')) {
                sessionStorage.setItem('_nx_hit', '1');
                _setDoc(
                    _doc(_db, _C.sessions, 'global'),
                    { t: _increment(1), ts: _serverTimestamp() },
                    { merge: true }
                ).catch(() => {});
            }

            // ── listener de auth ─────────────────────────────────
            _onAuthStateChanged(_auth, (u) => {
                NX._user = u || null;
                if (typeof w._nxAuthChange === 'function') w._nxAuthChange(u);
            });

        } catch (err) {
            console.warn('[NX] init — offline:', err.message);
        }
    };

    // ────────────────────────────────────────────────────────────
    // AUTH
    // ────────────────────────────────────────────────────────────
    NX.login = async function () {
        if (!_ready) return;
        try {
            const provider = new _GoogleAuthProvider();
            provider.setCustomParameters({ prompt: 'select_account' });
            await _signInWithPopup(_auth, provider);
        } catch (e) {
            if (e.code !== 'auth/popup-closed-by-user')
                console.warn('[NX] login:', e.code);
        }
    };

    NX.logout = async function () {
        if (!_ready) return;
        await _signOut(_auth).catch(() => {});
    };

    NX.user = function () { return NX._user; };

    // ────────────────────────────────────────────────────────────
    // PERFIL
    // ────────────────────────────────────────────────────────────
    NX.getProfile = async function () {
        if (!_ready || !NX._user) return null;
        const uid = NX._user.uid;
        try {
            const snap = await _getDoc(_doc(_db, _C.users, uid));
            if (!snap.exists()) return { displayName: NX._user.displayName || '', bio: '', uid };
            const d = snap.data();
            return { displayName: d.dn || NX._user.displayName || '', bio: d.bio || '', uid };
        } catch (e) {
            console.warn('[NX] getProfile:', e.message);
            return null;
        }
    };

    NX.saveProfile = async function (displayName, bio) {
        if (!_ready || !NX._user) return false;
        const uid = NX._user.uid;
        const dn  = String(displayName || '').replace(/<[^>]*>/g, '').trim().slice(0, 32);
        const b   = String(bio || '').replace(/<[^>]*>/g, '').trim().slice(0, 160);
        if (!dn) return false;
        try {
            await _setDoc(_doc(_db, _C.users, uid),
                { dn, bio: b, upd: _serverTimestamp() },
                { merge: true }
            );
            return true;
        } catch (e) {
            console.warn('[NX] saveProfile:', e.message);
            return false;
        }
    };

    NX.getPublicProfile = async function (uid) {
        if (!_ready || !uid) return null;
        try {
            const snap = await _getDoc(_doc(_db, _C.users, uid));
            if (!snap.exists()) return { displayName: 'Anónimo', bio: '' };
            const d = snap.data();
            return { displayName: d.dn || 'Anónimo', bio: d.bio || '' };
        } catch (e) {
            return { displayName: 'Anónimo', bio: '' };
        }
    };

    // ────────────────────────────────────────────────────────────
    // FAVORITOS
    // ────────────────────────────────────────────────────────────
    NX.getFavs = async function () {
        if (!_ready || !NX._user) return null;
        const uid = NX._user.uid;
        try {
            const snap = await _getDoc(_doc(_db, _C.users, uid));
            return snap.exists() ? (snap.data().f || []) : [];
        } catch (e) { return null; }
    };

    NX.saveFavs = async function (ids) {
        if (!_ready || !NX._user) return;
        const uid  = NX._user.uid;
        const safe = (Array.isArray(ids) ? ids : []).filter(x => typeof x === 'number');
        try {
            await _setDoc(_doc(_db, _C.users, uid),
                { f: safe, upd: _serverTimestamp() },
                { merge: true }
            );
        } catch (e) {}
    };

    // ────────────────────────────────────────────────────────────
    // CONTADORES DE VISITAS
    // ────────────────────────────────────────────────────────────
    NX.trackVisit = async function (rid) {
        if (!_ready) return;
        const key = '_nx_v_' + rid;
        if (sessionStorage.getItem(key)) return;
        sessionStorage.setItem(key, '1');
        try {
            await _setDoc(
                _doc(_db, _C.clicks, String(rid)),
                { c: _increment(1), id: Number(rid) },
                { merge: true }
            );
        } catch (e) {}
    };

    NX.getPopular = async function (n) {
        if (!_ready) return {};
        n = Math.min(Number(n) || 50, 100);
        try {
            const snap = await _getDocs(
                _query(
                    _collection(_db, _C.clicks),
                    _orderBy('c', 'desc'),
                    _limit(n)
                )
            );
            const out = {};
            snap.forEach(d => {
                const { id, c } = d.data();
                if (typeof id === 'number' && typeof c === 'number') out[id] = c;
            });
            return out;
        } catch (e) {
            return {};
        }
    };

    // ────────────────────────────────────────────────────────────
    // STATS DE USUARIO
    // ────────────────────────────────────────────────────────────
    NX.updateUserPageVisit = async function () {
        if (!_ready || !NX._user) return;
        const uid = NX._user.uid;
        try {
            await _setDoc(_doc(_db, _C.users, uid), {
                gameVisits: _increment(1),
                lastVisit:  _serverTimestamp()
            }, { merge: true });
        } catch (e) {}
    };

    NX.getUserStats = async function (uid) {
        if (!_ready) return null;
        try {
            const snap = await _getDoc(_doc(_db, _C.users, uid));
            if (!snap.exists()) return { displayName: 'Anónimo', bio: '', gameVisits: 0 };
            const d = snap.data();
            return {
                displayName: d.dn || d.displayName || 'Anónimo',
                bio:         d.bio || '',
                gameVisits:  d.gameVisits || 0,
            };
        } catch (e) {
            console.warn('[NX] getUserStats:', e.message);
            return { displayName: 'Anónimo', bio: '', gameVisits: 0 };
        }
    };

    // ────────────────────────────────────────────────────────────
    // FORO — Posts
    // ────────────────────────────────────────────────────────────
    NX.createPost = async function (title, content, tags) {
        if (!_ready || !NX._user) return null;
        try {
            const profile = await NX.getProfile();
            const displayName = profile?.displayName || NX._user.displayName || 'Anónimo';
            const postRef = _doc(_collection(_db, _C.posts));
            const post = {
                uid:          NX._user.uid,
                author:       displayName,
                title:        String(title).replace(/<[^>]*>/g, '').trim().slice(0, 200),
                content:      String(content).replace(/<[^>]*>/g, '').trim().slice(0, 3000),
                tags:         Array.isArray(tags) ? tags.slice(0, 5) : [],
                created:      _serverTimestamp(),
                votes:        0,
                commentCount: 0,
                deleted:      false,
            };
            await _setDoc(postRef, post);
            // Increment post count for user
            await _setDoc(_doc(_db, _C.users, NX._user.uid),
                { postCount: _increment(1) }, { merge: true });
            return { ...post, postId: postRef.id };
        } catch (e) {
            console.warn('[NX] createPost:', e.message);
            return null;
        }
    };

    NX.getForumPosts = async function (n = 50) {
        if (!_ready) return [];
        try {
            const snap = await _getDocs(
                _query(_collection(_db, _C.posts),
                    _where('deleted', '==', false),
                    _orderBy('created', 'desc'),
                    _limit(Math.min(n, 200))
                )
            );
            return snap.docs.map(d => ({ ...d.data(), postId: d.id }));
        } catch (e) {
            // Fallback without where if index not ready
            try {
                const snap2 = await _getDocs(
                    _query(_collection(_db, _C.posts),
                        _orderBy('created', 'desc'),
                        _limit(Math.min(n, 200))
                    )
                );
                return snap2.docs
                    .map(d => ({ ...d.data(), postId: d.id }))
                    .filter(p => !p.deleted);
            } catch (e2) {
                console.warn('[NX] getForumPosts:', e2.message);
                return [];
            }
        }
    };

    NX.getUserPosts = async function (uid, n = 50) {
        if (!_ready || !uid) return [];
        try {
            const snap = await _getDocs(
                _query(_collection(_db, _C.posts),
                    _where('uid', '==', uid),
                    _where('deleted', '==', false),
                    _orderBy('created', 'desc'),
                    _limit(Math.min(n, 100))
                )
            );
            return snap.docs.map(d => ({ ...d.data(), postId: d.id }));
        } catch (e) {
            // Fallback: get all and filter client-side
            try {
                const all = await NX.getForumPosts(200);
                return all.filter(p => p.uid === uid).slice(0, n);
            } catch (e2) {
                console.warn('[NX] getUserPosts:', e2.message);
                return [];
            }
        }
    };

    NX.deletePost = async function (postId) {
        if (!_ready || !NX._user) return false;
        try {
            const postRef = _doc(_db, _C.posts, postId);
            const snap = await _getDoc(postRef);
            if (!snap.exists()) return false;
            const data = snap.data();
            // Solo el autor puede borrar su post
            if (data.uid !== NX._user.uid) return false;
            // Soft delete: marcamos como eliminado
            await _updateDoc(postRef, {
                deleted:   true,
                deletedAt: _serverTimestamp(),
                deletedBy: NX._user.uid,
            });
            // Decrement post count
            await _setDoc(_doc(_db, _C.users, NX._user.uid),
                { postCount: _increment(-1) }, { merge: true });
            return true;
        } catch (e) {
            console.warn('[NX] deletePost:', e.message);
            return false;
        }
    };

    // ────────────────────────────────────────────────────────────
    // FORO — Comentarios
    // ────────────────────────────────────────────────────────────
    NX.createComment = async function (postId, content) {
        if (!_ready || !NX._user) return null;
        try {
            const profile = await NX.getProfile();
            const displayName = profile?.displayName || NX._user.displayName || 'Anónimo';
            const ref = _doc(_collection(_db, _C.posts, postId, 'comments'));
            const comment = {
                uid:     NX._user.uid,
                author:  displayName,
                content: String(content).replace(/<[^>]*>/g, '').trim().slice(0, 1000),
                created: _serverTimestamp(),
                votes:   0,
                deleted: false,
            };
            await _setDoc(ref, comment);
            await _updateDoc(_doc(_db, _C.posts, postId), { commentCount: _increment(1) });
            return { ...comment, commentId: ref.id };
        } catch (e) {
            console.warn('[NX] createComment:', e.message);
            return null;
        }
    };

    NX.getComments = async function (postId) {
        if (!_ready) return [];
        try {
            const snap = await _getDocs(
                _query(_collection(_db, _C.posts, postId, 'comments'),
                    _orderBy('created', 'asc')
                )
            );
            return snap.docs
                .map(d => ({ ...d.data(), commentId: d.id }))
                .filter(c => !c.deleted);
        } catch (e) {
            console.warn('[NX] getComments:', e.message);
            return [];
        }
    };

    NX.deleteComment = async function (postId, commentId) {
        if (!_ready || !NX._user) return false;
        try {
            const ref = _doc(_db, _C.posts, postId, 'comments', commentId);
            const snap = await _getDoc(ref);
            if (!snap.exists()) return false;
            if (snap.data().uid !== NX._user.uid) return false;
            await _updateDoc(ref, { deleted: true, deletedAt: _serverTimestamp() });
            await _updateDoc(_doc(_db, _C.posts, postId), { commentCount: _increment(-1) });
            return true;
        } catch (e) {
            console.warn('[NX] deleteComment:', e.message);
            return false;
        }
    };

    NX.voteComment = async function (postId, commentId) {
        if (!_ready || !NX._user) return { voted: false };
        const voteId = `${postId}_${commentId}_${NX._user.uid}`;
        try {
            const snap = await _getDoc(_doc(_db, _C.votes, voteId));
            if (snap.exists()) return { alreadyVoted: true };
            await _setDoc(_doc(_db, _C.votes, voteId), {
                postId, commentId, uid: NX._user.uid, ts: _serverTimestamp()
            });
            await _updateDoc(_doc(_db, _C.posts, postId, 'comments', commentId), {
                votes: _increment(1)
            });
            return { voted: true };
        } catch (e) {
            return { error: true };
        }
    };

    NX.hasVotedComment = async function (postId, commentId) {
        if (!_ready || !NX._user) return false;
        const voteId = `${postId}_${commentId}_${NX._user.uid}`;
        try {
            const snap = await _getDoc(_doc(_db, _C.votes, voteId));
            return snap.exists();
        } catch (e) { return false; }
    };

    NX.getAuthorStats = async function (uid) {
        if (!_ready) return { messages: 0, avgRating: 0 };
        try {
            const snap = await _getDocs(_query(
                _collection(_db, _C.posts),
                _where('uid', '==', uid),
                _where('deleted', '==', false)
            ));
            const postCount = snap.docs.length;
            let commentCount = 0, totalVotes = 0;
            for (const post of snap.docs) {
                const comments = await _getDocs(
                    _query(_collection(_db, _C.posts, post.id, 'comments'),
                        _where('uid', '==', uid))
                );
                comments.forEach(c => {
                    if (!c.data().deleted) {
                        commentCount++;
                        totalVotes += c.data().votes || 0;
                    }
                });
            }
            const messages = postCount + commentCount;
            return {
                posts: postCount,
                comments: commentCount,
                messages,
                avgRating: messages > 0 ? (totalVotes / messages).toFixed(1) : '0.0'
            };
        } catch (e) {
            return { posts: 0, comments: 0, messages: 0, avgRating: '0.0' };
        }
    };

    // ────────────────────────────────────────────────────────────
    // SISTEMA DE REPORTES
    // ────────────────────────────────────────────────────────────
    NX.reportContent = async function (type, targetId, reason, details) {
        if (!_ready || !NX._user) return false;
        // Rate limit: máx 3 reportes en 10 minutos por usuario
        const rlKey = '_nx_rl_report';
        const rlData = JSON.parse(sessionStorage.getItem(rlKey) || '{"count":0,"start":0}');
        const now = Date.now();
        if (now - rlData.start > 600_000) { rlData.count = 0; rlData.start = now; }
        if (rlData.count >= 3) return 'rate_limited';
        rlData.count++;
        sessionStorage.setItem(rlKey, JSON.stringify(rlData));

        const VALID_REASONS = ['spam', 'harassment', 'misinformation', 'inappropriate', 'other'];
        if (!VALID_REASONS.includes(reason)) return false;

        try {
            const ref = _doc(_collection(_db, _C.reports));
            await _setDoc(ref, {
                type:      ['post', 'comment'].includes(type) ? type : 'post',
                targetId:  String(targetId).slice(0, 100),
                reason,
                details:   String(details || '').replace(/<[^>]*>/g, '').trim().slice(0, 500),
                reportedBy: NX._user.uid,
                status:    'pending',
                created:   _serverTimestamp(),
            });
            return true;
        } catch (e) {
            console.warn('[NX] reportContent:', e.message);
            return false;
        }
    };

    // Admin: obtener todos los reportes (solo desde admin.js, verificar en rules)
    NX.getReports = async function (status = null) {
        if (!_ready) return [];
        try {
            let q;
            if (status) {
                q = _query(_collection(_db, _C.reports),
                    _where('status', '==', status),
                    _orderBy('created', 'desc'));
            } else {
                q = _query(_collection(_db, _C.reports),
                    _orderBy('created', 'desc'));
            }
            const snap = await _getDocs(q);
            return snap.docs.map(d => ({ ...d.data(), reportId: d.id }));
        } catch (e) {
            console.warn('[NX] getReports:', e.message);
            return [];
        }
    };

    NX.updateReportStatus = async function (reportId, status) {
        if (!_ready) return false;
        const VALID = ['pending', 'resolved', 'dismissed'];
        if (!VALID.includes(status)) return false;
        try {
            await _updateDoc(_doc(_db, _C.reports, reportId), {
                status,
                resolvedAt: _serverTimestamp(),
            });
            return true;
        } catch (e) {
            console.warn('[NX] updateReportStatus:', e.message);
            return false;
        }
    };

    // Admin: forzar borrado de post desde admin
    NX.adminDeletePost = async function (postId) {
        if (!_ready) return false;
        try {
            await _updateDoc(_doc(_db, _C.posts, postId), {
                deleted:   true,
                deletedAt: _serverTimestamp(),
                deletedBy: 'admin',
            });
            return true;
        } catch (e) {
            console.warn('[NX] adminDeletePost:', e.message);
            return false;
        }
    };

    // ────────────────────────────────────────────────────────────
    // SISTEMA DE SUGERENCIAS
    // ────────────────────────────────────────────────────────────
    NX.createSuggestion = async function (title, description, category) {
        if (!_ready || !NX._user) return false;
        // Rate limit: máx 2 sugerencias por sesión
        const rlKey = '_nx_rl_sug';
        const count = parseInt(sessionStorage.getItem(rlKey) || '0');
        if (count >= 5) return 'rate_limited';
        sessionStorage.setItem(rlKey, String(count + 1));

        const VALID_CATS = ['feature', 'bug', 'content', 'design', 'other'];
        try {
            const profile = await NX.getProfile();
            const displayName = profile?.displayName || NX._user.displayName || 'Anónimo';
            const ref = _doc(_collection(_db, _C.suggestions));
            await _setDoc(ref, {
                title:       String(title).replace(/<[^>]*>/g, '').trim().slice(0, 100),
                description: String(description).replace(/<[^>]*>/g, '').trim().slice(0, 1000),
                category:    VALID_CATS.includes(category) ? category : 'other',
                uid:         NX._user.uid,
                author:      displayName,
                status:      'pending',
                created:     _serverTimestamp(),
            });
            return true;
        } catch (e) {
            console.warn('[NX] createSuggestion:', e.message);
            return false;
        }
    };

    NX.getSuggestions = async function (status = null) {
        if (!_ready) return [];
        try {
            let q;
            if (status) {
                q = _query(_collection(_db, _C.suggestions),
                    _where('status', '==', status),
                    _orderBy('created', 'desc'));
            } else {
                q = _query(_collection(_db, _C.suggestions),
                    _orderBy('created', 'desc'));
            }
            const snap = await _getDocs(q);
            return snap.docs.map(d => ({ ...d.data(), suggestionId: d.id }));
        } catch (e) {
            console.warn('[NX] getSuggestions:', e.message);
            return [];
        }
    };

    NX.updateSuggestionStatus = async function (suggestionId, status, adminNote) {
        if (!_ready) return false;
        const VALID = ['pending', 'approved', 'rejected', 'done'];
        if (!VALID.includes(status)) return false;
        try {
            await _updateDoc(_doc(_db, _C.suggestions, suggestionId), {
                status,
                adminNote: String(adminNote || '').replace(/<[^>]*>/g, '').trim().slice(0, 300),
                resolvedAt: _serverTimestamp(),
            });
            return true;
        } catch (e) {
            console.warn('[NX] updateSuggestionStatus:', e.message);
            return false;
        }
    };

    NX.deleteSuggestion = async function (suggestionId) {
        if (!_ready) return false;
        try {
            await _deleteDoc(_doc(_db, _C.suggestions, suggestionId));
            return true;
        } catch (e) {
            console.warn('[NX] deleteSuggestion:', e.message);
            return false;
        }
    };

    w._nx = NX;
})(window);