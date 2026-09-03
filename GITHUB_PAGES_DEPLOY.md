# Déploiement GitHub Pages — premier test public

Ce document décrit la marche à suivre pour publier la version publique du site Génération Verte RDC sur GitHub Pages, avec un premier test fonctionnel avant la mise en ligne complète sur le domaine OVH.

## Objectif

Publier une version statique du site public sur :

- GitHub Pages : https://zcorp.github.io/generationverte/
- Domaine personnalisé : https://www.generationverterdc.fr

Cette première cible est utile pour valider le rendu, l’URL, la mise en page, les liens internes et le bon fonctionnement du site public sans dépendre encore du serveur Docker complet.

> Important : GitHub Pages ne peut héberger que le site public statique. Les routes d’administration, les APIs dynamiques et les bases de données restent sur l’environnement Docker local / VPS.

---

## 1) Vérifier le projet et la configuration

Le projet contient déjà la bonne base technique pour un export statique :

- `app/next.config.js` : active `output: "export"` en mode GitHub Pages
- `app/Dockerfile` : supprime les routes dynamiques quand `DEPLOY_MODE=github-pages`
- `scripts/build-static.sh` : construit le dossier statique `dist/github-pages`
- `.github/workflows/deploy-pages.yml` : publie automatiquement le site via GitHub Actions
- `app/public/CNAME` : déclare le domaine personnalisé dans l’artefact publié

Le comportement attendu est :

- `DEPLOY_MODE=server` : version complète pour le serveur Docker
- `DEPLOY_MODE=github-pages` : version uniquement publique / statique

Le repo GitHub attendu est :

- https://github.com/zcorp/generationverte.git

Le nom du repo est important, car le workflow configure automatiquement :

- `NEXT_PUBLIC_BASE_PATH: /${{ github.event.repository.name }}`

Pour ce repo, cela donne :

- `/generationverte`

Donc l’URL GitHub Pages publique sera :

- https://zcorp.github.io/generationverte/

---

## 2) Initialiser / connecter le repo GitHub

Depuis le dossier du projet :

```bash
cd /Users/zcorp/Git/generation_verte_project/gv-rdc-site

git init

git remote add origin https://github.com/zcorp/generationverte.git
```

Si le repo existe déjà et qu’il faut seulement brancher le remote :

```bash
git remote set-url origin https://github.com/zcorp/generationverte.git
```

Ensuite, on ajoute les fichiers du projet :

```bash
git add .
git commit -m "Initial setup for GitHub Pages preview"
git push -u origin main
```

### Option one run

Après avoir configuré le DNS OVH, les opérations locales et le push peuvent être faites en une seule commande. Cette commande est volontairement relançable : elle initialise Git si nécessaire, réutilise ou crée `origin`, prépare la branche locale `main`, crée un commit uniquement s’il y a des changements, puis pousse vers GitHub.

```bash
cd /Users/zcorp/Git/generation_verte_project/gv-rdc-site && \
git init && \
git remote get-url origin >/dev/null 2>&1 && git remote set-url origin https://github.com/zcorp/generationverte.git || git remote add origin https://github.com/zcorp/generationverte.git && \
git branch -M main && \
git add . && \
{ git diff --cached --quiet || git commit -m "Deploy public site to GitHub Pages"; } && \
git push -u origin main
```

Cette commande ne configure pas le domaine OVH et ne peut pas activer le réglage GitHub Pages à ta place. Ces deux étapes doivent être faites une fois dans les interfaces OVH et GitHub. Une fois `Pages → Source → GitHub Actions` activé, chaque nouveau `git push` relancera automatiquement le déploiement.

> Si GitHub demande une authentification avec HTTPS, utiliser le gestionnaire d’identifiants GitHub ou un Personal Access Token, jamais un mot de passe écrit dans un script.

---

## 3) Vérifier le workflow GitHub Actions

Le fichier suivant doit bien exister dans le repo :

- `.github/workflows/deploy-pages.yml`

Il contient le flux suivant :

1. checkout du dépôt
2. build statique avec `scripts/build-static.sh`
3. upload de l’artefact Pages
4. déploiement sur GitHub Pages

Le build est lancé automatiquement lors d’un push sur `main`.

---

## 4) Activer GitHub Pages dans le dépôt

Dans GitHub :

1. Ouvrir le repo `zcorp/generationverte`
2. Aller dans `Settings`
3. Ouvrir `Pages`
4. Choisir :
   - `Source`: `GitHub Actions`
5. Ne pas choisir `Deploy from a branch` pour ce premier test

GitHub va alors utiliser le workflow GitHub Actions pour publier le site.

---

## 5) Vérifier le build local avant push

Pour tester localement la build statique, on peut lancer :

```bash
cd /Users/zcorp/Git/generation_verte_project/gv-rdc-site
export DEPLOY_MODE=github-pages
export NEXT_PUBLIC_BASE_PATH=/generationverte
./scripts/build-static.sh
```

