const BaseService = require('./BaseService');
const UserModel = require('../models/User');
const config = require('../../config');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
/**
 * Service pour gérer les utilisateurs
 * Suit le principe d'interface ségrégation (I de SOLID)
 * Fournit uniquement les méthodes nécessaires pour les utilisateurs
 */
class UserService extends BaseService {
  constructor() {
    super(UserModel);
  }

  /**
   * Authentifie un utilisateur
   * @param {string} email - L'email de l'utilisateur
   * @param {string} motDePasse - Le mot de passe de l'utilisateur
   * @returns {Promise<Object>} L'utilisateur authentifié
   */
  async authenticate(email, motDePasse) {
    try {
      // Récupérer l'utilisateur avec le mot de passe (normalement masqué)
      const user = await this.repository.model.findOne({ email }).select('+motDePasse');
      
      if (!user) {
        throw new Error('Email ou mot de passe incorrect');
      }

      // Vérifier le mot de passe
      const isPasswordValid = user.verifierMotDePasse(motDePasse);
      
      if (!isPasswordValid) {
        throw new Error('Email ou mot de passe incorrect');
      }
      user.estActif = true;

      // Ne pas renvoyer le mot de passe
      user.motDePasse = undefined;
      
      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Récupère un utilisateur par son email
   * @param {string} email - L'email de l'utilisateur
   * @returns {Promise<Object>} L'utilisateur trouvé
   */
  async getByEmail(email) {
    try {
      const user = await this.repository.findByEmail(email);
      
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }
      
      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Récupère des utilisateurs par rôle
   * @param {string} role - Le rôle des utilisateurs
   * @returns {Promise<Array>} Les utilisateurs trouvés
   */
  async getByRole(role) {
    try {
      return await this.repository.findByRole(role);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Change le statut actif d'un utilisateur
   * @param {string} id - L'ID de l'utilisateur
   * @param {boolean} estActif - Le nouveau statut
   * @returns {Promise<Object>} L'utilisateur mis à jour
   */
  async changeActiveStatus(id, estActif) {
    try {
      return await this.update(id, { estActif });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Compte le nombre de managers actifs dans le système
   * @returns {Promise<number>} Le nombre de managers actifs
   */
  async getActiveManagersCount() {
    try {
      return await this.repository.model.countDocuments({ 
        role: 'manager',
        estActif: true 
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Récupère tous les employés (mécaniciens et managers)
   * @returns {Promise<Array>} Les employés trouvés
   */
  async getAllEmployees() {
    try {
      // Utiliser une requête avec opérateur $in pour récupérer les utilisateurs avec rôle mécanicien ou manager
      return await this.repository.model.find({
        role: { $in: ['mecanicien', 'manager'] }
      });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Récupère tous les employés (mécaniciens et managers) avec pagination
   * @param {Object} filters - Les filtres à appliquer (nom, prénom, rôle, etc.)
   * @param {Object} options - Les options de pagination (page, limit, sort, etc.)
   * @returns {Promise<Object>} Résultat paginé contenant les employés trouvés
   */
  async getAllEmployeesPaginated(filters = {}, options = {}) {
    try {
      // Assurer que seuls les employés (mécaniciens et managers) sont retournés
      const employeeFilters = {
        ...filters,
        role: filters.role || { $in: ['mecanicien', 'manager'] }
      };
      
      // Calculer le skip pour la pagination manuelle
      const skip = (options.page - 1) * options.limit;
      
      // Obtenir le nombre total de documents correspondant aux filtres
      const totalDocs = await this.repository.model.countDocuments(employeeFilters);
      
      // Obtenir les documents paginés
      const docs = await this.repository.model
        .find(employeeFilters)
        .sort(options.sort)
        .skip(skip)
        .limit(options.limit);
      
      // Calculer le nombre total de pages
      const totalPages = Math.ceil(totalDocs / options.limit);
      
      // Retourner un objet formaté similaire à mongoose-paginate-v2
      return {
        docs,
        totalDocs,
        limit: options.limit,
        page: options.page,
        totalPages,
        hasPrevPage: options.page > 1,
        hasNextPage: options.page < totalPages,
        prevPage: options.page > 1 ? options.page - 1 : null,
        nextPage: options.page < totalPages ? options.page + 1 : null
      };
    } catch (error) {
      throw error;
    }
  }

  generateToken(user) {
    if (!user) {
      throw new Error('L\'utilisateur est nécessaire pour générer un token');
    }
    
    // Générer le token JWT avec la clé définie dans config
    const token = jwt.sign(
      { 
        id: user._id,
        role: user.role,
        email: user.email
      },
      config.jwt.secret,
      { expiresIn: '60d' }
    );
    
    return token;
  }

  validateFields = (fields) => {
    const { nom, prenom, email, motDePasse } = fields;
    if (!nom || !prenom || !email || !motDePasse) {
      throw new Error('Veuillez fournir tous les champs requis');
    }
  };

  checkIfUserExists = async (email) => {
    const existingUser = await this.repository.model.findOne({ email });
    if (existingUser) {
      throw new Error('Un utilisateur avec cet email existe déjà');
    }
  };

  hashPassword = async (motDePasse) => {
    //chaîne aléatoire ajoutée au mot de passe avant de le hasher
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(motDePasse, salt);
  };

}

module.exports = new UserService(); 