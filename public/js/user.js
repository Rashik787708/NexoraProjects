/* ========================================
   Nova Projects - User Auth & Features
   ======================================== */

(function () {
  const USER_TOKEN_KEY = 'nova_user_token';
  let currentUser = null;

  function getUserToken() {
    return localStorage.getItem(USER_TOKEN_KEY) || sessionStorage.getItem(USER_TOKEN_KEY);
  }

  function setUserToken(token, persist) {
    if (persist) localStorage.setItem(USER_TOKEN_KEY, token);
    else sessionStorage.setItem(USER_TOKEN_KEY, token);
  }

  function clearUserToken() {
    localStorage.removeItem(USER_TOKEN_KEY);
    sessionStorage.removeItem(USER_TOKEN_KEY);
  }

  function authHeaders() {
    return { 'Content-Type': 'application/json', Authorization: 'Bearer ' + getUserToken() };
  }

  /* --- Google OAuth token capture from URL --- */
  function captureGoogleToken() {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('google_token');
    if (token) {
      setUserToken(token, true);
      window.history.replaceState({}, '', window.location.pathname);
    }
  }

  /* --- Fetch current user and cache --- */
  async function fetchCurrentUser() {
    const token = getUserToken();
    if (!token) return null;
    try {
      const res = await fetch('/api/auth/me', { headers: { Authorization: 'Bearer ' + token } });
      const data = await res.json();
      if (data.success) {
        currentUser = data.user;
        return currentUser;
      }
      clearUserToken();
      return null;
    } catch (e) {
      return null;
    }
  }

  /* --- Render auth section in navbar --- */
  async function renderAuthNav() {
    const container = document.getElementById('authNav');
    if (!container) return;

    const user = await fetchCurrentUser();
    if (!user) {
      container.innerHTML = '<a href="/login" class="btn btn-outline btn-sm">Login</a>';
      return;
    }

    const initial = (user.name || 'U').charAt(0).toUpperCase();
    const avatarHtml = user.avatar
      ? `<img src="${escapeHtml(user.avatar)}" alt="" class="nav-avatar">`
      : `<span class="nav-avatar-text">${initial}</span>`;

    container.innerHTML = `
      <a href="/favorites" class="nav-link">❤️</a>
      <div class="nav-user-menu">
        <button class="nav-user-btn" id="userMenuBtn">${avatarHtml}</button>
        <div class="nav-dropdown" id="userDropdown">
          <div class="dropdown-header">${escapeHtml(user.name)}</div>
          <a href="/profile" class="dropdown-item">👤 Profile</a>
          <a href="/favorites" class="dropdown-item">❤️ Favorites</a>
          <hr class="dropdown-divider">
          <button class="dropdown-item" id="userLogoutBtn">🚪 Logout</button>
        </div>
      </div>`;

    document.getElementById('userMenuBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      document.getElementById('userDropdown').classList.toggle('show');
    });
    document.addEventListener('click', () => {
      const dd = document.getElementById('userDropdown');
      if (dd) dd.classList.remove('show');
    });
    document.getElementById('userLogoutBtn').addEventListener('click', () => {
      clearUserToken();
      currentUser = null;
      window.location.href = '/';
    });

    // Show favorite buttons on project cards
    document.querySelectorAll('.fav-btn').forEach((btn) => {
      btn.style.display = 'flex';
    });
  }

  /* --- Favorite toggle (global handler for onclick) --- */
  window.handleFavBtn = async function (btn) {
    const projectId = btn.dataset.id;
    const token = getUserToken();
    if (!token) {
      window.location.href = '/login';
      return;
    }
    try {
      const res = await fetch('/api/auth/favorites/' + projectId, {
        method: 'POST',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        const isFav = data.favorites.includes(projectId);
        btn.classList.toggle('fav-active', isFav);
        btn.textContent = isFav ? '❤️' : '🤍';
        showToast(isFav ? 'Added to favorites' : 'Removed from favorites');
      }
    } catch (e) {}
  };

  /* --- Favorites page --- */
  async function loadFavorites() {
    const grid = document.getElementById('favoritesGrid');
    if (!grid) return;
    const token = getUserToken();
    if (!token) {
      grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🔒</div><h3>Login required</h3><p>Please sign in to see your favorites.</p><a href="/login" class="btn btn-primary" style="margin-top:16px">Login</a></div>';
      return;
    }
    try {
      const res = await fetch('/api/auth/favorites', { headers: authHeaders() });
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        renderProjects('favoritesGrid', data.data);
        // Mark existing favorites
        const favIds = data.data.map((p) => p._id);
        document.querySelectorAll('.fav-btn').forEach((btn) => {
          btn.style.display = 'flex';
          if (favIds.includes(btn.dataset.id)) {
            btn.classList.add('fav-active');
            btn.textContent = '❤️';
          }
        });
      } else {
        grid.innerHTML = '<div class="empty-state"><div class="empty-state-icon">❤️</div><h3>No favorites yet</h3><p>Browse projects and click the heart to save them here.</p><a href="/projects" class="btn btn-primary" style="margin-top:16px">Browse Projects</a></div>';
      }
    } catch (e) {
      grid.innerHTML = '<div class="loading-placeholder">Failed to load favorites</div>';
    }
  }

  /* --- Profile page --- */
  async function loadProfile() {
    const token = getUserToken();
    if (!token) { window.location.href = '/login'; return; }

    const user = await fetchCurrentUser();
    if (!user) { window.location.href = '/login'; return; }

    const initial = (user.name || 'U').charAt(0).toUpperCase();
    document.getElementById('profileName').textContent = user.name;
    document.getElementById('profileEmail').textContent = user.email || 'No email';
    document.getElementById('editName').value = user.name;
    document.getElementById('editAvatar').value = user.avatar || '';

    const avatarEl = document.getElementById('profileAvatar');
    if (user.avatar) {
      avatarEl.innerHTML = `<img src="${escapeHtml(user.avatar)}" alt="">`;
    } else {
      avatarEl.innerHTML = `<span class="avatar-large">${initial}</span>`;
    }

    const badge = document.getElementById('profileAuthBadge');
    const labels = { local: '📧 Email', google: '🔵 Google' };
    badge.textContent = labels[user.authProvider] || user.authProvider;

    if (user.authProvider !== 'local' || !user.password) {
      const passSection = document.getElementById('passwordSection');
      if (passSection) passSection.style.display = 'none';
    }
  }

  function initProfileForm() {
    const form = document.getElementById('profileForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        const res = await fetch('/api/auth/profile', {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({
            name: document.getElementById('editName').value.trim(),
            avatar: document.getElementById('editAvatar').value.trim(),
          }),
        });
        const data = await res.json();
        if (data.success) {
          showToast('Profile updated!');
          loadProfile();
        } else {
          showToast(data.message || 'Update failed', 'error');
        }
      } catch (e) {
        showToast('Network error', 'error');
      }
    });
  }

  function initChangePassForm() {
    const form = document.getElementById('changePassForm');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const newPass = document.getElementById('newPass').value;
      const confirm = document.getElementById('confirmPass').value;
      if (newPass !== confirm) { showToast('Passwords do not match', 'error'); return; }
      try {
        const res = await fetch('/api/auth/change-password', {
          method: 'PUT',
          headers: authHeaders(),
          body: JSON.stringify({
            currentPassword: document.getElementById('currentPass').value,
            newPassword: newPass,
          }),
        });
        const data = await res.json();
        if (data.success) {
          showToast('Password changed!');
          form.reset();
        } else {
          showToast(data.message || 'Failed', 'error');
        }
      } catch (e) {
        showToast('Network error', 'error');
      }
    });
  }

  /* --- Login form --- */
  function initLoginForm() {
    const form = document.getElementById('loginForm');
    if (!form) return;
    if (getUserToken()) { window.location.href = '/'; return; }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const remember = document.getElementById('rememberMe').checked;
      const btn = form.querySelector('button[type="submit"]');
      btn.textContent = 'Signing in...';
      btn.disabled = true;

      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (data.success) {
          setUserToken(data.token, remember);
          showToast('Welcome back!');
          setTimeout(() => (window.location.href = '/'), 800);
        } else {
          showToast(data.message || 'Login failed', 'error');
          btn.textContent = 'Sign In';
          btn.disabled = false;
        }
      } catch (err) {
        showToast('Network error', 'error');
        btn.textContent = 'Sign In';
        btn.disabled = false;
      }
    });
  }

  /* --- Register form --- */
  function initRegisterForm() {
    const form = document.getElementById('registerForm');
    if (!form) return;
    if (getUserToken()) { window.location.href = '/'; return; }

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = document.getElementById('name').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value;
      const confirmPassword = document.getElementById('confirmPassword').value;

      if (password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
      }
      const btn = form.querySelector('button[type="submit"]');
      btn.textContent = 'Creating account...';
      btn.disabled = true;

      try {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();
        if (data.success) {
          setUserToken(data.token, true);
          showToast('Account created! Welcome!');
          setTimeout(() => (window.location.href = '/'), 800);
        } else {
          showToast(data.message || 'Registration failed', 'error');
          btn.textContent = 'Create Account';
          btn.disabled = false;
        }
      } catch (err) {
        showToast('Network error', 'error');
        btn.textContent = 'Create Account';
        btn.disabled = false;
      }
    });
  }

  /* --- Init --- */
  document.addEventListener('DOMContentLoaded', () => {
    captureGoogleToken();
    renderAuthNav();

    const path = window.location.pathname;
    if (path === '/login') initLoginForm();
    else if (path === '/register') initRegisterForm();
    else if (path === '/profile') { loadProfile(); initProfileForm(); initChangePassForm(); }
    else if (path === '/favorites') loadFavorites();
  });
})();
