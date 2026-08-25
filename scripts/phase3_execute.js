require('dotenv').config({ path: 'D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\.env', quiet: true });
const fs = require('fs');
const mysql = require('mysql2/promise');
const cfg = require('D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\config\\db.config.js');

const SQL_FILE = 'D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\scripts\\phase3_insert_universites.sql';

(async () => {
  const sql = fs.readFileSync(SQL_FILE, 'utf8');
  const conn = await mysql.createConnection({
    host: cfg.host, user: cfg.user, password: cfg.password, database: cfg.database, port: cfg.port,
    charset: 'utf8mb4', multipleStatements: true
  });
  await conn.query(sql);
  console.log('Exécution terminée.');

  const [rows] = await conn.query(
    "SELECT id_univ, nom_univ, sigle_univ, type_univ, ville_univ FROM universites WHERE nom_univ IN (?,?,?,?,?,?,?,?,?,?) ORDER BY id_univ",
    [
      'Université de Bertoua', "Université d'Ebolowa", 'Université de Garoua',
      "Institut Universitaire privé Laïc de l'Équateur",
      "Centre International des Études Polytechniques d'Obala",
      'Institut Universitaire Protestant de Yaoundé',
      'Institut Universitaire Évangélique du Cameroun',
      'Institut Universitaire de Bertoua',
      'Institut Supérieur Protestant des Sciences et de Technologie',
      'Université Adventiste Cosendai',
    ]
  );
  console.log('Vérification post-insertion:');
  console.log(JSON.stringify(rows, null, 2));

  await conn.end();
})().catch(e => { console.error('Erreur:', e.message); process.exit(1); });
