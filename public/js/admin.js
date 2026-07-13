/* ========================================
   Nexora Projects - Admin Dashboard JS
   Relies on app.js for API, showToast, etc.
   ======================================== */

(function () {
  let adminToken = localStorage.getItem('nexora_token') || sessionStorage.getItem('nexora_token');

  function authHeaders() {
    return {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + adminToken,
    };
  }

  document.addEventListener('DOMContentLoaded', () => {
    /* --- Login Form --- */
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
      if (adminToken) {
        window.location.href = '/admin/dashboard';
        return;
      }
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const remember = document.getElementById('rememberMe').checked;
        const btn = loginForm.querySelector('button[type="submit"]');
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
            adminToken = data.token;
            if (remember) localStorage.setItem('nexora_token', data.token);
            else sessionStorage.setItem('nexora_token', data.token);
            showToast('Login successful!');
            setTimeout(() => (window.location.href = '/admin/dashboard'), 800);
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
      return;
    }

    /* --- Dashboard: redirect if not logged in --- */
    if (window.location.pathname === '/admin/dashboard') {
      if (!adminToken) {
        window.location.href = '/admin/login';
        return;
      }
      loadDashboard();
      initDashboardListeners();
      initPasswordChange();
      initShutdownToggle();
    }

    /* --- Logout --- */
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        localStorage.removeItem('nexora_token');
        sessionStorage.removeItem('nexora_token');
        adminToken = null;
        window.location.href = '/admin/login';
      });
    }
  });

  /* --- Dashboard Data --- */
  async function loadDashboard() {
    try {
      const res = await fetch('/api/dashboard', { headers: authHeaders() });
      const data = await res.json();
      if (!data.success) {
        if (res.status === 401) {
          window.location.href = '/admin/login';
          return;
        }
        showToast('Failed to load dashboard', 'error');
        return;
      }
      document.getElementById('statTotal').textContent = data.data.total;
      document.getElementById('statHardware').textContent = data.data.hardware;
      document.getElementById('statSoftware').textContent = data.data.software;
      document.getElementById('statFeatured').textContent = data.data.featured;
      await loadAllProjects();
      await loadMessages();
    } catch (err) {
      showToast('Network error', 'error');
    }
  }

  async function loadMessages() {
    try {
      const res = await fetch('/api/contacts', { headers: authHeaders() });
      const data = await res.json();
      const tbody = document.getElementById('messagesTableBody');
      if (!data.success || !data.data.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading-placeholder">No messages yet</td></tr>';
        return;
      }
      tbody.innerHTML = data.data
        .map(
          (m) => `
        <tr>
          <td><strong>${escapeHtml(m.name)}</strong></td>
          <td>${escapeHtml(m.email)}</td>
          <td>${escapeHtml(m.phone || '-')}</td>
          <td style="max-width:250px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="${escapeHtml(m.message)}">${escapeHtml(m.message)}</td>
          <td><button class="action-btn ${m.responded ? 'action-btn-edit' : 'action-btn-delete'}" data-toggle-status="${m._id}" style="cursor:pointer">${m.responded ? 'Responded' : 'Pending'}</button></td>
          <td>${new Date(m.createdAt).toLocaleDateString()}</td>
        </tr>`
        )
        .join('');

      tbody.querySelectorAll('[data-toggle-status]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          const id = btn.dataset.toggleStatus;
          const res = await fetch('/api/contacts/' + id + '/toggle', { method: 'PUT', headers: authHeaders() });
          const data = await res.json();
          if (data.success) loadMessages();
        });
      });
    } catch (err) {
      console.error(err);
    }
  }

  async function loadAllProjects() {
    try {
      const res = await fetch('/api/projects/admin/all', { headers: authHeaders() });
      const data = await res.json();
      const tbody = document.getElementById('projectsTableBody');
      if (!data.success || !data.data.length) {
        tbody.innerHTML = '<tr><td colspan="6" class="loading-placeholder">No projects yet</td></tr>';
        return;
      }
      tbody.innerHTML = data.data
        .map(
          (p) => `
        <tr>
          <td><strong>${escapeHtml(p.title)}</strong></td>
          <td><span class="project-badge ${p.category === 'software' ? 'software' : ''}">${escapeHtml(p.category)}</span></td>
          <td>${escapeHtml(p.difficulty)}</td>
          <td>${p.featured ? '⭐ Yes' : 'No'}</td>
          <td>${escapeHtml(p.status)}</td>
          <td>
            <div class="action-btns">
              <button class="action-btn action-btn-edit" data-edit="${p._id}">Edit</button>
              <button class="action-btn action-btn-delete" data-delete="${p._id}">Delete</button>
            </div>
          </td>
        </tr>`
        )
        .join('');

      tbody.querySelectorAll('[data-edit]').forEach((btn) => {
        btn.addEventListener('click', () => editProject(btn.dataset.edit));
      });
      tbody.querySelectorAll('[data-delete]').forEach((btn) => {
        btn.addEventListener('click', () => deleteProject(btn.dataset.delete));
      });
    } catch (err) {
      console.error(err);
    }
  }

  /* --- Modal --- */
  function openModal(title) {
    document.getElementById('modalTitle').textContent = title || 'New Project';
    document.getElementById('projectModal').classList.add('active');
  }
  function closeModal() {
    document.getElementById('projectModal').classList.remove('active');
    document.getElementById('projectForm').reset();
    document.getElementById('projectId').value = '';
  }

  async function editProject(id) {
    try {
      const res = await fetch('/api/projects/' + id, { headers: authHeaders() });
      const data = await res.json();
      if (!data.success) return showToast('Project not found', 'error');
      const p = data.data;
      document.getElementById('projectId').value = p._id;
      document.getElementById('pTitle').value = p.title;
      document.getElementById('pCategory').value = p.category;
      document.getElementById('pDescription').value = p.description;
      document.getElementById('pTechnology').value = (p.technology || []).join(', ');
      document.getElementById('pDifficulty').value = p.difficulty;
      document.getElementById('pPrice').value = p.price || 0;
      document.getElementById('pStatus').value = p.status;
      document.getElementById('pGithub').value = p.github || '';
      document.getElementById('pDemo').value = p.demo || '';
      document.getElementById('pFeatured').checked = p.featured;
      openModal('Edit Project');
    } catch (err) {
      showToast('Network error', 'error');
    }
  }

  async function deleteProject(id) {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      const res = await fetch('/api/projects/' + id, {
        method: 'DELETE',
        headers: authHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        showToast('Project deleted');
        loadDashboard();
      } else {
        showToast(data.message || 'Delete failed', 'error');
      }
    } catch (err) {
      showToast('Network error', 'error');
    }
  }

  /* --- Form Submit --- */
  function initDashboardListeners() {
    const addBtn = document.getElementById('addProjectBtn');
    const closeBtn = document.getElementById('modalClose');
    const cancelBtn = document.getElementById('cancelBtn');
    const overlay = document.getElementById('projectModal');
    const form = document.getElementById('projectForm');

    if (addBtn) addBtn.addEventListener('click', () => openModal());
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    if (overlay) {
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) closeModal();
      });
    }

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('projectId').value;
        const formData = new FormData();
        formData.append('title', document.getElementById('pTitle').value);
        formData.append('category', document.getElementById('pCategory').value);
        formData.append('description', document.getElementById('pDescription').value);
        formData.append('technology', document.getElementById('pTechnology').value);
        formData.append('difficulty', document.getElementById('pDifficulty').value);
        formData.append('price', document.getElementById('pPrice').value);
        formData.append('status', document.getElementById('pStatus').value);
        formData.append('github', document.getElementById('pGithub').value);
        formData.append('demo', document.getElementById('pDemo').value);
        formData.append('featured', document.getElementById('pFeatured').checked);

        const thumb = document.getElementById('pThumbnail').files[0];
        if (thumb) formData.append('thumbnail', thumb);

        try {
          const url = id ? '/api/projects/' + id : '/api/projects';
          const method = id ? 'PUT' : 'POST';
          const res = await fetch(url, {
            method,
            headers: { Authorization: 'Bearer ' + adminToken },
            body: formData,
          });
          const data = await res.json();
          if (data.success) {
            showToast(id ? 'Project updated!' : 'Project created!');
            closeModal();
            loadDashboard();
          } else {
            showToast(data.message || 'Save failed', 'error');
          }
        } catch (err) {
          showToast('Network error', 'error');
        }
      });
    }
  }

  /* --- Change Password --- */
  function initPasswordChange() {
    const btn = document.getElementById('changePassBtn');
    const modal = document.getElementById('passModal');
    const closeBtn = document.getElementById('passModalClose');
    const cancelBtn = document.getElementById('passCancelBtn');
    const form = document.getElementById('passForm');

    if (btn) btn.addEventListener('click', () => modal.classList.add('active'));
    if (closeBtn) closeBtn.addEventListener('click', () => { modal.classList.remove('active'); form.reset(); });
    if (cancelBtn) cancelBtn.addEventListener('click', () => { modal.classList.remove('active'); form.reset(); });
    if (modal) modal.addEventListener('click', (e) => { if (e.target === modal) { modal.classList.remove('active'); form.reset(); } });

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const current = document.getElementById('currentPass').value;
        const newPass = document.getElementById('newPass').value;
        const confirm = document.getElementById('confirmPass').value;

        if (newPass !== confirm) {
          showToast('New passwords do not match', 'error');
          return;
        }
        if (newPass.length < 6) {
          showToast('Password must be at least 6 characters', 'error');
          return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.textContent = 'Updating...';
        submitBtn.disabled = true;

        try {
          const res = await fetch('/api/auth/change-password', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + adminToken },
            body: JSON.stringify({ currentPassword: current, newPassword: newPass }),
          });
          const data = await res.json();
          if (data.success) {
            showToast('Password changed successfully!');
            modal.classList.remove('active');
            form.reset();
          } else {
            showToast(data.message || 'Failed to change password', 'error');
          }
        } catch (err) {
          showToast('Network error', 'error');
        }
        submitBtn.textContent = 'Update Password';
        submitBtn.disabled = false;
      });
    }
  }

  /* --- Shutdown Toggle --- */
  function initShutdownToggle() {
    const toggle = document.getElementById('shutdownToggle');
    if (!toggle) return;

    fetch('/api/status').then(r => r.json()).then(data => {
      toggle.checked = data.shutdown;
    });

    toggle.addEventListener('change', async () => {
      const res = await fetch('/api/status/shutdown', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + adminToken },
        body: JSON.stringify({ shutdown: toggle.checked }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(toggle.checked ? 'Shutdown mode ON' : 'Shutdown mode OFF');
      }
    });
  }
})();
