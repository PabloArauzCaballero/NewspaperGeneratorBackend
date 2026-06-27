require('dotenv').config();

const databaseUrl = process.env.DATABASE_URL || 'postgres://newspaper:newspaper@localhost:5432/newspaper_generator';
const useSsl = process.env.DATABASE_SSL === 'true';

module.exports = {
  development: {
    url: databaseUrl,
    dialect: 'postgres',
    logging: false,
    dialectOptions: useSsl
      ? {
          ssl: {
            require: true,
            rejectUnauthorized: false
          }
        }
      : {}
  },
  test: {
    url: process.env.TEST_DATABASE_URL || databaseUrl,
    dialect: 'postgres',
    logging: false
  },
  production: {
    url: databaseUrl,
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
};
