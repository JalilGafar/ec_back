require('dotenv').config({ path: 'D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\.env', quiet: true });
const fs = require('fs');
const mysql = require('mysql2/promise');
const cfg = require('D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\config\\db.config.js');

const KEPT = 'D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\scripts\\phase1_public_parsed3.json';
const OUT = 'D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\scripts\\phase2_public_diplomes_resolved.json';

const TYPE_MAP = {
  // Reused from the private-IPES batch
  'BTS': { prefix: 'BTS', categorie_id: 5, niveau: 'Bac' },
  'LICENCE PROFESSIONNELLE': { prefix: 'Licence Pro', categorie_id: 18, niveau: 'Bacc' },
  "DIPLÔME SUPÉRIEUR D'ÉTUDES PROFESSIONNELLES DSEP": { prefix: 'DSEP', categorie_id: 25, niveau: 'Bac' },
  'MASTER': { prefix: 'Master', categorie_id: 20, niveau: 'Licence' },
  'NIVEAU LICENCE BACHELOR': { prefix: 'Bachelor', categorie_id: 14, niveau: 'Bacc' },
  'MASTER PROFESSIONNEL': { prefix: 'Master Pro', categorie_id: 22, niveau: 'Licence' },
  'DOCTORAT PhD': { prefix: 'Doctorat', categorie_id: 3, niveau: 'Master' },
  'LICENCE': { prefix: 'Licence', categorie_id: 17, niveau: 'Bacc' },
  "DIPLÔME D'INGÉNIEUR": { prefix: "Diplôme d'Ingénieur", categorie_id: 19, niveau: 'Bac' },
  'DUT': { prefix: 'DUT', categorie_id: 12, niveau: 'Bacc' },
  "DIPLÔME D'INGÉNIEUR DE TRAVAUX": { prefix: "Diplôme d'Ingénieur de Travaux", categorie_id: 32, niveau: 'Bac' },
  'CAPACITE EN DROIT': { prefix: 'Capacité en Droit', categorie_id: 28, niveau: 'Bac' },
  'Master en Administration des Affaires MBA': { prefix: 'MBA', categorie_id: 8, niveau: 'Licence' },

  // New types specific to the public-universities batch — mapping validated by user
  'DIPES I': { prefix: 'DIPES I', categorie_id: 16, niveau: 'Licence' },
  'DIPES II': { prefix: 'DIPES II', categorie_id: 16, niveau: 'Master' },
  'DIPET I': { prefix: 'DIPET I', categorie_id: 16, niveau: 'Licence' },
  'DIPET II': { prefix: 'DIPET II', categorie_id: 16, niveau: 'Master' },
  'DIPLÔME DE SPECIALISATION EN MEDECINE/PHARMACIE': { prefix: 'Diplôme de Spécialisation en Médecine/Pharmacie', categorie_id: 3, niveau: 'Doctorat' },
  "DIPLÔME D'ÉTUDES SUPÉRIEURES SPÉCIALISES D.E.S.S": { prefix: 'DESS', categorie_id: 22, niveau: 'Master' },
  'Doctorat en Médecine, en pharmacie ou en buccodentaire': { prefix: 'Doctorat en Médecine/Pharmacie/Buccodentaire', categorie_id: 3, niveau: 'Bac' },
  "DIPLÔME D'ETUDES SUPERIEURES": { prefix: "Diplôme d'Etudes Supérieures", categorie_id: 20, niveau: 'Licence' },
  "DIPLÔME D'ETUDES PROFESSIONNELLES": { prefix: "Diplôme d'Etudes Professionnelles", categorie_id: 25, niveau: 'Bac' },
  'DIPCO': { prefix: 'DIPCO', categorie_id: 32, niveau: 'Bac' },
  'DEUG': { prefix: 'DEUG', categorie_id: 12, niveau: 'Bac' },
  'DEUP': { prefix: 'DEUP', categorie_id: 25, niveau: 'Bac' },
  "Diplôme de Conseiller de Jeunesse et d'Animation CJA": { prefix: 'CJA', categorie_id: 16, niveau: 'Bac' },
  "Certificat d'Aptitude au Professorat d'Education Physique et Sportive I CAPEPS I": { prefix: 'CAPEPS I', categorie_id: 16, niveau: 'Licence' },
  "Certificat d'Aptitude au Professorat d'Education Physique et Sportive II CAPEPS II": { prefix: 'CAPEPS II', categorie_id: 16, niveau: 'Licence' },
  'Diplôme d´Ingénieur Statisticien Economiste ISE': { prefix: 'ISE', categorie_id: 19, niveau: 'Licence' },
  "Diplôme de Conseiller Principal de Jeunesse et d'Animation CPJA": { prefix: 'CPJA', categorie_id: 16, niveau: 'Licence' },
  'Diplôme d´Ingénieur des Travaux Statistiques': { prefix: "Diplôme d'Ingénieur des Travaux Statistiques", categorie_id: 32, niveau: 'Bac' },
};

