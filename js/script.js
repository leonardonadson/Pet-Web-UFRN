const header = document.querySelector('.header');
const hamburger = document.querySelector('[data-menu-toggle]');
const mobileNav = document.querySelector('[data-mobile-nav]');
const navOverlay = document.querySelector('[data-nav-overlay]');
const heroBg = document.querySelector('.hero__bg');

window.escapeHtml = function escapeHtml(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
};
function formatCurrency(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function getServiceSvg(iconName) {
  const svgs = {
    paw: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 4.5a2.5 2.5 0 0 0-5 0c0 4.5 5 10.5 5 10.5s5-6 5-10.5a2.5 2.5 0 0 0-5 0Z"/><path d="M12 15v5"/><path d="M9 20h6"/></svg>',
    bath: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6 6.5 3.5a1.5 1.5 0 0 0-1-.5C4.683 3 4 3.683 4 4.5V17a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5"/><path d="M10 5 L8 7 M2 12 h20 M7 19 v2 M17 19 v2"/></svg>',
    scissors: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>',
    stethoscope: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 2v2"/><path d="M5 2v2"/><path d="M11 6V4.6a.6.6 0 0 0-.6-.6h-4.8a.6.6 0 0 0-.6.6V6"/><path d="M14 8v1.1a2.5 2.5 0 0 1-5.002.04l-.002-1.14"/><path d="M8.5 11.5 10 13l-3 3-1.5-1.5"/><path d="M6 15v3a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-3"/><path d="M14 17h.01"/><path d="M16 11h2c1.1 0 2 .9 2 2v2c0 1.1-.9 2-2 2h-2"/></svg>',
    syringe: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 2 4 4"/><path d="m17 7 3-3"/><path d="M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.4 0-3.4L15 5"/><path d="m9 11 4 4"/><path d="m5 19-3 3"/><path d="m14 4 6 6"/></svg>',
    house: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
    dog: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2.823.47-4.113 6.006-4 7 .08.703 1.725 1.722 3.656 1 1.261-.472 1.96-1.45 2.344-2.5"/><path d="M14.267 5.172c0-1.39 1.577-2.493 3.5-2.172 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.855-1.45-2.239-2.5"/><path d="M8 14v.5"/><path d="M16 14v.5"/><path d="M11.25 16.25h1.5L12 17l-.75-.75Z"/><path d="M4.42 11.247A13.152 13.152 0 0 0 4 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444c0-1.061-.162-2.2-.493-3.309m-9.243-6.082A8.801 8.801 0 0 1 12 5c.78 0 1.5.108 2.161.306"/></svg>',
    cat: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5c.67 0 1.35.09 2 .26 1.78-2 5.03-2.84 6.42-2.26 1.4.58-.42 7-.42 7 .57 1.07 1 2.24 1 3.44C21 17.9 16.97 21 12 21s-9-3.1-9-7.56c0-1.25.5-2.4 1-3.44 0 0-1.89-6.42-.5-7 1.39-.58 4.72.23 6.5 2.23A9.04 9.04 0 0 1 12 5Z"/><path d="M8 14v.5"/><path d="M16 14v.5"/><path d="M11.25 16.25h1.5L12 17l-.75-.75Z"/></svg>',
    bone: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 10c.7-.7 1.69 0 2.5 0a2.5 2.5 0 1 0 0-5 .5.5 0 0 1-.5-.5 2.5 2.5 0 1 0-5 0c0 .81.7 1.8 0 2.5l-7 7c-.7.7-1.69 0-2.5 0a2.5 2.5 0 0 0 0 5 .5.5 0 0 1 .5.5 2.5 2.5 0 1 0 5 0c0-.81-.7-1.8 0-2.5Z"/></svg>',
    heart: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
    activity: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>',
    star: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
    clock: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
    sparkles: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M3 5h4"/><path d="M19 17v4"/><path d="M17 19h4"/></svg>',
    award: '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>'
  };
  if (!iconName) return [svgs.paw];
  return String(iconName).split(',').map(name => svgs[name.trim()] || svgs.paw);
}
window.getServiceSvg = getServiceSvg;

function renderAuthNavigation() {
  const user = window.PetWebApi?.getCurrentUser?.();
  const targets = document.querySelectorAll('[data-auth-actions]');
  if (!targets.length) return;

  targets.forEach((target) => {
    if (user) {
      const dashboardHref = user.tipo_perfil === 'admin' ? 'admin.html' : 'dashboard.html';
      const dashboardText = user.tipo_perfil === 'admin' ? 'Painel Admin' : 'Meu Painel';
      const roleText = user.tipo_perfil === 'admin' ? 'admin' : 'cliente';
      const firstName = user.nome.split(' ')[0];
      const initials = String(user.nome).trim().split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase();

      target.innerHTML = `
        <a class="btn btn-outline btn-sm" href="${dashboardHref}" style="margin-right:var(--space-2)">${dashboardText}</a>
        <div class="dropdown">
          <button class="header__profile-toggle" type="button" aria-haspopup="true" aria-expanded="false" data-dropdown-toggle>
            <span class="avatar header__avatar">${initials}</span>
            <span class="header__profile-name">${firstName}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>
          <div class="dropdown-menu">
            <div class="dropdown-header">
              <strong>${escapeHtml(user.nome)}</strong>
              <small>${roleText}</small>
            </div>
            <button class="dropdown-item text-danger" type="button" data-logout>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              Sair do PetWeb
            </button>
          </div>
        </div>
      `;
      return;
    }

    target.innerHTML = `
      <a class="btn btn-ghost btn-sm" href="login.html">Entrar</a>
      <a class="btn btn-cta btn-sm" href="cadastro.html">Cadastre-se</a>
    `;
  });
}

function renderAuthMobile() {
  const user = window.PetWebApi?.getCurrentUser?.();
  const target = document.querySelector('[data-auth-mobile]');
  if (!target) return;

  if (user) {
    const dashboardHref = user.tipo_perfil === 'admin' ? 'admin.html' : 'dashboard.html';
    const dashboardText = user.tipo_perfil === 'admin' ? 'Painel Admin' : 'Meu Painel';
    const roleLabel = user.tipo_perfil === 'admin' ? 'Administrador' : 'Cliente';
    const initials = String(user.nome).trim().split(/\s+/).slice(0, 2).map(n => n[0]).join('').toUpperCase();

    target.innerHTML = `
      <div class="mobile-profile-card">
        <div class="mobile-profile-card__top">
          <span class="avatar mobile-profile-card__avatar">${initials}</span>
          <div class="mobile-profile-card__info">
            <strong>${escapeHtml(user.nome)}</strong>
            <span>${roleLabel}</span>
          </div>
        </div>
        <a class="btn btn-outline" href="${dashboardHref}" style="width:100%">${dashboardText}</a>
        <button class="btn mobile-profile-card__logout" type="button" data-logout style="width:100%">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          Sair do PetWeb
        </button>
      </div>
    `;
  } else {
    target.innerHTML = `
      <a href="login.html" class="btn btn-outline" style="width:100%">Entrar</a>
      <a href="cadastro.html" class="btn btn-cta" style="width:100%">Cadastre-se</a>
    `;
  }
}

function setupLogout() {
  document.addEventListener('click', (event) => {
    if (!event.target.closest('[data-logout]')) return;
    window.PetWebApi?.clearSession?.();
    window.location.href = '/index.html';
  });
}

function setHeaderState() {
  if (!header) return;
  header.classList.toggle('scrolled', window.scrollY > 20);
}

function closeMobileNav() {
  document.querySelectorAll('[data-menu-toggle]').forEach(btn => {
    btn.classList.remove('open');
    btn.setAttribute('aria-expanded', 'false');
  });
  mobileNav?.classList.remove('open');
  navOverlay?.classList.remove('open');
  document.body.classList.remove('nav-open');
}
window.closeMobileNav = closeMobileNav;

function setupMobileNav() {
  if (!mobileNav) return;

  document.querySelectorAll('[data-menu-toggle]').forEach(btn => {
    btn.addEventListener('click', () => {
      const isOpen = mobileNav.classList.toggle('open');
      navOverlay?.classList.toggle('open', isOpen);
      document.body.classList.toggle('nav-open', isOpen);
      hamburger?.classList.toggle('open', isOpen);
      hamburger?.setAttribute('aria-expanded', String(isOpen));
    });
  });

  navOverlay?.addEventListener('click', closeMobileNav);

  mobileNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', closeMobileNav);
  });
}

