const express = require('express');
const StatistiqueController = require('../controllers/StatistiqueController');
const { protect, authorize } = require('../middlewares/auth'); // Importer les middlewares d'authentification et d'autorisation

const router = express.Router();

// Appliquer la protection et l'autorisation à toutes les routes de statistiques
// Seuls les utilisateurs connectés avec le rôle 'manager' peuvent accéder
router.use(protect);
router.use(authorize('manager'));

// Définir les routes spécifiques pour chaque statistique

// Route pour le chiffre d'affaires total
// GET /api/stats/chiffre-affaires?dateDebut=YYYY-MM-DD&dateFin=YYYY-MM-DD
router.get(
    '/chiffre-affaires',
    StatistiqueController.getChiffreAffaires
);

// Route pour le chiffre d'affaires par type
// GET /api/stats/ca-par-type?dateDebut=YYYY-MM-DD&dateFin=YYYY-MM-DD
router.get(
    '/ca-par-type',
    StatistiqueController.getCAParType
);

// Route pour les statistiques sur les statuts des devis
// GET /api/stats/statuts-devis?dateDebut=YYYY-MM-DD&dateFin=YYYY-MM-DD
router.get(
    '/statuts-devis',
    StatistiqueController.getStatutsDevis
);

// Ajouter d'autres routes ici si d'autres statistiques sont implémentées

module.exports = router;

