const express = require('express');
const router = express.Router();
var con = require('../db');
var SQL = require('sql-template-strings');

const MAX_LIMIT = 5;
const DEFAULT_LIMIT = 3;
const ECOLE_LIMIT = 20;
const PARTNER_RATIO = 0.75;

const FIELDS = [
    'nom_e', 'sigle_e', 'ville_cam', 'nom_dip', 'nom_cat',
    'cout_f', 'descriptif_f', 'conditions_f', 'tel_1_e', 'email_e', 'siteweb_e'
];

const BASE_SELECT = SQL`
    SELECT DISTINCT
        e.nom_e, e.sigle_e, ca.ville_cam, d.nom_dip, c.nom_cat,
        f.cout_f, f.descriptif_f, f.conditions_f,
        e.tel_1_e, e.email_e, e.siteweb_e
    FROM formations f
    JOIN ecoles e ON e.id_ecol = f.ecole_f_id
    JOIN campus_ecoles x ON x.ecole_id = e.id_ecol
    JOIN campus ca ON ca.id_camp = x.campus_id
    LEFT JOIN diplomes d ON d.id_dip = f.diplom_id
    LEFT JOIN categories c ON c.id_cat = d.categorie_id
`;

function checkBotKey(req, res, next) {
    const key = req.headers['x-bot-key'];
    if (!key || key !== process.env.BOT_API_KEY) {
        res.sendStatus(401);
        return;
    }
    next();
}

function buildEcoleExacteQuery(ecole, ville, diplome) {
    var q = SQL``.append(BASE_SELECT).append(SQL`WHERE (e.nom_e LIKE ${'%' + ecole + '%'} OR e.sigle_e LIKE ${'%' + ecole + '%'})`);
    if (ville) {
        q = q.append(SQL` AND ca.ville_cam LIKE ${ville}`);
    }
    if (diplome) {
        q = q.append(SQL` ORDER BY (CASE WHEN d.nom_dip LIKE ${'%' + diplome + '%'} THEN 0 ELSE 1 END)`);
    }
    return q;
}

function buildDiplomeExactQuery(intitule, ville) {
    var q = SQL``.append(BASE_SELECT).append(SQL`WHERE d.nom_dip LIKE ${'%' + intitule + '%'}`);
    if (ville) {
        q = q.append(SQL` AND ca.ville_cam LIKE ${ville}`);
    }
    return q;
}

function buildPartenaireQuery(diplome, domaine, ville) {
    var q = SQL``.append(BASE_SELECT).append(SQL`
        LEFT JOIN domaines_diplomes dd ON dd.diplomes_id = d.id_dip
        LEFT JOIN domaines do ON do.id_dom = dd.domaines_id
        WHERE e.pub = 'on'
    `);

    if (diplome) {
        q = q.append(SQL` AND (c.nom_cat LIKE ${'%' + diplome + '%'} OR d.nom_dip LIKE ${'%' + diplome + '%'})`);
    }

    if (domaine) {
        if (/^[0-9]+$/.test(domaine)) {
            q = q.append(SQL` AND (do.id_dom = ${domaine} OR do.parent_id = ${domaine})`);
        } else {
            q = q.append(SQL` AND do.nom_dom LIKE ${'%' + domaine + '%'}`);
        }
    }

    if (ville) {
        q = q.append(SQL` AND ca.ville_cam LIKE ${ville}`);
    }

    return q;
}

function trimRows(rows) {
    return rows.map(row => {
        var out = {};
        FIELDS.forEach(f => { out[f] = row[f]; });
        return out;
    });
}

function respond(res, rows, matchType, budget, limit) {
    if (budget !== undefined) {
        rows = rows.filter(row => row.cout_f === null || row.cout_f === undefined || row.cout_f <= budget);
    }
    rows = rows.slice(0, limit);
    var trimmed = trimRows(rows);
    res.status(200).json({ count: trimmed.length, results: trimmed, match_type: matchType });
}

function dedupBySchool(rows) {
    var seen = new Set();
    return rows.filter(function (row) {
        if (seen.has(row.nom_e)) return false;
        seen.add(row.nom_e);
        return true;
    });
}

