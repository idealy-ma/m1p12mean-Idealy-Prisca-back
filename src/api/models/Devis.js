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
    prix: Number,
    note: { type: String },
    priorite: { type: String },
    completed: Boolean,
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null } 
  }],
  packsChoisis: [{
    servicePack: { type: mongoose.Schema.Types.ObjectId, ref: 'ServicePack' },
    prix: Number,
    note: { type: String },
    priorite: { type: String },
    completed: Boolean,
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
  }],
  lignesSupplementaires: [{
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true }, // Ajout d'un ObjectId
    nom: { type: String }, 
    prix: { type: Number, required: true },
    quantite: { type: Number },
    type: { type: String },
    note: { type: String },
    priorite: { type: String },
    completed: Boolean,
    completedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null } 
  }],
  mecaniciensTravaillant: [{
    mecanicien: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    note: { type: String },
    tarifHoraire: Number,
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
  preferredDate: {
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
  
    // Vérifier et calculer le prix des services choisis
    if (devis.servicesChoisis && devis.servicesChoisis.length > 0) {
      devis.servicesChoisis.forEach(service => {
        if (service.prix) {
          total += service.prix;
        }
      });
    }
  
    // Vérifier et calculer le prix des packs choisis
    if (devis.packsChoisis && devis.packsChoisis.length > 0) {
      devis.packsChoisis.forEach(pack => {
        if (pack.prix) {
          total += pack.prix;
        }
      });
    }
  
    // Vérifier et ajouter les lignes supplémentaires
    if (devis.lignesSupplementaires && devis.lignesSupplementaires.length > 0) {
      devis.lignesSupplementaires.forEach(ligne => {
        if (ligne.prix && ligne.quantite) {
          total += ligne.prix * ligne.quantite;
        }
      });
    }
  
    // Vérifier et calculer le salaire des mécaniciens en fonction de leur heure de travail et de leur tarif horaire
    if (devis.mecaniciensTravaillant && devis.mecaniciensTravaillant.length > 0) {
      devis.mecaniciensTravaillant.forEach(mecanicien => {
        if (mecanicien.mecanicien && mecanicien.mecanicien.tarifHoraire && mecanicien.heureDeTravail) {
          total += mecanicien.heureDeTravail * mecanicien.mecanicien.tarifHoraire;
        }
      });
    }
  
    // Mettre à jour le total
    devis.total = total;
    await devis.save();
  }
  
  // Marquer le devis comme "terminé"
  async acceptDevis(devisId) {
    const devis = await DevisModel.findById(devisId);
    devis.status = 'accepte';
    devis.dateReponse = new Date();
    await devis.save();
  }
  // Marquer le devis comme "terminé"
  async declineDevis(devisId) {
    const devis = await DevisModel.findById(devisId);
    devis.status = 'refuse';
    devis.dateReponse = new Date();
    await devis.save();
  }

  // Marquer le devis comme "terminé"
  async finalizeDevis(devisId) {
    const devis = await DevisModel.findById(devisId);
    
    if (!devis) {
      console.error(`Devis non trouvé: ${devisId}`);
      throw new Error('Devis non trouvé');
    }

    if (devis.status === 'accepte') {
      throw new Error('Ce devis est déjà acceptee');
    }

    if (devis.status === 'refuse') {
      throw new Error('Ce devis est déjà refusé');
    }

    console.log(`Finalisation du devis ${devisId} pour le client ${devis.client}`);
    
    devis.status = 'termine';
    devis.dateReponse = new Date();
    
    try {
      await devis.save();
      console.log(`Devis ${devisId} finalisé avec succès`);
      return devis;
    } catch (error) {
      console.error(`Erreur lors de la finalisation du devis ${devisId}:`, error);
      throw error;
    }
  }
  
}

module.exports = new Devis(); 