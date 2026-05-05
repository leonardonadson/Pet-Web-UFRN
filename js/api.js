const API_URL = '';

function getToken() {
  return localStorage.getItem('petweb_token');
}

function getCurrentUser() {
  const raw = localStorage.getItem('petweb_user');
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function setSession(token, usuario) {
  localStorage.setItem('petweb_token', token);
  localStorage.setItem('petweb_user', JSON.stringify(usuario));
}

function clearSession() {
  localStorage.removeItem('petweb_token');
  localStorage.removeItem('petweb_user');
}

async function apiFetch(endpoint, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const { authRedirect = true, ...fetchOptions } = options;
  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers
  });

  const data = await response.json().catch(() => ({}));

  if (response.status === 401 && authRedirect) {
    clearSession();
    window.location.href = '/login.html';
    return null;
  }

  if (!response.ok) {
    throw new Error(data.error || 'Erro inesperado.');
  }

  return data;
}

window.PetWebApi = {
  getToken,
  getCurrentUser,
  setSession,
  clearSession,
  apiFetch
};
