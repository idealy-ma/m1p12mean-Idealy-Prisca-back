const BaseService = require('./BaseService');
const ServiceModel = require('../models/Service');
class ServiceService extends BaseService {
    constructor() {
        super(ServiceModel);
    }
    // Fonction pour vérifier si un service existe déjà
    async checkIfServiceExists(name) {
    try {
      // Cherche un service avec le même nom
      const existingService = await this.repository.model.findOne({ name });
      if (existingService) {
        throw new Error('Service déjà existant');
      }
    } catch (error) {
      throw new Error('Error checking service existence: ' + error.message);
    }
  }
  
  // Fonction pour créer un service
  async createNewService(name, type,descri) {
    try {
      // Crée un nouveau service
      const newService = { name, type,descri };
      await this.repository.model.create(newService);
      return newService;
    } catch (error) {
      throw new Error('Error creating new service: ' + error.message);
    }
  }

}
module.exports = new ServiceService(); 
