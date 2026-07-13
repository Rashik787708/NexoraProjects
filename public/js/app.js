/* ========================================
   Nexora Projects - Main Application JS
   ======================================== */

const API = '/api';

/* --- Utility --- */
function showToast(message, type = 'success') {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.className = `toast ${type} show`;
  setTimeout(() => toast.classList.remove('show'), 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function apiFetch(url, options = {}) {
  try {
    const res = await fetch(API + url, {
      headers: { 'Content-Type': 'application/json', ...options.headers },
      ...options,
    });
    return await res.json();
  } catch (err) {
    console.error('API Error:', err);
    return { success: false, message: 'Network error' };
  }
}

/* --- Loader --- */
window.addEventListener('load', () => {
  const loader = document.getElementById('loader');
  if (loader) setTimeout(() => loader.classList.add('hidden'), 600);
  checkShutdown();
});

async function checkShutdown() {
  try {
    const res = await fetch(API + '/status');
    const data = await res.json();
    if (data.shutdown) {
      let banner = document.getElementById('shutdownBanner');
      if (!banner) {
        banner = document.createElement('div');
        banner.id = 'shutdownBanner';
        banner.className = 'shutdown-banner';
        document.body.prepend(banner);
      }
      banner.textContent = data.message;
      banner.classList.add('show');
    }
  } catch (e) {}
}

/* --- Navbar --- */
document.addEventListener('DOMContentLoaded', () => {
  const navbar = document.getElementById('navbar');
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navToggle.classList.toggle('active');
      navLinks.classList.toggle('active');
    });
    navLinks.querySelectorAll('.nav-link').forEach((link) => {
      link.addEventListener('click', () => {
        navToggle.classList.remove('active');
        navLinks.classList.remove('active');
      });
    });
  }

  window.addEventListener('scroll', () => {
    if (navbar) navbar.classList.toggle('scrolled', window.scrollY > 50);
    updateScrollProgress();
    updateBackToTop();
  });

  const backToTop = document.getElementById('backToTop');
  if (backToTop) {
    backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }
});

function updateScrollProgress() {
  const bar = document.getElementById('scroll-progress');
  if (!bar) return;
  const h = document.documentElement.scrollHeight - window.innerHeight;
  bar.style.width = h > 0 ? (window.scrollY / h) * 100 + '%' : '0%';
}

function updateBackToTop() {
  const btn = document.getElementById('backToTop');
  if (btn) btn.classList.toggle('visible', window.scrollY > 400);
}

/* --- Scroll Animations --- */
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        observer.unobserve(e.target);
      }
    });
  },
  { threshold: 0.1 }
);

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.fade-up').forEach((el) => observer.observe(el));
});

/* --- Animated Counters --- */
function animateCounters() {
  document.querySelectorAll('.stat-number').forEach((el) => {
    const target = parseInt(el.dataset.target);
    const duration = 2000;
    const start = performance.now();
    function update(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(target * eased);
      if (progress < 1) requestAnimationFrame(update);
      else el.textContent = target;
    }
    requestAnimationFrame(update);
  });
}

/* --- Project Card Renderer --- */
function createProjectCard(project) {
  const categoryClass = project.category === 'software' ? 'software' : '';
  const technologies = (project.technology || []).slice(0, 3);
  const imgSrc = project.thumbnail && project.thumbnail !== '/images/default-project.jpg'
    ? project.thumbnail
    : null;

  return `
    <div class="project-card fade-up" onclick="window.location.href='/project/${escapeHtml(project.slug || project._id)}'">
      <div class="project-card-image">
        ${imgSrc ? `<img src="${imgSrc}" alt="${escapeHtml(project.title)}" loading="lazy">` : `<div class="placeholder-img">${project.category === 'hardware' ? '🔧' : '💻'}</div>`}
      </div>
      <div class="project-card-body">
        <div class="project-card-meta">
          <span class="project-badge ${categoryClass}">${escapeHtml(project.category)}</span>
          <span class="difficulty-badge">${escapeHtml(project.difficulty)}</span>
          ${project.featured ? '<span class="project-badge">⭐ Featured</span>' : ''}
        </div>
        <h3>${escapeHtml(project.title)}</h3>
        <p>${escapeHtml(project.description || '')}</p>
        <div class="project-tech-tags">
          ${technologies.map((t) => `<span class="tech-tag">${escapeHtml(t)}</span>`).join('')}
        </div>
        <div class="project-card-footer">
          <span class="project-price">${project.price > 0 ? '₹' + project.price : 'Free'}</span>
          <span class="project-card-link">View Details →</span>
        </div>
      </div>
    </div>`;
}

