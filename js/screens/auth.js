/**
 * ÉCRANS — Authentification (splash, onboarding, connexion, OTP) et profil.
 */

import CONFIG from '../../config/app.config.js';
import { SAVED_ADDRESSES } from '../../data/orders.js';
import { VEHICLES } from '../../data/vehicles.js';
import { icon } from '../icons.js';
import { brandLogo, brandIcon, brandMark } from '../brand.js';
import { escape, money, phone as fmtPhone, phoneBlocks, dateShort, relative } from '../format.js';
import { getState, setState, changeCurrency } from '../store.js';
import { $, $$, toast, openSheet, openModal, notice, emptyState, field } from '../ui.js';

/* ------------------------------------------------------------------ */
/* SPLASH                                                              */
/* ------------------------------------------------------------------ */

export const splashScreen = (app) => ({
  id: 'splash',
  fullBleed: true,
  darkStatusBar: true,

  render() {
    return `
      <div class="splash">
        <div class="splash-logo">${brandLogo(58, { markColor: 'var(--brand-300)', textColor: '#FFFFFF' })}</div>
        <div class="splash-tagline">${escape(CONFIG.app.tagline)}</div>
        <div class="splash-loader"></div>
      </div>
    `;
  },

  mount(root) {
    setTimeout(() => {
      // Le splash peut avoir été remplacé (reset, retour) pendant
      // l'attente : on ne navigue alors que si l'écran est toujours là.
      if (!document.body.contains(root)) return;
      const s = getState();
      app.router.replace(s.onboarded ? (s.isAuthenticated ? 'home' : 'login') : 'onboarding');
    }, 1500);
  },
});

/* ------------------------------------------------------------------ */
/* ONBOARDING                                                          */
/* ------------------------------------------------------------------ */

const ONBOARD_SLIDES = [
  {
    iconName: 'package',
    title: 'Un colis, un livreur, votre porte',
    text: 'Déposez votre colis et un livreur disponible vient le chercher. Moto, tricycle, voiture ou camionnette.',
  },
  {
    iconName: 'shopping-basket',
    title: 'Vos courses, à votre place',
    text: 'Envoyez quelqu’un faire vos achats au marché ou en boutique, et rapportez tout chez vous.',
  },
  {
    iconName: 'shieldCheck',
    title: 'Suivi en temps réel',
    text: 'Voyez le livreur arriver, suivez la route, échangez par message et confirmez la réception par code.',
  },
];

export const onboardingScreen = (app) => ({
  id: 'onboarding',
  fullBleed: true,

  render() {
    return `
      <div class="onboard">
        <div class="onboard-art">
          ${ONBOARD_SLIDES.map(
            (s, i) => `
            <div class="onboard-slide ${i === 0 ? 'is-active' : ''}" data-slide="${i}">
              <div class="onboard-illustration">${icon(s.iconName, { size: 56 })}</div>
              <h1 class="onboard-title">${escape(s.title)}</h1>
              <p class="onboard-text">${escape(s.text)}</p>
            </div>`
          ).join('')}
        </div>

        <div style="padding:0 var(--sp-6) var(--sp-6)">
          <div class="onboard-dots">
            ${ONBOARD_SLIDES.map((_, i) => `<span class="onboard-dot ${i === 0 ? 'is-active' : ''}"></span>`).join('')}
          </div>
          <button class="btn btn-primary btn-block btn-lg" id="onboardNext">Commencer</button>
          <button class="btn btn-ghost btn-block btn-sm" id="onboardSkip" style="margin-top:var(--sp-2)">Passer</button>
        </div>
      </div>
    `;
  },

  mount(root) {
    let index = 0;

    const show = (i) => {
      index = i;
      $$('[data-slide]', root).forEach((s) => s.classList.toggle('is-active', Number(s.dataset.slide) === i));
      $$('.onboard-dot', root).forEach((d, di) => d.classList.toggle('is-active', di === i));
      const btn = root.querySelector('#onboardNext');
      btn.firstChild.textContent = i === ONBOARD_SLIDES.length - 1 ? 'Créer un compte' : 'Suivant';
    };

    root.querySelector('#onboardNext')?.addEventListener('click', () => {
      if (index < ONBOARD_SLIDES.length - 1) {
        show(index + 1);
      } else {
        setState({ onboarded: true });
        app.router.replace('login');
      }
    });

    root.querySelector('#onboardSkip')?.addEventListener('click', () => {
      setState({ onboarded: true });
      app.router.replace('login');
    });
  },
});

