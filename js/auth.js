const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function setFieldState(input, isValid, message = '') {
  const field = input.closest('.field');
  const error = field?.querySelector('.field__error');
  if (!field) return;

  field.classList.toggle('field--valid', isValid);
  field.classList.toggle('field--invalid', !isValid && input.value.length > 0);
  if (error) error.textContent = message;
}

function validatePassword(value) {
  if (value.length < 8) return 'A senha deve ter pelo menos 8 caracteres.';
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return 'Use letras e números na senha.';
  return '';
}

function setupPasswordStrength(input) {
  const meter = document.querySelector('.password-strength span');
  if (!input || !meter) return;

  input.addEventListener('input', () => {
    const value = input.value;
    let score = 0;
    if (value.length >= 8) score += 1;
    if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
    if (/\d/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;

    meter.style.width = `${Math.max(score, 1) * 25}%`;
    meter.style.background = score >= 3 ? 'var(--clr-success)' : score === 2 ? 'var(--clr-warning)' : 'var(--clr-error)';
  });
}

function setupAuthForms() {
  const loginForm = document.querySelector('[data-login-form]');
  const signupForm = document.querySelector('[data-signup-form]');
  const passwordInput = document.querySelector('#senha');
  const params = new URLSearchParams(window.location.search);
  const nextUrl = params.get('next') || '';
  const safeNext = nextUrl.startsWith('/') ? nextUrl : '';

  document.querySelectorAll('[data-signup-link]').forEach((link) => {
    if (safeNext) link.href = `/cadastro.html?next=${encodeURIComponent(safeNext)}`;
  });

  document.querySelectorAll('[data-login-link]').forEach((link) => {
    if (safeNext) link.href = `/login.html?next=${encodeURIComponent(safeNext)}`;
  });

  setupPasswordStrength(passwordInput);

  document.querySelectorAll('input[type="email"]').forEach((input) => {
    input.addEventListener('input', () => {
      const valid = emailRegex.test(input.value);
      setFieldState(input, valid, valid || !input.value ? '' : 'Informe um e-mail válido.');
    });
  });

  document.querySelectorAll('input[type="tel"]').forEach((input) => {
    input.addEventListener('input', () => {
      const digits = input.value.replace(/\D/g, '').slice(0, 11);
      input.value = digits
        .replace(/^(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
    });
  });

  loginForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    loginForm.querySelectorAll('.field__error').forEach(el => el.textContent = '');
    loginForm.querySelectorAll('.field').forEach(el => el.classList.remove('field--invalid', 'field--valid'));

    const email = loginForm.email.value;
    const senha = loginForm.senha.value;
    
    let hasError = false;
    
    if (!emailRegex.test(email)) {
      setFieldState(loginForm.email, false, 'Informe um e-mail válido.');
      hasError = true;
    }
    
    if (!senha) {
      setFieldState(loginForm.senha, false, 'Informe sua senha.');
      hasError = true;
    }

    if (hasError) {
      return;
    }

    const button = loginForm.querySelector('button[type="submit"]');
    button.classList.add('loading');

    try {
      const data = await window.PetWebApi.apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, senha }),
        authRedirect: false
      });

      window.PetWebApi.setSession(data.token, data.usuario);
      window.location.href = safeNext || (data.usuario.tipo_perfil === 'admin' ? '/admin.html' : '/dashboard.html');
    } catch (error) {
      window.showToast(error.message, 'error');
    } finally {
      button.classList.remove('loading');
    }
  });

  signupForm?.addEventListener('submit', async (event) => {
    event.preventDefault();
    
    signupForm.querySelectorAll('.field__error').forEach(el => el.textContent = '');
    signupForm.querySelectorAll('.field').forEach(el => el.classList.remove('field--invalid', 'field--valid'));

    const formData = new FormData(signupForm);
    const nome = formData.get('nome');
    const email = formData.get('email');
    const telefone = formData.get('telefone');
    const senha = formData.get('senha');
    const confirmar = formData.get('confirmar_senha');
    
    let hasError = false;

    if (!nome || nome.trim().length === 0) {
      setFieldState(signupForm.nome, false, 'Preencha o nome completo.');
      hasError = true;
    }
    
    if (!emailRegex.test(email)) {
      setFieldState(signupForm.email, false, 'Informe um e-mail válido.');
      hasError = true;
    }
    
    if (!telefone || telefone.replace(/\D/g, '').length < 10) {
      setFieldState(signupForm.telefone, false, 'Informe um telefone válido com DDD.');
      hasError = true;
    }

    const passwordError = validatePassword(senha);
    if (passwordError) {
      setFieldState(signupForm.senha, false, passwordError);
      hasError = true;
    }
    
    if (!passwordError && senha !== confirmar) {
      setFieldState(signupForm.confirmar_senha, false, 'As senhas não coincidem.');
      hasError = true;
    }

    if (!signupForm.termos.checked) {
      window.showToast('Você precisa aceitar os Termos de Uso.', 'error');
      hasError = true;
    }

    if (hasError) {
      window.showToast('Revise os campos em destaque.', 'error');
      return;
    }

    const button = signupForm.querySelector('button[type="submit"]');
    button.classList.add('loading');

    try {
      const data = await window.PetWebApi.apiFetch('/api/auth/cadastro', {
        method: 'POST',
        body: JSON.stringify({
          nome: formData.get('nome'),
          email: formData.get('email'),
          telefone: formData.get('telefone'),
          senha
        }),
        authRedirect: false
      });

      window.PetWebApi.setSession(data.token, data.usuario);
      window.showToast('Cadastro criado. Você já está logado.', 'success');
      window.setTimeout(() => {
        window.location.href = safeNext || '/dashboard.html';
      }, 900);
    } catch (error) {
      window.showToast(error.message, 'error');
    } finally {
      button.classList.remove('loading');
    }
  });
}

document.addEventListener('DOMContentLoaded', setupAuthForms);
