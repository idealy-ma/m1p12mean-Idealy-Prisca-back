const express = require('express');
const UserController = require('../controllers/UserController');
// Middleware d'authentification
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// Routes publiques
router.post('/login', UserController.login);
router.post('/register', UserController.registerUser);

// Route protégée
router.get('/clients', protect, authorize('mecanicien', 'manager'), UserController.getByRole.bind(null, { params: { role: 'client' } }));

module.exports = router; 