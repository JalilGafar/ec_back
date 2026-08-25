require('dotenv').config({ path: 'D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\.env', quiet: true });
const fs = require('fs');
const mysql = require('mysql2/promise');
const cfg = require('D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\config\\db.config.js');

const RAW = 'D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\scripts\\phase1_public_parsed3.json';
const DIP_FINAL = 'D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\scripts\\phase2_public_diplomes_final.json';
const OUT = 'D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\scripts\\phase5_formations_plan.json';

const NAME_FIXES = {
  "Faculté des sciences pharmaceutiques, Médicales, m?d": "Faculté des Sciences Pharmaceutiques et Médicales",
  "Faculté de médecine et des sciences de la sant": "Faculté de Médecine et des Sciences de la Santé",
  "Faculté de gestion et d'administration fonciè": "Faculté de Gestion et d'Administration Foncière",
  "Faculté de médecine et des sciences bio": "Faculté de Médecine et des Sciences Biomédicales",
};

const PARENT_TO_UNIV_ID = {
  'Université de Bamenda': 18, 'Université de Garoua': 44, 'Université de Maroua': 20,
  'Université de Buea': 19, 'Université de Douala': 14, 'Université de Yaoundé 1': 21,
  'Université de Dschang': 8, 'Institut Universitaire Evangélique du Cameroun': 48,
  'Université de Ngaoundéré': 6, 'Institut Universitaire de Bertoua': 49,
  'Université de Bertoua': 42, 'Université Adventiste Cosendai': 51,
  'Université de Yaoundé 2': 22, 'Institut Universitaire Protestant de Yaoundé': 47,
  "Centre International des Etudes Polytechniques d'Obala": 46,
  "Institut Universitaire privé Laic de l'Equateur": 45,
  "Université d'Ebolowa": 43, 'Institut Supérieur Protestant des sciences et de Technologie': 50,
};

const DUREE_MAP = {
  'BTS': '2 ans', 'DUT': '2 ans', 'DEUG': '2 ans', 'DEUP': '2 ans',
  'LICENCE': '3 ans', 'LICENCE PROFESSIONNELLE': '3 ans', 'DIPCO': '3 ans',
  'Diplôme d´Ingénieur Statisticien Economiste ISE': '3 ans',
  'Diplôme d´Ingénieur des Travaux Statistiques': '3 ans',
  'MASTER': '2 ans', 'MASTER PROFESSIONNEL': '2 ans',
  "DIPLÔME D'ETUDES SUPERIEURES": '2 ans', 'CAPACITE EN DROIT': '2 ans',
  'Master en Administration des Affaires MBA': '2 ans',
  'DOCTORAT PhD': '3 ans',
  'Doctorat en Médecine, en pharmacie ou en buccodentaire': '7 ans',
  'DIPLÔME DE SPECIALISATION EN MEDECINE/PHARMACIE': '3 ans',
  "DIPLÔME D'INGÉNIEUR": '5 ans',
  "DIPLÔME D'INGÉNIEUR DE TRAVAUX": '1 an',
  'DIPES I': '1 an', 'DIPES II': '1 an', 'DIPET I': '1 an', 'DIPET II': '1 an',
  "Certificat d'Aptitude au Professorat d'Education Physique et Sportive I CAPEPS I": '1 an',
  "Certificat d'Aptitude au Professorat d'Education Physique et Sportive II CAPEPS II": '1 an',
  "Diplôme de Conseiller de Jeunesse et d'Animation CJA": '2 ans',
  "Diplôme de Conseiller Principal de Jeunesse et d'Animation CPJA": '2 ans',
  "DIPLÔME SUPÉRIEUR D'ÉTUDES PROFESSIONNELLES DSEP": '1 an',
  "DIPLÔME D'ÉTUDES SUPÉRIEURES SPÉCIALISES D.E.S.S": '1 an',
  "DIPLÔME D'ETUDES PROFESSIONNELLES": '1 an',
};

