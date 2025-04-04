const Notification = require('../models/Notification');
const User = require('../models/User'); // Pour trouver les managers
const mongoose = require('mongoose');

class NotificationService {
  constructor() {
    this.ioInstance = null; // Initialiser la propriété d'instance
  }

  /**
   * Initialise le service avec l'instance Socket.IO.
   * Doit être appelé depuis server.js après l'initialisation de Socket.IO.
   * @param {object} io - L'instance Socket.IO du serveur.
   */
  init(io) {
    if (!this.ioInstance) {
      this.ioInstance = io; // Stocker sur l'instance
      console.log('NotificationService initialisé avec Socket.IO.');
    } else {
        console.warn('NotificationService déjà initialisé.');
    }
  }

  /**
   * Crée une notification en BDD et l'envoie via Socket.IO au(x) destinataire(s).
   * @param {object} data - Données de la notification.
   * @param {string} [data.recipientId] - ID de l'utilisateur destinataire (si individuel).
   * @param {string} [data.recipientRole] - Rôle destinataire (ex: 'manager') si pas d'ID individuel.
   * @param {string} data.type - Type de notification (enum défini dans le modèle).
   * @param {string} data.message - Message à afficher.
   * @param {string} data.link - Lien relatif pour la redirection.
   * @param {string} [data.senderId] - ID de l'utilisateur déclencheur.
   * @param {string} [data.entityId] - ID de l'entité concernée (Devis, Reparation, ...).
   * @returns {Promise<Notification>} La notification créée.
   */
  async createAndSendNotification(data) {
    if (!this.ioInstance) {
      console.error('ERREUR: NotificationService non initialisé avec io. Notification non envoyée.');
      // Peut-être lancer une erreur ou juste logguer et continuer sans envoyer de socket
      // throw new Error('NotificationService not initialized');
      // Pour l'instant, on crée quand même en BDD mais on log l'erreur d'envoi.
    }

    const { recipientId, recipientRole, senderId, type, message, link, entityId } = data;

    // Validation simple
    if (!type || !message || !link) {
      throw new Error('Données de notification invalides : type, message et link sont requis.');
    }
    if (!recipientId && !recipientRole) {
        throw new Error('Données de notification invalides : recipientId ou recipientRole doit être fourni.');
    }

    try {
      // Créer la notification en base de données
      const newNotificationData = {
        type,
        message,
        link,
        sender: senderId || null,
        entityId: entityId || null,
        isRead: false // Non lue par défaut
      };

      let savedNotifications = []; // Peut contenir une ou plusieurs notifications

      // Gérer la cible: utilisateur unique ou rôle
      if (recipientId) {
          newNotificationData.recipient = recipientId;
          const savedNotification = await Notification.create(newNotificationData);
          savedNotifications.push(savedNotification); // Ajouter à la liste
          console.log(`Notification créée pour l'utilisateur ${recipientId}.`);

          // Envoyer via Socket.IO à la room privée de l'utilisateur
          if (this.ioInstance) {
              const targetSocketRoom = `user_${recipientId}`;
              this.ioInstance.to(targetSocketRoom).emit('new_notification', savedNotification.toObject()); // Envoyer l'objet JS
              console.log(`Notification envoyée via socket à la room ${targetSocketRoom}`);
          } else {
              console.warn(`Socket.IO non disponible, notification pour ${recipientId} non envoyée en temps réel.`);
          }
      
      } else if (recipientRole === 'manager') {
          // --- Logique de Duplication pour les Managers ---
          console.log(`Notification reçue pour le rôle ${recipientRole}. Recherche des managers actifs...`);
          
          // Trouver tous les managers actifs
          const managers = await User.model.find({ role: 'manager', estActif: true }).select('_id').exec();
          console.log(`Trouvé ${managers.length} manager(s) actif(s).`);

          if (managers.length > 0) {
              const notificationPromises = managers.map(async (manager) => {
                  // Créer une copie de la notification pour CE manager
                  const individualNotificationData = {
                      ...newNotificationData, // Copie les données communes (type, message, link, sender, entityId)
                      recipient: manager._id, // Définit le destinataire spécifique
                      recipientRole: null // Pas besoin de role ici car c'est une copie individuelle
                  };
                  const savedNotification = await Notification.create(individualNotificationData);
                  savedNotifications.push(savedNotification); // Ajouter à la liste
                  console.log(`Copie de notification créée pour le manager ${manager._id}.`);

                  // Envoyer via Socket.IO à la room privée de CE manager
                  if (this.ioInstance) {
                      const targetSocketRoom = `user_${manager._id}`;
                      this.ioInstance.to(targetSocketRoom).emit('new_notification', savedNotification.toObject());
                      console.log(`Notification (pour manager ${manager._id}) envoyée via socket à la room ${targetSocketRoom}`);
                  } else {
                      console.warn(`Socket.IO non disponible, notification pour manager ${manager._id} non envoyée en temps réel.`);
                  }
                  return savedNotification; // Retourner pour Promise.all si besoin
              });
              
              await Promise.all(notificationPromises); // Attendre que toutes les créations/envois soient tentés
              console.log(`Traitement des notifications pour ${managers.length} manager(s) terminé.`);
              
          } else {
               console.warn(`Aucun manager actif trouvé pour la notification de rôle ${recipientRole}.`);
          }
           // --- Fin Logique de Duplication ---
          
      } else {
          // Gérer d'autres rôles si nécessaire, ou lancer une erreur
          console.error(`Rôle destinataire non supporté ou logique manquante pour : ${recipientRole}`);
          throw new Error(`Rôle destinataire non supporté : ${recipientRole}`);
      }

      // Retourner la ou les notifications créées (peut être un tableau vide si aucun manager trouvé)
      return savedNotifications;

    } catch (error) {
      console.error('Erreur lors de la création ou de l\'envoi de la notification:', error);
      // Propager l'erreur pour que l'appelant puisse la gérer si besoin
      throw error;
    }
  }

