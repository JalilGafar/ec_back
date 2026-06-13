const express = require('express');
const router  = express.Router();
const { authJwt, verifySignUp } = require('../middleware');
const adminAdvisorsController = require('../controllers/adminAdvisors.controller');

router.get('/',    [authJwt.verifyToken, authJwt.isAdmin], adminAdvisorsController.getAdvisors);
router.post('/',   [authJwt.verifyToken, authJwt.isAdmin, verifySignUp.checkDuplicateUsernameOrEmail], adminAdvisorsController.createAdvisor);
router.delete('/:id', [authJwt.verifyToken, authJwt.isAdmin], adminAdvisorsController.deleteAdvisor);

module.exports = router;
