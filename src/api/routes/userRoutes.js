const express = require('express');
const UserController = require('../controllers/UserController');
// Middleware d'authentification
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// Routes publiques
router.post('/login', UserController.login);
router.post('/register', UserController.registerUser);

// Routes protégées
router.get('/clients', protect, authorize('mecanicien', 'manager'), UserController.getByRole.bind(null, { params: { role: 'client' } }));
// Route pour qu'un utilisateur puisse mettre à jour ses propres informations
router.put('/profile', protect, UserController.updateProfile);
// Route pour récupérer ses propres informations
router.get('/profile', protect, UserController.getMe);

module.exports = router; 