function weightedMerge(partnerRows, otherRows, limit, ratio) {
    var partners = dedupBySchool(partnerRows);
    var partnerNames = new Set(partners.map(function (r) { return r.nom_e; }));
    var others = dedupBySchool(otherRows).filter(function (row) {
        return !partnerNames.has(row.nom_e);
    });

    var partnerTarget = Math.min(partners.length, Math.round(limit * ratio));
    var selected = partners.slice(0, partnerTarget);
    selected = selected.concat(others.slice(0, limit - selected.length));
    return selected;
}

router.get('/', checkBotKey, (req, res, next) => {
    var ville = req.query.city;
    var diplome = req.query.diplome !== undefined ? req.query.diplome : '';
    var domaine = req.query.domaine;
    var branche = req.query.branche;
    var ecole = req.query.ecole;
    var intitule = req.query.intitule;

    var budget = req.query.budget !== undefined ? parseFloat(req.query.budget) : undefined;
    if (budget !== undefined && isNaN(budget)) {
        budget = undefined;
    }

    var limit = parseInt(req.query.limit, 10);
    if (isNaN(limit) || limit <= 0) {
        limit = DEFAULT_LIMIT;
    }
    limit = Math.min(limit, MAX_LIMIT);

    function runStandardWeighted() {
        con.query(buildPartenaireQuery(diplome, domaine, ville), function (err, partnerRows) {
            if (err) {
                console.log(err);
                res.sendStatus(500);
                return;
            }
            con.query(SQL
                `CALL serch_result_procedure (${ville}, ${diplome}, ${domaine}, ${branche})`,
                function (err2, result) {
                    if (err2) {
                        console.log(err2);
                        res.sendStatus(500);
                        return;
                    }
                    var allRows = result[0];
                    if (budget !== undefined) {
                        partnerRows = partnerRows.filter(row => row.cout_f === null || row.cout_f === undefined || row.cout_f <= budget);
                        allRows = allRows.filter(row => row.cout_f === null || row.cout_f === undefined || row.cout_f <= budget);
                    }
                    var merged = weightedMerge(partnerRows, allRows, limit, PARTNER_RATIO);

                    if (merged.length === 0 && (domaine || diplome)) {
                        // Filet de sécurité : "domaine" ou "diplome" reçu ne correspond
                        // peut-être pas à un vrai domaine/catégorie référencé, mais à un
                        // intitulé précis de diplôme (ex: "Mécatronique").
                        var fallbackTerm = domaine || diplome;
                        con.query(buildDiplomeExactQuery(fallbackTerm, ville), function (err3, fbRows) {
                            if (!err3 && fbRows.length > 0) {
                                respond(res, fbRows, 'diplome_fallback', budget, limit);
                                return;
                            }
                            res.status(200).json({ count: 0, results: [], match_type: 'standard_weighted' });
                        });
                        return;
                    }

                    var trimmed = trimRows(merged);
                    res.status(200).json({ count: trimmed.length, results: trimmed, match_type: 'standard_weighted' });
                }
            );
        });
    }

    function runPartenaire() {
        con.query(buildPartenaireQuery(diplome, domaine, ville), function (err, rows) {
            if (err) {
                console.log(err);
                res.sendStatus(500);
                return;
            }
            if (rows.length > 0) {
                respond(res, rows, 'partenaire', budget, limit);
                return;
            }
            runStandardWeighted();
        });
    }

    if (intitule) {
        con.query(buildDiplomeExactQuery(intitule, ville), function (err, rows) {
            if (err) {
                console.log(err);
                res.sendStatus(500);
                return;
            }
            if (rows.length > 0) {
                respond(res, rows, 'diplome_exact', budget, limit);
                return;
            }
            runPartenaire();
        });
        return;
    }

    if (ecole) {
        con.query(buildEcoleExacteQuery(ecole, ville, diplome), function (err, rows) {
            if (err) {
                console.log(err);
                res.sendStatus(500);
                return;
            }
            if (rows.length > 0) {
                respond(res, rows, 'ecole_exacte', budget, Math.max(limit, ECOLE_LIMIT));
                return;
            }
            runPartenaire();
        });
        return;
    }

    runStandardWeighted();
});

module.exports = router;