const mysql2 = require('mysql2');

const pool = mysql2.createPool({
    host              : process.env.DB_HOST,
    user              : process.env.DB_USER,
    password          : process.env.DB_PASSWORD,
    database          : process.env.DB_NAME,
    port              : parseInt(process.env.DB_PORT) || 3306,
    multipleStatements: true,
    connectionLimit   : 10,
    waitForConnections: true,
    queueLimit        : 0
});

pool.getConnection((err, connection) => {
    if (err) {
        console.error('Erreur de connexion à la base de données :', err);
        return;
    }
    console.log('Database is connected successfully !');
    connection.release();
});

// Interface callback — utilisée par toutes les routes métier (inchangées)
module.exports = pool;

// Interface Promise — utilisée par les modules auth
module.exports.promisePool = pool.promise();
