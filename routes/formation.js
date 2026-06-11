const express = require('express');
const router =express.Router();
var con = require('../db');
var SQL = require('sql-template-strings');
const { authJwt } = require('../middleware');


// Voir une formation en promotion

router.get('/info', (req, res) => {
    var idForm = req.query.idForm;    
    con.query(SQL `select * FROM formations WHERE (id_form = ${idForm} )`,
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


//**Appel sous Admin de toutes les formation avec leur université, école, campus, ville, catégorie de diplome */
router.get('/', (req, res, next) => {
    con.query(
        `SELECT id_form, nom_f, nom_e, nom_dip, diplome_id, categorie_id, ecole_f_id, nom_cat,
                ville_cam, admission_diplome, descriptif_dip, condition_diplome, niveau_diplome,
                nom_univ, nom_camp, date_debut_f, duree_f, cout_f, programme_f, descriptif_f
         FROM v_admin_formations`,
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

/***** Ajout d'une nouvelle formation *********************/

router.post('/', [authJwt.verifyToken, authJwt.isAdmin], (req, res, next) => {
    var FormationForm = req.body
    console.log (FormationForm.nom_f)
    con.query(SQL
                `CALL add_formation_procedure (${FormationForm.nom_f}, 
                                                ${FormationForm.date_debut_f}, 
                                                ${FormationForm.duree_f}, 
                                                ${FormationForm.cout_f}, 
                                                ${FormationForm.programme_f}, 
                                                ${FormationForm.descriptif_f}, 
                                                ${FormationForm.ecole_id}, 
                                                ${FormationForm.diplom_id},
                                                ${FormationForm.condition_diplome},
                                                ${FormationForm.admission_diplome})
                `,
                function (err, result, fields) {
                    if (err) {
                        console.log(err);
                        res.sendStatus(500);
                        return;
                    };
                    res.sendStatus(200);
                    console.log(FormationForm.nom_f+' Enregistré dans la table FORMATION !');
                }
            );
});

//*************MODIFIER UNE FORMATION EXISTANTE ******************///
router.put('/', [authJwt.verifyToken, authJwt.isAdmin], (req, res) =>{
    var editForm = req.body;
    con.query(SQL
        `UPDATE formations 
        SET 
            nom_f = ${editForm.nom_f},
            date_debut_f = ${editForm.date_debut_f},
            duree_f = ${editForm.duree_f},
            cout_f = ${editForm.cout_f},
            programme_f = ${editForm.programme_f},
            descriptif_f = ${editForm.descriptif_f},
            conditions_f = ${editForm.condition_diplome},
            admission_f = ${editForm.admission_diplome},
            ecole_f_id =${editForm.ecole_f_id},
            diplom_id = ${editForm.diplome_id}
        WHERE (id_form = ${editForm.id_form});
        `,
        function (err, result, fields) {
            if (err) {
                console.log(err);
                res.sendStatus(500);
                return;
            };
            res.sendStatus(200);
            console.log('FORMATION record Update');
        }
    )
})

//*********** SUPRIMER UNE FORMATION *********************/

router.delete('/', [authJwt.verifyToken, authJwt.isAdmin], (req, res) => {
    const idForm = parseInt(req.query.idForm);
    if (!idForm || isNaN(idForm)) {
        return res.status(400).json({ error: 'ID invalide' });
    }
    con.query(SQL`DELETE FROM formations WHERE id_form = ${idForm}`,
        function (err, result, fields) {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Erreur serveur' });
            };
            if (result.affectedRows === 0) return res.status(404).json({ error: 'Ressource non trouvée' });
            res.sendStatus(200);
            console.log('Formation DELETED !');
        }
        );
})


module.exports = router;