import { getSql } from '../../_lib/db.js';
import { requireAuth } from '../../_lib/auth.js';
import { sendJson, sendError, methodNotAllowed } from '../../_lib/response.js';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') return methodNotAllowed(res);

  const user = requireAuth(req, res);
  if (!user) return null;

  const { id } = req.query;
  const sql = getSql();

  const rows = await sql`
    UPDATE agendamentos
    SET status = 'Cancelado'
    WHERE id = ${id}
      AND id_usuario = ${user.id}
      AND status IN ('Pendente', 'Confirmado')
      AND data_hora > NOW() + INTERVAL '2 hours'
    RETURNING id, status
  `;

  if (!rows[0]) {
    return sendError(res, 400, 'Agendamento não pode ser cancelado.');
  }

  return sendJson(res, 200, { agendamento: rows[0] });
}
