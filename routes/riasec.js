// Script SQL requis (exécution manuelle) : migrations/009_create_riasec.sql
// (dépend aussi de clients.created_at / clients.p_source — migrations 007-008)
const express = require('express');
const router = express.Router();
const con = require('../db');
const SQL = require('sql-template-strings');

const RIASEC_LETTERS = ['R', 'I', 'A', 'S', 'E', 'C'];

// Même règle de départage qu'en frontend (determinerCodeHolland dans
// riasec-data.ts) : ordre canonique R-I-A-S-E-C en cas d'égalité de score,
// explicite plutôt que de compter sur la stabilité du tri du moteur JS —
// le code recalculé ici doit être identique à celui déjà affiché au client
// avant soumission (le serveur ne fait pas confiance à un code envoyé par
// le client, mais son propre calcul doit rester déterministe et cohérent).
function calculerCodeRiasec(scores) {
    return [...RIASEC_LETTERS]
        .sort((a, b) => {
            const diff = scores[b.toLowerCase()] - scores[a.toLowerCase()];
            return diff !== 0 ? diff : RIASEC_LETTERS.indexOf(a) - RIASEC_LETTERS.indexOf(b);
        })
        .slice(0, 3)
        .join('');
}

function calculerMetiersSuggeres(metiers, code) {
    const lettres = code.split('');
    const poids = [3, 2, 1];
    return metiers
        .map((m) => {
            const codes = (m.riasec_codes || '').split('');
            let pertinence = 0;
            lettres.forEach((lettre, i) => {
                if (codes.includes(lettre)) pertinence += poids[i];
            });
            return { id_metier: m.id_metier, titre: m.titre, pertinence };
        })
        .filter((m) => m.pertinence > 0)
        .sort((a, b) => b.pertinence - a.pertinence)
        .slice(0, 8);
}

// ─────────────────────────────────────────────────────────────────────────
// POST /api/riasec/submit — Enregistrement d'un lead + résultat de test RIASEC
// Utilise con.promisePool (interface Promise déjà exportée par db.js, jusque
// là utilisée uniquement par le module auth) pour enchaîner proprement les
// 3 opérations séquentielles (insert client, insert résultat, lecture métiers)
// sans empiler des callbacks.
// ─────────────────────────────────────────────────────────────────────────
router.post('/submit', async (req, res) => {
    const { name, surname, tel, email, statuts, bornDate, scores } = req.body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
        return res.status(400).json({ error: 'Le champ "name" (nom) est requis.' });
    }
    if (!surname || typeof surname !== 'string' || surname.trim() === '') {
        return res.status(400).json({ error: 'Le champ "surname" (prénom) est requis.' });
    }
    if (!tel || typeof tel !== 'string' || tel.trim() === '') {
        return res.status(400).json({ error: 'Le champ "tel" (téléphone) est requis.' });
    }
    if (!scores || typeof scores !== 'object') {
        return res.status(400).json({ error: 'Le champ "scores" est requis.' });
    }
    for (const lettre of ['r', 'i', 'a', 's', 'e', 'c']) {
        const v = scores[lettre];
        if (!Number.isInteger(v) || v < 10 || v > 50) {
            return res.status(400).json({ error: `Le score "${lettre}" est manquant ou invalide.` });
        }
    }

    const safeEmail   = email   || '';
    const safeStatuts = statuts || '';
    const safeBorn    = bornDate || null;
    const nom         = name.trim();
    const prenom      = surname.trim();
    const telephone   = tel.trim();

    try {
        const [clientResult] = await con.promisePool.query(SQL`
            INSERT INTO clients
                (nom_c, prenom_c, statut_c, naissance_c, email_c, tel_c, created_at, p_source)
            VALUES
                (${nom}, ${prenom}, ${safeStatuts}, ${safeBorn}, ${safeEmail}, ${telephone}, NOW(), ${'riasec_test'})
        `);
        const clientId = clientResult.insertId;

        const code = calculerCodeRiasec(scores);

        const [riasecResult] = await con.promisePool.query(SQL`
            INSERT INTO riasec_results
                (client_id, score_r, score_i, score_a, score_s, score_e, score_c, code_riasec)
            VALUES
                (${clientId}, ${scores.r}, ${scores.i}, ${scores.a}, ${scores.s}, ${scores.e}, ${scores.c}, ${code})
        `);

        const [metiers] = await con.promisePool.query(
            SQL`SELECT id_metier, titre, riasec_codes FROM metier`
        );
        const metiersSuggeres = calculerMetiersSuggeres(metiers, code);

        console.log('Résultat RIASEC enregistré, client_id=' + clientId);
        res.status(201).json({
            success: true,
            client_id: clientId,
            id_riasec: riasecResult.insertId,
            code_riasec: code,
            metiers: metiersSuggeres,
        });
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: "Erreur serveur lors de l'enregistrement du test." });
    }
});

module.exports = router;
