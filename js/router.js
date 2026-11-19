/**
 * ROUTER — pile d'écrans et transitions.
 *
 * Chaque écran est un objet :
 *   { id, render(params): string, mount?(root, params): void|Promise, unmount?(): void, fullBleed?: boolean }
 *
 * ARCHITECTURE — un seul écran dans le DOM à la fois.
 *
 * Les écrans empilés (l'écran précédent laissé en place derrière) posent
 * deux problèmes difficultes à contourner :
 *   1. `visibility: hidden` se PROPAGE aux descendants — Leaflet pose
 *      `.leaflet-tile-loaded { visibility: inherit }`, donc les tuiles
 *      héritent du `hidden` et la carte devient grise ;
 *   2. le bouton retour doit réafficher un écran qui a été supprimé du DOM
 *      au push : sans conservation, le retour ne fait rien.
 *
 * On garde donc UNE seule copie de chaque écran dans la pile (ses
 * identifiants et paramètres), et le bouton retour RE-RENDRE l'écran
 * précédent. Effet de bord bienvenu : chaque écran repart d'un état propre,
 * et sa carte est recréée à la bonne taille.
 *
 * Conséquence : le `back()` est une reconstruction, pas une animation
 * inverse. On l'anime donc comme un push (glissement depuis la gauche).
 */

import { icon } from './icons.js';
import { refreshAllMaps } from './map.js';

const TRANSITION_MS = 320;

export class Router {
  /**
   * @param {HTMLElement} host conteneur des écrans (le téléphone)
   * @param {HTMLElement} statusBar barre d'état simulée
   */
  constructor(host, statusBar) {
    this.host = host;
    this.statusBar = statusBar;
    this.stack = [];
    this.screens = new Map();
    this.transitions = new Map();
    this.busy = false;
    this.currentNode = null;
  }

  /** Enregistre un écran. */
  register(screen) {
    this.screens.set(screen.id, screen);
    return this;
  }

  /** Écran actuellement affiché. */
  get current() {
    return this.stack[this.stack.length - 1] || null;
  }

  /** Enregistre une fonction de transition pour une paire d'écrans. */
  transition(fromId, toId, fn) {
    this.transitions.set(`${fromId}->${toId}`, fn);
    return this;
  }

  /**
   * Empile un écran.
   * @param {string} id
   * @param {object} params paramètres passés au rendu
   */
  push(id, params = {}) {
    const screen = this.screens.get(id);
    if (!screen) {
      console.error(`Écran inconnu : ${id}`);
      return;
    }
    if (this.busy) return;

    const prev = this.current;
    this.busy = true;

    // L'écran précédent est retiré du DOM : un seul écran vit à la fois.
    this.teardownCurrent();

    const node = document.createElement('div');
    node.className = 'screen';
    node.dataset.screen = id;
    node.innerHTML = screen.render(params);
    this.host.appendChild(node);
    this.currentNode = node;

    // La classe d'animation dépend de la transition enregistrée
    const anim = this.transitions.get(`${prev?.id}->${id}`);
    const animClass = anim || (screen.fullBleed ? 'screen-fade' : 'screen-enter-right');
    node.classList.add(animClass);

    if (screen.fullBleed) {
      this.setStatusBarDark(Boolean(screen.darkStatusBar));
    }

    this.mountScreen(screen, node, params, () => {
      this.stack.push({ id, params, screen });
      this.busy = false;
      this.updateChrome();
      refreshAllMaps();
    });
  }

  /**
   * Remplace l'écran courant (sans empiler) — pour changer d'onglet.
   */
  replace(id, params = {}) {
    const screen = this.screens.get(id);
    if (!screen) return;

    const prev = this.current;
    this.teardownCurrent();

    const node = document.createElement('div');
    node.className = 'screen';
    node.dataset.screen = id;
    node.innerHTML = screen.render(params);
    this.host.appendChild(node);
    this.currentNode = node;

    if (screen.fullBleed) {
      this.setStatusBarDark(Boolean(screen.darkStatusBar));
    }

    this.mountScreen(screen, node, params, () => {
      this.stack = [{ id, params, screen }];
      this.updateChrome();
      refreshAllMaps();
    });
  }

