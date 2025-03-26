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
  getAllServicesPack = async (req, res) => {
    try {
      const servicespack = await this.service.getAllServicesPack();
      return res.status(200).json({ success: true, message: 'Liste des servicespack récupérée', data: servicespack });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Erreur serveur lors de la récupération des services' });
    }
  };
}
module.exports = new ServicePackController(); 
