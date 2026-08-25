const fs = require('fs');

const IN = 'D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\scripts\\phase1_rejected_public.json';
const OUT = 'D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\scripts\\phase1_public_parsed.json';

const data = JSON.parse(fs.readFileSync(IN, 'utf8'));
console.log('Entrées publiques totales:', data.length);

const noMatch = [];
const parsed = [];

for (const e of data) {
  // Pattern: "<école/faculté> - Université de X" (last " - " separates school from university)
  const idx = e.etablissement.lastIndexOf(' - ');
  if (idx === -1) {
    noMatch.push(e);
    continue;
  }
  const school = e.etablissement.slice(0, idx).trim();
  const university = e.etablissement.slice(idx + 3).trim();
  parsed.push({ ...e, school, university });
}

console.log('Entrées parsées avec succès (école - université):', parsed.length);
console.log('Entrées sans séparateur " - " (établissement seul ?):', noMatch.length);

const uniqUniversities = new Set(parsed.map(p => p.university));
console.log('\nUniversités uniques référencées (' + uniqUniversities.size + ') :');
[...uniqUniversities].sort().forEach(u => console.log(' -', u));

const uniqSchools = new Map(); // school -> university
for (const p of parsed) {
  if (!uniqSchools.has(p.school)) uniqSchools.set(p.school, p.university);
}
console.log('\nÉcoles/facultés uniques:', uniqSchools.size);

console.log('\n=== Établissements SANS séparateur (' + noMatch.length + ') ===');
const noMatchEtabs = new Set(noMatch.map(e => e.etablissement));
[...noMatchEtabs].forEach(e => console.log(' -', e));

fs.writeFileSync(OUT, JSON.stringify(parsed, null, 2), 'utf8');
fs.writeFileSync('D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\scripts\\phase1_public_nomatch.json', JSON.stringify(noMatch, null, 2), 'utf8');
console.log('\nFichiers écrits.');
