function statusClass(status) {
  return {
    Pendente: 'badge--pending',
    Confirmado: 'badge--confirmed',
    'Em Andamento': 'badge--ongoing',
    Concluído: 'badge--done',
    Cancelado: 'badge--cancelled'
  }[status] || 'badge--pending';
}

function formatMoney(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value) {
  return new Date(value).toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short'
  });
}

function requireClientSession() {
  const user = window.PetWebApi.getCurrentUser();
  if (!user) {
    window.location.href = '/login.html?next=/dashboard.html';
    return null;
  }
  if (user.tipo_perfil === 'admin') {
    window.location.href = '/admin.html';
    return null;
  }
  return user;
}

function renderProfile(user) {
  document.querySelectorAll('[data-sidebar-name]').forEach(el => el.textContent = user.nome.split(' ')[0]);
  document.querySelectorAll('[data-sidebar-name-full]').forEach(el => el.textContent = user.nome);
  document.querySelectorAll('[data-sidebar-role]').forEach(el => el.textContent = user.tipo_perfil);
  const initials = String(user.nome).trim().split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase();
  document.querySelectorAll('[data-sidebar-avatar]').forEach(el => el.textContent = initials);
}

const dashboardState = {
  pets: [],
  petTypes: [],
  appointments: []
};

function renderPetTypeOptions(selected = '') {
  document.querySelectorAll('[data-pet-type-options]').forEach((select) => {
    select.innerHTML = dashboardState.petTypes.map((type) => `
      <option value="${type.nome}" ${type.nome === selected ? 'selected' : ''}>${type.nome}</option>
    `).join('');
  });
}

function renderPets(pets) {
  const target = document.querySelector('[data-pets-grid]');
  if (!target) return;

  if (!pets.length) {
    target.innerHTML = '<p class="empty-state">Nenhum pet cadastrado ainda. Adicione um pet para conseguir agendar.</p>';
    return;
  }

  target.innerHTML = pets.map((pet) => `
    <article class="pet-card service-card">
      <div class="service-card__icon">${pet.especie === 'Gato' ? 'G' : pet.especie === 'Cão' ? 'C' : 'P'}</div>
      <h3 class="service-card__name">${pet.nome}</h3>
      <p class="service-card__desc">${pet.especie} • ${pet.raca || 'Sem raça'} • ${pet.porte || 'Porte não informado'}<br>${pet.observacoes || 'Sem observações.'}</p>
      <div class="table-actions">
        <button class="btn btn-outline btn-sm" type="button" data-edit-pet="${pet.id}">Editar</button>
        <button class="btn btn-ghost btn-sm" type="button" data-remove-pet="${pet.id}">Remover</button>
      </div>
    </article>
  `).join('');
}