function renderProjects(containerId, projects) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!projects.length) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📦</div>
        <h3>No projects found</h3>
        <p>Check back later for new projects.</p>
      </div>`;
    return;
  }
  container.innerHTML = projects.map(createProjectCard).join('');
  container.querySelectorAll('.fade-up').forEach((el) => observer.observe(el));
}

/* --- Home Page Featured Projects --- */
async function loadFeaturedProjects() {
  const grid = document.getElementById('featuredProjects');
  if (!grid) return;
  const res = await apiFetch('/projects?featured=true&limit=6');
  if (res.success && res.data.length > 0) {
    renderProjects('featuredProjects', res.data);
    return;
  }
  const allRes = await apiFetch('/projects?limit=6');
  if (allRes.success) {
    renderProjects('featuredProjects', allRes.data);
  } else {
    grid.innerHTML = '<div class="loading-placeholder">Unable to load projects</div>';
  }
}

/* --- Projects Page --- */
let currentCategory = '';
let currentPage = 1;

async function loadProjects(page = 1) {
  const grid = document.getElementById('projectsGrid');
  if (!grid) return;
  const search = document.getElementById('searchInput')?.value || '';
  const sort = document.getElementById('sortSelect')?.value || 'latest';
  const activeFilter = document.querySelector('.filter-btn.active');
  const filter = activeFilter?.dataset.filter || 'all';

  let url = `/projects?page=${page}&limit=12&sort=${sort}`;
  if (search) url += `&search=${encodeURIComponent(search)}`;
  if (filter === 'hardware') url += '&category=hardware';
  else if (filter === 'software') url += '&category=software';
  else if (filter === 'featured') url += '&featured=true';

  const res = await apiFetch(url);
  if (res.success) {
    renderProjects('projectsGrid', res.data);
    renderPagination(res.pagination);
  } else {
    grid.innerHTML = '<div class="loading-placeholder">Unable to load projects</div>';
  }
}

function renderPagination(pagination) {
  const container = document.getElementById('pagination');
  if (!container || !pagination || pagination.pages <= 1) {
    if (container) container.innerHTML = '';
    return;
  }
  let html = '';
  for (let i = 1; i <= pagination.pages; i++) {
    html += `<button class="page-btn ${i === pagination.page ? 'active' : ''}" onclick="loadProjects(${i})">${i}</button>`;
  }
  container.innerHTML = html;
}

function loadCategoryProjects(category) {
  currentCategory = category;
  const grid = document.getElementById('projectsGrid');
  if (!grid) return;
  grid.innerHTML = '<div class="loading-placeholder">Loading projects...</div>';

  async function fetchCat(page = 1) {
    const search = document.getElementById('searchInput')?.value || '';
    const sort = document.getElementById('sortSelect')?.value || 'latest';
    let url = `/projects?category=${category}&page=${page}&limit=12&sort=${sort}`;
    if (search) url += `&search=${encodeURIComponent(search)}`;
    const res = await apiFetch(url);
    if (res.success) {
      renderProjects('projectsGrid', res.data);
      renderPagination(res.pagination);
    }
  }
  fetchCat();

  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    let debounce;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => fetchCat(), 400);
    });
  }
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) sortSelect.addEventListener('change', () => fetchCat());
}

/* --- Project Detail --- */
async function loadProjectDetail() {
  const container = document.getElementById('projectDetail');
  if (!container) return;
  const slug = window.location.pathname.split('/project/')[1];
  if (!slug) return;

  const res = await apiFetch(`/projects/${slug}`);
  if (!res.success) {
    container.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔍</div>
        <h3>Project Not Found</h3>
        <p>The project you're looking for doesn't exist.</p>
        <a href="/projects" class="btn btn-primary" style="margin-top:16px">Browse Projects</a>
      </div>`;
    return;
  }

  const p = res.data;
  const imgSrc = p.thumbnail && p.thumbnail !== '/images/default-project.jpg' ? p.thumbnail : null;
  document.title = `${p.title} - Nexora Projects`;

  container.innerHTML = `
    <div class="container">
      <a href="javascript:history.back()" class="detail-back">← Back</a>
      <div class="detail-header">
        <div class="detail-badges">
          <span class="project-badge ${p.category === 'software' ? 'software' : ''}">${escapeHtml(p.category)}</span>
          <span class="difficulty-badge">${escapeHtml(p.difficulty)}</span>
          ${p.featured ? '<span class="project-badge">⭐ Featured</span>' : ''}
        </div>
        <h1 class="detail-title">${escapeHtml(p.title)}</h1>
        <div class="detail-meta">
          <span>📅 ${new Date(p.createdAt).toLocaleDateString()}</span>
          <span>🛠️ ${(p.technology || []).map(t => escapeHtml(t)).join(', ')}</span>
        </div>
      </div>
      <div class="detail-banner">
        ${imgSrc ? `<img src="${imgSrc}" alt="${escapeHtml(p.title)}">` : `<div class="placeholder-img">${p.category === 'hardware' ? '🔧' : '💻'}</div>`}
      </div>
      <div class="detail-content">
        <div class="detail-main">
          <h2>Description</h2>
          <p>${escapeHtml(p.description || 'No description available.')}</p>
          <h2>Technologies Used</h2>
          <div class="project-tech-tags" style="margin-bottom:24px">
            ${(p.technology || []).map((t) => `<span class="tech-tag">${escapeHtml(t)}</span>`).join('')}
          </div>
        </div>
        <div class="detail-sidebar">
          <div class="sidebar-price">${p.price > 0 ? '₹' + p.price : 'Free'}</div>
          <div class="sidebar-info-item"><span>Category</span><span>${escapeHtml(p.category)}</span></div>
          <div class="sidebar-info-item"><span>Difficulty</span><span>${escapeHtml(p.difficulty)}</span></div>
          <div class="sidebar-info-item"><span>Status</span><span>${escapeHtml(p.status)}</span></div>
          <div class="sidebar-info-item"><span>Created</span><span>${new Date(p.createdAt).toLocaleDateString()}</span></div>
          <div class="sidebar-links">
            ${p.github ? `<a href="${escapeHtml(p.github)}" target="_blank" class="btn btn-outline">GitHub →</a>` : ''}
            ${p.demo ? `<a href="${escapeHtml(p.demo)}" target="_blank" class="btn btn-outline">Live Demo →</a>` : ''}
            <a href="/contact" class="btn btn-primary">Contact Us</a>
          </div>
        </div>
      </div>
    </div>`;
}

