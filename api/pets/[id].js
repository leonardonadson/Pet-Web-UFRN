import { getSql } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';
import { sendJson, sendError, methodNotAllowed } from '../_lib/response.js';

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return null;

  const { id } = req.query;
  const sql = getSql();

  if (req.method === 'PUT') {
    const { nome, especie, raca, porte, observacoes } = req.body || {};

    const rows = await sql`
      UPDATE pets
      SET nome = ${nome}, especie = ${especie}, raca = ${raca || null}, porte = ${porte || null}, observacoes = ${observacoes || null}
      WHERE id = ${id} AND id_usuario = ${user.id}
      RETURNING id, nome, especie, raca, porte, observacoes
    `;

    if (!rows[0]) return sendError(res, 404, 'Pet não encontrado.');
    return sendJson(res, 200, { pet: rows[0] });
  }

  if (req.method === 'DELETE') {
    const rows = await sql`
      DELETE FROM pets
      WHERE id = ${id} AND id_usuario = ${user.id}
      RETURNING id
    `;

    if (!rows[0]) return sendError(res, 404, 'Pet não encontrado.');
    return sendJson(res, 200, { ok: true });
  }

  return methodNotAllowed(res);
}
