// Script SQL requis (exécution manuelle) : migrations/006_add_source_contact_to_clients.sql
const express = require('express');
const router = express.Router();
var con = require('../db');
var SQL = require('sql-template-strings');
const { authJwt } = require('../middleware');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/advisor/school/:id — Fiche complète d'une école
// Appelle shoolData_procedure (même procédure que /api/shoolData publique)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/school/:id', [authJwt.verifyToken, authJwt.isAdvisor], (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ error: 'ID école invalide' });
    }

    con.query(SQL`CALL shoolData_procedure(${id})`, (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: 'Erreur serveur' });
        }
        res.status(200).json(result[0]);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/advisor/lead — Enregistrement d'un lead par un conseiller
// source_contact est forcé à 'advisor' — lead saisi pendant un appel
// ─────────────────────────────────────────────────────────────────────────────
router.post('/lead', [authJwt.verifyToken, authJwt.isAdvisor], (req, res) => {
    const { name, surname, tel, email, statuts, level, bornDate, country, city, degree, field } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'Le champ "name" (nom) est requis.' });
    }
    if (!surname || typeof surname !== 'string' || surname.trim() === '') {
        return res.status(400).json({ error: 'Le champ "surname" (prénom) est requis.' });
    }
    if (!tel || typeof tel !== 'string' || tel.trim() === '') {
        return res.status(400).json({ error: 'Le champ "tel" (téléphone) est requis.' });
    }

    const safeEmail   = email   || '';
    const safeStatuts = statuts || '';
    const safeLevel   = level   || '';
    const safeBorn    = bornDate || '';
    const safeCountry = country || '';
    const safeCity    = city    || '';
    const safeDegree  = degree  || '';
    const safeField   = field   || '';

    con.query(SQL`CALL save_client_procedure(
        ${name.trim()}, ${surname.trim()}, ${safeStatuts}, ${safeLevel},
        ${safeBorn}, ${safeEmail}, ${tel.trim()}, ${safeCountry},
        ${safeCity}, ${safeDegree}, ${safeField}, ${'advisor'}
    )`, (err, result) => {
        if (err) {
            console.log(err);
            return res.status(500).json({ error: 'Erreur serveur lors de l\'enregistrement du lead.' });
        }
        console.log('Lead conseiller enregistré');
        res.status(201).json({ success: true, message: 'Lead enregistré avec succès' });
    });
});

module.exports = router;
