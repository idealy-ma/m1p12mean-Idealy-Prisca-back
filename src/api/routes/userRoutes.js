const express = require('express');
const UserController = require('../controllers/UserController');
// Middleware d'authentification
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// Routes publiques
router.post('/login', UserController.login);
router.post('/register', UserController.registerUser);

// Routes protégées pour tous les utilisateurs authentifiés
router.get('/me', protect, UserController.getMe);
router.put('/me', protect, UserController.update);

// Routes pour le manager
router.get('/', protect, authorize('manager'), UserController.getAll);
router.get('/role/:role', protect, authorize('manager'), UserController.getByRole);
router.get('/:id', protect, authorize('manager'), UserController.getById);
router.put('/:id', protect, authorize('manager'), UserController.update);
router.delete('/:id', protect, authorize('manager'), UserController.delete);
router.patch('/:id/status', protect, authorize('manager'), UserController.changeActiveStatus);

// Routes pour le mécanicien (accès limité)
router.get('/mecaniciens', protect, authorize('mecanicien', 'manager'), UserController.getByRole.bind(null, { params: { role: 'mecanicien' } }));
router.get('/clients', protect, authorize('mecanicien', 'manager'), UserController.getByRole.bind(null, { params: { role: 'client' } }));

module.exports = router; 