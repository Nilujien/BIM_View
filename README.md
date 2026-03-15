# BIM View — Visualiseur IFC 3D

**BIM View** est un visualiseur BIM 3D interactif entièrement côté client, permettant d'ouvrir et d'explorer des fichiers IFC (IFC2x3 · IFC4) directement dans le navigateur, sans installation ni serveur requis.

---

## 🌐 Page publique (GitHub Pages)

L'application est accessible en ligne à l'adresse suivante :

> **https://nilujien.github.io/BIM_View/BIM_View.html**

La racine du site redirige automatiquement vers l'application :

> https://nilujien.github.io/BIM_View/

---

## 🚀 Fonctionnalités

- Ouverture de fichiers `.ifc` et `.ifczip` (glisser-déposer ou bouton)
- Navigation 3D : orbite, panoramique, zoom
- Plan de coupe interactif (hauteur réglable)
- Modes de rendu : solide, filaire, X-Ray
- Panneau Structure BIM (calques, familles, niveaux)
- Recherche d'éléments
- Panneau Propriétés IFC (attributs, données personnalisées)
- Vues rapides (dessus, face, isométrique)
- Boussole et indicateur de statut WebGL

---

## 💻 Utilisation en local

Aucune installation requise. Il suffit d'ouvrir `BIM_View.html` dans un navigateur moderne supportant ES Modules et WebGL 2.0 (Chrome, Firefox, Edge, Safari 15+).

> ⚠️ Pour charger des fichiers IFC en local, lancez un serveur HTTP simple :
> ```bash
> # Python 3
> python3 -m http.server 8080
> # puis ouvrir http://localhost:8080/BIM_View.html
> ```

---

## 🔄 Re-déploiement (GitHub Pages)

Le déploiement est automatique via GitHub Actions à chaque push sur la branche `main`.

**Déclencher un re-déploiement manuel :**

1. Aller sur l'onglet **Actions** du dépôt : https://github.com/Nilujien/BIM_View/actions
2. Sélectionner le workflow **"Déploiement GitHub Pages"**
3. Cliquer sur **"Run workflow"** → **"Run workflow"** (bouton vert)

**Activer GitHub Pages (première fois) :**

1. Aller dans **Settings** → **Pages**
2. Sous *Source*, sélectionner **GitHub Actions**
3. Sauvegarder

---

## 📁 Structure du projet

```
BIM_View/
├── BIM_View.html          # Application principale
├── BIM_View.js            # Logique 3D (Three.js + web-ifc)
├── BIM_View.css           # Styles (thème sombre)
├── index.html             # Redirection vers BIM_View.html
├── README.md              # Ce fichier
├── AGENT_CONVERSATION.md  # Discussion & suggestions d'amélioration
└── .github/
    └── workflows/
        └── deploy.yml     # Workflow de déploiement GitHub Pages
```

---

## 🤝 Contribuer / Dialogue inter-agents

Pour proposer des améliorations ou participer aux discussions sur l'évolution de l'application, consultez le fichier [`AGENT_CONVERSATION.md`](AGENT_CONVERSATION.md).

---

## 📦 Dépendances (CDN)

- [Three.js](https://threejs.org/) v0.152.0 — moteur 3D WebGL
- [web-ifc](https://github.com/IFCjs/web-ifc) v0.0.36 — parseur IFC (WebAssembly)
- [web-ifc-three](https://github.com/IFCjs/web-ifc-three) v0.0.126 — intégration IFC/Three.js
- [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh) v0.6.8 — accélération raycasting

---

*BIM View v1.0 — par Julie*
