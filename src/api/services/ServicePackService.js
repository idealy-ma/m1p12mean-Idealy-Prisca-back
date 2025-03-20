const BaseService = require('./BaseService');
const ServiceService= require('./ServiceService');
const ServicePackModel = require('../models/ServicePack');
class ServicePackService extends BaseService {
    constructor() {
        super(ServicePackModel);
    }
     // Vérifie si un pack existe déjà
  async checkIfPackExists(name) {
    const existingPack = await this.repository.model.findOne({ name });
    if (existingPack) {
      throw new Error('Pack déjà existant');
    }
  }

  // Vérifie que les services fournis existent
  async validateServices(services) {
    if (!services || services.length < 2) {
      throw new Error('Un Pack doit contenir au moins 2 services existants');
    }

    const foundServices = await ServiceService.repository.model.find({ _id: { $in: services } });
    if (foundServices.length !== services.length) {
      throw new Error('Certains services fournis n\'existent pas');
    }
  }

  // Création d'un nouveau pack
  async createServicePack(name, services,remise) {
    const newPack = { name, services ,remise};
    await this.repository.model.create(newPack);
    return newPack;
  }

}
module.exports = new ServicePackService(); 
