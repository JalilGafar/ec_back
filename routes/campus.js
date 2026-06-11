const express = require('express');
const router =express.Router();
var con = require('../db');
var SQL = require('sql-template-strings');
const { authJwt } = require('../middleware');

//** Vue des Campus depuis Admin */
router.get('/', (req, res, next) => {
    con.query("SELECT * FROM campus;", 
        function (err, result, fields) {
            if (err) {
                console.log(err);
                res.sendStatus(500);
                return;
            };
            console.log('Chargement des Campus');
            res.status(200).json(result);
            return;
        }
    );
});



//** EDITER UN CAMPUS */
router.put('/', [authJwt.verifyToken, authJwt.isAdmin], (req, res) =>{
    var editForm = req.body;
    con.query(SQL
        `UPDATE campus 
        SET 
            nom_camp = ${editForm.nom_camp},
            ville_cam = ${editForm.ville_cam},
            principal_camp = ${editForm.principal_camp},
            descriptif_camp = ${editForm.descriptif_camp},
            lon_camp = ${editForm.lon_camp},
            lat_camp = ${editForm.lat_camp}
        WHERE (id_camp = ${editForm.id_camp});
        `,
        function (err, result, fields) {
            if (err) {
                console.log(err);
                res.sendStatus(500);
                return;
            };
            res.sendStatus(200);
            console.log('CAMPUS record Update');
        }
    );
})


/**Ajout d'un nouveau Campus */
router.post('/', [authJwt.verifyToken, authJwt.isAdmin], (req, res) => {
    var campForm = req.body
    console.log('begining Campus insertion !');
    con.query(SQL
                `INSERT INTO campus
                (nom_camp, ville_cam, tel_camp, quartier_camp, principal_camp, descriptif_camp, lon_camp, lat_camp) 
                VALUES (${campForm.nom_camp}, ${campForm.ville_cam}, ${campForm.tel_camp}, ${campForm.quartier_camp}, ${campForm.principal_camp}, ${campForm.descriptif_camp}, ${campForm.lon_camp}, ${campForm.lat_camp});
                `,
                function (err, result, fields) {
                    if (err) {
                        console.log(err);
                        res.sendStatus(500);
                        return;
                    };
                    res.sendStatus(200);
                    console.log('record of Campus inserted');
                }
            );
});

//** DELET CAMPUS */
router.delete('/', [authJwt.verifyToken, authJwt.isAdmin], (req, res) => {
    const idCamp = parseInt(req.query.idCamp);
    if (!idCamp || isNaN(idCamp)) {
        return res.status(400).json({ error: 'ID invalide' });
    }
    con.query(SQL`DELETE FROM campus WHERE id_camp = ${idCamp}`,
        function (err, result, fields) {
            if (err) {
                console.error(err);
                return res.status(500).json({ error: 'Erreur serveur' });
            };
            if (result.affectedRows === 0) return res.status(404).json({ error: 'Ressource non trouvée' });
            res.sendStatus(200);
            console.log('Campus DELETED !');
        }
        );
})

module.exports = router; 