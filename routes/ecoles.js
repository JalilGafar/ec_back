const express = require('express');
const router =express.Router();
var con = require('../db');
var SQL = require('sql-template-strings');
const { authJwt } = require('../middleware');

//** Vue des Etablissements */
router.get('/etablissement', (req, res, next) => {
    var idEcole = req.query.idEcole;
    con.query(SQL `SELECT * FROM ecoles WHERE (id_ecol = ${idEcole})`, 
        function (err, result, fields) {
            if (err) {
                console.log(err);
                res.sendStatus(500);
                return;
            };
           // console.log('Chargement des Ecoles');
            res.status(200).json(result);
            return;
        }
    );
});


//** liste des établissements lors de la recherche d'établissement */
router.get('/find', (req, res, next) => {
    con.query("SELECT id_ecol, sigle_e, nom_e FROM ecoles;", 
        function (err, result, fields) {
            if (err) {
                console.log(err);
                res.sendStatus(500);
                return;
            };
            res.status(200).json(result);
            return;
        }
    );
});




//** Vue des Ecoles depuis Admin */
router.get('/', (req, res, next) => {
    con.query("SELECT * FROM ecoles;", 
        function (err, result, fields) {
            if (err) {
                console.log(err);
                res.sendStatus(500);
                return;
            };
           // console.log('Chargement des Ecoles');
            res.status(200).json(result);
            return;
        }
    );
});

/**Ajout d'une nouvelle Ecole */
router.post('/', [authJwt.verifyToken, authJwt.isAdmin], (req, res, next) => {
    var ecoleForm = req.body
    con.query(SQL
                `
                CALL add_ecole_procedure (${ecoleForm.nom_e}, 
                                            ${ecoleForm.sigle_e}, 
                                            ${ecoleForm.logo_e}, 
                                            ${ecoleForm.niveau_e}, 
                                            ${ecoleForm.langue_e}, 
                                            ${ecoleForm.date_creation}, 
                                            ${ecoleForm.arrete_creation}, 
                                            ${ecoleForm.arrete_ouverture}, 
                                            ${ecoleForm.tel_1_e}, 
                                            ${ecoleForm.email_e}, 
                                            ${ecoleForm.siteweb_e }, 
                                            ${ecoleForm.bp_e}, 
                                            ${ecoleForm.directeur_e}, 
                                            ${ecoleForm.photo_directeur}, 
                                            ${ecoleForm.mot_directeur}, 
                                            ${ecoleForm.stat_e}, 
                                            ${ecoleForm.descriptif_e}, 
                                            ${ecoleForm.image_e}, 
                                            ${ecoleForm.universites_id},
                                            ${ecoleForm.campus_id},
                                            ${ecoleForm.campus_id1},
                                            ${ecoleForm.campus_id2},
                                            ${ecoleForm.campus_id3},
                                            ${ecoleForm.campus_id4},
                                            ${ecoleForm.campus_id5},
                                            ${ecoleForm.campus_id6},
                                            ${ecoleForm.campus_id7},
                                            ${ecoleForm.campus_id8},
                                            ${ecoleForm.campus_id9})`,
                function (err, result, fields) {
                    if (err) {
                        console.log(err);
                        res.sendStatus(500);
                        return;
                    };
                    res.sendStatus(200);
                    console.log('record inserted');
                }
            );
});


/**Modification d'une Ecole */
router.put('/', [authJwt.verifyToken, authJwt.isAdmin], (req, res) =>{
    var editForm = req.body;
    con.query(SQL
        `UPDATE ecoles 
        SET 
            nom_e = ${editForm.nom_e},
            sigle_e = ${editForm.sigle_e},
            logo_e = ${editForm.logo_e},
            niveau_e = ${editForm.niveau_e},
            langue_e = ${editForm.langue_e},
            tel_1_e = ${editForm.tel_1_e},
            email_e = ${editForm.email_e},
            bp_e = ${editForm.bp_e},
            directeur_e = ${editForm.directeur_e},
            photo_directeur = ${editForm.photo_directeur},
            mot_directeur = ${editForm.mot_directeur},
            stat_e = ${editForm.stat_e},
            descriptif_e = ${editForm.descriptif_e},
            image_e = ${editForm.image_e},
            Universites_id = ${editForm.universites_id}
        WHERE (id_ecol = ${editForm.id_ecol});
        `,
        function (err, result, fields) {
            if (err) {
                console.log(err);
                res.sendStatus(500);
                return;
            };
            console.log('ECOLE record Update 1/2');
        }
    );
    con.query(SQL
        `CALL galager_procedure (${editForm.id_ecol},${editForm.campus_id});`,
        function (err, result, fields) {
            if (err) {
                console.log(err);
                res.sendStatus(500);
                return;
            };
            res.sendStatus(200);
            console.log('ECOLE record Update 2/2');
        }
    );
})


//** DELET ECOLE  */
router.delete('/', [authJwt.verifyToken, authJwt.isAdmin], (req, res) => {
    const idEcole = parseInt(req.query.idEcole);
    if (!idEcole || isNaN(idEcole)) {
        return res.status(400).json({ error: 'ID invalide' });
    }
    con.query(SQL`DELETE FROM ecoles WHERE id_ecol = ${idEcole}`,
        function (err, result, fields) {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Erreur serveur' });
            };
            if (result.affectedRows === 0) return res.status(404).json({ error: 'Ressource non trouvée' });
            res.sendStatus(200);
            console.log('Ecole DELETED !');
        }
        );
});

module.exports = router;