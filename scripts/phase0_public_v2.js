require('dotenv').config({ path: 'D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\.env', quiet: true });
const mysql = require('mysql2/promise');
const cfg = require('D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\config\\db.config.js');

const MISSING_PUBLIC = ['Université de Bertoua', "Université d'Ebolowa", 'Université de Garoua'];
const PRIVATE_WITH_FACULTIES = [
  'Institut Universitaire Protestant de Yaoundé',
  'Institut Universitaire Évangélique du Cameroun',
  'Institut Universitaire de Bertoua',
  "Centre International des Études Polytechniques d'Obala",
  'Institut Supérieur Protestant des Sciences et de Technologie',
  'Institut Universitaire privé Laïc de l\'Équateur',
];
const AUTONOMOUS_PUBLIC = [
  'Institut National de la Jeunesse et des Sports',
  "Institut Sous-regional des Statistiques et d'Economie Appliquée",
];

(async () => {
  const conn = await mysql.createConnection({
    host: cfg.host, user: cfg.user, password: cfg.password, database: cfg.database, port: cfg.port,
    charset: 'utf8mb4'
  });

  console.log('=== 1. Universités existantes (id_univ, nom_univ, type_univ) ===');
  const [univs] = await conn.query('SELECT id_univ, nom_univ, sigle_univ, type_univ FROM universites ORDER BY id_univ');
  console.log(JSON.stringify(univs, null, 2));

  console.log('\n=== 2. Vérification des 3 universités publiques manquantes ===');
  for (const name of MISSING_PUBLIC) {
    const [rows] = await conn.query('SELECT id_univ, nom_univ, type_univ FROM universites WHERE nom_univ LIKE ?', [`%${name.replace('Université ', '').replace("d'", '').replace('de ', '')}%`]);
    console.log(`${name}: ${rows.length ? 'TROUVÉE -> ' + JSON.stringify(rows) : 'ABSENTE'}`);
  }

  console.log('\n=== 3. Vérification des universités privées à facultés internes ===');
  for (const name of PRIVATE_WITH_FACULTIES) {
    const [rows] = await conn.query('SELECT id_univ, nom_univ, type_univ FROM universites WHERE nom_univ = ?', [name]);
    if (rows.length) {
      console.log(`"${name}": TROUVÉE -> ${JSON.stringify(rows)}`);
    } else {
      const [fuzzy] = await conn.query('SELECT id_univ, nom_univ, type_univ FROM universites WHERE nom_univ LIKE ?', [`%${name.split(' ').slice(-1)[0]}%`]);
      console.log(`"${name}": ABSENTE (exact) — proches: ${JSON.stringify(fuzzy)}`);
    }
  }

  console.log('\n=== 4. Vérification des 2 instituts publics autonomes ===');
  for (const name of AUTONOMOUS_PUBLIC) {
    const [rows] = await conn.query('SELECT id_ecol, nom_e, universites_id FROM ecoles WHERE nom_e LIKE ?', [`%${name.split(' ').slice(0,4).join(' ')}%`]);
    console.log(`"${name}": ${rows.length ? JSON.stringify(rows) : 'introuvable dans ecoles'}`);
  }

  console.log('\n=== 5. Écoles/facultés existantes rattachées aux universités publiques ===');
  const [ecoles] = await conn.query(`
    SELECT e.id_ecol, e.nom_e, e.sigle_e, e.universites_id, u.nom_univ
    FROM ecoles e JOIN universites u ON e.universites_id = u.id_univ
    WHERE u.nom_univ LIKE 'Universit%'
    ORDER BY u.nom_univ, e.nom_e
  `);
  console.log('Total:', ecoles.length);
  console.log(JSON.stringify(ecoles, null, 2));

  console.log('\n=== 6. Catégories existantes ===');
  const [cats] = await conn.query('SELECT id_cat, nom_cat FROM categories ORDER BY id_cat');
  console.log(JSON.stringify(cats, null, 2));

  await conn.end();
})().catch(e => { console.error(e.message); process.exit(1); });
