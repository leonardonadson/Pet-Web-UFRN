import bcrypt from 'bcryptjs';
import { getSql } from '../_lib/db.js';
import { sendJson, sendError, methodNotAllowed } from '../_lib/response.js';
import { isValidEmail, isStrongEnoughPassword } from '../_lib/validation.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return methodNotAllowed(res);

  const { nome, email, telefone, senha } = req.body || {};

  if (!nome || !isValidEmail(email) || !isStrongEnoughPassword(senha)) {
    return sendError(res, 400, 'Informe nome, e-mail válido e senha com pelo menos 8 caracteres, letra e número.');
  }

  const sql = getSql();
  const senhaHash = await bcrypt.hash(senha, 10);

  try {
    const rows = await sql`
      INSERT INTO usuarios (nome, email, telefone, senha_hash, tipo_perfil)
      VALUES (${nome}, ${email}, ${telefone || null}, ${senhaHash}, 'cliente')
      RETURNING id, nome, email, telefone, tipo_perfil
    `;

    return sendJson(res, 201, { usuario: rows[0] });
  } catch (error) {
    if (String(error.message).includes('duplicate key')) {
      return sendError(res, 409, 'E-mail já cadastrado.');
    }

    return sendError(res, 500, 'Não foi possível criar o cadastro.');
  }
}
