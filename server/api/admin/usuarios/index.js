import bcrypt from 'bcryptjs';
import { getSql } from '../../_lib/db.js';
import { requireAdmin } from '../../_lib/auth.js';
import { sendJson, sendError, methodNotAllowed } from '../../_lib/response.js';
import { isValidEmail, isStrongEnoughPassword } from '../../_lib/validation.js';

export default async function handler(req, res) {
  const admin = requireAdmin(req, res);
  if (!admin) return null;

  const sql = getSql();

  if (req.method === 'GET') {
    try {
      const usuarios = await sql`
        SELECT id, nome, email, telefone, tipo_perfil, criado_em
        FROM usuarios
        ORDER BY nome
      `;

      return sendJson(res, 200, { usuarios });
    } catch {
      return sendError(res, 500, 'Não foi possível listar usuários.');
    }
  }

  if (req.method === 'POST') {
    const { nome, email, telefone, tipo_perfil, senha } = req.body || {};
    const nextNome = String(nome || '').trim();
    const nextEmail = String(email || '').trim();
    const nextPerfil = tipo_perfil || 'cliente';
    const nextSenha = senha || 'PetWeb@123';

    if (!nextNome || !isValidEmail(nextEmail)) {
      return sendError(res, 400, 'Informe nome e e-mail válido.');
    }

    if (!['cliente', 'admin'].includes(nextPerfil)) {
      return sendError(res, 400, 'Perfil inválido.');
    }

    if (!isStrongEnoughPassword(nextSenha)) {
      return sendError(res, 400, 'A senha deve ter pelo menos 8 caracteres, letra e número.');
    }

    const senhaHash = await bcrypt.hash(nextSenha, 10);

    try {
      const rows = await sql`
        INSERT INTO usuarios (nome, email, telefone, senha_hash, tipo_perfil)
        VALUES (${nextNome}, ${nextEmail}, ${telefone || null}, ${senhaHash}, ${nextPerfil})
        RETURNING id, nome, email, telefone, tipo_perfil, criado_em
      `;

      return sendJson(res, 201, { usuario: rows[0] });
    } catch (error) {
      if (String(error.message).includes('duplicate key')) {
        return sendError(res, 409, 'Já existe um usuário com este e-mail.');
      }

      return sendError(res, 500, 'Não foi possível criar o usuário.');
    }
  }

  return methodNotAllowed(res);
}
