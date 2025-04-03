const express = require('express');
const userRoutes = require('./userRoutes');
const managerRoutes = require('./managerRoutes');
const mecanicienRoutes = require('./mecanicienRoutes');
const clientRoutes = require('./clientRoutes');
const reparationRoutes = require('./reparationRoutes');
// Importez d'autres routes ici au fur et à mesure que vous les créez

const router = express.Router();

// Routes d'authentification et de gestion des utilisateurs
router.use('/users', userRoutes);

// Routes spécifiques aux rôles
router.use('/manager', managerRoutes);
router.use('/mecanicien', mecanicienRoutes);
router.use('/client', clientRoutes);

// Routes pour les réparations
router.use('/reparations', reparationRoutes);

// Ajoutez d'autres routes ici au fur et à mesure que vous les créez
// router.use('/services', serviceRoutes);
// router.use('/voitures', voitureRoutes);
// router.use('/rendez-vous', rendezVousRoutes);
// etc.

module.exports = router; 