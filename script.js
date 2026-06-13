import {
  auth,
  registerUser, loginUser, logoutUser, resendVerification, reloadUser, onAuthChange,
  getUserData, ensureUserDoc, getAllUsers, setUserRole,
  getComments, addComment, deleteComment,
  getGallery, getGalleryByCategory, addGalleryItem, deleteGalleryItem,
  addOrder, getOrders, getUserOrders, updateOrderStatus, deleteOrder
} from './firebase.js';

const GALLERY_CATS = {
  remeras:  { label: '👕 Remeras',          icon: '👕' },
  buzos:    { label: '🧥 Buzos y camperas',  icon: '🧥' },
  banderas: { label: '🚩 Banderas',          icon: '🚩' },
  matero:   { label: '☕ Set matero',        icon: '☕' },
  cole:     { label: '🎒 Vuelta al cole',    icon: '🎒' },
  regalos:  { label: '🎁 Regalos',          icon: '🎁' },
};

// ── Sanitizar HTML (anti-XSS) ─────────────────────────
function sanitize(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// ── Estado global ─────────────────────────────────────
let currentRole = 'user';

// ── Referencias UI ────────────────────────────────────
const overlay      = document.getElementById('modalOverlay');
const modalClose   = document.getElementById('modalClose');
const navAuthBtn   = document.getElementById('navAuthBtn');
const navAuthLabel = document.getElementById('navAuthLabel');

const authRegister = document.getElementById('authRegister');
const authLogin    = document.getElementById('authLogin');
const authVerify   = document.getElementById('authVerify');
const authUser     = document.getElementById('authUser');

function openModal(panel) {
  authRegister.style.display = panel === 'register' ? '' : 'none';
  authLogin.style.display    = panel === 'login'    ? '' : 'none';
  authVerify.style.display   = panel === 'verify'   ? '' : 'none';
  authUser.style.display     = panel === 'user'     ? '' : 'none';
  overlay.classList.add('open');
}
function closeModal() { overlay.classList.remove('open'); }

modalClose.addEventListener('click', closeModal);
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeModal();
    closeAdminModal();
    document.getElementById('galleryCatOverlay').classList.remove('open');
    document.getElementById('lightboxOverlay').classList.remove('open');
  }
});

document.getElementById('goLogin').addEventListener('click',    e => { e.preventDefault(); openModal('login');    });
document.getElementById('goRegister').addEventListener('click', e => { e.preventDefault(); openModal('register'); });
document.getElementById('gateLogin').addEventListener('click',  e => { e.preventDefault(); openModal('login');    });

// ── Auth state ────────────────────────────────────────
async function applyUser(user) {
  const verified = user && user.emailVerified;

  if (user) {
    let data = null;
    try { data = await ensureUserDoc(user); } catch (e) { console.warn('Firestore:', e.code); }
    const name = data?.name || user.email;
    currentRole = data?.role || 'user';

    navAuthLabel.textContent = name.split(' ')[0];
    navAuthBtn.classList.add('logged-in');

    document.getElementById('userName').textContent  = name;
    document.getElementById('userEmail').textContent = user.email;
    document.getElementById('userAvatar').textContent = name[0].toUpperCase();
    document.getElementById('verifiedBadge').style.display   = verified ? '' : 'none';
    document.getElementById('unverifiedBadge').style.display = verified ? 'none' : '';

    const roleBadge = document.getElementById('roleBadge');
    if (currentRole !== 'user') {
      roleBadge.textContent = currentRole === 'developer' ? '⚙ Developer' : '🛡 Admin';
      roleBadge.style.display = '';
    } else {
      roleBadge.style.display = 'none';
    }
  } else {
    currentRole = 'user';
    navAuthLabel.textContent = 'Ingresar';
    navAuthBtn.classList.remove('logged-in');
  }

  // Comentarios: solo si verificado
  document.getElementById('commentGate').style.display = verified ? 'none' : '';
  document.getElementById('commentForm').style.display  = verified ? '' : 'none';

  // Botón panel admin en "Mi cuenta"
  const isPrivileged = verified && (currentRole === 'admin' || currentRole === 'developer');
  const openAdminBtn = document.getElementById('openAdminPanel');
  openAdminBtn.style.display = isPrivileged ? '' : 'none';
  if (isPrivileged) {
    document.getElementById('adminBtnIcon').className =
      currentRole === 'developer' ? 'ti ti-terminal-2' : 'ti ti-shield-check';
    document.getElementById('adminBtnLabel').textContent =
      currentRole === 'developer' ? 'Panel Developer' : 'Panel Admin';
    document.getElementById('adminPanelLabel').innerHTML =
      currentRole === 'developer'
        ? '<i class="ti ti-terminal-2"></i> Panel Developer'
        : '<i class="ti ti-shield-check"></i> Panel Admin';
    document.querySelectorAll('.dev-only').forEach(el => {
      el.style.display = currentRole === 'developer' ? '' : 'none';
    });
  }

  applyOrderUI(user, verified);
  renderComments();
  renderGallery();
}

