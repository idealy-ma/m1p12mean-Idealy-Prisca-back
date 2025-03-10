const express = require('express');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// Toutes ces routes nécessitent d'être authentifié en tant que client
router.use(protect);
router.use(authorize('client'));

// Routes accessibles aux clients
router.get('/dashboard', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Tableau de bord du client',
    data: {
      // Données du tableau de bord
    }
  });
});


module.exports = router; 