# TOLEKA Delivery — maquette interactive

Maquette **front-only** (HTML/CSS/JS vanilla, aucun build) d'une application mobile
de livraison de colis et de courses à la demande pour **Kinshasa (RDC)**.
Toutes les données sont simulées : aucun backend, aucune clé d'API.

Identité visuelle **TOLEKA** : palette cyan / encre et logo vectoriel,
extraits du fichier source `assets/logo/logo toleka.pdf`.

---

## Lancer la maquette

**Option 1 — ouvrir directement**

Double-cliquez sur `index.html`. La maquette fonctionne telle quelle.

**Option 2 — petit serveur local** (recommandé : certains navigateurs limitent les
modules ES en `file://`)

```bash
cd maquette-deliver-app
python -m http.server 8099
# puis ouvrir http://localhost:8099
```

Sur GitHub Pages : poussez le dossier tel quel sur la branche `gh-pages`.
Aucun build, aucune dépendance à installer.

---

## Identité visuelle — TOLEKA

Tous les assets de marque sont **générés à partir du logo source**
`assets/logo/logo toleka.pdf` (vectoriel + polices intégrées).

```bash
python tools/extract-brand.py
```

| Sortie | Contenu |
|---|---|
| `assets/brand/logo-lockup.svg` | le lockup officiel [marque][OLEKA] + Delivery |
| `assets/brand/logo-mark.svg` | la marque « T-flèche » seule |
| `assets/brand/logo-wordmark.svg` | le mot-symbole TOLEKA |
| `assets/brand/logo-slim.svg` | la variante [marque] + Delivery |
| `assets/brand/icon.svg` | l'icône d'app (disque dégradé) |
| `assets/fonts/*.ttf` | Montserrat Black/Light/Medium Italic (sous-ensembles du PDF) |
| `js/brand-paths.js` | les tracés, réinjectés dans le JS |

La palette et la typographie vivent dans `css/tokens.css` :

| Token | Valeur | Rôle |
|---|---|---|
| `--brand-300` | `#68C5DF` | **cyan officiel du logo** — aplats, traits, pictogrammes |
| `--brand-500` | `#1F87A8` | action (texte blanc, ratio 5.76) |
| `--brand-700` | `#10586F` | texte de marque sur fond clair |
| `--ink-900` | `#1D1C1B` | encre du logotype — texte principal |

> Le cyan `#68C5DF` est trop clair pour porter du texte blanc (ratio 1.97) :
> il reste donc réservé aux aplats et aux traits, et l'actionnel utilise un
> cyan plus sombre de la même famille.

Le rendu en SVG inline passe par `js/brand.js` (`brandLogo`, `brandMark`,
`brandIcon`), ce qui permet de piloter les couleurs par CSS.

---

## Ce qui fonctionne hors connexion

| Élément | Hors ligne ? |
|---|---|
| Interface, navigation, animations | ✅ |
| Lieux, livreurs, commandes simulés | ✅ |
| Tarification, devis, ETA | ✅ |
| Icônes SVG (dessinées à la main) | ✅ |
| Leaflet (JS + CSS auto-hébergés dans `vendor/`) | ✅ |
| Police Montserrat (auto-hébergée) | ✅ |
| **Tuiles de carte OSM** | ❌ **seule dépendance réseau** |

Sans réseau, l'application affiche une carte de repli stylisée et **tout le reste
fonctionne** : on peut commander une course, la faire accepter, la suivre et la
noter.

---

## Parcours de démonstration

### Client (11 étapes, ~2 minutes)

1. **Onboarding** — 3 slides, puis « Commencer »
2. **Connexion** — n'importe quel numéro à 9 chiffres (ex. `081 234 567`)
3. **Code OTP** — saisir `123456`
4. **Accueil** — carte de Kinshasa, barre « Où livrer ? », 4 raccourcis
5. **Point de retrait** — choisir un lieu dans la liste ou toucher la carte
6. **Contact expéditeur** — nom + téléphone
7. **Point de livraison** — idem, puis contact destinataire
8. **Type de colis** — document / petit colis / carton / gros objet / fragile,
   poids, photo simulée, note au livreur