navAuthBtn.addEventListener('click', () => {
  const user = auth.currentUser;
  if (!user) { openModal('register'); return; }
  if (!user.emailVerified) { openModal('verify'); return; }
  openModal('user');
});

onAuthChange(user => applyUser(user));

// ── Registro ──────────────────────────────────────────
document.getElementById('registerForm').addEventListener('submit', async e => {
  e.preventDefault();
  const name        = document.getElementById('regName').value.trim();
  const phone       = document.getElementById('regPhone').value.trim();
  const email       = document.getElementById('regEmail').value.trim();
  const pass        = document.getElementById('regPass').value;
  const passConfirm = document.getElementById('regPassConfirm').value;
  const errEl       = document.getElementById('regError');
  const btn         = e.target.querySelector('button[type=submit]');

  if (!phone) { errEl.textContent = 'Ingresá tu número de teléfono.'; return; }
  if (pass !== passConfirm) {
    errEl.textContent = 'Las contraseñas no coinciden.'; return;
  }

  btn.disabled = true; btn.textContent = 'Registrando...';
  try {
    await registerUser(name, phone, email, pass);
    errEl.textContent = '';
    openModal('verify');
  } catch (err) {
    errEl.textContent = friendlyError(err.code);
  } finally {
    btn.disabled = false; btn.textContent = 'Registrarme';
  }
});

// ── Login ─────────────────────────────────────────────
document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginError');
  const btn   = e.target.querySelector('button[type=submit]');

  btn.disabled = true; btn.textContent = 'Entrando...';
  try {
    const user = await loginUser(email, pass);
    errEl.textContent = '';
    closeModal();
    if (!user.emailVerified) openModal('verify');
  } catch (err) {
    errEl.textContent = friendlyError(err.code);
  } finally {
    btn.disabled = false; btn.textContent = 'Entrar';
  }
});

// ── Verificación de email ─────────────────────────────
document.getElementById('resendBtn').addEventListener('click', async () => {
  const btn = document.getElementById('resendBtn');
  btn.disabled = true; btn.textContent = 'Enviado ✓';
  try { await resendVerification(); } catch {}
  setTimeout(() => { btn.disabled = false; btn.textContent = 'Reenviar email'; }, 30000);
});

document.getElementById('checkVerifiedBtn').addEventListener('click', async () => {
  const user = await reloadUser();
  if (user && user.emailVerified) {
    closeModal(); applyUser(user);
  } else {
    document.getElementById('verifyError').textContent = 'Todavía no verificaste el email.';
  }
});

// ── Logout ────────────────────────────────────────────
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await logoutUser();
  closeModal();
});


// ── Errores legibles ──────────────────────────────────
function friendlyError(code) {
  const map = {
    'auth/email-already-in-use':  'Ese email ya está registrado.',
    'auth/invalid-email':          'Email inválido.',
    'auth/weak-password':          'La contraseña debe tener al menos 6 caracteres.',
    'auth/user-not-found':         'Email o contraseña incorrectos.',
    'auth/wrong-password':         'Email o contraseña incorrectos.',
    'auth/invalid-credential':     'Email o contraseña incorrectos.',
    'auth/too-many-requests':      'Demasiados intentos. Esperá unos minutos.',
    'auth/network-request-failed': 'Error de conexión. Revisá tu internet.',
  };
  return map[code] || 'Ocurrió un error. Intentá de nuevo.';
}

// ── Comentarios (Firestore) ───────────────────────────
const commentForm  = document.getElementById('commentForm');
const commentsList = document.getElementById('commentsList');

