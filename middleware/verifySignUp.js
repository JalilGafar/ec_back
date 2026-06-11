const { promisePool } = require('../db');

const ROLES = ['user', 'moderator', 'admin'];

const checkDuplicateUsernameOrEmail = async (req, res, next) => {
    try {
        const [byUsername] = await promisePool.query(
            'SELECT id FROM users WHERE username = ?',
            [req.body.username]
        );
        if (byUsername.length > 0) {
            return res.status(400).send({ message: 'Failed! Username is already in use!' });
        }

        const [byEmail] = await promisePool.query(
            'SELECT id FROM users WHERE email = ?',
            [req.body.email]
        );
        if (byEmail.length > 0) {
            return res.status(400).send({ message: 'Failed! Email is already in use!' });
        }

        next();
    } catch (error) {
        return res.status(500).send({ message: 'Unable to validate Username!' });
    }
};

const checkRolesExisted = (req, res, next) => {
    if (req.body.roles) {
        for (const role of req.body.roles) {
            if (!ROLES.includes(role)) {
                return res.status(400).send({ message: 'Failed! Role does not exist = ' + role });
            }
        }
    }
    next();
};

const verifySignUp = { checkDuplicateUsernameOrEmail, checkRolesExisted };
module.exports = verifySignUp;