9. **Choix du véhicule** — moto (défaut) et tricycle mis en avant, prix animé,
   options propres à chaque véhicule, avertissements contextuels
10. **Options** — immédiat ou programmé, aide au chargement, assurance,
    paiement à la livraison, code promo (`KULUNA10` = −10 %, `BIENVENUE` = −1 000 CDF)
11. **Récapitulatif + paiement** — M-Pesa, Airtel Money, Orange Money, espèces,
    portefeuille
12. **Recherche de livreur** — radar, puis fiche du livreur (photo, note, plaque)
13. **Suivi live** — le marqueur bouge le long du trajet, ETA dégressif, stepper
    à 4 statuts, code de confirmation à 6 chiffres, lien de partage
14. **Fin de course** — preuve de livraison, étoiles, commentaire, pourboire
15. **Reçu** — détail des montants

### Livreur (mode démo)

Bascule **Client / Livreur** dans l'onglet Profil.

1. **Inscription** — choisir moto / tricycle / voiture / camionnette ; les champs
   demandés changent selon le véhicule (plaque, permis, casque, box isotherme,
   bâche, capacité…)
2. **Accueil livreur** — bascule En ligne / Hors ligne, gains du jour et de la
   semaine
3. **Demande entrante** — popup avec trajet, distance, gain, type de colis et
   **minuteur de 15 s** pour accepter ou refuser
4. **Navigation** — « Je suis arrivé au retrait » → « Colis récupéré » →
   « Livré » avec **saisie du code client**

#### Le code de confirmation

Le code à 6 chiffres est **généré à la commande** (côté client) et
affiché dans l'écran de suivi. Le livreur doit le saisir pour prouver
la livraison — c'est le client qui le lui dicte.

Dans la maquette, le code est aussi affiché dans la popup de demande
côté livreur, avec un bouton « Simuler la saisie du code client » dans
la feuille de saisie. Ces deux éléments sont **aides à la
démonstration** (encadrés en pointillés ambre) : en production, le
livreur ne connaît le code que si le client le lui donne.

Le lien entre les deux côtés est réel : l'offre reçue par le livreur
reprend le code de la commande cliente en cours. Un code généré
séparément des deux côtés rendrait la validation impossible.
5. **Gains** — solde, historique des courses, retrait par Mobile Money (simulé)

### Règles de compatibilité

Un livreur ne reçoit que les courses compatibles avec son véhicule :

- poids ≤ capacité du véhicule (moto 20 kg, tricycle 300 kg, voiture 400 kg,
  camionnette 1 200 kg)
- véhicule identique à celui demandé par le client
- box isotherme exigé → livreur équipé
- remise en main propre exigée → livreur qui l’accepte
- aide au chargement exigée → livreur qui la propose

---

## Où modifier quoi

### `config/app.config.js` — le fichier unique à modifier

C'est **le** point de personnalisation. Tout ce qui est métier s'y trouve :

```js
app: { name: 'TOLEKA Delivery', ... }        // nom de l'application
currency: { default: 'CDF', rates: { ... } }  // devise et taux
pricing: {
  vehicles: {
    moto:       { base: 2000, perKm: 700,  min: 3000  },
    tricycle:   { base: 5000, perKm: 1500, min: 8000  },
    voiture:    { base: 8000, perKm: 2500, min: 10000 },
    camionnette: { base: 15000, perKm: 4000, min: 20000 },
  },
  surcharges: { aideChargement: 1000, ... },  // suppléments
  motoWeightLimitKg: 20,                     // seuil d'alerte moto
  longDistanceThresholdKm: 15,               // seuil de suggestion
}
packageTypes: [ ... ]                        // types de colis
paymentMethods: [ ... ]                      // moyens de paiement
map: { center: [...], zoom: 13 }             // cadrage de la carte
timing: { driverOfferSeconds: 15, ... }      // minuteur, recherche, animation
```

**Renommer l'application** → une seule ligne :

