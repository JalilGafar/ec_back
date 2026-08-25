const mysql = require('mysql2/promise');
require('dotenv').config();

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name} — check ec_back/.env`);
  }
  return value;
}

async function getConnection() {
  return mysql.createConnection({
    host: requireEnv('REFONTE_DB_HOST'),
    user: requireEnv('REFONTE_DB_USER'),
    password: requireEnv('REFONTE_DB_PASSWORD'),
    database: requireEnv('REFONTE_DB_NAME'),
    port: parseInt(process.env.REFONTE_DB_PORT || '3306', 10),
    connectTimeout: 10000,
  });
}

async function fetchEcolesLight(conn) {
  const [rows] = await conn.query('SELECT id_ecol, nom_e, sigle_e, universites_id FROM ecoles');
  return rows;
}

async function fetchCategoriesGroupMap(conn) {
  const [rows] = await conn.query('SELECT id_cat, groupe FROM categories');
  return new Map(rows.map((r) => [r.id_cat, r.groupe]));
}

async function fetchVillesCanonical(conn) {
  const [rows] = await conn.query('SELECT DISTINCT ville_cam FROM campus WHERE ville_cam IS NOT NULL');
  return rows.map((r) => r.ville_cam);
}

async function fetchFormationsForEcole(conn, idEcole) {
  const [rows] = await conn.query(
    `SELECT f.id_form, d.id_dip, d.nom_dip, c.groupe
     FROM formations f
     JOIN diplomes d ON d.id_dip = f.diplom_id
     JOIN categories c ON c.id_cat = d.categorie_id
     WHERE f.ecole_f_id = ?`,
    [idEcole]
  );
  return rows;
}

async function fetchEcoleFull(conn, idEcole) {
  const [rows] = await conn.query('SELECT * FROM ecoles WHERE id_ecol = ?', [idEcole]);
  return rows[0] || null;
}

async function fetchCampusForEcole(conn, idEcole) {
  const [rows] = await conn.query(
    `SELECT c.id_camp, c.nom_camp, c.ville_cam, c.principal_camp
     FROM campus c
     JOIN campus_ecoles ce ON ce.campus_id = c.id_camp
     WHERE ce.ecole_id = ?`,
    [idEcole]
  );
  return rows;
}

async function fetchDiplomeIdByNom(conn, nomDip) {
  const [rows] = await conn.query('SELECT id_dip FROM diplomes WHERE nom_dip = ?', [nomDip]);
  return rows.length ? rows[0].id_dip : null;
}

module.exports = {
  getConnection,
  fetchEcolesLight,
  fetchCategoriesGroupMap,
  fetchVillesCanonical,
  fetchFormationsForEcole,
  fetchEcoleFull,
  fetchCampusForEcole,
  fetchDiplomeIdByNom,
};
