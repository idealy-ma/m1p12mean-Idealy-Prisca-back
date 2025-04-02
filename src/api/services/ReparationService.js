const BaseService = require('./BaseService');
const Reparation = require('../models/Reparation'); 

class ReparationService extends BaseService {
  constructor() {
    // Passer directement l'instance du repository (Reparation qui étend BaseModel)
    super(Reparation);
  }

  /**
   * Récupère toutes les entités avec des populate spécifiques pour vehicule et client.
   * Utilisé pour des vues qui nécessitent ces détails, comme la liste des réparations du mécanicien.
   * @param {Object} filter - Filtre pour la recherche
   * @param {Object} sort - Options de tri
   * @param {number} skip - Nombre d'éléments à sauter
   * @param {number} limit - Nombre d'éléments à retourner
   * @returns {Promise<Array>} Les entités trouvées avec les populate
   */
  async getReparationsAvecDetails(filter = {}, sort = null, skip = 0, limit = 0) {
    try {
      let query = this.repository.model.find(filter);

      // Populate les champs nécessaires pour l'affichage frontend
      query = query.populate('vehicule', 'marque modele immatriculation')
                   .populate('client', 'nom prenom telephone');

      // Applique les options de tri, skip et limit
      if (sort) {
        query = query.sort(sort);
      }
      if (skip > 0) {
        query = query.skip(skip);
      }
      if (limit > 0) {
        query = query.limit(limit);
      }

      // Exécute la requête
      return await query.exec();
    } catch (error) {
      console.error("Erreur dans getReparationsAvecDetails:", error);
      throw error; // Rethrow pour que le contrôleur puisse gérer
    }
  }

  // Méthodes spécifiques au service Reparation peuvent être ajoutées ici plus tard.
  // Par exemple :
  // async findByMecanicien(mecanicienId) { ... }
  // async addEtape(reparationId, etapeData) { ... }
  // async updateEtapeStatus(reparationId, etapeId, status) { ... }

}

module.exports = new ReparationService(); 