function renderAppointments(appointments) {
  const target = document.querySelector('[data-appointments-body]');
  
  const pendingC = document.querySelector('[data-counter-pending]');
  const confirmedC = document.querySelector('[data-counter-confirmed]');
  const doneC = document.querySelector('[data-counter-done]');
  
  if (pendingC) pendingC.textContent = appointments.filter(a => a.status === 'Pendente').length;
  if (confirmedC) confirmedC.textContent = appointments.filter(a => a.status === 'Confirmado').length;
  if (doneC) doneC.textContent = appointments.filter(a => a.status === 'Concluído').length;

  if (!target) return;

  if (!appointments.length) {
    target.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;text-align:center;padding:48px 24px;">Você ainda não possui agendamentos.<br><br><button class="btn btn-primary" type="button" data-client-tab="novo-agendamento">Agendar agora</button></div>';
    return;
  }

  target.innerHTML = appointments.map((item) => {
    const isPending = item.status === 'Pendente';
    const isPast = new Date(item.data_hora) < new Date();
    const canCancel = ['Pendente', 'Confirmado'].includes(item.status) && !isPast;
    const canReschedule = isPending; // só pendente pode remarcar

    // Badge de status
    const displayStatus = isPending ? 'Em aprovação' : item.status;

    // Cor e estilo da data
    const dateStyle = isPast
      ? 'font-weight:800;color:var(--clr-neutral-400);text-decoration:line-through;'
      : 'font-weight:800;color:var(--clr-primary-900);';

    // Badge extra de data expirada
    const expiredBadge = isPast && isPending
      ? `<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:99px;background:rgba(239,68,68,0.10);color:#B91C1C;font-size:11px;font-weight:800;">
           <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
           Data expirada
         </span>`
      : '';

    // Ações + hint
    let actions = '';
    let hint = '';

    if (canReschedule) {
      actions += `<button class="btn btn-outline btn-sm" type="button" data-edit-appt="${item.id}">Remarcar</button>`;
    }
    if (canCancel) {
      actions += `<button class="btn btn-danger btn-sm" type="button" data-cancel-appointment="${item.id}">Cancelar</button>`;
    }

    // Se o agendamento está pendente mas a data já passou, explica o porquê de não poder cancelar
    if (isPending && isPast && !canCancel) {
      hint = `<p style="margin:8px 0 0;font-size:12px;color:var(--clr-neutral-500);">A data já passou. Remarque para um novo horário ou aguarde o cancelamento automático.</p>`;
    }

    return `
      <article class="service-card" style="display:flex;flex-direction:column;gap:12px;padding:24px;${isPast && isPending ? 'border-color:rgba(239,68,68,0.2);' : ''}">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            <span class="badge ${statusClass(item.status)}">${displayStatus}</span>
            ${expiredBadge}
          </div>
          <span style="${dateStyle}">${formatDate(item.data_hora)}</span>
        </div>
        <div>
          <h3 class="service-card__name" style="margin-bottom:4px;font-size:18px;">${escapeHtml(item.servico)}</h3>
          <p style="margin:0;color:var(--clr-neutral-600);font-size:14px;">Pet: <strong style="color:var(--clr-neutral-900)">${escapeHtml(item.pet)}</strong></p>
        </div>
        <div style="margin-top:auto;padding-top:16px;border-top:1px solid var(--clr-neutral-150);">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <span style="font-weight:800;color:var(--clr-primary-700);font-family:var(--font-display);font-size:18px;">${formatMoney(item.preco)}</span>
            <div class="table-actions" style="margin:0;">
              ${actions || '<span style="font-size:13px;color:var(--clr-neutral-400);">Nenhuma ação disponível</span>'}
            </div>
          </div>
          ${hint}
        </div>
      </article>
    `;
  }).join('');
}

async function loadDashboard() {
  const [petsData, appointmentsData, typesData] = await Promise.all([
    window.PetWebApi.apiFetch('/api/pets'),
    window.PetWebApi.apiFetch('/api/agendamentos'),
    window.PetWebApi.apiFetch('/api/tipos-pet', { authRedirect: false })
  ]);

  dashboardState.pets = petsData.pets || [];
  dashboardState.petTypes = typesData.tipos || [];
  dashboardState.appointments = appointmentsData.agendamentos || [];
  renderPetTypeOptions();
  renderPets(dashboardState.pets);
  renderAppointments(dashboardState.appointments);
}

function openPetModal(pet = {}) {
  const form = document.querySelector('[data-pet-form]');
  const title = document.querySelector('[data-pet-modal-title]');
  if (!form) return;

  form.id.value = pet.id || '';
  form.nome.value = pet.nome || '';
  form.raca.value = pet.raca || '';
  form.porte.value = pet.porte || 'Pequeno';
  form.observacoes.value = pet.observacoes || '';
  renderPetTypeOptions(pet.especie || dashboardState.petTypes[0]?.nome || '');
  if (title) title.textContent = pet.id ? 'Editar pet' : 'Adicionar pet';
  document.querySelector('#pet-dialog')?.showModal();
}

function confirmDashboardAction({ title, message, detail, confirmLabel = 'Remover' }) {
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

function setupPetForm() {
  const form = document.querySelector('[data-pet-form]');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const id = formData.get('id');
    const payload = Object.fromEntries(formData.entries());
    delete payload.id;
    try {
      await window.PetWebApi.apiFetch(id ? `/api/pets/${id}` : '/api/pets', {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(payload)
      });
      form.closest('dialog')?.close();
      form.reset();
      window.showToast(id ? 'Pet atualizado.' : 'Pet cadastrado.', 'success');
      await loadDashboard();
      if (typeof loadBookingData === 'function') {
        await loadBookingData();
        if (typeof renderAll === 'function') renderAll();
      }
    } catch (error) {
      window.showToast(error.message, 'error');
    }
  });
}

