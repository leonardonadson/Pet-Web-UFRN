import bcrypt from 'bcryptjs';
import { getSql } from '../_lib/db.js';
import { signToken } from '../_lib/auth.js';
import { sendJson, sendError, methodNotAllowed } from '../_lib/response.js';
import { isValidEmail } from '../_lib/validation.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);

  const { email, senha } = req.body || {};

  if (!isValidEmail(email) || !senha) {
    return sendError(res, 400, 'Informe e-mail e senha.');
  }

  const sql = getSql();
  const rows = await sql`
    SELECT id, nome, email, senha_hash, tipo_perfil
    FROM usuarios
    WHERE email = ${email}
    LIMIT 1
  `;

  const usuario = rows[0];
  const senhaOk = usuario ? await bcrypt.compare(senha, usuario.senha_hash) : false;

  if (!senhaOk) {
    return sendError(res, 401, 'Credenciais inválidas.');
  }

  const token = signToken(usuario);

  return sendJson(res, 200, {
    token,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      tipo_perfil: usuario.tipo_perfil
    }
  });
}
