import { getSql } from '../../_lib/db.js';
import { requireAdmin } from '../../_lib/auth.js';
import { sendJson, sendError, methodNotAllowed } from '../../_lib/response.js';
import { isValidEmail } from '../../_lib/validation.js';

export default async function handler(req, res) {
  const admin = requireAdmin(req, res);
  if (!admin) return null;

  const { id } = req.query;
  const sql = getSql();

  if (req.method === 'PUT' || req.method === 'PATCH') {
    const currentRows = await sql`
      SELECT id, nome, email, telefone, tipo_perfil, criado_em
      FROM usuarios
      WHERE id = ${id}
      LIMIT 1
    `;
    const current = currentRows[0];
    if (!current) return sendError(res, 404, 'Cliente não encontrado.');

    const { nome, email, telefone, tipo_perfil } = req.body || {};
    const nextNome = String(nome ?? current.nome).trim();
    const nextEmail = String(email ?? current.email).trim();
    const nextPerfil = tipo_perfil ?? current.tipo_perfil;

    if (!nextNome || !nextEmail) return sendError(res, 400, 'Informe nome e e-mail.');
    if (!isValidEmail(nextEmail)) return sendError(res, 400, 'E-mail inválido.');
    if (!['cliente', 'admin'].includes(nextPerfil)) return sendError(res, 400, 'Perfil inválido.');

    const duplicate = await sql`
      SELECT id
      FROM usuarios
      WHERE email = ${nextEmail} AND id <> ${id}
      LIMIT 1
    `;
    if (duplicate[0]) return sendError(res, 409, 'Já existe um usuário com este e-mail.');

    const rows = await sql`
      UPDATE usuarios
      SET nome = ${nextNome},
          email = ${nextEmail},
          telefone = ${telefone ?? current.telefone},
          tipo_perfil = ${nextPerfil}
      WHERE id = ${id}
      RETURNING id, nome, email, telefone, tipo_perfil, criado_em
    `;

    return sendJson(res, 200, { usuario: rows[0] });
  }

  if (req.method === 'DELETE') {
    const rows = await sql`
      DELETE FROM usuarios
      WHERE id = ${id} AND tipo_perfil = 'cliente'
      RETURNING id
    `;

    if (!rows[0]) return sendError(res, 404, 'Cliente não encontrado ou não pode ser excluído.');
    return sendJson(res, 200, { ok: true });
  }

  return methodNotAllowed(res);
}
