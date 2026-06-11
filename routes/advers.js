const express = require('express');
const router =express.Router();
var con = require('../db');
var SQL = require('sql-template-strings');


router.get('/formation', (req, res, next) => {
    con.query(SQL
        `select id_form, nom_e, sigle_e, logo_e, duree_f, cout_f, diplom_id, nom_dip, filiere_dip, descriptif_dip, ville_cam
            from
                (campus
                join
                (select *
                from 
                    (
                    Select *
                    from 
                    diplomes
                    join
                        (SELECT *
                        from 
                            ecoles
                            join
                            formations
                            on (ecoles.id_ecol = formations.ecole_f_id)
                            where (formations.advers like 'on')
                        ) AA
                        on (diplomes.id_dip = AA.diplom_id)
                        )BB
                    join 
                        campus_ecoles
                        on (BB.id_ecol = campus_ecoles.ecole_id)
                    ) AA
                    on (campus.id_camp = AA.campus_id)
                    ) order by rand()
                limit 4`, 
        function (err, result, fields) {
        if (err) { console.error(err); return res.status(500).json({ error: 'Erreur serveur' }); }
        res.status(200).json(result);
    });
    res.status(200);
    }
);


router.get('/domaine', (req, res, next) => {
    var idDom = req.query.idDom;
    con.query(SQL
        `select id_form, nom_e, sigle_e, logo_e, duree_f, cout_f, diplom_id, nom_dip, filiere_dip, descriptif_dip, ville_cam
            from
                campus
                join
                (select *
                from 
                    (
                    Select *
                    from 
                    (Select *
					from domaines
					join	
						(SELECT *
						from 
							diplomes
							join
							domaines_diplomes
							on (diplomes.id_dip = domaines_diplomes.diplomes_id)
							) AA
							on (domaines.id_dom = AA.domaines_id)
							where (id_dom = ${idDom} )) ZZ
                    join
                        (SELECT *
                        from 
                            ecoles
                            join
                            formations
                            on (ecoles.id_ecol = formations.ecole_f_id)
                        ) AA
                        on (ZZ.id_dip = AA.diplom_id)
                        )BB  
                    join 
                        campus_ecoles
                        on (BB.id_ecol = campus_ecoles.ecole_id)
                    ) AA
                    on (campus.id_camp = AA.campus_id) order by rand()
                limit 4`, 
        function (err, result, fields) {
        if (err) { console.error(err); return res.status(500).json({ error: 'Erreur serveur' }); }
        res.status(200).json(result);
    });
    res.status(200);
    }
);

// Vue de quelques formations (5) pour un établissement précis
router.get('/formationSchool', (req, res, next) => {
    var idSchool = req.query.idSchool;
    con.query(SQL
        `select nom_dip, filiere_dip, logo_e, sigle_e, cout_f, id_form
            from
                (select *
                    from
                    diplomes
                    join
                    (select *
                    from 
                        formations
                        join 
                            ecoles
                            on (formations.ecole_f_id = ecoles.id_ecol)
                        where (ecoles.id_ecol = ${idSchool})
                        ) AA
                        on (diplomes.id_dip = AA.diplom_id)
                    ) BB order by rand()
                limit 5`, 
        function (err, result, fields) {
        if (err) { console.error(err); return res.status(500).json({ error: 'Erreur serveur' }); }
        res.status(200).json(result);
    });
    res.status(200);
    }
);


// Vue de toutes les formations pour un établissement
router.get('/formus', (req, res, next) => {
    var idSchool = req.query.idSchool;
    con.query(SQL
        `Select id_dip, nom_dip, nom_cat
            from categories
            join	
                (SELECT *
                from 
                    diplomes
                    join
                    formations
                    on (formations.diplom_id = diplomes.id_dip)
                    where (ecole_f_id =  ${idSchool})
                    ) AA
                    on (categories.id_cat = AA.categorie_id)
                    order by nom_dip
                    
        `, 
        function (err, result, fields) {
        if (err) { console.error(err); return res.status(500).json({ error: 'Erreur serveur' }); }
        res.status(200).json(result);
    });
    res.status(200);
    }
);



//************  LES ECOLES A LA UNE ***********//
router.get('/school', (req, res, next) => {
    con.query(SQL
        `select id_ecol, nom_e, sigle_e, nom_camp, ville_cam, logo_e, image_e, pub, type_e
        from
        (type_ecole
        right join
        (select id_camp, id_ecol, nom_e, sigle_e, nom_camp, ville_cam, logo_e, image_e, pub, ecoley_id, type_id
        from
            ecole_typologie
            right join
                (select id_camp, id_ecol, nom_e, sigle_e, nom_camp, ville_cam, logo_e, image_e, pub
                from
                    campus
                    join
                    (select id_ecol, nom_e, sigle_e, campus_id, ecole_id, logo_e, image_e, pub 
                    from 
                        ecoles
                        join 
                            campus_ecoles
                            on (ecoles.id_ecol = campus_ecoles.ecole_id)
                            where (ecoles.pub like 'on')
                        ) AA
                        on (campus.id_camp = AA.campus_id)
                    )BB
                    on (ecole_typologie.ecoley_id = BB.id_ecol)
                )CC
                on (type_ecole.id_type = CC.type_id)  
            )order by rand()
            limit 4`, 
        function (err, result, fields) {
        if (err) { console.error(err); return res.status(500).json({ error: 'Erreur serveur' }); }
        res.status(200).json(result);
    });
    res.status(200);
    }
);


module.exports = router;