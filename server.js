const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const database = require('./src/database').default;
const config = require('./src/config');
const routes = require('./src/api/routes');
const errorHandler = require('./src/api/middlewares/errorHandler');
const AppError = require('./src/api/utils/AppError');
const mongoose = require('mongoose');
const http = require('http');
const { Server } = require("socket.io");
const DevisModel = require('./src/api/models/Devis'); // Importer le modèle Devis
const NotificationService = require('./src/api/services/NotificationService');
const jwt = require('jsonwebtoken');
const User = require('./src/api/models/User'); // <<<--- AJOUT DE L'IMPORT USER

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

const corsOptions = {
  origin: "*", // URL frontend Angular
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE"]
};

app.use(cors(corsOptions)); // Appliquer aux routes HTTP

const io = new Server(httpServer, {
  cors: corsOptions 
});

io.use((socket, next) => {
    const token = socket.handshake.auth?.token; 
    if (token) {
        try {
            const decoded = jwt.verify(token, config.jwt.secret);
            if (!decoded.id) {
                return next(new Error("Token invalide : ID utilisateur manquant."));
            }
            socket.userId = decoded.id; // Stocker l'ID utilisateur sur l'objet socket
            console.log(`Authentification socket réussie pour user ${socket.userId}`);
            next();
        } catch (err) {
            console.error("Erreur d'authentification Socket:", err.message);
            next(new Error("Authentication error: " + err.message));
        }
    } else {
        console.warn("Tentative de connexion socket sans token.");
        next(new Error("Authentication error: Token manquant.")); 
    }
});

io.on('connection', (socket) => {
    // Vérifier si userId est bien défini après le middleware
    if (!socket.userId) {
        console.error(`Utilisateur connecté au socket principal ${socket.id} mais sans userId après middleware.`);
        // Optionnel : déconnecter le socket s'il n'est pas authentifié correctement
        // socket.disconnect(true);
        return; 
    }
    
    console.log(`Utilisateur ${socket.userId} connecté au socket principal ${socket.id}`);
    
    // Rejoindre la room privée basée sur l'ID utilisateur
    const userRoom = `user_${socket.userId}`;
    socket.join(userRoom);
    console.log(`Socket ${socket.id} (User ${socket.userId}) a rejoint la room ${userRoom}`);

    // Écouter l'événement pour récupérer le nombre de non lus (pour mise à jour initiale)
    socket.on('get_unread_count', async () => {
        try {
            const count = await NotificationService.countUnread(socket.userId);
            socket.emit('unread_count', count); // Renvoyer le compte au client demandeur
        } catch (error) {
            console.error(`Erreur récupération count pour user ${socket.userId}:`, error);
            socket.emit('notification_error', { message: "Erreur interne lors de la récupération du nombre de notifications." });
        }
    });

    socket.on('disconnect', (reason) => {
        console.log(`Utilisateur ${socket.userId} déconnecté du socket principal ${socket.id}. Raison: ${reason}`);
        // Quitte automatiquement les rooms
    });

    // Autres listeners globaux si nécessaire...
});
// --- FIN AUTH SOCKET.IO ---

// --- INITIALISATION NOTIFICATION SERVICE --- 
// Appeler init sur l'instance exportée
NotificationService.init(io); 
// --- FIN INITIALISATION ---

// Espace de noms pour le chat des devis (EXISTANT)
const devisChat = io.of("/devis-chat");

devisChat.on("connection", (socket) => {
  console.log('Un utilisateur est connecté au chat devis:', socket.id);

  socket.on('join_devis_room', (devisId) => {
    socket.join(devisId);
    console.log(`Socket ${socket.id} a rejoint la room DEVIS ${devisId}`);
  });

  socket.on('send_message', async (data) => {
     // Attention: on ne devrait plus utiliser senderName envoyé par le client
     // On va le récupérer via senderId
     const { devisId, senderId, /* senderName, */ senderRole, message } = data; 

     // Validation de base (senderName n'est plus requis ici)
     if (!devisId || !senderId || !senderRole || !message) {
         console.error("Données de message incomplètes reçues (senderId, senderRole, message requis):", data);
         socket.emit('chat_error', { message: 'Données du message incomplètes.' });
         return;
     }

     try {
       // Récupérer l'utilisateur expéditeur pour obtenir son nom fiable
       let senderNameForDisplay = 'Utilisateur inconnu';
       try {
           const senderUser = await User.model.findById(senderId).select('nom prenom').lean().exec(); // Utiliser lean() pour un objet JS simple
           if (senderUser) {
               senderNameForDisplay = `${senderUser.prenom || ''} ${senderUser.nom || ''}`.trim();
           } else {
               console.warn(`send_message: Utilisateur expéditeur non trouvé pour ID: ${senderId}`);
           }
       } catch (userError) {
           console.error(`send_message: Erreur récupération utilisateur ${senderId}:`, userError);
           // Continuer avec 'Utilisateur inconnu'
       }
       
       // Créer le nouveau message pour le stockage dans le devis
       const newMessage = {
         sender: senderId,
         senderName: senderNameForDisplay, // Sauvegarder le nom récupéré
         senderRole: senderRole,
         message: message,
         timestamp: new Date()
       };

       const updatedDevis = await DevisModel.model.findByIdAndUpdate(
         devisId, 
         { $push: { chatMessages: newMessage } },
         { new: true, useFindAndModify: false }
       ).populate('client', '_id'); // Populate client ID

       if (!updatedDevis) {
         socket.emit('chat_error', { message: `Devis non trouvé pour l'ID: ${devisId}` });
         return;
       }

       // Émettre le message au chat (y compris à l'expéditeur)
       // Note: newMessage contient maintenant le senderNameForDisplay récupéré
       devisChat.to(devisId).emit('receive_message', newMessage);

       // --- Logique de Notification --- 
       if (updatedDevis.client) { 
           const recipientId = senderRole === 'client' ? null : updatedDevis.client._id; 
           const recipientRoleForNotif = senderRole === 'client' ? 'manager' : null;
           const recipientRoleForLink = senderRole === 'client' ? 'manager' : 'client';
           
           // Utiliser le nom récupéré pour le message de notification
           const notificationMessage = `Nouveau message de ${senderNameForDisplay} dans le devis N°${devisId.slice(-6)}`; 
           const notificationLink = `/${recipientRoleForLink}/devis/${devisId}`;
           
           console.log(`Préparation notif chat - Destinataire ID: ${recipientId}, Rôle: ${recipientRoleForNotif}`);
           
           await NotificationService.createAndSendNotification({
              recipientId: recipientId,
              recipientRole: recipientRoleForNotif,
              type: 'NEW_CHAT_MESSAGE',
              message: notificationMessage,
              link: notificationLink,
              senderId: senderId, // Garder l'ID de l'expéditeur original
              entityId: devisId 
           });
           console.log(`Notification pour nouveau message chat tentée pour devis ${devisId}.`);
       } else {
           console.error(`Impossible d'envoyer la notification de chat: Client non trouvé pour devis ${devisId}`);
       }
       // --- FIN NOTIFICATION CHAT ---

     } catch (error) {
       console.error(`Erreur dans send_message pour devis ${devisId}:`, error);
       socket.emit('chat_error', { message: 'Erreur serveur lors de l\'envoi du message.' });
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
