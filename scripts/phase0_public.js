require('dotenv').config({ path: 'D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\.env', quiet: true });
const fs = require('fs');
const mysql = require('mysql2/promise');
const cfg = require('D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\config\\db.config.js');

(async () => {
  const conn = await mysql.createConnection({
    host: cfg.host, user: cfg.user, password: cfg.password, database: cfg.database, port: cfg.port,
    charset: 'utf8mb4'
  });

  const run = async (label, sql) => {
    const [rows] = await conn.query(sql);
    console.log('\n=== ' + label + ' (' + rows.length + ' lignes) ===');
    console.log(JSON.stringify(rows, null, 2));
  };

  await run('Toutes les universités (id, nom, sigle, ville)', `
    SELECT id_univ, nom_univ, sigle_univ, ville_univ FROM universites ORDER BY id_univ`);

  await run('Écoles existantes contenant "Faculté" ou "Ecole" (échantillon)', `
    SELECT id_ecol, nom_e, sigle_e, universites_id
    FROM ecoles
    WHERE nom_e LIKE '%Faculté%' OR nom_e LIKE '%Facult%'
       OR nom_e LIKE 'Ecole Normale%' OR nom_e LIKE 'École Normale%'
       OR nom_e LIKE 'Ecole Nationale%' OR nom_e LIKE 'École Nationale%'
    ORDER BY nom_e`);

  await conn.end();
})().catch(err => { console.error('Erreur:', err.message); process.exit(1); });
