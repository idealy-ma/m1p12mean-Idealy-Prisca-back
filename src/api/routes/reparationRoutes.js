const express = require('express');
const ReparationController = require('../controllers/ReparationController');
const { protect, authorize } = require('../middlewares/auth'); // Importer protect et authorize

const router = express.Router();

// Appliquer le middleware d'authentification à toutes les routes ci-dessous
router.use(protect);

// Route pour récupérer une réparation par son ID
// GET /api/reparations/:id
// La vérification fine (client proprio, mécano assigné, manager) se fait dans le contrôleur
router.get('/:id', ReparationController.getReparationById);

// Routes à ajouter plus tard pour lister, mettre à jour, ajouter des étapes, etc.
// Exemple de liste pour manager:
// router.get('/', authorize('manager'), ReparationController.listerReparations);
// Exemple de liste pour client (pourrait être ici ou dans clientRoutes):
// router.get('/client/mes-reparations', authorize('client'), ReparationController.listerMesReparations);
// Exemple de liste pour mécanicien (pourrait être ici ou dans mecanicienRoutes):
// router.get('/mecanicien/mes-assignations', authorize('mecanicien'), ReparationController.listerMesAssignations);

// Exemple d'ajout d'étape (accessible manager ou mécano assigné - vérif dans contrôleur ou middleware spécifique)
// router.post('/:id/etapes', authorize('manager', 'mecanicien'), ReparationController.addEtape);
// Exemple de mise à jour statut étape (accessible manager ou mécano assigné)
// router.patch('/:id/etapes/:etapeId/status', authorize('manager', 'mecanicien'), ReparationController.updateEtapeStatus);

module.exports = router; 