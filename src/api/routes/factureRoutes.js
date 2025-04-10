const express = require('express');
const FactureController = require('../controllers/FactureController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();


router.post(
    '/from-reparation/:reparationId',
    protect,
    authorize('manager'),
    FactureController.createFromReparation
);

router.get(
    '/', 
    protect,
    FactureController.getAll
);

router.get(
    '/:id',
    protect,
    FactureController.getById
);

router.put(
    '/:id',
    protect,
    authorize('manager'),
    FactureController.update
);

router.patch(
    '/:id',
    protect,
    authorize('manager'),
    FactureController.update
);

// Nouvelle route pour ajouter une transaction
router.post(
    '/:id/transactions', 
    protect,
    authorize('manager'), // Seul un manager peut enregistrer un paiement
    FactureController.addTransaction // Nouvelle méthode à ajouter au contrôleur
);

router.delete(
    '/:id',
    protect,
    authorize('manager'),
    FactureController.delete 
);

// Nouvelle route pour les statistiques
router.get(
    '/stats/general', // Utiliser un chemin plus spécifique comme /stats/general
    protect,
    authorize('manager'), // Seuls les managers peuvent voir les stats globales
    FactureController.getStats // Nouvelle méthode à ajouter au contrôleur
);

module.exports = router; 