// ---- Remarcar Agendamento (modal com calendário visual) ----

const rescheduleState = {
  apptId: null,
  serviceId: null,
  periodStart: 0,   // offset em dias a partir de hoje
  periodSize: 8,    // quantos dias buscar por vez
  selectedDate: null,
  availability: [],
};

function formatDayLabel(iso) {
  const [y, m, d] = iso.split('-');
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  return dt.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' });
}

function periodLabel(offset, size) {
  const start = new Date();
  start.setDate(start.getDate() + offset);
  const end = new Date();
  end.setDate(end.getDate() + offset + size - 1);
  const fmt = (d) => d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
  return `${fmt(start)} – ${fmt(end)}`;
}

async function loadRescheduleDays() {
  const grid = document.querySelector('[data-reschedule-days]');
  const label = document.querySelector('[data-reschedule-period-label]');
  const prevBtn = document.querySelector('[data-reschedule-prev]');
  if (!grid) return;

  const today = new Date();
  const inicio = new Date(today);
  inicio.setDate(today.getDate() + rescheduleState.periodStart);
  const inicioStr = inicio.toISOString().split('T')[0];

  if (label) label.textContent = periodLabel(rescheduleState.periodStart, rescheduleState.periodSize);
  if (prevBtn) prevBtn.disabled = rescheduleState.periodStart <= 0;

  grid.innerHTML = '<div class="reschedule-loading">Carregando...</div>';

  try {
    const res = await window.PetWebApi.apiFetch(
      `/api/disponibilidade?servico_id=${rescheduleState.serviceId}&inicio=${inicioStr}&dias=${rescheduleState.periodSize}&ignore_id=${rescheduleState.apptId}`
    );
    rescheduleState.availability = res.disponibilidade || [];
    renderRescheduleDays();
  } catch (e) {
    grid.innerHTML = '<div class="reschedule-loading">Erro ao carregar disponibilidade.</div>';
  }
}

function renderRescheduleDays() {
  const grid = document.querySelector('[data-reschedule-days]');
  if (!grid) return;

  const days = rescheduleState.availability;
  if (!days.length) {
    grid.innerHTML = '<div class="reschedule-loading">Nenhum dia disponível neste período.</div>';
    return;
  }

  grid.innerHTML = days.map(day => {
    const available = day.status === 'disponivel';
    const full = day.status === 'lotado';
    const closed = day.status === 'fechado';
    const isSelected = day.data === rescheduleState.selectedDate;
    const freeSlots = available ? (day.slots || []).filter(s => s.disponivel).length : 0;

    let statusClass = '';
    let statusText = '';
    if (closed) { statusClass = 'availability-day--fechado'; statusText = 'Fechado'; }
    else if (full) { statusClass = 'availability-day--lotado'; statusText = 'Lotado'; }
    else { statusClass = 'availability-day--disponivel'; statusText = `${freeSlots} horário${freeSlots !== 1 ? 's' : ''}`; }

    const [y, m, d] = day.data.split('-');
    const dt = new Date(Number(y), Number(m) - 1, Number(d));
    const weekday = dt.toLocaleDateString('pt-BR', { weekday: 'short' });
    const dayNum = dt.getDate();
    const month = dt.toLocaleDateString('pt-BR', { month: 'short' });

    return `
      <button type="button"
        class="availability-day ${statusClass}${isSelected ? ' is-selected' : ''}"
        data-reschedule-day="${day.data}"
        ${closed || full ? 'aria-disabled="true"' : ''}
      >
        <strong>${weekday}</strong>
        <span style="font-size:20px;font-weight:800;color:var(--clr-primary-900)">${dayNum}</span>
        <small>${month}</small>
        <small style="margin-top:4px">${statusText}</small>
      </button>
    `;
  }).join('');
}

