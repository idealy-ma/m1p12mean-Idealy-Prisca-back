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
    note: { type: String },
    priorite: { type: String },
    completed: Boolean
  }],
  packsChoisis: [{
    servicePack: { type: mongoose.Schema.Types.ObjectId, ref: 'ServicePack' },
    note: { type: String },
    priorite: { type: String },
    completed: Boolean
  }],
  lignesSupplementaires: [{
    nom: { type: String }, 
    prix: { type: Number, required: true },
    quantite:  { type: Number },
    type: { type: String },
    note: { type: String },
    priorite: { type: String },
    completed: Boolean
  }],
  mecaniciensTravaillant:[{
    mecanicien: { type: mongoose.Schema.Types.ObjectId, ref: 'Users' }, 
    note: { type: String },
    heureDeTravail: { type: Number },
    debut: { 
      type: Date, 
      default: null 
    }    
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
    enum: ['en_attente', 'accepte', 'refuse', 'termine'],
    default: 'en_attente'
  },
  reponduPar: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  preferredDate:{
    type: Date
  },
  urlPhotos: {
    type: [String],
    default: []     
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
      .populate('packsChoisis.servicePack')
      .populate('mecaniciensTravaillant.mecanicien'); // Assurez-vous de peupler les mécaniciens pour obtenir leurs informations
    
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
      total += ligne.prix * ligne.quantite;
    });
  
    // Calculer le salaire des mécaniciens en fonction de leur heure de travail et de leur tarif horaire
    devis.mecaniciensTravaillant.forEach(mecanicien => {
      if (mecanicien.mecanicien && mecanicien.mecanicien.tarifHoraire) {
        total += mecanicien.heureDeTravail * mecanicien.mecanicien.tarifHoraire;
      }
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