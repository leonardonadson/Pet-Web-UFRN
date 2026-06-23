import { sendJson } from './_lib/response.js';

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido.' });
  }

  return sendJson(res, 200, {
    status: 'ok',
    service: 'PetWeb API'
  });
}
