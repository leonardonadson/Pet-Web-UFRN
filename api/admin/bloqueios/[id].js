import { getSql } from '../../_lib/db.js';
import { requireAdmin } from '../../_lib/auth.js';
import { sendJson, sendError, methodNotAllowed } from '../../_lib/response.js';

export default async function handler(req, res) {
  const admin = requireAdmin(req, res);
  if (!admin) return null;

  if (req.method !== 'DELETE') return methodNotAllowed(res);

  const { id } = req.query;
  const sql = getSql();
  const rows = await sql`DELETE FROM excecoes_funcionamento WHERE id = ${id} RETURNING id`;
  if (!rows[0]) return sendError(res, 404, 'Bloqueio não encontrado.');
  return sendJson(res, 200, { ok: true });
}