/* ------------------------------------------------------------------ */
/* CONNEXION PAR TÉLÉPHONE                                             */
/* ------------------------------------------------------------------ */

export const loginScreen = (app) => ({
  id: 'login',

  render() {
    return `
      <header class="appbar" style="justify-content:center">
        ${brandLogo(28, { markColor: 'var(--brand-300)', textColor: 'var(--ink-900)', subtitle: false })}
      </header>

      <div class="screen-body screen-body-pad">
        <div style="text-align:center;margin:var(--sp-6) 0 var(--sp-8)">
          <span style="display:grid;place-items:center;width:76px;height:76px;border-radius:24px;background:var(--grad-brand);color:#fff;margin:0 auto var(--sp-4);box-shadow:var(--shadow-brand)">
            ${brandMark(34, { color: '#FFFFFF' })}
          </span>
          <h1 style="font-size:var(--fs-h1)">Connectez-vous</h1>
          <p class="muted small" style="margin-top:var(--sp-2);max-width:28ch;margin-inline:auto">
            Entrez votre numéro congolais. Un code vous sera envoyé par SMS.
          </p>
        </div>

        ${field({
          id: 'loginPhone',
          label: 'Numéro de téléphone',
          control: `
            <div class="phone-input">
              <span class="phone-prefix">${escape(CONFIG.app.phonePrefix)}</span>
              <div class="phone-blocks">
                <input class="input phone-block" id="p1" inputmode="numeric" maxlength="2" placeholder="81" aria-label="Deux premiers chiffres">
                <input class="input phone-block" id="p2" inputmode="numeric" maxlength="3" placeholder="234" aria-label="Chiffres suivants">
                <input class="input phone-block" id="p3" inputmode="numeric" maxlength="4" placeholder="567" aria-label="Derniers chiffres">
              </div>
            </div>`,
        })}

        <p class="xsmall muted" style="margin-top:var(--sp-2)">
          ${icon('info', { size: 12 })} Numéro de démonstration : 081 234 567
        </p>

        <button class="btn btn-primary btn-block btn-lg" id="sendCode" style="margin-top:var(--sp-6)">
          Recevoir le code ${icon('arrow-right', { size: 18 })}
        </button>

        <div class="divider-label" style="margin:var(--sp-6) 0 var(--sp-4)">ou</div>

        <button class="btn btn-secondary btn-block" id="skipLogin">
          Explorer sans compte ${icon('arrow-right', { size: 17 })}
        </button>
      </div>
    `;
  },

  mount(root) {
    const blocks = ['#p1', '#p2', '#p3'].map((s) => root.querySelector(s));

    blocks.forEach((input, i) => {
      input?.addEventListener('input', () => {
        input.value = input.value.replace(/\D/g, '');
        if (input.value.length === Number(input.maxLength) && blocks[i + 1]) {
          blocks[i + 1].focus();
        }
      });
      input?.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && !input.value && blocks[i - 1]) {
          blocks[i - 1].focus();
        }
      });
    });

    root.querySelector('#sendCode')?.addEventListener('click', () => {
      const digits = blocks.map((b) => b.value).join('');
      if (digits.length < 9) {
        toast('Entrez les 9 chiffres de votre numéro', { type: 'error' });
        blocks.find((b) => !b.value)?.focus();
        return;
      }
      setState({ phone: digits });
      app.router.push('otp');
    });

    root.querySelector('#skipLogin')?.addEventListener('click', () => {
      setState({ isAuthenticated: true });
      app.router.replace('home');
    });
  },
});

/* ------------------------------------------------------------------ */
/* OTP (simulé)                                                        */
/* ------------------------------------------------------------------ */

