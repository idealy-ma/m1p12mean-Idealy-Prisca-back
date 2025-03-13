const mongoose = require('mongoose');
const BaseModel = require('./BaseModel');

const devisSchema = new mongoose.Schema({
  client: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Le client est requis']
  },
  vehicule: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Vehicule',
    required: [true, 'Le véhicule est requis']
  },
  description: {
    type: String,
    required: [true, 'La description des services demandés est requise'],
    trim: true
  },
  dateCreation: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['en_attente', 'accepte', 'refuse', 'en_cours', 'termine'],
    default: 'en_attente'
  },
  montantEstime: {
    type: Number,
    default: 0
  },
  dateReponse: {
    type: Date
  },
  reponduPar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Créer un index pour améliorer les performances des requêtes
devisSchema.index({ client: 1, status: 1 });

const DevisModel = mongoose.model('Devis', devisSchema);

/**
 * Classe Devis qui étend BaseModel
 * Suit le principe de substitution de Liskov (L de SOLID)
 */
class Devis extends BaseModel {
  constructor() {
    super(DevisModel);
  }
}

module.exports = new Devis(); 