export function sendJson(res, statusCode, data) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.status(statusCode).json(data);
}

export function sendError(res, statusCode, message) {
  return sendJson(res, statusCode, { error: message });
}

export function methodNotAllowed(res) {
  return sendError(res, 405, 'Método não permitido.');
}
