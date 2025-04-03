const express = require('express');
const FactureController = require('../controllers/FactureController');
const { protect, authorize } = require('../middlewares/auth'); // Middleware d'authentification et d'autorisation

const router = express.Router();

// === Routes Spécifiques ===

// POST /api/factures/from-reparation/:reparationId - Créer une facture depuis une réparation
// Seul un manager peut déclencher cette action.
router.post(
    '/from-reparation/:reparationId',
    protect, // Assure que l'utilisateur est connecté
    authorize('manager'), // Assure que l'utilisateur a le rôle 'manager'
    FactureController.createFromReparation // Méthode spécifique du contrôleur
);

// === Routes CRUD Standard (utilisant BaseController) ===

// GET /api/factures - Récupérer toutes les factures (avec filtres/pagination/tri via query params)
// Accessible aux managers pour la vue globale, et potentiellement aux clients (avec filtrage par client dans le service)
router.get(
    '/', 
    protect, // Tous les utilisateurs connectés (clients, managers) peuvent voir des factures
    // authorize('manager', 'client'), // Décommenter et ajuster si nécessaire
    // NOTE: Le filtrage pour s'assurer qu'un client ne voit que SES factures 
    // doit être implémenté dans le service FactureService.getAll (ou une méthode dédiée)
    FactureController.getAll // Méthode héritée
);

// GET /api/factures/:id - Récupérer une facture par ID
// Accessible aux managers et au client concerné.
router.get(
    '/:id',
    protect,
    // authorize('manager', 'client'), // Autorisation plus fine dans le service/contrôleur si nécessaire
    // TODO: Ajouter une vérification dans le service/contrôleur pour s'assurer qu'un client accède uniquement à ses propres factures.
    FactureController.getById // Méthode héritée
);

// PUT /api/factures/:id - Mettre à jour une facture (principalement le statut ou les lignes en brouillon)
// Accessible uniquement aux managers.
router.put(
    '/:id',
    protect,
    authorize('manager'),
    FactureController.update // Méthode héritée
);

// DELETE /api/factures/:id - Supprimer une facture (généralement non recommandé, préférer annulation)
// Accessible uniquement aux managers (si cette action est permise).
router.delete(
    '/:id',
    protect,
    authorize('manager'),
    FactureController.delete // Méthode héritée
);

// === Autres Routes Possibles ===
// Ex: Mettre à jour le statut (validation, émission, annulation)
// router.patch('/:id/status', protect, authorize('manager'), FactureController.updateStatus); // Méthode à créer
// Ex: Ajouter une transaction de paiement
// router.post('/:id/transactions', protect, authorize('manager'), FactureController.addTransaction); // Méthode à créer

module.exports = router; 