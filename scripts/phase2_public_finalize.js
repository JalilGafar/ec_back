const fs = require('fs');

const IN = 'D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\scripts\\phase2_public_diplomes_resolved.json';
const OUT_FINAL = 'D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\scripts\\phase2_public_diplomes_final.json';
const OUT_SQL = 'D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\scripts\\phase2_public_insert_diplomes.sql';

// Manually validated match: same diploma, singular/plural wording difference
const MATCH_BY_TARGET_ID = {
  'BTS|comptabilité et gestion des entreprises': 31,
};

const combos = JSON.parse(fs.readFileSync(IN, 'utf8'));

let appliedManual = 0;
let defaultedNew = 0;
for (const c of combos) {
  if (c.match_type === 'ambiguous') {
    const key = c.diplome_type + '|' + c.formation.trim().toLowerCase();
    if (MATCH_BY_TARGET_ID[key]) {
      c.id_dip = MATCH_BY_TARGET_ID[key];
      c.match_type = 'manual match';
      appliedManual++;
    } else {
      c.match_type = 'new (default from ambiguous)';
      defaultedNew++;
    }
  }
}

console.log('Cas ambigus rattachés manuellement:', appliedManual);
console.log('Cas ambigus défaultés en "nouveau":', defaultedNew);

const toCreate = combos.filter(c => c.match_type === 'new' || c.match_type === 'new (default from ambiguous)');
console.log('Total diplômes à créer:', toCreate.length);

fs.writeFileSync(OUT_FINAL, JSON.stringify(combos, null, 2), 'utf8');

function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

const lines = [];
lines.push('-- Phase 2 (public/private-university batch) — nouveaux diplômes');
lines.push('-- Généré automatiquement, NON EXÉCUTÉ — à valider avant tout INSERT');
lines.push('SET NAMES utf8mb4;');
lines.push('');

for (let i = 0; i < toCreate.length; i += 50) {
  const batch = toCreate.slice(i, i + 50);
  lines.push('START TRANSACTION;');
  lines.push('INSERT IGNORE INTO diplomes (nom_dip, categorie_id, niveau) VALUES');
  const rows = batch.map(c => `  ('${esc(c.nom_dip)}', ${c.categorie_id}, '${esc(c.niveau)}')`);
  lines.push(rows.join(',\n') + ';');
  lines.push('COMMIT;');
  lines.push('');
}

fs.writeFileSync(OUT_SQL, lines.join('\n'), 'utf8');
console.log('Fichiers écrits:');
console.log(' -', OUT_FINAL);
console.log(' -', OUT_SQL);
