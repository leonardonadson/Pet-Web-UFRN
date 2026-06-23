import { getSql } from '../_lib/db.js';
import { requireAuth } from '../_lib/auth.js';
import { sendJson, sendError, methodNotAllowed } from '../_lib/response.js';

export default async function handler(req, res) {
  const user = requireAuth(req, res);
  if (!user) return null;

  const sql = getSql();

  if (req.method === 'GET') {
    const pets = await sql`
      SELECT id, nome, especie, raca, porte, observacoes
      FROM pets
      WHERE id_usuario = ${user.id}
      ORDER BY nome
    `;
    return sendJson(res, 200, { pets });
  }

  if (req.method === 'POST') {
    const { nome, especie, raca, porte, observacoes } = req.body || {};

    if (!nome || !especie) {
      return sendError(res, 400, 'Informe nome e espécie do pet.');
    }

    const rows = await sql`
      INSERT INTO pets (id_usuario, nome, especie, raca, porte, observacoes)
      VALUES (${user.id}, ${nome}, ${especie}, ${raca || null}, ${porte || null}, ${observacoes || null})
      RETURNING id, nome, especie, raca, porte, observacoes
    `;

    return sendJson(res, 201, { pet: rows[0] });
  }

  return methodNotAllowed(res);
}
