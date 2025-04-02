const express = require('express');
const ReparationController = require('../controllers/ReparationController');
const { protect, authorize } = require('../middlewares/auth'); // Importer protect et authorize

const router = express.Router();

// Appliquer le middleware d'authentification à toutes les routes ci-dessous
router.use(protect);

// Route pour récupérer la liste des réparations (accessible aux managers pour l'instant)
router.get('/', authorize('manager'), ReparationController.getAllReparations);

router.get('/:id', ReparationController.getReparationById);

module.exports = router; 