Cela génère un dossier :

- `dist/github-pages/`

On peut ensuite vérifier le rendu localement avec un simple serveur statique si nécessaire :

```bash
cd dist/github-pages
python3 -m http.server 8000
```

Puis ouvrir :

- http://localhost:8000

---

## 6) Configurer le domaine OVH

On a maintenant le domaine :

- http://www.generationverterdc.fr

### Option recommandée : utiliser le sous-domaine `www`

Chez OVH, dans la gestion DNS :

#### CNAME

```text
www   CNAME   zcorp.github.io
```

Cela permet que :

- https://www.generationverterdc.fr

redirige vers GitHub Pages.

### Option si on veut aussi le domaine racine

Pour `generationverterdc.fr` (sans www), on utilise des A records vers les adresses IP GitHub Pages :

```text
@   A   185.199.108.153
@   A   185.199.109.153
@   A   185.199.110.153
@   A   185.199.111.153
```

Et on peut aussi créer :

```text
www   CNAME   zcorp.github.io
```

> GitHub Pages recommande d’utiliser `CNAME` sur `www` et éventuellement les A records sur le domaine racine si on souhaite le domaine principal.

---

## 7) Déclarer le domaine personnalisé

Le projet contient maintenant le fichier suivant :

```text
app/public/CNAME
```

Il contient uniquement :

```text
www.generationverterdc.fr
```

Lors de l’export Next.js, ce fichier est copié à la racine de l’artefact GitHub Pages. Il ne faut pas ajouter `https://` dans un fichier `CNAME`.

Après le push, GitHub Pages devrait détecter le domaine depuis cet artefact. Si GitHub demande encore une validation, ouvrir `Settings → Pages` et confirmer `www.generationverterdc.fr` dans `Custom domain`.

Dans GitHub → `Settings` → `Pages` :

1. Vérifier que la source est `GitHub Actions`
2. Valider la configuration DNS
3. Cocher `Enforce HTTPS` une fois le certificat disponible

GitHub va ensuite générer le certificat HTTPS automatiquement via Let’s Encrypt.

---

## 8) Vérifier la publication après push

Après le premier push sur `main`, le workflow doit démarrer automatiquement.

Étapes à vérifier :

1. Ouvrir le repo GitHub
2. Aller dans `Actions`
3. Vérifier que le workflow `Deploy public site to GitHub Pages` est en cours / réussi
4. Ouvrir la page publique :
   - https://zcorp.github.io/generationverte/
5. Vérifier le site personnalisé :
   - https://www.generationverterdc.fr

---

## 9) Vérifier que le site public est bien statique

Ce qui doit fonctionner sur GitHub Pages :

- pages d’accueil
- pages de contenu public
- formulaires de contact / inscription si ils n’utilisent pas de backend serveur
- liens internes entre pages

Ce qui ne doit pas être exposé sur cette première version :

- `/admin/*`
- `/api/*` dynamiques
- données secrètes ou backend Postgres

Le projet est déjà configuré pour que le mode `github-pages` supprime les routes serveur et admin dans le build statique.

---

## 10) Plan de mise en production raisonnable

Pour un premier test, on peut faire ceci :

1. publier la version publique statique sur GitHub Pages
2. valider le rendu du site sur le domaine personnalisé
3. vérifier que le site est bien accessible en HTTPS
4. garder le backend Docker complet pour la gestion avancée / admin / CRM

C’est une bonne solution de test de démonstration, de validation visuelle et de preuve de concept.

---

## 11) Commandes de référence

### Push initial

```bash
git add .
git commit -m "Initial GitHub Pages deployment setup"
git push -u origin main
```

### Build statique en local

```bash
export DEPLOY_MODE=github-pages
export NEXT_PUBLIC_BASE_PATH=/generationverte
./scripts/build-static.sh
```

### Vérification local

```bash
cd dist/github-pages
python3 -m http.server 8000
```

### DNS OVH pour `www`

```text
www   CNAME   zcorp.github.io
```

---

## 12) Résumé court

Le plus simple pour un premier test :

- repo GitHub : `https://github.com/zcorp/generationverte.git`
- branche : `main`
- source Pages : `GitHub Actions`
- domaine OVH : `www.generationverterdc.fr`
- CNAME : `www -> zcorp.github.io`
- branche de publication : automatique via workflow

À partir de là, le site public est publié sur GitHub Pages et accessible en HTTPS via le domaine personnalisé.

---

## Prochaine étape recommandée

Je te conseille de faire cela dans l’ordre :

1. pousser le repo sur GitHub
2. activer GitHub Actions / Pages
3. configurer le `CNAME` OVH
4. vérifier la publication
5. seulement ensuite décider si on garde GitHub Pages comme version publique ou on bascule sur un VPS / Docker complet avec le domaine final

Si tu veux, je peux aussi te préparer le fichier exact de configuration DNS OVH et le petit check-list de validation finale à cocher après publication.
