// ── Auth ──────────────────────────────────────────────
const overlay    = document.getElementById('modalOverlay');
const modalClose = document.getElementById('modalClose');
const navAuthBtn = document.getElementById('navAuthBtn');
const navAuthLabel = document.getElementById('navAuthLabel');

const authRegister = document.getElementById('authRegister');
const authLogin    = document.getElementById('authLogin');
const authUser     = document.getElementById('authUser');

function getUsers()   { return JSON.parse(localStorage.getItem('kanguro_users')   || '[]'); }
function getSession() { return JSON.parse(localStorage.getItem('kanguro_session') || 'null'); }

function saveSession(user) {
  localStorage.setItem('kanguro_session', JSON.stringify(user));
}

function openModal(panel) {
  authRegister.style.display = panel === 'register' ? '' : 'none';
  authLogin.style.display    = panel === 'login'    ? '' : 'none';
  authUser.style.display     = panel === 'user'     ? '' : 'none';
  overlay.classList.add('open');
}

function closeModal() { overlay.classList.remove('open'); }

function applySession() {
  const user = getSession();
  if (user) {
    navAuthLabel.textContent = user.name.split(' ')[0];
    navAuthBtn.classList.add('logged-in');
    document.getElementById('userName').textContent  = user.name;
    document.getElementById('userEmail').textContent = user.email;
    document.getElementById('userAvatar').textContent = user.name[0].toUpperCase();
    // Mostrar form de comentarios
    document.getElementById('commentGate').style.display = 'none';
    document.getElementById('commentForm').style.display  = '';
  } else {
    navAuthLabel.textContent = 'Ingresar';
    navAuthBtn.classList.remove('logged-in');
    document.getElementById('commentGate').style.display = '';
    document.getElementById('commentForm').style.display  = 'none';
  }
  renderComments();
}

navAuthBtn.addEventListener('click', () => {
  const user = getSession();
  openModal(user ? 'user' : 'register');
});

modalClose.addEventListener('click', closeModal);
overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

document.getElementById('goLogin').addEventListener('click', e => {
  e.preventDefault(); openModal('login');
});
document.getElementById('goRegister').addEventListener('click', e => {
  e.preventDefault(); openModal('register');
});
document.getElementById('gateLogin').addEventListener('click', e => {
  e.preventDefault(); openModal('login');
});

// Registro
document.getElementById('registerForm').addEventListener('submit', e => {
  e.preventDefault();
  const name  = document.getElementById('regName').value.trim();
  const email = document.getElementById('regEmail').value.trim().toLowerCase();
  const pass  = document.getElementById('regPass').value;
  const errEl = document.getElementById('regError');

  const users = getUsers();
  if (users.find(u => u.email === email)) {
    errEl.textContent = 'Ese email ya está registrado.'; return;
  }
  const user = { name, email, pass };
  users.push(user);
  localStorage.setItem('kanguro_users', JSON.stringify(users));
  saveSession(user);
  errEl.textContent = '';
  closeModal();
  applySession();
});

// Login
document.getElementById('loginForm').addEventListener('submit', e => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim().toLowerCase();
  const pass  = document.getElementById('loginPass').value;
  const errEl = document.getElementById('loginError');

  const user = getUsers().find(u => u.email === email && u.pass === pass);
  if (!user) { errEl.textContent = 'Email o contraseña incorrectos.'; return; }
  saveSession(user);
  errEl.textContent = '';
  closeModal();
  applySession();
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', () => {
  localStorage.removeItem('kanguro_session');
  closeModal();
  applySession();
});

// Botón pedido
document.getElementById('ctaOrder').addEventListener('click', () => {
  if (!getSession()) { openModal('login'); return; }
  if (typeof sendPrompt === 'function') sendPrompt('Quiero hacer un pedido a Kanguro Indumentaria');
});

// ── Comentarios ───────────────────────────────────────
const commentForm  = document.getElementById('commentForm');
const commentsList = document.getElementById('commentsList');

function getComments() { return JSON.parse(localStorage.getItem('kanguro_comments') || '[]'); }

function renderComments() {
  const comments = getComments();
  const session  = getSession();
  if (comments.length === 0) {
    commentsList.innerHTML = '<p class="comments-empty">Todavía no hay opiniones. ¡Sé el primero!</p>';
    return;
  }
  commentsList.innerHTML = comments.map((c, i) => `
    <div class="comment-card">
      <div class="comment-header">
        <div class="comment-avatar">${c.name[0].toUpperCase()}</div>
        <span class="comment-name">${c.name}</span>
        <span class="comment-date">${c.date}</span>
        ${session && session.email === c.email
          ? `<button class="comment-delete" data-idx="${i}" title="Borrar"><i class="ti ti-trash"></i></button>`
          : ''}
      </div>
      <p class="comment-text">${c.text}</p>
    </div>
  `).join('');

  commentsList.querySelectorAll('.comment-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.idx);
      const comments = getComments();
      comments.splice(idx, 1);
      localStorage.setItem('kanguro_comments', JSON.stringify(comments));
      renderComments();
    });
  });
}

commentForm.addEventListener('submit', e => {
  e.preventDefault();
  const session = getSession();
  if (!session) return;
  const text = document.getElementById('commentText').value.trim();
  if (!text) return;

  const comments = getComments();
  comments.unshift({
    name: session.name,
    email: session.email,
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
    const target = document.getElementById(link.dataset.section);
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
});

// ── Init ─────────────────────────────────────────────
applySession();