async function renderComments() {
  commentsList.innerHTML = '<p class="comments-empty">Cargando...</p>';
  const comments = await getComments();
  const user = auth.currentUser;
  const isPrivileged = currentRole === 'admin' || currentRole === 'developer';

  if (comments.length === 0) {
    commentsList.innerHTML = '<p class="comments-empty">Todavía no hay opiniones. ¡Sé el primero!</p>';
    return;
  }

  commentsList.innerHTML = comments.map(c => {
    const canDelete = user && (user.uid === c.uid || isPrivileged);
    const date = c.createdAt?.toDate
      ? c.createdAt.toDate().toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
      : '';
    return `
      <div class="comment-card">
        <div class="comment-header">
          <div class="comment-avatar">${sanitize((c.name || '?')[0].toUpperCase())}</div>
          <span class="comment-name">${sanitize(c.name || 'Usuario')}</span>
          <span class="comment-date">${sanitize(date)}</span>
          ${canDelete ? `<button class="comment-delete" data-id="${sanitize(c.id)}" title="Borrar"><i class="ti ti-trash"></i></button>` : ''}
        </div>
        <p class="comment-text">${sanitize(c.text)}</p>
      </div>
    `;
  }).join('');

  commentsList.querySelectorAll('.comment-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Borrar este comentario?')) return;
      await deleteComment(btn.dataset.id);
      renderComments();
      if (currentRole === 'admin' || currentRole === 'developer') loadAdminComments();
    });
  });
}

commentForm.addEventListener('submit', async e => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;
  const text = document.getElementById('commentText').value.trim();
  if (!text) return;

  const btn = e.target.querySelector('button[type=submit]');
  btn.disabled = true;
  try {
    const data = await getUserData(user.uid);
    await addComment(user.uid, data?.name || user.email, text);
    commentForm.reset();
    renderComments();
  } finally {
    btn.disabled = false;
  }
});

// ── Pedidos ───────────────────────────────────────────

document.getElementById('orderGateLogin').addEventListener('click', e => { e.preventDefault(); openModal('login'); });
document.getElementById('orderNewBtn').addEventListener('click', () => {
  document.getElementById('orderSuccess').style.display = 'none';
  document.getElementById('orderForm').style.display = '';
});

function applyOrderUI(user, verified) {
  const gate     = document.getElementById('orderGate');
  const form     = document.getElementById('orderForm');
  const success  = document.getElementById('orderSuccess');
  const myOrders = document.getElementById('myOrdersSection');
  if (!user || !verified) {
    gate.style.display    = '';
    form.style.display    = 'none';
    success.style.display = 'none';
    myOrders.style.display = 'none';
  } else {
    gate.style.display     = 'none';
    success.style.display  = 'none';
    form.style.display     = '';
    myOrders.style.display = '';
    loadMyOrders(user.uid);
  }
}

async function loadMyOrders(uid) {
  const list = document.getElementById('myOrdersList');
  list.innerHTML = '<p class="comments-empty">Cargando...</p>';
  const orders = await getUserOrders(uid);
  if (orders.length === 0) {
    list.innerHTML = '<p class="comments-empty">Todavía no hiciste ningún pedido.</p>';
    return;
  }
  list.innerHTML = orders.map(o => {
    const date = o.createdAt?.toDate
      ? o.createdAt.toDate().toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
      : '';
    const statusLabel = o.status === 'done' ? '✅ Atendido' : '⏳ Pendiente';
    const statusClass = o.status === 'done' ? 'order-status--done' : 'order-status--pending';
    return `
      <div class="order-card">
        <div class="order-card-header">
          <span class="order-card-product">${sanitize(o.product)}</span>
          <span class="order-status ${statusClass}">${statusLabel}</span>
          <span class="comment-date">${sanitize(date)}</span>
        </div>
        <p class="order-card-detail">Talle: ${sanitize(o.size || '—')} · Cantidad: ${sanitize(String(o.qty || 1))}</p>
        ${o.message ? `<p class="order-card-msg">${sanitize(o.message)}</p>` : ''}
      </div>
    `;
  }).join('');
}

document.getElementById('orderForm').addEventListener('submit', async e => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;
  const product = document.getElementById('orderProduct').value;
  const size    = document.getElementById('orderSize').value.trim();
  const qty     = parseInt(document.getElementById('orderQty').value) || 1;
  const message = document.getElementById('orderMsg').value.trim();
  const errEl   = document.getElementById('orderError');
  const btn     = e.target.querySelector('button[type=submit]');

  if (!size) { errEl.textContent = 'Ingresá el talle.'; return; }
  errEl.textContent = '';
  btn.disabled = true;
  try {
    await user.getIdToken(true); // fuerza refresh del token para que email_verified esté actualizado
    const data = await getUserData(user.uid);
    await addOrder(user.uid, data?.name || user.email, data?.phone || '', user.email, { product, size, qty, message });
    e.target.reset();
    document.getElementById('orderForm').style.display = 'none';
    document.getElementById('orderSuccess').style.display = '';
    loadMyOrders(user.uid);
    if (currentRole === 'admin' || currentRole === 'developer') loadAdminOrders();
  } catch (err) {
    errEl.textContent = `Error: ${err.code || err.message || 'desconocido'}`;
  } finally {
    btn.disabled = false;
  }
});

