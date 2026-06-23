INSERT INTO servicos (nome, descricao, preco, tempo_estimado, ativo)
VALUES
  ('Banho', 'Banho completo com produtos adequados ao tipo de pelo.', 49.90, 60, TRUE),
  ('Tosa', 'Tosa higienica ou personalizada com acabamento cuidadoso.', 69.90, 90, TRUE),
  ('Banho + Tosa', 'Pacote completo de banho, tosa e finalizacao.', 99.90, 120, TRUE),
  ('Consulta Veterinaria', 'Avaliacao clinica com medico veterinario.', 120.00, 45, TRUE),
  ('Vacinacao', 'Aplicacao de vacina com conferencia da carteirinha.', 89.90, 30, TRUE),
  ('Hospedagem', 'Diaria com acompanhamento, alimentacao e recreacao.', 140.00, 1440, TRUE)
ON CONFLICT (nome) DO UPDATE
SET descricao = EXCLUDED.descricao,
    preco = EXCLUDED.preco,
    tempo_estimado = EXCLUDED.tempo_estimado,
    ativo = EXCLUDED.ativo;

INSERT INTO tipos_pet (nome, ativo)
VALUES
  ('Cão', TRUE),
  ('Gato', TRUE),
  ('Outro', TRUE)
ON CONFLICT (nome) DO UPDATE
SET ativo = EXCLUDED.ativo;

INSERT INTO usuarios (nome, email, senha_hash, telefone, tipo_perfil)
VALUES (
  'Administrador PetWeb',
  'admin@petweb.com',
  '$2b$10$Z1tIQy0ziKtwpR3ziThZwe5IoJrxkS3uaomjpa5Z7rAUubKWbPeLG',
  '(85) 99999-0000',
  'admin'
)
ON CONFLICT (email) DO UPDATE
SET nome = EXCLUDED.nome,
    senha_hash = EXCLUDED.senha_hash,
    telefone = EXCLUDED.telefone,
    tipo_perfil = EXCLUDED.tipo_perfil;

INSERT INTO horarios_funcionamento (dia_semana, nome_dia, abre, fecha, ultimo_inicio, bloqueado)
VALUES
  (0, 'Domingo', NULL, NULL, NULL, TRUE),
  (1, 'Segunda-feira', '08:00', '18:00', '17:00', FALSE),
  (2, 'Terça-feira', '08:00', '18:00', '17:00', FALSE),
  (3, 'Quarta-feira', '08:00', '18:00', '17:00', FALSE),
  (4, 'Quinta-feira', '08:00', '18:00', '17:00', FALSE),
  (5, 'Sexta-feira', '08:00', '18:00', '17:00', FALSE),
  (6, 'Sábado', '08:00', '12:00', '11:00', FALSE)
ON CONFLICT (dia_semana) DO UPDATE
SET nome_dia = EXCLUDED.nome_dia,
    abre = EXCLUDED.abre,
    fecha = EXCLUDED.fecha,
    ultimo_inicio = EXCLUDED.ultimo_inicio,
    bloqueado = EXCLUDED.bloqueado;

INSERT INTO intervalos_indisponiveis (dia_semana, titulo, inicio, fim, ativo)
SELECT v.dia_semana, 'Almoço', TIME '12:00', TIME '13:00', TRUE
FROM (VALUES (1), (2), (3), (4), (5)) AS v(dia_semana)
WHERE NOT EXISTS (SELECT 1 FROM intervalos_indisponiveis WHERE titulo = 'Almoço');

INSERT INTO configuracoes (chave, valor)
VALUES ('capacidade_simultanea', '1')
ON CONFLICT (chave) DO NOTHING;
