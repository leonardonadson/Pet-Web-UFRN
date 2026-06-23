import { getSql } from '../_lib/db.js';
import { sendJson, sendError, methodNotAllowed } from '../_lib/response.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res);

  try {
    const sql = getSql();
    const horarios = await sql`
      SELECT dia_semana, nome_dia, abre, fecha, ultimo_inicio, bloqueado
      FROM horarios_funcionamento
      ORDER BY dia_semana
    `;
    return sendJson(res, 200, { horarios });
  } catch {
    return sendError(res, 500, 'Não foi possível carregar os horários de funcionamento.');
  }
}
