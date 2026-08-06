# Déployer cette app sur Vercel — étapes pour un compte GitHub sans utiliser de ligne de commande

## Étape 1 — Créer un dépôt GitHub

1. Allez sur [github.com](https://github.com) et créez un compte si vous n'en avez pas.
2. Cliquez sur le bouton **"+"** en haut à droite → **"New repository"**.
3. Donnez un nom (ex. `citygo-absences`), laissez "Public" ou "Private" selon votre préférence (Private recommandé), ne cochez rien d'autre.
4. Cliquez sur **"Create repository"**.

## Étape 2 — Envoyer les fichiers sur GitHub (sans ligne de commande)

1. Sur la page de votre nouveau dépôt vide, cliquez sur le lien **"uploading an existing file"**.
2. **Dézippez** le fichier `deploy-project.zip` que je vous ai fourni sur votre ordinateur.
3. Faites un **glisser-déposer de tout le contenu du dossier** (pas le dossier lui-même, mais tous les fichiers et sous-dossiers qu'il contient : `src/`, `package.json`, `index.html`, etc.) dans la zone de dépôt de GitHub.
4. En bas de la page, cliquez sur **"Commit changes"**.

Votre code est maintenant sur GitHub.

## Étape 3 — Importer le projet dans Vercel

C'est exactement l'écran que vous m'avez montré :

1. Sur Vercel, cliquez sur **"Add New"** → **"Project"**.
2. Vercel vous demande d'autoriser l'accès à votre compte GitHub la première fois — acceptez.
3. Votre dépôt `citygo-absences` doit apparaître dans la liste → cliquez sur **"Import"**.
4. Vercel détecte automatiquement que c'est un projet Vite/React (grâce au `package.json`) — vous n'avez rien à changer dans les réglages de build.
5. **Avant de cliquer sur "Deploy"** : ouvrez la section **"Environment Variables"** et ajoutez :
   - `VITE_SUPABASE_URL` → votre Project URL Supabase
   - `VITE_SUPABASE_ANON_KEY` → votre anon public key Supabase
6. Cliquez sur **"Deploy"**.

Après ~1 minute, Vercel vous donne une adresse du type `https://citygo-absences.vercel.app` — c'est votre app en ligne.

## Important à savoir sur cette première version

Ce premier déploiement contient le code de l'app **tel qu'il est actuellement** (avec `window.storage`, qui ne fonctionne que dans Claude). Ça veut dire que **la connexion et l'enregistrement des données ne fonctionneront pas encore** une fois déployé sur Vercel — l'app s'affichera mais restera "vide" à chaque rechargement.

C'est normal et attendu à ce stade : l'objectif de cette étape est de valider que **le circuit GitHub → Vercel fonctionne**. La prochaine étape (qu'on fera ensuite) consiste à brancher vraiment `supabaseClient.js`, `authLayer.js` et `dataLayer.js` (déjà présents dans `src/`, déjà préparés) à la place de `window.storage` dans `App.jsx`, en suivant `BRANCHEMENT.md`. Une fois ce branchement fait et renvoyé sur GitHub, Vercel redéploiera automatiquement la version qui fonctionne pour de vrai.

## Pour toute mise à jour future

Une fois ce premier déploiement fait, chaque fois que du nouveau code sera prêt, il suffira de :
1. Remplacer les fichiers modifiés dans votre dépôt GitHub (même méthode que l'étape 2, ou via l'interface "Edit" de GitHub pour un seul fichier)
2. Vercel redéploie automatiquement, sans aucune action de votre part sur Vercel
