'use strict';

const ReparationService = require('../services/ReparationService');
const mongoose = require('mongoose');

class ClientController {

  /**
   * Récupère la liste des réparations pour le client connecté.
   * @param {Object} req - Requête Express (avec req.user)
   * @param {Object} res - Réponse Express
   * @param {Object} next - Fonction next d'Express
   */
  getClientReparations = async (req, res, next) => {
    try {
      const clientId = req.user._id;
      
      // Extraire les paramètres de pagination, tri et filtre
      const {
        page = 1,
        limit = 10,
        sortField = 'dateCreationReparation', // Default sort field
        sortOrder = 'desc', // Default sort order
        statusReparation, // Allow filtering by status
        // Ajoutez d'autres filtres si nécessaire (ex: par véhicule ID)
      } = req.query;
      
      const pageNum = parseInt(page, 10);
      const limitNum = parseInt(limit, 10);
      const skipNum = (pageNum - 1) * limitNum;
      
      // Construire le filtre de base
      const filter = {
        client: clientId,
      };
      
      // Ajouter le filtre de statut s'il est fourni
      if (statusReparation) {
        filter.statusReparation = statusReparation;
      }

      // Construire l'objet de tri
      const sortOption = {};
      sortOption[sortField] = sortOrder === 'desc' ? -1 : 1;

      // Utiliser getReparationsAvecDetails pour inclure les populate nécessaires
      const results = await ReparationService.getReparationsAvecDetails(filter, sortOption, skipNum, limitNum);
      
      // Compter le total des documents correspondant au filtre pour ce client
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
      console.error("Erreur dans getClientReparations:", error);
      next(error); // Passer l'erreur au middleware de gestion d'erreurs
    }
  }

  // Ajoutez d'autres méthodes spécifiques au client ici si nécessaire

}

module.exports = new ClientController(); 