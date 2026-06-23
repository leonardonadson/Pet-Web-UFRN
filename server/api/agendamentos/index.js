import { getSql } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';
import { sendJson, sendError, methodNotAllowed } from '../_lib/response.js';
import { parseAppointmentDate, validateBusinessDateAsync, hasConflictAsync } from '../_lib/validation.js';

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return null;

  const sql = getSql();

  if (req.method === 'GET') {
    const agendamentos = await sql`
      SELECT a.id, a.data_hora, a.status, p.nome AS pet, s.nome AS servico, s.preco, s.tempo_estimado
      FROM agendamentos a
      JOIN pets p ON p.id = a.id_pet
      JOIN servicos s ON s.id = a.id_servico
      WHERE a.id_usuario = ${user.id}
      ORDER BY a.data_hora DESC
    `;
    return sendJson(res, 200, { agendamentos });
  }

  if (req.method === 'POST') {
    const { id_pet, id_servico, data_hora } = req.body || {};
    const date = parseAppointmentDate(data_hora);
    
    if (!id_pet || !id_servico || !date) {
      return sendError(res, 400, 'Informe pet, serviço e horário válidos.');
    }

    const dateError = await validateBusinessDateAsync(sql, data_hora);
    if (dateError) return sendError(res, 400, dateError);

    const isConflict = await hasConflictAsync(sql, data_hora, id_servico);
    if (isConflict) return sendError(res, 409, 'Horário indisponível para este serviço.');

    const rows = await sql`
      INSERT INTO agendamentos (id_usuario, id_pet, id_servico, data_hora, status)
      VALUES (${user.id}, ${id_pet}, ${id_servico}, ${data_hora}, 'Pendente')
      RETURNING id, data_hora, status
    `;

    return sendJson(res, 201, { agendamento: rows[0] });
  }

  return methodNotAllowed(res);
}
