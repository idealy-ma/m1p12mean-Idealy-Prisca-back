const ReparationService = require('../services/ReparationService');
const mongoose = require('mongoose');

class ReparationController {

  /**
   * Récupère les détails d'une réparation par son ID.
   * Vérifie les droits d'accès :
   * - Le client propriétaire peut voir sa réparation.
   * - Le mécanicien assigné peut voir la réparation.
   * - Un manager peut voir n'importe quelle réparation.
   * @param {Object} req - Requête Express (avec req.user venant du middleware protect)
   * @param {Object} res - Réponse Express
   * @param {Object} next - Fonction next d'Express
   */
  getReparationById = async (req, res, next) => {
    try {
      const reparationId = req.params.id;
      const userId = req.user._id;
      const userRole = req.user.role;

      if (!mongoose.Types.ObjectId.isValid(reparationId)) {
        return res.status(400).json({ 
          success: false, 
          message: 'ID de réparation invalide.',
          error: 'INVALID_ID'
        });
      }

      const reparation = await ReparationService.getReparationByIdAvecDetails(reparationId);

      if (!reparation) {
        return res.status(404).json({ 
          success: false, 
          message: 'Réparation non trouvée.',
          error: 'NOT_FOUND'
        });
      }

      // Vérification des droits d'accès
      let canAccess = false;
      if (userRole === 'manager') {
        canAccess = true;
      } else if (userRole === 'client' && reparation.client?._id.equals(userId)) {
        canAccess = true;
      } else if (userRole === 'mecanicien' && reparation.mecaniciensAssignes?.some(a => a.mecanicien?._id.equals(userId))) {
        canAccess = true;
      }

      if (!canAccess) {
        return res.status(403).json({ 
          success: false, 
          message: 'Accès non autorisé à cette réparation.',
          error: 'FORBIDDEN'
        });
      }

      res.status(200).json({
        success: true,
        data: reparation
      });

    } catch (error) {
      console.error("Erreur dans getReparationById:", error);
      next(error);
    }
  }

  /**
   * Récupère la liste de toutes les réparations (avec pagination/filtrage).
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   * @param {Object} next - Fonction next d'Express
   */
  getAllReparations = async (req, res, next) => {
    try {
      // Extraire les paramètres de pagination, tri et filtre
      const { page = 1, limit = 10, sort: sortQuery, ...filter } = req.query;
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skipNum = (pageNum - 1) * limitNum;
      
      // Parser le paramètre de tri JSON ou utiliser le défaut
      let sortOption = { dateCreationReparation: -1 }; // Défaut
      if (sortQuery) {
        try {
          sortOption = JSON.parse(sortQuery);
        } catch (e) {
          console.warn("Paramètre de tri invalide, utilisation du tri par défaut:", sortQuery);
          // Garder le tri par défaut en cas d'erreur de parsing
        }
      }
      
      // Appeler le service avec les arguments séparés
      const results = await ReparationService.getAll(filter, sortOption, skipNum, limitNum);
      const total = await ReparationService.repository.model.countDocuments(filter); // Compter le total pour la pagination
      
      res.status(200).json({
        success: true,
        count: results.length,
        total: total,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
        data: results
      });
    } catch (error) {
      console.error("Erreur dans getAllReparations:", error);
      next(error);
    }
  }

  /**
   * Récupère la liste des réparations en cours assignées au mécanicien connecté.
   * @param {Object} req - Requête Express (avec req.user)
   * @param {Object} res - Réponse Express
   * @param {Object} next - Fonction next d'Express
   */
  getMecanicienReparationsEnCours = async (req, res, next) => {
    try {
      const mecanicienId = req.user._id;
      const defaultStatuses = ['Planifiée', 'En cours', 'En attente pièces'];
      
      // Extraire les paramètres comme dans getAllDevis
      const {
        page = 1,
        limit = 10,
        sortField = 'dateDebutPrevue', // Default sort field
        sortOrder = 'asc', // Default sort order
          status,
      } = req.query;
      
      const pageNum = parseInt(page);
      const limitNum = parseInt(limit);
      const skipNum = (pageNum - 1) * limitNum;
      
      const filter = {
        'mecaniciensAssignes.mecanicien': mecanicienId,
        statusReparation: { $in: defaultStatuses },
      };
      if (status) {
        filter.statusReparation = status;
      }

      const sortOption = {};
      sortOption[sortField] = sortOrder === 'desc' ? -1 : 1;

      // Utilise la nouvelle méthode pour récupérer les réparations avec les détails nécessaires
      const results = await ReparationService.getReparationsAvecDetails(filter, sortOption, skipNum, limitNum);
      // Le comptage total utilise toujours le filtre simple, pas besoin de populate ici
      console.log(results);
      
      const total = await ReparationService.repository.model.countDocuments(filter);

      res.status(200).json({
        success: true,
        count: results.length,
        total: total,
        pagination: {
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
        data: results
      });

    } catch (error) {
      console.error("Erreur dans getMecanicienReparationsEnCours:", error);
      next(error);
    }
  }

}

module.exports = new ReparationController(); 