const BaseController = require('./BaseController');
const ServiceService = require('../services/ServiceService');
const { validationResult } = require('express-validator');

/**
 * Contrôleur pour gérer les utilisateurs
 * Suit le principe d'interface ségrégation (I de SOLID)
 */
class ServiceController extends BaseController {
  constructor() {
    super(ServiceService);
  }
  createService = async (req, res) => {
    try {
      const { name, type,prix,descri } = req.body;
  
      // Vérification des erreurs de validation
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
  
      // Vérifier si le service existe déjà (logique déléguée au service)
      await this.service.checkIfServiceExists(name);

      // Créer le service (logique déléguée au service)
      const newService = await this.service.createNewService(name, type,prix,descri);
  
      return res.status(200).json({ message: 'Service créé avec succès', data: newService });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: error.message || 'Erreur serveur lors de la création du service' });
    }
  };
}
module.exports = new ServiceController(); 
