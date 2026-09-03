# Génération Verte RDC, environnement de développement

## Architecture retenue

Le projet nécessite désormais une brique dynamique (inscription des utilisateurs, envoi de newsletters et de SMS via un opérateur local), ce qui dépasse un simple site statique. Pour rester cohérent avec la contrainte de budget minimal, l'architecture retenue tient sur un seul serveur (VPS), géré entièrement via Docker Compose :

- **Reverse proxy (Caddy)** : reçoit le trafic entrant et le redirige vers l'application. Gère aussi le certificat HTTPS en production.
- **App Next.js** : regroupe à la fois les pages publiques, les formulaires, l'API interne et l'espace d'administration. Un seul service applicatif à faire tourner, ce qui simplifie l'hébergement et la maintenance.
- **PostgreSQL** : stocke le contenu du site et la base des utilisateurs inscrits.
- **Tâche planifiée (cron)** : déclenche l'envoi des newsletters et des SMS via l'API de l'opérateur local retenu.

Le service `app` installe les dépendances dans le volume `app_node_modules` avant de lancer Next.js. Cette étape est nécessaire lorsque `./app` est monté en volume, afin que ce montage ne masque pas les dépendances de l'image.

Les contenus publics administrables sont servis sans cache (`no-store`) pendant cette phase afin que les changements soient visibles dès la prochaine lecture.

Caddy attend que l'endpoint `/api/health` de l'application soit disponible avant de démarrer le proxy.

Ce choix privilégie un seul petit serveur peu coûteux (quelques euros par mois) plutôt qu'un empilement de services gratuits à la fiabilité variable (utile pour un site vitrine statique, moins adapté à un envoi quotidien de communications). Il garantit aussi la parité entre l'environnement de développement et l'environnement de production : le même docker-compose.yml sert aux deux, à la configuration réseau près.

## Structure du projet

```
gv-rdc-site/
├── docker-compose.yml
├── Caddyfile
├── .env.example
├── scripts/
│   └── dev.sh
└── app/
    ├── Dockerfile
    ├── package.json
    ├── next.config.js
    └── src/
        └── pages/
            ├── index.js
            └── api/health.js
```

## Utilisation

```bash
./scripts/dev.sh
```

Ce script :
1. Copie `.env.example` en `.env` s'il n'existe pas encore.
2. Nettoie l'environnement Docker du projet (conteneurs, volumes, réseaux) avant de démarrer, pour repartir d'une base propre.
3. Reconstruit les images.
4. Démarre l'environnement au premier plan.
5. Nettoie à nouveau automatiquement à l'arrêt (Ctrl+C, erreur, ou fin normale), grâce à un `trap` sur la sortie du script.

Le nettoyage est volontairement limité aux ressources de ce projet (`docker compose down --volumes`), sans toucher aux autres conteneurs ou images présents sur la machine.

Une fois lancé :
- Site : http://localhost
- Adminer (inspection de la base) : http://localhost:8080
- Vérification de l'app : http://localhost:3000/api/health

## Prochaines étapes

- Choisir l'opérateur local et son offre packagée pour l'emailing et le SMS, puis brancher le service cron sur son API.
- Mettre en place l'authentification et le formulaire d'inscription des utilisateurs.
- Définir le VPS de production et adapter le `Caddyfile` avec le nom de domaine `generationverterdc.fr`.

## Modes de build

Le mode est choisi par `DEPLOY_MODE` dans `.env` ou par variable d'environnement :

```bash
DEPLOY_MODE=server docker compose build app
DEPLOY_MODE=github-pages NEXT_PUBLIC_BASE_PATH=/nom-du-depot docker compose build app
```

Le mode `github-pages` active l'export statique Next.js. Il ne doit publier que les données publiques. Le mode `server` conserve les routes dynamiques prévues pour l'administration et les formulaires.

Pour produire l'artefact public avec Docker :

```bash
DEPLOY_MODE=github-pages NEXT_PUBLIC_BASE_PATH=/nom-du-depot ./scripts/build-static.sh
```

Le résultat est écrit dans `dist/github-pages/`, dossier ignoré par Git. Le script ajoute `.nojekyll`, supprime l'ancien artefact avant construction et nettoie automatiquement le conteneur et l'image temporaires à la sortie.

## GitHub Pages

Le workflow `.github/workflows/deploy-pages.yml` publie uniquement le contenu de `dist/github-pages/` à chaque push sur `main`. Dans les réglages du dépôt GitHub, sélectionner **GitHub Actions** comme source de Pages et conserver l'administration sur l'hébergement serveur.
