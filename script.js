// Toggle modo claro/oscuro
const toggle = document.getElementById('themeToggle');
const icon = document.getElementById('themeIcon');

function applyTheme(light) {
  document.body.classList.toggle('light', light);
  icon.className = light ? 'ti ti-moon' : 'ti ti-sun';
}

const saved = localStorage.getItem('theme');
applyTheme(saved === 'light');

toggle.addEventListener('click', () => {
  const isLight = document.body.classList.toggle('light');
  icon.className = isLight ? 'ti ti-moon' : 'ti ti-sun';
  localStorage.setItem('theme', isLight ? 'light' : 'dark');
});

// Animación de entrada para elementos con clase .animate
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

// Dispara inmediatamente los elementos ya visibles en carga
setTimeout(() => {
  animateEls.forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) el.classList.add('visible');
  });
}, 50);

// Navegación activa por scroll
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

// Comentarios con localStorage
const commentForm = document.getElementById('commentForm');
const commentsList = document.getElementById('commentsList');

function loadComments() {
  const comments = JSON.parse(localStorage.getItem('kanguro_comments') || '[]');
  if (comments.length === 0) {
    commentsList.innerHTML = '<p class="comments-empty">Todavía no hay opiniones. ¡Sé el primero!</p>';
    return;
  }
  commentsList.innerHTML = comments.map(c => `
    <div class="comment-card">
      <div class="comment-header">
        <div class="comment-avatar">${c.name[0]}</div>
        <span class="comment-name">${c.name}</span>
        <span class="comment-date">${c.date}</span>
      </div>
      <p class="comment-text">${c.text}</p>
    </div>
  `).join('');
}

commentForm.addEventListener('submit', e => {
  e.preventDefault();
  const name = document.getElementById('commentName').value.trim();
  const text = document.getElementById('commentText').value.trim();
  if (!name || !text) return;

  const comments = JSON.parse(localStorage.getItem('kanguro_comments') || '[]');
  comments.unshift({
    name,
    text,
    date: new Date().toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })
  });
  localStorage.setItem('kanguro_comments', JSON.stringify(comments));
  commentForm.reset();
  loadComments();
});

loadComments();

// Scroll suave al hacer click en nav
navLinks.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const target = document.getElementById(link.dataset.section);
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
});
