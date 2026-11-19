# Captures d'écran

Captures du parcours de démonstration, générées automatiquement par
`tools/walk.mjs` (pilotage Chrome via CDP).

| Fichier | Écran |
|---|---|
| `desktop-accueil.png` | Vue desktop : cadre de téléphone centré sur la carte de Kinshasa |
| `01-onboarding.png` … `03-onboarding-3.png` | Onboarding (3 slides) |
| `04-login.png` | Connexion par téléphone (+243) |
| `05-otp.png` | Saisie du code OTP |
| `06-accueil.png` | Accueil : carte, barre « Où livrer ? », raccourcis, commandes récentes |
| `07-point-retrait.png` | Choix du point de retrait (liste de lieux réels) |
| `08-point-livraison.png` | Choix du point de livraison |
| `09-type-colis.png` … `10-type-colis.png` | Type de colis, poids, photo, note |
| `11-vehicule.png` | Choix du véhicule (moto et tricycle mis en avant) |
| `12-vehicule-tricycle.png` | Tricycle sélectionné, options propres |
| `13-options.png` | Options (immédiat / programmé, aide, assurance, promo) |
| `14-options-promo.png` | Code promo appliqué |
| `15-recap.png` | Récapitulatif du trajet et du prix |
| `16-paiement.png` | Moyens de paiement |
| `17-recherche-livreur.png` | Recherche de livreur (radar) |
| `18-livreur-trouve.png` | Livreur trouvé (photo, note, plaque) |
| `19-suivi.png` | Suivi en temps réel (carte animée, ETA, stepper) |
| `20-notation.png` … `21-notation-remplie.png` | Fin de course : étoiles, pourboire, commentaire |
| `22-recu.png` | Reçu |
| `23-historique.png` … `24-historique-terminees.png` | Historique filtré |
| `25-detail-commande.png` | Détail d'une commande |
| `26-profil.png` | Profil, bascule Client / Livreur, devise |
| `26b-notifications.png` | Notifications |
| `27-livreur-inscription.png` … `28-livreur-champs.png` | Inscription livreur (champs selon véhicule) |
| `29-livreur-accueil.png` … `31-livreur-demande.png` | Accueil livreur, mise en ligne, demande entrante |
| `32-livreur-nav-retrait.png` … `36-livreur-livre.png` | Navigation livreur et code client |
| `37-livreur-gains.png` | Gains et retrait Mobile Money |
| `brand-splash.png` | Splash : lockup TOLEKA sur fond encre |
| `brand-onboarding.png` | Onboarding : illustrations au dégradé de marque |
| `brand-login.png` | Connexion : lockup en en-tête, marque cyan |
| `final-accueil.png` / `final-historique.png` / `final-profil.png` | Rendu final des écrans clés |

Regénérer :

```bash
node tools/walk.mjs ./shots        # parcours complet (37 écrans)
node tools/brand-shots.mjs ./shots  # écrans de marque
node tools/final-shots.mjs ./shots # écrans clés, desktop + mobile
```
