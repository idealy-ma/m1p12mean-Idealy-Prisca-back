const dotenv = require('dotenv');
const path = require('path');

// Charger les variables d'environnement
dotenv.config();

const config = {
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development',
  },
  database: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/garage_app',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'default_secret_key',
  },
};

module.exports = config; 