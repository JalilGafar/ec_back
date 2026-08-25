const fs = require('fs');

const IN = 'D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\scripts\\phase2_diplomes_resolved.json';
const OUT_FINAL = 'D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\scripts\\phase2_diplomes_final.json';
const OUT_SQL = 'D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\scripts\\phase2_insert_diplomes.sql';

// Manual MATCH decisions: key = "type|formation(lower)" -> id_dip to use
const MANUAL_MATCHES = {
  "BTS|comptabilité et gestion des entreprises": 31,
  "BTS|secrétariat et bureautique": null, // resolved by name below
  "NIVEAU BTS Higher National Diploma|administration et service public": null,
  "LICENCE PROFESSIONNELLE|logistique et transports": null,
  "NIVEAU LICENCE BACHELOR|banque et finance": null,
  "BTS|gestion et maîtrise de l'eau": null,
  "LICENCE PROFESSIONNELLE|génie civil - bâtiments": null,
  "LICENCE PROFESSIONNELLE|automatique et informatique industrielle": null,
  "BTS|photographie et audio-visuel": null,
  "DIPLÔME SUPÉRIEUR D'ÉTUDES PROFESSIONNELLES DSEP|électrique et télécommunications": null,
  "BTS|industrie de l'habillement": null,
  "LICENCE PROFESSIONNELLE|marketing opérationnel": null
};

// Match by target nom_dip text (more reliable than guessing id) -> resolved against candidates list per combo
const MATCH_BY_TARGET_NAME = {
  "BTS|comptabilité et gestion des entreprises": "BTS  Comptabilité et gestion d’entreprise",
  "BTS|secrétariat et bureautique": "BTS  Secrétariat bureautique",
  "NIVEAU BTS Higher National Diploma|administration et service public": "HND Public Service And Administration",
  "LICENCE PROFESSIONNELLE|logistique et transports": "Licence Pro: Gestion Logistique et Transport",
  "NIVEAU LICENCE BACHELOR|banque et finance": "Bachelor Banque - Finance - Assurance",
  "BTS|gestion et maîtrise de l'eau": "BTS Gestion de l'Eau",
  "LICENCE PROFESSIONNELLE|génie civil - bâtiments": "Licence Pro Génie Civil",
  "LICENCE PROFESSIONNELLE|automatique et informatique industrielle": "Licence Pro Informatique Industrielle et Automatisme",
  "BTS|photographie et audio-visuel": "BTS Photographie et Audiovisuel",
  "DIPLÔME SUPÉRIEUR D'ÉTUDES PROFESSIONNELLES DSEP|électrique et télécommunications": "DSEP Génie Electrique et Télécommunication",
  "BTS|industrie de l'habillement": "BTS Industrie du textile et de l'habillement",
  "LICENCE PROFESSIONNELLE|marketing opérationnel": "Licence Pro Marketing Manager Opérationnel"
};

const combos = JSON.parse(fs.readFileSync(IN, 'utf8'));

let exact = 0, autoMatch = 0, manualMatch = 0, toCreate = 0;
const newDiplomes = [];

for (const c of combos) {
  if (c.match_type === 'exact' || (c.match_type && c.match_type.startsWith('auto'))) {
    if (c.match_type === 'exact') exact++; else autoMatch++;
    continue; // already has id_dip
  }
  if (c.match_type === 'ambiguous') {
    const key = c.diplome_type + '|' + c.formation.toLowerCase();
    const targetName = MATCH_BY_TARGET_NAME[key];
    if (targetName) {
      const found = c.candidates.find(cand => cand.nom_dip === targetName);
      if (found) {
        c.id_dip = found.id_dip;
        c.match_type = 'manual-match';
        c.matched_nom_dip = found.nom_dip;
        manualMatch++;
        continue;
      }
    }
    // default: create new
    c.match_type = 'new';
  }
  if (c.match_type === 'new') {
    toCreate++;
    newDiplomes.push(c);
  }
}

console.log('Exact:', exact);
console.log('Auto (similarité forte):', autoMatch);
console.log('Manuel (validé):', manualMatch);
console.log('Nouveaux à créer:', toCreate);
console.log('Total:', exact + autoMatch + manualMatch + toCreate, '/', combos.length);

fs.writeFileSync(OUT_FINAL, JSON.stringify(combos, null, 2), 'utf8');

// Generate SQL INSERT IGNORE statements for new diplomes, batched by 50
function escSql(s) {
  if (s === null || s === undefined) return 'NULL';
  return "'" + String(s).replace(/\\/g, '\\\\').replace(/'/g, "''") + "'";
}

let sql = `-- Phase 2b : INSERT des nouveaux diplômes (générés automatiquement)\n`;
sql += `-- Total: ${newDiplomes.length} diplômes\n\n`;

const BATCH = 50;
for (let i = 0; i < newDiplomes.length; i += BATCH) {
  const batch = newDiplomes.slice(i, i + BATCH);
  sql += `START TRANSACTION;\n`;
  sql += `INSERT IGNORE INTO ecolecamerdb.diplomes (nom_dip, categorie_id, niveau) VALUES\n`;
  sql += batch.map(d => `  (${escSql(d.nom_dip)}, ${d.categorie_id}, ${escSql(d.niveau)})`).join(',\n');
  sql += `;\nCOMMIT;\n\n`;
}

fs.writeFileSync(OUT_SQL, sql, 'utf8');
console.log('\nFichiers écrits:');
console.log(' -', OUT_FINAL);
console.log(' -', OUT_SQL);
