const adminState = {
  currentUser: null,
  users: []
};

// Mocks estáticos para demonstração visual da Entrega 1.
// Na Entrega 2 estes dados virão das rotas /api/admin/pets, /api/admin/tipos-pet
// e /api/admin/servicos.
const MOCK_PETS = [
  { id: 1, nome: 'Thor',   tutor: 'Ana Silva',     tutor_email: 'ana@petweb.com',     especie: 'Cão',  raca: 'Labrador', porte: 'Grande' },
  { id: 2, nome: 'Mel',    tutor: 'Carlos Souza',  tutor_email: 'carlos@petweb.com',  especie: 'Cão',  raca: 'Poodle',   porte: 'Pequeno' },
  { id: 3, nome: 'Luna',   tutor: 'Júlia Costa',   tutor_email: 'julia@petweb.com',   especie: 'Gato', raca: 'Siamês',   porte: 'Pequeno' }
];

const MOCK_PET_TYPES = [
  { id: 1, nome: 'Cão',   ativo: 1 },
  { id: 2, nome: 'Gato',  ativo: 1 },
  { id: 3, nome: 'Outro', ativo: 1 }
];

const MOCK_SERVICES = [
  { id: 1, nome: 'Banho',                preco: 49.90,  tempo_estimado: 60,   ativo: 1 },
  { id: 2, nome: 'Tosa',                 preco: 69.90,  tempo_estimado: 90,   ativo: 1 },
  { id: 3, nome: 'Banho + Tosa',         preco: 99.90,  tempo_estimado: 120,  ativo: 1 },
  { id: 4, nome: 'Consulta Veterinária', preco: 120.00, tempo_estimado: 45,   ativo: 1 },
  { id: 5, nome: 'Vacinação',            preco: 89.90,  tempo_estimado: 30,   ativo: 1 },
  { id: 6, nome: 'Hospedagem',           preco: 140.00, tempo_estimado: 1440, ativo: 1 }
];

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function requireAdmin() {
  const user = window.PetWebApi.getCurrentUser();
  if (!user) {
    window.location.href = '/login.html?next=/admin.html';
    return null;
  }
  if (user.tipo_perfil !== 'admin') {
    window.location.href = '/dashboard.html';
    return null;
  }
  document.querySelectorAll('[data-admin-name]').forEach(el => el.textContent = user.nome.split(' ')[0]);
  document.querySelectorAll('[data-admin-name-full]').forEach(el => el.textContent = user.nome);
  const initials = String(user.nome).trim().split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase();
  document.querySelectorAll('[data-admin-avatar]').forEach(el => el.textContent = initials);
  adminState.currentUser = user;
  return user;
}

function renderUsers() {
  const target = document.querySelector('[data-admin-users]');
  if (!target) return;

  target.innerHTML = adminState.users.map((user) => `
    <tr>
      <td data-label="Nome">${escapeHtml(user.nome)}</td>
      <td data-label="E-mail">${escapeHtml(user.email)}</td>
      <td data-label="Telefone">${escapeHtml(user.telefone || '-')}</td>
      <td data-label="Perfil"><span class="badge ${user.tipo_perfil === 'admin' ? 'badge--confirmed' : 'badge--pending'}">${escapeHtml(user.tipo_perfil)}</span></td>
      <td data-label="Ações">
        <div class="table-actions">
          <button class="btn btn-outline btn-sm" type="button" data-edit-user="${user.id}">Editar</button>
          ${user.tipo_perfil === 'cliente' ? `<button class="btn btn-ghost btn-sm" type="button" data-delete-user="${user.id}">Excluir</button>` : ''}
        </div>
      </td>
    </tr>
  `).join('');
}

function renderMockPets() {
  const target = document.querySelector('[data-admin-pets]');
  if (!target) return;
  target.innerHTML = MOCK_PETS.map((pet) => `
    <tr>
      <td data-label="Pet">${escapeHtml(pet.nome)}</td>
      <td data-label="Tutor">${escapeHtml(pet.tutor)}<br><small>${escapeHtml(pet.tutor_email)}</small></td>
      <td data-label="Espécie">${escapeHtml(pet.especie)}</td>
      <td data-label="Raça">${escapeHtml(pet.raca || '-')}</td>
      <td data-label="Porte">${escapeHtml(pet.porte || '-')}</td>
    </tr>
  `).join('');
}

function renderMockPetTypes() {
  const target = document.querySelector('[data-admin-pet-types]');
  if (!target) return;
  target.innerHTML = MOCK_PET_TYPES.map((type) => `
    <tr>
      <td data-label="Nome">${escapeHtml(type.nome)}</td>
      <td data-label="Ativo">${Number(type.ativo) ? 'Sim' : 'Não'}</td>
    </tr>
  `).join('');
}

function renderMockServices() {
  const target = document.querySelector('[data-admin-services]');
  if (!target) return;
  target.innerHTML = MOCK_SERVICES.map((service) => `
    <tr>
      <td data-label="Nome">${escapeHtml(service.nome)}</td>
      <td data-label="Preço">${money(service.preco)}</td>
      <td data-label="Duração">${service.tempo_estimado} min</td>
      <td data-label="Ativo">${Number(service.ativo) ? 'Sim' : 'Não'}</td>
    </tr>
  `).join('');
}

async function loadUsers() {
  const data = await window.PetWebApi.apiFetch('/api/admin/usuarios');
  adminState.users = data.usuarios || [];
  renderUsers();
}

