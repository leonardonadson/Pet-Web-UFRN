import { getSql } from '../_lib/db.js';
import { sendJson, sendError, methodNotAllowed } from '../_lib/response.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res);

  try {
    const sql = getSql();
    const tipos = await sql`
      SELECT id, nome, ativo
      FROM tipos_pet
      WHERE ativo = TRUE
      ORDER BY nome
    `;
    return sendJson(res, 200, { tipos });
  } catch {
    return sendError(res, 500, 'Não foi possível carregar os tipos de pet.');
  }
}