function setupSmoothAnchors() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      event.preventDefault();
      closeMobileNav();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  });
}

function setupParallax() {
  if (!heroBg) return;

  window.addEventListener('scroll', () => {
    const offset = Math.min(window.scrollY * 0.12, 80);
    heroBg.style.transform = `translateY(${offset}px)`;
  }, { passive: true });
}

function setupReveal() {
  const items = document.querySelectorAll('.reveal');

  if (!('IntersectionObserver' in window)) {
    items.forEach((item) => item.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.16 });

  items.forEach((item) => observer.observe(item));
}

function setupCounters() {
  const counters = document.querySelectorAll('[data-counter]');
  if (!counters.length) return;

  const animate = (counter) => {
    const target = Number(counter.dataset.counter);
    const suffix = counter.dataset.suffix || '';
    const prefix = counter.dataset.prefix || '';
    const duration = 1100;
    const start = performance.now();

    const frame = (time) => {
      const progress = Math.min((time - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = target % 1 === 0 ? Math.round(target * eased) : (target * eased).toFixed(1);
      counter.textContent = `${prefix}${value}${suffix}`;
      if (progress < 1) requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animate(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.6 });

  counters.forEach((counter) => observer.observe(counter));
}

function setupDialogs() {
  document.querySelectorAll('[data-dialog-open]').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const dialog = document.querySelector(trigger.dataset.dialogOpen);
      dialog?.showModal();
    });
  });

  document.querySelectorAll('[data-dialog-close]').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      trigger.closest('dialog')?.close();
    });
  });
}