export const otpScreen = (app) => ({
  id: 'otp',

  render() {
    const phone = getState().phone;

    return `
      <header class="appbar">
        <button class="icon-btn" data-back aria-label="Retour">${icon('arrow-left', { size: 20 })}</button>
        <div class="grow"></div>
      </header>

      <div class="screen-body screen-body-pad">
        <div style="text-align:center;margin:var(--sp-6) 0 var(--sp-6)">
          <h1 style="font-size:var(--fs-h1)">Code de vérification</h1>
          <p class="muted small" style="margin-top:var(--sp-2)">
            Code envoyé au ${escape(fmtPhone(phone))}
          </p>
        </div>

        <input class="otp-input" id="otpInput" inputmode="numeric" maxlength="6" placeholder="000000" aria-label="Code à 6 chiffres">

        <div id="otpMsg" style="margin-top:var(--sp-3);min-height:44px"></div>

        <button class="btn btn-primary btn-block btn-lg" id="verifyBtn">Vérifier</button>

        <button class="btn btn-ghost btn-block btn-sm" id="resendBtn" style="margin-top:var(--sp-3)">
          Renvoyer le code
        </button>

        <div class="notice notice-info" style="margin-top:var(--sp-6)">
          <span class="notice-icon">${icon('info', { size: 18 })}</span>
          <span>
            <strong>Démonstration</strong><br>
            Le code est <strong>123456</strong>. Saisissez-le pour continuer.
          </span>
        </div>
      </div>
    `;
  },

  mount(root) {
    const input = root.querySelector('#otpInput');
    const msg = root.querySelector('#otpMsg');

    setTimeout(() => input.focus(), 300);

    input?.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '');
      if (input.value.length === 6) verify();
    });

    function verify() {
      if (input.value !== '123456') {
        msg.innerHTML = notice('danger', 'Code incorrect', 'Vérifiez le code reçu par SMS.');
        input.value = '';
        return;
      }
      msg.innerHTML = '';
      setState({ isAuthenticated: true });
      toast('Connexion réussie', { type: 'success', iconName: 'check' });
      app.router.replace('home');
    }

    root.querySelector('#verifyBtn')?.addEventListener('click', verify);
    root.querySelector('#resendBtn')?.addEventListener('click', () => {
      toast('Nouveau code envoyé', { iconName: 'message' });
    });
  },
});

/* ------------------------------------------------------------------ */
/* PROFIL                                                               */
/* ------------------------------------------------------------------ */

