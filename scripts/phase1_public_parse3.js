const fs = require('fs');

const IN = 'D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\scripts\\phase1_rejected_public.json';
const OUT = 'D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\scripts\\phase1_public_parsed3.json';

const data = JSON.parse(fs.readFileSync(IN, 'utf8'));

// Known public university names (confirmed existing in DB + the 3 missing to create)
const PUBLIC_UNIVS = [
  'Université de Bamenda', 'Université de Buea', 'Université de Douala',
  'Université de Dschang', 'Université de Maroua', 'Université de Ngaoundéré',
  'Université de Yaoundé 1', 'Université de Yaoundé 2',
  'Université de Bertoua', "Université d'Ebolowa", 'Université de Garoua',
];

// Segments matching these prefixes/patterns are themselves "university-like" institutions
// (used to detect the reversed private-university convention)
const UNIV_HEAD_PATTERNS = [
  /^Institut Universitaire/i,
  /^Universit[eé]/i,
  /^Centre International des [ÉE]tudes/i,
  /^Institut Sup[ée]rieur/i,
];

// Fix known typos/spacing inconsistencies in source data so identical institutions
// don't get split into separate groups
function normalizeParentName(name) {
  return name
    .replace(/Polytechniquesd'Obala/i, "Polytechniques d'Obala")
    .replace(/\s+/g, ' ')
    .trim();
}

// Establishments that are standalone public institutes with NO parent university
// (internal hyphen in the name breaks naive splitting; must be special-cased)
const AUTONOMOUS_NAMES = [
  'Institut National de la Jeunesse et des Sports',
  "Institut Sous-regional des Statistiques et d'Economie Appliquée",
  "Institut Sous-régional des Statistiques et d'Économie Appliquée",
];

function isAutonomous(etab) {
  return AUTONOMOUS_NAMES.some(n => etab.trim().toLowerCase().startsWith(n.toLowerCase().slice(0, 20)));
}

function isUnivHead(segment) {
  return UNIV_HEAD_PATTERNS.some(re => re.test(segment.trim()));
}

function parseEtab(etab) {
  const trimmed = etab.trim();

  if (isAutonomous(trimmed)) {
    return { school: trimmed, parent: null, convention: 'autonomous' };
  }

  const idx = trimmed.lastIndexOf(' - ');
  if (idx !== -1) {
    const seg1 = trimmed.slice(0, idx).trim();
    const seg2 = trimmed.slice(idx + 3).trim();

    // Convention A (public): seg1 = school, seg2 = university
    if (PUBLIC_UNIVS.includes(seg2) || /^Universit[eé] /i.test(seg2)) {
      return { school: seg1, parent: seg2, convention: 'school-university' };
    }
    // Convention B (private w/ internal faculties, reversed): seg1 = university, seg2 = school
    if (isUnivHead(seg1)) {
      return { school: seg2, parent: seg1, convention: 'university-school' };
    }
    // Fallback: assume convention A but flag as unresolved
    return { school: seg1, parent: seg2, convention: 'ambiguous' };
  }

  // No spaced " - " separator: check for an unspaced dash right before a school-type
  // keyword (Faculté/Institut/Ecole/Centre), e.g. "Institut Universitaire X-Faculté Y"
  const noSpaceMatch = trimmed.match(/-(?=(Facult[ée]|Institut|[EÉ]cole))/i);
  if (noSpaceMatch) {
    const cutIdx = noSpaceMatch.index;
    const seg1 = trimmed.slice(0, cutIdx).trim();
    const seg2 = trimmed.slice(cutIdx + 1).trim();
    if (isUnivHead(seg1)) {
      return { school: seg2, parent: seg1, convention: 'university-school-nospace' };
    }
  }

  return { school: trimmed, parent: null, convention: 'none' };
}

const parsed = data.map(e => {
  const r = parseEtab(e.etablissement);
  if (r.parent) r.parent = normalizeParentName(r.parent);
  return { ...e, ...r };
});

const parentGroups = new Map();
for (const p of parsed) {
  const key = p.parent || `(AUTONOME) ${p.school}`;
  if (!parentGroups.has(key)) {
    parentGroups.set(key, { count: 0, schools: new Set(), conventions: new Set(), isPublic: PUBLIC_UNIVS.includes(key) });
  }
  const g = parentGroups.get(key);
  g.count++;
  g.schools.add(p.school);
  g.conventions.add(p.conventions ? '' : '');
}

// Recompute convention set per group properly
const parentConv = new Map();
for (const p of parsed) {
  const key = p.parent || `(AUTONOME) ${p.school}`;
  if (!parentConv.has(key)) parentConv.set(key, new Set());
  parentConv.get(key).add(p.convention);
}

const sorted = [...parentGroups.entries()].sort((a, b) => b[1].count - a[1].count);

console.log('=== Institutions parentes uniques (' + sorted.length + ') ===\n');
for (const [name, g] of sorted) {
  const convs = [...parentConv.get(name)].join(',');
  const tag = g.isPublic ? '[PUBLIQUE CONFIRMÉE]' : (convs.includes('ambiguous') ? '[⚠ AMBIGU]' : '[À CLASSIFIER]');
  console.log(`${tag} "${name}" — ${g.count} entrées, ${g.schools.size} écoles/facultés distinctes — convention(s): ${convs}`);
}

fs.writeFileSync(OUT, JSON.stringify(parsed, null, 2), 'utf8');
console.log('\nFichier écrit:', OUT);
