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

// Scroll suave al hacer click en nav
navLinks.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    const target = document.getElementById(link.dataset.section);
    if (target) target.scrollIntoView({ behavior: 'smooth' });
  });
});
