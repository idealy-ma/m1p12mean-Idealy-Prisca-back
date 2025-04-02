/**
 * Classe de base pour les modèles
 * Suit le principe d'ouverture/fermeture (O de SOLID)
 * Les modèles spécifiques étendront cette classe sans la modifier
 */
class BaseModel {
  constructor(model) {
    this.model = model;
  }

  /**
   * Crée un nouveau document
   * @param {Object} data - Les données à sauvegarder
   * @returns {Promise<Object>} Le document créé
   */
  async create(data) {
    try {
      return await this.model.create(data);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Trouve un document par son ID
   * @param {string} id - L'ID du document
   * @returns {Promise<Object>} Le document trouvé
   */
  async findById(id) {
    try {
      return await this.model.findById(id);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Trouve tous les documents qui correspondent aux critères
   * @param {Object} filter - Les critères de filtrage
   * @param {Object|String} [sort] - Options de tri
   * @param {number} [skip] - Nombre de documents à sauter
   * @param {number} [limit] - Nombre maximal de documents à retourner (0 pour illimité)
   * @param {Object|String} [select] - Champs à sélectionner (projection)
   * @returns {Promise<Array>} Les documents trouvés
   */
  async find(filter = {}, sort = null, skip = null, limit = null, select = null) {
    try {
      let query = this.model.find(filter);
      
      // Appliquer les options si elles sont fournies et valides (logique précédente qui fonctionnait)
      if (select) {
        query = query.select(select);
      }
      query = query.sort(sort && typeof sort === 'object' ? sort : { createdAt: -1 }); 
      const skipVal = (typeof skip === 'number' && skip >= 0) ? skip : 0;
      if (skipVal > 0) {
        query = query.skip(skipVal);
      }
      const limitVal = (typeof limit === 'number' && limit > 0) ? limit : 0;
      if (limitVal > 0) {
        query = query.limit(limitVal);
      }
      
      return await query.exec();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Met à jour un document par son ID
   * @param {string} id - L'ID du document
   * @param {Object} data - Les données à mettre à jour
   * @param {Object} options - Options de mise à jour
   * @returns {Promise<Object>} Le document mis à jour
   */
  async updateById(id, data, options = { new: true }) {
    try {
      return await this.model.findByIdAndUpdate(id, data, options);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Supprime un document par son ID
   * @param {string} id - L'ID du document
   * @returns {Promise<Object>} Le document supprimé
   */
  async deleteById(id) {
    try {
      return await this.model.findByIdAndDelete(id);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Compte le nombre de documents qui correspondent aux critères
   * @param {Object} filter - Les critères de filtrage
   * @returns {Promise<number>} Le nombre de documents
   */
  async count(filter = {}) {
    try {
      return await this.model.countDocuments(filter);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = BaseModel; 