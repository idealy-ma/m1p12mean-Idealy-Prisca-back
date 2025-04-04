const express = require('express');
const userRoutes = require('./userRoutes');
const managerRoutes = require('./managerRoutes');
const mecanicienRoutes = require('./mecanicienRoutes');
const clientRoutes = require('./clientRoutes');
const reparationRoutes = require('./reparationRoutes');
// Import facture routes
const factureRoutes = require('./factureRoutes');
const statistiqueRoutes = require('./statistiqueRoutes'); // Ajustez le chemin si nécessaire

// Importez d'autres routes ici au fur et à mesure que vous les créez

const router = express.Router();

// Middleware pour parser le JSON
router.use(express.json());

// Routes d'authentification et de gestion des utilisateurs
router.use('/users', userRoutes);

// Routes spécifiques aux rôles
router.use('/manager', managerRoutes);
router.use('/mecanicien', mecanicienRoutes);
router.use('/client', clientRoutes);
router.use('/stats', statistiqueRoutes); // Toutes les routes commenceront par /api/stats

// Routes pour les réparations
router.use('/reparations', reparationRoutes);

// Use facture routes with /factures prefix
router.use('/factures', factureRoutes);

// Route de test simple
router.get('/', (req, res) => {
  res.send('API Root - Garage V. Parrot');
});

// Ajoutez d'autres routes ici au fur et à mesure que vous les créez
// router.use('/services', serviceRoutes);
// router.use('/voitures', voitureRoutes);
// router.use('/rendez-vous', rendezVousRoutes);
// etc.

module.exports = router; 