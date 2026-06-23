const adminState = {
  currentUser: null,
  appointments: [],
  users: [],
  pets: [],
  petTypes: [],
  services: [],
  schedules: [],
  exceptions: [],
  intervals: [],
  quickFilter: 'Todos',
  configuracoes: { capacidade_simultanea: '1' }
};

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function dateTime(value) {
  return new Date(value).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function statusClass(status) {
  return {
    Pendente: 'badge--pending',
    Confirmado: 'badge--confirmed',
    'Em Andamento': 'badge--ongoing',
    Concluído: 'badge--done',
    Cancelado: 'badge--cancelled'
  }[status] || 'badge--pending';
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

function renderStats() {
  const target = document.querySelector('[data-admin-stats]');
  const badgeTarget = document.querySelector('[data-pending-badge]');
  const countSpan = document.querySelector('[data-qf-count]');
  const pendingCount = adminState.appointments.filter((item) => item.status === 'Pendente').length;
  
  if (badgeTarget) {
    badgeTarget.textContent = pendingCount;
    badgeTarget.style.display = pendingCount > 0 ? 'inline-flex' : 'none';
  }
  if (countSpan) countSpan.textContent = pendingCount;

  if (!target) return;

  const count = (status) => adminState.appointments.filter((item) => item.status === status).length;
  target.innerHTML = `
    <article class="admin-stat-card content-panel"><strong>${adminState.appointments.length}</strong><p>Total</p></article>
    <article class="admin-stat-card content-panel"><strong>${count('Pendente')}</strong><p>Pendentes</p></article>
    <article class="admin-stat-card content-panel"><strong>${count('Confirmado')}</strong><p>Confirmados</p></article>
    <article class="admin-stat-card content-panel"><strong>${count('Concluído')}</strong><p>Concluídos</p></article>
  `;
}

function renderAppointments() {
  const target = document.querySelector('[data-admin-appointments]');
  if (!target) return;

  let list = adminState.appointments;
  if (adminState.quickFilter !== 'Todos') {
    list = list.filter(a => a.status === adminState.quickFilter);
  }

  if (!list.length) {
    target.innerHTML = '<tr><td colspan="6">Nenhum agendamento encontrado.</td></tr>';
    renderStats();
    return;
  }

  target.innerHTML = list.map((row) => {
    let actions = '';
    if (row.status === 'Pendente') {
      actions += `<button class="btn btn-sm btn-cta" type="button" data-status-action="${row.id}" data-status-val="Confirmado">✓ Confirmar</button>`;
      actions += `<button class="btn btn-sm btn-outline" type="button" data-status-action="${row.id}" data-status-val="Cancelado">Cancelar</button>`;
      actions += `<button class="btn btn-sm btn-outline" type="button" data-edit-appt="${row.id}">Editar</button>`;
      actions += `<button class="btn btn-sm btn-danger" type="button" data-delete-appt="${row.id}">Excluir</button>`;
    } else if (row.status === 'Confirmado') {
      actions += `<button class="btn btn-sm btn-outline" type="button" data-status-action="${row.id}" data-status-val="Pendente">← Voltar</button>`;
      actions += `<button class="btn btn-sm btn-cta" type="button" data-status-action="${row.id}" data-status-val="Em Andamento">Iniciar</button>`;
      actions += `<button class="btn btn-sm btn-outline" type="button" data-edit-appt="${row.id}">Editar</button>`;
      actions += `<button class="btn btn-sm btn-danger" type="button" data-delete-appt="${row.id}">Excluir</button>`;
    } else if (row.status === 'Em Andamento') {
      actions += `<button class="btn btn-sm btn-outline" type="button" data-status-action="${row.id}" data-status-val="Confirmado">← Voltar</button>`;
      actions += `<button class="btn btn-sm btn-cta" type="button" data-status-action="${row.id}" data-status-val="Concluído">Concluir</button>`;
      actions += `<button class="btn btn-sm btn-danger" type="button" data-delete-appt="${row.id}">Excluir</button>`;
    } else if (row.status === 'Concluído') {
      actions += `<button class="btn btn-sm btn-outline" type="button" data-status-action="${row.id}" data-status-val="Em Andamento">← Voltar</button>`;
      actions += `<button class="btn btn-sm btn-danger" type="button" data-delete-appt="${row.id}">Excluir</button>`;
    } else if (row.status === 'Cancelado') {
      actions += `<button class="btn btn-sm btn-outline" type="button" data-status-action="${row.id}" data-status-val="Pendente">Restaurar</button>`;
      actions += `<button class="btn btn-sm btn-danger" type="button" data-delete-appt="${row.id}">Excluir</button>`;
    } else {
      actions += `<button class="btn btn-sm btn-danger" type="button" data-delete-appt="${row.id}">Excluir</button>`;
    }

    return `
    <tr>
      <td data-label="Cliente">
        ${escapeHtml(row.cliente)}<br>
        <small style="color:var(--clr-neutral-500)">${escapeHtml(row.cliente_telefone || '-')}</small>
      </td>
      <td data-label="Pet">${escapeHtml(row.pet)}</td>
      <td data-label="Serviço">
        ${escapeHtml(row.servico)}<br>
        <small style="color:var(--clr-neutral-500)">${money(row.preco)} • ${row.tempo_estimado} min</small>
      </td>
      <td data-label="Data/Hora">${dateTime(row.data_hora)}</td>
      <td data-label="Status"><span class="badge ${statusClass(row.status)}">${row.status}</span></td>
      <td data-label="Ação">
        <div class="table-actions">
          ${actions}
        </div>
      </td>
    </tr>
  `}).join('');
  renderStats();
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

function renderPets() {
  const target = document.querySelector('[data-admin-pets]');
  if (!target) return;

  target.innerHTML = adminState.pets.length ? adminState.pets.map((pet) => `
    <tr>
      <td data-label="Pet">${escapeHtml(pet.nome)}</td>
      <td data-label="Tutor">${escapeHtml(pet.tutor)}<br><small>${escapeHtml(pet.tutor_email)}</small></td>
      <td data-label="Espécie">${escapeHtml(pet.especie)}</td>
      <td data-label="Raça">${escapeHtml(pet.raca || '-')}</td>
      <td data-label="Porte">${escapeHtml(pet.porte || '-')}</td>
      <td data-label="Ações">
        <div class="table-actions">
          <button class="btn btn-outline btn-sm" type="button" data-edit-admin-pet="${pet.id}">Editar</button>
          <button class="btn btn-ghost btn-sm" type="button" data-delete-admin-pet="${pet.id}">Excluir</button>
        </div>
      </td>
    </tr>
  `).join('') : '<tr><td colspan="6">Nenhum pet cadastrado.</td></tr>';
}

function renderAdminPetTypeOptions(selected = '') {
  document.querySelectorAll('[data-admin-pet-type-options]').forEach((select) => {
    select.innerHTML = adminState.petTypes.map((type) => `
      <option value="${escapeHtml(type.nome)}" ${type.nome === selected ? 'selected' : ''}>${escapeHtml(type.nome)}</option>
    `).join('');
  });
}

function renderPetTypes() {
  const target = document.querySelector('[data-admin-pet-types]');
  if (!target) return;

  target.innerHTML = adminState.petTypes.map((type) => `
    <tr>
      <td data-label="Nome">${type.nome}</td>
      <td data-label="Ativo">${Number(type.ativo) ? 'Sim' : 'Não'}</td>
      <td data-label="Ação">
        <div class="table-actions">
          <button class="btn btn-outline btn-sm" type="button" data-edit-pet-type="${type.id}">Editar</button>
          <button class="btn btn-ghost btn-sm" type="button" data-delete-pet-type="${type.id}">Excluir</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderServices() {
  const target = document.querySelector('[data-admin-services]');
  if (!target) return;

  target.innerHTML = adminState.services.map((service) => `
    <tr>
      <td data-label="Ícone" style="display:flex; gap:4px; align-items:center;">
        ${window.getServiceSvg ? window.getServiceSvg(service.icone).join('') : service.icone}
      </td>
      <td data-label="Nome">${service.nome}</td>
      <td data-label="Preço">${money(service.preco)}</td>
      <td data-label="Duração">${service.tempo_estimado} min</td>
      <td data-label="Intervalo">${service.tempo_buffer ?? 15} min</td>
      <td data-label="Ativo">${Number(service.ativo) ? 'Sim' : 'Não'}</td>
      <td data-label="Ação">
        <div class="table-actions">
          <button class="btn btn-outline btn-sm" type="button" data-edit-service="${service.id}">Editar</button>
          <button class="btn btn-ghost btn-sm" type="button" data-delete-service="${service.id}">Excluir</button>
        </div>
      </td>
    </tr>
  `).join('');
}

function renderSchedules() {
  const target = document.querySelector('[data-admin-schedules]');
  if (!target) return;

  target.innerHTML = adminState.schedules.map((item) => {
    const isOpen = !Number(item.bloqueado);
    const stateClass = isOpen ? 'schedule-card--open' : 'schedule-card--closed';
    const intervalsForDay = adminState.intervals.filter(inv => Number(inv.dia_semana) === Number(item.dia_semana));
    const pauseSvg = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>';
    const intervalBadge = intervalsForDay.length
      ? `<span class="schedule-card__interval-count">${pauseSvg} ${intervalsForDay.length} pausa${intervalsForDay.length > 1 ? 's' : ''}</span>`
      : '';

    let summaryText = 'Dia fechado';
    if (isOpen && item.abre && item.fecha) {
      summaryText = `<strong>${item.abre}</strong> → <strong>${item.fecha}</strong>`;
      if (item.ultimo_inicio) summaryText += ` · último às <strong>${item.ultimo_inicio}</strong>`;
    }

    return `
    <fieldset class="schedule-card ${stateClass}" data-schedule-day="${item.dia_semana}">
      <legend>${item.nome_dia}</legend>
      <div class="schedule-card__header">
        <span class="schedule-card__day-name">${item.nome_dia}</span>
        <label class="schedule-toggle">
          <span class="schedule-toggle__label">${isOpen ? 'Aberto' : 'Fechado'}</span>
          <input type="checkbox" name="aberto" ${isOpen ? 'checked' : ''} data-schedule-toggle>
          <span class="schedule-toggle__track"></span>
        </label>
      </div>
      <div class="schedule-card__summary">
        <span class="schedule-card__summary-icon">${isOpen ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>' : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>'}</span>
        <span class="schedule-card__summary-text">${summaryText}</span>
        ${intervalBadge}
      </div>
      <div class="schedule-card__body">
        <label class="field" style="margin:0"><span class="field__label">Abre</span><input class="field__input" type="time" name="abre" value="${item.abre || ''}"></label>
        <label class="field" style="margin:0"><span class="field__label">Fecha</span><input class="field__input" type="time" name="fecha" value="${item.fecha || ''}"></label>
        <label class="field" style="margin:0"><span class="field__label">Último início</span><input class="field__input" type="time" name="ultimo_inicio" value="${item.ultimo_inicio || ''}"></label>
      </div>
    </fieldset>
  `}).join('');

  // Attach toggle listeners
  target.querySelectorAll('[data-schedule-toggle]').forEach(toggle => {
    toggle.addEventListener('change', () => {
      const card = toggle.closest('.schedule-card');
      const label = card.querySelector('.schedule-toggle__label');
      const summaryIcon = card.querySelector('.schedule-card__summary-icon');
      const summaryText = card.querySelector('.schedule-card__summary-text');
      
      if (toggle.checked) {
        card.classList.remove('schedule-card--closed');
        card.classList.add('schedule-card--open');
        label.textContent = 'Aberto';
        summaryIcon.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>';
        const abre = card.querySelector('[name="abre"]').value;
        const fecha = card.querySelector('[name="fecha"]').value;
        const ultimo = card.querySelector('[name="ultimo_inicio"]').value;
        if (abre && fecha) {
          summaryText.innerHTML = `<strong>${abre}</strong> → <strong>${fecha}</strong>${ultimo ? ` · último às <strong>${ultimo}</strong>` : ''}`;
        } else {
          summaryText.innerHTML = 'Configure os horários abaixo';
        }
      } else {
        card.classList.remove('schedule-card--open');
        card.classList.add('schedule-card--closed');
        label.textContent = 'Fechado';
        summaryIcon.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>';
        summaryText.innerHTML = 'Dia fechado';
      }
    });
  });
}

function renderExceptions() {
  const target = document.querySelector('[data-admin-exceptions]');
  if (!target) return;

  if (!adminState.exceptions.length) {
    target.innerHTML = '<tr><td colspan="6">Nenhuma exceção cadastrada.</td></tr>';
    return;
  }

  target.innerHTML = adminState.exceptions.map((item) => `
    <tr>
      <td data-label="Data">${new Date(`${item.data}T12:00:00`).toLocaleDateString('pt-BR')}</td>
      <td data-label="Título">${item.titulo}</td>
      <td data-label="Tipo">${item.tipo === 'fechado' ? 'Fechado' : 'Horário especial'}</td>
      <td data-label="Horário">${item.tipo === 'fechado' ? '-' : `${item.abre} às ${item.fecha} • último ${item.ultimo_inicio}`}</td>
      <td data-label="Recorrente">${Number(item.recorrente_anual) ? 'Todo ano' : 'Só esta data'}</td>
      <td data-label="Ação"><button class="btn btn-ghost btn-sm" type="button" data-delete-exception="${item.id}">Remover</button></td>
    </tr>
  `).join('');
}

function renderIntervals() {
  const target = document.querySelector('[data-admin-intervals]');
  if (!target) return;
  
  if (!adminState.intervals.length) {
    target.innerHTML = '<tr><td colspan="5">Nenhum intervalo cadastrado.</td></tr>';
    return;
  }
  
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  target.innerHTML = adminState.intervals.map(inv => `
    <tr>
      <td data-label="Dia">${days[inv.dia_semana] || inv.dia_semana}</td>
      <td data-label="Título">${escapeHtml(inv.titulo)}</td>
      <td data-label="Início">${inv.inicio}</td>
      <td data-label="Fim">${inv.fim}</td>
      <td data-label="Ação"><button class="btn btn-ghost btn-sm" type="button" data-delete-interval="${inv.id}">Remover</button></td>
    </tr>
  `).join('');
}

function renderAll() {
  renderAppointments();
  renderUsers();
  renderPets();
  renderPetTypes();
  renderServices();
  renderSchedules();
  renderExceptions();
  renderIntervals();
}

async function loadAgenda() {
  const params = new URLSearchParams();
  const date = document.querySelector('[data-filter-date]')?.value;
  const search = document.querySelector('[data-filter-search]')?.value;
  if (date) params.set('data', date);
  if (search) params.set('busca', search);
  const data = await window.PetWebApi.apiFetch(`/api/admin/agendamentos${params.toString() ? `?${params}` : ''}`);
  adminState.appointments = data.agendamentos || [];
  renderAppointments();
}

async function loadAdmin() {
  const [users, pets, petTypes, services, schedules, exceptions, intervals, configs] = await Promise.all([
    window.PetWebApi.apiFetch('/api/admin/usuarios'),
    window.PetWebApi.apiFetch('/api/admin/pets'),
    window.PetWebApi.apiFetch('/api/admin/tipos-pet'),
    window.PetWebApi.apiFetch('/api/admin/servicos'),
    window.PetWebApi.apiFetch('/api/admin/horarios'),
    window.PetWebApi.apiFetch('/api/admin/bloqueios'),
    window.PetWebApi.apiFetch('/api/admin/intervalos'),
    window.PetWebApi.apiFetch('/api/admin/configuracoes')
  ]);
  adminState.users = users.usuarios || [];
  adminState.pets = pets.pets || [];
  adminState.petTypes = petTypes.tipos || [];
  adminState.services = services.servicos || [];
  adminState.schedules = schedules.horarios || [];
  adminState.exceptions = exceptions.bloqueios || [];
  adminState.intervals = intervals.intervalos || [];
  adminState.configuracoes = configs.configuracoes || { capacidade_simultanea: '1' };
  await loadAgenda();
  renderAll();
  renderPreviewServices();
  renderConfig();
  if (previewState.serviceId) loadPreview();
}

function renderIconPicker(selectedIconsStr) {
  const container = document.querySelector('[data-icon-picker]');
  const input = document.getElementById('icone_input');
  if (!container || !input) return;

  const icons = ['paw', 'bath', 'scissors', 'stethoscope', 'syringe', 'house', 'dog', 'cat', 'bone', 'heart', 'activity', 'star', 'clock', 'sparkles', 'award'];
  const selected = (selectedIconsStr || 'paw').split(',').map(s => s.trim());
  
  container.innerHTML = icons.map(icon => {
    const isChecked = selected.includes(icon) ? 'checked' : '';
    return `
      <label class="icon-picker-item">
        <input type="checkbox" value="${icon}" ${isChecked}>
        <span class="icon-picker-box" title="${icon}">
          ${window.getServiceSvg ? window.getServiceSvg(icon)[0] : icon}
        </span>
      </label>
    `;
  }).join('');
  
  input.value = selected.join(',');

  const checkboxes = container.querySelectorAll('input[type="checkbox"]');
  checkboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      let checked = Array.from(checkboxes).filter(c => c.checked);
      if (checked.length > 2) {
        cb.checked = false;
        checked = Array.from(checkboxes).filter(c => c.checked);
        window.showToast?.('Selecione no máximo 2 ícones', 'error');
      }
      if (checked.length === 0) {
        cb.checked = true;
        checked = [cb];
      }
      input.value = checked.map(c => c.value).join(',');
    });
  });
}

function setServiceForm(service = {}) {
  const form = document.querySelector('[data-service-form]');
  const title = document.querySelector('[data-service-modal-title]');
  if (!form) return;
  form.id.value = service.id || '';
  form.nome.value = service.nome || '';
  form.preco.value = service.preco || '';
  form.tempo_estimado.value = service.tempo_estimado || '';
  if (form.tempo_buffer) form.tempo_buffer.value = service.tempo_buffer ?? 15;
  renderIconPicker(service.icone || 'paw');
  form.ativo.value = service.ativo === 0 ? '0' : '1';
  form.descricao.value = service.descricao || '';
  if (title) title.textContent = service.id ? 'Editar serviço' : 'Novo serviço';
}

function openServiceModal(service = {}) {
  setServiceForm(service);
  document.querySelector('#service-dialog')?.showModal();
}

function setPetTypeForm(type = {}) {
  const form = document.querySelector('[data-pet-type-form]');
  const title = document.querySelector('[data-pet-type-modal-title]');
  if (!form) return;
  form.id.value = type.id || '';
  form.nome.value = type.nome || '';
  form.ativo.value = type.ativo === 0 ? '0' : '1';
  if (title) title.textContent = type.id ? 'Editar tipo' : 'Novo tipo';
}

function openPetTypeModal(type = {}) {
  setPetTypeForm(type);
  document.querySelector('#pet-type-dialog')?.showModal();
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

function setAdminPetForm(pet = {}) {
  const form = document.querySelector('[data-admin-pet-form]');
  const title = document.querySelector('[data-admin-pet-modal-title]');
  if (!form) return;

  form.id.value = pet.id || '';
  form.nome.value = pet.nome || '';
  form.raca.value = pet.raca || '';
  form.porte.value = pet.porte || 'Pequeno';
  form.observacoes.value = pet.observacoes || '';
  renderAdminPetTypeOptions(pet.especie || adminState.petTypes[0]?.nome || '');
  if (title) title.textContent = pet.id ? 'Editar pet' : 'Novo pet';
}

function openAdminPetModal(pet = {}) {
  setAdminPetForm(pet);
  document.querySelector('#admin-pet-dialog')?.showModal();
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
      window.closeMobileNav?.();
    });
  });
}

function setupAdminActions() {
  document.addEventListener('change', async (event) => {
    const statusSelect = event.target.closest('[data-status-select]');
    const profileSelect = event.target.closest('[data-profile-select]');

    try {
      if (statusSelect) {
        await window.PetWebApi.apiFetch(`/api/admin/agendamentos/${statusSelect.dataset.statusSelect}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: statusSelect.value })
        });
        window.showToast('Status atualizado.', 'success');
        await loadAgenda();
      }

      if (profileSelect) {
        await window.PetWebApi.apiFetch(`/api/admin/usuarios/${profileSelect.dataset.profileSelect}`, {
          method: 'PATCH',
          body: JSON.stringify({ tipo_perfil: profileSelect.value })
        });
        window.showToast('Perfil atualizado.', 'success');
        await loadAdmin();
      }
    } catch (error) {
      window.showToast(error.message, 'error');
    }
  });

  document.addEventListener('click', async (event) => {
    const logout = event.target.closest('[data-admin-logout]');
    const newService = event.target.closest('[data-new-service]');
    const editService = event.target.closest('[data-edit-service]');
    const deleteService = event.target.closest('[data-delete-service]');
    const newUserBtn = event.target.closest('[data-new-user]');
    const editUser = event.target.closest('[data-edit-user]');
    const deleteUser = event.target.closest('[data-delete-user]');
    const editAdminPet = event.target.closest('[data-edit-admin-pet]');
    const deleteAdminPet = event.target.closest('[data-delete-admin-pet]');
    const newPetType = event.target.closest('[data-new-pet-type]');
    const editPetType = event.target.closest('[data-edit-pet-type]');
    const deletePetType = event.target.closest('[data-delete-pet-type]');
    const deleteException = event.target.closest('[data-delete-exception]');

    const statusAction = event.target.closest('[data-status-action]');
    const deleteAppt = event.target.closest('[data-delete-appt]');
    const editAppt = event.target.closest('[data-edit-appt]');
    const deleteInterval = event.target.closest('[data-delete-interval]');

    if (logout) {
      window.PetWebApi.clearSession();
      window.location.href = '/index.html';
    }

    if (statusAction) {
      try {
        await window.PetWebApi.apiFetch(`/api/admin/agendamentos/${statusAction.dataset.statusAction}/status`, {
          method: 'PATCH',
          body: JSON.stringify({ status: statusAction.dataset.statusVal })
        });
        window.showToast('Status atualizado.', 'success');
        await loadAgenda();
      } catch (error) {
        window.showToast(error.message, 'error');
      }
    }

    if (deleteAppt) {
      const ok = await confirmAdminAction({
        title: 'Excluir agendamento',
        message: 'Deseja excluir este agendamento permanentemente?',
        confirmLabel: 'Excluir agendamento'
      });
      if (!ok) return;

      try {
        await window.PetWebApi.apiFetch(`/api/admin/agendamentos/${deleteAppt.dataset.deleteAppt}`, { method: 'DELETE' });
        window.showToast('Agendamento excluído.', 'success');
        await loadAdmin();
      } catch (error) {
        window.showToast(error.message, 'error');
      }
    }

    if (deleteInterval) {
      const ok = await confirmAdminAction({
        title: 'Remover intervalo',
        message: 'Remover este intervalo de almoço/pausa?',
        confirmLabel: 'Remover intervalo'
      });
      if (!ok) return;
      try {
        await window.PetWebApi.apiFetch(`/api/admin/intervalos/${deleteInterval.dataset.deleteInterval}`, { method: 'DELETE' });
        window.showToast('Intervalo removido.', 'success');
        await loadAdmin();
      } catch (error) {
        window.showToast(error.message, 'error');
      }
    }

    if (editAppt) {
      const appt = adminState.appointments.find(a => a.id == editAppt.dataset.editAppt);
      if (appt) openAdminEditApptModal(appt);
    }

    if (newService) openServiceModal();
    if (newPetType) openPetTypeModal();
    if (newUserBtn) openUserModal();

    if (editUser) {
      const user = adminState.users.find((item) => Number(item.id) === Number(editUser.dataset.editUser));
      openUserModal(user);
    }

    if (editAdminPet) {
      const pet = adminState.pets.find((item) => Number(item.id) === Number(editAdminPet.dataset.editAdminPet));
      openAdminPetModal(pet);
    }

    if (editService) {
      const service = adminState.services.find((item) => Number(item.id) === Number(editService.dataset.editService));
      openServiceModal(service);
    }

    if (editPetType) {
      const type = adminState.petTypes.find((item) => Number(item.id) === Number(editPetType.dataset.editPetType));
      openPetTypeModal(type);
    }

    if (deleteService) {
      const service = adminState.services.find((item) => Number(item.id) === Number(deleteService.dataset.deleteService));
      const ok = await confirmAdminAction({
        title: 'Excluir serviço',
        message: `Excluir "${service?.nome || 'este serviço'}"?`,
        detail: 'Se houver histórico, ele será desativado para preservar agendamentos antigos.',
        confirmLabel: 'Excluir serviço'
      });
      if (!ok) return;

      try {
        await window.PetWebApi.apiFetch(`/api/admin/servicos/${deleteService.dataset.deleteService}`, { method: 'DELETE' });
        window.showToast('Serviço removido do catálogo.', 'success');
        await loadAdmin();
      } catch (error) {
        window.showToast(error.message, 'error');
      }
    }

    if (deletePetType) {
      const type = adminState.petTypes.find((item) => Number(item.id) === Number(deletePetType.dataset.deletePetType));
      const ok = await confirmAdminAction({
        title: 'Excluir tipo de pet',
        message: `Excluir "${type?.nome || 'este tipo'}"?`,
        detail: 'Se houver pets cadastrados com esse tipo, ele será desativado.',
        confirmLabel: 'Excluir tipo'
      });
      if (!ok) return;

      try {
        await window.PetWebApi.apiFetch(`/api/admin/tipos-pet/${deletePetType.dataset.deletePetType}`, { method: 'DELETE' });
        window.showToast('Tipo de pet removido.', 'success');
        await loadAdmin();
      } catch (error) {
        window.showToast(error.message, 'error');
      }
    }

    if (deleteUser) {
      const user = adminState.users.find((item) => Number(item.id) === Number(deleteUser.dataset.deleteUser));
      const ok = await confirmAdminAction({
        title: 'Excluir cliente',
        message: `Excluir "${user?.nome || 'este cliente'}"?`,
        detail: 'Os pets e agendamentos vinculados também serão removidos.',
        confirmLabel: 'Excluir cliente'
      });
      if (!ok) return;

      try {
        await window.PetWebApi.apiFetch(`/api/admin/usuarios/${deleteUser.dataset.deleteUser}`, { method: 'DELETE' });
        window.showToast('Cliente excluído.', 'success');
        await loadAdmin();
      } catch (error) {
        window.showToast(error.message, 'error');
      }
    }

    if (deleteAdminPet) {
      const pet = adminState.pets.find((item) => Number(item.id) === Number(deleteAdminPet.dataset.deleteAdminPet));
      const ok = await confirmAdminAction({
        title: 'Excluir pet',
        message: `Excluir "${pet?.nome || 'este pet'}"?`,
        detail: 'Agendamentos vinculados a ele também serão removidos.',
        confirmLabel: 'Excluir pet'
      });
      if (!ok) return;

      try {
        await window.PetWebApi.apiFetch(`/api/admin/pets/${deleteAdminPet.dataset.deleteAdminPet}`, { method: 'DELETE' });
        window.showToast('Pet excluído.', 'success');
        await loadAdmin();
      } catch (error) {
        window.showToast(error.message, 'error');
      }
    }

    if (deleteException) {
      const ok = await confirmAdminAction({
        title: 'Remover exceção',
        message: 'Remover esta exceção de funcionamento?',
        detail: 'A agenda voltará a seguir o horário padrão desse dia.',
        confirmLabel: 'Remover exceção'
      });
      if (!ok) return;

      try {
        await window.PetWebApi.apiFetch(`/api/admin/bloqueios/${deleteException.dataset.deleteException}`, { method: 'DELETE' });
        window.showToast('Exceção removida.', 'success');
        await loadAdmin();
      } catch (error) {
        window.showToast(error.message, 'error');
      }
    }
  });

  document.querySelectorAll('[data-filter-date], [data-filter-search]').forEach((field) => {
    field.addEventListener('input', () => loadAgenda().catch((error) => window.showToast(error.message, 'error')));
  });
}

