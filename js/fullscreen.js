/**
 * FULLSCREEN — invitation à passer en plein écran.
 *
 * CONTRAINTE DU NAVIGATEUR : `requestFullscreen()` n'est accepté que dans un
 * geste utilisateur direct (clic, touche). Un appel automatique au
 * chargement est refusé, sans exception ni exception possible.
 *
 * On procède donc en deux temps :
 *   1. une invitation cliquable, affichée au démarrage sur les écrans où le
 *      plein écran a du sens (mobile) ;
 *   2. si l'utilisateur accepte, on bascule en plein écran ET on active le
 *      verrouillage de l'orientation en portrait (quand l'API existe).
 *
 * L'invitation n'apparaît pas :
 *   - si le navigateur ne gère pas le plein écran ;
 *   - si la page est déjà en plein écran ;
 *   - si l'utilisateur l'a déjà refusée (mémorisé en localStorage) ;
 *   - sur un écran d'ordinateur, où le cadre téléphone est plus confortable.
 */

const STORAGE_KEY = 'delivery-express-fullscreen-dismissed';

/** Vrai si l'API de plein écran est disponible. */
export function isSupported() {
  return Boolean(
    document.documentElement.requestFullscreen ||
      document.documentElement.webkitRequestFullscreen ||
      document.documentElement.msRequestFullscreen
  );
}

/** Vrai si la page est déjà en plein écran. */
export function isFullscreen() {
  return Boolean(
    document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.msFullscreenElement
  );
}

/** Vrai si l'utilisateur a déjà refusé l'invitation. */
function isDismissed() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch (e) {
    return false;
  }
}

function rememberDismissed() {
  try {
    localStorage.setItem(STORAGE_KEY, '1');
  } catch (e) {
    /* stockage indisponible */
  }
}

/**
 * Demande le plein écran + le verrouillage portrait.
 * @returns {Promise<boolean>} true si le plein écran est actif
 */
export async function request() {
  const el = document.documentElement;

  try {
    if (el.requestFullscreen) {
      await el.requestFullscreen({ navigationUI: 'hide' });
    } else if (el.webkitRequestFullscreen) {
      el.webkitRequestFullscreen();
    } else if (el.msRequestFullscreen) {
      el.msRequestFullscreen();
    } else {
      return false;
    }
  } catch (e) {
    // Refusé (absence de geste utilisateur, iframe sans allow, etc.)
    return false;
  }

  await lockPortrait();
  return true;
}

/**
 * Verrouille l'orientation en portrait.
 * L'API n'existe pas sur iOS : c'est normal, on l'ignore.
 */
async function lockPortrait() {
  try {
    if (screen.orientation && screen.orientation.lock) {
      await screen.orientation.lock('portrait');
    }
  } catch (e) {
    // Non supporté (iOS, ou contexte non sécurisé) : sans conséquence.
  }
}

/** Quitte le plein écran. */
export async function exit() {
  try {
    if (document.exitFullscreen) {
      await document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  } catch (e) {
    /* déjà sorti */
  }
}

/**
 * Affiche l'invitation au plein écran.
 *
 * @param {object} opts
 * @param {HTMLElement} opts.container où l'invitation est insérée
 * @param {Function} [opts.onAccept] appelé après acceptation
 * @param {Function} [opts.onDismiss] appelé si l'utilisateur refuse
 * @returns {HTMLElement|null} l'invitation créée
 */
export function showInvitation(opts) {
  const { container, onAccept, onDismiss } = opts;

  if (!isSupported() || isFullscreen() || isDismissed()) return null;

  const invite = document.createElement('div');
  invite.className = 'fs-invite';
  invite.setAttribute('role', 'dialog');
  invite.setAttribute('aria-label', 'Passer en plein écran');
  invite.innerHTML = `
    <div class="fs-invite-card">
      <span class="fs-invite-icon" aria-hidden="true">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/>
        </svg>
      </span>
      <div class="fs-invite-text">
        <p class="fs-invite-title">Passer en plein écran</p>
        <p class="fs-invite-desc">La maquette occupera tout l'écran, sans barre de navigateur.</p>
      </div>
      <div class="fs-invite-actions">
        <button class="btn btn-primary btn-sm" data-fs-accept>Oui</button>
        <button class="btn btn-ghost btn-sm" data-fs-dismiss>Plus tard</button>
      </div>
    </div>
  `;

  container.appendChild(invite);

  // Animation d'entrée
  requestAnimationFrame(() => invite.classList.add('is-visible'));

  invite.querySelector('[data-fs-accept]')?.addEventListener('click', async () => {
    const ok = await request();
    close();
    if (ok) {
      toastFullscreen('Plein écran activé');
    } else {
      toastFullscreen('Le navigateur a refusé le plein écran');
    }
    onAccept?.(ok);
  });

  invite.querySelector('[data-fs-dismiss]')?.addEventListener('click', () => {
    rememberDismissed();
    close();
    onDismiss?.();
  });

  function close() {
    invite.classList.remove('is-visible');
    setTimeout(() => invite.remove(), 260);
  }

  return invite;
}

/** Petit message non bloquant (le toast global vit dans le téléphone). */
function toastFullscreen(message) {
  const host = document.body.appendChild(document.createElement('div'));
  host.className = 'fs-toast';
  host.setAttribute('role', 'status');
  host.textContent = message;
  requestAnimationFrame(() => host.classList.add('is-visible'));
  setTimeout(() => {
    host.classList.remove('is-visible');
    setTimeout(() => host.remove(), 260);
  }, 2600);
}
