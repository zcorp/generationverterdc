# CLAUDE.md

Ce fichier donne le contexte du projet à toute IA (ou humain) qui reprend le code dans ce dépôt.

## Le projet

Site web de Génération Verte RDC (GV-RDC), une association environnementale basée à Kisangani (RDC) qui éduque les jeunes de 7 à 18 ans à la protection de la biodiversité forestière et aquatique de la Tshopo.

Prestataire : Zcoore. Projet à portée éducative et humanitaire, budget très serré : toute décision technique doit privilégier la simplicité et le coût le plus bas possible, avant la sophistication.

Nom de domaine prévu (temporaire) : `generationverterdc.fr`.

Le cahier des charges complet (contenu attendu par page, identité visuelle, fonctionnalités) est fourni à part ; ce fichier ne reprend que ce qui est utile au code.

## Stack et architecture

Un seul VPS, piloté par Docker Compose, quatre services :

- `proxy` : Caddy, reverse proxy et HTTPS automatique.
- `app` : Next.js, regroupe les pages publiques, l'API interne et l'espace d'administration. Un seul service applicatif à faire tourner.
- `db` : PostgreSQL.
- un job planifié (cron) qui déclenche l'envoi des newsletters et des SMS via l'API de l'opérateur local retenu (à confirmer, voir plus bas).

Voir `README.md` pour le détail de l'architecture et `docker-compose.yml` pour la configuration exacte.

## Lancer l'environnement

```bash
./scripts/dev.sh
```

Nettoie l'environnement avant de démarrer, build, lance les conteneurs, et nettoie à nouveau à l'arrêt (Ctrl+C). Ne jamais lancer `docker compose up` directement en dehors de ce script pour garder l'environnement propre entre deux sessions.

- Site : http://localhost
- Adminer (base de données) : http://localhost:8080
- Santé de l'app : http://localhost:3000/api/health

## Conventions de code

- Code (variables, fonctions, composants) en anglais, contenus et textes affichés en français.
- Next.js avec le pages router (`src/pages`), pas de migration vers l'app router sans discussion préalable : rester simple.
- Éviter d'ajouter une dépendance ou un service externe payant sans en parler d'abord : le budget est la contrainte numéro un du projet.
- Respecter la charte graphique du client (vert forêt et émeraude), voir les logos fournis dans le cahier des charges.

## Points sensibles à garder en tête

- Le public cible inclut des mineurs (7 à 18 ans). Tout formulaire d'inscription doit prévoir un mécanisme de consentement adapté (accord parental à minima signalé), et ne jamais afficher publiquement les données personnelles collectées.
- L'envoi d'emails et de SMS doit passer par l'opérateur local retenu par le client (pas de service international type Twilio/Mailchimp) : ce choix n'est pas encore arrêté, ne pas coder en dur un fournisseur précis tant qu'il n'est pas confirmé, garder cette intégration isolée dans un module dédié pour pouvoir en changer facilement.
- Les indicateurs d'impact (élèves sensibilisés, arbres plantés, écoles pilotes) doivent rester facilement modifiables par l'équipe de GV-RDC, sans intervention technique.

## Ce qui reste à trancher (voir cahier des charges, section « points à valider »)

- Opérateur local et offre packagée pour l'emailing et le SMS.
- Besoin ou non d'une version multilingue.
- Mise en place ou non d'un module de don en ligne.
- Budget définitif alloué au projet.

Si une de ces décisions manque au moment de coder une fonctionnalité qui en dépend, s'arrêter et demander plutôt que de supposer.