async function openAdminEditApptModal(appt) {
  const dialog = document.querySelector('#admin-edit-appt-dialog');
  const form = document.querySelector('[data-admin-edit-appt-form]');
  if (!dialog || !form) return;

  form.id.value = appt.id;
  document.querySelector('[data-edit-appt-client]').textContent = `Cliente: ${appt.cliente}`;
  document.querySelector('[data-edit-appt-pet]').textContent = `Pet: ${appt.pet}`;
  
  const servSelect = form.querySelector('[data-edit-appt-service]');
  servSelect.innerHTML = adminState.services.map(s => 
    `<option value="${s.id}" ${s.nome === appt.servico ? 'selected' : ''}>${s.nome} (${money(s.preco)} - ${s.tempo_estimado} min)</option>`
  ).join('');

  form.data.value = appt.data_hora.split('T')[0];
  form.status.value = appt.status;

  await updateAdminEditApptTimes(appt.id);
  form.hora.value = appt.data_hora.split('T')[1].substring(0, 5);

  dialog.showModal();
}

async function updateAdminEditApptTimes(ignoreId) {
  const form = document.querySelector('[data-admin-edit-appt-form]');
  const data = form.data.value;
  const servId = form.id_servico.value;
  const horaSelect = form.querySelector('[data-edit-appt-time]');
  
  if (!data || !servId) return;

  try {
    const res = await window.PetWebApi.apiFetch(`/api/disponibilidade?servico_id=${servId}&inicio=${data}&dias=1&ignore_id=${ignoreId || form.id.value}`);
    const day = res.disponibilidade[0];
    
    if (day.status === 'fechado') {
      horaSelect.innerHTML = '<option value="">Dia sem atendimento</option>';
      return;
    }
    
    horaSelect.innerHTML = day.slots.map(s => 
      `<option value="${s.hora}" ${s.disponivel ? '' : 'disabled'}>${s.hora} ${s.disponivel ? '' : `(${s.motivo})`}</option>`
    ).join('');
  } catch (error) {
    console.error(error);
  }
}

