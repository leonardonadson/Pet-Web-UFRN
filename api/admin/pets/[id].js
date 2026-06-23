import { getSql } from '../../_lib/db.js';
import { requireAdmin } from '../../_lib/auth.js';
import { sendJson, sendError, methodNotAllowed } from '../../_lib/response.js';

export default async function handler(req, res) {
  const admin = requireAdmin(req, res);
  if (!admin) return null;

  const { id } = req.query;
  const sql = getSql();

  if (req.method === 'PUT' || req.method === 'PATCH') {
    const currentRows = await sql`
      SELECT id, nome, especie, raca, porte, observacoes
      FROM pets
      WHERE id = ${id}
      LIMIT 1
    `;
    const current = currentRows[0];
    if (!current) return sendError(res, 404, 'Pet não encontrado.');

    const { nome, especie, raca, porte, observacoes } = req.body || {};
    const nextNome = String(nome ?? current.nome).trim();
    const nextEspecie = String(especie ?? current.especie).trim();

    if (!nextNome || !nextEspecie) return sendError(res, 400, 'Informe nome e espécie do pet.');

    const rows = await sql`
      UPDATE pets
      SET nome = ${nextNome},
          especie = ${nextEspecie},
          raca = ${raca ?? current.raca},
          porte = ${porte ?? current.porte},
          observacoes = ${observacoes ?? current.observacoes}
      WHERE id = ${id}
      RETURNING id, id_usuario, nome, especie, raca, porte, observacoes
    `;

    return sendJson(res, 200, { pet: rows[0] });
  }

  if (req.method === 'DELETE') {
    const rows = await sql`
      DELETE FROM pets
      WHERE id = ${id}
      RETURNING id
    `;

    if (!rows[0]) return sendError(res, 404, 'Pet não encontrado.');
    return sendJson(res, 200, { ok: true });
  }

  return methodNotAllowed(res);
}
