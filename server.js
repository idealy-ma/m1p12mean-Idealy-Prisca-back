const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const database = require('./src/database').default;
const config = require('./src/config');
const routes = require('./src/api/routes');
const errorHandler = require('./src/api/middlewares/errorHandler');
const AppError = require('./src/api/utils/AppError');
const mongoose = require('mongoose');
// --- AJOUTS POUR SOCKET.IO ---
const http = require('http');
const { Server } = require("socket.io");
const DevisModel = require('./src/api/models/Devis'); // Importer le modèle Devis
// --- FIN DES AJOUTS ---

// Initialiser l'application Express
const app = express();

mongoose.set('debug', true); 

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

const httpServer = http.createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"]
  }
});

const devisChat = io.of("/devis-chat");

devisChat.on("connection", (socket) => {
  console.log('Un utilisateur est connecté au chat devis:', socket.id);

  socket.on('join_devis_room', (devisId) => {
    socket.join(devisId);
    console.log(`Socket ${socket.id} a rejoint la room ${devisId}`);
  });

  socket.on('send_message', async (data) => {
     const { devisId, senderId, senderName, senderRole, message } = data;

     if (!devisId || !senderId || !senderName || !senderRole || !message) {
         console.error("Données de message incomplètes reçues:", data);
         socket.emit('chat_error', { message: 'Données du message incomplètes.' });
         return;
     }

     try {
       const newMessage = {
         sender: senderId,
         senderName: senderName, // Sauvegarder le nom
         senderRole: senderRole,
         message: message,
         timestamp: new Date()
       };

       const updatedDevis = await DevisModel.model.findByIdAndUpdate(
         devisId, 
         { $push: { chatMessages: newMessage } },
         { new: true, useFindAndModify: false }
       );

       if (!updatedDevis) {
         socket.emit('chat_error', { message: `Devis non trouvé pour l'ID: ${devisId}` });
         return;
       }

       devisChat.to(devisId).emit('receive_message', newMessage);

     } catch (error) {
       console.error(`Erreur lors de l'envoi/sauvegarde du message pour devis ${devisId}:`, error);
       socket.emit('chat_error', { message: `Erreur serveur lors de l'envoi du message.` });
     }
  });

  socket.on('disconnect', () => {
    console.log('Utilisateur déconnecté du chat devis:', socket.id);
  });
});

const PORT = config.server.port;

const runningServer = httpServer.listen(PORT, async () => {
  try {
    // Connecter à la base de données
    await database.connect();
    console.log(`Serveur (avec chat) démarré sur le port ${PORT} en mode ${config.server.env}`);
  } catch (error) {
    console.error('Erreur lors du démarrage du serveur:', error.message);
    process.exit(1);
  }
});

// Gérer les erreurs non capturées
process.on('unhandledRejection', (err) => {
  console.error('ERREUR NON GÉRÉE! 💥 Arrêt du serveur...');
  console.error(err.name, err.message);

  runningServer.close(() => {
    process.exit(1);
  });
});

// Gérer les signaux de terminaison
process.on('SIGTERM', () => {
  console.log('Signal SIGTERM reçu. Arrêt gracieux du serveur...');

  runningServer.close(async () => {
    await database.disconnect();
    console.log('Serveur arrêté');
    process.exit(0);
  });
});

module.exports = app;