function setupAdminEditApptForm() {
  const form = document.querySelector('[data-admin-edit-appt-form]');
  if (!form) return;

  form.data.addEventListener('change', () => updateAdminEditApptTimes(form.id.value));
  form.id_servico.addEventListener('change', () => updateAdminEditApptTimes(form.id.value));

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      const payload = {
        id_servico: Number(form.id_servico.value),
        data_hora: `${form.data.value}T${form.hora.value}:00`,
        status: form.status.value
      };
      await window.PetWebApi.apiFetch(`/api/admin/agendamentos/${form.id.value}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      form.closest('dialog').close();
      window.showToast('Agendamento atualizado.', 'success');
      await loadAdmin();
    } catch (err) {
      window.showToast(err.message, 'error');
    }
  });
}

function setupQuickFilters() {
  document.querySelectorAll('.quick-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.quick-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      adminState.quickFilter = btn.dataset.qf;
      renderAppointments();
    });
  });
}

function setupCopySchedule() {
  const copyBtn = document.querySelector('[data-copy-btn]');
  if (!copyBtn) return;
  
  copyBtn.addEventListener('click', () => {
    const sourceVal = document.querySelector('[data-copy-source]').value;
    const targets = Array.from(document.querySelectorAll('[data-copy-target]:checked')).map(cb => cb.value);
    
    if (!targets.length) {
      window.showToast('Selecione pelo menos um dia destino para copiar.', 'error');
      return;
    }
    
    const sourceCard = document.querySelector(`[data-schedule-day="${sourceVal}"]`);
    if (!sourceCard) return;
    
    const isOpen = sourceCard.querySelector('[name="aberto"]').checked;
    const abre = sourceCard.querySelector('[name="abre"]').value;
    const fecha = sourceCard.querySelector('[name="fecha"]').value;
    const ultimo = sourceCard.querySelector('[name="ultimo_inicio"]').value;
    
    targets.forEach(t => {
      const targetCard = document.querySelector(`[data-schedule-day="${t}"]`);
      if (targetCard) {
        const toggle = targetCard.querySelector('[name="aberto"]');
        toggle.checked = isOpen;
        toggle.dispatchEvent(new Event('change'));
        targetCard.querySelector('[name="abre"]').value = abre;
        targetCard.querySelector('[name="fecha"]').value = fecha;
        targetCard.querySelector('[name="ultimo_inicio"]').value = ultimo;
      }
    });
    
    window.showToast('Horários copiados. Lembre-se de salvar.', 'info');
  });
}

function setupIntervalForm() {
  const form = document.querySelector('[data-interval-form]');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(form);
    const dias = formData.getAll('dias');
    
    if (!dias.length) {
      window.showToast('Selecione pelo menos um dia da semana.', 'error');
      return;
    }

    const payload = {
      titulo: formData.get('titulo'),
      inicio: formData.get('inicio'),
      fim: formData.get('fim'),
      dias: dias.map(Number)
    };

    try {
      await window.PetWebApi.apiFetch('/api/admin/intervalos', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      form.reset();
      window.showToast('Intervalo adicionado.', 'success');
      await loadAdmin();
    } catch (err) {
      window.showToast(err.message, 'error');
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
      await loadAdmin();
    } catch (error) {
      window.showToast(error.message, 'error');
    }
  });
}

function setupAdminPetForm() {
  const form = document.querySelector('[data-admin-pet-form]');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const id = formData.get('id');
    const payload = Object.fromEntries(formData.entries());
    delete payload.id;

    try {
      await window.PetWebApi.apiFetch(`/api/admin/pets/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      form.closest('dialog')?.close();
      setAdminPetForm();
      window.showToast('Pet atualizado.', 'success');
      await loadAdmin();
    } catch (error) {
      window.showToast(error.message, 'error');
    }
  });
}

