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
// Route pour suspendre un utilisateur
router.patch('/users/:id/suspend', UserController.suspendUser);
// Route pour réactiver un utilisateur suspendu
router.patch('/users/:id/reactivate', UserController.reactivateUser);
// Route pour ajouter un employé (mécanicien ou manager)
router.post('/employees', UserController.registerEmployee);
// Route pour supprimer un employé (mécanicien ou manager)
router.delete('/employees/:id', UserController.deleteEmployee);
// Route pour modifier le rôle d'un employé
router.patch('/employees/:id/role', UserController.changeEmployeeRole);
// Route pour récupérer la liste des employés (mécaniciens et managers)
router.get('/employees', UserController.getAllEmployees);
// Route pour récupérer les mécaniciens disponibles pour une date spécifique
router.get('/mecaniciens/disponibles', UserController.getAvailableMechanicsByDate);

// Routes de gestion des devis
router.get('/devis', DevisController.getAllDevis);
router.get('/devis/:id', DevisController.getDevisById);
// Finaliser un devis et ajouter des services, packs, lignes supplémentaires et mécaniciens en une seule opération
router.post('/devis/:devisId/finaliser', DevisController.finalizeDevis);
// Ajouter une ligne supplémentaire à un devis
router.post('/devis/:devisId/ligne-supplementaire', DevisController.addLigneSupplementaire);
// Route pour assigner des mécaniciens à un devis
router.post('/devis/assigner-mecaniciens', DevisController.assignMecaniciens);

// --- AJOUT ROUTE HISTORIQUE CHAT ---
router.get('/devis/:devisId/messages', DevisController.getChatMessages);
// --- FIN AJOUT ---

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