const express = require('express');
const UserController = require('../controllers/UserController');
// Middleware d'authentification à implémenter
// const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// Routes publiques
router.post('/login', UserController.login);
router.post('/register', UserController.registerUser);

// Routes protégées
// Décommentez ces lignes une fois le middleware d'authentification implémenté
// router.get('/me', protect, UserController.getMe);
// router.put('/me', protect, UserController.update);

// Routes admin (nécessitent des droits d'administrateur)
// router.get('/', protect, authorize('admin'), UserController.getAll);
// router.get('/role/:role', protect, authorize('admin'), UserController.getByRole);
// router.get('/:id', protect, authorize('admin'), UserController.getById);
// router.put('/:id', protect, authorize('admin'), UserController.update);
// router.delete('/:id', protect, authorize('admin'), UserController.delete);
// router.patch('/:id/status', protect, authorize('admin'), UserController.changeActiveStatus);

// Pour le développement, sans authentification
router.get('/', UserController.getAll);
router.get('/role/:role', UserController.getByRole);
router.get('/:id', UserController.getById);
router.put('/:id', UserController.update);
router.delete('/:id', UserController.delete);
router.patch('/:id/status', UserController.changeActiveStatus);

module.exports = router; 