function setupPetTypeForm() {
  const form = document.querySelector('[data-pet-type-form]');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const id = formData.get('id');
    const payload = {
      nome: formData.get('nome'),
      ativo: formData.get('ativo') === '1'
    };

    try {
      await window.PetWebApi.apiFetch(id ? `/api/admin/tipos-pet/${id}` : '/api/admin/tipos-pet', {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });
      form.closest('dialog')?.close();
      setPetTypeForm();
      window.showToast('Tipo de pet salvo.', 'success');
      await loadAdmin();
    } catch (error) {
      window.showToast(error.message, 'error');
    }
  });
}

function setupExceptionForm() {
  const form = document.querySelector('[data-exception-form]');
  const type = document.querySelector('[data-exception-type]');
  if (!form || !type) return;

  const updateVisibility = () => {
    const isSpecial = type.value === 'horario_especial';
    document.querySelectorAll('[data-exception-time]').forEach((field) => {
      field.hidden = !isSpecial;
      field.querySelector('input').required = isSpecial;
    });
  };

  type.addEventListener('change', updateVisibility);
  updateVisibility();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const payload = {
      data: formData.get('data'),
      titulo: formData.get('titulo'),
      tipo: formData.get('tipo'),
      recorrente_anual: formData.get('recorrente_anual') === '1',
      abre: formData.get('abre'),
      fecha: formData.get('fecha'),
      ultimo_inicio: formData.get('ultimo_inicio')
    };

    try {
      await window.PetWebApi.apiFetch('/api/admin/bloqueios', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      form.reset();
      updateVisibility();
      window.showToast('Exceção adicionada.', 'success');
      await loadAdmin();
    } catch (error) {
      window.showToast(error.message, 'error');
    }
  });
}

