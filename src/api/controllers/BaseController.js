/**
 * Classe de base pour les contrôleurs
 * Suit le principe de responsabilité unique (S de SOLID)
 * Chaque contrôleur ne gère qu'une seule ressource
 */
class BaseController {
  /**
   * @param {Object} service - Le service à utiliser
   */
  constructor(service) {
    if (this.constructor === BaseController) {
      throw new Error("La classe abstraite 'BaseController' ne peut pas être instanciée directement");
    }
    this.service = service;
  }

  /**
   * Crée une nouvelle entité
   * @param {Object} req - La requête Express
   * @param {Object} res - La réponse Express
   * @returns {Promise<void>}
   */
  create = async (req, res) => {
    try {
      const result = await this.service.create(req.body);
      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  };

  /**
   * Récupère une entité par son ID
   * @param {Object} req - La requête Express
   * @param {Object} res - La réponse Express
   * @returns {Promise<void>}
   */
  getById = async (req, res) => {
    try {
      const result = await this.service.getById(req.params.id);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        message: error.message
      });
    }
  };

  /**
   * Récupère toutes les entités
   * @param {Object} req - La requête Express
   * @param {Object} res - La réponse Express
   * @returns {Promise<void>}
   */
  getAll = async (req, res) => {
    try {
      // Extraction des paramètres de pagination et de tri
      const { page = 1, limit = 10, sort, ...filter } = req.query;
      
      // Options pour la recherche
      const options = {
        skip: (page - 1) * limit,
        limit: parseInt(limit),
        sort: sort ? JSON.parse(sort) : { createdAt: -1 }
      };
      
      const results = await this.service.getAll(filter, options);
      res.status(200).json({
        success: true,
        count: results.length,
        data: results
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  };

  /**
   * Met à jour une entité par son ID
   * @param {Object} req - La requête Express
   * @param {Object} res - La réponse Express
   * @returns {Promise<void>}
   */
  update = async (req, res) => {
    try {
      const result = await this.service.update(req.params.id, req.body);
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  };

  /**
   * Supprime une entité par son ID
   * @param {Object} req - La requête Express
   * @param {Object} res - La réponse Express
   * @returns {Promise<void>}
   */
  delete = async (req, res) => {
    try {
      await this.service.delete(req.params.id);
      res.status(200).json({
        success: true,
        data: null
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  };
}

module.exports = BaseController; 