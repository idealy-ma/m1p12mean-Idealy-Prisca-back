const BaseController = require('./BaseController');
const DevisService = require('../services/DevisService');

/**
 * Contrôleur pour gérer les devis
 * Suit le principe de responsabilité unique (S de SOLID)
 */
class DevisController extends BaseController {
  constructor() {
    super(DevisService);
  }

  /**
   * Récupère tous les devis avec pagination et filtrage avancé
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   * @param {Object} next - Fonction next d'Express
   */
  getAllDevis = async (req, res, next) => {
    try {
      // Extraire les paramètres de requête pour le filtrage et la pagination
      const { 
        status, 
        client, 
        dateDebut, 
        dateFin, 
        search, 
        page = 1, 
        limit = 10,
        sortField = 'dateCreation',
        sortOrder = 'desc'
      } = req.query;
      
      // Construire le filtre
      let filter = {};
      
      // Ajouter les filtres si présents
      if (status) filter.status = status;
      if (client) filter.client = client;
      if (dateDebut) filter.dateDebut = dateDebut;
      if (dateFin) filter.dateFin = dateFin;
      if (search) filter.search = search;
      
      // Options de pagination et tri
      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        sort: {}
      };
      options.sort[sortField] = sortOrder === 'desc' ? -1 : 1;
      
      // Utiliser le service pour récupérer les devis avec pagination
      const result = await this.service.getDevisWithPagination(filter, options);
      
      res.status(200).json({
        success: true,
        message: 'Devis récupérés avec succès',
        count: result.devis.length,
        total: result.pagination.total,
        pagination: result.pagination,
        data: result.devis
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Crée un nouveau devis
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   * @param {Object} next - Fonction next d'Express
   */
  createDevis = async (req, res, next) => {
    try {
      // Si l'utilisateur est un client, on utilise son ID
      if (req.user.role === 'client') {
        req.body.client = req.user.id;
      }
      
      const devis = await this.service.create(req.body);
      
      res.status(201).json({
        success: true,
        data: devis
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new DevisController(); 