function setupServiceForm() {
  const form = document.querySelector('[data-service-form]');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const id = formData.get('id');
    const payload = {
      nome: formData.get('nome'),
      descricao: formData.get('descricao'),
      preco: Number(formData.get('preco')),
      tempo_estimado: Number(formData.get('tempo_estimado')),
      tempo_buffer: Number(formData.get('tempo_buffer')),
      icone: formData.get('icone'),
      ativo: formData.get('ativo') === '1'
    };

    try {
      await window.PetWebApi.apiFetch(id ? `/api/admin/servicos/${id}` : '/api/admin/servicos', {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });
      setServiceForm();
      form.closest('dialog')?.close();
      window.showToast('Serviço salvo.', 'success');
      await loadAdmin();
    } catch (error) {
      window.showToast(error.message, 'error');
    }
  });
}

function setupScheduleForm() {
  const form = document.querySelector('[data-schedule-form]');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const horarios = [...document.querySelectorAll('[data-schedule-day]')].map((card) => ({
      dia_semana: Number(card.dataset.scheduleDay),
      bloqueado: !card.querySelector('[name="aberto"]').checked,
      abre: card.querySelector('[name="abre"]').value,
      fecha: card.querySelector('[name="fecha"]').value,
      ultimo_inicio: card.querySelector('[name="ultimo_inicio"]').value
    }));

    try {
      const data = await window.PetWebApi.apiFetch('/api/admin/horarios', {
        method: 'PUT',
        body: JSON.stringify({ horarios })
      });
      adminState.schedules = data.horarios || [];
      renderSchedules();
      window.showToast('Horários salvos.', 'success');
      loadPreview();
    } catch (error) {
      window.showToast(error.message, 'error');
    }
  });
}

