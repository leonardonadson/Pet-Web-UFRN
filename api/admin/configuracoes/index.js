import { getSql } from '../../_lib/db.js';
import { requireAdmin } from '../../_lib/auth.js';
import { sendJson, sendError, methodNotAllowed } from '../../_lib/response.js';

export default async function handler(req, res) {
  const admin = requireAdmin(req, res);
  if (!admin) return null;

  const sql = getSql();

  if (req.method === 'GET') {
    try {
      const rows = await sql`SELECT chave, valor FROM configuracoes ORDER BY chave`;
      const configuracoes = Object.fromEntries(rows.map((r) => [r.chave, r.valor]));
      return sendJson(res, 200, { configuracoes });
    } catch {
      return sendError(res, 500, 'Não foi possível carregar as configurações.');
    }
  }

  if (req.method === 'PUT') {
    const capacidade = parseInt(req.body?.capacidade_simultanea, 10);
    if (Number.isNaN(capacidade) || capacidade < 1 || capacidade > 100) {
      return sendError(res, 400, 'Capacidade simultânea deve ser um número entre 1 e 100.');
    }
    await sql`
      INSERT INTO configuracoes (chave, valor)
      VALUES ('capacidade_simultanea', ${String(capacidade)})
      ON CONFLICT (chave) DO UPDATE SET valor = EXCLUDED.valor
    `;
    return sendJson(res, 200, { configuracoes: { capacidade_simultanea: String(capacidade) } });
  }

  return methodNotAllowed(res);
}
