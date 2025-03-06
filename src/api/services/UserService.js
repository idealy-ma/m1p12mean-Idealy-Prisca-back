const BaseService = require('./BaseService');
const UserModel = require('../models/User');

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
}

module.exports = new UserService(); 