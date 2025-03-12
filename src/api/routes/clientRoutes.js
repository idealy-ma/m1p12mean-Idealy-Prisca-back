const express = require('express');
const { protect, authorize } = require('../middlewares/auth');
const jwt = require('jsonwebtoken');
const vehiculeController = require('../controllers/VehiculeController');
const router = express.Router();

// Toutes ces routes nécessitent d'être authentifié en tant que client
router.use(protect);
router.use(authorize('client'));

// Route pour récupérer les véhicules de l'utilisateur connecté
router.get('/vehicules', vehiculeController.getVehicules);

// Route pour créer un véhicule pour l'utilisateur connecté
router.post('/vehicules', vehiculeController.createVehicule);

module.exports = router; 