export const STATUSES = ['Pendente', 'Confirmado', 'Em Andamento', 'Concluído', 'Cancelado'];

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim());
}

export function isStrongEnoughPassword(password) {
  return typeof password === 'string' && password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

export function isOfficialStatus(status) {
  return STATUSES.includes(status);
}

export function parseAppointmentDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export async function validateBusinessDateAsync(sql, value) {
  const date = new Date(value);
  const now = new Date();
  if (Number.isNaN(date.getTime())) return 'Data inválida.';
  if (date <= now) return 'Não é possível agendar datas ou horários passados.';

  const dateKey = value.split('T')[0];
  const dayOfWeek = date.getDay();

  const exceptions = await sql`
    SELECT * FROM excecoes_funcionamento
    WHERE data = ${dateKey} OR (recorrente_anual = TRUE AND right(data::text, 5) = ${dateKey.slice(5)})
    ORDER BY recorrente_anual ASC, id DESC LIMIT 1
  `;
  const exception = exceptions[0];

  let schedule;
  if (exception) {
    if (exception.tipo === 'fechado') return exception.titulo || 'Dia sem atendimento.';
    schedule = { abre: exception.abre, fecha: exception.fecha, nome_dia: exception.titulo };
  } else {
    const schedules = await sql`SELECT * FROM horarios_funcionamento WHERE dia_semana = ${dayOfWeek}`;
    schedule = schedules[0];
    if (!schedule || schedule.bloqueado) return schedule?.nome_dia ? `${schedule.nome_dia} bloqueado` : 'Dia sem atendimento.';
  }

  const timeToMinutes = (t) => {
    if (!t) return null;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };

  const minutes = date.getHours() * 60 + date.getMinutes();
  const open = timeToMinutes(schedule.abre);
  const close = timeToMinutes(schedule.fecha);
  if (open === null || close === null || minutes < open || minutes > close) {
    return `Horário fora do funcionamento de ${schedule.nome_dia}.`;
  }

  const intervals = await sql`SELECT * FROM intervalos_indisponiveis WHERE dia_semana = ${dayOfWeek} AND ativo = TRUE`;
  for (const interval of intervals) {
    const intervalStart = timeToMinutes(interval.inicio);
    const intervalEnd = timeToMinutes(interval.fim);
    if (minutes >= intervalStart && minutes < intervalEnd) {
      return `Horário indisponível (${interval.titulo}).`;
    }
  }

  return null;
}

export async function hasConflictAsync(sql, startValue, serviceId, ignoreId = null) {
  const services = await sql`SELECT tempo_estimado FROM servicos WHERE id = ${serviceId} AND ativo = TRUE`;
  if (!services.length) return false;

  const start = new Date(startValue);
  const end = new Date(start.getTime() + services[0].tempo_estimado * 60000);

  let existing;
  if (ignoreId) {
    existing = await sql`
      SELECT a.id, a.data_hora, s.tempo_estimado
      FROM agendamentos a
      JOIN servicos s ON s.id = a.id_servico
      WHERE a.status <> 'Cancelado' AND a.id <> ${ignoreId}
    `;
  } else {
    existing = await sql`
      SELECT a.id, a.data_hora, s.tempo_estimado
      FROM agendamentos a
      JOIN servicos s ON s.id = a.id_servico
      WHERE a.status <> 'Cancelado'
    `;
  }

  return existing.some((item) => {
    const otherStart = new Date(item.data_hora);
    const otherEnd = new Date(otherStart.getTime() + item.tempo_estimado * 60000);
    return start < otherEnd && end > otherStart;
  });
}
