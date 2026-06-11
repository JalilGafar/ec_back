const express = require('express');
const router =express.Router();
const { authJwt } = require("../middleware");
const controller = require("../controllers/user.controller");


const univCtrl = require('../controllers/universite');


router.use(function(req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "x-access-token, Origin, Content-Type, Accept"
    );
    next();
});

//** Vue des université depuis Admin */
router.get('/', univCtrl.getAllUniv);

/**Ajout d'une nouvelle Université */
router.post('/', [authJwt.verifyToken, authJwt.isAdmin], univCtrl.creatUniv);

/**Mise a jour d'une université */
router.put('/', [authJwt.verifyToken, authJwt.isAdmin], univCtrl.updateUniv);

/** Supression d'une Université */
router.delete('/', [authJwt.verifyToken, authJwt.isAdmin], univCtrl.deletUniv)

module.exports = router;