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
      const userId = req.user._id; // ID de l'utilisateur connecté
      const userRole = req.user.role; // Rôle de l'utilisateur connecté

      if (!mongoose.Types.ObjectId.isValid(reparationId)) {
           return res.status(400).json({ success: false, message: 'ID de réparation invalide.' });
      }

      // Récupérer la réparation en populant les champs utiles
      // Note: findById est fourni par BaseService via ReparationService
      const reparation = await ReparationService.findById(reparationId)
          .populate('client', 'nom prenom email') // Infos client
          .populate('vehicule', 'marque modele immatriculation') // Infos véhicule
          .populate('mecanicienAssigné', 'nom prenom') // Infos mécanicien
          // Attention: populate sur devisOrigine peut être lourd si le devis est gros.
          // Préférez retourner seulement les champs nécessaires ou juste l'ID.
          .populate('devisOrigine', 'status total') // Ex: juste statut et total du devis
          .populate('etapesSuivi.commentaires.auteur', 'nom prenom role'); // Qui a commenté

      if (!reparation) {
        return res.status(404).json({ success: false, message: 'Réparation non trouvée.' });
      }

      // Vérification des droits d'accès
      let canAccess = false;
      if (userRole === 'manager') {
        canAccess = true;
      } else if (userRole === 'client' && reparation.client?._id.equals(userId)) {
        // Utilisation de optional chaining (?) au cas où la population échoue
        canAccess = true;
      } else if (userRole === 'mecanicien' && reparation.mecanicienAssigné?._id.equals(userId)) {
        // Utilisation de optional chaining (?)
        canAccess = true;
      }

      if (!canAccess) {
        return res.status(403).json({ success: false, message: 'Accès non autorisé à cette réparation.' });
      }

      // Si accès autorisé, renvoyer les données
      res.status(200).json({
        success: true,
        data: reparation
      });

    } catch (error) {
      console.error("Erreur dans getReparationById:", error);
      next(error); // Passer l'erreur au gestionnaire d'erreurs global
    }
  }

  // Autres méthodes du contrôleur à ajouter ici plus tard...
  // listerReparations = async (req, res, next) => { ... }
  // addEtape = async (req, res, next) => { ... }

}

module.exports = new ReparationController(); 