-- Script : 006_add_source_contact_to_clients.sql
-- À exécuter manuellement sur ecolecamerdb
-- ─────────────────────────────────────────────────────────────────────────────
-- ÉTAPE 1 : Ajout de la colonne source_contact à la table clients
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE clients
ADD COLUMN source_contact VARCHAR(20) NOT NULL DEFAULT 'tunnel_public'
AFTER domaine_cible;

-- Valeurs attendues :
--   'tunnel_public' : lead venant du tunnel /trouver-ma-formation (valeur par défaut)
--   'advisor'       : lead saisi par un conseiller via le module /advisor

-- ─────────────────────────────────────────────────────────────────────────────
-- ÉTAPE 2 : Mise à jour de save_client_procedure pour inclure source_contact
-- Note : MySQL ne supporte pas les valeurs DEFAULT sur les paramètres IN des
-- stored procedures. Les deux appelants (POST /api/result et POST /api/advisor/lead)
-- passent systématiquement le paramètre p_source — 'tunnel_public' par défaut
-- dans resultats.js, 'advisor' dans advisor.js.
-- ─────────────────────────────────────────────────────────────────────────────

DROP PROCEDURE IF EXISTS save_client_procedure;

DELIMITER //
CREATE PROCEDURE save_client_procedure (
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
    email_c, tel_c, serch_date, pays_c, ville_cible,
    diplome_cible, domaine_cible, source_contact
  )
  VALUES (
    p_name, p_surname, p_statuts, p_level, p_bornDate,
    p_email, p_tel, NOW(), p_country, p_city,
    p_degree, p_field, p_source
  );
END //
DELIMITER ;
