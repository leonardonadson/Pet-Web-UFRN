import { getSql } from '../_lib/db.js';
import { sendJson, sendError, methodNotAllowed } from '../_lib/response.js';

function timeToMinutes(value) {
  if (!value) return null;
  const [hour, minute] = String(value).split(':').map(Number);
  return hour * 60 + minute;
}

function minutesToTime(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function addDays(dateKey, amount) {
  const date = new Date(dateKey);
  date.setDate(date.getDate() + amount);
  return date.toISOString().slice(0, 10);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res);

  let query = req.query;
  if (!query || typeof query !== 'object') {
    query = Object.fromEntries(new URL(req.url, `http://${req.headers.host || 'localhost'}`).searchParams);
  }

  const serviceId = Number(query.servico_id) || null;
  const ignoreId = query.ignore_id ? Number(query.ignore_id) : null;
  const start = query.inicio || todayKey();
  const days = Math.min(Math.max(Number(query.dias || 21), 1), 60);

  try {
    const sql = getSql();

    const service = serviceId
      ? (await sql`SELECT * FROM servicos WHERE id = ${serviceId} AND ativo = TRUE`)[0] || null
      : null;

    const horarios = await sql`SELECT * FROM horarios_funcionamento`;
    const horariosByDay = new Map(horarios.map((h) => [h.dia_semana, h]));

    const excecoes = await sql`SELECT * FROM excecoes_funcionamento`;
    const intervalos = await sql`SELECT * FROM intervalos_indisponiveis WHERE ativo = TRUE`;

    const ocupados = ignoreId
      ? await sql`
          SELECT a.data_hora, s.tempo_estimado
          FROM agendamentos a JOIN servicos s ON s.id = a.id_servico
          WHERE a.status <> 'Cancelado' AND a.id <> ${ignoreId}`
      : await sql`
          SELECT a.data_hora, s.tempo_estimado
          FROM agendamentos a JOIN servicos s ON s.id = a.id_servico
          WHERE a.status <> 'Cancelado'`;
    const ocupadosRanges = ocupados.map((o) => {
      const inicio = new Date(o.data_hora).getTime();
      return [inicio, inicio + o.tempo_estimado * 60000];
    });

    function effectiveSchedule(dateKey) {
      const mmdd = dateKey.slice(5);
      const exception = excecoes
        .filter((e) => {
          const ekey = String(e.data).slice(0, 10);
          return ekey === dateKey || (e.recorrente_anual && ekey.slice(5) === mmdd);
        })
        .sort((a, b) => (Number(a.recorrente_anual) - Number(b.recorrente_anual)) || (b.id - a.id))[0];

      if (exception) {
        if (exception.tipo === 'fechado') {
          return { closed: true, reason: exception.titulo, source: exception.recorrente_anual ? 'feriado recorrente' : 'bloqueio por data' };
        }
        return {
          closed: false,
          reason: exception.titulo,
          source: exception.recorrente_anual ? 'horário especial recorrente' : 'horário especial',
          nome_dia: exception.titulo,
          abre: exception.abre,
          fecha: exception.fecha
        };
      }

      const weekday = new Date(`${dateKey}T12:00:00`).getDay();
      const schedule = horariosByDay.get(weekday);
      if (!schedule || schedule.bloqueado) {
        return { closed: true, reason: schedule?.nome_dia ? `${schedule.nome_dia} bloqueado` : 'Dia sem atendimento', source: 'padrão semanal' };
      }
      return { closed: false, reason: schedule.nome_dia, source: 'padrão semanal', ...schedule };
    }

    function buildDay(dateKey) {
      const schedule = effectiveSchedule(dateKey);
      const base = {
        data: dateKey,
        label: new Date(`${dateKey}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }),
        aberto: Boolean(schedule && !schedule.closed),
        motivo: schedule?.reason || '',
        origem: schedule?.source || '',
        slots: []
      };

      if (!schedule || schedule.closed) return { ...base, status: 'fechado' };

      const startMin = timeToMinutes(schedule.abre);
      const endOfDay = timeToMinutes(schedule.fecha);
      if (startMin === null || endOfDay === null) {
        return { ...base, aberto: false, status: 'fechado', motivo: 'Horário incompleto' };
      }

      const duration = service ? service.tempo_estimado : 30;
      const buffer = service ? (service.tempo_buffer ?? 15) : 0;
      const step = duration + buffer;
      const weekday = new Date(`${dateKey}T12:00:00`).getDay();
      const dayIntervals = intervalos.filter((i) => i.dia_semana === weekday);

      for (let minutes = startMin; minutes + duration <= endOfDay; minutes += step) {
        const time = minutesToTime(minutes);
        const dateTime = `${dateKey}T${time}:00`;
        const slotStart = new Date(dateTime).getTime();
        const slotEnd = slotStart + duration * 60000;
        const past = new Date(dateTime) <= new Date();

        let inInterval = false;
        for (const interval of dayIntervals) {
          const intervalStart = timeToMinutes(interval.inicio);
          const intervalEnd = timeToMinutes(interval.fim);
          if (minutes < intervalEnd && (minutes + duration) > intervalStart) {
            inInterval = true;
            break;
          }
        }

        const conflict = service ? ocupadosRanges.some(([os, oe]) => slotStart < oe && slotEnd > os) : false;

        base.slots.push({
          hora: time,
          disponivel: Boolean(service && !past && !conflict && !inInterval),
          motivo: !service ? 'Escolha um serviço' : past ? 'Horário passado' : inInterval ? 'Intervalo' : conflict ? 'Ocupado' : 'Livre'
        });
      }

      const available = base.slots.filter((slot) => slot.disponivel).length;
      return { ...base, status: available ? 'disponivel' : 'lotado', disponiveis: available, total: base.slots.length };
    }

    const disponibilidade = Array.from({ length: days }, (_, index) => buildDay(addDays(start, index)));
    return sendJson(res, 200, { disponibilidade });
  } catch {
    return sendError(res, 500, 'Não foi possível calcular a disponibilidade.');
  }
}
