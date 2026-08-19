-- Script : 008_fix_save_client_procedure_param_collision.sql
-- À exécuter manuellement sur la base de production (et locale si besoin)
-- ─────────────────────────────────────────────────────────────────────────────
-- CONTEXTE
-- Après correction du DEFINER (migration 007), un nouveau bug est apparu en
-- production (MariaDB 11.4.10) : un appel à save_client_procedure avec des
-- valeurs correctes pour tous les paramètres insère une ligne où TOUT est à
-- '0'/NULL sauf tel_c (correct) et created_at (NOW(), pas un paramètre).
--
-- Cause : le paramètre `p_source` porte EXACTEMENT le même nom que la colonne
-- `p_source` de la table `clients`. Dans la clause
--   INSERT INTO clients (..., p_source) VALUES (..., p_source)
-- l'identifiant `p_source` est ambigu — MySQL/MariaDB peut le résoudre comme
-- une référence à la colonne plutôt qu'au paramètre. Ce comportement n'a pas
-- été reproduit en local (MySQL), mais semble se produire sur la version
-- MariaDB de production. Pour éliminer la classe de bug plutôt que de deviner
-- le mécanisme exact moteur par moteur, aucun paramètre ne doit désormais
-- porter le même nom qu'une colonne de la table.
--
-- CORRECTIF : renommer le paramètre p_source → p_srcContact (aucun autre
-- paramètre ne collisionne avec une colonne existante).
-- ─────────────────────────────────────────────────────────────────────────────

DROP PROCEDURE IF EXISTS save_client_procedure;

DELIMITER //
CREATE DEFINER = CURRENT_USER PROCEDURE save_client_procedure (
  IN p_name        VARCHAR(100),
  IN p_surname     VARCHAR(100),
  IN p_statuts     VARCHAR(50),
  IN p_level       VARCHAR(50),
  IN p_bornDate    VARCHAR(10),
  IN p_email       VARCHAR(150),
  IN p_tel         VARCHAR(30),
  IN p_country     VARCHAR(100),
  IN p_city        VARCHAR(100),
  IN p_degree      VARCHAR(100),
  IN p_field       VARCHAR(100),
  IN p_srcContact  VARCHAR(20)
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
    p_degree, p_field, p_srcContact
  );
END //
DELIMITER ;