// Admin: pedidos
async function loadAdminOrders() {
  const list = document.getElementById('adminOrderList');
  list.innerHTML = '<p class="admin-empty">Cargando...</p>';
  const orders = await getOrders();
  if (orders.length === 0) {
    list.innerHTML = '<p class="admin-empty">No hay pedidos todavía.</p>';
    return;
  }
  list.innerHTML = orders.map(o => {
    const date = o.createdAt?.toDate
      ? o.createdAt.toDate().toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
      : '';
    const isDone = o.status === 'done';
    return `
      <div class="admin-item admin-order-item">
        <div class="admin-item-info">
          <span class="admin-item-name">${sanitize(o.name || o.email)}</span>
          <span class="admin-item-date">${sanitize(o.product)} · ${sanitize(String(o.qty || 1))} ud. · Talle ${sanitize(o.size || '—')} · ${sanitize(date)}</span>
          ${o.phone ? `<span class="admin-item-date"><i class="ti ti-phone" style="font-size:11px"></i> ${sanitize(o.phone)} · ${sanitize(o.email)}</span>` : `<span class="admin-item-date">${sanitize(o.email)}</span>`}
          ${o.message ? `<span class="admin-item-text">${sanitize(o.message)}</span>` : ''}
        </div>
        <div class="admin-order-actions">
          <button class="admin-order-status ${isDone ? 'admin-order-done' : 'admin-order-pending'}"
            data-id="${sanitize(o.id)}" data-status="${isDone ? 'pending' : 'done'}">
            ${isDone ? '✅' : '⏳'}
          </button>
          <button class="admin-item-del" data-id="${sanitize(o.id)}" title="Eliminar"><i class="ti ti-trash"></i></button>
        </div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.admin-order-status').forEach(btn => {
    btn.addEventListener('click', async () => {
      await updateOrderStatus(btn.dataset.id, btn.dataset.status);
      loadAdminOrders();
      const uid = auth.currentUser?.uid;
      if (uid) loadMyOrders(uid);
    });
  });
  list.querySelectorAll('.admin-item-del').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Eliminar este pedido?')) return;
      await deleteOrder(btn.dataset.id);
      loadAdminOrders();
    });
  });
}

// ── Galería por categorías ────────────────────────────

// Tarjetas de productos → abrir modal de fotos
document.querySelectorAll('.product-card[data-cat]').forEach(card => {
  card.style.cursor = 'pointer';
  card.addEventListener('click', () => openGalleryCat(card.dataset.cat));
});

const galleryCatOverlay = document.getElementById('galleryCatOverlay');
const galleryCatGrid    = document.getElementById('galleryCatGrid');
const galleryCatEmpty   = document.getElementById('galleryCatEmpty');
const galleryCatTitle   = document.getElementById('galleryCatTitle');
let currentCat = null;

async function openGalleryCat(cat) {
  currentCat = cat;
  galleryCatTitle.textContent = GALLERY_CATS[cat]?.label || cat;
  galleryCatGrid.innerHTML = '<p class="comments-empty" style="padding:2rem">Cargando...</p>';
  galleryCatEmpty.style.display = 'none';
  galleryCatOverlay.classList.add('open');
  await loadGalleryCatGrid(cat);
}

async function loadGalleryCatGrid(cat) {
  const isPrivileged = currentRole === 'admin' || currentRole === 'developer';
  const items = await getGalleryByCategory(cat);

  if (items.length === 0) {
    galleryCatGrid.innerHTML = '';
    galleryCatEmpty.style.display = '';
    return;
  }
  galleryCatEmpty.style.display = 'none';
  galleryCatGrid.innerHTML = items.map(item => `
    <div class="gallery-cat-item" data-url="${sanitize(item.url)}" data-caption="${sanitize(item.caption || '')}">
      <img src="${sanitize(item.url)}" alt="${sanitize(item.caption || 'Trabajo Kanguro')}" loading="lazy"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
      <span class="gallery-img-err" style="display:none">🖼</span>
      ${isPrivileged ? `<button class="gallery-delete-btn" data-id="${sanitize(item.id)}" title="Eliminar"><i class="ti ti-trash"></i></button>` : ''}
      ${item.caption ? `<span class="gallery-caption">${sanitize(item.caption)}</span>` : ''}
    </div>
  `).join('');

  galleryCatGrid.querySelectorAll('.gallery-cat-item').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.closest('.gallery-delete-btn')) return;
      openLightbox(el.dataset.url, el.dataset.caption);
    });
  });
  galleryCatGrid.querySelectorAll('.gallery-delete-btn').forEach(btn => {
    btn.addEventListener('click', async e => {
      e.stopPropagation();
      if (!confirm('¿Eliminar esta foto?')) return;
      await deleteGalleryItem(btn.dataset.id);
      loadGalleryCatGrid(currentCat);
      loadAdminGallery();
    });
  });
}

document.getElementById('galleryCatClose').addEventListener('click', () => galleryCatOverlay.classList.remove('open'));
galleryCatOverlay.addEventListener('click', e => { if (e.target === galleryCatOverlay) galleryCatOverlay.classList.remove('open'); });

// ── Lightbox ──────────────────────────────────────────
const lightboxOverlay = document.getElementById('lightboxOverlay');

function openLightbox(url, caption) {
  document.getElementById('lightboxImg').src = url;
  document.getElementById('lightboxCaption').textContent = caption;
  lightboxOverlay.classList.add('open');
}
document.getElementById('lightboxClose').addEventListener('click', () => lightboxOverlay.classList.remove('open'));
lightboxOverlay.addEventListener('click', e => { if (e.target === lightboxOverlay) lightboxOverlay.classList.remove('open'); });

// renderGallery ya no hace nada (reemplazado por categorías)
function renderGallery() {}

// ── Admin panel (modal) ───────────────────────────────

const adminOverlay = document.getElementById('adminOverlay');

function openAdminModal() {
  closeModal(); // cierra "Mi cuenta"
  adminOverlay.classList.add('open');
  loadAdminGallery();
  loadAdminComments();
  loadAdminOrders();
  if (currentRole === 'developer') loadAdminUsers();
}
function closeAdminModal() { adminOverlay.classList.remove('open'); }

document.getElementById('openAdminPanel').addEventListener('click', openAdminModal);
document.getElementById('adminClose').addEventListener('click', closeAdminModal);
adminOverlay.addEventListener('click', e => { if (e.target === adminOverlay) closeAdminModal(); });

// Tabs
document.querySelectorAll('.admin-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.admin-pane').forEach(p => p.style.display = 'none');
    tab.classList.add('active');
    document.getElementById('tab' + tab.dataset.tab.charAt(0).toUpperCase() + tab.dataset.tab.slice(1)).style.display = '';
  });
});

// Admin: galería
async function loadAdminGallery() {
  const list = document.getElementById('adminGalleryList');
  const items = await getGallery();
  if (items.length === 0) {
    list.innerHTML = '<p class="admin-empty">No hay fotos en la galería.</p>';
    return;
  }
  list.innerHTML = items.map(item => `
    <div class="admin-item">
      <img src="${sanitize(item.url)}" alt="${sanitize(item.caption || '')}" class="admin-thumb" onerror="this.style.display='none'" />
      <span class="admin-item-label">${sanitize(item.caption || item.url)}</span>
      <button class="admin-item-del" data-id="${sanitize(item.id)}" title="Eliminar"><i class="ti ti-trash"></i></button>
    </div>
  `).join('');
  list.querySelectorAll('.admin-item-del').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Eliminar?')) return;
      await deleteGalleryItem(btn.dataset.id);
      loadAdminGallery(); renderGallery();
    });
  });
}

document.getElementById('addGalleryBtn').addEventListener('click', async () => {
  const url      = document.getElementById('galleryUrl').value.trim();
  const caption  = document.getElementById('galleryCaption').value.trim();
  const category = document.getElementById('galleryCategory').value;
  if (!url) { alert('Ingresá la URL de la imagen'); return; }
  try { new URL(url); } catch { alert('URL inválida'); return; }
  const btn = document.getElementById('addGalleryBtn');
  btn.disabled = true;
  try {
    await addGalleryItem(url, caption, category);
    document.getElementById('galleryUrl').value = '';
    document.getElementById('galleryCaption').value = '';
    loadAdminGallery();
    // Si el modal de esa categoría está abierto, refrescarlo
    if (currentCat === category) loadGalleryCatGrid(currentCat);
  } finally { btn.disabled = false; }
});

// Admin: comentarios
async function loadAdminComments() {
  const list = document.getElementById('adminCommentList');
  const comments = await getComments();
  if (comments.length === 0) {
    list.innerHTML = '<p class="admin-empty">No hay comentarios.</p>';
    return;
  }
  list.innerHTML = comments.map(c => {
    const date = c.createdAt?.toDate
      ? c.createdAt.toDate().toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
      : '';
    return `
      <div class="admin-item">
        <div class="admin-item-info">
          <span class="admin-item-name">${sanitize(c.name || 'Usuario')}</span>
          <span class="admin-item-date">${sanitize(date)}</span>
          <span class="admin-item-text">${sanitize(c.text)}</span>
        </div>
        <button class="admin-item-del" data-id="${sanitize(c.id)}" title="Eliminar"><i class="ti ti-trash"></i></button>
      </div>
    `;
  }).join('');
  list.querySelectorAll('.admin-item-del').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('¿Eliminar este comentario?')) return;
      await deleteComment(btn.dataset.id);
      loadAdminComments(); renderComments();
    });
  });
}

// Developer: usuarios
async function loadAdminUsers() {
  const list = document.getElementById('adminUserList');
  list.innerHTML = '<p class="admin-empty">Cargando...</p>';
  const users = await getAllUsers();
  if (users.length === 0) {
    list.innerHTML = '<p class="admin-empty">No hay usuarios registrados.</p>';
    return;
  }
  const currentUid = auth.currentUser?.uid;
  list.innerHTML = users.map(u => `
    <div class="admin-item">
      <div class="admin-item-info">
        <span class="admin-item-name">${sanitize(u.name || '—')}</span>
        <span class="admin-item-date">${sanitize(u.email)}${u.phone ? ` · 📱 ${sanitize(u.phone)}` : ''}</span>
      </div>
      ${u.uid !== currentUid ? `
        <select class="admin-role-select" data-uid="${sanitize(u.uid)}">
          <option value="user"      ${u.role === 'user'      ? 'selected' : ''}>Usuario</option>
          <option value="admin"     ${u.role === 'admin'     ? 'selected' : ''}>Admin</option>
          <option value="developer" ${u.role === 'developer' ? 'selected' : ''}>Developer</option>
        </select>
      ` : `<span class="badge-role" style="font-size:11px">Tú</span>`}
    </div>
  `).join('');

  list.querySelectorAll('.admin-role-select').forEach(sel => {
    sel.addEventListener('change', async () => {
      const uid  = sel.dataset.uid;
      const role = sel.value;
      sel.disabled = true;
      try {
        await setUserRole(uid, role);
      } finally { sel.disabled = false; }
    });
  });
}

// ── Toggle modo claro/oscuro ──────────────────────────
const toggle = document.getElementById('themeToggle');
const icon   = document.getElementById('themeIcon');
function applyTheme(light) {
  document.body.classList.toggle('light', light);
  icon.className = light ? 'ti ti-moon' : 'ti ti-sun';
}
applyTheme(localStorage.getItem('theme') === 'light');
toggle.addEventListener('click', () => {
  const isLight = document.body.classList.toggle('light');
  icon.className = isLight ? 'ti ti-moon' : 'ti ti-sun';
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
});

// ── Animación de entrada ──────────────────────────────
const animObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 70);
      animObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.animate').forEach(el => animObserver.observe(el));
setTimeout(() => {
  document.querySelectorAll('.animate').forEach(el => {
    if (el.getBoundingClientRect().top < window.innerHeight) el.classList.add('visible');
  });
}, 50);

// ── Navegación activa por scroll ─────────────────────
const sections = document.querySelectorAll('section[id]');
const navLinks = document.querySelectorAll('nav a[data-section]');
const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navLinks.forEach(l => l.classList.remove('active'));
      const link = document.querySelector(`nav a[data-section="${entry.target.id}"]`);
      if (link) link.classList.add('active');
    }
  });
}, { rootMargin: '-40% 0px -55% 0px' });
sections.forEach(s => sectionObserver.observe(s));
navLinks.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    document.getElementById(link.dataset.section)?.scrollIntoView({ behavior: 'smooth' });
  });
});
