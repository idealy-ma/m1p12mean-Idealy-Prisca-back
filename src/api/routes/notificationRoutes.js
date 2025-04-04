const express = require('express');
const NotificationController = require('../controllers/NotificationController');
const { protect } = require('../middlewares/auth'); // Importer le middleware d'authentification

const router = express.Router();

// Toutes les routes ici nécessitent que l'utilisateur soit authentifié
router.use(protect);

// Récupérer les notifications de l'utilisateur connecté (paginées)
router.get('/', NotificationController.getNotifications);

// Récupérer le nombre de notifications non lues
router.get('/unread-count', NotificationController.getUnreadCount);

// Marquer toutes les notifications comme lues
router.post('/mark-all-read', NotificationController.markAllAsRead);

// Marquer une notification spécifique comme lue
router.patch('/:notificationId/mark-read', NotificationController.markAsRead);


module.exports = router; 