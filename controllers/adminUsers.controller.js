const { promisePool } = require('../db');
const bcrypt = require('bcryptjs');

exports.getModerators = async (req, res) => {
    try {
        const [moderators] = await promisePool.query(
            `SELECT u.id, u.username, u.email, u.createdAt
             FROM users u
             INNER JOIN user_roles ur ON ur.userId = u.id
             INNER JOIN roles r ON r.id = ur.roleId
             WHERE r.name = 'moderator'
             ORDER BY u.createdAt DESC`
        );
        res.status(200).json(moderators);
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

exports.createModerator = async (req, res) => {
    try {
        const hashed = bcrypt.hashSync(req.body.password, 8);
        const now = new Date();

        const [result] = await promisePool.query(
            'INSERT INTO users (username, email, password, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
            [req.body.username, req.body.email, hashed, now, now]
        );

        const userId = result.insertId;

        const [roles] = await promisePool.query(
            "SELECT id FROM roles WHERE name = 'moderator'"
        );

        if (roles.length === 0) {
            return res.status(500).send({ message: "Role 'moderator' introuvable en base de données !" });
        }

        await promisePool.query(
            'INSERT INTO user_roles (userId, roleId, createdAt, updatedAt) VALUES (?, ?, ?, ?)',
            [userId, roles[0].id, now, now]
        );

        res.status(201).send({ message: 'Compte modérateur créé avec succès !', id: userId });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};

exports.deleteModerator = async (req, res) => {
    try {
        const userId = parseInt(req.params.id, 10);

        const [userRoles] = await promisePool.query(
            `SELECT r.name FROM roles r
             INNER JOIN user_roles ur ON ur.roleId = r.id
             WHERE ur.userId = ?`,
            [userId]
        );

        if (userRoles.some(r => r.name === 'admin')) {
            return res.status(403).send({ message: 'Impossible de supprimer un compte admin via cet endpoint.' });
        }

        await promisePool.query('DELETE FROM user_roles WHERE userId = ?', [userId]);
        await promisePool.query('DELETE FROM users WHERE id = ?', [userId]);

        res.status(200).send({ message: 'Compte modérateur supprimé avec succès !' });
    } catch (error) {
        res.status(500).send({ message: error.message });
    }
};
