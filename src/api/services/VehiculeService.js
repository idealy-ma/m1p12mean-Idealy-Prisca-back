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

}
  
  module.exports = new VehiculeSevrice(); 