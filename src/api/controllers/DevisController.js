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
    
    if (!devisId) {
      return res.status(400).json({
        success: false,
        message: 'ID du devis non fourni'
      });
    }
    
    // Récupérer les données de mise à jour du corps de la requête
    const updateData = {
      services: req.body.services || [],
      packs: req.body.packs || [],
      lignesSupplementaires: req.body.lignesSupplementaires || [],
      mecaniciens: req.body.mecaniciens || []
    };
    
    try {
      // Appeler le service avec les données de mise à jour
      const result = await this.service.finalizeDevis(devisId, updateData);
      
      return res.status(200).json({
        success: true,
        message: 'Devis finalisé et prêt à être consulté par le client',
        devis: result.devis
      });
    } catch (error) {
      // Gérer les erreurs spécifiques de validation
      if (
        error.message.includes('déjà finalisé') ||
        error.message.includes('au moins un service') ||
        error.message.includes('au moins un mécanicien')
      ) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      // Sinon, passer l'erreur au middleware d'erreur
      throw error;
    }
  } catch (error) {
    next(error);
  }
};
accepteDevis = async (req, res, next) => {
  try {
    const { devisId } = req.params;
    const clientId = req.user._id;

    // Vérifier que l'utilisateur est un client
    if (req.user.role !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Seul un client peut accepter un devis'
      });
    }

    const result = await this.service.acceptDevis(devisId, clientId);
    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    // Gérer les différents types d'erreurs
    if (error.message === 'Devis non trouvé') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    if (error.message.includes('n\'êtes pas autorisé')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    if (error.message.includes('ne peut plus être accepté') || 
        error.message.includes('doit contenir au moins un service')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
    next(error);
  }
};
declineDevis = async (req, res, next) => {
  try {
    const { devisId } = req.params;
    const clientId = req.user._id;

    // Vérifier que l'utilisateur est un client
    if (req.user.role !== 'client') {
      return res.status(403).json({
        success: false,
        message: 'Seul un client peut refuser un devis'
      });
    }

    const result = await this.service.refuserDevis(devisId, clientId);
    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    // Gérer les différents types d'erreurs
    if (error.message === 'Devis non trouvé') {
      return res.status(404).json({
        success: false,
        message: error.message
      });
    }
    if (error.message.includes('n\'êtes pas autorisé')) {
      return res.status(403).json({
        success: false,
        message: error.message
      });
    }
    if (error.message.includes('ne peut plus être refusé')) {
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
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
    let filter = {
      'mecaniciensTravaillant.mecanicien': mecanicienId
    };

    if (status) filter.status = status;
    if (dateDebut || dateFin) {
      filter.dateCreation = {};
      if (dateDebut) filter.dateCreation.$gte = new Date(dateDebut);
      if (dateFin) filter.dateCreation.$lte = new Date(dateFin);
    }
    if (search) {
      filter.$or = [{ probleme: { $regex: search, $options: 'i' } }];
    }

    // Options de pagination et tri
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { [sortField]: sortOrder === 'desc' ? -1 : 1 }
    };

    // Récupérer les devis filtrés et paginés
    const result = await DevisService.listDevisForMecanicien(mecanicienId, filter, options);

    // Ajouter les tâches associées aux devis
    const devisWithTasks = await Promise.all(
      result.devis.map(async (devisItem) => {
        const tasks = await DevisService.listTasksForDevis(devisItem._id);
        return { ...devisItem.toObject(), tasks };
      })
    );

    res.status(200).json({
      success: true,
      message: 'Devis du mécanicien récupérés avec succès',
      count: devisWithTasks.length,
      total: result.pagination.total,
      pagination: result.pagination,
      data: devisWithTasks
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

// Ajouter un service à un devis existant
addService = async (req, res, next) => {
  try {
    const { devisId } = req.params;
    const serviceData = req.body;

    if (!devisId) {
      return res.status(400).json({
        success: false,
        message: 'ID du devis non fourni'
      });
    }

    // Validation des données du service
    if (!serviceData.service || !serviceData.prix) {
      return res.status(400).json({
        success: false,
        message: 'Les données du service sont incomplètes. Service ID et prix sont requis.'
      });
    }

    const updatedDevis = await this.service.addService(devisId, serviceData);
    res.status(200).json({
      success: true,
      message: 'Service ajouté avec succès au devis',
      data: updatedDevis
    });
  } catch (error) {
    next(error);
  }
};

// Ajouter un pack de services à un devis existant
addServicePack = async (req, res, next) => {
  try {
    const { devisId } = req.params;
    const packData = req.body;

    if (!devisId) {
      return res.status(400).json({
        success: false,
        message: 'ID du devis non fourni'
      });
    }

    // Validation des données du pack
    if (!packData.servicePack || !packData.prix) {
      return res.status(400).json({
        success: false,
        message: 'Les données du pack sont incomplètes. Pack ID et prix sont requis.'
      });
    }

    const updatedDevis = await this.service.addServicePack(devisId, packData);
    res.status(200).json({
      success: true,
      message: 'Pack de services ajouté avec succès au devis',
      data: updatedDevis
    });
  } catch (error) {
    next(error);
  }
};

// --- AJOUT DU CONTROLEUR POUR LES MESSAGES DU CHAT ---
getChatMessages = async (req, res, next) => {
  try {
    const { devisId } = req.params;
    const userId = req.user._id; // ID de l'utilisateur authentifié
    const userRole = req.user.role; // Rôle de l'utilisateur authentifié

    // Vérifier si l'ID est fourni
    if (!devisId) {
      return res.status(400).json({
        success: false,
        message: 'ID du devis non fourni'
      });
    }

    const messages = await this.service.getChatMessages(devisId, userId, userRole);

    // Envoyer la réponse avec les messages
    res.status(200).json({
      success: true,
      message: 'Messages du chat récupérés avec succès',
      data: messages
    });

  } catch (error) {
    // Gérer les erreurs spécifiques (Not Found, Unauthorized, Invalid ID)
    if (error.message === 'ID de devis invalide') {
      return res.status(400).json({ success: false, message: error.message });
    }
    if (error.message === 'Devis non trouvé') {
      return res.status(404).json({ success: false, message: error.message });
    }
    if (error.message === 'Accès non autorisé à ces messages de devis.') {
        return res.status(403).json({ success: false, message: error.message });
    }
    // Passer les autres erreurs au gestionnaire d'erreurs global
    next(error);
  }
}
// --- FIN DE L'AJOUT ---

}

module.exports = new DevisController(); 