function setUserForm(user = {}) {
  const form = document.querySelector('[data-user-form]');
  const title = document.querySelector('[data-user-modal-title]');
  const passwordField = form.querySelector('[data-user-password-field]');
  if (!form) return;

  form.id.value = user.id || '';
  form.nome.value = user.nome || '';
  form.email.value = user.email || '';
  form.telefone.value = user.telefone || '';
  form.tipo_perfil.value = user.tipo_perfil || 'cliente';
  if (form.senha) form.senha.value = '';

  if (passwordField) {
    passwordField.style.display = user.id ? 'none' : 'block';
  }

  if (title) {
    if (user.id) {
      title.textContent = user.tipo_perfil === 'admin' ? 'Editar administrador' : 'Editar cliente';
    } else {
      title.textContent = 'Novo usuário';
    }
  }
}

function openUserModal(user = {}) {
  setUserForm(user);
  document.querySelector('#user-dialog')?.showModal();
}

function confirmAdminAction({ title, message, detail, confirmLabel = 'Excluir' }) {
  const dialog = document.querySelector('#confirm-dialog');
  if (!dialog) return Promise.resolve(false);

  const titleTarget = dialog.querySelector('[data-confirm-title]');
  const messageTarget = dialog.querySelector('[data-confirm-message]');
  const detailTarget = dialog.querySelector('[data-confirm-detail]');
  const action = dialog.querySelector('[data-confirm-action]');
  const cancelTriggers = dialog.querySelectorAll('[data-confirm-cancel]');

  if (titleTarget) titleTarget.textContent = title;
  if (messageTarget) messageTarget.textContent = message;
  if (detailTarget) {
    detailTarget.textContent = detail || '';
    detailTarget.hidden = !detail;
  }
  if (action) action.textContent = confirmLabel;

  return new Promise((resolve) => {
    let settled = false;

    const cleanup = () => {
      action?.removeEventListener('click', onConfirm);
      cancelTriggers.forEach((trigger) => trigger.removeEventListener('click', onCancel));
      dialog.removeEventListener('cancel', onCancel);
      dialog.removeEventListener('close', onClose);
    };

    const finish = (value) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
      if (dialog.open) dialog.close();
    };

    const onConfirm = () => finish(true);
    const onCancel = (event) => {
      event?.preventDefault();
      finish(false);
    };
    const onClose = () => finish(false);

    action?.addEventListener('click', onConfirm);
    cancelTriggers.forEach((trigger) => trigger.addEventListener('click', onCancel));
    dialog.addEventListener('cancel', onCancel);
    dialog.addEventListener('close', onClose);
    dialog.showModal();
  });
}

function setupTabs() {
  document.querySelectorAll('[data-admin-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-admin-tab]').forEach((tab) => tab.classList.remove('active'));
      document.querySelectorAll('[data-admin-panel]').forEach((panel) => panel.classList.remove('active'));
      button.classList.add('active');
      document.querySelector(`[data-admin-panel="${button.dataset.adminTab}"]`)?.classList.add('active');
    });
  });
}

function setupAdminActions() {
  document.addEventListener('click', async (event) => {
    const logout = event.target.closest('[data-admin-logout]');
    const newUserBtn = event.target.closest('[data-new-user]');
    const editUser = event.target.closest('[data-edit-user]');
    const deleteUser = event.target.closest('[data-delete-user]');

    if (logout) {
      window.PetWebApi.clearSession();
      window.location.href = '/index.html';
    }

    if (newUserBtn) openUserModal();

    if (editUser) {
      const user = adminState.users.find((item) => Number(item.id) === Number(editUser.dataset.editUser));
      openUserModal(user);
    }

    if (deleteUser) {
      const user = adminState.users.find((item) => Number(item.id) === Number(deleteUser.dataset.deleteUser));
      const ok = await confirmAdminAction({
        title: 'Excluir cliente',
        message: `Excluir "${user?.nome || 'este cliente'}"?`,
        confirmLabel: 'Excluir cliente'
      });
      if (!ok) return;

      try {
        await window.PetWebApi.apiFetch(`/api/admin/usuarios/${deleteUser.dataset.deleteUser}`, { method: 'DELETE' });
        window.showToast('Cliente excluído.', 'success');
        await loadUsers();
      } catch (error) {
        window.showToast(error.message, 'error');
      }
    }
  });
}

function setupUserForm() {
  const form = document.querySelector('[data-user-form]');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const id = formData.get('id');
    const payload = {
      nome: formData.get('nome'),
      email: formData.get('email'),
      telefone: formData.get('telefone'),
      tipo_perfil: formData.get('tipo_perfil')
    };

    if (!id && formData.get('senha')) {
      payload.senha = formData.get('senha');
    }

    try {
      const url = id ? `/api/admin/usuarios/${id}` : '/api/admin/usuarios';
      const method = id ? 'PUT' : 'POST';
      const data = await window.PetWebApi.apiFetch(url, {
        method,
        body: JSON.stringify(payload)
      });
      form.closest('dialog')?.close();
      setUserForm();
      if (id && Number(id) === Number(adminState.currentUser?.id) && data.usuario) {
        window.PetWebApi.setSession(window.PetWebApi.getToken(), data.usuario);
        adminState.currentUser = data.usuario;
        const name = document.querySelector('[data-admin-name]');
        if (name) name.textContent = data.usuario.nome;
      }
      window.showToast(id ? 'Cliente atualizado.' : 'Usuário criado.', 'success');
      await loadUsers();
    } catch (error) {
      window.showToast(error.message, 'error');
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAdmin()) return;
  setupTabs();
  setupAdminActions();
  setupUserForm();

  renderMockPets();
  renderMockPetTypes();
  renderMockServices();

  try {
    await loadUsers();
  } catch (error) {
    window.showToast(error.message, 'error');
  }
});