function renderConfig() {
  const input = document.getElementById('cfg-capacidade');
  if (input) input.value = adminState.configuracoes.capacidade_simultanea ?? '1';
}

function setupConfigForm() {
  const form = document.querySelector('[data-config-form]');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const capacidade = parseInt(form.capacidade_simultanea.value, 10);
    const savedIndicator = form.querySelector('[data-config-saved]');

    try {
      const data = await window.PetWebApi.apiFetch('/api/admin/configuracoes', {
        method: 'PUT',
        body: JSON.stringify({ capacidade_simultanea: capacidade })
      });
      adminState.configuracoes = data.configuracoes || adminState.configuracoes;
      window.showToast(`Capacidade atualizada para ${capacidade} profissional${capacidade !== 1 ? 'is' : ''}.`, 'success');
      if (savedIndicator) {
        savedIndicator.hidden = false;
        setTimeout(() => { savedIndicator.hidden = true; }, 3000);
      }
    } catch (err) {
      window.showToast(err.message, 'error');
    }
  });
}

/* ============ Preview de Disponibilidade ============ */

const previewState = {
  serviceId: null,
  startDate: '',
  availability: [],
  selectedDate: ''
};

function renderPreviewServices() {
  const target = document.querySelector('[data-preview-service-cards]');
  if (!target) return;

  const activeServices = adminState.services.filter(s => Number(s.ativo));
  target.innerHTML = activeServices.map(s => `
    <button class="wizard-select-card ${Number(previewState.serviceId) === Number(s.id) ? 'is-selected' : ''}" type="button" data-preview-service-id="${s.id}">
      <strong>${escapeHtml(s.nome)}</strong>
      <span>${money(s.preco)} \u2022 ${s.tempo_estimado} min</span>
      <small>${escapeHtml(s.descricao || '')}</small>
    </button>
  `).join('');
}

