import { randomBytes, scryptSync, timingSafeEqual, createHmac } from 'node:crypto';
import pg from 'pg';

const { Pool } = pg;

const rawDatabaseUrl = process.env.DATABASE_URL || '';
const databaseUrl = rawDatabaseUrl.replace(/^postgresql\+asyncpg:\/\//, 'postgresql://');
const schemaName = process.env.DB_SCHEMA || 'public';
const tokenSecret = process.env.SECRET_KEY || process.env.JWT_SECRET || 'petweb-dev-secret';
const tokenExpiresInMinutes = Number(process.env.ACCESS_TOKEN_EXPIRE_MINUTES || 60 * 24);
const corsOrigin = normalizeOrigin(process.env.CORS_ORIGIN || '');

if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(schemaName)) {
  throw new Error('DB_SCHEMA deve conter apenas letras, números e underscore, começando por letra ou underscore.');
}

const quotedSchema = quoteIdentifier(schemaName);
const usersTable = `${quotedSchema}.usuarios`;

let pool;
let initPromise;

function getPool() {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL não configurada.');
  }

  if (!pool) {
    const parsedUrl = new URL(databaseUrl);
    const shouldUseSsl = !['localhost', '127.0.0.1'].includes(parsedUrl.hostname);

    pool = new Pool({
      connectionString: databaseUrl,
      ssl: shouldUseSsl ? { rejectUnauthorized: false } : false
    });
  }

  return pool;
}

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function normalizeOrigin(value) {
  return String(value).trim().replace(/\/+$/, '');
}

async function query(sql, params = []) {
  await ensureDb();
  return getPool().query(sql, params);
}

async function ensureDb() {
  if (!initPromise) {
    initPromise = initDb().catch((error) => {
      initPromise = null;
      throw error;
    });
  }

  return initPromise;
}

async function initDb() {
  const db = getPool();

  if (process.env.DB_AUTO_CREATE_SCHEMA === 'true') {
    await db.query(`CREATE SCHEMA IF NOT EXISTS ${quotedSchema}`);
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS ${usersTable} (
      id SERIAL PRIMARY KEY,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha_hash TEXT NOT NULL,
      telefone TEXT,
      tipo_perfil TEXT DEFAULT 'cliente' CHECK (tipo_perfil IN ('cliente', 'admin')),
      criado_em TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await db.query(`CREATE INDEX IF NOT EXISTS idx_usuarios_email ON ${usersTable} (email)`);

  const adminEmail = process.env.ADMIN_EMAIL || '';
  const adminPassword = process.env.ADMIN_PASSWORD || '';
  const adminName = process.env.ADMIN_NAME || 'Administrador PetWeb';
  const adminPhone = process.env.ADMIN_PHONE || '(85) 99999-0000';

  if (!adminEmail || !adminPassword) return;

  const existingAdmin = await db.query(`SELECT id FROM ${usersTable} WHERE email = $1 LIMIT 1`, [adminEmail]);
  if (!existingAdmin.rowCount) {
    await db.query(
      `INSERT INTO ${usersTable} (nome, email, senha_hash, telefone, tipo_perfil)
       VALUES ($1, $2, $3, $4, 'admin')`,
      [adminName, adminEmail, hashPassword(adminPassword), adminPhone]
    );
  }
}

function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || !stored.includes(':')) return false;
  const [salt, hash] = stored.split(':');
  const actual = Buffer.from(hash, 'hex');
  const expected = scryptSync(password, salt, 64);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function base64url(input) {
  return Buffer.from(JSON.stringify(input)).toString('base64url');
}

function signToken(header, payload) {
  return createHmac('sha256', tokenSecret)
    .update(`${header}.${payload}`)
    .digest('base64url');
}

function makeToken(user) {
  const header = base64url({ alg: 'HS256', typ: 'JWT' });
  const payload = base64url({
    id: user.id,
    tipo_perfil: user.tipo_perfil,
    exp: Math.floor(Date.now() / 1000) + tokenExpiresInMinutes * 60
  });
  return `${header}.${payload}.${signToken(header, payload)}`;
}

function readToken(token) {
  if (!token) return null;
  const [header, payload, signature] = token.split('.');
  if (!header || !payload || !signature) return null;

  const expected = signToken(header, payload);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (data.exp && data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

async function getUser(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  const payload = readToken(token);
  if (!payload?.id) return null;

  const result = await query(`SELECT * FROM ${usersTable} WHERE id = $1 LIMIT 1`, [payload.id]);
  return result.rows[0] || null;
}

function publicUser(user) {
  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    telefone: user.telefone,
    tipo_perfil: user.tipo_perfil,
    criado_em: user.criado_em
  };
}

function sendJson(res, statusCode, body) {
  const headers = { 'Content-Type': 'application/json; charset=utf-8' };
  if (corsOrigin) {
    headers['Access-Control-Allow-Origin'] = corsOrigin;
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
  }

  res.status(statusCode).setHeader('Content-Type', headers['Content-Type']);
  Object.entries(headers).forEach(([key, value]) => res.setHeader(key, value));
  res.end(JSON.stringify(body));
}

async function readBody(req) {
  let body;
  try {
    body = req.body;
  } catch {
    return {};
  }

  if (body && typeof body === 'object') return body;
  if (typeof body === 'string') {
    try {
      return JSON.parse(body);
    } catch {
      return {};
    }
  }

  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (chunk) => { raw += chunk; });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        resolve({});
      }
    });
  });
}

