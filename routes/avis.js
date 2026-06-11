const express = require('express');
const router =express.Router();
var con = require('../db');
var SQL = require('sql-template-strings');
const { authJwt } = require('../middleware');


router.get('/', (req, res, next) => {
    con.query("SELECT * FROM avis;", function (err, result, fields) {
        if (err) { console.error(err); return res.status(500).json({ error: 'Erreur serveur' }); }
        //console.log(JSON.stringify(result));
        res.status(200).json(result);
    });
    res.status(200);
    //console.log("acces à TopNewsSlides !")
    }
);

/**Ajout d'un nouvel Avis */
router.post('/', [authJwt.verifyToken], (req, res) => {
    var avisForm = req.body
    console.log('begining Avis insertion !');
    con.query(SQL
                `INSERT INTO avis
                (auteur_avis, content, promotion, id_ecole, content_cours, note_cours, content_ambiance, note_ambiance, content_locaux, note_locaux, content_insert, note_insert, note, campus_id, diplo_id, recommande, born, email, justif)
                VALUES (
                    ${avisForm.auteur_avis},
                    ${avisForm.content},
                    ${avisForm.promotion},
                    ${avisForm.id_ecole},
                    ${avisForm.content_cours},
                    ${avisForm.note_cours},
                    ${avisForm.content_ambiance},
                    ${avisForm.note_ambiance},
                    ${avisForm.content_locaux},
                    ${avisForm.note_locaux},
                    ${avisForm.content_insert},
                    ${avisForm.note_insert},
                    ${avisForm.note},
                    ${avisForm.campus_id},
                    ${avisForm.diplo_id},
                    ${avisForm.recommande},
                    ${avisForm.born},
                    ${avisForm.email},
                    ${avisForm.justif}
                    );
                `,
                function (err, result, fields) {
                    if (err) {
                        console.log(err);
                        res.sendStatus(500);
                        return;
                    };
                    res.sendStatus(200);
                    console.log('record of Avis inserted');
                }
            );
});


module.exports = router;