async function loadPreview() {
  if (!previewState.serviceId) {
    previewState.availability = [];
    renderPreview();
    return;
  }

  const start = previewState.startDate || new Date().toISOString().split('T')[0];
  try {
    const data = await window.PetWebApi.apiFetch(`/api/disponibilidade?servico_id=${previewState.serviceId}&inicio=${start}&dias=7`);
    previewState.availability = data.disponibilidade || [];
  } catch (err) {
    previewState.availability = [];
    console.error('Preview load error:', err);
  }
  renderPreview();
}

function renderPreview() {
  const summary = document.querySelector('[data-preview-summary]');
  const daysTarget = document.querySelector('[data-preview-days]');
  const slotsTarget = document.querySelector('[data-preview-slots]');
  if (!daysTarget || !slotsTarget) return;

  if (!previewState.serviceId) {
    if (summary) summary.textContent = 'Selecione um serviço para visualizar a disponibilidade.';
    daysTarget.innerHTML = '';
    slotsTarget.innerHTML = '';
    return;
  }

  if (!previewState.availability.length) {
    if (summary) summary.textContent = 'Nenhuma disponibilidade carregada.';
    daysTarget.innerHTML = '<p class="empty-state">Nenhum dado de disponibilidade.</p>';
    slotsTarget.innerHTML = '';
    return;
  }

  const availableDays = previewState.availability.filter(d => d.status === 'disponivel').length;
  if (summary) summary.textContent = `${availableDays} dia${availableDays !== 1 ? 's' : ''} com horários livres nos próximos ${previewState.availability.length} dias.`;

  daysTarget.innerHTML = previewState.availability.map(day => `
    <button class="availability-day availability-day--${day.status} ${previewState.selectedDate === day.data ? 'is-selected' : ''}" type="button" data-preview-date="${day.data}" ${day.status === 'fechado' ? 'aria-disabled="true"' : ''}>
      <strong>${day.label}</strong>
      <span>${day.status === 'disponivel' ? `${day.disponiveis} livres` : day.status === 'lotado' ? 'Lotado' : 'Fechado'}</span>
      <small>${day.motivo || day.origem || ''}</small>
    </button>
  `).join('');

  // Render time slots for selected day
  if (!previewState.selectedDate) {
    slotsTarget.innerHTML = '<p class="empty-state">Clique em um dia acima para ver os horários.</p>';
    return;
  }

  const selectedDay = previewState.availability.find(d => d.data === previewState.selectedDate);
  if (!selectedDay) {
    slotsTarget.innerHTML = '<p class="empty-state">Selecione um dia acima.</p>';
    return;
  }

  if (selectedDay.status === 'fechado') {
    slotsTarget.innerHTML = `<p class="empty-state">${selectedDay.motivo || 'Dia fechado.'}</p>`;
    return;
  }

  slotsTarget.innerHTML = selectedDay.slots.map(slot => `
    <button class="time-slot" type="button" ${slot.disponivel ? '' : 'disabled'}>
      <span>${slot.hora}</span>
      <small>${slot.motivo}</small>
    </button>
  `).join('');
}