function stripAccents(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, ''); }
function normalize(s) {
  let n = stripAccents(s.toLowerCase());
  n = n.replace(/[’'`´]/g, "'");
  n = n.replace(/[^a-z0-9' ]+/g, ' ');
  n = n.replace(/\s+/g, ' ').trim();
  return n;
}
function capitalize(s) {
  s = s.trim();
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

(async () => {
  const raw = JSON.parse(fs.readFileSync(RAW, 'utf8'));
  const dipCombos = JSON.parse(fs.readFileSync(DIP_FINAL, 'utf8'));

  const conn = await mysql.createConnection({
    host: cfg.host, user: cfg.user, password: cfg.password, database: cfg.database, port: cfg.port,
    charset: 'utf8mb4'
  });

  // Build école lookup: normalize(parent + '|' + school) -> id_ecol (first occurrence wins if duplicates exist)
  const [allEcoles] = await conn.query('SELECT id_ecol, nom_e, universites_id FROM ecoles');
  const ecoleByUniv = new Map(); // universites_id (or 'null') -> Map(normName -> id_ecol)
  for (const e of allEcoles) {
    const key = e.universites_id === null ? 'null' : e.universites_id;
    if (!ecoleByUniv.has(key)) ecoleByUniv.set(key, new Map());
    const m = ecoleByUniv.get(key);
    const norm = normalize(e.nom_e);
    if (!m.has(norm)) m.set(norm, e.id_ecol); // keep first (lowest id) on duplicates
  }

  // Build diplome lookup: nom_dip -> id_dip (post Phase-2 insert, includes newly created ones)
  const [allDip] = await conn.query('SELECT id_dip, nom_dip FROM diplomes');
  const dipByName = new Map();
  for (const d of allDip) dipByName.set(d.nom_dip, d.id_dip);

  // Build combo lookup: diplome_type|formation(lower) -> resolved id_dip
  const comboMap = new Map();
  let unresolvedDip = 0;
  for (const c of dipCombos) {
    const key = c.diplome_type + '|' + c.formation.trim().toLowerCase();
    let id = c.id_dip;
    if (!id) {
      id = dipByName.get(c.nom_dip);
      if (!id) { unresolvedDip++; continue; }
    }
    comboMap.set(key, id);
  }
  console.log('Combos diplômes non résolus (à ignorer):', unresolvedDip);

  // Autonomous institutes have universites_id = null; école name after fixes
  const AUTONOMOUS_NAMES = new Set([
    'Ecole Nationale des Postes et Télécommunications',
    'Institut National de la Jeunesse et des Sports',
    "Institut Sous-regional des Statistiques et d'Economie Appliquée",
  ]);

  const seenPairs = new Set(); // dedupe (ecole_f_id|diplom_id)
  const toCreate = [];
  let unresolvedEcole = 0;
  let unresolvedDipEntry = 0;
  let duplicatePair = 0;

  for (const e of raw) {
    const schoolFixed = NAME_FIXES[e.school] || e.school;
    let univKey;
    if (AUTONOMOUS_NAMES.has(schoolFixed)) {
      univKey = 'null';
    } else {
      const univId = PARENT_TO_UNIV_ID[e.parent];
      if (univId === undefined) { unresolvedEcole++; continue; }
      univKey = univId;
    }
    const ecoleMap = ecoleByUniv.get(univKey);
    const ecoleId = ecoleMap ? ecoleMap.get(normalize(schoolFixed)) : undefined;
    if (!ecoleId) { unresolvedEcole++; continue; }

    const comboKey = e.diplome + '|' + e.formation.trim().toLowerCase();
    const diplomId = comboMap.get(comboKey);
    if (!diplomId) { unresolvedDipEntry++; continue; }

    const pairKey = ecoleId + '|' + diplomId;
    if (seenPairs.has(pairKey)) { duplicatePair++; continue; }
    seenPairs.add(pairKey);

    toCreate.push({
      nom_f: capitalize(e.formation).slice(0, 100),
      duree_f: DUREE_MAP[e.diplome] || null,
      ecole_f_id: ecoleId,
      diplom_id: diplomId,
    });
  }

  console.log('Écoles non résolues:', unresolvedEcole);
  console.log('Diplômes non résolus:', unresolvedDipEntry);
  console.log('Paires (école, diplôme) dupliquées ignorées:', duplicatePair);
  console.log('Formations à créer:', toCreate.length);

  // Anti-duplicate check against existing formations
  const [existingPairs] = await conn.query('SELECT ecole_f_id, diplom_id FROM formations');
  const existingSet = new Set(existingPairs.map(p => p.ecole_f_id + '|' + p.diplom_id));
  const finalToCreate = toCreate.filter(t => !existingSet.has(t.ecole_f_id + '|' + t.diplom_id));
  console.log('Déjà existantes en base (ignorées):', toCreate.length - finalToCreate.length);
  console.log('TOTAL FINAL à insérer:', finalToCreate.length);

  fs.writeFileSync(OUT, JSON.stringify(finalToCreate, null, 2), 'utf8');
  console.log('\nFichier écrit:', OUT);

  await conn.end();
})().catch(e => { console.error('Erreur:', e.message); process.exit(1); });
