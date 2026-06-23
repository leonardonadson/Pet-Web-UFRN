import { getSql } from '../../_lib/db.js';
import { requireAdmin } from '../../_lib/auth.js';
import { sendJson, sendError, methodNotAllowed } from '../../_lib/response.js';

export default async function handler(req, res) {
  const admin = requireAdmin(req, res);
  if (!admin) return null;

  const sql = getSql();

  if (req.method === 'GET') {
    try {
      const horarios = await sql`SELECT * FROM horarios_funcionamento ORDER BY dia_semana`;
      return sendJson(res, 200, { horarios });
    } catch {
      return sendError(res, 500, 'Não foi possível listar os horários.');
    }
  }

  if (req.method === 'PUT') {
    const lista = Array.isArray(req.body?.horarios) ? req.body.horarios : [];
    for (const item of lista) {
      await sql`
        UPDATE horarios_funcionamento
        SET abre = ${item.abre || null},
            fecha = ${item.fecha || null},
            ultimo_inicio = ${item.ultimo_inicio || null},
            bloqueado = ${item.bloqueado ? true : false}
        WHERE dia_semana = ${Number(item.dia_semana)}
      `;
    }
    const horarios = await sql`SELECT * FROM horarios_funcionamento ORDER BY dia_semana`;
    return sendJson(res, 200, { horarios });
  }

  return methodNotAllowed(res);
}