export const profileScreen = (app) => ({
  id: 'profile',

  render() {
    const s = getState();
    const profile = s.driver.profile;
    const isDriverMode = s.mode === 'livreur';

    const items = isDriverMode
      ? [
          { id: 'driver-earnings', icon: 'wallet', label: 'Mes gains', value: money((s.driver.trips || []).reduce((a, t) => a + t.gain, 0)) },
          { id: 'driver-signup', icon: 'briefcase', label: 'Mon véhicule', value: profile?.vehicle ? VEHICLES[profile.vehicle].name : 'À configurer' },
          { id: 'support', icon: 'headphones', label: 'Aide et support' },
          { id: 'settings', icon: 'settings', label: 'Paramètres' },
        ]
      : [
          { id: 'addresses', icon: 'map-pin', label: 'Adresses enregistrées', value: `${SAVED_ADDRESSES.length}` },
          { id: 'payments', icon: 'card', label: 'Moyens de paiement', value: '3' },
          { id: 'wallet', icon: 'wallet', label: 'Mon portefeuille', value: money(12500) },
          { id: 'support', icon: 'headphones', label: 'Aide et support' },
          { id: 'settings', icon: 'settings', label: 'Paramètres' },
          { id: 'language', icon: 'language', label: 'Langue', value: 'Français' },
        ];

    return `
      <header class="appbar">
        <div class="grow">
          <div class="appbar-title">Profil</div>
          <div class="appbar-sub">${escape(s.phone ? fmtPhone(s.phone) : 'Compte de démonstration')}</div>
        </div>
        <button class="icon-btn" id="notifBtn" aria-label="Notifications">${icon('bell', { size: 19 })}</button>
      </header>

      <div class="screen-body screen-body-pad">
        <!-- Carte utilisateur -->
        <div class="card" style="margin-bottom:var(--sp-4);display:flex;align-items:center;gap:var(--sp-3)">
          <span class="driver-avatar" style="background:var(--brand-100);color:var(--brand-700)">
            ${s.phone ? 'CL' : '??'}
            <span class="online-dot"></span>
          </span>
          <span class="grow">
            <span class="semibold">${s.phone ? 'Client Delivery Express' : 'Invité'}</span>
            <span class="small muted" style="display:block">Membre depuis 2026 · ${s.orders.length} commande(s)</span>
          </span>
        </div>

        <!-- Bascule Client / Livreur -->
        <div class="mode-switch" style="margin-bottom:var(--sp-4)" role="group" aria-label="Mode">
          <button data-mode="client" aria-pressed="${!isDriverMode}">Client</button>
          <button data-mode="livreur" aria-pressed="${isDriverMode}">Livreur</button>
        </div>

        <!-- Menu -->
        <div class="card-flat" style="overflow:hidden">
          ${items
            .map(
              (it) => `
            <button class="order-row" data-menu="${it.id}" style="width:100%;text-align:left">
              <span class="order-icon">${icon(it.icon, { size: 19 })}</span>
              <span class="grow" style="min-width:0">
                <span class="semibold small" style="display:block">${escape(it.label)}</span>
              </span>
              ${it.value ? `<span class="small muted">${escape(it.value)}</span>` : ''}
              <span style="color:var(--ink-300);flex-shrink:0">${icon('chevron-right', { size: 17 })}</span>
            </button>`
            )
            .join('')}
        </div>

        <!-- Devise -->
        <div class="card" style="margin-top:var(--sp-4);display:flex;align-items:center;justify-content:space-between;gap:var(--sp-3)">
          <span>
            <span class="semibold small" style="display:block">Devise</span>
            <span class="xsmall muted">Les prix s’affichent dans la devise choisie</span>
          </span>
          <span class="currency-toggle" role="group" aria-label="Devise">
            ${CONFIG.currency.available
              .map(
                (c) => `
              <button data-currency="${c}" aria-pressed="${s.currency === c}">${c}</button>`
              )
              .join('')}
          </span>
        </div>

        <button class="btn btn-ghost btn-block" id="logoutBtn" style="margin-top:var(--sp-4);color:var(--danger)">
          ${icon('logout', { size: 18 })} Se déconnecter
        </button>

        <p class="xsmall muted" style="text-align:center;margin-top:var(--sp-5)">
          ${escape(CONFIG.app.name)} v${escape(CONFIG.app.version)} · Maquette de démonstration<br>
          ${escape(CONFIG.app.city)}, ${escape(CONFIG.app.country)}
        </p>
      </div>
    `;
  },

  mount(root) {
    $$('[data-mode]', root).forEach((btn) => {
      btn.addEventListener('click', () => {
        app.switchMode(btn.dataset.mode);
      });
    });

    $$('[data-menu]', root).forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.menu;
        if (['addresses', 'payments', 'wallet', 'support', 'settings', 'language'].includes(id)) {
          app.router.push('profile-sub', { section: id });
        } else if (id === 'driver-earnings') {
          app.router.push('driver-earnings');
        } else if (id === 'driver-signup') {
          app.router.push('driver-signup');
        }
      });
    });

    $$('[data-currency]', root).forEach((btn) => {
      btn.addEventListener('click', () => {
        changeCurrency(btn.dataset.currency);
        app.router.push('profile', { force: true });
        toast(`Devise : ${btn.dataset.currency}`, { iconName: 'tag' });
      });
    });

    root.querySelector('#logoutBtn')?.addEventListener('click', () => {
      openModal({
        title: 'Se déconnecter ?',
        body: 'Vous devrai ressaisir votre numéro pour revenir.',
        actions: [
          {
            label: 'Se déconnecter',
            variant: 'danger',
            onClick: () => {
              setState({ isAuthenticated: false, onboarded: true });
              app.router.reset('splash');
            },
          },
          { label: 'Rester connecté', variant: 'secondary' },
        ],
        container: app.phoneEl,
      });
    });
  },
});

/* ------------------------------------------------------------------ */
/* SOUS-ÉCRANS DE PROFIL                                                */
/* ------------------------------------------------------------------ */

