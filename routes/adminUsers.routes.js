const express = require('express');
const router = express.Router();
const { verifyToken, isAdmin } = require('../middleware/authJwt');
const { checkDuplicateUsernameOrEmail } = require('../middleware/verifySignUp');
const adminUsersController = require('../controllers/adminUsers.controller');

router.get('/', [verifyToken, isAdmin], adminUsersController.getModerators);
router.post('/', [verifyToken, isAdmin, checkDuplicateUsernameOrEmail], adminUsersController.createModerator);
router.delete('/:id', [verifyToken, isAdmin], adminUsersController.deleteModerator);

module.exports = router;
