const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const database = require('./src/database').default;
const config = require('./src/config');
const routes = require('./src/api/routes');
const errorHandler = require('./src/api/middlewares/errorHandler');
const AppError = require('./src/api/utils/AppError');

// Initialiser l'application Express
const app = express();

// Middleware pour parser le corps des requêtes
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware pour gérer les CORS
app.use(cors());

// Route de base pour vérifier que l'API fonctionne
app.get('/', (_req, res) => {
  res.json({
    success: true,
    message: 'API de gestion de garage automobile',
    version: '1.0.0'
  });
});

// Utiliser les routes de l'API
app.use('/api/v1', routes);

// Gérer les routes non trouvées
app.all('*', (req, _res, next) => {
  next(new AppError(`Route ${req.originalUrl} non trouvée`, 404));
});

// Middleware de gestion des erreurs
app.use(errorHandler);

// Démarrer le serveur
const PORT = config.server.port;

const server = app.listen(PORT, async () => {
  try {
    // Connecter à la base de données
    await database.connect();
    console.log(`Serveur démarré sur le port ${PORT} en mode ${config.server.env}`);
  } catch (error) {
    console.error('Erreur lors du démarrage du serveur:', error.message);
    process.exit(1);
  }
});

// Gérer les erreurs non capturées
process.on('unhandledRejection', (err) => {
  console.error('ERREUR NON GÉRÉE! 💥 Arrêt du serveur...');
  console.error(err.name, err.message);
  
  server.close(() => {
    process.exit(1);
  });
});

// Gérer les signaux de terminaison
process.on('SIGTERM', () => {
  console.log('Signal SIGTERM reçu. Arrêt gracieux du serveur...');
  
  server.close(async () => {
    await database.disconnect();
    console.log('Serveur arrêté');
    process.exit(0);
  });
});

module.exports = app;
