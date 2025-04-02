const mongoose = require('mongoose');
const User = require('./User'); // Pour vérifier les rôles si besoin plus tard
// const Devis = require('./Devis'); // Décommenter si besoin de méthodes spécifiques de Devis ici, sinon la ref suffit
const Vehicule = require('./Vehicule'); // Ajout de l'import pour la référence Véhicule
const Service = require('./Service'); // Ajout de l'import pour la référence Service
const ServicePack = require('./ServicePack'); // Ajout de l'import pour la référence ServicePack

const commentaireSchema = new mongoose.Schema({
  auteur: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  message: { type: String, required: true },
  date: { type: Date, default: Date.now }
}, { _id: false }); // Pas besoin d'ID séparé pour chaque commentaire

const etapeSuiviSchema = new mongoose.Schema({
  // _id sera généré automatiquement par Mongoose pour chaque étape
  titre: { type: String, required: true },
  description: { type: String },
  status: {
    type: String,
    enum: ['En attente', 'En cours', 'Terminée', 'Bloquée'], // Statuts possibles pour une étape
    default: 'En attente'
  },
  dateDebut: { type: Date },
  dateFin: { type: Date },
  commentaires: [commentaireSchema],
  // On pourrait ajouter une référence au mécanicien responsable de l'étape si nécessaire
  // mecanicienEtape: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true }); // Ajoute createdAt et updatedAt pour l'étape

const photoSchema = new mongoose.Schema({
  // _id sera généré automatiquement si on ne met pas _id:false
  url: { type: String, required: true }, // URL Supabase
  description: { type: String },
  dateAjout: { type: Date, default: Date.now },
  ajoutePar: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  etapeAssociee: { type: mongoose.Schema.Types.ObjectId } // Optionnel: lier photo à une étape spécifique
}, { _id: true }); // Garder les _id pour potentiellement supprimer/modifier une photo individuellement

const reparationSchema = new mongoose.Schema({
  devisOrigine: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Devis',
    required: true,
    unique: true // Une réparation par devis accepté
  },
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  vehicule: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicule',
    required: true
  },
  mecaniciensAssignes: [{
    _id: false,
    mecanicien: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
    // Ajouter d'autres champs par assignation si besoin
  }],
  statusReparation: {
    type: String,
    enum: ['Planifiée', 'En cours', 'En attente pièces', 'Terminée', 'Facturée', 'Annulée'],
    default: 'Planifiée',
    required: true
  },
  // Copie des éléments du devis au moment de la création
  servicesInclus: [{
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
    prix: Number,
    note: String // note initiale du devis
    // On pourrait ajouter un statut spécifique à la tâche ici si besoin: statusTache: String
  }],
  packsInclus: [{
    servicePack: { type: mongoose.Schema.Types.ObjectId, ref: 'ServicePack' },
    prix: Number,
    note: String
     // On pourrait ajouter un statut spécifique à la tâche ici si besoin: statusTache: String
  }],
  problemeDeclare: { type: String }, // Copié du devis
  etapesSuivi: [etapeSuiviSchema],
  photos: [photoSchema],
  notesInternes: [{ // Pour des notes générales sur la réparation
      _id: false,
      auteur: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      message: String,
      date: { type: Date, default: Date.now }
  }],
  dateCreationReparation: { type: Date, default: Date.now },
  dateDebutPrevue: { type: Date }, // Potentiellement copié/défini lors de la planification
  dateFinPrevue: { type: Date },
  dateDebutReelle: { type: Date },
  dateFinReelle: { type: Date },
  coutEstime: { type: Number }, // Copié du devis total
  coutFinal: { type: Number } // Calculé/défini à la fin

}, { timestamps: true }); // Ajoute createdAt et updatedAt pour la réparation

// Index pour améliorer les recherches courantes
reparationSchema.index({ client: 1, statusReparation: 1 });
// Index modifié pour le tableau
reparationSchema.index({ 'mecaniciensAssignes.mecanicien': 1, statusReparation: 1 });
reparationSchema.index({ statusReparation: 1 });

// Pré-hook pour s'assurer que le client et le mécanicien (si assigné) existent et ont le bon rôle
reparationSchema.pre('save', async function(next) {
  try {
    // Vérifier le client
    const clientUser = await mongoose.model('User').findById(this.client);
    if (!clientUser || clientUser.role !== 'client') {
      throw new Error(`L'ID client fourni ne correspond pas à un utilisateur avec le rôle client.`);
    }

    // Vérifier les mécaniciens assignés (si présents)
    if (this.mecaniciensAssignes && this.mecaniciensAssignes.length > 0) {
      for (const assignation of this.mecaniciensAssignes) {
          const mecanicienUser = await mongoose.model('User').findById(assignation.mecanicien);
          if (!mecanicienUser || mecanicienUser.role !== 'mecanicien') {
            throw new Error(`L'ID mécanicien ${assignation.mecanicien} ne correspond pas à un utilisateur avec le rôle mécanicien.`);
          }
      }
    }

    // Vérifier le véhicule
    if(this.vehicule){
        const vehiculeExists = await mongoose.model('Vehicule').findById(this.vehicule);
        if (!vehiculeExists) {
            throw new Error(`L'ID véhicule fourni n'existe pas.`);
        }
    }

    next();
  } catch (error) {
    next(error); // Passe l'erreur au gestionnaire d'erreurs de Mongoose/Express
  }
});


module.exports = mongoose.model('Reparation', reparationSchema); 