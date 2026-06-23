import { getSql } from '../../_lib/db.js';
import { requireAdmin } from '../../_lib/auth.js';
import { sendJson, sendError, methodNotAllowed } from '../../_lib/response.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res);

  const admin = requireAdmin(req, res);
  if (!admin) return null;

  try {
    const sql = getSql();
    const pets = await sql`
      SELECT p.id, p.id_usuario, p.nome, p.especie, p.raca, p.porte, p.observacoes,
             u.nome AS tutor, u.email AS tutor_email
      FROM pets p
      JOIN usuarios u ON u.id = p.id_usuario
      ORDER BY u.nome, p.nome
    `;

    return sendJson(res, 200, { pets });
  } catch {
    return sendError(res, 500, 'Não foi possível listar pets.');
  }
}
