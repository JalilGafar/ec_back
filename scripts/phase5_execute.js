require('dotenv').config({ path: 'D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\.env', quiet: true });
const fs = require('fs');
const mysql = require('mysql2/promise');
const cfg = require('D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\config\\db.config.js');

const PLAN = 'D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\scripts\\phase5_formations_plan.json';

(async () => {
  const plan = JSON.parse(fs.readFileSync(PLAN, 'utf8'));
  const conn = await mysql.createConnection({
    host: cfg.host, user: cfg.user, password: cfg.password, database: cfg.database, port: cfg.port,
    charset: 'utf8mb4'
  });

  let inserted = 0;
  for (let i = 0; i < plan.length; i += 50) {
    const batch = plan.slice(i, i + 50);
    await conn.beginTransaction();
    try {
      const values = batch.map(f => [f.nom_f, f.duree_f, f.ecole_f_id, f.diplom_id]);
      await conn.query(
        'INSERT INTO formations (nom_f, duree_f, ecole_f_id, diplom_id) VALUES ?',
        [values]
      );
      await conn.commit();
      inserted += batch.length;
    } catch (err) {
      await conn.rollback();
      console.error(`Erreur sur le lot ${i}-${i + batch.length}, rollback:`, err.message);
      throw err;
    }
  }

  console.log('Formations insérées:', inserted);
  const [[{ c }]] = await conn.query('SELECT COUNT(*) c FROM formations');
  console.log('Total formations en base après insertion:', c);

  await conn.end();
})().catch(e => { console.error('Erreur:', e.message); process.exit(1); });
