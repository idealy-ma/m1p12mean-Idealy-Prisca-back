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

  /**
   * Met à jour le statut d'une étape spécifique d'une réparation.
   * @param {Object} req - Requête Express
   * @param {Object} res - Réponse Express
   * @param {Object} next - Fonction next d'Express
   */
  updateEtapeStatus = async (req, res, next) => {
    try {
      const { reparationId, etapeId } = req.params;
      const { status, dateFin } = req.body; // Nouveau statut et date de fin optionnelle
      const userId = req.user._id;
      const userRole = req.user.role;

      // Validation simple des IDs
      if (!mongoose.Types.ObjectId.isValid(reparationId) || !mongoose.Types.ObjectId.isValid(etapeId)) {
        return res.status(400).json({ success: false, message: 'ID de réparation ou d\'étape invalide.', error: 'INVALID_ID' });
      }

      // Valider que le statut reçu est une valeur valide de l'enum EtapeStatus
      // Utiliser les valeurs exactes définies dans le schéma Mongoose
      const validStatuses = ['En attente', 'En cours', 'Terminée', 'Bloquée']; // Utiliser la liste codée en dur
      if (!status || !validStatuses.includes(status)) {
         return res.status(400).json({ success: false, message: `Statut '${status}' fourni invalide. Les statuts valides sont: ${validStatuses.join(', ')}.`, error: 'INVALID_STATUS' });
      }

      // Récupérer la réparation complète (sans utiliser getReparationByIdAvecDetails car on va la modifier)
      const reparation = await ReparationService.repository.model.findById(reparationId);

      if (!reparation) {
        return res.status(404).json({ success: false, message: 'Réparation non trouvée.', error: 'NOT_FOUND' });
      }

      // Vérification des droits d'accès (Manager ou Mécanicien assigné)
      let canAccess = false;
      if (userRole === 'manager') {
        canAccess = true;
      } else if (userRole === 'mecanicien' && reparation.mecaniciensAssignes?.some(a => a.mecanicien?.equals(userId))) {
        // Utiliser .equals() pour comparer les ObjectIds Mongoose
        canAccess = true;
      }

      if (!canAccess) {
        return res.status(403).json({ success: false, message: 'Accès non autorisé à modifier cette étape.', error: 'FORBIDDEN' });
      }

      // Trouver l'étape dans le tableau
      const etapeIndex = reparation.etapesSuivi.findIndex(etape => etape._id.equals(etapeId));

      if (etapeIndex === -1) {
        return res.status(404).json({ success: false, message: 'Étape non trouvée dans cette réparation.', error: 'STEP_NOT_FOUND' });
      }

      // Mettre à jour le statut de l'étape
      reparation.etapesSuivi[etapeIndex].status = status;
      // Mettre à jour la date de fin si fournie et si le statut est 'terminee' ou 'annulee'
      if ((status === 'terminee' || status === 'annulee') && dateFin) {
          reparation.etapesSuivi[etapeIndex].dateFin = new Date(dateFin);
      } else if (status === 'en_cours' || status === 'en_attente') {
          // Optionnel: Effacer la date de fin si on revient à un statut non terminé
          reparation.etapesSuivi[etapeIndex].dateFin = undefined;
      }
      
      // Marquer le tableau comme modifié pour Mongoose
      reparation.markModified('etapesSuivi');

      // Sauvegarder la réparation
      const reparationMiseAJour = await reparation.save();

      // Renvoyer l'étape mise à jour
      res.status(200).json({
        success: true,
        message: 'Statut de l\'étape mis à jour.',
        data: reparationMiseAJour.etapesSuivi[etapeIndex] // Renvoyer juste l'étape modifiée
      });

    } catch (error) {
      console.error("Erreur dans updateEtapeStatus:", error);
      next(error);
    }
  }

}

module.exports = new ReparationController(); 