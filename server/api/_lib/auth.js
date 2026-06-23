import jwt from 'jsonwebtoken';
import { sendError } from './response.js';

function getJwtSecret() {
  return process.env.JWT_SECRET || process.env.SECRET_KEY;
}

function getTokenExpiresIn() {
  const minutes = Number(process.env.ACCESS_TOKEN_EXPIRE_MINUTES);
  return Number.isFinite(minutes) && minutes > 0 ? `${minutes}m` : '7d';
}

export function signToken(usuario) {
  return jwt.sign(
    { id: usuario.id, tipo_perfil: usuario.tipo_perfil },
    getJwtSecret(),
    { expiresIn: getTokenExpiresIn() }
  );
}

export function getBearerToken(req) {
  const header = req.headers.authorization || '';
  const [type, token] = header.split(' ');
  return type === 'Bearer' ? token : null;
}

export function requireAuth(req, res) {
  const token = getBearerToken(req);

  if (!token) {
    sendError(res, 401, 'Token ausente.');
    return null;
  }

  try {
    return jwt.verify(token, getJwtSecret());
  } catch {
    sendError(res, 401, 'Token inválido ou expirado.');
    return null;
  }
}

export function requireAdmin(req, res) {
  const user = requireAuth(req, res);

  if (!user) return null;

  if (user.tipo_perfil !== 'admin') {
    sendError(res, 403, 'Acesso restrito ao administrador.');
    return null;
  }

  return user;
}
