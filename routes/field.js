const express = require('express');
const router =express.Router();
var con = require('../db');
var SQL = require('sql-template-strings');

router.get('/', (req, res, next) => {
    var domaineDegree = req.query.DomaineDegree;
    var domaineCyti = req.query.DomaineCyti;
    if (domaineCyti === undefined && domaineDegree === undefined) {
        return;
    } else if (domaineDegree !== 'tous' && domaineDegree !== undefined && domaineCyti === undefined) {
        con.query(SQL
            `select distinct nom_dom, branche_dom
            from 	
                domaines
                join
                    domaines_diplomes
                    on (domaines.id_dom = domaines_diplomes.domaines_id)
                Join
                    (	select * 
                        from 
                            diplomes
                            join 
                                categories
                                on (categories.id_cat = diplomes.categorie_id)
                            where (categories.nom_cat LIKE ${domaineDegree})
                    ) dc
                    on (dc.id_dip = domaines_diplomes.diplomes_id)`, 
            function (err, result, fields) {
                if (err) {
                    console.log(err);
                    res.sendStatus(500);
                    return;
                };
               // console.log(JSON.stringify(result));
                res.status(200).json(result);
                return;
            }
        );
        return;
    } else if (domaineDegree === 'tous') {
        con.query(SQL 
            `SELECT distinct id_dom, nom_dom, branche_dom 
            FROM domaines
                join 
                    domaines_formations
                    on (domaines.id_dom = domaines_formations.domaines_id)
                join 
                    formations
                    on (formations.id_form = domaines_formations.formations_id);`, 
            function (err, result, fields) {
                if (err) {
                    console.log(err);
                    res.sendStatus(500);
                    return;
                };
            // console.log(JSON.stringify(result));
                res.status(200).json(result);
                return;
            });
        return;
    } else if (domaineCyti !== undefined) {
        con.query(SQL
            `select distinct nom_dom, branche_dom
            from 	
                domaines
                join
                    domaines_formations
                    on (domaines.id_dom = domaines_formations.domaines_id)
                Join
                    (	
                        select * 
                        from 
                            formations f
                            inner join 
                                (	select * 
                                    from 
                                        ecoles
                                    JOIN 
                                        campus_ecoles
                                        ON (ecoles.id_ecol = campus_ecoles.ecole_id)
                                    JOIN 
                                        campus
                                        ON (campus.id_camp = campus_ecoles.campus_id)
                                    WHERE 
                                        (campus.ville_cam LIKE ${domaineCyti})
                                ) ev
                                On f.ecole_f_id = ev.id_ecol
                            Join
                                (	select * 
                                    from 
                                        diplomes
                                        join 
                                            categories
                                            on (categories.id_cat = diplomes.categorie_id)
                                        where (categories.nom_cat LIKE ${domaineDegree})
                                ) dc
                                on (dc.id_dip = f.diplom_id)
                    ) ev
                    on (ev.id_form = domaines_formations.formations_id)`, 
            function (err, result, fields) {
                if (err) {
                    console.log(err);
                    res.sendStatus(500);
                    return;
                };
               // console.log(JSON.stringify(result));
                res.status(200).json(result);
                return;
            }
        );
        return;
    }

});

//** liste des filières de formations pour la page domaine */
router.get('/page', (req, res, next) => {
    con.query(`SELECT
  d.id_dom,
  d.nom_dom,
  d.branche_dom,
  d.illustra_dom,
  d.parent_id,
  p.nom_dom AS nom_parent
FROM domaines d
JOIN domaines p ON p.id_dom = d.parent_id
WHERE d.parent_id IS NOT NULL
ORDER BY p.nom_dom ASC, d.nom_dom ASC`,
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


//** Vue sur une seul filière */
router.get('/br', (req, res, next) => {
    var idFiliere = req.query.idFiliere; 
    con.query(SQL
        `SELECT branche_dom FROM domaines WHERE parent_id IS NOT NULL group by (branche_dom)`,
        function (err, result, fields) {
        if (err) { console.error(err); return res.status(500).json({ error: 'Erreur serveur' }); }
        res.status(200).json(result);
    });
    res.status(200);
});


//** Voir les catégories */
router.get('/categ', (req, res, next) => {
    con.query(SQL
        `SELECT nom_cat FROM categories;`, 
        function (err, result, fields) {
        if (err) { console.error(err); return res.status(500).json({ error: 'Erreur serveur' }); }
        res.status(200).json(result);
    });
    res.status(200);
});


//** Vue sur une seul filière */
router.get('/item', (req, res, next) => {
    var idFiliere = req.query.idFiliere; 
    con.query(SQL
        `SELECT * FROM domaines
        WHERE (id_dom = ${idFiliere} )`, 
        function (err, result, fields) {
        if (err) { console.error(err); return res.status(500).json({ error: 'Erreur serveur' }); }
        res.status(200).json(result);
    });
    res.status(200);
});

module.exports = router;