/**
 * generate-routes.js
 * Regénère cd2front/routes.txt depuis la base de données avant chaque build Angular.
 *
 * Usage direct : node ec_back/scripts/generate-routes.js
 * Usage automatique : déclenché par le script "prebuild" dans cd2front/package.json
 */

'use strict';

require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const mysql = require('mysql2/promise');
const fs    = require('fs');
const path  = require('path');

// ─── Slug — même algorithme que generateSlug() dans les composants Angular ────
function slug(str) {
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // supprime les accents
    .replace(/[^a-z0-9]+/g, '-')       // tout sauf lettres/chiffres → tiret
    .replace(/^-+|-+$/g, '');          // retire les tirets en début/fin
}

// ─── Requêtes ──────────────────────────────────────────────────────────────────
const QUERIES = {
  ecoles:   'SELECT id_ecol, sigle_e, nom_e   FROM ecoles   ORDER BY id_ecol',
  domaines: 'SELECT id_dom,  nom_dom          FROM domaines ORDER BY id_dom',
  metiers:  'SELECT id_metier, titre          FROM metier   ORDER BY id_metier',
  // Pas de filtre sur visible : cohérent avec GET /api/actualite qui retourne tout.
  // La route /actualite/blog/:subject utilise le champ sujets comme slug.
  articles: 'SELECT sujets FROM actualite ORDER BY id_actu',
};

// ─── Construction des routes ──────────────────────────────────────────────────
function buildRoutes({ ecoles, domaines, metiers, articles }) {
  const ecoleRoutes = ecoles.map(({ id_ecol, sigle_e, nom_e }) => {
    const s = slug(`${sigle_e} ${nom_e}-${id_ecol}`);
    return `/info/ecole/${s}/${id_ecol}`;
  });

  const domaineRoutes = domaines.map(({ id_dom, nom_dom }) => {
    const s = slug(`formations en ${nom_dom} au Cameroun`);
    return `/info/domaine/${s}/${id_dom}`;
  });

  const metierRoutes = metiers.map(({ id_metier, titre }) => {
    const s = slug(titre);
    return `/info/metier/${s}/${id_metier}`;
  });

  const articleRoutes = articles.map(({ sujets }) => `/actualite/blog/${sujets}`);

  return { ecoleRoutes, domaineRoutes, metierRoutes, articleRoutes };
}

// ─── Formatage du fichier final ───────────────────────────────────────────────
function formatFile({ ecoleRoutes, domaineRoutes, metierRoutes, articleRoutes }) {
  const sep = (label, count) => `\n\n\n# ${label} (${count})\n`;

  return [
    sep('Écoles', ecoleRoutes.length),
    ...ecoleRoutes,
    sep('Domaines', domaineRoutes.length),
    ...domaineRoutes,
    sep('Métiers', metierRoutes.length),
    ...metierRoutes,
    sep('Articles blog', articleRoutes.length),
    ...articleRoutes,
    '\n',
  ].join('\n');
}

// ─── Point d'entrée ───────────────────────────────────────────────────────────
async function main() {
  const db = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'ecolecamerdb',
    port:     Number(process.env.DB_PORT) || 3306,
  });

  try {
    const [ecoles, domaines, metiers, articles] = await Promise.all([
      db.query(QUERIES.ecoles),
      db.query(QUERIES.domaines),
      db.query(QUERIES.metiers),
      db.query(QUERIES.articles),
    ]);

    const data = {
      ecoles:   ecoles[0],
      domaines: domaines[0],
      metiers:  metiers[0],
      articles: articles[0],
    };

    const routes  = buildRoutes(data);
    const content = formatFile(routes);

    const outPath = path.resolve(__dirname, '../../cd2front/routes.txt');
    fs.writeFileSync(outPath, content, 'utf8');

    const total = routes.ecoleRoutes.length
                + routes.domaineRoutes.length
                + routes.metierRoutes.length
                + routes.articleRoutes.length;

    console.log('✓ routes.txt regénéré');
    console.log(`  écoles   : ${routes.ecoleRoutes.length}`);
    console.log(`  domaines : ${routes.domaineRoutes.length}`);
    console.log(`  métiers  : ${routes.metierRoutes.length}`);
    console.log(`  articles : ${routes.articleRoutes.length}`);
    console.log(`  total    : ${total} routes`);

  } finally {
    await db.end();
  }
}

main().catch(err => {
  console.error('✗ Échec de la génération de routes.txt :', err.message);
  process.exit(1);
});
