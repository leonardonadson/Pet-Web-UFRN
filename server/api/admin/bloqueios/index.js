import { getSql } from '../../_lib/db.js';
import { requireAdmin } from '../../_lib/auth.js';
import { sendJson, sendError, methodNotAllowed } from '../../_lib/response.js';

export default async function handler(req, res) {
  const admin = requireAdmin(req, res);
  if (!admin) return null;

  const sql = getSql();

  if (req.method === 'GET') {
    try {
      const bloqueios = await sql`SELECT * FROM excecoes_funcionamento ORDER BY data ASC, id ASC`;
      return sendJson(res, 200, { bloqueios });
    } catch {
      return sendError(res, 500, 'Não foi possível listar os bloqueios.');
    }
  }

  if (req.method === 'POST') {
    const { data, titulo, tipo, abre, fecha, ultimo_inicio, recorrente_anual } = req.body || {};
    if (!data || !titulo) return sendError(res, 400, 'Informe data e título.');
    if (!['fechado', 'horario_especial'].includes(tipo)) return sendError(res, 400, 'Tipo inválido.');
    if (tipo === 'horario_especial' && (!abre || !fecha || !ultimo_inicio)) {
      return sendError(res, 400, 'Horário especial precisa de abertura, fechamento e último início.');
    }
    const rows = await sql`
      INSERT INTO excecoes_funcionamento (data, titulo, tipo, abre, fecha, ultimo_inicio, recorrente_anual)
      VALUES (${data}, ${titulo}, ${tipo}, ${abre || null}, ${fecha || null}, ${ultimo_inicio || null}, ${recorrente_anual ? true : false})
      RETURNING *
    `;
    return sendJson(res, 201, { bloqueio: rows[0] });
  }

  return methodNotAllowed(res);
}