  /**
   * Récupère les notifications pour un utilisateur donné, paginées et triées.
   * @param {string} userId - ID de l'utilisateur.
   * @param {object} options - Options de pagination (page, limit).
   * @returns {Promise<object>} { notifications: Notification[], pagination: object }
   */
  async getUserNotifications(userId, { page = 1, limit = 10 }) {
    if (!userId) throw new Error('User ID requis.');

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);

    try {
      // Récupérer les notifications pour cet utilisateur OU celles destinées à son rôle (si pertinent)
      // Actuellement, on ne récupère que celles adressées directement à l'utilisateur.
      // Pour récupérer celles par rôle, il faudrait connaître le rôle de l'utilisateur ici.
      const query = { recipient: userId }; 

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 }) // Les plus récentes d'abord
        .skip(skip)
        .limit(limitNum)
        .populate('sender', 'nom prenom'); // Peuple l'expéditeur si besoin

      const total = await Notification.countDocuments(query);
      const totalPages = Math.ceil(total / limitNum);

      return {
        notifications,
        pagination: {
          total,
          page: parseInt(page),
          limit: limitNum,
          totalPages,
          hasNext: parseInt(page) < totalPages,
          hasPrev: parseInt(page) > 1
        }
      };
    } catch (error) {
      console.error("Erreur lors de la récupération des notifications:", error);
      throw error;
    }
  }

  /**
   * Marque une notification spécifique comme lue.
   * @param {string} notificationId - ID de la notification.
   * @param {string} userId - ID de l'utilisateur (pour vérifier l'autorisation).
   * @returns {Promise<boolean>} True si la mise à jour a réussi.
   */
  async markAsRead(notificationId, userId) {
    if (!notificationId || !userId) throw new Error('Notification ID et User ID requis.');
    if (!mongoose.Types.ObjectId.isValid(notificationId)) throw new Error('Notification ID invalide.');

    try {
      // Mettre à jour uniquement si la notification appartient à l'utilisateur
      const result = await Notification.updateOne(
        { _id: notificationId, recipient: userId, isRead: false }, // Condition : appartient à l'user et non lue
        { $set: { isRead: true } }
      );
      
      return result.modifiedCount > 0; // Retourne true si au moins un document a été modifié
    } catch (error) {
      console.error("Erreur lors du marquage de la notification comme lue:", error);
      throw error;
    }
  }

  /**
   * Marque toutes les notifications non lues d'un utilisateur comme lues.
   * @param {string} userId - ID de l'utilisateur.
   * @returns {Promise<number>} Le nombre de notifications mises à jour.
   */
  async markAllAsRead(userId) {
    if (!userId) throw new Error('User ID requis.');

    try {
      const result = await Notification.updateMany(
        { recipient: userId, isRead: false }, // Condition : appartient à l'user et non lue
        { $set: { isRead: true } }
      );

      return result.modifiedCount; // Retourne le nombre de documents modifiés
    } catch (error) {
      console.error("Erreur lors du marquage de toutes les notifications comme lues:", error);
      throw error;
    }
  }

   /**
   * Compte les notifications non lues pour un utilisateur.
   * @param {string} userId - ID de l'utilisateur.
   * @returns {Promise<number>} Le nombre de notifications non lues.
   */
  async countUnread(userId) {
     if (!userId) throw new Error('User ID requis.');
     try {
       return await Notification.countDocuments({ recipient: userId, isRead: false });
     } catch (error) {
       console.error("Erreur lors du comptage des notifications non lues:", error);
       throw error;
     }
  }

}

// Exporter une instance ou la classe selon votre préférence
// Ici, on exporte une instance pour simuler un singleton simple
module.exports = new NotificationService(); 