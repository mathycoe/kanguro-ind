import { auth, getName, registerUser, loginUser, logoutUser, resendVerification, reloadUser, onAuthChange } from './firebase.js';

// ── Sanitizar HTML (anti-XSS) ─────────────────────────
function sanitize(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

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
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

document.getElementById('goLogin').addEventListener('click',    e => { e.preventDefault(); openModal('login');    });
document.getElementById('goRegister').addEventListener('click', e => { e.preventDefault(); openModal('register'); });
document.getElementById('gateLogin').addEventListener('click',  e => { e.preventDefault(); openModal('login');    });

// ── Auth state ────────────────────────────────────────
function applyUser(user) {
  const verified = user && user.emailVerified;
  if (user) {
    const name = getName(user.uid);
    navAuthLabel.textContent = name.split(' ')[0];
    navAuthBtn.classList.add('logged-in');
    document.getElementById('userName').textContent  = name;
    document.getElementById('userEmail').textContent = user.email;
    document.getElementById('userAvatar').textContent = name[0].toUpperCase();
    document.getElementById('verifiedBadge').style.display = verified ? '' : 'none';
    document.getElementById('unverifiedBadge').style.display = verified ? 'none' : '';
  } else {
    navAuthLabel.textContent = 'Ingresar';
    navAuthBtn.classList.remove('logged-in');
  }

  // Comentarios: solo si verificado
  document.getElementById('commentGate').style.display = verified ? 'none' : '';
  document.getElementById('commentForm').style.display  = verified ? '' : 'none';
  renderComments();
}

navAuthBtn.addEventListener('click', () => {
  const user = auth.currentUser;
  if (!user) { openModal('register'); return; }
  if (!user.emailVerified) { openModal('verify'); return; }
  openModal('user');
});

// Escucha cambios de sesión en tiempo real (Firebase maneja persistencia)
onAuthChange(user => applyUser(user));

// ── Registro ──────────────────────────────────────────
document.getElementById('registerForm').addEventListener('submit', async e => {
  e.preventDefault();
  const name        = document.getElementById('regName').value.trim();
  const email       = document.getElementById('regEmail').value.trim();
  const pass        = document.getElementById('regPass').value;
  const passConfirm = document.getElementById('regPassConfirm').value;
  const errEl       = document.getElementById('regError');
  const btn         = e.target.querySelector('button[type=submit]');

  if (pass !== passConfirm) {
    errEl.textContent = 'Las contraseñas no coinciden.'; return;
  }

  btn.disabled = true;
  btn.textContent = 'Registrando...';
  try {
    await registerUser(name, email, pass);
    errEl.textContent = '';
    openModal('verify');
  } catch (err) {
    errEl.textContent = friendlyError(err.code);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Registrarme';
  }
});

// ── Login ─────────────────────────────────────────────
document.getElementById('loginForm').addEventListener('submit', async e => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const pass  = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginError');
  const btn   = e.target.querySelector('button[type=submit]');

  btn.disabled = true;
  btn.textContent = 'Entrando...';
  try {
    const user = await loginUser(email, pass);
    errEl.textContent = '';
    closeModal();
    if (!user.emailVerified) openModal('verify');
  } catch (err) {
    errEl.textContent = friendlyError(err.code);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Entrar';
  }
});

// ── Verificación de email ─────────────────────────────
document.getElementById('resendBtn').addEventListener('click', async () => {
  const btn = document.getElementById('resendBtn');
  btn.disabled = true;
  btn.textContent = 'Enviado ✓';
  try { await resendVerification(); } catch {}
  setTimeout(() => { btn.disabled = false; btn.textContent = 'Reenviar email'; }, 30000);
});

document.getElementById('checkVerifiedBtn').addEventListener('click', async () => {
  const user = await reloadUser();
  if (user && user.emailVerified) {
    closeModal();
    applyUser(user);
  } else {
    document.getElementById('verifyError').textContent = 'Todavía no verificaste el email.';
  }
});

// ── Logout ────────────────────────────────────────────
document.getElementById('logoutBtn').addEventListener('click', async () => {
  await logoutUser();
  closeModal();
});

// ── Botón pedido ──────────────────────────────────────
document.getElementById('ctaOrder').addEventListener('click', () => {
  const user = auth.currentUser;
  if (!user) { openModal('login'); return; }
  if (!user.emailVerified) { openModal('verify'); return; }
  if (typeof window.sendPrompt === 'function') window.sendPrompt('Quiero hacer un pedido a Kanguro Indumentaria');
});

// ── Errores legibles ──────────────────────────────────
function friendlyError(code) {
  const map = {
    'auth/email-already-in-use':   'Ese email ya está registrado.',
    'auth/invalid-email':           'Email inválido.',
    'auth/weak-password':           'La contraseña debe tener al menos 6 caracteres.',
    'auth/user-not-found':          'Email o contraseña incorrectos.',
    'auth/wrong-password':          'Email o contraseña incorrectos.',
    'auth/invalid-credential':      'Email o contraseña incorrectos.',
    'auth/too-many-requests':       'Demasiados intentos. Esperá unos minutos.',
    'auth/network-request-failed':  'Error de conexión. Revisá tu internet.',
  };
  return map[code] || 'Ocurrió un error. Intentá de nuevo.';
}

// ── Comentarios ───────────────────────────────────────
const commentForm  = document.getElementById('commentForm');
const commentsList = document.getElementById('commentsList');

function getComments() { return JSON.parse(localStorage.getItem('kanguro_comments') || '[]'); }

function renderComments() {
  const comments = getComments();
  const user     = auth.currentUser;
  if (comments.length === 0) {
    commentsList.innerHTML = '<p class="comments-empty">Todavía no hay opiniones. ¡Sé el primero!</p>';
    return;
  }
  commentsList.innerHTML = comments.map((c, i) => `
    <div class="comment-card">
      <div class="comment-header">
        <div class="comment-avatar">${sanitize(c.name[0].toUpperCase())}</div>
        <span class="comment-name">${sanitize(c.name)}</span>
        <span class="comment-date">${sanitize(c.date)}</span>
        ${user && user.uid === c.uid
          ? `<button class="comment-delete" data-idx="${i}" title="Borrar"><i class="ti ti-trash"></i></button>`
          : ''}
      </div>
      <p class="comment-text">${sanitize(c.text)}</p>
    </div>
  `).join('');

  commentsList.querySelectorAll('.comment-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const comments = getComments();
      comments.splice(parseInt(btn.dataset.idx), 1);
      localStorage.setItem('kanguro_comments', JSON.stringify(comments));
      renderComments();
    });
  });
}

commentForm.addEventListener('submit', e => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user || !user.emailVerified) return;
  const text = document.getElementById('commentText').value.trim();
  if (!text) return;

  const comments = getComments();
  comments.unshift({
    uid:  user.uid,
    name: getName(user.uid),
    text,
    date: new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
  });
  localStorage.setItem('kanguro_comments', JSON.stringify(comments));
  commentForm.reset();
  renderComments();
});

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
const animateEls = document.querySelectorAll('.animate');
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 70);
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });
animateEls.forEach(el => observer.observe(el));
setTimeout(() => {
  animateEls.forEach(el => {
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