/* --- Contact Form --- */
function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      name: form.name.value.trim(),
      email: form.email.value.trim(),
      phone: form.phone.value.trim(),
      message: form.message.value.trim(),
    };
    if (!data.name || !data.email || !data.message) {
      showToast('Please fill all required fields', 'error');
      return;
    }
    const btn = form.querySelector('button[type="submit"]');
    btn.textContent = 'Sending...';
    btn.disabled = true;
    const res = await fetch(API + '/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    btn.textContent = 'Send Message';
    btn.disabled = false;
    if (result.success) {
      showToast('Message sent successfully!');
      form.reset();
    } else {
      showToast(result.message || 'Failed to send message', 'error');
    }
  });
}

/* --- Init Page Logic --- */
document.addEventListener('DOMContentLoaded', () => {
  const path = window.location.pathname;

  if (path === '/') {
    loadFeaturedProjects();
    animateCounters();
  } else if (path === '/projects') {
    loadProjects();
    initProjectsPageListeners();
  } else if (path.startsWith('/project/')) {
    loadProjectDetail();
  } else if (path === '/contact') {
    initContactForm();
  }
});

function initProjectsPageListeners() {
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    let debounce;
    searchInput.addEventListener('input', () => {
      clearTimeout(debounce);
      debounce = setTimeout(() => loadProjects(1), 400);
    });
  }
  document.querySelectorAll('.filter-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      loadProjects(1);
    });
  });
  const sortSelect = document.getElementById('sortSelect');
  if (sortSelect) sortSelect.addEventListener('change', () => loadProjects(1));
}
