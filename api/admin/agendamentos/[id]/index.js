import { getSql } from '../../../_lib/db.js';
import { requireAdmin } from '../../../_lib/auth.js';
import { sendJson, sendError, methodNotAllowed } from '../../../_lib/response.js';
import { validateBusinessDateAsync, hasConflictAsync, STATUSES } from '../../../_lib/validation.js';

export default async function handler(req, res) {
  const admin = requireAdmin(req, res);
  if (!admin) return null;

  const sql = getSql();
  
  let id;
  if (req.query && req.query.id) {
    id = Number(req.query.id);
  } else {
    const parts = req.url.split('/');
    id = Number(parts[parts.length - 1]) || Number(parts[parts.length - 2]);
  }

  if (req.method === 'PUT') {
    const { id_pet, id_servico, data_hora, status } = req.body || {};
    
    const existing = await sql`SELECT * FROM agendamentos WHERE id = ${id}`;
    if (!existing || existing.length === 0) {
      return sendError(res, 404, 'Agendamento não encontrado.');
    }

    const petId = id_pet ?? existing[0].id_pet;
    const servicoId = id_servico ?? existing[0].id_servico;
    const dataHora = data_hora ?? existing[0].data_hora;
    const newStatus = status ?? existing[0].status;

    if (!STATUSES.includes(newStatus)) return sendError(res, 400, 'Status inválido.');

    const dateError = await validateBusinessDateAsync(sql, dataHora);
    if (dateError) return sendError(res, 400, dateError);

    const isConflict = await hasConflictAsync(sql, dataHora, servicoId, id);
    if (isConflict) return sendError(res, 409, 'Horário indisponível para este serviço.');

    await sql`
      UPDATE agendamentos
      SET id_pet = ${petId}, id_servico = ${servicoId}, data_hora = ${dataHora}, status = ${newStatus}
      WHERE id = ${id}
    `;

    const updated = await sql`SELECT id, data_hora, status FROM agendamentos WHERE id = ${id}`;
    return sendJson(res, 200, { agendamento: updated[0] });
  }

  if (req.method === 'DELETE') {
    await sql`DELETE FROM agendamentos WHERE id = ${id}`;
    return sendJson(res, 200, { ok: true });
  }

  return methodNotAllowed(res);
}
