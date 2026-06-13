const express = require('express');
const router =express.Router();
var con = require('../db');
var SQL = require('sql-template-strings');
const { authJwt } = require('../middleware');

/** Voir tout les articles */
router.get('/', (req, res, next) => {
    con.query("SELECT * FROM actualite;", function (err, result, fields) {
        if (err) { console.error(err); return res.status(500).json({ error: 'Erreur serveur' }); }
        res.status(200).json(result);
    });
    res.status(200);
    }
);


/**Voir 3 articles au Hasard */
router.get('/some', (req, res, next) => {
    con.query("SELECT * FROM actualite ORDER BY RAND () LIMIT 3;", function (err, result, fields) {
        if (err) { console.error(err); return res.status(500).json({ error: 'Erreur serveur' }); }
        res.status(200).json(result);
    });
    res.status(200);
    }
);

/**Ajout d'un nouvel Article */
router.post('/', [authJwt.verifyToken, authJwt.isModeratorOrAdmin], (req, res) => {
    var actuForm = req.body
    console.log('begining Actualite insertion !');
    con.query(SQL
                `INSERT INTO actualite
                (title, auteur, createdDate, visible, summary, illustration, sujets, keywords, content) 
                VALUES (${actuForm.title}, ${actuForm.auteur}, now(), ${actuForm.visible}, ${actuForm.summary}, ${actuForm.illustration}, ${actuForm.sujets}, ${actuForm.keywords}, ${actuForm.content});
                `,
                function (err, result, fields) {
                    if (err) {
                        console.log(err);
                        res.sendStatus(500);
                        return;
                    };
                    res.sendStatus(200);
                    console.log('record of Article inserted');
                }
            );
});


router.put('/', [authJwt.verifyToken, authJwt.isModeratorOrAdmin], (req, res) => {
    var editActu = req.body;
    con.query(SQL
        `
        UPDATE actualite
        SET
            title = ${editActu.title},
            auteur = ${editActu.auteur}, 
            updatedDate = now(), 
            visible = ${editActu.visible}, 
            summary = ${editActu.summary}, 
            illustration = ${editActu.illustration}, 
            sujets = ${editActu.sujets}, 
            keywords = ${editActu.keywords}, 
            content = ${editActu.content}
        WHERE (id_actu = ${editActu.id_actu} )
        `,
        function (err, result, fields) {
            if (err) {
                console.log(err);
                res.sendStatus(500);
                return;
            };
            res.sendStatus(200);
            console.log(editActu.title + ' Mis à jour !');
        }
    )
})

/**Voir un Article**/ 
router.get('/blog', (req, res) => {
    var subjectActu = req.query.subjectActu;    
    con.query(SQL
        `SELECT * FROM actualite WHERE sujets LIKE ${subjectActu}`,
        function (err, result, fields) {
            if (err) { console.error(err); return res.status(500).json({ error: 'Erreur serveur' }); }
            res.status(200).json(result);
        });
        res.status(200);
});


//** DELET ARTICLE  */
router.delete('/', [authJwt.verifyToken, authJwt.isModeratorOrAdmin], (req, res) => {
    const idActu = parseInt(req.query.idArti);
    if (!idActu || isNaN(idActu)) {
        return res.status(400).json({ error: 'ID invalide' });
    }
    con.query(SQL`DELETE FROM actualite WHERE id_actu = ${idActu}`,
        function (err, result, fields) {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Erreur serveur' });
            };
            if (result.affectedRows === 0) return res.status(404).json({ error: 'Ressource non trouvée' });
            res.sendStatus(200);
            console.log('Article DELETED !');
        }
        );
});

module.exports = router;