```js
app: { name: 'Votre Nom' }
```

### `css/tokens.css` — le thème

La palette vert/noir tient en quelques lignes :

```css
--brand-500: #0E9F6E;   /* vert d'action */
--ink-900:   #0B0F0E;   /* noir de texte */
--action:    var(--brand-500);
```

### `data/*.js` — les données simulées

| Fichier | Contenu |
|---|---|
| `places.js` | 41 lieux réels de Kinshasa (coordonnées OSM + attribution) |
| `drivers.js` | 10 livreurs (3 motos, 3 tricycles, 2 voitures, 2 camionnettes) |
| `vehicles.js` | specs des 4 véhicules + options + champs d'inscription |
| `orders.js` | historique simulé, services, adresses enregistrées |

---

## Les lieux sont réels

Les 41 lieux (marchés, stades, universités, hôpitaux, gares, centres
commerciaux…) viennent des **balises OpenStreetMap**, avec leurs coordonnées
réelles, leur rue et un lien vers openstreetmap.org. Licence ODbL.

Le collecteur est reproductible :

```bash
python tools/fetch_places.py
```

Il interroge **Photon** (`photon.komoot.io`), un moteur qui indexe OSM.
Nominatim et Overpass renvoient 403/429 depuis certains réseaux — c'est pourquoi
Photon est utilisé.

> ⚠️ Nominatim et Overpass n'acceptent qu'un *User-Agent* identifiable et
> ~1 requête/seconde. Le script respecte ce quota et écrit un cache disque
> (`.photon-bbox-cache.json`) pour reprendre après un échec réseau.

Pour remplacer les lieux par d'autres, éditez `data/places.js` directement :
le format est `{ name, cat, commune, lat, lon, street, osm, sourceUrl, licence }`.

---

## Architecture

```
maquette-deliver-app/
├─ index.html              coquille : cadre téléphone + écrans
├─ config/
│  └─ app.config.js        ← nom, devise, tarifs, seuils, carte
├─ css/
│  ├─ tokens.css           design tokens (palette, typo, espacements)
│  ├─ base.css             reset + base mobile-native
│  ├─ components.css       boutons, cartes, sheets, stepper, toasts, skeletons
│  └─ screens.css          styles spécifiques aux écrans
├─ js/
│  ├─ app.js               orchestrateur, coquille, mode client/livreur
│  ├─ router.js            pile d'écrans + transitions
│  ├─ store.js             état global + localStorage (try/catch)
│  ├─ ui.js                rendu, toasts, bottom sheets, squelettes
│  ├─ map.js               wrapper Leaflet + repli hors ligne
│  ├─ pricing.js           calcul tarif PUR (testable, sans DOM)
│  ├─ geo.js               haversine, ETA, trajectoire
│  ├─ format.js            CDF/USD, +243, dates, échappement HTML
│  ├─ tracking.js          machine à états du suivi
│  ├─ icons.js             jeu d'icônes SVG maison
│  └─ screens/             auth.js · client.js · flow.js · driver.js
├─ data/                   places · drivers · vehicles · orders
├─ assets/                 (réservé)
└─ tools/
   ├─ fetch_places.py      collecteur OSM
   ├─ test-pricing.mjs     tests de la tarification (node)
   ├─ cdp.mjs              pilote CDP (captures automatisées)
   └─ walk.mjs             parcours automatisé de bout en bout
```

**Principes tenus**

- Les modules métier (`pricing.js`, `geo.js`, `format.js`) sont **purs** :
  pas de DOM, testables avec `node`.
- Toute donnée saisie par l'utilisateur passe par `escape()` avant insertion
  dans `innerHTML`.
- Chaque accès au `localStorage` est encadré par un `try/catch`.
- Aucun état global implicite : tout passe par `store.js`.

---

## Accessibilité

