// Script SQL requis (exécution manuelle) : migrations/006_add_source_contact_to_clients.sql
const express = require('express');
const router =express.Router();
var con = require('../db');
var SQL = require('sql-template-strings');

const ALLOWED_SOURCES = ['tunnel_public', 'advisor'];

//** Enregistrement des informations clients *****//

router.post('/', (req, res, next) => {
    var requestForm = req.body;
    // source_contact : validation — valeur par défaut si absent ou invalide
    const source = ALLOWED_SOURCES.includes(requestForm.source_contact)
        ? requestForm.source_contact
        : 'tunnel_public';

    con.query(SQL
        `CALL save_client_procedure (${requestForm.name}, ${requestForm.surname},
                                  ${requestForm.statuts}, ${requestForm.level},
                                  ${requestForm.bornDate}, ${requestForm.email},
                                  ${requestForm.tel}, ${requestForm.country},
                                  ${requestForm.city}, ${requestForm.degree}, ${requestForm.field},
                                  ${source});`,
        function (err, result, fields) {
            if (err) {
                console.log(err);
                res.sendStatus(500);
                return;
            };
            console.log('Enregistrement de client');
            res.sendStatus(200);
            return;
        }
    );
});

//** Requete des formations qui repondent aux critères de recherche **/
router.get('/', (req, res, next) => {
    var ville = req.query.city;
    // diplome vide ('') = workflow v2 sans filtre niveau : la procédure gère ce cas via IF diplome = ''
    var diplome = req.query.diplome !== undefined ? req.query.diplome : '';
    // req.query.domaine contient désormais un id entier (string) et non plus un nom textuel
    var domaine = req.query.domaine;
    var branche = req.query.branche;
    con.query(SQL
        `CALL serch_result_procedure (${ville}, ${diplome}, ${domaine}, ${branche})`,
        function (err, result, fields) {
            if (err) {
                console.log(err);
                res.sendStatus(500);
                return;
            };
            res.status(200).json(result[0]);
            return;
        }
    );
});

module.exports = router;