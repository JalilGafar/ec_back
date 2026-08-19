-- Script : 007_fix_save_client_procedure_definer.sql
-- À exécuter manuellement sur ecolecamerdb
-- ─────────────────────────────────────────────────────────────────────────────
-- CONTEXTE
-- save_client_procedure (et resultat_procedure, non utilisée par le code) ont
-- été créées avec DEFINER = `c2154511c`@`localhost` — un utilisateur MySQL
-- d'hébergement (cPanel) qui n'existe pas sur tous les environnements.
-- Résultat : chaque appel à save_client_procedure échoue avec
--   "The user specified as a definer ('c2154511c'@'localhost') does not exist"
-- → aucun lead n'est enregistré, sur AUCUN des deux tunnels d'orientation
--   (/orientation ET /trouver-ma-formation utilisent tous les deux
--   POST /api/result → save_client_procedure).
--
-- Toutes les autres procédures du projet (serch_result_procedure,
-- add_ecole_procedure, etc.) utilisent DEFINER = CURRENT_USER (ou root@localhost
-- selon l'environnement) et fonctionnent normalement.
--
-- CORRECTIF : recréer la procédure avec DEFINER = CURRENT_USER, pour qu'elle
-- s'exécute avec l'utilisateur qui applique cette migration sur chaque
-- environnement (local, staging, prod), au lieu d'un utilisateur figé.
-- ─────────────────────────────────────────────────────────────────────────────

DROP PROCEDURE IF EXISTS save_client_procedure;

DELIMITER //
CREATE DEFINER = CURRENT_USER PROCEDURE save_client_procedure (
  IN p_name     VARCHAR(100),
  IN p_surname  VARCHAR(100),
  IN p_statuts  VARCHAR(50),
  IN p_level    VARCHAR(50),
  IN p_bornDate VARCHAR(10),
  IN p_email    VARCHAR(150),
  IN p_tel      VARCHAR(30),
  IN p_country  VARCHAR(100),
  IN p_city     VARCHAR(100),
  IN p_degree   VARCHAR(100),
  IN p_field    VARCHAR(100),
  IN p_source   VARCHAR(20)
)
BEGIN
  INSERT INTO clients (
    nom_c, prenom_c, statut_c, niveau_c, naissance_c,
    email_c, tel_c, created_at, pays_c, ville_cible,
    diplome_cible, domaine_cible, p_source
  )
  VALUES (
    p_name, p_surname, p_statuts, p_level, p_bornDate,
    p_email, p_tel, NOW(), p_country, p_city,
    p_degree, p_field, p_source
  );
END //
DELIMITER ;

-- ─────────────────────────────────────────────────────────────────────────────
-- resultat_procedure : non référencée nulle part dans ec_back/ (code mort),
-- même problème de DEFINER. Décommenter pour la corriger aussi, ou la
-- supprimer si confirmée obsolète :
-- DROP PROCEDURE IF EXISTS resultat_procedure;
-- ─────────────────────────────────────────────────────────────────────────────
