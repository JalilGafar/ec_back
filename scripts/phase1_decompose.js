const fs = require('fs');

const SRC = 'C:\\Users\\MS GROUP\\Downloads\\dataset_cheerio-scraper_clean.json';
const OUT_KEPT = 'D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\scripts\\phase1_kept.json';
const OUT_REJECTED = 'D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\scripts\\phase1_rejected_public.json';

const EXCLUDE_PATTERNS = [
  'Faculté',
  'Ecole Nationale',
  'École Nationale',
  'Université de Yaoundé',
  'Université de Dschang',
  'Université de Douala',
  'Université de Buea',
  'Université de Ngaoundéré',
  'Université de Maroua',
  'Université de Bamenda',
  'Université de Bertoua',
  'Université d\'Ebolowa',
  'Université de Garoua',
  'Institut National de la Jeunesse et des Sports',
  'Institut Sous-regional des Statistiques'
];

const raw = JSON.parse(fs.readFileSync(SRC, 'utf8'));
console.log('Entrées avant décomposition:', raw.length);

// Phase 1: decompose combined diplomes
const decomposed = [];
for (const entry of raw) {
  const diplomes = entry.diplome.split(' - ').map(d => d.trim()).filter(Boolean);
  for (const dip of diplomes) {
    decomposed.push({
      formation: entry.formation,
      diplome: dip,
      ville: entry.ville,
      etablissement: entry.etablissement,
      courseId: entry.courseId,
      sourceUrl: entry.sourceUrl
    });
  }
}
console.log('Entrées après décomposition:', decomposed.length);

// Filter out public institutions
const kept = [];
const rejected = [];
for (const e of decomposed) {
  const isPublic = EXCLUDE_PATTERNS.some(p => e.etablissement.includes(p));
  if (isPublic) rejected.push(e);
  else kept.push(e);
}

console.log('Entrées filtrées (publiques):', rejected.length);
console.log('Entrées retenues (IPES privés):', kept.length);

// Unique diploma types
const diplomeCounts = {};
for (const e of kept) {
  diplomeCounts[e.diplome] = (diplomeCounts[e.diplome] || 0) + 1;
}
const sortedDiplomes = Object.entries(diplomeCounts).sort((a, b) => b[1] - a[1]);

console.log('\n=== Types de diplômes uniques (IPES privés) ===');
for (const [d, c] of sortedDiplomes) {
  console.log(`${c.toString().padStart(5)}  ${d}`);
}
console.log('\nNombre de types de diplômes uniques:', sortedDiplomes.length);

// Unique establishments retained
const etabSet = new Set(kept.map(e => e.etablissement));
console.log('\nNombre d\'établissements uniques (IPES privés):', etabSet.size);

fs.writeFileSync(OUT_KEPT, JSON.stringify(kept, null, 2), 'utf8');
fs.writeFileSync(OUT_REJECTED, JSON.stringify(rejected, null, 2), 'utf8');
console.log('\nFichiers écrits:');
console.log(' -', OUT_KEPT);
console.log(' -', OUT_REJECTED);
