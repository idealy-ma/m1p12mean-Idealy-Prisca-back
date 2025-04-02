const express = require('express');
const { protect, authorize } = require('../middlewares/auth');
const jwt = require('jsonwebtoken');
const vehiculeController = require('../controllers/VehiculeController');
const router = express.Router();
const DevisController = require('../controllers/DevisController');
const ServiceController = require('../controllers/ServiceController');
const ServicePackController = require('../controllers/ServicePackController');
const ClientController = require('../controllers/ClientController');
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
router.get('/devis', DevisController.getMyDevis);
router.get('/devis/:id', DevisController.getDevisById);
// Route pour récupérer les dates indisponibles
router.get('/dates-indisponibles', DevisController.getUnavailableDates);
router.post('/devis/:devisId/accept', DevisController.accepteDevis);
router.post('/devis/:devisId/decline', DevisController.declineDevis);
router.get('/devis/:devisId/tasks', DevisController.getTasksForDevis);

// Routes Réparations
router.get('/reparations', ClientController.getClientReparations);

router.get('/services', ServiceController.getAllServices);
router.get('/servicePacks', ServicePackController.getAllServicesPack);

module.exports = router; 