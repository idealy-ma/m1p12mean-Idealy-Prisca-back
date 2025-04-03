const BaseController = require('./BaseController');
const FactureService = require('../services/FactureService');
const AppError = require('../utils/AppError');

class FactureController extends BaseController {
  constructor() {
    super(FactureService); // Injecter FactureService dans BaseController
    // Binder 'this' pour les méthodes spécifiques si nécessaire
    this.createFromReparation = this.createFromReparation.bind(this);
  }

  /**
   * Crée une facture à partir d'une réparation via une requête POST.
   * POST /api/factures/from-reparation/:reparationId
   * @param {Object} req - La requête Express (params.reparationId, user.id)
   * @param {Object} res - La réponse Express
   * @param {Function} next - Le middleware suivant
   */
  async createFromReparation(req, res, next) {
    try {
      const { reparationId } = req.params;
      // Assurer que l'ID de l'utilisateur (manager) est disponible (ajouté par le middleware d'auth)
      const userId = req.user?.id;

      if (!userId) {
          return next(new AppError('Utilisateur non authentifié ou ID manquant.', 401));
      }
      if (!reparationId) {
          return next(new AppError('ID de la réparation manquant.', 400));
      }

      const facture = await this.service.createFactureFromReparation(reparationId, userId);

      res.status(201).json({
          success: true,
          message: 'Facture créée avec succès.',
          data: facture
      });

    } catch (error) {
        // Passer l'erreur au middleware de gestion d'erreurs global
        next(error);
    }
  }

  // Les méthodes CRUD génériques (getAll, getById, update, delete) sont héritées de BaseController.
  // Si une logique spécifique est nécessaire pour une route, on peut surcharger la méthode ici.
}

module.exports = new FactureController(); 