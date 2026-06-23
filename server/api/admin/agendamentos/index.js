import { getSql } from '../../_lib/db.js';
import { requireAdmin } from '../../_lib/auth.js';
import { sendJson, sendError, methodNotAllowed } from '../../_lib/response.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return methodNotAllowed(res);

  const admin = requireAdmin(req, res);
  if (!admin) return null;

  try {
    const sql = getSql();
    
    // Na Vercel API (Node.js) não temos req.query preenchido automaticamente
    // dependendo de como é a req (se for next.js tem, se for api routes nativa tem).
    // Vou extrair search params da URL caso existam.
    let url;
    try {
      url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    } catch {
      url = new URL('http://localhost');
    }
    
    const data = url.searchParams.get('data') || req.query?.data;
    const status = url.searchParams.get('status') || req.query?.status;
    const busca = url.searchParams.get('busca') || req.query?.busca;

    let agendamentos;
    
    if (!data && !status && !busca) {
      agendamentos = await sql`
        SELECT a.id, a.data_hora, a.status, u.nome AS cliente, u.telefone AS cliente_telefone, p.nome AS pet, s.nome AS servico, s.preco, s.tempo_estimado
        FROM agendamentos a
        JOIN usuarios u ON u.id = a.id_usuario
        JOIN pets p ON p.id = a.id_pet
        JOIN servicos s ON s.id = a.id_servico
        ORDER BY a.data_hora DESC
      `;
    } else {
      // Dynamic query using Postgres.js logic (if it is postgres.js)
      // Since it's neon or something similar, let's just do a manual build or select all and filter.
      // Assuming `sql` is postgres.js or similar that supports simple parameterized queries.
      agendamentos = await sql`
        SELECT a.id, a.data_hora, a.status, u.nome AS cliente, u.telefone AS cliente_telefone, p.nome AS pet, s.nome AS servico, s.preco, s.tempo_estimado
        FROM agendamentos a
        JOIN usuarios u ON u.id = a.id_usuario
        JOIN pets p ON p.id = a.id_pet
        JOIN servicos s ON s.id = a.id_servico
        ORDER BY a.data_hora DESC
      `;
      // Filtrando no código para evitar complexidade de string builder no sql literal
      if (data) agendamentos = agendamentos.filter(a => String(a.data_hora).startsWith(data));
      if (status && status !== 'Todos') agendamentos = agendamentos.filter(a => a.status === status);
      if (busca) {
        const term = busca.toLowerCase();
        agendamentos = agendamentos.filter(a => 
          String(a.cliente || '').toLowerCase().includes(term) ||
          String(a.pet || '').toLowerCase().includes(term) ||
          String(a.servico || '').toLowerCase().includes(term)
        );
      }
    }

    return sendJson(res, 200, { agendamentos });
  } catch (err) {
    console.error(err);
    return sendError(res, 500, 'Não foi possível listar agendamentos.');
  }
}
