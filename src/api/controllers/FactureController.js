const BaseController = require('./BaseController');
const FactureService = require('../services/FactureService');
const AppError = require('../utils/AppError');

class FactureController extends BaseController {
  constructor() {
    super(FactureService); // Injecter FactureService dans BaseController
    // Binder 'this' pour les méthodes spécifiques si nécessaire
    this.createFromReparation = this.createFromReparation.bind(this);
    this.addTransaction = this.addTransaction.bind(this);
    this.getStats = this.getStats.bind(this);
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

  // Nouvelle méthode pour ajouter une transaction à une facture
  async addTransaction(req, res, next) {
    try {
      const factureId = req.params.id;
      const transactionData = req.body; 
      
      // Validation basique des données reçues
      if (!factureId) {
          return next(new AppError("L'ID de la facture est requis.", 400));
      }
      if (!transactionData || typeof transactionData !== 'object' || !transactionData.montant || !transactionData.modePaiement) {
          return next(new AppError("Les données de transaction (montant, modePaiement) sont requises.", 400));
      }
      
      // Appeler le service pour ajouter la transaction
      // Le service retournera la facture mise à jour (ou juste la transaction ajoutée? à décider)
      // Pour l'instant, supposons qu'il retourne la facture mise à jour
      const updatedFacture = await this.service.addTransaction(factureId, transactionData);
      
      // Récupérer la dernière transaction ajoutée pour la réponse (plus spécifique)
      const newTransaction = updatedFacture.transactions[updatedFacture.transactions.length - 1];
      
      res.status(201).json({
        success: true,
        message: 'Transaction ajoutée avec succès.',
        data: newTransaction // Retourner la transaction créée
        // Ou retourner la facture complète : data: updatedFacture 
      });

    } catch (error) {
        next(error);
    }
  }

  // Nouvelle méthode pour récupérer les statistiques
  async getStats(req, res, next) {
    try {
        // Appeler le service pour calculer et récupérer les statistiques
        const stats = await this.service.getStats(); 
        
        res.status(200).json({
            success: true,
            data: stats
        });

    } catch (error) {
        next(error);
    }
  }

  // Les méthodes CRUD génériques (getAll, getById, update, delete) sont héritées de BaseController.
  // Si une logique spécifique est nécessaire pour une route, on peut surcharger la méthode ici.
}

module.exports = new FactureController(); 