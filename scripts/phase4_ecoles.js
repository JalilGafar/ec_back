require('dotenv').config({ path: 'D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\.env', quiet: true });
const fs = require('fs');
const mysql = require('mysql2/promise');
const cfg = require('D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\config\\db.config.js');

const IN = 'D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\scripts\\phase1_public_parsed3.json';
const OUT = 'D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\scripts\\phase4_ecoles_plan.json';

const PARENT_TO_UNIV_ID = {
  'Université de Bamenda': 18,
  'Université de Garoua': 44,
  'Université de Maroua': 20,
  'Université de Buea': 19,
  'Université de Douala': 14,
  'Université de Yaoundé 1': 21,
  'Université de Dschang': 8,
  'Institut Universitaire Evangélique du Cameroun': 48,
  'Université de Ngaoundéré': 6,
  'Institut Universitaire de Bertoua': 49,
  'Université de Bertoua': 42,
  'Université Adventiste Cosendai': 51,
  'Université de Yaoundé 2': 22,
  'Institut Universitaire Protestant de Yaoundé': 47,
  "Centre International des Etudes Polytechniques d'Obala": 46,
  "Institut Universitaire privé Laic de l'Equateur": 45,
  "Université d'Ebolowa": 43,
  'Institut Supérieur Protestant des sciences et de Technologie': 50,
};

const UNIV_TYPE = {
  18: 'Publique', 44: 'Publique', 20: 'Publique', 19: 'Publique', 14: 'Publique',
  21: 'Publique', 8: 'Publique', 6: 'Publique', 42: 'Publique', 43: 'Publique', 22: 'Publique',
  48: 'Privé confessionnel', 49: 'Privé confessionnel', 51: 'Privé confessionnel',
  47: 'Privé confessionnel', 50: 'Privé confessionnel',
  46: 'Privé', 45: 'Privé',
};

function stripAccents(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, ''); }
function normalize(s) {
  let n = stripAccents(s.toLowerCase());
  n = n.replace(/[’'`´]/g, "'");
  n = n.replace(/[^a-z0-9' ]+/g, ' ');
  n = n.replace(/\s+/g, ' ').trim();
  return n;
}

(async () => {
  const data = JSON.parse(fs.readFileSync(IN, 'utf8'));

  const groups = new Map();
  for (const e of data) {
    const key = e.parent || '(AUTONOME)';
    if (!groups.has(key)) groups.set(key, new Set());
    groups.get(key).add(e.school);
  }

  const conn = await mysql.createConnection({
    host: cfg.host, user: cfg.user, password: cfg.password, database: cfg.database, port: cfg.port,
    charset: 'utf8mb4'
  });

  const [allEcoles] = await conn.query('SELECT id_ecol, nom_e, universites_id FROM ecoles');
  const existingByUniv = new Map(); // universites_id (or 'null') -> Set(normalized names)
  for (const e of allEcoles) {
    const key = e.universites_id === null ? 'null' : e.universites_id;
    if (!existingByUniv.has(key)) existingByUniv.set(key, new Set());
    existingByUniv.get(key).add(normalize(e.nom_e));
  }
  await conn.end();

  const toCreate = [];
  const alreadyExists = [];
  const unmappedParents = new Set();

  for (const [parent, schools] of groups) {
    let univId = null;
    if (parent !== '(AUTONOME)') {
      univId = PARENT_TO_UNIV_ID[parent];
      if (univId === undefined) { unmappedParents.add(parent); continue; }
    }
    const existingSet = existingByUniv.get(univId === null ? 'null' : univId) || new Set();
    for (const school of schools) {
      const norm = normalize(school);
      if (existingSet.has(norm)) {
        alreadyExists.push({ parent, school, universites_id: univId });
      } else {
        toCreate.push({
          parent,
          school: school.trim(),
          universites_id: univId,
          pub: univId === null ? 'Publique' : UNIV_TYPE[univId],
        });
      }
    }
  }

  console.log('Parents non mappés:', [...unmappedParents]);
  console.log('Écoles déjà existantes (ignorées):', alreadyExists.length);
  alreadyExists.forEach(a => console.log('  [existe déjà]', a.school, '->', a.parent));
  console.log('\nÉcoles à créer:', toCreate.length);
  for (const t of toCreate) {
    console.log(`  [NOUVEAU] "${t.school}" (universites_id=${t.universites_id}, pub=${t.pub}) — parent: ${t.parent}`);
  }

  fs.writeFileSync(OUT, JSON.stringify({ toCreate, alreadyExists }, null, 2), 'utf8');
  console.log('\nFichier écrit:', OUT);
})().catch(e => { console.error('Erreur:', e.message); process.exit(1); });
