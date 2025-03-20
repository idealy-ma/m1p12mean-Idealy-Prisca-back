const express = require('express');
const UserController = require('../controllers/UserController');
const ServiceController = require('../controllers/ServiceController');
const ServicePackController = require('../controllers/ServicePackController');
const DevisController = require('../controllers/DevisController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// Toutes ces routes nécessitent d'être authentifié en tant que manager
router.use(protect);
router.use(authorize('manager'));

// Routes de gestion des utilisateurs
router.get('/users', UserController.getAll);
router.get('/users/role/:role', UserController.getByRole);
router.get('/users/:id', UserController.getById);
router.put('/users/:id', UserController.update);
router.delete('/users/:id', UserController.delete);
router.patch('/users/:id/status', UserController.changeActiveStatus);

// Routes de gestion des devis
router.get('/devis', DevisController.getAllDevis);
router.get('/devis/:id', DevisController.getDevisById);

// Autres routes spécifiques au manager
// Par exemple, statistiques, rapports, etc.
router.get('/dashboard', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Tableau de bord du manager',
    data: {
      // Données du tableau de bord
    }
  });
});
// Route pour créer un service unitaire
router.post('/service', ServiceController.createService);
router.get('/service', ServiceController.getAllServices);
// Route pour créer un ServicePack
router.post('/packs', ServicePackController.createServicePack);
module.exports = router; 