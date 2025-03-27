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
        req.body.client = req.user._id;
      }
      
      const devis = await this.service.createDevis(req.body);
      
      res.status(201).json({
        success: true,
        data: devis
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Récupère les détails d'un devis par son ID
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   * @param {Object} next - Fonction next d'Express
   */
  getDevisById = async (req, res, next) => {
    try {
      const { id } = req.params;

      // Vérifier si l'ID est fourni
      if (!id) {
        return res.status(400).json({
          success: false,
          message: 'ID du devis non fourni'
        });
      }

      const devis = await this.service.getDevisById(id);

      res.status(200).json({
        success: true,
        message: 'Devis récupéré avec succès',
        data: devis
      });
    } catch (error) {
      // Gérer les différents types d'erreurs
      if (error.message === 'ID de devis invalide') {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      if (error.message === 'Devis non trouvé') {
        return res.status(404).json({
          success: false,
          message: error.message
        });
      }
      next(error);
    }
  }
  // Ajouter une ligne supplémentaire
addLigneSupplementaire = async (req, res, next) => {
  try {
    const { devisId } = req.params;
    const ligne = req.body;
    const updatedDevis = await this.service.addLigneSupplementaire(devisId, ligne);
    res.status(200).json(updatedDevis);
  } catch (error) {
    next(error); // Utilisation de `next()` pour la gestion d'erreurs centralisée
  }
};

// Finaliser un devis
finalizeDevis = async (req, res, next) => {
  try {
    const { devisId } = req.params;
    const result = await this.service.finalizeDevis(devisId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
accepteDevis = async (req, res, next) => {
  try {
    const { devisId } = req.params;
    const result = await this.service.acceptDevis(devisId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
declineDevis = async (req, res, next) => {
  try {
    const { devisId } = req.params;
    const result = await this.service.refuserDevis(devisId);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

// Obtenir tous les devis d'un client
getDevisByClient = async (req, res, next) => {
  try {
    const { clientId } = req.params;
    const devis = await this.service.getDevisByClient(clientId);
    res.status(200).json(devis);
  } catch (error) {
    next(error);
  }
};

/**
 * Récupère les devis du client connecté avec pagination et filtrage avancé
 * @param {Object} req - Requête Express
 * @param {Object} res - Réponse Express
 * @param {Object} next - Fonction next d'Express
 */
getMyDevis = async (req, res, next) => {
  try {
    // Extraire les paramètres de requête pour le filtrage et la pagination
    const { 
      status, 
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
    const result = await this.service.getDevisByClientWithPagination(req.user._id, filter, options);
    
    res.status(200).json({
      success: true,
      message: 'Mes devis récupérés avec succès',
      count: result.devis.length,
      total: result.pagination.total,
      pagination: result.pagination,
      data: result.devis
    });
  } catch (error) {
    next(error);
  }
};

async assignMecaniciens(req, res, next) {
  try {
    const { devisId, mecaniciensIds, heuresDeTravail } = req.body;

    if (!devisId || !mecaniciensIds || !heuresDeTravail) {
      return res.status(400).json({ message: "Tous les champs sont requis." });
    }

    // Appel de la méthode du service pour assigner les mécaniciens
    const devis = await DevisService.assignMecaniciens(devisId, mecaniciensIds, heuresDeTravail);

    return res.status(200).json({
      message: 'Mécaniciens assignés avec succès.',
      devis
    });
  } catch (error) {
    next(error); // Gestion des erreurs
  }
}
getUnavailableDates = async (req, res) => {
  try {
    const datesBloquees = await DevisService.getUnavailableDates();
    return res.json({ success: true, dates: datesBloquees });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};
toggleTask= async (req, res, next) => {
  try {
    const { devisId, taskId, mecanicienId, type } = req.body; // Récupérer les données du body

    // Appeler la fonction toggleTask
    const updatedTask = await this.service.toggleTask(devisId, taskId, mecanicienId, type);

    // Retourner la tâche mise à jour
    return res.status(200).json({
      message: 'Tâche mise à jour avec succès',
      task: updatedTask
    });
  } catch (error) {
    // En cas d'erreur, renvoyer une erreur 400
    return res.status(400).json({
      message: error.message || 'Erreur lors de la mise à jour de la tâche'
    });
  }
};
async getDevisForMecanicien(req, res, next) {
  const mecanicienId = req.user._id; // ID du mécanicien connecté
  
  try {
    // Extraire les paramètres de requête pour la pagination et le filtrage
    const { 
      page = 1, 
      limit = 10, 
      sortField = 'dateCreation', 
      sortOrder = 'desc' 
    } = req.query;
    
    const filter = {}; // Vous pouvez ajouter des filtres supplémentaires ici si nécessaire
    
    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      sort: { [sortField]: sortOrder === 'desc' ? -1 : 1 }
    };
    
    // Récupération des devis avec pagination
    const result = await DevisService.listDevisForMecanicien(mecanicienId, filter, options);
    
    return res.status(200).json({
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


// Récupérer toutes les tâches d'un devis spécifique
async getTasksForDevis(req, res, next) {
  const { devisId } = req.params; // Récupérer l'ID du devis depuis les paramètres de l'URL

  try {
    const tasks = await DevisService.listTasksForDevis(devisId);
    return res.status(200).json(tasks);
  } catch (error) {
    next(error); // Gestion des erreurs
  }
}

}

module.exports = new DevisController(); 