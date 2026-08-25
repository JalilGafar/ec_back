-- Phase 3 — création des 10 universités manquantes (3 publiques + 7 privées à facultés internes)
-- Généré automatiquement, NON EXÉCUTÉ — à valider avant tout INSERT
SET NAMES utf8mb4;

START TRANSACTION;
INSERT INTO universites (nom_univ, sigle_univ, type_univ, ville_univ) VALUES
  ('Université de Bertoua', 'UBer', 'publique', 'Bertoua'),
  ('Université d\'Ebolowa', 'UEb', 'publique', 'Ebolowa'),
  ('Université de Garoua', 'UG', 'publique', 'Garoua'),
  ('Institut Universitaire privé Laïc de l\'Équateur', 'IUPLE', 'privé', 'Ebolowa'),
  ('Centre International des Études Polytechniques d\'Obala', 'CIEPO', 'privé', 'Obala'),
  ('Institut Universitaire Protestant de Yaoundé', 'IUPY', 'privé confessionnel', 'Yaoundé'),
  ('Institut Universitaire Évangélique du Cameroun', 'IUEC', 'privé confessionnel', 'Bandjoun'),
  ('Institut Universitaire de Bertoua', 'IUB', 'privé confessionnel', 'Bertoua'),
  ('Institut Supérieur Protestant des Sciences et de Technologie', 'ISPST', 'privé confessionnel', 'Ebolowa'),
  ('Université Adventiste Cosendai', 'UAC', 'privé confessionnel', 'Nanga-Eboko');
COMMIT;