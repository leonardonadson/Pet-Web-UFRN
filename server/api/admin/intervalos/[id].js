import { getSql } from '../../_lib/db.js';
import { requireAdmin } from '../../_lib/auth.js';
import { sendJson, sendError, methodNotAllowed } from '../../_lib/response.js';

export default async function handler(req, res) {
  const admin = requireAdmin(req, res);
  if (!admin) return null;

  const sql = getSql();
  
  let id;
  if (req.query && req.query.id) {
    id = Number(req.query.id);
  } else {
    const parts = req.url.split('/');
    id = Number(parts[parts.length - 1]);
    if (isNaN(id)) {
      id = Number(parts[parts.length - 2]);
    }
  }

  if (req.method === 'DELETE') {
    try {
      await sql`DELETE FROM intervalos_indisponiveis WHERE id = ${id}`;
      return sendJson(res, 200, { ok: true });
    } catch (err) {
      console.error(err);
      return sendError(res, 500, 'Não foi possível remover intervalo.');
    }
  }

  return methodNotAllowed(res);
}
