import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const root = process.cwd();
const dbFile = join(root, 'petweb-local.sqlite');
const basePort = Number(process.env.PORT || 3000);

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

function sqlValue(value) {
  if (value === null || value === undefined || value === '') return 'NULL';
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return `'${String(value).replaceAll("'", "''")}'`;
}

function runSql(sql) {
  execFileSync('sqlite3', [dbFile, sql], { encoding: 'utf8' });
}

function getRows(sql) {
  const output = execFileSync('sqlite3', ['-json', dbFile, sql], { encoding: 'utf8' });
  return output.trim() ? JSON.parse(output) : [];
}

function getOne(sql) {
  return getRows(sql)[0] || null;
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

function initDb() {
  runSql(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha_hash TEXT NOT NULL,
      telefone TEXT,
      tipo_perfil TEXT DEFAULT 'cliente' CHECK (tipo_perfil IN ('cliente', 'admin')),
      criado_em TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
  `);

  const admin = getOne("SELECT id FROM usuarios WHERE email = 'admin@petweb.com'");
  if (!admin) {
    runSql(`
      INSERT INTO usuarios (nome, email, senha_hash, telefone, tipo_perfil)
      VALUES ('Administrador PetWeb', 'admin@petweb.com', ${sqlValue(hashPassword('Admin@123'))}, '(85) 99999-0000', 'admin');
    `);
  }
}

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(body));
}

function readBody(req) {
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

function makeToken(user) {
  return Buffer.from(JSON.stringify({ id: user.id, tipo_perfil: user.tipo_perfil })).toString('base64url');
}

function getUser(req) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return null;

  try {
    const payload = JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
    return getOne(`SELECT * FROM usuarios WHERE id = ${sqlValue(Number(payload.id))}`);
  } catch {
    return null;
  }
}

function requireAdmin(req, res) {
  const user = getUser(req);
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

async function handleApi(req, res, url) {
  if (url.pathname === '/api/health' && req.method === 'GET') {
    return sendJson(res, 200, { status: 'ok', service: 'PetWeb API Local SQLite (Entrega 1)' });
  }

  if (url.pathname === '/api/auth/login' && req.method === 'POST') {
    const body = await readBody(req);
    const user = getOne(`SELECT * FROM usuarios WHERE email = ${sqlValue(body.email)} LIMIT 1`);
    if (!user || !verifyPassword(body.senha || '', user.senha_hash)) {
      return sendJson(res, 401, { error: 'Credenciais inválidas.' });
    }
    return sendJson(res, 200, { token: makeToken(user), usuario: publicUser(user) });
  }

  if (url.pathname === '/api/auth/cadastro' && req.method === 'POST') {
    const body = await readBody(req);
    if (!body.nome || !body.email || !body.senha || body.senha.length < 8) {
      return sendJson(res, 400, { error: 'Informe nome, e-mail e senha com pelo menos 8 caracteres.' });
    }
    if (getOne(`SELECT id FROM usuarios WHERE email = ${sqlValue(body.email)} LIMIT 1`)) {
      return sendJson(res, 409, { error: 'E-mail já cadastrado.' });
    }
    runSql(`
      INSERT INTO usuarios (nome, email, telefone, senha_hash, tipo_perfil)
      VALUES (${sqlValue(body.nome)}, ${sqlValue(body.email)}, ${sqlValue(body.telefone)}, ${sqlValue(hashPassword(body.senha))}, 'cliente');
    `);
    const user = getOne(`SELECT * FROM usuarios WHERE email = ${sqlValue(body.email)} LIMIT 1`);
    return sendJson(res, 201, { token: makeToken(user), usuario: publicUser(user) });
  }

  const user = getUser(req);
  if (!user) return sendJson(res, 401, { error: 'Token ausente ou inválido.' });

  if (url.pathname === '/api/me' && req.method === 'GET') {
    return sendJson(res, 200, { usuario: publicUser(user) });
  }

  const admin = url.pathname.startsWith('/api/admin/') ? requireAdmin(req, res) : null;
  if (url.pathname.startsWith('/api/admin/') && !admin) return null;

  if (url.pathname === '/api/admin/usuarios' && req.method === 'GET') {
    return sendJson(res, 200, { usuarios: getRows('SELECT id, nome, email, telefone, tipo_perfil, criado_em FROM usuarios ORDER BY nome') });
  }

  if (url.pathname === '/api/admin/usuarios' && req.method === 'POST') {
    const body = await readBody(req);
    const nome = String(body.nome || '').trim();
    const email = String(body.email || '').trim();
    const telefone = String(body.telefone || '').trim();
    const tipoPerfil = body.tipo_perfil || 'cliente';
    const senha = body.senha || 'PetWeb@123';

    if (!nome || !email) return sendJson(res, 400, { error: 'Informe nome e e-mail.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendJson(res, 400, { error: 'E-mail inválido.' });
    if (!['cliente', 'admin'].includes(tipoPerfil)) return sendJson(res, 400, { error: 'Perfil inválido.' });

    const duplicate = getOne(`SELECT id FROM usuarios WHERE email = ${sqlValue(email)} LIMIT 1`);
    if (duplicate) return sendJson(res, 409, { error: 'Já existe um usuário com este e-mail.' });

    runSql(`
      INSERT INTO usuarios (nome, email, telefone, senha_hash, tipo_perfil)
      VALUES (${sqlValue(nome)}, ${sqlValue(email)}, ${sqlValue(telefone)}, ${sqlValue(hashPassword(senha))}, ${sqlValue(tipoPerfil)});
    `);

    return sendJson(res, 201, { usuario: getOne(`SELECT id, nome, email, telefone, tipo_perfil, criado_em FROM usuarios WHERE email = ${sqlValue(email)} LIMIT 1`) });
  }

  const adminUserMatch = url.pathname.match(/^\/api\/admin\/usuarios\/(\d+)$/);
  if (adminUserMatch && ['PUT', 'PATCH'].includes(req.method)) {
    const body = await readBody(req);
    const id = Number(adminUserMatch[1]);
    const current = getOne(`SELECT * FROM usuarios WHERE id = ${id}`);
    if (!current) return sendJson(res, 404, { error: 'Cliente não encontrado.' });

    const nome = body.nome ?? current.nome;
    const email = body.email ?? current.email;
    const telefone = body.telefone ?? current.telefone;
    const tipoPerfil = body.tipo_perfil ?? current.tipo_perfil;

    if (!nome || !email) return sendJson(res, 400, { error: 'Informe nome e e-mail.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())) return sendJson(res, 400, { error: 'E-mail inválido.' });
    if (!['cliente', 'admin'].includes(tipoPerfil)) return sendJson(res, 400, { error: 'Perfil inválido.' });

    const duplicate = getOne(`SELECT id FROM usuarios WHERE email = ${sqlValue(String(email).trim())} AND id <> ${id} LIMIT 1`);
    if (duplicate) return sendJson(res, 409, { error: 'Já existe um usuário com este e-mail.' });

    runSql(`
      UPDATE usuarios
      SET nome = ${sqlValue(String(nome).trim())},
          email = ${sqlValue(String(email).trim())},
          telefone = ${sqlValue(telefone)},
          tipo_perfil = ${sqlValue(tipoPerfil)}
      WHERE id = ${id};
    `);
    return sendJson(res, 200, { usuario: getOne(`SELECT id, nome, email, telefone, tipo_perfil, criado_em FROM usuarios WHERE id = ${id}`) });
  }

  if (adminUserMatch && req.method === 'DELETE') {
    const id = Number(adminUserMatch[1]);
    const current = getOne(`SELECT * FROM usuarios WHERE id = ${id}`);
    if (!current) return sendJson(res, 404, { error: 'Cliente não encontrado.' });
    if (current.tipo_perfil !== 'cliente') return sendJson(res, 400, { error: 'Exclusão permitida apenas para clientes.' });
    if (id === Number(admin.id)) return sendJson(res, 400, { error: 'Você não pode excluir o próprio usuário.' });

    runSql(`DELETE FROM usuarios WHERE id = ${id};`);
    return sendJson(res, 200, { ok: true });
  }

  return sendJson(res, 404, { error: 'Rota local não encontrada.' });
}

function serveStatic(req, res, url) {
  const requested = url.pathname === '/' ? '/index.html' : url.pathname;
  const filePath = normalize(join(root, requested));
  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }
  if (!existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  res.writeHead(200, { 'Content-Type': mimeTypes[extname(filePath)] || 'application/octet-stream' });
  res.end(readFileSync(filePath));
}

initDb();

const server = createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.startsWith('/api/')) {
    await handleApi(req, res, url);
    return;
  }
  serveStatic(req, res, url);
});

function listen(port) {
  server.removeAllListeners('error');
  server.once('error', (error) => {
    if (error.code === 'EADDRINUSE' && port < basePort + 10) {
      listen(port + 1);
      return;
    }
    throw error;
  });
  server.listen(port, () => {
    console.log(`PetWeb local (Entrega 1) rodando em http://localhost:${port}`);
    console.log(`Banco SQLite: ${dbFile}`);
    console.log('Admin: admin@petweb.com / Admin@123');
  });
}

listen(basePort);
