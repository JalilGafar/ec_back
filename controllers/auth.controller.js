const { promisePool } = require('../db');
const config = require('../config/auth.config');
const jwt    = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

exports.signup = async (req, res) => {
    try {
        const hashed = bcrypt.hashSync(req.body.password, 8);
        const now = new Date();

        const [result] = await promisePool.query(
            'INSERT INTO users (username, email, password, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
            [req.body.username, req.body.email, hashed, now, now]
        );

        const userId = result.insertId;
        const roles  = req.body.roles;

        if (roles && roles.length > 0) {
            const [dbRoles] = await promisePool.query(
                'SELECT id FROM roles WHERE name IN (?)',
                [roles]
            );
            const values = dbRoles.map(r => [userId, r.id, now, now]);
            await promisePool.query(
                'INSERT INTO user_roles (userId, roleId, createdAt, updatedAt) VALUES ?',
                [values]
            );
        } else {
            await promisePool.query(
                'INSERT INTO user_roles (userId, roleId, createdAt, updatedAt) VALUES (?, 1, ?, ?)',
                [userId, now, now]
            );
        }

        res.send({ message: 'User registered successfully!' });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

exports.signin = async (req, res) => {
    try {
        const [users] = await promisePool.query(
            'SELECT * FROM users WHERE username = ?',
            [req.body.username]
        );

        if (users.length === 0) {
            return res.status(404).send({ message: "La paire Username / Password n'est pas valide !" });
        }

        const user = users[0];

        if (!bcrypt.compareSync(req.body.password, user.password)) {
            return res.status(401).send({ message: "La paire Username / Password n'est pas valide !" });
        }

        const token = jwt.sign({ id: user.id }, config.secret, { expiresIn: 86400 });

        const [roles] = await promisePool.query(
            `SELECT r.name
             FROM roles r
             INNER JOIN user_roles ur ON ur.roleId = r.id
             WHERE ur.userId = ?`,
            [user.id]
        );

        req.session.token = token;

        return res.status(200).send({
            id         : user.id,
            username   : user.username,
            email      : user.email,
            roles      : roles.map(r => 'ROLE_' + r.name.toUpperCase()),
            accessToken: token
        });
    } catch (error) {
        return res.status(500).send({ message: error.message });
    }
};

exports.signout = async (req, res) => {
    try {
        req.session = null;
        return res.status(200).send({ message: "You've been signed out!" });
    } catch (err) {
        return res.status(500).send({ message: err.message });
    }
};
