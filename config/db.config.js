module.exports = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: parseInt(process.env.DB_PORT) || 3306,
    multipleStatements: true,
    dialect: "mysql",
    pool: {
      max: 10,
      min: 0,
      acquire: 60000,
      idle: 10000
    }
  };