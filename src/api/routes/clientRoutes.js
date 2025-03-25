const express = require('express');
const { protect, authorize } = require('../middlewares/auth');
const jwt = require('jsonwebtoken');
const vehiculeController = require('../controllers/VehiculeController');
const router = express.Router();
const DevisController = require('../controllers/DevisController');
const ServiceController = require('../controllers/ServiceController');
const ServicePackController = require('../controllers/ServicePackController');
// Toutes ces routes nécessitent d'être authentifié en tant que client
router.use(protect);
router.use(authorize('client'));

// Route pour récupérer les véhicules de l'utilisateur connecté
router.get('/vehicules', vehiculeController.getVehicules);

// Route pour créer un véhicule pour l'utilisateur connecté
router.post('/vehicules', vehiculeController.createVehicule);

// Créer un devis
router.post('/devis', DevisController.createDevis);
// Obtenir tous les devis d'un client
router.get('/devis/:clientId', DevisController.getDevisByClient);
router.get('/devis/:id', DevisController.getDevisById);

router.get('/service', ServiceController.getAllServices);
router.get('/servicePack', ServicePackController.getAllServicesPack);

module.exports = router; 