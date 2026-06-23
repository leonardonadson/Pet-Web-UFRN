import { getSql } from '../../_lib/db.js';
import { requireAdmin } from '../../_lib/auth.js';
import { sendJson, sendError, methodNotAllowed } from '../../_lib/response.js';

export default async function handler(req, res) {
  const admin = requireAdmin(req, res);
  if (!admin) return null;

  const sql = getSql();

  if (req.method === 'GET') {
    const intervalos = await sql`
      SELECT * FROM intervalos_indisponiveis ORDER BY dia_semana, inicio
    `;
    return sendJson(res, 200, { intervalos });
  }

  if (req.method === 'POST') {
    const { titulo, inicio, fim, dias } = req.body || {};
    
    if (!titulo || !inicio || !fim || !dias || !Array.isArray(dias) || !dias.length) {
      return sendError(res, 400, 'Informe título, início, fim e pelo menos um dia.');
    }

    try {
      // Postgres transaction is not easily available with simple template strings in this neon setup
      // but we can insert them one by one
      for (const dia of dias) {
        await sql`
          INSERT INTO intervalos_indisponiveis (dia_semana, titulo, inicio, fim, ativo)
          VALUES (${Number(dia)}, ${titulo}, ${inicio}, ${fim}, TRUE)
        `;
      }
      return sendJson(res, 201, { ok: true });
    } catch (err) {
      console.error(err);
      return sendError(res, 500, 'Não foi possível salvar intervalos.');
    }
  }

  return methodNotAllowed(res);
}
