import { createServer } from 'node:http';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { extname, join, normalize } from 'node:path';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

const root = process.cwd();
const dbFile = join(root, 'petweb-local.sqlite');
const basePort = Number(process.env.PORT || 3000);
const statuses = ['Pendente', 'Confirmado', 'Em Andamento', 'Concluído', 'Cancelado'];

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

function columnExists(table, column) {
  return getRows(`PRAGMA table_info(${table});`).some((item) => item.name === column);
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
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      senha_hash TEXT NOT NULL,
      telefone TEXT,
      tipo_perfil TEXT DEFAULT 'cliente' CHECK (tipo_perfil IN ('cliente', 'admin')),
      google_sub TEXT,
      auth_provider TEXT DEFAULT 'local',
      criado_em TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS pets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_usuario INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      nome TEXT NOT NULL,
      especie TEXT NOT NULL,
      raca TEXT,
      porte TEXT CHECK (porte IN ('Pequeno', 'Médio', 'Grande')),
      observacoes TEXT,
      criado_em TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tipos_pet (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE,
      ativo INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS servicos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE,
      descricao TEXT,
      preco REAL NOT NULL,
      tempo_estimado INTEGER NOT NULL,
      tempo_buffer INTEGER DEFAULT 15,
      icone TEXT DEFAULT 'paw',
      ativo INTEGER DEFAULT 1,
      criado_em TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS agendamentos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      id_usuario INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
      id_pet INTEGER NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
      id_servico INTEGER NOT NULL REFERENCES servicos(id),
      data_hora TEXT NOT NULL,
      status TEXT DEFAULT 'Pendente'
        CHECK (status IN ('Pendente', 'Confirmado', 'Em Andamento', 'Concluído', 'Cancelado')),
      criado_em TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS horarios_funcionamento (
      dia_semana INTEGER PRIMARY KEY CHECK (dia_semana BETWEEN 0 AND 6),
      nome_dia TEXT NOT NULL,
      abre TEXT,
      fecha TEXT,
      ultimo_inicio TEXT,
      bloqueado INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS excecoes_funcionamento (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data TEXT NOT NULL,
      titulo TEXT NOT NULL,
      tipo TEXT DEFAULT 'fechado' CHECK (tipo IN ('fechado', 'horario_especial')),
      abre TEXT,
      fecha TEXT,
      ultimo_inicio TEXT,
      recorrente_anual INTEGER DEFAULT 0,
      criado_em TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS intervalos_indisponiveis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      dia_semana INTEGER NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
      titulo TEXT NOT NULL,
      inicio TEXT NOT NULL,
      fim TEXT NOT NULL,
      ativo INTEGER DEFAULT 1,
      criado_em TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS configuracoes (
      chave TEXT PRIMARY KEY,
      valor TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
    CREATE INDEX IF NOT EXISTS idx_tipos_pet_ativo ON tipos_pet(ativo);
    CREATE INDEX IF NOT EXISTS idx_pets_usuario ON pets(id_usuario);
    CREATE INDEX IF NOT EXISTS idx_agendamentos_usuario ON agendamentos(id_usuario);
    CREATE INDEX IF NOT EXISTS idx_agendamentos_data_hora ON agendamentos(data_hora);
    CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON agendamentos(status);
    CREATE INDEX IF NOT EXISTS idx_excecoes_data ON excecoes_funcionamento(data);
    CREATE INDEX IF NOT EXISTS idx_intervalos_dia ON intervalos_indisponiveis(dia_semana, ativo);
  `);

  if (!columnExists('usuarios', 'google_sub')) {
    runSql("ALTER TABLE usuarios ADD COLUMN google_sub TEXT;");
  }

  if (!columnExists('usuarios', 'auth_provider')) {
    runSql("ALTER TABLE usuarios ADD COLUMN auth_provider TEXT DEFAULT 'local';");
  }

  if (!columnExists('servicos', 'tempo_buffer')) {
    runSql("ALTER TABLE servicos ADD COLUMN tempo_buffer INTEGER DEFAULT 15;");
  }

  if (!columnExists('servicos', 'icone')) {
    runSql("ALTER TABLE servicos ADD COLUMN icone TEXT DEFAULT 'paw';");
  }

  // Seed default config values
  runSql(`
    INSERT INTO configuracoes (chave, valor) VALUES ('capacidade_simultanea', '1')
    ON CONFLICT(chave) DO NOTHING;
  `);

  runSql("CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_google_sub ON usuarios(google_sub) WHERE google_sub IS NOT NULL;");

  const admin = getOne("SELECT id FROM usuarios WHERE email = 'admin@petweb.com'");
  if (!admin) {
    runSql(`
      INSERT INTO usuarios (nome, email, senha_hash, telefone, tipo_perfil)
      VALUES ('Administrador PetWeb', 'admin@petweb.com', ${sqlValue(hashPassword('Admin@123'))}, '(85) 99999-0000', 'admin');
    `);
  }

  runSql(`
    INSERT INTO tipos_pet (nome, ativo)
    VALUES ('Cão', 1), ('Gato', 1), ('Outro', 1)
    ON CONFLICT(nome) DO UPDATE SET ativo = excluded.ativo;
  `);

  runSql(`
    INSERT INTO servicos (nome, descricao, preco, tempo_estimado, icone, ativo)
    VALUES
      ('Banho', 'Banho completo com produtos adequados ao tipo de pelo.', 49.90, 60, 'bath', 1),
      ('Tosa', 'Tosa higiênica ou personalizada com acabamento cuidadoso.', 69.90, 90, 'scissors', 1),
      ('Banho + Tosa', 'Pacote completo de banho, tosa e finalização.', 99.90, 120, 'bath', 1),
      ('Consulta Veterinária', 'Avaliação clínica com médico veterinário.', 120.00, 45, 'stethoscope', 1),
      ('Vacinação', 'Aplicação de vacina com conferência da carteirinha.', 89.90, 30, 'syringe', 1),
      ('Hospedagem', 'Diária com acompanhamento, alimentação e recreação.', 140.00, 1440, 'house', 1)
    ON CONFLICT(nome) DO UPDATE SET
      descricao = excluded.descricao,
      preco = excluded.preco,
      tempo_estimado = excluded.tempo_estimado,
      icone = excluded.icone,
      ativo = excluded.ativo;
  `);

  runSql(`
    INSERT INTO horarios_funcionamento (dia_semana, nome_dia, abre, fecha, ultimo_inicio, bloqueado)
    VALUES
      (0, 'Domingo', NULL, NULL, NULL, 1),
      (1, 'Segunda-feira', '08:00', '18:00', '17:00', 0),
      (2, 'Terça-feira', '08:00', '18:00', '17:00', 0),
      (3, 'Quarta-feira', '08:00', '18:00', '17:00', 0),
      (4, 'Quinta-feira', '08:00', '18:00', '17:00', 0),
      (5, 'Sexta-feira', '08:00', '18:00', '17:00', 0),
      (6, 'Sábado', '08:00', '12:00', '11:00', 0)
    ON CONFLICT(dia_semana) DO NOTHING;
  `);

  const lunchBlocks = getOne("SELECT COUNT(*) AS total FROM intervalos_indisponiveis WHERE titulo = 'Almoço'");
  if (!lunchBlocks || Number(lunchBlocks.total) === 0) {
    runSql(`
      INSERT INTO intervalos_indisponiveis (dia_semana, titulo, inicio, fim, ativo)
      VALUES
        (1, 'Almoço', '12:00', '13:00', 1),
        (2, 'Almoço', '12:00', '13:00', 1),
        (3, 'Almoço', '12:00', '13:00', 1),
        (4, 'Almoço', '12:00', '13:00', 1),
        (5, 'Almoço', '12:00', '13:00', 1);
    `);
  }

  runSql("DELETE FROM pets WHERE observacoes = 'Pet de demonstração.';");
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

function redirect(res, location) {
  res.writeHead(302, { Location: location });
  res.end();
}

function safeNext(value, fallback = '/dashboard.html') {
  return typeof value === 'string' && value.startsWith('/') ? value : fallback;
}

function encodeState(payload) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodeState(value) {
  try {
    return JSON.parse(Buffer.from(value || '', 'base64url').toString('utf8'));
  } catch {
    return {};
  }
}

function googleConfig(req) {
  const baseUrl = `http://${req.headers.host}`;
  return {
    clientId: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    redirectUri: process.env.GOOGLE_REDIRECT_URI || `${baseUrl}/api/auth/google/callback`
  };
}

function googleErrorRedirect(message) {
  return `/login.html?google_error=${encodeURIComponent(message)}`;
}

function finishBrowserLogin(res, user, next) {
  const token = makeToken(user);
  const usuario = publicUser(user);
  const target = safeNext(next, usuario.tipo_perfil === 'admin' ? '/admin.html' : '/dashboard.html');

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(`
    <!doctype html>
    <html lang="pt-BR">
      <head><meta charset="utf-8"><title>Entrando...</title></head>
      <body>
        <script>
          localStorage.setItem('petweb_token', ${JSON.stringify(token)});
          localStorage.setItem('petweb_user', ${JSON.stringify(JSON.stringify(usuario))});
          window.location.href = ${JSON.stringify(target)};
        </script>
        <p>Login concluído. Redirecionando...</p>
      </body>
    </html>
  `);
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

function getCapacidade() {
  const row = getOne("SELECT valor FROM configuracoes WHERE chave = 'capacidade_simultanea'");
  const cap = parseInt(row?.valor || '1', 10);
  return cap >= 1 ? cap : 1;
}

function timeToMinutes(value) {
  if (!value) return null;
  const [hour, minute] = value.split(':').map(Number);
  return hour * 60 + minute;
}

function minutesToTime(minutes) {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

function addDays(dateKey, amount) {
  const date = new Date(`${dateKey}T12:00:00`);
  date.setDate(date.getDate() + amount);
  return date.toISOString().slice(0, 10);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function dateKeyFromValue(value) {
  return String(value || '').split('T')[0];
}

function getExceptionForDate(dateKey) {
  return getOne(`
    SELECT *
    FROM excecoes_funcionamento
    WHERE data = ${sqlValue(dateKey)}
       OR (recorrente_anual = 1 AND substr(data, 6, 5) = ${sqlValue(dateKey.slice(5))})
    ORDER BY recorrente_anual ASC, id DESC
    LIMIT 1
  `);
}

function getScheduleForDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return getOne(`SELECT * FROM horarios_funcionamento WHERE dia_semana = ${date.getDay()}`);
}

function getEffectiveSchedule(value) {
  const dateKey = dateKeyFromValue(value);
  const exception = getExceptionForDate(dateKey);
  if (exception) {
    if (exception.tipo === 'fechado') {
      return {
        closed: true,
        reason: exception.titulo,
        source: exception.recorrente_anual ? 'feriado recorrente' : 'bloqueio por data'
      };
    }

    return {
      closed: false,
      reason: exception.titulo,
      source: exception.recorrente_anual ? 'horário especial recorrente' : 'horário especial',
      nome_dia: exception.titulo,
      abre: exception.abre,
      fecha: exception.fecha,
      ultimo_inicio: exception.ultimo_inicio
    };
  }

  const schedule = getScheduleForDate(value);
  if (!schedule || schedule.bloqueado) {
    return {
      closed: true,
      reason: schedule?.nome_dia ? `${schedule.nome_dia} bloqueado` : 'Dia sem atendimento',
      source: 'padrão semanal'
    };
  }

  return {
    closed: false,
    reason: schedule.nome_dia,
    source: 'padrão semanal',
    ...schedule
  };
}

function validateBusinessDate(value) {
  const date = new Date(value);
  const now = new Date();
  if (Number.isNaN(date.getTime())) return 'Data inválida.';
  if (date <= now) return 'Não é possível agendar datas ou horários passados.';

  const schedule = getEffectiveSchedule(value);
  if (!schedule || schedule.closed) return schedule?.reason || 'Este dia não possui atendimento.';

  const minutes = date.getHours() * 60 + date.getMinutes();
  const open = timeToMinutes(schedule.abre);
  const close = timeToMinutes(schedule.fecha);
  if (open === null || close === null || minutes < open || minutes > close) {
    return `Horário fora do funcionamento de ${schedule.nome_dia}.`;
  }

  const intervals = getRows(`SELECT * FROM intervalos_indisponiveis WHERE dia_semana = ${date.getDay()} AND ativo = 1`);
  for (const interval of intervals) {
    const intervalStart = timeToMinutes(interval.inicio);
    const intervalEnd = timeToMinutes(interval.fim);
    if (minutes >= intervalStart && minutes < intervalEnd) {
      return `Horário indisponível (${interval.titulo}).`;
    }
  }

  return null;
}

function hasConflict(startValue, serviceId, ignoreId = null) {
  const service = getOne(`SELECT * FROM servicos WHERE id = ${sqlValue(Number(serviceId))}`);
  if (!service) return false;

  const capacidade = getCapacidade();
  const start = new Date(startValue);
  const end = new Date(start.getTime() + service.tempo_estimado * 60000);
  const existing = getRows(`
    SELECT a.*, s.tempo_estimado
    FROM agendamentos a
    JOIN servicos s ON s.id = a.id_servico
    WHERE a.status <> 'Cancelado'
  `);

  const overlapping = existing.filter((item) => {
    if (ignoreId && Number(item.id) === Number(ignoreId)) return false;
    const otherStart = new Date(item.data_hora);
    const otherEnd = new Date(otherStart.getTime() + item.tempo_estimado * 60000);
    return start < otherEnd && end > otherStart;
  });

  return overlapping.length >= capacidade;
}

function appointmentRows(where = '1 = 1') {
  return getRows(`
    SELECT a.id, a.id_usuario, a.id_pet, a.id_servico, a.data_hora, a.status,
           u.nome AS cliente, u.telefone AS cliente_telefone, p.nome AS pet, s.nome AS servico, s.preco, s.tempo_estimado
    FROM agendamentos a
    JOIN usuarios u ON u.id = a.id_usuario
    JOIN pets p ON p.id = a.id_pet
    JOIN servicos s ON s.id = a.id_servico
    WHERE ${where}
    ORDER BY a.data_hora DESC
  `);
}

function buildAvailabilityDay(dateKey, serviceId, ignoreId = null) {
  const service = serviceId ? getOne(`SELECT * FROM servicos WHERE id = ${Number(serviceId)} AND ativo = 1`) : null;
  const schedule = getEffectiveSchedule(`${dateKey}T12:00:00`);
  const base = {
    data: dateKey,
    label: new Date(`${dateKey}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }),
    aberto: Boolean(schedule && !schedule.closed),
    motivo: schedule?.reason || '',
    origem: schedule?.source || '',
    slots: []
  };

  if (!schedule || schedule.closed) {
    return { ...base, status: 'fechado' };
  }

  const start = timeToMinutes(schedule.abre);
  const endOfDay = timeToMinutes(schedule.fecha);
  if (start === null || endOfDay === null) return { ...base, aberto: false, status: 'fechado', motivo: 'Horário incompleto' };

  const duration = service ? service.tempo_estimado : 30;
  const buffer = service ? (service.tempo_buffer ?? 15) : 0;
  const step = duration + buffer;

  const intervals = getRows(`SELECT * FROM intervalos_indisponiveis WHERE dia_semana = ${new Date(`${dateKey}T12:00:00`).getDay()} AND ativo = 1`);

  for (let minutes = start; minutes + duration <= endOfDay; minutes += step) {
    const time = minutesToTime(minutes);
    const dateTime = `${dateKey}T${time}:00`;
    const past = new Date(dateTime) <= new Date();

    let inInterval = false;
    for (const interval of intervals) {
      const intervalStart = timeToMinutes(interval.inicio);
      const intervalEnd = timeToMinutes(interval.fim);
      if (minutes < intervalEnd && (minutes + duration) > intervalStart) {
         inInterval = true;
         break;
      }
    }

    const conflict = service ? hasConflict(dateTime, service.id, ignoreId) : false;
    base.slots.push({
      hora: time,
      disponivel: Boolean(service && !past && !conflict && !inInterval),
      motivo: !service ? 'Escolha um serviço' : past ? 'Horário passado' : inInterval ? 'Intervalo' : conflict ? 'Ocupado' : 'Livre'
    });
  }

  const available = base.slots.filter((slot) => slot.disponivel).length;
  return {
    ...base,
    status: available ? 'disponivel' : 'lotado',
    disponiveis: available,
    total: base.slots.length
  };
}

function updatePetRoute(req, res, id, user) {
  return readBody(req).then((body) => {
    if (!body.nome || !body.especie) return sendJson(res, 400, { error: 'Informe nome e espécie do pet.' });
    runSql(`
      UPDATE pets
      SET nome = ${sqlValue(body.nome)}, especie = ${sqlValue(body.especie)}, raca = ${sqlValue(body.raca)},
          porte = ${sqlValue(body.porte)}, observacoes = ${sqlValue(body.observacoes)}
      WHERE id = ${Number(id)} AND id_usuario = ${user.id};
    `);
    const pet = getOne(`SELECT id, nome, especie, raca, porte, observacoes FROM pets WHERE id = ${Number(id)} AND id_usuario = ${user.id}`);
    if (!pet) return sendJson(res, 404, { error: 'Pet não encontrado.' });
    return sendJson(res, 200, { pet });
  });
}

async function handleApi(req, res, url) {
  if (url.pathname === '/api/health' && req.method === 'GET') {
    return sendJson(res, 200, { status: 'ok', service: 'PetWeb API Local SQLite' });
  }

  if (url.pathname === '/api/auth/login' && req.method === 'POST') {
    const body = await readBody(req);
    const user = getOne(`SELECT * FROM usuarios WHERE email = ${sqlValue(body.email)} LIMIT 1`);
    if (!user || !verifyPassword(body.senha || '', user.senha_hash)) {
      return sendJson(res, 401, { error: 'Credenciais inválidas.' });
    }
    return sendJson(res, 200, { token: makeToken(user), usuario: publicUser(user) });
  }

  if (url.pathname === '/api/auth/google/start' && req.method === 'GET') {
    const config = googleConfig(req);
    if (!config.clientId || !config.clientSecret) {
      return redirect(res, googleErrorRedirect('Google OAuth não configurado. Defina GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET.'));
    }

    const next = safeNext(url.searchParams.get('next') || '/dashboard.html');
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      prompt: 'select_account',
      state: encodeState({ next })
    });

    return redirect(res, `https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  }

  if (url.pathname === '/api/auth/google/callback' && req.method === 'GET') {
    const config = googleConfig(req);
    const state = decodeState(url.searchParams.get('state'));
    const next = safeNext(state.next || '/dashboard.html');
    const code = url.searchParams.get('code');
    const oauthError = url.searchParams.get('error');

    if (oauthError) return redirect(res, googleErrorRedirect(`Google recusou o login: ${oauthError}`));
    if (!code) return redirect(res, googleErrorRedirect('Código do Google ausente.'));
    if (!config.clientId || !config.clientSecret) return redirect(res, googleErrorRedirect('Google OAuth não configurado.'));

    try {
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: config.redirectUri,
          grant_type: 'authorization_code'
        })
      });

      const tokenData = await tokenResponse.json();
      if (!tokenResponse.ok || !tokenData.access_token) {
        return redirect(res, googleErrorRedirect('Não foi possível validar o login com Google.'));
      }

      const profileResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      const profile = await profileResponse.json();

      if (!profileResponse.ok || !profile.email || profile.email_verified === false) {
        return redirect(res, googleErrorRedirect('E-mail do Google não verificado.'));
      }

      let user = getOne(`SELECT * FROM usuarios WHERE google_sub = ${sqlValue(profile.sub)} LIMIT 1`);
      if (!user) {
        user = getOne(`SELECT * FROM usuarios WHERE email = ${sqlValue(profile.email)} LIMIT 1`);
        if (user) {
          runSql(`
            UPDATE usuarios
            SET google_sub = ${sqlValue(profile.sub)},
                auth_provider = CASE WHEN auth_provider = 'local' THEN 'local+google' ELSE auth_provider END
            WHERE id = ${Number(user.id)};
          `);
        } else {
          runSql(`
            INSERT INTO usuarios (nome, email, senha_hash, telefone, tipo_perfil, google_sub, auth_provider)
            VALUES (${sqlValue(profile.name || profile.email)}, ${sqlValue(profile.email)}, ${sqlValue(hashPassword(randomBytes(24).toString('hex')))}, NULL, 'cliente', ${sqlValue(profile.sub)}, 'google');
          `);
        }
        user = getOne(`SELECT * FROM usuarios WHERE email = ${sqlValue(profile.email)} LIMIT 1`);
      }

      return finishBrowserLogin(res, user, next);
    } catch {
      return redirect(res, googleErrorRedirect('Falha de comunicação com Google.'));
    }
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

  if (url.pathname === '/api/servicos' && req.method === 'GET') {
    const servicos = getRows('SELECT id, nome, descricao, preco, tempo_estimado, tempo_buffer, icone, ativo FROM servicos WHERE ativo = 1 ORDER BY nome');
    return sendJson(res, 200, { servicos });
  }

  if (url.pathname === '/api/horarios' && req.method === 'GET') {
    return sendJson(res, 200, { horarios: getRows('SELECT * FROM horarios_funcionamento ORDER BY dia_semana') });
  }

  if (url.pathname === '/api/tipos-pet' && req.method === 'GET') {
    return sendJson(res, 200, { tipos: getRows('SELECT id, nome, ativo FROM tipos_pet WHERE ativo = 1 ORDER BY nome') });
  }

  if (url.pathname === '/api/disponibilidade' && req.method === 'GET') {
    const serviceId = Number(url.searchParams.get('servico_id'));
    const ignoreId = url.searchParams.get('ignore_id') ? Number(url.searchParams.get('ignore_id')) : null;
    const start = url.searchParams.get('inicio') || todayKey();
    const days = Math.min(Math.max(Number(url.searchParams.get('dias') || 21), 1), 60);
    const disponibilidade = Array.from({ length: days }, (_, index) => buildAvailabilityDay(addDays(start, index), serviceId || null, ignoreId));
    return sendJson(res, 200, { disponibilidade });
  }

  const user = getUser(req);
  if (!user) return sendJson(res, 401, { error: 'Token ausente ou inválido.' });

  if (url.pathname === '/api/me' && req.method === 'GET') {
    return sendJson(res, 200, { usuario: publicUser(user) });
  }

  if (url.pathname === '/api/pets' && req.method === 'GET') {
    const pets = getRows(`SELECT id, nome, especie, raca, porte, observacoes FROM pets WHERE id_usuario = ${user.id} ORDER BY nome`);
    return sendJson(res, 200, { pets });
  }

  if (url.pathname === '/api/pets' && req.method === 'POST') {
    const body = await readBody(req);
    if (!body.nome || !body.especie) return sendJson(res, 400, { error: 'Informe nome e espécie do pet.' });
    runSql(`
      INSERT INTO pets (id_usuario, nome, especie, raca, porte, observacoes)
      VALUES (${user.id}, ${sqlValue(body.nome)}, ${sqlValue(body.especie)}, ${sqlValue(body.raca)}, ${sqlValue(body.porte)}, ${sqlValue(body.observacoes)});
    `);
    const pet = getOne(`SELECT id, nome, especie, raca, porte, observacoes FROM pets WHERE id_usuario = ${user.id} ORDER BY id DESC LIMIT 1`);
    return sendJson(res, 201, { pet });
  }

  const petMatch = url.pathname.match(/^\/api\/pets\/(\d+)$/);
  if (petMatch && req.method === 'PUT') return updatePetRoute(req, res, petMatch[1], user);
  if (petMatch && req.method === 'DELETE') {
    runSql(`DELETE FROM pets WHERE id = ${Number(petMatch[1])} AND id_usuario = ${user.id};`);
    return sendJson(res, 200, { ok: true });
  }

  if (url.pathname === '/api/agendamentos' && req.method === 'GET') {
    return sendJson(res, 200, { agendamentos: appointmentRows(`a.id_usuario = ${user.id}`) });
  }

  if (url.pathname === '/api/agendamentos' && req.method === 'POST') {
    const body = await readBody(req);
    const pet = getOne(`SELECT id FROM pets WHERE id = ${sqlValue(Number(body.id_pet))} AND id_usuario = ${user.id}`);
    const service = getOne(`SELECT id FROM servicos WHERE id = ${sqlValue(Number(body.id_servico))} AND ativo = 1`);
    if (!pet) return sendJson(res, 403, { error: 'Pet não pertence ao usuário autenticado.' });
    if (!service) return sendJson(res, 400, { error: 'Serviço inválido ou inativo.' });

    const error = validateBusinessDate(body.data_hora);
    if (error) return sendJson(res, 400, { error });
    if (hasConflict(body.data_hora, body.id_servico)) {
      return sendJson(res, 409, { error: 'Horário indisponível para este serviço.' });
    }

    runSql(`
      INSERT INTO agendamentos (id_usuario, id_pet, id_servico, data_hora, status)
      VALUES (${user.id}, ${Number(body.id_pet)}, ${Number(body.id_servico)}, ${sqlValue(body.data_hora)}, 'Pendente');
    `);
    const agendamento = getOne(`SELECT id, data_hora, status FROM agendamentos WHERE id_usuario = ${user.id} ORDER BY id DESC LIMIT 1`);
    return sendJson(res, 201, { agendamento });
  }

  const cancelMatch = url.pathname.match(/^\/api\/agendamentos\/(\d+)\/cancelar$/);
  if (cancelMatch && req.method === 'PATCH') {
    const existing = getOne(`SELECT * FROM agendamentos WHERE id = ${Number(cancelMatch[1])} AND id_usuario = ${user.id}`);
    if (!existing || !['Pendente', 'Confirmado'].includes(existing.status)) {
      return sendJson(res, 400, { error: 'Agendamento não pode ser cancelado.' });
    }
    const twoHours = Date.now() + 2 * 60 * 60 * 1000;
    if (new Date(existing.data_hora).getTime() <= twoHours) {
      return sendJson(res, 400, { error: 'Cancelamento permitido apenas com mais de 2 horas de antecedência.' });
    }
    runSql(`UPDATE agendamentos SET status = 'Cancelado' WHERE id = ${Number(cancelMatch[1])};`);
    return sendJson(res, 200, { agendamento: getOne(`SELECT id, status FROM agendamentos WHERE id = ${Number(cancelMatch[1])}`) });
  }

  const editApptMatch = url.pathname.match(/^\/api\/agendamentos\/(\d+)$/);
  if (editApptMatch && req.method === 'PUT') {
    const body = await readBody(req);
    const id = Number(editApptMatch[1]);
    const existing = getOne(`SELECT * FROM agendamentos WHERE id = ${id} AND id_usuario = ${user.id}`);
    if (!existing) return sendJson(res, 404, { error: 'Agendamento não encontrado.' });
    if (existing.status !== 'Pendente') return sendJson(res, 400, { error: 'Apenas agendamentos pendentes podem ser editados pelo cliente.' });

    const petId = body.id_pet ?? existing.id_pet;
    const servicoId = body.id_servico ?? existing.id_servico;
    const dataHora = body.data_hora ?? existing.data_hora;

    const pet = getOne(`SELECT id FROM pets WHERE id = ${sqlValue(Number(petId))} AND id_usuario = ${user.id}`);
    const service = getOne(`SELECT id FROM servicos WHERE id = ${sqlValue(Number(servicoId))} AND ativo = 1`);
    if (!pet) return sendJson(res, 403, { error: 'Pet não pertence ao usuário autenticado.' });
    if (!service) return sendJson(res, 400, { error: 'Serviço inválido ou inativo.' });

    const error = validateBusinessDate(dataHora);
    if (error) return sendJson(res, 400, { error });
    if (hasConflict(dataHora, servicoId, id)) {
      return sendJson(res, 409, { error: 'Horário indisponível para este serviço.' });
    }

    runSql(`
      UPDATE agendamentos
      SET id_pet = ${Number(petId)}, id_servico = ${Number(servicoId)}, data_hora = ${sqlValue(dataHora)}
      WHERE id = ${id};
    `);
    return sendJson(res, 200, { agendamento: getOne(`SELECT id, data_hora, status FROM agendamentos WHERE id = ${id}`) });
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

    runSql(`
      PRAGMA foreign_keys = ON;
      BEGIN;
      DELETE FROM agendamentos WHERE id_usuario = ${id};
      DELETE FROM pets WHERE id_usuario = ${id};
      DELETE FROM usuarios WHERE id = ${id};
      COMMIT;
    `);
    return sendJson(res, 200, { ok: true });
  }

  if (url.pathname === '/api/admin/pets' && req.method === 'GET') {
    return sendJson(res, 200, {
      pets: getRows(`
        SELECT p.id, p.id_usuario, p.nome, p.especie, p.raca, p.porte, p.observacoes, u.nome AS tutor, u.email AS tutor_email
        FROM pets p
        JOIN usuarios u ON u.id = p.id_usuario
        ORDER BY u.nome, p.nome
      `)
    });
  }

  const adminPetMatch = url.pathname.match(/^\/api\/admin\/pets\/(\d+)$/);
  if (adminPetMatch && ['PUT', 'PATCH'].includes(req.method)) {
    const body = await readBody(req);
    const id = Number(adminPetMatch[1]);
    const current = getOne(`SELECT * FROM pets WHERE id = ${id}`);
    if (!current) return sendJson(res, 404, { error: 'Pet não encontrado.' });

    const nome = body.nome ?? current.nome;
    const especie = body.especie ?? current.especie;
    if (!nome || !especie) return sendJson(res, 400, { error: 'Informe nome e espécie do pet.' });

    runSql(`
      UPDATE pets
      SET nome = ${sqlValue(String(nome).trim())},
          especie = ${sqlValue(String(especie).trim())},
          raca = ${sqlValue(body.raca ?? current.raca)},
          porte = ${sqlValue(body.porte ?? current.porte)},
          observacoes = ${sqlValue(body.observacoes ?? current.observacoes)}
      WHERE id = ${id};
    `);

    return sendJson(res, 200, {
      pet: getOne(`
        SELECT p.id, p.id_usuario, p.nome, p.especie, p.raca, p.porte, p.observacoes, u.nome AS tutor, u.email AS tutor_email
        FROM pets p
        JOIN usuarios u ON u.id = p.id_usuario
        WHERE p.id = ${id}
      `)
    });
  }

  if (adminPetMatch && req.method === 'DELETE') {
    const id = Number(adminPetMatch[1]);
    const current = getOne(`SELECT * FROM pets WHERE id = ${id}`);
    if (!current) return sendJson(res, 404, { error: 'Pet não encontrado.' });

    runSql(`
      PRAGMA foreign_keys = ON;
      BEGIN;
      DELETE FROM agendamentos WHERE id_pet = ${id};
      DELETE FROM pets WHERE id = ${id};
      COMMIT;
    `);
    return sendJson(res, 200, { ok: true });
  }

  if (url.pathname === '/api/admin/tipos-pet' && req.method === 'GET') {
    return sendJson(res, 200, { tipos: getRows('SELECT id, nome, ativo FROM tipos_pet ORDER BY nome') });
  }

  if (url.pathname === '/api/admin/tipos-pet' && req.method === 'POST') {
    const body = await readBody(req);
    if (!body.nome) return sendJson(res, 400, { error: 'Informe o nome do tipo de pet.' });
    runSql(`
      INSERT INTO tipos_pet (nome, ativo)
      VALUES (${sqlValue(body.nome)}, ${body.ativo === false ? 0 : 1})
      ON CONFLICT(nome) DO UPDATE SET ativo = excluded.ativo;
    `);
    return sendJson(res, 201, { tipo: getOne(`SELECT * FROM tipos_pet WHERE nome = ${sqlValue(body.nome)} LIMIT 1`) });
  }

  const petTypeMatch = url.pathname.match(/^\/api\/admin\/tipos-pet\/(\d+)$/);
  if (petTypeMatch && ['PUT', 'PATCH'].includes(req.method)) {
    const body = await readBody(req);
    const current = getOne(`SELECT * FROM tipos_pet WHERE id = ${Number(petTypeMatch[1])}`);
    if (!current) return sendJson(res, 404, { error: 'Tipo de pet não encontrado.' });
    runSql(`
      UPDATE tipos_pet
      SET nome = ${sqlValue(body.nome ?? current.nome)},
          ativo = ${body.ativo === undefined ? Number(current.ativo) : (body.ativo ? 1 : 0)}
      WHERE id = ${Number(petTypeMatch[1])};
    `);
    return sendJson(res, 200, { tipo: getOne(`SELECT * FROM tipos_pet WHERE id = ${Number(petTypeMatch[1])}`) });
  }

  if (petTypeMatch && req.method === 'DELETE') {
    const id = Number(petTypeMatch[1]);
    const current = getOne(`SELECT * FROM tipos_pet WHERE id = ${id}`);
    if (!current) return sendJson(res, 404, { error: 'Tipo de pet não encontrado.' });
    const usage = getOne(`SELECT COUNT(*) AS total FROM pets WHERE especie = ${sqlValue(current.nome)}`);
    if (Number(usage.total) > 0) {
      runSql(`UPDATE tipos_pet SET ativo = 0 WHERE id = ${id};`);
      return sendJson(res, 200, { ok: true, mode: 'inactivated' });
    }
    runSql(`DELETE FROM tipos_pet WHERE id = ${id};`);
    return sendJson(res, 200, { ok: true, mode: 'deleted' });
  }

  if (url.pathname === '/api/admin/servicos' && req.method === 'GET') {
    return sendJson(res, 200, { servicos: getRows('SELECT id, nome, descricao, preco, tempo_estimado, tempo_buffer, icone, ativo FROM servicos ORDER BY nome') });
  }

  if (url.pathname === '/api/admin/servicos' && req.method === 'POST') {
    const body = await readBody(req);
    if (!body.nome || !body.preco || !body.tempo_estimado) return sendJson(res, 400, { error: 'Informe nome, preço e duração.' });
    runSql(`
      INSERT INTO servicos (nome, descricao, preco, tempo_estimado, tempo_buffer, icone, ativo)
      VALUES (${sqlValue(body.nome)}, ${sqlValue(body.descricao)}, ${Number(body.preco)}, ${Number(body.tempo_estimado)}, ${Number(body.tempo_buffer ?? 15)}, ${sqlValue(body.icone || 'paw')}, ${body.ativo ? 1 : 0});
    `);
    return sendJson(res, 201, { servico: getOne('SELECT * FROM servicos ORDER BY id DESC LIMIT 1') });
  }

  const serviceMatch = url.pathname.match(/^\/api\/admin\/servicos\/(\d+)$/);
  if (serviceMatch && ['PUT', 'PATCH'].includes(req.method)) {
    const body = await readBody(req);
    const current = getOne(`SELECT * FROM servicos WHERE id = ${Number(serviceMatch[1])}`);
    if (!current) return sendJson(res, 404, { error: 'Serviço não encontrado.' });
    runSql(`
      UPDATE servicos
      SET nome = ${sqlValue(body.nome ?? current.nome)},
          descricao = ${sqlValue(body.descricao ?? current.descricao)},
          preco = ${Number(body.preco ?? current.preco)},
          tempo_estimado = ${Number(body.tempo_estimado ?? current.tempo_estimado)},
          tempo_buffer = ${Number(body.tempo_buffer ?? current.tempo_buffer)},
          icone = ${sqlValue(body.icone ?? current.icone ?? 'paw')},
          ativo = ${body.ativo === undefined ? Number(current.ativo) : (body.ativo ? 1 : 0)}
      WHERE id = ${Number(serviceMatch[1])};
    `);
    return sendJson(res, 200, { servico: getOne(`SELECT * FROM servicos WHERE id = ${Number(serviceMatch[1])}`) });
  }

  if (serviceMatch && req.method === 'DELETE') {
    const id = Number(serviceMatch[1]);
    const service = getOne(`SELECT * FROM servicos WHERE id = ${id}`);
    if (!service) return sendJson(res, 404, { error: 'Serviço não encontrado.' });

    const usage = getOne(`SELECT COUNT(*) AS total FROM agendamentos WHERE id_servico = ${id}`);
    if (Number(usage.total) > 0) {
      runSql(`UPDATE servicos SET ativo = 0 WHERE id = ${id};`);
      return sendJson(res, 200, { ok: true, mode: 'inactivated' });
    }

    runSql(`DELETE FROM servicos WHERE id = ${id};`);
    return sendJson(res, 200, { ok: true, mode: 'deleted' });
  }

  if (url.pathname === '/api/admin/horarios' && req.method === 'GET') {
    return sendJson(res, 200, { horarios: getRows('SELECT * FROM horarios_funcionamento ORDER BY dia_semana') });
  }

  if (url.pathname === '/api/admin/horarios' && req.method === 'PUT') {
    const body = await readBody(req);
    const horarios = Array.isArray(body.horarios) ? body.horarios : [];
    horarios.forEach((item) => {
      runSql(`
        UPDATE horarios_funcionamento
        SET abre = ${sqlValue(item.abre)}, fecha = ${sqlValue(item.fecha)}, ultimo_inicio = ${sqlValue(item.ultimo_inicio)},
            bloqueado = ${item.bloqueado ? 1 : 0}
        WHERE dia_semana = ${Number(item.dia_semana)};
      `);
    });
    return sendJson(res, 200, { horarios: getRows('SELECT * FROM horarios_funcionamento ORDER BY dia_semana') });
  }

  if (url.pathname === '/api/admin/configuracoes' && req.method === 'GET') {
    const rows = getRows('SELECT chave, valor FROM configuracoes ORDER BY chave');
    const config = Object.fromEntries(rows.map((r) => [r.chave, r.valor]));
    return sendJson(res, 200, { configuracoes: config });
  }

  if (url.pathname === '/api/admin/configuracoes' && req.method === 'PUT') {
    const body = await readBody(req);
    const capacidade = parseInt(body.capacidade_simultanea, 10);
    if (Number.isNaN(capacidade) || capacidade < 1 || capacidade > 100) {
      return sendJson(res, 400, { error: 'Capacidade simultânea deve ser um número entre 1 e 100.' });
    }
    runSql(`
      INSERT INTO configuracoes (chave, valor) VALUES ('capacidade_simultanea', ${sqlValue(String(capacidade))})
      ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor;
    `);
    return sendJson(res, 200, { configuracoes: { capacidade_simultanea: String(capacidade) } });
  }

  if (url.pathname === '/api/admin/bloqueios' && req.method === 'GET') {
    return sendJson(res, 200, {
      bloqueios: getRows(`
        SELECT *
        FROM excecoes_funcionamento
        ORDER BY data ASC, id ASC
      `)
    });
  }

  if (url.pathname === '/api/admin/bloqueios' && req.method === 'POST') {
    const body = await readBody(req);
    if (!body.data || !body.titulo) return sendJson(res, 400, { error: 'Informe data e título.' });
    if (!['fechado', 'horario_especial'].includes(body.tipo)) return sendJson(res, 400, { error: 'Tipo inválido.' });
    if (body.tipo === 'horario_especial' && (!body.abre || !body.fecha || !body.ultimo_inicio)) {
      return sendJson(res, 400, { error: 'Horário especial precisa de abertura, fechamento e último início.' });
    }

    runSql(`
      INSERT INTO excecoes_funcionamento (data, titulo, tipo, abre, fecha, ultimo_inicio, recorrente_anual)
      VALUES (${sqlValue(body.data)}, ${sqlValue(body.titulo)}, ${sqlValue(body.tipo)}, ${sqlValue(body.abre)}, ${sqlValue(body.fecha)}, ${sqlValue(body.ultimo_inicio)}, ${body.recorrente_anual ? 1 : 0});
    `);
    return sendJson(res, 201, { bloqueio: getOne('SELECT * FROM excecoes_funcionamento ORDER BY id DESC LIMIT 1') });
  }

  const blockMatch = url.pathname.match(/^\/api\/admin\/bloqueios\/(\d+)$/);
  if (blockMatch && req.method === 'DELETE') {
    runSql(`DELETE FROM excecoes_funcionamento WHERE id = ${Number(blockMatch[1])};`);
    return sendJson(res, 200, { ok: true });
  }

  if (url.pathname === '/api/admin/agendamentos' && req.method === 'GET') {
    const data = url.searchParams.get('data');
    const status = url.searchParams.get('status');
    const busca = url.searchParams.get('busca');
    const clauses = [];
    if (data) clauses.push(`date(a.data_hora) = ${sqlValue(data)}`);
    if (status && status !== 'Todos') clauses.push(`a.status = ${sqlValue(status)}`);
    if (busca) {
      const term = `%${busca}%`;
      clauses.push(`(u.nome LIKE ${sqlValue(term)} OR p.nome LIKE ${sqlValue(term)} OR s.nome LIKE ${sqlValue(term)})`);
    }
    return sendJson(res, 200, { agendamentos: appointmentRows(clauses.length ? clauses.join(' AND ') : '1 = 1') });
  }

  const statusMatch = url.pathname.match(/^\/api\/admin\/agendamentos\/(\d+)\/status$/);
  if (statusMatch && req.method === 'PATCH') {
    const body = await readBody(req);
    if (!statuses.includes(body.status)) return sendJson(res, 400, { error: 'Status inválido.' });
    runSql(`UPDATE agendamentos SET status = ${sqlValue(body.status)} WHERE id = ${Number(statusMatch[1])};`);
    return sendJson(res, 200, { agendamento: getOne(`SELECT id, status FROM agendamentos WHERE id = ${Number(statusMatch[1])}`) });
  }

  const adminApptMatch = url.pathname.match(/^\/api\/admin\/agendamentos\/(\d+)$/);
  if (adminApptMatch && req.method === 'PUT') {
    const body = await readBody(req);
    const id = Number(adminApptMatch[1]);
    const existing = getOne(`SELECT * FROM agendamentos WHERE id = ${id}`);
    if (!existing) return sendJson(res, 404, { error: 'Agendamento não encontrado.' });

    const petId = body.id_pet ?? existing.id_pet;
    const servicoId = body.id_servico ?? existing.id_servico;
    const dataHora = body.data_hora ?? existing.data_hora;
    const status = body.status ?? existing.status;

    if (!statuses.includes(status)) return sendJson(res, 400, { error: 'Status inválido.' });

    const error = validateBusinessDate(dataHora);
    if (error) return sendJson(res, 400, { error });
    if (hasConflict(dataHora, servicoId, id)) {
      return sendJson(res, 409, { error: 'Horário indisponível para este serviço.' });
    }

    runSql(`
      UPDATE agendamentos
      SET id_pet = ${Number(petId)}, id_servico = ${Number(servicoId)}, data_hora = ${sqlValue(dataHora)}, status = ${sqlValue(status)}
      WHERE id = ${id};
    `);
    return sendJson(res, 200, { agendamento: getOne(`SELECT id, data_hora, status FROM agendamentos WHERE id = ${id}`) });
  }

  if (adminApptMatch && req.method === 'DELETE') {
    const id = Number(adminApptMatch[1]);
    runSql(`DELETE FROM agendamentos WHERE id = ${id};`);
    return sendJson(res, 200, { ok: true });
  }

  if (url.pathname === '/api/admin/intervalos' && req.method === 'GET') {
    return sendJson(res, 200, { intervalos: getRows('SELECT * FROM intervalos_indisponiveis ORDER BY dia_semana, inicio') });
  }

  if (url.pathname === '/api/admin/intervalos' && req.method === 'POST') {
    const body = await readBody(req);
    if (!body.titulo || !body.inicio || !body.fim || !body.dias || !body.dias.length) {
      return sendJson(res, 400, { error: 'Informe título, início, fim e pelo menos um dia.' });
    }
    
    runSql('BEGIN;');
    for (const dia of body.dias) {
      runSql(`
        INSERT INTO intervalos_indisponiveis (dia_semana, titulo, inicio, fim, ativo)
        VALUES (${Number(dia)}, ${sqlValue(body.titulo)}, ${sqlValue(body.inicio)}, ${sqlValue(body.fim)}, 1);
      `);
    }
    runSql('COMMIT;');
    return sendJson(res, 201, { ok: true });
  }

  const intervalMatch = url.pathname.match(/^\/api\/admin\/intervalos\/(\d+)$/);
  if (intervalMatch && req.method === 'DELETE') {
    runSql(`DELETE FROM intervalos_indisponiveis WHERE id = ${Number(intervalMatch[1])};`);
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
    console.log(`PetWeb local rodando em http://localhost:${port}`);
    console.log(`Banco SQLite: ${dbFile}`);
    console.log('Admin: admin@petweb.com / Admin@123');
  });
}

listen(basePort);
