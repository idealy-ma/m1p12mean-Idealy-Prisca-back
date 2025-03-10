const express = require('express');
const UserController = require('../controllers/UserController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// Toutes ces routes nécessitent d'être authentifié en tant que mécanicien
router.use(protect);
router.use(authorize('mecanicien'));

// Autres routes spécifiques au mécanicien
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