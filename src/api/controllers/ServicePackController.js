const BaseController = require('./BaseController');
const ServicePackService = require('../services/ServicePackService');


class ServicePackController extends BaseController {
  constructor() {
    super(ServicePackService);
  }
  createServicePack = async (req, res) => {
    try {
      const { name, services ,remise} = req.body;
  
      // Vérifier si le pack existe déjà
      await this.service.checkIfPackExists(name);
  
      // Vérifier la validité des services
      await this.service.validateServices(services);
  
      // Créer le pack
      const newPack = await this.service.createServicePack(name, services,remise);
  
      return res.status(201).json({ message: 'Pack créé avec succès', data: newPack });
    } catch (error) {
      console.error(error);
      return res.status(400).json({ message: error.message });
    }
  };
}
module.exports = new ServicePackController(); 
