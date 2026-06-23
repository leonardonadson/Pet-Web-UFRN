const bookingState = {
  user: null,
  pets: [],
  petTypes: [],
  services: [],
  schedules: [],
  availability: [],
  petId: null,
  serviceId: null,
  date: '',
  time: '',
  periodStart: new Date().toISOString().split('T')[0]
};

const bookingParams = new URLSearchParams(window.location.search);
const preselectedServiceId = Number(bookingParams.get('servico'));

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function selectedPet() {
  return bookingState.pets.find((pet) => Number(pet.id) === Number(bookingState.petId));
}

function selectedService() {
  return bookingState.services.find((service) => Number(service.id) === Number(bookingState.serviceId));
}

function renderAuthGate() {
  const gate = document.querySelector('[data-auth-gate]');
  const addPetButton = document.querySelector('[data-dialog-open="#pet-dialog"]');
  bookingState.user = window.PetWebApi.getCurrentUser();
  if (gate) gate.hidden = Boolean(bookingState.user);
  if (addPetButton) addPetButton.disabled = !bookingState.user;
}

function renderWizardPets() {
  const target = document.querySelector('[data-pet-options]');
  if (!target) return;

  if (!bookingState.user) {
    target.innerHTML = '<p class="empty-state">Entre ou crie sua conta para carregar seus pets.</p>';
    return;
  }

  if (!bookingState.pets.length) {
    target.innerHTML = '<p class="empty-state">Você ainda não tem pets cadastrados. Use “Adicionar pet” para continuar.</p>';
    return;
  }

  target.innerHTML = bookingState.pets.map((pet) => `
    <button class="wizard-select-card ${Number(bookingState.petId) === Number(pet.id) ? 'is-selected' : ''}" type="button" data-pet-id="${pet.id}">
      <strong>${pet.nome}</strong>
      <span>${pet.especie} • ${pet.raca || 'Sem raça'} • ${pet.porte || 'Porte não informado'}</span>
    </button>
  `).join('');
}

function renderWizardPetTypeOptions() {
  document.querySelectorAll('[data-pet-type-options]').forEach((select) => {
    select.innerHTML = bookingState.petTypes.map((type) => `<option value="${type.nome}">${type.nome}</option>`).join('');
  });
}

function renderServices() {
  const target = document.querySelector('[data-service-options]');
  if (!target) return;

  target.innerHTML = bookingState.services.map((service) => `
    <button class="wizard-select-card ${Number(bookingState.serviceId) === Number(service.id) ? 'is-selected' : ''}" type="button" data-service-id="${service.id}">
      <strong>${service.nome}</strong>
      <span>${money(service.preco)} • ${service.tempo_estimado} min</span>
      <small>${service.descricao || ''}</small>
    </button>
  `).join('');
}

