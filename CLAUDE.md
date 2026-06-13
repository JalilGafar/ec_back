# CLAUDE.md — Camerdiplome Backend
> Mis à jour le 2026-06-11. Source de vérité pour l'AI Architect du projet.

---

## ⚡ DERNIÈRES MODIFICATIONS — Module Conseiller (2026-06-12)

| Fichier | Changement |
|---|---|
| `controllers/adminAdvisors.controller.js` | Nouveau contrôleur : `getAdvisors`, `createAdvisor` (bcrypt salt 8 + INSERT role 'advisor'), `deleteAdvisor` (vérifie que la cible n'est pas admin) |
| `routes/adminAdvisors.routes.js` | Nouvelles routes `GET/POST/DELETE /api/admin/advisors` — middleware `[verifyToken, isAdmin]` + `checkDuplicateUsernameOrEmail` sur POST |
| `app.js` | Ajout `app.use('/api/admin/advisors', adminAdvisorsRoutes)` |
| `middleware/authJwt.js` | Ajout `isAdvisor` et `isAdvisorOrAdmin` — exportés dans l'objet `authJwt` |

---

## Historique — Module Modérateur (2026-06-11)

| Fichier | Changement |
|---|---|
| `controllers/adminUsers.controller.js` | Nouveau contrôleur : `getModerators`, `createModerator` (bcrypt salt 8), `deleteModerator` (vérifie que la cible n'est pas admin) |
| `routes/adminUsers.routes.js` | Nouvelles routes `GET/POST/DELETE /api/admin/users` — middleware `[verifyToken, isAdmin]` + `checkDuplicateUsernameOrEmail` sur POST |
| `app.js` | Ajout `app.use('/api/admin/users', adminUsersRoutes)` |
| `routes/avis.js` | Ajout `PUT /api/avis` (`isModeratorOrAdmin`) — body `{ id_avis, visible }` ; ajout `DELETE /api/avis` (`isModeratorOrAdmin`) — query `?idAvis=X` |
| `routes/actualite.js` | `DELETE /api/actualite` : middleware changé de `isAdmin` → `isModeratorOrAdmin` |

---

## 1. STACK TECHNIQUE

| Technologie | Version | Rôle | Notes importantes |
|---|---|---|---|
| Node.js | 18.12.1 | Runtime serveur | Version fixée dans `package.json` engines |
| Express | ^4.18.2 | Framework HTTP | Application principale dans `app.js` |
| mysql2 | ^3.x | Driver MySQL | Utilisé dans `db.js` pour les requêtes directes ET par Sequelize |
| Sequelize | ^6.31.1 | ORM | Utilisé uniquement pour le module auth (User/Role) |
| jsonwebtoken | ^9.0.0 | JWT | Génération et vérification des tokens auth |
| bcryptjs | ^2.4.3 | Hash mots de passe | Utilisé dans `auth.controller.js` |
| cookie-session | ^2.0.0 | Sessions cookie | Stocke le token en session côté serveur (peu utilisé) |
| cors | ^2.8.5 | CORS middleware | Origines configurées via `process.env.ALLOWED_ORIGINS` |
| body-parser | ^1.20.2 | Parsing du body HTTP | Redondant avec `express.json()` déjà utilisé |
| sql-template-strings | ^2.2.2 | Requêtes SQL paramétrées | Utilisé via `SQL\`...\`` — protège contre les injections |
| dotenv | ^17.4.2 | Variables d'environnement | Chargé dans `server.js` via `dotenv.config()` |
| nodemon | ^2.0.22 | Hot-reload dev | Pas de script npm dédié configuré |

---

## 2. ARCHITECTURE GÉNÉRALE

```
ec_back/
├── server.js              ← Point d'entrée HTTP (crée le serveur, écoute sur le port)
├── app.js                 ← Application Express (middlewares, routes, sync Sequelize)
├── db.js                  ← Pool de connexions MySQL (driver "mysql" legacy, connectionLimit: 10)
├── .env.example           ← Template des variables d'environnement requises
├── migrations/            ← Scripts SQL de migration (ex: 005_enrich_domaines_diplomes.sql)
├── scripts/               ← Utilitaires Node.js
│   ├── generate-routes.js ← Regénère cd2front/routes.txt depuis la BDD (lancé en prebuild)
│   ├── enrich-domaines-diplomes.js ← Script ponctuel d'enrichissement des données
│   └── logs/              ← Logs d'exécution des scripts
├── config/
│   ├── db.config.js       ← Credentials BDD pour Sequelize (via variables d'env)
│   └── auth.config.js     ← Secret JWT (via process.env.JWT_SECRET)
├── models/                ← Modèles Sequelize (utilisés UNIQUEMENT pour auth)
│   ├── index.js           ← Initialisation Sequelize + associations User↔Role
│   ├── user.model.js      ← Table "users" (username, email, password)
│   └── role.model.js      ← Table "roles" (id, name)
├── controllers/
│   ├── auth.controller.js        ← signup / signin / signout
│   ├── user.controller.js        ← Boards publics/user/admin/moderator (test routes)
│   ├── universite.js             ← CRUD universités
│   ├── adminUsers.controller.js      ← Gestion des comptes modérateurs (getModerators, createModerator, deleteModerator)
│   └── adminAdvisors.controller.js   ← Gestion des comptes conseillers (getAdvisors, createAdvisor, deleteAdvisor)
├── middleware/
│   ├── index.js           ← Barrel export authJwt + verifySignUp
│   ├── authJwt.js         ← verifyToken / isAdmin / isModerator / isModeratorOrAdmin
│   └── verifySignUp.js    ← checkDuplicateUsernameOrEmail / checkRolesExisted
└── routes/                ← Un fichier par entité métier
    ├── auth.routes.js     ← POST /api/auth/signup|signin|signout
    ├── user.routes.js     ← GET /api/test/all|user|mod|admin
    ├── topNewsSlide.js    ← GET /api/topNewsSlide
    ├── universite.js      ← CRUD /api/universites
    ├── ecoles.js          ← CRUD /api/ecoles
    ├── campus.js          ← CRUD /api/campus
    ├── diplomes.js        ← CRUD /api/diplomes
    ├── formation.js       ← CRUD /api/formations
    ├── actualite.js       ← CRUD /api/actualite
    ├── avis.js            ← GET+POST+PUT+DELETE /api/avis
    ├── adminUsers.routes.js    ← CRUD /api/admin/users (gestion comptes modérateurs)
    ├── adminAdvisors.routes.js ← CRUD /api/admin/advisors (gestion comptes conseillers)
    ├── ecoleAvis.js       ← GET /api/ecoleavis (notes, school, campus, cursus, diplo)
    ├── advers.js          ← GET /api/advers (formation, domaine, formationSchool, school)
    ├── metier.js          ← GET /api/metier (list, longlist, item)
    ├── field.js           ← GET /api/field (domaines filtrés par diplôme/ville)
    ├── degree.js          ← GET /api/degree (catégories filtrées par ville/domaine)
    ├── partCyties.js      ← GET /api/partCyties (villes filtrées par diplôme+domaine)
    ├── resultats.js       ← GET+POST /api/result (résultats orientation + save client)
    ├── interest.js        ← GET /api/interest (formations sponsorisées par page)
    ├── schoolData.js      ← GET /api/shoolData (fiche complète école via procédure)
    ├── diplomeData.js     ← GET /api/diplomeData (fiche complète diplôme via procédure)
    ├── someDegree.js      ← GET /api/someDegree (diplômes aléatoires BTS/Licence)
    └── enregistrement.js  ← POST /api/ets (enregistrement propositions d'établissement)
```

**Logique d'organisation** : Architecture Express classique en couches. Deux systèmes de base de données coexistent : `db.js` (pool `mysql` natif, utilisé dans ~90% des routes) et `models/` (Sequelize, utilisé uniquement pour les entités auth User et Role). Les routes métier contiennent directement les requêtes SQL (pas de couche service/repository séparée, sauf `controllers/universite.js`). Middleware d'erreur global dans `app.js` (ligne ~225) qui intercepte les erreurs non gérées et retourne HTTP 500.

---

## 3. ROUTING & ENDPOINTS

### Routes d'authentification

| Méthode | Endpoint | Auth requise | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | Non | Inscription (username, email, password, roles[]) |
| POST | `/api/auth/signin` | Non | Connexion → retourne JWT + infos user |
| POST | `/api/auth/signout` | Non | Déconnexion (efface session cookie) |

### Routes de test

| Méthode | Endpoint | Auth requise | Description |
|---|---|---|---|
| GET | `/api/test/all` | Non | Contenu public |
| GET | `/api/test/user` | verifyToken | Contenu réservé aux users connectés |
| GET | `/api/test/mod` | verifyToken + isModerator | Contenu réservé aux modérateurs |
| GET | `/api/test/admin` | verifyToken + isAdmin | Contenu réservé aux admins |

### Routes métier — Lecture publique / Écriture protégée par JWT

Légende colonne Auth : **—** = public, **T** = verifyToken, **A** = verifyToken + isAdmin, **MA** = verifyToken + isModeratorOrAdmin

| Méthode | Endpoint | Params | Auth | Description |
|---|---|---|---|---|
| GET | `/api/countFomration` | — | — | Compte total des formations |
| GET | `/api/domaine` | — | — | Liste des domaines (id_dom, nom_dom) |
| GET | `/api/categ` | — | — | Liste des catégories de diplômes |
| GET | `/api/cyties` | — | — | Villes distinctes ayant un campus |
| GET | `/api/topNewsSlide` | — | — | Slides carrousel page d'accueil |
| GET | `/api/someDegree` | `?Degree=BTS\|Licence` | — | 9 diplômes aléatoires par catégorie |
| GET | `/api/universites` | — | — | Toutes les universités |
| POST | `/api/universites` | body: Universite | **A** | Créer une université |
| PUT | `/api/universites` | body: Universite | **A** | Modifier une université |
| DELETE | `/api/universites` | `?idUniv=` | **A** | Supprimer une université |
| GET | `/api/ecoles` | — | — | Toutes les écoles |
| GET | `/api/ecoles/etablissement` | `?idEcole=` | — | Une école par ID |
| GET | `/api/ecoles/find` | — | — | Liste légère écoles (id, sigle, nom) |
| POST | `/api/ecoles` | body: Ecole | **A** | Créer une école (via stored procedure) |
| PUT | `/api/ecoles` | body: Ecole | **A** | Modifier une école + liens campus |
| DELETE | `/api/ecoles` | `?idEcole=` | **A** | Supprimer une école |
| GET | `/api/campus` | — | — | Tous les campus |
| POST | `/api/campus` | body: Campus | **A** | Créer un campus |
| PUT | `/api/campus` | body: Campus | **A** | Modifier un campus |
| DELETE | `/api/campus` | `?idCamp=` | **A** | Supprimer un campus |
| GET | `/api/diplomes` | — | — | Tous les diplômes avec catégorie jointure |
| POST | `/api/diplomes` | body: Diplome | **A** | Créer un diplôme (via stored procedure) |
| PUT | `/api/diplomes` | body: Diplome | **A** | Modifier un diplôme + liens domaines |
| DELETE | `/api/diplomes` | `?idDiplome=` | **A** | Supprimer un diplôme |
| GET | `/api/formations` | — | — | Toutes les formations (jointure complète) |
| GET | `/api/formations/info` | `?idForm=` | — | Une formation par ID |
| POST | `/api/formations` | body: Formation | **A** | Créer une formation (via stored procedure) |
| PUT | `/api/formations` | body: Formation | **A** | Modifier une formation |
| DELETE | `/api/formations` | `?idForm=` | **A** | Supprimer une formation |
| GET | `/api/actualite` | — | — | Tous les articles |
| GET | `/api/actualite/some` | — | — | 3 articles aléatoires |
| GET | `/api/actualite/blog` | `?subjectActu=` | — | Articles filtrés par sujet (LIKE) |
| POST | `/api/actualite` | body: Article | **MA** | Créer un article |
| PUT | `/api/actualite` | body: Article | **MA** | Modifier un article |
| DELETE | `/api/actualite` | `?idArti=` | **MA** | Supprimer un article *(était **A** avant 2026-06-11)* |
| GET | `/api/avis` | — | — | Tous les avis |
| POST | `/api/avis` | body: Avis | **T** | Soumettre un avis étudiant |
| PUT | `/api/avis` | body: `{ id_avis, visible }` | **MA** | Modifier la visibilité d'un avis (0 ou 1) |
| DELETE | `/api/avis` | `?idAvis=` | **MA** | Supprimer un avis |
| GET | `/api/admin/users` | — | **A** | Lister les comptes modérateurs |
| POST | `/api/admin/users` | body: `{ username, email, password }` | **A** | Créer un compte modérateur |
| DELETE | `/api/admin/users/:id` | — | **A** | Supprimer un compte modérateur (interdit si cible est admin) |
| GET | `/api/admin/advisors` | — | **A** | Lister les comptes conseillers |
| POST | `/api/admin/advisors` | body: `{ username, email, password }` | **A** | Créer un compte conseiller (rôle `advisor`) |
| DELETE | `/api/admin/advisors/:id` | — | **A** | Supprimer un compte conseiller (interdit si cible est admin) |
| GET | `/api/ecoleavis` | — | — | Écoles avec note moyenne et nb d'avis |
| GET | `/api/ecoleavis/notes` | `?idSchool=` | — | Note moyenne d'une école |
| GET | `/api/ecoleavis/school` | `?idSchool=` | — | Tous les avis d'une école |
| GET | `/api/ecoleavis/campus` | `?idSchool=` | — | Campus d'une école |
| GET | `/api/ecoleavis/cursus` | `?idSchool=` | — | Diplômes offerts par une école |
| GET | `/api/ecoleavis/diplo` | `?idDip=` | — | Un diplôme par ID |
| GET | `/api/advers/formation` | — | — | 4 formations sponsorisées aléatoires |
| GET | `/api/advers/domaine` | `?idDom=` | — | 4 formations sponsorisées par domaine |
| GET | `/api/advers/formationSchool` | `?idSchool=` | — | 5 formations d'une école aléatoires |
| GET | `/api/advers/formus` | `?idSchool=` | — | Toutes les formations d'une école |
| GET | `/api/advers/school` | — | — | 4 écoles sponsorisées (pub='on') aléatoires |
| GET | `/api/metier/list` | — | — | 10 métiers aléatoires |
| GET | `/api/metier/longlist` | — | — | Tous les métiers |
| GET | `/api/metier` | `?idMetier=` | — | Un métier par ID |
| GET | `/api/field` | `?DomaineDegree=&DomaineCyti=` | — | Domaines filtrés par diplôme (et ville optionnelle) |
| GET | `/api/field/page` | — | — | Tous les domaines pour la page domaines |
| GET | `/api/field/item` | `?idFiliere=` | — | Un domaine par ID |
| GET | `/api/field/br` | — | — | Branches distinctes |
| GET | `/api/field/categ` | — | — | Noms des catégories |
| GET | `/api/degree` | `?DegreeCyti=\|DegreeField=` | — | Catégories de diplômes filtrées |
| GET | `/api/partCyties` | `?Degree=&Domaine=` | — | Villes disponibles pour un diplôme+domaine |
| GET | `/api/result` | `?city=&diplome=&domaine=&branche=` | — | Résultats de recherche orientation |
| POST | `/api/result` | body: UserProfil | — | Sauvegarder profil client orientation |
| GET | `/api/interest` | `?Page=` | — | Formations sponsorisées par page (procédure) |
| GET | `/api/shoolData` | `?school=` | — | Fiche complète école (procédure stockée) |
| GET | `/api/diplomeData` | `?diplome=` | — | Fiche complète diplôme (procédure stockée) |
| POST | `/api/ets` | body: EtsForm | — | Enregistrer une proposition d'établissement |

---

## 4. BASE DE DONNÉES

**SGBD** : MySQL — Base : `ecolecamerdb`  
**Hôte** : `localhost` (dev) — prod : [À CONFIRMER dans l'environnement serveur]

### Tables identifiées

| Table | Description | Colonnes clés |
|---|---|---|
| `users` | Comptes utilisateurs (Sequelize) | id, username, email, password |
| `roles` | Rôles (Sequelize) | id (1=user, 2=moderator, 3=admin), name |
| `user_roles` | Pivot User↔Role (Sequelize) | userId, roleId |
| `universites` | Institutions universitaires | id_univ, nom_univ, sigle_univ, type_univ, ville_univ, recteur_univ |
| `ecoles` | Établissements d'enseignement | id_ecol, nom_e, sigle_e, logo_e, niveau_e, langue_e, stat_e, pub, universites_id |
| `campus` | Sites physiques des écoles | id_camp, nom_camp, ville_cam, lon_camp, lat_camp, principal_camp |
| `campus_ecoles` | Pivot Campus↔École | campus_id, ecole_id |
| `diplomes` | Titres académiques | id_dip, nom_dip, niveau, descriptif_dip, filiere_dip, categorie_id |
| `categories` | Catégories de diplômes | id_cat, nom_cat, groupe |
| `domaines` | Champs disciplinaires | id_dom, nom_dom, branche_dom, illustra_dom |
| `domaines_diplomes` | Pivot Domaine↔Diplôme | domaines_id, diplomes_id |
| `domaines_formations` | Pivot Domaine↔Formation | domaines_id, formations_id |
| `formations` | Programmes d'études | id_form, nom_f, ecole_f_id, diplom_id, duree_f, cout_f, programme_f, descriptif_f, conditions_f, admission_f, advers |
| `actualite` | Articles de blog/news | id_actu, title, auteur, createdDate, updatedDate, visible, summary, illustration, sujets, keywords, content |
| `top_news` | Slides carrousel accueil | [colonnes non listées explicitement] |
| `avis` | Avis étudiants | id, auteur_avis, content, promotion, id_ecole, id_diplo, note_cours, note_ambiance, note_locaux, note_insert, note, campus_id, diplo_id, recommande, born, email, justif |
| `enregistrements` | Propositions d'établissements | nom_regis, prenom_regis, ets_regis, ville_regis, comment_regis, email_regis, phone_regis |
| `metier` | Fiches métiers | id_metier, titre, [autres colonnes] |
| `type_ecole` | Types d'école | id_type, type_e |
| `ecole_typologie` | Pivot École↔Type | ecoley_id, type_id |

### Stored Procedures identifiées

| Procédure | Appelée dans | Description |
|---|---|---|
| `add_ecole_procedure` | `routes/ecoles.js` POST | Insérer une école avec ses campus |
| `galager_procedure` | `routes/ecoles.js` PUT | Mettre à jour les liens campus d'une école |
| `add_formation_procedure` | `routes/formation.js` POST | Insérer une formation |
| `add_diplome_procedure` | `routes/diplomes.js` POST | Insérer un diplôme avec liens domaines |
| `update_diplomes_procedure` | `routes/diplomes.js` PUT | Mettre à jour les liens domaines d'un diplôme |
| `get_villes_par_diplome_et_domaine` | `routes/partCyties.js` | Villes filtrées par diplôme ET domaine |
| `save_client_procedure` | `routes/resultats.js` POST | Sauvegarder le profil utilisateur orientation |
| `serch_result_procedure` | `routes/resultats.js` GET | Recherche formations par ville/diplôme/domaine/branche |
| `shoolData_procedure` | `routes/schoolData.js` | Fiche complète d'une école |
| `diplomeData_procedure` | `routes/diplomeData.js` | Fiche complète d'un diplôme |
| `interest_procedure` | `routes/interest.js` | Formations sponsorisées par page |

---

## 5. AUTHENTIFICATION

### Flux complet

```
1. Client → POST /api/auth/signin { username, password }
       ↓
2. verifySignUp middleware : vérifie unicité username + email (signup seulement)
       ↓
3. auth.controller.js : User.findOne({ username }) via Sequelize
       ↓
4. bcrypt.compareSync(password, user.password)
       ↓
5. jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: 86400 })  ← 24h
       ↓
6. req.session.token = token  (stocké en cookie-session)
       ↓
7. Réponse : { id, username, email, roles: ["ROLE_ADMIN"...], accessToken: "JWT..." }
       ↓
8. Frontend stocke le token en sessionStorage["x-access-token"]
```

### Vérification token sur les routes protégées

```
Request header : x-access-token: <JWT>
       ↓
authJwt.verifyToken() lit req.headers["x-access-token"]
       ↓
jwt.verify(token, config.secret) → extrait req.userId
       ↓
authJwt.isAdmin() / isModerator() : User.findByPk(userId) + user.getRoles()
```

**Important** : La vérification utilise uniquement le header `x-access-token`, PAS la session cookie (ligne commentée dans `authJwt.js` : `// let token = req.session.token`). La session cookie est donc inutile pour la vérification.

### Gestion des rôles

| ID | Nom BDD | Préfixe renvoyé | Guard disponible |
|---|---|---|---|
| 1 | user | ROLE_USER | `verifyToken` |
| 2 | moderator | ROLE_MODERATOR | `isModerator`, `isModeratorOrAdmin` |
| 3 | admin | ROLE_ADMIN | `isAdmin`, `isModeratorOrAdmin` |
| 4 | advisor | ROLE_ADVISOR | `isAdvisor`, `isAdvisorOrAdmin` |

> **Note** : Le rôle `advisor` (id=4) doit exister dans la table `roles`. La création de conseillers via `POST /api/admin/advisors` fait un `SELECT id FROM roles WHERE name = 'advisor'` — si la ligne n'existe pas, la création échoue avec HTTP 500 + message "Role 'advisor' introuvable en base de données !".

---

## 6. DOUBLE CONNEXION BASE DE DONNÉES

Deux systèmes de connexion MySQL coexistent (dette architecturale, mais les deux utilisent maintenant un pool).

| Fichier | Driver | Utilisé dans | Pool |
|---|---|---|---|
| `db.js` | `mysql2` (pool callback + promisePool) | Toutes les routes métier (~90% du code) | Oui (`connectionLimit: 10`, `waitForConnections: true`) |
| `models/index.js` | `Sequelize` + `mysql2` | Auth uniquement (User, Role, user_roles) | Oui (`max: 10`, `acquire: 60000`) |

Les deux connexions lisent leurs credentials depuis les variables d'environnement (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `DB_PORT`).

---

## 7. VARIABLES D'ENVIRONNEMENT

Un fichier `.env.example` est disponible à la racine. Créer un `.env` local à partir de ce template avant de lancer le serveur.

| Variable | Fichier consommateur | Description |
|---|---|---|
| `DB_HOST` | `config/db.config.js` + `db.js` | Hôte MySQL (ex: `localhost`) |
| `DB_USER` | `config/db.config.js` + `db.js` | Utilisateur MySQL |
| `DB_PASSWORD` | `config/db.config.js` + `db.js` | Mot de passe MySQL |
| `DB_NAME` | `config/db.config.js` + `db.js` | Nom de la base (ex: `ecolecamerdb`) |
| `DB_PORT` | `config/db.config.js` + `db.js` | Port MySQL (défaut: `3306`) |
| `JWT_SECRET` | `config/auth.config.js` | Secret de signature JWT |
| `COOKIE_SECRET` | `app.js` | Secret de chiffrement cookie-session |
| `ALLOWED_ORIGINS` | `app.js` | Origines CORS autorisées (ex: `http://localhost:4200`) |
| `PORT` | `server.js` | Port HTTP (défaut: `3000`) |

---

## 8. SCRIPTS DISPONIBLES

| Commande | Description |
|---|---|
| `node server.js` | Démarrer le serveur en production |
| `nodemon server.js` | Démarrer avec hot-reload (nodemon installé mais pas de script npm) |
| `npm test` | Non configuré (affiche une erreur) |

**Aucun script `npm start` configuré.** Pour lancer : `node server.js` ou `npx nodemon server.js`.

---

## 9. DETTES TECHNIQUES & POINTS D'ATTENTION

### Sécurité — Problèmes résolus ✅

1. ~~AUCUNE protection auth sur les routes CRUD métier~~ — **Résolu** : tous les POST/PUT/DELETE sont maintenant protégés par `verifyToken + isAdmin` ou `isModeratorOrAdmin`. Le modérateur peut créer/modifier/supprimer des articles et modérer les avis ; seul l'admin peut gérer les entités de référence (écoles, formations, universités...) et les comptes modérateurs.

2. ~~Injections SQL dans les DELETE~~ — **Résolu** : toutes les routes utilisent `SQL\`...\`` de `sql-template-strings`, y compris les DELETE.

3. ~~Credentials hardcodés~~ — **Résolu** : toutes les configurations sensibles passent par des variables d'environnement (voir section 7).

4. ~~CORS non restreint~~ — **Résolu** : `app.use(cors({ origin: process.env.ALLOWED_ORIGINS }))`.

5. ~~Secret cookie placeholder~~ — **Résolu** : `process.env.COOKIE_SECRET` utilisé dans `app.js`.

6. ~~`if (err) throw err`~~ — **Résolu** : les erreurs SQL retournent maintenant `res.sendStatus(500)` ou `res.status(500).json({ error: 'Erreur serveur' })`.

### Bugs résiduels

7. **Double `res.status(200)` dans plusieurs routes** : Pattern `res.status(200).json(result)` suivi d'un second `res.status(200)` dans le même handler. Présent dans `topNewsSlide.js`, `someDegree.js`, `metier.js`, `field.js` (/br, /categ), `ecoleAvis.js` (/notes, /campus, /cursus, /diplo), `advers.js`. Le second appel ne fait rien mais pollue le code.

9. **`routes/schoolData.js` monte sur `/api/shoolData`** (faute de frappe — manque le 'c' dans school). Le frontend doit s'y conformer avec la même faute.

10. **`routes/someDegree.js` — IDs de catégories hardcodés** : `categorie_id = 5` pour BTS, `categorie_id = 17 OR categorie_id = 18` pour Licence. Si la table `categories` est modifiée, ces requêtes cassent silencieusement.

### Architecture

11. **Double connexion MySQL** : `db.js` (pool mysql natif) + `models/index.js` (Sequelize). Les deux fonctionnent correctement, mais c'est un overhead de maintenance. Unification possible à long terme.

12. **Logique SQL inline dans les routes** : Aucune couche repository/service. Les requêtes SQL sont directement dans les handlers de route. Seul `controllers/universite.js` externalise un peu la logique.

13. **Pas de validation des inputs** : Validation minimale sur quelques routes uniquement (`parseInt()` + `isNaN()` sur les IDs dans `campus.js`, `diplomes.js`, `ecoleAvis.js`). Aucune validation de format/longueur sur les POST/PUT.

14. **Pas de gestion des transactions** : Les opérations en plusieurs étapes (ex: `PUT /api/ecoles` fait deux requêtes, `PUT /api/diplomes` aussi) ne sont pas atomiques. Un échec partiel laisse la BDD en état incohérent.

---

## 10. GUIDE POUR NOUVELLES FONCTIONNALITÉS

### Ajouter une nouvelle entité CRUD

```
1. Créer la table MySQL avec les colonnes nécessaires

2. Créer le fichier de route : routes/nom-entite.js
   - Importer express, Router, con (db.js), SQL (sql-template-strings)
   - Implémenter GET / POST / PUT / DELETE
   - Utiliser TOUJOURS SQL`...` pour les paramètres (protection injection)
   - Utiliser TOUJOURS `SQL\`...\`` pour TOUS les paramètres, y compris les DELETE

3. Enregistrer la route dans app.js :
   const nomEntiteRoutes = require('./routes/nom-entite');
   app.use('/api/nom-entite', nomEntiteRoutes);

4. Si la logique est complexe, créer controllers/nom-entite.js
   (pattern suivi uniquement par controllers/universite.js pour l'instant)
```

### Protéger une route avec l'auth JWT

```js
// Dans le fichier de route
const { authJwt } = require("../middleware");

// Protéger par token seulement
router.post('/', [authJwt.verifyToken], (req, res) => { ... });

// Protéger par token + rôle admin
router.delete('/', [authJwt.verifyToken, authJwt.isAdmin], (req, res) => { ... });
```

### Pattern de requête SQL correct

```js
// ✅ CORRECT — protégé contre les injections, erreur gérée proprement
var id = req.query.id;
con.query(SQL`SELECT * FROM table WHERE id = ${id}`, (err, result) => {
    if (err) { console.log(err); res.sendStatus(500); return; }
    res.status(200).json(result);
});

// ❌ INCORRECT — vulnérable aux injections SQL (ne plus faire)
con.query(`DELETE FROM table WHERE id = ${id}`, ...);
```

### Conventions de nommage

| Type | Convention | Exemple |
|---|---|---|
| Fichier de route | kebab-case | `nom-entite.js` |
| Endpoint API | kebab-case singulier ou pluriel | `/api/ecoles`, `/api/campus` |
| Colonne BDD — ID | `id_` + abréviation | `id_ecol`, `id_camp`, `id_dip` |
| Colonne BDD — FK | `nom_entite` + `_id` | `universites_id`, `ecole_f_id` |
| Colonne BDD — champs | `nom_abreg_` + entite | `nom_e`, `sigle_e`, `ville_cam` |

---

## 11. GLOSSAIRE MÉTIER

| Terme | Table BDD | Définition telle qu'implémentée |
|---|---|---|
| **Ecole** | `ecoles` | Établissement d'enseignement. Possède un `pub` (flag sponsoring 'on'/'off'), rattaché à une `Universite`. Lié à ses `Campus` via la table pivot `campus_ecoles`. |
| **Universite** | `universites` | Institution de tutelle (publique ou privée). Possède un `type_univ`, une ville, un recteur. Plusieurs écoles lui sont rattachées. |
| **Campus** | `campus` | Site physique d'une école avec coordonnées GPS (`lon_camp`, `lat_camp`), ville, flag `principal_camp`. Lié aux écoles via `campus_ecoles`. |
| **Formation** | `formations` | Programme d'études proposé par une école pour un diplôme donné. Possède un champ `advers` ('on'/'off') pour le sponsoring. |
| **Diplome** | `diplomes` | Titre académique (BTS, Licence...). Lié à une `Categ` (categorie_id) et à des `Domaines` via `domaines_diplomes`. Possède un champ `filiere_dip`. |
| **Categ / Catégorie** | `categories` | Regroupement de diplômes de même nature. Possède un `groupe` (ordre d'affichage). Ex: "Technicien Supérieur", "Licence Professionnelle". |
| **Domaine** | `domaines` | Champ disciplinaire. Possède une `branche_dom` (sous-spécialisation) et une illustration. Lié aux diplômes (domaines_diplomes) et aux formations (domaines_formations). |
| **Branche** | Colonne de `domaines` | Sous-spécialisation au sein d'un domaine. Ex : dans "Informatique" → "Développement Web", "Réseaux". Utilisée comme paramètre `branche` dans la recherche orientation. |
| **Advers** | Colonne de `formations` + `ecoles` | Flag de sponsoring/mise en avant ('on'/'off'). Les formations avec `advers='on'` remontent dans `/api/advers/formation`. Les écoles avec `pub='on'` remontent dans `/api/advers/school`. |
| **Avis** | `avis` | Avis multi-critères d'un étudiant sur une école. Critères : cours, ambiance, locaux, insertion professionnelle — chacun avec un contenu texte et une note numérique. Inclut une note globale, une recommandation et une justification. |
| **Enregistrement** | `enregistrements` | Formulaire de contact envoyé par un responsable d'établissement souhaitant inscrire son école sur la plateforme. |
| **Métier** | `metier` | Fiche métier/profession. Affiché dans la section orientation pour suggérer des débouchés. |
| **TopNews** | `top_news` | Éléments du carrousel en tête de page d'accueil, distincts des articles de blog (`actualite`). |
| **Interest** | Via `interest_procedure` | Formations sponsorisées affichées en suggestions sur les pages d'information (pub contextuelle). Le paramètre `Page` identifie la page demandeuse. |
| **Client** | Via `save_client_procedure` | Profil collecté pendant le tunnel d'orientation (nom, prénom, statut, niveau, date de naissance, email, tel, pays, ville, diplôme souhaité, domaine). Sauvegardé en BDD à l'étape contact. |
| **SchoolData** | Via `shoolData_procedure` | Agrégat complet d'une école : infos + campus + formations + tout ce qui est nécessaire pour la fiche détail. |
| **DiplomeData** | Via `diplomeData_procedure` | Agrégat complet d'un diplôme pour sa page de détail. |
| **SomeDegree** | `someDegree.js` | Sélection de 9 diplômes aléatoires pour une catégorie donnée (BTS : cat_id=5, Licence : cat_id=17 ou 18). Utilisé pour les encadrés "Découvrez aussi" dans le frontend. |

---

## 12. RELATION FRONTEND ↔ BACKEND

| Aspect | Frontend (cd2front) | Backend (ec_back) |
|---|---|---|
| URL dev | `environment.apiUrl = http://localhost:4200` | `PORT=3000` → `http://localhost:3000` |
| URL prod | `environment.apiUrl = https://nodeapp.camerdiplome.com` | Serveur Node sur port 3000 |
| Token auth | Header `x-access-token` (via `AuthInterceptor`) | `authJwt.verifyToken` lit `req.headers['x-access-token']` |
| Endpoints centralisés | `src/app/constants/api-endpoints.ts` | Tous les `/api/...` montés dans `app.js` |
| SSR Angular | Requêtes HTTP vers le backend lors du prerendering | Répond aux appels XHR du SSR comme à n'importe quel client |
| Module conseiller | `AdvisorService` réutilise `GET /api/result` (+ `GET /api/categ`, `/api/domaine`, `/api/cyties`) | Pas d'endpoint dédié `/api/advisor/search` — filtre budget appliqué côté client |

### Contexte de déploiement

En production, l'architecture supposée est :
- **nginx** (reverse proxy) sur le port 80/443
- Angular SSR Express sur le port **4000** (ou directement servi en statique)
- Node.js Backend Express sur le port **3000**
- MySQL en local sur le même VPS

Le prerendering Angular génère des pages HTML statiques au build pour ~310 routes (écoles, domaines, articles) — ces pages sont servies directement par nginx sans solliciter le backend Node, ce qui améliore le TTFB et le SEO.

---

## 13. SEO — RÔLE DU BACKEND

Le backend **ne gère pas directement le SEO** — pas d'endpoint sitemap, pas de génération de balises meta. Le SEO est entièrement géré côté frontend (Angular SSR + service Title/Meta). Cependant, le backend contribue indirectement au SEO via :

| Contribution | Mécanisme |
|---|---|
| **Slugs d'URL SEO-friendly** | Les noms d'écoles et domaines sont convertis en slugs côté frontend pour les routes `/info/ecole/:slug/:id` et `/info/domaine/:slug/:id` |
| **Données pour meta dynamiques** | `GET /api/shoolData?school=` fournit `nom_e` et `sigle_e` utilisés dans `<title>` et `<meta description>` par `InfoEcoleItemComponent` |
| **Articles blog** | `GET /api/actualite/blog?subjectActu=` fournit `title`, `summary`, `keywords` utilisés pour les meta tags de `/actualite/blog/:subject` |
| **Sitemap statique** | `src/robots.txt` et `src/sitemap.xml` du frontend listent les routes — aucun endpoint backend pour les générer dynamiquement |

**Gap comblé** : `scripts/generate-routes.js` regénère automatiquement `cd2front/routes.txt` depuis la BDD (écoles, domaines, articles) avant chaque build Angular. Le script est déclenché via le hook `prebuild` dans `cd2front/package.json`. Pour l'exécuter manuellement : `node ec_back/scripts/generate-routes.js`.

---

## 14. WORKFLOW ORIENTATION — Tunnel "Trouver ma formation" (côté backend)

> Ce workflow est déclenché depuis la landing page Angular. Il mobilise 5 routes API + 2 procédures stockées + 1 vue MySQL dénormalisée. Aucune authentification n'est requise sur ces routes.

### Vue d'ensemble des routes impliquées

| Étape frontend | Route backend | Fichier | Description |
|---|---|---|---|
| Étape 1 — Choix diplôme | `GET /api/degree?DegreeCyti=tous` | `routes/degree.js` | Toutes les catégories de diplômes |
| Étape 2 — Choix domaine | `GET /api/field?DomaineDegree={degree}` | `routes/field.js` | Domaines liés à un type de diplôme |
| Étape 3 — Choix ville | `GET /api/partCyties?Degree={}&Domaine={}` | `routes/partCyties.js` | Villes avec formations correspondantes |
| Étape 6 — Soumission contact | `POST /api/result` body: UserProfil | `routes/resultats.js` | Sauvegarde du profil client en BDD |
| Étape 7 — Résultats | `GET /api/result?city=&diplome=&domaine=&branche=` | `routes/resultats.js` | Recherche de formations correspondantes |

---

### Route 1 : `GET /api/degree` — Catégories de diplômes

**Fichier** : `routes/degree.js`

Trois modes de fonctionnement selon les paramètres :

| Paramètre | Comportement | SQL |
|---|---|---|
| `DegreeCyti=tous` | Toutes les catégories | `SELECT nom_cat, groupe FROM categories ORDER BY groupe` |
| `DegreeCyti={ville}` | Catégories disponibles dans cette ville | JOIN campus → campus_ecoles → ecoles → formations → diplomes → categories, filtre `ville_cam LIKE {ville}` |
| `DegreeField={domaine}` | Catégories liées à ce domaine | JOIN domaines → domaines_formations → formations → diplomes → categories, filtre `nom_dom LIKE {domaine}` |

**Pour le tunnel orientation**, le frontend appelle toujours `DegreeCyti=tous` à l'étape 1, puis les filtres s'affinent aux étapes suivantes.

**Retourne** : `{ nom_cat, groupe }[]` — `groupe` sert à l'affichage en accordéons dans le frontend.

---

### Route 2 : `GET /api/field` — Domaines/filières

**Fichier** : `routes/field.js`

Quatre modes de fonctionnement :

| Paramètres | Comportement | Tables impliquées |
|---|---|---|
| `DomaineDegree={degree}` seulement | Domaines liés aux diplômes de ce type | domaines → domaines_diplomes → diplomes → categories, filtre `nom_cat LIKE {degree}` |
| `DomaineCyti={ville}` (+ optionnel degree) | Domaines disponibles dans cette ville | campus → campus_ecoles → ecoles → formations → diplomes → categories + domaines |
| `DomaineDegree=tous` | Tous les domaines liés à une formation | domaines → domaines_formations → formations |
| aucun paramètre | Retourne rien | — |

**Retourne** : `{ nom_dom, branche_dom }[]`

**Autres endpoints du même fichier** (non utilisés dans le tunnel) :
- `GET /api/field/page` — domaines avec illustration (page "Découvrez les filières")
- `GET /api/field/item?idFiliere=` — un domaine par ID
- `GET /api/field/br` — branches distinctes
- `GET /api/field/categ` — noms des catégories

---

### Route 3 : `GET /api/partCyties` — Villes filtrées

**Fichier** : `routes/partCyties.js`  
**Procédure appelée** : `get_villes_par_diplome_et_domaine`

**Paramètres requis (les deux ensemble)** :
- `Degree` : nom de catégorie de diplôme (ex: "BTS")
- `Domaine` : nom de domaine (ex: "Informatique")

**Logique de la procédure** :
1. Applique le même **regroupement de diplômes** que la recherche finale (voir ci-dessous)
2. Requête sur la vue `v_formations_search`
3. Filtre : `nom_cat IN (famille_diplomes)` ET `nom_dom LIKE {domaine}`
4. Retourne : `DISTINCT ville_cam`

**Retourne** : `{ ville_cam }[]` — uniquement les villes où des formations correspondantes existent réellement.

---

### Route 4 : `POST /api/result` — Sauvegarde du profil client

**Fichier** : `routes/resultats.js`  
**Procédure appelée** : `save_client_procedure`

**Payload attendu** (objet `UserProfil` complet) :

```json
{
  "name": "Dupont",
  "surname": "Jean",
  "statuts": "lycéen",
  "level": "Terminale",
  "bornDate": "2006",
  "email": "jean@example.com",
  "tel": "+237 6 00 00 00 00",
  "country": "Cameroun",
  "city": "Yaoundé",
  "degree": "BTS",
  "field": "Informatique"
}
```

**INSERT dans la table `clients`** :
```sql
INSERT INTO clients
  (nom_c, prenom_c, statut_c, niveau_c, naissance_c, email_c, tel_c, 
   serch_date, pays_c, ville_cible, diplome_cible, domaine_cible)
VALUES
  (nom, prenom, statut, niveau, born, email, tel, NOW(), country, ville, diplome, domaine)
```

**Note** : `branche` n'est pas sauvegardée dans la table `clients` — elle est collectée en frontend mais non transmise à cette procédure.

**Retourne** : HTTP 200 en cas de succès.

---

### Route 5 : `GET /api/result` — Recherche de formations

**Fichier** : `routes/resultats.js`  
**Procédure appelée** : `serch_result_procedure`

**Paramètres** :
- `city` : ville (LIKE)
- `diplome` : catégorie diplôme (IN avec famille élargie)
- `domaine` : domaine (LIKE)
- `branche` : branche (transmis mais **non utilisé** dans la procédure SQL actuelle)

**Regroupement de diplômes par famille** (logique clé de la recherche) :

| Famille | Valeurs incluses |
|---|---|
| Licence | Licence, Licence Pro, Bachelor, Ingénieur de Travaux, BUT, DGC |
| Master | Master, MBA, Master Pro, Ingénieur de conception |
| Cycle court | BP, CAP, DTS, BQP, DT, DQP, CQP, Formation Qualifiante, Attestation de Formation, Certification Internationale |
| BTS/DUT | BTS, DUT, Prépa International, HND, DSEP |
| Autre | Correspondance exacte (`nom_cat = {diplome}`) |

Ce regroupement permet d'élargir les résultats : un utilisateur qui cherche "BTS" voit aussi les formations HND, DUT, DSEP.

**Source** : Vue MySQL `v_formations_search` — vue dénormalisée qui joint :
```
formations → ecoles → campus (via campus_ecoles) → diplomes → categories → domaines
```

**Tri** : résultats exacts en premier (`ORDER BY ordre_priorite ASC`), les élargi ensuite.

**Retourne** : `interestelt[]` avec 18 colonnes :
```
nom_dip, nom_cat, id_ecol, nom_e, groupe, sigle_e, ville_cam,
id_form, date_debut_f, cout_f, logo_e, descriptif_dip, descriptif_f,
tel_1_e, email_e, siteweb_e, conditions_f, descriptif_e
```

---

### Vue MySQL `v_formations_search`

Vue centrale pour toute la recherche d'orientation. Elle dénormalise ~27 colonnes en joignant :
- `formations` (programme, coût, date, conditions)
- `ecoles` (nom, sigle, logo, contacts, ville via campus)
- `campus` + `campus_ecoles` (pour la ville)
- `diplomes` (nom du diplôme)
- `categories` (nom_cat, groupe)
- `domaines` (nom_dom, branche_dom) via `domaines_diplomes` ou `domaines_formations`

Cette vue est utilisée par `serch_result_procedure`, `get_villes_par_diplome_et_domaine`, et potentiellement d'autres procédures de filtrage.

---

### Table `clients` — données collectées

Chaque passage complet du tunnel (jusqu'à l'étape contact) crée une ligne dans `clients` :

| Colonne | Source | Description |
|---|---|---|
| `id_client` | AUTO_INCREMENT | Clé primaire |
| `nom_c` | Étape 6 | Nom de famille |
| `prenom_c` | Étape 6 | Prénom |
| `statut_c` | Étape 4 | Lycéen / Étudiant / En activité / Sans emploi |
| `niveau_c` | Étape 5 | Niveau d'études actuel |
| `naissance_c` | Étape 6 | Année de naissance |
| `email_c` | Étape 6 | Email |
| `tel_c` | Étape 6 | Téléphone international |
| `pays_c` | Étape 6 | Pays de nationalité |
| `serch_date` | Auto | Timestamp de la recherche (NOW()) |
| `ville_cible` | Étape 3 | Ville souhaitée pour étudier |
| `diplome_cible` | Étape 1 | Diplôme visé |
| `domaine_cible` | Étape 2 | Domaine/filière visée |

**Note** : `branche` (sous-domaine de l'étape 2) n'est pas stockée.

---

### Points d'attention techniques

| # | Problème | Impact |
|---|---|---|
| 1 | **`branche` non utilisée dans `serch_result_procedure`** — elle est collectée en frontend et transmise dans la query string, mais la procédure ne l'applique pas comme filtre | Résultats trop larges si branche spécialisée |
| 2 | **`branche` non sauvegardée dans `clients`** — donnée collectée mais perdue | Données analytiques incomplètes |
| 3 | **IDs de catégories hardcodés dans `someDegree.js`** — `cat_id=5` pour BTS, `cat_id=17/18` pour Licence | Cassure silencieuse si la table `categories` change |
| 4 | **Vue `v_formations_search` non listée dans ce CLAUDE.md** — son schéma exact est dans la BDD, pas dans le code source | Difficile à déboguer sans accès BDD |
| 5 | **Pas de pagination sur `GET /api/result`** — retourne toutes les formations correspondantes en une requête | Risque de surcharge si beaucoup de résultats |
| 6 | **Aucune validation des inputs sur `/api/result` POST** — un profil incomplet (city/degree vides) est inséré tel quel dans `clients` | Données CRM inutilisables |
