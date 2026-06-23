import { getSql } from '../../_lib/db.js';
import { requireAuth } from '../../_lib/auth.js';
import { sendJson, sendError, methodNotAllowed } from '../../_lib/response.js';
import { validateBusinessDateAsync, hasConflictAsync } from '../../_lib/validation.js';

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return null;

  const sql = getSql();
  
  // Extract id from path (Vercel routes provide it in req.query usually)
  let id;
  if (req.query && req.query.id) {
    id = Number(req.query.id);
  } else {
    const parts = req.url.split('/');
    id = Number(parts[parts.length - 1]);
    if (isNaN(id)) {
      id = Number(parts[parts.length - 2]); // handle trailing slash
    }
  }

  if (req.method === 'PUT') {
    const { id_pet, id_servico, data_hora } = req.body || {};
    
    const existing = await sql`SELECT * FROM agendamentos WHERE id = ${id} AND id_usuario = ${user.id}`;
    if (!existing || existing.length === 0) {
      return sendError(res, 404, 'Agendamento não encontrado.');
    }
    
    if (existing[0].status !== 'Pendente') {
      return sendError(res, 400, 'Apenas agendamentos pendentes podem ser editados pelo cliente.');
    }

    const petId = id_pet ?? existing[0].id_pet;
    const servicoId = id_servico ?? existing[0].id_servico;
    const dataHora = data_hora ?? existing[0].data_hora;

    const pet = await sql`SELECT id FROM pets WHERE id = ${petId} AND id_usuario = ${user.id}`;
    if (!pet || pet.length === 0) return sendError(res, 403, 'Pet não pertence ao usuário autenticado.');

    const service = await sql`SELECT id FROM servicos WHERE id = ${servicoId} AND ativo = TRUE`;
    if (!service || service.length === 0) return sendError(res, 400, 'Serviço inválido ou inativo.');

    const dateError = await validateBusinessDateAsync(sql, dataHora);
    if (dateError) return sendError(res, 400, dateError);

    const isConflict = await hasConflictAsync(sql, dataHora, servicoId, id);
    if (isConflict) return sendError(res, 409, 'Horário indisponível para este serviço.');

    await sql`
      UPDATE agendamentos
      SET id_pet = ${petId}, id_servico = ${servicoId}, data_hora = ${dataHora}
      WHERE id = ${id}
    `;

    const updated = await sql`SELECT id, data_hora, status FROM agendamentos WHERE id = ${id}`;
    return sendJson(res, 200, { agendamento: updated[0] });
  }

  return methodNotAllowed(res);
}
