import health from '../server/api/health.js';
import login from '../server/api/auth/login.js';
import cadastro from '../server/api/auth/cadastro.js';
import servicos from '../server/api/servicos/index.js';
import horarios from '../server/api/horarios/index.js';
import tiposPet from '../server/api/tipos-pet/index.js';
import disponibilidade from '../server/api/disponibilidade/index.js';
import pets from '../server/api/pets/index.js';
import petById from '../server/api/pets/[id].js';
import agendamentos from '../server/api/agendamentos/index.js';
import agendamentoById from '../server/api/agendamentos/[id]/index.js';
import cancelarAgendamento from '../server/api/agendamentos/[id]/cancelar.js';
import adminUsuarios from '../server/api/admin/usuarios/index.js';
import adminUsuarioById from '../server/api/admin/usuarios/[id].js';
import adminPets from '../server/api/admin/pets/index.js';
import adminPetById from '../server/api/admin/pets/[id].js';
import adminTiposPet from '../server/api/admin/tipos-pet/index.js';
import adminTipoPetById from '../server/api/admin/tipos-pet/[id].js';
import adminServicos from '../server/api/admin/servicos/index.js';
import adminServicoById from '../server/api/admin/servicos/[id].js';
import adminHorarios from '../server/api/admin/horarios/index.js';
import adminBloqueios from '../server/api/admin/bloqueios/index.js';
import adminBloqueioById from '../server/api/admin/bloqueios/[id].js';
import adminConfiguracoes from '../server/api/admin/configuracoes/index.js';
import adminIntervalos from '../server/api/admin/intervalos/index.js';
import adminIntervaloById from '../server/api/admin/intervalos/[id].js';
import adminAgendamentos from '../server/api/admin/agendamentos/index.js';
import adminAgendamentoById from '../server/api/admin/agendamentos/[id]/index.js';
import adminAgendamentoStatus from '../server/api/admin/agendamentos/[id]/status.js';
import { sendError } from '../server/api/_lib/response.js';

const routes = [
  ['health', health],
  ['auth/login', login],
  ['auth/cadastro', cadastro],
  ['servicos', servicos],
  ['horarios', horarios],
  ['tipos-pet', tiposPet],
  ['disponibilidade', disponibilidade],
  ['pets', pets],
  [/^pets\/(?<id>[^/]+)$/, petById],
  ['agendamentos', agendamentos],
  [/^agendamentos\/(?<id>[^/]+)$/, agendamentoById],
  [/^agendamentos\/(?<id>[^/]+)\/cancelar$/, cancelarAgendamento],
  ['admin/usuarios', adminUsuarios],
  [/^admin\/usuarios\/(?<id>[^/]+)$/, adminUsuarioById],
  ['admin/pets', adminPets],
  [/^admin\/pets\/(?<id>[^/]+)$/, adminPetById],
  ['admin/tipos-pet', adminTiposPet],
  [/^admin\/tipos-pet\/(?<id>[^/]+)$/, adminTipoPetById],
  ['admin/servicos', adminServicos],
  [/^admin\/servicos\/(?<id>[^/]+)$/, adminServicoById],
  ['admin/horarios', adminHorarios],
  ['admin/bloqueios', adminBloqueios],
  [/^admin\/bloqueios\/(?<id>[^/]+)$/, adminBloqueioById],
  ['admin/configuracoes', adminConfiguracoes],
  ['admin/intervalos', adminIntervalos],
  [/^admin\/intervalos\/(?<id>[^/]+)$/, adminIntervaloById],
  ['admin/agendamentos', adminAgendamentos],
  [/^admin\/agendamentos\/(?<id>[^/]+)$/, adminAgendamentoById],
  [/^admin\/agendamentos\/(?<id>[^/]+)\/status$/, adminAgendamentoStatus]
];

function getApiPath(req) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const rewrittenPath = url.searchParams.get('path');
  if (rewrittenPath) return rewrittenPath.replace(/^\/|\/$/g, '');

  return url.pathname.replace(/^\/api\/?/, '').replace(/\/$/, '');
}

function mergeQuery(req, params = {}) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  url.searchParams.delete('path');
  req.query = {
    ...Object.fromEntries(url.searchParams),
    ...(req.query || {}),
    ...params
  };
}

export default function handler(req, res) {
  const path = getApiPath(req);

  for (const [pattern, routeHandler] of routes) {
    if (typeof pattern === 'string' && pattern === path) {
      mergeQuery(req);
      return routeHandler(req, res);
    }

    if (pattern instanceof RegExp) {
      const match = path.match(pattern);
      if (match) {
        mergeQuery(req, match.groups || {});
        return routeHandler(req, res);
      }
    }
  }

  return sendError(res, 404, 'Rota não encontrada.');
}
