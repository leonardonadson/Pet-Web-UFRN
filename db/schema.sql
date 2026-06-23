CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  senha_hash VARCHAR(255) NOT NULL,
  telefone VARCHAR(20),
  tipo_perfil VARCHAR(10) DEFAULT 'cliente' CHECK (tipo_perfil IN ('cliente', 'admin')),
  google_sub VARCHAR(255) UNIQUE,
  auth_provider VARCHAR(30) DEFAULT 'local',
  criado_em TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS pets (
  id SERIAL PRIMARY KEY,
  id_usuario INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nome VARCHAR(80) NOT NULL,
  especie VARCHAR(40) NOT NULL,
  raca VARCHAR(80),
  porte VARCHAR(20) CHECK (porte IN ('Pequeno', 'Médio', 'Grande')),
  observacoes TEXT,
  criado_em TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tipos_pet (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(60) UNIQUE NOT NULL,
  ativo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS servicos (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(100) NOT NULL UNIQUE,
  descricao TEXT,
  preco DECIMAL(8,2) NOT NULL,
  tempo_estimado INT NOT NULL,
  tempo_buffer INT DEFAULT 15,
  ativo BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS agendamentos (
  id SERIAL PRIMARY KEY,
  id_usuario INT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  id_pet INT NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  id_servico INT NOT NULL REFERENCES servicos(id),
  data_hora TIMESTAMP NOT NULL,
  status VARCHAR(20) DEFAULT 'Pendente'
    CHECK (status IN ('Pendente', 'Confirmado', 'Em Andamento', 'Concluído', 'Cancelado')),
  criado_em TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS horarios_funcionamento (
  dia_semana INT PRIMARY KEY CHECK (dia_semana BETWEEN 0 AND 6),
  nome_dia VARCHAR(30) NOT NULL,
  abre TIME,
  fecha TIME,
  ultimo_inicio TIME,
  bloqueado BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS excecoes_funcionamento (
  id SERIAL PRIMARY KEY,
  data DATE NOT NULL,
  titulo VARCHAR(120) NOT NULL,
  tipo VARCHAR(20) DEFAULT 'fechado' CHECK (tipo IN ('fechado', 'horario_especial')),
  abre TIME,
  fecha TIME,
  ultimo_inicio TIME,
  recorrente_anual BOOLEAN DEFAULT FALSE,
  criado_em TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_tipos_pet_ativo ON tipos_pet(ativo);
CREATE INDEX IF NOT EXISTS idx_pets_usuario ON pets(id_usuario);
CREATE INDEX IF NOT EXISTS idx_agendamentos_usuario ON agendamentos(id_usuario);
CREATE INDEX IF NOT EXISTS idx_agendamentos_data_hora ON agendamentos(data_hora);
CREATE INDEX IF NOT EXISTS idx_agendamentos_status ON agendamentos(status);
CREATE INDEX IF NOT EXISTS idx_excecoes_data ON excecoes_funcionamento(data);
