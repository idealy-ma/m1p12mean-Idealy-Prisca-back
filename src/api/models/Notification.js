const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: { // L'utilisateur qui reçoit (peut être null si c'est pour un rôle comme 'tous les managers')
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true 
    // required: false // Non requis si on cible un rôle
  },
  recipientRole: { // Pour cibler tous les utilisateurs d'un rôle (ex: 'manager')
    type: String,
    enum: ['client', 'manager', 'mecanicien'],
    index: true
  },
  sender: { // L'utilisateur qui a déclenché (optionnel)
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User' 
  },
  type: { // Type de notification pour catégorisation/icônes éventuelles
    type: String,
    enum: [
        'DEVIS_FINALIZED', 'DEVIS_ACCEPTED', 'DEVIS_REFUSED', 
        'NEW_CHAT_MESSAGE',
        'REPARATION_ASSIGNED', 'REPARATION_STATUS_UPDATE', 'REPARATION_COMPLETED',
        'FACTURE_GENERATED', 'NEW_DEVIS_REQUEST'
        // Ajouter d'autres types au besoin
    ],
    required: true
  },
  message: { // Texte affiché à l'utilisateur
    type: String,
    required: true
  },
  link: { // Lien relatif pour la redirection au clic
    type: String,
    required: true 
  },
  entityId: { // ID de l'entité concernée (Devis, Reparation, etc.) pour regroupement/référence facile
      type: mongoose.Schema.Types.ObjectId
  },
  isRead: { // Statut lu/non lu
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true // Ajoute createdAt et updatedAt
});

// Index composé pour optimiser les requêtes de lecture des notifications d'un user ou d'un rôle
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 }); 
notificationSchema.index({ recipientRole: 1, isRead: 1, createdAt: -1 }); 
notificationSchema.index({ createdAt: -1 }); // Pour trier globalement si besoin

module.exports = mongoose.model('Notification', notificationSchema); 