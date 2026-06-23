import { getSql } from '../../_lib/db.js';
import { requireAdmin } from '../../_lib/auth.js';
import { sendJson, sendError, methodNotAllowed } from '../../_lib/response.js';

export default async function handler(req, res) {
  const admin = requireAdmin(req, res);
  if (!admin) return null;

  const { id } = req.query;
  const sql = getSql();

  if (req.method === 'PUT' || req.method === 'PATCH') {
    const currentRows = await sql`SELECT * FROM tipos_pet WHERE id = ${id}`;
    const current = currentRows[0];
    if (!current) return sendError(res, 404, 'Tipo de pet não encontrado.');

    const { nome, ativo } = req.body || {};
    const rows = await sql`
      UPDATE tipos_pet
      SET nome = ${nome ?? current.nome},
          ativo = ${ativo === undefined ? current.ativo : Boolean(ativo)}
      WHERE id = ${id}
      RETURNING id, nome, ativo
    `;
    return sendJson(res, 200, { tipo: rows[0] });
  }

  if (req.method === 'DELETE') {
    const currentRows = await sql`SELECT * FROM tipos_pet WHERE id = ${id}`;
    const current = currentRows[0];
    if (!current) return sendError(res, 404, 'Tipo de pet não encontrado.');

    const usage = await sql`SELECT COUNT(*)::int AS total FROM pets WHERE especie = ${current.nome}`;
    if (usage[0].total > 0) {
      await sql`UPDATE tipos_pet SET ativo = FALSE WHERE id = ${id}`;
      return sendJson(res, 200, { ok: true, mode: 'inactivated' });
    }
    await sql`DELETE FROM tipos_pet WHERE id = ${id}`;
    return sendJson(res, 200, { ok: true, mode: 'deleted' });
  }

  return methodNotAllowed(res);
}
