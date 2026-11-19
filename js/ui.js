/**
 * UI — rendu, toasts, bottom sheets, squelettes, aides de composition.
 * Module d'affichage pur : il ne connaît pas la logique métier,
 * il reçoit des données et produit du DOM.
 */

import { icon } from './icons.js';
import { escape } from './format.js';

/* ------------------------------------------------------------------ */
/* Sélection                                                          */
/* ------------------------------------------------------------------ */

/**
 * Sélectionne tous les éléments correspondant au sélecteur.
 * @param {string} selector
 * @param {ParentNode} [root]
 */
export const $ = (selector, root = document) => root.querySelector(selector);
export const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

/**
 * Crée un élément depuis une chaîne HTML.
 * @param {string} html
 * @returns {HTMLElement}
 */
export function el(html) {
  const tpl = document.createElement('template');
  tpl.innerHTML = html.trim();
  return tpl.content.firstElementChild;
}

/** Échappe puis injecte du HTML dans un conteneur. */
export function render(host, html) {
  host.innerHTML = html;
  return host;
}

/* ------------------------------------------------------------------ */
/* Toasts                                                              */
/* ------------------------------------------------------------------ */

let toastHost = null;

function ensureToastHost() {
  if (!toastHost || !document.body.contains(toastHost)) {
    toastHost = el('<div class="toast-host" role="status" aria-live="polite"></div>');
    document.body.appendChild(toastHost);
  }
  return toastHost;
}

/**
 * Affiche un message temporaire.
 * @param {string} message
 * @param {{type?: 'default'|'success'|'error', duration?: number, iconName?: string}} opts
 */
export function toast(message, opts = {}) {
  const { type = 'default', duration = 2800, iconName } = opts;
  const host = ensureToastHost();
  const cls = type === 'success' ? ' toast-success' : type === 'error' ? ' toast-error' : '';
  const glyph = iconName ? icon(iconName, { size: 18 }) : '';
  const node = el(`<div class="toast${cls}">${glyph}<span>${escape(message)}</span></div>`);
  host.appendChild(node);

  setTimeout(() => {
    node.classList.add('is-leaving');
    setTimeout(() => node.remove(), 220);
  }, duration);

  return node;
}

/* ------------------------------------------------------------------ */
/* Bottom sheet                                                        */
/* ------------------------------------------------------------------ */

/**
 * Ouvre une feuille depuis le bas.
 * @param {object} opts
 * @param {string} opts.title
 * @param {string} opts.content  HTML du contenu
 * @param {string} [opts.footer] HTML du pied (bouton d'action)
 * @param {ParentNode} [opts.container] conteneur de référence (le téléphone)
 * @param {Function} [opts.onClose]
 * @returns {{ close: Function, element: HTMLElement }}
 */
export function openSheet(opts) {
  const { title, content, footer = '', container = document.body, onClose } = opts;

  const backdrop = el('<div class="sheet-backdrop"></div>');
  const sheet = el(`
    <div class="sheet" role="dialog" aria-modal="true" aria-label="${escape(title)}">
      <div class="sheet-handle" aria-hidden="true"></div>
      <div class="sheet-header">
        <h2 class="sheet-title">${escape(title)}</h2>
        <button class="icon-btn" data-sheet-close aria-label="Fermer">${icon('x', { size: 20 })}</button>
      </div>
      <div class="sheet-content">${content}</div>
      ${footer ? `<div class="sheet-footer">${footer}</div>` : ''}
    </div>
  `);

  container.appendChild(backdrop);
  container.appendChild(sheet);

  // Ouvre au prochain frame pour que la transition se déclenche
  requestAnimationFrame(() => {
    backdrop.classList.add('is-open');
    sheet.classList.add('is-open');
  });

  let closed = false;
  const close = () => {
    if (closed) return;
    closed = true;
    backdrop.classList.remove('is-open');
    sheet.classList.remove('is-open');
    setTimeout(() => {
      backdrop.remove();
      sheet.remove();
      if (onClose) onClose();
    }, 380);
  };

  backdrop.addEventListener('click', close);
  sheet.querySelector('[data-sheet-close]')?.addEventListener('click', close);

  // Fermeture par glissement sur la poignée
  const handle = sheet.querySelector('.sheet-handle');
  let startY = null;
  handle?.addEventListener('pointerdown', (e) => {
    startY = e.clientY;
    handle.setPointerCapture(e.pointerId);
  });
  handle?.addEventListener('pointerup', (e) => {
    if (startY === null) return;
    const dy = e.clientY - startY;
    if (dy > 60) close();
    startY = null;
  });

  return { close, element: sheet };
}

/* ------------------------------------------------------------------ */
/* Modale                                                             */
/* ------------------------------------------------------------------ */

/**
 * Ouvre une boîte de dialogue centrée.
 * @param {{title:string, body:string, actions:Array<{label:string, variant?:string, onClick?:Function}>, container?:ParentNode}} opts
 */