export const profileSubScreen = (app) => ({
  id: 'profile-sub',

  render(params) {
    const section = params.section;
    const s = getState();

    const sections = {
      addresses: {
        title: 'Adresses enregistrées',
        body: `
          <div class="stack gap-2">
            ${SAVED_ADDRESSES.map(
              (a) => `
              <div class="card">
                <div class="between">
                  <span class="semibold small">${escape(a.label)}</span>
                  <button class="icon-btn" aria-label="Modifier">${icon('chevron-right', { size: 17 })}</button>
                </div>
                <div class="small" style="margin-top:var(--sp-1)">${escape(a.place)}</div>
                <div class="xsmall muted">${escape(a.street)}</div>
                ${a.note ? `<div class="xsmall muted">${icon('info', { size: 11 })} ${escape(a.note)}</div>` : ''}
              </div>`
            ).join('')}
            <button class="btn btn-secondary btn-block">${icon('plus', { size: 17 })} Ajouter une adresse</button>
          </div>`,
      },
      payments: {
        title: 'Moyens de paiement',
        body: `
          <div class="stack gap-2">
            ${CONFIG.paymentMethods
              .filter((p) => p.id !== 'especes')
              .map(
                (p) => `
              <div class="card">
                <div class="between">
                  <span class="row gap-3">
                    <span style="display:grid;place-items:center;width:38px;height:38px;border-radius:var(--r-sm);background:${p.color || 'var(--ink-100)'};color:${p.color ? '#fff' : 'var(--ink-600)'};font-weight:800;font-size:11px">${escape(p.logo.slice(0, 2).toUpperCase())}</span>
                    <span>
                      <span class="semibold small" style="display:block">${escape(p.label)}</span>
                      <span class="xsmall muted">${escape(p.sub)}</span>
                    </span>
                  </span>
                  <span class="badge badge-success">Par défaut</span>
                </div>
              </div>`
              )
              .join('')}
          </div>`,
      },
      wallet: {
        title: 'Mon portefeuille',
        body: `
          <div class="card" style="background:var(--ink-900);color:var(--text-inverse);border:none">
            <div class="xsmall" style="opacity:.7">Solde disponible</div>
            <div class="amount amount-lg" style="margin:var(--sp-1) 0">${money(12500)}</div>
            <button class="btn btn-primary btn-block">${icon('plus', { size: 17 })} Recharger</button>
          </div>
          <div class="card" style="margin-top:var(--sp-3)">
            <div class="between">
              <span class="small muted">Versement vers M-Pesa</span>
              <span class="semibold small">+243 81 234 567</span>
            </div>
          </div>`,
      },
      support: {
        title: 'Aide et support',
        body: `
          <div class="stack gap-2">
            ${[
              ['message', 'Envoyer un message', 'Réponse sous 24 h'],
              ['phone', 'Appeler le support', '+243 800 000 000'],
              ['help', 'Questions fréquentes', 'Retraits, colis, paiements'],
            ]
              .map(
                ([ic, label, sub]) => `
              <button class="card" style="width:100%;text-align:left;display:flex;align-items:center;gap:var(--sp-3)">
                <span style="display:grid;place-items:center;width:38px;height:38px;border-radius:var(--r-sm);background:var(--action-soft);color:var(--action-soft-text)">${icon(ic, { size: 18 })}</span>
                <span class="grow">
                  <span class="semibold small" style="display:block">${escape(label)}</span>
                  <span class="xsmall muted">${escape(sub)}</span>
                </span>
                <span style="color:var(--ink-300)">${icon('chevron-right', { size: 17 })}</span>
              </button>`
              )
              .join('')}
          </div>`,
      },
      settings: {
        title: 'Paramètres',
        body: `
          <div class="card-flat" style="overflow:hidden">
            ${[
              ['Notifications push', true],
              ['Notifications par SMS', false],
              ['Mode économie de données', true],
              ['Suivi GPS en continu', true],
            ]
              .map(
                ([label, on]) => `
              <div class="order-row">
                <span class="grow"><span class="semibold small">${escape(label)}</span></span>
                <button class="switch" role="switch" aria-checked="${on}" aria-label="${escape(label)}"></button>
              </div>`
              )
              .join('')}
          </div>`,
      },
      language: {
        title: 'Langue',
        body: `
          <div class="card-flat" style="overflow:hidden">
            ${[
              ['Français', true],
              ['Lingala', false],
              ['Kikongo', false],
              ['Swahili', false],
            ]
              .map(
                ([label, on]) => `
              <div class="order-row">
                <span class="grow"><span class="semibold small">${escape(label)}</span></span>
                ${on ? `<span class="badge badge-brand">${icon('check', { size: 12, stroke: 3 })}</span>` : ''}
              </div>`
              )
              .join('')}
          </div>`,
      },
    };

    const sec = sections[section] || { title: 'Paramètres', body: '' };

    return `
      <header class="appbar">
        <button class="icon-btn" data-back aria-label="Retour">${icon('arrow-left', { size: 20 })}</button>
        <div class="grow">
          <div class="appbar-title">${escape(sec.title)}</div>
        </div>
      </header>
      <div class="screen-body screen-body-pad">${sec.body}</div>
    `;
  },

  mount(root) {
    $$('.switch', root).forEach((sw) => {
      sw.addEventListener('click', () => {
        const on = sw.getAttribute('aria-checked') === 'true';
        sw.setAttribute('aria-checked', String(!on));
      });
    });
  },
});
