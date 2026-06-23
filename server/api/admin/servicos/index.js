import { getSql } from '../../_lib/db.js';
import { requireAdmin } from '../../_lib/auth.js';
import { sendJson, sendError, methodNotAllowed } from '../../_lib/response.js';

export default async function handler(req, res) {
  const admin = requireAdmin(req, res);
  if (!admin) return null;

  const sql = getSql();

  if (req.method === 'GET') {
    try {
      const servicos = await sql`
        SELECT id, nome, descricao, preco, tempo_estimado, tempo_buffer, icone, ativo
        FROM servicos
        ORDER BY nome
      `;
      return sendJson(res, 200, { servicos });
    } catch {
      return sendError(res, 500, 'Não foi possível listar os serviços.');
    }
  }

  if (req.method === 'POST') {
    const { nome, descricao, preco, tempo_estimado, tempo_buffer, icone, ativo } = req.body || {};
    if (!nome || !preco || !tempo_estimado) {
      return sendError(res, 400, 'Informe nome, preço e duração.');
    }
    try {
      const rows = await sql`
        INSERT INTO servicos (nome, descricao, preco, tempo_estimado, tempo_buffer, icone, ativo)
        VALUES (${nome}, ${descricao ?? null}, ${Number(preco)}, ${Number(tempo_estimado)}, ${Number(tempo_buffer ?? 15)}, ${icone || 'paw'}, ${ativo ? true : false})
        RETURNING id, nome, descricao, preco, tempo_estimado, tempo_buffer, icone, ativo
      `;
      return sendJson(res, 201, { servico: rows[0] });
    } catch (error) {
      if (String(error.message).includes('duplicate key')) return sendError(res, 409, 'Já existe um serviço com este nome.');
      return sendError(res, 500, 'Não foi possível criar o serviço.');
    }
  }

  return methodNotAllowed(res);
}
