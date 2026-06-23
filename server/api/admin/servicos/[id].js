import { getSql } from '../../_lib/db.js';
import { requireAdmin } from '../../_lib/auth.js';
import { sendJson, sendError, methodNotAllowed } from '../../_lib/response.js';

export default async function handler(req, res) {
  const admin = requireAdmin(req, res);
  if (!admin) return null;

  const { id } = req.query;
  const sql = getSql();

  if (req.method === 'PUT' || req.method === 'PATCH') {
    const currentRows = await sql`SELECT * FROM servicos WHERE id = ${id}`;
    const current = currentRows[0];
    if (!current) return sendError(res, 404, 'Serviço não encontrado.');

    const { nome, descricao, preco, tempo_estimado, tempo_buffer, icone, ativo } = req.body || {};
    const rows = await sql`
      UPDATE servicos
      SET nome = ${nome ?? current.nome},
          descricao = ${descricao ?? current.descricao},
          preco = ${Number(preco ?? current.preco)},
          tempo_estimado = ${Number(tempo_estimado ?? current.tempo_estimado)},
          tempo_buffer = ${Number(tempo_buffer ?? current.tempo_buffer)},
          icone = ${icone ?? current.icone ?? 'paw'},
          ativo = ${ativo === undefined ? current.ativo : Boolean(ativo)}
      WHERE id = ${id}
      RETURNING id, nome, descricao, preco, tempo_estimado, tempo_buffer, icone, ativo
    `;
    return sendJson(res, 200, { servico: rows[0] });
  }

  if (req.method === 'DELETE') {
    const existing = await sql`SELECT id FROM servicos WHERE id = ${id}`;
    if (!existing[0]) return sendError(res, 404, 'Serviço não encontrado.');

    const usage = await sql`SELECT COUNT(*)::int AS total FROM agendamentos WHERE id_servico = ${id}`;
    if (usage[0].total > 0) {
      await sql`UPDATE servicos SET ativo = FALSE WHERE id = ${id}`;
      return sendJson(res, 200, { ok: true, mode: 'inactivated' });
    }
    await sql`DELETE FROM servicos WHERE id = ${id}`;
    return sendJson(res, 200, { ok: true, mode: 'deleted' });
  }

  return methodNotAllowed(res);
}
