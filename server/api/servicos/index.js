import { getSql } from '../_lib/db.js';
import { sendJson, sendError, methodNotAllowed } from '../_lib/response.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res);

  try {
    const sql = getSql();
    const servicos = await sql`
      SELECT id, nome, descricao, preco, tempo_estimado, icone
      FROM servicos
      WHERE ativo = TRUE
      ORDER BY id
    `;

    return sendJson(res, 200, { servicos });
  } catch {
    return sendError(res, 500, 'Não foi possível listar os serviços.');
  }
}
