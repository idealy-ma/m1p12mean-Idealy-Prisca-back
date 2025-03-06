const express = require('express');
const userRoutes = require('./userRoutes');
// Importez d'autres routes ici au fur et à mesure que vous les créez

const router = express.Router();

// Définir les routes de base
router.use('/users', userRoutes);
// Ajoutez d'autres routes ici au fur et à mesure que vous les créez
// router.use('/services', serviceRoutes);
// router.use('/voitures', voitureRoutes);
// router.use('/rendez-vous', rendezVousRoutes);
// etc.

module.exports = router; 