async function requireAdmin(req, res) {
  const user = await getUser(req);
  if (!user) {
    sendJson(res, 401, { error: 'Token ausente ou inválido.' });
    return null;
  }
  if (user.tipo_perfil !== 'admin') {
    sendJson(res, 403, { error: 'Acesso restrito ao administrador.' });
    return null;
  }
  return user;
}

async function handleRoute(req, res, pathname) {
  if (req.method === 'OPTIONS') {
    return sendJson(res, 204, {});
  }

  if (pathname === '/api/health' && req.method === 'GET') {
    await ensureDb();
    return sendJson(res, 200, { status: 'ok', service: 'PetWeb API Vercel Postgres' });
  }

  if (pathname === '/api/auth/login' && req.method === 'POST') {
    const body = await readBody(req);
    const email = String(body.email || '').trim().toLowerCase();
    const result = await query(`SELECT * FROM ${usersTable} WHERE lower(email) = $1 LIMIT 1`, [email]);
    const user = result.rows[0];

    if (!user || !verifyPassword(body.senha || '', user.senha_hash)) {
      return sendJson(res, 401, { error: 'Credenciais inválidas.' });
    }

    return sendJson(res, 200, { token: makeToken(user), usuario: publicUser(user) });
  }

  if (pathname === '/api/auth/cadastro' && req.method === 'POST') {
    const body = await readBody(req);
    const nome = String(body.nome || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const telefone = String(body.telefone || '').trim();
    const senha = String(body.senha || '');

    if (!nome || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || senha.length < 8) {
      return sendJson(res, 400, { error: 'Informe nome, e-mail válido e senha com pelo menos 8 caracteres.' });
    }

    const duplicate = await query(`SELECT id FROM ${usersTable} WHERE lower(email) = $1 LIMIT 1`, [email]);
    if (duplicate.rowCount) {
      return sendJson(res, 409, { error: 'E-mail já cadastrado.' });
    }

    const result = await query(
      `INSERT INTO ${usersTable} (nome, email, telefone, senha_hash, tipo_perfil)
       VALUES ($1, $2, $3, $4, 'cliente')
       RETURNING id, nome, email, telefone, tipo_perfil, criado_em`,
      [nome, email, telefone, hashPassword(senha)]
    );
    const user = result.rows[0];

    return sendJson(res, 201, { token: makeToken(user), usuario: publicUser(user) });
  }

  if (pathname === '/api/me' && req.method === 'GET') {
    const user = await getUser(req);
    if (!user) return sendJson(res, 401, { error: 'Token ausente ou inválido.' });
    return sendJson(res, 200, { usuario: publicUser(user) });
  }

  if (pathname.startsWith('/api/admin/')) {
    const admin = await requireAdmin(req, res);
    if (!admin) return null;

    if (pathname === '/api/admin/usuarios' && req.method === 'GET') {
      const result = await query(
        `SELECT id, nome, email, telefone, tipo_perfil, criado_em
         FROM ${usersTable}
         ORDER BY nome`
      );
      return sendJson(res, 200, { usuarios: result.rows });
    }

    if (pathname === '/api/admin/usuarios' && req.method === 'POST') {
      const body = await readBody(req);
      const nome = String(body.nome || '').trim();
      const email = String(body.email || '').trim().toLowerCase();
      const telefone = String(body.telefone || '').trim();
      const tipoPerfil = body.tipo_perfil || 'cliente';
      const senha = String(body.senha || 'PetWeb@123');

      if (!nome || !email) return sendJson(res, 400, { error: 'Informe nome e e-mail.' });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendJson(res, 400, { error: 'E-mail inválido.' });
      if (!['cliente', 'admin'].includes(tipoPerfil)) return sendJson(res, 400, { error: 'Perfil inválido.' });

      const duplicate = await query(`SELECT id FROM ${usersTable} WHERE lower(email) = $1 LIMIT 1`, [email]);
      if (duplicate.rowCount) return sendJson(res, 409, { error: 'Já existe um usuário com este e-mail.' });

      const result = await query(
        `INSERT INTO ${usersTable} (nome, email, telefone, senha_hash, tipo_perfil)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, nome, email, telefone, tipo_perfil, criado_em`,
        [nome, email, telefone, hashPassword(senha), tipoPerfil]
      );

      return sendJson(res, 201, { usuario: result.rows[0] });
    }

    const userMatch = pathname.match(/^\/api\/admin\/usuarios\/(\d+)$/);
    if (userMatch && ['PUT', 'PATCH'].includes(req.method)) {
      const id = Number(userMatch[1]);
      const currentResult = await query(`SELECT * FROM ${usersTable} WHERE id = $1 LIMIT 1`, [id]);
      const current = currentResult.rows[0];
      if (!current) return sendJson(res, 404, { error: 'Cliente não encontrado.' });

      const body = await readBody(req);
      const nome = String(body.nome ?? current.nome).trim();
      const email = String(body.email ?? current.email).trim().toLowerCase();
      const telefone = String(body.telefone ?? current.telefone ?? '').trim();
      const tipoPerfil = body.tipo_perfil ?? current.tipo_perfil;

      if (!nome || !email) return sendJson(res, 400, { error: 'Informe nome e e-mail.' });
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendJson(res, 400, { error: 'E-mail inválido.' });
      if (!['cliente', 'admin'].includes(tipoPerfil)) return sendJson(res, 400, { error: 'Perfil inválido.' });

      const duplicate = await query(`SELECT id FROM ${usersTable} WHERE lower(email) = $1 AND id <> $2 LIMIT 1`, [email, id]);
      if (duplicate.rowCount) return sendJson(res, 409, { error: 'Já existe um usuário com este e-mail.' });

      const result = await query(
        `UPDATE ${usersTable}
         SET nome = $1, email = $2, telefone = $3, tipo_perfil = $4
         WHERE id = $5
         RETURNING id, nome, email, telefone, tipo_perfil, criado_em`,
        [nome, email, telefone, tipoPerfil, id]
      );

      return sendJson(res, 200, { usuario: result.rows[0] });
    }

    if (userMatch && req.method === 'DELETE') {
      const id = Number(userMatch[1]);
      const currentResult = await query(`SELECT * FROM ${usersTable} WHERE id = $1 LIMIT 1`, [id]);
      const current = currentResult.rows[0];

      if (!current) return sendJson(res, 404, { error: 'Cliente não encontrado.' });
      if (current.tipo_perfil !== 'cliente') return sendJson(res, 400, { error: 'Exclusão permitida apenas para clientes.' });
      if (id === Number(admin.id)) return sendJson(res, 400, { error: 'Você não pode excluir o próprio usuário.' });

      await query(`DELETE FROM ${usersTable} WHERE id = $1`, [id]);
      return sendJson(res, 200, { ok: true });
    }
  }

  return sendJson(res, 404, { error: 'Rota não encontrada.' });
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `https://${req.headers.host || 'localhost'}`);
    const rewrittenPath = url.searchParams.get('path');
    const pathname = rewrittenPath ? `/api/${rewrittenPath.replace(/^\/+/, '')}` : url.pathname;
    await handleRoute(req, res, pathname);
  } catch (error) {
    console.error(error);
    sendJson(res, 500, { error: 'Erro interno na API.' });
  }
}
