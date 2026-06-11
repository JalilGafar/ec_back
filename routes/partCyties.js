const express = require('express');
const router =express.Router();
var con = require('../db');
var SQL = require('sql-template-strings');

router.get('/', (req, res, next) => {
    var degree = req.query.Degree;
    var domaine = req.query.Domaine;
    if (domaine && degree) {
        con.query(SQL
            `CALL get_villes_par_diplome_et_domaine(${degree},${domaine})`, 
            function (err, result, fields) {
                if (err) {
                    console.log(err);
                    res.sendStatus(500);
                    return;
                };
               // console.log(JSON.stringify(result));
                res.status(200).json(result[0]);
                return;
            }
        );
        return;
    }
    
});
module.exports = router;