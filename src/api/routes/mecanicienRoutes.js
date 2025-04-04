const express = require('express');
const UserController = require('../controllers/UserController');
const DevisController = require('../controllers/DevisController');
const { protect, authorize } = require('../middlewares/auth');
const ReparationController = require('../controllers/ReparationController');

const router = express.Router();

// Toutes ces routes nécessitent d'être authentifié en tant que mécanicien
router.use(protect);
router.use(authorize('mecanicien'));

// Autres routes spécifiques au mécanicien

// Route pour basculer l'état de la tâche (checkbox)
router.patch('/toggle-task', DevisController.toggleTask);
router.get('/devis', DevisController.getDevisForMecanicien);

// Route pour obtenir toutes les tâches d'un devis spécifique
router.get('/devis/:devisId/tasks', DevisController.getTasksForDevis);

// Route pour obtenir les réparations "en cours" assignées au mécanicien
router.get('/reparations/en-cours', ReparationController.getMecanicienReparationsEnCours);

// Route pour récupérer les réparations assignées au mécanicien (Exemple, à adapter)
// router.get('/reparations/assignees', ReparationController.getAssignedReparations);

// *** Nouvelle Route pour l'historique ***
router.get('/history', ReparationController.getMechanicHistory);

// Route pour mettre à jour le statut d'une étape (Exemple, à adapter)
// router.patch('/reparations/:reparationId/etapes/:etapeId/status', ReparationController.updateEtapeStatusByMechanic);

// Par exemple, gestion des réparations, des rendez-vous, etc.
router.get('/dashboard', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Tableau de bord du mécanicien',
    data: {
      // Données du tableau de bord
    }
  });
});

module.exports = router; 