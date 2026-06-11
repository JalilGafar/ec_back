const jwt         = require('jsonwebtoken');
const config      = require('../config/auth.config.js');
const { promisePool } = require('../db');

const ROLES_QUERY = `
    SELECT r.name
    FROM roles r
    INNER JOIN user_roles ur ON ur.roleId = r.id
    WHERE ur.userId = ?`;

const verifyToken = (req, res, next) => {
    const token = req.headers['x-access-token'];

    if (!token) {
        return res.status(403).send({ message: 'No token provided!' });
    }

    jwt.verify(token, config.secret, (err, decoded) => {
        if (err) {
            return res.status(401).send({ message: 'Unauthorized!' });
        }
        req.userId = decoded.id;
        next();
    });
};

const isAdmin = async (req, res, next) => {
    try {
        const [roles] = await promisePool.query(ROLES_QUERY, [req.userId]);
        if (roles.some(r => r.name === 'admin')) return next();
        return res.status(403).send({ message: 'Require Admin Role!' });
    } catch {
        return res.status(500).send({ message: 'Unable to validate User role!' });
    }
};

const isModerator = async (req, res, next) => {
    try {
        const [roles] = await promisePool.query(ROLES_QUERY, [req.userId]);
        if (roles.some(r => r.name === 'moderator')) return next();
        return res.status(403).send({ message: 'Require Moderator Role!' });
    } catch {
        return res.status(500).send({ message: 'Unable to validate Moderator role!' });
    }
};

const isModeratorOrAdmin = async (req, res, next) => {
    try {
        const [roles] = await promisePool.query(ROLES_QUERY, [req.userId]);
        if (roles.some(r => r.name === 'admin' || r.name === 'moderator')) return next();
        return res.status(403).send({ message: 'Require Moderator or Admin Role!' });
    } catch {
        return res.status(500).send({ message: 'Unable to validate Moderator or Admin role!' });
    }
};

const authJwt = { verifyToken, isAdmin, isModerator, isModeratorOrAdmin };
module.exports = authJwt;
