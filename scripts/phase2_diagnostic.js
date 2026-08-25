require('dotenv').config({ path: 'D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\.env', quiet: true });
const fs = require('fs');
const mysql = require('mysql2/promise');
const cfg = require('D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\config\\db.config.js');

const FINAL = 'D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\scripts\\phase2_diplomes_final.json';

function stripAccents(s) { return s.normalize('NFD').replace(/[̀-ͯ]/g, ''); }
function normalize(s) {
  let n = stripAccents(s.toLowerCase());
  n = n.replace(/[’'`]/g, "'");
  n = n.replace(/[^a-z0-9' ]+/g, ' ');
  return n.replace(/\s+/g, ' ').trim();
}
const TYPE_PREFIXES = [
  'bts', 'licence pro', 'licence professionnelle', 'licence', 'hnd', 'hpd', 'atd',
  'dsep', 'master pro', 'master professionnel', 'master', 'bachelor', 'doctorat',
  "diplome d'ingenieur de travaux", "diplome d'ingenieur", 'dut', 'capacite en droit', 'mba'
].sort((a, b) => b.length - a.length);
function stripTypePrefix(n) {
  for (const p of TYPE_PREFIXES) {
    if (n.startsWith(p + ' ')) return n.slice(p.length).trim();
    if (n === p) return '';
  }
  return n;
}
function wordSet(s) { return new Set(s.split(' ').filter(w => w.length > 0)); }
function jaccard(a, b) {
  if (a.size === 0 && b.size === 0) return 1;
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
}

(async () => {
  const combos = JSON.parse(fs.readFileSync(FINAL, 'utf8'));
  const newCombos = combos.filter(c => c.match_type === 'new');
  console.log('Combos marqués "new":', newCombos.length);

  const conn = await mysql.createConnection({
    host: cfg.host, user: cfg.user, password: cfg.password, database: cfg.database, port: cfg.port,
    charset: 'utf8mb4'
  });
  const [allDip] = await conn.query('SELECT id_dip, nom_dip, categorie_id FROM diplomes');
  await conn.end();

  const allNorm = allDip.map(d => {
    const normFull = normalize(d.nom_dip);
    const spec = stripTypePrefix(normFull);
    return { id_dip: d.id_dip, nom_dip: d.nom_dip, categorie_id: d.categorie_id, spec, specWords: wordSet(spec) };
  });

  // For each "new" combo, find best match ACROSS ALL categories (ignore categorie_id restriction)
  let crossCatHighMatches = 0;
  const crossCatList = [];
  let trulyNew = 0;

  for (const c of newCombos) {
    const normFormation = normalize(c.formation);
    const formationWords = wordSet(normFormation);
    const scored = allNorm
      .map(d => ({ ...d, score: jaccard(formationWords, d.specWords) }))
      .filter(d => d.score >= 0.5)
      .sort((a, b) => b.score - a.score);
    if (scored.length > 0) {
      crossCatHighMatches++;
      crossCatList.push({ combo: c, best: scored[0], allTop: scored.slice(0, 3) });
    } else {
      trulyNew++;
    }
  }

  console.log('Parmi les "new", trouvés avec un match >=0.5 TOUTES catégories confondues:', crossCatHighMatches);
  console.log('Vraiment nouveaux (aucun match >=0.5 toutes catégories):', trulyNew);

  const trulyNewList = newCombos.filter(c => {
    const normFormation = normalize(c.formation);
    const formationWords = wordSet(normFormation);
    const hasMatch = allNorm.some(d => jaccard(formationWords, d.specWords) >= 0.5);
    return !hasMatch;
  }).sort((a, b) => b.count - a.count);
  let outTxt = '';
  for (const c of trulyNewList) outTxt += `${c.count} | ${c.nom_dip} | cat=${c.categorie_id} | niveau=${c.niveau}\n`;
  fs.writeFileSync('D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\scripts\\phase2_truly_new_247.txt', outTxt, 'utf8');
  console.log('Liste des 247 écrite dans phase2_truly_new_247.txt');

  console.log('\n=== Détail des correspondances cross-catégorie trouvées ===');
  for (const item of crossCatList) {
    const sameCat = item.best.categorie_id === item.combo.categorie_id;
    console.log(`\n[${sameCat ? 'MEME CAT' : 'CAT DIFFERENTE cat_attendue=' + item.combo.categorie_id + ' cat_trouvee=' + item.best.categorie_id}] "${item.combo.nom_dip}" (occ=${item.combo.count})`);
    for (const t of item.allTop) {
      console.log(`   score=${t.score.toFixed(2)} id_dip=${t.id_dip} cat=${t.categorie_id}: "${t.nom_dip}"`);
    }
  }
})().catch(err => { console.error('Erreur:', err.message); process.exit(1); });
