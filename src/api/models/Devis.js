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
  probleme: {
    type: String,
    trim: true
  },
  servicesChoisis: [{
    service: { type: mongoose.Schema.Types.ObjectId, ref: 'Service' },
    prix: Number
  }],
  packsChoisis: [{
    servicePack: { type: mongoose.Schema.Types.ObjectId, ref: 'ServicePack' },
    prix: Number
  }],
  lignesSupplementaires: [{
    description: { type: String },  // Optionnel : Le responsable peut rédiger une description
    prix: { type: Number, required: true }  // Obligatoire : Le prix doit être défini pour chaque ligne
  }],
  total: {
    type: Number,
    default: 0
  },
  dateCreation: {
    type: Date,
    default: Date.now
  },
  dateReponse: {
    type: Date
  },
  status: {
    type: String,
    enum: ['en_attente', 'accepte', 'refuse', 'en_cours', 'termine'],
    default: 'en_attente'
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
   // Calculer le total final
   async updateTotal(devisId) {
    const devis = await DevisModel.findById(devisId)
      .populate('servicesChoisis.service')
      .populate('packsChoisis.servicePack');
    
    let total = 0;
    
    // Calculer le prix des services choisis
    devis.servicesChoisis.forEach(service => {
      total += service.prix;
    });
    
    // Calculer le prix des packs choisis
    devis.packsChoisis.forEach(pack => {
      total += pack.prix;
    });
    
    // Ajouter les lignes supplémentaires
    devis.lignesSupplementaires.forEach(ligne => {
      total += ligne.prix;
    });
    
    // Mettre à jour le total
    devis.total = total;
    await devis.save();
  }

  // Marquer le devis comme "terminé"
  async finalizeDevis(devisId) {
    const devis = await DevisModel.findById(devisId);
    devis.status = 'termine';
    devis.dateReponse = new Date();
    await devis.save();
  }
}

module.exports = new Devis(); 