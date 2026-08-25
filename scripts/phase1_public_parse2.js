const fs = require('fs');

const IN = 'D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\scripts\\phase1_rejected_public.json';
const OUT = 'D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\scripts\\phase1_public_parsed2.json';

const data = JSON.parse(fs.readFileSync(IN, 'utf8'));

// Known public university names (exact, as found in DB)
const PUBLIC_UNIVS = [
  'Université de Bamenda', 'Université de Buea', 'Université de Douala',
  'Université de Dschang', 'Université de Maroua', 'Université de Ngaoundéré',
  'Université de Yaoundé 1', 'Université de Yaoundé 2',
  'Université de Bertoua', "Université d'Ebolowa", 'Université de Garoua'
];

function parseEtab(etab) {
  // Try " - " (spaced dash) first: school - parentInstitution
  const idxSpaced = etab.lastIndexOf(' - ');
  if (idxSpaced !== -1) {
    return { school: etab.slice(0, idxSpaced).trim(), parent: etab.slice(idxSpaced + 3).trim(), sep: 'spaced' };
  }
  // Try unspaced dash "-" near a known university-prefix institution name (private univ name)-Faculté...
  const idxDash = etab.indexOf('-');
  if (idxDash !== -1) {
    return { school: etab.slice(idxDash + 1).trim(), parent: etab.slice(0, idxDash).trim(), sep: 'unspaced' };
  }
  return { school: etab, parent: null, sep: 'none' };
}

const parsed = data.map(e => ({ ...e, ...parseEtab(e.etablissement) }));

const parentGroups = new Map(); // parent name -> { count, isPublic, schools:Set }
for (const p of parsed) {
  const key = p.parent || '(AUCUN - établissement seul)';
  if (!parentGroups.has(key)) {
    parentGroups.set(key, { count: 0, schools: new Set(), isPublic: PUBLIC_UNIVS.includes(key) });
  }
  const g = parentGroups.get(key);
  g.count++;
  g.schools.add(p.school);
}

const sorted = [...parentGroups.entries()].sort((a, b) => b[1].count - a[1].count);

console.log('=== Institutions parentes uniques (' + sorted.length + ') ===\n');
for (const [name, g] of sorted) {
  console.log(`${g.isPublic ? '[PUBLIQUE CONFIRMÉE]' : '[À CLASSIFIER]'} "${name}" — ${g.count} entrées, ${g.schools.size} écoles/facultés distinctes`);
}

fs.writeFileSync(OUT, JSON.stringify(parsed, null, 2), 'utf8');
console.log('\nFichier écrit:', OUT);
