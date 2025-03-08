/**
 * Classe de base pour les services
 * Suit le principe d'inversion de dépendance (D de SOLID)
 * Les services dépendent des abstractions (interfaces) plutôt que des implémentations concrètes
 */
class BaseService {
  /**
   * @param {Object} repository - Le repository à utiliser
   */
  constructor(repository) {
    if (this.constructor === BaseService) {
      throw new Error("La classe abstraite 'BaseService' ne peut pas être instanciée directement");
    }
    this.repository = repository;
  }

  /**
   * Crée une nouvelle entité
   * @param {Object} data - Les données de l'entité
   * @returns {Promise<Object>} L'entité créée
   */
  async create(data) {
    try {
      return await this.repository.create(data);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Récupère une entité par son ID
   * @param {string} id - L'ID de l'entité
   * @returns {Promise<Object>} L'entité trouvée
   */
  async getById(id) {
    try {
      const entity = await this.repository.findById(id);
      if (!entity) {
        throw new Error('Entité non trouvée');
      }
      return entity;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Récupère toutes les entités
   * @param {Object} filter - Filtre pour la recherche
   * @param {Object} options - Options pour la recherche
   * @returns {Promise<Array>} Les entités trouvées
   */
  async getAll(filter = {}, options = {}) {
    try {
      return await this.repository.find(filter, options);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Met à jour une entité par son ID
   * @param {string} id - L'ID de l'entité
   * @param {Object} data - Les données à mettre à jour
   * @returns {Promise<Object>} L'entité mise à jour
   */
  async update(id, data) {
    try {
      const entity = await this.repository.updateById(id, data);
      if (!entity) {
        throw new Error('Entité non trouvée');
      }
      return entity;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Supprime une entité par son ID
   * @param {string} id - L'ID de l'entité
   * @returns {Promise<Object>} L'entité supprimée
   */
  async delete(id) {
    try {
      const entity = await this.repository.deleteById(id);
      if (!entity) {
        throw new Error('Entité non trouvée');
      }
      return entity;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = BaseService; 