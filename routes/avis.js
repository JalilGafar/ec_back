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



/** Toggle visibilité d'un avis */
router.put('/', [authJwt.verifyToken, authJwt.isModeratorOrAdmin], (req, res) => {
    const { id_avis, visible } = req.body;
    if (!id_avis) return res.status(400).json({ error: 'id_avis manquant' });
    con.query(
        'UPDATE avis SET visible = ? WHERE id_avis = ?',
        [visible ? 1 : 0, id_avis],
        function (err, result) {
            if (err) { console.error(err); return res.status(500).json({ error: 'Erreur serveur' }); }
            if (result.affectedRows === 0) return res.status(404).json({ error: 'Avis introuvable' });
            res.sendStatus(200);
        }
    );
});

/** Suppression d'un avis */
router.delete('/', [authJwt.verifyToken, authJwt.isModeratorOrAdmin], (req, res) => {
    const idAvis = parseInt(req.query.idAvis);
    if (!idAvis || isNaN(idAvis)) return res.status(400).json({ error: 'ID invalide' });
    con.query(
        'DELETE FROM avis WHERE id_avis = ?',
        [idAvis],
        function (err, result) {
            if (err) { console.error(err); return res.status(500).json({ error: 'Erreur serveur' }); }
            if (result.affectedRows === 0) return res.status(404).json({ error: 'Avis introuvable' });
            res.sendStatus(200);
        }
    );
});

module.exports = router;