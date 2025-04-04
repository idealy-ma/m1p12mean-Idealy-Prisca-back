const NotificationService = require('../services/NotificationService');
const BaseController = require('./BaseController'); // Si vous utilisez une structure BaseController

class NotificationController /* extends BaseController */ {
  constructor() {
    // super(NotificationService); // Si vous héritez
    this.service = NotificationService; // Ou affectation directe
  }

  /**
   * Récupère les notifications paginées pour l'utilisateur connecté.
   */
  getNotifications = async (req, res, next) => {
    try {
      const userId = req.user._id; // Assure que 'protect' middleware est utilisé avant
      const { page = 1, limit = 10 } = req.query;

      const result = await this.service.getUserNotifications(userId, { page, limit });

      res.status(200).json({
        success: true,
        message: 'Notifications récupérées avec succès',
        count: result.notifications.length,
        pagination: result.pagination,
        data: result.notifications
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Récupère le nombre de notifications non lues pour l'utilisateur connecté.
   */
  getUnreadCount = async (req, res, next) => {
    try {
      const userId = req.user._id;
      const count = await this.service.countUnread(userId);
      res.status(200).json({
        success: true,
        message: 'Nombre de notifications non lues récupéré.',
        data: { count } // Renvoyer le compte dans un objet
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Marque une notification spécifique comme lue.
   */
  markAsRead = async (req, res, next) => {
    try {
      const userId = req.user._id;
      const { notificationId } = req.params;

      const updated = await this.service.markAsRead(notificationId, userId);

      if (updated) {
        res.status(200).json({
          success: true,
          message: 'Notification marquée comme lue.'
        });
      } else {
        // Soit la notif n'existe pas, soit elle n'appartient pas à l'user, soit déjà lue
        res.status(404).json({
          success: false,
          message: 'Notification non trouvée ou déjà lue.'
        });
      }
    } catch (error) {
      if (error.message === 'Notification ID invalide.') {
          return res.status(400).json({ success: false, message: error.message });
      }
      next(error);
    }
  };

  /**
   * Marque toutes les notifications non lues de l'utilisateur comme lues.
   */
  markAllAsRead = async (req, res, next) => {
    try {
      const userId = req.user._id;
      const count = await this.service.markAllAsRead(userId);

      res.status(200).json({
        success: true,
        message: `${count} notification(s) marquée(s) comme lues.`
      });
    } catch (error) {
      next(error);
    }
  };

}

module.exports = new NotificationController(); 