function setupPreview() {
  const dateInput = document.querySelector('[data-preview-start]');
  const prevBtn = document.querySelector('[data-preview-prev]');
  const nextBtn = document.querySelector('[data-preview-next]');

  if (dateInput) {
    dateInput.value = new Date().toISOString().split('T')[0];
    previewState.startDate = dateInput.value;
  }

  if (dateInput) {
    dateInput.addEventListener('change', () => {
      previewState.startDate = dateInput.value;
      previewState.selectedDate = '';
      loadPreview();
    });
  }

  function shiftDate(days) {
    if (!dateInput) return;
    const current = dateInput.value ? new Date(`${dateInput.value}T12:00:00`) : new Date();
    current.setDate(current.getDate() + days);
    dateInput.value = current.toISOString().slice(0, 10);
    previewState.startDate = dateInput.value;
    previewState.selectedDate = '';
    loadPreview();
  }

  if (prevBtn) prevBtn.addEventListener('click', () => shiftDate(-7));
  if (nextBtn) nextBtn.addEventListener('click', () => shiftDate(7));

  // Service card click within preview
  document.addEventListener('click', (e) => {
    const serviceCard = e.target.closest('[data-preview-service-id]');
    if (serviceCard) {
      previewState.serviceId = Number(serviceCard.dataset.previewServiceId);
      previewState.selectedDate = '';
      renderPreviewServices();
      loadPreview();
    }

    const dayBtn = e.target.closest('[data-preview-date]');
    if (dayBtn && !dayBtn.getAttribute('aria-disabled')) {
      previewState.selectedDate = dayBtn.dataset.previewDate;
      renderPreview();
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!requireAdmin()) return;
  setupTabs();
  setupAdminActions();
  setupUserForm();
  setupAdminPetForm();
  setupServiceForm();
  setupPetTypeForm();
  setupScheduleForm();
  setupExceptionForm();
  setupAdminEditApptForm();
  setupQuickFilters();
  setupCopySchedule();
  setupIntervalForm();
  setupConfigForm();
  setupPreview();

  try {
    await loadAdmin();
    renderPreviewServices();
  } catch (error) {
    window.showToast(error.message, 'error');
  }
});
