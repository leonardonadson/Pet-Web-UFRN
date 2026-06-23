import { neon } from '@neondatabase/serverless';

let sqlClient;

const TABLE_NAMES = [
  'usuarios',
  'pets',
  'tipos_pet',
  'servicos',
  'agendamentos',
  'horarios_funcionamento',
  'excecoes_funcionamento',
  'intervalos_indisponiveis',
  'configuracoes'
];

function quoteIdentifier(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function shouldQualifySchema() {
  return process.env.DB_SCHEMA && process.env.DB_SCHEMA !== 'public';
}

function qualifyTables(query) {
  if (!shouldQualifySchema()) return query;

  const schema = quoteIdentifier(process.env.DB_SCHEMA);
  return TABLE_NAMES.reduce((sql, table) => {
    const quotedTable = `${schema}.${quoteIdentifier(table)}`;
    return sql.replace(new RegExp(`(?<![."\\w])${table}(?!["\\w])`, 'g'), quotedTable);
  }, query);
}

function qualifyTemplate(strings) {
  const qualified = Array.from(strings, qualifyTables);
  qualified.raw = Array.from(strings.raw || strings, qualifyTables);
  return qualified;
}

export function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL não configurada.');
  }

  if (!sqlClient) {
    const sql = neon(process.env.DATABASE_URL);
    sqlClient = (strings, ...values) => {
      if (typeof strings === 'string') {
        return sql(qualifyTables(strings), ...values);
      }

      return sql(qualifyTemplate(strings), ...values);
    };
  }

  return sqlClient;
}