export function openModal(opts) {
  const { title, body, actions = [], container = document.body } = opts;
  const backdrop = el(`
    <div class="modal-backdrop" role="dialog" aria-modal="true" aria-label="${escape(title)}">
      <div class="modal">
        <div class="card-section" style="text-align:center">
          <h2 class="sheet-title" style="margin-bottom:var(--sp-2)">${escape(title)}</h2>
          <p class="small muted">${body}</p>
        </div>
        <div class="card-section" style="display:flex;flex-direction:column;gap:var(--sp-2)">
          ${actions
            .map(
              (a, i) =>
                `<button class="btn btn-${a.variant || 'secondary'} btn-block" data-modal-action="${i}">${escape(a.label)}</button>`
            )
            .join('')}
        </div>
      </div>
    </div>
  `);

  container.appendChild(backdrop);

  const close = () => backdrop.remove();
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  $$('[data-modal-action]', backdrop).forEach((btn) => {
    const idx = Number(btn.dataset.modalAction);
    btn.addEventListener('click', () => {
      const action = actions[idx];
      close();
      if (action && action.onClick) action.onClick();
    });
  });

  return { close, element: backdrop };
}

/* ------------------------------------------------------------------ */
/* Squelettes de chargement                                           */
/* ------------------------------------------------------------------ */

/** Squelette de carte de commande. */
export function skeletonOrder() {
  return `
    <div class="order-row">
      <div class="skeleton skeleton-circle"></div>
      <div class="grow">
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line"></div>
      </div>
    </div>
  `;
}

/** Squelette de carte de véhicule. */
export function skeletonVehicle() {
  return `
    <div class="vehicle-card" style="pointer-events:none">
      <div class="skeleton" style="width:68px;height:68px;border-radius:var(--r-md)"></div>
      <div class="grow">
        <div class="skeleton skeleton-line" style="width:45%"></div>
        <div class="skeleton skeleton-line" style="width:70%"></div>
        <div class="skeleton skeleton-line" style="width:35%;height:18px"></div>
      </div>
    </div>
  `;
}

/** Squelette de ligne de liste. */
export function skeletonLine(n = 3) {
  return Array.from({ length: n })
    .map(
      () => `
      <div class="card" style="margin-bottom:var(--sp-2)">
        <div class="skeleton skeleton-line"></div>
        <div class="skeleton skeleton-line"></div>
      </div>`
    )
    .join('');
}

/* ------------------------------------------------------------------ */
/* Composants réutilisables (HTML)                                    */
/* ------------------------------------------------------------------ */

/**
 * Ligne de commande pour l'historique.
 * @param {object} order
 */
export function orderRow(order) {
  const statusMap = {
    en_cours: { label: 'En cours', cls: 'badge-brand' },
    terminee: { label: 'Livrée', cls: 'badge-success' },
    annulee: { label: 'Annulée', cls: 'badge-danger' },
  };
  const st = statusMap[order.status] || statusMap.en_cours;
  const iconName = order.service === 'courses' ? 'shopping-basket' : order.service === 'documents' ? 'file-text' : 'package';

  return `
    <button class="order-row" data-order="${escape(order.id)}" style="width:100%;text-align:left">
      <span class="order-icon">${icon(iconName, { size: 20 })}</span>
      <span class="grow" style="min-width:0">
        <span class="between" style="gap:var(--sp-2)">
          <span class="semibold truncate">${escape(order.pickup?.name || 'Course')}</span>
          <span class="badge ${st.cls}">${st.label}</span>
        </span>
        <span class="small muted truncate" style="display:block">
          ${icon('map-pin', { size: 12, cls: '' })} vers ${escape(order.dropoff?.name || '—')}
        </span>
      </span>
    </button>
  `;
}

/**
 * Étape du stepper de statut.
 * @param {object} opts {label, state:'done'|'current'|'todo', time?}
 */
export function statusStep(opts) {
  const { label, state = 'todo', time } = opts;
  return `
    <li class="step ${state === 'done' ? 'is-done' : state === 'current' ? 'is-current' : ''}">
      <span class="step-rail">
        <span class="step-dot">${icon('check', { size: 15, stroke: 3 })}</span>
      </span>
      <span>
        <span class="step-label" style="display:block">${escape(label)}</span>
        ${time ? `<span class="step-time">${escape(time)}</span>` : ''}
      </span>
    </li>
  `;
}

/**
 * Ligne de détail (récapitulatif).
 */
export function lineItem(label, value, cls = '') {
  return `
    <div class="line-item ${cls}">
      <dt>${escape(label)}</dt>
      <dd>${value}</dd>
    </div>
  `;
}

/**
 * État vide standardisé.
 */
export function emptyState(opts) {
  const { iconName = 'package', title, text, action = '' } = opts;
  return `
    <div class="empty">
      <span class="empty-icon">${icon(iconName, { size: 26 })}</span>
      <p class="empty-title">${escape(title)}</p>
      <p class="empty-text">${escape(text)}</p>
      ${action}
    </div>
  `;
}

/**
 * Bloc d'avertissement.
 */
export function notice(level, title, text, action = '') {
  const iconName = level === 'danger' ? 'alert' : level === 'warning' ? 'alert' : level === 'success' ? 'shieldCheck' : 'info';
  return `
    <div class="notice notice-${level}">
      <span class="notice-icon">${icon(iconName, { size: 18 })}</span>
      <span class="grow">
        <strong>${escape(title)}</strong><br>
        <span>${escape(text)}</span>
        ${action ? `<div style="margin-top:var(--sp-2)">${action}</div>` : ''}
      </span>
    </div>
  `;
}

/**
 * Champ de formulaire complet (label + contrôle + aide).
 */
export function field(opts) {
  const { id, label, hint = '', control } = opts;
  return `
    <div class="field">
      <label class="field-label" for="${escape(id)}">${escape(label)}</label>
      ${control}
      ${hint ? `<span class="field-hint">${escape(hint)}</span>` : ''}
    </div>
  `;
}
