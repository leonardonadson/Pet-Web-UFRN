import { getSql } from '../../_lib/db.js';
import { requireAdmin } from '../../_lib/auth.js';
import { sendJson, sendError, methodNotAllowed } from '../../_lib/response.js';

export default async function handler(req, res) {
  const admin = requireAdmin(req, res);
  if (!admin) return null;

  const sql = getSql();

  if (req.method === 'GET') {
    try {
      const tipos = await sql`SELECT id, nome, ativo FROM tipos_pet ORDER BY nome`;
      return sendJson(res, 200, { tipos });
    } catch {
      return sendError(res, 500, 'Não foi possível listar os tipos de pet.');
    }
  }

  if (req.method === 'POST') {
    const { nome, ativo } = req.body || {};
    if (!nome) return sendError(res, 400, 'Informe o nome do tipo de pet.');
    const rows = await sql`
      INSERT INTO tipos_pet (nome, ativo)
      VALUES (${nome}, ${ativo === false ? false : true})
      ON CONFLICT (nome) DO UPDATE SET ativo = EXCLUDED.ativo
      RETURNING id, nome, ativo
    `;
    return sendJson(res, 201, { tipo: rows[0] });
  }

  return methodNotAllowed(res);
}
