const fs = require('fs');

const OUT_SQL = 'D:\\AppsAngular\\CamerDiplome\\Plateforme\\ec_back\\scripts\\phase3_insert_universites.sql';

const NEW_UNIVS = [
  { nom_univ: 'Université de Bertoua', sigle_univ: 'UBer', type_univ: 'publique', ville_univ: 'Bertoua' },
  { nom_univ: "Université d'Ebolowa", sigle_univ: 'UEb', type_univ: 'publique', ville_univ: 'Ebolowa' },
  { nom_univ: 'Université de Garoua', sigle_univ: 'UG', type_univ: 'publique', ville_univ: 'Garoua' },
  { nom_univ: "Institut Universitaire privé Laïc de l'Équateur", sigle_univ: 'IUPLE', type_univ: 'privé', ville_univ: 'Ebolowa' },
  { nom_univ: "Centre International des Études Polytechniques d'Obala", sigle_univ: 'CIEPO', type_univ: 'privé', ville_univ: 'Obala' },
  { nom_univ: 'Institut Universitaire Protestant de Yaoundé', sigle_univ: 'IUPY', type_univ: 'privé confessionnel', ville_univ: 'Yaoundé' },
  { nom_univ: 'Institut Universitaire Évangélique du Cameroun', sigle_univ: 'IUEC', type_univ: 'privé confessionnel', ville_univ: 'Bandjoun' },
  { nom_univ: 'Institut Universitaire de Bertoua', sigle_univ: 'IUB', type_univ: 'privé confessionnel', ville_univ: 'Bertoua' },
  { nom_univ: 'Institut Supérieur Protestant des Sciences et de Technologie', sigle_univ: 'ISPST', type_univ: 'privé confessionnel', ville_univ: 'Ebolowa' },
  { nom_univ: 'Université Adventiste Cosendai', sigle_univ: 'UAC', type_univ: 'privé confessionnel', ville_univ: 'Nanga-Eboko' },
];

function esc(s) {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

const lines = [];
lines.push('-- Phase 3 — création des 10 universités manquantes (3 publiques + 7 privées à facultés internes)');
lines.push('-- Généré automatiquement, NON EXÉCUTÉ — à valider avant tout INSERT');
lines.push('SET NAMES utf8mb4;');
lines.push('');
lines.push('START TRANSACTION;');
lines.push('INSERT INTO universites (nom_univ, sigle_univ, type_univ, ville_univ) VALUES');
const rows = NEW_UNIVS.map(u => `  ('${esc(u.nom_univ)}', '${esc(u.sigle_univ)}', '${esc(u.type_univ)}', '${esc(u.ville_univ)}')`);
lines.push(rows.join(',\n') + ';');
lines.push('COMMIT;');

fs.writeFileSync(OUT_SQL, lines.join('\n'), 'utf8');
console.log('Fichier écrit:', OUT_SQL);
console.log('Universités à créer:', NEW_UNIVS.length);
