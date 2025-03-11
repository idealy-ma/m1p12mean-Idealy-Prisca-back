const mongoose = require('mongoose');
const BaseModel = require('./BaseModel');

const vehiculeSchema = new mongoose.Schema({
  immatricule: {
    type: String,
    required: true,
    unique: true
  },
  marque: {
    type: String,
    required: true
  },
  modele: {
    type: String,
    required: true
  },
  dateAjout: {
    type: Date,
    default: Date.now
  },
  photos: {
    type: [String], // Stocke les URLs des photos uploadées
    default: []
  },
  user: {
    type: mongoose.Schema.Types.ObjectId, // Référence à l'utilisateur
    ref: 'User', // Assurez-vous que le modèle d'utilisateur est correct
    required: true
  }
});

// Créer le modèle Mongoose
const VehiculeModel = mongoose.model('Vehicule', vehiculeSchema);

class Vehicule extends BaseModel {
  constructor() {
    super(VehiculeModel);
  }

}
module.exports = new Vehicule(); 