function showRescheduleSlots(date) {
  rescheduleState.selectedDate = date;
  renderRescheduleDays(); // re-render to highlight selected

  const day = rescheduleState.availability.find(d => d.data === date);
  const section = document.querySelector('[data-reschedule-slots-section]');
  const slotsGrid = document.querySelector('[data-reschedule-slots]');
  const dayLabel = document.querySelector('[data-reschedule-selected-day-label]');
  const confirmBtn = document.querySelector('[data-reschedule-confirm]');
  const hiddenData = document.querySelector('[data-edit-appt-form] [name="data"]');
  const hiddenHora = document.querySelector('[data-edit-appt-form] [name="hora"]');

  if (!section || !slotsGrid || !day) return;

  section.style.display = 'block';
  if (dayLabel) dayLabel.textContent = formatDayLabel(date);
  if (confirmBtn) confirmBtn.disabled = true;
  if (hiddenData) hiddenData.value = '';
  if (hiddenHora) hiddenHora.value = '';

  const slots = (day.slots || []);
  if (!slots.length) {
    slotsGrid.innerHTML = '<div class="empty-state" style="grid-column:1/-1">Sem horários neste dia.</div>';
    return;
  }

  slotsGrid.innerHTML = slots.map(s => `
    <button type="button"
      class="time-slot${!s.disponivel ? ' disabled' : ''}"
      data-reschedule-slot="${s.hora}"
      ${!s.disponivel ? 'disabled' : ''}
    >
      <strong>${s.hora}</strong>
      ${!s.disponivel ? `<small>${s.motivo || 'Indisponível'}</small>` : ''}
    </button>
  `).join('');
}

function selectRescheduleSlot(hora) {
  const confirmBtn = document.querySelector('[data-reschedule-confirm]');
  const hiddenData = document.querySelector('[data-edit-appt-form] [name="data"]');
  const hiddenHora = document.querySelector('[data-edit-appt-form] [name="hora"]');

  document.querySelectorAll('[data-reschedule-slot]').forEach(btn => btn.classList.remove('is-selected'));
  const clicked = document.querySelector(`[data-reschedule-slot="${hora}"]`);
  if (clicked) clicked.classList.add('is-selected');

  if (hiddenData) hiddenData.value = rescheduleState.selectedDate;
  if (hiddenHora) hiddenHora.value = hora;
  if (confirmBtn) confirmBtn.disabled = false;
}

async function openEditApptModal(appt) {
  const dialog = document.querySelector('#edit-appt-dialog');
  const form = document.querySelector('[data-edit-appt-form]');
  if (!dialog || !form) return;

  // Reset state
  rescheduleState.apptId = appt.id;
  rescheduleState.serviceId = appt.id_servico;
  rescheduleState.periodStart = 0;
  rescheduleState.selectedDate = null;

  form.id.value = appt.id;
  form.id_servico.value = appt.id_servico;
  form.data.value = '';
  form.hora.value = '';

  document.querySelector('[data-edit-appt-service-name]').textContent = appt.servico;
  document.querySelector('[data-edit-appt-pet-name]').textContent = appt.pet;

  const section = document.querySelector('[data-reschedule-slots-section]');
  if (section) section.style.display = 'none';
  const confirmBtn = document.querySelector('[data-reschedule-confirm]');
  if (confirmBtn) confirmBtn.disabled = true;

  dialog.showModal();
  await loadRescheduleDays();
}

