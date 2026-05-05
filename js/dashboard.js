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

// Mock estático para demonstração visual da Entrega 1.
// Na Entrega 2 esta lista será substituída por window.PetWebApi.apiFetch('/api/agendamentos').
const MOCK_APPOINTMENTS = [
  { id: 1, status: 'Confirmado', servico: 'Banho', pet: 'Thor', preco: 49.90, data_hora: '2026-05-12T10:00:00' },
  { id: 2, status: 'Pendente',   servico: 'Tosa',  pet: 'Mel',  preco: 69.90, data_hora: '2026-05-15T14:30:00' },
  { id: 3, status: 'Concluído',  servico: 'Consulta Veterinária', pet: 'Thor', preco: 120.00, data_hora: '2026-04-20T09:00:00' }
];

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
    target.innerHTML = '<div class="empty-state" style="grid-column: 1 / -1;text-align:center;padding:48px 24px;">Você ainda não possui agendamentos.</div>';
    return;
  }

  target.innerHTML = appointments.map((item) => `
    <article class="service-card" style="display:flex;flex-direction:column;gap:12px;padding:24px;">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap;margin-bottom:4px;">
        <span class="badge ${statusClass(item.status)}">${item.status}</span>
        <span style="font-weight:800;color:var(--clr-primary-900);">${formatDate(item.data_hora)}</span>
      </div>
      <div>
        <h3 class="service-card__name" style="margin-bottom:4px;font-size:18px;">${escapeHtml(item.servico)}</h3>
        <p style="margin:0;color:var(--clr-neutral-600);font-size:14px;">Pet: <strong style="color:var(--clr-neutral-900)">${escapeHtml(item.pet)}</strong></p>
      </div>
      <div style="margin-top:auto;padding-top:16px;border-top:1px solid var(--clr-neutral-150);">
        <span style="font-weight:800;color:var(--clr-primary-700);font-family:var(--font-display);font-size:18px;">${formatMoney(item.preco)}</span>
      </div>
    </article>
  `).join('');
}

function setupActions() {
  document.addEventListener('click', (event) => {
    const logout = event.target.closest('[data-dashboard-logout]');
    if (logout) {
      window.PetWebApi.clearSession();
      window.location.href = '/index.html';
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const user = requireClientSession();
  if (!user) return;

  renderProfile(user);
  setupActions();
  renderAppointments(MOCK_APPOINTMENTS);
});
