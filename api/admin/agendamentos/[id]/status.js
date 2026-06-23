import { getSql } from '../../../_lib/db.js';
import { requireAdmin } from '../../../_lib/auth.js';
import { sendJson, sendError, methodNotAllowed } from '../../../_lib/response.js';
import { isOfficialStatus } from '../../../_lib/validation.js';

export default async function handler(req, res) {
  if (req.method !== 'PATCH') return methodNotAllowed(res);

  const admin = requireAdmin(req, res);
  if (!admin) return null;

  const { id } = req.query;
  const { status } = req.body || {};

  if (!isOfficialStatus(status)) {
    return sendError(res, 400, 'Status inválido.');
  }

  const sql = getSql();
  const rows = await sql`
    UPDATE agendamentos
    SET status = ${status}
    WHERE id = ${id}
    RETURNING id, status
  `;

  if (!rows[0]) return sendError(res, 404, 'Agendamento não encontrado.');
  return sendJson(res, 200, { agendamento: rows[0] });
}
