const BaseController = require('./BaseController');
const Vehiculeservice = require('../services/VehiculeService');

/**
 * Contrôleur pour gérer les utilisateurs
 * Suit le principe d'interface ségrégation (I de SOLID)
 */
class VehiculeController extends BaseController {
  constructor() {
    super(Vehiculeservice);
  }
// Récupérer les véhicules de l'utilisateur connecté
getVehicules = async (req, res) => {
    try {
      // req.user.id provient du middleware d'authentification
      const vehicules = await Vehiculeservice.getVehiculesByUserId(req.user.id);
      
      res.status(200).json({
        success: true,
        data: vehicules
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error.message
      });
    }
  };
 // Créer un véhicule pour l'utilisateur connecté
 async createVehicule(req, res) {
    try {
      const userId = req.user.id; // Vérifie que req.user existe bien

      const vehiculeData = req.body;
      vehiculeData.user = userId; // Ajoute explicitement l'ID utilisateur
  
      const newVehicule = await Vehiculeservice.createVehicule(userId,vehiculeData);
      res.status(201).json({ success: true, data: newVehicule });
    } catch (error) {
      res.status(500).json({ success: false, message: "Erreur lors de la création du véhicule: " + error.message });
    }
  };  
}

module.exports = new VehiculeController(); 