const TYPE_PREFIXES = [
  'bts', 'licence pro', 'licence professionnelle', 'licence', 'hnd', 'hpd', 'atd',
  'dsep', 'master pro', 'master professionnel', 'master', 'bachelor', 'doctorat',
  "diplome d'ingenieur de travaux", "diplome d'ingenieur", 'dut', 'capacite en droit', 'mba',
  'dipes i', 'dipes ii', 'dipet i', 'dipet ii', 'dipco', 'deug', 'deup', 'dess',
  'cja', 'cpjca', 'cpja', 'capeps i', 'capeps ii', 'ise',
  "diplome d'etudes superieures", "diplome d'etudes professionnelles",
  'diplome de specialisation en medecine/pharmacie',
].sort((a, b) => b.length - a.length);

function stripAccents(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function normalize(s) {
  let n = stripAccents(s.toLowerCase());
  n = n.replace(/[’'`´]/g, "'");
  n = n.replace(/[^a-z0-9' ]+/g, ' ');
  n = n.replace(/\s+/g, ' ').trim();
  return n;
}

function stripTypePrefix(normName) {
  for (const p of TYPE_PREFIXES) {
    if (normName.startsWith(p + ' ')) {
      return normName.slice(p.length).trim();
    }
    if (normName === p) return '';
  }
  return normName;
}

function wordSet(s) {
  return new Set(s.split(' ').filter(w => w.length > 0));
}

function jaccard(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 1;
  let inter = 0;
  for (const w of setA) if (setB.has(w)) inter++;
  const union = setA.size + setB.size - inter;
  return union === 0 ? 0 : inter / union;
}

function capitalize(s) {
  s = s.trim();
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function canonicalName(prefix, formation) {
  const name = `${prefix} ${capitalize(formation)}`;
  return name.length > 200 ? name.slice(0, 200) : name;
}

(async () => {
  const kept = JSON.parse(fs.readFileSync(KEPT, 'utf8'));

  const comboMap = new Map();
  const unmapped = new Set();
  for (const e of kept) {
    const typeInfo = TYPE_MAP[e.diplome];
    if (!typeInfo) { unmapped.add(e.diplome); continue; }
    const formationKey = e.formation.trim().toLowerCase();
    const key = e.diplome + '|' + formationKey;
    if (!comboMap.has(key)) {
      comboMap.set(key, {
        diplome_type: e.diplome,
        formation: e.formation.trim(),
        nom_dip: canonicalName(typeInfo.prefix, e.formation),
        categorie_id: typeInfo.categorie_id,
        niveau: typeInfo.niveau,
        count: 0
      });
    }
    comboMap.get(key).count++;
  }
  if (unmapped.size) {
    console.log('TYPES NON MAPPÉS:', [...unmapped]);
  }
  const combos = Array.from(comboMap.values());
  console.log('Combinaisons uniques (formation, type_diplome):', combos.length);

  const conn = await mysql.createConnection({
    host: cfg.host, user: cfg.user, password: cfg.password, database: cfg.database, port: cfg.port,
    charset: 'utf8mb4'
  });

  const [allDip] = await conn.query('SELECT id_dip, nom_dip, categorie_id FROM diplomes');
  const byCat = new Map();
  for (const d of allDip) {
    const normFull = normalize(d.nom_dip);
    const spec = stripTypePrefix(normFull);
    const entry = { id_dip: d.id_dip, nom_dip: d.nom_dip, normFull, spec, specWords: wordSet(spec) };
    if (!byCat.has(d.categorie_id)) byCat.set(d.categorie_id, []);
    byCat.get(d.categorie_id).push(entry);
  }
  await conn.end();

  let exactCount = 0;
  let autoMatchCount = 0;
  let ambiguousCount = 0;
  let newCount = 0;
  const ambiguous = [];

  for (const c of combos) {
    const candList = byCat.get(c.categorie_id) || [];
    const normFormation = normalize(c.formation);
    const formationWords = wordSet(normFormation);

    const normCanonical = normalize(c.nom_dip);
    let exact = candList.find(d => d.normFull === normCanonical);
    if (exact) {
      c.id_dip = exact.id_dip;
      c.match_type = 'exact';
      c.matched_nom_dip = exact.nom_dip;
      exactCount++;
      continue;
    }

    let specExact = candList.find(d => d.spec === normFormation);
    if (specExact) {
      c.id_dip = specExact.id_dip;
      c.match_type = 'auto (spec identique)';
      c.matched_nom_dip = specExact.nom_dip;
      autoMatchCount++;
      continue;
    }

    // DB convention often prefixes the specialization with "en " (e.g. "Licence en Journalisme"
    // vs formation "Journalisme") — strip it before comparing so these aren't scored as merely similar
    let specExactNoEn = candList.find(d => d.spec.replace(/^en /, '') === normFormation);
    if (specExactNoEn) {
      c.id_dip = specExactNoEn.id_dip;
      c.match_type = "auto (spec identique, préfixe 'en' ignoré)";
      c.matched_nom_dip = specExactNoEn.nom_dip;
      autoMatchCount++;
      continue;
    }

    const scored = candList
      .map(d => ({ ...d, score: jaccard(formationWords, d.specWords) }))
      .filter(d => d.score > 0)
      .sort((a, b) => b.score - a.score);

    if (scored.length > 0 && scored[0].score >= 0.7) {
      c.id_dip = scored[0].id_dip;
      c.match_type = 'auto (similarité forte ' + scored[0].score.toFixed(2) + ')';
      c.matched_nom_dip = scored[0].nom_dip;
      autoMatchCount++;
    } else if (scored.length > 0 && scored[0].score >= 0.35) {
      c.match_type = 'ambiguous';
      c.candidates = scored.slice(0, 5).map(s => ({ id_dip: s.id_dip, nom_dip: s.nom_dip, score: Number(s.score.toFixed(2)) }));
      ambiguousCount++;
      ambiguous.push(c);
    } else {
      c.match_type = 'new';
      newCount++;
    }
  }

  console.log('Diplômes déjà en base (exact):', exactCount);
  console.log('Diplômes déjà en base (auto-matché par similarité forte):', autoMatchCount);
  console.log('Diplômes ambigus (à valider manuellement):', ambiguousCount);
  console.log('Nouveaux diplômes à créer:', newCount);
  console.log('TOTAL:', exactCount + autoMatchCount + ambiguousCount + newCount, '/', combos.length);

  fs.writeFileSync(OUT, JSON.stringify(combos, null, 2), 'utf8');
  console.log('\nFichier écrit:', OUT);

  console.log('\n=== TOUS les cas ambigus (' + ambiguous.length + ') ===');
  for (const a of ambiguous) {
    console.log(`\n"${a.nom_dip}" (formation="${a.formation}", type="${a.diplome_type}", occurrences=${a.count})`);
    for (const cand of a.candidates) {
      console.log(`   score=${cand.score}  id_dip=${cand.id_dip}: "${cand.nom_dip}"`);
    }
  }
})().catch(err => { console.error('Erreur:', err.message); process.exit(1); });