- Cibles tactiles ≥ 44 px
- Contrastes ≥ 4,5:1 pour le texte courant
- Navigation clavier complète, focus visible (`outline` conservé)
- `aria-label`, `aria-checked`, `aria-live` sur les zones qui changent
- `prefers-reduced-motion` respecté : les animations se neutralisent
- Le code de confirmation et les OTP ont des labels explicites
- Lien d'évitement « Aller à l'application »

## Mobile-native

- `100dvh` / `100svh` (pas de `100vh`) → pas de débordement sous la barre d'adresse
- `-webkit-tap-highlight-color: transparent` + feedback `:active` sur chaque contrôle
- `touch-action: manipulation` → pas de délai de 300 ms
- `overscroll-behavior: none` sur la racine, `contain` sur les zones défilantes
- Champs à 16 px minimum → pas de zoom automatique sur iOS
- `viewport-fit=cover` + `env(safe-area-inset-*)` → rien sous l'encoche
- `:hover` encapsulé dans `@media (hover: hover) and (pointer: fine)`

---

## Adaptation aux écrans

La maquette s'adapte à la **taille réelle du cadre téléphone**, pas à celle
de la fenêtre qui l'héberge :

- **Sur mobile** (cadre plein écran) : le téléphone prend tout l'écran, sans
  bordure ni barre d'état simulée (le système affiche la sienne), et les
  en-têtes se replacent sous l'encoche réelle via `env(safe-area-inset-*)`.
- **Sur desktop** : cadre de téléphone 390×844 centré, avec l'encoche, la
  barre d'état simulée et la barre latérale de présentation.

Le mode est détecté par `app.js` (`watchLayout`) qui mesure le cadre et pose
la classe `.is-fullscreen` — un media query sur la fenêtre ne suffirait pas
(la maquette peut être affichée dans une fenêtre étroite tout en gardant le
cadre visible).

Vérifié sur : iPhone SE (375×667), Galaxy S (360×740), iPhone 14 (390×844),
iPad (768×1024), desktop (1440×900).

## Navigation

Un seul écran vit dans le DOM à la fois ; le bouton retour **reconstruit**
l'écran précédent à partir de la pile. Ce choix évite deux pièges :

- conserver l'écran précédent en arrière-plan fait hériter `visibility: hidden`
  aux tuiles Leaflet (`.leaflet-tile-loaded { visibility: inherit }`) → carte
  grise ;
- les écrans qui créent une carte montent de façon **asynchrone** (ils
  attendent Leaflet) : un `reset()` maladroit laissait un écran fantôme
  derrière, avec sa propre carte.

## Tests

```bash
# Tarification, distances, compatibilité véhicule (aucune dépendance)
node tools/test-pricing.mjs

# Parcours complet automatisé + captures d'écran
# (nécessite Chrome avec --remote-debugging-port=9333)
node tools/walk.mjs ./shots
```

---

## Plein écran

Au chargement, une invitation propose de passer la maquette en plein
écran (utile sur mobile, où la barre de navigateur empiète).

`requestFullscreen()` n'est accepté par le navigateur que **sur un geste
utilisateur**. Un appel automatique au chargement serait refusé : l'invitation
est donc un bouton, jamais un appel silencieux.

- **Oui** — passe en plein écran et verrouille l'orientation en portrait
  (quand l'API existe ; iOS ne la propose pas, c'est sans conséquence).
- **Plus tard** — l'invitation n'est plus proposée (mémorisé en
  `localStorage`), la maquette reste utilisable.

L'invitation n'apparaît que sur les **petits écrans** (≤ 820 px de large ou
≤ 700 px de haut). Sur un écran d'ordinateur, le cadre téléphone centré est
plus confortable que le plein écran.

## Crédits & licences

- Lieux : © [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors (ODbL)
- Tuiles : OpenStreetMap via Leaflet
- Police : [Montserrat](https://fonts.google.com/specimen/Montserrat) (SIL Open Font License), auto-hébergée dans `assets/fonts/`
- Icônes et illustrations : dessinées pour ce projet (aucune ressource tierce)

**Maquette de démonstration.** Les livreurs, les commandes, les prix et les
paiements sont fictifs. Aucun service de paiement n'est réellement appelé.