  /**
   * Retour arrière : on dépile et on RE-RENDRE l'écran précédent.
   * @returns {boolean} false s'il n'y a rien à dépiler
   */
  back() {
    if (this.stack.length <= 1 || this.busy) return false;
    this.busy = true;

    this.stack.pop();
    const next = this.current;
    if (!next) {
      this.busy = false;
      return false;
    }

    this.teardownCurrent();

    const node = document.createElement('div');
    node.className = 'screen';
    node.dataset.screen = next.id;
    node.innerHTML = next.screen.render(next.params);
    this.host.appendChild(node);
    this.currentNode = node;

    // Animation de retour : glissement depuis la gauche.
    node.classList.add('screen-enter-left');

    if (next.screen.fullBleed) {
      this.setStatusBarDark(Boolean(next.screen.darkStatusBar));
    }

    this.mountScreen(next.screen, node, next.params, () => {
      this.busy = false;
      this.updateChrome();
      refreshAllMaps();
    });

    return true;
  }

  /** Vide la pile et repart d'un écran. */
  reset(id, params = {}) {
    this.stack = [];
    this.busy = false;
    this.teardownCurrent();
    this.push(id, params);
  }

  /**
   * Monte un écran et appelle `done` une fois le montage terminé.
   * Le montage peut être asynchrone (écrans avec carte : ils attendent
   * Leaflet). Si le nœud a été supprimé entre-temps, on abandonne.
   */
  mountScreen(screen, node, params, done) {
    let mounted;
    try {
      mounted = screen.mount?.(node, params);
    } catch (e) {
      console.error(`Erreur de montage (${screen.id}) :`, e);
      done();
      return;
    }

    if (mounted && typeof mounted.then === 'function') {
      mounted
        .then(() => {
          if (!node.isConnected) return;   // l'écran a été quitté pendant l'attente
          const body = node.querySelector('.screen-body');
          if (body) body.scrollTop = 0;
          done();
        })
        .catch((e) => {
          console.error(`Erreur de montage (${screen.id}) :`, e);
          if (node.isConnected) done();
        });
      return;
    }

    const body = node.querySelector('.screen-body');
    if (body) body.scrollTop = 0;
    done();
  }

  /** Détruise l'écran courant (DOM + unmount). */
  teardownCurrent() {
    const node = this.currentNode;
    if (!node) return;
    const entry = this.stack[this.stack.length - 1];
    entry?.screen.unmount?.();
    node.remove();
    this.currentNode = null;
  }

  /** Applique la couleur de la barre d'état. */
  setStatusBarDark(dark) {
    if (!this.statusBar) return;
    this.statusBar.classList.toggle('is-dark', dark);
  }

  /** Met à jour les éléments globaux (titre, onglets). */
  updateChrome() {
    const cur = this.current;
    window.dispatchEvent(
      new CustomEvent('route:changed', {
        detail: { id: cur?.id, params: cur?.params, depth: this.stack.length },
      })
    );
  }
}

/* ------------------------------------------------------------------ */
/* Chrome global : barre d'état + en-tête                              */
/* ------------------------------------------------------------------ */

/**
 * Construit la barre d'état simulée (heure, icônes).
 * @returns {HTMLElement}
 */
export function createStatusBar() {
  const now = new Date();
  const time = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const el = document.createElement('div');
  el.className = 'statusbar';
  el.innerHTML = `
    <span>${time}</span>
    <span class="statusbar-icons">
      ${icon('navigation', { size: 12, cls: '' })}
      ${signalBars()}
      ${batteryIcon()}
    </span>
  `;
  return el;
}

function signalBars() {
  return `<svg width="16" height="12" viewBox="0 0 16 12" aria-hidden="true" fill="currentColor">
    <rect x="0" y="8" width="3" height="4" rx="1"/>
    <rect x="4.5" y="5.5" width="3" height="6.5" rx="1"/>
    <rect x="9" y="3" width="3" height="9" rx="1"/>
    <rect x="13" y="0.5" width="3" height="11.5" rx="1" opacity=".35"/>
  </svg>`;
}

function batteryIcon() {
  return `<svg width="24" height="12" viewBox="0 0 24 12" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.2">
    <rect x="0.6" y="0.6" width="19" height="10.8" rx="3"/>
    <rect x="2.4" y="2.4" width="13" height="7.2" rx="1.6" fill="currentColor" stroke="none"/>
    <path d="M21.5 4v4a2.2 2.2 0 0 0 0-4Z" fill="currentColor" stroke="none"/>
  </svg>`;
}
