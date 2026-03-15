# BIM View — Visualiseur IFC 3D

Visualiseur BIM 3D interactif pour fichiers IFC. Analyse, navigation, propriétés, calques, familles et niveaux.

## 🚀 Démo en ligne

Le site est déployé automatiquement sur GitHub Pages à chaque push sur la branche `main`.

## ⚙️ Mise en place de GitHub Pages

### Étape 1 — Rendre le dépôt public

> **Oui, vous devez rendre le dépôt public** pour que GitHub Pages fonctionne avec un compte GitHub gratuit (GitHub Free).  
> Avec un compte payant (GitHub Pro, Team ou Enterprise), les dépôts privés peuvent aussi utiliser GitHub Pages.

Pour rendre le dépôt public :

1. Allez dans **Settings** (onglet en haut du dépôt)
2. Faites défiler jusqu'à la section **Danger Zone**
3. Cliquez sur **Change repository visibility** → **Make public**

### Étape 2 — Activer GitHub Pages avec GitHub Actions

1. Allez dans **Settings → Pages**
2. Sous **Source**, sélectionnez **GitHub Actions**
3. Le workflow `.github/workflows/deploy.yml` inclus dans ce dépôt se chargera du déploiement automatiquement à chaque push sur `main`

### Étape 3 — Lancer le déploiement

Faites un commit/push sur la branche `main`, ou lancez manuellement le workflow depuis l'onglet **Actions → Déployer sur GitHub Pages → Run workflow**.

## 📁 Structure

```
BIM_View.html   — Application principale
BIM_View.css    — Styles
BIM_View.js     — Logique 3D / IFC
index.html      — Page d'accueil (redirige vers BIM_View.html)
```