function setupEditApptForm() {
  const form = document.querySelector('[data-edit-appt-form]');
  if (!form) return;

  // Day grid clicks
  document.addEventListener('click', async (e) => {
    const dayBtn = e.target.closest('[data-reschedule-day]');
    if (dayBtn && !dayBtn.hasAttribute('aria-disabled')) {
      showRescheduleSlots(dayBtn.dataset.rescheduleDay);
    }

    const slotBtn = e.target.closest('[data-reschedule-slot]');
    if (slotBtn && !slotBtn.disabled) {
      selectRescheduleSlot(slotBtn.dataset.rescheduleSlot);
    }

    if (e.target.closest('[data-reschedule-prev]')) {
      rescheduleState.periodStart = Math.max(0, rescheduleState.periodStart - rescheduleState.periodSize);
      rescheduleState.selectedDate = null;
      document.querySelector('[data-reschedule-slots-section]').style.display = 'none';
      await loadRescheduleDays();
    }

    if (e.target.closest('[data-reschedule-next]')) {
      rescheduleState.periodStart += rescheduleState.periodSize;
      rescheduleState.selectedDate = null;
      document.querySelector('[data-reschedule-slots-section]').style.display = 'none';
      await loadRescheduleDays();
    }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = form.data.value;
    const hora = form.hora.value;
    if (!data || !hora) return;

    try {
      await window.PetWebApi.apiFetch(`/api/agendamentos/${form.id.value}`, {
        method: 'PUT',
        body: JSON.stringify({ data_hora: `${data}T${hora}:00` })
      });
      form.closest('dialog').close();
      window.showToast('Agendamento remarcado com sucesso!', 'success');
      await loadDashboard();
    } catch (err) {
      window.showToast(err.message, 'error');
    }
  });
}


function setupActions() {
  document.addEventListener('click', async (event) => {
    const logout = event.target.closest('[data-dashboard-logout]');
    const cancel = event.target.closest('[data-cancel-appointment]');
    const removePet = event.target.closest('[data-remove-pet]');
    const editPet = event.target.closest('[data-edit-pet]');

    if (logout) {
      window.PetWebApi.clearSession();
      window.location.href = '/index.html';
    }

    if (cancel) {
      const ok = await confirmDashboardAction({
        title: 'Cancelar Agendamento',
        message: 'Tem certeza que deseja cancelar este agendamento?',
        detail: 'Esta ação não poderá ser desfeita.',
        confirmLabel: 'Sim, cancelar'
      });
      if (!ok) return;

      try {
        await window.PetWebApi.apiFetch(`/api/agendamentos/${cancel.dataset.cancelAppointment}/cancelar`, { method: 'PATCH' });
        window.showToast('Agendamento cancelado.', 'success');
        await loadDashboard();
      } catch (error) {
        window.showToast(error.message, 'error');
      }
    }

    if (editPet) {
      const pet = dashboardState.pets.find((item) => Number(item.id) === Number(editPet.dataset.editPet));
      openPetModal(pet);
    }

    if (removePet) {
      const pet = dashboardState.pets.find((item) => Number(item.id) === Number(removePet.dataset.removePet));
      const ok = await confirmDashboardAction({
        title: 'Remover pet',
        message: `Remover "${pet?.nome || 'este pet'}"?`,
        detail: 'Depois disso, ele não aparecerá mais para novos agendamentos.',
        confirmLabel: 'Remover pet'
      });
      if (!ok) return;

      try {
        await window.PetWebApi.apiFetch(`/api/pets/${removePet.dataset.removePet}`, { method: 'DELETE' });
        window.showToast('Pet removido.', 'success');
        await loadDashboard();
      } catch (error) {
        window.showToast(error.message, 'error');
      }
    }

    const editAppt = event.target.closest('[data-edit-appt]');
    if (editAppt) {
      const appt = dashboardState.appointments.find(a => a.id == editAppt.dataset.editAppt);
      if (appt) openEditApptModal(appt);
    }
  });

  document.querySelectorAll('[data-dialog-open="#pet-dialog"]').forEach((btn) => {
    btn.addEventListener('click', (event) => {
      event.preventDefault();
      openPetModal();
    });
  });

  document.querySelectorAll('[data-client-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('[data-client-tab]').forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('[data-client-panel]').forEach((p) => p.classList.remove('active'));
      tab.classList.add('active');
      const panel = document.querySelector(`[data-client-panel="${tab.dataset.clientTab}"]`);
      if (panel) panel.classList.add('active');
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  const user = requireClientSession();
  if (!user) return;

  renderProfile(user);
  setupPetForm();
  setupEditApptForm();
  setupActions();

  try {
    await loadDashboard();
  } catch (error) {
    window.showToast(error.message, 'error');
  }
});