function setupDropdowns() {
  document.addEventListener('click', (event) => {
    const isDropdownButton = event.target.closest('[data-dropdown-toggle]');
    
    if (!isDropdownButton && event.target.closest('.dropdown-menu')) {
      return;
    }

    if (isDropdownButton) {
      const dropdown = isDropdownButton.closest('.dropdown');
      dropdown.classList.toggle('active');
      const expanded = dropdown.classList.contains('active');
      isDropdownButton.setAttribute('aria-expanded', String(expanded));
      
      document.querySelectorAll('.dropdown.active').forEach(openDropdown => {
        if (openDropdown !== dropdown) {
          openDropdown.classList.remove('active');
          const btn = openDropdown.querySelector('[data-dropdown-toggle]');
          if (btn) btn.setAttribute('aria-expanded', 'false');
        }
      });
      return;
    }
    
    document.querySelectorAll('.dropdown.active').forEach(openDropdown => {
      openDropdown.classList.remove('active');
      const btn = openDropdown.querySelector('[data-dropdown-toggle]');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });
  });
}

window.showToast = function showToast(message, type = 'success') {
  let toast = document.querySelector('.toast');

  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    toast.setAttribute('role', 'status');
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.className = `toast toast--${type} toast--visible`;

  window.clearTimeout(window.__petwebToastTimer);
  window.__petwebToastTimer = window.setTimeout(() => {
    toast.classList.remove('toast--visible');
  }, 3200);
};

window.addEventListener('scroll', setHeaderState, { passive: true });

document.addEventListener('DOMContentLoaded', () => {
  setHeaderState();
  renderAuthNavigation();
  renderAuthMobile();
  setupLogout();
  setupMobileNav();
  setupSmoothAnchors();
  setupParallax();
  setupReveal();
  setupCounters();
  setupDialogs();
  setupDropdowns();
});