function renderAvailabilityDays() {
  const target = document.querySelector('[data-availability-days]');
  const summary = document.querySelector('[data-availability-summary]');
  if (!target) return;

  if (!bookingState.serviceId) {
    target.innerHTML = '';
    if (summary) summary.textContent = 'Escolha um serviço para consultar a agenda.';
    return;
  }

  if (!bookingState.availability.length) {
    target.innerHTML = '<p class="empty-state">Nenhuma disponibilidade carregada.</p>';
    if (summary) summary.textContent = 'Agenda indisponível no momento.';
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  const availableDays = bookingState.availability.filter((day) => day.status === 'disponivel').length;
  if (summary) summary.textContent = `${availableDays} dias com horários livres nos próximos ${bookingState.availability.length} dias.`;

  // update period nav
  const label = document.querySelector('[data-period-label]');
  const prevBtn = document.querySelector('[data-period-prev]');
  if (label && bookingState.availability.length) {
    const first = bookingState.availability[0];
    const last = bookingState.availability[bookingState.availability.length - 1];
    const fmt = (d) => new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    label.textContent = `${fmt(first.data)} – ${fmt(last.data)}`;
  } else if (label) {
    label.textContent = 'Próximos 21 dias';
  }
  if (prevBtn) prevBtn.disabled = bookingState.periodStart <= today;

  target.innerHTML = bookingState.availability.map((day) => `
    <button class="availability-day availability-day--${day.status} ${bookingState.date === day.data ? 'is-selected' : ''}" type="button" data-availability-date="${day.data}" ${day.status === 'fechado' ? 'aria-disabled="true"' : ''}>
      <strong>${day.label}</strong>
      <span>${day.status === 'disponivel' ? `${day.disponiveis} livres` : day.status === 'lotado' ? 'Lotado' : 'Fechado'}</span>
      <small>${day.motivo || day.origem || ''}</small>
    </button>
  `).join('');
}

function renderTimeSlots() {
  const target = document.querySelector('[data-time-slots]');
  if (!target) return;

  if (!bookingState.date) {
    target.innerHTML = '<p class="empty-state">Escolha uma data para ver os horários.</p>';
    return;
  }

  const availabilityDay = bookingState.availability.find((day) => day.data === bookingState.date);
  if (!availabilityDay) {
    target.innerHTML = '<p class="empty-state">Selecione um dia da agenda acima ou escolha outra data.</p>';
    return;
  }

  if (availabilityDay.status === 'fechado') {
    target.innerHTML = `<p class="empty-state">${availabilityDay.motivo || 'Este dia está fechado.'}</p>`;
    return;
  }

  target.innerHTML = availabilityDay.slots.map((slot) => `
    <button class="time-slot ${bookingState.time === slot.hora ? 'is-selected' : ''}" type="button" data-time="${slot.hora}" ${slot.disponivel ? '' : 'disabled'}>
      <span>${slot.hora}</span>
      <small>${slot.motivo}</small>
    </button>
  `).join('');
}

function renderSummary() {
  const target = document.querySelector('[data-booking-summary]');
  if (!target) return;

  const pet = selectedPet();
  const service = selectedService();
  const dateTime = bookingState.date && bookingState.time
    ? new Date(`${bookingState.date}T${bookingState.time}:00`).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : 'Selecione data e horário';

  target.innerHTML = `
    <div><dt>Pet</dt><dd>${pet ? pet.nome : 'Selecione um pet'}</dd></div>
    <div><dt>Serviço</dt><dd>${service ? service.nome : 'Selecione um serviço'}</dd></div>
    <div><dt>Data/Hora</dt><dd>${dateTime}</dd></div>
    <div><dt>Total</dt><dd>${service ? money(service.preco) : '-'}</dd></div>
  `;
}

function renderAll() {
  renderAuthGate();
  renderWizardPets();
  renderWizardPetTypeOptions();
  renderServices();
  renderAvailabilityDays();
  renderTimeSlots();
  renderSummary();
}

async function loadAvailability() {
  if (!bookingState.serviceId) {
    bookingState.availability = [];
    return;
  }

  const start = bookingState.periodStart;
  const data = await window.PetWebApi.apiFetch(`/api/disponibilidade?servico_id=${bookingState.serviceId}&inicio=${start}&dias=21`, { authRedirect: false });
  bookingState.availability = data.disponibilidade || [];
}

async function loadBookingData() {
  const [servicesData, schedulesData, typesData] = await Promise.all([
    window.PetWebApi.apiFetch('/api/servicos', { authRedirect: false }),
    window.PetWebApi.apiFetch('/api/horarios', { authRedirect: false }),
    window.PetWebApi.apiFetch('/api/tipos-pet', { authRedirect: false })
  ]);
  bookingState.services = servicesData.servicos || [];
  bookingState.schedules = schedulesData.horarios || [];
  bookingState.petTypes = typesData.tipos || [];

  if (preselectedServiceId && bookingState.services.some((service) => Number(service.id) === preselectedServiceId)) {
    bookingState.serviceId = preselectedServiceId;
  }

  if (bookingState.user) {
    const petsData = await window.PetWebApi.apiFetch('/api/pets');
    bookingState.pets = petsData.pets || [];
  }

  await loadAvailability();
}

function setupDate() {
  const input = document.querySelector('#data');
  if (!input) return;
  input.min = new Date().toISOString().split('T')[0];
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function setupPeriodNav() {
  const prevBtn = document.querySelector('[data-period-prev]');
  const nextBtn = document.querySelector('[data-period-next]');
  if (!prevBtn || !nextBtn) return;

  const today = new Date().toISOString().split('T')[0];

  prevBtn.addEventListener('click', async () => {
    const newStart = addDays(bookingState.periodStart, -21);
    bookingState.periodStart = newStart < today ? today : newStart;
    await loadAvailability();
    renderAll();
  });

  nextBtn.addEventListener('click', async () => {
    bookingState.periodStart = addDays(bookingState.periodStart, 21);
    await loadAvailability();
    renderAll();
  });
}

function setupSelection() {
  document.addEventListener('click', (event) => {
    const pet = event.target.closest('[data-pet-id]');
    const service = event.target.closest('[data-service-id]');
    const time = event.target.closest('[data-time]');
    const day = event.target.closest('[data-availability-date]');

    if (pet) bookingState.petId = Number(pet.dataset.petId);
    if (service) {
      bookingState.serviceId = Number(service.dataset.serviceId);
      bookingState.date = '';
      bookingState.time = '';
      bookingState.periodStart = new Date().toISOString().split('T')[0];
      const input = document.querySelector('#data');
      if (input) input.value = '';
      loadAvailability()
        .then(renderAll)
        .catch((error) => window.showToast(error.message, 'error'));
    }
    if (day && !day.getAttribute('aria-disabled')) {
      bookingState.date = day.dataset.availabilityDate;
      bookingState.time = '';
      const input = document.querySelector('#data');
      if (input) input.value = bookingState.date;
    }
    if (time) bookingState.time = time.dataset.time;

    if (pet || service || time || day) renderAll();
  });
}

function setupInlinePet() {
  const form = document.querySelector('[data-inline-pet-form]');
  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!bookingState.user) {
      window.showToast('Entre para cadastrar um pet.', 'error');
      return;
    }

    const formData = new FormData(form);
    try {
      const data = await window.PetWebApi.apiFetch('/api/pets', {
        method: 'POST',
        body: JSON.stringify(Object.fromEntries(formData.entries()))
      });
      bookingState.pets.push(data.pet);
      bookingState.petId = data.pet.id;
      form.reset();
      form.closest('dialog')?.close();
      window.showToast('Pet cadastrado.', 'success');
      renderAll();
    } catch (error) {
      window.showToast(error.message, 'error');
    }
  });
}

