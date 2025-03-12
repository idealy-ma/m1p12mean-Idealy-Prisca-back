const BaseService = require('./BaseService');
const VehiculeModel = require('../models/Vehicule');
class VehiculeSevrice extends BaseService {
    constructor() {
      super(VehiculeModel);
    }
    // Fonction pour récupérer les véhicules par l'ID de l'utilisateur
  async getVehiculesByUserId(userId) {
    try {
      // Cherche tous les véhicules associés à cet utilisateur
      return await this.repository.model.find({ user: userId }).exec();
    } catch (error) {
      throw new Error('Error retrieving vehicles: ' + error.message);
    }
  }

  // Créer un nouveau véhicule pour un utilisateur
  async createVehicule(userId, vehiculeData) {
    try {
      // Vérifier si un véhicule avec le même immatricule existe déjà
      const existingVehicule = await this.repository.model.findOne({ immatricule: vehiculeData.immatricule });

      if (existingVehicule) {
        throw new Error('Un véhicule avec cette immatricule existe déjà.');
      }

      // Ajouter l'ID de l'utilisateur au véhicule
      vehiculeData.user = userId;

      // Créer un nouveau véhicule
      const newVehicule = await this.repository.model.create(vehiculeData);
      return newVehicule;
    } catch (error) {
      throw new Error('Erreur lors de la création du véhicule: ' + error.message);
    }
  }

}
  
  module.exports = new VehiculeSevrice(); 