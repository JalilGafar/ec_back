-- Script : 009_create_riasec.sql
-- À exécuter manuellement sur ecolecamerdb (comme 005-008)
-- ─────────────────────────────────────────────────────────────────────────
-- ÉTAPE 1 : classification RIASEC des fiches métiers existantes
-- ─────────────────────────────────────────────────────────────────────────
ALTER TABLE metier ADD COLUMN riasec_codes VARCHAR(6) NULL AFTER titre;

UPDATE metier SET riasec_codes = 'EC'  WHERE id_metier = 1;  -- Commerce
UPDATE metier SET riasec_codes = 'RC'  WHERE id_metier = 2;  -- Industrie
UPDATE metier SET riasec_codes = 'IR'  WHERE id_metier = 3;  -- Informatique
UPDATE metier SET riasec_codes = 'SA'  WHERE id_metier = 4;  -- Social
UPDATE metier SET riasec_codes = 'EC'  WHERE id_metier = 5;  -- Immobilier
UPDATE metier SET riasec_codes = 'RI'  WHERE id_metier = 6;  -- Agricole
UPDATE metier SET riasec_codes = 'CE'  WHERE id_metier = 7;  -- Banque
UPDATE metier SET riasec_codes = 'AE'  WHERE id_metier = 8;  -- Communication
UPDATE metier SET riasec_codes = 'SI'  WHERE id_metier = 9;  -- Sante
UPDATE metier SET riasec_codes = 'SE'  WHERE id_metier = 10; -- Tourisme
UPDATE metier SET riasec_codes = 'IR'  WHERE id_metier = 11; -- Environnement
UPDATE metier SET riasec_codes = 'AR'  WHERE id_metier = 12; -- Audiovisuel
UPDATE metier SET riasec_codes = 'AS'  WHERE id_metier = 13; -- Art
UPDATE metier SET riasec_codes = 'CE'  WHERE id_metier = 14; -- Assurance
UPDATE metier SET riasec_codes = 'SE'  WHERE id_metier = 15; -- Hotellerie
UPDATE metier SET riasec_codes = 'RC'  WHERE id_metier = 16; -- Automobile
UPDATE metier SET riasec_codes = 'RC'  WHERE id_metier = 17; -- Transport
UPDATE metier SET riasec_codes = 'ARI' WHERE id_metier = 18; -- Architecture
UPDATE metier SET riasec_codes = 'CE'  WHERE id_metier = 19; -- Gestion
UPDATE metier SET riasec_codes = 'SE'  WHERE id_metier = 20; -- Ressources humaine
UPDATE metier SET riasec_codes = 'C'   WHERE id_metier = 21; -- Comptabilite
UPDATE metier SET riasec_codes = 'RI'  WHERE id_metier = 22; -- Electronique
UPDATE metier SET riasec_codes = 'EC'  WHERE id_metier = 23; -- Droit
UPDATE metier SET riasec_codes = 'ES'  WHERE id_metier = 24; -- Management
UPDATE metier SET riasec_codes = 'AS'  WHERE id_metier = 25; -- Culture
UPDATE metier SET riasec_codes = 'EA'  WHERE id_metier = 26; -- Marketing
UPDATE metier SET riasec_codes = 'RE'  WHERE id_metier = 27; -- Restauration
UPDATE metier SET riasec_codes = 'CE'  WHERE id_metier = 28; -- Finance
UPDATE metier SET riasec_codes = 'CR'  WHERE id_metier = 29; -- Logistique
UPDATE metier SET riasec_codes = 'RI'  WHERE id_metier = 30; -- Agroalimentaire
UPDATE metier SET riasec_codes = 'SE'  WHERE id_metier = 31; -- Sciences Politique
UPDATE metier SET riasec_codes = 'C'   WHERE id_metier = 32; -- Administratif
UPDATE metier SET riasec_codes = 'AR'  WHERE id_metier = 33; -- Beaute
UPDATE metier SET riasec_codes = 'RC'  WHERE id_metier = 34; -- BTP
UPDATE metier SET riasec_codes = 'SA'  WHERE id_metier = 35; -- Enseignement
UPDATE metier SET riasec_codes = 'RI'  WHERE id_metier = 36; -- Ingenierie
UPDATE metier SET riasec_codes = 'AS'  WHERE id_metier = 37; -- Langues
UPDATE metier SET riasec_codes = 'RC'  WHERE id_metier = 38; -- Securite
UPDATE metier SET riasec_codes = 'IA'  WHERE id_metier = 39; -- Digital
UPDATE metier SET riasec_codes = 'IR'  WHERE id_metier = 40; -- Science
UPDATE metier SET riasec_codes = 'RA'  WHERE id_metier = 41; -- Artisanat

-- ─────────────────────────────────────────────────────────────────────────
-- ÉTAPE 2 : table des résultats de test, liée à un prospect (clients)
-- ─────────────────────────────────────────────────────────────────────────
CREATE TABLE riasec_results (
  id_riasec    INT AUTO_INCREMENT PRIMARY KEY,
  client_id    INT NOT NULL,
  score_r      INT NOT NULL,
  score_i      INT NOT NULL,
  score_a      INT NOT NULL,
  score_s      INT NOT NULL,
  score_e      INT NOT NULL,
  score_c      INT NOT NULL,
  code_riasec  VARCHAR(6) NOT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_riasec_client FOREIGN KEY (client_id) REFERENCES clients(id_client)
);
