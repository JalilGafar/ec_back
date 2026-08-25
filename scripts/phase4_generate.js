require('dotenv').config({ path: 'D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\.env', quiet: true });
const fs = require('fs');
const mysql = require('mysql2/promise');
const cfg = require('D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\config\\db.config.js');

const PLAN = 'D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\scripts\\phase4_ecoles_plan.json';

const DRY_RUN = process.argv.includes('--dry-run');

// Manual fixes for truncated names in the scraped source data
const NAME_FIXES = {
  "Faculté des sciences pharmaceutiques, Médicales, m?d": "Faculté des Sciences Pharmaceutiques et Médicales",
  "Faculté de médecine et des sciences de la sant": "Faculté de Médecine et des Sciences de la Santé",
  "Faculté de gestion et d'administration fonciè": "Faculté de Gestion et d'Administration Foncière",
  "Faculté de médecine et des sciences bio": "Faculté de Médecine et des Sciences Biomédicales",
};

// Existing campus to reuse, keyed by universites_id
const REUSE_CAMPUS = {
  18: 16,   // Bamenda -> Campus de l'UBa
  19: 229,  // Buea -> Campus de l'UBuea
  14: 231,  // Douala -> Campus de l'UD
  21: 236,  // Yaoundé 1 -> Campus de l'UY1
  22: 239,  // Yaoundé 2 -> Campus Ngoa Ekelle UY2
  20: 233,  // Maroua -> Campus de l'UM
  6: 234,   // Ngaoundéré -> Campus de l'UN
  8: 3,     // Dschang -> Université de Dschang (campus)
  48: 159,  // IUEC -> Campus IUEC Bandjoun
  50: 165,  // ISPST -> Campus ISPSTE
  45: 166,  // IUPLE -> Campus IUPLE
  46: 25,   // CIEPO -> Campus CIEPO Obala
  51: 76,   // Université Adventiste Cosendai -> Campus UAC
};

// New campus to create, keyed by universites_id
const NEW_CAMPUS = {
  42: { nom_camp: "Campus de l'UBer", ville_cam: 'Bertoua' },
  43: { nom_camp: "Campus de l'UEb", ville_cam: 'Ebolowa' },
  44: { nom_camp: "Campus de l'UG", ville_cam: 'Garoua' },
  47: { nom_camp: 'Campus IUPY', ville_cam: 'Yaoundé' },
  49: { nom_camp: 'Campus IUB Bertoua', ville_cam: 'Bertoua' },
};

// Autonomous institutes with no université de tutelle: create their own dedicated campus
const AUTONOMOUS_CAMPUS = {
  'Ecole Nationale des Postes et Télécommunications': { nom_camp: 'Campus ENSPT', ville_cam: 'Yaoundé' },
  'Institut National de la Jeunesse et des Sports': { nom_camp: 'Campus INJS', ville_cam: 'Yaoundé' },
  "Institut Sous-regional des Statistiques et d'Economie Appliquée": { nom_camp: 'Campus ISSEA', ville_cam: 'Yaoundé' },
};

(async () => {
  const plan = JSON.parse(fs.readFileSync(PLAN, 'utf8'));
  const toCreate = plan.toCreate.map(t => ({ ...t, school: NAME_FIXES[t.school] || t.school }));

  const conn = await mysql.createConnection({
    host: cfg.host, user: cfg.user, password: cfg.password, database: cfg.database, port: cfg.port,
    charset: 'utf8mb4'
  });

  if (DRY_RUN) {
    console.log('=== DRY RUN — aucune écriture ===\n');
    console.log('Campus à créer:', Object.keys(NEW_CAMPUS).length + Object.keys(AUTONOMOUS_CAMPUS).length);
    console.log(JSON.stringify(NEW_CAMPUS, null, 2));
    console.log(JSON.stringify(AUTONOMOUS_CAMPUS, null, 2));
    console.log('\nÉcoles à créer:', toCreate.length);
    for (const t of toCreate) {
      console.log(`  "${t.school}" (universites_id=${t.universites_id}, pub=${t.pub}) — parent: ${t.parent}`);
    }
    await conn.end();
    return;
  }

  await conn.beginTransaction();
  try {
    // 1. Create new campus for universities that don't have one yet
    const campusIdByUniv = { ...REUSE_CAMPUS };
    for (const [univId, c] of Object.entries(NEW_CAMPUS)) {
      const [res] = await conn.query('INSERT INTO campus (nom_camp, ville_cam) VALUES (?, ?)', [c.nom_camp, c.ville_cam]);
      campusIdByUniv[univId] = res.insertId;
      console.log(`Campus créé: "${c.nom_camp}" (${c.ville_cam}) -> id_camp=${res.insertId}`);
    }

    // 2. Create campus for the 3 autonomous institutes (keyed by school name)
    const campusIdByAutonomousSchool = {};
    for (const [schoolName, c] of Object.entries(AUTONOMOUS_CAMPUS)) {
      const [res] = await conn.query('INSERT INTO campus (nom_camp, ville_cam) VALUES (?, ?)', [c.nom_camp, c.ville_cam]);
      campusIdByAutonomousSchool[schoolName] = res.insertId;
      console.log(`Campus créé: "${c.nom_camp}" (${c.ville_cam}) -> id_camp=${res.insertId}`);
    }

    // 3. Create écoles + link to campus
    let createdEcoles = 0;
    let linkedCampus = 0;
    for (const t of toCreate) {
      const [res] = await conn.query(
        'INSERT INTO ecoles (nom_e, universites_id, pub) VALUES (?, ?, ?)',
        [t.school, t.universites_id, t.pub]
      );
      const ecoleId = res.insertId;
      createdEcoles++;

      let campusId;
      if (t.universites_id === null) {
        campusId = campusIdByAutonomousSchool[t.school];
      } else {
        campusId = campusIdByUniv[t.universites_id];
      }

      if (campusId) {
        await conn.query('INSERT IGNORE INTO campus_ecoles (campus_id, ecole_id) VALUES (?, ?)', [campusId, ecoleId]);
        linkedCampus++;
      } else {
        console.warn(`  ⚠ Aucun campus résolu pour "${t.school}" (universites_id=${t.universites_id})`);
      }
    }

    await conn.commit();
    console.log(`\nÉcoles créées: ${createdEcoles}`);
    console.log(`Liens campus_ecoles créés: ${linkedCampus}`);
  } catch (err) {
    await conn.rollback();
    console.error('Erreur, rollback effectué:', err.message);
    throw err;
  } finally {
    await conn.end();
  }
})().catch(e => { console.error('Erreur:', e.message); process.exit(1); });