function validateBooking() {
  if (!bookingState.user) return 'Entre ou crie sua conta para confirmar.';
  if (!bookingState.petId) return 'Selecione ou cadastre um pet.';
  if (!bookingState.serviceId) return 'Selecione um serviço.';
  if (!bookingState.date || !bookingState.time) return 'Selecione data e horário.';
  return '';
}

function setupConfirm() {
  const button = document.querySelector('[data-confirm-booking]');
  if (!button) return;

  button.addEventListener('click', async () => {
    const error = validateBooking();
    if (error) {
      window.showToast(error, 'error');
      return;
    }

    button.classList.add('loading');
    try {
      await window.PetWebApi.apiFetch('/api/agendamentos', {
        method: 'POST',
        body: JSON.stringify({
          id_pet: bookingState.petId,
          id_servico: bookingState.serviceId,
          data_hora: `${bookingState.date}T${bookingState.time}:00`
        })
      });
      window.showToast('Agendamento criado.', 'success');
      window.setTimeout(() => {
        window.location.href = '/dashboard.html';
      }, 700);
    } catch (err) {
      window.showToast(err.message, 'error');
    } finally {
      button.classList.remove('loading');
    }
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  renderAuthGate();
  setupDate();
  setupPeriodNav();
  setupSelection();
  setupInlinePet();
  setupConfirm();

  try {
    await loadBookingData();
    renderAll();
  } catch (error) {
    window.showToast(error.message, 'error');
  }
});
