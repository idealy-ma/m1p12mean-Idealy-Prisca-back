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
   * @param {Object} options - Options supplémentaires (projection, sort, etc.)
   * @returns {Promise<Array>} Les documents trouvés
   */
  async find(filter = {}, options = {}) {
    try {
      const { 
        select, 
        sort = { createdAt: -1 }, 
        skip = 0, 
        limit = 0 
      } = options;
      
      let query = this.model.find(filter);
      
      if (select) query = query.select(select);
      if (sort) query = query.sort(sort);
      if (skip) query = query.skip(skip);
      if (limit) query = query.limit(limit);
      
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