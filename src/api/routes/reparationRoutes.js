const express = require('express');
const ReparationController = require('../controllers/ReparationController');
const { protect, authorize } = require('../middlewares/auth'); // Importer protect et authorize

const router = express.Router();

// Appliquer le middleware d'authentification à toutes les routes ci-dessous
router.use(protect);

// Route pour récupérer la liste des réparations (accessible aux managers pour l'instant)
router.get('/', authorize('manager'), ReparationController.getAllReparations);

// Route pour récupérer les détails d'une réparation
router.get('/:id', ReparationController.getReparationById);

// Route pour mettre à jour le statut d'une étape spécifique
router.patch(
  '/:reparationId/etapes/:etapeId/status',
  authorize('mecanicien', 'manager'), // Passer les rôles comme arguments séparés
  ReparationController.updateEtapeStatus
);

// Route pour ajouter un commentaire à une étape spécifique
router.post(
  '/:reparationId/etapes/:etapeId/commentaires',
  authorize('client', 'mecanicien'), // Autoriser SEULEMENT client et mecanicien
  ReparationController.addCommentToEtape
);

// Route pour ajouter une photo à une réparation
router.post(
  '/:reparationId/photos',
  authorize('mecanicien', 'manager'), // Seuls mécanicien (assigné) et manager peuvent ajouter
  ReparationController.addPhotoToReparation
);

// Route pour mettre à jour le statut global d'une réparation (Manager seulement)
router.patch(
  '/:id/status', // Utiliser :id qui correspond au paramètre de la réparation
  authorize('manager'), // Seul le manager peut changer le statut global
  ReparationController.updateReparationStatus // Nouvelle méthode contrôleur
);

module.exports = router; 